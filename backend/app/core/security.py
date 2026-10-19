from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import settings


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 240_000)
    return f"pbkdf2_sha256${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, salt_value, digest_value = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = _b64decode(salt_value)
    expected = _b64decode(digest_value)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 240_000)
    return hmac.compare_digest(actual, expected)


def create_access_token(subject: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": subject, "role": role, "exp": int(expires_at.timestamp())}
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_value = _b64encode(payload_bytes)
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload_value.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload_value}.{_b64encode(signature)}"


def create_portal_access_token(subject: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": subject, "role": role, "account_type": "portal", "exp": int(expires_at.timestamp())}
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_value = _b64encode(payload_bytes)
    signature = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload_value.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload_value}.{_b64encode(signature)}"


def decode_access_token(token: str) -> dict[str, object] | None:
    try:
        payload_value, signature_value = token.split(".", 1)
        expected_signature = hmac.new(
            settings.secret_key.encode("utf-8"),
            payload_value.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_b64decode(signature_value), expected_signature):
            return None
        payload = json.loads(_b64decode(payload_value))
        expires_at = int(payload.get("exp", 0) or 0)
        if expires_at < int(datetime.now(timezone.utc).timestamp()):
            return None
        return payload
    except Exception:
        return None


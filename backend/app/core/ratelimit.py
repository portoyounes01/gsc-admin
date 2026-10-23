from __future__ import annotations

import threading
import time

# In-memory login throttle. Suitable for a single-process deployment (one uvicorn
# worker). Protects /auth/login and /portal/auth/login from password brute-forcing.

_MAX_FAILURES = 6
_WINDOW_SECONDS = 300
_BLOCK_SECONDS = 300
_PRUNE_AFTER = 3600

_lock = threading.Lock()
_failures: dict[str, list[float]] = {}
_blocked_until: dict[str, float] = {}
_last_prune = 0.0


def _prune(now: float) -> None:
    global _last_prune
    if now - _last_prune < 60:
        return
    _last_prune = now
    for key in list(_failures):
        _failures[key] = [ts for ts in _failures[key] if now - ts < _PRUNE_AFTER]
        if not _failures[key]:
            del _failures[key]
    for key in list(_blocked_until):
        if _blocked_until[key] <= now:
            del _blocked_until[key]


def retry_after_seconds(key: str) -> int:
    """Seconds the caller must wait, or 0 if it may attempt a login now."""
    now = time.monotonic()
    with _lock:
        _prune(now)
        blocked = _blocked_until.get(key)
        if blocked and blocked > now:
            return int(blocked - now) + 1
    return 0


def register_failure(key: str) -> None:
    now = time.monotonic()
    with _lock:
        attempts = [ts for ts in _failures.get(key, []) if now - ts < _WINDOW_SECONDS]
        attempts.append(now)
        _failures[key] = attempts
        if len(attempts) >= _MAX_FAILURES:
            _blocked_until[key] = now + _BLOCK_SECONDS
            _failures[key] = []


def register_success(key: str) -> None:
    with _lock:
        _failures.pop(key, None)
        _blocked_until.pop(key, None)

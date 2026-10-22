from __future__ import annotations

import re
import unicodedata


def _slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "centre"


def username_for_centre(name: str, used: set[str]) -> str:
    base = _slugify(name)[:40]
    candidate = base
    counter = 2
    while candidate in used:
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate

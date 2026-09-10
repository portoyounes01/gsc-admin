from __future__ import annotations

import re

DEFAULT_ROUTE_COLOR = "#2E6F95"


def is_safe_route_color(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value) is not None


def safe_route_color(value: object) -> str:
    # Legacy stored plans remain readable without passing unsafe CSS/HTML onward.
    return value if is_safe_route_color(value) else DEFAULT_ROUTE_COLOR

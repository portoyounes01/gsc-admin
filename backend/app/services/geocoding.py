from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Prospect, Wzc


USER_AGENT = "GlobalSmileCareInternalDashboard/1.0"
BETA_DIR = Path(__file__).resolve().parents[3]
WORKSPACE_DIR = BETA_DIR.parent
APPLE_GEOCODE_SCRIPT = WORKSPACE_DIR / "tools" / "apple_geocode.swift"
SWIFT_GEOCODE_MODULE_CACHE_DIR = BETA_DIR / "tmp" / "swift-module-cache-geocode"

APPROXIMATE_PLACE_COORDINATES: dict[tuple[str, str], tuple[float, float]] = {
    ("9160", "lokeren"): (51.1043, 3.9934),
}

GEOCODING_HEALTHCHECKS: tuple[tuple[str, str], ...] = (
    ("Geopunt", "https://geo.api.vlaanderen.be/geolocation/v4/Location?q=Brussel&c=1"),
    ("Photon", "https://photon.komoot.io/api/?q=Brussel%20Belgium&limit=1"),
    ("Nominatim", "https://nominatim.openstreetmap.org/search?format=jsonv2&q=Brussel%20Belgium&limit=1"),
)


def normalized_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).lower()


def address_key(address: object, postal_code: object, city: object) -> tuple[str, str, str]:
    return (
        normalized_text(address),
        re.sub(r"\.0$", "", normalized_text(postal_code)),
        normalized_text(city),
    )


def coordinate_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def is_belgian_coordinate_pair(latitude: object, longitude: object) -> bool:
    lat = coordinate_float(latitude)
    lon = coordinate_float(longitude)
    if lat is None or lon is None:
        return False
    return 49.4 <= lat <= 51.7 and 2.3 <= lon <= 6.6


def has_coordinates(values: dict[str, Any]) -> bool:
    return is_belgian_coordinate_pair(values.get("latitude"), values.get("longitude"))


def build_address_queries(address: str, postal_code: str, city: str) -> list[str]:
    clean_address = address.strip()
    clean_postal_code = re.sub(r"\.0$", "", postal_code.strip())
    clean_city = city.strip()
    queries: list[str] = []

    def add(query: str) -> None:
        clean_query = re.sub(r"^,\s*|\s*,\s*$", "", query).strip()
        if not clean_query:
            return
        queries.append(clean_query)
        queries.append(f"{clean_query}, Belgium")

    add(", ".join(part for part in [clean_address, " ".join(part for part in [clean_postal_code, clean_city] if part)] if part))
    if clean_address and clean_city:
        add(f"{clean_address}, {clean_city}")
    if clean_postal_code or clean_city:
        add(" ".join(part for part in [clean_postal_code, clean_city] if part))

    return list(dict.fromkeys(queries))[:6]


def fetch_json_url(url: str, timeout: float = 3.5) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (TimeoutError, json.JSONDecodeError, OSError):
        pass

    curl_path = shutil.which("curl")
    if not curl_path:
        return None

    try:
        result = subprocess.run(
            [
                curl_path,
                "-fsSL",
                "--max-time",
                str(int(timeout) + 2),
                "-H",
                "Accept: application/json",
                "-H",
                f"User-Agent: {USER_AGENT}",
                url,
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout + 4,
        )
        return json.loads(result.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError, OSError):
        return None


def geocode_geopunt(query: str) -> dict[str, Any] | None:
    params = urllib.parse.urlencode({"q": query, "c": 1})
    payload = fetch_json_url(f"https://geo.api.vlaanderen.be/geolocation/v4/Location?{params}")
    if not isinstance(payload, dict):
        return None
    result_rows = payload.get("LocationResult")
    if not result_rows:
        return None
    first_result = result_rows[0]
    location = first_result.get("Location", {}) if isinstance(first_result, dict) else {}
    if not isinstance(location, dict):
        return None
    latitude = coordinate_float(location.get("Lat_WGS84") or location.get("lat"))
    longitude = coordinate_float(location.get("Lon_WGS84") or location.get("lon"))
    if not is_belgian_coordinate_pair(latitude, longitude):
        return None
    return {
        "latitude": latitude,
        "longitude": longitude,
        "map_source": "Automatisch via Geopunt",
        "address_source": str(first_result.get("FormattedAddress", "") or query),
    }


BELGIUM_BBOX = "2.5,49.45,6.45,51.55"
SUGGESTION_CACHE_SECONDS = 600
SUGGESTION_CACHE_MAX = 500
_suggestion_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}


def suggestion_from_parts(address: str, postal_code: str, city: str, latitude: float | None = None, longitude: float | None = None) -> dict[str, Any]:
    label = ", ".join(part for part in [address, " ".join(p for p in [postal_code, city] if p)] if part)
    return {
        "label": label,
        "address": address,
        "postal_code": postal_code,
        "city": city,
        "latitude": latitude,
        "longitude": longitude,
    }


def photon_suggestions(query: str, limit: int) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode(
        [("q", query), ("limit", limit), ("bbox", BELGIUM_BBOX), ("layer", "house"), ("layer", "street")]
    )
    payload = fetch_json_url(f"https://photon.komoot.io/api/?{params}", timeout=2.5)
    features = payload.get("features") if isinstance(payload, dict) else None
    suggestions: list[dict[str, Any]] = []
    for feature in features or []:
        if not isinstance(feature, dict):
            continue
        properties = feature.get("properties") or {}
        if str(properties.get("countrycode", "") or "").upper() != "BE":
            continue
        street = str(properties.get("street") or properties.get("name") or "").strip()
        housenumber = str(properties.get("housenumber") or "").strip()
        postal_code = str(properties.get("postcode") or "").strip()
        city = str(properties.get("city") or properties.get("locality") or properties.get("district") or "").strip()
        if not street or not city:
            continue
        coordinates = (feature.get("geometry") or {}).get("coordinates") or []
        longitude = coordinate_float(coordinates[0]) if len(coordinates) > 1 else None
        latitude = coordinate_float(coordinates[1]) if len(coordinates) > 1 else None
        if not is_belgian_coordinate_pair(latitude, longitude):
            latitude = longitude = None
        suggestions.append(suggestion_from_parts(f"{street} {housenumber}".strip(), postal_code, city, latitude, longitude))
    return suggestions


def geopunt_suggestions(query: str, limit: int) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode({"q": query, "c": limit})
    payload = fetch_json_url(f"https://geo.api.vlaanderen.be/geolocation/v4/Suggestion?{params}", timeout=2.5)
    rows = payload.get("SuggestionResult") if isinstance(payload, dict) else None
    suggestions: list[dict[str, Any]] = []
    for row in rows or []:
        match = re.match(r"^(?P<address>.+?),\s*(?P<postal>\d{4})\s+(?P<city>.+)$", str(row))
        if match:
            suggestions.append(suggestion_from_parts(match["address"].strip(), match["postal"], match["city"].strip()))
    return suggestions


_last_nominatim_call = 0.0


def postal_code_suggestions(postal_code: str, limit: int) -> list[dict[str, Any]]:
    """Town(s) for a Belgian postal code; Nominatim allows at most one request per second."""
    global _last_nominatim_call
    if time.monotonic() - _last_nominatim_call < 1.1:
        return []
    _last_nominatim_call = time.monotonic()
    params = urllib.parse.urlencode(
        {"postalcode": postal_code, "countrycodes": "be", "format": "jsonv2", "addressdetails": 1, "limit": limit}
    )
    payload = fetch_json_url(f"https://nominatim.openstreetmap.org/search?{params}", timeout=2.5)
    suggestions: list[dict[str, Any]] = []
    for row in payload if isinstance(payload, list) else []:
        address = row.get("address") or {}
        city = str(address.get("city") or address.get("town") or address.get("village") or address.get("municipality") or "").strip()
        if not city or str(address.get("postcode") or "").strip() != postal_code:
            continue
        latitude = coordinate_float(row.get("lat"))
        longitude = coordinate_float(row.get("lon"))
        if not is_belgian_coordinate_pair(latitude, longitude):
            latitude = longitude = None
        suggestions.append(suggestion_from_parts("", postal_code, city, latitude, longitude))
    return suggestions


def suggest_addresses(query: str, limit: int = 6) -> list[dict[str, Any]]:
    clean_query = " ".join(query.split())[:120]
    if len(clean_query) < 3 or not settings.geocoding_outbound_enabled:
        return []
    cache_key = clean_query.lower()
    cached = _suggestion_cache.get(cache_key)
    if cached and time.monotonic() - cached[0] < SUGGESTION_CACHE_SECONDS:
        return cached[1]

    if re.fullmatch(r"\d{4}", clean_query):
        suggestions = postal_code_suggestions(clean_query, limit)
        if not suggestions:
            return []
    else:
        suggestions = photon_suggestions(clean_query, limit) or geopunt_suggestions(clean_query, limit)
    unique: dict[str, dict[str, Any]] = {}
    for suggestion in suggestions:
        unique.setdefault(suggestion["label"].lower(), suggestion)
    query_tokens = re.findall(r"\w+", cache_key)

    def matched_tokens(suggestion: dict[str, Any]) -> int:
        words = re.findall(r"\w+", suggestion["label"].lower())
        return sum(any(word.startswith(token) for word in words) for token in query_tokens)

    results = sorted(unique.values(), key=matched_tokens, reverse=True)[:limit]

    if len(_suggestion_cache) >= SUGGESTION_CACHE_MAX:
        _suggestion_cache.clear()
    _suggestion_cache[cache_key] = (time.monotonic(), results)
    return results


def geocode_photon(query: str) -> dict[str, Any] | None:
    params = urllib.parse.urlencode({"q": query, "limit": 1})
    payload = fetch_json_url(f"https://photon.komoot.io/api/?{params}")
    if not isinstance(payload, dict):
        return None
    features = payload.get("features")
    if not features:
        return None
    feature = features[0]
    geometry = feature.get("geometry", {}) if isinstance(feature, dict) else {}
    properties = feature.get("properties", {}) if isinstance(feature, dict) else {}
    coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        return None
    if str(properties.get("countrycode", "") or "").strip().upper() not in {"", "BE"}:
        return None
    longitude = coordinate_float(coordinates[0])
    latitude = coordinate_float(coordinates[1])
    if not is_belgian_coordinate_pair(latitude, longitude):
        return None
    display_name = " ".join(
        str(part).strip()
        for part in [
            properties.get("name"),
            properties.get("street"),
            properties.get("housenumber"),
            properties.get("postcode"),
            properties.get("city"),
        ]
        if str(part or "").strip()
    )
    return {
        "latitude": latitude,
        "longitude": longitude,
        "map_source": "Automatisch via Photon",
        "address_source": display_name or query,
    }


def geocode_nominatim(query: str) -> dict[str, Any] | None:
    params = urllib.parse.urlencode(
        {
            "format": "jsonv2",
            "q": query,
            "limit": 1,
            "addressdetails": 1,
        }
    )
    payload = fetch_json_url(f"https://nominatim.openstreetmap.org/search?{params}")
    if not isinstance(payload, list) or not payload:
        return None
    result = payload[0]
    latitude = coordinate_float(result.get("lat"))
    longitude = coordinate_float(result.get("lon"))
    if not is_belgian_coordinate_pair(latitude, longitude):
        return None
    return {
        "latitude": latitude,
        "longitude": longitude,
        "map_source": "Automatisch via Nominatim",
        "address_source": str(result.get("display_name", "") or query),
    }


def geocode_apple(query: str) -> dict[str, Any] | None:
    if sys.platform != "darwin" or not APPLE_GEOCODE_SCRIPT.exists():
        return None

    swift_path = shutil.which("swift")
    if not swift_path:
        return None

    SWIFT_GEOCODE_MODULE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        result = subprocess.run(
            [
                swift_path,
                "-module-cache-path",
                str(SWIFT_GEOCODE_MODULE_CACHE_DIR),
                str(APPLE_GEOCODE_SCRIPT),
                query,
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=9,
        )
        payload = json.loads(result.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError, OSError):
        return None

    latitude = coordinate_float(payload.get("latitude")) if isinstance(payload, dict) else None
    longitude = coordinate_float(payload.get("longitude")) if isinstance(payload, dict) else None
    if not is_belgian_coordinate_pair(latitude, longitude):
        return None
    return {
        "latitude": latitude,
        "longitude": longitude,
        "map_source": "Automatisch via Apple",
        "address_source": str(payload.get("displayName", "") or query),
    }


def geocode_query(query: str) -> dict[str, Any] | None:
    if not settings.geocoding_outbound_enabled:
        return None
    for provider in (geocode_geopunt, geocode_photon, geocode_nominatim, geocode_apple):
        try:
            result = provider(query)
        except Exception:
            result = None
        if result:
            return result
    return None


def check_outbound_https() -> dict[str, Any]:
    if not settings.geocoding_outbound_enabled:
        return {
            "status": "disabled",
            "message": "Outbound geocoding staat uit via GEOCODING_OUTBOUND_ENABLED=false.",
            "providers": [],
        }

    providers: list[dict[str, Any]] = []
    for name, url in GEOCODING_HEALTHCHECKS:
        payload = fetch_json_url(url, timeout=4)
        providers.append(
            {
                "name": name,
                "ok": payload is not None,
            }
        )

    working_count = sum(1 for provider in providers if provider["ok"])
    status = "ok" if working_count else "blocked"
    return {
        "status": status,
        "message": (
            "Outbound HTTPS naar minstens een geocodingdienst werkt."
            if working_count
            else "Geen enkele geocodingdienst is bereikbaar via outbound HTTPS."
        ),
        "providers": providers,
    }


def approximate_coordinates(values: dict[str, Any]) -> dict[str, Any] | None:
    postal_code = re.sub(r"\.0$", "", normalized_text(values.get("postal_code")))
    city = normalized_text(values.get("city"))
    lookup_keys = [(postal_code, city), ("", city), (postal_code, "")]
    for key in lookup_keys:
        coordinates = APPROXIMATE_PLACE_COORDINATES.get(key)
        if not coordinates:
            continue
        latitude, longitude = coordinates
        return {
            "latitude": latitude,
            "longitude": longitude,
            "map_source": "Benaderd via gemeente/postcode",
            "address_source": " ".join(part for part in [postal_code, str(values.get("city") or "").strip()] if part),
        }
    return None


def find_local_coordinates(db: Session, values: dict[str, Any]) -> dict[str, Any] | None:
    target_key = address_key(values.get("address"), values.get("postal_code"), values.get("city"))
    if not any(target_key):
        return None
    target_address, target_postal_code, target_city = target_key

    for model in (Wzc, Prospect):
        records = db.scalars(select(model)).all()
        for record in records:
            if not is_belgian_coordinate_pair(record.latitude, record.longitude):
                continue
            record_key = address_key(record.address, record.postal_code, record.city)
            record_address, record_postal_code, record_city = record_key
            same_exact_address = bool(target_address and record_address and target_address == record_address)
            same_postal_code = bool(target_postal_code and record_postal_code and target_postal_code == record_postal_code)
            same_city = bool(
                target_city
                and record_city
                and (target_city == record_city or target_city in record_city or record_city in target_city)
            )
            if record_key == target_key or (same_exact_address and (same_postal_code or same_city)):
                return {
                    "latitude": record.latitude,
                    "longitude": record.longitude,
                    "map_source": "Overgenomen van bestaand adres",
                    "address_source": record.name,
                }
    return None


def fill_missing_coordinates(db: Session, values: dict[str, Any]) -> dict[str, Any]:
    next_values = values.copy()
    if has_coordinates(next_values):
        return next_values

    local_match = find_local_coordinates(db, next_values)
    if local_match:
        next_values.update(local_match)
        return next_values

    queries = build_address_queries(
        str(next_values.get("address") or ""),
        str(next_values.get("postal_code") or ""),
        str(next_values.get("city") or ""),
    )
    for query in queries:
        result = geocode_query(query)
        if result:
            next_values.update(result)
            return next_values
    approximate_match = approximate_coordinates(next_values)
    if approximate_match:
        next_values.update(approximate_match)
    return next_values

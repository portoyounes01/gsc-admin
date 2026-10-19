from __future__ import annotations

import json
import logging
import math
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Sequence
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings
from app.models import Urgency
from app.schemas import (
    RoutePlanLocation,
    UrgencyRouteOut,
    UrgencyRoutePlanOut,
    UrgencyRoutePlanRequest,
    UrgencyRouteStopOut,
    UrgencyRouteUnassignedOut,
)


LOGGER = logging.getLogger(__name__)
USER_AGENT = "GlobalSmileCareInternalDashboard/1.0"
ROUTE_COLORS = ["#2E6F95", "#2F6F62", "#B7791F", "#7C3AED", "#B42318", "#0F766E", "#A16207", "#4338CA"]
_MATRIX_CACHE: dict[str, tuple[float, "MatrixResult"]] = {}
_GOOGLE_DURATION_PATTERN = re.compile(r"^(-?\d+(?:\.\d+)?)s$")


class RoutePlanningError(ValueError):
    pass


class RoutingProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class Coordinates:
    latitude: float
    longitude: float


@dataclass
class MatrixResult:
    provider: str
    uses_real_road_network: bool
    uses_live_traffic: bool
    durations_minutes: list[list[float]]
    distances_km: list[list[float]]
    warnings: list[str]


@dataclass
class RoutableUrgency:
    urgency: Urgency
    coordinates: Coordinates
    matrix_index: int
    service_duration_minutes: int


@dataclass
class RouteState:
    route_index: int
    stop_indices: list[int]


def coordinate_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def validate_coordinates(latitude: object, longitude: object) -> Coordinates | None:
    lat = coordinate_float(latitude)
    lon = coordinate_float(longitude)
    if lat is None or lon is None:
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    return Coordinates(latitude=lat, longitude=lon)


def validate_location(location: RoutePlanLocation, fallback_label: str) -> RoutePlanLocation:
    coordinates = validate_coordinates(location.latitude, location.longitude)
    if not coordinates:
        raise RoutePlanningError(f"{fallback_label} heeft geen geldige latitude/longitude.")
    return RoutePlanLocation(
        label=location.label.strip() or fallback_label,
        latitude=coordinates.latitude,
        longitude=coordinates.longitude,
    )


def parse_time_minutes(value: str) -> int:
    try:
        hours_text, minutes_text = value.split(":", 1)
        hours = int(hours_text)
        minutes = int(minutes_text)
    except ValueError as exc:
        raise RoutePlanningError("Startuur moet het formaat uu:mm hebben.") from exc
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        raise RoutePlanningError("Startuur moet tussen 00:00 en 23:59 liggen.")
    return hours * 60 + minutes


def format_clock(total_minutes: float) -> str:
    minutes = int(round(total_minutes)) % (24 * 60)
    hours, remaining_minutes = divmod(minutes, 60)
    return f"{hours:02d}:{remaining_minutes:02d}"


def haversine_km(a: Coordinates, b: Coordinates) -> float:
    radius_km = 6371.0088
    lat1 = math.radians(a.latitude)
    lat2 = math.radians(b.latitude)
    delta_lat = lat2 - lat1
    delta_lon = math.radians(b.longitude - a.longitude)
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return radius_km * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def cache_key(provider_name: str, coordinates: Sequence[Coordinates]) -> str:
    rounded = [(round(item.latitude, 6), round(item.longitude, 6)) for item in coordinates]
    return json.dumps([provider_name, rounded], separators=(",", ":"))


def cached_matrix(provider_name: str, coordinates: Sequence[Coordinates]) -> MatrixResult | None:
    ttl = max(0, int(settings.routing_matrix_cache_seconds or 0))
    if ttl <= 0:
        return None
    cached = _MATRIX_CACHE.get(cache_key(provider_name, coordinates))
    if not cached:
        return None
    created_at, result = cached
    if time.time() - created_at > ttl:
        _MATRIX_CACHE.pop(cache_key(provider_name, coordinates), None)
        return None
    return result


def store_matrix(provider_name: str, coordinates: Sequence[Coordinates], result: MatrixResult) -> MatrixResult:
    if int(settings.routing_matrix_cache_seconds or 0) > 0:
        _MATRIX_CACHE[cache_key(provider_name, coordinates)] = (time.time(), result)
    return result


class EstimatedRoutingProvider:
    name = "estimate"
    uses_real_road_network = False

    def travel_time_matrix(self, coordinates: Sequence[Coordinates], extra_warnings: Sequence[str] = ()) -> MatrixResult:
        cached = cached_matrix(self.name, coordinates)
        if cached:
            return MatrixResult(
                provider=cached.provider,
                uses_real_road_network=cached.uses_real_road_network,
                uses_live_traffic=cached.uses_live_traffic,
                durations_minutes=cached.durations_minutes,
                distances_km=cached.distances_km,
                warnings=list(dict.fromkeys([*cached.warnings, *extra_warnings])),
            )

        speed = max(1.0, float(settings.routing_average_speed_kmh or 42.0))
        detour_factor = max(1.0, float(settings.routing_distance_detour_factor or 1.25))
        distances: list[list[float]] = []
        durations: list[list[float]] = []
        for origin in coordinates:
            distance_row: list[float] = []
            duration_row: list[float] = []
            for destination in coordinates:
                distance = haversine_km(origin, destination) * detour_factor
                distance_row.append(distance)
                duration_row.append((distance / speed) * 60)
            distances.append(distance_row)
            durations.append(duration_row)

        result = MatrixResult(
            provider="estimate",
            uses_real_road_network=False,
            uses_live_traffic=False,
            durations_minutes=durations,
            distances_km=distances,
            warnings=[
                "Geen echte routingprovider actief: rijtijden zijn een benadering op basis van coordinaten, detour-factor en gemiddelde snelheid.",
                *extra_warnings,
            ],
        )
        return store_matrix(self.name, coordinates, result)


class OsrmRoutingProvider:
    name = "osrm"
    uses_real_road_network = True

    def travel_time_matrix(self, coordinates: Sequence[Coordinates]) -> MatrixResult:
        if not settings.routing_outbound_enabled:
            raise RoutingProviderError("ROUTING_OUTBOUND_ENABLED staat uit.")
        base_url = settings.routing_osrm_base_url.strip().rstrip("/")
        if not base_url:
            raise RoutingProviderError("ROUTING_OSRM_BASE_URL ontbreekt.")

        cached = cached_matrix(self.name, coordinates)
        if cached:
            return cached

        coordinate_path = ";".join(f"{item.longitude:.6f},{item.latitude:.6f}" for item in coordinates)
        query = urllib.parse.urlencode({"annotations": "duration,distance"})
        request = urllib.request.Request(
            f"{base_url}/table/v1/driving/{coordinate_path}?{query}",
            headers={"Accept": "application/json", "User-Agent": USER_AGENT},
        )
        try:
            with urllib.request.urlopen(request, timeout=float(settings.routing_timeout_seconds or 8.0)) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (TimeoutError, json.JSONDecodeError, OSError) as exc:
            raise RoutingProviderError("OSRM-matrix kon niet opgehaald worden.") from exc

        if not isinstance(payload, dict) or payload.get("code") != "Ok":
            raise RoutingProviderError("OSRM gaf geen bruikbare matrix terug.")

        durations_seconds = payload.get("durations")
        distances_meters = payload.get("distances")
        size = len(coordinates)
        if not matrix_has_size(durations_seconds, size) or not matrix_has_size(distances_meters, size):
            raise RoutingProviderError("OSRM-matrix heeft een onverwacht formaat.")

        durations_minutes: list[list[float]] = []
        distances_km: list[list[float]] = []
        for row_index in range(size):
            duration_row: list[float] = []
            distance_row: list[float] = []
            for column_index in range(size):
                duration = durations_seconds[row_index][column_index]
                distance = distances_meters[row_index][column_index]
                if duration is None or distance is None:
                    raise RoutingProviderError("Niet elke locatie is routeerbaar met OSRM.")
                duration_row.append(float(duration) / 60)
                distance_row.append(float(distance) / 1000)
            durations_minutes.append(duration_row)
            distances_km.append(distance_row)

        return store_matrix(
            self.name,
            coordinates,
            MatrixResult(
                provider="osrm",
                uses_real_road_network=True,
                uses_live_traffic=False,
                durations_minutes=durations_minutes,
                distances_km=distances_km,
                warnings=[],
            ),
        )


def google_waypoint(coordinates: Coordinates) -> dict[str, object]:
    return {
        "waypoint": {
            "location": {
                "latLng": {
                    "latitude": coordinates.latitude,
                    "longitude": coordinates.longitude,
                }
            }
        }
    }


def parse_google_duration_seconds(value: object) -> float:
    match = _GOOGLE_DURATION_PATTERN.match(str(value or ""))
    if not match:
        raise RoutingProviderError("Google Routes gaf een ongeldige duur terug.")
    return float(match.group(1))


def google_departure_time_for_start(start_time: str | None, execution_date: date | None = None) -> tuple[str | None, list[str]]:
    if not start_time:
        return None, []
    try:
        start_minutes = parse_time_minutes(start_time)
    except RoutePlanningError:
        return None, []

    timezone_name = settings.routing_departure_timezone.strip() or "Europe/Brussels"
    try:
        local_timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        local_timezone = timezone.utc

    now = datetime.now(local_timezone)
    hours, minutes = divmod(start_minutes, 60)
    planned_date = execution_date or now.date()
    planned_departure = datetime(
        planned_date.year,
        planned_date.month,
        planned_date.day,
        hours,
        minutes,
        tzinfo=local_timezone,
    )
    if planned_departure <= now + timedelta(minutes=2):
        return None, ["Google Routes gebruikt het huidige vertrekmoment omdat het ingestelde vertrekuur niet meer in de toekomst ligt."]
    return planned_departure.isoformat(), []


class GoogleRoutesRoutingProvider:
    name = "google_routes"
    uses_real_road_network = True
    uses_live_traffic = True

    def __init__(self, start_time: str | None = None, execution_date: date | None = None) -> None:
        self.departure_time, self.departure_warnings = google_departure_time_for_start(start_time, execution_date)
        cache_ttl = max(60, int(settings.routing_matrix_cache_seconds or 300))
        cache_bucket = self.departure_time or f"now-{int(time.time() // cache_ttl)}"
        self.cache_name = f"{self.name}:{cache_bucket}"

    def travel_time_matrix(self, coordinates: Sequence[Coordinates]) -> MatrixResult:
        if not settings.routing_outbound_enabled:
            raise RoutingProviderError("ROUTING_OUTBOUND_ENABLED staat uit.")
        api_key = settings.routing_google_api_key.strip()
        if not api_key:
            raise RoutingProviderError("ROUTING_GOOGLE_API_KEY ontbreekt.")

        routing_preference = settings.routing_google_routing_preference.strip().upper() or "TRAFFIC_AWARE"
        max_elements = 100 if routing_preference == "TRAFFIC_AWARE_OPTIMAL" else 625
        if len(coordinates) * len(coordinates) > max_elements:
            raise RoutingProviderError(f"Google Routes matrix bevat te veel route-elementen voor {routing_preference}: maximum {max_elements}.")

        cached = cached_matrix(self.cache_name, coordinates)
        if cached:
            return MatrixResult(
                provider=cached.provider,
                uses_real_road_network=cached.uses_real_road_network,
                uses_live_traffic=cached.uses_live_traffic,
                durations_minutes=cached.durations_minutes,
                distances_km=cached.distances_km,
                warnings=list(dict.fromkeys([*cached.warnings, *self.departure_warnings])),
            )

        body: dict[str, object] = {
            "origins": [google_waypoint(item) for item in coordinates],
            "destinations": [google_waypoint(item) for item in coordinates],
            "travelMode": "DRIVE",
            "routingPreference": routing_preference,
            "languageCode": settings.routing_google_language_code.strip() or "nl-BE",
            "regionCode": settings.routing_google_region_code.strip() or "BE",
            "units": "METRIC",
        }
        if self.departure_time:
            body["departureTime"] = self.departure_time
        if routing_preference == "TRAFFIC_AWARE_OPTIMAL":
            body["trafficModel"] = settings.routing_google_traffic_model.strip().upper() or "BEST_GUESS"

        request = urllib.request.Request(
            "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": "originIndex,destinationIndex,status,condition,distanceMeters,duration,fallbackInfo",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=float(settings.routing_timeout_seconds or 8.0)) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (TimeoutError, json.JSONDecodeError, OSError) as exc:
            raise RoutingProviderError("Google Routes matrix kon niet opgehaald worden.") from exc

        if isinstance(payload, dict) and payload.get("error"):
            message = payload.get("error", {}).get("message") or "Google Routes gaf een fout terug."
            raise RoutingProviderError(str(message))
        if not isinstance(payload, list):
            raise RoutingProviderError("Google Routes gaf geen bruikbare matrix terug.")

        size = len(coordinates)
        durations_minutes: list[list[float | None]] = [[None for _ in range(size)] for _ in range(size)]
        distances_km: list[list[float | None]] = [[None for _ in range(size)] for _ in range(size)]
        fallback_cells = 0
        for element in payload:
            if not isinstance(element, dict):
                continue
            origin_index = element.get("originIndex")
            destination_index = element.get("destinationIndex")
            if not isinstance(origin_index, int) or not isinstance(destination_index, int):
                continue
            if not (0 <= origin_index < size and 0 <= destination_index < size):
                continue
            status = element.get("status") if isinstance(element.get("status"), dict) else {}
            if status and status.get("code"):
                raise RoutingProviderError("Google Routes kon niet elke matrixcel routeerbaar maken.")
            if element.get("condition") == "ROUTE_NOT_FOUND":
                raise RoutingProviderError("Google Routes vond niet voor elke locatie een route.")
            duration_seconds = parse_google_duration_seconds(element.get("duration"))
            distance_meters = element.get("distanceMeters")
            if not isinstance(distance_meters, (int, float)):
                raise RoutingProviderError("Google Routes gaf een matrix zonder afstand terug.")
            durations_minutes[origin_index][destination_index] = duration_seconds / 60
            distances_km[origin_index][destination_index] = float(distance_meters) / 1000
            if element.get("fallbackInfo"):
                fallback_cells += 1

        if any(value is None for row in durations_minutes for value in row) or any(value is None for row in distances_km for value in row):
            raise RoutingProviderError("Google Routes matrix is onvolledig.")

        warnings = list(self.departure_warnings)
        if fallback_cells:
            warnings.append(f"Google Routes gebruikte fallbackinformatie voor {fallback_cells} matrixcel(len).")
        if int(settings.routing_matrix_cache_seconds or 0) > 0:
            warnings.append(f"Traffic-aware matrix kort gecachet voor maximaal {int(settings.routing_matrix_cache_seconds)} seconden.")

        return store_matrix(
            self.cache_name,
            coordinates,
            MatrixResult(
                provider="google_routes",
                uses_real_road_network=True,
                uses_live_traffic=True,
                durations_minutes=[[float(value) for value in row] for row in durations_minutes],
                distances_km=[[float(value) for value in row] for row in distances_km],
                warnings=warnings,
            ),
        )


def matrix_has_size(value: object, size: int) -> bool:
    if not isinstance(value, list) or len(value) != size:
        return False
    return all(isinstance(row, list) and len(row) == size for row in value)


def build_travel_matrix(
    coordinates: Sequence[Coordinates],
    start_time: str | None = None,
    execution_date: date | None = None,
) -> MatrixResult:
    max_locations = max(2, int(settings.routing_max_locations or 100))
    if len(coordinates) > max_locations:
        raise RoutePlanningError(f"Te veel locaties voor een routeplan: maximum {max_locations}, ontvangen {len(coordinates)}.")

    provider_name = settings.routing_provider.strip().lower() or "estimate"
    if provider_name in {"google", "google_routes", "google-routes"}:
        try:
            return GoogleRoutesRoutingProvider(start_time, execution_date).travel_time_matrix(coordinates)
        except RoutingProviderError as exc:
            LOGGER.warning("Routingprovider google_routes faalde zonder patientgegevens: %s", exc)
            return EstimatedRoutingProvider().travel_time_matrix(
                coordinates,
                extra_warnings=[f"Google Routes niet beschikbaar ({exc}); fallbackschatting gebruikt."],
            )

    if provider_name == "osrm":
        try:
            return OsrmRoutingProvider().travel_time_matrix(coordinates)
        except RoutingProviderError as exc:
            LOGGER.warning("Routingprovider osrm faalde zonder patientgegevens: %s", exc)
            return EstimatedRoutingProvider().travel_time_matrix(
                coordinates,
                extra_warnings=[f"OSRM niet beschikbaar ({exc}); fallbackschatting gebruikt."],
            )

    if provider_name != "estimate":
        LOGGER.warning("Onbekende routingprovider zonder patientgegevens: %s", provider_name)
    return EstimatedRoutingProvider().travel_time_matrix(
        coordinates,
        extra_warnings=([f"Onbekende routingprovider '{provider_name}'; fallbackschatting gebruikt."] if provider_name != "estimate" else []),
    )


def route_driving_minutes(stop_indices: Sequence[int], matrix: MatrixResult, end_index: int | None) -> float:
    previous_index = 0
    total = 0.0
    for stop_index in stop_indices:
        total += matrix.durations_minutes[previous_index][stop_index]
        previous_index = stop_index
    if end_index is not None:
        total += matrix.durations_minutes[previous_index][end_index]
    return total


def route_distance_km(stop_indices: Sequence[int], matrix: MatrixResult, end_index: int | None) -> float:
    previous_index = 0
    total = 0.0
    for stop_index in stop_indices:
        total += matrix.distances_km[previous_index][stop_index]
        previous_index = stop_index
    if end_index is not None:
        total += matrix.distances_km[previous_index][end_index]
    return total


def route_duration_minutes(
    stop_indices: Sequence[int],
    matrix: MatrixResult,
    service_by_index: dict[int, int],
    end_index: int | None,
) -> float:
    return route_driving_minutes(stop_indices, matrix, end_index) + sum(service_by_index[index] for index in stop_indices)


def best_insertion(
    route: RouteState,
    stop_index: int,
    matrix: MatrixResult,
    service_by_index: dict[int, int],
    end_index: int | None,
    target_duration: float,
    max_route_duration: int | None,
) -> tuple[float, list[int], float] | None:
    current_duration = route_duration_minutes(route.stop_indices, matrix, service_by_index, end_index)
    best: tuple[float, list[int], float] | None = None
    for position in range(len(route.stop_indices) + 1):
        candidate_indices = [*route.stop_indices[:position], stop_index, *route.stop_indices[position:]]
        candidate_duration = route_duration_minutes(candidate_indices, matrix, service_by_index, end_index)
        if max_route_duration is not None and candidate_duration > max_route_duration:
            continue
        added_duration = candidate_duration - current_duration
        balance_penalty = max(0.0, candidate_duration - target_duration) * 0.35
        score = added_duration + balance_penalty + candidate_duration * 0.02
        if best is None or score < best[0]:
            best = (score, candidate_indices, candidate_duration)
    return best


def two_opt_route(route: RouteState, matrix: MatrixResult, end_index: int | None) -> None:
    if len(route.stop_indices) < 3:
        return
    improved = True
    passes = 0
    while improved and passes < 80:
        improved = False
        passes += 1
        current_distance = route_driving_minutes(route.stop_indices, matrix, end_index)
        for left in range(len(route.stop_indices) - 1):
            for right in range(left + 2, len(route.stop_indices) + 1):
                candidate = [*route.stop_indices[:left], *reversed(route.stop_indices[left:right]), *route.stop_indices[right:]]
                candidate_distance = route_driving_minutes(candidate, matrix, end_index)
                if candidate_distance + 0.01 < current_distance:
                    route.stop_indices = candidate
                    improved = True
                    break
            if improved:
                break


def balance_objective(
    routes: Sequence[RouteState],
    matrix: MatrixResult,
    service_by_index: dict[int, int],
    end_index: int | None,
) -> float:
    durations = [route_duration_minutes(route.stop_indices, matrix, service_by_index, end_index) for route in routes]
    if not durations:
        return 0
    return max(durations) + (max(durations) - min(durations)) * 0.35 + sum(durations) * 0.02


def improve_route_balance(
    routes: list[RouteState],
    matrix: MatrixResult,
    service_by_index: dict[int, int],
    end_index: int | None,
    max_route_duration: int | None,
) -> None:
    if len(routes) < 2:
        return
    for _ in range(40):
        current_score = balance_objective(routes, matrix, service_by_index, end_index)
        best_move: tuple[float, int, int, int, int] | None = None
        for source_index, source_route in enumerate(routes):
            for source_position, stop_index in enumerate(source_route.stop_indices):
                for target_index, target_route in enumerate(routes):
                    if source_index == target_index:
                        continue
                    source_candidate = [item for item in source_route.stop_indices if item != stop_index]
                    for target_position in range(len(target_route.stop_indices) + 1):
                        target_candidate = [
                            *target_route.stop_indices[:target_position],
                            stop_index,
                            *target_route.stop_indices[target_position:],
                        ]
                        if max_route_duration is not None:
                            target_duration = route_duration_minutes(target_candidate, matrix, service_by_index, end_index)
                            if target_duration > max_route_duration:
                                continue
                        candidate_routes = [
                            RouteState(route.route_index, list(route.stop_indices))
                            for route in routes
                        ]
                        candidate_routes[source_index].stop_indices = source_candidate
                        candidate_routes[target_index].stop_indices = target_candidate
                        candidate_score = balance_objective(candidate_routes, matrix, service_by_index, end_index)
                        if candidate_score + 0.5 < current_score and (best_move is None or candidate_score < best_move[0]):
                            best_move = (candidate_score, source_index, source_position, target_index, target_position)
        if best_move is None:
            return
        _, source_index, source_position, target_index, target_position = best_move
        moved_stop = routes[source_index].stop_indices.pop(source_position)
        routes[target_index].stop_indices.insert(target_position, moved_stop)
        two_opt_route(routes[source_index], matrix, end_index)
        two_opt_route(routes[target_index], matrix, end_index)


def build_optimized_routes(
    jobs: Sequence[RoutableUrgency],
    route_count: int,
    matrix: MatrixResult,
    end_index: int | None,
    max_route_duration: int | None,
) -> tuple[list[RouteState], list[RoutableUrgency]]:
    routes = [RouteState(route_index=index, stop_indices=[]) for index in range(route_count)]
    service_by_index = {job.matrix_index: job.service_duration_minutes for job in jobs}
    if not jobs:
        return routes, []

    single_visit_estimates = [
        route_duration_minutes([job.matrix_index], matrix, service_by_index, end_index)
        for job in jobs
    ]
    target_duration = max(sum(single_visit_estimates) / max(1, route_count), sum(service_by_index.values()) / max(1, route_count))
    unassigned: list[RoutableUrgency] = []
    ordered_jobs = sorted(jobs, key=lambda job: matrix.durations_minutes[0][job.matrix_index], reverse=True)

    for job in ordered_jobs:
        best: tuple[float, int, list[int], float] | None = None
        for route in routes:
            insertion = best_insertion(
                route,
                job.matrix_index,
                matrix,
                service_by_index,
                end_index,
                target_duration,
                max_route_duration,
            )
            if insertion is None:
                continue
            score, indices, candidate_duration = insertion
            if best is None or score < best[0]:
                best = (score, route.route_index, indices, candidate_duration)
        if best is None:
            unassigned.append(job)
            continue
        _, route_index, indices, _ = best
        routes[route_index].stop_indices = indices
        two_opt_route(routes[route_index], matrix, end_index)

    improve_route_balance(routes, matrix, service_by_index, end_index, max_route_duration)
    for route in routes:
        two_opt_route(route, matrix, end_index)
    return routes, unassigned


def urgency_coordinates(urgency: Urgency) -> Coordinates | None:
    if not urgency.wzc:
        return None
    return validate_coordinates(urgency.wzc.latitude, urgency.wzc.longitude)


def unassigned_from_urgency(urgency: Urgency, reason: str) -> UrgencyRouteUnassignedOut:
    return UrgencyRouteUnassignedOut(
        urgency_id=urgency.id,
        wzc_name=urgency.wzc_name or "",
        patient_name=urgency.patient_name,
        reason=reason,
    )


def build_route_response(
    route: RouteState,
    jobs_by_index: dict[int, RoutableUrgency],
    matrix: MatrixResult,
    start_location: RoutePlanLocation,
    end_location: RoutePlanLocation | None,
    return_to_start: bool,
    end_index: int | None,
    start_minutes: int,
) -> UrgencyRouteOut:
    route_color = ROUTE_COLORS[route.route_index % len(ROUTE_COLORS)]
    cursor = float(start_minutes)
    previous_index = 0
    stops: list[UrgencyRouteStopOut] = []
    total_driving = 0.0
    total_distance = 0.0
    total_service = 0

    for sequence, stop_index in enumerate(route.stop_indices, start=1):
        job = jobs_by_index[stop_index]
        driving = matrix.durations_minutes[previous_index][stop_index]
        distance = matrix.distances_km[previous_index][stop_index]
        cursor += driving
        arrival_time = format_clock(cursor)
        cursor += job.service_duration_minutes
        departure_time = format_clock(cursor)
        total_driving += driving
        total_distance += distance
        total_service += job.service_duration_minutes
        urgency = job.urgency
        stops.append(
            UrgencyRouteStopOut(
                urgency_id=urgency.id,
                wzc_id=urgency.wzc_id,
                wzc_name=urgency.wzc_name or (urgency.wzc.name if urgency.wzc else ""),
                patient_name=urgency.patient_name,
                urgency_type=urgency.urgency_type,
                sequence=sequence,
                latitude=job.coordinates.latitude,
                longitude=job.coordinates.longitude,
                arrival_time=arrival_time,
                departure_time=departure_time,
                driving_minutes_from_previous=int(round(driving)),
                distance_km_from_previous=round(distance, 1),
                service_duration_minutes=job.service_duration_minutes,
                cumulative_duration_minutes=int(round(cursor - start_minutes)),
            )
        )
        previous_index = stop_index

    final_driving = 0.0
    final_distance = 0.0
    if end_index is not None:
        final_driving = matrix.durations_minutes[previous_index][end_index]
        final_distance = matrix.distances_km[previous_index][end_index]
        total_driving += final_driving
        total_distance += final_distance
        cursor += final_driving

    end_label = "Einde route"
    if end_location:
        end_label = end_location.label
    elif return_to_start:
        end_label = f"Terug naar {start_location.label}"

    return UrgencyRouteOut(
        route_id=f"route-{route.route_index + 1}",
        label=f"Route {route.route_index + 1}",
        color=route_color,
        stops=stops,
        total_distance_km=round(total_distance, 1),
        total_driving_minutes=int(round(total_driving)),
        total_service_minutes=total_service,
        total_duration_minutes=int(round(total_driving + total_service)),
        estimated_start_time=format_clock(start_minutes),
        estimated_end_time=format_clock(cursor),
        end_location_label=end_label,
        final_driving_minutes=int(round(final_driving)),
        final_distance_km=round(final_distance, 1),
        warnings=[],
    )


def build_urgency_route_plan(
    urgencies: Sequence[Urgency],
    payload: UrgencyRoutePlanRequest,
) -> UrgencyRoutePlanOut:
    start_location = validate_location(payload.start_location, "Startlocatie")
    end_location = validate_location(payload.end_location, "Eindlocatie") if payload.end_location else None
    start_minutes = parse_time_minutes(payload.start_time)

    unassigned: list[UrgencyRouteUnassignedOut] = []
    routable_jobs: list[RoutableUrgency] = []
    coordinates: list[Coordinates] = [Coordinates(start_location.latitude, start_location.longitude)]
    warnings: list[str] = []

    selected_ids = list(dict.fromkeys(payload.urgency_ids))
    urgency_by_id = {urgency.id: urgency for urgency in urgencies}
    missing_count = 0
    for urgency_id in selected_ids:
        urgency = urgency_by_id.get(urgency_id)
        if not urgency:
            missing_count += 1
            continue
        if urgency.status == "Afgerond":
            unassigned.append(unassigned_from_urgency(urgency, "Urgentie is al afgerond."))
            continue
        coordinates_for_urgency = urgency_coordinates(urgency)
        if not coordinates_for_urgency:
            unassigned.append(unassigned_from_urgency(urgency, "Geen geldige WZC-coordinaten beschikbaar."))
            continue
        coordinates.append(coordinates_for_urgency)
        routable_jobs.append(
            RoutableUrgency(
                urgency=urgency,
                coordinates=coordinates_for_urgency,
                matrix_index=len(coordinates) - 1,
                service_duration_minutes=payload.service_duration_minutes,
            )
        )
    if missing_count:
        warnings.append(f"{missing_count} geselecteerde urgentie(s) niet gevonden.")

    end_index: int | None = None
    if end_location:
        coordinates.append(Coordinates(end_location.latitude, end_location.longitude))
        end_index = len(coordinates) - 1
    elif payload.return_to_start:
        end_index = 0

    if not routable_jobs:
        warnings.append("Geen routeerbare urgenties in de selectie.")
        return UrgencyRoutePlanOut(
            generated_at=datetime.now(timezone.utc),
            execution_date=payload.execution_date,
            provider="none",
            uses_real_road_network=False,
            uses_live_traffic=False,
            start_location=start_location,
            end_location=end_location,
            return_to_start=payload.return_to_start,
            routes=[],
            unassigned_urgencies=unassigned,
            warnings=warnings,
        )

    matrix = build_travel_matrix(coordinates, payload.start_time, payload.execution_date)
    warnings.extend(matrix.warnings)
    warnings.append("Het huidige urgentiemodel heeft geen afzonderlijk prioriteitsveld; planning gebruikt daarom geen prioriteitsconstraint.")

    routes, late_unassigned = build_optimized_routes(
        routable_jobs,
        payload.route_count,
        matrix,
        end_index,
        payload.max_route_duration_minutes,
    )
    for job in late_unassigned:
        unassigned.append(
            unassigned_from_urgency(
                job.urgency,
                "Past niet binnen de maximale route-duur met de huidige start/eindlocatie en bezoektijd.",
            )
        )

    late_unassigned_indexes = {job.matrix_index for job in late_unassigned}
    jobs_by_index = {job.matrix_index: job for job in routable_jobs if job.matrix_index not in late_unassigned_indexes}
    route_outputs = [
        build_route_response(
            route,
            jobs_by_index,
            matrix,
            start_location,
            end_location,
            payload.return_to_start,
            end_index,
            start_minutes,
        )
        for route in routes
    ]
    if payload.max_route_duration_minutes is not None:
        for route in route_outputs:
            if route.total_duration_minutes > payload.max_route_duration_minutes:
                route.warnings.append("Deze route overschrijdt de ingestelde maximale duur.")

    return UrgencyRoutePlanOut(
        generated_at=datetime.now(timezone.utc),
        execution_date=payload.execution_date,
        provider=matrix.provider,
        uses_real_road_network=matrix.uses_real_road_network,
        uses_live_traffic=matrix.uses_live_traffic,
        has_route_geometry=False,
        start_location=start_location,
        end_location=end_location,
        return_to_start=payload.return_to_start,
        routes=route_outputs,
        unassigned_urgencies=unassigned,
        warnings=list(dict.fromkeys(warnings)),
    )

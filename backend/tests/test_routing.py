from __future__ import annotations

import json
import unittest
from datetime import date
from unittest.mock import patch

from app.core.config import settings
from app.models import Urgency, Wzc
from app.schemas import RoutePlanLocation, UrgencyRoutePlanRequest
from app.services.routing import Coordinates, GoogleRoutesRoutingProvider, build_urgency_route_plan


class FakeRouteResponse:
    def __init__(self, payload: object) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeRouteResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def make_urgency(urgency_id: int, name: str, latitude: float | None, longitude: float | None) -> Urgency:
    wzc = Wzc(
        id=urgency_id,
        external_id=f"wzc-{urgency_id}",
        name=name,
        latitude=latitude,
        longitude=longitude,
    )
    urgency = Urgency(
        id=urgency_id,
        reported_on=date(2026, 8, 25),
        wzc_id=urgency_id,
        wzc_name=name,
        patient_name=f"Patient {urgency_id}",
        urgency_type="Tandpijn",
        status="Open",
    )
    urgency.wzc = wzc
    return urgency


class RoutingServiceTests(unittest.TestCase):
    def route_payload(self, urgency_ids: list[int], route_count: int = 2) -> UrgencyRoutePlanRequest:
        return UrgencyRoutePlanRequest(
            urgency_ids=urgency_ids,
            execution_date=date(2026, 8, 25),
            start_location=RoutePlanLocation(
                label="Global Smile Lokeren",
                latitude=51.07847323810345,
                longitude=3.9955166692622086,
            ),
            return_to_start=True,
            route_count=route_count,
            service_duration_minutes=20,
            start_time="08:30",
        )

    def test_divides_selected_urgencies_over_multiple_routes(self) -> None:
        urgencies = [
            make_urgency(1, "WZC Lokeren", 51.1043, 3.9934),
            make_urgency(2, "WZC Antwerpen", 51.214, 4.42),
            make_urgency(3, "WZC Gent", 51.054, 3.717),
            make_urgency(4, "WZC Mechelen", 51.025, 4.477),
        ]
        with patch.object(settings, "routing_provider", "estimate"):
            plan = build_urgency_route_plan(urgencies, self.route_payload([1, 2, 3, 4], route_count=2))

        assigned_count = sum(len(route.stops) for route in plan.routes)
        self.assertEqual(assigned_count, 4)
        self.assertEqual(len(plan.routes), 2)
        self.assertEqual(plan.execution_date, date(2026, 8, 25))
        self.assertEqual(plan.unassigned_urgencies, [])
        self.assertFalse(plan.uses_real_road_network)
        self.assertTrue(any("benadering" in warning for warning in plan.warnings))

    def test_marks_urgencies_without_coordinates_unassigned(self) -> None:
        urgencies = [
            make_urgency(1, "WZC Lokeren", 51.1043, 3.9934),
            make_urgency(2, "WZC Zonder coordinaten", None, None),
        ]
        with patch.object(settings, "routing_provider", "estimate"):
            plan = build_urgency_route_plan(urgencies, self.route_payload([1, 2], route_count=1))

        self.assertEqual(sum(len(route.stops) for route in plan.routes), 1)
        self.assertEqual(len(plan.unassigned_urgencies), 1)
        self.assertEqual(plan.unassigned_urgencies[0].urgency_id, 2)
        self.assertIn("coordinaten", plan.unassigned_urgencies[0].reason)

    def test_google_routes_provider_parses_traffic_matrix(self) -> None:
        payload = [
            {"originIndex": 0, "destinationIndex": 0, "status": {}, "distanceMeters": 0, "duration": "0s", "condition": "ROUTE_EXISTS"},
            {"originIndex": 0, "destinationIndex": 1, "status": {}, "distanceMeters": 12000, "duration": "600s", "condition": "ROUTE_EXISTS"},
            {"originIndex": 1, "destinationIndex": 0, "status": {}, "distanceMeters": 13000, "duration": "660s", "condition": "ROUTE_EXISTS"},
            {"originIndex": 1, "destinationIndex": 1, "status": {}, "distanceMeters": 0, "duration": "0s", "condition": "ROUTE_EXISTS"},
        ]

        with (
            patch.object(settings, "routing_outbound_enabled", True),
            patch.object(settings, "routing_google_api_key", "test-key"),
            patch.object(settings, "routing_matrix_cache_seconds", 0),
            patch("app.services.routing.urllib.request.urlopen", return_value=FakeRouteResponse(payload)),
        ):
            result = GoogleRoutesRoutingProvider("08:30").travel_time_matrix([
                Coordinates(51.07847323810345, 3.9955166692622086),
                Coordinates(51.209675119629196, 4.399793998102927),
            ])

        self.assertEqual(result.provider, "google_routes")
        self.assertTrue(result.uses_real_road_network)
        self.assertTrue(result.uses_live_traffic)
        self.assertEqual(result.durations_minutes[0][1], 10)
        self.assertEqual(result.distances_km[1][0], 13)


if __name__ == "__main__":
    unittest.main()

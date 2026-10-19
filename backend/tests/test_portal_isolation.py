from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.api.portal import list_demo_centres, planning_scope_statement, urgency_scope_statement
from app.core.config import settings
from app.models import Planning, Urgency
from app.schemas import PortalUrgencyOut


class PortalIsolationTests(unittest.TestCase):
    def test_urgency_scope_always_filters_by_authenticated_wzc(self) -> None:
        statement = urgency_scope_statement(11)
        sql = str(statement.compile(compile_kwargs={"literal_binds": True}))
        self.assertIn("urgencies.wzc_id = 11", sql)

    def test_planning_scope_always_filters_by_authenticated_wzc(self) -> None:
        statement = planning_scope_statement(22)
        sql = str(statement.compile(compile_kwargs={"literal_binds": True}))
        self.assertIn("plannings.wzc_id = 22", sql)

    def test_portal_urgency_schema_does_not_return_patient_name(self) -> None:
        self.assertNotIn("patient_name", PortalUrgencyOut.model_fields)

    def test_demo_centre_directory_is_unavailable_outside_local_environment(self) -> None:
        with patch.object(settings, "environment", "production"):
            with self.assertRaises(HTTPException) as raised:
                list_demo_centres(db=None)
        self.assertEqual(raised.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()

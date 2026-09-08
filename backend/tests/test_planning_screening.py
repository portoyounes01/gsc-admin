from __future__ import annotations

import unittest
from datetime import date
from io import BytesIO

import pandas as pd

from app.services import planning


def workbook_bytes(rows: list[list[object]]) -> bytes:
    output = BytesIO()
    pd.DataFrame(rows).to_excel(output, header=False, index=False)
    return output.getvalue()


class ScreeningPlanningTests(unittest.TestCase):
    def test_skips_title_date_and_combined_header_rows(self) -> None:
        payload = workbook_bytes(
            [
                ["Planning"],
                ["Datum"],
                ["08/09/2026"],
                ["Familienaam & voornaam"],
                ["Peeters Jan"],
                ["Janssens Marie"],
            ]
        )

        rows = planning.preview_screening_workbooks([("screening.xlsx", payload)], date(2026, 9, 8))

        self.assertEqual([row[planning.PATIENT_COL] for row in rows], ["Peeters Jan", "Janssens Marie"])

    def test_skips_title_date_and_separate_header_rows(self) -> None:
        payload = workbook_bytes(
            [
                ["Planning", ""],
                ["Datum", "08/09/2026"],
                ["Familienaam", "Voornaam"],
                ["Peeters", "Jan"],
                ["Janssens", "Marie"],
            ]
        )

        rows = planning.preview_screening_workbooks([("screening.xlsx", payload)], date(2026, 9, 8))

        self.assertEqual([row[planning.PATIENT_COL] for row in rows], ["Peeters Jan", "Janssens Marie"])

    def test_keeps_simple_name_list_without_header(self) -> None:
        payload = workbook_bytes([["Peeters Jan"], ["Janssens Marie"]])

        rows = planning.preview_screening_workbooks([("screening.xlsx", payload)], date(2026, 9, 8))

        self.assertEqual([row[planning.PATIENT_COL] for row in rows], ["Peeters Jan", "Janssens Marie"])


if __name__ == "__main__":
    unittest.main()

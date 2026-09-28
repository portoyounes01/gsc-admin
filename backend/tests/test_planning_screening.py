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

    def test_keeps_month_like_names_with_room_numbers_and_skips_real_dates(self) -> None:
        payload = workbook_bytes(
            [
                ["Naam"],
                ["Test Julia (K7)"],
                ["April Testpersoon (K14)"],
                ["8 september 2026"],
                ["09/09/2026"],
            ]
        )

        rows = planning.preview_screening_workbooks([("screening.xlsx", payload)], date(2026, 9, 8))

        self.assertEqual(
            [row[planning.PATIENT_COL] for row in rows],
            ["Test Julia (K7)", "April Testpersoon (K14)"],
        )


class TreatmentPlanningMatchTests(unittest.TestCase):
    @staticmethod
    def pdf_item(file_name: str, patient_name: str) -> dict[str, object]:
        return {
            "file_name": file_name,
            "pdf_name": patient_name,
            "row": {
                planning.PATIENT_DONE_COL: False,
                planning.PATIENT_NR_COL: 1,
                planning.PATIENT_COL: patient_name,
                planning.TREATMENTS_COL: "Controle",
                planning.DATE_PERIOD_COL: "08/09/2026",
                planning.REMARKS_COL: "",
            },
        }

    def test_matches_exact_names_with_accents_order_and_room_suffix(self) -> None:
        roster_rows = [
            {planning.PATIENT_COL: "De Smet José (K14)"},
            {planning.PATIENT_COL: "Peeters Marie"},
        ]
        pdf_items = [
            self.pdf_item("jose.pdf", "José De Smet"),
            self.pdf_item("marie.pdf", "Marie Peeters"),
        ]

        report = planning.match_treatment_plans(roster_rows, pdf_items)

        self.assertEqual(len(report["matched"]), 2)
        self.assertEqual(report["roster_names"], ["De Smet José (K14)", "Peeters Marie"])
        self.assertEqual([item["file_name"] for item in report["pdfs"]], ["jose.pdf", "marie.pdf"])
        self.assertEqual([item["roster_name"] for item in report["pdfs"]], ["De Smet José (K14)", "Peeters Marie"])
        self.assertEqual(report["missing_names"], [])
        self.assertEqual(report["unselected_pdfs"], [])
        self.assertEqual(report["review"], [])

    def test_reports_missing_and_unselected_names_without_fuzzy_matching(self) -> None:
        roster_rows = [{planning.PATIENT_COL: "Peeters Marie"}]
        pdf_items = [self.pdf_item("maria.pdf", "Peeters Maria")]

        report = planning.match_treatment_plans(roster_rows, pdf_items)

        self.assertEqual(report["matched"], [])
        self.assertEqual(report["missing_names"], ["Peeters Marie"])
        self.assertEqual([item["file_name"] for item in report["unselected_pdfs"]], ["maria.pdf"])
        self.assertEqual(report["pdfs"][0]["roster_name"], "")

    def test_duplicate_names_require_manual_review(self) -> None:
        roster_rows = [
            {planning.PATIENT_COL: "Janssens Jan"},
            {planning.PATIENT_COL: "Jan Janssens"},
        ]
        pdf_items = [self.pdf_item("jan.pdf", "Janssens Jan")]

        report = planning.match_treatment_plans(roster_rows, pdf_items)

        self.assertEqual(report["matched"], [])
        self.assertEqual(len(report["review"]), 1)
        self.assertIn("Dubbele naam", report["review"][0]["reason"])


if __name__ == "__main__":
    unittest.main()

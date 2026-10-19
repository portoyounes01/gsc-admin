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

    def test_reads_free_text_approval_and_keeps_excel_order(self) -> None:
        payload = workbook_bytes(
            [
                ["Familienaam & voornaam", "Kamer", "Op te volgen behandeling"],
                ["De Smet José", "K14", "Familie akkoord"],
                ["Peeters Marie", "K7", "Nog te bespreken"],
                ["Janssens Jan", "K22", "X"],
            ]
        )

        entries = planning.extract_treatment_roster_entries("selectie.xlsx", payload)
        report = planning.build_treatment_selection_report(
            entries,
            [
                self.pdf_item("jan.pdf", "Jan Janssens"),
                self.pdf_item("marie.pdf", "Marie Peeters"),
                self.pdf_item("jose.pdf", "José De Smet"),
            ],
        )

        self.assertEqual([item["pdf_name"] for item in report["items"]], ["José De Smet", "Marie Peeters", "Jan Janssens"])
        self.assertEqual([item["recommended"] for item in report["items"]], [True, False, True])
        self.assertEqual([item["excel_approved"] for item in report["items"]], [True, None, True])
        self.assertEqual([item["excel_status"] for item in report["items"]], ["Familie akkoord", "Nog te bespreken", "X"])

    def test_matches_room_suffixes_and_one_clear_name_variation(self) -> None:
        roster_entries = [
            {"name": "De Smet José kamer 14", "status": "Goedgekeurd", "approved": True, "order": 1},
            {"name": "Jansens Marie K7", "status": "OK", "approved": True, "order": 2},
        ]
        report = planning.build_treatment_selection_report(
            roster_entries,
            [
                self.pdf_item("marie.pdf", "Marie Janssens"),
                self.pdf_item("jose.pdf", "José De Smet"),
            ],
        )

        self.assertEqual([item["pdf_name"] for item in report["items"]], ["José De Smet", "Marie Janssens"])
        self.assertEqual([item["match_kind"] for item in report["items"]], ["exact", "likely"])
        self.assertEqual(report["missing_names"], [])

    def test_matches_decimal_room_suffix_without_damaging_names_starting_with_k(self) -> None:
        self.assertEqual(
            planning.treatment_name_key("Daems Frans kamer 1.21"),
            planning.treatment_name_key("Frans Daems"),
        )
        self.assertEqual(
            planning.treatment_name_key("Van Keulen Ludovica"),
            "keulen ludovica van",
        )
        self.assertEqual(
            planning.treatment_name_key("Dom Jan"),
            planning.treatment_name_key("Jan Dom"),
        )

    def test_treatment_permission_ignores_screening_ok_and_prefers_negative_text(self) -> None:
        payload = workbook_bytes(
            [
                ["Familienaam & voornaam", "Screening", "Op te volgen behandelingen", "Mailadres bewindvoerder"],
                ["Schroder Robert K122", "ok", "?geen antwoord OCMW dus geen toestemming", "ocmw@example.com"],
                ["Verhelst Simone", "ja", "akkoord zoon", ""],
                ["Daems Frans kamer 1.21", "ok", "niet akkoord", "familie@example.com"],
                ["Peeters Marie", "akkoord dochter", "", "familie@example.com"],
            ]
        )

        entries = planning.extract_treatment_roster_entries("selectie.xlsx", payload)

        self.assertEqual([entry["approved"] for entry in entries], [False, True, False, None])
        self.assertEqual(
            [entry["status"] for entry in entries],
            ["?geen antwoord OCMW dus geen toestemming", "akkoord zoon", "niet akkoord", ""],
        )

    def test_links_unique_surname_as_unchecked_suggestion(self) -> None:
        roster_entries = [
            {"name": "Vandereedt Jeeke kamer 1.08", "status": "Akkoord", "approved": True, "order": 1},
            {"name": "Dimitrakopoulos Kamer 1.26", "status": "Akkoord", "approved": True, "order": 2},
        ]
        report = planning.build_treatment_selection_report(
            roster_entries,
            [
                self.pdf_item("vandereedt.pdf", "Marie-Jose Vandereedt"),
                self.pdf_item("dimitrakopoulos.pdf", "Paul Dimitrakopoulos"),
            ],
        )

        self.assertEqual([item["match_kind"] for item in report["items"]], ["surname", "surname"])
        self.assertEqual([item["recommended"] for item in report["items"]], [False, False])
        self.assertEqual([item["excel_approved"] for item in report["items"]], [True, True])
        self.assertEqual(report["missing_names"], [])


if __name__ == "__main__":
    unittest.main()

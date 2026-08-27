from __future__ import annotations

import re
from datetime import date
from io import BytesIO
from typing import Iterable

import pdfplumber

from app.schemas import DossierPreviewRow


def clean_text(value: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", str(value or "").replace("\r", "\n")).strip()


def extract_pdf_text(file_bytes: bytes) -> tuple[str, str]:
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        return "", "PDF kon niet gelezen worden."
    text = clean_text(text)
    if not text:
        return "", "Geen tekstlaag gevonden. Gebruik OCR-controle voor gescande of handgeschreven dossiers."
    return text, ""


def find_labeled_value(text: str, labels: Iterable[str]) -> str:
    for label in labels:
        pattern = re.compile(rf"(?im)^\s*{re.escape(label)}\s*[:\-]?\s*(.+)$")
        match = pattern.search(text)
        if match:
            return match.group(1).strip()
    return ""


def find_email(text: str) -> str:
    match = re.search(r"[\w.\-+]+@[\w.\-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else ""


def find_phone(text: str) -> str:
    candidates = re.findall(r"(?:\+32|0)\s?(?:\d[\s./-]?){7,11}", text)
    return re.sub(r"\s+", " ", candidates[0]).strip() if candidates else ""


def find_insz(text: str) -> str:
    patterns = [
        r"\b\d{6}\s?\d{3}\s?\d{2}\b",
        r"\b\d{2}[.\s]?\d{2}[.\s]?\d{2}[-\s]?\d{3}[.\s]?\d{2}\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            digits = re.sub(r"\D", "", match.group(0))
            if len(digits) == 11:
                return f"{digits[:6]} {digits[6:9]} {digits[9:]}"
    return ""


def valid_date(day: int, month: int, year: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def insz_checksum_matches(digits: str, born_after_1999: bool) -> bool:
    if len(digits) != 11:
        return False
    base_number = int(("2" if born_after_1999 else "") + digits[:9])
    expected_check = 97 - (base_number % 97)
    if expected_check == 0:
        expected_check = 97
    return expected_check == int(digits[9:])


def birthdate_from_insz(insz: str) -> tuple[str, str]:
    digits = re.sub(r"\D", "", insz)
    if len(digits) != 11:
        return "", ""
    year_short = int(digits[:2])
    month = int(digits[2:4])
    day = int(digits[4:6])
    candidates = [
        (valid_date(day, month, 1900 + year_short), False),
        (valid_date(day, month, 2000 + year_short), True),
    ]
    valid_candidates = [
        (candidate_date, born_after_1999)
        for candidate_date, born_after_1999 in candidates
        if candidate_date and candidate_date <= date.today()
    ]
    for candidate_date, born_after_1999 in valid_candidates:
        if insz_checksum_matches(digits, born_after_1999):
            return candidate_date.strftime("%d/%m/%Y"), ""
    if valid_candidates:
        return valid_candidates[-1][0].strftime("%d/%m/%Y"), "Geboortedatum uit INSZ afgeleid; controlegetal nakijken."
    return "", "INSZ bevat geen geldige geboortedatum."


def split_name(full_name: str) -> tuple[str, str]:
    cleaned = re.sub(r"\s+", " ", full_name).strip(" ,")
    if "," in cleaned:
        last_name, first_name = [part.strip() for part in cleaned.split(",", 1)]
        return last_name, first_name
    parts = cleaned.split()
    if len(parts) >= 2:
        return parts[-1], " ".join(parts[:-1])
    return cleaned, ""


def guess_gender(text: str) -> str:
    value = find_labeled_value(text, ["Geslacht", "Gender"])
    lowered = value.lower()
    if lowered.startswith("m") or "man" in lowered:
        return "Man"
    if lowered.startswith("v") or lowered.startswith("f") or "vrouw" in lowered:
        return "Vrouw"
    return value


def preview_dossier(file_name: str, file_bytes: bytes) -> DossierPreviewRow:
    text, text_remark = extract_pdf_text(file_bytes)
    remarks = [text_remark] if text_remark else []
    insz = find_insz(text)
    birthdate, birthdate_remark = birthdate_from_insz(insz)
    if birthdate_remark:
        remarks.append(birthdate_remark)
    full_name = find_labeled_value(text, ["Naam en voornaam", "Naam", "Patient", "Patiënt", "Bewoner"])
    last_name, first_name = split_name(full_name)
    if not full_name:
        remarks.append("Naam niet zeker herkend.")
    if not insz:
        remarks.append("INSZ niet herkend.")
    return DossierPreviewRow(
        file_name=file_name,
        insz=insz,
        last_name=last_name,
        first_name=first_name,
        email=find_labeled_value(text, ["E-mail", "Email"]) or find_email(text),
        phone=find_labeled_value(text, ["Telefoonnummer", "Telefoon", "Tel"]) or find_phone(text),
        birthdate=birthdate,
        gender=guess_gender(text),
        medication=find_labeled_value(text, ["Medicatie", "Medicatiegebruik", "Geneesmiddelen"]),
        remarks="; ".join(remark for remark in remarks if remark),
    )

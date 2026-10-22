import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { api, clearToken, getToken } from "./api";
import { UserPasswordForm } from "./UserPasswordForm";
import type { AuditLog, DossierPreviewRow, Planning, PlanningRow, PortalAccount, Prospect, SavedUrgencyRoutePlan, TeamProfile, TreatmentSelectionReport, Urgency, UrgencyRoutePlan, User, Wzc } from "./types";
import { PortalApp } from "./portal/PortalApp";

type Lang = "nl" | "en";
const LangContext = createContext<Lang>("nl");
function useLang() { return useContext(LangContext); }

function getSavedLang(): Lang {
  try { const v = localStorage.getItem("gsc-lang"); if (v === "en" || v === "nl") return v; } catch {}
  return "nl";
}

const enLabels: Record<string, string> = {
  "Home": "Home",
  "Planning": "Planning",
  "Behandelplanning": "Treatment Planning",
  "Mondzorgdossiers": "Dental Records",
  "Urgenties": "Urgencies",
  "WZC opvolging": "Care Home Follow-up",
  "WZC database": "Care Home Database",
  "Admin": "Admin",
  "Teams": "Teams",
  "Gebruikers": "Users",
  "Gebruikerslog": "User Log",
  "Nieuwe planning": "New Planning",
  "Voorgaande planningen": "Previous Plannings",
  "Behandeling": "Treatment",
  "Screening": "Screening",
  "Maand": "Month",
  "Lijst": "List",
  "Concept": "Draft",
  "Gepland": "Planned",
  "Bevestigd": "Confirmed",
  "Uitgevoerd": "Completed",
  "Geannuleerd": "Cancelled",
  "Tandpijn": "Toothache",
  "Prothese past niet goed": "Denture not fitting properly",
  "Prothese gebroken": "Prosthesis broken",
  "Ontsteking": "Infection",
  "Andere": "Other",
  "Aan te schrijven": "To Contact",
  "Aangeschreven": "Contacted",
  "Reactie ontvangen": "Response Received",
  "Draaiboek verstuurd": "Playbook Sent",
  "Gesprek gepland": "Meeting Scheduled",
  "On hold": "On Hold",
  "Telefoon": "Phone",
  "E-mail": "Email",
  "Fysiek": "In-person",
  "Negatief": "Negative",
  "Positief": "Positive",
  "Twijfelend": "Hesitant",
  "Tandarts": "Dentist",
  "Mondhygiënist": "Dental Hygienist",
  "Assistent": "Assistant",
  "Coördinator": "Coordinator",
  "Administratie": "Administration",
  "Controle / Consultatie": "Check-up / Consultation",
  "Tandreiniging": "Cleaning",
  "Volledige reiniging": "Full Cleaning",
  "Vulling": "Filling",
  "Extractie": "Extraction",
  "Prothese afdruk": "Prosthesis Impression",
  "Prothese aanpassing / rebase": "Prosthesis Adjustment / Rebasing",
  "Prothese reparatie": "Prosthesis Repair",
  "Prothese tandtoevoeging": "Prosthesis Tooth Addition",
  "Kroon / Brug": "Crown / Bridge",
  "Implantaat": "Implant",
  "Urgentie / Pijnklacht": "Urgency / Pain Complaint",
  "Mobiele WZC-behandeling": "Mobile Care Home Treatment",
  "DentAdmin / Administratie": "DentAdmin / Administration",
  "Mondzorgdossier / Intake": "Dental Record / Intake",
  "Intern dashboard": "Internal Dashboard",
  "Beveiligde beta-omgeving voor intern administratief gebruik.": "Secure beta environment for internal administrative use.",
  "Wachtwoord": "Password",
  "Aanmelden": "Sign in",
  "Aanmelden...": "Signing in...",
  "Instellingen": "Settings",
  "Actieve module": "Active module",
  "Rol": "Role",
  "Intern en vertrouwelijk": "Internal & confidential",
  "Afmelden": "Sign out",
  "Taal": "Language",
  "WZC's": "Care Homes",
  "Actieve WZC's": "Active Care Homes",
  "Evaluaties": "Evaluations",
  "Prospecties": "Prospects",
  "Gem. score": "Avg. Score",
  "Hoog risico": "High Risk",
  "Volgende bezoeken": "Upcoming Visits",
  "Urgenties bekijken": "View Urgencies",
  "patiënten": "patients",
  "Geen toekomstige planningen.": "No upcoming plannings.",
  "KPI's per thema": "KPIs by Theme",
  "Nog geen evaluaties om KPI's per thema te tonen.": "No evaluations yet to display KPIs by theme.",
  "PDF's verwerken naar een behandelplanning en afvinklijst voor Excel.": "Process PDFs into a treatment plan and checklist for Excel.",
  "Dossiers tijdelijk uitlezen voor controle en invoer in DentAdmin.": "Temporarily read records for verification and entry into DentAdmin.",
  "WZC-masterdata, prospectie, urgenties en project-KPI's opvolgen.": "Track care home master data, prospecting, urgencies and project KPIs.",
  "Zoek WZC, adres of gemeente": "Search care home, address or city",
  "Zoekveld wissen": "Clear search",
  "Geen WZC gevonden.": "No care homes found.",
  "Klik op een marker voor details.": "Click on a marker for details.",
  "Sluiten": "Close",
  "Open prospectfiche": "Open prospect details",
  "Open WZC-fiche": "Open care home details",
  "Planning maken": "Create planning",
  "Urgentie toevoegen": "Add urgency",
  "open urgenties": "open urgencies",
  "open urgentie": "open urgency",
  "Groep": "Group",
  "Adres": "Address",
  "Contact": "Contact",
  "Website": "Website",
  "Deadline volgende actie": "Next action deadline",
  "Volgende bezoek": "Next visit",
  "Volgende actie": "Next action",
  "Start": "Start",
  "Einde": "End",
  "Gestippelde lijnen tonen volgorde, geen wegpolyline.": "Dashed lines show sequence, not road polylines.",
  "Routekaart kon niet geladen worden.": "Route map could not be loaded.",
  "Kaartbibliotheek kon niet geladen worden.": "Map library could not be loaded.",
  "Leaflet kon niet geladen worden.": "Leaflet could not be loaded.",
  "MapLibre vectorlaag kon niet geladen worden.": "MapLibre vector layer could not be loaded.",
  "CARTO vectorstijl kon niet geladen worden.": "CARTO vector style could not be loaded.",
  "Actief": "Active",
  "Geen team gekozen": "No team selected",
  "teamleden geselecteerd": "team members selected",
  "Teamprofiel": "Team profile",
  "Geen actieve teamprofielen.": "No active team profiles.",
  "Aanwezig team aanvinken": "Select attending team members",
  "Typ of kies groep": "Type or select group",
  "Typ of kies WZC": "Type or select care home",
  "Geen resultaten": "No results",
  "Agenda-overzicht": "Agenda overview",
  "toekomstige planning(en)": "upcoming planning(s)",
  "screening(en)": "screening(s)",
  "waarvan": "of which",
  "planning(en)": "planning(s)",
  "meer": "more",
  "Nog geen planning in de agenda.": "No planning in the agenda yet.",
  "planning(en) op deze dag.": "planning(s) on this day.",
  "Geen screening of behandeldag gepland.": "No screening or treatment day planned.",
  "Plan screeningdagen en behandeldagen in de agenda.": "Schedule screening days and treatment days in the agenda.",
  "Screeningdag of namenlijst voorbereiden": "Prepare screening day or name list",
  "Behandeldag": "Treatment Day",
  "Mobiele behandelingen op locatie": "Mobile treatments on location",
  "Datum": "Date",
  "Status": "Status",
  "Groep/organisatie": "Group/organization",
  "Alle groepen": "All groups",
  "WZC": "Care home",
  "Nog geen WZC gekozen": "No care home selected",
  "Titel": "Title",
  "Wordt automatisch ingevuld": "Will be filled automatically",
  "Notitie": "Note",
  "Praktische afspraken, materiaal, aandachtspunten...": "Practical arrangements, materials, points of attention...",
  "Planning bewaren...": "Saving planning...",
  "In agenda zetten": "Add to agenda",
  "Planning kon niet aangemaakt worden.": "Planning could not be created.",
  "Status kon niet aangepast worden.": "Status could not be updated.",
  "Bent u zeker? U staat op het punt om": "Are you sure? You are about to delete",
  "te verwijderen.": "",
  "Planning kon niet verwijderd worden.": "Planning could not be deleted.",
  "Geen WZC gekozen": "No care home chosen",
  "bewoner(s)": "resident(s)",
  "Team:": "Team:",
  "Aanvullen": "Supplement",
  "Verwijderen": "Delete",
  "Tijdelijke urgentielijst": "Temporary urgency list for internal follow-up and entry into DentAdmin. Only note essential data. Open urgencies are kept until completed.",
  "Urgentie": "Urgency type",
  "Opmerking": "Remark",
  "Opslaan": "Save",
  "Open urgenties": "Open urgencies",
  "Routes laden...": "Routes loading...",
  "Nog geen opgeslagen urgentieroute voor": "No saved urgency route for",
  "urgenties": "urgencies",
  "urgentie": "urgency",
  "aangemaakt": "created",
  "bezoeken": "visits",
  "eerste": "first",
  "klaar": "done at",
  "geen bezoeken": "no visits",
  "Routeplanning": "Route planning",
  "Geeft een aanbevolen volgorde voor open urgenties, op basis van de beschikbare rijtijdmatrix.": "Provides a recommended order for open urgencies, based on the available travel time matrix.",
  "Routeplanning sluiten": "Close route planning",
  "Route plannen": "Plan route",
  "geselecteerd": "selected",
  "met coördinaten": "with coordinates",
  "Geen WZC": "No care home",
  "Geen WZC-coördinaten": "No care home coordinates",
  "Nog geen open urgenties om te plannen.": "No open urgencies to plan yet.",
  "Bezoektijd per urgentie": "Visit time per urgency",
  "urgenties ingepland": "urgencies scheduled",
  "Opslaan...": "Saving...",
  "Opgeslagen": "Saved",
  "Opslaan voor": "Save for",
  "Geen urgenties toegewezen aan deze route.": "No urgencies assigned to this route.",
  "Geen opmerking": "No remark",
  "Nog geen open urgenties.": "No open urgencies yet.",
  "Opgeslagen routes konden niet geladen worden.": "Saved routes could not be loaded.",
  "Selecteer minstens een open urgentie.": "Select at least one open urgency.",
  "Routeplanning kon niet berekend worden.": "Route planning could not be calculated.",
  "Urgentieroute": "Urgency route",
  "Planning aanvullen": "Supplement planning",
  "Planningdetails": "Planning details",
  "Ingeplande dagen koppelen en bewoners toevoegen": "Link scheduled days and add residents",
  "planning(en) met detail": "planning(s) with detail",
  "Ingeplande dag aanvullen": "Supplement scheduled day",
  "Upload een Excel- of CSV-lijst en controleer wie op de screeninglijst staat.": "Upload an Excel or CSV list and check who is on the screening list.",
  "Upload de behandelplan-PDF's, controleer de uitgelezen namen en duid per bewoner aan of die wordt opgenomen.": "Upload treatment plan PDFs, check names and select residents.",
  "Loskoppelen en leegmaken": "Unlink and clear",
  "Alles leegmaken": "Clear all",
  "Ingeplande dag uit Planning": "Scheduled day from Planning",
  "Typ datum, WZC of soort planning": "Type date, care home or planning type",
  "Geen ingeplande dag gevonden": "No scheduled day found",
  "Gekoppeld aan Planning": "Linked to Planning",
  "Geen ingeplande dag geselecteerd": "No scheduled day selected",
  "Kies eerst een screening of behandeldag uit Planning om die hier verder aan te vullen.": "First select a screening or treatment day from Planning to supplement here.",
  "Losse planning blijft mogelijk, maar de normale flow start in Planning.": "Standalone planning remains possible, but the normal flow starts in Planning.",
  "Screeningen": "Screenings",
  "Excel-lijst met bewoners en aantallen": "Excel list with residents and counts",
  "Behandelingen": "Treatments",
  "PDF's uitlezen naar behandelplanning": "Read PDFs into treatment planning",
  "Naam planning": "Planning name",
  "Planningsdatum": "Planning date",
  "Screening Excel-lijst": "Screening Excel list",
  "Behandelplan PDF's": "Treatment plan PDFs",
  "Nog geen Excel- of CSV-lijst gekozen.": "No Excel or CSV list selected yet.",
  "Nog geen PDF's gekozen.": "No PDFs selected yet.",
  "Namenlijst inlezen": "Read name list",
  "Behandelplannen uitlezen": "Read treatment plans",
  "Namen lezen...": "Reading names...",
  "PDF's lezen...": "Reading PDFs...",
  "Preview screeninglijst": "Preview screening list",
  "Preview behandelplanning": "Preview treatment planning",
  "Lijstselectie": "File selection",
  "Bestanden opnemen": "Include files",
  "van": "of",
  "Alle namen uit deze lijst worden meegenomen; controleer vooral aantal en schrijfwijze.": "All names from this list will be included; mainly check the count and spelling.",
  "Vink enkel bewoners aan die effectief in deze planning mogen meegaan.": "Only check the residents that should actually be in this planning.",
  "persoon/personen": "person(s)",
  "geschat": "estimated",
  "Excelnamen": "Excel names",
  "Opslaan in ingeplande dag": "Save in scheduled day",
  "Screening bewaren": "Save screening",
  "Genereren...": "Generating...",
  "Excel genereren": "Generate Excel",
  "Wel in Excel, geen behandelplan gevonden": "In Excel but no treatment plan found",
  "Status controleren": "Check status",
  "Nog geen behandelingen ingevuld": "No treatments filled in yet",
  "Naam bewoner": "Resident name",
  "Op te volgen behandeling": "Treatment to follow up",
  "leeg in Excel": "empty in Excel",
  "Suggestie op achternaam, controleren": "Suggestion based on surname, verify",
  "Akkoord gevonden · controleer alleen de naamkoppeling": "Approved found · only verify name linking",
  "Niet teruggevonden in Excel · controleer handmatig": "Not found in Excel · verify manually",
  "Behandelingen en opmerking": "Treatments and remark",
  "Opmerkingen": "Remarks",
  "Alle ingeplande screenings en behandeldagen met hun bewonerslijst. PDF-bestanden zelf worden niet bewaard.": "All scheduled screenings and treatment days with their resident list. PDF files are not stored.",
  "Geen locatie": "No location",
  "patiënt(en)": "patient(s)",
  "behandeling(en)": "treatment(s)",
  "Nog geen ingeplande dagen.": "No scheduled days yet.",
  "Excel downloaden": "Download Excel",
  "Nieuwe datum": "New date",
  "Datum bewaren": "Save date",
  "Naamwijziging annuleren": "Cancel name change",
  "Naam bewaren": "Save name",
  "Acties voor bewoner": "Actions for resident",
  "Naam bewerken": "Edit name",
  "Bewoner verwijderen": "Remove resident",
  "Bewoners toevoegen via": "Add residents via",
  "behandelplan-PDF's": "treatment plan PDFs",
  "Gebruikt volgorde en goedkeuringstekst als voorstel.": "Uses order and approval text as suggestion.",
  "Inlezen...": "Reading...",
  "Alles op ja": "All yes",
  "Alles op nee": "All no",
  "Toevoegen aan planning": "Add to planning",
  "bewoner(s) uitgelezen": "resident(s) read",
  "opnemen.": "to include.",
  "Geen behandeling herkend": "No treatment recognized",
  "suggestie op achternaam, controleren": "suggestion based on surname, verify",
  "Ja": "Yes",
  "Nee": "No",
  "Gebruiker toevoegen": "Add user",
  "Data laden mislukt.": "Data loading failed.",
  "Prospectie": "Prospecting",
  "Onbekend": "Unknown",
  "Annuleren": "Cancel",
};

function t(lang: Lang, key: string): string {
  if (lang === "en") return enLabels[key] || key;
  return key;
}

type Section = "Home" | "Planning" | "Behandelplanning" | "Mondzorgdossiers" | "Urgenties" | "WZC opvolging" | "WZC database";
type FollowupMode = "Prospectie" | "Actieve WZC's";
type DatabaseTab = "WZC database" | "Teams" | "Gebruikers" | "Gebruikerslog" | "Portaal accounts";
type PlanningTab = "Nieuwe planning" | "Voorgaande planningen";
type PlanningKind = "Behandeling" | "Screening";
type AgendaMode = "Maand" | "Lijst";
type DropdownOption = {
  value: string;
  label: string;
  meta?: string;
};
type ExtraContact = {
  name: string;
  role: string;
  phone: string;
  email: string;
};
const sections: Section[] = ["Home", "Planning", "Behandelplanning", "Mondzorgdossiers", "Urgenties", "WZC opvolging", "WZC database"];
const urgencyTypes = ["Tandpijn", "Prothese past niet goed", "Prothese gebroken", "Ontsteking", "Andere"];
const planningStatusOptions = ["Concept", "Gepland", "Bevestigd", "Uitgevoerd", "Geannuleerd"];
const todayIso = new Date().toISOString().slice(0, 10);
const routeStartLocations = [
  {
    key: "global-smile-lokeren",
    label: "Global Smile Lokeren",
    latitude: 51.07847323810345,
    longitude: 3.9955166692622086,
  },
  {
    key: "praktijk-antwerpen",
    label: "Praktijk Antwerpen",
    latitude: 51.209675119629196,
    longitude: 4.399793998102927,
  },
] as const;
const prospectStatuses = ["Aan te schrijven", "Aangeschreven", "Reactie ontvangen", "Draaiboek verstuurd", "Gesprek gepland", "On hold"];
const prospectChannels = ["Telefoon", "E-mail", "Fysiek"];
const prospectResponses = ["Negatief", "Positief", "Twijfelend"];
const defaultProspectStatus = prospectStatuses[0];
const teamRoles = ["Tandarts", "Mondhygiënist", "Assistent", "Coördinator", "Administratie", "Andere"];
const teamSkillsets = [
  "Controle / Consultatie",
  "Tandreiniging",
  "Volledige reiniging",
  "Vulling",
  "Extractie",
  "Prothese afdruk",
  "Prothese aanpassing / rebase",
  "Prothese reparatie",
  "Prothese tandtoevoeging",
  "Kroon / Brug",
  "Implantaat",
  "Urgentie / Pijnklacht",
  "Mobiele WZC-behandeling",
  "DentAdmin / Administratie",
  "Mondzorgdossier / Intake"
];
const databaseTabs: DatabaseTab[] = ["WZC database", "Teams", "Gebruikers", "Gebruikerslog", "Portaal accounts"];
const leafletCssUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const leafletScriptUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const maplibreCssUrl = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css";
const maplibreScriptUrl = "https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js";
const maplibreLeafletScriptUrl = "https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js";
const cartoBasemapKey = import.meta.env.VITE_CARTO_BASEMAP_KEY || "";
const cartoBasemapKeyQuery = cartoBasemapKey ? `?key=${encodeURIComponent(cartoBasemapKey)}` : "";
const cartoVectorStyleUrl = `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json${cartoBasemapKeyQuery}`;
const cartoRasterTileUrl = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${cartoBasemapKeyQuery}`;
const leafletTileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>';
const leafletTileMaxZoom = 20;

declare global {
  interface Window {
    L?: any;
    maplibregl?: any;
  }
}

function cleanFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_") || "planning";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
}

function localDateFromIso(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function isoFromLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsIso(value: string, offset: number) {
  const date = localDateFromIso(value);
  return isoFromLocalDate(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

function monthLabel(value: string, lang: Lang = "nl") {
  const date = localDateFromIso(value);
  return new Intl.DateTimeFormat(lang === "nl" ? "nl-BE" : "en-US", { month: "long", year: "numeric" }).format(date);
}

function weekdayShortLabel(value: string, lang: Lang = "nl") {
  const date = localDateFromIso(value);
  return new Intl.DateTimeFormat(lang === "nl" ? "nl-BE" : "en-US", { weekday: "short" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

function arrivalWindowLabel(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const arrivalMinutes = hour * 60 + minute;
  const startMinutes = Math.floor(arrivalMinutes / 30) * 30;
  const endMinutes = startMinutes + 60;
  const formatWindowTime = (totalMinutes: number) => {
    const minutesInDay = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const windowHour = Math.floor(minutesInDay / 60);
    const windowMinute = minutesInDay % 60;
    return `${String(windowHour).padStart(2, "0")}:${String(windowMinute).padStart(2, "0")}`;
  };
  return `tussen ${formatWindowTime(startMinutes)} en ${formatWindowTime(endMinutes)}`;
}

function formatDistance(kilometers: number) {
  if (kilometers < 1) return `${Math.round(kilometers * 1000)} m`;
  return `${kilometers.toFixed(1).replace(".", ",")} km`;
}

function mapsCoordinate(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

function googleMapsRouteUrl(plan: UrgencyRoutePlan, route: UrgencyRoutePlan["routes"][number]) {
  if (!route.stops.length) return "";
  const origin = mapsCoordinate(plan.start_location.latitude, plan.start_location.longitude);
  let destination = "";
  let waypointStops = route.stops;

  if (plan.end_location) {
    destination = mapsCoordinate(plan.end_location.latitude, plan.end_location.longitude);
  } else if (plan.return_to_start) {
    destination = origin;
  } else {
    const lastStop = route.stops[route.stops.length - 1];
    destination = mapsCoordinate(lastStop.latitude, lastStop.longitude);
    waypointStops = route.stops.slice(0, -1);
  }

  if (waypointStops.length > 9) return "";
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
    dir_action: "navigate",
  });
  if (waypointStops.length) {
    params.set("waypoints", waypointStops.map((stop) => mapsCoordinate(stop.latitude, stop.longitude)).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function googleMapsWaypointCount(plan: UrgencyRoutePlan, route: UrgencyRoutePlan["routes"][number]) {
  if (!route.stops.length) return 0;
  if (plan.end_location || plan.return_to_start) return route.stops.length;
  return Math.max(0, route.stops.length - 1);
}

function routePlanSourceLabel(plan: UrgencyRoutePlan, lang: Lang = "nl") {
  if (plan.uses_live_traffic) return lang === "nl" ? "Live verkeer" : "Live Traffic";
  if (plan.uses_real_road_network) return lang === "nl" ? "Wegennetwerk" : "Road Network";
  return lang === "nl" ? "Schatting" : "Estimate";
}

function routePlanSourceText(plan: UrgencyRoutePlan, lang: Lang = "nl") {
  if (plan.uses_live_traffic) return lang === "nl" ? "Volgorde berekend met live verkeersgegevens" : "Order calculated using live traffic data";
  if (plan.uses_real_road_network) return lang === "nl" ? "Volgorde berekend met rijtijden op het wegennetwerk, zonder live verkeer" : "Order calculated using road network travel times, without live traffic";
  return lang === "nl" ? "Volgorde lokaal geschat; Google Maps toont de effectieve rijtijd na openen" : "Order estimated locally; Google Maps shows actual travel time when opened";
}

function routeShareText(plan: UrgencyRoutePlan, route: UrgencyRoutePlan["routes"][number], lang: Lang = "nl") {
  const stops = route.stops
    .map((stop) => `${stop.sequence}. ${stop.wzc_name} (${arrivalWindowLabel(stop.arrival_time)})`)
    .join("\n");
  return [
    `${route.label} ${lang === "nl" ? "urgenties" : "urgencies"}`,
    `Start: ${plan.start_location.label} ${lang === "nl" ? "om" : "at"} ${route.estimated_start_time}`,
    stops,
    `${lang === "nl" ? "Einde" : "End"}: ${route.end_location_label} ${lang === "nl" ? "om" : "at"} ${route.estimated_end_time}`,
    `${lang === "nl" ? "Totaal" : "Total"}: ${formatDuration(route.total_duration_minutes)} · ${formatDistance(route.total_distance_km)}`,
    lang === "nl"
      ? "Patiëntgegevens zijn bewust niet opgenomen in deze link. Raadpleeg de app of DentAdmin voor details."
      : "Patient details are intentionally not included in this link. Check the app or DentAdmin for details.",
  ].filter(Boolean).join("\n");
}

function planningKindLabel(value: string, lang: Lang = "nl") {
  if (value === "Screening") return "Screening";
  return lang === "nl" ? "Behandeldag" : "Treatment Day";
}

function planningTypeForKind(kind: PlanningKind) {
  return kind === "Screening" ? "Screening" : "Behandeling";
}

function planningStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("bevestigd") || normalized.includes("confirmed")) return "confirmed";
  if (normalized.includes("uitgevoerd") || normalized.includes("completed")) return "done";
  if (normalized.includes("geannuleerd") || normalized.includes("cancelled")) return "cancelled";
  if (normalized.includes("gepland") || normalized.includes("planned")) return "planned";
  return "draft";
}

function planningWorkflowLabel(planning: Planning, lang: Lang = "nl") {
  const noWzc = lang === "nl" ? "Geen WZC" : "No Care Home";
  return `${formatDate(planning.planning_date)} · ${planning.start_time || "09:00"} · ${planning.location || noWzc} · ${planningKindLabel(planning.planning_type, lang)}`;
}

function planningWorkflowMeta(planning: Planning, lang: Lang = "nl") {
  const unit = lang === "nl" ? "bewoner" : "resident";
  const rowLabel = `${planning.rows.length} ${unit}${planning.rows.length === 1 ? "" : lang === "nl" ? "s" : "s"}`;
  return `${planning.planning_status || "Concept"} · ${rowLabel}${planning.team_label ? ` · ${planning.team_label}` : ""}`;
}

function formatPostalCode(value?: string | null) {
  return String(value || "").replace(/\.0$/, "");
}

function formatPhone(value?: string | null) {
  return String(value || "").replace(/\.0$/, "");
}

function phoneHref(value?: string | null) {
  const cleaned = formatPhone(value).replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function emailHref(value?: string | null) {
  const email = String(value || "").trim();
  return email ? `mailto:${email}` : "";
}

function websiteHref(value?: string | null) {
  const website = String(value || "").trim();
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

function blankExtraContact(): ExtraContact {
  return { name: "", role: "", phone: "", email: "" };
}

function cleanExtraContact(contact: Partial<ExtraContact>): ExtraContact {
  return {
    name: String(contact.name || "").trim(),
    role: String(contact.role || "").trim(),
    phone: formatPhone(contact.phone || "").trim(),
    email: String(contact.email || "").trim(),
  };
}

function parseExtraContacts(value?: string | null): ExtraContact[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((contact) => cleanExtraContact(contact || {}))
      .filter((contact) => contact.name || contact.role || contact.phone || contact.email);
  } catch {
    return [];
  }
}

function serializeExtraContacts(contacts: ExtraContact[]) {
  const cleaned = contacts
    .map(cleanExtraContact)
    .filter((contact) => contact.name || contact.role || contact.phone || contact.email);
  return cleaned.length ? JSON.stringify(cleaned) : "";
}

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.map((part, index) => index === 1 ? formatPostalCode(part) : String(part || "").trim()).filter(Boolean).join(", ");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isGroupRecord(wzc: Wzc) {
  return normalizeSearch(wzc.collaboration_status || "") === "groep";
}

function actualWzcs(wzcs: Wzc[]) {
  return wzcs.filter((wzc) => !isGroupRecord(wzc));
}

function groupOptionsForWzcs(wzcs: Wzc[]) {
  return uniqueGroupOptions(actualWzcs(wzcs).map((wzc) => wzc.group_name));
}

function groupOptionsForWzcsAndProspects(wzcs: Wzc[], prospects: Prospect[]) {
  return uniqueGroupOptions([
    ...actualWzcs(wzcs).map((wzc) => wzc.group_name),
    ...prospects.map((prospect) => prospect.group_name)
  ]);
}

function uniqueGroupOptions(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function applyGroupFilter(wzcs: Wzc[], groupFilter: string) {
  const records = actualWzcs(wzcs);
  const cleanFilter = groupFilter.trim();
  if (!cleanFilter) return records;
  const exactMatchExists = records.some((wzc) => wzc.group_name === cleanFilter);
  const normalizedFilter = normalizeSearch(cleanFilter);
  return records.filter((wzc) => exactMatchExists
    ? wzc.group_name === cleanFilter
    : normalizeSearch(wzc.group_name || "").includes(normalizedFilter)
  );
}

function baseWzcSearchLabel(wzc: Wzc) {
  const cityLabel = [formatPostalCode(wzc.postal_code), wzc.city].filter(Boolean).join(" ");
  return [wzc.name, wzc.group_name, cityLabel].filter(Boolean).join(" · ");
}

function wzcSearchOptions(wzcs: Wzc[]) {
  const baseLabels = wzcs.map(baseWzcSearchLabel);
  const counts = new Map<string, number>();
  baseLabels.forEach((label) => counts.set(label, (counts.get(label) || 0) + 1));
  return wzcs.map((wzc, index) => {
    const baseLabel = baseLabels[index] || wzc.name;
    const label = counts.get(baseLabel)! > 1 ? `${baseLabel} · ${wzc.external_id || wzc.id}` : baseLabel;
    return { wzc, label };
  });
}

function SearchableGroupSelect({
  label,
  value,
  groups,
  onChange,
  placeholder = "Typ of kies groep",
  className,
  ariaLabel
}: {
  label?: string;
  value: string;
  groups: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const options = useMemo(
    () => groups.map((group) => ({ value: group, label: group })),
    [groups]
  );
  return (
    <SearchableDropdownField
      label={label}
      value={value}
      options={options}
      onInputChange={onChange}
      onSelect={(option) => onChange(option.value)}
      placeholder={placeholder}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

function SearchableWzcSelect({
  label,
  value,
  wzcs,
  onChange,
  placeholder = "Typ of kies WZC",
  className
}: {
  label: string;
  value: number | "";
  wzcs: Wzc[];
  onChange: (value: number | "") => void;
  placeholder?: string;
  className?: string;
}) {
  const options = useMemo(() => wzcSearchOptions(wzcs), [wzcs]);
  const optionByLabel = useMemo(() => new Map(options.map((option) => [option.label, option.wzc])), [options]);
  const selectedLabel = value === "" ? "" : options.find((option) => option.wzc.id === Number(value))?.label || "";
  const [inputValue, setInputValue] = useState(selectedLabel);

  useEffect(() => {
    setInputValue(selectedLabel);
  }, [selectedLabel]);

  function changeWzc(nextValue: string) {
    setInputValue(nextValue);
    const selectedOption = optionByLabel.get(nextValue)
      || options.find((option) => normalizeSearch(option.label) === normalizeSearch(nextValue))?.wzc;
    onChange(selectedOption ? selectedOption.id : "");
  }

  return (
    <SearchableDropdownField
      label={label}
      value={inputValue}
      options={options.map((option) => ({ value: String(option.wzc.id), label: option.label }))}
      onInputChange={changeWzc}
      onSelect={(option) => {
        const selectedWzc = wzcs.find((wzc) => wzc.id === Number(option.value));
        setInputValue(option.label);
        onChange(selectedWzc ? selectedWzc.id : "");
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

function SearchableDropdownField({
  label,
  value,
  options,
  onInputChange,
  onSelect,
  placeholder,
  className,
  ariaLabel,
  emptyText = "Geen resultaten"
}: {
  label?: string;
  value: string;
  options: DropdownOption[];
  onInputChange: (value: string) => void;
  onSelect: (option: DropdownOption) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  emptyText?: string;
}) {
  const listId = useId();
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedValue = normalizeSearch(value);
  const filteredOptions = useMemo(() => {
    const filtered = normalizedValue
      ? options.filter((option) => normalizeSearch([option.label, option.meta, option.value].filter(Boolean).join(" ")).includes(normalizedValue))
      : options;
    return filtered.slice(0, 12);
  }, [normalizedValue, options]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value, options]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!fieldRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function chooseOption(option: DropdownOption) {
    onSelect(option);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && open && filteredOptions[highlightedIndex]) {
      event.preventDefault();
      chooseOption(filteredOptions[highlightedIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`searchableDropdownField ${className || ""}`.trim()} ref={fieldRef}>
      {label && <span className="searchableDropdownLabel">{label}</span>}
      <div className="searchableDropdownControl">
        <input
          value={value}
          onChange={(event) => {
            onInputChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel || label}
          autoComplete="off"
        />
        {open && (
          <div className="searchableDropdownMenu" id={listId} role="listbox">
            {filteredOptions.map((option, index) => (
              <button
                className={`searchableDropdownOption ${index === highlightedIndex ? "isHighlighted" : ""}`}
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(option)}
              >
                <span>{option.label}</span>
                {option.meta && <small>{option.meta}</small>}
              </button>
            ))}
            {filteredOptions.length === 0 && <div className="searchableDropdownEmpty">{emptyText}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function teamNamesFromLabel(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function teamLabelFromNames(names: string[]) {
  return names.join(", ");
}

function TeamProfileSelect({
  label,
  teams,
  value,
  onChange,
  className
}: {
  label: string;
  teams: TeamProfile[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const fieldRef = useRef<HTMLDetailsElement | null>(null);
  const activeTeams = useMemo(
    () => teams.filter((team) => team.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );
  const activeTeamNames = useMemo(() => new Set(activeTeams.map((team) => team.name)), [activeTeams]);
  const selectedNames = useMemo(() => teamNamesFromLabel(value), [value]);
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const selectedSummary = selectedNames.length === 0
    ? "Geen team gekozen"
    : selectedNames.length === 1
      ? selectedNames[0]
      : `${selectedNames.length} teamleden geselecteerd`;

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!fieldRef.current?.contains(event.target as Node)) fieldRef.current?.removeAttribute("open");
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function toggleTeam(teamName: string, checked: boolean) {
    const nextSelected = checked
      ? [...selectedNames.filter((name) => name !== teamName), teamName]
      : selectedNames.filter((name) => name !== teamName);
    const orderedNames = [
      ...activeTeams.map((team) => team.name).filter((name) => nextSelected.includes(name)),
      ...nextSelected.filter((name) => !activeTeamNames.has(name)),
    ];
    onChange(teamLabelFromNames(orderedNames));
  }

  return (
    <div className={`teamSelectField ${className || ""}`.trim()}>
      <span className="searchableDropdownLabel">{label}</span>
      <details className="teamSelectDisclosure" ref={fieldRef}>
        <summary>
          <span>{selectedSummary}</span>
          <small>{selectedNames.length ? selectedNames.join(", ") : L("Aanwezig team aanvinken")}</small>
        </summary>
        <div className="teamSelectMenu">
          {activeTeams.map((team) => (
            <label className="teamSelectOption" key={team.id}>
              <input
                checked={selectedSet.has(team.name)}
                onChange={(event) => toggleTeam(team.name, event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>{team.name}</strong>
                <small>{[team.role, team.skillsets].filter(Boolean).join(" · ") || L("Teamprofiel")}</small>
              </span>
            </label>
          ))}
          {activeTeams.length === 0 && <div className="searchableDropdownEmpty">{L("Geen actieve teamprofielen.")}</div>}
        </div>
      </details>
    </div>
  );
}

function isBelgianCoordinatePair(latitude: number, longitude: number) {
  return latitude >= 49.4 && latitude <= 51.7 && longitude >= 2.3 && longitude <= 6.6;
}

function buildBrowserAddressQueries(address: string, postalCode: string, city: string) {
  const cleanAddress = address.trim();
  const cleanPostalCode = formatPostalCode(postalCode).trim();
  const cleanCity = city.trim();
  const queries: string[] = [];

  function add(query: string) {
    const cleanQuery = query.replace(/^,\s*|\s*,\s*$/g, "").trim();
    if (!cleanQuery) return;
    queries.push(cleanQuery);
    queries.push(`${cleanQuery}, Belgium`);
  }

  add([cleanAddress, [cleanPostalCode, cleanCity].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  if (cleanAddress && cleanCity) add(`${cleanAddress}, ${cleanCity}`);
  if (cleanPostalCode || cleanCity) add([cleanPostalCode, cleanCity].filter(Boolean).join(" "));

  return Array.from(new Set(queries)).slice(0, 6);
}

async function browserGeocodeAddress(address: string, postalCode: string, city: string): Promise<Partial<Prospect>> {
  const queries = buildBrowserAddressQueries(address, postalCode, city);
  for (const query of queries) {
    const photon = await browserGeocodePhoton(query);
    if (photon) return photon;
    const nominatim = await browserGeocodeNominatim(query);
    if (nominatim) return nominatim;
  }
  return {};
}

async function browserFetchJson(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function browserGeocodePhoton(query: string): Promise<Partial<Prospect> | null> {
  const payload = await browserFetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
  const feature = payload?.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  const countryCode = String(feature?.properties?.countrycode || "").toUpperCase();
  if (countryCode && countryCode !== "BE") return null;
  if (!isBelgianCoordinatePair(latitude, longitude)) return null;
  const properties = feature?.properties || {};
  const displayName = [properties.name, properties.street, properties.housenumber, properties.postcode, properties.city]
    .filter(Boolean)
    .join(" ");
  return {
    latitude,
    longitude,
    map_source: "Browser via Photon",
    address_source: displayName || query,
  };
}

async function browserGeocodeNominatim(query: string): Promise<Partial<Prospect> | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "1",
    addressdetails: "1",
  });
  const payload = await browserFetchJson(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  const result = Array.isArray(payload) ? payload[0] : null;
  if (!result) return null;
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!isBelgianCoordinatePair(latitude, longitude)) return null;
  return {
    latitude,
    longitude,
    map_source: "Browser via Nominatim",
    address_source: result.display_name || query,
  };
}

function logoIconDataUrl(color = "#86C8AE") {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="128" height="128" viewBox="118 -6 158 158" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Global Smile Care icoon" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g><g transform="matrix(1.173554,0,0,1.173554,-105.190083,57.330579)"><path d="M257.5,-48C290.891,-48 318,-20.891 318,12.5C318,45.891 290.891,73 257.5,73C224.109,73 197,45.891 197,12.5C197,-20.891 224.109,-48 257.5,-48ZM257.5,-36.861C284.743,-36.861 306.861,-14.743 306.861,12.5C306.861,39.743 284.743,61.861 257.5,61.861C230.257,61.861 208.139,39.743 208.139,12.5C208.139,-14.743 230.257,-36.861 257.5,-36.861Z" style="fill:${color};"/></g><g transform="matrix(0.893938,0,0,0.825148,-33.189121,57.764202)"><path d="M217.827,42.661C226.935,54.619 241.323,62.343 257.5,62.343C273.677,62.343 288.065,54.619 297.173,42.661L304.492,50.59C293.396,64.259 276.461,73 257.5,73C238.539,73 221.604,64.259 210.508,50.59L217.827,42.661Z" style="fill:${color};"/></g><g transform="matrix(1.374154,1.376302,-1.945553,1.942517,122.744169,-307.623987)"><circle cx="159.852" cy="94.648" r="1.682" style="fill:${color};"/></g><g transform="matrix(-1.374154,1.376302,1.945553,1.942517,271.255833,-307.623987)"><circle cx="159.852" cy="94.648" r="1.682" style="fill:${color};"/></g></g></svg>`;
  return `data:image/svg+xml;base64,${window.btoa(svg)}`;
}

function prospectStatusColor(status: string) {
  const key = normalizeSearch(status);
  const colors: Record<string, string> = {
    "aan te schrijven": "#86C8AE",
    aangeschreven: "#2E6F95",
    "reactie ontvangen": "#86C8AE",
    "draaiboek verstuurd": "#2F6F62",
    "gesprek gepland": "#2E6F95",
    "on hold": "#6E6E73",
  };
  return colors[key] || "#86C8AE";
}

let leafletLoading: Promise<any> | null = null;
let maplibreLeafletLoading: Promise<any> | null = null;

function loadStylesheetOnce(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScriptOnce(src: string, isReady: () => boolean) {
  if (isReady()) return Promise.resolve();
  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existingScript) {
    if (existingScript.dataset.loaded === "true" || isReady()) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoading) return leafletLoading;
  leafletLoading = (async () => {
    loadStylesheetOnce(leafletCssUrl);
    await loadScriptOnce(leafletScriptUrl, () => Boolean(window.L));
    if (!window.L) throw new Error("Leaflet kon niet geladen worden.");
    return window.L;
  })();
  return leafletLoading;
}

function loadMaplibreLeaflet() {
  if (window.L?.maplibreGL) return Promise.resolve(window.L);
  if (maplibreLeafletLoading) return maplibreLeafletLoading;
  maplibreLeafletLoading = (async () => {
    const L = await loadLeaflet();
    loadStylesheetOnce(maplibreCssUrl);
    await loadScriptOnce(maplibreScriptUrl, () => Boolean(window.maplibregl));
    await loadScriptOnce(maplibreLeafletScriptUrl, () => Boolean(window.L?.maplibreGL));
    if (!window.maplibregl || !window.L?.maplibreGL) {
      throw new Error("MapLibre vectorlaag kon niet geladen worden.");
    }
    return L;
  })();
  return maplibreLeafletLoading;
}

function addBasemapKeyToUrl(url: string) {
  if (!cartoBasemapKey || !url.includes("cartocdn.com")) return url;
  if (url.includes("key=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(cartoBasemapKey)}`;
}

async function loadCartoVectorStyle() {
  const response = await fetch(cartoVectorStyleUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("CARTO vectorstijl kon niet geladen worden.");
  const style = await response.json();
  Object.values(style.sources || {}).forEach((source: any) => {
    if (typeof source.url === "string") {
      source.url = addBasemapKeyToUrl(source.url);
    }
    if (Array.isArray(source.tiles)) {
      source.tiles = source.tiles.map((tileUrl: string) => addBasemapKeyToUrl(tileUrl));
    }
  });
  return style;
}

async function addCartoBasemapLayer(L: any, map: any) {
  try {
    const vectorLeaflet = await loadMaplibreLeaflet();
    const style = await loadCartoVectorStyle();
    vectorLeaflet.maplibreGL({
      attributionControl: false,
      interactive: false,
      pane: "tilePane",
      style,
    }).addTo(map);
  } catch {
    L.tileLayer(cartoRasterTileUrl, {
      attribution: leafletTileAttribution,
      subdomains: "abcd",
      maxZoom: leafletTileMaxZoom,
    }).addTo(map);
  }
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  const today = new Date(`${todayIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function prospectNeedsAttention(prospect: Prospect) {
  const deadlineDelta = daysUntil(prospect.next_action_deadline);
  return (
    (deadlineDelta !== null && deadlineDelta <= 7)
    || !prospect.next_action
    || !prospect.owner
    || prospect.status === "Aan te schrijven"
    || prospect.response === "Terughoudend"
  );
}

function markerPoint(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) return null;
  const latMin = 50.65;
  const latMax = 51.35;
  const lonMin = 2.75;
  const lonMax = 5.35;
  const x = ((lon - lonMin) / (lonMax - lonMin)) * 100;
  const y = ((latMax - lat) / (latMax - latMin)) * 100;
  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(92, Math.max(8, y))
  };
}

function LoginView({ onLogin }: { onLogin: (user: User) => void }) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [email, setEmail] = useState("andres@globalsmilecare.be");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(email, password);
      onLogin(await api.me());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginPage">
      <form className="loginCard" onSubmit={submit}>
        <img src="/logo.svg" alt="Global Smile Care" className="loginLogo" />
        <h1>{L("Intern dashboard")}</h1>
        <p>{L("Beveiligde beta-omgeving voor intern administratief gebruik.")}</p>
        <label>
          {L("E-mail")}
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          {L("Wachtwoord")}
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primaryButton" disabled={loading}>{loading ? L("Aanmelden...") : L("Aanmelden")}</button>
      </form>
    </main>
  );
}

function Shell({
  user,
  section,
  setSection,
  onLogout,
  lang,
  onChangeLang,
  children
}: {
  user: User;
  section: Section;
  setSection: (section: Section) => void;
  onLogout: () => void;
  lang: Lang;
  onChangeLang: (lang: Lang) => void;
  children: ReactNode;
}) {
  const L = (key: string) => t(lang, key);
  const visibleSections = sections.filter((item) => !["Admin", "WZC database"].includes(item) || user.role === "admin");
  function navigate(nextSection: Section) {
    setSection(nextSection);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brandBlock">
          <img src="/logo-icon.svg" alt="Global Smile Care" className="sidebarLogo" />
        </div>
        <nav>
          {visibleSections.map((item) => (
            <div key={item} className={item === "WZC database" ? "navSeparated" : ""}>
              <button className={item === section ? "active" : ""} onClick={() => navigate(item)}>
                {L(item)}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebarFooter">
          <div className="sidebarUserBlock">
            <div className="sidebarAvatar">{user.email.slice(0, 1).toUpperCase()}</div>
            <div className="sidebarUserInfo">
              <strong>{user.email}</strong>
              <small>{user.role}</small>
            </div>
            <details className="sidebarSettingsMenu">
              <summary className="sidebarGearButton" aria-label={L("Instellingen")} title={L("Instellingen")}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M16.2 12.5a1.4 1.4 0 0 0 .28 1.54l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.06-.05a1.4 1.4 0 0 0-1.54-.28 1.4 1.4 0 0 0-.85 1.28v.14a1.7 1.7 0 1 1-3.4 0v-.07a1.4 1.4 0 0 0-.91-1.28 1.4 1.4 0 0 0-1.54.28l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.06a1.4 1.4 0 0 0 .28-1.54 1.4 1.4 0 0 0-1.28-.85h-.14a1.7 1.7 0 1 1 0-3.4h.07a1.4 1.4 0 0 0 1.28-.91 1.4 1.4 0 0 0-.28-1.54l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.06.05a1.4 1.4 0 0 0 1.54.28h.07a1.4 1.4 0 0 0 .85-1.28v-.14a1.7 1.7 0 1 1 3.4 0v.07a1.4 1.4 0 0 0 .85 1.28 1.4 1.4 0 0 0 1.54-.28l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.06a1.4 1.4 0 0 0-.28 1.54v.07a1.4 1.4 0 0 0 1.28.85h.14a1.7 1.7 0 1 1 0 3.4h-.07a1.4 1.4 0 0 0-1.28.85Z"/></svg>
              </summary>
              <div className="sidebarSettingsDropdown">
                <div className="sidebarSettingsSection">
                  <span className="sidebarSettingsLabel">{L("Actieve module")}</span>
                  <span className="sidebarSettingsValue">{L(section)}</span>
                </div>
                <div className="sidebarSettingsSection">
                  <span className="sidebarSettingsLabel">{L("Rol")}</span>
                  <span className="sidebarSettingsValue">{user.role}</span>
                </div>
                <div className="sidebarSettingsSection">
                  <span className="sidebarSettingsLabel">{L("Taal")}</span>
                  <div className="sidebarLangSwitch">
                    <button className={lang === "nl" ? "active" : ""} onClick={() => onChangeLang("nl")}>NL</button>
                    <button className={lang === "en" ? "active" : ""} onClick={() => onChangeLang("en")}>EN</button>
                  </div>
                </div>
                <div className="sidebarSettingsDivider" />
                <span className="sidebarConfidential">{L("Intern en vertrouwelijk")}</span>
                <button className="sidebarLogoutButton" onClick={onLogout}>{L("Afmelden")}</button>
              </div>
            </details>
          </div>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function Header({ section }: { section: Section }) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  return (
    <header className="pageHeader">
      <div>
        <h1>{L("Intern dashboard")}</h1>
        <p>{L(section)}</p>
      </div>
      <span className="trustBadge">Vertrouwelijk</span>
    </header>
  );
}

type MapRecord = {
  key: string;
  kind: "active" | "prospect";
  source: Wzc | Prospect;
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  markerColor: string;
  hasUrgency: boolean;
  openUrgencies: number;
  group: string;
  address: string;
  postalCode: string;
  city: string;
  contact: string;
  phone: string;
  email: string;
  website: string;
  nextVisit: string;
  nextAction: string;
};

const LOGO_ZOOM_THRESHOLD = 11;

function WzcMap({
  wzcs,
  prospects,
  selected,
  onSelectWzc,
  onSelectProspect,
  onOpenWzcFiche,
  onOpenProspectFiche,
  onPlan,
  onUrgency,
  compact = false
}: {
  wzcs: Wzc[];
  prospects?: Prospect[];
  selected?: Wzc | Prospect | null;
  onSelectWzc: (wzc: Wzc) => void;
  onSelectProspect?: (prospect: Prospect) => void;
  onOpenWzcFiche?: (wzc: Wzc) => void;
  onOpenProspectFiche?: (prospect: Prospect) => void;
  onPlan?: (wzc: Wzc) => void;
  onUrgency?: (wzc: Wzc) => void;
  compact?: boolean;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [query, setQuery] = useState("");
  const [panelVisible, setPanelVisible] = useState(Boolean(selected));
  const [loadError, setLoadError] = useState("");

  const records = useMemo<MapRecord[]>(() => {
    const wzcRecords = wzcs
      .filter((wzc) => !isGroupRecord(wzc))
      .filter((wzc) => wzc.latitude !== null && wzc.longitude !== null)
      .map((wzc) => ({
        key: `wzc-${wzc.id}`,
        kind: "active" as const,
        source: wzc,
        id: wzc.id,
        name: wzc.name,
        latitude: Number(wzc.latitude),
        longitude: Number(wzc.longitude),
        status: wzc.collaboration_status || "Actief",
        markerColor: wzc.open_urgencies > 0 ? "#D92D20" : "#86C8AE",
        hasUrgency: wzc.open_urgencies > 0,
        openUrgencies: Number(wzc.open_urgencies || 0),
        group: wzc.group_name,
        address: wzc.address,
        postalCode: formatPostalCode(wzc.postal_code),
        city: wzc.city,
        contact: wzc.contact_name,
        phone: formatPhone(wzc.phone),
        email: wzc.email,
        website: wzc.website,
        nextVisit: wzc.next_visit ? formatDate(wzc.next_visit) : "",
        nextAction: "",
      }));
    const prospectRecords = (prospects || [])
      .filter((prospect) => prospect.latitude !== null && prospect.longitude !== null)
      .map((prospect) => ({
        key: `prospect-${prospect.id}`,
        kind: "prospect" as const,
        source: prospect,
        id: prospect.id,
        name: prospect.name,
        latitude: Number(prospect.latitude),
        longitude: Number(prospect.longitude),
        status: prospect.status || "Prospectie",
        markerColor: prospectStatusColor(prospect.status),
        hasUrgency: false,
        openUrgencies: 0,
        group: prospect.group_name,
        address: prospect.address,
        postalCode: formatPostalCode(prospect.postal_code),
        city: prospect.city,
        contact: prospect.contact_name,
        phone: formatPhone(prospect.phone),
        email: prospect.email,
        website: prospect.website,
        nextVisit: prospect.next_action_deadline ? formatDate(prospect.next_action_deadline) : "",
        nextAction: prospect.next_action,
      }));
    return [...wzcRecords, ...prospectRecords];
  }, [wzcs, prospects]);

  const filteredRecords = useMemo(() => {
    const parts = normalizeSearch(query).split(/\s+/).filter(Boolean);
    if (!parts.length) return records;
    return records.filter((record) => {
      const haystack = normalizeSearch([record.name, record.address, record.postalCode, record.city, record.group, record.contact].join(" "));
      return parts.every((part) => haystack.includes(part));
    });
  }, [records, query]);

  const selectedRecord = useMemo(() => {
    if (!selected) return null;
    const key = "collaboration_status" in selected ? `wzc-${selected.id}` : `prospect-${selected.id}`;
    return records.find((record) => record.key === key) || null;
  }, [records, selected]);

  function selectRecord(record: MapRecord, shouldFly = true) {
    if (record.kind === "prospect") {
      onSelectProspect?.(record.source as Prospect);
    } else {
      onSelectWzc(record.source as Wzc);
    }
    setPanelVisible(true);
    if (shouldFly && mapRef.current) {
      mapRef.current.flyTo([record.latitude, record.longitude], Math.max(mapRef.current.getZoom(), LOGO_ZOOM_THRESHOLD + 2), { duration: 0.55 });
    }
  }

  function scrollToDetail(anchor: string) {
    window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  useEffect(() => {
    let cancelled = false;
    let dotLayer: any = null;
    let logoLayer: any = null;
    let resizeTimer: ReturnType<typeof window.setTimeout> | null = null;
    let handleResize: (() => void) | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapElementRef.current) return;
        setLoadError("");
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        const map = L.map(mapElementRef.current, {
          scrollWheelZoom: true,
          zoomControl: false,
          zoomSnap: 1,
          zoomDelta: 1,
          wheelDebounceTime: 60,
          wheelPxPerZoomLevel: 90,
          inertia: true,
        });
        mapRef.current = map;
        L.control.zoom({ position: "bottomleft" }).addTo(map);
        addCartoBasemapLayer(L, map);

        handleResize = () => {
          if (resizeTimer) window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            if (mapRef.current) {
              map.invalidateSize({ animate: false, pan: false });
            }
          }, 90);
        };
        map.whenReady(handleResize);
        window.addEventListener("resize", handleResize);

        if (!records.length) {
          map.setView([51.03, 4.15], 8);
          return;
        }

        const bounds = L.latLngBounds(records.map((record) => [record.latitude, record.longitude]));
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 9 });
        dotLayer = L.layerGroup();
        logoLayer = L.layerGroup();

        records.forEach((record) => {
          const latLng = [record.latitude, record.longitude];
          const dot = L.marker(latLng, {
            icon: L.divIcon({
              className: "",
              html: `<div class="gsc-wzc-dot${record.hasUrgency ? " is-urgent" : ""}" style="background:${record.markerColor};"></div>`,
              iconSize: record.hasUrgency ? [12, 12] : [11, 11],
              iconAnchor: record.hasUrgency ? [6, 6] : [5.5, 5.5],
            }),
          });
          dot.on("click", () => selectRecord(record, false));
          dotLayer.addLayer(dot);

          const logo = L.marker(latLng, {
            icon: L.divIcon({
              className: "",
              html: `<div class="gsc-wzc-logo${record.hasUrgency ? " is-urgent" : ""}"><img src="${logoIconDataUrl(record.markerColor)}" alt=""></div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          });
          logo.on("click", () => selectRecord(record, false));
          logoLayer.addLayer(logo);
        });

        function syncMarkerLayers() {
          if (map.getZoom() >= LOGO_ZOOM_THRESHOLD) {
            if (map.hasLayer(dotLayer)) map.removeLayer(dotLayer);
            if (!map.hasLayer(logoLayer)) map.addLayer(logoLayer);
            return;
          }
          if (map.hasLayer(logoLayer)) map.removeLayer(logoLayer);
          if (!map.hasLayer(dotLayer)) map.addLayer(dotLayer);
        }

        map.on("zoomend", syncMarkerLayers);
        syncMarkerLayers();
      })
      .catch(() => setLoadError("Kaartbibliotheek kon niet geladen worden."));

    return () => {
      cancelled = true;
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (resizeTimer) {
        window.clearTimeout(resizeTimer);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      dotLayer = null;
      logoLayer = null;
    };
  }, [records]);

  useEffect(() => {
    if (selectedRecord) {
      setPanelVisible(true);
    }
  }, [selectedRecord?.key]);

  return (
    <section className={`mapPanel leafletMapPanel ${compact ? "compactMap" : ""}`}>
      <div className="gscMapShell">
        <div ref={mapElementRef} className="gscLeafletMap" />
        <div className="gscMapSearch" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
          <div className="gscSearchRow">
            <span className="gscSearchIcon" aria-hidden="true" />
            <input
              className="gscSearchInput"
              placeholder={L("Zoek WZC, adres of gemeente")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setPanelVisible(Boolean(selectedRecord))}
            />
            <button className={`gscSearchClear ${query ? "isVisible" : ""}`} type="button" onClick={() => setQuery("")} aria-label={L("Zoekveld wissen")}>x</button>
          </div>
          {query && (
            <div className="gscSearchResults">
              {filteredRecords.slice(0, 8).map((record) => (
                <button key={record.key} className="gscSearchOption" type="button" onClick={() => selectRecord(record)}>
                  <strong>{record.name}</strong>
                  <span>{formatAddress([record.address, record.postalCode, record.city]) || record.group || "-"}</span>
                </button>
              ))}
              {filteredRecords.length === 0 && <div className="gscSearchEmpty">{L("Geen WZC gevonden.")}</div>}
            </div>
          )}
        </div>
        {loadError && <div className="gscMapPanel isVisible" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}><span>{loadError}</span></div>}
        {selectedRecord && panelVisible && (
          <aside className="gscMapPanel isVisible" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
            <div className="gscPanelHeader">
              <div>
                <div className="gscPanelKicker">{L(selectedRecord.status)}</div>
                <div className="gscPanelTitle">{selectedRecord.name}</div>
                <div className="gscPanelPlace">{[selectedRecord.postalCode, selectedRecord.city].filter(Boolean).join(" ") || "-"}</div>
              </div>
              <button className="gscPanelClose" type="button" aria-label={L("Sluiten")} onClick={() => setPanelVisible(false)}>x</button>
            </div>
            <div className="gscPanelActions">
              {selectedRecord.kind === "prospect" ? (
                <button
                  className="gscPanelPlanningLink"
                  type="button"
                  onClick={() => {
                    if (onOpenProspectFiche) {
                      onOpenProspectFiche(selectedRecord.source as Prospect);
                      return;
                    }
                    selectRecord(selectedRecord);
                    scrollToDetail("prospectfiche");
                  }}
                >
                  {L("Open prospectfiche")}
                </button>
              ) : (
                <>
                  <button
                    className="gscPanelPlanningLink"
                    type="button"
                    onClick={() => {
                      if (onOpenWzcFiche) {
                        onOpenWzcFiche(selectedRecord.source as Wzc);
                        return;
                      }
                      selectRecord(selectedRecord);
                      scrollToDetail("actieve-wzc-fiche");
                    }}
                  >
                    {L("Open WZC-fiche")}
                  </button>
                  {onPlan && <button className="gscPanelPlanningLink" type="button" onClick={() => onPlan(selectedRecord.source as Wzc)}>{L("Planning maken")}</button>}
                  {onUrgency && <button className="gscPanelUrgencyAddLink" type="button" onClick={() => onUrgency(selectedRecord.source as Wzc)}>{L("Urgentie toevoegen")}</button>}
                </>
              )}
            </div>
            {selectedRecord.openUrgencies > 0 && <div className="gscPanelAlert">{selectedRecord.openUrgencies} {selectedRecord.openUrgencies === 1 ? L("open urgentie") : L("open urgenties")}</div>}
            <div className="gscPanelLine"><span>{L("Groep")}</span><strong>{selectedRecord.group || "-"}</strong></div>
            <div className="gscPanelLine"><span>{L("Adres")}</span><strong>{selectedRecord.address || "-"}</strong></div>
            <div className="gscPanelLine"><span>{L("Contact")}</span><strong>{selectedRecord.contact || "-"}</strong></div>
            <div className="gscPanelLine"><span>{L("Telefoon")}</span><strong>{selectedRecord.phone ? <a href={phoneHref(selectedRecord.phone)}>{selectedRecord.phone}</a> : "-"}</strong></div>
            <div className="gscPanelLine"><span>{L("E-mail")}</span><strong>{selectedRecord.email ? <a href={emailHref(selectedRecord.email)}>{selectedRecord.email}</a> : "-"}</strong></div>
            <div className="gscPanelLine"><span>{L("Website")}</span><strong>{selectedRecord.website ? <a href={websiteHref(selectedRecord.website)} target="_blank" rel="noreferrer">{selectedRecord.website}</a> : "-"}</strong></div>
            <div className="gscPanelLine"><span>{selectedRecord.kind === "prospect" ? L("Deadline volgende actie") : L("Volgende bezoek")}</span><strong>{selectedRecord.nextVisit || "-"}</strong></div>
            {selectedRecord.kind === "prospect" && <div className="gscPanelLine"><span>{L("Volgende actie")}</span><strong>{selectedRecord.nextAction || "-"}</strong></div>}
          </aside>
        )}
        {!selectedRecord && !loadError && <aside className="gscMapPanel isVisible" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}><span>{L("Klik op een marker voor details.")}</span></aside>}
      </div>
    </section>
  );
}

function RoutePlanMap({ plan }: { plan: UrgencyRoutePlan }) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: ReturnType<typeof window.setTimeout> | null = null;
    let handleResize: (() => void) | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapElementRef.current) return;
        setLoadError("");
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        const map = L.map(mapElementRef.current, {
          scrollWheelZoom: true,
          zoomControl: false,
          zoomSnap: 1,
          zoomDelta: 1,
          wheelDebounceTime: 60,
          wheelPxPerZoomLevel: 90,
        });
        mapRef.current = map;
        L.control.zoom({ position: "bottomleft" }).addTo(map);
        addCartoBasemapLayer(L, map);

        const startPoint: [number, number] = [plan.start_location.latitude, plan.start_location.longitude];
        const endPoint: [number, number] | null = plan.end_location
          ? [plan.end_location.latitude, plan.end_location.longitude]
          : plan.return_to_start
            ? startPoint
            : null;
        const boundsPoints: [number, number][] = [startPoint];
        if (plan.end_location) boundsPoints.push([plan.end_location.latitude, plan.end_location.longitude]);

        L.marker(startPoint, {
          icon: L.divIcon({
            className: "",
            html: `<div class="gsc-route-start">S</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map);

        if (plan.end_location) {
          L.marker([plan.end_location.latitude, plan.end_location.longitude], {
            icon: L.divIcon({
              className: "",
              html: `<div class="gsc-route-end">E</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          }).addTo(map);
        }

        plan.routes.forEach((route) => {
          const routePoints: [number, number][] = [startPoint];
          route.stops.forEach((stop) => {
            const point: [number, number] = [stop.latitude, stop.longitude];
            routePoints.push(point);
            boundsPoints.push(point);
            L.marker(point, {
              icon: L.divIcon({
                className: "",
                html: `<div class="gsc-route-stop" style="background:${route.color};">${stop.sequence}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
            }).addTo(map);
          });
          if (endPoint) routePoints.push(endPoint);
          if (routePoints.length > 1) {
            L.polyline(routePoints, {
              color: route.color,
              weight: 4,
              opacity: 0.74,
              dashArray: plan.has_route_geometry ? undefined : "6 8",
            }).addTo(map);
          }
        });

        handleResize = () => {
          if (resizeTimer) window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            if (mapRef.current) {
              map.invalidateSize({ animate: false, pan: false });
            }
          }, 90);
        };
        map.whenReady(handleResize);
        window.addEventListener("resize", handleResize);

        if (boundsPoints.length > 1) {
          map.fitBounds(L.latLngBounds(boundsPoints), { padding: [28, 28], maxZoom: 11 });
        } else {
          map.setView(startPoint, 11);
        }
      })
      .catch(() => setLoadError("Routekaart kon niet geladen worden."));

    return () => {
      cancelled = true;
      if (handleResize) window.removeEventListener("resize", handleResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [plan]);

  return (
    <section className="routeMapPanel leafletMapPanel">
      <div className="gscMapShell routeMapShell">
        <div ref={mapElementRef} className="gscLeafletMap routeLeafletMap" />
        {loadError && <div className="gscMapPanel isVisible"><span>{loadError}</span></div>}
        <div className="routeMapLegend">
          <span><strong>S</strong> {L("Start")}</span>
          {plan.end_location && <span><strong>E</strong> {L("Einde")}</span>}
          {!plan.has_route_geometry && <span>{L("Gestippelde lijnen tonen volgorde, geen wegpolyline.")}</span>}
        </div>
      </div>
    </section>
  );
}

function Home({
  wzcs,
  prospects,
  urgencies,
  plannings,
  onOpenUrgencies,
  onOpenWzcFiche,
  onSelectWzcForPlanning,
  onSelectWzcForUrgency
}: {
  wzcs: Wzc[];
  prospects: Prospect[];
  urgencies: Urgency[];
  plannings: Planning[];
  onOpenUrgencies: () => void;
  onOpenWzcFiche: (wzc: Wzc) => void;
  onSelectWzcForPlanning: (wzc: Wzc) => void;
  onSelectWzcForUrgency: (wzc: Wzc) => void;
}) {
  const upcoming = useMemo(
    () => [...plannings]
      .filter((planning) => planning.planning_date >= todayIso)
      .sort((a, b) =>
        a.planning_date.localeCompare(b.planning_date)
        || (a.start_time || "09:00").localeCompare(b.start_time || "09:00")
        || a.name.localeCompare(b.name)
      ),
    [plannings]
  );
  const realWzcs = useMemo(() => actualWzcs(wzcs), [wzcs]);
  const activeWzcs = useMemo(
    () => realWzcs.filter((wzc) => wzc.collaboration_status === "Actief"),
    [realWzcs]
  );
  const [selected, setSelected] = useState<Wzc | null>(null);
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const openUrgencyCount = urgencies.filter((urgency) => urgency.status !== "Afgerond").length;

  useEffect(() => {
    const selectedIsVisible = selected
      ? activeWzcs.some((wzc) => wzc.id === selected.id)
      : false;
    if (!selectedIsVisible) {
      setSelected(activeWzcs[0] || null);
    }
  }, [activeWzcs, selected]);

  return (
    <>
      <WzcMap
        wzcs={activeWzcs}
        selected={selected}
        onSelectWzc={(wzc) => setSelected(wzc)}
        onOpenWzcFiche={onOpenWzcFiche}
        onPlan={onSelectWzcForPlanning}
        onUrgency={onSelectWzcForUrgency}
        compact
      />
      <div className="kpiGrid">
        <div className="kpi"><span>{L("WZC's")}</span><strong>{realWzcs.length}</strong></div>
        <div className="kpi"><span>{L("Actieve WZC's")}</span><strong>{activeWzcs.length}</strong></div>
        <div className="kpi"><span>{L("Evaluaties")}</span><strong>0</strong></div>
        <div className="kpi"><span>{L("Prospecties")}</span><strong>{prospects.length}</strong></div>
        <div className="kpi"><span>{L("Urgenties")}</span><strong>{openUrgencyCount}</strong></div>
        <div className="kpi"><span>{L("Gem. score")}</span><strong>-</strong></div>
        <div className="kpi"><span>{L("Hoog risico")}</span><strong>0</strong></div>
        <div className="kpi"><span>{L("Gepland")}</span><strong>{upcoming.length}</strong></div>
      </div>
      <section className="panel">
        <div className="sectionTitle">
          <h2>{L("Volgende bezoeken")}</h2>
          <button onClick={onOpenUrgencies}>{L("Urgenties bekijken")}</button>
        </div>
        <div className="list">
          {upcoming.slice(0, 6).map((planning) => (
            <div className="listRow" key={planning.id}>
              <strong>{planning.location || planning.name}</strong>
              <span>{formatDate(planning.planning_date)} · {planning.rows.length} {L("patiënten")}</span>
            </div>
          ))}
          {upcoming.length === 0 && <div className="empty">{L("Geen toekomstige planningen.")}</div>}
        </div>
      </section>
      <section className="panel">
        <h2>{L("KPI's per thema")}</h2>
        <div className="empty">{L("Nog geen evaluaties om KPI's per thema te tonen.")}</div>
      </section>
      <div className="homeGrid">
        <article className="homeCard">
          <strong>{L("Behandelplanning")}</strong>
          <span>{L("PDF's verwerken naar een behandelplanning en afvinklijst voor Excel.")}</span>
        </article>
        <article className="homeCard">
          <strong>{L("Mondzorgdossiers")}</strong>
          <span>{L("Dossiers tijdelijk uitlezen voor controle en invoer in DentAdmin.")}</span>
        </article>
        <article className="homeCard">
          <strong>{L("WZC opvolging")}</strong>
          <span>{L("WZC-masterdata, prospectie, urgenties en project-KPI's opvolgen.")}</span>
        </article>
      </div>
    </>
  );
}

function AgendaPlanningView({
  wzcs,
  plannings,
  teams,
  onSaved,
  onOpenTreatmentPlanning
}: {
  wzcs: Wzc[];
  plannings: Planning[];
  teams: TeamProfile[];
  onSaved: () => Promise<void>;
  onOpenTreatmentPlanning: (planning: Planning) => void;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [agendaMode, setAgendaMode] = useState<AgendaMode>("Maand");
  const [calendarMonth, setCalendarMonth] = useState(todayIso.slice(0, 7) + "-01");
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [planningKind, setPlanningKind] = useState<PlanningKind>("Screening");
  const [planningDate, setPlanningDate] = useState(todayIso);
  const [planningStartTime, setPlanningStartTime] = useState("09:00");
  const [planningEndTime, setPlanningEndTime] = useState("16:00");
  const [planningStatus, setPlanningStatus] = useState("Gepland");
  const [planningGroupFilter, setPlanningGroupFilter] = useState("");
  const [wzcId, setWzcId] = useState<number | "">("");
  const [planningName, setPlanningName] = useState("");
  const [teamLabel, setTeamLabel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [agendaError, setAgendaError] = useState("");
  const createPanelRef = useRef<HTMLDetailsElement | null>(null);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);

  const activeWzcs = useMemo(
    () => actualWzcs(wzcs).filter((wzc) => wzc.collaboration_status === "Actief"),
    [wzcs]
  );
  const planningGroupOptions = useMemo(() => groupOptionsForWzcs(wzcs), [wzcs]);
  const selectableWzcs = useMemo(
    () => applyGroupFilter(activeWzcs, planningGroupFilter),
    [activeWzcs, planningGroupFilter]
  );
  const selectedWzc = wzcId === "" ? null : activeWzcs.find((wzc) => wzc.id === Number(wzcId)) || null;
  const agendaPlannings = useMemo(
    () => [...plannings].sort((a, b) =>
      a.planning_date.localeCompare(b.planning_date)
      || (a.start_time || "09:00").localeCompare(b.start_time || "09:00")
      || a.name.localeCompare(b.name)
    ),
    [plannings]
  );
  const monthPlannings = useMemo(
    () => agendaPlannings.filter((planning) => planning.planning_date.slice(0, 7) === calendarMonth.slice(0, 7)),
    [agendaPlannings, calendarMonth]
  );
  const selectedDatePlannings = useMemo(
    () => agendaPlannings.filter((planning) => planning.planning_date === selectedDate),
    [agendaPlannings, selectedDate]
  );
  const upcomingAgenda = useMemo(
    () => agendaPlannings.filter((planning) => planning.planning_date >= todayIso && planning.planning_status !== "Geannuleerd"),
    [agendaPlannings]
  );
  const calendarCells = useMemo(() => {
    const firstDay = localDateFromIso(calendarMonth);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `empty-${index}`, date: "", day: 0 })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = isoFromLocalDate(new Date(firstDay.getFullYear(), firstDay.getMonth(), day));
        return { key: date, date, day };
      }),
    ];
  }, [calendarMonth]);

  useEffect(() => {
    if (wzcId !== "" && !selectableWzcs.some((wzc) => wzc.id === Number(wzcId))) {
      setWzcId("");
    }
  }, [selectableWzcs, wzcId]);

  function setAgendaDate(value: string) {
    const nextDate = value || todayIso;
    setPlanningDate(nextDate);
    setSelectedDate(nextDate);
    setCalendarMonth(nextDate.slice(0, 7) + "-01");
  }

  function jumpToCreatePlanning(value = selectedDate) {
    setAgendaDate(value);
    setCreatePanelOpen(true);
    window.requestAnimationFrame(() => {
      createPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function createAgendaPlanning(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setAgendaError("");
    try {
      const planningType = planningTypeForKind(planningKind);
      const title = planningName.trim() || `${planningKindLabel(planningType)} ${selectedWzc?.name || formatDate(planningDate)}`;
      await api.createPlanning({
        name: title,
        planning_type: planningType,
        planning_date: planningDate,
        start_time: planningStartTime,
        end_time: planningEndTime,
        planning_status: planningStatus,
        team_label: teamLabel,
        location: selectedWzc?.name || "",
        wzc_id: wzcId === "" ? null : Number(wzcId),
        note,
        rows: [],
      });
      setPlanningName("");
      setTeamLabel("");
      setNote("");
      await onSaved();
      setSelectedDate(planningDate);
      setCalendarMonth(planningDate.slice(0, 7) + "-01");
    } catch (err) {
      setAgendaError(err instanceof Error ? err.message : "Planning kon niet aangemaakt worden.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAgendaStatus(planning: Planning, status: string) {
    setAgendaError("");
    try {
      await api.updatePlanning(planning.id, { planning_status: status });
      await onSaved();
    } catch (err) {
      setAgendaError(err instanceof Error ? err.message : "Status kon niet aangepast worden.");
    }
  }

  async function deleteAgendaPlanning(planning: Planning) {
    if (!window.confirm(`Bent u zeker? U staat op het punt om "${planning.name}" te verwijderen.`)) return;
    setAgendaError("");
    try {
      await api.deletePlanning(planning.id);
      await onSaved();
    } catch (err) {
      setAgendaError(err instanceof Error ? err.message : "Planning kon niet verwijderd worden.");
    }
  }

  function renderAgendaItem(planning: Planning, compact = false) {
    return (
      <article className={`agendaItemCard ${compact ? "compactAgendaItem" : ""}`} key={planning.id}>
        <div className="agendaItemHeader">
          <div>
            <strong>{planning.name}</strong>
            <span>{planningKindLabel(planning.planning_type, lang)} · {planning.location || L("Geen WZC gekozen")}</span>
          </div>
          <span className={`agendaStatusPill ${planningStatusClass(planning.planning_status || "Concept")}`}>{planning.planning_status || "Concept"}</span>
        </div>
        <div className="agendaItemMeta">
          <span>{formatDate(planning.planning_date)}</span>
          <span>{planning.start_time || "09:00"}-{planning.end_time || "16:00"}</span>
          <span>{planning.rows.length} {L("bewoner(s)")}</span>
        </div>
        {(planning.team_label || planning.note) && !compact && (
          <div className="agendaItemNote">
            {planning.team_label && <span>{L("Team:")} {planning.team_label}</span>}
            {planning.note && <span>{planning.note}</span>}
          </div>
        )}
        {!compact && (
          <div className="agendaItemActions">
            <label>{L("Status")}<select value={planning.planning_status || "Concept"} onChange={(event) => updateAgendaStatus(planning, event.target.value)}>
              {planningStatusOptions.map((status) => <option key={status} value={status}>{L(status)}</option>)}
            </select></label>
            <button className="compactActionButton" type="button" onClick={() => onOpenTreatmentPlanning(planning)}>{L("Aanvullen")}</button>
            <button className="compactActionButton dangerActionButton" type="button" onClick={() => deleteAgendaPlanning(planning)}>{L("Verwijderen")}</button>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="stack">
      <section className="panel agendaOverviewPanel">
        <div className="sectionTitle">
          <div>
            <h2>{L("Agenda-overzicht")}</h2>
            <p className="sectionHint">{upcomingAgenda.length} {L("toekomstige planning(en)")}, {L("waarvan")} {upcomingAgenda.filter((planning) => planning.planning_type === "Screening").length} {L("screening(en)")}.</p>
          </div>
          <div className="agendaToolbar">
            <button type="button" onClick={() => setCalendarMonth(addMonthsIso(calendarMonth, -1))}>{lang === "nl" ? "Vorige" : "Previous"}</button>
            <button type="button" onClick={() => setAgendaDate(todayIso)}>{lang === "nl" ? "Vandaag" : "Today"}</button>
            <button type="button" onClick={() => setCalendarMonth(addMonthsIso(calendarMonth, 1))}>{lang === "nl" ? "Volgende" : "Next"}</button>
          </div>
        </div>
        <div className="followupSwitch agendaModeSwitch" aria-label={lang === "nl" ? "Agendaweergave" : "Agenda view"}>
          {(["Maand", "Lijst"] as AgendaMode[]).map((mode) => (
            <button key={mode} className={agendaMode === mode ? "selected" : ""} onClick={() => setAgendaMode(mode)}>
              <strong>{L(mode)}</strong>
              <span>{mode === "Maand" ? monthLabel(calendarMonth, lang) : `${agendaPlannings.length} ${L("planning(en)")}`}</span>
            </button>
          ))}
        </div>
        <div className="agendaLayout">
          <div className="agendaMain">
            {agendaMode === "Maand" ? (
              <div className="agendaCalendar">
                {(lang === "nl" ? ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map((day) => <div className="agendaWeekday" key={day}>{day}</div>)}
                {calendarCells.map((cell) => {
                  const dayPlannings = cell.date ? monthPlannings.filter((planning) => planning.planning_date === cell.date) : [];
                  return cell.date ? (
                    <button
                      type="button"
                      className={`agendaDay ${cell.date === selectedDate ? "selected" : ""} ${cell.date === todayIso ? "today" : ""}`}
                      key={cell.key}
                      onClick={() => setAgendaDate(cell.date)}
                    >
                      <span className="agendaDayNumber">{cell.day}</span>
                      <span className="agendaDayName">{weekdayShortLabel(cell.date, lang)}</span>
                      <span className="agendaDayItems">
                        {dayPlannings.slice(0, 2).map((planning) => (
                          <em className={planning.planning_type === "Screening" ? "screening" : "treatment"} key={planning.id}>
                            {planning.start_time || "09:00"} {planning.location || planningKindLabel(planning.planning_type)}
                          </em>
                        ))}
                        {dayPlannings.length > 2 && <em>+{dayPlannings.length - 2} {L("meer")}</em>}
                      </span>
                    </button>
                  ) : <div className="agendaDay emptyDay" key={cell.key} />;
                })}
              </div>
            ) : (
              <div className="agendaListView">
                {agendaPlannings.map((planning) => renderAgendaItem(planning))}
                {agendaPlannings.length === 0 && <div className="empty">{L("Nog geen planning in de agenda.")}</div>}
              </div>
            )}
          </div>
          <aside className="agendaDayPanel">
            <div className="sectionTitle compactSectionTitle">
              <div>
                <h2>{formatDate(selectedDate)}</h2>
                <p className="sectionHint">{selectedDatePlannings.length} {L("planning(en) op deze dag.")}</p>
              </div>
              <button className="compactActionButton" type="button" onClick={() => jumpToCreatePlanning(selectedDate)}>{L("Planning maken")}</button>
            </div>
            <div className="agendaDayList">
              {selectedDatePlannings.map((planning) => renderAgendaItem(planning))}
              {selectedDatePlannings.length === 0 && <div className="empty compactEmpty">{L("Geen screening of behandeldag gepland.")}</div>}
            </div>
          </aside>
        </div>
      </section>

      <details
        className="panel agendaCreatePanel"
        ref={createPanelRef}
        open={createPanelOpen}
        onToggle={(event) => setCreatePanelOpen(event.currentTarget.open)}
      >
        <summary className="agendaCreateSummary">
          <div>
            <h2>{L("Planning")}</h2>
            <p className="sectionHint">{L("Plan screeningdagen en behandeldagen in de agenda.")}</p>
          </div>
          <span className="agendaCreateSummaryMeta">{formatDate(planningDate)} · {planningKindLabel(planningTypeForKind(planningKind))}</span>
          <span className="agendaCreateSummaryToggle">{createPanelOpen ? L("Sluiten") : lang === "nl" ? "Openen" : "Open"}</span>
        </summary>
        <form className="agendaCreateForm" onSubmit={createAgendaPlanning}>
          <div className="planningKindSelector agendaKindSelector" aria-label="Type agenda-item">
            <button type="button" className={planningKind === "Screening" ? "selected" : ""} onClick={() => setPlanningKind("Screening")}>
              <strong>{L("Screening")}</strong>
              <span>{L("Screeningdag of namenlijst voorbereiden")}</span>
            </button>
            <button type="button" className={planningKind === "Behandeling" ? "selected" : ""} onClick={() => setPlanningKind("Behandeling")}>
              <strong>{L("Behandeldag")}</strong>
              <span>{L("Mobiele behandelingen op locatie")}</span>
            </button>
          </div>
          <div className="formGrid agendaFormGrid">
            <label>{L("Datum")}<input type="date" value={planningDate} onChange={(event) => setAgendaDate(event.target.value)} required /></label>
            <label>{L("Start")}<input type="time" value={planningStartTime} onChange={(event) => setPlanningStartTime(event.target.value)} required /></label>
            <label>{L("Einde")}<input type="time" value={planningEndTime} onChange={(event) => setPlanningEndTime(event.target.value)} required /></label>
            <label>{L("Status")}<select value={planningStatus} onChange={(event) => setPlanningStatus(event.target.value)}>
              {planningStatusOptions.map((status) => <option key={status} value={status}>{L(status)}</option>)}
            </select></label>
            <SearchableGroupSelect label={L("Groep/organisatie")} value={planningGroupFilter} groups={planningGroupOptions} onChange={setPlanningGroupFilter} placeholder={L("Alle groepen")} />
            <SearchableWzcSelect label={L("WZC")} value={wzcId} wzcs={selectableWzcs} onChange={setWzcId} placeholder={L("Nog geen WZC gekozen")} />
            <label>{L("Titel")}<input value={planningName} onChange={(event) => setPlanningName(event.target.value)} placeholder={selectedWzc ? `${planningKindLabel(planningTypeForKind(planningKind), lang)} ${selectedWzc.name}` : L("Wordt automatisch ingevuld")} /></label>
            <TeamProfileSelect label={L("Team:")} teams={teams} value={teamLabel} onChange={setTeamLabel} />
            <label className="wide">{L("Notitie")}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={L("Praktische afspraken, materiaal, aandachtspunten...")} /></label>
          </div>
          <div className="formSubmitRow">
            <button className="primaryButton" disabled={saving}>{saving ? L("Planning bewaren...") : L("In agenda zetten")}</button>
          </div>
          {agendaError && <div className="error">{agendaError}</div>}
        </form>
      </details>
    </div>
  );
}

function UrgenciesView({
  wzcs,
  urgencies,
  preselectedWzc,
  onSaved
}: {
  wzcs: Wzc[];
  urgencies: Urgency[];
  preselectedWzc: Wzc | null;
  onSaved: () => Promise<void>;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [wzcId, setWzcId] = useState<number | "">(preselectedWzc?.id || "");
  const [patientName, setPatientName] = useState("");
  const [urgencyType, setUrgencyType] = useState(urgencyTypes[0]);
  const [reportedOn, setReportedOn] = useState(todayIso);
  const [remark, setRemark] = useState("");
  const [routeExecutionDate, setRouteExecutionDate] = useState(todayIso);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [selectedUrgencyIds, setSelectedUrgencyIds] = useState<Record<number, boolean>>({});
  const [startPresetKey, setStartPresetKey] = useState<typeof routeStartLocations[number]["key"]>(routeStartLocations[0].key);
  const [useEndLocation, setUseEndLocation] = useState(false);
  const [returnToStart, setReturnToStart] = useState(true);
  const [endLocationWzcId, setEndLocationWzcId] = useState<number | "">("");
  const [endLabel, setEndLabel] = useState("Einde");
  const [endLatitude, setEndLatitude] = useState("");
  const [endLongitude, setEndLongitude] = useState("");
  const [routeCount, setRouteCount] = useState(1);
  const [serviceDuration, setServiceDuration] = useState(20);
  const [maxRouteDuration, setMaxRouteDuration] = useState("");
  const [startTime, setStartTime] = useState("08:30");
  const [routePlan, setRoutePlan] = useState<UrgencyRoutePlan | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [sharedRouteId, setSharedRouteId] = useState("");
  const [savedRoutePlans, setSavedRoutePlans] = useState<SavedUrgencyRoutePlan[]>([]);
  const [savedRouteLoading, setSavedRouteLoading] = useState(false);
  const [saveRouteLoading, setSaveRouteLoading] = useState(false);
  const [routeSaveMessage, setRouteSaveMessage] = useState("");
  const openUrgencies = urgencies.filter((urgency) => urgency.status !== "Afgerond");
  const todayUrgencies = openUrgencies.filter((urgency) => urgency.reported_on === todayIso);
  const urgentWzcCount = new Set(openUrgencies.map((urgency) => urgency.wzc_id || urgency.wzc_name).filter(Boolean)).size;
  const urgencyMonthStats = useMemo(() => {
    const monthMap = new Map<string, {
      month: string;
      total: number;
      open: number;
      completed: number;
      wzcKeys: Set<string>;
      typeCounts: Map<string, number>;
    }>();

    function ensureMonth(month: string) {
      const existing = monthMap.get(month);
      if (existing) return existing;
      const created = {
        month,
        total: 0,
        open: 0,
        completed: 0,
        wzcKeys: new Set<string>(),
        typeCounts: new Map<string, number>(),
      };
      monthMap.set(month, created);
      return created;
    }

    const currentMonth = `${todayIso.slice(0, 7)}-01`;
    Array.from({ length: 12 }, (_, index) => addMonthsIso(currentMonth, -index)).forEach(ensureMonth);

    urgencies.forEach((urgency) => {
      if (!urgency.reported_on || urgency.reported_on.length < 7) return;
      const month = `${urgency.reported_on.slice(0, 7)}-01`;
      const stat = ensureMonth(month);
      stat.total += 1;
      if (urgency.status === "Afgerond") {
        stat.completed += 1;
      } else {
        stat.open += 1;
      }

      const wzcKey = urgency.wzc_id ? `id:${urgency.wzc_id}` : urgency.wzc_name ? `name:${urgency.wzc_name}` : "";
      if (wzcKey) stat.wzcKeys.add(wzcKey);
      const type = urgency.urgency_type || "Onbekend";
      stat.typeCounts.set(type, (stat.typeCounts.get(type) || 0) + 1);
    });

    return Array.from(monthMap.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12)
      .map((stat) => {
        const topType = Array.from(stat.typeCounts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        return {
          month: stat.month,
          total: stat.total,
          open: stat.open,
          completed: stat.completed,
          wzcCount: stat.wzcKeys.size,
          topTypeLabel: topType ? `${topType[0]} (${topType[1]})` : "",
        };
      });
  }, [urgencies]);
  const maxMonthlyUrgencies = Math.max(...urgencyMonthStats.map((stat) => stat.total), 1);
  const selectableWzcs = useMemo(
    () => actualWzcs(wzcs).filter((wzc) => wzc.collaboration_status === "Actief"),
    [wzcs]
  );
  const wzcsWithCoordinates = useMemo(
    () => selectableWzcs.filter((wzc) => typeof wzc.latitude === "number" && typeof wzc.longitude === "number"),
    [selectableWzcs]
  );
  const wzcById = useMemo(() => new Map(wzcs.map((wzc) => [wzc.id, wzc])), [wzcs]);
  const selectedRouteUrgencies = openUrgencies.filter((urgency) => selectedUrgencyIds[urgency.id]);
  const routableSelectedCount = selectedRouteUrgencies.filter((urgency) => hasUrgencyCoordinates(urgency)).length;
  const selectedStartLocation = routeStartLocations.find((location) => location.key === startPresetKey) || routeStartLocations[0];

  useEffect(() => {
    setWzcId(preselectedWzc?.id || "");
  }, [preselectedWzc]);

  useEffect(() => {
    let cancelled = false;
    setSavedRouteLoading(true);
    api.savedUrgencyRoutePlans(routeExecutionDate)
      .then((plans) => {
        if (!cancelled) setSavedRoutePlans(plans);
      })
      .catch((err) => {
        if (!cancelled) setRouteError(err instanceof Error ? err.message : "Opgeslagen routes konden niet geladen worden.");
      })
      .finally(() => {
        if (!cancelled) setSavedRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeExecutionDate]);

  useEffect(() => {
    setSelectedUrgencyIds((current) => {
      const next: Record<number, boolean> = {};
      openUrgencies.forEach((urgency) => {
        next[urgency.id] = current[urgency.id] ?? true;
      });
      return next;
    });
  }, [urgencies]);

  function hasUrgencyCoordinates(urgency: Urgency) {
    const wzc = urgency.wzc_id ? wzcById.get(urgency.wzc_id) : null;
    return typeof wzc?.latitude === "number" && typeof wzc?.longitude === "number";
  }

  function fillEndLocationFromWzc(value: number | "") {
    const selectedWzc = value === "" ? null : wzcById.get(value);
    setEndLocationWzcId(value);
    if (!selectedWzc || typeof selectedWzc.latitude !== "number" || typeof selectedWzc.longitude !== "number") return;
    setEndLabel(selectedWzc.name);
    setEndLatitude(String(selectedWzc.latitude));
    setEndLongitude(String(selectedWzc.longitude));
  }

  function parseCoordinate(value: string) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function generateRoutePlan() {
    const selectedIds = selectedRouteUrgencies.map((urgency) => urgency.id);
    const endLat = parseCoordinate(endLatitude);
    const endLon = parseCoordinate(endLongitude);
    setRouteError("");
    setRouteSaveMessage("");
    setRoutePlan(null);
    if (!selectedIds.length) {
      setRouteError("Selecteer minstens een open urgentie.");
      return;
    }
    if (useEndLocation && (endLat === null || endLon === null)) {
      setRouteError("Vul een geldige eindlocatie met latitude en longitude in.");
      return;
    }
    setRouteLoading(true);
    try {
      const plan = await api.planUrgencyRoutes({
        urgency_ids: selectedIds,
        execution_date: routeExecutionDate,
        start_location: {
          label: selectedStartLocation.label,
          latitude: selectedStartLocation.latitude,
          longitude: selectedStartLocation.longitude,
        },
        end_location: useEndLocation && endLat !== null && endLon !== null
          ? {
              label: endLabel.trim() || "Einde",
              latitude: endLat,
              longitude: endLon,
            }
          : null,
        return_to_start: useEndLocation ? false : returnToStart,
        route_count: routeCount,
        service_duration_minutes: serviceDuration,
        max_route_duration_minutes: maxRouteDuration ? Number(maxRouteDuration) : null,
        start_time: startTime,
      });
      setRoutePlan(plan);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Routeplanning kon niet berekend worden.");
    } finally {
      setRouteLoading(false);
    }
  }

  async function saveCurrentRoutePlan() {
    if (!routePlan) return;
    const assignedCount = routePlan.routes.reduce((total, route) => total + route.stops.length, 0);
    setSaveRouteLoading(true);
    setRouteSaveMessage("");
    setRouteError("");
    try {
      const saved = await api.saveUrgencyRoutePlan({
        execution_date: routePlan.execution_date || routeExecutionDate,
        title: `Urgentieroute ${formatDate(routePlan.execution_date || routeExecutionDate)} (${assignedCount} urgenties)`,
        plan: routePlan,
      });
      setSavedRoutePlans((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setRouteSaveMessage("Route opgeslagen voor de uitvoeringsdatum.");
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Route kon niet opgeslagen worden.");
    } finally {
      setSaveRouteLoading(false);
    }
  }

  async function deleteSavedRoutePlan(savedRoutePlan: SavedUrgencyRoutePlan) {
    setRouteError("");
    try {
      await api.deleteSavedUrgencyRoutePlan(savedRoutePlan.id);
      setSavedRoutePlans((current) => current.filter((item) => item.id !== savedRoutePlan.id));
      if (routePlan?.generated_at === savedRoutePlan.plan.generated_at) {
        setRoutePlan(null);
      }
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Opgeslagen route kon niet verwijderd worden.");
    }
  }

  function openSavedRoutePlan(savedRoutePlan: SavedUrgencyRoutePlan) {
    setRoutePlan(savedRoutePlan.plan);
    setRoutePlannerOpen(true);
    setRouteSaveMessage("");
    window.requestAnimationFrame(() => {
      document.querySelector(".routePlanResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function shareRoute(route: UrgencyRoutePlan["routes"][number], googleUrl: string) {
    if (!routePlan || !googleUrl) return;
    const text = routeShareText(routePlan, route);
    const sharePayload = {
      title: `${route.label} urgenties`,
      text,
      url: googleUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${googleUrl}`);
      } else {
        window.open(googleUrl, "_blank", "noopener,noreferrer");
      }
      setSharedRouteId(route.route_id);
      window.setTimeout(() => {
        setSharedRouteId((current) => current === route.route_id ? "" : current);
      }, 2400);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setRouteError("Route-link kon niet gedeeld of gekopieerd worden.");
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.createUrgency({
      reported_on: reportedOn,
      wzc_id: wzcId === "" ? null : Number(wzcId),
      patient_name: patientName,
      urgency_type: urgencyType,
      remark,
      status: "Open"
    });
    setPatientName("");
    setRemark("");
    await onSaved();
  }

  return (
    <div className="stack">
      <div className="privacyStrip">
        {L("Tijdelijke urgentielijst")}
      </div>
      <section className="panel urgencyPanel">
        <div className="sectionTitle">
          <div>
            <h2>{L("Urgentie toevoegen")}</h2>
            <p className="sectionHint">{lang === "nl" ? "Registreer een melding kort en koppel ze meteen aan de juiste WZC." : "Briefly register a report and link it to the correct care home."}</p>
          </div>
        </div>
        <form className="formGrid urgencyForm" onSubmit={submit}>
          <label className="urgencyField">{lang === "nl" ? "Meldingsdatum" : "Report date"}<input type="date" value={reportedOn} onChange={(event) => setReportedOn(event.target.value)} /></label>
          <SearchableWzcSelect className="urgencyField" label={L("WZC")} value={wzcId} wzcs={selectableWzcs} onChange={setWzcId} placeholder={lang === "nl" ? "Niet gekoppeld" : "Not linked"} />
          <label className="urgencyField">{lang === "nl" ? "Naam patient" : "Patient name"}<input value={patientName} onChange={(event) => setPatientName(event.target.value)} required /></label>
          <label className="urgencyField">{L("Urgentie")}<select value={urgencyType} onChange={(event) => setUrgencyType(event.target.value)}>
            {urgencyTypes.map((type) => <option key={type} value={type}>{L(type)}</option>)}
          </select></label>
          <label className="wide">{L("Opmerking")}<textarea value={remark} onChange={(event) => setRemark(event.target.value)} /></label>
          <div className="formSubmitRow">
            <button className="primaryButton">{L("Opslaan")}</button>
          </div>
        </form>
      </section>
      <div className="kpiGrid compactKpis">
        <div className="kpi"><span>{L("Open urgenties")}</span><strong>{openUrgencies.length}</strong></div>
        <div className="kpi"><span>{lang === "nl" ? "Vandaag" : "Today"}</span><strong>{todayUrgencies.length}</strong></div>
        <div className="kpi"><span>{L("WZC's")}</span><strong>{urgentWzcCount}</strong></div>
        <div className="kpi"><span>{lang === "nl" ? "Afgerond" : "Completed"}</span><strong>{urgencies.filter((urgency) => urgency.status === "Afgerond").length}</strong></div>
      </div>
      <section className="panel savedRoutesPanel">
        <div className="sectionTitle">
          <div>
            <h2>{lang === "nl" ? "Aangemaakte routes" : "Created routes"}</h2>
            <p className="sectionHint">{lang === "nl" ? "Routeplannen die voor de gekozen uitvoeringsdatum bewaard zijn." : "Route plans saved for the chosen execution date."}</p>
          </div>
          <label className="savedRouteDateField">{lang === "nl" ? "Uitvoeringsdatum" : "Execution date"}<input type="date" value={routeExecutionDate} onChange={(event) => setRouteExecutionDate(event.target.value || todayIso)} /></label>
        </div>
        {savedRouteLoading && <div className="empty compactEmpty">{L("Routes laden...")}</div>}
        {!savedRouteLoading && savedRoutePlans.length === 0 && (
          <div className="empty compactEmpty">{L("Nog geen opgeslagen urgentieroute voor")} {formatDate(routeExecutionDate)}.</div>
        )}
        {!savedRouteLoading && savedRoutePlans.length > 0 && (
          <div className="savedRouteList">
            {savedRoutePlans.map((savedRoutePlan) => {
              const assignedCount = savedRoutePlan.plan.routes.reduce((total, route) => total + route.stops.length, 0);
              return (
                <article className="savedRouteCard" key={savedRoutePlan.id}>
                  <div className="savedRouteHeader">
                    <div>
                      <strong>{savedRoutePlan.title}</strong>
                      <span>{assignedCount} {assignedCount === 1 ? L("urgentie") : L("urgenties")} · {L("aangemaakt")} {formatDateTime(savedRoutePlan.created_at)}</span>
                    </div>
                    <span className={`softBadge ${savedRoutePlan.plan.uses_real_road_network ? "" : "warningBadge"}`}>
                      {routePlanSourceLabel(savedRoutePlan.plan)}
                    </span>
                  </div>
                  <div className="savedRouteMiniList">
                    {savedRoutePlan.plan.routes.map((route) => (
                      <span key={route.route_id}>
                        <strong>{route.label}</strong>
                        {route.stops.length
                          ? `${route.stops.length} ${L("bezoeken")} · ${L("eerste")} ${arrivalWindowLabel(route.stops[0].arrival_time)} · ${L("klaar")} ${route.estimated_end_time}`
                          : L("geen bezoeken")}
                      </span>
                    ))}
                  </div>
                  <div className="routeActionRow">
                    <button className="compactActionButton" type="button" onClick={() => openSavedRoutePlan(savedRoutePlan)}>{lang === "nl" ? "Openen" : "Open"}</button>
                    <button className="compactActionButton dangerActionButton" type="button" onClick={() => deleteSavedRoutePlan(savedRoutePlan)}>{L("Verwijderen")}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="panel routePlannerPanel">
        <div className="sectionTitle">
          <div>
            <h2>{L("Routeplanning")}</h2>
            <p className="sectionHint">{L("Geeft een aanbevolen volgorde voor open urgenties, op basis van de beschikbare rijtijdmatrix.")}</p>
          </div>
          <button className="primaryButton" onClick={() => setRoutePlannerOpen((current) => !current)}>
            {routePlannerOpen ? L("Routeplanning sluiten") : L("Route plannen")}
          </button>
        </div>
        {routePlannerOpen && (
          <div className="routePlannerGrid">
            <div className="routeConfigBlock">
              <div className="routeSubTitle">{lang === "nl" ? "Selectie" : "Selection"}</div>
              <div className="routeSelectionActions">
                <button type="button" onClick={() => setSelectedUrgencyIds(Object.fromEntries(openUrgencies.map((urgency) => [urgency.id, true])))}>{lang === "nl" ? "Alles selecteren" : "Select all"}</button>
                <button type="button" onClick={() => setSelectedUrgencyIds(Object.fromEntries(openUrgencies.map((urgency) => [urgency.id, false])))}>{lang === "nl" ? "Alles wissen" : "Clear all"}</button>
                <span>{selectedRouteUrgencies.length} {L("geselecteerd")} · {routableSelectedCount} {lang === "nl" ? "met coördinaten" : "with coordinates"}</span>
              </div>
              <div className="routeUrgencySelection">
                {openUrgencies.map((urgency) => {
                  const hasCoordinates = hasUrgencyCoordinates(urgency);
                  return (
                    <label className={`routeUrgencyOption ${!hasCoordinates ? "missingCoordinates" : ""}`} key={urgency.id}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedUrgencyIds[urgency.id])}
                        onChange={(event) => setSelectedUrgencyIds((current) => ({ ...current, [urgency.id]: event.target.checked }))}
                      />
                      <span>
                        <strong>{urgency.wzc_name || L("Geen WZC")}</strong>
                        <small>{urgency.patient_name} · {L(urgency.urgency_type)}</small>
                        {!hasCoordinates && <em>{L("Geen WZC-coördinaten")}</em>}
                      </span>
                    </label>
                  );
                })}
                {openUrgencies.length === 0 && <div className="empty compactEmpty">{L("Nog geen open urgenties om te plannen.")}</div>}
              </div>
            </div>
            <div className="routeConfigBlock">
	              <div className="routeSubTitle">{L("Instellingen")}</div>
	              <div className="routeConfigFields">
	                <label>{lang === "nl" ? "Uitvoeringsdatum" : "Execution date"}<input type="date" value={routeExecutionDate} onChange={(event) => setRouteExecutionDate(event.target.value || todayIso)} /></label>
	                <label>{lang === "nl" ? "Startpunt" : "Start point"}<select value={startPresetKey} onChange={(event) => setStartPresetKey(event.target.value as typeof routeStartLocations[number]["key"])}>
	                  {routeStartLocations.map((location) => <option key={location.key} value={location.key}>{location.label}</option>)}
	                </select></label>
                <div className="routePresetInfo">
                  <strong>{selectedStartLocation.label}</strong>
                  <span>{selectedStartLocation.latitude}, {selectedStartLocation.longitude}</span>
                </div>
                <label>{lang === "nl" ? "Aantal routes" : "Number of routes"}<input type="number" min={1} max={12} value={routeCount} onChange={(event) => setRouteCount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} /></label>
                <label>{L("Bezoektijd per urgentie")}<input type="number" min={0} max={480} value={serviceDuration} onChange={(event) => setServiceDuration(Math.max(0, Math.min(480, Number(event.target.value) || 0)))} /></label>
                <label>{lang === "nl" ? "Max. route in minuten" : "Max. route in minutes"}<input type="number" min={1} max={1440} value={maxRouteDuration} onChange={(event) => setMaxRouteDuration(event.target.value)} placeholder={lang === "nl" ? "Optioneel" : "Optional"} /></label>
                <label>{lang === "nl" ? "Vertrekuur" : "Departure time"}<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              </div>
              <div className="routeToggleGrid">
                <label className="routeToggleRow">
                  <input type="checkbox" checked={returnToStart} disabled={useEndLocation} onChange={(event) => setReturnToStart(event.target.checked)} />
                  <span>{lang === "nl" ? "Terugkeren naar startpunt" : "Return to start point"}</span>
                </label>
                <label className="routeToggleRow">
                  <input type="checkbox" checked={useEndLocation} onChange={(event) => setUseEndLocation(event.target.checked)} />
                  <span>{lang === "nl" ? "Apart eindpunt gebruiken" : "Use separate end point"}</span>
                </label>
              </div>
              {useEndLocation && (
                <div className="routeConfigFields">
                  <SearchableWzcSelect label={lang === "nl" ? "Eindpunt overnemen van WZC" : "Copy end point from care home"} value={endLocationWzcId} wzcs={wzcsWithCoordinates} onChange={fillEndLocationFromWzc} placeholder={lang === "nl" ? "Handmatig invullen" : "Fill in manually"} />
                  <label>{lang === "nl" ? "Eindlabel" : "End label"}<input value={endLabel} onChange={(event) => setEndLabel(event.target.value)} /></label>
                  <label>{lang === "nl" ? "Eind latitude" : "End latitude"}<input value={endLatitude} onChange={(event) => setEndLatitude(event.target.value)} inputMode="decimal" /></label>
                  <label>{lang === "nl" ? "Eind longitude" : "End longitude"}<input value={endLongitude} onChange={(event) => setEndLongitude(event.target.value)} inputMode="decimal" /></label>
                </div>
              )}
              <div className="formSubmitRow routeSubmitRow">
                <button className="primaryButton" type="button" disabled={routeLoading || openUrgencies.length === 0} onClick={generateRoutePlan}>
                  {routeLoading ? (lang === "nl" ? "Volgorde berekenen..." : "Calculating order...") : (lang === "nl" ? "Volgorde berekenen" : "Calculate order")}
                </button>
              </div>
              {routeError && <div className="error">{routeError}</div>}
            </div>
          </div>
        )}
        {routePlan && (() => {
          const assignedCount = routePlan.routes.reduce((total, route) => total + route.stops.length, 0);
          const routeAlreadySaved = savedRoutePlans.some((savedRoutePlan) => savedRoutePlan.plan.generated_at === routePlan.generated_at);
          return (
            <div className="routePlanResult">
              <div className="routeResultBar">
                <div>
                  <strong>{assignedCount} {L("urgenties ingepland")}</strong>
                  <span>{routePlan.routes.length} route(s) · {routePlanSourceText(routePlan, lang)}</span>
                </div>
                <div className="routeResultActions">
                  <button className="compactActionButton" type="button" disabled={saveRouteLoading || routeAlreadySaved} onClick={saveCurrentRoutePlan}>
                    {saveRouteLoading ? L("Opslaan...") : routeAlreadySaved ? L("Opgeslagen") : `${L("Opslaan voor")} ${formatDate(routePlan.execution_date)}`}
                  </button>
                  <span className={`softBadge routeSourceBadge ${routePlan.uses_real_road_network ? "" : "warningBadge"}`}>
                    {routePlanSourceLabel(routePlan, lang)}
                  </span>
                </div>
              </div>
              {routeSaveMessage && <div className="successNotice">{routeSaveMessage}</div>}
              {routePlan.warnings.length > 0 && (
                <details className="routeWarningsDisclosure">
                  <summary>{routePlan.warnings.length} {lang === "nl" ? (routePlan.warnings.length === 1 ? "aandachtspunt" : "aandachtspunten") : (routePlan.warnings.length === 1 ? "warning" : "warnings")}</summary>
                  <div className="routeWarnings">
                    {routePlan.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                  </div>
                </details>
              )}
              <div className="routeDispatchGrid">
                <RoutePlanMap plan={routePlan} />
                <div className="routeDispatchList">
                  {routePlan.routes.map((route) => {
                    const googleUrl = googleMapsRouteUrl(routePlan, route);
                    const waypointCount = googleMapsWaypointCount(routePlan, route);
                    return (
                      <article className="routeDispatchCard" key={route.route_id} style={{ borderLeftColor: route.color }}>
                        <div className="routeDispatchHeader">
                          <div>
                            <strong>{route.label}</strong>
                            <span>{route.stops.length} {L("bezoeken")} · {L("klaar")} {route.estimated_end_time}</span>
                          </div>
                          <span className="routeColorDot" style={{ background: route.color }} />
                        </div>
                        <div className="routeDispatchSummary">
                          <span><strong>{formatDuration(route.total_duration_minutes)}</strong> {lang === "nl" ? "totaal" : "total"}</span>
                          <span><strong>{formatDuration(route.total_driving_minutes)}</strong> {lang === "nl" ? "rijden" : "driving"}</span>
                          <span><strong>{formatDistance(route.total_distance_km)}</strong> {lang === "nl" ? "afstand" : "distance"}</span>
                        </div>
                        <div className="routeActionRow">
                          {googleUrl
                            ? <a className="primaryRouteLink" href={googleUrl} target="_blank" rel="noreferrer">{lang === "nl" ? "Open in Google Maps" : "Open in Google Maps"}</a>
                            : <span className="routeLinkLimit">{lang === "nl" ? "Te veel tussenstops voor een Google Maps-link" : "Too many waypoints for a Google Maps link"}</span>}
                          {googleUrl && (
                            <button className="compactActionButton" type="button" onClick={() => shareRoute(route, googleUrl)}>
                              {sharedRouteId === route.route_id ? (lang === "nl" ? "Link klaar" : "Link ready") : (lang === "nl" ? "Deel/kopieer" : "Share/copy")}
                            </button>
                          )}
                        </div>
                        {googleUrl && waypointCount > 3 && (
                          <small className="routeMobileNote">{lang === "nl" ? "Bij veel tussenstops werkt openen in de Google Maps-app het betrouwbaarst." : "With many waypoints, opening in the Google Maps app works most reliably."}</small>
                        )}
                        <ol className="routeStopList">
                          {route.stops.map((stop) => (
                            <li key={stop.urgency_id}>
                              <strong>{stop.wzc_name}</strong>
                              <span>{arrivalWindowLabel(stop.arrival_time)} · {stop.patient_name}</span>
                            </li>
                          ))}
                        </ol>
                        {route.stops.length === 0 && <div className="empty compactEmpty">{L("Geen urgenties toegewezen aan deze route.")}</div>}
                        <details className="routeDetails">
                          <summary>{lang === "nl" ? "Timing en rijtijden" : "Timing and travel times"}</summary>
                          <div className="routeTimeline">
                            <div className="routeTimelineRow">
                              <time>{route.estimated_start_time}</time>
                              <span>{lang === "nl" ? "Vertrek" : "Departure"} {routePlan.start_location.label}</span>
                            </div>
                            {route.stops.map((stop) => (
                              <div className="routeTimelineRow" key={stop.urgency_id}>
                                <time>{stop.arrival_time}</time>
                                <span>
                                  <strong>{stop.sequence}. {stop.wzc_name}</strong>
                                  <small>{stop.patient_name} · {L(stop.urgency_type)} · +{formatDuration(stop.driving_minutes_from_previous)} {lang === "nl" ? "rijden" : "driving"}</small>
                                </span>
                              </div>
                            ))}
                            {(route.final_driving_minutes > 0 || routePlan.return_to_start || routePlan.end_location) && (
                              <div className="routeTimelineRow">
                                <time>{route.estimated_end_time}</time>
                                <span>{route.end_location_label}{route.final_driving_minutes > 0 ? ` · +${formatDuration(route.final_driving_minutes)} ${lang === "nl" ? "rijden" : "driving"}` : ""}</span>
                              </div>
                            )}
                          </div>
                        </details>
                        {route.warnings.length > 0 && (
                          <div className="routeWarnings">
                            {route.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
              {routePlan.unassigned_urgencies.length > 0 && (
                <div className="unassignedPanel">
                  <strong>{lang === "nl" ? "Niet ingepland" : "Not scheduled"}</strong>
                  {routePlan.unassigned_urgencies.map((item) => (
                    <div key={item.urgency_id}>
                      <span>{item.wzc_name || L("Geen WZC")} · {item.patient_name}</span>
                      <small>{item.reason}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </section>
      <section className="panel urgencyListPanel">
        <div className="sectionTitle">
          <div>
            <h2>{L("Open urgenties")}</h2>
            <p className="sectionHint">{lang === "nl" ? "Werk meldingen afzonderlijk af zodra ze behandeld of administratief verwerkt zijn." : "Complete reports individually once they have been treated or administratively processed."}</p>
          </div>
          <span className="softBadge">{openUrgencies.length} open</span>
        </div>
        <div className="urgencyList">
          {openUrgencies.map((urgency) => (
            <article className="urgencyRow" key={urgency.id}>
              <div className="urgencyMain">
                <strong>{urgency.wzc_name || L("Geen WZC")}</strong>
                <span>{urgency.patient_name}</span>
              </div>
              <div className="urgencyTypeBlock">
                <span className="softBadge">{urgency.urgency_type}</span>
                <small>{formatDate(urgency.reported_on)}</small>
              </div>
              <small className="urgencyRemark">{urgency.remark || L("Geen opmerking")}</small>
              <button onClick={async () => { await api.completeUrgency(urgency.id); await onSaved(); }}>{lang === "nl" ? "Afronden" : "Complete"}</button>
            </article>
          ))}
          {openUrgencies.length === 0 && <div className="empty">{L("Nog geen open urgenties.")}</div>}
        </div>
      </section>
      <section className="urgencyMonthlyPanel">
        <details className="urgencyMonthlyDisclosure">
          <summary>
            <span className="urgencyMonthlySummaryMain">{lang === "nl" ? "Maandoverzicht urgenties" : "Monthly urgency overview"}</span>
            <span className="urgencyMonthlySummaryMeta">
              {lang === "nl" ? "Deze maand" : "This month"} {urgencyMonthStats[0]?.total ?? 0} · {urgencies.length} {lang === "nl" ? "totaal" : "total"}
            </span>
          </summary>
          <div className="urgencyMonthlyContent">
            <p className="sectionHint">{lang === "nl" ? "Telt alle meldingen per meldingsdatum, ook wanneer ze intussen afgerond zijn." : "Counts all reports by report date, even when they have since been completed."}</p>
            <div className="urgencyMonthGrid">
              {urgencyMonthStats.map((stat) => {
                const barWidth = stat.total ? Math.max((stat.total / maxMonthlyUrgencies) * 100, 8) : 0;
                return (
                  <article className={`urgencyMonthCard ${stat.total ? "" : "emptyMonth"}`} key={stat.month}>
                    <div className="urgencyMonthHeader">
                      <strong>{monthLabel(stat.month, lang)}</strong>
                      <span>{stat.total}</span>
                    </div>
                    <div className="urgencyMonthBar" aria-hidden="true">
                      <span style={{ width: `${barWidth}%` }} />
                    </div>
                    <div className="urgencyMonthMeta">
                      <span>{lang === "nl" ? "Open" : "Open"} {stat.open}</span>
                      <span>{lang === "nl" ? "Afgerond" : "Completed"} {stat.completed}</span>
                      <span>{stat.wzcCount} {lang === "nl" ? `WZC${stat.wzcCount === 1 ? "" : "'s"}` : `care home${stat.wzcCount === 1 ? "" : "s"}`}</span>
                    </div>
                    {stat.topTypeLabel && <small>{lang === "nl" ? "Meest" : "Most"}: {L(stat.topTypeLabel)}</small>}
                  </article>
                );
              })}
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}

function WzcOverviewView({
  wzcs,
  selected,
  onSelect,
  onPlan,
  onUrgency
}: {
  wzcs: Wzc[];
  selected: Wzc | Prospect | null;
  onSelect: (wzc: Wzc) => void;
  onPlan: (wzc: Wzc) => void;
  onUrgency: (wzc: Wzc) => void;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const portfolioWzcs = useMemo(() => applyGroupFilter(wzcs, groupFilter), [wzcs, groupFilter]);
  const groupOptions = useMemo(() => groupOptionsForWzcs(wzcs), [wzcs]);
  const filtered = portfolioWzcs.filter((wzc) => {
    const haystack = normalizeSearch([wzc.name, wzc.group_name, wzc.city, wzc.owner].join(" "));
    return haystack.includes(normalizeSearch(query));
  });
  const selectedWzc = selected && "collaboration_status" in selected ? selected : null;

  return (
    <div className="mapAndList">
      <WzcMap wzcs={filtered} selected={selected} onSelectWzc={onSelect} onPlan={onPlan} onUrgency={onUrgency} />
      <section className="panel sidePanel">
        <div className="sectionTitle">
          <h2>{lang === "nl" ? "Portfolio" : "Portfolio"}</h2>
          <span className="softBadge">{filtered.length}/{actualWzcs(wzcs).length}</span>
        </div>
        <input placeholder={lang === "nl" ? "Filter op naam, gemeente of eigenaar" : "Filter by name, city or owner"} value={query} onChange={(event) => setQuery(event.target.value)} />
        {groupOptions.length > 0 && (
          <SearchableGroupSelect value={groupFilter} groups={groupOptions} onChange={setGroupFilter} placeholder={L("Alle groepen")} ariaLabel={lang === "nl" ? "Filter op groep" : "Filter by group"} />
        )}
        <div className="cardList scrollList">
          {filtered.map((wzc) => (
            <button
              className={`portfolioRow ${selectedWzc?.id === wzc.id ? "selected" : ""}`}
              key={wzc.id}
              onClick={() => onSelect(wzc)}
            >
              <strong>{wzc.name}</strong>
              <span>{wzc.city || (lang === "nl" ? "Geen gemeente" : "No city")} · {wzc.owner || (lang === "nl" ? "Geen eigenaar" : "No owner")}</span>
              <small>{wzc.next_visit ? `${L("Volgende bezoek")}: ${formatDate(wzc.next_visit)}` : (lang === "nl" ? "Nog geen volgend bezoek" : "No upcoming visit")}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExtraContactsEditor({
  contacts,
  onChange,
  summary = "Extra contacten"
}: {
  contacts: ExtraContact[];
  onChange: (contacts: ExtraContact[]) => void;
  summary?: string;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  function updateContact(index: number, patch: Partial<ExtraContact>) {
    onChange(contacts.map((contact, contactIndex) => contactIndex === index ? { ...contact, ...patch } : contact));
  }

  function removeContact(index: number) {
    onChange(contacts.filter((_, contactIndex) => contactIndex !== index));
  }

  return (
    <details className="extraContactsBox">
      <summary>
        <span>{summary}</span>
        <small>{contacts.length ? `${contacts.length} extra` : (lang === "nl" ? "Geen extra contacten" : "No extra contacts")}</small>
      </summary>
      <div className="extraContactsList">
        {contacts.map((contact, index) => (
          <div className="extraContactRow" key={index}>
            <label>{lang === "nl" ? "Naam" : "Name"}<input value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} /></label>
            <label>{lang === "nl" ? "Functie" : "Function"}<input value={contact.role} onChange={(event) => updateContact(index, { role: event.target.value })} /></label>
            <label>{L("Telefoon")}<input value={contact.phone} onChange={(event) => updateContact(index, { phone: event.target.value })} /></label>
            <label>{L("E-mail")}<input value={contact.email} onChange={(event) => updateContact(index, { email: event.target.value })} /></label>
            <button type="button" onClick={() => removeContact(index)}>{L("Verwijderen")}</button>
          </div>
        ))}
        {contacts.length === 0 && <div className="empty compactEmpty">{lang === "nl" ? "Nog geen extra contactpersonen." : "No extra contacts yet."}</div>}
        <button type="button" onClick={() => onChange([...contacts, blankExtraContact()])}>{ lang === "nl" ? "Contact toevoegen" : "Add contact"}</button>
      </div>
    </details>
  );
}

const newGroupChoiceValue = "Nieuwe groep";

function GroupNameField({
  label,
  groups,
  value,
  onChange
}: {
  label: string;
  groups: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [searchValue, setSearchValue] = useState(value);
  const groupOptions = useMemo(
    () => [
      ...groups.map((group) => ({ value: group, label: group })),
      { value: newGroupChoiceValue, label: newGroupChoiceValue }
    ],
    [groups]
  );

  useEffect(() => {
    if (!showNewGroupInput) setSearchValue(value);
  }, [showNewGroupInput, value]);

  function selectGroup(nextValue: string) {
    if (nextValue === newGroupChoiceValue) {
      setShowNewGroupInput(true);
      onChange("");
      return;
    }
    setSearchValue(nextValue);
    setShowNewGroupInput(false);
    onChange(nextValue);
  }

  if (showNewGroupInput) {
    return (
      <div className="searchableDropdownField groupNameField">
        <span className="searchableDropdownLabel">{label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (!value.trim()) setShowNewGroupInput(false);
          }}
          placeholder="Naam nieuwe groep"
          aria-label={label}
          autoFocus
        />
      </div>
    );
  }

  return (
    <SearchableDropdownField
      label={label}
      value={searchValue}
      options={groupOptions}
      onInputChange={selectGroup}
      onSelect={(option) => selectGroup(option.value)}
      placeholder="Typ of kies groep"
      className="groupNameField"
    />
  );
}

function ProspectView({
  wzcs,
  prospects,
  focusProspect,
  onFocusHandled,
  onConverted,
  onSaved
}: {
  wzcs: Wzc[];
  prospects: Prospect[];
  focusProspect?: Prospect | null;
  onFocusHandled?: () => void;
  onConverted?: (wzc: Wzc) => void;
  onSaved: () => Promise<void>;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Prospect | null>(prospects[0] || null);
  const [query, setQuery] = useState("");
  const [workFilter, setWorkFilter] = useState("Alles");
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    group_name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_name: "",
    phone: "",
    email: "",
    status: defaultProspectStatus,
    channel: "",
    response: "",
    owner: "",
    next_action: "",
    next_action_deadline: ""
  });
  const [editForm, setEditForm] = useState({
    name: "",
    group_name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_name: "",
    phone: "",
    email: "",
    status: defaultProspectStatus,
    channel: "",
    response: "",
    owner: "",
    contacted_on: "",
    meeting_type: "",
    meeting_date: "",
    next_action: "",
    next_action_deadline: "",
    remark: ""
  });
  const groupOptions = useMemo(() => groupOptionsForWzcsAndProspects(wzcs, prospects), [wzcs, prospects]);

  const filtered = useMemo(() => {
    return [...prospects]
      .filter((prospect) => {
        const haystack = [prospect.name, prospect.group_name, prospect.city, prospect.status, prospect.owner, prospect.next_action].join(" ").toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
        const deadlineDelta = daysUntil(prospect.next_action_deadline);
        if (workFilter === "Te laat") return deadlineDelta !== null && deadlineDelta < 0;
        if (workFilter === "Vandaag") return deadlineDelta === 0;
        if (workFilter === "Deze week") return deadlineDelta !== null && deadlineDelta >= 0 && deadlineDelta <= 7;
        if (workFilter === "Geen actie") return !prospect.next_action;
        if (workFilter === "Geen eigenaar") return !prospect.owner;
        if (workFilter === "Aandacht") return prospectNeedsAttention(prospect);
        return true;
      })
      .sort((a, b) => Number(prospectNeedsAttention(b)) - Number(prospectNeedsAttention(a)) || a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
  }, [prospects, query, workFilter]);

  useEffect(() => {
    if (!selected) {
      setSelected(prospects[0] || null);
      return;
    }
    const refreshed = prospects.find((prospect) => prospect.id === selected.id);
    setSelected(refreshed || prospects[0] || null);
  }, [prospects, selected?.id]);

  useEffect(() => {
    if (!focusProspect) return;
    const focused = prospects.find((prospect) => prospect.id === focusProspect.id);
    if (!focused) return;
    setSelected(focused);
    window.setTimeout(() => document.getElementById("prospectfiche")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    onFocusHandled?.();
  }, [focusProspect?.id, prospects, onFocusHandled]);

  function openProspectFiche(prospect: Prospect) {
    setSelected(prospect);
    window.setTimeout(() => document.getElementById("prospectfiche")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: selected.name || "",
      group_name: selected.group_name || "",
      address: selected.address || "",
      postal_code: selected.postal_code || "",
      city: selected.city || "",
      contact_name: selected.contact_name || "",
      phone: selected.phone || "",
      email: selected.email || "",
      status: selected.status || defaultProspectStatus,
      channel: selected.channel || "",
      response: selected.response || "",
      owner: selected.owner || "",
      contacted_on: selected.contacted_on || "",
      meeting_type: selected.meeting_type || "",
      meeting_date: selected.meeting_date || "",
      next_action: selected.next_action || "",
      next_action_deadline: selected.next_action_deadline || "",
      remark: selected.remark || ""
    });
  }, [selected]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const coordinates = await browserGeocodeAddress(form.address, form.postal_code, form.city);
    const prospect = await api.createProspect({
      ...form,
      ...coordinates,
      next_action_deadline: form.next_action_deadline || null
    });
    setSelected(prospect);
    setForm({ name: "", group_name: "", address: "", postal_code: "", city: "", contact_name: "", phone: "", email: "", status: defaultProspectStatus, channel: "", response: "", owner: "", next_action: "", next_action_deadline: "" });
    setShowForm(false);
    await onSaved();
  }

  async function saveSelected() {
    if (!selected) return;
    const locationChanged = editForm.address !== selected.address || editForm.postal_code !== selected.postal_code || editForm.city !== selected.city;
    const needsCoordinates = !selected.latitude || !selected.longitude || locationChanged;
    const coordinates = needsCoordinates ? await browserGeocodeAddress(editForm.address, editForm.postal_code, editForm.city) : {};
    const prospect = await api.updateProspect(selected.id, {
      ...editForm,
      ...coordinates,
      contacted_on: editForm.contacted_on || null,
      meeting_date: editForm.meeting_date || null,
      next_action_deadline: editForm.next_action_deadline || null
    });
    setSelected(prospect);
    await onSaved();
  }

  async function removeSelected() {
    if (!selected) return;
    const confirmedName = window.prompt(`Bent u zeker? U staat op het punt om ${selected.name} te verwijderen.\nTyp exact de prospectienaam om te bevestigen.`);
    if (!confirmedName) return;
    await api.deleteProspect(selected.id, confirmedName);
    setSelected(null);
    await onSaved();
  }

  async function convertSelectedToWzc() {
    if (!selected || converting) return;
    const confirmed = window.confirm(`Bent u zeker? ${selected.name} wordt omgezet naar een actieve WZC en verdwijnt uit de prospectielijst.`);
    if (!confirmed) return;
    setConverting(true);
    try {
      const wzc = await api.convertProspectToWzc(selected.id);
      setSelected(null);
      await onSaved();
      onConverted?.(wzc);
    } finally {
      setConverting(false);
    }
  }

  const filterOptions = ["Alles", "Aandacht", "Te laat", "Vandaag", "Deze week", "Geen actie", "Geen eigenaar"];
  const attentionCount = prospects.filter(prospectNeedsAttention).length;
  const plannedCount = prospects.filter((prospect) => prospect.status === "Gesprek gepland").length;

  return (
    <div className="stack">
      <WzcMap wzcs={[]} prospects={prospects} selected={selected} onSelectWzc={() => undefined} onSelectProspect={(prospect) => setSelected(prospect)} onOpenProspectFiche={openProspectFiche} />
      <section className="panel">
        <div className="sectionTitle">
          <div>
            <h2>{lang === "nl" ? "Prospectie pipeline" : "Prospect pipeline"}</h2>
            <p className="sectionHint">{prospects.length} {lang === "nl" ? "prospecties" : "prospects"} · {attentionCount} {lang === "nl" ? "vragen aandacht" : "need attention"} · {plannedCount} {lang === "nl" ? "gesprekken gepland" : "meetings planned"}</p>
          </div>
          <button className="primaryButton" onClick={() => setShowForm((value) => !value)}>{lang === "nl" ? "Nieuwe WZC prospect" : "New care home prospect"}</button>
        </div>
        {showForm && (
          <form className="formGrid compact" onSubmit={submit}>
            <label>{lang === "nl" ? "Naam" : "Name"}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <GroupNameField label={L("Groep")} groups={groupOptions} value={form.group_name} onChange={(group_name) => setForm({ ...form, group_name })} />
            <label>{L("Adres")}<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label>{lang === "nl" ? "Postcode" : "Postal code"}<input value={form.postal_code} onChange={(event) => setForm({ ...form, postal_code: event.target.value })} /></label>
            <label>{lang === "nl" ? "Gemeente" : "City"}<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label>{L("Contact")}<input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} /></label>
            <label>{L("Telefoon")}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>{L("E-mail")}<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>{L("Status")}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {prospectStatuses.map((status) => <option key={status} value={status}>{L(status)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Kanaal" : "Channel"}<select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}>
              <option value="">{lang === "nl" ? "Niet gekozen" : "Not selected"}</option>
              {prospectChannels.map((channel) => <option key={channel} value={channel}>{L(channel)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Response" : "Response"}<select value={form.response} onChange={(event) => setForm({ ...form, response: event.target.value })}>
              <option value="">{lang === "nl" ? "Niet gekozen" : "Not selected"}</option>
              {prospectResponses.map((response) => <option key={response} value={response}>{L(response)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Eigenaar" : "Owner"}<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label>
            <label>{lang === "nl" ? "Deadline" : "Deadline"}<input type="date" value={form.next_action_deadline} onChange={(event) => setForm({ ...form, next_action_deadline: event.target.value })} /></label>
            <label className="wide">{L("Volgende actie")}<input value={form.next_action} onChange={(event) => setForm({ ...form, next_action: event.target.value })} /></label>
            <button className="primaryButton">{lang === "nl" ? "Prospectie opslaan" : "Save prospect"}</button>
          </form>
        )}
        <div className="filterBar">
          <input placeholder={lang === "nl" ? "Zoek prospectie, status, eigenaar of actie" : "Search prospect, status, owner or action"} value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="segmented">
            {filterOptions.map((option) => (
              <button key={option} className={workFilter === option ? "selected" : ""} onClick={() => setWorkFilter(option)}>{option}</button>
            ))}
          </div>
        </div>
        <div className="pipeline">
          {filtered.map((prospect) => (
            <button key={prospect.id} className={`pipelineRow ${selected?.id === prospect.id ? "selected" : ""}`} onClick={() => setSelected(prospect)}>
              <div>
                <strong>{prospect.name}</strong>
                <span>{formatAddress([prospect.address, prospect.postal_code, prospect.city]) || (lang === "nl" ? "Geen adres" : "No address")}</span>
                <small>{prospect.next_action || (lang === "nl" ? "Geen volgende actie" : "No next action")} · {prospect.owner || (lang === "nl" ? "Geen eigenaar" : "No owner")}</small>
              </div>
              <div className="pipelineMeta">
                <span className="softBadge">{prospect.status || defaultProspectStatus}</span>
                {prospectNeedsAttention(prospect) && <span className="attentionBadge">{lang === "nl" ? "Aandacht" : "Attention"}</span>}
                <small>{prospect.next_action_deadline ? formatDate(prospect.next_action_deadline) : (lang === "nl" ? "Geen deadline" : "No deadline")}</small>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="empty">{lang === "nl" ? "Geen prospecties voor deze filter." : "No prospects for this filter."}</div>}
        </div>
      </section>
      {selected && (
        <section className="panel" id="prospectfiche">
          <div className="sectionTitle">
            <div>
              <h2>{lang === "nl" ? "Prospectfiche" : "Prospect details"}</h2>
              <p className="sectionHint">{selected.external_id} · {lang === "nl" ? "laatste status" : "last status"}: {L(selected.status || defaultProspectStatus)}</p>
            </div>
            <div className="inlineActions noMargin">
              <button className="primaryButton" disabled={converting} onClick={convertSelectedToWzc}>{converting ? (lang === "nl" ? "Omzetten..." : "Converting...") : (lang === "nl" ? "Zet om naar actieve WZC" : "Convert to active care home")}</button>
              <button onClick={removeSelected}>{L("Verwijderen")}</button>
              <button className="primaryButton" onClick={saveSelected}>{lang === "nl" ? "Bewaren" : "Save"}</button>
            </div>
          </div>
          <div className="formGrid compact">
            <label>{lang === "nl" ? "WZC naam" : "Care home name"}<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
            <SearchableGroupSelect label={L("Groep")} value={editForm.group_name} groups={groupOptions} onChange={(group_name) => setEditForm({ ...editForm, group_name })} placeholder={L("Typ of kies groep")} />
            <label>{L("Adres")}<input value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} /></label>
            <label>{lang === "nl" ? "Postcode" : "Postal code"}<input value={editForm.postal_code} onChange={(event) => setEditForm({ ...editForm, postal_code: event.target.value })} /></label>
            <label>{lang === "nl" ? "Gemeente" : "City"}<input value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></label>
            <label>{lang === "nl" ? "Hoofdcontact" : "Main contact"}<input value={editForm.contact_name} onChange={(event) => setEditForm({ ...editForm, contact_name: event.target.value })} /></label>
            <label>{L("Telefoon")}<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label>
            <label>{L("E-mail")}<input value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
            <label>{L("Status")}<select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
              {prospectStatuses.map((status) => <option key={status} value={status}>{L(status)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Kanaal" : "Channel"}<select value={editForm.channel} onChange={(event) => setEditForm({ ...editForm, channel: event.target.value })}>
              <option value="">{lang === "nl" ? "Niet gekozen" : "Not selected"}</option>
              {prospectChannels.map((channel) => <option key={channel} value={channel}>{L(channel)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Response" : "Response"}<select value={editForm.response} onChange={(event) => setEditForm({ ...editForm, response: event.target.value })}>
              <option value="">{lang === "nl" ? "Niet gekozen" : "Not selected"}</option>
              {prospectResponses.map((response) => <option key={response} value={response}>{L(response)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Eigenaar" : "Owner"}<input value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })} /></label>
            <label>{lang === "nl" ? "Aangeschreven op" : "Contacted on"}<input type="date" value={editForm.contacted_on} onChange={(event) => setEditForm({ ...editForm, contacted_on: event.target.value })} /></label>
            <label>{lang === "nl" ? "Gesprekstype" : "Meeting type"}<input value={editForm.meeting_type} onChange={(event) => setEditForm({ ...editForm, meeting_type: event.target.value })} /></label>
            <label>{lang === "nl" ? "Gespreksdatum" : "Meeting date"}<input type="date" value={editForm.meeting_date} onChange={(event) => setEditForm({ ...editForm, meeting_date: event.target.value })} /></label>
            <label>{L("Deadline volgende actie")}<input type="date" value={editForm.next_action_deadline} onChange={(event) => setEditForm({ ...editForm, next_action_deadline: event.target.value })} /></label>
            <label className="wide">{L("Volgende actie")}<input value={editForm.next_action} onChange={(event) => setEditForm({ ...editForm, next_action: event.target.value })} /></label>
            <label className="wide">{L("Opmerking")}<textarea value={editForm.remark} onChange={(event) => setEditForm({ ...editForm, remark: event.target.value })} /></label>
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveWzcFollowupView({
  wzcs,
  urgencies,
  focusWzc,
  onFocusHandled,
  onSaved,
  onPlan,
  onUrgency
}: {
  wzcs: Wzc[];
  urgencies: Urgency[];
  focusWzc?: Wzc | null;
  onFocusHandled?: () => void;
  onSaved: () => Promise<void>;
  onPlan: (wzc: Wzc) => void;
  onUrgency: (wzc: Wzc) => void;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [selected, setSelected] = useState<Wzc | null>(wzcs[0] || null);
  const [query, setQuery] = useState("");
  const [workFilter, setWorkFilter] = useState("Alles");
  const [groupFilter, setGroupFilter] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    group_name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_name: "",
    contact_role: "",
    phone: "",
    email: "",
    owner: "",
    last_visit: "",
    next_visit: "",
    resident_count: "",
    remark: ""
  });
  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);

  function openUrgenciesFor(wzc: Wzc) {
    const explicitCount = Number(wzc.open_urgencies || 0);
    if (explicitCount > 0) return explicitCount;
    return urgencies.filter((urgency) => urgency.wzc_id === wzc.id && urgency.status !== "Afgerond").length;
  }

  const groupOptions = useMemo(() => groupOptionsForWzcs(wzcs), [wzcs]);
  const groupedWzcs = useMemo(() => applyGroupFilter(wzcs, groupFilter), [wzcs, groupFilter]);

  const filtered = useMemo(() => {
    return [...groupedWzcs]
      .filter((wzc) => {
        const haystack = normalizeSearch([wzc.name, wzc.group_name, wzc.city, wzc.owner, wzc.contact_name, wzc.remark].join(" "));
        if (!haystack.includes(normalizeSearch(query))) return false;
        const nextVisitDelta = daysUntil(wzc.next_visit);
        if (workFilter === "Open urgenties") return openUrgenciesFor(wzc) > 0;
        if (workFilter === "Geen bezoek") return !wzc.next_visit;
        if (workFilter === "Deze maand") return nextVisitDelta !== null && nextVisitDelta >= 0 && nextVisitDelta <= 30;
        if (workFilter === "Te laat") return nextVisitDelta !== null && nextVisitDelta < 0;
        return true;
      })
      .sort((a, b) => openUrgenciesFor(b) - openUrgenciesFor(a) || a.name.localeCompare(b.name));
  }, [groupedWzcs, urgencies, query, workFilter]);

  useEffect(() => {
    if (!selected) {
      setSelected(groupedWzcs[0] || null);
      return;
    }
    const refreshed = groupedWzcs.find((wzc) => wzc.id === selected.id);
    setSelected(refreshed || groupedWzcs[0] || null);
  }, [groupedWzcs, selected?.id]);

  useEffect(() => {
    if (!focusWzc) return;
    const focused = groupedWzcs.find((wzc) => wzc.id === focusWzc.id);
    if (!focused) return;
    setSelected(focused);
    window.setTimeout(() => document.getElementById("actieve-wzc-fiche")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    onFocusHandled?.();
  }, [focusWzc?.id, groupedWzcs, onFocusHandled]);

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: selected.name || "",
      group_name: selected.group_name || "",
      address: selected.address || "",
      postal_code: selected.postal_code || "",
      city: selected.city || "",
      contact_name: selected.contact_name || "",
      contact_role: selected.contact_role || "",
      phone: selected.phone || "",
      email: selected.email || "",
      owner: selected.owner || "",
      last_visit: selected.last_visit || "",
      next_visit: selected.next_visit || "",
      resident_count: selected.resident_count === null ? "" : String(selected.resident_count),
      remark: selected.remark || ""
    });
    setExtraContacts(parseExtraContacts(selected.extra_contacts));
  }, [selected]);

  async function saveSelected() {
    if (!selected) return;
    await api.updateWzc(selected.id, {
      ...editForm,
      last_visit: editForm.last_visit || null,
      next_visit: editForm.next_visit || null,
      resident_count: editForm.resident_count ? Number(editForm.resident_count) : null,
      extra_contacts: serializeExtraContacts(extraContacts)
    });
    await onSaved();
  }

  function openWzcFiche(wzc: Wzc) {
    setSelected(wzc);
    window.setTimeout(() => document.getElementById("actieve-wzc-fiche")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const filterOptions = ["Alles", "Open urgenties", "Geen bezoek", "Deze maand", "Te laat"];
  const openUrgencyCount = groupedWzcs.reduce((total, wzc) => total + openUrgenciesFor(wzc), 0);
  const missingVisitCount = groupedWzcs.filter((wzc) => !wzc.next_visit).length;

  return (
    <div className="stack">
      <WzcMap wzcs={filtered} selected={selected} onSelectWzc={setSelected} onOpenWzcFiche={openWzcFiche} onPlan={onPlan} onUrgency={onUrgency} />
      <section className="panel">
        <div className="sectionTitle">
          <div>
            <h2>{lang === "nl" ? "Actieve WZC's opvolgen" : "Follow up active care homes"}</h2>
            <p className="sectionHint">{groupedWzcs.length} {lang === "nl" ? "actief" : "active"} · {openUrgencyCount} {lang === "nl" ? "open urgenties" : "open urgencies"} · {missingVisitCount} {lang === "nl" ? "zonder volgend bezoek" : "without next visit"}</p>
          </div>
        </div>
        <div className="filterBar">
          <input placeholder={lang === "nl" ? "Zoek op WZC, gemeente, eigenaar, contact of opmerking" : "Search by care home, city, owner, contact or remark"} value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="filterControls">
            {groupOptions.length > 0 && (
              <SearchableGroupSelect className="groupFilterInput" value={groupFilter} groups={groupOptions} onChange={setGroupFilter} placeholder={L("Alle groepen")} ariaLabel={lang === "nl" ? "Filter op groep" : "Filter by group"} />
            )}
            <div className="segmented">
              {filterOptions.map((option) => (
                <button key={option} className={workFilter === option ? "selected" : ""} onClick={() => setWorkFilter(option)}>{option}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="pipeline">
          {filtered.map((wzc) => (
            <article key={wzc.id} className={`pipelineRow ${selected?.id === wzc.id ? "selected" : ""}`}>
              <button className="pipelineMainButton" onClick={() => setSelected(wzc)}>
                <strong>{wzc.name}</strong>
                <span>{formatAddress([wzc.address, wzc.postal_code, wzc.city]) || (lang === "nl" ? "Geen adres" : "No address")}</span>
                <small>{wzc.contact_name || (lang === "nl" ? "Geen contactpersoon" : "No contact")} · {wzc.owner || (lang === "nl" ? "Geen eigenaar" : "No owner")} · {wzc.group_name || (lang === "nl" ? "Geen groep" : "No group")}</small>
              </button>
              <div className="pipelineMeta">
                <span className="softBadge">{wzc.next_visit ? `${L("Volgende bezoek")} ${formatDate(wzc.next_visit)}` : (lang === "nl" ? "Geen volgend bezoek" : "No next visit")}</span>
                {openUrgenciesFor(wzc) > 0 && <span className="attentionBadge">{openUrgenciesFor(wzc)} {lang === "nl" ? "urgentie(s)" : "urgency(ies)"}</span>}
                <button className="compactActionButton" onClick={() => openWzcFiche(wzc)}>{lang === "nl" ? "Fiche" : "Details"}</button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <div className="empty">{lang === "nl" ? "Geen actieve WZC's voor deze filter." : "No active care homes for this filter."}</div>}
        </div>
      </section>
      {selected && (
        <section className="panel" id="actieve-wzc-fiche">
          <div className="sectionTitle">
            <div>
              <h2>{lang === "nl" ? "WZC fiche" : "Care home details"}</h2>
              <p className="sectionHint">{selected.external_id} · {selected.collaboration_status}</p>
            </div>
            <div className="inlineActions noMargin">
              <button onClick={() => onUrgency(selected)}>{L("Urgentie toevoegen")}</button>
              <button onClick={() => onPlan(selected)}>{L("Planning maken")}</button>
              <button className="primaryButton" onClick={saveSelected}>{lang === "nl" ? "Bewaren" : "Save"}</button>
            </div>
          </div>
          <div className="formGrid compact">
            <label>{lang === "nl" ? "WZC naam" : "Care home name"}<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
            <SearchableGroupSelect label={L("Groep")} value={editForm.group_name} groups={groupOptions} onChange={(group_name) => setEditForm({ ...editForm, group_name })} placeholder={L("Typ of kies groep")} />
            <label>{L("Adres")}<input value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} /></label>
            <label>{lang === "nl" ? "Postcode" : "Postal code"}<input value={editForm.postal_code} onChange={(event) => setEditForm({ ...editForm, postal_code: event.target.value })} /></label>
            <label>{lang === "nl" ? "Gemeente" : "City"}<input value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></label>
            <label>{lang === "nl" ? "Hoofdcontact" : "Main contact"}<input value={editForm.contact_name} onChange={(event) => setEditForm({ ...editForm, contact_name: event.target.value })} /></label>
            <label>{lang === "nl" ? "Functie hoofdcontact" : "Contact role"}<input value={editForm.contact_role} onChange={(event) => setEditForm({ ...editForm, contact_role: event.target.value })} /></label>
            <label>{L("Telefoon")}<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label>
            <label>{L("E-mail")}<input value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
            <label>{lang === "nl" ? "Eigenaar" : "Owner"}<input value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })} /></label>
            <label>{lang === "nl" ? "Laatste bezoek" : "Last visit"}<input type="date" value={editForm.last_visit} onChange={(event) => setEditForm({ ...editForm, last_visit: event.target.value })} /></label>
            <label>{lang === "nl" ? "Volgend bezoek" : "Next visit"}<input type="date" value={editForm.next_visit} onChange={(event) => setEditForm({ ...editForm, next_visit: event.target.value })} /></label>
            <label>{lang === "nl" ? "Aantal bewoners" : "Number of residents"}<input type="number" min="0" value={editForm.resident_count} onChange={(event) => setEditForm({ ...editForm, resident_count: event.target.value })} /></label>
            <label className="wide">{L("Opmerking")}<textarea value={editForm.remark} onChange={(event) => setEditForm({ ...editForm, remark: event.target.value })} /></label>
          </div>
          <ExtraContactsEditor contacts={extraContacts} onChange={setExtraContacts} />
        </section>
      )}
    </div>
  );
}

function WzcFollowupView({
  prospects,
  wzcs,
  urgencies,
  focusWzc,
  focusProspect,
  onFocusHandled,
  onSaved,
  onPlan,
  onUrgency
}: {
  prospects: Prospect[];
  wzcs: Wzc[];
  urgencies: Urgency[];
  focusWzc?: Wzc | null;
  focusProspect?: Prospect | null;
  onFocusHandled?: () => void;
  onSaved: () => Promise<void>;
  onPlan: (wzc: Wzc) => void;
  onUrgency: (wzc: Wzc) => void;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [mode, setMode] = useState<FollowupMode>("Prospectie");
  const [convertedFocusWzc, setConvertedFocusWzc] = useState<Wzc | null>(null);
  const activeWzcs = actualWzcs(wzcs).filter((wzc) => wzc.collaboration_status === "Actief");
  const openUrgencyCount = urgencies.filter((urgency) => urgency.status !== "Afgerond").length;
  const followupModes: FollowupMode[] = ["Prospectie", "Actieve WZC's"];
  const activeFocusWzc = focusWzc || convertedFocusWzc;

  useEffect(() => {
    if (focusWzc) {
      setMode("Actieve WZC's");
    }
  }, [focusWzc?.id]);

  useEffect(() => {
    if (focusProspect) {
      setMode("Prospectie");
    }
  }, [focusProspect?.id]);

  return (
    <div className="stack">
      <section className="followupSwitch" aria-label="WZC opvolging onderdelen">
        {followupModes.map((item) => (
          <button key={item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>
            <strong>{item}</strong>
            <span>{item === "Prospectie" ? `${prospects.length} prospecties in pipeline` : `${activeWzcs.length} actief · ${openUrgencyCount} open urgenties`}</span>
          </button>
        ))}
      </section>
      {mode === "Prospectie" ? (
        <ProspectView
          wzcs={wzcs}
          prospects={prospects}
          focusProspect={focusProspect}
          onFocusHandled={onFocusHandled}
          onConverted={(wzc) => {
            setConvertedFocusWzc(wzc);
            setMode("Actieve WZC's");
          }}
          onSaved={onSaved}
        />
      ) : (
        <ActiveWzcFollowupView
          wzcs={activeWzcs}
          urgencies={urgencies}
          focusWzc={activeFocusWzc}
          onFocusHandled={() => {
            setConvertedFocusWzc(null);
            onFocusHandled?.();
          }}
          onSaved={onSaved}
          onPlan={onPlan}
          onUrgency={onUrgency}
        />
      )}
    </div>
  );
}

function WzcDatabaseView({
  wzcs,
  prospects,
  teams,
  users,
  auditLogs,
  onSaved
}: {
  wzcs: Wzc[];
  prospects: Prospect[];
  teams: TeamProfile[];
  users: User[];
  auditLogs: AuditLog[];
  onSaved: () => Promise<void>;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [unlocked, setUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [activeTab, setActiveTab] = useState<DatabaseTab>("WZC database");
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    group_name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_name: "",
    contact_role: "",
    email: "",
    phone: "",
    website: "",
    collaboration_status: "Actief"
  });
  const [newWzcExtraContacts, setNewWzcExtraContacts] = useState<ExtraContact[]>([]);
  const [teamForm, setTeamForm] = useState({
    name: "",
    role: "Tandarts",
    skillsets: "",
    max_treatments_per_day: "",
    remark: "",
    is_active: true
  });
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamEditForm, setTeamEditForm] = useState({
    name: "",
    role: "Tandarts",
    skillsets: "",
    max_treatments_per_day: "",
    remark: "",
    is_active: true
  });
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    role: "user",
    is_active: true
  });
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [portalAccounts, setPortalAccounts] = useState<PortalAccount[]>([]);
  const [portalAccountsLoaded, setPortalAccountsLoaded] = useState(false);
  const [portalForm, setPortalForm] = useState({ email: "", password: "", wzc_id: "", role: "staff" });
  const [portalError, setPortalError] = useState("");
  const [logFilters, setLogFilters] = useState({
    actor: "",
    module: "",
    date: ""
  });
  const realWzcs = useMemo(() => actualWzcs(wzcs), [wzcs]);
  const groupRows = useMemo(() => wzcs.filter(isGroupRecord), [wzcs]);
  const groupOptions = useMemo(() => groupOptionsForWzcs(wzcs), [wzcs]);
  const formGroupOptions = useMemo(() => groupOptionsForWzcsAndProspects(wzcs, prospects), [wzcs, prospects]);
  const groupedWzcs = useMemo(() => applyGroupFilter(wzcs, groupFilter), [wzcs, groupFilter]);
  const filtered = groupedWzcs.filter((wzc) => {
    const haystack = normalizeSearch([wzc.name, wzc.group_name, wzc.address, wzc.postal_code, wzc.city, wzc.contact_name].join(" "));
    return haystack.includes(normalizeSearch(query));
  });
  const filteredLogs = auditLogs.filter((log) => {
    const created = new Date(log.created_at);
    const dateMatch = !logFilters.date || created.toISOString().slice(0, 10) === logFilters.date;
    const actorMatch = !logFilters.actor || log.actor_email.toLowerCase().includes(logFilters.actor.toLowerCase());
    const moduleMatch = !logFilters.module || log.module === logFilters.module;
    return dateMatch && actorMatch && moduleMatch;
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.createWzc({
      ...form,
      extra_contacts: serializeExtraContacts(newWzcExtraContacts)
    });
    setForm({
      name: "",
      group_name: "",
      address: "",
      postal_code: "",
      city: "",
      contact_name: "",
      contact_role: "",
      email: "",
      phone: "",
      website: "",
      collaboration_status: "Actief"
    });
    setNewWzcExtraContacts([]);
    setShowForm(false);
    await onSaved();
  }

  async function removeWzc(wzc: Wzc) {
    const confirmedName = window.prompt(`Bent u zeker? U staat op het punt om ${wzc.name} te verwijderen.\nTyp exact de WZC naam om te bevestigen.`);
    if (!confirmedName) return;
    await api.deleteWzc(wzc.id, confirmedName);
    await onSaved();
  }

  async function submitTeam(event: FormEvent) {
    event.preventDefault();
    await api.createTeamProfile({
      ...teamForm,
      max_treatments_per_day: teamForm.max_treatments_per_day ? Number(teamForm.max_treatments_per_day) : null
    });
    setTeamForm({ name: "", role: "Tandarts", skillsets: "", max_treatments_per_day: "", remark: "", is_active: true });
    await onSaved();
  }

  function startEditTeam(profile: TeamProfile) {
    setEditingTeamId(profile.id);
    setTeamEditForm({
      name: profile.name || "",
      role: profile.role || "Tandarts",
      skillsets: profile.skillsets || "",
      max_treatments_per_day: profile.max_treatments_per_day === null ? "" : String(profile.max_treatments_per_day),
      remark: profile.remark || "",
      is_active: profile.is_active
    });
  }

  function addSkillsetToEdit(skillset: string) {
    if (!skillset) return;
    const next = Array.from(new Set([...teamEditForm.skillsets.split(",").map((item) => item.trim()).filter(Boolean), skillset])).join(", ");
    setTeamEditForm({ ...teamEditForm, skillsets: next });
  }

  async function saveTeamEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingTeamId) return;
    await api.updateTeamProfile(editingTeamId, {
      ...teamEditForm,
      max_treatments_per_day: teamEditForm.max_treatments_per_day ? Number(teamEditForm.max_treatments_per_day) : null
    });
    setEditingTeamId(null);
    await onSaved();
  }

  async function toggleTeam(profile: TeamProfile) {
    await api.updateTeamProfile(profile.id, { is_active: !profile.is_active });
    await onSaved();
  }

  async function removeTeam(profile: TeamProfile) {
    if (!window.confirm(`Bent u zeker? U staat op het punt om ${profile.name} te verwijderen.`)) return;
    await api.deleteTeamProfile(profile.id);
    await onSaved();
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    await api.createUser(userForm);
    setUserForm({ email: "", password: "", role: "user", is_active: true });
    await onSaved();
  }

  async function updateUserRole(selectedUser: User, role: string) {
    await api.updateUser(selectedUser.id, { role });
    await onSaved();
  }

  async function updateUserStatus(selectedUser: User, isActive: boolean) {
    await api.updateUser(selectedUser.id, { is_active: isActive });
    await onSaved();
  }

  async function removeUser(selectedUser: User) {
    if (!window.confirm(`Bent u zeker? U staat op het punt om gebruiker ${selectedUser.email} te verwijderen.`)) return;
    await api.deleteUser(selectedUser.id);
    await onSaved();
  }

  function closePasswordForm(userId: number) {
    setPasswordUserId((current) => current === userId ? null : current);
    window.setTimeout(() => document.getElementById(`user-password-button-${userId}`)?.focus(), 0);
  }

  if (!unlocked) {
    return (
      <section className="accessPanel">
        <img src="/logo-icon.svg" alt="" />
        <h2>{L("WZC database")}</h2>
        <p>{lang === "nl" ? "Extra beveiligde adminzone voor WZC-masterdata, teams, gebruikers en user log." : "Extra secured admin zone for care home master data, teams, users and user log."}</p>
        <form onSubmit={(event) => { event.preventDefault(); setUnlocked(accessCode === "0000"); }}>
          <label>{lang === "nl" ? "Toegangscode" : "Access code"}<input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} type="password" autoComplete="off" /></label>
          <button className="primaryButton">{lang === "nl" ? "Openen" : "Open"}</button>
        </form>
        {accessCode && accessCode !== "0000" && <div className="error">{lang === "nl" ? "Toegangscode klopt niet." : "Access code is incorrect."}</div>}
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="tabBar" aria-label="WZC database tabs">
        {databaseTabs.map((tab) => (
          <button key={tab} className={activeTab === tab ? "selected" : ""} onClick={() => {
            setActiveTab(tab);
            setPasswordUserId(null);
            setPasswordNotice("");
            if (tab === "Portaal accounts" && !portalAccountsLoaded) {
              api.portalAccounts().then((accounts) => { setPortalAccounts(accounts); setPortalAccountsLoaded(true); }).catch(() => {});
            }
          }}>{L(tab)}</button>
        ))}
      </section>
      {activeTab === "WZC database" && (
        <>
      <section className="panel">
        <div className="sectionTitle">
          <div>
            <h2>{lang === "nl" ? "Master database WZC's" : "Master database care homes"}</h2>
            <p className="sectionHint">{lang === "nl" ? "Deze gegevens voeden kaart, urgenties, prospectie-opvolging en planning. Groep/organisatie is een filter, geen aparte WZC." : "This data feeds the map, urgencies, prospect follow-up and planning. Group/organization is a filter, not a separate care home."}</p>
          </div>
          <span className="softBadge">{realWzcs.length} {L("WZC's")} · {groupOptions.length} {lang === "nl" ? "groepen" : "groups"}</span>
          <button className="primaryButton" onClick={() => setShowForm((value) => !value)}>{lang === "nl" ? "Nieuwe WZC toevoegen" : "Add new care home"}</button>
        </div>
        {groupRows.length > 0 && (
          <div className="privacyStrip">
            {groupRows.length} oude groepsrij verborgen als WZC: {groupRows.map((wzc) => wzc.name).join(", ")}. Gebruik het veld Groep/organisatie om WZC's samen te filteren.
          </div>
        )}
        {showForm && (
          <form className="formGrid compact" onSubmit={submit}>
            <label>{lang === "nl" ? "WZC naam" : "Care home name"}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <GroupNameField label={L("Groep/organisatie")} groups={formGroupOptions} value={form.group_name} onChange={(group_name) => setForm({ ...form, group_name })} />
            <label>{L("Adres")}<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label>{lang === "nl" ? "Postcode" : "Postal code"}<input value={form.postal_code} onChange={(event) => setForm({ ...form, postal_code: event.target.value })} /></label>
            <label>{lang === "nl" ? "Gemeente" : "City"}<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label>{lang === "nl" ? "Hoofdcontact" : "Main contact"}<input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} /></label>
            <label>{lang === "nl" ? "Functie hoofdcontact" : "Contact role"}<input value={form.contact_role} onChange={(event) => setForm({ ...form, contact_role: event.target.value })} /></label>
            <label>{L("E-mail")}<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>{L("Telefoon")}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label>{L("Website")}<input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
            <label>{L("Status")}<select value={form.collaboration_status} onChange={(event) => setForm({ ...form, collaboration_status: event.target.value })}>
              <option value="Actief">{L("Actief")}</option>
              <option value="Inactief">{lang === "nl" ? "Inactief" : "Inactive"}</option>
              <option value="On hold">{L("On hold")}</option>
            </select></label>
            <div className="wide">
              <ExtraContactsEditor contacts={newWzcExtraContacts} onChange={setNewWzcExtraContacts} />
            </div>
            <button className="primaryButton">{L("Opslaan")}</button>
          </form>
        )}
      </section>
      <section className="panel">
        <div className="sectionTitle">
          <div>
            <h2>{lang === "nl" ? "WZC lijst" : "Care home list"}</h2>
            <p className="sectionHint">{filtered.length}/{realWzcs.length} {lang === "nl" ? "WZC's zichtbaar" : "care homes visible"}</p>
          </div>
          <div className="listHeaderFilters">
            <input className="inlineSearch" placeholder={lang === "nl" ? "Zoek in database" : "Search database"} value={query} onChange={(event) => setQuery(event.target.value)} />
            {groupOptions.length > 0 && (
              <SearchableGroupSelect className="groupFilterInput" value={groupFilter} groups={groupOptions} onChange={setGroupFilter} placeholder={L("Alle groepen")} ariaLabel={lang === "nl" ? "Filter op groep" : "Filter by group"} />
            )}
          </div>
        </div>
        <div className="databaseList">
          {filtered.map((wzc) => (
            <article className="databaseRow" key={wzc.id}>
              <div>
                <strong>{wzc.name}</strong>
                <span>{formatAddress([wzc.address, wzc.postal_code, wzc.city]) || (lang === "nl" ? "Geen adres" : "No address")}</span>
                <small>{wzc.contact_name || (lang === "nl" ? "Geen contactpersoon" : "No contact")} · {formatPhone(wzc.phone) || (lang === "nl" ? "geen telefoon" : "no phone")} · {wzc.email || (lang === "nl" ? "geen e-mail" : "no email")}</small>
              </div>
              <div className="rowMeta">
                {wzc.group_name && <span className="softBadge">{wzc.group_name}</span>}
                <span className="softBadge">{wzc.collaboration_status}</span>
                <button onClick={() => removeWzc(wzc)}>{L("Verwijderen")}</button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <div className="empty">{L("Geen WZC gevonden.")}</div>}
        </div>
      </section>
        </>
      )}
      {activeTab === "Teams" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>{L("Teams")}</h2>
              <p className="sectionHint">{lang === "nl" ? "Profielen en skillsets voor latere planning en route-optimalisatie." : "Profiles and skill sets for planning and route optimization."}</p>
            </div>
            <span className="softBadge">{teams.filter((team) => team.is_active).length} {lang === "nl" ? "actief" : "active"}</span>
          </div>
          <form className="formGrid compact" onSubmit={submitTeam}>
            <label>{lang === "nl" ? "Naam" : "Name"}<input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} required /></label>
            <label>{lang === "nl" ? "Functie" : "Role"}<select value={teamForm.role} onChange={(event) => setTeamForm({ ...teamForm, role: event.target.value })}>
              {teamRoles.map((role) => <option key={role} value={role}>{L(role)}</option>)}
            </select></label>
            <label>{lang === "nl" ? "Max behandelingen/dag" : "Max treatments/day"}<input type="number" min="0" value={teamForm.max_treatments_per_day} onChange={(event) => setTeamForm({ ...teamForm, max_treatments_per_day: event.target.value })} /></label>
            <label>{L("Status")}<select value={teamForm.is_active ? "Actief" : "Inactief"} onChange={(event) => setTeamForm({ ...teamForm, is_active: event.target.value === "Actief" })}>
              <option value="Actief">{L("Actief")}</option>
              <option value="Inactief">{lang === "nl" ? "Inactief" : "Inactive"}</option>
            </select></label>
            <label className="wide">Skillsets<select value="" onChange={(event) => {
              const next = Array.from(new Set([...teamForm.skillsets.split(",").map((item) => item.trim()).filter(Boolean), event.target.value])).join(", ");
              setTeamForm({ ...teamForm, skillsets: next });
            }}>
              <option value="">{lang === "nl" ? "Skillset toevoegen" : "Add skill set"}</option>
              {teamSkillsets.map((skillset) => <option key={skillset} value={skillset}>{L(skillset)}</option>)}
            </select></label>
            <label className="wide">{lang === "nl" ? "Geselecteerde skillsets" : "Selected skill sets"}<input value={teamForm.skillsets} onChange={(event) => setTeamForm({ ...teamForm, skillsets: event.target.value })} /></label>
            <label className="wide">{L("Opmerking")}<textarea value={teamForm.remark} onChange={(event) => setTeamForm({ ...teamForm, remark: event.target.value })} /></label>
            <button className="primaryButton">{lang === "nl" ? "Teamprofiel toevoegen" : "Add team profile"}</button>
          </form>
          <div className="databaseList">
            {teams.map((profile) => (
              <article className={`databaseRow ${editingTeamId === profile.id ? "editableDatabaseRow" : ""}`} key={profile.id}>
                {editingTeamId === profile.id ? (
                  <form className="formGrid compact teamEditForm" onSubmit={saveTeamEdit}>
                    <label>{lang === "nl" ? "Naam" : "Name"}<input value={teamEditForm.name} onChange={(event) => setTeamEditForm({ ...teamEditForm, name: event.target.value })} required /></label>
                    <label>{lang === "nl" ? "Functie" : "Role"}<select value={teamEditForm.role} onChange={(event) => setTeamEditForm({ ...teamEditForm, role: event.target.value })}>
                      {teamEditForm.role && !teamRoles.includes(teamEditForm.role) && <option>{teamEditForm.role}</option>}
                      {teamRoles.map((role) => <option key={role} value={role}>{L(role)}</option>)}
                    </select></label>
                    <label>{lang === "nl" ? "Max behandelingen/dag" : "Max treatments/day"}<input type="number" min="0" value={teamEditForm.max_treatments_per_day} onChange={(event) => setTeamEditForm({ ...teamEditForm, max_treatments_per_day: event.target.value })} /></label>
                    <label>{L("Status")}<select value={teamEditForm.is_active ? "Actief" : "Inactief"} onChange={(event) => setTeamEditForm({ ...teamEditForm, is_active: event.target.value === "Actief" })}>
                      <option value="Actief">{L("Actief")}</option>
                      <option value="Inactief">{lang === "nl" ? "Inactief" : "Inactive"}</option>
                    </select></label>
                    <label className="wide">Skillsets<select value="" onChange={(event) => addSkillsetToEdit(event.target.value)}>
                      <option value="">{lang === "nl" ? "Skillset toevoegen" : "Add skill set"}</option>
                      {teamSkillsets.map((skillset) => <option key={skillset} value={skillset}>{L(skillset)}</option>)}
                    </select></label>
                    <label className="wide">{lang === "nl" ? "Geselecteerde skillsets" : "Selected skill sets"}<input value={teamEditForm.skillsets} onChange={(event) => setTeamEditForm({ ...teamEditForm, skillsets: event.target.value })} /></label>
                    <label className="wide">{L("Opmerking")}<textarea value={teamEditForm.remark} onChange={(event) => setTeamEditForm({ ...teamEditForm, remark: event.target.value })} /></label>
                    <div className="inlineActions wide noMargin">
                      <button className="primaryButton">{lang === "nl" ? "Bewaren" : "Save"}</button>
                      <button type="button" onClick={() => setEditingTeamId(null)}>{L("Annuleren")}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{profile.name}</strong>
                      <span>{L(profile.role) || (lang === "nl" ? "Geen functie" : "No role")} · {profile.skillsets || (lang === "nl" ? "Geen skillsets" : "No skill sets")}</span>
                      <small>{profile.max_treatments_per_day ? `${profile.max_treatments_per_day} ${lang === "nl" ? "behandelingen/dag" : "treatments/day"}` : (lang === "nl" ? "Geen daglimiet" : "No daily limit")} · {lang === "nl" ? "bijgewerkt" : "updated"} {formatDateTime(profile.updated_at)}</small>
                    </div>
                    <div className="rowMeta">
                      <span className="softBadge">{profile.is_active ? L("Actief") : (lang === "nl" ? "Inactief" : "Inactive")}</span>
                      <button onClick={() => startEditTeam(profile)}>{lang === "nl" ? "Aanpassen" : "Edit"}</button>
                      <button onClick={() => toggleTeam(profile)}>{profile.is_active ? (lang === "nl" ? "Deactiveren" : "Deactivate") : (lang === "nl" ? "Activeren" : "Activate")}</button>
                      <button onClick={() => removeTeam(profile)}>{L("Verwijderen")}</button>
                    </div>
                  </>
                )}
              </article>
            ))}
            {teams.length === 0 && <div className="empty">{lang === "nl" ? "Nog geen teamprofielen." : "No team profiles yet."}</div>}
          </div>
        </section>
      )}
      {activeTab === "Gebruikers" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>{L("Gebruikers")}</h2>
              <p className="sectionHint">{lang === "nl" ? "Admin ziet WZC database, teams, gebruikers en user log. Gebruiker niet." : "Admin sees care home database, teams, users and user log. User does not."}</p>
            </div>
          </div>
          <form className="formGrid compact" onSubmit={submitUser}>
            <label>{L("E-mail")}<input value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} type="email" required /></label>
            <label>{L("Wachtwoord")}<input value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} type="password" required /></label>
            <label>{L("Rol")}<select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
              <option value="user">{lang === "nl" ? "Gebruiker" : "User"}</option>
              <option value="admin">Admin</option>
            </select></label>
            <label>{L("Status")}<select value={userForm.is_active ? "Actief" : "Inactief"} onChange={(event) => setUserForm({ ...userForm, is_active: event.target.value === "Actief" })}>
              <option value="Actief">{L("Actief")}</option>
              <option value="Inactief">{lang === "nl" ? "Inactief" : "Inactive"}</option>
            </select></label>
            <button className="primaryButton">{L("Gebruiker toevoegen")}</button>
          </form>
          {passwordNotice && <p className="successNotice" role="status">{passwordNotice}</p>}
          <div className="databaseList">
            {users.map((selectedUser) => (
              <article className="databaseRow userDatabaseRow" key={selectedUser.id}>
                <div>
                  <strong>{selectedUser.email}</strong>
                  <span>{selectedUser.role === "admin" ? "Admin" : (lang === "nl" ? "Gebruiker" : "User")} · {selectedUser.is_active ? L("Actief") : (lang === "nl" ? "Inactief" : "Inactive")}</span>
                  <small>{selectedUser.role === "admin" ? (lang === "nl" ? "Volledige adminrechten" : "Full admin rights") : (lang === "nl" ? "Dashboard zonder WZC database" : "Dashboard without care home database")}</small>
                </div>
                <div className="rowMeta">
                  <select value={selectedUser.role} onChange={(event) => updateUserRole(selectedUser, event.target.value)}>
                    <option value="user">{lang === "nl" ? "Gebruiker" : "User"}</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => updateUserStatus(selectedUser, !selectedUser.is_active)}>{selectedUser.is_active ? (lang === "nl" ? "Deactiveren" : "Deactivate") : (lang === "nl" ? "Activeren" : "Activate")}</button>
                  <button
                    type="button"
                    id={`user-password-button-${selectedUser.id}`}
                    aria-expanded={passwordUserId === selectedUser.id}
                    aria-controls={`user-password-form-${selectedUser.id}`}
                    onClick={() => {
                      setPasswordNotice("");
                      setPasswordUserId((current) => current === selectedUser.id ? null : selectedUser.id);
                    }}
                  >{lang === "nl" ? "Wachtwoord wijzigen" : "Change password"}</button>
                  <button onClick={() => removeUser(selectedUser)}>{L("Verwijderen")}</button>
                </div>
                {passwordUserId === selectedUser.id && (
                  <UserPasswordForm
                    user={selectedUser}
                    lang={lang}
                    onCancel={() => closePasswordForm(selectedUser.id)}
                    onChanged={() => {
                      closePasswordForm(selectedUser.id);
                      setPasswordNotice(lang === "nl" ? `Wachtwoord gewijzigd voor ${selectedUser.email}.` : `Password changed for ${selectedUser.email}.`);
                      void onSaved();
                    }}
                  />
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {activeTab === "Gebruikerslog" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>{L("Gebruikerslog")}</h2>
              <p className="sectionHint">{lang === "nl" ? "Acties worden 14 dagen bijgehouden. Patiëntgegevens worden niet in logs opgeslagen." : "Actions are kept for 14 days. Patient data is not stored in logs."}</p>
            </div>
            <button onClick={async () => { if (window.confirm(lang === "nl" ? "User log volledig leegmaken?" : "Clear the entire user log?")) { await api.clearAuditLogs(); await onSaved(); } }}>{lang === "nl" ? "Log clearen" : "Clear log"}</button>
          </div>
          <div className="filterBar">
            <input placeholder={lang === "nl" ? "Filter persoon" : "Filter person"} value={logFilters.actor} onChange={(event) => setLogFilters({ ...logFilters, actor: event.target.value })} />
            <div className="inlineForm">
              <select value={logFilters.module} onChange={(event) => setLogFilters({ ...logFilters, module: event.target.value })}>
                <option value="">{lang === "nl" ? "Alle modules" : "All modules"}</option>
                {Array.from(new Set(auditLogs.map((log) => log.module).filter(Boolean))).map((module) => <option key={module}>{module}</option>)}
              </select>
              <input type="date" value={logFilters.date} onChange={(event) => setLogFilters({ ...logFilters, date: event.target.value })} />
            </div>
          </div>
          <div className="databaseList">
            {filteredLogs.map((log) => (
              <article className="databaseRow" key={log.id}>
                <div>
                  <strong>{log.action}</strong>
                  <span>{log.actor_email} · {log.module}</span>
                  <small>{formatDateTime(log.created_at)}</small>
                </div>
                <div className="rowMeta">
                  <span className="softBadge">{formatDate(log.created_at.slice(0, 10))}</span>
                </div>
              </article>
            ))}
            {filteredLogs.length === 0 && <div className="empty">{lang === "nl" ? "Geen logregels voor deze filter." : "No log entries for this filter."}</div>}
          </div>
        </section>
      )}
      {activeTab === "Portaal accounts" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>{lang === "nl" ? "Portaal accounts" : "Portal accounts"}</h2>
              <p className="sectionHint">{lang === "nl" ? "Geef een zorgcentrum toegang tot het portaal door een account aan te maken. Het centrum logt in op het portaal met dit e-mailadres en wachtwoord." : "Give a care centre access to the portal by creating an account. The centre logs in with this email and password."}</p>
            </div>
          </div>
          <form className="formGrid compact" onSubmit={async (event) => {
            event.preventDefault();
            setPortalError("");
            try {
              const created = await api.createPortalAccount({ email: portalForm.email, password: portalForm.password, wzc_id: Number(portalForm.wzc_id), role: portalForm.role });
              setPortalAccounts((prev) => [...prev, created]);
              setPortalForm({ email: "", password: "", wzc_id: "", role: "staff" });
            } catch (error) {
              setPortalError(error instanceof Error ? error.message : "Aanmaken mislukt.");
            }
          }}>
            <label>{lang === "nl" ? "Zorgcentrum" : "Care centre"}
              <select value={portalForm.wzc_id} onChange={(event) => setPortalForm({ ...portalForm, wzc_id: event.target.value })} required>
                <option value="">{lang === "nl" ? "Kies een WZC" : "Choose a care home"}</option>
                {realWzcs.filter((w) => w.collaboration_status === "Actief").map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label>{lang === "nl" ? "E-mailadres portaal" : "Portal email"}
              <input type="email" value={portalForm.email} onChange={(event) => setPortalForm({ ...portalForm, email: event.target.value })} required />
            </label>
            <label>{lang === "nl" ? "Wachtwoord (min. 8 tekens)" : "Password (min. 8 chars)"}
              <input type="password" value={portalForm.password} onChange={(event) => setPortalForm({ ...portalForm, password: event.target.value })} minLength={8} required />
            </label>
            <label>{lang === "nl" ? "Rol" : "Role"}
              <select value={portalForm.role} onChange={(event) => setPortalForm({ ...portalForm, role: event.target.value })}>
                <option value="staff">{lang === "nl" ? "Medewerker" : "Staff"}</option>
                <option value="admin">{lang === "nl" ? "Beheerder" : "Admin"}</option>
              </select>
            </label>
            {portalError && <p className="errorNotice" role="alert">{portalError}</p>}
            <button className="primaryButton">{lang === "nl" ? "Account aanmaken" : "Create account"}</button>
          </form>
          <div className="databaseList">
            {portalAccounts.map((account) => (
              <article className="databaseRow userDatabaseRow" key={account.id}>
                <div>
                  <strong>{account.wzc_name}</strong>
                  <span>{account.email}</span>
                  <small>{account.role === "admin" ? (lang === "nl" ? "Beheerder" : "Admin") : (lang === "nl" ? "Medewerker" : "Staff")} · {account.is_active ? (lang === "nl" ? "Actief" : "Active") : (lang === "nl" ? "Inactief" : "Inactive")}</small>
                </div>
                <div className="rowMeta">
                  <span className="softBadge">{account.is_active ? (lang === "nl" ? "Actief" : "Active") : (lang === "nl" ? "Inactief" : "Inactive")}</span>
                </div>
              </article>
            ))}
            {portalAccountsLoaded && portalAccounts.length === 0 && <div className="empty">{lang === "nl" ? "Nog geen portaal accounts." : "No portal accounts yet."}</div>}
          </div>
        </section>
      )}
    </div>
  );
}

function DossierView() {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<DossierPreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  async function preview() {
    setLoading(true);
    try {
      setRows(await api.previewDossiers(files));
    } finally {
      setLoading(false);
    }
  }

  function updateRow(index: number, patch: Partial<DossierPreviewRow>) {
    setRows((currentRows) => currentRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function finishProcessing() {
    setFiles([]);
    setRows([]);
    setFileInputKey((value) => value + 1);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="sectionTitle">
          <div>
            <h2>{L("Mondzorgdossiers")}</h2>
            <p className="sectionHint">{lang === "nl" ? "Tijdelijke extractie voor invoer in DentAdmin. Er wordt geen dossierdatabank opgebouwd." : "Temporary extraction for entry into DentAdmin. No records database is built."}</p>
          </div>
          <span className="softBadge">{lang === "nl" ? "Tijdelijke verwerking" : "Temporary processing"}</span>
        </div>
        <div className="privacyStrip">
          {lang === "nl" ? "INSZ wordt enkel gebruikt voor patiëntidentificatie en geboortedatum. Controleer alle velden manueel voor invoer in DentAdmin." : "INSZ is only used for patient identification and date of birth. Check all fields manually before entry into DentAdmin."}
        </div>
        <div className="formGrid">
          <label className="wide">{lang === "nl" ? "Mondzorgdossier PDF's" : "Dental record PDFs"}<input key={fileInputKey} type="file" accept="application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label>
        </div>
        {files.length > 0 && (
          <div className="fileSelection">
            <strong>{lang === "nl" ? "Geselecteerde dossiers" : "Selected records"}</strong>
            <span>{files.length} {lang === "nl" ? "bestand(en)" : "file(s)"}</span>
            {files.map((file, index) => <div className="checkRow" key={`${file.name}-${index}`}><span>{index + 1}. {file.name}</span></div>)}
          </div>
        )}
        <div className="inlineActions">
          <button className="primaryButton" disabled={files.length === 0 || loading} onClick={preview}>{loading ? (lang === "nl" ? "Uitlezen..." : "Reading...") : (lang === "nl" ? "Dossiers uitlezen" : "Read records")}</button>
          <button disabled={rows.length === 0 && files.length === 0} onClick={finishProcessing}>{lang === "nl" ? "Verwerking afronden en gegevens wissen" : "Finish processing and clear data"}</button>
        </div>
      </section>
      {rows.length > 0 && (
        <>
          <div className="kpiGrid compactKpis">
            <div className="kpi"><span>{lang === "nl" ? "Dossiers" : "Records"}</span><strong>{rows.length}</strong></div>
            <div className="kpi"><span>{lang === "nl" ? "Velden" : "Fields"}</span><strong>8</strong></div>
            <div className="kpi"><span>{lang === "nl" ? "Controle" : "Review"}</span><strong>{rows.filter((row) => row.remarks).length}</strong></div>
            <div className="kpi"><span>{lang === "nl" ? "Opslag" : "Storage"}</span><strong>0</strong></div>
          </div>
          <section className="panel">
            <div className="sectionTitle">
              <div>
                <h2>{lang === "nl" ? "Preview gegevens" : "Data preview"}</h2>
                <p className="sectionHint">{lang === "nl" ? "Bewerk onzekere velden rechtstreeks in deze tijdelijke preview." : "Edit uncertain fields directly in this temporary preview."}</p>
              </div>
              <span className="softBadge">{rows.length} dossier(s)</span>
            </div>
            <div className="dossierGrid">
              {rows.map((row, index) => (
                <article className="dossierCard" key={`${row.file_name}-${index}`}>
                  <div className="sectionTitle">
                    <strong>{row.file_name}</strong>
                    {row.remarks && <span className="attentionBadge">{lang === "nl" ? "Controle" : "Review"}</span>}
                  </div>
                  <div className="formGrid compact">
                    <label>INSZ<input value={row.insz} onChange={(event) => updateRow(index, { insz: event.target.value })} /></label>
                    <label>{lang === "nl" ? "Naam" : "Last name"}<input value={row.last_name} onChange={(event) => updateRow(index, { last_name: event.target.value })} /></label>
                    <label>{lang === "nl" ? "Voornaam" : "First name"}<input value={row.first_name} onChange={(event) => updateRow(index, { first_name: event.target.value })} /></label>
                    <label>{lang === "nl" ? "Geboortedatum" : "Date of birth"}<input value={row.birthdate} onChange={(event) => updateRow(index, { birthdate: event.target.value })} /></label>
                    <label>{lang === "nl" ? "Geslacht" : "Gender"}<input value={row.gender} onChange={(event) => updateRow(index, { gender: event.target.value })} /></label>
                    <label>{L("E-mail")}<input value={row.email} onChange={(event) => updateRow(index, { email: event.target.value })} /></label>
                    <label>{L("Telefoon")}<input value={row.phone} onChange={(event) => updateRow(index, { phone: event.target.value })} /></label>
                    <label className="wide">{lang === "nl" ? "Medicatie" : "Medication"}<textarea value={row.medication} onChange={(event) => updateRow(index, { medication: event.target.value })} /></label>
                    <label className="wide">{lang === "nl" ? "Opmerking extractie" : "Extraction remark"}<textarea value={row.remarks} onChange={(event) => updateRow(index, { remarks: event.target.value })} /></label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PlanningView({
  wzcs,
  plannings,
  preselectedWzc,
  focusPlanningId,
  onFocusHandled,
  onSaved
}: {
  wzcs: Wzc[];
  plannings: Planning[];
  preselectedWzc: Wzc | null;
  focusPlanningId: number | null;
  onFocusHandled: () => void;
  onSaved: () => Promise<void>;
}) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [tab, setTab] = useState<PlanningTab>("Nieuwe planning");
  const [planningKind, setPlanningKind] = useState<PlanningKind>("Screening");
  const [name, setName] = useState("Screening");
  const [planningDate, setPlanningDate] = useState(todayIso);
  const [planningGroupFilter, setPlanningGroupFilter] = useState("");
  const [wzcId, setWzcId] = useState<number | "">(preselectedWzc?.id || "");
  const [files, setFiles] = useState<File[]>([]);
  const [treatmentRoster, setTreatmentRoster] = useState<File | null>(null);
  const [treatmentSelectionReport, setTreatmentSelectionReport] = useState<TreatmentSelectionReport | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [expandedPlanningId, setExpandedPlanningId] = useState<number | null>(plannings[0]?.id || null);
  const [savedAddFiles, setSavedAddFiles] = useState<File[]>([]);
  const [savedAddRoster, setSavedAddRoster] = useState<File | null>(null);
  const [savedAddSelectionReport, setSavedAddSelectionReport] = useState<TreatmentSelectionReport | null>(null);
  const [savedAddRows, setSavedAddRows] = useState<PlanningRow[]>([]);
  const [savedAddSelectedRows, setSavedAddSelectedRows] = useState<Record<number, boolean>>({});
  const [savedAddLoading, setSavedAddLoading] = useState(false);
  const [editingSavedPatientRow, setEditingSavedPatientRow] = useState<string | null>(null);
  const [openSavedPatientMenu, setOpenSavedPatientMenu] = useState<string | null>(null);
  const [savedPatientNameDraft, setSavedPatientNameDraft] = useState("");
  const [savingSavedPatientNames, setSavingSavedPatientNames] = useState(false);
  const [savedDate, setSavedDate] = useState("");
  const [linkedPlanningId, setLinkedPlanningId] = useState<number | null>(focusPlanningId);
  const [planningSearch, setPlanningSearch] = useState("");

  const sortedPlannings = useMemo(
    () => [...plannings].sort((a, b) => b.planning_date.localeCompare(a.planning_date) || b.name.localeCompare(a.name)),
    [plannings]
  );
  const expandedPlanning = sortedPlannings.find((planning) => planning.id === expandedPlanningId) || sortedPlannings[0] || null;
  const workflowPlannings = useMemo(
    () => [...plannings].sort((a, b) => {
      const aPast = a.planning_date < todayIso;
      const bPast = b.planning_date < todayIso;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return a.planning_date.localeCompare(b.planning_date)
        || (a.start_time || "09:00").localeCompare(b.start_time || "09:00")
        || a.name.localeCompare(b.name);
    }),
    [plannings]
  );
  const workflowPlanningOptions = useMemo(
    () => workflowPlannings.map((planning) => ({
      value: String(planning.id),
      label: planningWorkflowLabel(planning),
      meta: planningWorkflowMeta(planning),
    })),
    [workflowPlannings]
  );
  const linkedPlanning = linkedPlanningId === null
    ? null
    : plannings.find((planning) => planning.id === linkedPlanningId) || null;
  const allSelectableWzcs = useMemo(
    () => actualWzcs(wzcs).filter((wzc) => wzc.collaboration_status === "Actief"),
    [wzcs]
  );
  const planningGroupOptions = useMemo(() => groupOptionsForWzcs(wzcs), [wzcs]);
  const selectableWzcs = useMemo(
    () => applyGroupFilter(allSelectableWzcs, planningGroupFilter),
    [allSelectableWzcs, planningGroupFilter]
  );

  useEffect(() => {
    if (preselectedWzc) {
      setLinkedPlanningId(null);
      setPlanningSearch("");
      setWzcId(preselectedWzc.id);
      setPlanningGroupFilter(preselectedWzc.group_name || "");
      setName(`${planningKind === "Screening" ? "Screening" : "Behandelplanning"} ${preselectedWzc.name}`);
      setTab("Nieuwe planning");
    }
  }, [preselectedWzc, planningKind]);

  useEffect(() => {
    if (!focusPlanningId) return;
    const focusedPlanning = plannings.find((planning) => planning.id === focusPlanningId);
    if (!focusedPlanning) return;
    loadPlanningIntoEditor(focusedPlanning);
    onFocusHandled();
  }, [focusPlanningId, plannings, onFocusHandled]);

  useEffect(() => {
    if (linkedPlanning) {
      setPlanningSearch(planningWorkflowLabel(linkedPlanning));
    }
  }, [linkedPlanning?.id, linkedPlanning?.planning_date, linkedPlanning?.start_time, linkedPlanning?.location, linkedPlanning?.planning_type]);

  useEffect(() => {
    if (wzcId !== "" && !selectableWzcs.some((wzc) => wzc.id === wzcId)) {
      setWzcId("");
    }
  }, [selectableWzcs, wzcId]);

  useEffect(() => {
    setSelectedFiles(Object.fromEntries(files.map((file) => [file.name, true])));
  }, [files]);

  useEffect(() => {
    if (expandedPlanning) {
      setSavedDate(expandedPlanning.planning_date);
    }
    setSavedAddFiles([]);
    setSavedAddRoster(null);
    setSavedAddSelectionReport(null);
    setSavedAddRows([]);
    setSavedAddSelectedRows({});
    setEditingSavedPatientRow(null);
    setOpenSavedPatientMenu(null);
    setSavedPatientNameDraft("");
  }, [expandedPlanning?.id, expandedPlanning?.planning_date]);

  function resetPlanning() {
    setLinkedPlanningId(null);
    setPlanningSearch("");
    setPlanningKind("Screening");
    setName("Screening");
    setPlanningDate(todayIso);
    setPlanningGroupFilter("");
    setWzcId("");
    setFiles([]);
    setTreatmentRoster(null);
    setTreatmentSelectionReport(null);
    setRows([]);
    setSelectedFiles({});
    setSelectedRows({});
    setFileInputKey((value) => value + 1);
  }

  function changePlanningKind(kind: PlanningKind) {
    if (kind === planningKind) return;
    setPlanningKind(kind);
    setName(kind === "Screening" ? "Screening" : "Behandelplanning");
    setFiles([]);
    setTreatmentRoster(null);
    setTreatmentSelectionReport(null);
    setRows([]);
    setSelectedFiles({});
    setSelectedRows({});
    setFileInputKey((value) => value + 1);
  }

  function updatePreviewRow(index: number, patch: Partial<PlanningRow>) {
    setRows((currentRows) => currentRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function loadPlanningIntoEditor(planning: Planning) {
    const savedWzc = allSelectableWzcs.find((wzc) => wzc.id === planning.wzc_id);
    setLinkedPlanningId(planning.id);
    setPlanningSearch(planningWorkflowLabel(planning));
    setPlanningKind(planning.planning_type === "Screening" ? "Screening" : "Behandeling");
    setName(planning.name);
    setPlanningDate(planning.planning_date);
    setPlanningGroupFilter(savedWzc?.group_name || "");
    setWzcId(planning.wzc_id || "");
    setFiles([]);
    setTreatmentRoster(null);
    setTreatmentSelectionReport(null);
    setRows(planning.rows.map((row, index) => ({ ...row, patient_number: index + 1 })));
    setSelectedFiles({});
    setSelectedRows(Object.fromEntries(planning.rows.map((_, index) => [index, true])));
    setFileInputKey((value) => value + 1);
    setTab("Nieuwe planning");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function preview() {
    const selectedUploadFiles = files.filter((file) => selectedFiles[file.name]);
    setLoading(true);
    try {
      let previewRows: PlanningRow[];
      let initialSelection: Record<number, boolean>;
      if (planningKind === "Screening") {
        previewRows = await api.previewScreeningPlanning(planningDate, selectedUploadFiles);
        initialSelection = Object.fromEntries(previewRows.map((_, index) => [index, true]));
        setTreatmentSelectionReport(null);
      } else {
        const report = await api.previewTreatmentSelection(planningDate, selectedUploadFiles, treatmentRoster);
        setTreatmentSelectionReport(report);
        previewRows = report.items.map((item) => item.row);
        initialSelection = Object.fromEntries(report.items.map((item, index) => [index, item.recommended]));
      }
      setRows(previewRows);
      setSelectedRows(initialSelection);
    } finally {
      setLoading(false);
    }
  }

  function selectedPlanningRows() {
    return rows
      .filter((row, index) => row.patient_name.trim() && (planningKind === "Screening" || selectedRows[index] !== false))
      .map((row, index) => ({
        patient_number: index + 1,
        patient_name: row.patient_name,
        treatments: planningKind === "Screening" ? "Screening" : row.treatments,
        date_or_period: row.date_or_period || formatDate(planningDate),
        remarks: row.remarks,
        patient_done: row.patient_done,
      }));
  }

  function clearPreview() {
    setRows([]);
    setSelectedRows({});
    setTreatmentSelectionReport(null);
  }

  async function savePlanning(downloadExcel = false) {
    const selectedPreviewRows = selectedPlanningRows();
    if (selectedPreviewRows.length === 0) return;
    const selectedWzc = allSelectableWzcs.find((wzc) => wzc.id === wzcId);
    const planningPayload = {
      name,
      planning_type: planningKind,
      planning_date: planningDate,
      location: selectedWzc?.name || "",
      wzc_id: wzcId === "" ? null : Number(wzcId),
    };
    setSavingPlanning(true);
    try {
      const planning = linkedPlanningId
        ? await api.replacePlanningRows(
            (await api.updatePlanning(linkedPlanningId, planningPayload)).id,
            selectedPreviewRows
          )
        : await api.createPlanning({
            ...planningPayload,
            rows: selectedPreviewRows
          });
      if (downloadExcel) {
        await api.downloadPlanningExcel(planning.id, cleanFileName(planning.name));
      }
      resetPlanning();
      await onSaved();
      setExpandedPlanningId(planning.id);
      setTab("Voorgaande planningen");
    } finally {
      setSavingPlanning(false);
    }
  }

  async function openPlanning(planning: Planning) {
    loadPlanningIntoEditor(planning);
  }

  async function reschedulePlanning() {
    if (!expandedPlanning || !savedDate) return;
    await api.updatePlanning(expandedPlanning.id, { planning_date: savedDate });
    await onSaved();
  }

  async function deletePlanning(planning: Planning) {
    if (!window.confirm(`Bent u zeker? U staat op het punt om "${planning.name}" te verwijderen.`)) return;
    await api.deletePlanning(planning.id);
    setExpandedPlanningId(null);
    await onSaved();
  }

  async function previewAdditionalRows() {
    if (!expandedPlanning) return;
    setSavedAddLoading(true);
    try {
      let previewRows: PlanningRow[];
      let initialSelection: Record<number, boolean>;
      if (expandedPlanning.planning_type === "Screening") {
        previewRows = await api.previewScreeningPlanning(expandedPlanning.planning_date, savedAddFiles);
        initialSelection = Object.fromEntries(previewRows.map((_, index) => [index, true]));
        setSavedAddSelectionReport(null);
      } else {
        const report = await api.previewTreatmentSelection(expandedPlanning.planning_date, savedAddFiles, savedAddRoster);
        setSavedAddSelectionReport(report);
        previewRows = report.items.map((item) => item.row);
        initialSelection = Object.fromEntries(report.items.map((item, index) => [index, item.recommended]));
      }
      setSavedAddRows(previewRows);
      setSavedAddSelectedRows(initialSelection);
    } finally {
      setSavedAddLoading(false);
    }
  }

  async function addRowsToSavedPlanning() {
    if (!expandedPlanning) return;
    const selectedAddRows = savedAddRows
      .filter((_, index) => expandedPlanning.planning_type === "Screening" || savedAddSelectedRows[index])
      .map((row, index) => ({ ...row, patient_number: index + 1 }));
    if (selectedAddRows.length === 0) return;
    await api.addPlanningRows(expandedPlanning.id, selectedAddRows);
    setSavedAddFiles([]);
    setSavedAddRoster(null);
    setSavedAddSelectionReport(null);
    setSavedAddRows([]);
    setSavedAddSelectedRows({});
    await onSaved();
  }

  async function removeSavedRow(row: PlanningRow) {
    if (!expandedPlanning || !row.id) return;
    setOpenSavedPatientMenu(null);
    if (!window.confirm(`Bewoner "${row.patient_name}" verwijderen uit deze planning?`)) return;
    await api.deletePlanningRow(expandedPlanning.id, row.id);
    await onSaved();
  }

  function savedPatientRowKey(row: PlanningRow, index: number) {
    return row.id ? `id-${row.id}` : `index-${index}`;
  }

  function startSavedPatientNameEditing(row: PlanningRow, index: number) {
    setEditingSavedPatientRow(savedPatientRowKey(row, index));
    setOpenSavedPatientMenu(null);
    setSavedPatientNameDraft(row.patient_name);
  }

  function cancelSavedPatientNameEditing() {
    setEditingSavedPatientRow(null);
    setSavedPatientNameDraft("");
  }

  async function saveSavedPatientName() {
    if (!expandedPlanning || !editingSavedPatientRow || !savedPatientNameDraft.trim()) return;
    const updatedRows = expandedPlanning.rows.map((row, index) => ({
      ...row,
      patient_number: index + 1,
      patient_name: savedPatientRowKey(row, index) === editingSavedPatientRow
        ? savedPatientNameDraft.trim()
        : row.patient_name,
    }));
    setSavingSavedPatientNames(true);
    try {
      await api.replacePlanningRows(expandedPlanning.id, updatedRows);
      setEditingSavedPatientRow(null);
      setSavedPatientNameDraft("");
      await onSaved();
    } finally {
      setSavingSavedPatientNames(false);
    }
  }

  const selectedUploadCount = files.filter((file) => selectedFiles[file.name]).length;
  const isScreening = planningKind === "Screening";
  const selectedPreviewCount = rows.filter((row, index) => row.patient_name.trim() && (isScreening || selectedRows[index] !== false)).length;
  const screeningDurationMinutes = selectedPreviewCount * 4;
  const uploadAccept = isScreening ? ".xlsx,.xlsm,.xls,.csv" : "application/pdf";
  const uploadTitle = isScreening ? "Screening Excel-lijst" : "Behandelplan PDF's";
  const emptyUploadText = isScreening ? "Nog geen Excel- of CSV-lijst gekozen." : "Nog geen PDF's gekozen.";
  const readButtonText = isScreening ? "Namenlijst inlezen" : "Behandelplannen uitlezen";
  const loadingButtonText = isScreening ? "Namen lezen..." : "PDF's lezen...";
  const previewTitle = isScreening ? "Preview screeninglijst" : "Preview behandelplanning";
  const savedAddSelectedCount = savedAddRows.filter((_, index) => expandedPlanning?.planning_type === "Screening" || savedAddSelectedRows[index]).length;
  const treatmentCountForPlanning = (planning: Planning) =>
    planning.rows.reduce((sum, row) => sum + row.treatments.split(",").filter((value) => value.trim() && value.trim() !== "Screening").length, 0);

  return (
    <div className="stack">
      <section className="followupSwitch planningTabSwitch" aria-label="Behandelplanning onderdelen">
        {(["Nieuwe planning", "Voorgaande planningen"] as PlanningTab[]).map((item) => (
          <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>
            <strong>{item === "Nieuwe planning" ? "Planning aanvullen" : "Planningdetails"}</strong>
            <span>{item === "Nieuwe planning" ? "Ingeplande dagen koppelen en bewoners toevoegen" : `${sortedPlannings.length} planning(en) met detail`}</span>
          </button>
        ))}
      </section>

      {tab === "Nieuwe planning" && (
        <>
          <section className="panel planningPanel">
            <div className="sectionTitle">
              <div>
                <h2>{linkedPlanning ? "Ingeplande dag aanvullen" : "Behandelplanning"}</h2>
                <p className="sectionHint">{isScreening ? "Upload een Excel- of CSV-lijst en controleer wie op de screeninglijst staat." : "Upload de behandelplan-PDF's, controleer de uitgelezen namen en duid per bewoner aan of die wordt opgenomen."}</p>
              </div>
              <button onClick={resetPlanning}>{linkedPlanning ? "Loskoppelen en leegmaken" : "Alles leegmaken"}</button>
            </div>
            <div className="linkedPlanningBox">
              <SearchableDropdownField
                label={L("Ingeplande dag uit Planning")}
                value={planningSearch}
                options={workflowPlanningOptions}
                onInputChange={(value) => {
                  setPlanningSearch(value);
                  if (!value.trim()) setLinkedPlanningId(null);
                }}
                onSelect={(option) => {
                  const planning = plannings.find((item) => item.id === Number(option.value));
                  if (planning) loadPlanningIntoEditor(planning);
                }}
                placeholder={L("Typ datum, WZC of soort planning")}
                emptyText={L("Geen ingeplande dag gevonden")}
              />
              <div className={`linkedPlanningSummary ${linkedPlanning ? "" : "isMuted"}`.trim()}>
                {linkedPlanning ? (
                  <>
                    <strong>{L("Gekoppeld aan Planning")}</strong>
                    <span>{planningWorkflowLabel(linkedPlanning, lang)}</span>
                    <small>{planningWorkflowMeta(linkedPlanning, lang)}</small>
                  </>
                ) : (
                  <>
                    <strong>{L("Geen ingeplande dag geselecteerd")}</strong>
                    <span>{L("Kies eerst een screening of behandeldag uit Planning om die hier verder aan te vullen.")}</span>
                    <small>{L("Losse planning blijft mogelijk, maar de normale flow start in Planning.")}</small>
                  </>
                )}
              </div>
            </div>
            <div className="planningKindSelector" aria-label="Type planning">
              <button className={planningKind === "Screening" ? "selected" : ""} onClick={() => changePlanningKind("Screening")}>
                <strong>{L("Screeningen")}</strong>
                <span>{L("Excel-lijst met bewoners en aantallen")}</span>
              </button>
              <button className={planningKind === "Behandeling" ? "selected" : ""} onClick={() => changePlanningKind("Behandeling")}>
                <strong>{L("Behandelingen")}</strong>
                <span>{L("PDF's uitlezen naar behandelplanning")}</span>
              </button>
            </div>
            <div className="planningSetupGrid">
              <div className="formGrid planningMetaGrid">
                <label>{L("Naam planning")}<input value={name} onChange={(event) => setName(event.target.value)} /></label>
                <label>{L("Planningsdatum")}<input type="date" value={planningDate} onChange={(event) => setPlanningDate(event.target.value)} /></label>
                <SearchableGroupSelect label={L("Groep/organisatie")} value={planningGroupFilter} groups={planningGroupOptions} onChange={setPlanningGroupFilter} placeholder={L("Alle groepen")} />
                <SearchableWzcSelect label={L("WZC")} value={wzcId} wzcs={selectableWzcs} onChange={setWzcId} placeholder={lang === "nl" ? "Kies WZC" : "Select care home"} />
              </div>
              <div className={`uploadBox ${isScreening ? "" : "treatmentUploadBox"}`.trim()}>
                {!isScreening && (
                  <label className="uploadSourceField"><span className="uploadSourceTitle">Excel-werklijst <span className="optionalLabel">optioneel</span></span>
                    <input
                      key={`roster-${fileInputKey}`}
                      type="file"
                      accept=".xlsx,.xlsm,.xls,.csv"
                      onChange={(event) => {
                        setTreatmentRoster(event.target.files?.[0] || null);
                        setTreatmentSelectionReport(null);
                        setRows([]);
                        setSelectedRows({});
                      }}
                    />
                    <small className={`uploadSelectionText ${treatmentRoster ? "hasFile" : ""}`}>{treatmentRoster ? treatmentRoster.name : L("Gebruikt volgorde en goedkeuringstekst als voorstel.")}</small>
                  </label>
                )}
                <label className="uploadSourceField"><span className="uploadSourceTitle">{uploadTitle}</span>
                  <input key={fileInputKey} type="file" accept={uploadAccept} multiple onChange={(event) => {
                    setFiles(Array.from(event.target.files || []));
                    if (!isScreening) {
                      setTreatmentSelectionReport(null);
                      setRows([]);
                      setSelectedRows({});
                    }
                  }} />
                  <small className={`uploadSelectionText ${files.length > 0 ? "hasFile" : ""}`}>{files.length > 0 ? `${files.length} ${lang === "nl" ? `bestand${files.length === 1 ? "" : "en"} gekozen` : `file${files.length === 1 ? "" : "s"} selected`}` : emptyUploadText}</small>
                </label>
                {files.length > 0 ? (
                  <div className="fileSelection compactFiles">
                    <div className="fileSelectionHeader">
                      <div>
                        <strong>{isScreening ? L("Lijstselectie") : L("Bestanden opnemen")}</strong>
                        <span>{selectedUploadCount} {L("van")} {files.length} {L("geselecteerd")}</span>
                      </div>
                      <div className="fileSelectionActions" aria-label={lang === "nl" ? "Bestandsselectie aanpassen" : "Adjust file selection"}>
                        <button type="button" onClick={() => setSelectedFiles(Object.fromEntries(files.map((file) => [file.name, true])))}>{lang === "nl" ? "Alles" : "All"}</button>
                        <button type="button" onClick={() => setSelectedFiles(Object.fromEntries(files.map((file) => [file.name, false])))}>{lang === "nl" ? "Geen" : "None"}</button>
                      </div>
                    </div>
                    <div className="compactFileGrid">
                      {files.map((file, index) => (
                        <label key={`${file.name}-${index}`} className="checkRow" title={file.name}>
                          <input type="checkbox" checked={!!selectedFiles[file.name]} onChange={(event) => setSelectedFiles({ ...selectedFiles, [file.name]: event.target.checked })} />
                          <span><b>{index + 1}.</b> {file.name.replace(/\.pdf$/i, "")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty compactEmpty">{emptyUploadText}</div>
                )}
              </div>
            </div>
            <div className="inlineActions planningActions">
              <button className="primaryButton" disabled={selectedUploadCount === 0 || loading} onClick={preview}>{loading ? loadingButtonText : readButtonText}</button>
              <button disabled={rows.length === 0} onClick={clearPreview}>{lang === "nl" ? "Preview leegmaken" : "Clear preview"}</button>
            </div>
          </section>
          {rows.length > 0 && (
            <section className="panel previewPanel">
              <div className="sectionTitle previewHeader">
                <div>
                  <h2>{previewTitle}</h2>
                  <p className="sectionHint">{isScreening ? L("Alle namen uit deze lijst worden meegenomen; controleer vooral aantal en schrijfwijze.") : L("Vink enkel bewoners aan die effectief in deze planning mogen meegaan.")}</p>
                </div>
                <div className="previewActions">
                  {isScreening && <span className="softBadge">{selectedPreviewCount} {L("persoon/personen")}</span>}
                  {isScreening && <span className="softBadge">{formatDuration(screeningDurationMinutes)} {L("geschat")}</span>}
                  {!isScreening && (
                    <div className="previewSelectionSummary">
                      <strong>{selectedPreviewCount}</strong>
                      <span>{L("van")} {rows.length} {L("geselecteerd")}{treatmentSelectionReport && treatmentSelectionReport.excel_count > 0 ? ` · ${treatmentSelectionReport.excel_count} ${L("Excelnamen")}` : ""}</span>
                    </div>
                  )}
                  {!isScreening && (
                    <div className="previewBulkActions" aria-label={lang === "nl" ? "Selectie aanpassen" : "Adjust selection"}>
                      <button onClick={() => setSelectedRows(Object.fromEntries(rows.map((_, index) => [index, true])))}>{lang === "nl" ? "Alles" : "All"}</button>
                      <button onClick={() => setSelectedRows(Object.fromEntries(rows.map((_, index) => [index, false])))}>{lang === "nl" ? "Geen" : "None"}</button>
                    </div>
                  )}
                  <div className="previewSaveActions">
                    <button disabled={selectedPreviewCount === 0 || savingPlanning} onClick={() => savePlanning(false)}>{linkedPlanning ? L("Opslaan in ingeplande dag") : isScreening ? L("Screening bewaren") : L("Planning bewaren...")}</button>
                    <button className="primaryButton" disabled={selectedPreviewCount === 0 || savingPlanning} onClick={() => savePlanning(true)}>{savingPlanning ? L("Genereren...") : L("Excel genereren")}</button>
                  </div>
                </div>
              </div>
              {!isScreening && treatmentSelectionReport && treatmentSelectionReport.missing_names.length > 0 && (
                <details className="matchDetail treatmentMissingNames">
                  <summary>{L("Wel in Excel, geen behandelplan gevonden")} ({treatmentSelectionReport.missing_names.length})</summary>
                  <div className="matchNameList">{treatmentSelectionReport.missing_names.map((patientName, index) => <span key={`${patientName}-${index}`}>{patientName}</span>)}</div>
                </details>
              )}
              <div className="planningPreviewList">
                {rows.map((row, index) => {
                  const selectionItem = treatmentSelectionReport?.items[index];
                  const needsNameReview = selectionItem?.excel_approved === true && selectionItem.match_kind !== "exact";
                  const approvalLabel = selectionItem?.excel_name
                    ? selectionItem.excel_approved === true
                      ? "Akkoord"
                      : selectionItem.excel_approved === false
                        ? "Niet akkoord"
                        : "Status controleren"
                    : treatmentRoster
                      ? "Niet in Excel"
                      : "";
                  const approvalClass = selectionItem?.excel_approved === true
                    ? "approved"
                    : selectionItem?.excel_approved === false
                      ? "notApproved"
                      : "review";
                  const treatmentSummary = row.treatments.trim() || "Nog geen behandelingen ingevuld";

                  return (
                  <article className={`planningPreviewRow ${isScreening ? "screeningPreviewRow" : "treatmentPreviewRow"} ${selectedRows[index] === false ? "isMuted" : ""}`} key={`${row.patient_name}-${index}`}>
                    {!isScreening && (
                      <label className="rowDecision" aria-label={`${row.patient_name} opnemen`}>
                        <input type="checkbox" checked={selectedRows[index] !== false} onChange={(event) => setSelectedRows({ ...selectedRows, [index]: event.target.checked })} />
                        <span>{lang === "nl" ? "Opnemen" : "Include"}</span>
                      </label>
                    )}
                    {isScreening ? (
                      <label className="previewName">{L("Naam bewoner")}<input value={row.patient_name} onChange={(event) => updatePreviewRow(index, { patient_name: event.target.value })} /></label>
                    ) : (
                      <div className="previewPatient">
                        <div className="previewPatientHeading">
                          <strong>{index + 1}. {row.patient_name}</strong>
                          {approvalLabel && <span className={`approvalStatus ${approvalClass}`}>{approvalLabel}</span>}
                        </div>
                        <small className="previewDate">{row.date_or_period || formatDate(planningDate)}</small>
                        {selectionItem?.excel_name && (
                          <small className="excelSelectionMeta">
                            <span>Excel: {selectionItem.excel_name}</span>
                            <span>{L("Op te volgen behandeling")}: {selectionItem.excel_status || L("leeg in Excel")}</span>
                            {selectionItem.match_kind === "likely" && <span>{lang === "nl" ? "Waarschijnlijke naamkoppeling" : "Likely name match"}</span>}
                            {selectionItem.match_kind === "surname" && <span>{L("Suggestie op achternaam, controleren")}</span>}
                          </small>
                        )}
                        {needsNameReview && (
                          <small className="nameReviewNotice">{L("Akkoord gevonden · controleer alleen de naamkoppeling")}</small>
                        )}
                        {treatmentRoster && !selectionItem?.excel_name && <small className="excelSelectionMeta notApproved">{L("Niet teruggevonden in Excel · controleer handmatig")}</small>}
                      </div>
                    )}
                    {!isScreening && (
                      <details className="previewRowDetails">
                        <summary>
                          <span>{L("Behandelingen en opmerking")}</span>
                          <small>{treatmentSummary}</small>
                        </summary>
                        <div className="previewDetailFields">
                          <label className="previewTreatments">Behandelingen<textarea value={row.treatments} onChange={(event) => updatePreviewRow(index, { treatments: event.target.value })} /></label>
                          <label className="previewRemarks">Opmerking<input value={row.remarks} placeholder="Opmerkingen" onChange={(event) => updatePreviewRow(index, { remarks: event.target.value })} /></label>
                        </div>
                      </details>
                    )}
                    {isScreening && <div className="previewPatient"><strong>{index + 1}</strong><small>{row.date_or_period || formatDate(planningDate)}</small></div>}
                    {isScreening && <label className="previewRemarks">Opmerking<input value={row.remarks} placeholder="Opmerkingen" onChange={(event) => updatePreviewRow(index, { remarks: event.target.value })} /></label>}
                  </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {tab === "Voorgaande planningen" && (
        <section className="panel">
          <div className="sectionTitle">
            <div>
              <h2>{L("Planningdetails")}</h2>
              <p className="sectionHint">{lang === "nl" ? "Alle ingeplande screenings en behandeldagen met hun bewonerslijst. PDF-bestanden zelf worden niet bewaard." : "All scheduled screenings and treatment days with their resident lists. PDF files themselves are not stored."}</p>
            </div>
          </div>
          <div className="savedPlanningLayout">
            <div className="cardList scrollList">
              {sortedPlannings.map((planning) => (
                <button className={`portfolioRow ${expandedPlanning?.id === planning.id ? "selected" : ""}`} key={planning.id} onClick={() => setExpandedPlanningId(planning.id)}>
                  <strong>{formatDate(planning.planning_date)} · {planning.name}</strong>
                  <span>{planning.location || L("Geen locatie")} · {planning.start_time || "09:00"}-{planning.end_time || "16:00"} · {L(planning.planning_status || "Concept")}</span>
                  <small>{planning.planning_type === "Screening" ? `${L("Screening")} · ${planning.rows.length} ${lang === "nl" ? "persoon/personen" : "person(s)"} · ${formatDuration(planning.rows.length * 4)} ${lang === "nl" ? "geschat" : "estimated"}` : `${planning.rows.length} ${lang === "nl" ? "patient(en)" : "patient(s)"} · ${treatmentCountForPlanning(planning)} ${lang === "nl" ? "behandeling(en)" : "treatment(s)"}`}</small>
                </button>
              ))}
              {sortedPlannings.length === 0 && <div className="empty">{lang === "nl" ? "Nog geen ingeplande dagen." : "No scheduled days yet."}</div>}
            </div>
            {expandedPlanning && (
              <div className="savedPlanningDetail">
                <div className="sectionTitle">
                  <div>
                    <h3>{expandedPlanning.name}</h3>
                    <p className="sectionHint">{L(expandedPlanning.planning_type || "Behandeling")} · {expandedPlanning.location || L("Geen locatie")} · {expandedPlanning.rows.length} {lang === "nl" ? "bewoner(s)" : "resident(s)"}{expandedPlanning.planning_type === "Screening" ? ` · ${formatDuration(expandedPlanning.rows.length * 4)} ${lang === "nl" ? "geschat" : "estimated"}` : ""}</p>
                  </div>
                  <div className="inlineActions noMargin">
                    <button onClick={() => openPlanning(expandedPlanning)}>{lang === "nl" ? "Aanvullen" : "Supplement"}</button>
                    <button onClick={() => api.downloadPlanningExcel(expandedPlanning.id, cleanFileName(expandedPlanning.name))}>{lang === "nl" ? "Excel downloaden" : "Download Excel"}</button>
                    <button onClick={() => deletePlanning(expandedPlanning)}>{L("Verwijderen")}</button>
                  </div>
                </div>
                <div className="inlineForm">
                  <label>{lang === "nl" ? "Nieuwe datum" : "New date"}<input type="date" value={savedDate} onChange={(event) => setSavedDate(event.target.value)} /></label>
                  <button className="primaryButton" disabled={savedDate === expandedPlanning.planning_date} onClick={reschedulePlanning}>{lang === "nl" ? "Datum bewaren" : "Save date"}</button>
                </div>
                <div className="planningTable compactRows">
                  {expandedPlanning.rows.map((row, index) => (
                    <article className={`planningRowCard ${editingSavedPatientRow === savedPatientRowKey(row, index) ? "editingPatientName" : ""}`} key={row.id || `${row.patient_name}-${row.patient_number}`}>
                      {editingSavedPatientRow === savedPatientRowKey(row, index) && expandedPlanning.planning_type !== "Screening" ? (
                        <div className="savedPatientNameEditor">
                          <label className="savedPatientNameField">
                            <span>{row.patient_number}.</span>
                            <input
                              value={savedPatientNameDraft}
                              onChange={(event) => setSavedPatientNameDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveSavedPatientName();
                                if (event.key === "Escape") cancelSavedPatientNameEditing();
                              }}
                              aria-label={lang === "nl" ? `Naam van patient ${row.patient_number}` : `Name of patient ${row.patient_number}`}
                              autoFocus
                            />
                          </label>
                          <button className="savedNameAction" title={L("Annuleren")} aria-label={lang === "nl" ? "Naamwijziging annuleren" : "Cancel name change"} onClick={cancelSavedPatientNameEditing}>×</button>
                          <button className="savedNameAction primaryButton" title={lang === "nl" ? "Naam bewaren" : "Save name"} aria-label={lang === "nl" ? "Naam bewaren" : "Save name"} disabled={savingSavedPatientNames || !savedPatientNameDraft.trim()} onClick={saveSavedPatientName}>{savingSavedPatientNames ? "…" : "✓"}</button>
                        </div>
                      ) : (
                        <div className="savedPatientNameDisplay">
                          <strong>{row.patient_number}. {row.patient_name}</strong>
                          <div
                            className="savedPatientMenu"
                            onBlur={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenSavedPatientMenu(null);
                            }}
                          >
                            <button
                              className="patientNameMenuButton"
                              title={lang === "nl" ? "Acties voor bewoner" : "Actions for resident"}
                              aria-label={lang === "nl" ? `Acties voor ${row.patient_name}` : `Actions for ${row.patient_name}`}
                              aria-expanded={openSavedPatientMenu === savedPatientRowKey(row, index)}
                              onClick={() => setOpenSavedPatientMenu((current) => current === savedPatientRowKey(row, index) ? null : savedPatientRowKey(row, index))}
                            >⋯</button>
                            {openSavedPatientMenu === savedPatientRowKey(row, index) && (
                              <div className="savedPatientMenuList">
                                {expandedPlanning.planning_type !== "Screening" && <button onClick={() => startSavedPatientNameEditing(row, index)}>{lang === "nl" ? "Naam bewerken" : "Edit name"}</button>}
                                <button className="dangerMenuAction" disabled={!row.id} onClick={() => removeSavedRow(row)}>{lang === "nl" ? "Bewoner verwijderen" : "Remove resident"}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <span>{expandedPlanning.planning_type === "Screening" ? "Screening" : row.treatments}</span>
                      {row.remarks && <small>{row.remarks}</small>}
                    </article>
                  ))}
                </div>
                <div className="nestedPanel">
                  <h3>{lang === "nl" ? `Bewoners toevoegen via ${expandedPlanning.planning_type === "Screening" ? "Excel/CSV" : "behandelplan-PDF's"}` : `Add residents via ${expandedPlanning.planning_type === "Screening" ? "Excel/CSV" : "treatment plan PDFs"}`}</h3>
                  {expandedPlanning.planning_type !== "Screening" && (
                    <label>{lang === "nl" ? "Excel-werklijst" : "Excel worklist"} <span className="optionalLabel">{lang === "nl" ? "optioneel" : "optional"}</span>
                      <input type="file" accept=".xlsx,.xlsm,.xls,.csv" onChange={(event) => {
                        setSavedAddRoster(event.target.files?.[0] || null);
                        setSavedAddSelectionReport(null);
                        setSavedAddRows([]);
                        setSavedAddSelectedRows({});
                      }} />
                      <small className="uploadSelectionText">{savedAddRoster ? savedAddRoster.name : (lang === "nl" ? "Gebruikt volgorde en goedkeuringstekst als voorstel." : "Uses order and approval text as suggestion.")}</small>
                    </label>
                  )}
                  <input type="file" accept={expandedPlanning.planning_type === "Screening" ? ".xlsx,.xlsm,.xls,.csv" : "application/pdf"} multiple onChange={(event) => {
                    setSavedAddFiles(Array.from(event.target.files || []));
                    setSavedAddSelectionReport(null);
                    setSavedAddRows([]);
                    setSavedAddSelectedRows({});
                  }} />
                  <div className="inlineActions">
                    <button disabled={savedAddFiles.length === 0 || savedAddLoading} onClick={previewAdditionalRows}>{savedAddLoading ? (lang === "nl" ? "Inlezen..." : "Reading...") : expandedPlanning.planning_type === "Screening" ? (lang === "nl" ? "Namenlijst inlezen" : "Read name list") : (lang === "nl" ? "Behandelplannen uitlezen" : "Read treatment plans")}</button>
                    {expandedPlanning.planning_type !== "Screening" && savedAddRows.length > 0 && <button onClick={() => setSavedAddSelectedRows(Object.fromEntries(savedAddRows.map((_, index) => [index, true])))}>{lang === "nl" ? "Alles op ja" : "All yes"}</button>}
                    {expandedPlanning.planning_type !== "Screening" && savedAddRows.length > 0 && <button onClick={() => setSavedAddSelectedRows(Object.fromEntries(savedAddRows.map((_, index) => [index, false])))}>{lang === "nl" ? "Alles op nee" : "All no"}</button>}
                    <button className="primaryButton" disabled={savedAddSelectedCount === 0} onClick={addRowsToSavedPlanning}>{lang === "nl" ? "Toevoegen aan planning" : "Add to planning"}</button>
                  </div>
                  {savedAddRows.length > 0 && (
                    <div className="savedAddSelectionList">
                      <div className="sectionHint">{savedAddRows.length} {lang === "nl" ? "bewoner(s) uitgelezen" : "resident(s) read"} · {savedAddSelectedCount} {lang === "nl" ? "opnemen" : "include"}.</div>
                      {savedAddRows.map((row, index) => (
                        <label className={`savedAddSelectionRow ${savedAddSelectedRows[index] ? "isSelected" : ""}`} key={`${row.patient_name}-${index}`}>
                          <input
                            type="checkbox"
                            checked={expandedPlanning.planning_type === "Screening" || !!savedAddSelectedRows[index]}
                            disabled={expandedPlanning.planning_type === "Screening"}
                            onChange={(event) => setSavedAddSelectedRows({ ...savedAddSelectedRows, [index]: event.target.checked })}
                          />
                          <span>
                            <strong>{index + 1}. {row.patient_name}</strong>
                            {expandedPlanning.planning_type !== "Screening" && <small>{row.treatments || (lang === "nl" ? "Geen behandeling herkend" : "No treatment recognized")}</small>}
                            {savedAddSelectionReport?.items[index]?.excel_name && (
                              <small className={`excelSelectionMeta ${savedAddSelectionReport.items[index].excel_approved === true ? "approved" : "notApproved"}`}>
                                Excel: {savedAddSelectionReport.items[index].excel_name}
                                {lang === "nl" ? ` · Op te volgen behandeling: ${savedAddSelectionReport.items[index].excel_status || "leeg in Excel"}` : ` · Treatment to follow up: ${savedAddSelectionReport.items[index].excel_status || "empty in Excel"}`}
                                {savedAddSelectionReport.items[index].match_kind === "likely" ? (lang === "nl" ? " · waarschijnlijke naamkoppeling" : " · probable name match") : ""}
                                {savedAddSelectionReport.items[index].match_kind === "surname" ? (lang === "nl" ? " · suggestie op achternaam, controleren" : " · surname suggestion, please verify") : ""}
                              </small>
                            )}
                            {savedAddSelectionReport?.items[index]?.excel_approved === true && savedAddSelectionReport.items[index].match_kind !== "exact" && (
                              <small className="nameReviewNotice">{L("Akkoord gevonden · controleer alleen de naamkoppeling")}</small>
                            )}
                            {savedAddRoster && !savedAddSelectionReport?.items[index]?.excel_name && <small className="excelSelectionMeta notApproved">{lang === "nl" ? "Niet teruggevonden in Excel · controleer handmatig" : "Not found in Excel · check manually"}</small>}
                          </span>
                          <b>{expandedPlanning.planning_type === "Screening" || savedAddSelectedRows[index] ? (lang === "nl" ? "Ja" : "Yes") : (lang === "nl" ? "Nee" : "No")}</b>
                        </label>
                      ))}
                      {savedAddSelectionReport && savedAddSelectionReport.missing_names.length > 0 && (
                        <details className="matchDetail">
                          <summary>{lang === "nl" ? `Wel in Excel, geen behandelplan gevonden (${savedAddSelectionReport.missing_names.length})` : `In Excel but no treatment plan found (${savedAddSelectionReport.missing_names.length})`}</summary>
                          <div className="matchNameList">{savedAddSelectionReport.missing_names.map((patientName, index) => <span key={`${patientName}-${index}`}>{patientName}</span>)}</div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminView({ users, auditLogs, onSaved }: { users: User[]; auditLogs: AuditLog[]; onSaved: () => Promise<void> }) {
  const lang = useLang();
  const L = (key: string) => t(lang, key);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api.createUser({ email, password, role, is_active: true });
    setEmail("");
    setPassword("");
    await onSaved();
  }

  return (
    <div className="twoColumn">
      <section className="panel">
        <h2>{L("Gebruikers")}</h2>
        <form className="formGrid compact" onSubmit={submit}>
          <label>{L("E-mail")}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
          <label>{L("Wachtwoord")}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
          <label>{L("Rol")}<select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select></label>
          <button className="primaryButton">{lang === "nl" ? "Gebruiker toevoegen" : "Add user"}</button>
        </form>
        <div className="cardList">
          {users.map((user) => <div className="listRow" key={user.id}><strong>{user.email}</strong><span>{user.role}</span></div>)}
        </div>
      </section>
      <section className="panel">
        <div className="sectionTitle">
          <h2>{lang === "nl" ? "Gebruikerslog" : "User log"}</h2>
          <button onClick={async () => { await api.clearAuditLogs(); await onSaved(); }}>{lang === "nl" ? "Log wissen" : "Clear log"}</button>
        </div>
        <div className="cardList">
          {auditLogs.slice(0, 20).map((log) => (
            <div className="listRow" key={log.id}>
              <strong>{log.action}</strong>
              <span>{log.actor_email} · {log.module} · {formatDateTime(log.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function App() {
  if (window.location.pathname.startsWith("/portal")) return <PortalApp />;
  const [lang, setLang] = useState<Lang>(getSavedLang);
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState<Section>("Home");
  const [wzcs, setWzcs] = useState<Wzc[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [urgencies, setUrgencies] = useState<Urgency[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contextWzc, setContextWzc] = useState<Wzc | null>(null);
  const [contextPlanningId, setContextPlanningId] = useState<number | null>(null);
  const [followupFocusWzc, setFollowupFocusWzc] = useState<Wzc | null>(null);
  const [followupFocusProspect, setFollowupFocusProspect] = useState<Prospect | null>(null);
  const [error, setError] = useState("");

  async function loadData(activeUser = user) {
    if (!activeUser) return;
    setError("");
    try {
      const [wzcData, prospectData, urgencyData, planningData, teamData] = await Promise.all([
        api.wzcs(),
        api.prospects(),
        api.urgencies(),
        api.plannings(),
        api.teams()
      ]);
      setWzcs(wzcData);
      setProspects(prospectData);
      setUrgencies(urgencyData);
      setPlannings(planningData);
      setTeams(teamData);
      if (activeUser.role === "admin") {
        const [userData, logData] = await Promise.all([api.users(), api.auditLogs()]);
        setUsers(userData);
        setAuditLogs(logData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "Data laden mislukt."));
    }
  }

  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) return;
      try {
        const currentUser = await api.me();
        setUser(currentUser);
        await loadData(currentUser);
      } catch {
        clearToken();
      }
    }
    restoreSession();
  }, []);

  function changeLang(next: Lang) {
    setLang(next);
    try { localStorage.setItem("gsc-lang", next); } catch {}
  }

  if (!user) {
    return (
      <LangContext.Provider value={lang}>
        <LoginView onLogin={(currentUser) => { setUser(currentUser); loadData(currentUser); }} />
      </LangContext.Provider>
    );
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <LangContext.Provider value={lang}>
      <Shell user={user} section={section} setSection={setSection} onLogout={logout} lang={lang} onChangeLang={changeLang}>
        <Header section={section} />
        {error && <div className="error">{error}</div>}
        {section === "Home" && (
          <Home
            wzcs={wzcs}
            prospects={prospects}
            urgencies={urgencies}
            plannings={plannings}
            onOpenUrgencies={() => setSection("Urgenties")}
            onOpenWzcFiche={(wzc) => { setFollowupFocusWzc(wzc); setSection("WZC opvolging"); }}
            onSelectWzcForPlanning={(wzc) => { setContextPlanningId(null); setContextWzc(wzc); setSection("Behandelplanning"); }}
            onSelectWzcForUrgency={(wzc) => { setContextPlanningId(null); setContextWzc(wzc); setSection("Urgenties"); }}
          />
        )}
        {section === "Planning" && (
          <AgendaPlanningView
            wzcs={wzcs}
            plannings={plannings}
            teams={teams}
            onSaved={() => loadData()}
            onOpenTreatmentPlanning={(planning) => {
              setContextWzc(null);
              setContextPlanningId(planning.id);
              setSection("Behandelplanning");
            }}
          />
        )}
        {section === "Mondzorgdossiers" && <DossierView />}
        {section === "Urgenties" && <UrgenciesView wzcs={wzcs} urgencies={urgencies} preselectedWzc={contextWzc} onSaved={() => loadData()} />}
        {section === "WZC opvolging" && (
          <WzcFollowupView
            prospects={prospects}
            wzcs={wzcs}
            urgencies={urgencies}
            focusWzc={followupFocusWzc}
            focusProspect={followupFocusProspect}
            onFocusHandled={() => { setFollowupFocusWzc(null); setFollowupFocusProspect(null); }}
            onSaved={() => loadData()}
            onPlan={(wzc) => { setContextPlanningId(null); setContextWzc(wzc); setSection("Behandelplanning"); }}
            onUrgency={(wzc) => { setContextPlanningId(null); setContextWzc(wzc); setSection("Urgenties"); }}
          />
        )}
        {section === "Behandelplanning" && (
          <PlanningView
            wzcs={wzcs}
            plannings={plannings}
            preselectedWzc={contextWzc}
            focusPlanningId={contextPlanningId}
            onFocusHandled={() => setContextPlanningId(null)}
            onSaved={() => loadData()}
          />
        )}
        {section === "WZC database" && user.role === "admin" && <WzcDatabaseView wzcs={wzcs} prospects={prospects} teams={teams} users={users} auditLogs={auditLogs} onSaved={() => loadData()} />}
      </Shell>
    </LangContext.Provider>
  );
}

export default App;

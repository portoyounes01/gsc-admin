import { useEffect, useMemo, useState } from "react";
import { portalApi } from "./api";
import type { PortalAppointment, PortalDemoCentre, PortalMe, PortalService, PortalUrgency } from "./types";

type Lang = "nl" | "en";
type View = "overview" | "appointments" | "services" | "urgencies";

const navNl = [["overview", "⌂", "Overzicht"], ["appointments", "▣", "Afspraken"], ["services", "♧", "Diensten"], ["urgencies", "△", "Urgenties"]] as const;
const navEn = [["overview", "⌂", "Overview"], ["appointments", "▣", "Appointments"], ["services", "♧", "Services"], ["urgencies", "△", "Urgencies"]] as const;

const enLabels: Record<string, string> = {
  "Welkom bij uw zorgcentrum": "Welcome to your care centre",
  "Meld u aan om afspraken, diensten en urgenties te bekijken.": "Sign in to view appointments, services and urgencies.",
  "Aanmelden mislukt.": "Sign in failed.",
  "Test met een demozorgcentrum": "Test with a demo care centre",
  "centra": "centres",
  "Zoek op centrum of gemeente": "Search by centre or city",
  "Bijv. Antwerpen of Brussel": "E.g. Antwerp or Brussels",
  "Geen centrum gevonden.": "No centre found.",
  "Typ een naam of gemeente om verder te zoeken.": "Type a name or city to search further.",
  "Gekozen": "Selected",
  "Vul nu het testwachtwoord in.": "Now enter the test password.",
  "E-mailadres": "Email address",
  "Wachtwoord": "Password",
  "Aanmelden": "Sign in",
  "Portaalnavigatie": "Portal navigation",
  "Afmelden en wissel zorgcentrum": "Sign out and switch care centre",
  "Uw zorgcentrum": "Your care centre",
  "Meldingen": "Notifications",
  "Profiel": "Profile",
  "Alles wat u nodig heeft voor een vlotte samenwerking met Global Smile Care.": "Everything you need for smooth collaboration with Global Smile Care.",
  "Volgende afspraak": "Next appointment",
  "Geen gepland": "None planned",
  "Nieuwe afspraken verschijnen hier": "New appointments appear here",
  "Open urgenties": "Open urgencies",
  "Bekijk de laatste meldingen": "View the latest reports",
  "Diensten deze maand": "Services this month",
  "Geplande zorgactiviteiten": "Planned care activities",
  "Planning": "Scheduling",
  "Aankomende afspraken": "Upcoming appointments",
  "Alle afspraken": "All appointments",
  "Opvolging": "Follow-up",
  "Nieuwe urgentie melden": "Report new urgency",
  "Komende afspraken": "Upcoming appointments",
  "Vorige afspraken": "Previous appointments",
  "Zorgactiviteiten": "Care activities",
  "Diensten": "Services",
  "Geplande diensten": "Planned services",
  "Uitgevoerde diensten": "Completed services",
  "Datum": "Date",
  "Bewoner": "Resident",
  "Type": "Type",
  "Tandpijn": "Toothache",
  "Ontsteking": "Infection",
  "Prothese gebroken": "Prosthesis broken",
  "Andere": "Other",
  "Opmerking": "Remark",
  "Urgentie versturen": "Send urgency",
  "Er zijn geen afspraken gepland.": "No appointments are planned.",
  "Er zijn geen diensten in deze periode.": "No services in this period.",
  "Er zijn geen urgenties.": "No urgencies.",
  "Geen extra opmerking": "No additional remark",
};

function t(lang: Lang, key: string) { return lang === "en" ? enLabels[key] || key : key; }

function getSavedLang(): Lang {
  try { const v = localStorage.getItem("gsc-lang"); if (v === "en" || v === "nl") return v; } catch {}
  return "nl";
}

function dateLabel(value: string, lang: Lang = "nl") { return new Intl.DateTimeFormat(lang === "nl" ? "nl-BE" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }

function PortalLogin({ onLogin, lang, L }: { onLogin: () => Promise<void>; lang: Lang; L: (k: string) => string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [demoCentres, setDemoCentres] = useState<PortalDemoCentre[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  useEffect(() => { portalApi.demoCentres().then(setDemoCentres).catch(() => setDemoCentres([])); }, []);
  const matches = demoCentres.filter((centre) => `${centre.name} ${centre.city} ${centre.email}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="portal-login"><section className="portal-login-card"><div className="portal-mark">✦</div><p className="portal-kicker">Global Smile Care</p><h1>{L("Welkom bij uw zorgcentrum")}</h1><p className="portal-muted">{L("Meld u aan om afspraken, diensten en urgenties te bekijken.")}</p><form onSubmit={async (event) => { event.preventDefault(); setError(""); try { await portalApi.login(email, password); await onLogin(); } catch (cause) { setError(cause instanceof Error ? cause.message : L("Aanmelden mislukt.")); } }}>
    {demoCentres.length > 0 && <div className="portal-demo-picker"><div className="portal-demo-heading"><strong>{L("Test met een demozorgcentrum")}</strong><span>{demoCentres.length} {L("centra")}</span></div><label>{L("Zoek op centrum of gemeente")}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={L("Bijv. Antwerpen of Brussel")} /></label><div className="portal-demo-options">{matches.slice(0, 6).map((centre) => <button type="button" key={centre.email} className={email === centre.email ? "selected" : ""} onClick={() => { setEmail(centre.email); setSelected(centre.name); setSearch(centre.city); }}><span><strong>{centre.name}</strong><small>{centre.city}</small></span><span>›</span></button>)}{matches.length === 0 && <p>{L("Geen centrum gevonden.")}</p>}{matches.length > 6 && <p>{L("Typ een naam of gemeente om verder te zoeken.")}</p>}</div>{selected && <p className="portal-demo-selected">{L("Gekozen")}: {selected}. {L("Vul nu het testwachtwoord in.")}</p>}</div>}
    <label>{L("E-mailadres")}<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSelected(""); }} required /></label><label>{L("Wachtwoord")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="portal-error">{error}</p>}<button className="portal-primary" type="submit">{L("Aanmelden")}</button></form></section></main>;
}

export function PortalApp() {
  const [lang] = useState<Lang>(getSavedLang);
  const L = (key: string) => t(lang, key);
  const nav = lang === "en" ? navEn : navNl;
  const [me, setMe] = useState<PortalMe | null>(null); const [view, setView] = useState<View>("overview"); const [appointments, setAppointments] = useState<PortalAppointment[]>([]); const [services, setServices] = useState<PortalService[]>([]); const [urgencies, setUrgencies] = useState<PortalUrgency[]>([]); const [showUrgencyForm, setShowUrgencyForm] = useState(false); const [form, setForm] = useState({ reported_on: new Date().toISOString().slice(0, 10), patient_name: "", urgency_type: "Tandpijn", remark: "" });
  const load = async () => { const identity = await portalApi.me(); setMe(identity); const [nextAppointments, nextServices, nextUrgencies] = await Promise.all([portalApi.appointments(), portalApi.services(), portalApi.urgencies()]); setAppointments(nextAppointments); setServices(nextServices); setUrgencies(nextUrgencies); };
  useEffect(() => { if (portalApi.token()) load().catch(() => portalApi.logout()); }, []);
  const openUrgencies = useMemo(() => urgencies.filter((item) => item.status.toLowerCase() === "open").length, [urgencies]);
  const today = new Date().toLocaleDateString("sv-SE");
  const upcomingAppointments = useMemo(() => appointments.filter((item) => item.date >= today && !["Geannuleerd", "Uitgevoerd"].includes(item.status)).sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)), [appointments, today]);
  const pastAppointments = useMemo(() => appointments.filter((item) => item.date < today || item.status === "Uitgevoerd").sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`)), [appointments, today]);
  const upcomingServices = useMemo(() => services.filter((item) => item.date >= today && item.status !== "Uitgevoerd"), [services, today]);
  const pastServices = useMemo(() => services.filter((item) => item.date < today || item.status === "Uitgevoerd"), [services, today]);
  const upcoming = upcomingAppointments[0];
  const servicesThisMonth = useMemo(() => services.filter((item) => item.date.slice(0, 7) === today.slice(0, 7)).length, [services, today]);
  const switchCentre = () => { portalApi.logout(); setMe(null); setView("overview"); setAppointments([]); setServices([]); setUrgencies([]); };
  if (!me) return <PortalLogin onLogin={load} lang={lang} L={L} />;
  const title = nav.find(([key]) => key === view)?.[2] || (lang === "nl" ? "Overzicht" : "Overview");
  return <main className="portal-shell"><aside className="portal-sidebar"><div className="portal-brand"><span className="portal-brand-mark">✦</span><span>Global Smile<br /><strong>Care</strong></span></div><nav aria-label={L("Portaalnavigatie")}>{nav.map(([key, icon, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}><span className="portal-nav-icon">{icon}</span>{label}</button>)}</nav><div className="portal-sidebar-foot"><div className="portal-account"><div className="portal-avatar">{me.wzc_name.slice(0, 1)}</div><div><strong title={me.wzc_name}>{me.wzc_name}</strong><small title={me.email}>{me.email}</small></div></div><button className="portal-switch" aria-label={L("Afmelden en wissel zorgcentrum")} title={L("Afmelden en wissel zorgcentrum")} onClick={switchCentre}>{L("Afmelden en wissel zorgcentrum")}</button></div></aside><section className="portal-content"><header className="portal-topbar"><div className="portal-breadcrumb">{L("Uw zorgcentrum")} <span>/</span> {title}</div><div className="portal-top-actions"><button aria-label={L("Meldingen")}>♧<i /></button><button aria-label={L("Profiel")} className="portal-user-button">{me.wzc_name.slice(0, 1)}</button></div></header>
    {view === "overview" && <><section className="portal-hero"><div><p className="portal-kicker">{me.wzc_name}</p><h1>{L("Welkom bij uw zorgcentrum")}</h1><p>{L("Alles wat u nodig heeft voor een vlotte samenwerking met Global Smile Care.")}</p></div><div className="portal-building" aria-hidden="true"><div className="portal-cloud cloud-one" /><div className="portal-cloud cloud-two" /><div className="portal-trees" /><div className="portal-building-body"><span /><span /><span /><span /><span /><span /></div></div></section><section className="portal-metrics"><button className="metric metric-mint" onClick={() => setView("appointments")}><span className="metric-icon">▣</span><span><small>{L("Volgende afspraak")}</small><strong>{upcoming ? `${dateLabel(upcoming.date, lang)} ${lang === "nl" ? "om" : "at"} ${upcoming.start_time}` : L("Geen gepland")}</strong><em>{upcoming?.type || L("Nieuwe afspraken verschijnen hier")}</em></span><b>›</b></button><button className="metric metric-gold" onClick={() => setView("urgencies")}><span className="metric-icon">△</span><span><small>{L("Open urgenties")}</small><strong>{openUrgencies}</strong><em>{L("Bekijk de laatste meldingen")}</em></span><b>›</b></button><button className="metric metric-blue" onClick={() => setView("services")}><span className="metric-icon">♧</span><span><small>{L("Diensten deze maand")}</small><strong>{servicesThisMonth}</strong><em>{L("Geplande zorgactiviteiten")}</em></span><b>›</b></button></section><section className="portal-panels"><article className="portal-panel"><div className="panel-heading"><div><p className="portal-kicker">{L("Planning")}</p><h2>{L("Aankomende afspraken")}</h2></div><button onClick={() => setView("appointments")}>{L("Alle afspraken")} <span>›</span></button></div><AppointmentList items={upcomingAppointments.slice(0, 5)} lang={lang} /></article><article className="portal-panel"><div className="panel-heading"><div><p className="portal-kicker">{L("Opvolging")}</p><h2>{L("Urgenties")}</h2></div><button className="portal-cta" onClick={() => { setView("urgencies"); setShowUrgencyForm(true); }}>＋ {L("Nieuwe urgentie melden")}</button></div><UrgencyList items={urgencies.slice(0, 4)} lang={lang} /></article></section></>}
    {view === "appointments" && <section className="portal-page-section"><p className="portal-kicker">{L("Planning")}</p><h1>{lang === "nl" ? "Afspraken" : "Appointments"}</h1><div className="portal-panel"><h2>{L("Komende afspraken")}</h2><AppointmentList items={upcomingAppointments} lang={lang} /></div><div className="portal-panel portal-history"><h2>{L("Vorige afspraken")}</h2><AppointmentList items={pastAppointments} lang={lang} /></div></section>}
    {view === "services" && <section className="portal-page-section"><p className="portal-kicker">{L("Zorgactiviteiten")}</p><h1>{L("Diensten")}</h1><div className="portal-panel"><h2>{L("Geplande diensten")}</h2><ServiceList items={upcomingServices} lang={lang} /></div><div className="portal-panel portal-history"><h2>{L("Uitgevoerde diensten")}</h2><ServiceList items={pastServices} lang={lang} /></div></section>}
    {view === "urgencies" && <section className="portal-page-section"><div className="portal-page-title"><div><p className="portal-kicker">{L("Opvolging")}</p><h1>{L("Urgenties")}</h1></div><button className="portal-cta" onClick={() => setShowUrgencyForm((value) => !value)}>＋ {L("Nieuwe urgentie melden")}</button></div>{showUrgencyForm && <form className="portal-panel portal-urgency-form" onSubmit={async (event) => { event.preventDefault(); await portalApi.createUrgency(form); setForm({ ...form, patient_name: "", remark: "" }); setUrgencies(await portalApi.urgencies()); setShowUrgencyForm(false); }}><label>{L("Datum")}<input type="date" value={form.reported_on} onChange={(event) => setForm({ ...form, reported_on: event.target.value })} required /></label><label>{L("Bewoner")}<input value={form.patient_name} onChange={(event) => setForm({ ...form, patient_name: event.target.value })} required /></label><label>{L("Type")}<select value={form.urgency_type} onChange={(event) => setForm({ ...form, urgency_type: event.target.value })}><option>{L("Tandpijn")}</option><option>{L("Ontsteking")}</option><option>{L("Prothese gebroken")}</option><option>{L("Andere")}</option></select></label><label>{L("Opmerking")}<textarea value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} /><button className="portal-primary" type="submit">{L("Urgentie versturen")}</button></label></form>}<div className="portal-panel"><UrgencyList items={urgencies} lang={lang} /></div></section>}
  </section></main>;
}

function AppointmentList({ items, lang }: { items: PortalAppointment[]; lang: Lang }) { const L = (k: string) => t(lang, k); return <div className="portal-list">{items.length === 0 && <p className="portal-empty">{L("Er zijn geen afspraken gepland.")}</p>}{items.map((item) => <div className="portal-list-row" key={item.id}><strong>{dateLabel(item.date, lang)}</strong><span>{item.start_time}–{item.end_time}</span><small>{item.type}</small><em>{item.status}</em></div>)}</div>; }
function ServiceList({ items, lang }: { items: PortalService[]; lang: Lang }) { const L = (k: string) => t(lang, k); return <div className="portal-list">{items.length === 0 && <p className="portal-empty">{L("Er zijn geen diensten in deze periode.")}</p>}{items.map((item) => <div className="portal-list-row" key={item.id}><strong>{dateLabel(item.date, lang)}</strong><span>{item.type}</span><small>{item.summary}</small><em>{item.status}</em></div>)}</div>; }
function UrgencyList({ items, lang }: { items: PortalUrgency[]; lang: Lang }) { const L = (k: string) => t(lang, k); return <div className="portal-list">{items.length === 0 && <p className="portal-empty">{L("Er zijn geen urgenties.")}</p>}{items.map((item) => <div className="portal-list-row urgency-row" key={item.id}><span className={`status-pill ${item.status.toLowerCase() === "open" ? "status-open" : "status-progress"}`}>{item.status}</span><strong>{item.urgency_type}</strong><small>{item.remark || L("Geen extra opmerking")}</small><em>{dateLabel(item.reported_on, lang)}</em></div>)}</div>; }

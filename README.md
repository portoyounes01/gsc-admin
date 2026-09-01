# Global Smile Care Dashboard Beta

Nieuwe beta zonder Streamlit.

Stack:
- React + Vite frontend
- FastAPI backend
- PostgreSQL database
- Docker Compose voor lokale en Linux-testomgeving

## Privacy uitgangspunten

- Geen patientendatabank naast DentAdmin.
- INSZ, medicatie en patientdetails worden niet in audit logs opgeslagen.
- Wachtwoorden worden gehasht opgeslagen.
- Secrets staan in `.env`, niet in code.
- Audit logs zijn metadata en bedoeld voor korte bewaartermijn.

## Lokaal starten

1. Maak `.env` aan op basis van `.env.example`.
2. Start de stack:

```bash
docker compose up --build
```

3. Open:

```text
Frontend: http://localhost:5173
Backend health: http://localhost:8000/health
Geocoding health: http://localhost:8000/health/geocoding
API docs: http://localhost:8000/docs
```

Bij eerste start maakt de backend automatisch een admingebruiker aan via:

```text
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
```

Gebruik dit enkel voor beta/test en wijzig het servermatig in `.env`.

## Bestaande data migreren

Vanuit de map `backend`:

```bash
DATABASE_URL=postgresql+psycopg://gsc:gsc@localhost:5432/gsc_dashboard \
python -m app.scripts.import_legacy \
  --workbook "../../data/WZC_evaluatie_overzicht_Global_Smile_Care.xlsx" \
  --team-profiles "../../data/team_profiles.json"
```

Deze migratie importeert:
- WZC masterdata
- WZC prospecties
- teamprofielen

Niet automatisch geimporteerd:
- mondzorgdossiergegevens
- patientdata uit losse PDFs
- plaintext wachtwoorden

## Beta SQLite-data naar PostgreSQL kopieren

Gebruik dit alleen voor de beta-app zonder Streamlit. Zet het SQLite-bestand rechtstreeks op de server, niet via GitHub:

```bash
scp tmp/local_beta.db py10099@server:/var/python/py10099/local_beta.db
```

Daarna op de Python component:

```bash
cd ~/app/Dashboard/backend
python -m app.scripts.migrate_sqlite_to_postgres --source ~/local_beta.db --dry-run
python -m app.scripts.migrate_sqlite_to_postgres --source ~/local_beta.db --replace
```

Het script gebruikt standaard `DATABASE_URL` uit `backend/.env`. `--replace` maakt de doel-tabellen eerst leeg en kopieert daarna de SQLite-data. Verwijder het tijdelijke SQLite-bestand na controle:

```bash
rm ~/local_beta.db
```

## Eerste beta-scope

Aanwezig in deze scaffold:
- login + rollen
- WZC masterdatabase
- WZC kaart met urgentie-indicator
- prospectie pipeline
- planning-agenda voor screeningdagen en behandeldagen
- urgenties aanmaken en afronden
- urgenties routeplanning op basis van geselecteerde open meldingen
- behandelplanning PDF-preview
- behandelplanning bewaren
- Excel export
- admin users
- user log

Nog uit te werken voor server-beta:
- productie reverse proxy + HTTPS
- echte database migraties met Alembic
- backups en restoreprocedure
- strengere rollen/machtigingen per module
- betere kaartlaag met MapLibre of Leaflet
- uitgebreidere validatie/testen

## Serververeisten voor adresherkenning

Voor het automatisch invullen van latitude/longitude moet de Linux-server outbound HTTPS toelaten:

- TCP 443 naar `geo.api.vlaanderen.be`
- TCP 443 naar `photon.komoot.io`
- TCP 443 naar `nominatim.openstreetmap.org`
- DNS-resolutie vanaf de server

Dit staat in de app expliciet aan met:

```text
GEOCODING_OUTBOUND_ENABLED=true
```

Controleer dit na deployment via:

```text
http://localhost:8000/health/geocoding
```

Deze check gebruikt alleen een publiek testadres en verstuurt geen patient-, dossier- of WZC-data.

## Kaartlaag

De WZC-kaart en routekaart gebruiken standaard de CARTO **Positron vector basemap** via MapLibre. Dit is de vector-equivalent van de vroegere CARTO `light_all` rasterkaart en blijft scherper bij inzoomen en op retina-schermen. Als de vectorlaag niet kan laden, valt de app terug op de CARTO `light_all` rasterlaag.

CARTO vereist voor basemaps sinds augustus 2026 een gratis basemap API key. Vraag de key aan via:

```text
https://carto.com/basemaps/apikey/
```

Zet daarna in `.env`:

```text
VITE_CARTO_BASEMAP_KEY=...
```

Herstart de frontend nadat deze waarde is aangepast. Vite leest `VITE_` variabelen bij het starten/bouwen van de frontend.

## Routeplanning bij urgenties

In de beta zit routeplanning in het onderdeel **Urgenties**. De berekening gebeurt server-side via:

- geselecteerde open urgenties
- WZC latitude/longitude
- vast startpunt: Global Smile Lokeren of Praktijk Antwerpen
- optioneel eindpunt
- aantal routes
- standaard bezoektijd per urgentie
- optionele maximale duur per route
- uitvoeringsdatum, zodat routeplannen per dag bewaard en teruggevonden kunnen worden

Standaard staat de routeprovider op `estimate`. Dat houdt de beta lokaal bruikbaar zonder externe API, maar de UI markeert dit duidelijk als benaderde rijtijdmatrix. Voor echte rijtijden over het wegennet kan een OSRM-server worden gebruikt. OSRM is snel en goed voor een vaste wegennetmatrix, maar bevat geen actuele verkeersdrukte:

```text
ROUTING_PROVIDER=osrm
ROUTING_OUTBOUND_ENABLED=true
ROUTING_OSRM_BASE_URL=https://router.project-osrm.org
```

Voor een volgorde die rekening houdt met actuele verkeersduur is `google_routes` de meest praktische productie-optie:

```text
ROUTING_PROVIDER=google_routes
ROUTING_OUTBOUND_ENABLED=true
ROUTING_GOOGLE_API_KEY=...
ROUTING_GOOGLE_ROUTING_PREFERENCE=TRAFFIC_AWARE
ROUTING_MATRIX_CACHE_SECONDS=300
```

De planner stuurt alleen coordinaten naar de provider, geen patientnamen, klachten of opmerkingen. Matrixresultaten worden kort gecachet via `ROUTING_MATRIX_CACHE_SECONDS`. Bij een ontbrekende of falende provider valt de backend terug op `estimate` en toont de UI dat als schatting.

Elke berekende route krijgt ook een Google Maps-link met `origin`, `destination`, `waypoints`, `travelmode=driving` en `dir_action=navigate`. Die link bevat alleen coordinaten en kan naar een telefoon gedeeld of gekopieerd worden. Google Maps gebruikt bij het openen zelf actuele navigatie-informatie, maar dat maakt de eerder berekende volgorde niet automatisch traffic-aware. Daarvoor moet de backend op `google_routes` draaien met een Google Maps Platform key.

Berekende routes kunnen worden opgeslagen als dagsnapshot. De UI toont opgeslagen routeplannen onder **Aangemaakte routes** voor de gekozen uitvoeringsdatum. In het snelle overzicht toont elke stop een ruim aankomstvenster van ongeveer een uur, afgerond op halve uren, bijvoorbeeld `tussen 09:30 en 10:30`; de exacte berekende tijd blijft beschikbaar in de uitgeklapte timing.

Datums worden zichtbaar Europees getoond als `dd-mm-yyyy`. HTML-datumvelden bewaren intern `yyyy-mm-dd`, zoals browsers en API's verwachten.

## Planning-agenda

De navigatie bevat een aparte tab **Planning** voor operationele dagplanning. Deze gebruikt dezelfde `plannings`-tabel als de bestaande **Behandelplanning**, aangevuld met agenda-velden:

- type: screening of behandeldag
- datum, startuur en einduur
- status: concept, gepland, bevestigd, uitgevoerd of geannuleerd
- WZC, teamlabel en interne notitie

De **Planning**-tab geeft een maand- en lijstoverzicht. **Behandelplanning** blijft de aparte werkruimte om bewonerslijsten/PDF's in te lezen, te controleren en naar Excel te exporteren.

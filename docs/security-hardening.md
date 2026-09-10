# Security hardening: sessies en veilige browsercookies

Status: lokaal geïmplementeerd op `security/hardening`. Geen deployment of push uitgevoerd.

## Wat deze wijziging doet

- Routekleuren worden bij nieuw opslaan beperkt tot `#RRGGBB`. Eerder opgeslagen onveilige kleuren krijgen een veilige kleur in de API-response; de oorspronkelijke gegevens worden niet herschreven. Leaflet ontvangt voor dynamische markers een DOM-element met `textContent`, geen HTML-template.
- Excel schrijft tekst expliciet als stringcellen, ook bij `=`, `+`, `-`, `@` en spreadsheetfoutcodes. Numerieke patiëntnummers, checklistvalidatie en conditionele opmaak blijven werken. Dit geldt voor behandelplanning en screening.
- Productie weigert te starten zonder een voldoende lange willekeurige secret, expliciete HTTPS-origins en niet-standaard PostgreSQL-credentials. Bootstrapaccounts zijn in productie verboden. Er wordt geen standaardaccount meer automatisch aangemaakt.
- De oude HMAC-access-tokens en `Authorization: Bearer` worden niet meer geaccepteerd. De frontend verwijdert de oude `gsc_token` uit localStorage en leest deze nooit meer.
- Authenticatie gebruikt server-side sessies met een willekeurig token van 32 bytes. Alleen een HMAC-SHA256-afleiding wordt in de database opgeslagen. De sessie-ID in API-responses is een afzonderlijke, niet-authenticerende identifier.
- Iedere beschermde aanvraag controleert database-status, actieve gebruiker, een accountfingerprint, absolute vervaltijd en inactiviteit. De huidige rol wordt uit de database gelezen.
- Logout trekt de huidige sessie in. “Overal afmelden” trekt alle sessies van de gebruiker in. Admins kunnen via gebruikersbeheer alle sessies van een gebruiker intrekken. Wachtwoord-, rol- en activiteitswijzigingen trekken diens sessies eveneens in; verwijderen ruimt de sessierijen op.
- De fingerprint bindt een sessie ook aan de wachtwoordhash en het oorspronkelijke account. Dit beschermt tegen een wachtwoordwijziging buiten de API en hergebruik van numerieke gebruikers-ID's.
- Alle API-responses, waaronder fouten en exports, krijgen `Cache-Control: no-store`, `Pragma: no-cache` en `X-Content-Type-Options: nosniff`.
- Het dashboard wordt bij afmelden of verlopen van de sessie volledig ontkoppeld, zodat dossiers, planning en formulieren niet in de volgende gebruikerssessie verschijnen. Late responses worden verworpen. Sessiewijzigingen worden zonder persoonsgegevens of tokens aan andere tabbladen gemeld.

## Cookie- en CSRF-contract

| Onderdeel | Productie | Lokaal/test |
|---|---|---|
| Sessiecookienaam | `__Host-gsc_session` | `gsc_session_local` |
| Login-CSRF-cookie | `__Host-gsc_csrf` | `gsc_csrf_local` |
| HttpOnly | Ja, beide cookies | Ja, beide cookies |
| Secure | Ja | Nee, uitsluitend HTTP op loopback |
| SameSite | Strict | Strict |
| Domain | Niet ingesteld, host-only | Niet ingesteld |
| Path | `/` | `/` |
| Absolute sessieduur | Standaard 480 minuten, configureerbaar | Idem |
| Inactiviteit | Standaard 30 minuten, configureerbaar | Idem |

De frontend gebruikt standaard relatieve `/api`-URL's. Vite proxyt lokaal naar `127.0.0.1:8000`; zo werkt dezelfde configuratie op `localhost` en `127.0.0.1`. Meng deze hosts niet voor directe cross-origin API-configuraties.

1. `GET /auth/csrf` geeft een CSRF-token terug en, vóór login, een HttpOnly challenge-cookie. Die challenge is ondertekend en tien minuten geldig.
2. `POST /auth/login` vereist zowel een exacte toegestane `Origin` als `X-CSRF-Token`. Bij succes wordt de sessie geroteerd en de eventuele vorige cookiesessie ingetrokken.
3. Voor aangemelde requests wordt CSRF cryptografisch aan de sessiecookie gebonden. Het CSRF-token blijft alleen in JavaScript-geheugen en verleent op zichzelf geen toegang.
4. Alle `POST`, `PUT`, `PATCH` en `DELETE` requests vereisen Origin én CSRF, ook login, logout en multipart-uploads. Ontbrekende Origin wordt geweigerd. Controle gebeurt vóór het parsen van het requestbody.
5. De frontend gebruikt `credentials: include` en `cache: no-store`, ook voor Excel. Mutaties worden na een CSRF-fout niet automatisch herhaald.

`HttpOnly` beperkt het uitlezen van cookies door JavaScript; het voorkomt niet dat een XSS requests namens de gebruiker uitvoert. Daarom zijn XSS-preventie en later een passende CSP nog steeds nodig.

## Nieuwe en gewijzigde endpoints

Routes hieronder zijn backendpaden; via de frontendproxy komt er `/api` voor.

| Method | Route | Toegang | Gedrag |
|---|---|---|---|
| GET | `/auth/csrf` | Openbaar, antwoord afgeschermd door same-origin/CORS | Login/session CSRF-token, geen persoonsgegevens |
| POST | `/auth/login` | Origin + CSRF + geldige credentials | Cookie, gebruiker, CSRF, sessie-ID en deadline; geen bearer token |
| GET | `/auth/session` | Geldige sessie | Gebruiker, CSRF, sessie-ID en deadline voor sessieherstel |
| GET | `/auth/me` | Geldige sessie | Bestaande gebruikersresponse blijft beschikbaar |
| POST | `/auth/logout` | Origin + CSRF | Huidige sessie intrekken en cookies wissen; ook bij verlopen sessie |
| POST | `/auth/logout-all` | Geldige sessie + Origin + CSRF | Alle eigen sessies intrekken |
| POST | `/users/{id}/revoke-sessions` | Admin + Origin + CSRF | Alle sessies van gekozen gebruiker intrekken |

Een al geautoriseerd request dat op het moment van intrekking bezig is, kan nog afronden. Volgende requests worden geweigerd. Wachtwoord/rolwijzigingen en sessie-uitgifte vergrendelen dezelfde gebruikersrij op PostgreSQL. SQLite blijft de lokale testdatabase.

## Wachtwoord wijzigen via gebruikersbeheer

Onder **WZC database → Gebruikers → Wachtwoord wijzigen** kan een admin een nieuw wachtwoord invullen en herhalen. Alleen gelijke invoer wordt verstuurd, via het bestaande adminendpoint met CSRF-beveiliging. Opslaan trekt alle sessies van de gekozen gebruiker in; bij het eigen account volgt opnieuw aanmelden. Annuleren, een andere gebruiker kiezen of het tabblad verlaten verwijdert het formulier en de ingevoerde waarden. Wachtwoorden komen niet in browseropslag of succesmeldingen terecht. De bestaande wachtwoordlengtevalidatie blijft gelden; een strengere password-policy blijft een afzonderlijke vervolgstap.

Aanvullend voor dit formulier: 46 backend-securitytests en 10 frontendtests geslaagd, plus TypeScript en productiebuild. Openen, lay-out, annuleren en focusherstel zijn in de browser met synthetische gegevens gecontroleerd; wachtwoordwijzigingen zelf zijn uitsluitend in geautomatiseerde tests uitgevoerd.

## Database en bestaande accounts

De wijziging voegt uitsluitend de tabel `user_sessions` toe via het bestaande `Base.metadata.create_all()` bij opstart. Bestaande gebruikers, password hashes en applicatiegegevens worden niet gemigreerd of gereset. Verlopen sessies worden bij opstart verwijderd. Maak vóór een latere productie-uitrol een gecontroleerde databaseback-up en voorzie de tabel bij voorkeur via een afzonderlijke migratierol.

Bestaande gebruikers moeten opnieuw aanmelden; oude bearer tokens zijn ongeldig. Bestaande wachtwoorden blijven werken. Wijzig bekende of zwakke beta-wachtwoorden vóór productie: het uitschakelen van bootstrap verwijdert geen bestaande accounts. Password-reset, Argon2id/hash-upgrade, MFA en brute-forcebescherming zitten niet in deze wijziging.

Verlies of rotatie van `SECRET_KEY` maakt alle bestaande sessies ongeldig. Gebruik dezelfde stabiele key voor alle productieprocessen. Zonder ingestelde key wordt lokaal bij iedere processtart een tijdelijke willekeurige key gemaakt: een backendherstart vraagt dan opnieuw aanmelden. Gebruik lokaal één worker of een eigen stabiele key in het genegeerde `backend/.env`.

## Lokaal draaien zonder Docker

Vanuit `backend` met de bestaande virtualenv:

```bash
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`backend/.env` mag de bestaande SQLite `DATABASE_URL` bevatten. De standaard SQLite-locatie is `../tmp/local_beta.db`; zorg dat de map `tmp` bestaat. De applicatie maakt zonder expliciete lokale bootstrapinstellingen geen gebruiker aan.

Vanuit `frontend`:

```bash
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173` of `http://localhost:5173`. Backendhealth blijft `http://127.0.0.1:8000/health`. Een oude frontendtab moet vernieuwd worden. Controleer bij verbindingsproblemen eerst of beide processen draaien.

`docker-compose.yml` is uitsluitend voor lokale ontwikkeling: poorten zijn aan loopback gebonden; Vite gebruikt binnen Docker `API_PROXY_TARGET=http://backend:8000`. Deze Compose-file bevat nog ontwikkelcredentials voor de lokale database en is geen productieconfiguratie.

## Voorbereiding op een latere productie-uitrol

Er is niets op Level27 aangepast. De meegeleverde Nginx-configuratie geldt alleen voor de frontendproductiecontainer uit deze repository. Een Level27-component die `node server.js` gebruikt moet equivalent `/api/` naar de backend doorsturen; deze repository bevat geen `server.js` en kan die serverconfiguratie dus niet automatisch aanpassen.

Vereiste instellingen:

```dotenv
ENVIRONMENT=production
CORS_ORIGINS=https://app.globalsmilecare.be
SESSION_ABSOLUTE_MINUTES=480
SESSION_IDLE_MINUTES=30
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
VITE_API_URL=/api
```

Stel daarnaast `SECRET_KEY` in via secretsbeheer, gegenereerd uit ten minste 32 willekeurige bytes; de configuratie verwacht een geëncodeerde waarde van minstens 43 tekens. Stel `DATABASE_URL` in met een aparte applicatierol en sterk wachtwoord. De configuratie kan de daadwerkelijke databaseprivileges niet verifiëren: controleer afzonderlijk dat deze rol geen superuser is en gebruik een migratierol voor DDL.

De publieke HTTPS-proxy moet `/api/` op dezelfde host naar backendpoort 8000 sturen, de originele Origin doorgeven en `Set-Cookie`/CSRF-headers ongemoeid laten. Het interne Nginx-voorbeeld termineert zelf geen TLS en begrenst requests op 25 MB. Stem uploadlimieten voor de volledige keten af vóór productie. Houd frontendcontainer, backend, database en managementpoorten achter de proxy/IP-whitelist. HSTS, CSP, framebeleid, uploadlimieten en rate limiting moeten nog op de productie-infrastructuur én waar nodig in de applicatie worden uitgewerkt. Swagger/geocoding-health zijn in deze wijziging nog niet afgeschermd.

Productiecontrole vóór uitrol: verifieer Secure-cookieacceptatie via echte HTTPS, proxygedrag, PostgreSQL-transacties en meerdere workers met dezelfde key. Er is lokaal geen Level27- of live PostgreSQL-test uitgevoerd.

## Regressiecontroles

Uitgevoerd op 10 september 2026: 50 backendtests en 8 frontendtests geslaagd; TypeScript-controle, axioscontrole, productiebuild en `git diff --check` geslaagd. De lokale backend en `/api`-proxy geven HTTP 200 met `Cache-Control: no-store`. Na de lokale herstart zijn de bestaande accounts en wachtwoordhashes vergeleken met de back-up: ongewijzigd.

Backend, vanuit `backend`:

```bash
DATABASE_URL=sqlite:// GEOCODING_OUTBOUND_ENABLED=false ROUTING_OUTBOUND_ENABLED=false PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -q -p no:cacheprovider
```

De securitytests gebruiken tijdelijke SQLite-databases en synthetische accounts; ze starten de normale app niet tegen de lokale gebruikersdatabase. `pytest` is een testdependency en moet in de ontwikkelomgeving beschikbaar zijn.

Frontend, vanuit `frontend`:

```bash
node --test tests/security.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/forbid-axios.mjs
node node_modules/vite/bin/vite.js build
```

Ook in een echte browser is met een tijdelijke SQLite-database en synthetisch account gecontroleerd: login, sessieherstel na vernieuwen, een urgentie opslaan, overal afmelden in twee tabbladen en opnieuw vernieuwen na logout.

De frontendtests testen de echte API-wrapper en RoutePlanMap met nagebootste transport-/DOM-/Leaflet-interfaces. Ze vervangen geen browsertest van cookiebeleid of visuele gebruikersflows.

## Bewust volgende stappen

WZC/resource-autorisatie, uitgebreidere RBAC-tests, uploadvalidatie/malwarescanning, gedeelde rate limiting, password-policy/hash-upgrade, volledige CSP/securityheaders en bescherming/bewaarbeleid van auditlogs blijven open uit de audit. Deze sessiewijziging maakt de applicatie op zichzelf nog niet gereed voor gevoelige persoonsgegevens in productie.

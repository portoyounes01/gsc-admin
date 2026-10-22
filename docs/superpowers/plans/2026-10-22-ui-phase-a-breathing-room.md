# UI Phase A — Breathing Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase spacing, soften border-radius, and lighten border colors across the dashboard to eliminate the cramped feeling — CSS only, zero functional changes.

**Architecture:** All changes are in a single file: `frontend/src/styles.css`. No TypeScript, no components, no logic. Each task is an independent group of CSS property edits verified by grep + visual browser check.

**Tech Stack:** Vite + React + TypeScript. Dev server: `cd frontend && npm run dev` (serves on port 5173 by default).

## Global Constraints

- Modify `frontend/src/styles.css` only — no `.tsx`, `.ts`, or other files.
- Do NOT touch lines 4278–4484 (portal section, minified CSS at the bottom of the file).
- Do NOT change: sidebar `border-radius: 20px`, pills/badges `border-radius: 999px`, the GSC color tokens.
- The brand colors `#86c8ae`, `#2f6f62`, `#2e6f95` must remain unchanged.
- After all tasks: run `cd frontend && npm run build` — must pass with zero errors.

---

### Task 1: Core layout spacing — appShell, panel, KPI cards

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
- `.appShell` gap: `24px → 28px`
- `.panel` padding: `18px → 24px`
- `.kpi` padding: `1rem → 1.25rem`
- `.kpi` min-height: `104px → 120px`

- [ ] **Step 1: Verify current values exist**

```bash
grep -n "gap: 24px" frontend/src/styles.css | head -5
grep -n "padding: 18px" frontend/src/styles.css | head -5
grep -n "padding: 1rem" frontend/src/styles.css | head -5
grep -n "min-height: 104px" frontend/src/styles.css
```

Expected: each grep hits at least once in the non-portal section (lines < 4278).

- [ ] **Step 2: Apply the changes**

In `frontend/src/styles.css`, find `.appShell` (~line 408) and change:
```css
/* BEFORE */
.appShell {
  display: grid;
  grid-template-columns: clamp(14rem, 15vw, 18.25rem) minmax(0, 1fr);
  gap: 24px;

/* AFTER */
.appShell {
  display: grid;
  grid-template-columns: clamp(14rem, 15vw, 18.25rem) minmax(0, 1fr);
  gap: 28px;
```

Find `.panel` (~line 788) and change:
```css
/* BEFORE */
.panel {
  padding: 18px;
}

/* AFTER */
.panel {
  padding: 24px;
}
```

Find `.kpi` (~line 753) and change:
```css
/* BEFORE */
.kpi {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 0.35rem;
  padding: 1rem;
  min-height: 104px;
}

/* AFTER */
.kpi {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 0.35rem;
  padding: 1.25rem;
  min-height: 120px;
}
```

- [ ] **Step 3: Verify the new values**

```bash
grep -n "gap: 28px" frontend/src/styles.css
grep -n "padding: 24px;" frontend/src/styles.css | head -5
grep -n "min-height: 120px" frontend/src/styles.css
```

Expected: each returns at least one match.

- [ ] **Step 4: Start dev server and visual check**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` in browser. Log in and go to **Home**. The KPI cards and panels should look noticeably more spacious. The content area should have a slightly wider gap from the sidebar.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase core layout spacing — panel, kpi, appShell"
```

---

### Task 2: List / row / card spacing

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
`.listRow`, `.recordCard`, `.pipelineRow`, `.portfolioRow`, `.databaseRow` padding: `13px → 16px`

- [ ] **Step 1: Verify current value**

```bash
grep -n "padding: 13px;" frontend/src/styles.css
```

Expected: lines around 1473, 1607, 1717, 2786 (the shared row selectors).

- [ ] **Step 2: Apply the change**

Find the shared rule for `.listRow, .recordCard, .pipelineRow, .portfolioRow, .databaseRow` (~line 1464) and change:

```css
/* BEFORE */
.listRow,
.recordCard,
.pipelineRow,
.portfolioRow,
.databaseRow {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 13px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
  text-align: left;
}

/* AFTER */
.listRow,
.recordCard,
.pipelineRow,
.portfolioRow,
.databaseRow {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
  text-align: left;
}
```

Also find `.urgencyRow` (~line 2053) and change `padding: 12px 13px` to `padding: 15px 16px`:

```css
/* BEFORE */
.urgencyRow {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(170px, 0.7fr) minmax(220px, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 12px 13px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.urgencyRow {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(170px, 0.7fr) minmax(220px, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px 16px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

- [ ] **Step 3: Verify**

```bash
grep -n "padding: 16px;" frontend/src/styles.css | head -5
grep -n "padding: 15px 16px" frontend/src/styles.css
```

Expected: both return matches.

- [ ] **Step 4: Visual check**

With dev server running, navigate to **WZC database** and **Urgencies**. Rows should look more open with clear breathing room above and below text.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase list row and card padding"
```

---

### Task 3: Agenda surface spacing

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
- `.agendaItemCard` padding: `8px → 12px`
- `.agendaDayPanel` padding: `11px → 14px`, gap: `10px → 14px`
- `.agendaListView`, `.agendaDayList` gap: `8px → 12px`

- [ ] **Step 1: Verify current values**

```bash
grep -n "\.agendaItemCard\|\.agendaDayPanel\|\.agendaListView\|\.agendaDayList" frontend/src/styles.css
```

Expected: returns 4–6 lines pointing to these selectors.

- [ ] **Step 2: Apply the changes**

Find `.agendaItemCard` (~line 1153) and change:

```css
/* BEFORE */
.agendaItemCard {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #ffffff;
}

/* AFTER */
.agendaItemCard {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #ffffff;
}
```

Find `.agendaDayPanel` (~line 1014) and change:

```css
/* BEFORE */
.agendaDayPanel {
  display: grid;
  gap: 10px;
  padding: 11px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.agendaDayPanel {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

Find `.agendaListView, .agendaDayList` (~line 1147) and change:

```css
/* BEFORE */
.agendaListView,
.agendaDayList {
  display: grid;
  gap: 8px;
}

/* AFTER */
.agendaListView,
.agendaDayList {
  display: grid;
  gap: 12px;
}
```

- [ ] **Step 3: Verify**

```bash
grep -n "padding: 12px;" frontend/src/styles.css | head -10
grep -n "padding: 14px;" frontend/src/styles.css | head -5
grep -n "gap: 12px;" frontend/src/styles.css | head -5
```

Expected: new values appear in lines before 4278.

- [ ] **Step 4: Visual check**

Navigate to **Planning → Voorgaande planningen** (list view) and the month calendar. Agenda items should have more internal padding and clearer separation between them.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase agenda surface spacing"
```

---

### Task 4: Secondary surface spacing

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
- `.uploadBox`, `.fileSelection` padding: `13px → 16px`
- `.routeConfigBlock` padding: `14px → 18px`, gap: `12px → 16px`
- `.savedRouteCard` padding: `12px → 16px`, gap: `10px → 14px`
- `.urgencyMonthCard` padding: `10px → 14px`
- `.urgencyMonthGrid` gap: `8px → 12px`

- [ ] **Step 1: Verify current values**

```bash
grep -n "\.uploadBox\|\.fileSelection\|\.routeConfigBlock\|\.savedRouteCard\|\.urgencyMonthCard\|\.urgencyMonthGrid" frontend/src/styles.css
```

Expected: returns 6–8 selector lines.

- [ ] **Step 2: Apply the changes**

Find `.uploadBox` (~line 1714) and change:

```css
/* BEFORE */
.uploadBox {
  display: grid;
  gap: 10px;
  padding: 13px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.uploadBox {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

Find `.fileSelection` (~line 1603) and change `padding: 13px` to `padding: 16px`:

```css
/* BEFORE */
.fileSelection {
  display: grid;
  gap: 9px;
  margin-top: 14px;
  padding: 13px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.fileSelection {
  display: grid;
  gap: 9px;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

Find `.routeConfigBlock` (~line 2171) and change:

```css
/* BEFORE */
.routeConfigBlock {
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.routeConfigBlock {
  min-width: 0;
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

Find `.savedRouteCard` (~line 2105) and change:

```css
/* BEFORE */
.savedRouteCard {
  min-width: 0;
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.savedRouteCard {
  min-width: 0;
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

Find `.urgencyMonthCard` (~line 1972) and change `padding: 10px` to `padding: 14px`. Find `.urgencyMonthGrid` (~line 1966) and change `gap: 8px` to `gap: 12px`:

```css
/* BEFORE */
.urgencyMonthGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.urgencyMonthCard {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 10px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}

/* AFTER */
.urgencyMonthGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.urgencyMonthCard {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 14px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #fbfcfd;
}
```

- [ ] **Step 3: Verify**

```bash
grep -n "padding: 16px;" frontend/src/styles.css | head -10
grep -n "padding: 18px;" frontend/src/styles.css | head -5
grep -n "padding: 14px;" frontend/src/styles.css | head -10
```

Expected: each returns results in lines < 4278.

- [ ] **Step 4: Visual check**

Navigate to **Behandelplanning** (upload boxes) and **Urgenties** (month cards and route config). Everything should feel roomier without any layout breakage.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase secondary surface spacing — upload, route, urgency cards"
```

---

### Task 5: Large surface border-radius

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
`.kpi`, `.panel`, `.mapPanel`, `.loginCard`, `.accessPanel` border-radius: `8px → 14px`

- [ ] **Step 1: Verify current value**

```bash
grep -n "border-radius: 8px" frontend/src/styles.css | head -10
```

Expected: many matches. Lines around 748 (`.kpi, .panel, .mapPanel`) and 360/830 (`.loginCard`, `.accessPanel`).

- [ ] **Step 2: Apply the changes**

Find `.kpi, .panel, .mapPanel` shared rule (~line 744) and change:

```css
/* BEFORE */
.kpi,
.panel,
.mapPanel {
  background: #ffffff;
  border: 1px solid #e0e5ea;
  border-radius: 8px;
  box-shadow: 0 12px 34px rgba(40, 50, 65, 0.05);
}

/* AFTER */
.kpi,
.panel,
.mapPanel {
  background: #ffffff;
  border: 1px solid #e0e5ea;
  border-radius: 14px;
  box-shadow: 0 12px 34px rgba(40, 50, 65, 0.05);
}
```

Find `.loginCard` (~line 360) and change `border-radius: 8px` to `border-radius: 14px`:

```css
/* BEFORE */
.loginCard {
  width: min(420px, 100%);
  display: grid;
  gap: 16px;
  padding: 34px;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 24px 60px rgba(35, 44, 57, 0.08);
}

/* AFTER */
.loginCard {
  width: min(420px, 100%);
  display: grid;
  gap: 16px;
  padding: 34px;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(35, 44, 57, 0.08);
}
```

Find `.accessPanel` (~line 821) and change `border-radius: 8px` to `border-radius: 14px`:

```css
/* BEFORE */
.accessPanel {
  width: min(420px, 100%);
  justify-self: center;
  align-self: start;
  display: grid;
  gap: 14px;
  margin-top: 8vh;
  padding: 28px;
  background: #ffffff;
  border: 1px solid #e0e5ea;
  border-radius: 8px;
  box-shadow: 0 18px 44px rgba(40, 50, 65, 0.08);
}

/* AFTER */
.accessPanel {
  width: min(420px, 100%);
  justify-self: center;
  align-self: start;
  display: grid;
  gap: 14px;
  margin-top: 8vh;
  padding: 28px;
  background: #ffffff;
  border: 1px solid #e0e5ea;
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(40, 50, 65, 0.08);
}
```

- [ ] **Step 3: Verify**

```bash
grep -n "border-radius: 14px" frontend/src/styles.css | head -10
```

Expected: returns matches for kpi/panel/mapPanel, loginCard, and accessPanel — at minimum 3 matches.

- [ ] **Step 4: Visual check**

Reload the browser. The KPI cards, panels, and (if you log out) the login card should have noticeably softer rounded corners that feel more premium.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase border-radius on large surfaces to 14px"
```

---

### Task 6: Card / row border-radius

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
All row/card/small-surface selectors: `8px → 12px`
Targets: `.listRow`/`.recordCard`/`.pipelineRow`/`.portfolioRow`/`.databaseRow`, `.agendaItemCard`, `.agendaDay`, `.agendaDayPanel`, `.urgencyMonthlyDisclosure`, `.urgencyMonthCard`, `.urgencyRow`, `.routeDispatchCard`, `.savedRouteCard`, `.routeConfigBlock`, `.tabBar`, `.urgencyMonthlyDisclosure`

- [ ] **Step 1: Count current 8px radius occurrences to baseline**

```bash
grep -c "border-radius: 8px" frontend/src/styles.css
```

Note this number — after changes it should be lower by the number of selectors you touch.

- [ ] **Step 2: Apply the changes**

In the shared `.listRow, .recordCard, .pipelineRow, .portfolioRow, .databaseRow` rule (~line 1464), change `border-radius: 8px` to `border-radius: 12px`.

Find each of the following selectors and change their `border-radius: 8px` to `border-radius: 12px`:

- `.agendaItemCard` (~line 1153)
- `.agendaDay` (~line 1057)
- `.agendaDayPanel` (~line 1014)
- `.urgencyMonthlyDisclosure` (~line 1899)
- `.urgencyMonthCard` (~line 1972)
- `.urgencyRow` (~line 2053)
- `.routeDispatchCard` (~line 2415)
- `.savedRouteCard` (~line 2105)
- `.routeConfigBlock` (~line 2171)
- `.tabBar` (~line 1260)

For example, `.agendaDay`:
```css
/* BEFORE */
.agendaDay {
  min-width: 0;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: 22px minmax(0, 1fr);
  gap: 4px;
  align-content: stretch;
  align-items: start;
  justify-items: stretch;
  padding: 6px;
  border: 1px solid #e2e7eb;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
}

/* AFTER */
.agendaDay {
  min-width: 0;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: 22px minmax(0, 1fr);
  gap: 4px;
  align-content: stretch;
  align-items: start;
  justify-items: stretch;
  padding: 6px;
  border: 1px solid #e2e7eb;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
}
```

Apply the same `8px → 12px` pattern to each remaining selector above.

- [ ] **Step 3: Verify**

```bash
grep -n "border-radius: 12px" frontend/src/styles.css | wc -l
```

Expected: at least 10 new matches.

- [ ] **Step 4: Visual check**

Navigate through **Planning** (calendar cells), **Urgenties** (month cards, urgency rows), and **WZC database** (list rows). Cards should feel softer without looking circular.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase border-radius on cards and rows to 12px"
```

---

### Task 7: Form element border-radius

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
Base `button`, `input`, `select`, `textarea`, and dropdown menus: `8px → 10px`

- [ ] **Step 1: Verify current values**

```bash
grep -n "^button {" frontend/src/styles.css
grep -n "^input," frontend/src/styles.css
grep -n "\.searchableDropdownMenu" frontend/src/styles.css
grep -n "\.teamSelectMenu" frontend/src/styles.css
```

Expected: returns line numbers for each base selector.

- [ ] **Step 2: Apply the changes**

Find the base `button` rule (~line 38) and change `border-radius: 8px` to `border-radius: 10px`:

```css
/* BEFORE */
button {
  border: 1px solid #d7dce2;
  background: #ffffff;
  color: #24262d;
  border-radius: 8px;
  min-height: 38px;
  padding: 8px 13px;
  cursor: pointer;
}

/* AFTER */
button {
  border: 1px solid #d7dce2;
  background: #ffffff;
  color: #24262d;
  border-radius: 10px;
  min-height: 38px;
  padding: 8px 13px;
  cursor: pointer;
}
```

Find `input, select, textarea` shared rule (~line 63) and change `border-radius: 8px` to `border-radius: 10px`:

```css
/* BEFORE */
input,
select,
textarea {
  width: 100%;
  border: 1px solid #d7dce2;
  background: #ffffff;
  color: #1d1d1f;
  border-radius: 8px;
  min-height: 40px;
  padding: 9px 11px;
  outline: none;
}

/* AFTER */
input,
select,
textarea {
  width: 100%;
  border: 1px solid #d7dce2;
  background: #ffffff;
  color: #1d1d1f;
  border-radius: 10px;
  min-height: 40px;
  padding: 9px 11px;
  outline: none;
}
```

Find `.searchableDropdownMenu` (~line 152) and change `border-radius: 8px` to `border-radius: 10px`.

Find `.teamSelectMenu` (~line 280) and change `border-radius: 8px` to `border-radius: 10px`.

Find `.teamSelectDisclosure summary` (~line 227) and change `border-radius: 8px` to `border-radius: 10px`.

- [ ] **Step 3: Verify**

```bash
grep -n "border-radius: 10px" frontend/src/styles.css | head -10
```

Expected: at least 5 matches covering button, inputs, and dropdowns.

- [ ] **Step 4: Visual check**

Navigate to any form (e.g., **Urgenties → add urgency**, or **WZC database → add user**). Inputs and buttons should have slightly softer corners. Open a searchable dropdown — the menu should match.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): increase form element border-radius to 10px"
```

---

### Task 8: Border color softening

**Files:**
- Modify: `frontend/src/styles.css`

**What changes:**
All hard border grays soften:
- `#d7dce2` (button/input default border) → `#e2e6ec`
- `#e2e7eb` (card/row borders) → `#eaecf1`
- `#e0e5ea` (panel borders) → `#eaecf1`
- `#dfe5ea` (secondary surfaces) → `#e8ecf0`

- [ ] **Step 1: Count occurrences to baseline**

```bash
grep -c "#d7dce2" frontend/src/styles.css
grep -c "#e2e7eb" frontend/src/styles.css
grep -c "#e0e5ea" frontend/src/styles.css
grep -c "#dfe5ea" frontend/src/styles.css
```

Note each count.

- [ ] **Step 2: Apply the changes using find-and-replace**

These are safe global replacements — each color is used exclusively as a border color in the non-portal section. Use your editor's find-and-replace (case-sensitive, whole-file):

| Find | Replace |
|---|---|
| `#d7dce2` | `#e2e6ec` |
| `#e2e7eb` | `#eaecf1` |
| `#e0e5ea` | `#eaecf1` |
| `#dfe5ea` | `#e8ecf0` |

**Important:** Do NOT replace inside the portal section (lines 4278–4484). After replacing, verify the portal section is unchanged:

```bash
sed -n '4278,4484p' frontend/src/styles.css | grep -c "#d7dce2\|#e2e7eb\|#e0e5ea\|#dfe5ea"
```

Expected: `0` (portal section uses different color values so replacements won't accidentally hit it, but verify anyway).

- [ ] **Step 3: Verify replacements**

```bash
grep -c "#e2e6ec" frontend/src/styles.css
grep -c "#eaecf1" frontend/src/styles.css
grep -c "#e8ecf0" frontend/src/styles.css
# Old values should now be 0 in the main section:
grep -n "#d7dce2\|#e2e7eb\|#e0e5ea\|#dfe5ea" frontend/src/styles.css | grep -v "^42[0-9][0-9]:\|^43[0-9][0-9]:\|^44[0-9][0-9]:"
```

Expected: old values return 0 matches (or only matches inside the portal section after line 4278).

- [ ] **Step 4: Visual check**

Reload the full app. The borders between cards, rows, and panels should feel lighter and more recessive — less "grid-like", more airy. The overall page should feel softer without any colors or layout changing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): soften all border colors for lighter, more premium look"
```

---

### Task 9: Build verification + Phase A sign-off

**Files:**
- No file changes — verification only.

- [ ] **Step 1: Run the production build**

```bash
cd frontend && npm run build
```

Expected output ends with something like:
```
✓ built in Xs
```
Zero TypeScript errors, zero Vite errors.

- [ ] **Step 2: Full visual walkthrough**

With the dev server running, click through every main section:
- **Home** — KPI cards, home cards
- **Planning** — calendar, list view, agenda day panel
- **Behandelplanning** — upload boxes, file selection
- **Mondzorgdossiers** — list rows
- **Urgenties** — urgency rows, month cards, route config
- **WZC opvolging** — pipeline rows, prospect cards
- **WZC database** — database rows, tabs

Check for: no content clipping, no overflow, no broken layouts. Panels should look larger and more breathable, borders softer, corners softer.

- [ ] **Step 3: Final commit**

```bash
git add frontend/src/styles.css
git commit -m "style(phase-a): complete breathing room pass — all spacing, radius, and border color changes"
```

> Phase B (token system + component polish) is tracked in a separate plan.

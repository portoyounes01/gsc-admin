# UI Premium Refresh — Global Smile Care Dashboard

**Date:** 2026-10-22  
**Author:** youneseslm@gmail.com  
**Status:** Approved — ready for implementation

---

## Problem

The dashboard feels cramped and dense during long work sessions. Staff use every section throughout the day and report eye fatigue from tight spacing, sharp borders, and clinical visual weight. The goal is to make the app feel premium, open, and easy to scan — in the style of Apple/Linear — without changing the brand palette or any functional behaviour.

---

## Goals

1. Fix the dense/cramped feel by adding breathing room globally.
2. Refine the visual language toward Apple/Linear (soft borders, generous whitespace, subtle depth).
3. Keep 100% visual brand continuity — GSC green tokens, Inter font, sidebar glassmorphism.
4. Zero changes to component logic, data flow, or layout structure.

---

## Non-Goals

- Dark mode (separate project).
- New components or features.
- Changes to `App.tsx` logic or any `.ts`/`.tsx` files.
- Portal client (`portal/`) — out of scope.

---

## Approach

Two sequential CSS-only passes, both targeting `frontend/src/styles.css`.

---

## Phase A — Breathing Room

**Scope:** Increase padding, gaps, and border-radius. Soften border colors. No token changes.

### Spacing increases

| Surface | Current | New |
|---|---|---|
| `.panel` padding | `18px` | `24px` |
| `.kpi` padding | `1rem` | `1.25rem` |
| `.kpi` min-height | `104px` | `120px` |
| `.listRow`, `.recordCard`, `.pipelineRow`, `.urgencyRow` padding | `12–13px` | `16px` |
| `.appShell` gap | `24px` | `28px` |
| Most `gap: 10–14px` in grid/list layouts | `10–14px` | `16–18px` |
| `.agendaItemCard` padding | `8px` | `12px` |
| `.savedRouteCard`, `.routeConfigBlock` padding | `12–14px` | `16px` |
| `.urgencyMonthCard` padding | `10px` | `14px` |
| `.uploadBox`, `.fileSelection` padding | `13px` | `16px` |

### Border-radius increases

| Surface | Current | New |
|---|---|---|
| `.panel`, `.mapPanel`, `.kpi` | `8px` | `14px` |
| `.loginCard`, `.accessPanel` | `8px` | `14px` |
| `.listRow`, `.recordCard`, `.pipelineRow`, `.portfolioRow`, `.databaseRow` | `8px` | `12px` |
| `.agendaItemCard`, `.agendaDay`, `.agendaDayPanel` | `8px` | `12px` |
| `.urgencyMonthlyDisclosure`, `.urgencyMonthCard` | `8px` | `12px` |
| `.routeDispatchCard`, `.savedRouteCard`, `.routeConfigBlock` | `8px` | `12px` |
| `.tabBar` | `8px` | `12px` |
| `button` (base) | `8px` | `10px` |
| `input`, `select`, `textarea` | `8px` | `10px` |
| `.searchableDropdownMenu`, `.teamSelectMenu` | `8px` | `10px` |
| `.sidebar` | `20px` | stays `20px` |
| Pills/badges (`999px`) | stays |

### Border color softening

| Token / selector | Current | New |
|---|---|---|
| `button` border | `#d7dce2` | `#e2e6ec` |
| `input`, `select`, `textarea` border | `#d7dce2` | `#e2e6ec` |
| `.listRow`, `.agendaDay`, etc. border | `#e2e7eb` | `#eaecf1` |
| `.panel`, `.kpi` border | `#e0e5ea` | `#eaecf1` |
| `.appShell` — sidebar border | `var(--gsc-border)` stays, but `--gsc-border` updates in Phase B |

---

## Phase B — Token + Component Refinement

**Scope:** Update `:root` CSS variables and refine individual component details for a fully coherent system.

### CSS variable updates (`:root`)

```css
--gsc-border: #eaecf1;        /* was #e5e5ea — lighter, less visible grid lines */
--gsc-page:   #f4f5f7;        /* was #f7f7f8 — cooler, less yellowed */
--gsc-muted:  #72767d;        /* was #6e6e73 — marginally warmer */

/* New shadow tokens */
--gsc-shadow-sm: 0 2px 8px rgba(29, 29, 31, 0.06);
--gsc-shadow-md: 0 8px 24px rgba(29, 29, 31, 0.07);
--gsc-shadow-lg: 0 18px 48px rgba(29, 29, 31, 0.09);

/* New radius tokens */
--gsc-radius-sm:  10px;
--gsc-radius-md:  14px;
--gsc-radius-lg:  20px;
```

Apply `--gsc-shadow-md` to `.panel`, `.kpi`, `.loginCard`; `--gsc-shadow-lg` to `.sidebar`, `.sidebarSettingsDropdown`, `.searchableDropdownMenu`.

### Typography refinements

| Element | Current | New |
|---|---|---|
| `.pageHeader h1` | no letter-spacing | `letter-spacing: -0.02em` |
| `label`, `.searchableDropdownLabel` | `font-size: 13px` | `font-size: 12.5px` |
| `.kpi strong` | `font-size: 2rem` | stays |
| `.kpi span` | `font-size: 0.75rem` | `font-size: 0.72rem` |
| `.sidebar nav button` | `font-size: 14px` | stays — weight drop to `font-weight: 480` for inactive |

### Component detail refinements

| Component | Change |
|---|---|
| `.sidebar nav button` | `min-height: 44px → 46px`, `padding: 10px 14px → 11px 16px` |
| `.sidebar nav button.active` | `box-shadow` updated to use `--gsc-shadow-sm` on top of inset accent |
| `.primaryButton` | `border-radius: 8px → 10px`, add `letter-spacing: 0.01em` |
| `.agendaStatusPill` | `padding: 4px 8px → 5px 10px`, `font-size: 11px → 11.5px` |
| `.trustBadge`, `.attentionBadge` | `padding: 7px 11px → 8px 13px` |
| `.kpi::before` accent bar | `height: 3px → 2px` (thinner = more refined) |
| `.compactActionButton` | `border-radius: 8px → 10px` |
| `.homeCard` | `border-radius: 14px` stays, add `transition: box-shadow 0.15s` |

---

## Implementation Notes

- All changes are in `frontend/src/styles.css` only.
- Phase A ships first and is independently deployable.
- Phase B follows after Phase A is validated in the running app.
- No changes to `App.tsx`, `portal/`, or any TypeScript files.
- After Phase B, run `npm run build` in `frontend/` to verify the dist builds cleanly.

---

## Success Criteria

- Staff report the app feels more spacious and less tiring.
- All sections (Planning, Urgencies, WZC Follow-up, etc.) render without layout overflow or clipping.
- Brand colors (GSC green, blue, amber) are unchanged.
- The sidebar glassmorphism effect is preserved.

# FitSphere — Enhancement Plan (informed by ui-service)

A roadmap to take FitSphere from "feature-complete demo" to "production-grade,
industry-standard" — modelled on the patterns that make **ui-service** (the v2
work codebase) feel professional.

> **IP note:** ui-service's components live in a *private* package
> (`@247softwareorganisation/ui`) and it uses ag-grid **enterprise** under a
> company licence. We study its **patterns only** and re-implement with public
> MIT libraries (TanStack Table/Query, Tailwind, Socket.IO, Vitest). Nothing is
> copied.

---

## Where FitSphere is today
Deployed full-stack TS app (React/Vite + Express + MongoDB Atlas) with 8 feature
modules, JWT auth + RBAC, optimistic updates, i18n (en/ta), Recharts, a design
system (PR #7: primitives + client-side DataGrid + dark mode + density). No tests,
no CI, client-side grid only, occupancy via polling.

## What makes ui-service "industry standard" (the gaps to close)
1. Server-side **DataGrid** — backend paginates/sorts/filters; grid requests pages.
2. **SetupWrapper** — one reusable CRUD-list template (header + grid + filters + row/mass actions + confirm).
3. **Drawer**-based add/edit + **SelectionBar** mass actions + row-hover actions.
4. **Confirm modals** for destructive actions (never delete on a single click).
5. **TanStack Query key factories** + hierarchical, surgical invalidation.
6. **Real-time** updates (Socket.IO) with long-polling fallback.
7. **Export** (Excel/CSV) of grid data.
8. **Error boundaries** + standardized **Empty** states.
9. Persisted user preferences (theme/density/locale) **server-side**, not just localStorage.
10. **Tests** (Vitest + RTL + mocked HTTP) and co-located `__tests__`.
11. i18n **namespacing** + lazy-loaded locale files.
12. Permission gating at **route** *and* **row** level.

---

## Tier 1 — Highest impact (do these)

### A. Server-side DataGrid (the marquee upgrade)
Mirrors ui-service's `IServerSideDatasource`. Make the **Analytics member directory**
truly server-driven: pagination, server sorting, and column search/filter.
- **Backend:** `GET /analytics/members` gains `page`, `pageSize`, `sort`, `filter`, returns `{ rows, total }`.
- **Frontend:** DataGrid gains pagination controls + manual sorting wired to the query; debounced filter inputs (AbortController already in place).
- **Why:** real data-grid engineering — the thing you specifically care about.
- Effort: **M** · Value: ★★★★★

### B. Reusable CRUD list + Drawer add/edit + mass actions (SetupWrapper analog)
A `ListPage` wrapper (PageHeader + DataGrid + toolbar) and a `Drawer` primitive.
Apply to **Slots admin**: list slots in the grid, create/edit in a **Drawer**, select
rows → **SelectionBar** → mass delete, with **ConfirmDialog** on destructive actions.
- **New UI:** `Drawer`, `ConfirmDialog`, `SelectionBar`, `ListPage`.
- **Why:** the single most recognizable "industry-standard CRUD" pattern.
- Effort: **L** · Value: ★★★★★

### C. Automated tests + CI
Currently zero. Add **Vitest + React Testing Library** (client) and **Vitest +
supertest** (server), with mocked HTTP/db, co-located `__tests__`. Add a **GitHub
Actions** workflow running typecheck + test + build on every PR (branch protection
optional).
- **Why:** biggest credibility signal for recruiters; ui-service has full Vitest setup.
- Effort: **M** · Value: ★★★★★

### D. Real-time occupancy (Socket.IO + polling fallback)
Replace 30s occupancy polling with a **Socket.IO** channel that pushes occupancy on
every check-in/out; fall back to polling if the socket drops (exactly ui-service's
dispatch-queue pattern).
- **Backend:** Socket.IO server, emit on attendance change.
- **Frontend:** subscribe; update the TanStack Query cache; fallback timer.
- **Why:** distinctive, demonstrates real-time architecture.
- Effort: **M** · Value: ★★★★☆

---

## Tier 2 — Strong, medium effort

### E. CSV export of grid data
Export the member directory / attendance to CSV (client-side blob, or a backend
`/export` endpoint like ui-service's Excel export).
- Effort: **S** · Value: ★★★☆☆

### F. Query-key factories + invalidation discipline
Centralize per-feature key factories (`attendanceKeys`, `slotsKeys`, …) with a
hierarchical shape and stable serialization; standardize mutation invalidation.
(Partly done — make it consistent across all features.)
- Effort: **S** · Value: ★★★☆☆ (clean-code signal)

### G. Error boundary + standardized Empty/Loading
Top-level **ErrorBoundary** with a friendly fallback; a shared `Empty` component;
finish skeletons on the remaining pages.
- Effort: **S** · Value: ★★★☆☆

### H. Server-persisted preferences
Store theme/density/locale on the **User** (PATCH `/auth/me/preferences`) so they
follow the account across devices — like ui-service's `/updateUserTheme`.
- Effort: **S–M** · Value: ★★★☆☆

---

## Tier 3 — Polish / optional

- **I. i18n namespacing + lazy locale files** (`resourcesToBackend`) — matters at scale; current single-file setup is fine for now. Effort S, Value ★★☆.
- **J. Accessibility pass** — focus traps in Drawer/Dialog, `aria-*`, keyboard nav, visible focus rings. Effort M, Value ★★★ (genuinely professional).
- **K. Grid state persistence** — save column sort/filter to the server and restore on reload. Effort M, Value ★★☆.
- **L. Saved filters / quick views** on Analytics. Effort M, Value ★★☆.

## Deliberately out of scope (overkill for a portfolio)
Module federation / microfrontends · multi-facility tenancy · the full
permission-by-facility matrix · ag-grid-enterprise features (master/detail, pivot).

---

## Suggested sequencing (one PR each, `development → main`)
1. **PR: tests + CI** (B-safety net first) — Vitest/RTL/supertest + GitHub Actions.
2. **PR: server-side DataGrid** (A) — paginated/sorted/filtered member directory.
3. **PR: CRUD shell** (B) — Drawer + ConfirmDialog + SelectionBar + Slots admin grid.
4. **PR: real-time occupancy** (D) — Socket.IO + fallback.
5. **PR: polish** — CSV export (E), error boundary + empty states (G), query-key cleanup (F).
6. **PR: preferences + a11y** (H, J) if time allows.

Recommended starting point: **Tier 1**. If picking one, **A (server-side DataGrid)**
is the most on-point for the "data grid like ui-service" goal; **C (tests + CI)** is
the highest credibility-per-effort.

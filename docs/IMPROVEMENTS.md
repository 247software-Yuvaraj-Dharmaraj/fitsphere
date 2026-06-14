# FitSphere — Improvement Opportunities

A study of what FitSphere can borrow from **ui-service** (UI/UX) and where it can
grow as a **product**. Prioritized; pick what's worth building.

> Already adopted from ui-service: design-system primitives, server-side DataGrid,
> Drawer/ConfirmDialog/SelectionBar CRUD shell, dark mode + density, tooltips,
> toasts (top-center, brand), skeletons, i18n, XLSX export, page-header icons.

---

## A. UI / UX enhancements (ui-service-inspired)

| # | Enhancement | What ui-service does | Value | Effort |
|---|-------------|----------------------|-------|--------|
| A1 | **User menu dropdown** in the header (avatar + name → Profile / Sign out / theme) | HeaderMenu avatar dropdown | ★★★★ | S |
| A2 | **Breadcrumbs** in the page header | Breadcrumb on every setup page | ★★★ | S |
| A3 | **Unsaved-changes guard** on the slot Drawer (confirm before discarding edits) | `dirty`/prompt guards on add/edit | ★★★★ | S |
| A4 | **Advanced filter** on the member directory (filter by status: active/at-risk/inactive) | AdvancedSearch + appliedFilters | ★★★★ | M |
| A5 | **Layout-matching skeletons** on Attendance/Slots load (not just a spinner) | card/grid skeletons | ★★★ | S |
| A6 | **Empty states with a CTA** (no slots → "Create your first slot" for admins) | `<Empty>` with action | ★★★ | S |
| A7 | **Keyboard shortcuts** (`n` = new slot, `/` = focus search) | hotkeys | ★★ | S |
| A8 | **Mass-edit** (not just mass-delete) — e.g. bump capacity on selected slots | SelectionBar mass-edit drawer | ★★★ | M |
| A9 | **Audit/history** (who created/edited a slot, when) | audit-trail views | ★★★ | L |

## B. Product improvements (FitSphere as a gym app)

| # | Improvement | Why it matters | Value | Effort |
|---|-------------|----------------|-------|--------|
| B1 | **"My Bookings"** view for members (see/cancel all upcoming booked slots in one place) | members can book but can't see their bookings across days — a real gap | ★★★★★ | M |
| B2 | **Edit profile / change password** (Profile is read-only today) | expected account self-service | ★★★★ | M |
| B3 | **Waitlist** for full slots (join waitlist, auto-promote on cancellation) | high real-world value; turns "fully booked" dead-ends into conversions | ★★★★ | M–L |
| B4 | **Weekly goal & progress** (member sets a target; dashboard shows progress) | drives the engagement the product is pitched on | ★★★★ | M |
| B5 | **Slot reminders / streak-milestone nudges** (in-app or email) | retention; ties to the "engagement" pitch | ★★★ | L |
| B6 | **Trainer ↔ member assignment** (trainers own a roster) | feedback is currently any-trainer-to-any-member | ★★★ | M |
| B7 | **Attendance export (XLSX)** + admin "occupancy history" detail | rounds out admin analytics | ★★ | S |
| B8 | **Reset/recompute occupancy** admin action (clear stale sessions) | ops nicety; we partly handle stale check-ins already | ★★ | S |

> Deliberately **out of scope** (per the product spec, which positions FitSphere
> *away* from billing): memberships, payments, invoicing.

---

## Recommended shortlist (best value-to-effort)
1. **B1 — My Bookings** (members' most obvious missing view) — M
2. **B2 — Edit profile / change password** (expected self-service) — M
3. **A1 — Header user menu** + **A3 — unsaved-changes guard** (quick polish wins) — S
4. **A4 — Member status filter** on Analytics (small, high analytics value) — M
5. **B3 — Waitlist** if we want one standout "real product" feature — M–L

If picking one to start: **B1 (My Bookings)** — it's the clearest product gap and
a natural, demoable member feature.

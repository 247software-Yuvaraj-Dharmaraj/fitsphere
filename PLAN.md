# FitSphere — Project Plan

A full-stack gym attendance, occupancy & engagement platform. Built as a
portfolio/resume project that demonstrates production-grade frontend and backend
engineering, with deliberate use of the same technical patterns used in the 247
application.

---

## 1. Goal

- Ship a **deployed, demoable** full-stack app with a live URL on the resume.
- Showcase **role-based access** (the strongest existing skill), clean state
  management, and real business logic (occupancy rules, streaks, slot capacity).
- Practice and be able to talk about: **TanStack Query, AbortController,
  debouncing, localization (i18n), REST controllers, JWT auth**.

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite + **TypeScript** | Strongest skill; TS catches the bug classes that hurt before |
| Styling | Tailwind CSS | Fast, consistent, modern look |
| Server state | **TanStack Query** | Caching, polling, optimistic updates |
| Routing | React Router | Route guards for role-based access |
| i18n | react-i18next + Intl | Localization + date/number formatting |
| Charts | Recharts | Dashboards & analytics |
| Backend | Node + Express + **TypeScript** | All-JS stack, fast iteration |
| ODM | Mongoose | Type-safe schemas/models for MongoDB |
| DB | **MongoDB Atlas** (free M0, dev + prod) | NoSQL (complements the Postgres incidentdesk project); cloud DB = no Docker/install, portable across machines. Local Docker Mongo is an optional offline fallback |
| Auth | JWT (access + refresh) + bcrypt | Concrete, interview-friendly security story |

## 3. Architecture

```
fitsphere/
├── client/                 # React + Vite + TS
│   └── src/
│       ├── api/            # axios client, TanStack Query hooks (with AbortController)
│       ├── components/     # shared UI (cards, charts, layout, guards)
│       ├── features/       # auth, attendance, occupancy, slots, dashboard, analytics, feedback
│       ├── i18n/           # locale files (en, + one more)
│       ├── lib/            # hooks (useDebounce), helpers
│       └── routes/         # route definitions + role guards
└── server/                 # Express + TS
    └── src/
        ├── config/         # env loading
        ├── lib/            # mongoose connection
        ├── models/         # Mongoose schemas/models
        ├── middleware/     # auth (JWT verify + requireRole), error handler
        ├── utils/          # jwt sign/verify
        └── modules/        # auth, attendance, occupancy, slots, workout, analytics, feedback
            └── <module>/   # .routes.ts, .controller.ts, .service.ts, .schema.ts
```

**Per-module backend pattern** (mirrors the controller/service split):
`routes` (wiring) → `controller` (HTTP in/out) → `service` (business logic) → Mongoose model.
Validation via Zod schemas at the controller boundary.

## 4. Data Model (Mongoose collections)

- **User** — name, email, mobile, passwordHash, role (`MEMBER|TRAINER|ADMIN`)
- **RefreshToken** — rotating refresh tokens per user
- **GymConfig** — single-gym capacity (drives occupancy math)
- **Attendance** — userId, checkInAt / checkOutAt (streaks, calendar, occupancy)
- **WorkoutLog** — userId, type, duration, date (consistency tracking)
- **Slot** + **SlotBooking** — bookable capacity-limited slots (refs by ObjectId)
- **Feedback** — trainerId, memberId weekly notes (timeline, `.populate()` member)

NoSQL modeling note: refs + `.populate()` for joins (feedback→member); small
always-read-with-parent lists (slot bookings) are candidates for embedding — a
document-model decision worth being able to explain.

## 5. Feature Modules

1. **Auth** — signup, signin, JWT access+refresh, password reset (mobile flow, mocked), role-based access.
2. **Attendance** — one-click check-in/out, timestamps, streaks (3/7/14-day), weekly/monthly + calendar view.
3. **Occupancy** — live counter from active check-ins, capacity %, crowd level (Low/Med/High/Full) per the doc's threshold rules, check-ins disabled at 100%.
4. **Workout** — log type (Cardio/Strength/Mixed) + duration, frequency tracking.
5. **Slots** — admin configures slots; members book within capacity.
6. **Member Dashboard** — attendance trend, consistency score, workout charts, best-time suggestion, crowd-vs-time.
7. **Admin Analytics** — peak/off-peak, occupancy trends, attendance distribution, engagement/drop-off.
8. **Trainer Feedback** — weekly notes in a timeline; role-gated.

## 6. Where the "247 concepts" live

| Concept | Home in FitSphere |
|---------|-------------------|
| TanStack Query | All server state; `refetchInterval` for live occupancy; optimistic check-in/out |
| AbortController | Cancel in-flight requests on unmount / fast nav (via Query `signal`) |
| Debouncing | `useDebounce` for admin member search & slot filters |
| Localization | react-i18next (en + 1 more) + `Intl` date/number formatting |
| Role-based access | Frontend route guards + conditional UI + backend `requireRole` middleware |
| Controllers | Express controller/service split per module |

## 7. Milestones (target: by June 25)

### Week 1 — Foundation & Auth
- [x] Monorepo scaffold (client + server), git init
- [x] Server skeleton: env, mongoose connection, error/auth middleware, JWT utils
- [x] Mongoose models + seed script (demo users for each role)
- [x] Auth module (signup/signin/refresh/logout/me) end-to-end — verified against Atlas
- [x] Client shell: routing, layout, TanStack Query + i18n setup, auth pages + guards
- [x] Early deploy (de-risk deployment) — LIVE: frontend on Vercel (fitsphere-two.vercel.app), API on Render, DB on Atlas; auth verified in prod

### Week 2 — Core Modules
- [x] Attendance (check-in/out, streaks, calendar) with optimistic updates + live occupancy
- [ ] Occupancy engine + live indicator (polling)
- [x] Slot booking with capacity rules (+ admin/trainer slot creation & deletion)
- [ ] Workout logging
- [ ] Debounced search + AbortController wiring

### Week 3 — Dashboards, Polish, Deploy
- [ ] Member dashboard (Recharts)
- [ ] Admin analytics
- [ ] Trainer feedback timeline
- [ ] Second locale, loading/error/empty states, skeletons
- [ ] README with screenshots + architecture diagram
- [ ] Final deploy (frontend: Vercel/Netlify, backend: Render/Railway, DB: MongoDB Atlas)

## 8. Definition of Done

- Deployed, reachable live URL.
- Seeded demo accounts (member / trainer / admin) so reviewers can log in instantly.
- README: problem, screenshots, stack, architecture, how-to-run, live link.
- No console errors; loading/error/empty states everywhere; mobile-responsive.

## 9. Portability (built on company system, must move before June 25)

This project is being developed on the company machine but **must migrate to a
personal machine before access ends on 2026-06-25**. Keep it clone-and-run:

- **Personal GitHub remote, pushed early & often** — the real backup. Not a
  company account/GitLab. Do this in Week 1.
- **No company-specific infra** — public npm + Docker + a personal MongoDB Atlas
  account only. No internal registries, VPN-only services, or company SSO.
- **Secrets only in `.env` (gitignored); `.env.example` committed** — new machine
  just copies and fills in.
- **No DB migration** — DB lives in **MongoDB Atlas (cloud)**; same URI works on
  any machine. Re-running the seed script is all that's needed.
- **README with exact setup steps** so it runs on any OS from a fresh clone.

Migration checklist (new machine): install Node → clone repo → `npm install`
(client & server) → copy `.env.example` to `.env` and paste the Atlas URI →
`npm run seed` → `npm run dev`. (No Docker required — Atlas is cloud-hosted.)

## 10. Scope Guardrails (to finish in time)

- Single gym (no multi-tenant).
- Password reset & SMS are **mocked** (no real SMS provider).
- "Real-time" occupancy = short-interval polling, not WebSockets (can note WS as a future enhancement).
- Analytics computed on the fly from seeded + live data (no separate warehouse).

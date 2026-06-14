# FitSphere

![CI](https://github.com/247software-Yuvaraj-Dharmaraj/fitsphere/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white)

A full-stack gym attendance, occupancy & engagement platform — built as a
production-style demonstration of a modern **React + Node + MongoDB** stack with
role-based access control.

> **Live demo:** https://fitsphere-two.vercel.app
> **Demo logins** (password `password123`): `member@fitsphere.app` · `trainer@fitsphere.app` · `admin@fitsphere.app`

## Why FitSphere

Most gym systems stop at memberships and billing. FitSphere focuses on the gaps
that actually affect retention: **crowd management, workout consistency, and
member engagement** — surfaced through live occupancy, attendance streaks, and
data-driven dashboards.

## Features

- 🔐 **JWT authentication** — self-built, bcrypt-hashed, with access + refresh
  token rotation and a revocable token store
- 👥 **Role-based access control** — Member, Trainer, Admin — enforced in API
  middleware and the service layer
- ✅ **Attendance & streaks** — one-click check-in/out, 3/7/14-day streaks,
  calendar view
- 📊 **Live gym occupancy** — real-time crowd level (Low / Medium / High / Full)
  derived from active check-ins, with capacity-based rules
- 🗓️ **Slot booking** — capacity-limited workout slots
- 📈 **Dashboards** — member progress + admin analytics (peak hours, trends)
- 🗒️ **Trainer feedback** — weekly notes in a timeline, role-gated
- 🌐 **Localization (i18n)** — multi-language UI with `Intl` formatting
- ⚡ **Optimistic updates & smart caching** — via TanStack Query, with request
  cancellation (AbortController) and debounced search

## Screenshots

| Member Dashboard | Admin Analytics |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Analytics](screenshots/analytics.png) |

| Attendance & Streaks | Slot Booking |
|---|---|
| ![Attendance](screenshots/attendance.png) | ![Slots](screenshots/slots.png) |

## Engineering Highlights

**Architecture & data**
- Full-stack **TypeScript** monorepo (React + Vite client, Express API), deployed across **Vercel + Render + MongoDB Atlas**.
- Per-feature backend modules with a **controller → service → model** split and **Zod** validation at the request boundary.
- **Server-side data grid** — the member directory is paginated, sorted, and searched entirely in MongoDB via a single **aggregation pipeline** (`$lookup` → visit stats, `$switch` → engagement status, `$facet` → page rows + total count).

**Auth & security**
- Self-built **JWT auth** (access + refresh) with **refresh-token rotation** (unique `jti`) and a revocable token store.
- **Role-based access control** (Member / Trainer / Admin) enforced in **API middleware *and*** the client router.

**Real-time & data fetching**
- **Live gym occupancy over Socket.IO** — pushed on every check-in/out, with an automatic **polling fallback** if the socket drops.
- **TanStack Query** throughout: **optimistic** check-in/out (rollback on error), cache patched from socket events, **debounced search** with **AbortController** request cancellation.

**Frontend craft**
- Reusable design-system layer (Button, Card, Select, DataGrid, Drawer, ConfirmDialog, …) with **dark mode + density** toggles and preferences **persisted to the user account**.
- **i18n** (English + Tamil), **route-level code-splitting** (chart-heavy pages lazy-loaded), and an **accessibility pass** (focus traps, ARIA labelling, skip link, keyboard nav).

**Quality & delivery**
- **Vitest** suites — server integration tests against an **in-memory MongoDB** (supertest) + client component/hook tests (React Testing Library).
- **GitHub Actions CI** (lint → build → test) on every PR; clean PR-based `development → main` workflow.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router, react-i18next, Recharts |
| Backend  | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) — MongoDB Atlas |
| Auth     | JWT (access + refresh), bcrypt |

## Architecture

```
fitsphere/
├── client/   # React + Vite + TypeScript SPA
└── server/   # Express + TypeScript REST API
    └── src/
        ├── config/      # env loading
        ├── lib/         # mongoose connection
        ├── models/      # Mongoose schemas
        ├── middleware/  # auth (JWT + role guards), error handling
        ├── utils/       # jwt helpers
        └── modules/     # feature modules (controller → service → model)
```

The backend follows a **controller → service → model** split per feature module,
with Zod validation at the request boundary.

## Getting Started

### Prerequisites
- Node.js 20+
- A MongoDB connection string (free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works great)

### 1. Server
```bash
cd server
npm install
cp .env.example .env          # then paste your MongoDB Atlas URI + set JWT secrets
npm run seed                  # creates demo accounts
npm run dev                   # http://localhost:4001
```

### 2. Client
```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

## License

[MIT](./LICENSE) © 2026 Yuvaraj Dharmaraj

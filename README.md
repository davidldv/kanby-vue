# Kanby — Collaborative Kanban (Monorepo)

Production-grade collaborative Kanban board built with:

- **Frontend**: Quasar v2 (Vue 3 + Vite) + TypeScript + Pinia
- **Backend**: Node.js + Fastify (TypeScript) + Socket.IO
- **DB**: Prisma + SQLite (local dev), easy switch to Postgres via `DATABASE_URL`
- **Shared**: DTOs + Zod schemas in `packages/shared`

## Repo layout

- `apps/web` — Quasar SPA
- `apps/api` — Fastify REST API + Socket.IO
- `packages/shared` — shared types/schemas/utils

## Prereqs

- Node.js 18+ (recommended 20+)

## Env vars

API (`apps/api`):

- `DATABASE_URL` (default: `file:./dev.db`)
- `PORT` (default: `4000`)
- `CORS_ORIGIN` (default: `http://localhost:9000`)
- `DEMO_USER_ID` (optional; otherwise uses header `X-User-Id` or seeded demo user)

Web (`apps/web`):

- `VITE_API_URL` (default: `http://localhost:4000`)

## Run locally

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: <http://localhost:9000>
- API: <http://localhost:4000>

## Scripts

- `npm run dev` — runs shared build watch + api + web
- `npm run dev:web` — runs web only
- `npm run dev:api` — runs api only
- `npm run db:migrate` — runs Prisma migrations
- `npm run db:seed` — seeds demo data

# Phase 0 — Project Foundation

**Status: COMPLETE** (verified 2026-08-30)

## What was built

- npm-workspaces + Turborepo monorepo: `apps/web`, `apps/api`, `apps/worker`,
  `packages/database`, `packages/config`, `packages/types`.
- `apps/web`: Next.js 16 (App Router, TypeScript, Tailwind 4), landing page with a live
  API health widget, `getGreeting` dashboard util + tests.
- `apps/api`: NestJS 11 with global Prisma and Redis (ioredis) modules and
  `GET /health` reporting per-dependency status/latency (error details reduced to error
  class names so connection strings cannot leak).
- `apps/worker`: BullMQ 5 heartbeat queue — pure, tested job handler separated from queue
  plumbing; enqueues and processes a startup heartbeat to prove the Redis round-trip.
- `packages/database`: Prisma 6 schema (`health_checks` only — domain models arrive with
  their phases), initial migration `20260830122707_init`, client factory.
- `packages/config`: zod-validated env loading from the repo-root `.env`, with tests.
- `packages/types`: shared `HealthReport` types.
- Tooling: TypeScript strict (+`noUncheckedIndexedAccess`), ESLint 9 flat configs,
  Prettier, Jest (+ Supertest integration test), GitHub Actions CI with Postgres/Redis
  service containers.
- Infrastructure: `docker-compose.yml` (canonical), plus a **no-Docker Windows dev stack**
  (`npm run devstack:start`): project-local PostgreSQL 18 cluster on :5433 (system
  service untouched) and portable native Windows Redis 8 on :6379 (dev only).

## Verification (all actually run on 2026-08-30)

| Check                                                                                              | Result                                                  |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `npm run build` (Turbo, 6 tasks: web/api/worker/database/config/types)                             | ✅ pass                                                 |
| `npm run typecheck` (5 workspaces)                                                                 | ✅ pass                                                 |
| `npm run lint` (6 workspaces)                                                                      | ✅ pass                                                 |
| `npm run format:check`                                                                             | ✅ pass                                                 |
| `npm run test` — 13 unit tests (web 3, worker 3, config 3, api 4)                                  | ✅ pass                                                 |
| `npm run test:e2e -w @dailylist/api` — Supertest vs real DB+Redis                                  | ✅ pass                                                 |
| `prisma migrate dev` — migration created & applied; `health_checks` + `_prisma_migrations` present | ✅ pass                                                 |
| PostgreSQL connectivity (`SELECT version()` → PostgreSQL 18.3)                                     | ✅ pass                                                 |
| Redis connectivity (`redis-cli ping` → PONG)                                                       | ✅ pass                                                 |
| Manual: built API served `/health` → `{"status":"ok", database up, redis up}`                      | ✅ pass                                                 |
| Manual: built worker processed startup heartbeat job (209ms)                                       | ✅ pass                                                 |
| Manual: built web served landing page (HTTP 200, correct title/content)                            | ✅ pass                                                 |
| CI workflow (`.github/workflows/ci.yml`)                                                           | ⚠ not yet executed — no remote repo; runs on first push |

## Known issues / notes

- The machine has no Docker/WSL, so local dev uses the devstack scripts; Docker compose
  remains the canonical path elsewhere and in CI.
- `binaries.prisma.sh` DNS fails on this network; Prisma engines were fetched via
  `PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma` (one-time
  download; only needed again after Prisma version bumps).
- Port 3000 is occupied by an unrelated pre-existing process on this machine; production
  web verification used `-p 3100`. `next dev` will auto-pick a free port.
- Playwright and packages `scoring`/`messaging`/`ui`/`validation` are deliberately
  deferred to the phases that first need them.

## Next phase

Phase 1 — Authentication + Business Setup (registration, login, sessions, business
creation, memberships, OWNER role, protected routes, tenant-isolation tests).

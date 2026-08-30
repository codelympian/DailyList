# Dailylist — Architecture

## Product in one paragraph

Dailylist is a multi-tenant SaaS daily sales assistant for Nigerian SMEs. It ingests a
business's customer, product, transaction, and lead data (manual entry or CSV/XLSX import),
runs deterministic customer intelligence and a scoring engine over it, and produces a
persisted, explainable **daily recommendation list**: who to contact today, why, and what
to say — with WhatsApp click-to-chat quick send.

## Core loop

```
import / enter business data
        ↓
customer history → customer intelligence → priority scoring
        ↓
daily recommendations (persisted snapshots, reason codes)
        ↓
suggested message → WhatsApp quick send → follow-up outcome → analytics
```

## System components

| Component           | Tech                             | Responsibility                                       |
| ------------------- | -------------------------------- | ---------------------------------------------------- |
| `apps/web`          | Next.js 16, React 19, Tailwind 4 | Mobile-first UI (dashboard, today's list, customers) |
| `apps/api`          | NestJS 11                        | REST API, auth, authorization, tenant isolation      |
| `apps/worker`       | BullMQ 5 + Redis                 | Background jobs: imports, recommendation generation  |
| `packages/database` | Prisma 6 + PostgreSQL            | Schema, migrations, shared DB client                 |
| `packages/config`   | zod + dotenv                     | Validated environment configuration                  |
| `packages/types`    | TypeScript                       | Shared domain/API types                              |

Packages planned but **deliberately not created yet** (added in the phase that first needs
them, to avoid dead code): `packages/scoring` (Phase 6–7), `packages/messaging` (Phase 8–9),
`packages/validation` (Phase 2+ domain validation), `packages/ui` (Phase 10 if extraction
is warranted).

## Architectural principles

1. **Business logic lives in packages/services, not controllers or UI.** Controllers
   validate, authorize, delegate; React components render.
2. **Multi-tenancy is non-negotiable.** Every tenant table carries `business_id`; every
   query derives the business from the authenticated membership, never from client input.
3. **Deterministic core.** Recommendations, scoring, reasons, and all financial arithmetic
   are pure deterministic code with unit tests. AI is an optional layer for message
   _wording_ only, always with a template fallback.
4. **Explainability.** Every recommendation persists reason codes derived from real data.
5. **Jobs are pure functions plus queue plumbing.** Handlers (see
   `apps/worker/src/heartbeat.ts`) are testable without Redis.
6. **Strict TypeScript everywhere** (`strict`, `noUncheckedIndexedAccess`).

## Environments & infrastructure

- **Docker (canonical):** `docker-compose.yml` runs PostgreSQL 16 (:5432) and Redis 7 (:6379).
- **Windows dev box without Docker:** `npm run devstack:start` runs a **project-local**
  PostgreSQL cluster (initdb'd into `infrastructure/devstack/pgdata`, port **5433**, trust
  auth, dev only — the system PostgreSQL service is untouched) and a **portable native
  Windows Redis 8** (downloaded on first run from the `redis-windows` project — dev only,
  never production).
- **CI (GitHub Actions):** service containers for PostgreSQL/Redis; runs migrations, build,
  lint, typecheck, format check, unit tests, and API integration tests on every push/PR.
- **Production (future):** managed PostgreSQL + Redis; `prisma migrate deploy` only.

## Configuration

All services read a single repo-root `.env` through `@dailylist/config`, which validates
with zod and fails fast with readable errors. Secrets are never committed; `.env.example`
documents every variable.

## Health & observability

- `GET /health` on the API reports overall status plus per-dependency (database, redis)
  status and latency. Dependency error details are reduced to error class names so
  connection strings can never leak.
- Monitoring (Sentry etc.) is a future integration; the codebase keeps logging simple and
  structured enough to attach one later.

## Testing strategy

- **Unit:** business rules, scoring, normalization, job handlers (Jest, per workspace).
- **Integration:** API endpoints against real PostgreSQL + Redis (Supertest; local dev
  stack or CI services).
- **E2E (from Phase 10):** Playwright over the full web flow. Not installed in Phase 0 —
  there is no UI flow to test yet.

## Phase status

See [docs/phases/](phases/) — one report per completed phase.

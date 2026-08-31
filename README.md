# Dailylist

**Your daily sales assistant.**

Dailylist analyzes an SME's customer and sales data and answers one question every morning:

> **"Who should I contact today?"** — who, why, and what to say.

It is not a CRM, not accounting software, and not inventory management. It is a prioritized
daily contact list with explainable reasons and suggested messages, built mobile-first for
Nigerian SME owners.

## Monorepo layout

```
apps/
  web/        Next.js frontend (TypeScript, Tailwind)
  api/        NestJS backend API
  worker/     BullMQ background worker
packages/
  database/   Prisma schema, migrations, DB client
  config/     Zod-validated environment configuration
  types/      Shared TypeScript types
infrastructure/
  devstack/   Local (no-Docker) dev PostgreSQL + Redis for Windows
docs/         Architecture and phase documentation
```

Further packages (`scoring`, `messaging`, `ui`, `validation`) are added in the phase that
first needs them — see [docs/architecture.md](docs/architecture.md).

## Prerequisites

- Node.js >= 20 (npm >= 10)
- **Either** Docker (recommended where available) **or**, on Windows without Docker:
  a local PostgreSQL installation (for its binaries only) — the dev stack scripts manage
  a project-local database instance and a portable Redis automatically.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Environment
cp .env.example .env          # PowerShell: Copy-Item .env.example .env

# 3. Start infrastructure
docker compose up -d          # with Docker
npm run devstack:start        # OR: Windows without Docker (Postgres on :5433 + Redis on :6379)
#    (with Docker, set DATABASE_URL in .env to the :5432 URL from .env.example comments)

# 4. Apply database migrations
npm run db:migrate

# 5. Run everything in dev mode
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 — health check at [`/health`](http://localhost:4000/health)

## Scripts

| Command                              | What it does                                     |
| ------------------------------------ | ------------------------------------------------ |
| `npm run dev`                        | Start web, api, and worker in watch mode         |
| `npm run build`                      | Build all workspaces (topologically, via Turbo)  |
| `npm run test`                       | Run unit tests in all workspaces                 |
| `npm run test:e2e -w @dailylist/api` | API integration tests (needs DB + Redis)         |
| `npm run test:e2e -w @dailylist/web` | Browser E2E, mobile + desktop (needs the API)    |
| `npm run lint`                       | Lint all workspaces                              |
| `npm run typecheck`                  | Typecheck all workspaces                         |
| `npm run format`                     | Prettier write                                   |
| `npm run db:migrate`                 | Prisma migrate dev                               |
| `npm run devstack:start`             | Start local no-Docker Postgres + Redis (Windows) |
| `npm run devstack:stop`              | Stop the local dev stack                         |

### Running the browser E2E suite

```bash
npm run build                       # API and web must be built
node apps/api/dist/main.js          # start the API on :4000
npm run test:e2e -w @dailylist/web  # Playwright starts the web app itself
```

## Development rules

The MVP is built strictly in phases (0–10) — **all eleven are complete**. A phase
is done only when it is implemented, tested, linted, typechecked, built and
documented. See [docs/architecture.md](docs/architecture.md) and
[docs/phases/](docs/phases/) for what each phase delivered and how it was verified.

`.claude/skills/dailylist-phase/` encodes that workflow for future sessions.

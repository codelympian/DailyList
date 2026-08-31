---
name: dailylist-phase
description: Build, verify and ship one phase of the Dailylist MVP. Use when the user says "start phase N", asks to continue the phased build, or asks to add a feature to Dailylist that should follow the same discipline (schema → pure package → API → web → full verification → phase doc → commit). Also covers this repo's verification commands and its known environment gotchas.
---

# Building a Dailylist phase

Dailylist is a multi-tenant SaaS daily sales assistant for Nigerian SMEs. It is
built strictly in phases 0–10. This skill encodes how a phase gets built here.

## The non-negotiable rule

**Never move to the next phase until the current one is implemented, tested,
debugged, typechecked, linted, built, manually verified and documented.** If
something fails, stop and fix it, then re-run verification.

Never claim something works unless you actually ran it. If a check cannot be
run in this environment, say so explicitly rather than implying it passed.

## Order of work

1. **Schema** — edit `packages/database/prisma/schema.prisma`, then migrate
   (see command below). Add the reverse relation on every related model or the
   migration fails.
2. **Pure logic first** — put domain rules in a `packages/*` package with no I/O
   so they are unit-testable without a database: `scoring` (intelligence,
   ranking), `messaging` (templates, guardrails, WhatsApp links), `importer`
   (parsing, normalization), `validation` (zod schemas shared with the web app).
   Write the unit tests here; they are the fast feedback loop.
3. **API** — a NestJS module under `apps/api/src/<feature>/`. Every tenant route
   goes under `businesses/:businessId/...` with
   `@UseGuards(SessionAuthGuard, BusinessMemberGuard)` and `@RequireRoles(...)`
   on mutations.
4. **Web** — a hook in `apps/web/src/hooks/` plus pages under
   `apps/web/src/app/`. Mobile-first; the owner is on a phone.
5. **e2e tests** — `apps/api/test/<feature>.e2e-spec.ts` against the real test
   database. Add any new table to the `TRUNCATE` list in
   `apps/api/test/global-setup.ts`, or the suite pollutes across runs.
6. **Verify everything** (below), **write the phase doc**, **commit**.

## Architectural invariants — do not violate these

- **Tenant isolation.** Never trust `businessId` from the client for
  authorization. Resolve it through the authenticated user's membership;
  non-members get **404**, never 403, so existence is not revealed.
- **Money is deterministic.** All financial arithmetic uses `Prisma.Decimal` via
  `apps/api/src/transactions/money.ts`. Never floats. Never AI. Status is
  derived from amounts; `amountDue = amount − amountPaid`.
- **Denormalized customer stats are recomputed from aggregates** inside the same
  transaction as the write, never incremented, so they cannot drift.
- **AI never decides anything.** It may only reword a message that was already
  produced deterministically, and its output must pass
  `packages/messaging/src/guardrails.ts` (no number that was not supplied as a
  fact; no stock/price/discount/delivery claims). Any failure falls back to the
  template. The product must work fully with AI disabled — that is the default.
- **Never claim what we cannot observe.** With click-to-chat we know only
  `WHATSAPP_OPENED` / `COPIED`. There is no delivered/read/replied, and none may
  be added without a real WhatsApp Business Platform integration.
- **Explainability.** Every recommendation stores reason codes *and* frozen
  human-readable reason text derived from measured data.

## Verification commands

Run all of these from the repo root before declaring a phase done:

```bash
npm run build        # all workspaces
npm run typecheck
npm run lint
npm run format       # then: npm run format:check
npm run test         # unit tests, all workspaces
```

e2e must be run from `apps/api` (Turbo does not run it):

```bash
cd apps/api && npx jest --config test/jest-e2e.json --runInBand
```

Then **manually verify the real workflow** against built servers:

```bash
node apps/api/dist/main.js                       # API on :4000
cd apps/web && npx next start -p 3100            # web on :3100
```

Seed data through the real API with `curl` and a cookie jar, then check the
actual output. Stop the servers and delete any log files afterwards.

## Environment gotchas (this machine)

- **Migrations need the Prisma engine mirror** — `binaries.prisma.sh` does not
  resolve here:
  ```bash
  PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma \
    npm run db:migrate -w @dailylist/database -- --name <migration_name>
  ```
- **Running dev servers lock the Prisma engine DLL.** If `prisma generate` fails
  with `EPERM ... query_engine-windows.dll.node`, stop the `npm run dev`
  processes first, regenerate, and tell the user to restart them.
- **Port 3000 is occupied** by an unrelated long-running process. Use `-p 3100`
  for manual checks. `API_CORS_ORIGIN` accepts a comma-separated list.
- **Infrastructure**: no Docker here. `npm run devstack:start` runs a
  project-local PostgreSQL on **:5433** and a portable Redis on :6379.
- **Commit messages**: write them to a file and use `git commit -F <file>`.
  PowerShell here-strings mangle multi-line messages.
  **Never add a `Co-Authored-By` trailer** — the user removed them from history.
- **npm installs are slow** (minutes). Run them with `run_in_background: true`
  and continue writing code meanwhile.

## Traps that have already bitten this codebase

- Adding a column to the schema but forgetting the zod update schema, so the
  setting is silently unedittable (`dailyListSize`). Wire new settings through
  schema → API response type → UI.
- `ZodValidationPipe` needs `ZodType<T, ZodTypeDef, unknown>`; schemas with
  `.transform()`/`.default()` have different input and output types.
- react-hook-form with such a schema needs three generics:
  `useForm<FormInput, unknown, ParsedOutput>`.
- BullMQ does **not** close a Redis connection you pass in — the owning service
  must `quit()` it, or the process (and jest) hangs forever.
- Turbo caches test results; a passing suite may be stale. If a test's premise
  depends on the environment (e.g. reading the repo `.env`), make it hermetic.
- `noUncheckedIndexedAccess` is on: indexing a `Record` yields `T | undefined`.
- Express 5 types route params as `string | string[]`.
- Don't put a literal BOM in source — lint rejects irregular whitespace.

## Finishing a phase

1. Write `docs/phases/phase-N.md`: what was built, a verification table with
   **actual** results, each acceptance criterion mapped to its evidence, bugs
   found and fixed, known issues, and the next phase.
2. `npm run format`, then commit and push.
3. Report to the user in this shape: what was implemented, verification results
   (with real numbers), any bug found during verification, anything that could
   **not** be verified here and why, and what the next phase is.

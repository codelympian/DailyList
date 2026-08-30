# Phase 1 — Authentication + Business Setup

**Status: COMPLETE** (verified 2026-08-30)

## What was built

### Database (migration `20260830133759_auth_business`)

- `users` — email (unique, lowercased), argon2id `password_hash`, name.
- `sessions` — DB-backed sessions storing only a **sha256 hash** of the opaque token
  (the raw token lives solely in the httpOnly cookie), 30-day expiry, `last_used_at`.
- `businesses` — name, optional industry, currency (default `NGN`).
- `business_memberships` — user↔business with `OWNER | ADMIN | STAFF` role,
  unique `(user_id, business_id)`. Creator becomes OWNER atomically (transaction).

### API (NestJS)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- `POST /businesses`, `GET /businesses`, `GET /businesses/:id`.
- Session cookie: httpOnly, SameSite=Lax, Secure in production, 30 days.
- `SessionAuthGuard` + `@CurrentUser()`; all business routes require authentication.
- **Tenant isolation:** businesses are always looked up through the caller's
  membership; non-members receive 404 (existence never revealed). `business_id`
  is never accepted from the client for authorization decisions.
- Rate limiting: global 100/min; 10/min on register/login (skipped under NODE_ENV=test).
- Login timing: unknown emails burn a dummy argon2 verification to prevent
  user enumeration via response timing; unknown email and wrong password return
  the identical 401 message.
- Validation via shared zod schemas (`@dailylist/validation`) through a
  `ZodValidationPipe` returning consistent `{ statusCode, message, details[] }` errors.

### Shared packages

- `@dailylist/validation` (new): register/login/create-business schemas used by both
  API and web.
- `@dailylist/types`: `AuthUser`, `BusinessSummary`, `MeResponse`, `ApiErrorBody`.

### Web (Next.js)

- shadcn/ui initialized (base-nova preset, Base UI primitives): button, input, label,
  card, field components.
- TanStack Query provider; `api()` fetch wrapper (credentials included, typed errors).
- Pages: `/login`, `/register`, `/onboarding` (business creation), `/dashboard`
  (protected; redirects to onboarding when the user has no business), landing page
  with Get started / Log in.
- `AuthGate` protects pages client-side: 401 → redirect to `/login`.
- Forms: react-hook-form + zodResolver against the shared schemas.

### Test infrastructure

- e2e runs against a dedicated `dailylist_test` database: jest globalSetup applies
  migrations and truncates Phase 1 tables; setup-env pins `DATABASE_URL` before any
  module loads. Dev data is never touched.

## Verification (all actually run on 2026-08-30)

| Check                                                                                                                                                                          | Result  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `npm run build` — 7 workspaces                                                                                                                                                 | ✅ pass |
| `npm run typecheck` / `npm run lint` / `npm run format:check`                                                                                                                  | ✅ pass |
| Unit tests: 31 total (validation 9, api 13, web 3, worker 3, config 3)                                                                                                         | ✅ pass |
| e2e: 15 tests — register/login/logout, 409 duplicate, 400 details, forged cookie 401, protected routes 401, OWNER creation, tenant isolation (cross-user 404 + list exclusion) | ✅ pass |
| Migration applied to dev and test databases                                                                                                                                    | ✅ pass |
| Manual (running servers): register → create business → me → logout → 401 via curl                                                                                              | ✅ pass |
| Manual: rate limit on /auth/login — 10×401 then 429s                                                                                                                           | ✅ pass |
| Manual: web `/`, `/login`, `/register`, `/dashboard` all HTTP 200, content renders                                                                                             | ✅ pass |

## Known issues / notes

- Route protection on the web is client-side (AuthGate); the API is the security
  boundary. Server-side middleware protection can be layered in Phase 10 polish.
- A user's first business is treated as their active business (single-business UX);
  multi-business switching UI is future work — the data model already supports it.
- Sessions are not yet listed/revocable per-device (future settings feature).

## Next phase

Phase 2 — Customer Management (CRUD, search, pagination, phone normalization,
customer identities, duplicate detection, profile + timeline foundation).

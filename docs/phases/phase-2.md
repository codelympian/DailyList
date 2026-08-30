# Phase 2 — Customer Management

**Status: COMPLETE** (verified 2026-08-30)

## What was built

### Database (migration `customers`)

- `customers` — name, normalized E.164 phone, email, notes, source, lifecycle_stage,
  tags[], denormalized purchase stats (total_spend, purchase_count, last_purchase_at,
  last_contacted_at — maintained from Phase 3), soft delete (`deleted_at`).
- `customer_identities` — PHONE/EMAIL/WHATSAPP/INSTAGRAM/EXTERNAL_ID, normalized value,
  **unique per (business, type, value)** — the duplicate-detection backbone.
- `customer_events` — timeline foundation with the full planned event-type enum;
  Phase 2 writes CUSTOMER_CREATED / CUSTOMER_UPDATED.

### Phone normalization (`@dailylist/validation`)

`normalizePhone`: `08012345678`, `0801 234 5678`, `8012345678`, `2348012345678`,
`+234…` → `+2348012345678`; other international `+…` kept; invalid prefixes/lengths
rejected with helpful messages. 24 dedicated unit tests.

### API

- `POST/GET/PATCH/DELETE /businesses/:businessId/customers(/:id)` + `GET :id/timeline`.
- `BusinessMemberGuard`: resolves `:businessId` against the authenticated user's
  memberships (client value never trusted for authorization; non-members → 404) and
  enforces `@RequireRoles` — mutations are OWNER/ADMIN; STAFF is read-only.
- Search (name insensitive, email, phone in any format), tag filter, pagination
  (max pageSize 100). Duplicate detection: exact normalized phone/email match → 409
  with the existing customer's id/name; per-tenant (same phone allowed in another
  business). Soft delete frees identities for reuse while preserving history.
- All writes are transactional (customer + identities + timeline event).

### Web

- `/customers` — searchable, paginated list (mobile-first cards), empty states.
- `/customers/new`, `/customers/[id]/edit` — shared CustomerForm with inline zod
  errors and a duplicate banner naming the existing customer.
- `/customers/[id]` — profile: contact info, tags, spend/purchases/last-purchase stat
  cards, notes, reusable `<Timeline>` component.
- Dashboard links to Customers.

## Verification (all actually run on 2026-08-30)

| Check                                                                                                                                                                                                                                                                  | Result  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Build / typecheck / lint / format — all workspaces                                                                                                                                                                                                                     | ✅ pass |
| Unit tests: 63 (validation 41 incl. 24 phone cases, api 13, web 3, worker 3, config 3)                                                                                                                                                                                 | ✅ pass |
| e2e: 34 — incl. 19 customer tests: normalization, 409 duplicates (any format), per-tenant identity scoping, pagination, search by name/phone, tag filter, update+identity resync, clear-with-null, timeline order, soft delete + phone reuse, 5 tenant-isolation cases | ✅ pass |
| Manual: live API — create (0801… → +234…), duplicate 409, search; web pages 200                                                                                                                                                                                        | ✅ pass |
| Migration applied to dev + test databases                                                                                                                                                                                                                              | ✅ pass |

## Known issues / notes

- Delete uses a native browser confirm dialog (adequate for MVP; can be upgraded in
  Phase 10 polish).
- Tag management has no dedicated UI yet (tags render in lists/profiles; the API
  supports them — import and intelligence phases will populate them).
- STAFF-role behavior is enforced by the guard and covered indirectly; a member-invite
  API (needed to e2e-test STAFF end-to-end) is future work.

## Next phase

Phase 3 — Products + Transactions (product CRUD, transactions with payment status,
outstanding balances, customer purchase statistics).

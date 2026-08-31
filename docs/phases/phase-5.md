# Phase 5 — CSV/XLSX Import

**Status: COMPLETE** (verified 2026-08-31)

## What was built

### Database (migration `imports`)

- `import_jobs` — file name/type, status (PENDING_MAPPING → VALIDATING → PREVIEW →
  IMPORTING → COMPLETED/FAILED/CANCELLED), detected `columns`, `suggested_mapping`,
  confirmed `mapping`, and counts (total/valid/invalid/duplicate/imported/skipped).
- `import_rows` — **staging table**: original `raw` cells, `normalized` values,
  per-row status, field-level `errors`, and `duplicate_of_customer_id`.
  Uploaded data never touches production tables until the user confirms.

### `packages/importer` (new, pure + orchestration)

- **Column detection** — flexible aliases matched on a normalized header form, so
  `Customer Name` / `Full Name` / `customer_name`, `Phone Number` / `Mobile` /
  `WhatsApp`, `Product Purchased` / `Item`, `Amount` / `Price` / `Total`,
  `Date Bought` / `Purchase Date`, `Amount Due` / `Balance` all map automatically.
- **Normalization** — phones to E.164 (reusing Phase 2's normalizer), money from
  `₦18,000` / `NGN 2500` / `18,000.50`, dates from ISO, day-first `15/07/2026`
  (Nigerian convention), and Excel serial numbers.
- **Validation** — name required, per-field error messages, balance ≤ amount,
  balance requires amount.
- **Duplicate detection** — against existing customer identities (records the
  matched customer id) _and_ within the file itself (names the earlier row).
- **Execution** — creates customer + identities + timeline event, and when amount
  data exists, a transaction with derived payment status (`amount − balance` paid),
  payment record, PURCHASE/DEBT_CREATED events, and recomputed customer statistics
  using the same Decimal invariants as Phase 3. A failing row is recorded and
  skipped; it never aborts the run.

### API

- `POST /imports` (multipart, 5MB / 5000-row caps), `POST :id/mapping`,
  `POST :id/confirm`, `POST :id/cancel`, `GET :id/rows?status=`, `GET :id/error-report`
  (CSV of every row not imported, with reasons), `GET /imports` history.
- **Small jobs (≤ 500 rows) run inline; larger jobs are queued to BullMQ** so
  interactive requests stay fast.
- Mapping is validated against the file's real columns and requires a name column.
  Confirm is refused unless the job is in PREVIEW (no double-imports).

### Worker

Consumes the `imports` queue using the same shared orchestration as the API, so
inline and background paths cannot diverge.

### Web

Wizard at `/imports` → `/imports/[id]`: drag-and-drop upload → editable field
mapping (pre-filled from detection, duplicate columns disabled) → preview with
Ready/Duplicates/Problems tabs and per-row error messages → confirm → results with
counts and an error-report download. Polls while the worker runs. History list on
`/imports`; dashboard links to it.

## Verification (all actually run on 2026-08-31)

| Check                                                                                                                                                                                                                                                                                                                                                                       | Result  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Build (8 workspaces) / lint (13) / typecheck (13) / format                                                                                                                                                                                                                                                                                                                  | ✅ pass |
| Unit tests: 120 total, incl. 29 new importer tests (column aliases, phone/money/date parsing, row validation)                                                                                                                                                                                                                                                               | ✅ pass |
| e2e: 80 total, incl. 16 new import tests: CSV upload + detection, unsupported type, empty file, mapping validation, preview counts (3 valid / 2 invalid / 2 duplicate), field-level errors, existing + intra-file duplicates, confirm, customer/transaction/debt/timeline creation, no double-import, error report CSV, history, **full XLSX round-trip**, tenant isolation | ✅ pass |
| Jest exits cleanly (no hang) after fixing a real Redis connection leak                                                                                                                                                                                                                                                                                                      | ✅ pass |
| Manual: 1200-row CSV → queued to worker; mapping returned in 312ms, confirm in 567ms; worker logged validate + execute; **1200 customers imported while `/auth/me` stayed HTTP 200 (203–373ms) throughout**                                                                                                                                                                 | ✅ pass |
| Manual: `/imports` and `/imports/[id]` serve                                                                                                                                                                                                                                                                                                                                | ✅ pass |

## Bugs found and fixed during this phase

- **Redis connection leak**: BullMQ does not close a connection you pass in, so the
  API process (and jest) never exited. The queue service now owns and quits its own
  connection on shutdown.
- A `setState` inside `useEffect` in the wizard (cascading re-renders) — replaced
  with derived state.

## Known issues / notes

- Import creates new customers only; merging into an existing customer (rather than
  skipping the duplicate) is deliberately deferred — the row and its matched
  customer id are recorded so a merge UI can be added later.
- Uploaded files are parsed in memory and not retained; only staged rows persist.
- React Compiler emits one advisory about react-hook-form's `watch()` in the
  Phase 3 sale form (library limitation, not a defect).

## Next phase

Phase 6 — Customer Intelligence (deterministic segments: HOT_LEAD, REORDER_DUE,
DEBTOR, LOST_CUSTOMER, REPEAT_CUSTOMER, VIP; feature extraction and reason codes).

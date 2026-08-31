# Phase 6 — Customer Intelligence

**Status: COMPLETE** (verified 2026-08-31)

## What was built

### Database (migration `intelligence_settings`)

- `business_settings` — every threshold the engine uses, per business:
  VIP spend, repeat-purchase count, default reorder interval, reorder-due
  percentage, lost multiple/fallback days, hot-lead window, minimum contact
  interval, post-purchase quiet period. **Nothing is hardcoded.**
- `communication_preferences` — consent per channel (WhatsApp/SMS/Email) with
  opt-in/opt-out timestamps and source.
- `customers` gains `contact_attempt_count` and `last_response_at` for contact
  fatigue tracking (alongside the existing `last_contacted_at`).

### `packages/scoring` (new — pure, deterministic, no AI)

The engine is a pure function of `(features, settings, now)`: no I/O, no clock
access, no randomness. Same inputs always give the same classification.

- **Feature extraction** derives days-since-purchase/contact/lead-activity, the
  customer's average purchase rhythm, and the _expected reorder interval_ —
  resolved in priority order and labelled with its source so the UI can explain
  it: `PRODUCT` (the interval on what they actually bought) → `HISTORY` (their
  own rhythm) → `DEFAULT` (business fallback).
- **Segments** (all overlapping, never mutually exclusive): HOT_LEAD,
  REORDER_DUE, DEBTOR, LOST_CUSTOMER, REPEAT_CUSTOMER, VIP.
- **Reason codes** on every match, plus measured `facts` used to render them.
- **Suppression** (always beats scoring): OPTED_OUT, RECENTLY_CONTACTED,
  PURCHASED_RECENTLY, NO_CONTACT_METHOD, NO_ACTIVITY. A suppressed customer has
  an empty `eligibleSegments` list. Debt is deliberately still chased right
  after a purchase.
- **Lifecycle**: LEAD → CUSTOMER → INACTIVE → LOST.
- **Explanations** render reason codes into the owner's sentences ("Ada normally
  buys every 30 days", "Last purchase of Glow Serum was 32 days ago", "Owes
  ₦20,000") strictly from measured facts — nothing is generated or invented.

### API

- `GET /businesses/:id/customers/:id/intelligence` — segments, reasons,
  eligibility, suppression reasons, and the underlying features.
- `GET /businesses/:id/intelligence/segments` — counts, split into total vs
  eligible, plus how many customers are on hold.
- `GET /businesses/:id/intelligence/customers?segment=&includeSuppressed=` —
  customers in a segment (eligible only by default).
- `GET/PATCH /businesses/:id/settings` — read/tune the thresholds.
- `POST /businesses/:id/customers/:id/communication-preference` — opt in/out.
- **Performance**: `FeatureRepository` loads every input with a fixed number of
  queries regardless of customer count, using Postgres `DISTINCT ON` (via
  Prisma `distinct`) for "latest transaction/lead per customer" — no N+1.

### Web

- Customer profile: a "Why contact them" card with segment badges, the plain
  reasons, any suppression notice ("Contacted recently — giving them space"),
  and a WhatsApp opt-out toggle.
- `/segments` — segment tiles with eligible counts, drill-down into who is ready
  to contact and why.
- `/settings` — every engine threshold, with plain-language explanations.

## Verification (all actually run on 2026-08-31)

| Check                                                                                                                                                        | Result  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Build (9) / typecheck (15) / lint (15) / format                                                                                                              | ✅ pass |
| Unit tests: 158 total, incl. **38 new scoring tests** — all 8 specification cases plus rule boundaries, overlap, lifecycle, explanations, determinism        | ✅ pass |
| e2e: 96 total, incl. **16 new intelligence tests against real database state** (aggregates, joins, settings round-trips, opt-out toggling, tenant isolation) | ✅ pass |
| Manual: 1200-customer business analyzed in **805ms**, correctly classified                                                                                   | ✅ pass |
| Manual: `/segments`, `/settings` pages serve                                                                                                                 | ✅ pass |

### The eight specification cases — verified twice (unit + e2e against the DB)

| Case                                             | Expected           | Result                                     |
| ------------------------------------------------ | ------------------ | ------------------------------------------ |
| 1. Buys every 30 days, last purchase 32 days ago | REORDER_DUE        | ✅ (interval source `PRODUCT`)             |
| 2. Opted out                                     | Never recommended  | ✅ segments kept, `eligibleSegments` empty |
| 3. Contacted yesterday, interval 7 days          | Suppressed         | ✅ `RECENTLY_CONTACTED`                    |
| 4. Owes ₦20,000                                  | DEBTOR             | ✅ reason renders "Owes ₦20,000"           |
| 5. Purchased today                               | Reorder suppressed | ✅ not reorder-due, `PURCHASED_RECENTLY`   |
| 6. Asked about price 3 days ago, no purchase     | HOT_LEAD           | ✅ names the product                       |
| 7. Lifetime spend ≥ VIP threshold                | VIP                | ✅ respects per-business threshold         |
| 8. No purchases, no leads                        | Not recommended    | ✅ no segments, `NO_ACTIVITY`              |

## Known issues / notes

- Segment computation is on-demand (fast enough at 805ms/1200 customers). Phase 7
  persists daily snapshots, which also gives caching.
- `contact_attempt_count` / `last_response_at` columns exist and are read by the
  engine's inputs, but nothing writes them until the follow-up flow in Phases 9–10.
- Opting out of _any_ channel currently suppresses all follow-ups; per-channel
  granularity matters once SMS/email are actually sent (post-MVP).

## Next phase

Phase 7 — Daily Recommendation Engine (candidate generation, scoring, ranking,
persisted `DailyRecommendation` snapshots with reason codes).

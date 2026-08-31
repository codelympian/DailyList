# Phase 4 — Leads + Customer Timeline

**Status: COMPLETE** (verified 2026-08-31)

## What was built

### Database (migration `leads`)

- `leads` — customer + optional product reference, free-text description (for
  non-catalog interest), status (NEW/CONTACTED/INTERESTED/QUOTED/NEGOTIATING/WON/LOST),
  source, estimated_value, notes, **last_activity_at** (recency signal for HOT_LEAD
  scoring in Phases 6/7), closed_at (set on WON/LOST, cleared on reopen).
- `CustomerEventType` gains `LEAD_STATUS_CHANGED`.

### API (`/businesses/:businessId/leads`)

- Create (product or description required; product tenant-verified), list with
  status/customer filters ordered by last activity, get, update fields, and
  `PATCH :id/status` for transitions.
- Every status change logs a human-readable timeline event ("Quote sent for Glow
  Serum", "Lead won — Glow Serum 🎉") with `{leadId, from, to}` payload; creation
  logs "Interested in …". `lastActivityAt` bumps on every change.
- WON/LOST set `closedAt`; reopening clears it. Mutations OWNER/ADMIN; STAFF read-only.

### Web

- Customer profile: Leads card with an **inline status selector** per lead, plus
  an "Add lead" button.
- `/leads/new?customerId=` — product picker or free description, estimated value, notes.
- `/leads` — global list with status filter chips (All/NEW/…/LOST), pagination,
  reusing the same `LeadList` component; dashboard links to it.
- Timeline shows lead events with icons; chronology unchanged (newest first).

## Verification (all actually run on 2026-08-31)

| Check                                                                                                                                                                                                                                                                                                                                                               | Result  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Build / typecheck / lint — all workspaces                                                                                                                                                                                                                                                                                                                           | ✅ pass |
| Unit tests: 91 total (validation 65 incl. 14 new lead tests; api 20; web/worker/config 9)                                                                                                                                                                                                                                                                           | ✅ pass |
| e2e: 64 total — 13 new: product & description-only leads, neither → 400, tenant isolation, field update bumps lastActivityAt, NEW→CONTACTED→QUOTED→WON walk with closedAt, reopen clears closedAt, invalid status 400, status/customer filters, timeline contains all six event kinds in strict newest-first order with CUSTOMER_CREATED oldest, readable WON title | ✅ pass |
| Manual live API: create lead → QUOTED → WON with closedAt; timeline shows readable titles in order                                                                                                                                                                                                                                                                  | ✅ pass |
| Manual web: /leads and /leads/new serve                                                                                                                                                                                                                                                                                                                             | ✅ pass |
| Migration applied to dev + test databases                                                                                                                                                                                                                                                                                                                           | ✅ pass |

## Known issues / notes

- Lead status transitions are unrestricted (any → any) by design for MVP —
  SME owners correct mistakes freely; a WON lead can be reopened.
- Lead → transaction linking (auto-marking a lead WON when its product is bought)
  is intentionally left for the recommendation/attribution phases.

## Next phase

Phase 5 — CSV/XLSX Import (parsers, import jobs, staging rows, column mapping,
validation, duplicate detection, preview/confirm, background processing).

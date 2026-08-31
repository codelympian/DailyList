# Phase 7 — Daily Recommendation Engine

**Status: COMPLETE** (verified 2026-08-31)

This is the core engine: it answers _"Who should this business contact today?"_

## What was built

### Database (migration `daily_recommendations`)

- `daily_recommendations` — one persisted snapshot per customer per day:
  category, score (0–100), matched segments, reason codes, **frozen reason text**,
  the full score breakdown, status, and a `suggested_message` column reserved for
  Phase 8. Snapshots are stored rather than recomputed on read so history and
  analytics stay stable as customer data changes.
- **`@@unique([businessId, customerId, recommendationDate])`** — duplicate
  recommendations are impossible at the database level.
- `business_settings.dailyListSize` — Top N (default 20).

### Scoring and ranking (`packages/scoring/src/score.ts`, pure)

```
score = categoryBase + urgency + customerValue + engagement − contactFatigue
```

- **Category base** — the intrinsic strength of the reason: HOT_LEAD 50,
  DEBTOR 45, REORDER_DUE 42, LOST_CUSTOMER 28. Active buying intent outranks
  money owed, which outranks a predicted need, which outranks a win-back.
- **Urgency (0–25)** is category-specific: lead freshness, debt size (log scale,
  so one huge invoice cannot permanently crowd out everyone), how far past due a
  reorder is, and how winnable a lapsed customer still is.
- **Customer value (0–15)** relative to the business's own VIP bar;
  **engagement (0–10)** from purchase frequency.
- **Contact fatigue (−25)** softens anyone contacted recently so fresh
  candidates rise. (Hard suppression already blocks the minimum interval.)
- Normalized to 0–100, then **ranked** highest-first with deterministic
  tie-breaking (category priority, then id) so ordering never flickers.
- No ML, no LLM: an AI never decides who to contact.

### Pipeline (`RecommendationService.generate`)

```
customer data → features → eligibility → suppression → candidate pool
→ scoring → ranking → top N → reasons → persisted snapshot
```

- Suppressed customers never enter the pool; customers with no actionable
  category are never recommended arbitrarily.
- **Idempotent**: re-running refreshes PENDING cards, never overwrites a card
  the owner already acted on, and removes untouched cards that no longer qualify.
- Today's list is generated lazily on the first request of the day (no scheduler
  needed for MVP; 1200 customers score in well under a second).

### Status transitions close the contact-fatigue loop

Marking a card CONTACTED/COMPLETED/CONVERTED writes `lastContactedAt`,
increments `contactAttemptCount`, and logs a FOLLOW_UP timeline event — which is
exactly what suppresses that customer from the following days' lists. SKIPPED
logs FOLLOW_UP_SKIPPED and deliberately does _not_ count as contact.

### API + Web

- `GET /recommendations` (today's list, filters), `GET /recommendations/summary`
  (counts and progress), `POST /recommendations/generate`, `PATCH /:id/status`.
- `/today` — greeting, "N people to contact", the four category tiles
  (🔥 Hot leads · 💰 Reorders · 💳 Unpaid · 😴 Reactivation), recommendation cards
  with score, "WHY TODAY?" reasons, Mark done / Skip, and a collapsed done list.
  (The full polished dashboard, WhatsApp send and suggested messages are
  Phases 8–10.)

## Verification (all actually run on 2026-08-31)

| Check                                                                                                                                                                          | Result  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Build (9) / typecheck (15) / lint (15) / format                                                                                                                                | ✅ pass |
| Unit tests: 174 total, incl. **16 new scoring/ranking tests** (category priority, bounds, component attribution, urgency ordering, fatigue penalty, determinism, tie-breaking) | ✅ pass |
| e2e: 113 total, incl. **17 new engine tests**                                                                                                                                  | ✅ pass |
| Manual: realistic business seeded via the API → list generated correctly                                                                                                       | ✅ pass |

### Acceptance criteria, each verified

| Criterion                           | Evidence                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Candidates generated                | ✅ list produced from real customer data                                                                                            |
| Suppression works                   | ✅ opted-out, recently-contacted, just-purchased and no-activity customers all excluded                                             |
| Scoring works                       | ✅ breakdown sums exactly to the score; component ordering tested                                                                   |
| Ranking works                       | ✅ scores strictly descending; deterministic tie-breaks                                                                             |
| Daily recommendations persist       | ✅ rows match the API response exactly                                                                                              |
| Recommendations are explainable     | ✅ every card carries reason codes + frozen text ("Ada normally buys every 30 days", "Last purchase of Glow Serum was 40 days ago") |
| Contact fatigue works               | ✅ marking done sets `lastContactedAt`; that customer is then suppressed (`RECENTLY_CONTACTED`)                                     |
| Opt-outs work                       | ✅ opted-out debtor never appears                                                                                                   |
| Recently purchased suppressed       | ✅ customer who bought today excluded                                                                                               |
| Duplicate recommendations prevented | ✅ repeated generation keeps counts stable; DB rejects a manual duplicate insert                                                    |

**Manual end-to-end walkthrough** (live servers): a seeded business produced
`Ngozi Eze — HOT_LEAD 75 ("Asked about Glow Serum today", "Has not purchased yet")`,
`Bola Ade — DEBTOR 72 ("Owes ₦20,000")`, `Ada Okafor — REORDER_DUE 59`, ranked by
score. Marking the top card done moved the summary from 3 pending / 0 done to
2 pending / 1 done; regeneration preserved it without duplicating; and that
customer then reported `eligible: false, suppressionCodes: ["RECENTLY_CONTACTED"]`.

## Bug found and fixed during this phase

`dailyListSize` was added to the database but omitted from the settings update
schema, so it was silently unedittable — caught by the "honours the configured
daily list size" test, then wired through the schema, API response type and
settings UI.

## Known issues / notes

- Generation is synchronous (fast enough: ~800ms for 1200 customers). The service
  is structured so it can move to the worker queue unchanged if needed.
- `suggestedMessage` is intentionally null until Phase 8.
- There is no scheduler; the list materializes on the day's first request.

## Next phase

Phase 8 — Suggested Messages (deterministic templates per category, an optional
AI layer that can never invent facts, and template fallback).

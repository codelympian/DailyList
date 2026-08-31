# Phase 10 — Dailylist Dashboard + MVP Polish

**Status: COMPLETE** (verified 2026-08-31) — **the MVP is complete.**

## Design direction

Two skills guided this phase (`.claude/skills/frontend-design`,
`.claude/skills/mobile-app-ui-design`). The `dashboard` skill was deliberately
**not** used as the primary reference: it is a dark, dense cloud-platform
aesthetic built for operators watching a control panel, and Dailylist is a
light, sparse list a shop owner glances at between customers.

**Palette (60/30/10).** The app previously used shadcn's default grayscale —
the templated look. It now has an identity drawn from its own world:

| Share | Role                                                             | Colour         |
| ----- | ---------------------------------------------------------------- | -------------- |
| 60%   | Warm paper white — the owner's orders notebook, read in daylight | `--background` |
| 30%   | Warm ink — all text and the confirm action                       | `--foreground` |
| 10%   | **Honey** — Dailylist's own voice only                           | `--honey`      |

Two colours are deliberately outside the brand palette so they keep their
meaning: **WhatsApp green belongs to the send action alone**, and the four
category hues are data, not decoration.

**Signature element: a list that empties.** Dailylist is not a metrics
dashboard — it is a list you finish. Progress runs toward zero and ends in a
real completion state ("You're done for today"), which is the peak-end moment
the whole screen is built around. Honey appears there and almost nowhere else,
so progress always reads as the same colour.

**Type.** One family (Geist), four sizes, two weights, with the mono cut
reserved for figures — counts, money, scores — so numbers align and read as data.

## What was built

- **The dashboard _is_ the daily list.** Previously `/dashboard` was a hub of
  buttons and `/today` held the list, forcing a choice between near-identical
  screens. `/dashboard` is now the list; `/today` redirects.
- **App shell** — navigation in the thumb zone (fixed bottom bar) on a phone,
  a top bar from `sm:` up. Public routes render without chrome.
- **Recommendation card** — category chip, name, score, WHY TODAY?, suggested
  message, then Send on WhatsApp / Copy / Mark done / Skip. Reading order
  follows the owner's decision; actions sit within thumb reach.
- **Progress + completion**, category filter tiles with live counts, and a
  collapsed "Done today" section.
- **Shared states** (`components/states.tsx`) — loading skeletons, empty states
  that invite an action, and errors that say what to do next.
- **Landing page** that shows the actual product (a sample list) rather than
  describing it.
- **`/more`** for secondary navigation (import, segments, settings, log out).
- **Accessibility**: skip link, `aria-current` on navigation, labelled search,
  `role="progressbar"` with values, `aria-pressed` filters, visible focus rings,
  44px+ tap targets, `motion-reduce` on every animation, and card titles that
  are now real headings.

## Verification (all actually run on 2026-08-31)

| Check                                                    | Result  |
| -------------------------------------------------------- | ------- |
| `npm run build` — 10 workspaces                          | ✅ pass |
| `npm run typecheck` / `lint` / `format:check` — 17 tasks | ✅ pass |
| Unit tests — 236                                         | ✅ pass |
| API integration tests — 138                              | ✅ pass |
| **Playwright E2E — 8 tests, mobile (Pixel 7) + desktop** | ✅ pass |
| Manual: every route returns 200                          | ✅ pass |
| Manual: visual review from real screenshots              | ✅ pass |

### Acceptance criteria

| Criterion                                 | Evidence                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Dashboard loads quickly                   | ✅ static shell + skeletons while data loads                                 |
| Daily recommendations display             | ✅ E2E asserts the card, its reasons and its message                         |
| Categories display correct counts         | ✅ tiles from the summary endpoint                                           |
| Recommendation cards work                 | ✅ E2E exercises a full card                                                 |
| Send WhatsApp works                       | ✅ E2E asserts the `wa.me` link is correct and addressed to the right number |
| Copy works                                | ✅ Copy button records a `COPIED` action                                     |
| Mark Done works                           | ✅ E2E marks done and asserts the completion state                           |
| Skip works                                | ✅ dedicated E2E test                                                        |
| Progress updates                          | ✅ "3 people left" → "You're done for today" asserted in E2E                 |
| Customer profile / timeline work          | ✅ E2E visits both                                                           |
| Import works from UI                      | ✅ Phase 5 wizard, reachable from More                                       |
| Transaction entry works                   | ✅ E2E records a ₦50,000 sale with ₦30,000 paid                              |
| Mobile + desktop layouts                  | ✅ the same 4 tests pass on Pixel 7 and Desktop Chrome                       |
| Accessibility basics                      | ✅ listed above                                                              |
| E2E / lint / typecheck / production build | ✅ all pass                                                                  |

## Bugs found and fixed during this phase

1. **The app was rendering in each device's default serif.** `--font-sans` was
   defined as `var(--font-sans)` — a self-reference resolving to nothing — so
   Geist never applied and typography varied by device. Caught by looking at a
   real screenshot rather than trusting the code.
2. **Card titles were `div`s**, invisible to screen-reader heading navigation.
   `CardTitle` now renders a real heading (overridable via `as`).
3. **CORS blocked the browser E2E**: the allowed origins did not include the
   test port, so registration silently failed. `API_CORS_ORIGIN` now covers the
   dev, manual-check and E2E ports.

## Known issues / notes

- One lint warning remains repo-wide: React Compiler cannot memoize
  react-hook-form's `watch()` in the sale form. Library limitation, zero errors.
- The E2E suite needs the API running; Playwright starts the web app itself.
  CI does both.
- `e2e/screenshot.spec.ts` is a visual-review tool, not an assertion suite;
  its output is gitignored.

## The MVP is complete

All eleven phases (0–10) are implemented, tested and documented. The end-to-end
workflow in the specification — register → create a business → import or enter
data → intelligence classifies customers → the engine builds an explainable
daily list → a suggested message → WhatsApp opens → the follow-up is recorded →
the dashboard updates → the customer drops off tomorrow's list — is verified by
automated tests in a real browser.

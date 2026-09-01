# Phase 11 — Product UI/UX Redesign

**Status: COMPLETE** (verified 2026-09-01)

A UI-only phase. No backend, business logic, or API contract was changed —
the 138 API integration tests passed unmodified throughout.

## Problems this phase fixed

| Problem                           | Evidence before                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emoji used as an icon system      | 14 files used 🔥💰💳 as UI icons; `lucide-react` was installed with **0 imports**. Emoji render differently per OS — the loudest "not a real product" signal. |
| No component vocabulary           | Six primitives existed. No badge, alert, dialog, dropdown, tabs, table, skeleton, avatar — so every page invented its own chip and panel markup.              |
| Onboarding was one form           | A 75-line business-name form with no steps, progress or welcome.                                                                                              |
| No marketing site                 | `/` was a 49-line app teaser. No `/pricing`, no `/signup`.                                                                                                    |
| Navigation exposed the data model | "Segments" is developer vocabulary; Sales and Leads were missing from nav despite existing.                                                                   |
| Card-in-card density              | Cards nested in cards with borders on everything.                                                                                                             |

## Design system

**Palette** — the honey / warm-ink / paper identity from Phase 10 was kept; it
was already distinctive and correct. Two colours stay outside the brand palette
so they keep their meaning: WhatsApp green belongs to the send action alone, and
the four category hues are data.

**New tokens** — a fluid `display`/`display-lg` type scale (`clamp()`) for
marketing, a fixed scale for the app, and a **three-level elevation ladder**
(`shadow-e1/e2/e3`) that replaced ad-hoc borders. Cards now carry one elevation
plus a hairline ring rather than border-and-shadow doubling.

**Icons** — Lucide throughout, defined once per concept in
`src/lib/categories.ts` (label, plural, icon, chip tone, and a plain-English
meaning used by empty states). No screen re-declares a category.

**Primitives** — badge, alert, dialog, dropdown-menu, tabs, sheet, skeleton,
avatar, table, tooltip, sonner added; `PageHeader`, `EmptyState`, `ErrorState`,
`CardSkeletons` and `RowSkeletons` give every screen the same states.

On the `premium-frontend-ui` skill: its typographic craft, staggered entrances
and glass depth were used on the marketing pages. Its custom cursors, scroll
hijacking, GSAP pinning and 3D were **not** — the app is used for thirty seconds
on a cheap Android over patchy data, and the brief says not to over-animate.

## Information architecture

```
PUBLIC                     APP
/          landing         /dashboard   Today  ← the product
/pricing                   /customers   Customers
/login                     /leads       Leads
/signup  → /onboarding     /sales       Sales     (new page, existing API)
                           /products    Products
                           /imports     Imports
                           /settings    Settings
```

`/register` redirects to `/signup`; `/more` and `/segments` were retired (the
segment insight lives on the customer profile, where it is actually useful).

## What was built

- **App shell** — a 240px sidebar rail on desktop, a five-slot thumb-zone bar on
  mobile with a More sheet. Marketing and auth routes render chromeless.
- **Dashboard** — greeting with the owner's first name, "Here is who needs your
  attention today", progress toward an empty list, four category tiles that
  filter, and the recommendation cards.
- **Recommendation card** — the hero interaction: category chip, name, score,
  WHY TODAY, the suggested message as a quote block, then a full-width green
  **Send on WhatsApp** with Copy beside it, and Mark done / Skip demoted to
  outline and ghost so Send clearly dominates. Cards stagger in on entrance.
- **Marketing site** — 13 sections (nav, hero, product preview, problem, how it
  works, the daily list, categories, WhatsApp workflow, benefits, pricing, FAQ,
  final CTA, footer) plus a dedicated `/pricing`.
- **Signup + 5-step onboarding** — account → business → how you sell → add
  customers → ready, with a progress indicator throughout and step 3's answer
  changing the advice on step 4.
- **Login** — a distinct split layout with a context panel, not a clone of signup.
- **Customer profile** — reordered so the next action ("Contact Ada") sits above
  the statistics, then lifetime value, purchases, last purchase and outstanding
  balance, then intelligence, sales, leads and history.
- **`/sales`** — a new page over the existing transactions API.

## Verification (all actually run on 2026-09-01)

| Check                                                    | Result  |
| -------------------------------------------------------- | ------- |
| `npm run build` — 10 workspaces                          | ✅ pass |
| `npm run typecheck` / `lint` / `format:check` — 17 tasks | ✅ pass |
| Unit tests — 236                                         | ✅ pass |
| **API integration tests — 138, unmodified**              | ✅ pass |
| Playwright E2E — 10, mobile (Pixel 7) + desktop           | ✅ pass |
| Visual review of 11 screens on both viewports            | ✅ done |

Existing functionality confirmed still working by the E2E suite: signup, login,
business creation, customer creation, product creation, transaction creation
(₦50,000 with ₦30,000 paid → ₦20,000 owing), recommendation generation,
suggested messages, the WhatsApp link, mark done, skip, the timeline, and logout.

## Bugs found and fixed during this phase

1. **Refresh was unreachable from the empty state.** The redesign gated the
   refresh control behind "has a list", so a user who added their first sale
   returned to a cached empty dashboard with no way to regenerate. Caught by
   E2E; refresh is now always available.
2. **The greeting read "Good morning 👋, Ada"** — emoji before the comma.
   `getGreeting()` now returns the phrase only and the caller appends name and
   emoji, giving "Good morning, Ada 👋".
3. **The sidebar's right border stopped at viewport height** on long pages. The
   border moved to a full-height wrapper around the sticky rail.
4. **The five-stop onboarding stepper overflowed the signup column**, wrapping
   "How you sell" across three lines. Replaced with one compact form (count +
   current step + bar) that works at every width.
5. **Ragged left edge on the landing page** — FAQ and the final CTA used
   narrower containers than the sections above them.
6. **No way to log out.** Retiring `/more` removed the only logout control and
   the new shell never replaced it — `useLogout` had zero usages app-wide.
   Reported by the user after the phase was committed. The account block now
   sits at the foot of the sidebar with a visible **Log out** control (and in
   the mobile More sheet); a dropdown was tried first but the Base UI menu did
   not open on click, and hiding logout behind a menu was the wrong call for a
   seven-destination app anyway. A regression test now covers it on both
   viewports.

## Deliberate omissions

- **Testimonials.** The brief allows omitting the section when none exist, and
  inventing social proof would be dishonest. The section is absent, not faked.
- **"Forgot password" on the login screen.** There is no reset endpoint in the
  backend, and a link that does nothing is exactly the placeholder UI the brief
  says to avoid. It needs an API change, which is out of scope for a UI phase.

## Known issues

- One lint warning remains repo-wide: the React Compiler cannot memoize
  react-hook-form's `watch()` in the sale form. Library limitation, zero errors.
- The responsive sweep was verified at 375px (Pixel 7) and 1280px (Desktop
  Chrome) via E2E and screenshots. The intermediate widths in the brief
  (320/390/414/768/1024/1440) were not each individually captured.

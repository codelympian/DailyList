# Phase 8 — Suggested Messages

**Status: COMPLETE** (verified 2026-08-31)

## What was built

### `packages/messaging` (new — pure, no SDK or network dependency)

- **Deterministic templates** for HOT_LEAD, REORDER, DEBTOR and REACTIVATION,
  with product-free variants when no product is known. They deliberately avoid
  claims Dailylist cannot support — no prices, stock, discounts or delivery
  promises. "Would you like me to reserve one?" is an _offer the owner can
  honour_, not a claim about inventory we do not track.
- **Guardrails** — the module that makes enabling AI safe:
  - every number left in a message (after removing known names) must be a
    number we supplied, so an invented price, quantity or order reference is
    caught;
  - banned claim patterns: discounts, % off, free, promos, stock/availability,
    refunds/guarantees, delivery promises, urgency pressure, price superlatives
    and links;
  - must address the customer by name, must have no unresolved placeholders,
    must be ≤ 480 characters.
- **`generateMessage`** — computes the deterministic template first (always
  available), then _optionally_ asks an LLM to reword it. Any failure — AI
  disabled, no provider, network error, timeout, model refusal, or a guardrail
  violation — falls back to the template with the reason recorded.
- **`LlmProvider` port** keeps the package free of SDK/network dependencies and
  fully unit-testable with fakes.

### API

- `AnthropicProvider` — the only place the LLM SDK is touched (official
  `@anthropic-ai/sdk`, model configurable, default `claude-opus-5`, request
  timeout applied). A model refusal is treated as failure so the template wins.
- `MessageService.factsForCustomer` builds the fact set **strictly from stored
  records** (business name, customer name, the real product from their open lead
  or last purchase, the computed outstanding balance, measured day counts). A
  message can only ever mention what is in that set.
- Endpoints: `POST /messages/preview`, `GET/PUT /messages/templates` (per-business
  overrides of the packaged defaults), and
  `POST /recommendations/:id/message` to (re)generate one card's message.
- Recommendation generation now fills every card's `suggestedMessage`, so the
  daily list always arrives ready to send.

### Configuration

`AI_MESSAGES_ENABLED` (default **false**), optional `ANTHROPIC_API_KEY`,
`AI_MESSAGE_MODEL`, `AI_MESSAGE_TIMEOUT_MS`. The product is fully functional
with AI off — that is the default and the tested path.

### Web

Recommendation cards on `/today` now show the suggested message with a
**Copy message** button. (WhatsApp send is Phase 9.)

## Verification (all actually run on 2026-08-31)

| Check                                                                        | Result                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build (10) / typecheck (17) / lint (17) / format                             | ✅ pass                                                                                                                                                                                                                 |
| Unit tests: 213 total, incl. **36 new messaging tests**                      | ✅ pass                                                                                                                                                                                                                 |
| e2e: 126 total, incl. **13 new message tests**                               | ✅ pass                                                                                                                                                                                                                 |
| Manual: today's list generated with real messages                            | ✅ pass                                                                                                                                                                                                                 |
| Manual: AI enabled but unconfigured → warning logged, templates still served | ✅ pass                                                                                                                                                                                                                 |
| Live LLM call                                                                | ⚠️ **not run** — no API key is configured, and calling a paid external API was not authorized. Every other path (disabled, misconfigured, provider error, refusal, guardrail rejection) is covered by tests with fakes. |

### Acceptance criteria

| Criterion                                  | Evidence                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Every recommendation can produce a message | ✅ e2e asserts every card on the list has one                                                                              |
| Deterministic templates work               | ✅ all four categories, with and without a product                                                                         |
| AI can be disabled                         | ✅ default is off; e2e runs entirely with AI disabled                                                                      |
| AI failure falls back to templates         | ✅ provider throwing, model refusal, and misconfiguration all fall back                                                    |
| AI cannot invent business facts            | ✅ fabricated price, stock claim, free offer, promo code, invented quantity, link and urgency all rejected → template used |
| Messages are concise                       | ✅ ≤ 480 chars enforced and asserted                                                                                       |
| Messages use customer name / product       | ✅ asserted per category; a message without the name is rejected                                                           |

**Manual output from the live API:**

```
HOT_LEAD    | 75 | Ngozi Eze  → "Hi Ngozi 😊 You asked about Glow Serum today. Would you like me to reserve one for you?"
DEBTOR      | 72 | Bola Ade   → "Hi Bola 😊 A gentle reminder that you have a balance of ₦20,000 with Ada Beauty. Would you like to settle it this week?"
REORDER_DUE | 59 | Ada Okafor → "Hi Ada 😊 You may be due for another Glow Serum. Would you like me to set one aside for you?"
```

## Bug found and fixed during this phase

The `packages/config` test asserting _default_ values was actually reading the
developer's real repo-root `.env` (it only passed before because the value
happened to match, and Turbo had cached the result). It now loads from a
directory with no `.env`, so it genuinely tests the schema defaults.

## Known issues / notes

- The live AI path is implemented per the official SDK but has not been executed
  against the real API — no key is configured here. Enable by setting
  `AI_MESSAGES_ENABLED=true` and `ANTHROPIC_API_KEY`; nothing else changes,
  and the guardrails apply to whatever comes back.
- Guardrails are intentionally strict: a valid-but-unusual AI phrasing may be
  rejected in favour of the template. That is the safe direction to fail.
- Message _sending_ is Phase 9; nothing here contacts a customer.

## Next phase

Phase 9 — WhatsApp Quick Send (click-to-chat deep links, phone validation,
URL encoding, send-action tracking; no delivery/read claims).

# Phase 9 — WhatsApp Quick Send

**Status: COMPLETE** (verified 2026-08-31)

Click-to-chat only. **No WhatsApp Business Platform, no automated sending.**
Dailylist hands the message to WhatsApp; the owner sends it themselves.

## What was built

### Link building (`packages/messaging/src/whatsapp.ts`, pure)

- `buildWhatsAppLink(phone, message)` → `https://wa.me/<digits>?text=<encoded>`,
  reusing the Phase 2 Nigerian phone normalizer so `08012345678`,
  `0801 234 5678`, `+234…` and `234…` all resolve to the same E.164 number,
  then stripped to bare digits (wa.me rejects `+` and separators).
- Invalid input is reported, never turned into a broken link: no phone,
  malformed number, wrong Nigerian prefix, empty message, or text past the
  4096-character prefill limit.
- `encodeMessage` percent-encodes everything `encodeURIComponent` does **plus**
  `!'()*`, which it leaves bare — those survive re-parsing in webviews poorly.
  Emoji, ₦, newlines and `&` all round-trip exactly.

### Honest data model (migration `whatsapp_messages`)

`messages` records a contact attempt with `action`, which has exactly two
values — the only two outcomes click-to-chat can observe:

| Value             | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| `WHATSAPP_OPENED` | The owner tapped Send and WhatsApp was opened with the message |
| `COPIED`          | The owner copied the message text                              |

**There is deliberately no `DELIVERED`, `READ` or `REPLIED`.** Those values
cannot exist honestly without the WhatsApp Business Platform, and the schema
comment says so, so nobody adds them by accident.

The `Message` row doubles as the MVP follow-up record: the recommendation's
status carries the _outcome_, this carries the _act_. A separate `FollowUp`
table would duplicate that in the MVP, so it is deferred.

### API

- `GET /businesses/:id/customers/:id/whatsapp-link?recommendationId=` — builds
  the link (using the card's suggested message when given). Records nothing,
  so rendering a button is not an event.
- `POST /businesses/:id/messages` — records the act. When it is
  `WHATSAPP_OPENED` it also:
  - sets `lastContactedAt` and increments `contactAttemptCount` → **contact
    fatigue**, which is what keeps that customer off the next days' lists;
  - logs a `MESSAGE_SENT` timeline event titled _"Opened WhatsApp to contact
    this customer"_ — precise wording, no delivery claim;
  - moves a **PENDING** recommendation to `CONTACTED` (a card already handled
    is left alone).
    `COPIED` is recorded but deliberately does **not** count as contact.
- `GET /businesses/:id/customers/:id/messages` — contact history, carrying no
  delivery fields at all.

### Web

`WhatsAppActions` — a green **Send on WhatsApp** button plus **Copy**, on both
today's cards and the customer profile. Send opens WhatsApp first (so the tap
is not swallowed by a popup blocker) and then records the action. The UI states
plainly: _"Opens WhatsApp to +234… . You still send it yourself."_ When a
customer has no phone, the button is disabled with a reason instead of failing.

## Verification (all actually run on 2026-08-31)

| Check                                                                   | Result                                                                                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build (10) / typecheck (17) / lint (17) / format                        | ✅ pass                                                                                                                                                           |
| Unit tests: 236 total, incl. **23 new WhatsApp tests**                  | ✅ pass                                                                                                                                                           |
| e2e: 138 total, incl. **12 new quick-send tests**                       | ✅ pass                                                                                                                                                           |
| Manual: real link generated and structurally verified                   | ✅ pass                                                                                                                                                           |
| Manual: send recorded → card CONTACTED → customer suppressed by fatigue | ✅ pass                                                                                                                                                           |
| WhatsApp actually opening on a device                                   | ⚠️ **not testable here** — no WhatsApp client on this machine. The URL format is verified structurally (correct host, bare digits, exact round-trip of the text). |

### Acceptance criteria

| Criterion                      | Evidence                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Nigerian phone numbers work    | ✅ 6 input formats all → `wa.me/2348012345678`                                                                                     |
| Invalid numbers are handled    | ✅ null/empty/short/non-numeric/bad-prefix/too-long all rejected with a reason, no link produced                                   |
| Message is correctly encoded   | ✅ `new URL(...).searchParams.get('text')` equals the original exactly, including emoji, ₦, newlines, `&`, `!'()*`                 |
| Customer number is correct     | ✅ link points at the stored E.164 number; asserted end-to-end                                                                     |
| Suggested message is prefilled | ✅ link text equals the card's `suggestedMessage`                                                                                  |
| Send action is recorded        | ✅ `messages` row with action, body and destination                                                                                |
| No false delivery/read status  | ✅ enum has no such values; history exposes none; a test asserts the timeline contains no "delivered/read receipt/seen by/replied" |

**Manual output:**

```
phone : +2348031114444
body  : Hi Ngozi 😊 You asked about Glow Serum today. Would you like me to reserve one for you?
url   : https://wa.me/2348031114444?text=Hi%20Ngozi%20%F0%9F%98%8A%20You%20asked%20about%20Glow%20Serum%20today.…
decoded text matches body: true
path has no + or spaces  : true
```

## Known issues / notes

- Opening the link in the real WhatsApp app could not be exercised on this
  machine; the format matches WhatsApp's documented click-to-chat scheme and is
  verified structurally. Worth one manual tap on a phone before launch.
- Recording happens when the owner taps Send. If they then abandon the message
  in WhatsApp, Dailylist still counts an attempt — unavoidable without the
  Business Platform, and it fails in the conservative direction (a customer is
  contacted _less_ often, not more).
- `COPIED` intentionally does not affect contact fatigue.

## Next phase

Phase 10 — Dailylist Dashboard + MVP Polish (the full mobile-first experience,
progress tracking, empty/loading/error states, accessibility, E2E tests).

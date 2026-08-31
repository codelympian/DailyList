# Phase 3 — Products + Transactions

**Status: COMPLETE** (verified 2026-08-31)

## What was built

### Database (migration `products_transactions`)

- `products` — name, SKU (unique per business), category, price, cost_price,
  **reorder_interval_days** (feeds REORDER_DUE in Phases 6/7), active flag.
- `transactions` — amount, amount_paid, derived status
  (PAID/PARTIALLY_PAID/UNPAID + explicit REFUNDED/CANCELLED), occurred_at,
  payment_method, source, external_id (unique per business, for future imports).
- `transaction_items` — product reference + name snapshot, quantity, unit_price, subtotal.
- `payments` — full audit trail of every payment against a transaction.

### Deterministic money engine (`apps/api/src/transactions/money.ts`)

All financial math uses Prisma.Decimal — no floats, no AI:
`amountDue = amount − amountPaid` (floored at 0), status derived from amounts,
item subtotals/totals without float drift. Unit tested (incl. the spec case
₦50,000 with ₦30,000 paid → ₦20,000 due).

### API

- Products: CRUD under `/businesses/:businessId/products` (409 on duplicate SKU,
  search/filter/pagination, deactivate instead of delete).
- Transactions: create from items (product refs tenant-verified, names snapshotted),
  list with customer/status filters (= customer transaction history), detail with
  items + payments, `POST :id/payments` (rejects overpayment; blocks refunded/cancelled),
  `PATCH :id/status` for REFUNDED/CANCELLED.
- Customer stats (`total_spend`, `purchase_count`, `last_purchase_at`) are recomputed
  from aggregates inside every write transaction — they can never drift. REFUNDED and
  CANCELLED are excluded.
- `outstandingDebt` on customer detail is always derived live from open transactions.
- Timeline events: PURCHASE, DEBT_CREATED (when due > 0), DEBT_PAYMENT.
- All mutations OWNER/ADMIN; STAFF read-only; everything tenant-guarded.

### Web

- `/products` list + add/edit pages (price, SKU, category, cost price, reorder
  interval, deactivate/reactivate).
- `/transactions/new?customerId=` — mobile-first sale entry: multiple item rows,
  product picker that pre-fills price (with snapshot description for custom items),
  live total, amount-paid + payment method.
- `/transactions/[id]` — items, paid/outstanding box, payment history, record
  payment, "Mark fully paid", refund/cancel.
- Customer profile: "Owes you" stat, Record sale button, transaction history with
  status chips.

## Verification (all actually run on 2026-08-31)

| Check                                                                                                                                                                                                                                                                                                                  | Result  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Build / typecheck / lint — all workspaces                                                                                                                                                                                                                                                                              | ✅ pass |
| Unit tests: 77 (money math 7, validation 51, api unit 20 total incl. prior)                                                                                                                                                                                                                                            | ✅ pass |
| e2e: 51 — incl. 17 new: SKU 409, price validation, deactivate, UNPAID/PARTIAL/PAID creation, spec debt case, payment transitions UNPAID→PARTIAL→PAID, overpayment 400, over-paid-at-creation 400, cancel removes from stats+debt, payment blocked on cancelled, history filter, PURCHASE/DEBT events, tenant isolation | ✅ pass |
| Manual live API: ₦50k sale, ₦30k paid → PARTIALLY_PAID ₦20k due → settle → PAID, stats + debt correct                                                                                                                                                                                                                  | ✅ pass |
| Manual web: /products, /products/new, /transactions/new all serve                                                                                                                                                                                                                                                      | ✅ pass |
| Migration applied to dev + test databases                                                                                                                                                                                                                                                                              | ✅ pass |

## Known issues / notes

- Transactions have no free-standing "edit" (by design: corrections happen via
  payments, refund, or cancel — preserving the audit trail).
- The sale form's product picker loads the first 20 active products; a searchable
  picker can come with Phase 10 polish if catalogs grow.
- `customer.totalSpend` serializes as a plain decimal string ("50000"); UI formats it.

## Next phase

Phase 4 — Leads + Customer Timeline (lead statuses, lead CRUD, timeline expansion).

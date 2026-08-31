import { Prisma } from '@dailylist/database';
import type { TransactionStatus } from '@dailylist/database';

/**
 * Deterministic money helpers. ALL financial arithmetic goes through
 * Prisma.Decimal — never floats, never AI.
 */

export function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export function money(value: number | string | Prisma.Decimal): string {
  return toDecimal(value).toFixed(2);
}

/** amountDue = amount - amountPaid, floored at 0. */
export function amountDue(
  amount: Prisma.Decimal | string | number,
  amountPaid: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const due = toDecimal(amount).minus(toDecimal(amountPaid));
  return due.isNegative() ? new Prisma.Decimal(0) : due;
}

/** Payment-derived status. REFUNDED/CANCELLED are set explicitly, never here. */
export function deriveStatus(
  amount: Prisma.Decimal | string | number,
  amountPaid: Prisma.Decimal | string | number,
): Extract<TransactionStatus, 'PAID' | 'PARTIALLY_PAID' | 'UNPAID'> {
  const paid = toDecimal(amountPaid);
  if (paid.greaterThanOrEqualTo(toDecimal(amount))) return 'PAID';
  if (paid.greaterThan(0)) return 'PARTIALLY_PAID';
  return 'UNPAID';
}

export interface ItemInput {
  quantity: number;
  unitPrice: number;
}

/** Line subtotal and transaction total from items. */
export function itemSubtotal(item: ItemInput): Prisma.Decimal {
  return toDecimal(item.unitPrice).times(item.quantity).toDecimalPlaces(2);
}

export function itemsTotal(items: ItemInput[]): Prisma.Decimal {
  return items
    .reduce((sum, item) => sum.plus(itemSubtotal(item)), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
}

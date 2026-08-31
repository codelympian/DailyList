import { normalizePhone } from '@dailylist/validation';
import type { ImportMapping, NormalizedRow, RawRow, RowError, TargetField } from './types';

const MAX_AMOUNT = 999_999_999;

export interface NormalizeResult {
  normalized: NormalizedRow;
  errors: RowError[];
}

/**
 * Deterministically normalizes and validates one raw row against a mapping.
 * Pure function — no I/O, fully unit tested.
 */
export function normalizeRow(raw: RawRow, mapping: ImportMapping): NormalizeResult {
  const errors: RowError[] = [];
  const normalized: NormalizedRow = {};

  const cell = (field: TargetField): string | undefined => {
    const header = mapping[field];
    if (!header) return undefined;
    const value = raw[header];
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  };

  // name — required
  const name = cell('name');
  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length > 120) {
    errors.push({ field: 'name', message: 'Name is longer than 120 characters' });
  } else {
    normalized.name = name;
  }

  // phone — optional but must normalize when present
  const phone = cell('phone');
  if (phone !== undefined) {
    const result = normalizePhone(phone);
    if (!result.ok || !result.e164) {
      errors.push({ field: 'phone', message: result.error ?? 'Invalid phone number' });
    } else {
      normalized.phone = result.e164;
    }
  }

  // email
  const email = cell('email');
  if (email !== undefined) {
    const lowered = email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowered) || lowered.length > 254) {
      errors.push({ field: 'email', message: 'Invalid email address' });
    } else {
      normalized.email = lowered;
    }
  }

  const notes = cell('notes');
  if (notes !== undefined) normalized.notes = notes.slice(0, 2000);

  const product = cell('product');
  if (product !== undefined) normalized.product = product.slice(0, 200);

  // amount / balance — money
  const amount = cell('amount');
  if (amount !== undefined) {
    const parsed = parseMoney(amount);
    if (parsed === null) {
      errors.push({ field: 'amount', message: `"${amount}" is not a valid amount` });
    } else {
      normalized.amount = parsed;
    }
  }

  const balance = cell('balance');
  if (balance !== undefined) {
    const parsed = parseMoney(balance);
    if (parsed === null) {
      errors.push({ field: 'balance', message: `"${balance}" is not a valid balance` });
    } else {
      normalized.balance = parsed;
    }
  }

  if (
    normalized.amount !== undefined &&
    normalized.balance !== undefined &&
    Number(normalized.balance) > Number(normalized.amount)
  ) {
    errors.push({ field: 'balance', message: 'Balance cannot exceed the amount' });
  }
  if (normalized.balance !== undefined && normalized.amount === undefined) {
    errors.push({ field: 'balance', message: 'Balance requires an amount column' });
  }

  // date
  const date = cell('date');
  if (date !== undefined) {
    const parsed = parseDate(date);
    if (parsed === null) {
      errors.push({ field: 'date', message: `"${date}" is not a recognizable date` });
    } else {
      normalized.date = parsed;
    }
  }

  return { normalized, errors };
}

/** Accepts "18000", "18,000.50", "₦18,000", "NGN 18000". Returns 2dp string. */
export function parseMoney(input: string): string | null {
  const cleaned = input.replace(/[₦,\s]/g, '').replace(/^ngn/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT) return null;
  return value.toFixed(2);
}

/**
 * Accepts ISO (2026-08-01), day-first (01/08/2026, 01-08-2026), and
 * Excel serial dates. Ambiguous day/month resolves day-first (Nigerian convention).
 */
export function parseDate(input: string): string | null {
  const trimmed = input.trim();

  // Excel serial number (days since 1899-12-30).
  if (/^\d{4,6}$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial > 20000 && serial < 80000) {
      const ms = (serial - 25569) * 86400 * 1000;
      const date = new Date(ms);
      return isValidPastOrPresent(date) ? date.toISOString() : null;
    }
    return null;
  }

  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    return isValidPastOrPresent(date) ? date.toISOString() : null;
  }

  // Day-first: dd/mm/yyyy or dd-mm-yyyy
  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    let year = Number(dayFirst[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return isValidPastOrPresent(date) ? date.toISOString() : null;
  }

  return null;
}

function isValidPastOrPresent(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  const oldest = new Date('2000-01-01').getTime();
  // Allow a small clock-skew allowance into the future.
  return date.getTime() >= oldest && date.getTime() <= now + 24 * 60 * 60 * 1000;
}

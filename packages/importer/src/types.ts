/** Fields an import column can map to. */
export const TARGET_FIELDS = [
  'name',
  'phone',
  'email',
  'notes',
  'product',
  'amount',
  'balance',
  'date',
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

/** Confirmed mapping: target field -> source column header. */
export type ImportMapping = Partial<Record<TargetField, string>>;

export interface RowError {
  field: string;
  message: string;
}

export interface NormalizedRow {
  name?: string;
  /** E.164 */
  phone?: string;
  email?: string;
  notes?: string;
  product?: string;
  /** 2dp decimal string */
  amount?: string;
  /** 2dp decimal string — outstanding balance (amount due) */
  balance?: string;
  /** ISO date */
  date?: string;
}

export type RawRow = Record<string, string>;

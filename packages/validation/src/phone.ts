/**
 * Nigerian-first phone normalization to E.164.
 *
 * Accepted inputs (examples):
 *   0801 234 5678, 08012345678        -> +2348012345678
 *   8012345678                        -> +2348012345678
 *   2348012345678, 234 801 234 5678   -> +2348012345678
 *   +2348012345678                    -> +2348012345678
 *   +447911123456 (international)     -> +447911123456 (kept as-is)
 *
 * Deterministic and side-effect free — heavily unit tested.
 */

export interface PhoneResult {
  ok: boolean;
  /** E.164 value when ok. */
  e164?: string;
  error?: string;
}

const NG_PREFIX = '234';
// Nigerian mobile numbers: 0 + (70x|80x|81x|90x|91x…) + 8 digits = 11 digits local.
const NG_LOCAL_LENGTH = 10; // without leading 0

export function normalizePhone(raw: string): PhoneResult {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, error: 'Phone number is empty' };

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[\s\-().]/g, '').replace(/^\+/, '');

  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: 'Phone number contains invalid characters' };
  }

  // Explicit international number (any country).
  if (hasPlus) {
    if (digits.startsWith(NG_PREFIX)) return normalizeNigerian(digits.slice(NG_PREFIX.length));
    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, error: 'International number must be 8–15 digits' };
    }
    return { ok: true, e164: `+${digits}` };
  }

  // 234… without plus.
  if (digits.startsWith(NG_PREFIX) && digits.length === NG_PREFIX.length + NG_LOCAL_LENGTH) {
    return normalizeNigerian(digits.slice(NG_PREFIX.length));
  }

  // 0801… local format.
  if (digits.startsWith('0') && digits.length === NG_LOCAL_LENGTH + 1) {
    return normalizeNigerian(digits.slice(1));
  }

  // 801… local without leading zero.
  if (digits.length === NG_LOCAL_LENGTH) {
    return normalizeNigerian(digits);
  }

  return {
    ok: false,
    error: 'Enter a Nigerian number (e.g. 08012345678) or international format (+…)',
  };
}

function normalizeNigerian(local: string): PhoneResult {
  if (local.length !== NG_LOCAL_LENGTH) {
    return { ok: false, error: 'Nigerian numbers must have 11 digits (e.g. 08012345678)' };
  }
  if (!/^[789]/.test(local)) {
    return { ok: false, error: 'Nigerian mobile numbers start with 070, 080, 081, 090 or 091' };
  }
  return { ok: true, e164: `+${NG_PREFIX}${local}` };
}

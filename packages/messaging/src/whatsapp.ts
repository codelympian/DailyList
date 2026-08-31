import { normalizePhone } from '@dailylist/validation';

/**
 * WhatsApp click-to-chat ("wa.me") link building.
 *
 * MVP scope, deliberately: this only produces a link the owner taps, which
 * opens WhatsApp with the message pre-filled. There is no WhatsApp Business
 * Platform integration, so the app can never know whether a message was
 * delivered, read, or replied to — and must never imply otherwise.
 */

export const WHATSAPP_BASE_URL = 'https://wa.me';

/** WhatsApp truncates very long prefilled text; keep well inside it. */
export const MAX_PREFILL_LENGTH = 4096;

export interface WhatsAppLinkResult {
  ok: boolean;
  url?: string;
  /** The E.164 number the link points at, for display/confirmation. */
  phone?: string;
  error?: string;
}

/**
 * Builds a click-to-chat URL for a Nigerian (or any E.164) number.
 *
 * wa.me expects the number as digits only, with no "+" and no separators.
 */
export function buildWhatsAppLink(
  rawPhone: string | null | undefined,
  message: string,
): WhatsAppLinkResult {
  if (!rawPhone || rawPhone.trim() === '') {
    return { ok: false, error: 'This customer has no phone number' };
  }

  const normalized = normalizePhone(rawPhone);
  if (!normalized.ok || !normalized.e164) {
    return { ok: false, error: normalized.error ?? 'Invalid phone number' };
  }

  const text = message.trim();
  if (text.length === 0) {
    return { ok: false, error: 'There is no message to send' };
  }
  if (text.length > MAX_PREFILL_LENGTH) {
    return { ok: false, error: `Message is longer than ${MAX_PREFILL_LENGTH} characters` };
  }

  // wa.me wants bare digits: +2348012345678 -> 2348012345678
  const digits = normalized.e164.replace(/^\+/, '');
  return {
    ok: true,
    phone: normalized.e164,
    url: `${WHATSAPP_BASE_URL}/${digits}?text=${encodeMessage(text)}`,
  };
}

/**
 * Percent-encodes the prefilled text.
 *
 * `encodeURIComponent` leaves `!'()*` unescaped; they are legal in a query
 * value but encoding them too keeps the URL safe across the messaging apps
 * and webviews that re-parse these links.
 */
export function encodeMessage(message: string): string {
  return encodeURIComponent(message).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

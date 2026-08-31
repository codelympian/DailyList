import type { SegmentMatch, SuppressionCode } from './types';

/**
 * Renders reason codes into the sentences the owner reads ("WHY TODAY?").
 *
 * Every string is built from facts the engine measured — nothing here
 * invents prices, stock, or history. AI is never involved in reasons.
 */
export function explainSegment(match: SegmentMatch, customerName: string): string[] {
  const f = match.facts;
  const firstName = customerName.split(' ')[0] ?? customerName;

  switch (match.segment) {
    case 'HOT_LEAD': {
      const days = Number(f.daysSinceInterest ?? 0);
      const interest = f.interest ? `about ${f.interest}` : 'about buying';
      return [
        `Asked ${interest} ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}`,
        'Has not purchased yet',
      ];
    }
    case 'REORDER_DUE': {
      const interval = Number(f.intervalDays ?? 0);
      const since = Number(f.daysSinceLastPurchase ?? 0);
      const product = f.product ? ` of ${f.product}` : '';
      const rhythm =
        f.intervalSource === 'PRODUCT'
          ? `${f.product ?? 'This product'} usually lasts about ${interval} days`
          : f.intervalSource === 'HISTORY'
            ? `${firstName} normally buys every ${interval} days`
            : `Typical reorder time is about ${interval} days`;
      return [rhythm, `Last purchase${product} was ${since} days ago`];
    }
    case 'DEBTOR':
      return [`Owes ${formatMoney(Number(f.outstandingDebt ?? 0))}`];
    case 'LOST_CUSTOMER': {
      const since = Number(f.daysSinceLastPurchase ?? 0);
      return [`Has not bought in ${since} days`, 'Worth trying to win back'];
    }
    case 'REPEAT_CUSTOMER': {
      const count = Number(f.purchaseCount ?? 0);
      const avg = f.averageIntervalDays ? ` (about every ${f.averageIntervalDays} days)` : '';
      return [`${count} purchases so far${avg}`];
    }
    case 'VIP':
      return [`Has spent ${formatMoney(Number(f.totalSpend ?? 0))} with you`];
    default:
      return [];
  }
}

export function explainSuppression(code: SuppressionCode): string {
  switch (code) {
    case 'OPTED_OUT':
      return 'Opted out of messages';
    case 'RECENTLY_CONTACTED':
      return 'Contacted recently — giving them space';
    case 'PURCHASED_RECENTLY':
      return 'Just purchased';
    case 'NO_CONTACT_METHOD':
      return 'No phone number on file';
    case 'NO_ACTIVITY':
      return 'No activity to follow up on';
    default:
      return 'Not eligible for follow-up';
  }
}

export const SEGMENT_LABELS: Record<string, { label: string; emoji: string }> = {
  HOT_LEAD: { label: 'Hot lead', emoji: '🔥' },
  REORDER_DUE: { label: 'Reorder due', emoji: '💰' },
  DEBTOR: { label: 'Unpaid', emoji: '💳' },
  LOST_CUSTOMER: { label: 'Reactivate', emoji: '😴' },
  REPEAT_CUSTOMER: { label: 'Repeat customer', emoji: '🔁' },
  VIP: { label: 'VIP', emoji: '⭐' },
};

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

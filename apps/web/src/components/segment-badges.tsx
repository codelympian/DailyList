'use client';

const SEGMENT_STYLE: Record<string, { label: string; emoji: string; className: string }> = {
  HOT_LEAD: {
    label: 'Hot lead',
    emoji: '🔥',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  REORDER_DUE: {
    label: 'Reorder due',
    emoji: '💰',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  DEBTOR: {
    label: 'Unpaid',
    emoji: '💳',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  LOST_CUSTOMER: {
    label: 'Reactivate',
    emoji: '😴',
    className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  REPEAT_CUSTOMER: {
    label: 'Repeat',
    emoji: '🔁',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  },
  VIP: {
    label: 'VIP',
    emoji: '⭐',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

export function SegmentBadge({ segment }: { segment: string }) {
  const style = SEGMENT_STYLE[segment] ?? {
    label: segment,
    emoji: '•',
    className: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      <span aria-hidden>{style.emoji}</span>
      {style.label}
    </span>
  );
}

export function segmentLabel(segment: string): string {
  return SEGMENT_STYLE[segment]?.label ?? segment;
}

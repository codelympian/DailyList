'use client';

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  UNPAID: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  REFUNDED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-muted'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

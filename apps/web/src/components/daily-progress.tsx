'use client';

import { PartyPopper } from 'lucide-react';

/**
 * The signature element: a list that empties.
 *
 * Dailylist is a list you finish, not a dashboard you monitor. Progress runs
 * toward zero, and reaching zero is the moment the product is built around.
 * Honey appears here and almost nowhere else, so progress always reads the same.
 */
export function DailyProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const percent = Math.round((done / total) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${done} of ${total} contacted`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
    >
      <div
        className="h-full rounded-full bg-honey transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** The end of the list — the payoff. */
export function CompletionState({ done }: { done: number }) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center rounded-2xl bg-honey-wash px-6 py-14 text-center ring-1 ring-honey/25 duration-500 motion-reduce:animate-none">
      <span className="grid size-12 place-items-center rounded-2xl bg-honey/20 text-honey-ink">
        <PartyPopper className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">You&apos;re done for today</h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {done === 0
          ? 'Nothing needed your attention today.'
          : `You followed up with ${done} ${done === 1 ? 'customer' : 'customers'}. A fresh list arrives tomorrow.`}
      </p>
    </div>
  );
}

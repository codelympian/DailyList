'use client';

/**
 * The signature element: a list that visibly empties.
 *
 * Dailylist is not a metrics dashboard — it is a list you finish. The bar
 * tracks progress toward zero, and reaching zero is the payoff the whole
 * screen is built around (peak-end). Honey is used here and almost nowhere
 * else, so "progress" always reads as the same colour.
 */
export function DailyProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const percent = Math.round((done / total) * 100);
  const complete = done === total;

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          {complete ? (
            <span className="font-medium text-honey-ink">All done for today 🎉</span>
          ) : (
            <>
              <span className="font-mono text-base font-semibold text-foreground">
                {total - done}
              </span>{' '}
              {total - done === 1 ? 'person' : 'people'} left to contact
            </>
          )}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {done}/{total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} contacted`}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-honey transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** The end of the list — the moment the product exists to deliver. */
export function CompletionState({ done }: { done: number }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-honey/30 bg-honey-wash px-6 py-12 text-center">
      <span aria-hidden className="text-4xl">
        🎉
      </span>
      <h2 className="text-lg font-semibold">You&apos;re done for today</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        {done === 0
          ? 'Nothing needed your attention today.'
          : `You followed up with ${done} ${done === 1 ? 'customer' : 'customers'}. Come back tomorrow for a fresh list.`}
      </p>
    </div>
  );
}

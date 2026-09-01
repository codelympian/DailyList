export const ONBOARDING_STEPS = [
  'Account',
  'Business',
  'How you sell',
  'Customers',
  'Ready',
] as const;

/**
 * Progress across the five signup steps.
 *
 * One compact form at every width: the count, the current step's name, and a
 * bar. A labelled five-stop stepper was tried first and could not fit the
 * narrow signup column without wrapping, which read as broken.
 */
export function OnboardingProgress({ current }: { current: number }) {
  const total = ONBOARDING_STEPS.length;
  const percent = Math.round((current / total) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium">
          <span className="text-muted-foreground">
            Step <span className="font-mono tabular-nums">{current}</span> of{' '}
            <span className="font-mono tabular-nums">{total}</span>
          </span>
          <span className="mx-1.5 text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <span className="text-honey-ink">{ONBOARDING_STEPS[current - 1]}</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${current} of ${total}: ${ONBOARDING_STEPS[current - 1]}`}
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-honey transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

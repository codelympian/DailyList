'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WhatsAppActions } from '@/components/whatsapp-actions';
import {
  useSetRecommendationStatus,
  type RecommendationCategory,
  type RecommendationView,
} from '@/hooks/use-recommendations';

export const CATEGORY_META: Record<
  RecommendationCategory,
  { label: string; emoji: string; chip: string }
> = {
  HOT_LEAD: {
    label: 'Hot lead',
    emoji: '🔥',
    chip: 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200',
  },
  REORDER_DUE: {
    label: 'Reorder',
    emoji: '💰',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
  DEBTOR: {
    label: 'Unpaid',
    emoji: '💳',
    chip: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200',
  },
  LOST_CUSTOMER: {
    label: 'Reactivate',
    emoji: '😴',
    chip: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
};

/**
 * One person to contact: who, why, what to say, and the actions.
 *
 * Reading order follows the owner's decision: category → name → why →
 * message → act. The send action sits at the bottom, inside the thumb zone.
 */
export function RecommendationCard({
  recommendation,
  businessId,
}: {
  recommendation: RecommendationView;
  businessId: string | undefined;
}) {
  const setStatus = useSetRecommendationStatus(businessId);
  const meta = CATEGORY_META[recommendation.category];
  const busy = setStatus.isPending;

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
          >
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
          </span>
          <h3 className="mt-1.5 truncate text-lg font-semibold leading-tight">
            <Link
              href={`/customers/${recommendation.customerId}`}
              className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {recommendation.customerName}
            </Link>
          </h3>
        </div>
        <span
          className="shrink-0 rounded-lg bg-secondary px-2 py-1 font-mono text-sm font-semibold tabular-nums"
          title="Priority score out of 100"
        >
          {recommendation.score}
        </span>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Why today?
        </p>
        <ul className="flex flex-col gap-0.5">
          {recommendation.reasonText.map((reason, index) => (
            <li key={index} className="text-sm leading-snug">
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {recommendation.suggestedMessage && (
        <div className="mb-3 rounded-xl bg-secondary/70 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested message
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {recommendation.suggestedMessage}
          </p>
        </div>
      )}

      <div className="mb-2">
        <WhatsAppActions
          businessId={businessId}
          customerId={recommendation.customerId}
          recommendationId={recommendation.id}
          message={recommendation.suggestedMessage}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="min-h-11 flex-1"
          disabled={busy}
          onClick={() => setStatus.mutate({ id: recommendation.id, status: 'COMPLETED' })}
        >
          Mark done
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => setStatus.mutate({ id: recommendation.id, status: 'SKIPPED' })}
        >
          Skip
        </Button>
      </div>

      {setStatus.isError && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Could not update this card. Check your connection and try again.
        </p>
      )}
    </li>
  );
}

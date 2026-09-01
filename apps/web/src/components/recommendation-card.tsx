'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppActions } from '@/components/whatsapp-actions';
import { cn } from '@/lib/utils';
import { CATEGORY_META, type RecommendationCategory } from '@/lib/categories';
import { useSetRecommendationStatus, type RecommendationView } from '@/hooks/use-recommendations';

/**
 * The hero interaction: one person to contact, and everything needed to act.
 *
 * Reading order mirrors the decision the owner is making — what kind of
 * follow-up, who, why now, what to say — and only then the actions, with
 * Send carrying the visual weight because it is the point of the product.
 */
export function RecommendationCard({
  recommendation,
  businessId,
  index = 0,
}: {
  recommendation: RecommendationView;
  businessId: string | undefined;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}) {
  const setStatus = useSetRecommendationStatus(businessId);
  const meta = CATEGORY_META[recommendation.category as RecommendationCategory];
  const Icon = meta.icon;
  const busy = setStatus.isPending;

  return (
    <li
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards rounded-2xl bg-card p-5 shadow-e2 ring-1 ring-border/50 duration-300 motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            meta.chip,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {meta.label}
        </span>
        <span
          className="rounded-lg bg-secondary px-2 py-1 font-mono text-xs font-semibold tabular-nums text-muted-foreground"
          title="Priority score out of 100"
        >
          {recommendation.score}
        </span>
      </div>

      <Link
        href={`/customers/${recommendation.customerId}`}
        className="group mt-2 inline-flex items-center gap-1 rounded text-2xl font-semibold leading-tight tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {recommendation.customerName}
        <ChevronRight
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </Link>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Why today
        </p>
        <ul className="mt-1 flex flex-col gap-1">
          {recommendation.reasonText.map((reason, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-honey" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {recommendation.suggestedMessage && (
        <blockquote className="mt-4 rounded-xl border-l-2 border-honey/50 bg-secondary/60 py-3 pl-3.5 pr-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Suggested message
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {recommendation.suggestedMessage}
          </p>
        </blockquote>
      )}

      <div className="mt-4">
        <WhatsAppActions
          businessId={businessId}
          customerId={recommendation.customerId}
          recommendationId={recommendation.id}
          message={recommendation.suggestedMessage}
        />
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 flex-1"
          disabled={busy}
          onClick={() => setStatus.mutate({ id: recommendation.id, status: 'COMPLETED' })}
        >
          Mark done
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 text-muted-foreground"
          disabled={busy}
          onClick={() => setStatus.mutate({ id: recommendation.id, status: 'SKIPPED' })}
        >
          Skip
        </Button>
      </div>

      {setStatus.isError && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          That did not save. Check your connection and try again.
        </p>
      )}
    </li>
  );
}

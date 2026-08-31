'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness } from '@/hooks/use-customers';
import {
  useDailySummary,
  useRegenerate,
  useSetRecommendationStatus,
  useTodayList,
  type RecommendationCategory,
  type RecommendationView,
} from '@/hooks/use-recommendations';
import { getGreeting } from '@/lib/greeting';

const CATEGORY_META: Record<RecommendationCategory, { label: string; emoji: string }> = {
  HOT_LEAD: { label: 'Hot leads', emoji: '🔥' },
  REORDER_DUE: { label: 'Reorders', emoji: '💰' },
  DEBTOR: { label: 'Unpaid', emoji: '💳' },
  LOST_CUSTOMER: { label: 'Reactivation', emoji: '😴' },
};

const ORDER: RecommendationCategory[] = ['HOT_LEAD', 'REORDER_DUE', 'DEBTOR', 'LOST_CUSTOMER'];

export default function TodayPage() {
  return (
    <AuthGate>
      <Today />
    </AuthGate>
  );
}

function Today() {
  const { business } = useActiveBusiness();
  const [filter, setFilter] = useState<RecommendationCategory | undefined>();
  const summary = useDailySummary(business?.id);
  const list = useTodayList(business?.id, filter);
  const regenerate = useRegenerate(business?.id);

  const pending = list.data?.items.filter((r) => r.status === 'PENDING') ?? [];
  const done = list.data?.items.filter((r) => r.status !== 'PENDING') ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <p className="mt-1 text-sm font-medium text-emerald-600">{getGreeting()}</p>
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s Sales List</h1>
        {summary.data && (
          <p className="text-sm text-muted-foreground">
            {summary.data.pending} {summary.data.pending === 1 ? 'person' : 'people'} to contact
            {summary.data.done > 0 ? ` · ${summary.data.done} done` : ''}
          </p>
        )}
      </header>

      {summary.data && summary.data.total > 0 && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {ORDER.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(filter === category ? undefined : category)}
              className={`rounded-xl border bg-card p-2 text-center transition-colors hover:bg-muted/50 ${
                filter === category ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="text-lg" aria-hidden>
                {CATEGORY_META[category].emoji}
              </p>
              <p className="text-lg font-semibold">{summary.data.byCategory[category] ?? 0}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {CATEGORY_META[category].label}
              </p>
            </button>
          ))}
        </div>
      )}

      {list.isPending && (
        <p className="py-10 text-center text-sm text-muted-foreground">Working out your list…</p>
      )}

      {list.data && list.data.items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing to follow up on today. Add sales or leads and check back tomorrow.
          </CardContent>
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {pending.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            businessId={business?.id}
          />
        ))}
      </ul>

      {done.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Done today ({done.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {done.map((recommendation) => (
              <li
                key={recommendation.id}
                className="flex items-center justify-between rounded-lg border p-2.5 text-sm text-muted-foreground"
              >
                <span className="line-through">{recommendation.customerName}</span>
                <span className="text-xs">{recommendation.status.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-6 text-center">
        <Button
          variant="ghost"
          size="sm"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate()}
        >
          {regenerate.isPending ? 'Refreshing…' : 'Refresh list'}
        </Button>
      </div>
    </main>
  );
}

function RecommendationCard({
  recommendation,
  businessId,
}: {
  recommendation: RecommendationView;
  businessId: string | undefined;
}) {
  const setStatus = useSetRecommendationStatus(businessId);
  const [copied, setCopied] = useState(false);
  const meta = CATEGORY_META[recommendation.category];

  return (
    <li className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {meta.emoji} {meta.label}
          </p>
          <Link
            href={`/customers/${recommendation.customerId}`}
            className="truncate text-lg font-semibold hover:underline"
          >
            {recommendation.customerName}
          </Link>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium">
          {recommendation.score}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Why today?
        </p>
        {recommendation.reasonText.map((reason, index) => (
          <p key={index} className="text-sm">
            • {reason}
          </p>
        ))}
      </div>

      {recommendation.suggestedMessage && (
        <div className="mb-3 rounded-xl bg-muted/60 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suggested message
          </p>
          <p className="text-sm whitespace-pre-wrap">{recommendation.suggestedMessage}</p>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => {
              void navigator.clipboard
                .writeText(recommendation.suggestedMessage ?? '')
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? 'Copied ✓' : 'Copy message'}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: recommendation.id, status: 'COMPLETED' })}
        >
          Mark done
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: recommendation.id, status: 'SKIPPED' })}
        >
          Skip
        </Button>
      </div>
    </li>
  );
}

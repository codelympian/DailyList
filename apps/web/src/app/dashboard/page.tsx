'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/auth-gate';
import { CompletionState, DailyProgress } from '@/components/daily-progress';
import { CATEGORY_META, RecommendationCard } from '@/components/recommendation-card';
import { EmptyState, ErrorState, SkeletonList } from '@/components/states';
import { useActiveBusiness } from '@/hooks/use-customers';
import {
  useDailySummary,
  useRegenerate,
  useTodayList,
  type RecommendationCategory,
} from '@/hooks/use-recommendations';
import { useMe } from '@/hooks/use-auth';
import { getGreeting } from '@/lib/greeting';

const ORDER: RecommendationCategory[] = ['HOT_LEAD', 'REORDER_DUE', 'DEBTOR', 'LOST_CUSTOMER'];

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const router = useRouter();
  const me = useMe();
  const { business } = useActiveBusiness();
  const [filter, setFilter] = useState<RecommendationCategory | undefined>();

  const summary = useDailySummary(business?.id);
  const list = useTodayList(business?.id, filter);
  const regenerate = useRegenerate(business?.id);

  const needsOnboarding = me.isSuccess && (me.data?.businesses.length ?? 0) === 0;
  useEffect(() => {
    if (needsOnboarding) router.replace('/onboarding');
  }, [needsOnboarding, router]);
  if (needsOnboarding) return null;

  const pending = list.data?.items.filter((r) => r.status === 'PENDING') ?? [];
  const done = list.data?.items.filter((r) => r.status !== 'PENDING') ?? [];
  const allDone = !!summary.data && summary.data.total > 0 && summary.data.pending === 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-5">
        <p className="text-sm font-medium text-honey-ink">{getGreeting()}</p>
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s Sales List</h1>
        {business && <p className="text-sm text-muted-foreground">{business.name}</p>}
      </header>

      {summary.data && summary.data.total > 0 && (
        <DailyProgress done={summary.data.done} total={summary.data.total} />
      )}

      {summary.data && summary.data.total > 0 && (
        <div className="mb-5 grid grid-cols-4 gap-2">
          {ORDER.map((category) => {
            const meta = CATEGORY_META[category];
            const count = summary.data.byCategory[category] ?? 0;
            const active = filter === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(active ? undefined : category)}
                className={`min-h-[4.5rem] rounded-xl border bg-card p-2 text-center transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  active ? 'border-honey ring-2 ring-honey/40' : ''
                }`}
              >
                <span aria-hidden className="block text-base leading-none">
                  {meta.emoji}
                </span>
                <span className="mt-1 block font-mono text-lg font-semibold tabular-nums">
                  {count}
                </span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {list.isPending && <SkeletonList rows={3} />}

      {list.isError && (
        <ErrorState
          body="We could not load today's list. Check your connection and try again."
          onRetry={() => void list.refetch()}
        />
      )}

      {list.data && list.data.items.length === 0 && !filter && (
        <EmptyState
          icon="🌱"
          title="No one to contact yet"
          body="Add your customers and record a few sales, and Dailylist will tell you who to follow up with each morning."
          actionLabel="Add a customer"
          actionHref="/customers/new"
        />
      )}

      {list.data && list.data.items.length === 0 && filter && (
        <EmptyState
          icon="🔍"
          title={`No ${CATEGORY_META[filter].label.toLowerCase()} today`}
          body="Nothing in this group right now. Try another group or view the whole list."
          actionLabel="Show everyone"
          onAction={() => setFilter(undefined)}
        />
      )}

      {allDone && !filter && <CompletionState done={summary.data?.done ?? 0} />}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              businessId={business?.id}
            />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="mt-6 rounded-xl border bg-card/60 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Done today ({done.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {done.map((recommendation) => (
              <li
                key={recommendation.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <Link
                  href={`/customers/${recommendation.customerId}`}
                  className="truncate text-muted-foreground line-through hover:underline"
                >
                  {recommendation.customerName}
                </Link>
                <span className="shrink-0 text-xs capitalize text-muted-foreground">
                  {recommendation.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-8 flex justify-center">
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/auth-gate';
import { CompletionState, DailyProgress } from '@/components/daily-progress';
import { RecommendationCard } from '@/components/recommendation-card';
import { CardSkeletons, EmptyState, ErrorState } from '@/components/states';
import { CATEGORY_META, CATEGORY_ORDER, type RecommendationCategory } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useDailySummary, useRegenerate, useTodayList } from '@/hooks/use-recommendations';
import { useMe } from '@/hooks/use-auth';
import { getGreeting } from '@/lib/greeting';

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

  const firstName = me.data?.user.name.split(' ')[0] ?? '';
  const pending = list.data?.items.filter((r) => r.status === 'PENDING') ?? [];
  const done = list.data?.items.filter((r) => r.status !== 'PENDING') ?? [];
  const summaryData = summary.data;
  const hasList = !!summaryData && summaryData.total > 0;
  const allDone = !!summaryData && summaryData.total > 0 && summaryData.pending === 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-title font-semibold tracking-tight">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasList
            ? 'Here is who needs your attention today.'
            : 'Your daily sales list will appear here.'}
        </p>
      </header>

      {summaryData && hasList && (
        <section aria-labelledby="today-summary" className="mb-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="today-summary" className="text-sm text-muted-foreground">
              <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                {summaryData.pending}
              </span>{' '}
              {summaryData.pending === 1 ? 'person' : 'people'} left to contact
            </h2>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {summaryData.done}/{summaryData.total}
            </span>
          </div>

          <DailyProgress done={summaryData.done} total={summaryData.total} />

          <div className="mt-4 grid grid-cols-4 gap-2">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              const Icon = meta.icon;
              const count = summaryData.byCategory[category] ?? 0;
              const active = filter === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(active ? undefined : category)}
                  className={cn(
                    'flex min-h-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl bg-card p-2 shadow-e1 ring-1 transition-all hover:shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active ? 'ring-2 ring-honey' : 'ring-border/50',
                  )}
                >
                  <Icon className={cn('size-4', meta.tile)} aria-hidden />
                  <span className="font-mono text-lg font-semibold tabular-nums">{count}</span>
                  <span className="text-[11px] leading-none text-muted-foreground">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="sales-list">
        {hasList && (
          <h2 id="sales-list" className="mb-3 text-sm font-medium">
            Today&apos;s Sales List
            {filter && (
              <button
                type="button"
                onClick={() => setFilter(undefined)}
                className="ml-2 text-xs font-normal text-muted-foreground underline-offset-4 hover:underline"
              >
                Clear filter
              </button>
            )}
          </h2>
        )}

        {list.isPending && <CardSkeletons rows={3} />}

        {list.isError && (
          <ErrorState
            body="We could not load today's list. Check your connection and try again."
            onRetry={() => void list.refetch()}
          />
        )}

        {list.data && list.data.items.length === 0 && !filter && (
          <EmptyState
            icon={UserPlus}
            title="No one to contact yet"
            body="Once you add customers and record a few sales, Dailylist works out who to follow up with each morning — and what to say."
            actionLabel="Add a customer"
            actionHref="/customers/new"
            secondaryLabel="Import a spreadsheet"
            secondaryHref="/imports"
          />
        )}

        {list.data && list.data.items.length === 0 && filter && (
          <EmptyState
            icon={CATEGORY_META[filter].icon}
            title={`No ${CATEGORY_META[filter].label.toLowerCase()} today`}
            body={CATEGORY_META[filter].meaning}
            actionLabel="Show everyone"
            onAction={() => setFilter(undefined)}
          />
        )}

        {allDone && !filter && <CompletionState done={summaryData?.done ?? 0} />}

        {pending.length > 0 && (
          <ul className="flex flex-col gap-4">
            {pending.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                businessId={business?.id}
                index={index}
              />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <details className="mt-6 rounded-xl bg-card px-4 py-3 shadow-e1 ring-1 ring-border/50">
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

      {!list.isPending && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? (
              <RefreshCw className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            {regenerate.isPending ? 'Refreshing…' : 'Refresh list'}
          </Button>
        </div>
      )}
    </main>
  );
}

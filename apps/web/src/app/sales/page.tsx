'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/auth-gate';
import { EmptyState, ErrorState, RowSkeletons } from '@/components/states';
import { PageHeader } from '@/components/page-header';
import { StatusChip } from '@/components/status-chip';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useTransactions } from '@/hooks/use-transactions';

export default function SalesPage() {
  return (
    <AuthGate>
      <Sales />
    </AuthGate>
  );
}

function Sales() {
  const { business } = useActiveBusiness();
  const [page, setPage] = useState(1);
  const sales = useTransactions(business?.id, { page });

  const totalPages = sales.data ? Math.max(1, Math.ceil(sales.data.total / 20)) : 1;
  const outstanding = sales.data?.items.reduce((sum, sale) => sum + Number(sale.amountDue), 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Sales"
        subtitle={
          sales.data
            ? `${sales.data.total.toLocaleString()} recorded${outstanding > 0 ? ` · ₦${outstanding.toLocaleString()} outstanding on this page` : ''}`
            : undefined
        }
        action={
          <Button variant="outline" className="min-h-11" render={<Link href="/customers" />}>
            Record a sale
          </Button>
        }
      />

      {sales.isPending && <RowSkeletons rows={6} />}

      {sales.isError && (
        <ErrorState
          body="We could not load your sales. Check your connection and try again."
          onRetry={() => void sales.refetch()}
        />
      )}

      {sales.data && sales.data.items.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No sales recorded yet"
          body="Record what your customers buy and Dailylist learns their buying rhythm — that is what tells you when someone is due to order again."
          actionLabel="Pick a customer"
          actionHref="/customers"
        />
      )}

      {sales.data && sales.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sales.data.items.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/transactions/${sale.id}`}
                className="group flex min-h-16 items-center gap-3 rounded-xl bg-card p-3.5 shadow-e1 ring-1 ring-border/50 transition-shadow hover:shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{sale.customerName}</span>
                  <span className="block text-sm text-muted-foreground">
                    {new Date(sale.occurredAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-medium tabular-nums">
                    ₦{Number(sale.amount).toLocaleString()}
                  </span>
                  {Number(sale.amountDue) > 0 && (
                    <span className="block font-mono text-[11px] tabular-nums text-destructive">
                      ₦{Number(sale.amountDue).toLocaleString()} due
                    </span>
                  )}
                </span>
                <StatusChip status={sale.status} />
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {sales.data && sales.data.total > 20 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <span className="font-mono tabular-nums">{page}</span> of{' '}
            <span className="font-mono tabular-nums">{totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </main>
  );
}

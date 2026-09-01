'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/auth-gate';
import { IntelligenceCard } from '@/components/intelligence-card';
import { StatusChip } from '@/components/status-chip';
import { WhatsAppActions } from '@/components/whatsapp-actions';
import { Timeline } from '@/components/timeline';
import { LeadList } from '@/components/lead-list';
import { ErrorState, RowSkeletons } from '@/components/states';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import {
  useActiveBusiness,
  useCustomer,
  useCustomerTimeline,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import { useTransactions } from '@/hooks/use-transactions';
import { useLeads } from '@/hooks/use-leads';

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <CustomerProfile customerId={id} />
    </AuthGate>
  );
}

function CustomerProfile({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { business } = useActiveBusiness();
  const customer = useCustomer(business?.id, customerId);
  const timeline = useCustomerTimeline(business?.id, customerId);
  const transactions = useTransactions(business?.id, { customerId, page: 1 });
  const leads = useLeads(business?.id, { customerId, page: 1 });
  const deleteCustomer = useDeleteCustomer(business?.id);

  if (customer.isPending) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <RowSkeletons rows={4} />
      </main>
    );
  }

  if (customer.isError) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <ErrorState
          title={customer.error.status === 404 ? 'Customer not found' : 'Could not load customer'}
          body={
            customer.error.status === 404
              ? 'This customer may have been deleted.'
              : 'Check your connection and try again.'
          }
          onRetry={() => void customer.refetch()}
        />
      </main>
    );
  }

  const c = customer.data;
  const debt = Number(c.outstandingDebt);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        backHref="/customers"
        backLabel="Customers"
        title={c.name}
        subtitle={[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}
        action={
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              render={<Link href={`/customers/${c.id}/edit`} />}
              aria-label="Edit customer"
            >
              <Pencil className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 text-muted-foreground hover:text-destructive"
              disabled={deleteCustomer.isPending}
              aria-label="Delete customer"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${c.name}? Their history is kept but they leave your lists.`,
                  )
                ) {
                  deleteCustomer.mutate(c.id, { onSuccess: () => router.replace('/customers') });
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        }
      />

      {c.tags.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-1.5">
          {c.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {/* What to do next comes before the numbers. */}
      <section className="mb-5 rounded-2xl bg-card p-4 shadow-e2 ring-1 ring-border/50">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Contact {c.name.split(' ')[0]}
        </h2>
        <WhatsAppActions businessId={business?.id} customerId={c.id} />
      </section>

      <dl className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Lifetime value" value={`₦${Number(c.totalSpend).toLocaleString()}`} />
        <Stat label="Purchases" value={String(c.purchaseCount)} />
        <Stat
          label="Last purchase"
          value={c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : '—'}
        />
        <Stat
          label="Owes you"
          value={`₦${debt.toLocaleString()}`}
          tone={debt > 0 ? 'destructive' : undefined}
        />
      </dl>

      <div className="mb-5">
        <IntelligenceCard businessId={business?.id} customerId={c.id} />
      </div>

      <Section
        title="Sales"
        action={
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            render={<Link href={`/transactions/new?customerId=${c.id}`} />}
          >
            <Plus className="size-4" aria-hidden />
            Record sale
          </Button>
        }
      >
        {transactions.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {transactions.data && transactions.data.items.length === 0 && (
          <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Receipt className="size-4" aria-hidden />
            No sales recorded yet.
          </p>
        )}
        {transactions.data && transactions.data.items.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {transactions.data.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex-1 text-muted-foreground">
                    {new Date(t.occurredAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    ₦{Number(t.amount).toLocaleString()}
                  </span>
                  <StatusChip status={t.status} />
                  <ChevronRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Leads"
        action={
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            render={<Link href={`/leads/new?customerId=${c.id}`} />}
          >
            <Plus className="size-4" aria-hidden />
            Add lead
          </Button>
        }
      >
        {leads.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {leads.data && <LeadList leads={leads.data.items} businessId={business?.id} />}
      </Section>

      {c.notes && (
        <Section title="Notes">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.notes}</p>
        </Section>
      )}

      <Section title="History">
        {timeline.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {timeline.data && <Timeline events={timeline.data.items} />}
      </Section>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'destructive' }) {
  return (
    <div className="rounded-xl bg-card p-3 shadow-e1 ring-1 ring-border/50">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate font-mono text-lg font-semibold tabular-nums',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-2xl bg-card p-4 shadow-e1 ring-1 ring-border/50">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

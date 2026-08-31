'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { StatusChip } from '@/components/status-chip';
import { Timeline } from '@/components/timeline';
import {
  useActiveBusiness,
  useCustomer,
  useCustomerTimeline,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import { useTransactions } from '@/hooks/use-transactions';
import { useLeads } from '@/hooks/use-leads';
import { LeadList } from '@/components/lead-list';

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
    return <main className="flex-1 py-24 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (customer.isError) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        {customer.error.status === 404 ? 'Customer not found.' : 'Could not load customer.'}{' '}
        <Link href="/customers" className="underline">
          Back to customers
        </Link>
      </main>
    );
  }

  const c = customer.data;
  const currency = business?.currency ?? 'NGN';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
        ← Customers
      </Link>

      <header className="mt-3 mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.phone ?? 'No phone'} {c.email ? `· ${c.email}` : ''}
          </p>
          {c.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {c.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/customers/${c.id}/edit`} />}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteCustomer.isPending}
            onClick={() => {
              if (
                window.confirm(`Delete ${c.name}? Their history is kept but they leave your lists.`)
              ) {
                deleteCustomer.mutate(c.id, { onSuccess: () => router.replace('/customers') });
              }
            }}
          >
            Delete
          </Button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label="Total spend"
          value={`${currency === 'NGN' ? '₦' : ''}${Number(c.totalSpend).toLocaleString()}`}
        />
        <StatCard label="Purchases" value={String(c.purchaseCount)} />
        <StatCard
          label="Last purchase"
          value={c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : '—'}
        />
        <StatCard
          label="Owes you"
          value={`₦${Number(c.outstandingDebt).toLocaleString()}`}
          tone={Number(c.outstandingDebt) > 0 ? 'destructive' : undefined}
        />
      </div>

      <div className="mb-4 flex gap-2">
        <Button render={<Link href={`/transactions/new?customerId=${c.id}`} />}>
          ➕ Record sale
        </Button>
        <Button variant="outline" render={<Link href={`/leads/new?customerId=${c.id}`} />}>
          🔥 Add lead
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {leads.data && <LeadList leads={leads.data.items} businessId={business?.id} />}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {transactions.data && transactions.data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}
          <ul className="flex flex-col gap-2">
            {transactions.data?.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="text-muted-foreground">
                    {new Date(t.occurredAt).toLocaleDateString()}
                  </span>
                  <span className="font-medium">₦{Number(t.amount).toLocaleString()}</span>
                  <StatusChip status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {c.notes && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{c.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {timeline.data && <Timeline events={timeline.data.items} />}
        </CardContent>
      </Card>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'destructive' }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p
        className={`truncate text-lg font-semibold ${tone === 'destructive' ? 'text-destructive' : ''}`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { EmptyState, ErrorState, SkeletonList } from '@/components/states';
import { useActiveBusiness, useCustomers } from '@/hooks/use-customers';

export default function CustomersPage() {
  return (
    <AuthGate>
      <CustomerList />
    </AuthGate>
  );
}

function CustomerList() {
  const { business } = useActiveBusiness();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const customers = useCustomers(business?.id, { search, page });

  const totalPages = customers.data ? Math.max(1, Math.ceil(customers.data.total / 20)) : 1;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          {customers.data && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{customers.data.total}</span> total
            </p>
          )}
        </div>
        <Button className="min-h-11" render={<Link href="/customers/new" />}>
          Add customer
        </Button>
      </header>

      <label htmlFor="customer-search" className="sr-only">
        Search customers
      </label>
      <Input
        id="customer-search"
        type="search"
        placeholder="Search name, phone, or email…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4"
      />

      {customers.isPending && <SkeletonList rows={4} />}

      {customers.isError && (
        <ErrorState
          body="We could not load your customers. Check your connection and try again."
          onRetry={() => void customers.refetch()}
        />
      )}

      {customers.data && customers.data.items.length === 0 && (
        <EmptyState
          icon={search ? '🔍' : '👥'}
          title={search ? 'No matches' : 'No customers yet'}
          body={
            search
              ? `Nothing matches "${search}". Try a different name or phone number.`
              : 'Add customers one by one, or import your existing list from a spreadsheet.'
          }
          {...(search
            ? {}
            : { actionLabel: 'Import a spreadsheet', actionHref: '/imports' as const })}
        />
      )}

      {customers.data && customers.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {customers.data.items.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{customer.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {customer.phone ?? customer.email ?? 'No contact info'}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {Number(customer.totalSpend) > 0 && (
                    <span className="block font-mono text-sm tabular-nums">
                      ₦{Number(customer.totalSpend).toLocaleString()}
                    </span>
                  )}
                  {customer.tags.length > 0 && (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {customer.tags.slice(0, 2).join(' · ')}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {customers.data && customers.data.total > 20 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
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

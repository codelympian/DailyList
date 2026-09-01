'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { EmptyState, ErrorState, RowSkeletons } from '@/components/states';
import { PageHeader } from '@/components/page-header';
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Customers"
        subtitle={
          customers.data
            ? `${customers.data.total.toLocaleString()} ${customers.data.total === 1 ? 'person' : 'people'}`
            : undefined
        }
        action={
          <Button className="min-h-11" render={<Link href="/customers/new" />}>
            <Plus className="size-4" aria-hidden />
            Add customer
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <Input
          id="customer-search"
          type="search"
          placeholder="Search name, phone, or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-11 pl-9"
        />
      </div>

      {customers.isPending && <RowSkeletons rows={6} />}

      {customers.isError && (
        <ErrorState
          body="We could not load your customers. Check your connection and try again."
          onRetry={() => void customers.refetch()}
        />
      )}

      {customers.data && customers.data.items.length === 0 && (
        <EmptyState
          icon={search ? Search : Users}
          title={search ? 'No matches' : 'No customers yet'}
          body={
            search
              ? `Nothing matches "${search}". Try a different name or phone number.`
              : 'Add customers one at a time, or bring your whole list across from a spreadsheet.'
          }
          {...(search
            ? {}
            : {
                actionLabel: 'Add a customer',
                actionHref: '/customers/new',
                secondaryLabel: 'Import a spreadsheet',
                secondaryHref: '/imports',
              })}
        />
      )}

      {customers.data && customers.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {customers.data.items.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="group flex min-h-16 items-center gap-3 rounded-xl bg-card p-3.5 shadow-e1 ring-1 ring-border/50 transition-shadow hover:shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-medium text-muted-foreground">
                  {initials(customer.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{customer.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {customer.phone ?? customer.email ?? 'No contact details'}
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
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {customers.data && customers.data.total > 20 && (
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

/** Initials stand in for a photo — better than a generic person icon. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

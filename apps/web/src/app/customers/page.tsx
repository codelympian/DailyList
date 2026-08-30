'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
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
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        </div>
        <Button render={<Link href="/customers/new" />}>Add customer</Button>
      </header>

      <Input
        type="search"
        placeholder="Search name, phone, or email…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4"
      />

      {customers.isPending && (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      )}
      {customers.isError && (
        <p className="py-8 text-center text-sm text-destructive">Could not load customers.</p>
      )}

      {customers.data && customers.data.items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {search
              ? 'No customers match your search.'
              : 'No customers yet. Add your first customer to get started.'}
          </CardContent>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {customers.data?.items.map((customer) => (
          <li key={customer.id}>
            <Link
              href={`/customers/${customer.id}`}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{customer.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {customer.phone ?? customer.email ?? 'No contact info'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {customer.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {customers.data && customers.data.total > 20 && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {customers.data.total} customers
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}

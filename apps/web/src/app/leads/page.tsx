'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LeadStatus } from '@dailylist/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { LEAD_STATUSES, LeadList } from '@/components/lead-list';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useLeads } from '@/hooks/use-leads';

export default function LeadsPage() {
  return (
    <AuthGate>
      <Leads />
    </AuthGate>
  );
}

function Leads() {
  const { business } = useActiveBusiness();
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [page, setPage] = useState(1);
  const leads = useLeads(business?.id, { status, page });
  const totalPages = leads.data ? Math.max(1, Math.ceil(leads.data.total / 20)) : 1;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip label="All" active={status === ''} onClick={() => setStatus('')} />
        {LEAD_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          />
        ))}
      </div>

      {leads.isPending && (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      )}
      {leads.data && leads.data.items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No leads{status ? ` with status ${status}` : ''}. Add one from a customer&apos;s
            profile.
          </CardContent>
        </Card>
      )}
      {leads.data && leads.data.items.length > 0 && (
        <LeadList leads={leads.data.items} businessId={business?.id} showCustomer />
      )}

      {leads.data && leads.data.total > 20 && (
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
            Page {page} of {totalPages}
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

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      {label}
    </button>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { Segment } from '@dailylist/types';
import { Card, CardContent } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { SegmentBadge, segmentLabel } from '@/components/segment-badges';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useSegmentCounts, type CustomerIntelligenceView } from '@/hooks/use-intelligence';
import { api, type ApiError } from '@/lib/api';

const SEGMENTS: Segment[] = [
  'HOT_LEAD',
  'REORDER_DUE',
  'DEBTOR',
  'LOST_CUSTOMER',
  'REPEAT_CUSTOMER',
  'VIP',
];

export default function SegmentsPage() {
  return (
    <AuthGate>
      <Segments />
    </AuthGate>
  );
}

function Segments() {
  const { business } = useActiveBusiness();
  const counts = useSegmentCounts(business?.id);
  const [selected, setSelected] = useState<Segment | null>(null);

  const customers = useQuery<{ items: CustomerIntelligenceView[]; total: number }, ApiError>({
    queryKey: ['intelligence', business?.id, 'list', selected],
    queryFn: () =>
      api(`/businesses/${business?.id}/intelligence/customers?segment=${selected}&pageSize=50`),
    enabled: !!business?.id && !!selected,
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Customer segments</h1>
        <p className="text-sm text-muted-foreground">
          Who your customers are right now, and who is ready to hear from you.
        </p>
      </header>

      {counts.isPending && (
        <p className="py-8 text-center text-sm text-muted-foreground">Analyzing…</p>
      )}

      {counts.data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SEGMENTS.map((segment) => (
              <button
                key={segment}
                type="button"
                onClick={() => setSelected(selected === segment ? null : segment)}
                className={`rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50 ${
                  selected === segment ? 'ring-2 ring-primary' : ''
                }`}
              >
                <p className="text-2xl font-semibold">{counts.data.eligibleCounts[segment] ?? 0}</p>
                <SegmentBadge segment={segment} />
                {(counts.data.counts[segment] ?? 0) >
                  (counts.data.eligibleCounts[segment] ?? 0) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {counts.data.counts[segment]} total, rest on hold
                  </p>
                )}
              </button>
            ))}
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            {counts.data.totalCustomers} customers analyzed · {counts.data.suppressedCustomers} on
            hold (opted out, recently contacted, or just purchased)
          </p>
        </>
      )}

      {selected && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-3 text-sm font-medium">
              Ready to contact — {segmentLabel(selected)}
            </h2>
            {customers.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
            {customers.data && customers.data.items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nobody in this group is ready for contact today.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {customers.data?.items.map((customer) => {
                const match = customer.segments.find((s) => s.segment === selected);
                return (
                  <li key={customer.customerId}>
                    <Link
                      href={`/customers/${customer.customerId}`}
                      className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <p className="text-sm font-medium">{customer.customerName}</p>
                      {match?.reasons.map((reason, index) => (
                        <p key={index} className="text-xs text-muted-foreground">
                          • {reason}
                        </p>
                      ))}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

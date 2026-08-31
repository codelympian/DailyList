'use client';

import Link from 'next/link';
import type { LeadStatus, LeadSummary } from '@dailylist/types';
import { useSetLeadStatus } from '@/hooks/use-leads';

export const LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'QUOTED',
  'NEGOTIATING',
  'WON',
  'LOST',
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'text-sky-600',
  CONTACTED: 'text-indigo-600',
  INTERESTED: 'text-amber-600',
  QUOTED: 'text-violet-600',
  NEGOTIATING: 'text-orange-600',
  WON: 'text-emerald-600',
  LOST: 'text-muted-foreground',
};

/** Lead rows with an inline status selector. Reused on the profile and /leads. */
export function LeadList({
  leads,
  businessId,
  showCustomer,
}: {
  leads: LeadSummary[];
  businessId: string | undefined;
  showCustomer?: boolean;
}) {
  const setStatus = useSetLeadStatus(businessId);

  if (leads.length === 0) {
    return <p className="text-sm text-muted-foreground">No leads yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {leads.map((lead) => (
        <li
          key={lead.id}
          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {showCustomer && (
                <Link href={`/customers/${lead.customerId}`} className="hover:underline">
                  {lead.customerName}
                </Link>
              )}
              {showCustomer && ' · '}
              <span className="text-muted-foreground">
                {lead.productName ?? lead.description ?? '—'}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {lead.estimatedValue ? `~₦${Number(lead.estimatedValue).toLocaleString()} · ` : ''}
              last activity {new Date(lead.lastActivityAt).toLocaleDateString()}
            </p>
          </div>
          <select
            aria-label={`Status for lead ${lead.productName ?? lead.description ?? ''}`}
            className={`h-8 shrink-0 rounded-lg border bg-background px-2 text-sm font-medium ${STATUS_COLORS[lead.status]}`}
            value={lead.status}
            disabled={setStatus.isPending}
            onChange={(e) =>
              setStatus.mutate({ leadId: lead.id, status: e.target.value as LeadStatus })
            }
          >
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

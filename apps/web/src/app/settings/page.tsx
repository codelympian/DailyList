'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness } from '@/hooks/use-customers';
import {
  useBusinessSettings,
  useUpdateSettings,
  type BusinessSettingsResponse,
} from '@/hooks/use-intelligence';

type SettingKey = keyof Omit<BusinessSettingsResponse, 'businessId' | 'updatedAt'>;

const FIELDS: { key: SettingKey; label: string; hint: string; suffix?: string }[] = [
  {
    key: 'dailyListSize',
    label: 'People on today’s list',
    hint: 'How many customers Dailylist suggests each day. Keep it to what you can actually get through.',
    suffix: 'customers',
  },
  {
    key: 'vipLifetimeSpend',
    label: 'VIP spend threshold',
    hint: 'Customers who have spent at least this much are marked VIP.',
    suffix: '₦',
  },
  {
    key: 'minContactIntervalDays',
    label: 'Minimum days between contacts',
    hint: 'Dailylist will not suggest a customer again inside this window.',
    suffix: 'days',
  },
  {
    key: 'recentPurchaseSuppressionDays',
    label: 'Quiet period after a purchase',
    hint: 'Skip follow-ups for customers who just bought (debts still show).',
    suffix: 'days',
  },
  {
    key: 'hotLeadRecencyDays',
    label: 'Hot lead window',
    hint: 'Interest shown within this many days counts as hot.',
    suffix: 'days',
  },
  {
    key: 'defaultReorderIntervalDays',
    label: 'Default reorder interval',
    hint: 'Used when a product has no interval and there is no purchase rhythm yet.',
    suffix: 'days',
  },
  {
    key: 'reorderDuePercent',
    label: 'Reorder due at',
    hint: '90% means a reorder is flagged slightly before it is due.',
    suffix: '% of interval',
  },
  {
    key: 'lostReorderMultiple',
    label: 'Lost after',
    hint: 'Multiples of the reorder interval before a customer counts as lost.',
    suffix: '× interval',
  },
  {
    key: 'lostCustomerDays',
    label: 'Lost fallback',
    hint: 'Used when no reorder interval is known for the customer.',
    suffix: 'days',
  },
  {
    key: 'repeatCustomerMinPurchases',
    label: 'Repeat customer after',
    hint: 'Purchases needed before a customer counts as a repeat buyer.',
    suffix: 'purchases',
  },
];

export default function SettingsPage() {
  return (
    <AuthGate>
      <Settings />
    </AuthGate>
  );
}

function Settings() {
  const { business } = useActiveBusiness();
  const settings = useBusinessSettings(business?.id);
  const update = useUpdateSettings(business?.id);
  const [edited, setEdited] = useState<Partial<Record<SettingKey, string>>>({});

  if (settings.isPending) {
    return <main className="flex-1 py-24 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (settings.isError) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        Could not load settings.
      </main>
    );
  }

  const current = settings.data;
  const valueFor = (key: SettingKey) => edited[key] ?? String(current[key]);
  const dirty = Object.keys(edited).length > 0;

  const save = () => {
    const payload: Partial<Record<SettingKey, number>> = {};
    for (const [key, raw] of Object.entries(edited)) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) payload[key as SettingKey] = parsed;
    }
    update.mutate(payload, { onSuccess: () => setEdited({}) });
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          These rules decide who appears on your daily list. Change them to match how your business
          really works.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Follow-up rules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id={field.key}
                  type="number"
                  min="0"
                  value={valueFor(field.key)}
                  onChange={(e) => setEdited({ ...edited, [field.key]: e.target.value })}
                />
                {field.suffix && (
                  <span className="shrink-0 text-xs text-muted-foreground">{field.suffix}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{field.hint}</p>
            </div>
          ))}

          {update.isError && (
            <p role="alert" className="text-sm text-destructive">
              {update.error.body.message}
            </p>
          )}
          {update.isSuccess && !dirty && <p className="text-sm text-emerald-600">Saved.</p>}
          <Button className="w-full" disabled={!dirty || update.isPending} onClick={save}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

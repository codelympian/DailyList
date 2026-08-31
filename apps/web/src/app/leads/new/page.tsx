'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLeadSchema, type CreateLeadInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness, useCustomer } from '@/hooks/use-customers';
import { useCreateLead } from '@/hooks/use-leads';
import { useProducts } from '@/hooks/use-products';

export default function NewLeadPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <NewLead />
      </Suspense>
    </AuthGate>
  );
}

function NewLead() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId') ?? '';
  const { business } = useActiveBusiness();
  const customer = useCustomer(business?.id, customerId);
  const products = useProducts(business?.id, { search: '', page: 1 });
  const createLead = useCreateLead(business?.id);

  const form = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: { customerId, productId: undefined, description: '', notes: '' },
  });

  if (!customerId) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        Pick a customer first.{' '}
        <Link href="/customers" className="underline">
          Go to customers
        </Link>
      </main>
    );
  }

  const productOptions = products.data?.items.filter((p) => p.active) ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href={`/customers/${customerId}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {customer.data?.name ?? 'Customer'}
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Add lead{customer.data ? ` — ${customer.data.name}` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) =>
              createLead.mutate(values, {
                onSuccess: () => router.replace(`/customers/${customerId}`),
              }),
            )}
            noValidate
          >
            <FieldGroup>
              {productOptions.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="productId">Interested in (product)</FieldLabel>
                  <select
                    id="productId"
                    className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
                    {...form.register('productId')}
                  >
                    <option value="">— No specific product —</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field data-invalid={!!form.formState.errors.description}>
                <FieldLabel htmlFor="description">Or describe it</FieldLabel>
                <Input
                  id="description"
                  placeholder="e.g. Asked about the Glow Serum price"
                  {...form.register('description')}
                />
                <FieldError errors={[form.formState.errors.description]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.estimatedValue}>
                <FieldLabel htmlFor="estimatedValue">Estimated value (₦)</FieldLabel>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  {...form.register('estimatedValue', {
                    setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                  })}
                />
                <FieldError errors={[form.formState.errors.estimatedValue]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.notes}>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Input id="notes" placeholder="Optional" {...form.register('notes')} />
                <FieldError errors={[form.formState.errors.notes]} />
              </Field>
              <FieldDescription>
                A lead is someone showing buying interest — Dailylist will remind you to follow up.
              </FieldDescription>
              {createLead.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Something went wrong. Please try again.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={createLead.isPending}>
                {createLead.isPending ? 'Saving…' : 'Add lead'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

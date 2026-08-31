'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTransactionSchema,
  type CreateTransactionFormInput,
  type CreateTransactionInput,
} from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness, useCustomer } from '@/hooks/use-customers';
import { useProducts } from '@/hooks/use-products';
import { useCreateTransaction } from '@/hooks/use-transactions';

export default function NewTransactionPage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <NewTransaction />
      </Suspense>
    </AuthGate>
  );
}

function NewTransaction() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId') ?? '';
  const { business } = useActiveBusiness();
  const customer = useCustomer(business?.id, customerId);
  const products = useProducts(business?.id, { search: '', page: 1 });
  const createTransaction = useCreateTransaction(business?.id);

  const form = useForm<CreateTransactionFormInput, unknown, CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      customerId,
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      amountPaid: 0,
      paymentMethod: 'CASH',
    },
  });
  const itemsArray = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = form.watch('items');
  const total = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

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
          <CardTitle>Record a sale{customer.data ? ` — ${customer.data.name}` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) =>
              createTransaction.mutate(values, {
                onSuccess: (tx) => router.replace(`/transactions/${tx.id}`),
              }),
            )}
            noValidate
          >
            <FieldGroup>
              {itemsArray.fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Item {index + 1}</p>
                    {itemsArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => itemsArray.remove(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {productOptions.length > 0 && (
                    <select
                      className="mb-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
                      value={form.watch(`items.${index}.productId`) ?? ''}
                      onChange={(e) => {
                        const product = productOptions.find((p) => p.id === e.target.value);
                        form.setValue(`items.${index}.productId`, product?.id ?? undefined);
                        if (product) {
                          form.setValue(`items.${index}.unitPrice`, Number(product.price));
                          form.setValue(`items.${index}.description`, undefined);
                        }
                      }}
                    >
                      <option value="">Custom item…</option>
                      {productOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₦{Number(p.price).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )}
                  {!form.watch(`items.${index}.productId`) && (
                    <Field
                      className="mb-2"
                      data-invalid={!!form.formState.errors.items?.[index]?.description}
                    >
                      <Input
                        placeholder="Description (e.g. Glow Serum)"
                        {...form.register(`items.${index}.description`)}
                      />
                      <FieldError errors={[form.formState.errors.items?.[index]?.description]} />
                    </Field>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Field data-invalid={!!form.formState.errors.items?.[index]?.quantity}>
                      <FieldLabel htmlFor={`qty-${index}`}>Qty</FieldLabel>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        min="1"
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </Field>
                    <Field data-invalid={!!form.formState.errors.items?.[index]?.unitPrice}>
                      <FieldLabel htmlFor={`price-${index}`}>Unit price (₦)</FieldLabel>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => itemsArray.append({ description: '', quantity: 1, unitPrice: 0 })}
              >
                + Add item
              </Button>

              <p className="text-right text-lg font-semibold">Total: ₦{total.toLocaleString()}</p>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!form.formState.errors.amountPaid}>
                  <FieldLabel htmlFor="amountPaid">Amount paid now (₦)</FieldLabel>
                  <Input
                    id="amountPaid"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('amountPaid', { valueAsNumber: true })}
                  />
                  <FieldError errors={[form.formState.errors.amountPaid]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="paymentMethod">Payment method</FieldLabel>
                  <select
                    id="paymentMethod"
                    className="h-8 w-full rounded-lg border bg-background px-2 text-sm"
                    {...form.register('paymentMethod')}
                  >
                    <option value="CASH">Cash</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="POS">POS</option>
                    <option value="CARD">Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
              </div>

              {createTransaction.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Something went wrong. Please try again.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
                {createTransaction.isPending ? 'Saving…' : 'Record sale'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

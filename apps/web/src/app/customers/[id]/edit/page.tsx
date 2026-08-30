'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { CustomerForm } from '@/components/customer-form';
import { useActiveBusiness, useCustomer, useUpdateCustomer } from '@/hooks/use-customers';

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <EditCustomer customerId={id} />
    </AuthGate>
  );
}

function EditCustomer({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { business } = useActiveBusiness();
  const customer = useCustomer(business?.id, customerId);
  const updateCustomer = useUpdateCustomer(business?.id, customerId);

  if (customer.isPending) {
    return <main className="flex-1 py-24 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (customer.isError) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        Customer not found.{' '}
        <Link href="/customers" className="underline">
          Back to customers
        </Link>
      </main>
    );
  }

  const c = customer.data;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href={`/customers/${c.id}`} className="text-sm text-muted-foreground hover:underline">
        ← {c.name}
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Edit customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            defaultValues={{
              name: c.name,
              phone: c.phone ?? '',
              email: c.email ?? '',
              notes: c.notes ?? '',
            }}
            submitLabel="Save changes"
            pending={updateCustomer.isPending}
            error={updateCustomer.error}
            onSubmit={(values) =>
              updateCustomer.mutate(
                {
                  name: values.name,
                  // Empty fields clear the value on update.
                  phone: values.phone ?? null,
                  email: values.email ?? null,
                  notes: values.notes ?? null,
                },
                { onSuccess: () => router.replace(`/customers/${c.id}`) },
              )
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}

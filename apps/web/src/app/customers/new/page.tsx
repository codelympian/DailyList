'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { CustomerForm } from '@/components/customer-form';
import { useActiveBusiness, useCreateCustomer } from '@/hooks/use-customers';

export default function NewCustomerPage() {
  return (
    <AuthGate>
      <NewCustomer />
    </AuthGate>
  );
}

function NewCustomer() {
  const router = useRouter();
  const { business } = useActiveBusiness();
  const createCustomer = useCreateCustomer(business?.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
        ← Customers
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Add customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            defaultValues={{ name: '', phone: '', email: '', notes: '' }}
            submitLabel="Add customer"
            pending={createCustomer.isPending}
            error={createCustomer.error}
            onSubmit={(values) =>
              createCustomer.mutate(values, {
                onSuccess: (customer) => router.replace(`/customers/${customer.id}`),
              })
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}

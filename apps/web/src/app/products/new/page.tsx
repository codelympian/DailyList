'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { ProductForm } from '@/components/product-form';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useCreateProduct } from '@/hooks/use-products';

export default function NewProductPage() {
  return (
    <AuthGate>
      <NewProduct />
    </AuthGate>
  );
}

function NewProduct() {
  const router = useRouter();
  const { business } = useActiveBusiness();
  const createProduct = useCreateProduct(business?.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/products" className="text-sm text-muted-foreground hover:underline">
        ← Products
      </Link>
      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Add product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            defaultValues={{ name: '' }}
            submitLabel="Add product"
            pending={createProduct.isPending}
            error={createProduct.error}
            onSubmit={(values) =>
              createProduct.mutate(values, { onSuccess: () => router.replace('/products') })
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}

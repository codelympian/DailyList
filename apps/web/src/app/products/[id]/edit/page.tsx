'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { ProductForm } from '@/components/product-form';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useProduct, useUpdateProduct } from '@/hooks/use-products';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <EditProduct productId={id} />
    </AuthGate>
  );
}

function EditProduct({ productId }: { productId: string }) {
  const router = useRouter();
  const { business } = useActiveBusiness();
  const product = useProduct(business?.id, productId);
  const updateProduct = useUpdateProduct(business?.id, productId);

  if (product.isPending) {
    return <main className="flex-1 py-24 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (product.isError) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        Product not found.{' '}
        <Link href="/products" className="underline">
          Back to products
        </Link>
      </main>
    );
  }

  const p = product.data;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/products" className="text-sm text-muted-foreground hover:underline">
        ← Products
      </Link>
      <Card className="mt-3">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Edit product</CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={updateProduct.isPending}
            onClick={() =>
              updateProduct.mutate(
                { active: !p.active },
                { onSuccess: () => router.replace('/products') },
              )
            }
          >
            {p.active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </CardHeader>
        <CardContent>
          <ProductForm
            defaultValues={{
              name: p.name,
              sku: p.sku ?? '',
              category: p.category ?? '',
              price: Number(p.price),
              costPrice: p.costPrice !== null ? Number(p.costPrice) : undefined,
              reorderIntervalDays: p.reorderIntervalDays ?? undefined,
            }}
            submitLabel="Save changes"
            pending={updateProduct.isPending}
            error={updateProduct.error}
            onSubmit={(values) =>
              updateProduct.mutate(values, { onSuccess: () => router.replace('/products') })
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}

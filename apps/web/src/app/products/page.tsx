'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useProducts } from '@/hooks/use-products';

export default function ProductsPage() {
  return (
    <AuthGate>
      <ProductList />
    </AuthGate>
  );
}

function ProductList() {
  const { business } = useActiveBusiness();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const products = useProducts(business?.id, { search, page });
  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / 20)) : 1;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        </div>
        <Button render={<Link href="/products/new" />}>Add product</Button>
      </header>

      <Input
        type="search"
        placeholder="Search name, SKU, category…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4"
      />

      {products.isPending && (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      )}
      {products.data && products.data.items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {search ? 'No products match your search.' : 'No products yet. Add your first product.'}
          </CardContent>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {products.data?.items.map((product) => (
          <li key={product.id}>
            <Link
              href={`/products/${product.id}/edit`}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {product.name}
                    {!product.active && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        inactive
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {product.category ?? 'Uncategorized'}
                    {product.reorderIntervalDays
                      ? ` · reorder ~${product.reorderIntervalDays}d`
                      : ''}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">₦{Number(product.price).toLocaleString()}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {products.data && products.data.total > 20 && (
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

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { useLogout, useMe } from '@/hooks/use-auth';
import { getGreeting } from '@/lib/greeting';

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();

  const businesses = me.data?.businesses ?? [];
  const needsOnboarding = me.isSuccess && businesses.length === 0;

  useEffect(() => {
    if (needsOnboarding) router.replace('/onboarding');
  }, [needsOnboarding, router]);

  if (!me.data || needsOnboarding) return null;
  const business = businesses[0];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">{getGreeting()}</p>
          <h1 className="text-2xl font-bold tracking-tight">{me.data.user.name}</h1>
          {business && (
            <p className="text-sm text-muted-foreground">
              {business.name}
              {business.industry ? ` · ${business.industry}` : ''} · {business.role}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace('/login') })}
        >
          Log out
        </Button>
      </header>

      <div className="mb-4">
        <Button className="w-full" render={<Link href="/today" />}>
          📋 Today&apos;s Sales List
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        <Button variant="outline" render={<Link href="/customers" />}>
          👥 Customers
        </Button>
        <Button variant="outline" render={<Link href="/products" />}>
          📦 Products
        </Button>
        <Button variant="outline" render={<Link href="/leads" />}>
          🔥 Leads
        </Button>
        <Button variant="outline" render={<Link href="/imports" />}>
          📄 Import
        </Button>
        <Button variant="outline" render={<Link href="/segments" />}>
          🧠 Segments
        </Button>
        <Button variant="outline" render={<Link href="/settings" />}>
          ⚙️ Settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Sales List</CardTitle>
          <CardDescription>
            Your daily recommendations will appear here once your customers and sales are in
            Dailylist. Customer management arrives in the next step of the build.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            🔥 Hot leads · 💰 Reorders · 💳 Unpaid · 😴 Reactivation
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

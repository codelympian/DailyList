'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';

/**
 * Protects a page: unauthenticated visitors are sent to /login.
 * Renders nothing while auth state is loading (avoids content flash).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const unauthenticated = me.isError && me.error.status === 401;

  useEffect(() => {
    if (unauthenticated) router.replace('/login');
  }, [unauthenticated, router]);

  if (me.isPending) {
    return (
      <main className="flex flex-1 items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (me.isError) {
    if (unauthenticated) return null;
    return (
      <main className="flex flex-1 items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">
          Could not reach the server. Please refresh to try again.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}

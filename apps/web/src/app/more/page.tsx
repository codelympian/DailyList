'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/auth-gate';
import { useLogout, useMe } from '@/hooks/use-auth';

const LINKS = [
  { href: '/imports', icon: '📄', label: 'Import customers', hint: 'Bring in a CSV or Excel file' },
  {
    href: '/segments',
    icon: '🧠',
    label: 'Customer segments',
    hint: 'Who your customers are today',
  },
  { href: '/settings', icon: '⚙️', label: 'Settings', hint: 'Tune who appears on your list' },
];

export default function MorePage() {
  return (
    <AuthGate>
      <More />
    </AuthGate>
  );
}

function More() {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();
  const business = me.data?.businesses[0];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">More</h1>
      {me.data && (
        <p className="mb-5 text-sm text-muted-foreground">
          {me.data.user.name}
          {business ? ` · ${business.name} · ${business.role.toLowerCase()}` : ''}
        </p>
      )}

      <ul className="mb-6 flex flex-col gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-14 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span aria-hidden className="text-xl">
                {link.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{link.label}</span>
                <span className="block text-xs text-muted-foreground">{link.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        className="w-full"
        disabled={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace('/login') })}
      >
        {logout.isPending ? 'Logging out…' : 'Log out'}
      </Button>
    </main>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  Users,
  Receipt,
  Flame,
  Package,
  Upload,
  Settings,
  MoreHorizontal,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/hooks/use-auth';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Everything the owner can reach. Named for what they do, not for tables. */
const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: ClipboardList },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/leads', label: 'Leads', icon: Flame },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/** The four that earn a slot in the thumb bar; the rest live behind More. */
const MOBILE_PRIMARY = NAV.slice(0, 4);
const MOBILE_SECONDARY = NAV.slice(4);

/** Marketing and auth pages render without app chrome. */
const CHROMELESS = ['/', '/pricing', '/login', '/signup', '/register', '/onboarding'];

function isChromeless(pathname: string): boolean {
  return CHROMELESS.includes(pathname);
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const me = useMe();
  const logout = useLogout();

  const signOut = () => {
    setMoreOpen(false);
    logout.mutate(undefined, { onSuccess: () => router.replace('/login') });
  };

  if (isChromeless(pathname)) {
    return (
      <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop: a compact rail, not a giant sidebar. The wrapper carries the
          border so it runs the full page height, not just the viewport. */}
      <div className="hidden w-60 shrink-0 border-r border-border/70 bg-card/40 lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col px-3 py-4">
          <Link
            href="/dashboard"
            className="mb-6 flex items-center gap-2 rounded-lg px-2 py-1 text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            Dailylist
          </Link>

          <nav aria-label="Main" className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Account sits at the foot of the rail. Logging out is a visible
              control rather than something hidden inside a menu — there are
              only seven destinations, so a menu would add a tap and hide it. */}
          <div className="mt-auto border-t border-border/70 pt-3">
            <div className="flex items-center gap-2.5 px-2.5 py-1.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium">
                {initials(me.data?.user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {me.data?.user.name ?? 'Account'}
                </span>
                {me.data?.businesses[0] && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {me.data.businesses[0].name}
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={logout.isPending}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              {logout.isPending ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] outline-none lg:pb-0"
        >
          {children}
        </div>
      </div>

      {/* Mobile: thumb-zone bar. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {MOBILE_PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[3.25rem] flex-col items-center justify-center gap-1 text-[11px] transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <Icon className={cn('size-5', active && 'text-honey-ink')} aria-hidden />
                  <span className={active ? 'font-medium' : undefined}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-controls="more-menu"
              className="flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
            >
              <MoreHorizontal className="size-5" aria-hidden />
              More
            </button>
          </li>
        </ul>

        {moreOpen && (
          <div id="more-menu" className="border-t border-border/70 px-3 py-2">
            <ul className="mx-auto flex max-w-lg flex-col">
              {MOBILE_SECONDARY.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm text-foreground"
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-border/70 pt-1">
                <button
                  type="button"
                  onClick={signOut}
                  disabled={logout.isPending}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-sm text-foreground disabled:opacity-50"
                >
                  <LogOut className="size-4 text-muted-foreground" aria-hidden />
                  {logout.isPending ? 'Logging out…' : 'Log out'}
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}

/** Initials stand in for an avatar we do not have. */
function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

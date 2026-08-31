'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation lives in the thumb zone on a phone (fixed bottom bar) and moves
 * to a top bar on wider screens. The owner is one tap from anything.
 */
const TABS = [
  { href: '/dashboard', label: 'Today', icon: '📋' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/leads', label: 'Leads', icon: '🔥' },
  { href: '/more', label: 'More', icon: '⋯' },
];

/** Public routes render without the app chrome. */
const BARE_ROUTES = ['/', '/login', '/register', '/onboarding'];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Desktop / tablet navigation */}
      <header className="sticky top-0 z-30 hidden border-b bg-background/85 backdrop-blur sm:block">
        <nav
          aria-label="Main"
          className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 py-2"
        >
          <Link href="/dashboard" className="mr-3 font-semibold tracking-tight">
            Dailylist
          </Link>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(pathname, tab.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isActive(pathname, tab.href)
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <div
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] outline-none sm:pb-0"
      >
        {children}
      </div>

      {/* Mobile navigation — thumb zone */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                    active ? 'text-honey-ink' : 'text-muted-foreground'
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {tab.icon}
                  </span>
                  <span className={active ? 'font-medium' : ''}>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

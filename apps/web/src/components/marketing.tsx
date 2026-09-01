'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#categories', label: 'Who you contact' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

/** Marketing header: hides on scroll down, returns on scroll up. */
export function MarketingNav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > 120 && y > lastY);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-transform duration-300 motion-reduce:transition-none',
        hidden && !menuOpen ? '-translate-y-full' : 'translate-y-0',
        scrolled && 'border-b border-border/60 bg-background/85 backdrop-blur',
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
            <ClipboardList className="size-4" aria-hidden />
          </span>
          Dailylist
        </Link>

        <nav aria-label="Marketing" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            Start free
          </Button>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-muted-foreground md:hidden"
          aria-expanded={menuOpen}
          aria-controls="marketing-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
      </div>

      {menuOpen && (
        <div
          id="marketing-menu"
          className="border-t border-border/60 bg-background px-4 py-3 md:hidden"
        >
          <nav aria-label="Marketing" className="flex flex-col">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="min-h-12 py-2 text-sm text-muted-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2">
            <Button className="min-h-12 w-full" render={<Link href="/signup" />}>
              Start free
            </Button>
            <Button variant="outline" className="min-h-12 w-full" render={<Link href="/login" />}>
              Log in
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            Dailylist
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Your daily sales assistant. Built for small businesses that sell on WhatsApp.
          </p>
        </div>

        <nav aria-label="Product">
          <h2 className="text-sm font-medium">Product</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/#how" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-foreground">
                FAQ
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-medium">Account</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Start free
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Dailylist. Made for Nigerian small businesses.
        </p>
      </div>
    </footer>
  );
}

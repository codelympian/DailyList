import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingFooter, MarketingNav } from '@/components/marketing';

export const metadata = {
  title: 'Pricing — Dailylist',
  description: 'Dailylist is free while in early access. No card required.',
};

const INCLUDED = [
  'Your daily sales list, every morning',
  'Hot leads, reorders, unpaid balances and reactivation',
  'A written reason for every suggestion',
  'Suggested messages, ready to send',
  'WhatsApp quick send',
  'Unlimited customers, products and sales',
  'Spreadsheet import (CSV and Excel)',
  'Customer profiles and history',
];

const FAQ = [
  {
    q: 'What happens when early access ends?',
    a: 'We will tell you well before anything changes, and you will be able to export your data at any time.',
  },
  {
    q: 'Do I need a card to start?',
    a: 'No. You create an account and start using it.',
  },
  {
    q: 'Is there a limit on customers?',
    a: 'No. Add as many as you have.',
  },
];

export default function PricingPage() {
  return (
    <>
      <MarketingNav />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20">
          <h1 className="text-display-lg font-semibold">Simple pricing</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Dailylist is free while we are in early access. We would rather have your feedback than
            your money right now.
          </p>
        </section>

        <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="rounded-3xl bg-card p-6 shadow-e3 ring-1 ring-border/60 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-honey-ink">Early access</p>
                <p className="mt-1 font-mono text-5xl font-semibold tracking-tight">Free</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Everything included. No card required.
                </p>
              </div>
              <Button size="lg" className="min-h-12 text-base" render={<Link href="/signup" />}>
                Start free
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>

            <hr className="my-7 border-border/60" />

            <h2 className="text-sm font-medium">What you get</h2>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-whatsapp-ink" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10">
            <h2 className="text-title font-semibold tracking-tight">Questions about pricing</h2>
            <div className="mt-5 flex flex-col gap-3">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl bg-card p-5 shadow-e1 ring-1 ring-border/50"
                >
                  <h3 className="text-base font-medium">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}

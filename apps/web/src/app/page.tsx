import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Flame,
  MessageCircle,
  Moon,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingFooter, MarketingNav } from '@/components/marketing';
import { ProductPreview } from '@/components/product-preview';

export const metadata = {
  title: 'Dailylist — Know exactly who to follow up with today',
  description:
    'Dailylist turns your customer list into a simple daily sales plan, so you stop forgetting leads, missed reorders and old customers.',
};

const PROBLEMS = [
  'A customer asks for a price on WhatsApp, you reply, and you never hear from them again.',
  'Someone who used to buy every month quietly stops, and you only notice months later.',
  'A balance goes unpaid because chasing it feels awkward and you forget who owes what.',
];

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Add your customers',
    body: 'Type them in, or bring your existing list across from a spreadsheet. Phone numbers are tidied up automatically.',
  },
  {
    title: 'Record what they buy',
    body: 'Each sale teaches Dailylist how often that customer buys and what they still owe you.',
  },
  {
    title: 'Open it each morning',
    body: 'Dailylist ranks who is worth contacting today and explains why, with a message ready to send.',
  },
];

const CATEGORIES: { icon: LucideIcon; label: string; body: string; tone: string }[] = [
  {
    icon: Flame,
    label: 'Hot leads',
    body: 'Asked about something recently but has not bought yet.',
    tone: 'text-orange-600 dark:text-orange-400',
  },
  {
    icon: RefreshCw,
    label: 'Reorders',
    body: 'Due to buy again based on how often they normally do.',
    tone: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Wallet,
    label: 'Unpaid',
    body: 'Still owes money on a previous sale.',
    tone: 'text-red-600 dark:text-red-400',
  },
  {
    icon: Moon,
    label: 'Reactivation',
    body: 'Used to buy regularly and has gone quiet.',
    tone: 'text-slate-600 dark:text-slate-300',
  },
];

const BENEFITS = [
  'Nothing to learn — open it and work down the list.',
  'Every suggestion explains itself, so you decide whether it makes sense.',
  'Works with the WhatsApp you already use. No new app for your customers.',
  'Your data stays yours. Export or delete it whenever you want.',
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is this accounting software?',
    a: 'No. Dailylist does not do books, invoices or tax. It records what you sold only so it can work out who to follow up with.',
  },
  {
    q: 'Is it a CRM?',
    a: 'Not the complicated kind. There are no pipelines or deal stages to maintain. You get one list each morning and you work through it.',
  },
  {
    q: 'Does it message customers automatically?',
    a: 'No, and that is deliberate. Dailylist writes a suggested message and opens WhatsApp with it ready. You read it, change it if you want, and send it yourself.',
  },
  {
    q: 'Do I need my customers to install anything?',
    a: 'No. They receive a normal WhatsApp message from your normal number.',
  },
  {
    q: 'What if my customer list is in a spreadsheet?',
    a: 'Import it. Dailylist reads CSV and Excel files, works out which column is which, and shows you a preview before anything is saved.',
  },
  {
    q: 'How does it decide who to contact?',
    a: 'From your own data — how often someone buys, when they last bought, what they owe, and what they recently asked about. The reasons are shown on every suggestion.',
  },
];

export default function Home() {
  return (
    <>
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-honey-wash px-3 py-1 text-xs font-medium text-honey-ink ring-1 ring-honey/25">
                Your daily sales assistant
              </p>
              <h1 className="mt-4 text-display-lg font-semibold">
                Know exactly who to follow up with today.
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Dailylist turns your customer list into a simple daily sales plan — so you stop
                forgetting leads, missed reorders and old customers.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="min-h-12 text-base" render={<Link href="/signup" />}>
                  Start free
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-12 text-base"
                  render={<Link href="/#how" />}
                >
                  See how it works
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Free while in early access. No card needed.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="max-w-2xl text-display font-semibold">
              Most lost sales are not lost. They are forgotten.
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <li
                  key={problem}
                  className="rounded-2xl bg-background p-5 text-sm leading-relaxed shadow-e1 ring-1 ring-border/50"
                >
                  {problem}
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              You already have the customers. Dailylist makes sure you actually get back to them.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-display font-semibold">How Dailylist works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="grid size-8 place-items-center rounded-lg bg-foreground font-mono text-sm font-semibold text-background">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The daily list */}
        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-display font-semibold">One list. Every morning.</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Not a dashboard to study. A short list of people worth a message today, ordered by
                who matters most, that you work through and finish.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Every person on it comes with the reason they are there — &ldquo;normally buys every
                30 days, last bought 35 days ago&rdquo; — so you are never guessing, and you can
                disagree with it.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-display font-semibold">Who ends up on your list</h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Four kinds of follow-up, worked out from your own sales history.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <li
                    key={category.label}
                    className="rounded-2xl bg-card p-5 shadow-e1 ring-1 ring-border/50"
                  >
                    <Icon className={`size-5 ${category.tone}`} aria-hidden />
                    <h3 className="mt-3 text-base font-semibold">{category.label}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {category.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* WhatsApp workflow */}
        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-whatsapp/10 text-whatsapp-ink">
                <MessageCircle className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-display font-semibold">Sent from your own WhatsApp</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Tap send and WhatsApp opens with the message already written, addressed to the right
                person. You read it, edit it if you want, and send it yourself.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Nothing is sent automatically and nothing is sent on your behalf. Your customers get
                a normal message from the number they already know.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-display font-semibold">
              More follow-ups. More conversations. More sales.
            </h2>
            <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-2.5 text-sm leading-relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-whatsapp-ink" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-y border-border/60 bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-display font-semibold">Simple pricing</h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Dailylist is free while we are in early access.
            </p>
            <div className="mt-8 max-w-sm rounded-2xl bg-background p-6 shadow-e2 ring-1 ring-border/50">
              <p className="text-sm font-medium">Early access</p>
              <p className="mt-2 font-mono text-4xl font-semibold tracking-tight">Free</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything in Dailylist, no card required.
              </p>
              <Button className="mt-5 min-h-12 w-full" render={<Link href="/signup" />}>
                Start free
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">
                See what is included
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-display font-semibold">Questions</h2>
            <div className="mt-8 flex max-w-3xl flex-col gap-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl bg-card p-5 shadow-e1 ring-1 ring-border/50"
                >
                  <summary className="cursor-pointer list-none text-base font-medium">
                    <span className="flex items-center justify-between gap-3">
                      {item.q}
                      <ArrowRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
                        aria-hidden
                      />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6">
            <h2 className="text-display font-semibold">
              Start with the customers you already have.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Add your list, record a few sales, and see who Dailylist says to contact tomorrow
              morning.
            </p>
            <Button size="lg" className="mt-7 min-h-12 text-base" render={<Link href="/signup" />}>
              Start free
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}

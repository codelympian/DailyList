import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Flame,
  MessageCircle,
  Moon,
  NotebookPen,
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
  {
    title: 'The price you quoted',
    body: 'A customer asks on WhatsApp, you reply, and you never hear from them again.',
  },
  {
    title: 'The customer who drifted',
    body: 'Someone who bought every month quietly stops, and you notice months later.',
  },
  {
    title: 'The balance nobody chased',
    body: 'Money stays unpaid because asking feels awkward and you forget who owes what.',
  },
];

const STEPS = [
  {
    title: 'Add your customers',
    body: 'Type them in, or bring your list across from a spreadsheet. Phone numbers are tidied up for you.',
  },
  {
    title: 'Record what they buy',
    body: 'Each sale teaches Dailylist how often that customer buys and what they still owe.',
  },
  {
    title: 'Open it each morning',
    body: 'A short list of who to contact, why they are on it, and a message ready to send.',
  },
];

const CATEGORIES: { icon: LucideIcon; label: string; body: string; tone: string; wash: string }[] =
  [
    {
      icon: Flame,
      label: 'Hot leads',
      body: 'Asked about something recently but has not bought yet.',
      tone: 'text-orange-600 dark:text-orange-400',
      wash: 'bg-orange-50 dark:bg-orange-950/40',
    },
    {
      icon: RefreshCw,
      label: 'Reorders',
      body: 'Due to buy again based on how often they normally do.',
      tone: 'text-emerald-600 dark:text-emerald-400',
      wash: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      icon: Wallet,
      label: 'Unpaid',
      body: 'Still owes money on a previous sale.',
      tone: 'text-red-600 dark:text-red-400',
      wash: 'bg-red-50 dark:bg-red-950/40',
    },
    {
      icon: Moon,
      label: 'Reactivation',
      body: 'Used to buy regularly and has gone quiet.',
      tone: 'text-slate-600 dark:text-slate-300',
      wash: 'bg-slate-100 dark:bg-slate-800/60',
    },
  ];

const BENEFITS = [
  'Nothing to learn — open it and work down the list.',
  'Every suggestion explains itself, so you decide if it makes sense.',
  'Uses the WhatsApp you already have. No new app for your customers.',
  'Your data stays yours. Export or delete it whenever you want.',
];

const FAQ = [
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
    q: 'Do my customers need to install anything?',
    a: 'No. They get a normal WhatsApp message from your normal number.',
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
        {/* Hero. On a wide screen the text and photograph share the first
            screen; on a phone the text leads and the photo runs full-bleed
            beneath it. Either way the image is visible without scrolling. */}
        <section className="relative overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:pt-12">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                  <NotebookPen className="size-3.5" aria-hidden />
                  Your daily sales assistant
                </p>
                <h1 className="mt-5 text-balance text-display-lg font-semibold">
                  Know exactly who to follow up with <span className="text-brand">today.</span>
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Dailylist turns your customer list into a simple daily sales plan — so you stop
                  forgetting leads, missed reorders and old customers.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="min-h-13 text-base" render={<Link href="/signup" />}>
                    Start free
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-13 text-base"
                    render={<Link href="/#how" />}
                  >
                    See how it works
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Free while in early access. No card needed.
                </p>
              </div>

              {/* Photo with the product card resting on its lower corner. */}
              <div className="relative -mx-4 sm:mx-0">
                <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10] sm:rounded-3xl lg:aspect-square">
                  <Image
                    src="/hero-shop-owner.jpg"
                    alt="A fabric shop owner checking her daily sales list on her phone, with her orders notebook open on the counter beside her"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-[62%_center]"
                  />
                </div>
                <div className="relative z-10 -mt-16 flex justify-center px-4 sm:-mt-20 sm:justify-end sm:pr-6 lg:-mt-24">
                  <div className="w-full max-w-[19rem] scale-95 sm:scale-100">
                    <ProductPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mt-16 sm:mt-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="max-w-2xl text-balance text-display font-semibold">
              Most lost sales are not lost. They are forgotten.
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <li key={problem.title} className="border-t-2 border-brand/25 pt-4">
                  <h3 className="text-base font-semibold">{problem.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {problem.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-2xl text-xl leading-relaxed">
              You already have the customers.{' '}
              <span className="text-muted-foreground">
                Dailylist makes sure you actually get back to them.
              </span>
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-20 scroll-mt-20 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-display font-semibold">How Dailylist works</h2>
            <ol className="mt-10 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl bg-card p-6 shadow-e2 ring-1 ring-border/50"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-brand font-mono text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The dark band — the page's one moment of contrast. */}
        <section className="mt-20 bg-brand-deep py-20 text-white sm:mt-28 sm:py-24">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-balance text-display font-semibold">One list. Every morning.</h2>
              <p className="mt-5 text-lg leading-relaxed text-white/75">
                Not a dashboard to study. A short list of people worth a message today, ordered by
                who matters most, that you work through and finish.
              </p>
              <p className="mt-4 leading-relaxed text-white/60">
                Every person on it comes with the reason they are there — &ldquo;normally buys every
                30 days, last bought 35 days ago&rdquo; — so you are never guessing, and you can
                disagree with it.
              </p>
              <Button
                size="lg"
                className="mt-8 min-h-12 bg-white text-base text-brand-deep hover:bg-white/90"
                render={<Link href="/signup" />}
              >
                Start free
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="mt-20 scroll-mt-20 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
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
                    className="rounded-2xl bg-card p-6 shadow-e2 ring-1 ring-border/50"
                  >
                    <span
                      className={`grid size-11 place-items-center rounded-xl ${category.wash} ${category.tone}`}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{category.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {category.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* WhatsApp */}
        <section className="mt-20 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 rounded-3xl bg-card p-8 shadow-e2 ring-1 ring-border/50 sm:p-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
              <div>
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-whatsapp/10 text-whatsapp-ink">
                  <MessageCircle className="size-6" aria-hidden />
                </span>
                <h2 className="mt-5 text-balance text-display font-semibold">
                  Sent from your own WhatsApp
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  Tap send and WhatsApp opens with the message already written, addressed to the
                  right person. You read it, edit it if you want, and send it yourself.
                </p>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Nothing is sent automatically and nothing is sent on your behalf. Your customers
                  get a normal message from the number they already know.
                </p>
              </div>

              {/* The message as the customer receives it — a normal WhatsApp chat. */}
              <div className="rounded-2xl bg-[#ECE5DD] p-4 dark:bg-secondary">
                <p className="mb-3 text-center text-[11px] font-medium text-slate-500">Today</p>
                <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm dark:bg-whatsapp/25">
                  <p className="text-sm leading-relaxed text-slate-900 dark:text-foreground">
                    Hi Ngozi 😊 You asked about the Glow Serum. Would you like me to reserve one for
                    you?
                  </p>
                  <p className="mt-1 text-right text-[10px] text-slate-500">09:14 ✓✓</p>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-500">
                  Sent from your number, by you
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-20 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="max-w-3xl text-balance text-display font-semibold">
              More follow-ups. More conversations. More sales.
            </h2>
            <ul className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-base leading-relaxed">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-whatsapp/15 text-whatsapp-ink">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mt-20 scroll-mt-20 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-display font-semibold">Simple pricing</h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Dailylist is free while we are in early access.
            </p>
            <div className="mt-8 max-w-md rounded-3xl bg-brand-soft p-8 ring-1 ring-brand/15">
              <p className="text-sm font-medium text-brand">Early access</p>
              <p className="mt-2 font-mono text-5xl font-semibold tracking-tight">Free</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Everything in Dailylist, no card required.
              </p>
              <Button className="mt-6 min-h-12 w-full text-base" render={<Link href="/signup" />}>
                Start free
              </Button>
              <Link
                href="/pricing"
                className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                See what is included
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-20 scroll-mt-20 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-display font-semibold">Questions</h2>
            <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl bg-card p-5 shadow-e1 ring-1 ring-border/50 transition-shadow hover:shadow-e2"
                >
                  <summary className="cursor-pointer list-none text-base font-medium">
                    <span className="flex items-start justify-between gap-3">
                      {item.q}
                      <ArrowRight
                        className="mt-1 size-4 shrink-0 text-brand transition-transform group-open:rotate-90 motion-reduce:transition-none"
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
        <section className="mt-20 pb-4 sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-3xl bg-brand-deep px-6 py-16 text-center text-white sm:px-12 sm:py-20">
              <h2 className="mx-auto max-w-2xl text-balance text-display font-semibold">
                Start with the customers you already have.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/75">
                Add your list, record a few sales, and see who Dailylist says to contact tomorrow
                morning.
              </p>
              <Button
                size="lg"
                className="mt-8 min-h-13 bg-white text-base text-brand-deep hover:bg-white/90"
                render={<Link href="/signup" />}
              >
                Start free
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}

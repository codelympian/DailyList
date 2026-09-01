'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileSpreadsheet,
  MessageCircle,
  NotebookPen,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { createBusinessSchema, type CreateBusinessInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { cn } from '@/lib/utils';
import { useCreateBusiness, useMe } from '@/hooks/use-auth';

/** How the owner keeps track today. Shapes the advice on the last step. */
const METHODS: { id: string; icon: LucideIcon; label: string; hint: string }[] = [
  { id: 'notebook', icon: NotebookPen, label: 'A notebook', hint: 'Written down by hand' },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    label: 'WhatsApp chats',
    hint: 'I scroll back to find things',
  },
  {
    id: 'spreadsheet',
    icon: FileSpreadsheet,
    label: 'A spreadsheet',
    hint: 'Excel or Google Sheets',
  },
  { id: 'memory', icon: Sparkles, label: 'Mostly memory', hint: 'I keep it in my head' },
];

export default function OnboardingPage() {
  return (
    <AuthGate>
      <Onboarding />
    </AuthGate>
  );
}

function Onboarding() {
  const router = useRouter();
  const me = useMe();
  const createBusiness = useCreateBusiness();
  const [step, setStep] = useState(2);
  const [method, setMethod] = useState<string | null>(null);

  const form = useForm<CreateBusinessInput>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: { name: '', industry: '' },
  });

  const firstName = me.data?.user.name.split(' ')[0] ?? '';
  const businessName = me.data?.businesses[0]?.name;

  const submitBusiness = form.handleSubmit((values) => {
    // Already created (e.g. the user went back a step) — just move on.
    if (businessName) {
      setStep(3);
      return;
    }
    createBusiness.mutate(values, { onSuccess: () => setStep(3) });
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 self-start text-base font-semibold tracking-tight"
      >
        <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
          <ClipboardList className="size-4" aria-hidden />
        </span>
        Dailylist
      </Link>

      <OnboardingProgress current={step} />

      {step === 2 && (
        <section className="mt-7">
          <h1 className="text-title font-semibold tracking-tight">
            {firstName ? `Welcome, ${firstName}. ` : ''}Tell us about your business
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the name your customers know you by — it appears in the messages you send.
          </p>

          <form onSubmit={submitBusiness} noValidate className="mt-6">
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="business-name">Business name</FieldLabel>
                <Input
                  id="business-name"
                  className="h-11"
                  placeholder="Ada's Glow"
                  defaultValue={businessName}
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.industry}>
                <FieldLabel htmlFor="industry">What do you sell? (optional)</FieldLabel>
                <Input
                  id="industry"
                  className="h-11"
                  placeholder="Beauty products, fashion, food…"
                  {...form.register('industry')}
                />
                <FieldDescription>Helps us word your messages naturally.</FieldDescription>
                <FieldError errors={[form.formState.errors.industry]} />
              </Field>

              {createBusiness.isError && (
                <p role="alert" className="text-sm text-destructive">
                  We could not save that. Check your connection and try again.
                </p>
              )}

              <Button
                type="submit"
                className="min-h-12 w-full text-base"
                disabled={createBusiness.isPending}
              >
                {createBusiness.isPending ? 'Saving…' : 'Continue'}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </FieldGroup>
          </form>
        </section>
      )}

      {step === 3 && (
        <section className="mt-7">
          <h1 className="text-title font-semibold tracking-tight">
            How do you keep track of customers today?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No wrong answer — it just tells us the fastest way to get your list in.
          </p>

          <ul className="mt-6 flex flex-col gap-2">
            {METHODS.map((option) => {
              const Icon = option.icon;
              const selected = method === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMethod(option.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left shadow-e1 ring-1 transition-all hover:shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      selected ? 'ring-2 ring-honey' : 'ring-border/50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-lg',
                        selected
                          ? 'bg-honey/20 text-honey-ink'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                    {selected && <Check className="size-4 shrink-0 text-honey-ink" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="min-h-12" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button className="min-h-12 flex-1 text-base" onClick={() => setStep(4)}>
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="mt-7">
          <h1 className="text-title font-semibold tracking-tight">Add your customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {method === 'spreadsheet'
              ? 'Since you already have a spreadsheet, importing it is the quickest way to start.'
              : 'Start with a handful of the customers you contact most. You can always add more later.'}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/imports"
              className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-e1 ring-1 ring-border/50 transition-shadow hover:shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-honey/15 text-honey-ink">
                <FileSpreadsheet className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Import a spreadsheet</span>
                <span className="block text-xs text-muted-foreground">
                  CSV or Excel — we match up the columns for you
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>

            <Link
              href="/customers/new"
              className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-e1 ring-1 ring-border/50 transition-shadow hover:shadow-e2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <UserPlus className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Add one customer</span>
                <span className="block text-xs text-muted-foreground">
                  Type in a name and phone number
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="min-h-12" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button variant="outline" className="min-h-12 flex-1" onClick={() => setStep(5)}>
              I&apos;ll do this later
            </Button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="mt-7">
          <div className="rounded-2xl bg-honey-wash p-6 text-center ring-1 ring-honey/25">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-honey/20 text-honey-ink">
              <Check className="size-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-title font-semibold tracking-tight">
              You&apos;re ready{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {businessName ? `${businessName} is set up. ` : ''}
              As you add customers and record sales, Dailylist works out who to contact each morning
              — and why.
            </p>
          </div>

          <ol className="mt-6 flex flex-col gap-3">
            {[
              'Add the customers you contact most',
              'Record a few recent sales, including anything unpaid',
              'Open Dailylist tomorrow morning and work your list',
            ].map((item, index) => (
              <li key={item} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>

          <Button
            className="mt-7 min-h-12 w-full text-base"
            onClick={() => router.replace('/dashboard')}
          >
            Go to my list
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </section>
      )}
    </main>
  );
}

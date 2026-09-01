'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ClipboardList } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { useRegister } from '@/hooks/use-auth';

const REASSURANCE = [
  'Free while in early access',
  'No card required',
  'Your customers never need an app',
];

/** Step 1 of onboarding: create the account. Steps 2–5 live at /onboarding. */
export default function SignupPage() {
  const router = useRouter();
  const registerMutation = useRegister();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(values, { onSuccess: () => router.replace('/onboarding') });
  });

  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            Dailylist
          </Link>

          <OnboardingProgress current={1} />

          <h1 className="mt-6 text-title font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Takes about a minute. You can add customers straight after.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6">
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="name">Your name</FieldLabel>
                <Input
                  id="name"
                  autoComplete="name"
                  className="h-11"
                  placeholder="Ada Okafor"
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-11"
                  placeholder="you@example.com"
                  {...form.register('email')}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                  {...form.register('password')}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
                <FieldError errors={[form.formState.errors.password]} />
              </Field>

              {registerMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {registerMutation.error.status === 409
                    ? 'An account with this email already exists. Log in instead.'
                    : registerMutation.error.status === 429
                      ? 'Too many attempts. Wait a minute and try again.'
                      : 'We could not create your account. Check your connection and try again.'}
                </p>
              )}

              <Button
                type="submit"
                className="min-h-12 w-full text-base"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating account…' : 'Create account'}
              </Button>
            </FieldGroup>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      <aside className="hidden flex-col justify-center border-l border-border/60 bg-card/40 px-12 py-16 lg:flex">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-display font-semibold">Stop losing sales you already earned.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Dailylist looks at who asked, who is due to buy again, and who still owes you — then
            hands you a short list each morning.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {REASSURANCE.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-whatsapp/15 text-whatsapp-ink">
                  <Check className="size-3" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}

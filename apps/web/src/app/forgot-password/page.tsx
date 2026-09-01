'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardList, MailCheck } from 'lucide-react';
import { emailSchema } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useRequestPasswordReset } from '@/hooks/use-auth';

const schema = z.object({ email: emailSchema });
type FormInput = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const reset = useRequestPasswordReset();
  const form = useForm<FormInput>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit((values) => reset.mutate(values));

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
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

        {reset.isSuccess ? (
          <div className="rounded-2xl bg-card p-6 shadow-e1 ring-1 ring-border/50">
            <span className="grid size-10 place-items-center rounded-xl bg-whatsapp/15 text-whatsapp-ink">
              <MailCheck className="size-5" aria-hidden />
            </span>
            <h1 className="mt-4 text-title font-semibold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If an account exists for that address, we have sent a link to reset your password. The
              link expires in an hour.
            </p>
            <Button variant="outline" className="mt-5 w-full" render={<Link href="/login" />}>
              Back to log in
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-title font-semibold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we will send you a link to set a new one.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-7">
              <FieldGroup>
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

                {reset.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    We could not send that email. Check your connection and try again.
                  </p>
                )}

                <Button
                  type="submit"
                  className="min-h-12 w-full text-base"
                  disabled={reset.isPending}
                >
                  {reset.isPending ? 'Sending…' : 'Send reset link'}
                </Button>
              </FieldGroup>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Remembered it?{' '}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

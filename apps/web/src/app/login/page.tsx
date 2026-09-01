'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { loginSchema, type LoginInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ProductPreview } from '@/components/product-preview';
import { GoogleButton } from '@/components/google-button';
import { useLogin } from '@/hooks/use-auth';

/**
 * Returning users: a single centred column, quiet and quick. Signup is the
 * one that sells; this one just gets them back in.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The OAuth callback reports provider failures back here.
  const callbackError = searchParams.get('error');
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => router.replace('/dashboard') });
  });

  return (
    <main className="grid flex-1 lg:grid-cols-[1fr_minmax(0,26rem)]">
      {/* Context panel, desktop only — reassurance, not decoration. */}
      <aside className="hidden flex-col justify-center border-r border-border/60 bg-card/40 px-12 py-16 lg:flex">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-sm font-medium text-honey-ink">Welcome back</p>
          <h2 className="mt-2 text-display font-semibold">Your list is waiting.</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Pick up where you left off and see who is worth a message today.
          </p>
          <div className="mt-8">
            <ProductPreview />
          </div>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
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

          <h1 className="text-title font-semibold tracking-tight">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your details to see today&apos;s sales list.
          </p>

          {callbackError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {callbackError}
            </p>
          )}

          <div className="mt-7">
            <GoogleButton label="Continue with Google" />
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} noValidate>
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

              <Field data-invalid={!!form.formState.errors.password}>
                <div className="flex items-baseline justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11"
                  {...form.register('password')}
                />
                <FieldError errors={[form.formState.errors.password]} />
              </Field>

              {login.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {login.error.status === 400 || login.error.status === 401
                    ? 'That email and password do not match. Try again.'
                    : login.error.status === 429
                      ? 'Too many attempts. Wait a minute and try again.'
                      : 'We could not log you in. Check your connection and try again.'}
                </p>
              )}

              <Button
                type="submit"
                className="min-h-12 w-full text-base"
                disabled={login.isPending}
              >
                {login.isPending ? 'Logging in…' : 'Log in'}
              </Button>
            </FieldGroup>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New to Dailylist?{' '}
            <Link
              href="/signup"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

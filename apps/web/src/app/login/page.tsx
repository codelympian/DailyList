'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => router.replace('/dashboard') });
  });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back 👋</CardTitle>
          <CardDescription>Log in to see today&apos;s sales list.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  {...form.register('email')}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
                <FieldError errors={[form.formState.errors.password]} />
              </Field>
              {login.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {login.error.status === 401
                    ? 'Invalid email or password'
                    : 'Something went wrong. Please try again.'}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? 'Logging in…' : 'Log in'}
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to Dailylist?{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

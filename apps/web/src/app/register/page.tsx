'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useRegister } from '@/hooks/use-auth';

export default function RegisterPage() {
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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Know who to contact today — in minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="name">Your name</FieldLabel>
                <Input
                  id="name"
                  autoComplete="name"
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
                  autoComplete="new-password"
                  {...form.register('password')}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
                <FieldError errors={[form.formState.errors.password]} />
              </Field>
              {registerMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {registerMutation.error.status === 409
                    ? 'An account with this email already exists.'
                    : 'Something went wrong. Please try again.'}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Creating account…' : 'Create account'}
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

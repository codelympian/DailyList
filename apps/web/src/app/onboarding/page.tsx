'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBusinessSchema, type CreateBusinessInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/components/auth-gate';
import { useCreateBusiness } from '@/hooks/use-auth';

export default function OnboardingPage() {
  return (
    <AuthGate>
      <OnboardingForm />
    </AuthGate>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const createBusiness = useCreateBusiness();
  const form = useForm<CreateBusinessInput>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: { name: '', industry: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    createBusiness.mutate(values, { onSuccess: () => router.replace('/dashboard') });
  });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your business</CardTitle>
          <CardDescription>
            Dailylist builds your daily contact list around your business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="name">Business name</FieldLabel>
                <Input id="name" placeholder="Ada's Glow" {...form.register('name')} />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.industry}>
                <FieldLabel htmlFor="industry">Industry (optional)</FieldLabel>
                <Input
                  id="industry"
                  placeholder="Beauty, Fashion, Food…"
                  {...form.register('industry')}
                />
                <FieldDescription>Helps tailor defaults later.</FieldDescription>
                <FieldError errors={[form.formState.errors.industry]} />
              </Field>
              {createBusiness.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Something went wrong. Please try again.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={createBusiness.isPending}>
                {createBusiness.isPending ? 'Creating…' : 'Create business'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

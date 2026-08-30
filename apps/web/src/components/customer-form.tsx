'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema, type CreateCustomerInput } from '@dailylist/validation';
import type { DuplicateCustomerError } from '@dailylist/types';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';

export interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export function CustomerForm({
  defaultValues,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  defaultValues: CustomerFormValues;
  submitLabel: string;
  pending: boolean;
  error: ApiError | null;
  onSubmit: (values: CreateCustomerInput) => void;
}) {
  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues,
  });

  const duplicate =
    error?.status === 409 ? (error.body as DuplicateCustomerError).duplicate : undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" placeholder="Ada Okafor" {...form.register('name')} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.phone}>
          <FieldLabel htmlFor="phone">Phone (WhatsApp)</FieldLabel>
          <Input id="phone" type="tel" placeholder="0801 234 5678" {...form.register('phone')} />
          <FieldDescription>Nigerian (08012345678) or international (+…)</FieldDescription>
          <FieldError errors={[form.formState.errors.phone]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Email (optional)</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="ada@example.com"
            {...form.register('email')}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.notes}>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Input id="notes" placeholder="Asked about Glow Serum" {...form.register('notes')} />
          <FieldError errors={[form.formState.errors.notes]} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {duplicate
              ? `A customer with this ${duplicate.identityType.toLowerCase()} already exists: ${duplicate.customerName}`
              : 'Something went wrong. Please try again.'}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}

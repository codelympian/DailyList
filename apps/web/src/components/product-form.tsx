'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProductSchema, type CreateProductInput } from '@dailylist/validation';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/lib/api';

export function ProductForm({
  defaultValues,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  defaultValues: Partial<CreateProductInput>;
  submitLabel: string;
  pending: boolean;
  error: ApiError | null;
  onSubmit: (values: CreateProductInput) => void;
}) {
  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">Product name</FieldLabel>
          <Input id="name" placeholder="Glow Serum" {...form.register('name')} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!form.formState.errors.price}>
            <FieldLabel htmlFor="price">Price (₦)</FieldLabel>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="18000"
              {...form.register('price', { valueAsNumber: true })}
            />
            <FieldError errors={[form.formState.errors.price]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.costPrice}>
            <FieldLabel htmlFor="costPrice">Cost price (₦)</FieldLabel>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional"
              {...form.register('costPrice', {
                setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
              })}
            />
            <FieldError errors={[form.formState.errors.costPrice]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!form.formState.errors.sku}>
            <FieldLabel htmlFor="sku">SKU</FieldLabel>
            <Input id="sku" placeholder="Optional" {...form.register('sku')} />
            <FieldError errors={[form.formState.errors.sku]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.category}>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Input id="category" placeholder="Optional" {...form.register('category')} />
            <FieldError errors={[form.formState.errors.category]} />
          </Field>
        </div>
        <Field data-invalid={!!form.formState.errors.reorderIntervalDays}>
          <FieldLabel htmlFor="reorderIntervalDays">Reorder interval (days)</FieldLabel>
          <Input
            id="reorderIntervalDays"
            type="number"
            min="1"
            placeholder="e.g. 30"
            {...form.register('reorderIntervalDays', {
              setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
            })}
          />
          <FieldDescription>
            How often customers typically need this again — powers reorder reminders.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.reorderIntervalDays]} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.status === 409
              ? 'A product with this SKU already exists.'
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

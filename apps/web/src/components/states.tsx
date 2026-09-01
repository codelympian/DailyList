'use client';

import Link from 'next/link';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shared loading / empty / error states.
 *
 * Empty screens explain what is happening, why it matters and what to do
 * next. Errors say what went wrong in plain words and never leak internals.
 */

/** Skeletons mirror the shape of what is loading, so nothing jumps. */
export function CardSkeletons({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-card p-5 shadow-e1 ring-1 ring-border/50">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-7 w-44" />
          <Skeleton className="mt-4 h-3 w-20" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-3/4" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function RowSkeletons({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-xl bg-card p-3.5 shadow-e1 ring-1 ring-border/50"
        >
          <div className="flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-14 text-center shadow-e1 ring-1 ring-border/50">
      <span className="grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && actionHref && (
            <Button render={<Link href={actionHref} />}>{actionLabel}</Button>
          )}
          {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
          {secondaryLabel && secondaryHref && (
            <Button variant="ghost" render={<Link href={secondaryHref} />}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl bg-destructive/5 px-6 py-12 text-center ring-1 ring-destructive/20"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Shared loading / empty / error states.
 *
 * An empty screen is an invitation to act, and an error says what happened
 * and what to do about it — never a bare shrug.
 */

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-16">
      <span
        aria-hidden
        className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-honey motion-reduce:animate-none"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Skeleton rows — used where we know the shape of what is coming. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border bg-card p-4">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="mb-2 h-5 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon = '📋',
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <span aria-hidden className="text-3xl">
        {icon}
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {actionLabel && actionHref && (
        <Button className="mt-1" render={<Link href={actionHref} />}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && onAction && (
        <Button className="mt-1" onClick={onAction}>
          {actionLabel}
        </Button>
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
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
    >
      <span aria-hidden className="text-2xl">
        ⚠️
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {onRetry && (
        <Button variant="outline" className="mt-1" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

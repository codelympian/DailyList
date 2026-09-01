import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * One header for every app screen, so titles, back links and primary
 * actions sit in the same place on each page rather than being re-invented.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-5">
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 -ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

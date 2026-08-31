'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ImportJobSummary, ImportRowStatus } from '@dailylist/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness } from '@/hooks/use-customers';
import {
  errorReportUrl,
  useConfirmImport,
  useImportJob,
  useImportRows,
  useSetImportMapping,
} from '@/hooks/use-imports';

/** Target fields the user can map, with friendly labels. */
const TARGET_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Customer name', required: true },
  { key: 'phone', label: 'Phone / WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'product', label: 'Product' },
  { key: 'amount', label: 'Amount' },
  { key: 'balance', label: 'Balance owed' },
  { key: 'date', label: 'Purchase date' },
  { key: 'notes', label: 'Notes' },
];

const STEPS = ['Upload', 'Map fields', 'Preview', 'Results'];

export default function ImportWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <ImportWizard jobId={id} />
    </AuthGate>
  );
}

function currentStep(job: ImportJobSummary): number {
  if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') return 3;
  if (job.status === 'PREVIEW' || job.status === 'IMPORTING') return 2;
  return 1;
}

function ImportWizard({ jobId }: { jobId: string }) {
  const { business } = useActiveBusiness();
  const job = useImportJob(business?.id, jobId);
  const setMapping = useSetImportMapping(business?.id, jobId);
  const confirmImport = useConfirmImport(business?.id, jobId);
  // Derived, not synced: the server's suggestion is the default until the
  // user edits it (avoids a setState-in-effect cascade).
  const [edited, setEdited] = useState<Record<string, string> | null>(null);
  const mapping = edited ?? job.data?.mapping ?? job.data?.suggestedMapping ?? {};

  if (job.isPending) {
    return <main className="flex-1 py-24 text-center text-sm text-muted-foreground">Loading…</main>;
  }
  if (job.isError) {
    return (
      <main className="flex-1 py-24 text-center text-sm text-muted-foreground">
        Import not found.{' '}
        <Link href="/imports" className="underline">
          Back to imports
        </Link>
      </main>
    );
  }

  const j = job.data;
  const step = currentStep(j);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/imports" className="text-sm text-muted-foreground hover:underline">
        ← Imports
      </Link>
      <h1 className="mt-2 truncate text-xl font-bold tracking-tight">{j.fileName}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {j.totalRows} rows · {j.fileType}
      </p>

      <ol className="mb-5 flex gap-1 text-xs">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`flex-1 rounded-full px-2 py-1 text-center ${
              index <= step
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <MappingStep
          job={j}
          mapping={mapping}
          onChange={setEdited}
          pending={setMapping.isPending}
          error={setMapping.error?.body.message ?? null}
          onSubmit={() => setMapping.mutate(mapping)}
        />
      )}

      {step === 2 && (
        <PreviewStep
          job={j}
          businessId={business?.id}
          jobId={jobId}
          pending={confirmImport.isPending || j.status === 'IMPORTING'}
          error={confirmImport.error?.body.message ?? null}
          onConfirm={() => confirmImport.mutate()}
          onBackToMapping={() => setMapping.reset()}
        />
      )}

      {step === 3 && <ResultsStep job={j} businessId={business?.id} jobId={jobId} />}
    </main>
  );
}

function MappingStep({
  job,
  mapping,
  onChange,
  pending,
  error,
  onSubmit,
}: {
  job: ImportJobSummary;
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const usedColumns = useMemo(() => new Set(Object.values(mapping)), [mapping]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Match your columns</CardTitle>
        <p className="text-sm text-muted-foreground">
          We guessed these from your file — change anything that looks wrong.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {TARGET_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3">
            <label htmlFor={`map-${field.key}`} className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </label>
            <select
              id={`map-${field.key}`}
              className="h-8 w-1/2 rounded-lg border bg-background px-2 text-sm"
              value={mapping[field.key] ?? ''}
              onChange={(e) => {
                const next = { ...mapping };
                if (e.target.value === '') delete next[field.key];
                else next[field.key] = e.target.value;
                onChange(next);
              }}
            >
              <option value="">— Not imported —</option>
              {job.columns.map((column) => (
                <option
                  key={column}
                  value={column}
                  disabled={usedColumns.has(column) && mapping[field.key] !== column}
                >
                  {column}
                </option>
              ))}
            </select>
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={pending || !mapping.name} onClick={onSubmit}>
          {pending ? 'Checking rows…' : 'Continue to preview'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PreviewStep({
  job,
  businessId,
  jobId,
  pending,
  error,
  onConfirm,
  onBackToMapping,
}: {
  job: ImportJobSummary;
  businessId: string | undefined;
  jobId: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onBackToMapping: () => void;
}) {
  const [filter, setFilter] = useState<ImportRowStatus>('VALID');
  const rows = useImportRows(businessId, jobId, filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total rows" value={job.totalRows} />
        <Stat label="Will import" value={job.validRows} tone="good" />
        <Stat label="Duplicates" value={job.duplicateRows} tone="warn" />
        <Stat label="Problems" value={job.invalidRows} tone="bad" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Check the rows</CardTitle>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(['VALID', 'DUPLICATE', 'INVALID'] as ImportRowStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {status === 'VALID' ? 'Ready' : status === 'DUPLICATE' ? 'Duplicates' : 'Problems'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {rows.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rows.data && rows.data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No rows in this group.</p>
          )}
          <ul className="flex flex-col gap-2">
            {rows.data?.items.slice(0, 25).map((row) => (
              <li key={row.id} className="rounded-lg border p-2.5 text-sm">
                <p className="font-medium">
                  Row {row.rowNumber}: {row.normalized?.name ?? Object.values(row.raw)[0] ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.normalized?.phone ?? ''}{' '}
                  {row.normalized?.amount ? `· ₦${row.normalized.amount}` : ''}
                </p>
                {row.errors?.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {e.field}: {e.message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {rows.data && rows.data.total > 25 && (
            <p className="mt-2 text-xs text-muted-foreground">Showing 25 of {rows.data.total}.</p>
          )}
        </CardContent>
      </Card>

      {job.invalidRows > 0 && (
        <p className="text-sm text-muted-foreground">
          Rows with problems will not be imported, and nothing else is affected.{' '}
          <a href={errorReportUrl(businessId, jobId)} className="underline">
            Download the error report
          </a>{' '}
          to fix and re-upload them.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBackToMapping} disabled={pending}>
          Change mapping
        </Button>
        <Button className="flex-1" onClick={onConfirm} disabled={pending || job.validRows === 0}>
          {pending ? 'Importing…' : `Import ${job.validRows} customers`}
        </Button>
      </div>
    </div>
  );
}

function ResultsStep({
  job,
  businessId,
  jobId,
}: {
  job: ImportJobSummary;
  businessId: string | undefined;
  jobId: string;
}) {
  const failed = job.status === 'FAILED';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {failed
            ? 'Import failed'
            : job.status === 'CANCELLED'
              ? 'Import cancelled'
              : 'Import complete 🎉'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {failed && job.error && <p className="text-sm text-destructive">{job.error}</p>}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Imported" value={job.importedRows} tone="good" />
          <Stat label="Skipped duplicates" value={job.skippedRows} tone="warn" />
          <Stat label="Problems" value={job.invalidRows} tone="bad" />
        </div>
        {job.invalidRows + job.skippedRows > 0 && (
          <a
            href={errorReportUrl(businessId, jobId)}
            className="text-sm text-primary underline underline-offset-4"
          >
            Download report of rows that were not imported
          </a>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" render={<Link href="/customers" />}>
            View customers
          </Button>
          <Button variant="outline" render={<Link href="/imports" />}>
            Import another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const color =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : tone === 'bad'
          ? 'text-destructive'
          : '';
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className={`text-lg font-semibold ${value > 0 ? color : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

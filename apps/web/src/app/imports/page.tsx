'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGate } from '@/components/auth-gate';
import { useActiveBusiness } from '@/hooks/use-customers';
import { useImportJobs, useUploadImport } from '@/hooks/use-imports';

export default function ImportsPage() {
  return (
    <AuthGate>
      <Imports />
    </AuthGate>
  );
}

function Imports() {
  const router = useRouter();
  const { business } = useActiveBusiness();
  const jobs = useImportJobs(business?.id);
  const upload = useUploadImport(business?.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const startUpload = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(file, { onSuccess: (job) => router.push(`/imports/${job.id}`) });
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Import customers</h1>
        <p className="text-sm text-muted-foreground">
          Bring in your existing records from a CSV or Excel file.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          startUpload(e.dataTransfer.files[0]);
        }}
        className={`mb-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <p className="text-3xl" aria-hidden>
          📄
        </p>
        <p className="text-sm text-muted-foreground">
          Drop your .csv or .xlsx file here, or choose one.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          onChange={(e) => startUpload(e.target.files?.[0])}
        />
        <Button disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
          {upload.isPending ? 'Uploading…' : 'Choose file'}
        </Button>
        {upload.isError && (
          <p role="alert" className="text-sm text-destructive">
            {upload.error.body.message}
          </p>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Import history</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
          {jobs.data && jobs.data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          )}
          <ul className="flex flex-col gap-2">
            {jobs.data?.items.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/imports/${job.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()} · {job.totalRows} rows
                      {job.status === 'COMPLETED' ? ` · ${job.importedRows} imported` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {job.status.replace('_', ' ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

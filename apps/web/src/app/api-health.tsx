'use client';

import { useEffect, useState } from 'react';
import type { HealthReport } from '@dailylist/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type FetchState =
  { state: 'loading' } | { state: 'error' } | { state: 'ready'; report: HealthReport };

function Dot({ up }: { up: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  );
}

export function ApiHealth() {
  const [status, setStatus] = useState<FetchState>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as HealthReport;
      })
      .then((report) => {
        if (!cancelled) setStatus({ state: 'ready', report });
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status.state === 'loading') {
    return <p className="text-sm text-gray-400">Checking…</p>;
  }

  if (status.state === 'error') {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <Dot up={false} /> API unreachable at {API_URL}
      </p>
    );
  }

  const { report } = status;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      <li className="flex items-center gap-2">
        <Dot up={report.status === 'ok'} /> API — {report.status}
      </li>
      <li className="flex items-center gap-2">
        <Dot up={report.dependencies.database.status === 'up'} /> Database —{' '}
        {report.dependencies.database.status}
      </li>
      <li className="flex items-center gap-2">
        <Dot up={report.dependencies.redis.status === 'up'} /> Redis —{' '}
        {report.dependencies.redis.status}
      </li>
    </ul>
  );
}

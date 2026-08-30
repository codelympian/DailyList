import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getGreeting } from '@/lib/greeting';
import { ApiHealth } from './api-health';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-medium text-emerald-600">{getGreeting()}</span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Dailylist</h1>
        <p className="max-w-sm text-balance text-lg text-gray-500">
          Your daily sales assistant. Know who to contact today, why, and what to say.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
        <Button className="flex-1" render={<Link href="/register" />}>
          Get started
        </Button>
        <Button variant="outline" className="flex-1" render={<Link href="/login" />}>
          Log in
        </Button>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          System status
        </h2>
        <ApiHealth />
      </div>

      <p className="text-xs text-gray-400">Phase 0 — project foundation</p>
    </main>
  );
}

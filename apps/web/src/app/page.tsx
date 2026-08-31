import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SAMPLE = [
  { emoji: '🔥', name: 'Ada Okafor', why: 'Asked about Glow Serum 4 days ago' },
  { emoji: '💳', name: 'Bola Ade', why: 'Owes ₦20,000' },
  { emoji: '💰', name: 'Ngozi Eze', why: 'Normally buys every 30 days' },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-14">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-honey-ink">Your daily sales assistant</p>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">Know who to call today.</h1>
        <p className="text-balance text-lg leading-snug text-muted-foreground">
          Dailylist reads your sales and tells you who to follow up with each morning — and what to
          say.
        </p>
      </div>

      {/* The product itself, not a screenshot of it. */}
      <ul className="flex flex-col gap-2" aria-label="Example daily list">
        {SAMPLE.map((item) => (
          <li key={item.name} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span aria-hidden className="text-lg">
              {item.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.why}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Button className="min-h-12 w-full text-base" render={<Link href="/register" />}>
          Get started
        </Button>
        <Button variant="ghost" className="min-h-11 w-full" render={<Link href="/login" />}>
          I already have an account
        </Button>
      </div>
    </main>
  );
}

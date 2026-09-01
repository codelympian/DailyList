import { Flame, MessageCircle, Wallet } from 'lucide-react';

/**
 * A faithful, static rendering of the real daily list for the marketing page.
 *
 * It mirrors the actual product's layout and wording rather than a stock
 * mockup, so what people see here is what they get after signing up. The
 * data is illustrative and labelled as an example.
 */
export function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Example of the Dailylist daily sales list showing two customers to contact"
      className="w-full max-w-sm rounded-3xl bg-card p-4 shadow-e3 ring-1 ring-border/60"
    >
      <div className="mb-4">
        <p className="text-sm font-semibold tracking-tight">Good morning, Ada</p>
        <p className="text-xs text-muted-foreground">Here is who needs your attention today.</p>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-mono text-lg font-semibold text-foreground">4</span> people left
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">2/6</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 rounded-full bg-honey" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <article className="rounded-2xl bg-background p-3.5 ring-1 ring-border/50">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-900 dark:bg-orange-950/50 dark:text-orange-200">
              <Flame className="size-3" aria-hidden />
              Hot lead
            </span>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
              75
            </span>
          </div>
          <p className="mt-1.5 text-base font-semibold tracking-tight">Ngozi Eze</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Why today
          </p>
          <p className="text-xs leading-snug">Asked about Glow Serum 3 days ago</p>
          <div className="mt-2.5 rounded-lg border-l-2 border-honey/50 bg-secondary/60 py-2 pl-2.5 pr-2">
            <p className="text-xs leading-snug">
              Hi Ngozi, you asked about the Glow Serum. Would you like me to reserve one for you?
            </p>
          </div>
          <div className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-whatsapp text-xs font-semibold text-white">
            <MessageCircle className="size-3.5" aria-hidden />
            Send on WhatsApp
          </div>
        </article>

        <article className="rounded-2xl bg-background p-3.5 opacity-70 ring-1 ring-border/50">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-900 dark:bg-red-950/50 dark:text-red-200">
              <Wallet className="size-3" aria-hidden />
              Unpaid
            </span>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
              72
            </span>
          </div>
          <p className="mt-1.5 text-base font-semibold tracking-tight">Bola Ade</p>
          <p className="mt-1 text-xs text-muted-foreground">Owes ₦20,000</p>
        </article>
      </div>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">Example list</p>
    </div>
  );
}

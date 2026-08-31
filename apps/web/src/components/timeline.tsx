'use client';

import type { TimelineEvent } from '@dailylist/types';

const TYPE_ICONS: Record<string, string> = {
  CUSTOMER_CREATED: '✨',
  CUSTOMER_UPDATED: '✏️',
  LEAD_CREATED: '🔥',
  LEAD_STATUS_CHANGED: '📈',
  PURCHASE: '🛍️',
  PAYMENT: '💰',
  DEBT_CREATED: '💳',
  DEBT_PAYMENT: '💳',
  FOLLOW_UP: '📞',
  FOLLOW_UP_COMPLETED: '✅',
  FOLLOW_UP_SKIPPED: '⏭️',
  MESSAGE_SENT: '💬',
  MESSAGE_RECEIVED: '💬',
  CUSTOMER_REACTIVATED: '🎉',
  CUSTOMER_LOST: '😴',
};

/** Reusable chronological event list (newest first). */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
          {index < events.length - 1 && (
            <span aria-hidden className="absolute top-6 left-[11px] h-full w-px bg-border" />
          )}
          <span aria-hidden className="z-10 text-base leading-6">
            {TYPE_ICONS[event.type] ?? '•'}
          </span>
          <div className="min-w-0">
            <p className="text-sm">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(event.occurredAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

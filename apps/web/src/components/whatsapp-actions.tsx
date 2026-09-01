'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecordMessage, useWhatsAppLink } from '@/hooks/use-whatsapp';

/**
 * Send on WhatsApp + Copy.
 *
 * Send is the dominant control on the card — it is the action the whole
 * product exists to produce. Tapping it opens WhatsApp with the message
 * prefilled and records that contact was initiated. Dailylist cannot see
 * whether the message was sent, delivered or read, and never implies it can.
 */
export function WhatsAppActions({
  businessId,
  customerId,
  recommendationId,
  message,
  onSent,
}: {
  businessId: string | undefined;
  customerId: string;
  recommendationId?: string;
  message?: string | null;
  onSent?: () => void;
}) {
  const link = useWhatsAppLink(businessId, customerId, recommendationId);
  const record = useRecordMessage(businessId);
  const [copied, setCopied] = useState(false);

  const body = message ?? link.data?.body ?? '';
  const canSend = link.data?.ok === true && !!link.data.url;

  const handleSend = () => {
    if (!canSend) return;
    // Open first so the tap is not swallowed by the popup blocker, then record.
    window.open(link.data!.url!, '_blank', 'noopener,noreferrer');
    record.mutate(
      { customerId, recommendationId, action: 'WHATSAPP_OPENED', body },
      { onSuccess: () => onSent?.() },
    );
  };

  const handleCopy = () => {
    void navigator.clipboard
      .writeText(body)
      .then(() => {
        setCopied(true);
        record.mutate({ customerId, recommendationId, action: 'COPIED', body });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setCopied(false));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Button
          size="lg"
          className="min-h-12 flex-1 bg-whatsapp text-base font-semibold text-white shadow-e1 transition-transform hover:bg-whatsapp/90 active:scale-[0.99] motion-reduce:transition-none"
          disabled={!canSend || link.isPending}
          onClick={handleSend}
        >
          <MessageCircle className="size-5" aria-hidden />
          {link.isPending ? 'Preparing…' : 'Send on WhatsApp'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="min-h-12 px-3"
          disabled={!body}
          onClick={handleCopy}
          aria-label={copied ? 'Message copied' : 'Copy message'}
        >
          {copied ? (
            <Check className="size-4 text-whatsapp-ink" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </Button>
      </div>

      {link.data && !link.data.ok && (
        <p className="text-xs text-destructive">
          {link.data.error} — add a phone number to message this customer.
        </p>
      )}
      {link.data?.ok && link.data.phone && (
        <p className="text-xs text-muted-foreground">
          Opens WhatsApp to {link.data.phone}. You send it yourself.
        </p>
      )}
    </div>
  );
}

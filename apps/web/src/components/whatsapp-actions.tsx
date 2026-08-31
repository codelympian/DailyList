'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRecordMessage, useWhatsAppLink } from '@/hooks/use-whatsapp';

/**
 * Send on WhatsApp + Copy.
 *
 * Tapping Send opens WhatsApp with the message pre-filled and records that
 * the owner initiated contact. Dailylist cannot see whether the message was
 * actually sent, delivered or read, so nothing here claims otherwise.
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
  /** Message shown on the card; the link falls back to the server's copy. */
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
    // Open first so the tap is not blocked by the popup blocker, then record.
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
          className="flex-1 bg-[#25D366] text-white hover:bg-[#1faa52]"
          disabled={!canSend || link.isPending}
          onClick={handleSend}
        >
          {link.isPending ? 'Preparing…' : 'Send on WhatsApp'}
        </Button>
        <Button variant="outline" disabled={!body} onClick={handleCopy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
      </div>

      {link.data && !link.data.ok && (
        <p className="text-xs text-destructive">
          {link.data.error} — add a phone number to message this customer.
        </p>
      )}
      {link.data?.ok && link.data.phone && (
        <p className="text-xs text-muted-foreground">
          Opens WhatsApp to {link.data.phone}. You still send it yourself.
        </p>
      )}
    </div>
  );
}

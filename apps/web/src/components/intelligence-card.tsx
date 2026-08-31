'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentBadge } from '@/components/segment-badges';
import { useCustomerIntelligence, useSetCommunicationPreference } from '@/hooks/use-intelligence';

/**
 * Shows what Dailylist thinks about this customer today, and why.
 * Every line comes from measured data — never generated prose.
 */
export function IntelligenceCard({
  businessId,
  customerId,
}: {
  businessId: string | undefined;
  customerId: string;
}) {
  const intelligence = useCustomerIntelligence(businessId, customerId);
  const setPreference = useSetCommunicationPreference(businessId, customerId);

  if (intelligence.isPending) {
    return (
      <Card className="mb-4">
        <CardContent className="py-6 text-sm text-muted-foreground">Analyzing…</CardContent>
      </Card>
    );
  }
  if (intelligence.isError) return null;

  const data = intelligence.data;
  const optedOut = data.suppressionCodes.includes('OPTED_OUT');

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Why contact them</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing to follow up on yet. Record a sale or add a lead to get suggestions.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {data.segments.map((segment) => (
                <SegmentBadge key={segment.segment} segment={segment.segment} />
              ))}
            </div>
            <ul className="flex flex-col gap-1.5">
              {data.segments.map((segment) => (
                <li key={segment.segment} className="text-sm">
                  {segment.reasons.map((reason, index) => (
                    <p key={index} className="text-muted-foreground">
                      • {reason}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </>
        )}

        {!data.eligible && data.suppressionReasons.length > 0 && (
          <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
            <p className="font-medium">Not on today&apos;s list:</p>
            {data.suppressionReasons.map((reason) => (
              <p key={reason}>• {reason}</p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            {optedOut ? 'Opted out of WhatsApp messages' : 'Receiving WhatsApp follow-ups'}
          </p>
          <Button
            variant="outline"
            size="xs"
            disabled={setPreference.isPending}
            onClick={() => setPreference.mutate(optedOut)}
          >
            {optedOut ? 'Opt back in' : 'Opt out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

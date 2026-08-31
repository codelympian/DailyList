'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

export interface WhatsAppLink {
  ok: boolean;
  url: string | null;
  phone: string | null;
  body: string;
  error: string | null;
}

export type MessageAction = 'WHATSAPP_OPENED' | 'COPIED';

export interface RecordedMessage {
  id: string;
  action: MessageAction;
  createdAt: string;
}

export function useWhatsAppLink(
  businessId: string | undefined,
  customerId: string,
  recommendationId?: string,
) {
  const params = recommendationId ? `?recommendationId=${recommendationId}` : '';
  return useQuery<WhatsAppLink, ApiError>({
    queryKey: ['whatsapp', businessId, customerId, recommendationId ?? 'none'],
    queryFn: () => api(`/businesses/${businessId}/customers/${customerId}/whatsapp-link${params}`),
    enabled: !!businessId && !!customerId,
  });
}

/**
 * Records that the owner opened WhatsApp or copied the text. This is the
 * only thing the app can observe — never delivery or read status.
 */
export function useRecordMessage(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    RecordedMessage,
    ApiError,
    { customerId: string; recommendationId?: string; action: MessageAction; body: string }
  >({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/messages`, { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['intelligence', businessId] });
    },
  });
}

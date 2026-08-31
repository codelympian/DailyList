'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BusinessSettingsResponse,
  CustomerIntelligenceView,
  SegmentCounts,
} from '@dailylist/types';
import { api, ApiError } from '@/lib/api';

export type { BusinessSettingsResponse, CustomerIntelligenceView, SegmentCounts };

export function useCustomerIntelligence(businessId: string | undefined, customerId: string) {
  return useQuery<CustomerIntelligenceView, ApiError>({
    queryKey: ['intelligence', businessId, customerId],
    queryFn: () => api(`/businesses/${businessId}/customers/${customerId}/intelligence`),
    enabled: !!businessId,
  });
}

export function useSegmentCounts(businessId: string | undefined) {
  return useQuery<SegmentCounts, ApiError>({
    queryKey: ['intelligence', businessId, 'counts'],
    queryFn: () => api(`/businesses/${businessId}/intelligence/segments`),
    enabled: !!businessId,
  });
}

export function useBusinessSettings(businessId: string | undefined) {
  return useQuery<BusinessSettingsResponse, ApiError>({
    queryKey: ['settings', businessId],
    queryFn: () => api(`/businesses/${businessId}/settings`),
    enabled: !!businessId,
  });
}

export function useUpdateSettings(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<BusinessSettingsResponse, ApiError, Partial<BusinessSettingsResponse>>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/settings`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['intelligence', businessId] });
    },
  });
}

export function useSetCommunicationPreference(businessId: string | undefined, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ channel: string; optedIn: boolean }, ApiError, boolean>({
    mutationFn: (optedIn) =>
      api(`/businesses/${businessId}/customers/${customerId}/communication-preference`, {
        method: 'POST',
        body: { channel: 'WHATSAPP', optedIn },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['intelligence', businessId] }),
  });
}

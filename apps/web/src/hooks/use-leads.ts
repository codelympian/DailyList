'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeadStatus, LeadSummary, Paginated } from '@dailylist/types';
import type { CreateLeadInput, UpdateLeadStatusInput } from '@dailylist/validation';
import { api, ApiError } from '@/lib/api';

export function useLeads(
  businessId: string | undefined,
  query: { customerId?: string; status?: LeadStatus | ''; page: number },
) {
  const params = new URLSearchParams();
  if (query.customerId) params.set('customerId', query.customerId);
  if (query.status) params.set('status', query.status);
  params.set('page', String(query.page));
  params.set('pageSize', '20');

  return useQuery<Paginated<LeadSummary>, ApiError>({
    queryKey: ['leads', businessId, query.customerId ?? 'all', query.status ?? 'any', query.page],
    queryFn: () => api(`/businesses/${businessId}/leads?${params.toString()}`),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useCreateLead(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<LeadSummary, ApiError, CreateLeadInput>({
    mutationFn: (input) => api(`/businesses/${businessId}/leads`, { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    },
  });
}

export function useSetLeadStatus(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<LeadSummary, ApiError, { leadId: string } & UpdateLeadStatusInput>({
    mutationFn: ({ leadId, status }) =>
      api(`/businesses/${businessId}/leads/${leadId}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    },
  });
}

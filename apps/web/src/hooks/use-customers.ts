'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { CustomerDetail, CustomerSummary, Paginated, TimelineEvent } from '@dailylist/types';
import type { CreateCustomerInput, UpdateCustomerInput } from '@dailylist/validation';
import { api, ApiError } from '@/lib/api';
import { useMe } from './use-auth';

/** The user's active business (first membership; multi-business UI is future work). */
export function useActiveBusiness() {
  const me = useMe();
  return { ...me, business: me.data?.businesses[0] };
}

export function useCustomers(
  businessId: string | undefined,
  query: { search: string; page: number },
) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('page', String(query.page));
  params.set('pageSize', '20');

  return useQuery<Paginated<CustomerSummary>, ApiError>({
    queryKey: ['customers', businessId, query.search, query.page],
    queryFn: () => api(`/businesses/${businessId}/customers?${params.toString()}`),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(businessId: string | undefined, customerId: string) {
  return useQuery<CustomerDetail, ApiError>({
    queryKey: ['customers', businessId, customerId],
    queryFn: () => api(`/businesses/${businessId}/customers/${customerId}`),
    enabled: !!businessId,
  });
}

export function useCustomerTimeline(businessId: string | undefined, customerId: string) {
  return useQuery<Paginated<TimelineEvent>, ApiError>({
    queryKey: ['customers', businessId, customerId, 'timeline'],
    queryFn: () => api(`/businesses/${businessId}/customers/${customerId}/timeline?pageSize=50`),
    enabled: !!businessId,
  });
}

export function useCreateCustomer(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<CustomerDetail, ApiError, CreateCustomerInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/customers`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', businessId] }),
  });
}

export function useUpdateCustomer(businessId: string | undefined, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation<CustomerDetail, ApiError, UpdateCustomerInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/customers/${customerId}`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', businessId] }),
  });
}

export function useDeleteCustomer(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, ApiError, string>({
    mutationFn: (customerId) =>
      api(`/businesses/${businessId}/customers/${customerId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', businessId] }),
  });
}

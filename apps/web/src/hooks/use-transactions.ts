'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, TransactionDetail, TransactionSummary } from '@dailylist/types';
import type {
  CreateTransactionInput,
  RecordPaymentInput,
  UpdateTransactionStatusInput,
} from '@dailylist/validation';
import { api, ApiError } from '@/lib/api';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId?: string) {
  void queryClient.invalidateQueries({ queryKey: ['transactions', businessId] });
  void queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
}

export function useTransactions(
  businessId: string | undefined,
  query: { customerId?: string; page: number },
) {
  const params = new URLSearchParams();
  if (query.customerId) params.set('customerId', query.customerId);
  params.set('page', String(query.page));
  params.set('pageSize', '20');

  return useQuery<Paginated<TransactionSummary>, ApiError>({
    queryKey: ['transactions', businessId, query.customerId ?? 'all', query.page],
    queryFn: () => api(`/businesses/${businessId}/transactions?${params.toString()}`),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(businessId: string | undefined, transactionId: string) {
  return useQuery<TransactionDetail, ApiError>({
    queryKey: ['transactions', businessId, transactionId],
    queryFn: () => api(`/businesses/${businessId}/transactions/${transactionId}`),
    enabled: !!businessId,
  });
}

export function useCreateTransaction(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<TransactionDetail, ApiError, CreateTransactionInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/transactions`, { method: 'POST', body: input }),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}

export function useRecordPayment(businessId: string | undefined, transactionId: string) {
  const queryClient = useQueryClient();
  return useMutation<TransactionDetail, ApiError, RecordPaymentInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/transactions/${transactionId}/payments`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}

export function useSetTransactionStatus(businessId: string | undefined, transactionId: string) {
  const queryClient = useQueryClient();
  return useMutation<TransactionDetail, ApiError, UpdateTransactionStatusInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/transactions/${transactionId}/status`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => invalidateAll(queryClient, businessId),
  });
}

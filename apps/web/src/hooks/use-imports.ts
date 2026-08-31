'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ImportJobSummary,
  ImportRowStatus,
  ImportRowSummary,
  Paginated,
} from '@dailylist/types';
import { api, ApiError, API_URL } from '@/lib/api';

export function useImportJobs(businessId: string | undefined) {
  return useQuery<Paginated<ImportJobSummary>, ApiError>({
    queryKey: ['imports', businessId],
    queryFn: () => api(`/businesses/${businessId}/imports?pageSize=20`),
    enabled: !!businessId,
  });
}

export function useImportJob(businessId: string | undefined, jobId: string) {
  return useQuery<ImportJobSummary, ApiError>({
    queryKey: ['imports', businessId, jobId],
    queryFn: () => api(`/businesses/${businessId}/imports/${jobId}`),
    enabled: !!businessId,
    // Large imports run in the worker; poll while they are in flight.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'VALIDATING' || status === 'IMPORTING' ? 1500 : false;
    },
  });
}

export function useImportRows(
  businessId: string | undefined,
  jobId: string,
  status: ImportRowStatus | undefined,
  enabled = true,
) {
  const params = new URLSearchParams({ pageSize: '50' });
  if (status) params.set('status', status);
  return useQuery<Paginated<ImportRowSummary>, ApiError>({
    queryKey: ['imports', businessId, jobId, 'rows', status ?? 'all'],
    queryFn: () => api(`/businesses/${businessId}/imports/${jobId}/rows?${params.toString()}`),
    enabled: !!businessId && enabled,
  });
}

/** Uploads via FormData — the shared api() helper is JSON-only. */
export function useUploadImport(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<ImportJobSummary, ApiError, File>({
    mutationFn: async (file) => {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${API_URL}/businesses/${businessId}/imports`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ statusCode: response.status, message: response.statusText }));
        throw new ApiError(response.status, errorBody);
      }
      return (await response.json()) as ImportJobSummary;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports', businessId] }),
  });
}

export function useSetImportMapping(businessId: string | undefined, jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<ImportJobSummary, ApiError, Record<string, string>>({
    mutationFn: (mapping) =>
      api(`/businesses/${businessId}/imports/${jobId}/mapping`, {
        method: 'POST',
        body: { mapping },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports', businessId] }),
  });
}

export function useConfirmImport(businessId: string | undefined, jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<ImportJobSummary, ApiError, void>({
    mutationFn: () =>
      api(`/businesses/${businessId}/imports/${jobId}/confirm`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    },
  });
}

export function errorReportUrl(businessId: string | undefined, jobId: string): string {
  return `${API_URL}/businesses/${businessId}/imports/${jobId}/error-report`;
}

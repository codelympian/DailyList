'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, BusinessSummary, MeResponse } from '@dailylist/types';
import type { CreateBusinessInput, LoginInput, RegisterInput } from '@dailylist/validation';
import { api, ApiError } from '@/lib/api';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export function useMe() {
  return useQuery<MeResponse, ApiError>({
    queryKey: ME_QUERY_KEY,
    queryFn: () => api<MeResponse>('/auth/me'),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 401 ? false : failureCount < 1,
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<AuthResponse, ApiError, RegisterInput>({
    mutationFn: (input) => api<AuthResponse>('/auth/register', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<AuthResponse, ApiError, LoginInput>({
    mutationFn: (input) => api<AuthResponse>('/auth/login', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, ApiError, void>({
    mutationFn: () => api<{ ok: true }>('/auth/logout', { method: 'POST', body: {} }),
    onSuccess: () => queryClient.removeQueries({ queryKey: ME_QUERY_KEY }),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation<BusinessSummary, ApiError, CreateBusinessInput>({
    mutationFn: (input) => api<BusinessSummary>('/businesses', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });
}

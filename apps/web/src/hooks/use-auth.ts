'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BusinessSummary, MeResponse } from '@dailylist/types';
import type { CreateBusinessInput, LoginInput, RegisterInput } from '@dailylist/validation';
import { api, ApiError } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Credentials go straight to Supabase; the API is only asked who the caller
 * is once they hold a token. Supabase errors are translated into ApiError so
 * the screens keep their existing error handling.
 */
function toApiError(message: string, status = 400): ApiError {
  return new ApiError(status, { statusCode: status, message });
}

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
  return useMutation<{ needsConfirmation: boolean }, ApiError, RegisterInput>({
    mutationFn: async (input) => {
      const { data, error } = await getSupabase().auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { name: input.name } },
      });
      if (error) {
        // Supabase reports an existing account as "User already registered".
        const status = /already registered/i.test(error.message) ? 409 : (error.status ?? 400);
        throw toApiError(error.message, status);
      }
      // With email confirmation on, there is no session until they confirm.
      return { needsConfirmation: !data.session };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, LoginInput>({
    mutationFn: async (input) => {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) throw toApiError(error.message, error.status ?? 401);
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/** Sends the user to Google and back to /dashboard. */
export function useGoogleSignIn() {
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw toApiError(error.message, error.status ?? 400);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw toApiError(error.message, error.status ?? 400);
    },
    onSuccess: () => queryClient.clear(),
  });
}

/** Emails a reset link — available now that Supabase owns credentials. */
export function useRequestPasswordReset() {
  return useMutation<void, ApiError, { email: string }>({
    mutationFn: async ({ email }) => {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw toApiError(error.message, error.status ?? 400);
    },
  });
}

export function useUpdatePassword() {
  return useMutation<void, ApiError, { password: string }>({
    mutationFn: async ({ password }) => {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw toApiError(error.message, error.status ?? 400);
    },
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation<BusinessSummary, ApiError, CreateBusinessInput>({
    mutationFn: (input) => api<BusinessSummary>('/businesses', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  });
}

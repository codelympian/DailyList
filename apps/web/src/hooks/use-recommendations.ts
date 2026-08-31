'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@dailylist/types';
import { api, ApiError } from '@/lib/api';

export type RecommendationCategory = 'HOT_LEAD' | 'REORDER_DUE' | 'DEBTOR' | 'LOST_CUSTOMER';
export type RecommendationStatus =
  'PENDING' | 'CONTACTED' | 'COMPLETED' | 'SKIPPED' | 'DISMISSED' | 'CONVERTED';

export interface RecommendationView {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  recommendationDate: string;
  category: RecommendationCategory;
  score: number;
  segments: string[];
  reasonCodes: string[];
  reasonText: string[];
  suggestedMessage: string | null;
  status: RecommendationStatus;
  completedAt: string | null;
}

export interface DailyListSummary {
  date: string;
  total: number;
  pending: number;
  done: number;
  byCategory: Record<RecommendationCategory, number>;
  generatedAt: string | null;
}

export function useTodayList(businessId: string | undefined, category?: RecommendationCategory) {
  const params = new URLSearchParams({ pageSize: '100' });
  if (category) params.set('category', category);
  return useQuery<Paginated<RecommendationView>, ApiError>({
    queryKey: ['recommendations', businessId, category ?? 'all'],
    queryFn: () => api(`/businesses/${businessId}/recommendations?${params.toString()}`),
    enabled: !!businessId,
  });
}

export function useDailySummary(businessId: string | undefined) {
  return useQuery<DailyListSummary, ApiError>({
    queryKey: ['recommendations', businessId, 'summary'],
    queryFn: () => api(`/businesses/${businessId}/recommendations/summary`),
    enabled: !!businessId,
  });
}

export function useRegenerate(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<DailyListSummary, ApiError, void>({
    mutationFn: () =>
      api(`/businesses/${businessId}/recommendations/generate`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations', businessId] }),
  });
}

export function useSetRecommendationStatus(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    RecommendationView,
    ApiError,
    { id: string; status: Exclude<RecommendationStatus, 'PENDING'> }
  >({
    mutationFn: ({ id, status }) =>
      api(`/businesses/${businessId}/recommendations/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', businessId] });
    },
  });
}

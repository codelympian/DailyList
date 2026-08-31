'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, ProductSummary } from '@dailylist/types';
import type { CreateProductInput, UpdateProductInput } from '@dailylist/validation';
import { api, ApiError } from '@/lib/api';

export function useProducts(
  businessId: string | undefined,
  query: { search: string; page: number },
) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('page', String(query.page));
  params.set('pageSize', '20');

  return useQuery<Paginated<ProductSummary>, ApiError>({
    queryKey: ['products', businessId, query.search, query.page],
    queryFn: () => api(`/businesses/${businessId}/products?${params.toString()}`),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(businessId: string | undefined, productId: string) {
  return useQuery<ProductSummary, ApiError>({
    queryKey: ['products', businessId, productId],
    queryFn: () => api(`/businesses/${businessId}/products/${productId}`),
    enabled: !!businessId,
  });
}

export function useCreateProduct(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<ProductSummary, ApiError, CreateProductInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/products`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', businessId] }),
  });
}

export function useUpdateProduct(businessId: string | undefined, productId: string) {
  const queryClient = useQueryClient();
  return useMutation<ProductSummary, ApiError, UpdateProductInput>({
    mutationFn: (input) =>
      api(`/businesses/${businessId}/products/${productId}`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', businessId] }),
  });
}

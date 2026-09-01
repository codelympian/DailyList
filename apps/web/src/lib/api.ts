import type { ApiErrorBody } from '@dailylist/types';
import { getAccessToken } from '@/lib/supabase';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper for the Dailylist API.
 *
 * Attaches the Supabase access token as a bearer credential. The client
 * refreshes that token automatically, so reading it per request means a long
 * session keeps working without the caller thinking about expiry.
 */
export async function api<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let body: ApiErrorBody;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = { statusCode: response.status, message: response.statusText };
    }
    throw new ApiError(response.status, body);
  }
  return (await response.json()) as T;
}

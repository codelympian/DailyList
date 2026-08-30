import type { ApiErrorBody } from '@dailylist/types';

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
 * Fetch wrapper for the Dailylist API. Always sends credentials so the
 * httpOnly session cookie flows; throws ApiError with the parsed body.
 */
export async function api<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
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

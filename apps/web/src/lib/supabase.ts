'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser's Supabase client.
 *
 * Sessions are stored in cookies (not localStorage) so the access token is
 * also readable by server components and forwarded to our API. Credentials
 * go straight from the browser to Supabase and never touch the Dailylist API.
 */
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}

/** The current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

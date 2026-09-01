import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

/**
 * Configuration lives in the repo-root .env so the API, worker and web app
 * share one file. Next.js only looks for .env beside the app, so load the
 * root one here — before the config is evaluated, and therefore before
 * NEXT_PUBLIC_* values are inlined into the client bundle at build time.
 */
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
};

export default nextConfig;

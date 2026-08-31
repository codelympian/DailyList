import * as path from 'node:path';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // --- Optional AI message generation (Phase 8) ---
  // The product works fully with this off; templates are always the fallback.
  AI_MESSAGES_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MESSAGE_MODEL: z.string().default('claude-opus-5'),
  AI_MESSAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * Walks upward from `startDir` looking for a `.env` file so every
 * workspace (apps/api, apps/worker, ...) shares the repo-root .env.
 */
export function findEnvFile(startDir: string = process.cwd()): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * Loads the nearest .env (without overriding real environment variables)
 * and returns a validated, typed environment object.
 * Throws with a readable message when required variables are missing.
 */
export function loadEnv(startDir?: string): AppEnv {
  const envFile = findEnvFile(startDir);
  if (envFile) {
    dotenv.config({ path: envFile, override: false });
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

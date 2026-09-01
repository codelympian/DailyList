import { createClient } from '@supabase/supabase-js';

/**
 * Test user management against the real Supabase project.
 *
 * Email confirmation is intentionally left ON — it is the right product
 * behaviour and signing up through the UI correctly shows a "check your
 * email" screen. So tests provision a pre-confirmed user through the admin
 * API and then log in through the real login form, which exercises the
 * genuine sign-in path without needing a mailbox.
 *
 * Every user created here is deleted afterwards; the users.id → auth.users.id
 * cascade removes their business and all its data with them.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

function admin() {
  if (!url || !secret) {
    throw new Error(
      'E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. ' +
        'They are read from the repo .env by playwright.config.ts.',
    );
  }
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

const created: string[] = [];

export async function createConfirmedUser(name = 'E2E Owner'): Promise<TestUser> {
  const email = `e2e.${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'sup3rsecret!';

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    throw new Error(`Could not create the test user: ${error?.message ?? 'unknown error'}`);
  }

  created.push(data.user.id);
  return { id: data.user.id, email, password, name };
}

/** Removes every user this run created, cascading to their business data. */
export async function cleanupUsers(): Promise<void> {
  const client = admin();
  await Promise.all(
    created.splice(0).map((id) => client.auth.admin.deleteUser(id).catch(() => undefined)),
  );
}

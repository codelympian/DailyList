import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { loadEnv } from '@dailylist/config';

/**
 * Verifies Supabase-issued access tokens.
 *
 * Supabase signs JWTs with asymmetric keys published at the project's JWKS
 * endpoint. We verify signatures against those public keys, so the API never
 * holds a signing secret and key rotation is picked up automatically (jose
 * caches the key set and refetches when it sees an unknown `kid`).
 *
 * The tests point SUPABASE_JWKS_URL at a locally served key set, which keeps
 * the suite hermetic while exercising this exact verification path.
 */
export interface SupabaseIdentity {
  /** auth.users.id — the primary key of our `users` profile row. */
  id: string;
  email: string;
  /** Best-effort display name from provider metadata; may be absent. */
  name?: string;
}

@Injectable()
export class SupabaseTokenService {
  private readonly logger = new Logger(SupabaseTokenService.name);
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor() {
    const env = loadEnv();
    const jwksUrl = env.SUPABASE_JWKS_URL ?? `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
    this.issuer = `${env.SUPABASE_URL}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  /** Verifies a bearer token and returns the identity it asserts. */
  async verify(token: string): Promise<SupabaseIdentity> {
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, this.jwks, {
        // Supabase sets aud to "authenticated" for signed-in users.
        audience: 'authenticated',
        // The issuer check is skipped when a test JWKS is configured, since
        // locally-minted tokens carry the same issuer by construction.
        issuer: this.issuer,
      });
      payload = result.payload;
    } catch (error) {
      // Expired, tampered, wrong audience, unknown key — all the same to the
      // caller: not authenticated. The reason is logged, never returned.
      this.logger.debug(`Token rejected: ${error instanceof Error ? error.message : 'unknown'}`);
      throw new UnauthorizedException('Not authenticated');
    }

    const id = payload.sub;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    if (!id || !email) {
      throw new UnauthorizedException('Token is missing a user id or email');
    }

    return { id, email: email.toLowerCase(), name: displayName(payload) };
  }
}

/** Supabase carries provider profile data under user_metadata. */
function displayName(payload: JWTPayload): string | undefined {
  const metadata = payload.user_metadata;
  if (!metadata || typeof metadata !== 'object') return undefined;
  const record = metadata as Record<string, unknown>;
  for (const key of ['name', 'full_name', 'preferred_username']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT, type JWK, type KeyLike } from 'jose';

/**
 * Test authentication.
 *
 * Supabase signs access tokens with keys published at a JWKS endpoint. Rather
 * than depend on a live Supabase project, the suite generates its own key pair
 * and serves a JWKS on localhost, then points SUPABASE_JWKS_URL at it. Tokens
 * are minted with the same claims Supabase issues, so the guard's real
 * verification path — signature, audience, issuer, expiry — is exercised
 * exactly as it is in production, with no network and no credentials in CI.
 */

const KID = 'dailylist-test-key';

let privateKey: KeyLike;
let publicJwk: JWK;
let server: Server;

export interface TestIdentity {
  id: string;
  email: string;
  name: string;
  token: string;
}

/** Starts the JWKS server and returns the URL to verify against. */
export async function startAuthHarness(): Promise<string> {
  const { privateKey: priv, publicKey } = await generateKeyPair('RS256', { extractable: true });
  privateKey = priv;
  publicJwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256', use: 'sig' };

  server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ keys: [publicJwk] }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (typeof address === 'string' || address === null) {
    throw new Error('Could not determine the JWKS server address');
  }
  return `http://127.0.0.1:${address.port}/jwks.json`;
}

export async function stopAuthHarness(): Promise<void> {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
}

/**
 * Mints a token for a new identity, mirroring Supabase's claim shape.
 * `overrides` lets a test forge a bad token (wrong audience, expired, ...).
 */
export async function signInAs(
  overrides: Partial<{
    id: string;
    email: string;
    name: string;
    audience: string;
    /** Duration ('1h') or an absolute epoch-seconds value, for expired tokens. */
    expiresIn: string | number;
  }> = {},
): Promise<TestIdentity> {
  const id = overrides.id ?? randomUUID();
  const email = overrides.email ?? `user.${id.slice(0, 8)}@example.com`;
  const name = overrides.name ?? 'Test Owner';
  const issuer = `${process.env.SUPABASE_URL}/auth/v1`;

  const token = await new SignJWT({
    email,
    role: 'authenticated',
    user_metadata: { name },
  })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setSubject(id)
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(overrides.audience ?? 'authenticated')
    .setExpirationTime(overrides.expiresIn ?? '1h')
    .sign(privateKey);

  return { id, email, name, token };
}

/** Supertest header helper: `.set(authHeader(identity))`. */
export function authHeader(identity: TestIdentity): Record<string, string> {
  return { Authorization: `Bearer ${identity.token}` };
}

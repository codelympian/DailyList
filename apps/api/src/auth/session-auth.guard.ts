import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@dailylist/database';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseTokenService, type SupabaseIdentity } from './supabase-token.service';

export interface AuthenticatedRequest extends Request {
  user: User;
  identity: SupabaseIdentity;
}

/**
 * Authenticates a request from a Supabase access token.
 *
 * Identity is Supabase's; the application profile is ours. On the first
 * authenticated request for a new identity we create the `users` row
 * (just-in-time provisioning) so nothing depends on a database trigger in
 * another schema, and signing up through any provider — email, Google, or
 * one added later — lands in the same place.
 *
 * Downstream guards are unchanged: BusinessMemberGuard still resolves
 * membership from `users`, so every tenant rule works exactly as before.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: SupabaseTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const identity = await this.tokens.verify(token);
    request.identity = identity;
    request.user = await this.provision(identity);
    return true;
  }

  /**
   * Returns the profile for this identity, creating it on first sight and
   * keeping email in step when it changes in Supabase.
   */
  private async provision(identity: SupabaseIdentity): Promise<User> {
    const fallbackName = identity.name ?? identity.email.split('@')[0] ?? 'There';
    return this.prisma.user.upsert({
      where: { id: identity.id },
      create: { id: identity.id, email: identity.email, name: fallbackName },
      update: { email: identity.email },
    });
  }
}

/**
 * Reads the access token from the Authorization header, falling back to the
 * cookie Supabase's browser client sets, so server-rendered requests work too.
 */
function bearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const value = header.slice('Bearer '.length).trim();
    if (value) return value;
  }

  const cookies = request.cookies as Record<string, string> | undefined;
  if (!cookies) return null;
  // @supabase/ssr writes sb-<ref>-auth-token, chunked as .0/.1 when large.
  const names = Object.keys(cookies)
    .filter((name) => name.startsWith('sb-') && name.includes('auth-token'))
    .sort();
  if (names.length === 0) return null;

  const raw = names.map((name) => cookies[name] ?? '').join('');
  return parseSupabaseCookie(raw);
}

function parseSupabaseCookie(raw: string): string | null {
  if (!raw) return null;
  let value = raw;
  if (value.startsWith('base64-')) {
    try {
      value = Buffer.from(value.slice('base64-'.length), 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      const token = (parsed as { access_token?: unknown }).access_token;
      return typeof token === 'string' ? token : null;
    }
  } catch {
    // Not JSON — some versions store the bare token.
    return value.includes('.') ? value : null;
  }
  return null;
}

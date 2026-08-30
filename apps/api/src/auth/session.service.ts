import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CookieOptions } from 'express';
import type { Session, User } from '@dailylist/database';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_COOKIE = 'dailylist_session';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // refresh lastUsedAt at most hourly

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_MS,
    };
  }

  /** Creates a session and returns the raw token (stored only as a hash). */
  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return token;
  }

  /** Returns the session + user for a valid, unexpired token; null otherwise. */
  async validateToken(token: string): Promise<(Session & { user: User }) | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session
        .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }
    return session;
  }

  async revokeToken(token: string): Promise<void> {
    await this.prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
}

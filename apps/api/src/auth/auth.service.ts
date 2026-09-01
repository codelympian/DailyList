import { Injectable } from '@nestjs/common';
import type { MeResponse } from '@dailylist/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Account-shaped reads for the signed-in user.
 *
 * Registration, login, logout, password reset and email verification are all
 * Supabase's responsibility now — this service only answers "who is this and
 * what can they see", which is the part that depends on our own data.
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const memberships = await this.prisma.businessMembership.findMany({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      businesses: memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        industry: m.business.industry,
        currency: m.business.currency,
        role: m.role,
      })),
    };
  }

  /** Lets the owner correct the display name we inferred from their provider. */
  async updateName(userId: string, name: string): Promise<MeResponse> {
    await this.prisma.user.update({ where: { id: userId }, data: { name } });
    return this.me(userId);
  }
}

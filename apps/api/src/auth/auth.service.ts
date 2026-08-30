import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { LoginInput, RegisterInput } from '@dailylist/validation';
import type { AuthUser, MeResponse } from '@dailylist/types';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await this.passwords.hash(input.password),
      },
    });
    const token = await this.sessions.createSession(user.id);
    return { user: toAuthUser(user), token };
  }

  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const valid = user
      ? await this.passwords.verify(user.passwordHash, input.password)
      : await this.passwords.verifyDummy(input.password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = await this.sessions.createSession(user.id);
    return { user: toAuthUser(user), token };
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const memberships = await this.prisma.businessMembership.findMany({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      user: toAuthUser(user),
      businesses: memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        industry: m.business.industry,
        currency: m.business.currency,
        role: m.role,
      })),
    };
  }
}

function toAuthUser(user: { id: string; email: string; name: string }): AuthUser {
  return { id: user.id, email: user.email, name: user.name };
}

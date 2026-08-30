import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { BusinessMembership, MembershipRole } from '@dailylist/database';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';

export const REQUIRE_ROLES_KEY = 'dailylist:requireRoles';

/** Restricts a handler (or controller) to the given membership roles. */
export const RequireRoles = (...roles: MembershipRole[]) => SetMetadata(REQUIRE_ROLES_KEY, roles);

export interface BusinessScopedRequest extends AuthenticatedRequest {
  membership: BusinessMembership;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tenant boundary guard. Must run after SessionAuthGuard.
 *
 * Resolves the :businessId route param against the AUTHENTICATED USER'S
 * memberships — the client-supplied id is never trusted for authorization,
 * only used as a lookup key. Non-members get 404 (existence hidden).
 */
@Injectable()
export class BusinessMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BusinessScopedRequest>();
    const rawParam = request.params.businessId;
    const businessId = typeof rawParam === 'string' ? rawParam : undefined;
    if (!businessId || !UUID_RE.test(businessId)) {
      throw new NotFoundException('Business not found');
    }

    const membership = await this.prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: request.user.id, businessId } },
    });
    if (!membership) {
      throw new NotFoundException('Business not found');
    }

    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[] | undefined>(
      REQUIRE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles?.length && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    request.membership = membership;
    return true;
  }
}

/** Injects the verified membership set by BusinessMemberGuard. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<BusinessScopedRequest>();
    return request.membership;
  },
);

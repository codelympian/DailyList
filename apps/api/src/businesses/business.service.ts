import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateBusinessInput } from '@dailylist/validation';
import type { BusinessSummary } from '@dailylist/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a business and makes the creator its OWNER, atomically. */
  async create(userId: string, input: CreateBusinessInput): Promise<BusinessSummary> {
    const membership = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: input.name, industry: input.industry ?? null },
      });
      return tx.businessMembership.create({
        data: { userId, businessId: business.id, role: 'OWNER' },
        include: { business: true },
      });
    });
    return toSummary(membership);
  }

  async listForUser(userId: string): Promise<BusinessSummary[]> {
    const memberships = await this.prisma.businessMembership.findMany({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(toSummary);
  }

  /**
   * Tenant isolation: the business is looked up THROUGH the caller's
   * membership. A non-member gets 404 — the same as a business that does
   * not exist, so existence is never revealed.
   */
  async getForUser(userId: string, businessId: string): Promise<BusinessSummary> {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: { business: true },
    });
    if (!membership) {
      throw new NotFoundException('Business not found');
    }
    return toSummary(membership);
  }
}

interface MembershipWithBusiness {
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  business: { id: string; name: string; industry: string | null; currency: string };
}

function toSummary(m: MembershipWithBusiness): BusinessSummary {
  return {
    id: m.business.id,
    name: m.business.name,
    industry: m.business.industry,
    currency: m.business.currency,
    role: m.role,
  };
}

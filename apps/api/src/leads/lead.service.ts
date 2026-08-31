import { Injectable, NotFoundException } from '@nestjs/common';
import type { Lead, Prisma } from '@dailylist/database';
import type { LeadSummary, Paginated } from '@dailylist/types';
import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
  UpdateLeadStatusInput,
} from '@dailylist/validation';
import { PrismaService } from '../prisma/prisma.service';
import { toDecimal } from '../transactions/money';

type LeadWithNames = Lead & {
  customer: { name: string };
  product: { name: string } | null;
};

const TERMINAL_STATUSES = ['WON', 'LOST'] as const;

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, input: CreateLeadInput): Promise<LeadSummary> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    let productName: string | undefined;
    if (input.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: input.productId, businessId },
      });
      if (!product) throw new NotFoundException('Product not found');
      productName = product.name;
    }

    const interest = productName ?? input.description ?? 'something';

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          businessId,
          customerId: customer.id,
          productId: input.productId ?? null,
          description: input.description ?? null,
          estimatedValue:
            input.estimatedValue !== undefined ? toDecimal(input.estimatedValue) : null,
          notes: input.notes ?? null,
        },
        include: leadInclude,
      });
      await tx.customerEvent.create({
        data: {
          businessId,
          customerId: customer.id,
          type: 'LEAD_CREATED',
          title: `Interested in ${interest}`,
          payload: { leadId: created.id, productId: input.productId ?? null },
        },
      });
      return created;
    });

    return toSummary(lead);
  }

  async list(businessId: string, query: ListLeadsQuery): Promise<Paginated<LeadSummary>> {
    const where: Prisma.LeadWhereInput = { businessId };
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { lastActivityAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: items.map(toSummary), total, page: query.page, pageSize: query.pageSize };
  }

  async get(businessId: string, leadId: string): Promise<LeadSummary> {
    return toSummary(await this.findOne(businessId, leadId));
  }

  async update(businessId: string, leadId: string, input: UpdateLeadInput): Promise<LeadSummary> {
    const existing = await this.findOne(businessId, leadId);

    if (input.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: input.productId, businessId },
      });
      if (!product) throw new NotFoundException('Product not found');
    }

    const lead = await this.prisma.lead.update({
      where: { id: existing.id },
      data: {
        ...(input.productId !== undefined ? { productId: input.productId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.estimatedValue !== undefined
          ? {
              estimatedValue:
                input.estimatedValue === null ? null : toDecimal(input.estimatedValue),
            }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        lastActivityAt: new Date(),
      },
      include: leadInclude,
    });
    return toSummary(lead);
  }

  async setStatus(
    businessId: string,
    leadId: string,
    input: UpdateLeadStatusInput,
  ): Promise<LeadSummary> {
    const existing = await this.findOne(businessId, leadId);
    if (existing.status === input.status) return toSummary(existing);

    const closing = (TERMINAL_STATUSES as readonly string[]).includes(input.status);
    const interest = existing.product?.name ?? existing.description ?? 'lead';

    const lead = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          lastActivityAt: new Date(),
          closedAt: closing ? new Date() : null,
        },
        include: leadInclude,
      });
      await tx.customerEvent.create({
        data: {
          businessId,
          customerId: existing.customerId,
          type: 'LEAD_STATUS_CHANGED',
          title: leadStatusTitle(input.status, interest),
          payload: { leadId: existing.id, from: existing.status, to: input.status },
        },
      });
      return updated;
    });
    return toSummary(lead);
  }

  private async findOne(businessId: string, leadId: string): Promise<LeadWithNames> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, businessId },
      include: leadInclude,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}

const leadInclude = {
  customer: { select: { name: true } },
  product: { select: { name: true } },
} as const;

function leadStatusTitle(status: string, interest: string): string {
  switch (status) {
    case 'CONTACTED':
      return `Lead contacted (${interest})`;
    case 'INTERESTED':
      return `Showed interest in ${interest}`;
    case 'QUOTED':
      return `Quote sent for ${interest}`;
    case 'NEGOTIATING':
      return `Negotiating ${interest}`;
    case 'WON':
      return `Lead won — ${interest} 🎉`;
    case 'LOST':
      return `Lead lost (${interest})`;
    default:
      return `Lead moved to ${status} (${interest})`;
  }
}

function toSummary(lead: LeadWithNames): LeadSummary {
  return {
    id: lead.id,
    customerId: lead.customerId,
    customerName: lead.customer.name,
    productId: lead.productId,
    productName: lead.product?.name ?? null,
    description: lead.description,
    status: lead.status,
    estimatedValue: lead.estimatedValue?.toFixed(2) ?? null,
    notes: lead.notes,
    lastActivityAt: lead.lastActivityAt.toISOString(),
    closedAt: lead.closedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

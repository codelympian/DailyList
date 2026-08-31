import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Customer, type CustomerIdentity } from '@dailylist/database';
import type { CustomerDetail, CustomerSummary, Paginated, TimelineEvent } from '@dailylist/types';
import {
  normalizePhone,
  type CreateCustomerInput,
  type ListCustomersQuery,
  type UpdateCustomerInput,
} from '@dailylist/validation';
import { PrismaService } from '../prisma/prisma.service';

type CustomerWithIdentities = Customer & { identities: CustomerIdentity[] };

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, input: CreateCustomerInput): Promise<CustomerDetail> {
    const phone = input.phone ? this.toE164(input.phone) : undefined;
    const email = input.email;

    await this.assertNoIdentityConflict(businessId, { phone, email });

    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          businessId,
          name: input.name,
          phone: phone ?? null,
          email: email ?? null,
          notes: input.notes ?? null,
          tags: input.tags ?? [],
          source: 'MANUAL',
        },
      });
      await tx.customerIdentity.createMany({ data: this.identityRows(created, phone, email) });
      await tx.customerEvent.create({
        data: {
          businessId,
          customerId: created.id,
          type: 'CUSTOMER_CREATED',
          title: 'Customer added',
        },
      });
      return tx.customer.findUniqueOrThrow({
        where: { id: created.id },
        include: { identities: true },
      });
    });

    return toDetail(customer, await this.outstandingDebt(businessId, customer.id));
  }

  async list(businessId: string, query: ListCustomersQuery): Promise<Paginated<CustomerSummary>> {
    const where: Prisma.CustomerWhereInput = { businessId, deletedAt: null };

    if (query.tag) {
      where.tags = { has: query.tag };
    }
    if (query.search) {
      const search = query.search;
      const conditions: Prisma.CustomerWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search.toLowerCase() } },
        { phone: { contains: search.replace(/[\s\-().]/g, '') } },
      ];
      const normalized = normalizePhone(search);
      if (normalized.ok && normalized.e164) {
        conditions.push({ phone: normalized.e164 });
      }
      where.OR = conditions;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items: items.map(toSummary), total, page: query.page, pageSize: query.pageSize };
  }

  async get(businessId: string, customerId: string): Promise<CustomerDetail> {
    const customer = await this.findActive(businessId, customerId);
    return toDetail(customer, await this.outstandingDebt(businessId, customerId));
  }

  /** Debt is always derived from transactions — never stored, never drifts. */
  private async outstandingDebt(businessId: string, customerId: string): Promise<string> {
    const rows = await this.prisma.transaction.findMany({
      where: { businessId, customerId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
      select: { amount: true, amountPaid: true },
    });
    const debt = rows.reduce(
      (sum, row) => sum.plus(row.amount.minus(row.amountPaid)),
      new Prisma.Decimal(0),
    );
    return debt.toFixed(2);
  }

  async update(
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<CustomerDetail> {
    const existing = await this.findActive(businessId, customerId);

    // undefined = unchanged; null = clear; string = replace.
    const nextPhone =
      input.phone === undefined
        ? existing.phone
        : input.phone === null
          ? null
          : this.toE164(input.phone);
    const nextEmail = input.email === undefined ? existing.email : input.email;

    await this.assertNoIdentityConflict(
      businessId,
      { phone: nextPhone ?? undefined, email: nextEmail ?? undefined },
      customerId,
    );

    const changedFields = describeChanges(existing, input, nextPhone, nextEmail);

    const customer = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          name: input.name ?? existing.name,
          phone: nextPhone,
          email: nextEmail,
          notes: input.notes === undefined ? existing.notes : input.notes,
          tags: input.tags ?? existing.tags,
        },
      });
      // Resync PHONE/EMAIL identities to the new values.
      await tx.customerIdentity.deleteMany({
        where: { customerId, type: { in: ['PHONE', 'EMAIL'] } },
      });
      await tx.customerIdentity.createMany({
        data: this.identityRows(updated, nextPhone ?? undefined, nextEmail ?? undefined),
      });
      if (changedFields.length > 0) {
        await tx.customerEvent.create({
          data: {
            businessId,
            customerId,
            type: 'CUSTOMER_UPDATED',
            title: `Customer updated (${changedFields.join(', ')})`,
            payload: { changedFields },
          },
        });
      }
      return tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        include: { identities: true },
      });
    });

    return toDetail(customer, await this.outstandingDebt(businessId, customerId));
  }

  /** Soft delete: history is preserved, identities are freed for reuse. */
  async remove(businessId: string, customerId: string): Promise<{ ok: true }> {
    await this.findActive(businessId, customerId);
    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.customerIdentity.deleteMany({ where: { customerId } }),
    ]);
    return { ok: true };
  }

  async timeline(
    businessId: string,
    customerId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<TimelineEvent>> {
    await this.findActive(businessId, customerId);
    const where = { businessId, customerId };
    const [total, events] = await this.prisma.$transaction([
      this.prisma.customerEvent.count({ where }),
      this.prisma.customerEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: events.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        payload: (event.payload as Record<string, unknown> | null) ?? null,
        occurredAt: event.occurredAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  // ----------------------------------------------------------

  private async findActive(
    businessId: string,
    customerId: string,
  ): Promise<CustomerWithIdentities> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId, deletedAt: null },
      include: { identities: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private toE164(rawPhone: string): string {
    const result = normalizePhone(rawPhone);
    if (!result.ok || !result.e164) {
      // The zod schema already validated; this protects direct service callers.
      throw new ConflictException(result.error ?? 'Invalid phone number');
    }
    return result.e164;
  }

  /**
   * Duplicate detection: exact identity matches (normalized phone/email)
   * are conflicts. The caller may exclude one customer id (self, on update).
   */
  private async assertNoIdentityConflict(
    businessId: string,
    values: { phone?: string; email?: string },
    excludeCustomerId?: string,
  ): Promise<void> {
    const candidates: { type: 'PHONE' | 'EMAIL'; value: string }[] = [];
    if (values.phone) candidates.push({ type: 'PHONE', value: values.phone });
    if (values.email) candidates.push({ type: 'EMAIL', value: values.email });
    if (candidates.length === 0) return;

    const conflict = await this.prisma.customerIdentity.findFirst({
      where: {
        businessId,
        OR: candidates.map((c) => ({ type: c.type, value: c.value })),
        ...(excludeCustomerId ? { customerId: { not: excludeCustomerId } } : {}),
      },
      include: { customer: true },
    });

    if (conflict) {
      throw new ConflictException({
        statusCode: 409,
        message: `A customer with this ${conflict.type.toLowerCase()} already exists`,
        error: 'Conflict',
        duplicate: {
          customerId: conflict.customerId,
          customerName: conflict.customer.name,
          identityType: conflict.type,
          value: conflict.value,
        },
      });
    }
  }

  private identityRows(
    customer: Customer,
    phone: string | undefined,
    email: string | undefined,
  ): Prisma.CustomerIdentityCreateManyInput[] {
    const rows: Prisma.CustomerIdentityCreateManyInput[] = [];
    if (phone) {
      rows.push({
        businessId: customer.businessId,
        customerId: customer.id,
        type: 'PHONE',
        value: phone,
      });
    }
    if (email) {
      rows.push({
        businessId: customer.businessId,
        customerId: customer.id,
        type: 'EMAIL',
        value: email,
      });
    }
    return rows;
  }
}

// ----------------------------------------------------------

function toSummary(customer: Customer): CustomerSummary {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    lifecycleStage: customer.lifecycleStage,
    tags: customer.tags,
    totalSpend: customer.totalSpend.toString(),
    purchaseCount: customer.purchaseCount,
    lastPurchaseAt: customer.lastPurchaseAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  };
}

function toDetail(customer: CustomerWithIdentities, outstandingDebt: string): CustomerDetail {
  return {
    ...toSummary(customer),
    notes: customer.notes,
    source: customer.source,
    lastContactedAt: customer.lastContactedAt?.toISOString() ?? null,
    updatedAt: customer.updatedAt.toISOString(),
    identities: customer.identities.map((identity) => ({
      id: identity.id,
      type: identity.type,
      value: identity.value,
    })),
    outstandingDebt,
  };
}

function describeChanges(
  existing: Customer,
  input: UpdateCustomerInput,
  nextPhone: string | null,
  nextEmail: string | null,
): string[] {
  const changes: string[] = [];
  if (input.name !== undefined && input.name !== existing.name) changes.push('name');
  if (nextPhone !== existing.phone) changes.push('phone');
  if (nextEmail !== existing.email) changes.push('email');
  if (input.notes !== undefined && input.notes !== existing.notes) changes.push('notes');
  if (input.tags !== undefined && JSON.stringify(input.tags) !== JSON.stringify(existing.tags)) {
    changes.push('tags');
  }
  return changes;
}

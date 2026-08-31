import { Injectable } from '@nestjs/common';
import type { CustomerFeatureInput } from '@dailylist/scoring';
import { PrismaService } from '../prisma/prisma.service';

const COUNTABLE = ['PAID', 'PARTIALLY_PAID', 'UNPAID'] as const;
const OPEN_DEBT = ['UNPAID', 'PARTIALLY_PAID'] as const;
const CLOSED_LEADS = ['WON', 'LOST'] as const;

/**
 * Loads engine inputs for many customers using a fixed number of queries
 * (no N+1). Postgres DISTINCT ON — exposed by Prisma's `distinct` — gives
 * us "the latest row per customer" for transactions and leads.
 */
@Injectable()
export class FeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadForBusiness(
    businessId: string,
    customerIds?: string[],
  ): Promise<CustomerFeatureInput[]> {
    const customers = await this.prisma.customer.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(customerIds ? { id: { in: customerIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        purchaseCount: true,
        totalSpend: true,
        lastPurchaseAt: true,
        lastContactedAt: true,
      },
    });
    if (customers.length === 0) return [];

    const ids = customers.map((c) => c.id);

    const [openTransactions, firstPurchases, latestTransactions, openLeads, optOuts] =
      await Promise.all([
        // Outstanding debt: only open transactions, reduced in JS on Decimals.
        this.prisma.transaction.findMany({
          where: { businessId, customerId: { in: ids }, status: { in: [...OPEN_DEBT] } },
          select: { customerId: true, amount: true, amountPaid: true },
        }),
        // Earliest purchase per customer (for average purchase interval).
        this.prisma.transaction.groupBy({
          by: ['customerId'],
          where: { businessId, customerId: { in: ids }, status: { in: [...COUNTABLE] } },
          _min: { occurredAt: true },
        }),
        // Most recent purchase per customer, with its product (DISTINCT ON).
        this.prisma.transaction.findMany({
          where: { businessId, customerId: { in: ids }, status: { in: [...COUNTABLE] } },
          orderBy: [{ customerId: 'asc' }, { occurredAt: 'desc' }],
          distinct: ['customerId'],
          select: {
            customerId: true,
            items: {
              select: {
                description: true,
                product: { select: { name: true, reorderIntervalDays: true } },
              },
            },
          },
        }),
        // Most recently active open lead per customer (DISTINCT ON).
        this.prisma.lead.findMany({
          where: { businessId, customerId: { in: ids }, status: { notIn: [...CLOSED_LEADS] } },
          orderBy: [{ customerId: 'asc' }, { lastActivityAt: 'desc' }],
          distinct: ['customerId'],
          select: {
            customerId: true,
            lastActivityAt: true,
            description: true,
            product: { select: { name: true } },
          },
        }),
        // Any opted-out channel means "do not contact".
        this.prisma.communicationPreference.findMany({
          where: { businessId, customerId: { in: ids }, optedIn: false },
          select: { customerId: true },
        }),
      ]);

    const debtByCustomer = new Map<string, number>();
    for (const t of openTransactions) {
      const due = t.amount.minus(t.amountPaid);
      const value = due.isNegative() ? 0 : due.toNumber();
      debtByCustomer.set(t.customerId, (debtByCustomer.get(t.customerId) ?? 0) + value);
    }

    const firstPurchaseByCustomer = new Map(
      firstPurchases.map((row) => [row.customerId, row._min.occurredAt]),
    );

    const latestByCustomer = new Map(
      latestTransactions.map((t) => {
        // Prefer a catalog product (it carries the reorder interval).
        const withProduct = t.items.find((item) => item.product !== null);
        const item = withProduct ?? t.items[0];
        return [
          t.customerId,
          {
            productName: item?.product?.name ?? item?.description ?? null,
            reorderIntervalDays: withProduct?.product?.reorderIntervalDays ?? null,
          },
        ];
      }),
    );

    const leadByCustomer = new Map(
      openLeads.map((lead) => [
        lead.customerId,
        {
          lastActivityAt: lead.lastActivityAt,
          interest: lead.product?.name ?? lead.description ?? null,
        },
      ]),
    );

    const optedOut = new Set(optOuts.map((p) => p.customerId));

    return customers.map((customer) => {
      const latest = latestByCustomer.get(customer.id);
      const lead = leadByCustomer.get(customer.id);
      return {
        customerId: customer.id,
        name: customer.name,
        hasPhone: !!customer.phone,
        purchaseCount: customer.purchaseCount,
        totalSpend: customer.totalSpend.toNumber(),
        outstandingDebt: debtByCustomer.get(customer.id) ?? 0,
        lastPurchaseAt: customer.lastPurchaseAt,
        previousPurchaseAt: null,
        firstPurchaseAt: firstPurchaseByCustomer.get(customer.id) ?? null,
        lastContactedAt: customer.lastContactedAt,
        productReorderIntervalDays: latest?.reorderIntervalDays ?? null,
        lastProductName: latest?.productName ?? null,
        openLeadLastActivityAt: lead?.lastActivityAt ?? null,
        openLeadInterest: lead?.interest ?? null,
        optedOut: optedOut.has(customer.id),
      };
    });
  }
}

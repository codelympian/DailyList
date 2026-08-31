import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Payment, Transaction, TransactionItem } from '@dailylist/database';
import type { Paginated, TransactionDetail, TransactionSummary } from '@dailylist/types';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  RecordPaymentInput,
  UpdateTransactionStatusInput,
} from '@dailylist/validation';
import { PrismaService } from '../prisma/prisma.service';
import { amountDue, deriveStatus, itemSubtotal, itemsTotal, toDecimal } from './money';

type Tx = Prisma.TransactionClient;
type TransactionWithRelations = Transaction & {
  items: TransactionItem[];
  payments: Payment[];
  customer: { name: string };
};

/** Statuses that count toward purchase statistics and debt. */
const COUNTABLE: Prisma.TransactionWhereInput = {
  status: { in: ['PAID', 'PARTIALLY_PAID', 'UNPAID'] },
};

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, input: CreateTransactionInput): Promise<TransactionDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, businessId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Resolve product references (tenant-scoped) and snapshot names.
    const productIds = input.items.flatMap((item) => (item.productId ? [item.productId] : []));
    const products = productIds.length
      ? await this.prisma.product.findMany({ where: { id: { in: productIds }, businessId } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!productById.has(id)) throw new NotFoundException('Product not found');
    }

    const total = itemsTotal(input.items);
    if (total.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Transaction total must be greater than 0');
    }
    const paid = toDecimal(input.amountPaid);
    const status = deriveStatus(total, paid);
    const occurredAt = input.occurredAt ?? new Date();
    const due = amountDue(total, paid);

    const created = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          businessId,
          customerId: customer.id,
          amount: total,
          amountPaid: paid,
          status,
          occurredAt,
          paymentMethod: input.paymentMethod ?? null,
          notes: input.notes ?? null,
          items: {
            create: input.items.map((item) => ({
              businessId,
              productId: item.productId ?? null,
              description:
                item.description ?? productById.get(item.productId ?? '')?.name ?? 'Item',
              quantity: item.quantity,
              unitPrice: toDecimal(item.unitPrice),
              subtotal: itemSubtotal(item),
            })),
          },
        },
      });

      if (paid.greaterThan(0)) {
        await tx.payment.create({
          data: {
            businessId,
            transactionId: transaction.id,
            amount: paid,
            method: input.paymentMethod ?? 'CASH',
            occurredAt,
          },
        });
      }

      const itemNames = input.items
        .map((item) => item.description ?? productById.get(item.productId ?? '')?.name ?? 'Item')
        .join(', ');
      await tx.customerEvent.create({
        data: {
          businessId,
          customerId: customer.id,
          type: 'PURCHASE',
          title: `Purchase — ₦${total.toFixed(2)} (${itemNames})`,
          payload: { transactionId: transaction.id, amount: total.toFixed(2) },
          occurredAt,
        },
      });
      if (due.greaterThan(0)) {
        await tx.customerEvent.create({
          data: {
            businessId,
            customerId: customer.id,
            type: 'DEBT_CREATED',
            title: `Outstanding balance — ₦${due.toFixed(2)}`,
            payload: { transactionId: transaction.id, amountDue: due.toFixed(2) },
            occurredAt,
          },
        });
      }

      await this.recomputeCustomerStats(tx, businessId, customer.id);
      return transaction.id;
    });

    return this.get(businessId, created);
  }

  async list(
    businessId: string,
    query: ListTransactionsQuery,
  ): Promise<Paginated<TransactionSummary>> {
    const where: Prisma.TransactionWhereInput = { businessId };
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: { customer: { select: { name: true } } },
        orderBy: { occurredAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((t) => toSummary(t, t.customer.name)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(businessId: string, transactionId: string): Promise<TransactionDetail> {
    const transaction = await this.findOne(businessId, transactionId);
    return toDetail(transaction);
  }

  async recordPayment(
    businessId: string,
    transactionId: string,
    input: RecordPaymentInput,
  ): Promise<TransactionDetail> {
    const transaction = await this.findOne(businessId, transactionId);
    if (transaction.status === 'REFUNDED' || transaction.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot record a payment on a ${transaction.status.toLowerCase()} transaction`,
      );
    }

    const payment = toDecimal(input.amount);
    const due = amountDue(transaction.amount, transaction.amountPaid);
    if (payment.greaterThan(due)) {
      throw new BadRequestException(
        `Payment exceeds the outstanding balance of ₦${due.toFixed(2)}`,
      );
    }

    const newPaid = toDecimal(transaction.amountPaid).plus(payment);
    const newStatus = deriveStatus(transaction.amount, newPaid);
    const occurredAt = input.occurredAt ?? new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          businessId,
          transactionId,
          amount: payment,
          method: input.method ?? 'CASH',
          occurredAt,
        },
      });
      await tx.transaction.update({
        where: { id: transactionId },
        data: { amountPaid: newPaid, status: newStatus },
      });
      await tx.customerEvent.create({
        data: {
          businessId,
          customerId: transaction.customerId,
          type: 'DEBT_PAYMENT',
          title: `Payment received — ₦${payment.toFixed(2)}`,
          payload: { transactionId, amount: payment.toFixed(2) },
          occurredAt,
        },
      });
      await this.recomputeCustomerStats(tx, businessId, transaction.customerId);
    });

    return this.get(businessId, transactionId);
  }

  async setStatus(
    businessId: string,
    transactionId: string,
    input: UpdateTransactionStatusInput,
  ): Promise<TransactionDetail> {
    const transaction = await this.findOne(businessId, transactionId);
    if (transaction.status === input.status) return toDetail(transaction);

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: input.status },
      });
      await this.recomputeCustomerStats(tx, businessId, transaction.customerId);
    });
    return this.get(businessId, transactionId);
  }

  /**
   * Recomputes denormalized customer purchase statistics from source-of-truth
   * aggregates (never incremental math, so they can never drift).
   */
  private async recomputeCustomerStats(
    tx: Tx,
    businessId: string,
    customerId: string,
  ): Promise<void> {
    const stats = await tx.transaction.aggregate({
      where: { businessId, customerId, ...COUNTABLE },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalSpend: stats._sum.amount ?? 0,
        purchaseCount: stats._count._all,
        lastPurchaseAt: stats._max.occurredAt,
      },
    });
  }

  private async findOne(
    businessId: string,
    transactionId: string,
  ): Promise<TransactionWithRelations> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, businessId },
      include: {
        items: true,
        payments: { orderBy: { occurredAt: 'asc' } },
        customer: { select: { name: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }
}

function toSummary(transaction: Transaction, customerName: string): TransactionSummary {
  return {
    id: transaction.id,
    customerId: transaction.customerId,
    customerName,
    amount: transaction.amount.toFixed(2),
    amountPaid: transaction.amountPaid.toFixed(2),
    amountDue: amountDue(transaction.amount, transaction.amountPaid).toFixed(2),
    status: transaction.status,
    occurredAt: transaction.occurredAt.toISOString(),
    paymentMethod: transaction.paymentMethod,
    notes: transaction.notes,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function toDetail(transaction: TransactionWithRelations): TransactionDetail {
  return {
    ...toSummary(transaction, transaction.customer.name),
    items: transaction.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    })),
    payments: transaction.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toFixed(2),
      method: payment.method,
      occurredAt: payment.occurredAt.toISOString(),
    })),
  };
}

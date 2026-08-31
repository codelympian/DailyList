import { Prisma, type PrismaClient } from '@dailylist/database';
import { normalizeRow } from './normalize';
import type { ImportMapping, NormalizedRow, RawRow, RowError } from './types';

const CHUNK_SIZE = 200;

type Db = PrismaClient;

/**
 * Validation pass: normalizes every staged row, detects duplicates
 * (within the file and against existing customer identities), and moves
 * the job to PREVIEW with counts. Deterministic; safe to re-run.
 */
export async function validateImportJob(prisma: Db, importJobId: string): Promise<void> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: importJobId } });
  const mapping = (job.mapping ?? {}) as ImportMapping;

  await prisma.importJob.update({ where: { id: job.id }, data: { status: 'VALIDATING' } });

  try {
    const rows = await prisma.importRow.findMany({
      where: { importJobId: job.id },
      orderBy: { rowNumber: 'asc' },
    });

    // First pass: normalize everything.
    const results = rows.map((row) => ({
      row,
      ...normalizeRow(row.raw as RawRow, mapping),
    }));

    // Existing-customer duplicate lookup (one query for all identities).
    const phoneValues = results.flatMap((r) => (r.normalized.phone ? [r.normalized.phone] : []));
    const emailValues = results.flatMap((r) => (r.normalized.email ? [r.normalized.email] : []));
    const existing = await prisma.customerIdentity.findMany({
      where: {
        businessId: job.businessId,
        OR: [
          ...(phoneValues.length ? [{ type: 'PHONE' as const, value: { in: phoneValues } }] : []),
          ...(emailValues.length ? [{ type: 'EMAIL' as const, value: { in: emailValues } }] : []),
        ],
      },
    });
    const existingByValue = new Map(existing.map((i) => [`${i.type}:${i.value}`, i.customerId]));

    // Second pass: statuses, intra-file duplicate tracking.
    const seenInFile = new Map<string, number>(); // identity value -> first row number
    let valid = 0;
    let invalid = 0;
    let duplicate = 0;

    const updates = results.map(({ row, normalized, errors }) => {
      let status: 'VALID' | 'INVALID' | 'DUPLICATE' = 'VALID';
      let duplicateOfCustomerId: string | null = null;
      const rowErrors: RowError[] = [...errors];

      if (rowErrors.length > 0) {
        status = 'INVALID';
      } else {
        const keys = [
          ...(normalized.phone ? [`PHONE:${normalized.phone}`] : []),
          ...(normalized.email ? [`EMAIL:${normalized.email}`] : []),
        ];
        for (const key of keys) {
          const existingCustomer = existingByValue.get(key);
          if (existingCustomer) {
            status = 'DUPLICATE';
            duplicateOfCustomerId = existingCustomer;
            rowErrors.push({
              field: key.startsWith('PHONE') ? 'phone' : 'email',
              message: 'Matches an existing customer',
            });
            break;
          }
          const firstRow = seenInFile.get(key);
          if (firstRow !== undefined) {
            status = 'DUPLICATE';
            rowErrors.push({
              field: key.startsWith('PHONE') ? 'phone' : 'email',
              message: `Duplicate of row ${firstRow} in this file`,
            });
            break;
          }
        }
        if (status === 'VALID') {
          for (const key of keys) seenInFile.set(key, row.rowNumber);
        }
      }

      if (status === 'VALID') valid++;
      else if (status === 'INVALID') invalid++;
      else duplicate++;

      return prisma.importRow.update({
        where: { id: row.id },
        data: {
          status,
          normalized: normalized as Prisma.InputJsonValue,
          errors: rowErrors.length
            ? (rowErrors as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
          duplicateOfCustomerId,
        },
      });
    });

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      await prisma.$transaction(updates.slice(i, i + CHUNK_SIZE));
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'PREVIEW',
        validRows: valid,
        invalidRows: invalid,
        duplicateRows: duplicate,
      },
    });
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Validation failed',
      },
    });
    throw error;
  }
}

/**
 * Execution pass: creates customers (+identities, +events) and, when
 * amount data is present, transactions with correct payment status and
 * recomputed customer statistics. VALID rows only; DUPLICATE rows are
 * skipped and reported; a failing row never aborts the whole import.
 */
export async function executeImportJob(prisma: Db, importJobId: string): Promise<void> {
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: importJobId } });

  try {
    const validRows = await prisma.importRow.findMany({
      where: { importJobId: job.id, status: 'VALID' },
      orderBy: { rowNumber: 'asc' },
    });

    let imported = 0;
    let failed = 0;

    for (const row of validRows) {
      const normalized = row.normalized as NormalizedRow;
      try {
        await prisma.$transaction(async (tx) => {
          await importOneRow(tx, job.businessId, normalized);
        });
        await prisma.importRow.update({ where: { id: row.id }, data: { status: 'IMPORTED' } });
        imported++;
      } catch (error) {
        await prisma.importRow.update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            errors: [
              { field: 'row', message: error instanceof Error ? error.message : 'Import failed' },
            ] as unknown as Prisma.InputJsonValue,
          },
        });
        failed++;
      }
    }

    const skipped = await prisma.importRow.updateMany({
      where: { importJobId: job.id, status: 'DUPLICATE' },
      data: { status: 'SKIPPED' },
    });

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        importedRows: imported,
        skippedRows: skipped.count,
        invalidRows: job.invalidRows + failed,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Import failed' },
    });
    throw error;
  }
}

type TxClient = Prisma.TransactionClient;

async function importOneRow(
  tx: TxClient,
  businessId: string,
  normalized: NormalizedRow,
): Promise<void> {
  const customer = await tx.customer.create({
    data: {
      businessId,
      name: normalized.name ?? 'Unknown',
      phone: normalized.phone ?? null,
      email: normalized.email ?? null,
      notes: normalized.notes ?? null,
      source: 'IMPORT',
    },
  });

  const identityRows: Prisma.CustomerIdentityCreateManyInput[] = [];
  if (normalized.phone) {
    identityRows.push({
      businessId,
      customerId: customer.id,
      type: 'PHONE',
      value: normalized.phone,
    });
  }
  if (normalized.email) {
    identityRows.push({
      businessId,
      customerId: customer.id,
      type: 'EMAIL',
      value: normalized.email,
    });
  }
  if (identityRows.length) await tx.customerIdentity.createMany({ data: identityRows });

  await tx.customerEvent.create({
    data: {
      businessId,
      customerId: customer.id,
      type: 'CUSTOMER_CREATED',
      title: 'Customer imported',
    },
  });

  if (normalized.amount !== undefined) {
    // Deterministic money math on Decimal — same rules as the transaction service.
    const amount = new Prisma.Decimal(normalized.amount);
    const balance = new Prisma.Decimal(normalized.balance ?? '0');
    const amountPaid = amount.minus(balance).isNegative()
      ? new Prisma.Decimal(0)
      : amount.minus(balance);
    const status = amountPaid.greaterThanOrEqualTo(amount)
      ? 'PAID'
      : amountPaid.greaterThan(0)
        ? 'PARTIALLY_PAID'
        : 'UNPAID';
    const occurredAt = normalized.date ? new Date(normalized.date) : new Date();
    const description = normalized.product ?? 'Imported sale';

    const transaction = await tx.transaction.create({
      data: {
        businessId,
        customerId: customer.id,
        amount,
        amountPaid,
        status,
        occurredAt,
        source: 'IMPORT',
        items: {
          create: [{ businessId, description, quantity: 1, unitPrice: amount, subtotal: amount }],
        },
      },
    });
    if (amountPaid.greaterThan(0)) {
      await tx.payment.create({
        data: { businessId, transactionId: transaction.id, amount: amountPaid, occurredAt },
      });
    }
    await tx.customerEvent.create({
      data: {
        businessId,
        customerId: customer.id,
        type: 'PURCHASE',
        title: `Purchase — ₦${amount.toFixed(2)} (${description})`,
        payload: { transactionId: transaction.id, amount: amount.toFixed(2) },
        occurredAt,
      },
    });
    if (balance.greaterThan(0)) {
      await tx.customerEvent.create({
        data: {
          businessId,
          customerId: customer.id,
          type: 'DEBT_CREATED',
          title: `Outstanding balance — ₦${balance.toFixed(2)}`,
          payload: { transactionId: transaction.id, amountDue: balance.toFixed(2) },
          occurredAt,
        },
      });
    }

    // Recompute denormalized stats from aggregates (same invariant as the API).
    const stats = await tx.transaction.aggregate({
      where: {
        businessId,
        customerId: customer.id,
        status: { in: ['PAID', 'PARTIALLY_PAID', 'UNPAID'] },
      },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalSpend: stats._sum.amount ?? 0,
        purchaseCount: stats._count._all,
        lastPurchaseAt: stats._max.occurredAt,
      },
    });
  }
}

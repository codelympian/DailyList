import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ImportJob, ImportRow, Prisma } from '@dailylist/database';
import type { ImportJobSummary, ImportRowSummary, Paginated } from '@dailylist/types';
import {
  executeImportJob,
  INLINE_ROW_LIMIT,
  suggestMapping,
  validateImportJob,
  type RowError,
} from '@dailylist/importer';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_IMPORT_ROWS, parseCsv, parseXlsx } from './file-parser';
import { ImportQueueService } from './import-queue.service';
import type { ListImportRowsQuery, SetMappingInput } from './import.schemas';

const CHUNK_SIZE = 500;

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ImportQueueService,
  ) {}

  async upload(
    businessId: string,
    userId: string,
    file: { originalname: string; buffer: Buffer },
  ): Promise<ImportJobSummary> {
    const name = file.originalname;
    const lower = name.toLowerCase();
    let fileType: 'CSV' | 'XLSX';
    if (lower.endsWith('.csv')) fileType = 'CSV';
    else if (lower.endsWith('.xlsx')) fileType = 'XLSX';
    else throw new BadRequestException('Upload a .csv or .xlsx file');

    const parsed = fileType === 'CSV' ? parseCsv(file.buffer) : await parseXlsx(file.buffer);
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Imports are limited to ${MAX_IMPORT_ROWS} rows`);
    }

    const job = await this.prisma.importJob.create({
      data: {
        businessId,
        createdById: userId,
        fileName: name,
        fileType,
        columns: parsed.headers,
        suggestedMapping: suggestMapping(parsed.headers) as Prisma.InputJsonValue,
        totalRows: parsed.rows.length,
      },
    });

    // Stage raw rows in chunks — production tables are never touched here.
    for (let i = 0; i < parsed.rows.length; i += CHUNK_SIZE) {
      await this.prisma.importRow.createMany({
        data: parsed.rows.slice(i, i + CHUNK_SIZE).map((raw, offset) => ({
          businessId,
          importJobId: job.id,
          rowNumber: i + offset + 2, // 1-based + header row, matches the user's spreadsheet
          raw,
        })),
      });
    }

    return toSummary(job);
  }

  async setMapping(
    businessId: string,
    jobId: string,
    input: SetMappingInput,
  ): Promise<ImportJobSummary> {
    const job = await this.findJob(businessId, jobId);
    if (job.status !== 'PENDING_MAPPING' && job.status !== 'PREVIEW') {
      throw new BadRequestException(`Cannot change the mapping while the import is ${job.status}`);
    }
    const columns = job.columns as string[];
    for (const source of Object.values(input.mapping)) {
      if (!columns.includes(source)) {
        throw new BadRequestException(`"${source}" is not a column in this file`);
      }
    }

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: { mapping: input.mapping as Prisma.InputJsonValue },
    });

    if (job.totalRows <= INLINE_ROW_LIMIT) {
      await validateImportJob(this.prisma, job.id);
    } else {
      await this.queue.enqueue({ kind: 'validate', importJobId: job.id });
    }
    return this.get(businessId, jobId);
  }

  async confirm(businessId: string, jobId: string): Promise<ImportJobSummary> {
    const job = await this.findJob(businessId, jobId);
    if (job.status !== 'PREVIEW') {
      throw new BadRequestException(
        job.status === 'COMPLETED'
          ? 'This import has already run'
          : `Import is not ready to run (status: ${job.status})`,
      );
    }
    await this.prisma.importJob.update({ where: { id: job.id }, data: { status: 'IMPORTING' } });

    if (job.totalRows <= INLINE_ROW_LIMIT) {
      await executeImportJob(this.prisma, job.id);
    } else {
      await this.queue.enqueue({ kind: 'execute', importJobId: job.id });
    }
    return this.get(businessId, jobId);
  }

  async cancel(businessId: string, jobId: string): Promise<ImportJobSummary> {
    const job = await this.findJob(businessId, jobId);
    if (job.status === 'IMPORTING' || job.status === 'COMPLETED') {
      throw new BadRequestException('This import can no longer be cancelled');
    }
    await this.prisma.importJob.update({ where: { id: job.id }, data: { status: 'CANCELLED' } });
    return this.get(businessId, jobId);
  }

  async get(businessId: string, jobId: string): Promise<ImportJobSummary> {
    return toSummary(await this.findJob(businessId, jobId));
  }

  async list(
    businessId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<ImportJobSummary>> {
    const where = { businessId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.importJob.count({ where }),
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: items.map(toSummary), total, page, pageSize };
  }

  async rows(
    businessId: string,
    jobId: string,
    query: ListImportRowsQuery,
  ): Promise<Paginated<ImportRowSummary>> {
    const job = await this.findJob(businessId, jobId);
    const where: Prisma.ImportRowWhereInput = { importJobId: job.id };
    if (query.status) where.status = query.status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.importRow.count({ where }),
      this.prisma.importRow.findMany({
        where,
        orderBy: { rowNumber: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: items.map(toRowSummary), total, page: query.page, pageSize: query.pageSize };
  }

  /** CSV report of problem rows (invalid, duplicate, failed) for download. */
  async errorReport(businessId: string, jobId: string): Promise<string> {
    const job = await this.findJob(businessId, jobId);
    const rows = await this.prisma.importRow.findMany({
      where: { importJobId: job.id, status: { in: ['INVALID', 'DUPLICATE', 'SKIPPED', 'FAILED'] } },
      orderBy: { rowNumber: 'asc' },
    });
    const columns = job.columns as string[];
    const header = ['Row', 'Status', 'Problems', ...columns];
    const lines = [header.map(csvEscape).join(',')];
    for (const row of rows) {
      const raw = row.raw as Record<string, string>;
      const errors = (row.errors as unknown as RowError[] | null) ?? [];
      const problems = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      lines.push(
        [String(row.rowNumber), row.status, problems, ...columns.map((c) => raw[c] ?? '')]
          .map(csvEscape)
          .join(','),
      );
    }
    return lines.join('\r\n');
  }

  private async findJob(businessId: string, jobId: string): Promise<ImportJob> {
    const job = await this.prisma.importJob.findFirst({ where: { id: jobId, businessId } });
    if (!job) throw new NotFoundException('Import not found');
    return job;
  }
}

function toSummary(job: ImportJob): ImportJobSummary {
  return {
    id: job.id,
    fileName: job.fileName,
    fileType: job.fileType,
    status: job.status,
    columns: job.columns as string[],
    suggestedMapping: job.suggestedMapping as Record<string, string>,
    mapping: (job.mapping as Record<string, string> | null) ?? null,
    totalRows: job.totalRows,
    validRows: job.validRows,
    invalidRows: job.invalidRows,
    duplicateRows: job.duplicateRows,
    importedRows: job.importedRows,
    skippedRows: job.skippedRows,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

function toRowSummary(row: ImportRow): ImportRowSummary {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    raw: row.raw as Record<string, string>,
    normalized: (row.normalized as Record<string, string> | null) ?? null,
    status: row.status,
    errors: (row.errors as unknown as { field: string; message: string }[] | null) ?? null,
    duplicateOfCustomerId: row.duplicateOfCustomerId,
  };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

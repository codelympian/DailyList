import { BadRequestException } from '@nestjs/common';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import type { RawRow } from '@dailylist/importer';

export const MAX_IMPORT_ROWS = 5000;

export interface ParsedFile {
  headers: string[];
  rows: RawRow[];
}

export function parseCsv(buffer: Buffer): ParsedFile {
  // Strip a UTF-8 BOM (Excel writes one) so the first header parses cleanly.
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.some((e) => e.type === 'Delimiter')) {
    throw new BadRequestException('Could not parse the CSV file');
  }
  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  assertShape(headers, result.data.length);
  const rows = result.data.map((row) => cleanRow(row, headers));
  return { headers, rows };
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException('Could not parse the Excel file');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The Excel file has no sheets');

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const value = cellText(cell.value).trim();
    if (value) headers[col - 1] = value;
  });
  const compactHeaders = headers.filter((h): h is string => !!h);
  assertShape(compactHeaders, sheet.rowCount - 1);

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: RawRow = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = cellText(row.getCell(index + 1).value).trim();
      raw[header] = value;
      if (value) hasValue = true;
    });
    if (hasValue) rows.push(raw);
  });
  return { headers: compactHeaders, rows };
}

function assertShape(headers: string[], rowCount: number): void {
  if (headers.length === 0) {
    throw new BadRequestException('No column headers found in the first row');
  }
  if (rowCount === 0) {
    throw new BadRequestException('The file has no data rows');
  }
  if (rowCount > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`Imports are limited to ${MAX_IMPORT_ROWS} rows per file`);
  }
}

function cleanRow(row: Record<string, string>, headers: string[]): RawRow {
  const cleaned: RawRow = {};
  for (const header of headers) {
    cleaned[header] = (row[header] ?? '').toString();
  }
  return cleaned;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value && value.text !== undefined) return String(value.text);
    if ('result' in value && value.result !== undefined) {
      return cellText(value.result as ExcelJS.CellValue);
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    return '';
  }
  return String(value);
}

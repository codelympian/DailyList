import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, signInAs, startAuthHarness, stopAuthHarness } from './auth-harness';

const CSV = [
  'Customer Name,Phone Number,Product Purchased,Amount,Date Bought,Amount Due',
  'Ada Import,0801 111 2222,Glow Serum,"₦18,000",15/07/2026,"5,000"',
  'Bad Phone,12345,,,,',
  ',08099990000,,,,',
  'Dup Existing,08012340000,,,,',
  'Intra Dup A,08033330001,,,,',
  'Intra Dup B,08033330001,,,,',
  'Clean Guy,08044440002,Soap,2000,,0',
].join('\r\n');

describe('CSV/XLSX import (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let cookie: Record<string, string>;
  let businessId: string;
  let otherCookie: Record<string, string>;
  let existingCustomerId: string;

  beforeAll(async () => {
    process.env.SUPABASE_JWKS_URL = await startAuthHarness();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableShutdownHooks();
    await app.init();
    server = app.getHttpServer();

    cookie = authHeader(await signInAs());
    const business = await request(server)
      .post('/businesses')
      .set(cookie)
      .send({ name: 'Import Shop' })
      .expect(201);
    businessId = business.body.id;

    // Pre-existing customer that the CSV will collide with.
    const existing = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set(cookie)
      .send({ name: 'Already Here', phone: '08012340000' })
      .expect(201);
    existingCustomerId = existing.body.id;

    otherCookie = authHeader(await signInAs());
  });

  afterAll(async () => {
    await app.close();
    await stopAuthHarness();
  });

  const base = () => `/businesses/${businessId}/imports`;
  let jobId: string;

  describe('upload + column detection', () => {
    it('uploads a CSV, detects columns, and suggests the mapping', async () => {
      const res = await request(server)
        .post(base())
        .set(cookie)
        .attach('file', Buffer.from(CSV, 'utf8'), 'customers.csv')
        .expect(201);

      jobId = res.body.id;
      expect(res.body.status).toBe('PENDING_MAPPING');
      expect(res.body.totalRows).toBe(7);
      expect(res.body.columns).toEqual([
        'Customer Name',
        'Phone Number',
        'Product Purchased',
        'Amount',
        'Date Bought',
        'Amount Due',
      ]);
      expect(res.body.suggestedMapping).toEqual({
        name: 'Customer Name',
        phone: 'Phone Number',
        product: 'Product Purchased',
        amount: 'Amount',
        date: 'Date Bought',
        balance: 'Amount Due',
      });
    });

    it('rejects unsupported file types', async () => {
      await request(server)
        .post(base())
        .set(cookie)
        .attach('file', Buffer.from('hello', 'utf8'), 'notes.txt')
        .expect(400);
    });

    it('rejects a file with no data rows', async () => {
      await request(server)
        .post(base())
        .set(cookie)
        .attach('file', Buffer.from('Name,Phone\r\n', 'utf8'), 'empty.csv')
        .expect(400);
    });
  });

  describe('mapping + validation preview', () => {
    it('applies the mapping and produces preview counts', async () => {
      const job = await request(server).get(`${base()}/${jobId}`).set(cookie);
      const res = await request(server)
        .post(`${base()}/${jobId}/mapping`)
        .set(cookie)
        .send({ mapping: job.body.suggestedMapping })
        .expect(200);

      expect(res.body.status).toBe('PREVIEW');
      expect(res.body.validRows).toBe(3); // Ada, Intra Dup A, Clean Guy
      expect(res.body.invalidRows).toBe(2); // bad phone, missing name
      expect(res.body.duplicateRows).toBe(2); // existing + intra-file
    });

    it('rejects a mapping without a name column', async () => {
      await request(server)
        .post(`${base()}/${jobId}/mapping`)
        .set(cookie)
        .send({ mapping: { phone: 'Phone Number' } })
        .expect(400);
    });

    it('rejects a mapping to a column not in the file', async () => {
      await request(server)
        .post(`${base()}/${jobId}/mapping`)
        .set(cookie)
        .send({ mapping: { name: 'Nonexistent Column' } })
        .expect(400);
    });

    it('lists invalid rows with field-level errors', async () => {
      const res = await request(server)
        .get(`${base()}/${jobId}/rows?status=INVALID`)
        .set(cookie)
        .expect(200);
      expect(res.body.total).toBe(2);
      const phoneError = res.body.items.find((r: { rowNumber: number }) => r.rowNumber === 3);
      expect(phoneError.errors.some((e: { field: string }) => e.field === 'phone')).toBe(true);
      const nameError = res.body.items.find((r: { rowNumber: number }) => r.rowNumber === 4);
      expect(nameError.errors.some((e: { field: string }) => e.field === 'name')).toBe(true);
    });

    it('marks the existing-customer collision with the customer id', async () => {
      const res = await request(server)
        .get(`${base()}/${jobId}/rows?status=DUPLICATE`)
        .set(cookie)
        .expect(200);
      const existingDup = res.body.items.find((r: { rowNumber: number }) => r.rowNumber === 5);
      expect(existingDup.duplicateOfCustomerId).toBe(existingCustomerId);
      const intraDup = res.body.items.find((r: { rowNumber: number }) => r.rowNumber === 7);
      expect(intraDup.errors[0].message).toContain('row 6');
    });
  });

  describe('confirm + execution', () => {
    it('imports valid rows, skips duplicates, never touches invalid rows', async () => {
      const res = await request(server).post(`${base()}/${jobId}/confirm`).set(cookie).expect(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.importedRows).toBe(3);
      expect(res.body.skippedRows).toBe(2);
      expect(res.body.completedAt).not.toBeNull();
    });

    it('created the customer with normalized phone, transaction, and debt', async () => {
      const search = await request(server)
        .get(`/businesses/${businessId}/customers?search=Ada Import`)
        .set(cookie)
        .expect(200);
      expect(search.body.items).toHaveLength(1);
      const ada = search.body.items[0];
      expect(ada.phone).toBe('+2348011112222');

      const detail = await request(server)
        .get(`/businesses/${businessId}/customers/${ada.id}`)
        .set(cookie)
        .expect(200);
      expect(detail.body.totalSpend).toBe('18000');
      expect(detail.body.purchaseCount).toBe(1);
      expect(detail.body.outstandingDebt).toBe('5000.00');
      expect(detail.body.source).toBe('IMPORT');

      const txns = await request(server)
        .get(`/businesses/${businessId}/transactions?customerId=${ada.id}`)
        .set(cookie)
        .expect(200);
      expect(txns.body.items).toHaveLength(1);
      expect(txns.body.items[0].status).toBe('PARTIALLY_PAID');
      expect(txns.body.items[0].amountDue).toBe('5000.00');

      const timeline = await request(server)
        .get(`/businesses/${businessId}/customers/${ada.id}/timeline`)
        .set(cookie)
        .expect(200);
      const types = timeline.body.items.map((e: { type: string }) => e.type);
      expect(types).toContain('PURCHASE');
      expect(types).toContain('DEBT_CREATED');
    });

    it('did NOT duplicate the pre-existing customer', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/customers?search=08012340000`)
        .set(cookie)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Already Here');
    });

    it('refuses to run the same import twice', async () => {
      await request(server).post(`${base()}/${jobId}/confirm`).set(cookie).expect(400);
    });

    it('serves a CSV error report of problem rows', async () => {
      const res = await request(server)
        .get(`${base()}/${jobId}/error-report`)
        .set(cookie)
        .expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Row,Status,Problems');
      expect(res.text).toContain('Bad Phone');
      expect(res.text).toContain('SKIPPED');
    });

    it('shows the job in import history', async () => {
      const res = await request(server).get(base()).set(cookie).expect(200);
      expect(res.body.items.map((j: { id: string }) => j.id)).toContain(jobId);
    });
  });

  describe('XLSX', () => {
    it('imports an Excel file end to end', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customers');
      sheet.addRow(['Full Name', 'WhatsApp', 'Item', 'Price']);
      sheet.addRow(['Excel Person', '0807 555 6666', 'Face Cream', 9500]);
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

      const upload = await request(server)
        .post(base())
        .set(cookie)
        .attach('file', buffer, 'customers.xlsx')
        .expect(201);
      expect(upload.body.fileType).toBe('XLSX');
      expect(upload.body.columns).toEqual(['Full Name', 'WhatsApp', 'Item', 'Price']);
      expect(upload.body.totalRows).toBe(1);

      const mapped = await request(server)
        .post(`${base()}/${upload.body.id}/mapping`)
        .set(cookie)
        .send({ mapping: upload.body.suggestedMapping })
        .expect(200);
      expect(mapped.body.validRows).toBe(1);

      const done = await request(server)
        .post(`${base()}/${upload.body.id}/confirm`)
        .set(cookie)
        .expect(200);
      expect(done.body.importedRows).toBe(1);

      const search = await request(server)
        .get(`/businesses/${businessId}/customers?search=Excel Person`)
        .set(cookie)
        .expect(200);
      expect(search.body.items[0].phone).toBe('+2348075556666');
    });
  });

  describe('tenant isolation', () => {
    it('blocks other users from seeing the import (404)', async () => {
      await request(server).get(`${base()}/${jobId}`).set(otherCookie).expect(404);
    });
  });
});

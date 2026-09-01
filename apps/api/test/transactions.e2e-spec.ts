import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, signInAs, startAuthHarness, stopAuthHarness } from './auth-harness';

describe('Products + Transactions (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let cookie: Record<string, string>;
  let businessId: string;
  let customerId: string;
  let productId: string;
  let otherCookie: Record<string, string>;

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
      .send({ name: 'Tunde Stores' })
      .expect(201);
    businessId = business.body.id;

    const customer = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set(cookie)
      .send({ name: 'Ada Buyer', phone: '08033344455' })
      .expect(201);
    customerId = customer.body.id;

    otherCookie = authHeader(await signInAs());
  });

  afterAll(async () => {
    await app.close();
    await stopAuthHarness();
  });

  describe('products', () => {
    it('creates a product with price and reorder interval', async () => {
      const res = await request(server)
        .post(`/businesses/${businessId}/products`)
        .set(cookie)
        .send({ name: 'Glow Serum', sku: 'GS-001', price: 18000, reorderIntervalDays: 30 })
        .expect(201);
      productId = res.body.id;
      expect(res.body.price).toBe('18000.00');
      expect(res.body.reorderIntervalDays).toBe(30);
      expect(res.body.active).toBe(true);
    });

    it('rejects a duplicate SKU with 409', async () => {
      await request(server)
        .post(`/businesses/${businessId}/products`)
        .set(cookie)
        .send({ name: 'Other Serum', sku: 'GS-001', price: 5000 })
        .expect(409);
    });

    it('rejects a negative price with 400', async () => {
      await request(server)
        .post(`/businesses/${businessId}/products`)
        .set(cookie)
        .send({ name: 'Bad', price: -10 })
        .expect(400);
    });

    it('updates and deactivates a product', async () => {
      const res = await request(server)
        .patch(`/businesses/${businessId}/products/${productId}`)
        .set(cookie)
        .send({ price: 19500.5, active: false })
        .expect(200);
      expect(res.body.price).toBe('19500.50');
      expect(res.body.active).toBe(false);

      await request(server)
        .patch(`/businesses/${businessId}/products/${productId}`)
        .set(cookie)
        .send({ price: 18000, active: true })
        .expect(200);
    });

    it('lists and searches products', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/products?search=glow`)
        .set(cookie)
        .expect(200);
      expect(res.body.items.map((p: { id: string }) => p.id)).toContain(productId);
    });

    it('blocks non-members (404)', async () => {
      await request(server).get(`/businesses/${businessId}/products`).set(otherCookie).expect(404);
    });
  });

  describe('transactions + debt math', () => {
    let unpaidTxId: string;

    it('creates an UNPAID transaction from items and updates customer stats', async () => {
      const res = await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({
          customerId,
          items: [{ productId, quantity: 2, unitPrice: 18000 }],
          amountPaid: 0,
        })
        .expect(201);
      unpaidTxId = res.body.id;
      expect(res.body.amount).toBe('36000.00');
      expect(res.body.amountDue).toBe('36000.00');
      expect(res.body.status).toBe('UNPAID');
      expect(res.body.items[0].description).toBe('Glow Serum');
      expect(res.body.items[0].subtotal).toBe('36000.00');

      const customer = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}`)
        .set(cookie)
        .expect(200);
      expect(customer.body.totalSpend).toBe('36000');
      expect(customer.body.purchaseCount).toBe(1);
      expect(customer.body.lastPurchaseAt).not.toBeNull();
      expect(customer.body.outstandingDebt).toBe('36000.00');
    });

    it('spec case: ₦50,000 sale with ₦30,000 paid → PARTIALLY_PAID, ₦20,000 due', async () => {
      const res = await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({
          customerId,
          items: [{ description: 'Bulk order', quantity: 1, unitPrice: 50000 }],
          amountPaid: 30000,
          paymentMethod: 'TRANSFER',
        })
        .expect(201);
      expect(res.body.status).toBe('PARTIALLY_PAID');
      expect(res.body.amountDue).toBe('20000.00');
      expect(res.body.payments).toHaveLength(1);
      expect(res.body.payments[0].amount).toBe('30000.00');

      const customer = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}`)
        .set(cookie)
        .expect(200);
      expect(customer.body.outstandingDebt).toBe('56000.00'); // 36000 + 20000
      expect(customer.body.totalSpend).toBe('86000');
      expect(customer.body.purchaseCount).toBe(2);
    });

    it('creates a fully PAID transaction', async () => {
      const res = await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({
          customerId,
          items: [{ description: 'Lip gloss', quantity: 3, unitPrice: 2500 }],
          amountPaid: 7500,
          paymentMethod: 'CASH',
        })
        .expect(201);
      expect(res.body.status).toBe('PAID');
      expect(res.body.amountDue).toBe('0.00');
    });

    it('records a partial payment then settles: UNPAID → PARTIALLY_PAID → PAID', async () => {
      const partial = await request(server)
        .post(`/businesses/${businessId}/transactions/${unpaidTxId}/payments`)
        .set(cookie)
        .send({ amount: 16000, method: 'TRANSFER' })
        .expect(200);
      expect(partial.body.status).toBe('PARTIALLY_PAID');
      expect(partial.body.amountDue).toBe('20000.00');

      const settled = await request(server)
        .post(`/businesses/${businessId}/transactions/${unpaidTxId}/payments`)
        .set(cookie)
        .send({ amount: 20000 })
        .expect(200);
      expect(settled.body.status).toBe('PAID');
      expect(settled.body.amountDue).toBe('0.00');
      expect(settled.body.payments).toHaveLength(2);
    });

    it('rejects a payment exceeding the outstanding balance', async () => {
      await request(server)
        .post(`/businesses/${businessId}/transactions/${unpaidTxId}/payments`)
        .set(cookie)
        .send({ amount: 1 })
        .expect(400);
    });

    it('rejects amountPaid > total at creation', async () => {
      await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({
          customerId,
          items: [{ description: 'X', quantity: 1, unitPrice: 100 }],
          amountPaid: 200,
        })
        .expect(400);
    });

    it('cancelling a transaction removes it from stats and debt', async () => {
      const tx = await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({
          customerId,
          items: [{ description: 'Cancelled thing', quantity: 1, unitPrice: 10000 }],
        })
        .expect(201);

      const before = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}`)
        .set(cookie);
      const debtBefore = Number(before.body.outstandingDebt);
      const countBefore = before.body.purchaseCount;

      await request(server)
        .patch(`/businesses/${businessId}/transactions/${tx.body.id}/status`)
        .set(cookie)
        .send({ status: 'CANCELLED' })
        .expect(200);

      const after = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}`)
        .set(cookie);
      expect(Number(after.body.outstandingDebt)).toBe(debtBefore - 10000);
      expect(after.body.purchaseCount).toBe(countBefore - 1);
    });

    it('blocks payments on a cancelled transaction', async () => {
      const tx = await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({ customerId, items: [{ description: 'Y', quantity: 1, unitPrice: 500 }] })
        .expect(201);
      await request(server)
        .patch(`/businesses/${businessId}/transactions/${tx.body.id}/status`)
        .set(cookie)
        .send({ status: 'CANCELLED' })
        .expect(200);
      await request(server)
        .post(`/businesses/${businessId}/transactions/${tx.body.id}/payments`)
        .set(cookie)
        .send({ amount: 500 })
        .expect(400);
    });

    it('lists transactions filtered by customer (transaction history)', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/transactions?customerId=${customerId}`)
        .set(cookie)
        .expect(200);
      expect(res.body.total).toBeGreaterThanOrEqual(5);
      for (const t of res.body.items) expect(t.customerId).toBe(customerId);
    });

    it('writes PURCHASE and DEBT_PAYMENT events to the customer timeline', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}/timeline?pageSize=50`)
        .set(cookie)
        .expect(200);
      const types = res.body.items.map((e: { type: string }) => e.type);
      expect(types).toContain('PURCHASE');
      expect(types).toContain('DEBT_CREATED');
      expect(types).toContain('DEBT_PAYMENT');
    });

    it('rejects a transaction for another business (tenant isolation)', async () => {
      await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(otherCookie)
        .send({ customerId, items: [{ description: 'Z', quantity: 1, unitPrice: 100 }] })
        .expect(404);
    });
  });
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, signInAs, startAuthHarness, stopAuthHarness } from './auth-harness';

describe('Leads + timeline (e2e)', () => {
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
      .send({ name: 'Lead Shop' })
      .expect(201);
    businessId = business.body.id;

    const customer = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set(cookie)
      .send({ name: 'Ada Lead', phone: '08066677788' })
      .expect(201);
    customerId = customer.body.id;

    const product = await request(server)
      .post(`/businesses/${businessId}/products`)
      .set(cookie)
      .send({ name: 'Glow Serum', price: 18000, reorderIntervalDays: 30 })
      .expect(201);
    productId = product.body.id;

    otherCookie = authHeader(await signInAs());
  });

  afterAll(async () => {
    await app.close();
    await stopAuthHarness();
  });

  const base = () => `/businesses/${businessId}/leads`;

  describe('create + update', () => {
    let leadId: string;

    it('creates a product lead with estimated value', async () => {
      const res = await request(server)
        .post(base())
        .set(cookie)
        .send({ customerId, productId, estimatedValue: 18000, notes: 'Asked about price' })
        .expect(201);
      leadId = res.body.id;
      expect(res.body.status).toBe('NEW');
      expect(res.body.productName).toBe('Glow Serum');
      expect(res.body.customerName).toBe('Ada Lead');
      expect(res.body.estimatedValue).toBe('18000.00');
      expect(res.body.closedAt).toBeNull();
    });

    it('creates a description-only lead', async () => {
      const res = await request(server)
        .post(base())
        .set(cookie)
        .send({ customerId, description: 'Custom gift box' })
        .expect(201);
      expect(res.body.productName).toBeNull();
      expect(res.body.description).toBe('Custom gift box');
    });

    it('rejects a lead without product or description', async () => {
      await request(server).post(base()).set(cookie).send({ customerId }).expect(400);
    });

    it('rejects a lead for a customer of another business', async () => {
      await request(server)
        .post(base())
        .set(otherCookie)
        .send({ customerId, description: 'x' })
        .expect(404);
    });

    it('updates lead fields and bumps lastActivityAt', async () => {
      const before = await request(server).get(`${base()}/${leadId}`).set(cookie);
      const res = await request(server)
        .patch(`${base()}/${leadId}`)
        .set(cookie)
        .send({ estimatedValue: 20000, notes: 'Wants two' })
        .expect(200);
      expect(res.body.estimatedValue).toBe('20000.00');
      expect(res.body.notes).toBe('Wants two');
      expect(new Date(res.body.lastActivityAt).getTime()).toBeGreaterThanOrEqual(
        new Date(before.body.lastActivityAt).getTime(),
      );
    });
  });

  describe('status transitions', () => {
    let leadId: string;

    beforeAll(async () => {
      const res = await request(server)
        .post(base())
        .set(cookie)
        .send({ customerId, productId })
        .expect(201);
      leadId = res.body.id;
    });

    it('walks NEW → CONTACTED → QUOTED → WON, setting closedAt at the end', async () => {
      for (const status of ['CONTACTED', 'QUOTED'] as const) {
        const res = await request(server)
          .patch(`${base()}/${leadId}/status`)
          .set(cookie)
          .send({ status })
          .expect(200);
        expect(res.body.status).toBe(status);
        expect(res.body.closedAt).toBeNull();
      }
      const won = await request(server)
        .patch(`${base()}/${leadId}/status`)
        .set(cookie)
        .send({ status: 'WON' })
        .expect(200);
      expect(won.body.status).toBe('WON');
      expect(won.body.closedAt).not.toBeNull();
    });

    it('reopening a WON lead clears closedAt', async () => {
      const res = await request(server)
        .patch(`${base()}/${leadId}/status`)
        .set(cookie)
        .send({ status: 'NEGOTIATING' })
        .expect(200);
      expect(res.body.closedAt).toBeNull();
    });

    it('rejects an invalid status', async () => {
      await request(server)
        .patch(`${base()}/${leadId}/status`)
        .set(cookie)
        .send({ status: 'MAYBE' })
        .expect(400);
    });
  });

  describe('list + filters', () => {
    it('filters by status', async () => {
      const res = await request(server).get(`${base()}?status=NEW`).set(cookie).expect(200);
      for (const lead of res.body.items) expect(lead.status).toBe('NEW');
    });

    it('filters by customer', async () => {
      const res = await request(server)
        .get(`${base()}?customerId=${customerId}`)
        .set(cookie)
        .expect(200);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
      for (const lead of res.body.items) expect(lead.customerId).toBe(customerId);
    });

    it('blocks other users from listing leads (404)', async () => {
      await request(server).get(base()).set(otherCookie).expect(404);
    });
  });

  describe('timeline integration', () => {
    it('shows lead creation, status changes, purchases and payments chronologically', async () => {
      // Add a purchase with partial payment, then settle, so all event kinds exist.
      const tx = await request(server)
        .post(`/businesses/${businessId}/transactions`)
        .set(cookie)
        .send({
          customerId,
          items: [{ productId, quantity: 1, unitPrice: 18000 }],
          amountPaid: 10000,
        })
        .expect(201);
      await request(server)
        .post(`/businesses/${businessId}/transactions/${tx.body.id}/payments`)
        .set(cookie)
        .send({ amount: 8000 })
        .expect(200);

      const res = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}/timeline?pageSize=100`)
        .set(cookie)
        .expect(200);

      const types = res.body.items.map((e: { type: string }) => e.type);
      expect(types).toContain('CUSTOMER_CREATED');
      expect(types).toContain('LEAD_CREATED');
      expect(types).toContain('LEAD_STATUS_CHANGED');
      expect(types).toContain('PURCHASE');
      expect(types).toContain('DEBT_CREATED');
      expect(types).toContain('DEBT_PAYMENT');

      // Strictly newest-first ordering.
      const timestamps = res.body.items.map((e: { occurredAt: string }) =>
        new Date(e.occurredAt).getTime(),
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }

      // The oldest event must be the customer's creation.
      const last = res.body.items[res.body.items.length - 1];
      expect(last.type).toBe('CUSTOMER_CREATED');
    });

    it('lead won event carries a readable title', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/customers/${customerId}/timeline?pageSize=100`)
        .set(cookie)
        .expect(200);
      const wonEvent = res.body.items.find(
        (e: { type: string; title: string }) =>
          e.type === 'LEAD_STATUS_CHANGED' && e.title.includes('won'),
      );
      expect(wonEvent).toBeDefined();
      expect(wonEvent.title).toContain('Glow Serum');
    });
  });
});

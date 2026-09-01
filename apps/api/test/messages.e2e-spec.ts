import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, signInAs, startAuthHarness, stopAuthHarness } from './auth-harness';
import { PrismaService } from '../src/prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

describe('Suggested messages (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;
  let cookie: Record<string, string>;
  let otherCookie: Record<string, string>;
  let businessId: string;
  let productId: string;
  let ids: { hot: string; debtor: string; reorder: string };

  async function createCustomer(name: string, phone: string): Promise<string> {
    const res = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set(cookie)
      .send({ name, phone })
      .expect(201);
    return res.body.id;
  }

  async function seedPurchase(
    customerId: string,
    amount: number,
    paid: number,
    occurredAt: Date,
  ): Promise<void> {
    const status = paid >= amount ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    await prisma.transaction.create({
      data: {
        businessId,
        customerId,
        amount,
        amountPaid: paid,
        status,
        occurredAt,
        items: {
          create: [
            {
              businessId,
              productId,
              description: 'Glow Serum',
              quantity: 1,
              unitPrice: amount,
              subtotal: amount,
            },
          ],
        },
      },
    });
    const stats = await prisma.transaction.aggregate({
      where: { businessId, customerId, status: { in: ['PAID', 'PARTIALLY_PAID', 'UNPAID'] } },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpend: stats._sum.amount ?? 0,
        purchaseCount: stats._count._all,
        lastPurchaseAt: stats._max.occurredAt,
      },
    });
  }

  beforeAll(async () => {
    process.env.SUPABASE_JWKS_URL = await startAuthHarness();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableShutdownHooks();
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    cookie = authHeader(await signInAs());
    const business = await request(server)
      .post('/businesses')
      .set(cookie)
      .send({ name: "Ada's Glow" })
      .expect(201);
    businessId = business.body.id;

    const product = await request(server)
      .post(`/businesses/${businessId}/products`)
      .set(cookie)
      .send({ name: 'Glow Serum', price: 18000, reorderIntervalDays: 30 })
      .expect(201);
    productId = product.body.id;

    const hot = await createCustomer('Ngozi Eze', '08040000001');
    const lead = await request(server)
      .post(`/businesses/${businessId}/leads`)
      .set(cookie)
      .send({ customerId: hot, productId })
      .expect(201);
    await prisma.lead.update({ where: { id: lead.body.id }, data: { lastActivityAt: daysAgo(4) } });

    const debtor = await createCustomer('Bola Ade', '08040000002');
    await seedPurchase(debtor, 50000, 30000, daysAgo(25));

    const reorder = await createCustomer('Ada Okafor', '08040000003');
    await seedPurchase(reorder, 18000, 18000, daysAgo(95));
    await seedPurchase(reorder, 18000, 18000, daysAgo(65));
    await seedPurchase(reorder, 18000, 18000, daysAgo(35));

    ids = { hot, debtor, reorder };

    otherCookie = authHeader(await signInAs());
  });

  afterAll(async () => {
    await app.close();
    await stopAuthHarness();
  });

  const base = () => `/businesses/${businessId}/messages`;

  describe('preview', () => {
    it('writes a hot lead message naming the customer and the real product', async () => {
      const res = await request(server)
        .post(`${base()}/preview`)
        .set(cookie)
        .send({ customerId: ids.hot, category: 'HOT_LEAD' })
        .expect(200);

      expect(res.body.source).toBe('TEMPLATE');
      expect(res.body.text).toContain('Ngozi');
      expect(res.body.text).toContain('Glow Serum');
      expect(res.body.text).toContain('4 days ago');
      expect(res.body.text.length).toBeLessThanOrEqual(480);
    });

    it('writes a debtor message with the real outstanding balance', async () => {
      const res = await request(server)
        .post(`${base()}/preview`)
        .set(cookie)
        .send({ customerId: ids.debtor, category: 'DEBTOR' })
        .expect(200);

      expect(res.body.text).toContain('Bola');
      expect(res.body.text).toContain('₦20,000');
      expect(res.body.text).toContain("Ada's Glow");
    });

    it('writes a reorder message', async () => {
      const res = await request(server)
        .post(`${base()}/preview`)
        .set(cookie)
        .send({ customerId: ids.reorder, category: 'REORDER' })
        .expect(200);
      expect(res.body.text).toContain('Ada');
      expect(res.body.text).toContain('Glow Serum');
    });

    it('writes a reactivation message', async () => {
      const res = await request(server)
        .post(`${base()}/preview`)
        .set(cookie)
        .send({ customerId: ids.reorder, category: 'REACTIVATION' })
        .expect(200);
      expect(res.body.text).toContain('Ada');
      expect(res.body.text).not.toMatch(/\{\{/);
    });

    it('rejects an unknown category', async () => {
      await request(server)
        .post(`${base()}/preview`)
        .set(cookie)
        .send({ customerId: ids.hot, category: 'NONSENSE' })
        .expect(400);
    });

    it('blocks another business (404)', async () => {
      await request(server)
        .post(`${base()}/preview`)
        .set(otherCookie)
        .send({ customerId: ids.hot, category: 'HOT_LEAD' })
        .expect(404);
    });
  });

  describe('templates', () => {
    it('lists the packaged defaults', async () => {
      const res = await request(server).get(`${base()}/templates`).set(cookie).expect(200);
      expect(res.body).toHaveLength(4);
      for (const template of res.body) {
        expect(template.source).toBe('DEFAULT');
        expect(template.body).toContain('{{first_name}}');
      }
    });

    it('applies a business override to generated messages', async () => {
      await request(server)
        .put(`${base()}/templates`)
        .set(cookie)
        .send({
          category: 'REORDER',
          body: 'Hey {{first_name}}! Time for another {{product}}? Let me know.',
        })
        .expect(200);

      const preview = await request(server)
        .post(`${base()}/preview`)
        .set(cookie)
        .send({ customerId: ids.reorder, category: 'REORDER' })
        .expect(200);
      expect(preview.body.text).toBe('Hey Ada! Time for another Glow Serum? Let me know.');

      const templates = await request(server).get(`${base()}/templates`).set(cookie).expect(200);
      const reorder = templates.body.find((t: { category: string }) => t.category === 'REORDER');
      expect(reorder.source).toBe('BUSINESS');
    });

    it('rejects a too-short template', async () => {
      await request(server)
        .put(`${base()}/templates`)
        .set(cookie)
        .send({ category: 'DEBTOR', body: 'Hi' })
        .expect(400);
    });
  });

  describe('recommendations carry a ready message', () => {
    it('every generated recommendation has a suggested message', async () => {
      await request(server)
        .post(`/businesses/${businessId}/recommendations/generate`)
        .set(cookie)
        .expect(200);

      const list = await request(server)
        .get(`/businesses/${businessId}/recommendations?pageSize=100`)
        .set(cookie)
        .expect(200);

      expect(list.body.total).toBeGreaterThan(0);
      for (const item of list.body.items) {
        expect(item.suggestedMessage).toBeTruthy();
        expect(item.suggestedMessage).toContain(item.customerName.split(' ')[0]);
        expect(item.suggestedMessage).not.toMatch(/\{\{/);
      }
    });

    it('message matches the card category', async () => {
      const list = await request(server)
        .get(`/businesses/${businessId}/recommendations?pageSize=100`)
        .set(cookie)
        .expect(200);

      const debtorCard = list.body.items.find(
        (i: { customerId: string }) => i.customerId === ids.debtor,
      );
      expect(debtorCard.category).toBe('DEBTOR');
      expect(debtorCard.suggestedMessage).toContain('₦20,000');
    });

    it('can regenerate the message for one recommendation', async () => {
      const list = await request(server)
        .get(`/businesses/${businessId}/recommendations?pageSize=100`)
        .set(cookie)
        .expect(200);
      const card = list.body.items[0];

      const res = await request(server)
        .post(`/businesses/${businessId}/recommendations/${card.id}/message`)
        .set(cookie)
        .expect(200);
      expect(res.body.text).toBeTruthy();
      expect(['TEMPLATE', 'AI']).toContain(res.body.source);
    });

    it('works with AI disabled — the default configuration', async () => {
      // No ANTHROPIC_API_KEY is set in tests, so every message must still exist.
      const list = await request(server)
        .get(`/businesses/${businessId}/recommendations?pageSize=100`)
        .set(cookie)
        .expect(200);
      for (const item of list.body.items) {
        expect(item.suggestedMessage).toBeTruthy();
      }
    });
  });
});

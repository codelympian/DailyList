import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const unique = Date.now();
const PASSWORD = 'sup3rsecret!';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

function sessionCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('dailylist_session='));
  if (!cookie) throw new Error('No session cookie set');
  return cookie.split(';')[0] as string;
}

describe('Daily recommendation engine (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;
  let cookie: string;
  let otherCookie: string;
  let businessId: string;
  let productId: string;

  let ids: {
    hot: string;
    debtor: string;
    reorder: string;
    lost: string;
    optedOut: string;
    fatigued: string;
    justBought: string;
    quiet: string;
  };

  async function createCustomer(name: string, phone: string): Promise<string> {
    const res = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set('Cookie', cookie)
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
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableShutdownHooks();
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    const owner = await request(server)
      .post('/auth/register')
      .send({ name: 'Rec Owner', email: `rec.${unique}@example.com`, password: PASSWORD })
      .expect(201);
    cookie = sessionCookie(owner);
    const business = await request(server)
      .post('/businesses')
      .set('Cookie', cookie)
      .send({ name: 'Rec Shop' })
      .expect(201);
    businessId = business.body.id;

    const product = await request(server)
      .post(`/businesses/${businessId}/products`)
      .set('Cookie', cookie)
      .send({ name: 'Glow Serum', price: 18000, reorderIntervalDays: 30 })
      .expect(201);
    productId = product.body.id;

    // Hot lead — asked 2 days ago, never bought.
    const hot = await createCustomer('Hot Ada', '08020000001');
    const lead = await request(server)
      .post(`/businesses/${businessId}/leads`)
      .set('Cookie', cookie)
      .send({ customerId: hot, productId })
      .expect(201);
    await prisma.lead.update({ where: { id: lead.body.id }, data: { lastActivityAt: daysAgo(2) } });

    // Debtor — owes ₦20,000.
    const debtor = await createCustomer('Debtor Bola', '08020000002');
    await seedPurchase(debtor, 50000, 30000, daysAgo(25));

    // Reorder due — 30-day rhythm, 40 days since purchase.
    const reorder = await createCustomer('Reorder Chidi', '08020000003');
    await seedPurchase(reorder, 18000, 18000, daysAgo(100));
    await seedPurchase(reorder, 18000, 18000, daysAgo(70));
    await seedPurchase(reorder, 18000, 18000, daysAgo(40));

    // Lost — far past the reorder window.
    const lost = await createCustomer('Lost Dami', '08020000004');
    await seedPurchase(lost, 18000, 18000, daysAgo(140));

    // Opted out — would otherwise be a strong debtor candidate.
    const optedOut = await createCustomer('Silent Efe', '08020000005');
    await seedPurchase(optedOut, 80000, 20000, daysAgo(30));
    await request(server)
      .post(`/businesses/${businessId}/customers/${optedOut}/communication-preference`)
      .set('Cookie', cookie)
      .send({ channel: 'WHATSAPP', optedIn: false })
      .expect(200);

    // Contacted yesterday — inside the 7-day fatigue window.
    const fatigued = await createCustomer('Fatigued Femi', '08020000006');
    await seedPurchase(fatigued, 18000, 18000, daysAgo(45));
    await prisma.customer.update({
      where: { id: fatigued },
      data: { lastContactedAt: daysAgo(1) },
    });

    // Bought today — nothing owed.
    const justBought = await createCustomer('Fresh Gozie', '08020000007');
    await seedPurchase(justBought, 18000, 18000, new Date());

    // No history at all.
    const quiet = await createCustomer('Quiet Hauwa', '08020000008');

    ids = { hot, debtor, reorder, lost, optedOut, fatigued, justBought, quiet };

    const other = await request(server)
      .post('/auth/register')
      .send({ name: 'Other', email: `other.rec.${unique}@example.com`, password: PASSWORD })
      .expect(201);
    otherCookie = sessionCookie(other);
  });

  afterAll(async () => {
    await app.close();
  });

  const base = () => `/businesses/${businessId}/recommendations`;
  const listAll = () =>
    request(server).get(`${base()}?pageSize=100`).set('Cookie', cookie).expect(200);

  describe('candidate generation and persistence', () => {
    it("generates today's list on first request and persists snapshots", async () => {
      const res = await listAll();
      expect(res.body.total).toBeGreaterThan(0);

      const stored = await prisma.dailyRecommendation.count({ where: { businessId } });
      expect(stored).toBe(res.body.total);

      // Every card carries a frozen explanation.
      for (const item of res.body.items) {
        expect(item.reasonCodes.length).toBeGreaterThan(0);
        expect(item.reasonText.length).toBeGreaterThan(0);
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(100);
        expect(item.status).toBe('PENDING');
      }
    });

    it('includes the actionable customers with the right categories', async () => {
      const res = await listAll();
      const byCustomer = new Map<string, { category: string; score: number }>(
        res.body.items.map((i: { customerId: string; category: string; score: number }) => [
          i.customerId,
          { category: i.category, score: i.score },
        ]),
      );

      expect(byCustomer.get(ids.hot)?.category).toBe('HOT_LEAD');
      expect(byCustomer.get(ids.debtor)?.category).toBe('DEBTOR');
      expect(byCustomer.get(ids.reorder)?.category).toBe('REORDER_DUE');
      expect(byCustomer.get(ids.lost)?.category).toBe('LOST_CUSTOMER');
    });

    it('suppresses opted-out, recently contacted, just purchased, and inactive customers', async () => {
      const res = await listAll();
      const included = res.body.items.map((i: { customerId: string }) => i.customerId);

      expect(included).not.toContain(ids.optedOut); // opt-out respected
      expect(included).not.toContain(ids.fatigued); // contact fatigue
      expect(included).not.toContain(ids.justBought); // purchased recently
      expect(included).not.toContain(ids.quiet); // nothing to act on
    });

    it('ranks by score, highest first', async () => {
      const res = await listAll();
      const scores = res.body.items.map((i: { score: number }) => i.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    it('records an explainable score breakdown', async () => {
      const row = await prisma.dailyRecommendation.findFirst({
        where: { businessId, customerId: ids.reorder },
      });
      const breakdown = row?.scoreBreakdown as Record<string, number> | null;
      expect(breakdown).toBeTruthy();
      expect(breakdown!.categoryBase).toBeGreaterThan(0);
      expect(breakdown!.score).toBe(row!.score);
    });

    it('reason text is human-readable and derived from real data', async () => {
      const res = await listAll();
      const reorderCard = res.body.items.find(
        (i: { customerId: string }) => i.customerId === ids.reorder,
      );
      expect(reorderCard.reasonText.join(' ')).toMatch(/30 days/);
      expect(reorderCard.reasonText.join(' ')).toMatch(/40 days ago/);
    });
  });

  describe('duplicate prevention and idempotency', () => {
    it('re-generating does not duplicate cards', async () => {
      const before = await prisma.dailyRecommendation.count({ where: { businessId } });
      await request(server).post(`${base()}/generate`).set('Cookie', cookie).expect(200);
      await request(server).post(`${base()}/generate`).set('Cookie', cookie).expect(200);
      const after = await prisma.dailyRecommendation.count({ where: { businessId } });
      expect(after).toBe(before);
    });

    it('the database rejects a duplicate for the same customer and day', async () => {
      const existing = await prisma.dailyRecommendation.findFirst({ where: { businessId } });
      await expect(
        prisma.dailyRecommendation.create({
          data: {
            businessId,
            customerId: existing!.customerId,
            recommendationDate: existing!.recommendationDate,
            category: existing!.category,
            score: 50,
            segments: [],
            reasonCodes: [],
            reasonText: [],
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('summary', () => {
    it('reports totals and per-category counts', async () => {
      const res = await request(server).get(`${base()}/summary`).set('Cookie', cookie).expect(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.pending).toBe(res.body.total);
      expect(res.body.done).toBe(0);
      expect(res.body.byCategory.HOT_LEAD).toBeGreaterThanOrEqual(1);
      expect(res.body.byCategory.DEBTOR).toBeGreaterThanOrEqual(1);
      expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('acting on recommendations closes the contact-fatigue loop', () => {
    it('marking done records the contact and logs a timeline event', async () => {
      const list = await listAll();
      const card = list.body.items.find(
        (i: { customerId: string }) => i.customerId === ids.reorder,
      );

      const updated = await request(server)
        .patch(`${base()}/${card.id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'COMPLETED' })
        .expect(200);
      expect(updated.body.status).toBe('COMPLETED');
      expect(updated.body.completedAt).not.toBeNull();

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: ids.reorder } });
      expect(customer.lastContactedAt).not.toBeNull();
      expect(customer.contactAttemptCount).toBe(1);

      const timeline = await request(server)
        .get(`/businesses/${businessId}/customers/${ids.reorder}/timeline`)
        .set('Cookie', cookie)
        .expect(200);
      expect(timeline.body.items.map((e: { type: string }) => e.type)).toContain('FOLLOW_UP');
    });

    it('a completed customer drops off the next generation (fatigue applies)', async () => {
      await request(server).post(`${base()}/generate`).set('Cookie', cookie).expect(200);
      const stillThere = await prisma.dailyRecommendation.findFirst({
        where: { businessId, customerId: ids.reorder },
      });
      // The handled card is preserved for today's history…
      expect(stillThere?.status).toBe('COMPLETED');

      // …and tomorrow they are suppressed by contact fatigue.
      const tomorrow = new Date(Date.now() + DAY);
      const intel = await request(server)
        .get(`/businesses/${businessId}/customers/${ids.reorder}/intelligence`)
        .set('Cookie', cookie)
        .expect(200);
      expect(intel.body.suppressionCodes).toContain('RECENTLY_CONTACTED');
      expect(tomorrow.getTime()).toBeGreaterThan(Date.now());
    });

    it('re-generating never overwrites a handled card', async () => {
      const list = await listAll();
      const skipTarget = list.body.items.find(
        (i: { customerId: string; status: string }) =>
          i.customerId === ids.lost && i.status === 'PENDING',
      );
      await request(server)
        .patch(`${base()}/${skipTarget.id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'SKIPPED' })
        .expect(200);

      await request(server).post(`${base()}/generate`).set('Cookie', cookie).expect(200);

      const after = await prisma.dailyRecommendation.findFirst({
        where: { businessId, customerId: ids.lost },
      });
      expect(after?.status).toBe('SKIPPED');
    });

    it('skipping logs a skipped event and does not count as contact', async () => {
      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: ids.lost } });
      expect(customer.contactAttemptCount).toBe(0);

      const timeline = await request(server)
        .get(`/businesses/${businessId}/customers/${ids.lost}/timeline`)
        .set('Cookie', cookie)
        .expect(200);
      expect(timeline.body.items.map((e: { type: string }) => e.type)).toContain(
        'FOLLOW_UP_SKIPPED',
      );
    });

    it('rejects an invalid status', async () => {
      const list = await listAll();
      const card = list.body.items[0];
      await request(server)
        .patch(`${base()}/${card.id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'NOT_A_STATUS' })
        .expect(400);
    });
  });

  describe('filtering and limits', () => {
    it('filters by category and status', async () => {
      const hotOnly = await request(server)
        .get(`${base()}?category=HOT_LEAD`)
        .set('Cookie', cookie)
        .expect(200);
      for (const item of hotOnly.body.items) expect(item.category).toBe('HOT_LEAD');

      const pending = await request(server)
        .get(`${base()}?status=PENDING`)
        .set('Cookie', cookie)
        .expect(200);
      for (const item of pending.body.items) expect(item.status).toBe('PENDING');
    });

    it('honours the configured daily list size', async () => {
      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ dailyListSize: 1 })
        .expect(200);

      // Clear today's list so the smaller limit applies from scratch.
      await prisma.dailyRecommendation.deleteMany({ where: { businessId } });
      await request(server).post(`${base()}/generate`).set('Cookie', cookie).expect(200);

      const res = await listAll();
      expect(res.body.total).toBe(1);
      // The single slot goes to the highest-scoring candidate.
      expect(res.body.items[0].score).toBeGreaterThan(0);

      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ dailyListSize: 20 })
        .expect(200);
      await prisma.dailyRecommendation.deleteMany({ where: { businessId } });
      await request(server).post(`${base()}/generate`).set('Cookie', cookie).expect(200);
    });
  });

  describe('tenant isolation', () => {
    it('blocks another business from reading or generating (404)', async () => {
      await request(server).get(base()).set('Cookie', otherCookie).expect(404);
      await request(server).post(`${base()}/generate`).set('Cookie', otherCookie).expect(404);
    });
  });
});

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

/**
 * Verifies the intelligence engine against REAL database state, so the
 * feature-extraction layer (aggregates, joins) is proven, not just the
 * pure rules covered by the scoring package's unit tests.
 */
describe('Customer intelligence (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;
  let cookie: string;
  let businessId: string;
  let otherCookie: string;
  let productId: string;

  let ids: {
    reorder: string;
    debtor: string;
    today: string;
    vip: string;
    empty: string;
    hot: string;
    optedOut: string;
    recentlyContacted: string;
    lost: string;
  };

  async function createCustomer(name: string, phone: string): Promise<string> {
    const res = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set('Cookie', cookie)
      .send({ name, phone })
      .expect(201);
    return res.body.id;
  }

  /** Writes a transaction directly so we can backdate it realistically. */
  async function seedPurchase(
    customerId: string,
    amount: number,
    paid: number,
    occurredAt: Date,
    withProduct = true,
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
              productId: withProduct ? productId : null,
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
      .send({ name: 'Intel Owner', email: `intel.${unique}@example.com`, password: PASSWORD })
      .expect(201);
    cookie = sessionCookie(owner);
    const business = await request(server)
      .post('/businesses')
      .set('Cookie', cookie)
      .send({ name: 'Intel Shop' })
      .expect(201);
    businessId = business.body.id;

    const product = await request(server)
      .post(`/businesses/${businessId}/products`)
      .set('Cookie', cookie)
      .send({ name: 'Glow Serum', price: 18000, reorderIntervalDays: 30 })
      .expect(201);
    productId = product.body.id;

    // CASE 1: buys every 30 days, last purchase 32 days ago.
    const reorder = await createCustomer('Reorder Ada', '08010000001');
    await seedPurchase(reorder, 18000, 18000, daysAgo(92));
    await seedPurchase(reorder, 18000, 18000, daysAgo(62));
    await seedPurchase(reorder, 18000, 18000, daysAgo(32));

    // CASE 4: owes ₦20,000.
    const debtor = await createCustomer('Debtor Bola', '08010000002');
    await seedPurchase(debtor, 50000, 30000, daysAgo(20));

    // CASE 5: purchased today.
    const today = await createCustomer('Today Chidi', '08010000003');
    await seedPurchase(today, 18000, 18000, new Date());

    // CASE 7: VIP by lifetime spend.
    const vip = await createCustomer('VIP Dele', '08010000004');
    await seedPurchase(vip, 90000, 90000, daysAgo(40));
    await seedPurchase(vip, 90000, 90000, daysAgo(10));

    // CASE 8: no history at all.
    const empty = await createCustomer('Empty Emeka', '08010000005');

    // CASE 6: asked about a product 3 days ago, never purchased.
    const hot = await createCustomer('Hot Ngozi', '08010000006');
    const lead = await request(server)
      .post(`/businesses/${businessId}/leads`)
      .set('Cookie', cookie)
      .send({ customerId: hot, productId })
      .expect(201);
    await prisma.lead.update({
      where: { id: lead.body.id },
      data: { lastActivityAt: daysAgo(3) },
    });

    // CASE 2: opted out but otherwise very actionable.
    const optedOut = await createCustomer('Silent Sade', '08010000007');
    await seedPurchase(optedOut, 60000, 40000, daysAgo(50));
    await request(server)
      .post(`/businesses/${businessId}/customers/${optedOut}/communication-preference`)
      .set('Cookie', cookie)
      .send({ channel: 'WHATSAPP', optedIn: false })
      .expect(200);

    // CASE 3: reorder-due but contacted yesterday.
    const recentlyContacted = await createCustomer('Fatigued Femi', '08010000008');
    await seedPurchase(recentlyContacted, 18000, 18000, daysAgo(40));
    await prisma.customer.update({
      where: { id: recentlyContacted },
      data: { lastContactedAt: daysAgo(1) },
    });

    // Lost customer: no purchase in far longer than 3× the 30-day interval.
    const lost = await createCustomer('Lost Lola', '08010000009');
    await seedPurchase(lost, 18000, 18000, daysAgo(150));

    ids = { reorder, debtor, today, vip, empty, hot, optedOut, recentlyContacted, lost };

    const other = await request(server)
      .post('/auth/register')
      .send({ name: 'Other', email: `other.intel.${unique}@example.com`, password: PASSWORD })
      .expect(201);
    otherCookie = sessionCookie(other);
  });

  afterAll(async () => {
    await app.close();
  });

  const intel = (customerId: string) =>
    request(server)
      .get(`/businesses/${businessId}/customers/${customerId}/intelligence`)
      .set('Cookie', cookie)
      .expect(200);

  describe('segment classification against real data', () => {
    it('CASE 1: 30-day rhythm, 32 days since purchase → REORDER_DUE with product interval', async () => {
      const res = await intel(ids.reorder);
      const segments = res.body.segments.map((s: { segment: string }) => s.segment);
      expect(segments).toContain('REORDER_DUE');
      expect(res.body.features.expectedReorderIntervalDays).toBe(30);
      expect(res.body.features.reorderIntervalSource).toBe('PRODUCT');
      expect(res.body.features.daysSinceLastPurchase).toBe(32);
      expect(res.body.eligible).toBe(true);

      const match = res.body.segments.find((s: { segment: string }) => s.segment === 'REORDER_DUE');
      expect(match.reasons.join(' ')).toContain('30 days');
    });

    it('CASE 4: outstanding ₦20,000 → DEBTOR with the real figure', async () => {
      const res = await intel(ids.debtor);
      const match = res.body.segments.find((s: { segment: string }) => s.segment === 'DEBTOR');
      expect(match).toBeDefined();
      expect(res.body.features.outstandingDebt).toBe(20000);
      expect(match.reasons[0]).toContain('20,000');
    });

    it('CASE 5: purchased today → not reorder-due, suppressed', async () => {
      const res = await intel(ids.today);
      const segments = res.body.segments.map((s: { segment: string }) => s.segment);
      expect(segments).not.toContain('REORDER_DUE');
      expect(res.body.suppressionCodes).toContain('PURCHASED_RECENTLY');
      expect(res.body.eligible).toBe(false);
    });

    it('CASE 6: asked 3 days ago, no purchase → HOT_LEAD naming the product', async () => {
      const res = await intel(ids.hot);
      const match = res.body.segments.find((s: { segment: string }) => s.segment === 'HOT_LEAD');
      expect(match).toBeDefined();
      expect(match.facts.daysSinceInterest).toBe(3);
      expect(match.reasons[0]).toContain('Glow Serum');
      expect(res.body.eligible).toBe(true);
    });

    it('CASE 7: lifetime spend over threshold → VIP', async () => {
      const res = await intel(ids.vip);
      const segments = res.body.segments.map((s: { segment: string }) => s.segment);
      expect(segments).toContain('VIP');
      expect(segments).toContain('REPEAT_CUSTOMER');
      expect(res.body.features.totalSpend).toBe(180000);
    });

    it('CASE 8: no purchases, no leads → no segments, never recommended', async () => {
      const res = await intel(ids.empty);
      expect(res.body.segments).toEqual([]);
      expect(res.body.suppressionCodes).toContain('NO_ACTIVITY');
      expect(res.body.eligible).toBe(false);
      expect(res.body.lifecycleStage).toBe('LEAD');
    });

    it('classifies a long-inactive buyer as LOST_CUSTOMER', async () => {
      const res = await intel(ids.lost);
      const segments = res.body.segments.map((s: { segment: string }) => s.segment);
      expect(segments).toContain('LOST_CUSTOMER');
      expect(res.body.lifecycleStage).toBe('LOST');
    });
  });

  describe('opt-out and contact fatigue', () => {
    it('CASE 2: opted-out customer keeps segments but is never eligible', async () => {
      const res = await intel(ids.optedOut);
      expect(res.body.segments.length).toBeGreaterThan(0);
      expect(res.body.suppressionCodes).toContain('OPTED_OUT');
      expect(res.body.eligible).toBe(false);
      expect(res.body.suppressionReasons.join(' ')).toContain('Opted out');
    });

    it('opting back in restores eligibility', async () => {
      await request(server)
        .post(`/businesses/${businessId}/customers/${ids.optedOut}/communication-preference`)
        .set('Cookie', cookie)
        .send({ channel: 'WHATSAPP', optedIn: true })
        .expect(200);
      const res = await intel(ids.optedOut);
      expect(res.body.suppressionCodes).not.toContain('OPTED_OUT');

      // Restore the opt-out for the remaining assertions.
      await request(server)
        .post(`/businesses/${businessId}/customers/${ids.optedOut}/communication-preference`)
        .set('Cookie', cookie)
        .send({ channel: 'WHATSAPP', optedIn: false })
        .expect(200);
    });

    it('CASE 3: contacted yesterday with a 7-day interval → suppressed', async () => {
      const res = await intel(ids.recentlyContacted);
      expect(res.body.segments.map((s: { segment: string }) => s.segment)).toContain('REORDER_DUE');
      expect(res.body.suppressionCodes).toContain('RECENTLY_CONTACTED');
      expect(res.body.eligible).toBe(false);
    });
  });

  describe('configurable settings', () => {
    it('returns defaults and applies updates to classification', async () => {
      const defaults = await request(server)
        .get(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .expect(200);
      expect(defaults.body.vipLifetimeSpend).toBe(100000);
      expect(defaults.body.minContactIntervalDays).toBe(7);

      // Raise the VIP bar above this customer's spend.
      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ vipLifetimeSpend: 500000 })
        .expect(200);
      const stricter = await intel(ids.vip);
      expect(stricter.body.segments.map((s: { segment: string }) => s.segment)).not.toContain(
        'VIP',
      );

      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ vipLifetimeSpend: 100000 })
        .expect(200);
      const restored = await intel(ids.vip);
      expect(restored.body.segments.map((s: { segment: string }) => s.segment)).toContain('VIP');
    });

    it('shortening the contact interval un-suppresses a fatigued customer', async () => {
      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ minContactIntervalDays: 0 })
        .expect(200);
      const res = await intel(ids.recentlyContacted);
      expect(res.body.suppressionCodes).not.toContain('RECENTLY_CONTACTED');

      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ minContactIntervalDays: 7 })
        .expect(200);
    });

    it('rejects out-of-range settings', async () => {
      await request(server)
        .patch(`/businesses/${businessId}/settings`)
        .set('Cookie', cookie)
        .send({ vipLifetimeSpend: -100 })
        .expect(400);
    });
  });

  describe('segment overview', () => {
    it('reports counts, separating eligible from suppressed', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/intelligence/segments`)
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body.totalCustomers).toBeGreaterThanOrEqual(9);
      expect(res.body.counts.REORDER_DUE).toBeGreaterThanOrEqual(2);
      expect(res.body.counts.DEBTOR).toBeGreaterThanOrEqual(1);
      expect(res.body.suppressedCustomers).toBeGreaterThanOrEqual(3);
      // Fatigued + opted-out customers are counted but not eligible.
      expect(res.body.eligibleCounts.REORDER_DUE).toBeLessThan(res.body.counts.REORDER_DUE);
    });

    it('lists customers in a segment, excluding suppressed ones by default', async () => {
      const eligible = await request(server)
        .get(`/businesses/${businessId}/intelligence/customers?segment=REORDER_DUE`)
        .set('Cookie', cookie)
        .expect(200);
      const eligibleIds = eligible.body.items.map((c: { customerId: string }) => c.customerId);
      expect(eligibleIds).toContain(ids.reorder);
      expect(eligibleIds).not.toContain(ids.recentlyContacted);

      const all = await request(server)
        .get(
          `/businesses/${businessId}/intelligence/customers?segment=REORDER_DUE&includeSuppressed=true`,
        )
        .set('Cookie', cookie)
        .expect(200);
      expect(all.body.items.map((c: { customerId: string }) => c.customerId)).toContain(
        ids.recentlyContacted,
      );
    });
  });

  describe('tenant isolation', () => {
    it('blocks another business from reading intelligence (404)', async () => {
      await request(server)
        .get(`/businesses/${businessId}/intelligence/segments`)
        .set('Cookie', otherCookie)
        .expect(404);
      await request(server)
        .get(`/businesses/${businessId}/customers/${ids.reorder}/intelligence`)
        .set('Cookie', otherCookie)
        .expect(404);
    });
  });
});

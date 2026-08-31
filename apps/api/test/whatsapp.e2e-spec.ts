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

describe('WhatsApp quick send (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;
  let cookie: string;
  let otherCookie: string;
  let businessId: string;
  let withPhone: string;
  let withoutPhone: string;

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
      .send({ name: 'Wa Owner', email: `wa.${unique}@example.com`, password: PASSWORD })
      .expect(201);
    cookie = sessionCookie(owner);
    const business = await request(server)
      .post('/businesses')
      .set('Cookie', cookie)
      .send({ name: "Ada's Glow" })
      .expect(201);
    businessId = business.body.id;

    const product = await request(server)
      .post(`/businesses/${businessId}/products`)
      .set('Cookie', cookie)
      .send({ name: 'Glow Serum', price: 18000, reorderIntervalDays: 30 })
      .expect(201);

    // A customer who is reorder-due, so a recommendation exists for them.
    const customer = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set('Cookie', cookie)
      .send({ name: 'Ada Okafor', phone: '0801 234 5678' })
      .expect(201);
    withPhone = customer.body.id;

    for (const days of [95, 65, 35]) {
      await prisma.transaction.create({
        data: {
          businessId,
          customerId: withPhone,
          amount: 18000,
          amountPaid: 18000,
          status: 'PAID',
          occurredAt: daysAgo(days),
          items: {
            create: [
              {
                businessId,
                productId: product.body.id,
                description: 'Glow Serum',
                quantity: 1,
                unitPrice: 18000,
                subtotal: 18000,
              },
            ],
          },
        },
      });
    }
    await prisma.customer.update({
      where: { id: withPhone },
      data: { totalSpend: 54000, purchaseCount: 3, lastPurchaseAt: daysAgo(35) },
    });

    const noPhone = await request(server)
      .post(`/businesses/${businessId}/customers`)
      .set('Cookie', cookie)
      .send({ name: 'No Phone Ngozi' })
      .expect(201);
    withoutPhone = noPhone.body.id;

    const other = await request(server)
      .post('/auth/register')
      .send({ name: 'Other', email: `other.wa.${unique}@example.com`, password: PASSWORD })
      .expect(201);
    otherCookie = sessionCookie(other);
  });

  afterAll(async () => {
    await app.close();
  });

  const linkFor = (customerId: string, recommendationId?: string) =>
    request(server)
      .get(
        `/businesses/${businessId}/customers/${customerId}/whatsapp-link` +
          (recommendationId ? `?recommendationId=${recommendationId}` : ''),
      )
      .set('Cookie', cookie);

  describe('link generation', () => {
    it('builds a wa.me link with the normalized number and encoded message', async () => {
      const res = await linkFor(withPhone).expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.phone).toBe('+2348012345678');
      expect(res.body.url).toContain('https://wa.me/2348012345678?text=');
      expect(res.body.url).not.toContain('+234');
      expect(res.body.url).not.toContain(' ');

      // The prefilled text must survive the round trip exactly.
      const url = new URL(res.body.url);
      expect(url.searchParams.get('text')).toBe(res.body.body);
      expect(res.body.body).toContain('Ada');
    });

    it('uses the recommendation message when one is given', async () => {
      await request(server)
        .post(`/businesses/${businessId}/recommendations/generate`)
        .set('Cookie', cookie)
        .expect(200);
      const list = await request(server)
        .get(`/businesses/${businessId}/recommendations?pageSize=50`)
        .set('Cookie', cookie)
        .expect(200);
      const card = list.body.items.find((i: { customerId: string }) => i.customerId === withPhone);
      expect(card).toBeDefined();

      const res = await linkFor(withPhone, card.id).expect(200);
      expect(res.body.body).toBe(card.suggestedMessage);
      expect(new URL(res.body.url).searchParams.get('text')).toBe(card.suggestedMessage);
    });

    it('reports a customer with no phone number instead of a broken link', async () => {
      const res = await linkFor(withoutPhone).expect(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.url).toBeNull();
      expect(res.body.error).toContain('no phone number');
    });

    it('blocks another business (404)', async () => {
      await request(server)
        .get(`/businesses/${businessId}/customers/${withPhone}/whatsapp-link`)
        .set('Cookie', otherCookie)
        .expect(404);
    });
  });

  describe('recording the send action', () => {
    let recommendationId: string;
    let messageBody: string;

    beforeAll(async () => {
      const list = await request(server)
        .get(`/businesses/${businessId}/recommendations?pageSize=50`)
        .set('Cookie', cookie)
        .expect(200);
      const card = list.body.items.find((i: { customerId: string }) => i.customerId === withPhone);
      recommendationId = card.id;
      messageBody = card.suggestedMessage;
    });

    it('records opening WhatsApp and marks the card contacted', async () => {
      const res = await request(server)
        .post(`/businesses/${businessId}/messages`)
        .set('Cookie', cookie)
        .send({
          customerId: withPhone,
          recommendationId,
          action: 'WHATSAPP_OPENED',
          body: messageBody,
        })
        .expect(201);

      expect(res.body.action).toBe('WHATSAPP_OPENED');
      expect(res.body.id).toBeTruthy();

      const stored = await prisma.message.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(stored.body).toBe(messageBody);
      expect(stored.toPhone).toBe('+2348012345678');
      expect(stored.channel).toBe('WHATSAPP');

      const card = await prisma.dailyRecommendation.findUniqueOrThrow({
        where: { id: recommendationId },
      });
      expect(card.status).toBe('CONTACTED');
    });

    it('updates contact fatigue so the customer drops off upcoming lists', async () => {
      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: withPhone } });
      expect(customer.lastContactedAt).not.toBeNull();
      expect(customer.contactAttemptCount).toBeGreaterThanOrEqual(1);

      const intelligence = await request(server)
        .get(`/businesses/${businessId}/customers/${withPhone}/intelligence`)
        .set('Cookie', cookie)
        .expect(200);
      expect(intelligence.body.suppressionCodes).toContain('RECENTLY_CONTACTED');
      expect(intelligence.body.eligible).toBe(false);
    });

    it('logs a timeline event that claims only what we know', async () => {
      const timeline = await request(server)
        .get(`/businesses/${businessId}/customers/${withPhone}/timeline?pageSize=50`)
        .set('Cookie', cookie)
        .expect(200);

      const event = timeline.body.items.find((e: { type: string }) => e.type === 'MESSAGE_SENT');
      expect(event).toBeDefined();
      expect(event.title).toBe('Opened WhatsApp to contact this customer');
      // No delivery, read or reply claim anywhere in the timeline.
      const allText = JSON.stringify(timeline.body).toLowerCase();
      expect(allText).not.toMatch(/\bdelivered\b|\bread receipt\b|\bseen by\b|\breplied\b/);
    });

    it('records a copy without counting it as contact', async () => {
      const before = await prisma.customer.findUniqueOrThrow({ where: { id: withPhone } });

      const res = await request(server)
        .post(`/businesses/${businessId}/messages`)
        .set('Cookie', cookie)
        .send({ customerId: withPhone, action: 'COPIED', body: messageBody })
        .expect(201);
      expect(res.body.action).toBe('COPIED');

      const after = await prisma.customer.findUniqueOrThrow({ where: { id: withPhone } });
      expect(after.contactAttemptCount).toBe(before.contactAttemptCount);
      expect(after.lastContactedAt).toEqual(before.lastContactedAt);
    });

    it('exposes contact history without any delivery status', async () => {
      const res = await request(server)
        .get(`/businesses/${businessId}/customers/${withPhone}/messages`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
      for (const message of res.body) {
        expect(['WHATSAPP_OPENED', 'COPIED']).toContain(message.action);
        expect(message).not.toHaveProperty('delivered');
        expect(message).not.toHaveProperty('read');
        expect(message).not.toHaveProperty('status');
      }
    });

    it('rejects an unknown action', async () => {
      await request(server)
        .post(`/businesses/${businessId}/messages`)
        .set('Cookie', cookie)
        .send({ customerId: withPhone, action: 'DELIVERED', body: 'hi' })
        .expect(400);
    });

    it('rejects an empty body', async () => {
      await request(server)
        .post(`/businesses/${businessId}/messages`)
        .set('Cookie', cookie)
        .send({ customerId: withPhone, action: 'COPIED', body: '  ' })
        .expect(400);
    });

    it('blocks recording against another business (404)', async () => {
      await request(server)
        .post(`/businesses/${businessId}/messages`)
        .set('Cookie', otherCookie)
        .send({ customerId: withPhone, action: 'WHATSAPP_OPENED', body: 'hi' })
        .expect(404);
    });
  });
});

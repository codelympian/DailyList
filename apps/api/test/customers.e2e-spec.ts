import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authHeader, signInAs, startAuthHarness, stopAuthHarness } from './auth-harness';

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let ownerCookie: Record<string, string>;
  let businessId: string;
  let otherCookie: Record<string, string>;
  let otherBusinessId: string;

  beforeAll(async () => {
    process.env.SUPABASE_JWKS_URL = await startAuthHarness();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableShutdownHooks();
    await app.init();
    server = app.getHttpServer();

    ownerCookie = authHeader(await signInAs());
    const business = await request(server)
      .post('/businesses')
      .set(ownerCookie)
      .send({ name: 'Chidi Cosmetics' })
      .expect(201);
    businessId = business.body.id;

    otherCookie = authHeader(await signInAs());
    const otherBusiness = await request(server)
      .post('/businesses')
      .set(otherCookie)
      .send({ name: 'Femi Fashion' })
      .expect(201);
    otherBusinessId = otherBusiness.body.id;
  });

  afterAll(async () => {
    await app.close();
    await stopAuthHarness();
  });

  const base = () => `/businesses/${businessId}/customers`;

  describe('create + phone normalization + duplicates', () => {
    let adaId: string;

    it('creates a customer and normalizes the Nigerian phone to E.164', async () => {
      const res = await request(server)
        .post(base())
        .set(ownerCookie)
        .send({
          name: 'Ada Okafor',
          phone: '0801 234 5678',
          email: 'Ada@Example.com',
          notes: 'Asked about Glow Serum',
        })
        .expect(201);

      adaId = res.body.id;
      expect(res.body.phone).toBe('+2348012345678');
      expect(res.body.email).toBe('ada@example.com');
      expect(res.body.identities).toHaveLength(2);
      const types = res.body.identities.map((i: { type: string }) => i.type).sort();
      expect(types).toEqual(['EMAIL', 'PHONE']);
    });

    it('rejects an invalid phone with 400', async () => {
      await request(server)
        .post(base())
        .set(ownerCookie)
        .send({ name: 'Bad Phone', phone: '12345' })
        .expect(400);
    });

    it('detects a duplicate phone (different formatting) with 409 + existing customer', async () => {
      const res = await request(server)
        .post(base())
        .set(ownerCookie)
        .send({ name: 'Ada Duplicate', phone: '+234-801-234-5678' })
        .expect(409);
      expect(res.body.duplicate.customerId).toBe(adaId);
      expect(res.body.duplicate.customerName).toBe('Ada Okafor');
      expect(res.body.duplicate.identityType).toBe('PHONE');
    });

    it('detects a duplicate email with 409', async () => {
      const res = await request(server)
        .post(base())
        .set(ownerCookie)
        .send({ name: 'Ada Two', email: 'ADA@example.com' })
        .expect(409);
      expect(res.body.duplicate.identityType).toBe('EMAIL');
    });

    it('allows the same phone in a DIFFERENT business (identities are per-tenant)', async () => {
      await request(server)
        .post(`/businesses/${otherBusinessId}/customers`)
        .set(otherCookie)
        .send({ name: 'Ada In Femi Shop', phone: '08012345678' })
        .expect(201);
    });
  });

  describe('search, filter, pagination', () => {
    beforeAll(async () => {
      for (let i = 0; i < 12; i++) {
        await request(server)
          .post(base())
          .set(ownerCookie)
          .send({
            name: `Bulk Customer ${String(i).padStart(2, '0')}`,
            phone: `080555512${String(i).padStart(2, '0')}`,
            tags: i % 2 === 0 ? ['vip'] : [],
          })
          .expect(201);
      }
    });

    it('paginates with correct totals', async () => {
      const page1 = await request(server)
        .get(`${base()}?page=1&pageSize=10`)
        .set(ownerCookie)
        .expect(200);
      expect(page1.body.items).toHaveLength(10);
      expect(page1.body.total).toBeGreaterThanOrEqual(13);

      const page2 = await request(server)
        .get(`${base()}?page=2&pageSize=10`)
        .set(ownerCookie)
        .expect(200);
      expect(page2.body.items.length).toBeGreaterThanOrEqual(1);
      const ids1 = page1.body.items.map((c: { id: string }) => c.id);
      const ids2 = page2.body.items.map((c: { id: string }) => c.id);
      expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
    });

    it('searches by name substring (case-insensitive)', async () => {
      const res = await request(server).get(`${base()}?search=ada+ok`).set(ownerCookie).expect(200);
      expect(res.body.items.map((c: { name: string }) => c.name)).toContain('Ada Okafor');
    });

    it('searches by phone in local format', async () => {
      const res = await request(server)
        .get(`${base()}?search=08012345678`)
        .set(ownerCookie)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Ada Okafor');
    });

    it('filters by tag', async () => {
      const res = await request(server).get(`${base()}?tag=vip`).set(ownerCookie).expect(200);
      expect(res.body.total).toBe(6);
      for (const item of res.body.items) expect(item.tags).toContain('vip');
    });
  });

  describe('update, timeline, delete', () => {
    let customerId: string;

    beforeAll(async () => {
      const res = await request(server)
        .post(base())
        .set(ownerCookie)
        .send({ name: 'Ngozi Eze', phone: '09011122233' })
        .expect(201);
      customerId = res.body.id;
    });

    it('updates name and phone; identities resync', async () => {
      const res = await request(server)
        .patch(`${base()}/${customerId}`)
        .set(ownerCookie)
        .send({ name: 'Ngozi Eze-Obi', phone: '09011122299' })
        .expect(200);
      expect(res.body.name).toBe('Ngozi Eze-Obi');
      expect(res.body.phone).toBe('+2349011122299');
      const phoneIdentity = res.body.identities.find((i: { type: string }) => i.type === 'PHONE');
      expect(phoneIdentity.value).toBe('+2349011122299');
    });

    it('clears phone with explicit null', async () => {
      const res = await request(server)
        .patch(`${base()}/${customerId}`)
        .set(ownerCookie)
        .send({ phone: null })
        .expect(200);
      expect(res.body.phone).toBeNull();
      expect(res.body.identities.filter((i: { type: string }) => i.type === 'PHONE')).toHaveLength(
        0,
      );
    });

    it('timeline shows CREATED and UPDATED events, newest first', async () => {
      const res = await request(server)
        .get(`${base()}/${customerId}/timeline`)
        .set(ownerCookie)
        .expect(200);
      const types = res.body.items.map((e: { type: string }) => e.type);
      expect(types).toContain('CUSTOMER_CREATED');
      expect(types).toContain('CUSTOMER_UPDATED');
      expect(types[types.length - 1]).toBe('CUSTOMER_CREATED');
    });

    it('soft deletes: 404 afterwards, excluded from list, phone freed for reuse', async () => {
      const freed = await request(server)
        .post(base())
        .set(ownerCookie)
        .send({ name: 'Phone Holder', phone: '09099988877' })
        .expect(201);

      await request(server).delete(`${base()}/${freed.body.id}`).set(ownerCookie).expect(200);
      await request(server).get(`${base()}/${freed.body.id}`).set(ownerCookie).expect(404);

      // The phone can now be used by a new customer.
      await request(server)
        .post(base())
        .set(ownerCookie)
        .send({ name: 'New Phone Holder', phone: '09099988877' })
        .expect(201);
    });
  });

  describe('tenant isolation', () => {
    let adaIdForIsolation: string;

    beforeAll(async () => {
      const res = await request(server)
        .get(`${base()}?search=Ada Okafor`)
        .set(ownerCookie)
        .expect(200);
      adaIdForIsolation = res.body.items[0].id;
    });

    it("blocks another user from LISTING this business's customers (404)", async () => {
      await request(server).get(base()).set(otherCookie).expect(404);
    });

    it('blocks another user from READING a customer (404)', async () => {
      await request(server).get(`${base()}/${adaIdForIsolation}`).set(otherCookie).expect(404);
    });

    it('blocks another user from UPDATING a customer (404)', async () => {
      await request(server)
        .patch(`${base()}/${adaIdForIsolation}`)
        .set(otherCookie)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('blocks another user from DELETING a customer (404)', async () => {
      await request(server).delete(`${base()}/${adaIdForIsolation}`).set(otherCookie).expect(404);
    });

    it('blocks a cross-tenant read even with a valid customer id in the URL of the attacker business', async () => {
      // Femi tries to read Ada through HIS OWN business id — customer lookup is scoped.
      await request(server)
        .get(`/businesses/${otherBusinessId}/customers/${adaIdForIsolation}`)
        .set(otherCookie)
        .expect(404);
    });

    it('unauthenticated requests get 401', async () => {
      await request(server).get(base()).expect(401);
    });
  });
});

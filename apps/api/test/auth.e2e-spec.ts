import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, signInAs, startAuthHarness, stopAuthHarness } from './auth-harness';

/**
 * Authentication is Supabase's; this suite covers our half of the contract —
 * that a valid token is accepted, an invalid one never is, the profile is
 * provisioned on first sight, and businesses stay isolated per user.
 *
 * There are no register/login/logout endpoints to test: the browser talks to
 * Supabase directly, so credentials never reach this API.
 */
describe('Auth + businesses (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.SUPABASE_JWKS_URL = await startAuthHarness();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableShutdownHooks();
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await stopAuthHarness();
  });

  describe('token verification', () => {
    it('accepts a validly signed token and provisions the profile on first use', async () => {
      const ada = await signInAs({ name: 'Ada Okafor' });

      // No profile row exists until the first authenticated request.
      expect(await prisma.user.findUnique({ where: { id: ada.id } })).toBeNull();

      const res = await request(server).get('/auth/me').set(authHeader(ada)).expect(200);
      expect(res.body.user.id).toBe(ada.id);
      expect(res.body.user.email).toBe(ada.email);
      expect(res.body.user.name).toBe('Ada Okafor');
      expect(res.body.businesses).toEqual([]);

      const stored = await prisma.user.findUnique({ where: { id: ada.id } });
      expect(stored).not.toBeNull();
      // Credentials live in Supabase; nothing password-shaped is stored here.
      expect(stored).not.toHaveProperty('passwordHash');
    });

    it('provisions once, not on every request', async () => {
      const bola = await signInAs();
      await request(server).get('/auth/me').set(authHeader(bola)).expect(200);
      await request(server).get('/auth/me').set(authHeader(bola)).expect(200);
      const count = await prisma.user.count({ where: { id: bola.id } });
      expect(count).toBe(1);
    });

    it.each([
      ['no header', {}],
      ['a malformed header', { Authorization: 'Bearer not-a-token' }],
      ['a token signed by someone else', { Authorization: `Bearer ${'ey.' + 'x'.repeat(40)}` }],
    ])('rejects %s with 401', async (_label, headers) => {
      await request(server).get('/auth/me').set(headers).expect(401);
    });

    it('rejects an expired token', async () => {
      // An hour in the past; jose only parses durations forward.
      const stale = await signInAs({ expiresIn: Math.floor(Date.now() / 1000) - 3600 });
      await request(server).get('/auth/me').set(authHeader(stale)).expect(401);
    });

    it('rejects a token minted for a different audience', async () => {
      const wrong = await signInAs({ audience: 'some-other-service' });
      await request(server).get('/auth/me').set(authHeader(wrong)).expect(401);
    });

    it('keeps the stored email in step when it changes in Supabase', async () => {
      const id = (await signInAs()).id;
      await request(server)
        .get('/auth/me')
        .set(authHeader(await signInAs({ id, email: 'first@example.com' })))
        .expect(200);
      const res = await request(server)
        .get('/auth/me')
        .set(authHeader(await signInAs({ id, email: 'second@example.com' })))
        .expect(200);
      expect(res.body.user.email).toBe('second@example.com');
    });
  });

  describe('protected routes', () => {
    it.each(['/auth/me', '/businesses'])('rejects unauthenticated GET %s with 401', async (url) => {
      await request(server).get(url).expect(401);
    });
  });

  describe('profile', () => {
    it('lets the owner correct the name inferred from their provider', async () => {
      const user = await signInAs({ name: 'ada' });
      await request(server).get('/auth/me').set(authHeader(user)).expect(200);

      const res = await request(server)
        .patch('/auth/me')
        .set(authHeader(user))
        .send({ name: 'Ada Okafor' })
        .expect(200);
      expect(res.body.user.name).toBe('Ada Okafor');
    });

    it('rejects an empty name', async () => {
      const user = await signInAs();
      await request(server).patch('/auth/me').set(authHeader(user)).send({ name: 'A' }).expect(400);
    });
  });

  describe('businesses + tenant isolation', () => {
    let ada: Awaited<ReturnType<typeof signInAs>>;
    let bob: Awaited<ReturnType<typeof signInAs>>;
    let adaBusinessId: string;

    beforeAll(async () => {
      ada = await signInAs({ name: 'Ada Owner' });
      bob = await signInAs({ name: 'Bob Eze' });
      await request(server).get('/auth/me').set(authHeader(ada)).expect(200);
      await request(server).get('/auth/me').set(authHeader(bob)).expect(200);
    });

    it('creates a business with the creator as OWNER', async () => {
      const res = await request(server)
        .post('/businesses')
        .set(authHeader(ada))
        .send({ name: "Ada's Glow", industry: 'Beauty' })
        .expect(201);
      expect(res.body.role).toBe('OWNER');
      expect(res.body.currency).toBe('NGN');
      adaBusinessId = res.body.id;
    });

    it('lists the business for its owner and in /auth/me', async () => {
      const list = await request(server).get('/businesses').set(authHeader(ada)).expect(200);
      expect(list.body.map((b: { id: string }) => b.id)).toContain(adaBusinessId);

      const me = await request(server).get('/auth/me').set(authHeader(ada)).expect(200);
      expect(me.body.businesses.map((b: { id: string }) => b.id)).toContain(adaBusinessId);
    });

    it("does NOT let another user read Ada's business (404, existence hidden)", async () => {
      await request(server).get(`/businesses/${adaBusinessId}`).set(authHeader(bob)).expect(404);
    });

    it("does NOT include Ada's business in Bob's list", async () => {
      const list = await request(server).get('/businesses').set(authHeader(bob)).expect(200);
      expect(list.body.map((b: { id: string }) => b.id)).not.toContain(adaBusinessId);
    });

    it('lets the owner read their own business by id', async () => {
      const res = await request(server)
        .get(`/businesses/${adaBusinessId}`)
        .set(authHeader(ada))
        .expect(200);
      expect(res.body.id).toBe(adaBusinessId);
      expect(res.body.role).toBe('OWNER');
    });
  });
});

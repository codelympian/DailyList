import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const unique = Date.now();
const adaEmail = `ada.${unique}@example.com`;
const bobEmail = `bob.${unique}@example.com`;
const PASSWORD = 'sup3rsecret!';

function sessionCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('dailylist_session='));
  if (!cookie) throw new Error('No session cookie set');
  return cookie.split(';')[0] as string;
}

describe('Auth + businesses (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableShutdownHooks();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('registration', () => {
    it('registers a user, sets an httpOnly session cookie, and /me works', async () => {
      const res = await request(server)
        .post('/auth/register')
        .send({ name: 'Ada Okafor', email: adaEmail, password: PASSWORD })
        .expect(201);

      expect(res.body.user.email).toBe(adaEmail);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      const rawCookie = (res.headers['set-cookie'] as unknown as string[])[0] as string;
      expect(rawCookie).toContain('HttpOnly');

      const me = await request(server)
        .get('/auth/me')
        .set('Cookie', sessionCookie(res))
        .expect(200);
      expect(me.body.user.email).toBe(adaEmail);
      expect(me.body.businesses).toEqual([]);
    });

    it('rejects a duplicate email with 409', async () => {
      await request(server)
        .post('/auth/register')
        .send({ name: 'Ada Again', email: adaEmail, password: PASSWORD })
        .expect(409);
    });

    it('rejects invalid input with 400 and field details', async () => {
      const res = await request(server)
        .post('/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: 'short' })
        .expect(400);
      const paths = res.body.details.map((d: { path: string }) => d.path);
      expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    });
  });

  describe('login/logout', () => {
    it('rejects a wrong password with 401', async () => {
      await request(server)
        .post('/auth/login')
        .send({ email: adaEmail, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown email with 401 (same error as wrong password)', async () => {
      const res = await request(server)
        .post('/auth/login')
        .send({ email: `ghost.${unique}@example.com`, password: PASSWORD })
        .expect(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('logs in with correct credentials, then logout invalidates the session', async () => {
      const login = await request(server)
        .post('/auth/login')
        .send({ email: adaEmail, password: PASSWORD })
        .expect(200);
      const cookie = sessionCookie(login);

      await request(server).get('/auth/me').set('Cookie', cookie).expect(200);
      await request(server).post('/auth/logout').set('Cookie', cookie).expect(200);
      // The server-side session is revoked — the old cookie no longer works.
      await request(server).get('/auth/me').set('Cookie', cookie).expect(401);
    });
  });

  describe('protected routes', () => {
    it.each(['/auth/me', '/businesses'])('rejects unauthenticated GET %s with 401', async (url) => {
      await request(server).get(url).expect(401);
    });

    it('rejects a forged session cookie', async () => {
      await request(server)
        .get('/auth/me')
        .set('Cookie', 'dailylist_session=forged-token-value')
        .expect(401);
    });
  });

  describe('businesses + tenant isolation', () => {
    let adaCookie: string;
    let bobCookie: string;
    let adaBusinessId: string;

    beforeAll(async () => {
      const adaLogin = await request(server)
        .post('/auth/login')
        .send({ email: adaEmail, password: PASSWORD })
        .expect(200);
      adaCookie = sessionCookie(adaLogin);

      const bobRegister = await request(server)
        .post('/auth/register')
        .send({ name: 'Bob Eze', email: bobEmail, password: PASSWORD })
        .expect(201);
      bobCookie = sessionCookie(bobRegister);
    });

    it('creates a business with the creator as OWNER', async () => {
      const res = await request(server)
        .post('/businesses')
        .set('Cookie', adaCookie)
        .send({ name: "Ada's Glow", industry: 'Beauty' })
        .expect(201);
      expect(res.body.role).toBe('OWNER');
      expect(res.body.name).toBe("Ada's Glow");
      expect(res.body.currency).toBe('NGN');
      adaBusinessId = res.body.id;
    });

    it('lists the business for its owner and in /auth/me', async () => {
      const list = await request(server).get('/businesses').set('Cookie', adaCookie).expect(200);
      expect(list.body.map((b: { id: string }) => b.id)).toContain(adaBusinessId);

      const me = await request(server).get('/auth/me').set('Cookie', adaCookie).expect(200);
      expect(me.body.businesses.map((b: { id: string }) => b.id)).toContain(adaBusinessId);
    });

    it("does NOT let another user read Ada's business (404, existence hidden)", async () => {
      await request(server)
        .get(`/businesses/${adaBusinessId}`)
        .set('Cookie', bobCookie)
        .expect(404);
    });

    it("does NOT include Ada's business in Bob's list", async () => {
      const list = await request(server).get('/businesses').set('Cookie', bobCookie).expect(200);
      expect(list.body.map((b: { id: string }) => b.id)).not.toContain(adaBusinessId);
    });

    it('lets the owner read their own business by id', async () => {
      const res = await request(server)
        .get(`/businesses/${adaBusinessId}`)
        .set('Cookie', adaCookie)
        .expect(200);
      expect(res.body.id).toBe(adaBusinessId);
      expect(res.body.role).toBe('OWNER');
    });
  });
});

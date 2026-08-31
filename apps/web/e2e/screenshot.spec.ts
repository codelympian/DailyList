import { test } from '@playwright/test';

/**
 * Not an assertion suite — a visual check. Seeds a realistic list and
 * captures the screens so the design can be reviewed rather than imagined.
 * Run with: npx playwright test screenshot --project=mobile
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

test('capture the daily list', async ({ page }) => {
  const email = `shot.${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Ada Okafor');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('sup3rsecret!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Business name').fill("Ada's Glow");
  await page.getByRole('button', { name: 'Create business' }).click();
  await page.waitForURL(/\/dashboard/);

  // Seed a realistic mixed list: a hot lead, a debtor and a reorder.
  await page.evaluate(async (apiUrl) => {
    const day = 24 * 60 * 60 * 1000;
    const me = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' }).then((r) => r.json());
    const b = me.businesses[0].id;
    const post = (path: string, body: unknown) =>
      fetch(`${apiUrl}/businesses/${b}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json());

    const product = await post('/products', {
      name: 'Glow Serum',
      price: 18000,
      reorderIntervalDays: 30,
    });

    const ngozi = await post('/customers', { name: 'Ngozi Eze', phone: '08031114444' });
    await post('/leads', { customerId: ngozi.id, productId: product.id });

    const bola = await post('/customers', { name: 'Bola Ade', phone: '08031113333' });
    await post('/transactions', {
      customerId: bola.id,
      items: [{ description: 'Bulk order', quantity: 1, unitPrice: 50000 }],
      amountPaid: 30000,
      occurredAt: new Date(Date.now() - 20 * day).toISOString(),
    });

    const chidi = await post('/customers', { name: 'Chidi Nwosu', phone: '08031115555' });
    for (const daysAgo of [95, 65, 35]) {
      await post('/transactions', {
        customerId: chidi.id,
        items: [{ productId: product.id, quantity: 1, unitPrice: 18000 }],
        amountPaid: 18000,
        occurredAt: new Date(Date.now() - daysAgo * day).toISOString(),
      });
    }
    await post('/recommendations/generate', {});
  }, API_URL);

  await page.goto('/dashboard');
  await page.waitForSelector('text=Why today?');
  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });

  await page.goto('/customers');
  await page.waitForSelector('text=Bola Ade');
  await page.screenshot({ path: 'screenshots/customers.png', fullPage: true });
});

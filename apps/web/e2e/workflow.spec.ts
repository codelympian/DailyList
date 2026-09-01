import { expect, test, type Page } from '@playwright/test';
import { cleanupUsers, createConfirmedUser } from './supabase-users';

/**
 * The MVP completion criteria, walked end to end in a real browser:
 * register → create a business → add a product and a customer → record a
 * sale → create a lead → see the daily list with reasons and a message →
 * mark done → watch progress update.
 */

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

// Every test user is removed afterwards; the auth.users cascade takes their
// business and all of its data with them.
test.afterAll(async () => {
  await cleanupUsers();
});

/**
 * Provisions a confirmed Supabase user, then signs in through the real login
 * form. Signing up in the UI correctly stops at "confirm your email", which
 * is covered by its own test rather than worked around here.
 */
async function register(page: Page): Promise<string> {
  const user = await createConfirmedUser();
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  await page.goto('/onboarding');
  return user.email;
}

async function createBusiness(page: Page, name: string): Promise<void> {
  await page.getByLabel('Business name').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  // Steps 3-5: how you sell -> add customers -> ready.
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: "I'll do this later" }).click();
  await page.getByRole('button', { name: 'Go to my list' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Dailylist MVP workflow', () => {
  test('a new owner can sign up, add data, and work their daily list', async ({ page }) => {
    // 1–2. Register and create a business.
    await register(page);
    await createBusiness(page, 'E2E Beauty');

    // A brand-new business has nothing to act on, and says so usefully.
    await expect(page.getByText('No one to contact yet')).toBeVisible();

    // 3. Add a product with a reorder interval.
    await page.goto('/products/new');
    await page.getByLabel('Product name').fill('Glow Serum');
    await page.getByLabel('Price (₦)', { exact: true }).fill('18000');
    await page.getByLabel('Reorder interval (days)').fill('30');
    await page.getByRole('button', { name: 'Add product' }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByText('Glow Serum')).toBeVisible();

    // 4. Add a customer — the phone must normalize to E.164.
    await page.goto('/customers/new');
    await page.getByLabel('Name').fill('Ada Okafor');
    await page.getByLabel('Phone (WhatsApp)').fill('0801 234 5678');
    await page.getByRole('button', { name: 'Add customer' }).click();
    await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
    // "0801 234 5678" was stored as E.164.
    await expect(page.getByText('+2348012345678', { exact: true })).toBeVisible();

    const customerUrl = page.url();
    const customerId = customerUrl.split('/').pop()!;

    // 5. Record a sale that leaves a balance owing.
    await page.goto(`/transactions/new?customerId=${customerId}`);
    await page.getByPlaceholder('Description (e.g. Glow Serum)').first().fill('Glow Serum');
    await page.getByLabel('Qty').first().fill('1');
    await page.getByLabel('Unit price (₦)').first().fill('50000');
    await page.getByLabel('Amount paid now (₦)').fill('30000');
    await page.getByRole('button', { name: 'Record sale' }).click();
    await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);

    // 6. Debt is computed, not guessed: ₦50,000 − ₦30,000 = ₦20,000 outstanding.
    await expect(page.getByText('PARTIALLY PAID')).toBeVisible();
    await expect(page.getByText('₦20,000', { exact: true })).toBeVisible();

    // 7. The customer profile reflects the sale and the debt.
    await page.goto(customerUrl);
    await expect(page.getByText('Owes you')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();

    // 8. Today's list now has someone on it, with a reason and a message.
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Refresh list' }).click();
    const card = page.getByRole('listitem').filter({ hasText: 'Ada Okafor' }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText('Why today')).toBeVisible();
    await expect(card.getByText('Suggested message')).toBeVisible();
    await expect(card.getByText(/Owes ₦20,000/)).toBeVisible();

    // 9. The WhatsApp link is real and correctly addressed.
    const waLink = await page.evaluate(async (apiUrl) => {
      const me = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' }).then((r) => r.json());
      const businessId = me.businesses[0].id;
      const list = await fetch(`${apiUrl}/businesses/${businessId}/recommendations`, {
        credentials: 'include',
      }).then((r) => r.json());
      const first = list.items[0];
      return fetch(
        `${apiUrl}/businesses/${businessId}/customers/${first.customerId}/whatsapp-link?recommendationId=${first.id}`,
        { credentials: 'include' },
      ).then((r) => r.json());
    }, API_URL);
    expect(waLink.ok).toBe(true);
    expect(waLink.url).toContain('https://wa.me/2348012345678?text=');
    expect(new URL(waLink.url).searchParams.get('text')).toBe(waLink.body);

    // 10. Mark done → progress updates and the card leaves the pending list.
    await expect(page.getByText(/1 person left to contact/)).toBeVisible();
    await card.getByRole('button', { name: 'Mark done' }).click();
    await expect(page.getByText("You're done for today")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Done today (1)')).toBeVisible();
  });

  test('skipping a card removes it from the pending list', async ({ page }) => {
    await register(page);
    await createBusiness(page, 'Skip Test Shop');

    // Seed a debtor directly through the API — this test is about the skip action.
    await page.evaluate(async (apiUrl) => {
      const me = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' }).then((r) => r.json());
      const businessId = me.businesses[0].id;
      const customer = await fetch(`${apiUrl}/businesses/${businessId}/customers`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Skip Me', phone: '08055554444' }),
      }).then((r) => r.json());
      await fetch(`${apiUrl}/businesses/${businessId}/transactions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          items: [{ description: 'Order', quantity: 1, unitPrice: 10000 }],
          amountPaid: 0,
        }),
      });
      await fetch(`${apiUrl}/businesses/${businessId}/recommendations/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    }, API_URL);

    await page.goto('/dashboard');
    const card = page.getByRole('listitem').filter({ hasText: 'Skip Me' }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Done today (1)')).toBeVisible({ timeout: 15_000 });
  });

  test('a signed-in owner can log out from the app shell', async ({ page }, testInfo) => {
    await register(page);
    await createBusiness(page, 'Logout Test Shop');

    if (testInfo.project.name === 'mobile') {
      // Thumb bar -> More -> Log out.
      await page.getByRole('button', { name: 'More' }).click();
    }
    // On desktop the control is always visible at the foot of the sidebar.
    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/login/);
    // The session is really gone, not just the redirect.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('signing up asks the new owner to confirm their email', async ({ page }) => {
    // Supabase's built-in email service allows only a handful of sends per
    // hour. That is an environment limit, not a product failure, so the test
    // reports it as skipped rather than red.
    let rateLimited = false;
    page.on('response', (r) => {
      if (r.url().includes('/auth/v1/signup') && r.status() === 429) rateLimited = true;
    });

    const email = `signup.${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Your name').fill('New Owner');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('sup3rsecret!');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Email confirmation is on, so there is no session yet — and we say so
    // rather than dropping them into an empty app.
    await page.waitForTimeout(1500);
    test.skip(
      rateLimited,
      'Supabase confirmation-email rate limit reached; needs custom SMTP to test repeatedly.',
    );

    await expect(page.getByText('Confirm your email')).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('offers Google as an alternative to email and password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await page.goto('/signup');
    await expect(page.getByRole('button', { name: /Sign up with Google/i })).toBeVisible();
  });

  test('protected pages send signed-out visitors to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('the daily list is reachable in two taps and works on a phone', async ({ page }) => {
    await register(page);
    await createBusiness(page, 'Nav Test Shop');

    // Bottom navigation is the mobile thumb-zone path between screens.
    await page.goto('/customers');
    await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Main' }).first().getByText('Today').click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('No one to contact yet')).toBeVisible();
  });
});

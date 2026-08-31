import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3200);
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

/**
 * E2E runs against the real API and database. Start the API separately
 * (`node apps/api/dist/main.js`); Playwright starts the built web app.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx next start -p ${WEB_PORT}`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_API_URL: API_URL },
  },
});

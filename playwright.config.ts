import { defineConfig, devices } from '@playwright/test';

const LIVE = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: LIVE ?? `http://localhost:${process.env.PORT ?? 3003}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } }],
  // When PLAYWRIGHT_BASE_URL is set we run against the deployed app — no local server.
  ...(LIVE
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: `http://localhost:${process.env.PORT ?? 3003}`,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      }),
});

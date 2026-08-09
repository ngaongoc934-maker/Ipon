import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, type Page, test } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  launchWithFreighter,
  onboardFreighter,
} from '../../../../../shared/freighter/freighter-fixture';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://ipon-dun.vercel.app';

const SHOTS = path.resolve(__dirname, '../../../screen-shot');
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 });

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let userDataDir: string;

test.beforeAll(async () => {
  const launched = await launchWithFreighter(chromium);
  context = launched.context;
  userDataDir = launched.userDataDir;
  await onboardFreighter(context);
});

test.afterAll(async () => {
  if (context) await cleanup(context, userDataDir);
});

async function screenshotNextPopup(name: string): Promise<void> {
  const popup = await context.waitForEvent('page', { timeout: 60_000 });
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.waitForTimeout(1500);
  await popup
    .screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 })
    .catch(() => {});
}

async function connectWallet(page: Page): Promise<void> {
  const grantPopup = context.waitForEvent('page', { timeout: 60_000 });
  await page.getByTestId('connect-cta').click();
  await grantPopup.then((p) =>
    p
      .waitForLoadState('domcontentloaded')
      .catch(() => {})
      .then(() => p.waitForTimeout(1500))
      .then(() =>
        p.screenshot({ path: path.join(SHOTS, '02-connect-popup.jpg'), type: 'jpeg', quality: 85 }),
      )
      .catch(() => {}),
  );

  const challengePopup = screenshotNextPopup('03-sign-challenge-popup.jpg');
  await approveOnce(context, { timeout: 60_000 });
  await challengePopup;
  await approveOnce(context, { timeout: 90_000 });
}

async function createXlmGoal(page: Page, name: string, target: string): Promise<void> {
  await page.getByTestId('new-goal-button').click();
  await expect(page.getByTestId('create-goal-form')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('goal-name').fill(name);
  await page.getByTestId('asset-XLM').click();
  await page.getByTestId('goal-target').fill(target);
  await shot(page, '05-create-goal.jpg');
  await page.getByTestId('submit-goal').click();
}

test('real Freighter: connect popup + SEP-10 sign + on-chain deposit -> real tx hash', async () => {
  test.setTimeout(300_000);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('cta-button')).toBeVisible({ timeout: 20_000 });
  await shot(page, '01-landing.jpg');

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('connect-cta')).toBeVisible({ timeout: 20_000 });
  await connectWallet(page);

  await expect(page.getByTestId('wallet-pill')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await shot(page, '04-connected-dashboard.jpg');

  await createXlmGoal(page, 'Real-Freighter goal (XLM)', '2');

  await expect(page.getByTestId('deposit-amount')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('deposit-amount').fill('3');

  const signPopup = screenshotNextPopup('06-deposit-sign-popup.jpg');
  await page.getByTestId('deposit-button').click();
  await signPopup;
  await approveOnce(context, { timeout: 120_000 });

  await expect(page.getByText('Deposit history')).toBeVisible({ timeout: 30_000 });
  const txLink = page.locator('table a[href*="stellar.expert"]').first();
  await expect(txLink).toBeVisible({ timeout: 120_000 });
  const txHref = await txLink.getAttribute('href');
  expect(txHref).toContain('/tx/');
  await expect(page.getByText('You reached your goal!')).toBeVisible({ timeout: 30_000 });
  await shot(page, '07-deposit-success.jpg');

  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Ipon in numbers')).toBeVisible({ timeout: 20_000 });
  await shot(page, '08-stats.jpg');

  const txHash = (txHref ?? '').split('/tx/')[1];
  expect(txHash).toBeTruthy();
  // biome-ignore lint/suspicious/noConsole: surface the real tx hash for the run report
  console.log('CORE_FLOW_TX=' + txHash);
});

test('mobile landing renders', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('cta-button')).toBeVisible({ timeout: 20_000 });
  await shot(page, '09-mobile.jpg');
});

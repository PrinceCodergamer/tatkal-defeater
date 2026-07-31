/**
 * LIVE SITE TEST — drives the real UI in a real Chromium browser.
 * Captures screenshots, asserts the premium redesign renders, checks for
 * console/page errors, and exercises the full booking flow.
 *
 * Run: npx playwright test tests/ui/site-test.ts --reporter=line
 */
import { test, expect } from '@playwright/test';

const WEB = process.env.WEB_BASE || 'http://localhost:3000';

test.describe('IRCTC Tatkal — live UI test', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`PAGE ERROR: ${err.message}`));
  });

  test('homepage renders the premium redesign', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'networkidle' });

    // Hero headline with gradient "fairly."
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Book train tickets');
    await expect(page.locator('h1 span')).toContainText('fairly');

    // Search card + CTA
    await expect(page.locator('input[placeholder="Enter source station"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Search Trains/ }).first()).toBeVisible();

    // Trust markers
    await expect(page.getByText('Bot protected')).toBeVisible();
    await expect(page.getByText('5-min seat lock')).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'tests/ui/shots/01-homepage.png', fullPage: true });

    // No console errors on the critical page
    expect(consoleErrors).toEqual([]);
  });

  test('dark mode toggles and persists', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'networkidle' });
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: /dark mode|light mode/i }).first().click();
    await expect(html).toHaveClass(/dark/);
    await page.screenshot({ path: 'tests/ui/shots/02-dark-mode.png' });

    // Reload — theme persists
    await page.reload({ waitUntil: 'networkidle' });
    await expect(html).toHaveClass(/dark/);
  });

  test('search → verify flow works end-to-end', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'networkidle' });

    // Fill station inputs
    await page.locator('input[placeholder="Enter source station"]').click();
    await page.locator('input[placeholder="Enter source station"]').fill('New Delhi');
    await page.keyboard.press('Enter');
    await page.locator('input[placeholder="Enter destination station"]').click();
    await page.locator('input[placeholder="Enter destination station"]').fill('Mumbai Central');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: /Search Trains/ }).first().click();

    // Verification step appears
    await expect(page.getByText('One-time verification before entering the queue')).toBeVisible();
    await page.locator('input[type="tel"]').fill('9876543210');
    await page.getByRole('button', { name: /Verify/ }).click();

    // Identity verified state
    await expect(page.getByText('Identity Verified')).toBeVisible();
    await page.screenshot({ path: 'tests/ui/shots/03-verified.png' });
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto(`${WEB}/nonexistent-route`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/404 · OFF THE TRACKS/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Home/ })).toBeVisible();
    await page.screenshot({ path: 'tests/ui/shots/04-404.png' });
  });

  test('waiting room renders the queue visualizer', async ({ page }) => {
    await page.goto(
      `${WEB}/waiting-room?tokenId=ui-test-token&position=25&total=100&from=New%20Delhi&to=Mumbai`,
      { waitUntil: 'networkidle' },
    );
    await expect(page.getByText('Fair Waiting Room')).toBeVisible();
    // Queue position counter (mono, in the ring)
    await expect(page.locator('text=Your Position')).toBeVisible();
    await expect(page.getByText('of 100')).toBeVisible();
    await page.screenshot({ path: 'tests/ui/shots/05-waiting-room.png' });
  });

  test('booking page renders the countdown + steps', async ({ page }) => {
    await page.goto(
      `${WEB}/booking?tokenId=ui-test-token&from=New%20Delhi&to=Mumbai&date=2026-08-02`,
      { waitUntil: 'networkidle' },
    );
    await expect(page.getByText('Seat Locked!')).toBeVisible();
    await expect(page.getByText('Time Remaining')).toBeVisible();
    // Step indicators
    await expect(page.getByText('Locked')).toBeVisible();
    await expect(page.getByText('Confirmed')).toBeVisible();
    await page.screenshot({ path: 'tests/ui/shots/06-booking.png' });
  });

  test.afterEach(async ({}, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log(`\n⚠ Console errors on "${testInfo.title}":`);
      console.log(consoleErrors.join('\n'));
    }
  });
});

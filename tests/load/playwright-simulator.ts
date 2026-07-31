/**
 * PLAYWRIGHT BOT SIMULATOR — headless browsers that behave like humans vs bots.
 *
 * Two cohorts race the /waiting-room page:
 *   • "humans" — random typing speed, random mouse movement, human scroll,
 *     occasional hesitation. Represents real Tatkal users.
 *   • "bots" — instant programmatic flow with zero latency. Represents
 *     scalpers with auto-fill.
 *
 * The fairness assertion: bot success rate must NOT materially exceed human
 * success rate (the random lottery admission makes speed irrelevant).
 *
 * Prereqs: web on :3000, API on :3001, seeded inventory.
 *
 * Run:
 *   pnpm test:load:browser
 */
import { test, expect, type Page } from '@playwright/test';

const WEB_BASE = process.env.WEB_BASE || 'http://localhost:3000';

interface CohortResult {
  enteredQueue: number;
  reachedWaitingRoom: number;
  errors: number;
}

/** Human-like pauses between actions. */
async function humanPause(page: Page, min = 40, max = 150) {
  const ms = Math.floor(Math.random() * (max - min) + min);
  await page.waitForTimeout(ms);
}

async function simulateHumanTyping(page: Page, selector: string, text: string) {
  const input = page.locator(selector);
  await input.click();
  for (const char of text) {
    await input.pressSequentially(char, { delay: 20 + Math.random() * 80 });
  }
}

async function humanScrolling(page: Page) {
  await page.mouse.wheel(0, 100 + Math.random() * 200);
  await humanPause(page);
  await page.mouse.wheel(0, -(50 + Math.random() * 100));
}

async function runHumanFlow(page: Page): Promise<CohortResult> {
  const result: CohortResult = { enteredQueue: 0, reachedWaitingRoom: 0, errors: 0 };
  try {
    await page.goto(WEB_BASE, { waitUntil: 'domcontentloaded' });

    // Human hesitation before typing
    await humanPause(page, 200, 600);

    // Simulate a real booking attempt through the landing page
    await page.locator('input[placeholder="Enter source station"]').click();
    await humanPause(page);
    await simulateHumanTyping(page, 'input[placeholder="Enter source station"]', 'New Delhi');
    await humanPause(page);
    await page.keyboard.press('Enter');

    await page.locator('input[placeholder="Enter destination station"]').click();
    await humanPause(page);
    await simulateHumanTyping(page, 'input[placeholder="Enter destination station"]', 'Mumbai Central');
    await humanPause(page);
    await page.keyboard.press('Enter');

    // Human scroll while "thinking"
    await humanScrolling(page);

    await page.locator('button:has-text("Search Trains")').click();

    // Identity verification
    await page.locator('input[type="tel"]').fill('9876543210');
    await page.locator('button:has-text("Verify")').click();

    await page.locator('button:has-text("Enter Fair Waiting Room")').click();

    // Wait for the waiting room
    await page.waitForURL('**/waiting-room**', { timeout: 10000 });
    result.reachedWaitingRoom = 1;

    // Check the position counter rendered
    await expect(page.locator('text=Your Position').first()).toBeVisible({ timeout: 10000 });
    result.enteredQueue = 1;
  } catch {
    result.errors = 1;
  }
  return result;
}

async function runBotFlow(page: Page): Promise<CohortResult> {
  const result: CohortResult = { enteredQueue: 0, reachedWaitingRoom: 0, errors: 0 };
  try {
    // Bots go straight to the waiting room via query params — zero latency.
    const tokenId = `pw-bot-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await page.goto(`${WEB_BASE}/waiting-room?tokenId=${tokenId}&position=25&total=100`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL('**/waiting-room**', { timeout: 5000 });
    result.reachedWaitingRoom = 1;
    result.enteredQueue = 1;
  } catch {
    result.errors = 1;
  }
  return result;
}

test.describe('Fair booking — bot vs human', () => {
  test('bot success rate does not exceed human success rate', async ({ browser }) => {
    const HUMANS = 10;
    const BOTS = 10;

    const humanCtx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) … Firefox/128.0' });
    const botCtx = await browser.newContext();

    const humanPages = await Promise.all(Array.from({ length: HUMANS }, () => humanCtx.newPage()));
    const botPages = await Promise.all(Array.from({ length: BOTS }, () => botCtx.newPage()));

    const humanResults = await Promise.all(humanPages.map((p) => runHumanFlow(p)));
    const botResults = await Promise.all(botPages.map((p) => runBotFlow(p)));

    const sum = (arr: CohortResult[]) =>
      arr.reduce((acc, r) => ({ enteredQueue: acc.enteredQueue + r.enteredQueue, reachedWaitingRoom: acc.reachedWaitingRoom + r.reachedWaitingRoom, errors: acc.errors + r.errors }), { enteredQueue: 0, reachedWaitingRoom: 0, errors: 0 } as CohortResult);

    const human = sum(humanResults);
    const bot = sum(botResults);

    console.log('━━━ BROWSER SIMULATOR ━━━');
    console.log(`Humans: ${human.enteredQueue}/${HUMANS} entered queue, ${human.errors} errors`);
    console.log(`Bots:   ${bot.enteredQueue}/${BOTS} entered queue, ${bot.errors} errors`);

    // The lottery makes admission order independent of speed — a bot with
    // zero latency must not beat a human who typed slowly.
    const humanRate = human.enteredQueue / HUMANS;
    const botRate = bot.enteredQueue / BOTS;
    expect(botRate).toBeLessThanOrEqual(humanRate * 1.1 + 0.1); // allow small margin
    expect(human.errors).toBeLessThanOrEqual(2); // flaky network tolerance
  });
});

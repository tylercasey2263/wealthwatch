/**
 * Captures screenshots of all major pages for documentation.
 * Run with: bun run scripts/capture-screenshots.ts
 *
 * Requires the dev server to be running on http://localhost:5173
 * and the server on http://localhost:3001.
 */
import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE = 'http://localhost:5173';
const OUT = path.join(import.meta.dir, '..', 'client', 'public', 'docs');
const EMAIL = 'demo@example.com';
const PASS = 'password123';

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Dismiss any self-signed cert issues
page.on('dialog', d => d.dismiss());

async function shot(name: string) {
  await page.waitForTimeout(800); // let charts render
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`  captured ${name}.png`);
}

// -- Login --
console.log('Logging in...');
await page.goto(`${BASE}/login`);
await page.waitForLoadState('networkidle');
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 10000 });
await shot('01-dashboard');

// -- Dashboard: scroll to show narrative cards --
await page.waitForTimeout(500);
await shot('02-dashboard-story');

// -- Accounts --
console.log('Accounts...');
await page.goto(`${BASE}/accounts`);
await page.waitForLoadState('networkidle');
await shot('03-accounts');

// -- Transactions --
console.log('Transactions...');
await page.goto(`${BASE}/transactions`);
await page.waitForLoadState('networkidle');
await shot('04-transactions');

// -- Debts --
console.log('Debts...');
await page.goto(`${BASE}/debts`);
await page.waitForLoadState('networkidle');
await shot('05-debts');

// Open the payoff plan
const planBtn = page.getByRole('button', { name: /Payoff Plan/i });
if (await planBtn.isVisible()) {
  await planBtn.click();
  await page.waitForTimeout(1200);
  await shot('06-debt-action-plan');
}

// -- Investments --
console.log('Investments...');
await page.goto(`${BASE}/investments`);
await page.waitForLoadState('networkidle');
await shot('07-investments');

// -- Budgets --
console.log('Budgets...');
await page.goto(`${BASE}/budgets`);
await page.waitForLoadState('networkidle');
await shot('08-budgets');

// Click the first budget card to expand drill-down
const firstBudgetCard = page.locator('[role="button"]').first();
if (await firstBudgetCard.isVisible()) {
  await firstBudgetCard.click();
  await page.waitForTimeout(1200);
  await shot('09-budget-drilldown');
}

// -- Goals --
console.log('Goals...');
await page.goto(`${BASE}/goals`);
await page.waitForLoadState('networkidle');
await shot('10-goals');

// -- Reports --
console.log('Reports...');
await page.goto(`${BASE}/reports`);
await page.waitForLoadState('networkidle');
await shot('11-reports');

// -- Import --
console.log('Import...');
await page.goto(`${BASE}/import`);
await page.waitForLoadState('networkidle');
await shot('12-import');

await browser.close();
console.log(`\nDone! Screenshots saved to ${OUT}`);

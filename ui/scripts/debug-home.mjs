import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', (msg) => console.log('console:', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('pageerror:', err.stack || err.message));
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/api/')) console.log('api:', res.status(), url);
});
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
console.log('BODY:\n', (await page.locator('body').innerText()).slice(0,1000));
await browser.close();

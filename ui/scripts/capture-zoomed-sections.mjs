import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 2 });

async function save(page, path, locator) {
  const el = page.locator(locator).first();
  await el.waitFor({ state: 'visible', timeout: 10000 });
  await el.screenshot({ path });
}

// Home
{
  const page = await context.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-home-current-card.png', 'text=현재 진행 중');
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-home-history-card.png', 'text=이전 작업');
  await page.close();
}

// Current
{
  const page = await context.newPage();
  await page.goto('http://localhost:3000/current', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-current-progress.png', 'text=개발 진행');
  await page.getByRole('tab', { name: '설계 단계' }).click();
  await page.waitForTimeout(500);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-current-design.png', 'text=설계 단계');
  await page.close();
}

// History
{
  const page = await context.newPage();
  await page.goto('http://localhost:3000/history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-history-list.png', 'text=3개의 런');
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-history-detail.png', 'text=UI 컴포넌트 추가 및 스타일링');
  await page.close();
}

// Docs
{
  const page = await context.newPage();
  await page.goto('http://localhost:3000/docs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-docs-tree.png', 'text=aidlc-docs');
  await page.getByRole('button', { name: 'requirements.md' }).click();
  await page.waitForTimeout(500);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-docs-content.png', 'text=요구사항 분석');
  await page.close();
}

// Settings
{
  const page = await context.newPage();
  await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-settings-summary.png', 'text=설정');
  await save(page, '/Users/seolmin/.openclaw/workspace/ui-settings-yaml.png', 'text=claude-sonnet-4');
  await page.close();
}

await browser.close();
console.log('done');

import { chromium } from '@playwright/test';

const pages = [
  {
    url: 'http://localhost:3000/',
    out: '/Users/seolmin/.openclaw/workspace/ai-crew-home-full.png',
    required: ['현재 진행 중', 'initial-build-20260329-3', '이전 작업'],
  },
  {
    url: 'http://localhost:3000/current',
    out: '/Users/seolmin/.openclaw/workspace/ai-crew-current-full.png',
    required: ['현재 상태', '개발 진행', '설계 단계'],
  },
  {
    url: 'http://localhost:3000/history',
    out: '/Users/seolmin/.openclaw/workspace/ai-crew-history-full.png',
    required: ['히스토리', 'initial-build-20260329-3', '인증 버그 수정 및 세션 관리 개선'],
  },
  {
    url: 'http://localhost:3000/docs',
    out: '/Users/seolmin/.openclaw/workspace/ai-crew-docs-full.png',
    required: ['설계 문서', 'requirements.md', 'aidlc-state.md'],
  },
  {
    url: 'http://localhost:3000/settings',
    out: '/Users/seolmin/.openclaw/workspace/ai-crew-settings-full.png',
    required: ['설정', 'claude-sonnet-4', 'fullstack'],
  },
];

async function waitForRealContent(page, required) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  for (let i = 0; i < 24; i++) {
    const text = await page.locator('body').innerText();
    const hasAll = required.every((c) => text.includes(c));
    const skeletonCount = await page.locator('[data-slot="skeleton"]').count();
    if (hasAll && skeletonCount === 0) return;
    await page.waitForTimeout(500);
  }
  const text = await page.locator('body').innerText();
  const skeletonCount = await page.locator('[data-slot="skeleton"]').count();
  throw new Error(`real content not ready: skeletons=${skeletonCount} text=${text.slice(0, 700)}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });

for (const item of pages) {
  const page = await context.newPage();
  await page.goto(item.url, { waitUntil: 'networkidle' });
  await waitForRealContent(page, item.required);
  await page.screenshot({ path: item.out, fullPage: true });
  await page.close();
}

await browser.close();
console.log('done');

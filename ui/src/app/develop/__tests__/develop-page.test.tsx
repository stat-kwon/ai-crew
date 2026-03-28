import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pagePath = resolve(__dirname, '../page.tsx');
const pageContent = readFileSync(pagePath, 'utf-8');

describe('develop-page 용어 검증', () => {
  it('구용어 "팀원"이 UI 텍스트에 포함되지 않아야 함', () => {
    // JSX 문자열 리터럴에서 "팀원" 검색 (변수명은 제외)
    const uiStrings = pageContent.match(/"[^"]*팀원[^"]*"|'[^']*팀원[^']*'|>[^<]*팀원[^<]*</g);
    expect(uiStrings).toBeNull();
  });

  it('"에이전트" 텍스트가 포함되어야 함', () => {
    expect(pageContent).toContain('에이전트');
  });

  it('intentDescription 필드가 RunEntry 인터페이스에 존재해야 함', () => {
    expect(pageContent).toContain('intentDescription');
  });

  it('스크래치패드 모달이 유지되어야 함', () => {
    expect(pageContent).toContain('scratchpad');
  });
});

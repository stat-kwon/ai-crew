/**
 * remaining-pages.test.ts
 * 팀/번들/설정/프리플라이트 페이지에서 구용어(번들 관련 deprecated 텍스트) 0건 검증
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const PAGES_DIR = resolve(__dirname, '..');

function readPage(relativePath: string): string {
  return readFileSync(resolve(PAGES_DIR, relativePath), 'utf-8');
}

const DEPRECATED_PATTERNS = [
  /번들 목록/,
  /번들 검색/,
  /번들이 성공적으로 적용/,
  /사용 가능한 번들이 없습니다/,
  /이 번들 적용/,
  /맞춤형 번들이 필요/,
  /번들을 선택하여 팀 구성을 시작/,
  /번들 페이지에서 선택/,
  /번들 목록 페이지에서 변경/,
];

describe('remaining-pages 구용어 제거 검증', () => {
  const pages: Record<string, string> = {
    'team/page.tsx': readPage('team/page.tsx'),
    'bundles/page.tsx': readPage('bundles/page.tsx'),
    'settings/page.tsx': readPage('settings/page.tsx'),
    'preflight/page.tsx': readPage('preflight/page.tsx'),
  };

  for (const [pageName, content] of Object.entries(pages)) {
    describe(`${pageName}`, () => {
      for (const pattern of DEPRECATED_PATTERNS) {
        it(`구용어 패턴 "${pattern.source}"이 존재하지 않아야 함`, () => {
          expect(content).not.toMatch(pattern);
        });
      }
    });
  }

  describe('team/page.tsx 신용어 검증', () => {
    it('"팀 템플릿을 선택하여 에이전트 팀 구성을 시작하세요" 텍스트가 존재해야 함', () => {
      expect(pages['team/page.tsx']).toContain('팀 템플릿을 선택하여 에이전트 팀 구성을 시작하세요');
    });
  });

  describe('bundles/page.tsx 신용어 검증', () => {
    it('"팀 템플릿" 제목이 존재해야 함', () => {
      expect(pages['bundles/page.tsx']).toContain('팀 템플릿');
    });

    it('"팀 템플릿 검색..." placeholder가 존재해야 함', () => {
      expect(pages['bundles/page.tsx']).toContain('팀 템플릿 검색...');
    });

    it('"팀 템플릿이 성공적으로 적용되었습니다" 메시지가 존재해야 함', () => {
      expect(pages['bundles/page.tsx']).toContain('팀 템플릿이 성공적으로 적용되었습니다');
    });

    it('"사용 가능한 팀 템플릿이 없습니다" 메시지가 존재해야 함', () => {
      expect(pages['bundles/page.tsx']).toContain('사용 가능한 팀 템플릿이 없습니다');
    });

    it('"이 팀 템플릿 적용" 버튼 텍스트가 존재해야 함', () => {
      expect(pages['bundles/page.tsx']).toContain('이 팀 템플릿 적용');
    });

    it('"나만의 맞춤형 팀 템플릿이 필요하신가요?" 텍스트가 존재해야 함', () => {
      expect(pages['bundles/page.tsx']).toContain('나만의 맞춤형 팀 템플릿이 필요하신가요?');
    });
  });

  describe('settings/page.tsx 신용어 검증', () => {
    it('"팀 템플릿" label이 존재해야 함', () => {
      expect(pages['settings/page.tsx']).toContain('팀 템플릿');
    });

    it('"팀 템플릿 페이지에서 선택" placeholder가 존재해야 함', () => {
      expect(pages['settings/page.tsx']).toContain('팀 템플릿 페이지에서 선택');
    });

    it('"팀 템플릿 목록 페이지에서 변경" 도움말 텍스트가 존재해야 함', () => {
      expect(pages['settings/page.tsx']).toContain('팀 템플릿 목록 페이지에서 변경');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pagePath = resolve(__dirname, '../page.tsx');
const pageContent = readFileSync(pagePath, 'utf-8');

// helpers.ts 검증 (폴더 매핑 로직)
const helpersPath = resolve(__dirname, '../../api/aidlc/docs/helpers.ts');
const helpersContent = readFileSync(helpersPath, 'utf-8');

describe('design-page 폴더 매핑 뷰', () => {
  it('페이지가 /api/aidlc/docs 엔드포인트를 호출', () => {
    expect(pageContent).toContain('/api/aidlc/docs');
  });

  it('groups 응답을 사용하여 렌더링', () => {
    expect(pageContent).toContain('groups');
  });

  it('react-markdown을 사용한 프리뷰 기능 포함', () => {
    expect(pageContent).toContain('react-markdown');
  });

  it('빈 상태 메시지 포함', () => {
    // 문서가 없을 때 표시할 메시지
    expect(pageContent).toMatch(/문서|없|empty/i);
  });
});

describe('docs helpers — 폴더 매핑 상수', () => {
  it('FOLDER_MAPPINGS에 inception 폴더들이 정의됨', () => {
    expect(helpersContent).toContain('inception/requirements');
    expect(helpersContent).toContain('inception/application-design');
    expect(helpersContent).toContain('inception/plans');
  });

  it('한글 레이블이 정의됨', () => {
    expect(helpersContent).toContain('요구사항 분석');
    expect(helpersContent).toContain('애플리케이션 설계');
    expect(helpersContent).toContain('작업 계획');
  });

  it('getFileLabel 함수가 export됨', () => {
    expect(helpersContent).toContain('export function getFileLabel');
  });

  it('groupDocsByFolder 함수가 export됨', () => {
    expect(helpersContent).toContain('export function groupDocsByFolder');
  });

  it('FILE_LABEL_MAP에 한글 파일명 매핑이 존재', () => {
    expect(helpersContent).toContain('요구사항 문서');
    expect(helpersContent).toContain('유닛 정의');
  });
});

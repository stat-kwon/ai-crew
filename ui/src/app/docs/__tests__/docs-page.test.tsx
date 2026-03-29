import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pagePath = resolve(__dirname, '../page.tsx');
const pageContent = readFileSync(pagePath, 'utf-8');

const helpersPath = resolve(__dirname, '../../api/aidlc/docs/helpers.ts');
const helpersContent = readFileSync(helpersPath, 'utf-8');

describe('docs-page 설계 문서 페이지', () => {
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
    expect(pageContent).toMatch(/문서|없|empty/i);
  });

  it('페이지 제목이 "설계 문서"로 설정됨', () => {
    expect(pageContent).toContain('설계 문서');
  });

  it('"/design" 참조가 없음 (라우트 이동 완료)', () => {
    expect(pageContent).not.toContain('/design');
  });

  it('실행 버튼이 제거되고 CLI 안내 문구로 대체됨', () => {
    expect(pageContent).toContain('CLI에서');
    expect(pageContent).toContain('/crew:elaborate');
    expect(pageContent).not.toContain('명령 실행');
  });

  it('col-span-4 / col-span-8 비율로 레이아웃 설정됨', () => {
    expect(pageContent).toContain('col-span-4');
    expect(pageContent).toContain('col-span-8');
  });

  it('max-w-screen-2xl로 전체 폭 대응', () => {
    expect(pageContent).toContain('max-w-screen-2xl');
  });

  it('컴포넌트 이름이 DocsPage', () => {
    expect(pageContent).toContain('function DocsPage');
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

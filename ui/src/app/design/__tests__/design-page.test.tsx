import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: vi.fn() }));

import useSWR from 'swr';
import DesignPage from '../page';

describe('DesignPage 폴더 매핑 뷰', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('그룹 레이블이 올바르게 렌더링됨', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') {
        return {
          data: {
            groups: [
              { folder: 'inception/requirements', label: '요구사항 분석', sortOrder: 1, files: [] },
              { folder: 'inception/user-stories', label: '사용자 시나리오', sortOrder: 2, files: [] },
            ],
          },
        };
      }
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('요구사항 분석')).toBeInTheDocument();
    expect(screen.getByText('사용자 시나리오')).toBeInTheDocument();
  });

  it('파일이 한글 레이블로 표시됨', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') {
        return {
          data: {
            groups: [
              {
                folder: 'inception/requirements',
                label: '요구사항 분석',
                sortOrder: 1,
                files: [
                  {
                    name: 'requirements.md',
                    label: '요구사항 문서',
                    path: 'inception/requirements/requirements.md',
                  },
                ],
              },
            ],
          },
        };
      }
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('요구사항 문서')).toBeInTheDocument();
  });

  it('파일명이 부제목으로 함께 표시됨', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') {
        return {
          data: {
            groups: [
              {
                folder: 'inception/requirements',
                label: '요구사항 분석',
                sortOrder: 1,
                files: [
                  {
                    name: 'requirements.md',
                    label: '요구사항 문서',
                    path: 'inception/requirements/requirements.md',
                  },
                ],
              },
            ],
          },
        };
      }
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('requirements.md')).toBeInTheDocument();
  });

  it('문서가 없을 때 빈 상태 메시지 표시', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation(() => ({ data: null }));

    render(<DesignPage />);
    expect(screen.getByText(/생성된 문서가 없습니다/)).toBeInTheDocument();
  });

  it('빈 groups 배열일 때 빈 상태 메시지 표시', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') {
        return { data: { groups: [] } };
      }
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText(/생성된 문서가 없습니다/)).toBeInTheDocument();
  });

  it('여러 그룹과 파일이 모두 렌더링됨', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') {
        return {
          data: {
            groups: [
              {
                folder: 'inception/requirements',
                label: '요구사항 분석',
                sortOrder: 1,
                files: [
                  { name: 'requirements.md', label: '요구사항 문서', path: 'inception/requirements/requirements.md' },
                ],
              },
              {
                folder: 'inception/application-design',
                label: '애플리케이션 설계',
                sortOrder: 4,
                files: [
                  { name: 'unit-of-work.md', label: '유닛 정의', path: 'inception/application-design/unit-of-work.md' },
                  { name: 'unit-of-work-dependency.md', label: '유닛 의존성 매트릭스', path: 'inception/application-design/unit-of-work-dependency.md' },
                ],
              },
            ],
          },
        };
      }
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('요구사항 분석')).toBeInTheDocument();
    expect(screen.getByText('애플리케이션 설계')).toBeInTheDocument();
    expect(screen.getByText('요구사항 문서')).toBeInTheDocument();
    expect(screen.getByText('유닛 정의')).toBeInTheDocument();
    expect(screen.getByText('유닛 의존성 매트릭스')).toBeInTheDocument();
  });

  it('문서 총 개수가 헤더에 표시됨', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') {
        return {
          data: {
            groups: [
              {
                folder: 'inception/requirements',
                label: '요구사항 분석',
                sortOrder: 1,
                files: [
                  { name: 'requirements.md', label: '요구사항 문서', path: 'inception/requirements/requirements.md' },
                  { name: 'user-stories.md', label: '사용자 스토리', path: 'inception/requirements/user-stories.md' },
                ],
              },
            ],
          },
        };
      }
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('2개 문서')).toBeInTheDocument();
  });
});

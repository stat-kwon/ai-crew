import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({
  default: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import useSWR from 'swr';
import DashboardPage from '../page';

describe('DashboardPage 용어 검증', () => {
  beforeEach(() => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') return { data: { bundleName: 'test-bundle', nodes: {} } };
      if (key === '/api/graph') return { data: { nodes: [] } };
      if (key === '/api/aidlc/state') return { data: { stages: [], found: false } };
      if (key === '/api/runs') return { data: { runs: [] } };
      return { data: null };
    });
  });

  it('구용어 "팀원 현황"이 렌더링되지 않아야 함', () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/팀원 현황/)).not.toBeInTheDocument();
  });

  it('구용어 "현재 팀 구성"이 렌더링되지 않아야 함', () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/현재 팀 구성/)).not.toBeInTheDocument();
  });

  it('구용어 "시작 전"이 설계 진행 카드에서 렌더링되지 않아야 함', () => {
    render(<DashboardPage />);
    expect(screen.queryByText('시작 전')).not.toBeInTheDocument();
  });

  it('"에이전트 현황" 텍스트가 존재해야 함', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/에이전트 현황/)).toBeInTheDocument();
  });

  it('"현재 에이전트 팀" 텍스트가 존재해야 함', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/현재 에이전트 팀/)).toBeInTheDocument();
  });

  it('"설계 데이터 없음"이 표시되어야 함 (found === false)', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/설계 데이터 없음/)).toBeInTheDocument();
  });

  it('개발 흐름이 정확히 4단계여야 함', () => {
    render(<DashboardPage />);
    expect(screen.getByText('설계 고도화')).toBeInTheDocument();
    expect(screen.getByText('환경 점검')).toBeInTheDocument();
    expect(screen.getByText('개발 실행')).toBeInTheDocument();
    expect(screen.getByText('결과 통합')).toBeInTheDocument();
    // 구버전 5단계에 있던 항목이 없어야 함
    expect(screen.queryByText('설계 초안 작성')).not.toBeInTheDocument();
  });

  it('실행 기록 없을 때 "아직 실행된 작업이 없습니다" 표시', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/아직 실행된 작업이 없습니다/)).toBeInTheDocument();
  });
});

describe('DashboardPage 데이터 표시', () => {
  it('마지막 실행 카드에 intent description 우선 표시', () => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') {
        return {
          data: {
            bundleName: 'test-bundle',
            runId: 'run-001',
            intent: { description: 'UI 개선 작업' },
            nodes: { a: { status: 'completed' } },
          },
        };
      }
      if (key === '/api/graph') return { data: { nodes: [{ id: 'a', type: 'worker' }] } };
      if (key === '/api/aidlc/state') return { data: { stages: [], found: true } };
      if (key === '/api/runs') return { data: { runs: [] } };
      return { data: null };
    });

    render(<DashboardPage />);
    expect(screen.getByText('UI 개선 작업')).toBeInTheDocument();
    expect(screen.getByText('run-001')).toBeInTheDocument();
  });

  it('intent description 없으면 runId를 제목으로 표시', () => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') {
        return {
          data: {
            bundleName: 'test-bundle',
            runId: 'run-002',
            nodes: {},
          },
        };
      }
      if (key === '/api/graph') return { data: { nodes: [] } };
      if (key === '/api/aidlc/state') return { data: { stages: [], found: false } };
      if (key === '/api/runs') return { data: { runs: [] } };
      return { data: null };
    });

    render(<DashboardPage />);
    expect(screen.getByText('run-002')).toBeInTheDocument();
  });

  it('최근 실행 목록에 intentDescription 우선 표시', () => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') return { data: { bundleName: 'test', nodes: {} } };
      if (key === '/api/graph') return { data: { nodes: [] } };
      if (key === '/api/aidlc/state') return { data: { stages: [], found: false } };
      if (key === '/api/runs') {
        return {
          data: {
            runs: [
              {
                runId: 'run-101',
                state: 'completed',
                createdAt: '2026-03-28T10:00:00Z',
                completedAt: '2026-03-28T10:30:00Z',
                nodesTotal: 3,
                nodesCompleted: 3,
                nodesFailed: 0,
                intentDescription: 'API 정확도 개선',
              },
            ],
          },
        };
      }
      return { data: null };
    });

    render(<DashboardPage />);
    expect(screen.getByText('API 정확도 개선')).toBeInTheDocument();
    expect(screen.getByText('run-101')).toBeInTheDocument();
  });
});

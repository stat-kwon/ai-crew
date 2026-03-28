import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import useSWR from 'swr';
import DevelopPage from '../page';

describe('DevelopPage 용어 검증', () => {
  beforeEach(() => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') return {
        data: {
          bundleName: 'test',
          nodes: {
            'node-1': {
              status: 'completed',
              startedAt: '2026-03-28T00:00:00Z',
              completedAt: '2026-03-28T00:01:00Z',
            },
          },
        },
      };
      if (key === '/api/graph') return {
        data: {
          nodes: [{ id: 'node-1', type: 'worker', agent: 'builder', depends_on: [] }],
        },
      };
      if (key === '/api/runs') return {
        data: {
          runs: [
            {
              runId: 'test-run-1',
              state: 'completed',
              createdAt: '2026-03-28',
              completedAt: '2026-03-28',
              nodesTotal: 1,
              nodesCompleted: 1,
              nodesFailed: 0,
              intentDescription: 'TODO 앱 구현',
            },
          ],
        },
      };
      return { data: null };
    });
  });

  it('구용어 "팀원"이 렌더링되지 않아야 함', () => {
    render(<DevelopPage />);
    expect(screen.queryByText(/팀원/)).not.toBeInTheDocument();
  });

  it('"에이전트" 레이블이 칸반 카드에 표시되어야 함', () => {
    render(<DevelopPage />);
    expect(screen.getByText('에이전트')).toBeInTheDocument();
  });

  it('에이전트 이름이 칸반 카드에 표시되어야 함', () => {
    render(<DevelopPage />);
    expect(screen.getByText('builder')).toBeInTheDocument();
  });
});

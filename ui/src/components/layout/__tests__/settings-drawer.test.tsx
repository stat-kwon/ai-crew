import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({
  default: vi.fn(),
}));

import useSWR from 'swr';
import { SettingsDrawer } from '../SettingsDrawer';

const mockConfigData = {
  bundle: 'fullstack',
  defaults: {
    locale: 'ko',
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
  },
  graph: {
    parallel: 4,
  },
};

describe('SettingsDrawer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    (useSWR as any).mockImplementation((key: string | null) => ({
      data: key ? mockConfigData : undefined,
    }));
  });

  it('isOpen이 false이면 렌더링되지 않아야 함', () => {
    render(<SettingsDrawer isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('isOpen이 true이면 설정 패널이 렌더링되어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByRole('dialog', { name: '설정' })).toBeInTheDocument();
  });

  it('프로젝트 설정 정보가 표시되어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('fullstack')).toBeInTheDocument();
    expect(screen.getByText('ko')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-20250514')).toBeInTheDocument();
    expect(screen.getByText('anthropic')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose가 호출되어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByTestId('settings-close');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('CLI 수정 안내 문구가 표시되어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/CLI에서 수정하세요/)).toBeInTheDocument();
  });

  it('config.yaml 경로가 표시되어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('.ai-crew/config.yaml')).toBeInTheDocument();
  });

  it('설정 헤더 제목이 "설정"이어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  it('오버레이 클릭 시 onClose가 호출되어야 함', () => {
    render(<SettingsDrawer isOpen={true} onClose={mockOnClose} />);
    // The overlay is the element with aria-hidden="true"
    const overlay = document.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

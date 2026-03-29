import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import { TopBar } from '../TopBar';

describe('TopBar', () => {
  const mockOnSettingsOpen = vi.fn();

  beforeEach(() => {
    mockOnSettingsOpen.mockClear();
  });

  it('로고 "AI-Crew Studio" 텍스트가 렌더링되어야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    expect(screen.getByText('AI-Crew Studio')).toBeInTheDocument();
  });

  it('"The Cognitive Architect" 부제가 렌더링되어야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    expect(screen.getByText('The Cognitive Architect')).toBeInTheDocument();
  });

  it('타임라인 탭과 설계 문서 탭이 렌더링되어야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    expect(screen.getByText('타임라인')).toBeInTheDocument();
    expect(screen.getByText('설계 문서')).toBeInTheDocument();
  });

  it('타임라인 탭이 / 경로에서 활성 상태여야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    const timelineLink = screen.getByText('타임라인').closest('a');
    expect(timelineLink).toHaveAttribute('aria-current', 'page');
  });

  it('설계 문서 탭이 / 경로에서 비활성 상태여야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    const docsLink = screen.getByText('설계 문서').closest('a');
    expect(docsLink).not.toHaveAttribute('aria-current');
  });

  it('설정 버튼 클릭 시 onSettingsOpen이 호출되어야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    const settingsButton = screen.getByTestId('settings-toggle');
    fireEvent.click(settingsButton);
    expect(mockOnSettingsOpen).toHaveBeenCalledTimes(1);
  });

  it('메인 네비게이션 aria-label이 설정되어야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    expect(screen.getByRole('navigation', { name: '메인 네비게이션' })).toBeInTheDocument();
  });

  it('타임라인 탭이 / 경로를 가리켜야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    const timelineLink = screen.getByText('타임라인').closest('a');
    expect(timelineLink).toHaveAttribute('href', '/');
  });

  it('설계 문서 탭이 /docs 경로를 가리켜야 함', () => {
    render(<TopBar onSettingsOpen={mockOnSettingsOpen} />);
    const docsLink = screen.getByText('설계 문서').closest('a');
    expect(docsLink).toHaveAttribute('href', '/docs');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));
vi.mock('swr', () => ({
  default: () => ({ data: { bundle: 'fullstack' } }),
}));

import { Sidebar } from '../Sidebar';

describe('Sidebar 용어 및 CTA 검증', () => {
  it('구용어 "신규 프로젝트"가 렌더링되지 않아야 함', () => {
    render(<Sidebar />);
    expect(screen.queryByText(/신규 프로젝트/)).not.toBeInTheDocument();
  });

  it('"프로젝트 전환" CTA가 존재해야 함', () => {
    render(<Sidebar />);
    expect(screen.getByText(/프로젝트 전환/)).toBeInTheDocument();
  });

  it('"팀 템플릿" 관련 텍스트가 존재해야 함', () => {
    render(<Sidebar />);
    const elements = screen.getAllByText(/팀 템플릿/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('하단에 "팀 템플릿: {bundleName}" 형식으로 표시', () => {
    render(<Sidebar />);
    expect(screen.getByText(/팀 템플릿: fullstack/)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RunHeader } from "../RunHeader";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("RunHeader", () => {
  const defaultProps = {
    intentDescription: "UI 리디자인 작업",
    runId: "run-20260329-001",
    state: "completed",
    startedAt: "2026-03-29T10:00:00Z",
    completedAt: "2026-03-29T10:47:00Z",
    nodesCompleted: 8,
    nodesTotal: 8,
    nodesFailed: 0,
  };

  it("should render intent description as heading", () => {
    render(<RunHeader {...defaultProps} />);
    expect(screen.getByText("UI 리디자인 작업")).toBeInTheDocument();
  });

  it("should render runId", () => {
    render(<RunHeader {...defaultProps} />);
    expect(screen.getByText("run-20260329-001")).toBeInTheDocument();
  });

  it("should show runId as heading when intentDescription is missing", () => {
    render(<RunHeader {...defaultProps} intentDescription={undefined} />);
    const headings = screen.getAllByText("run-20260329-001");
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("should render status badge with correct label", () => {
    render(<RunHeader {...defaultProps} />);
    expect(screen.getByText("완료")).toBeInTheDocument();
  });

  it("should render running state badge", () => {
    render(<RunHeader {...defaultProps} state="running" />);
    expect(screen.getByText("진행 중")).toBeInTheDocument();
  });

  it("should render failed state badge", () => {
    render(<RunHeader {...defaultProps} state="failed" />);
    expect(screen.getByText("실패")).toBeInTheDocument();
  });

  it("should render node completion count", () => {
    render(<RunHeader {...defaultProps} />);
    expect(screen.getByText(/8\/8 노드 완료/)).toBeInTheDocument();
  });

  it("should show failed count when nodesFailed > 0", () => {
    render(<RunHeader {...defaultProps} nodesFailed={2} />);
    expect(screen.getByText(/2 실패/)).toBeInTheDocument();
  });

  it("should render back link to timeline", () => {
    render(<RunHeader {...defaultProps} />);
    const backLink = screen.getByRole("link", {
      name: "타임라인으로 돌아가기",
    });
    expect(backLink).toHaveAttribute("href", "/");
  });
});

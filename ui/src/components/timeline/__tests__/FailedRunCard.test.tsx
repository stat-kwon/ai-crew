import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FailedRunCard } from "../FailedRunCard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("FailedRunCard", () => {
  const baseProps = {
    runId: "run-fail-001",
    intentDescription: "빌드 실패 런",
    nodesTotal: 8,
    nodesCompleted: 5,
    nodesFailed: 2,
    createdAt: "2026-03-28T09:30:00Z",
    completedAt: "2026-03-28T09:45:00Z",
  };

  it("should display intent description", () => {
    render(<FailedRunCard {...baseProps} />);
    expect(screen.getByText("빌드 실패 런")).toBeInTheDocument();
  });

  it("should display runId", () => {
    render(<FailedRunCard {...baseProps} />);
    expect(screen.getByText("run-fail-001")).toBeInTheDocument();
  });

  it("should display failed node count", () => {
    render(<FailedRunCard {...baseProps} />);
    expect(screen.getByText("2개 실패")).toBeInTheDocument();
  });

  it("should display failed badge", () => {
    render(<FailedRunCard {...baseProps} />);
    expect(screen.getByText("실패")).toBeInTheDocument();
  });

  it("should link to run detail page", () => {
    render(<FailedRunCard {...baseProps} />);
    const link = screen.getByTestId("run-detail-link-run-fail-001");
    expect(link).toHaveAttribute("href", "/runs/run-fail-001");
  });

  it("should have the failed-run-card test id", () => {
    render(<FailedRunCard {...baseProps} />);
    expect(screen.getByTestId("failed-run-card")).toBeInTheDocument();
  });

  it("should have rose border styling", () => {
    render(<FailedRunCard {...baseProps} />);
    const card = screen.getByTestId("failed-run-card");
    expect(card.className).toContain("border-rose-200");
  });
});

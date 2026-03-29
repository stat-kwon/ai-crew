import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CompletedRunCard } from "../CompletedRunCard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("CompletedRunCard", () => {
  const baseProps = {
    runId: "run-101",
    intentDescription: "API 정확도 개선",
    nodesTotal: 10,
    nodesCompleted: 10,
    createdAt: "2026-03-28T09:30:00Z",
    completedAt: "2026-03-28T10:00:00Z",
  };

  it("should display intent description", () => {
    render(<CompletedRunCard {...baseProps} />);
    expect(screen.getByText("API 정확도 개선")).toBeInTheDocument();
  });

  it("should display runId", () => {
    render(<CompletedRunCard {...baseProps} />);
    expect(screen.getByText("run-101")).toBeInTheDocument();
  });

  it("should display runId as title when no intent description", () => {
    render(
      <CompletedRunCard {...baseProps} intentDescription={undefined} />
    );
    expect(screen.getByText("run-101")).toBeInTheDocument();
  });

  it("should display node count", () => {
    render(<CompletedRunCard {...baseProps} />);
    expect(screen.getByText("10/10 노드")).toBeInTheDocument();
  });

  it("should display completion badge", () => {
    render(<CompletedRunCard {...baseProps} />);
    expect(screen.getByText("완료")).toBeInTheDocument();
  });

  it("should display duration", () => {
    render(<CompletedRunCard {...baseProps} />);
    expect(screen.getByText("30분")).toBeInTheDocument();
  });

  it("should link to run detail page", () => {
    render(<CompletedRunCard {...baseProps} />);
    const link = screen.getByTestId("run-detail-link-run-101");
    expect(link).toHaveAttribute("href", "/runs/run-101");
  });

  it("should have the completed-run-card test id", () => {
    render(<CompletedRunCard {...baseProps} />);
    expect(screen.getByTestId("completed-run-card")).toBeInTheDocument();
  });
});

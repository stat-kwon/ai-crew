import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActiveRunCard } from "../ActiveRunCard";

describe("ActiveRunCard", () => {
  const baseProps = {
    runId: "run-001",
    intentDescription: "UI 리디자인 작업",
    createdAt: new Date().toISOString(),
    nodes: {
      "plan-backend": {
        status: "completed",
        startedAt: "2026-03-28T09:35:00Z",
        completedAt: "2026-03-28T09:38:22Z",
      },
      "api-accuracy": {
        status: "running",
        startedAt: "2026-03-28T09:41:00Z",
        completedAt: null,
      },
      "test-all": {
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
    },
  };

  it("should display intent description as title", () => {
    render(<ActiveRunCard {...baseProps} />);
    expect(screen.getByText("UI 리디자인 작업")).toBeInTheDocument();
  });

  it("should display runId below description", () => {
    render(<ActiveRunCard {...baseProps} />);
    expect(screen.getByText("run-001")).toBeInTheDocument();
  });

  it("should display runId as title when no intent description", () => {
    render(
      <ActiveRunCard {...baseProps} intentDescription={undefined} />
    );
    const title = screen.getByText("run-001");
    expect(title.tagName).toBe("H3");
  });

  it("should display node completion count", () => {
    render(<ActiveRunCard {...baseProps} />);
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("노드 완료")).toBeInTheDocument();
  });

  it("should render node chips for all nodes", () => {
    render(<ActiveRunCard {...baseProps} />);
    expect(screen.getByTestId("node-minimap")).toBeInTheDocument();
    expect(screen.getByTestId("node-chip-plan-backend")).toBeInTheDocument();
    expect(screen.getByTestId("node-chip-api-accuracy")).toBeInTheDocument();
    expect(screen.getByTestId("node-chip-test-all")).toBeInTheDocument();
  });

  it("should display running badge", () => {
    render(<ActiveRunCard {...baseProps} />);
    expect(screen.getByText("진행 중")).toBeInTheDocument();
  });

  it("should have the active-run-card test id", () => {
    render(<ActiveRunCard {...baseProps} />);
    expect(screen.getByTestId("active-run-card")).toBeInTheDocument();
  });
});

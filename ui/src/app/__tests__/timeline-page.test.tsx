import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("swr", () => ({
  default: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import useSWR from "swr";
import TimelinePage from "../page";

const mockRuns = [
  {
    runId: "run-active",
    state: "running",
    createdAt: new Date().toISOString(),
    completedAt: null,
    nodesTotal: 5,
    nodesCompleted: 2,
    nodesFailed: 0,
    intentDescription: "현재 진행 런",
  },
  {
    runId: "run-done",
    state: "completed",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    nodesTotal: 3,
    nodesCompleted: 3,
    nodesFailed: 0,
    intentDescription: "완료된 런",
  },
  {
    runId: "run-fail",
    state: "failed",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    nodesTotal: 4,
    nodesCompleted: 2,
    nodesFailed: 1,
    intentDescription: "실패한 런",
  },
];

const mockState = {
  runId: "run-active",
  intent: { description: "현재 진행 런" },
  nodes: {
    "node-a": {
      status: "completed",
      startedAt: "2026-03-28T09:35:00Z",
      completedAt: "2026-03-28T09:38:00Z",
    },
    "node-b": { status: "running", startedAt: "2026-03-28T09:38:00Z" },
    "node-c": { status: "pending" },
  },
};

function setupSWRMock(overrides: Record<string, any> = {}) {
  (useSWR as any).mockImplementation((key: string) => {
    if (key in overrides) return { data: overrides[key] };
    if (key === "/api/state") return { data: mockState };
    if (key === "/api/runs") return { data: { runs: mockRuns } };
    if (key === "/api/config")
      return { data: { defaults: { bundle: "test-bundle" } } };
    if (key === "/api/graph")
      return { data: { nodes: [{ id: "a" }, { id: "b" }] } };
    if (key === "/api/aidlc/state")
      return { data: { stages: [], found: false } };
    return { data: null };
  });
}

describe("TimelinePage", () => {
  beforeEach(() => {
    setupSWRMock();
  });

  it("should render the timeline heading", () => {
    render(<TimelinePage />);
    expect(screen.getByText("타임라인")).toBeInTheDocument();
  });

  it("should render active run as ActiveRunCard", () => {
    render(<TimelinePage />);
    expect(screen.getByTestId("active-run-card")).toBeInTheDocument();
    expect(screen.getByText("현재 진행 런")).toBeInTheDocument();
  });

  it("should render completed run as CompletedRunCard", () => {
    render(<TimelinePage />);
    expect(screen.getByTestId("completed-run-card")).toBeInTheDocument();
    expect(screen.getByText("완료된 런")).toBeInTheDocument();
  });

  it("should render failed run as FailedRunCard", () => {
    render(<TimelinePage />);
    expect(screen.getByTestId("failed-run-card")).toBeInTheDocument();
    expect(screen.getByText("실패한 런")).toBeInTheDocument();
  });

  it("should show empty state when no runs", () => {
    setupSWRMock({ "/api/runs": { runs: [] } });
    render(<TimelinePage />);
    expect(screen.getByText("실행 기록이 없습니다")).toBeInTheDocument();
  });

  it("should render date dividers", () => {
    render(<TimelinePage />);
    const dividers = screen.getAllByTestId("date-divider");
    expect(dividers.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter runs by search query", () => {
    render(<TimelinePage />);
    const searchInput = screen.getByLabelText("런 검색");
    fireEvent.change(searchInput, { target: { value: "완료된" } });

    expect(screen.getByText("완료된 런")).toBeInTheDocument();
    expect(screen.queryByText("실패한 런")).not.toBeInTheDocument();
  });

  it("should filter runs by status", () => {
    render(<TimelinePage />);
    const statusSelect = screen.getByLabelText("상태 필터");
    fireEvent.change(statusSelect, { target: { value: "failed" } });

    expect(screen.getByText("실패한 런")).toBeInTheDocument();
    expect(screen.queryByText("완료된 런")).not.toBeInTheDocument();
  });

  it("should show filter empty message when no matches", () => {
    render(<TimelinePage />);
    const searchInput = screen.getByLabelText("런 검색");
    fireEvent.change(searchInput, {
      target: { value: "존재하지않는런" },
    });

    expect(
      screen.getByText("필터 조건에 맞는 런이 없습니다")
    ).toBeInTheDocument();
  });

  it("should render ProjectSummaryBar", () => {
    render(<TimelinePage />);
    expect(screen.getByTestId("project-summary-bar")).toBeInTheDocument();
  });

  it("should render detail links for completed/failed runs", () => {
    render(<TimelinePage />);
    expect(screen.getByTestId("run-detail-link-run-done")).toHaveAttribute(
      "href",
      "/runs/run-done"
    );
    expect(screen.getByTestId("run-detail-link-run-fail")).toHaveAttribute(
      "href",
      "/runs/run-fail"
    );
  });
});

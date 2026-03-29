import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NodeList } from "../NodeList";

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe("NodeList", () => {
  const graphNodes = [
    { id: "layout-overhaul", type: "worker", agent: "frontend-dev", depends_on: [] },
    { id: "page-cleanup", type: "worker", agent: "frontend-dev", depends_on: [] },
    { id: "timeline-page", type: "worker", agent: "frontend-dev", depends_on: ["layout-overhaul", "page-cleanup"] },
    { id: "run-detail-page", type: "worker", agent: "frontend-dev", depends_on: ["layout-overhaul", "page-cleanup"] },
    { id: "test-all", type: "aggregator", agent: "tester", depends_on: ["timeline-page", "run-detail-page"] },
  ];

  const nodeStatuses = {
    "layout-overhaul": { status: "completed", startedAt: "2026-03-29T10:00:00Z", completedAt: "2026-03-29T10:05:00Z" },
    "page-cleanup": { status: "completed", startedAt: "2026-03-29T10:00:00Z", completedAt: "2026-03-29T10:03:00Z" },
    "timeline-page": { status: "running", startedAt: "2026-03-29T10:05:00Z" },
    "run-detail-page": { status: "running", startedAt: "2026-03-29T10:05:00Z" },
    "test-all": { status: "pending" },
  };

  it("should render level group headers", () => {
    render(<NodeList graphNodes={graphNodes} nodeStatuses={nodeStatuses} />);
    expect(screen.getByText("Level 0 (병렬)")).toBeInTheDocument();
    expect(screen.getByText("Level 1 (의존성 있음)")).toBeInTheDocument();
    expect(screen.getByText("Level 2 (의존성 있음)")).toBeInTheDocument();
  });

  it("should render all node ids", () => {
    render(<NodeList graphNodes={graphNodes} nodeStatuses={nodeStatuses} />);
    expect(screen.getByText("layout-overhaul")).toBeInTheDocument();
    expect(screen.getByText("page-cleanup")).toBeInTheDocument();
    expect(screen.getByText("timeline-page")).toBeInTheDocument();
    expect(screen.getByText("run-detail-page")).toBeInTheDocument();
    expect(screen.getByText("test-all")).toBeInTheDocument();
  });

  it("should render agent names", () => {
    render(<NodeList graphNodes={graphNodes} nodeStatuses={nodeStatuses} />);
    const frontendDevElements = screen.getAllByText("frontend-dev");
    expect(frontendDevElements.length).toBe(4);
    expect(screen.getByText("tester")).toBeInTheDocument();
  });

  it("should render empty state when no nodes", () => {
    render(<NodeList graphNodes={[]} nodeStatuses={{}} />);
    expect(screen.getByText("노드 정보가 없습니다")).toBeInTheDocument();
  });

  it("should have correct aria-label for section", () => {
    render(<NodeList graphNodes={graphNodes} nodeStatuses={nodeStatuses} />);
    expect(screen.getByRole("region", { name: "노드 실행 결과" })).toBeInTheDocument();
  });
});

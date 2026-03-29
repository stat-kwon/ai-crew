import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodeAccordion } from "../NodeAccordion";

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock("remark-gfm", () => ({
  default: {},
}));

import useSWR from "swr";

describe("NodeAccordion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSWR as any).mockImplementation(() => ({
      data: null,
      isLoading: false,
    }));
  });

  it("should render node id", () => {
    render(
      <NodeAccordion
        nodeId="layout-overhaul"
        agent="frontend-dev"
        nodeStatus={{ status: "completed", startedAt: "2026-03-29T10:00:00Z", completedAt: "2026-03-29T10:05:00Z" }}
      />
    );
    expect(screen.getByText("layout-overhaul")).toBeInTheDocument();
  });

  it("should render agent name", () => {
    render(
      <NodeAccordion
        nodeId="layout-overhaul"
        agent="frontend-dev"
        nodeStatus={{ status: "completed" }}
      />
    );
    expect(screen.getByText("frontend-dev")).toBeInTheDocument();
  });

  it("should start in collapsed state", () => {
    render(
      <NodeAccordion
        nodeId="test-node"
        nodeStatus={{ status: "pending" }}
      />
    );
    const button = screen.getByTestId("node-accordion-test-node");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("should expand on click", async () => {
    const user = userEvent.setup();
    render(
      <NodeAccordion
        nodeId="test-node"
        nodeStatus={{ status: "completed" }}
      />
    );

    const button = screen.getByTestId("node-accordion-test-node");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("should fetch scratchpad only when expanded", async () => {
    const user = userEvent.setup();
    (useSWR as any).mockImplementation((key: string | null) => {
      if (key === "/api/scratchpad/test-node") {
        return {
          data: { content: "# Test Result\nSome content" },
          isLoading: false,
        };
      }
      return { data: null, isLoading: false };
    });

    render(
      <NodeAccordion
        nodeId="test-node"
        nodeStatus={{ status: "completed" }}
      />
    );

    const button = screen.getByTestId("node-accordion-test-node");
    await user.click(button);

    const markdownEl = screen.getByTestId("markdown");
    expect(markdownEl).toBeInTheDocument();
    expect(markdownEl.textContent).toContain("Test Result");
    expect(markdownEl.textContent).toContain("Some content");
  });

  it("should show loading state when fetching scratchpad", async () => {
    const user = userEvent.setup();
    (useSWR as any).mockImplementation((key: string | null) => {
      if (key) return { data: null, isLoading: true };
      return { data: null, isLoading: false };
    });

    render(
      <NodeAccordion
        nodeId="test-node"
        nodeStatus={{ status: "completed" }}
      />
    );

    const button = screen.getByTestId("node-accordion-test-node");
    await user.click(button);

    expect(screen.getByText("결과물을 불러오는 중...")).toBeInTheDocument();
  });

  it("should show empty state when no scratchpad content", async () => {
    const user = userEvent.setup();
    (useSWR as any).mockImplementation((key: string | null) => {
      if (key) return { data: { files: [], content: "" }, isLoading: false };
      return { data: null, isLoading: false };
    });

    render(
      <NodeAccordion
        nodeId="test-node"
        nodeStatus={{ status: "completed" }}
      />
    );

    const button = screen.getByTestId("node-accordion-test-node");
    await user.click(button);

    expect(screen.getByText("결과물이 없습니다")).toBeInTheDocument();
  });

  it("should show error message when node has error", async () => {
    const user = userEvent.setup();
    render(
      <NodeAccordion
        nodeId="test-node"
        nodeStatus={{ status: "failed", error: "타임아웃 발생" }}
      />
    );

    const button = screen.getByTestId("node-accordion-test-node");
    await user.click(button);

    expect(screen.getByText("타임아웃 발생")).toBeInTheDocument();
  });
});

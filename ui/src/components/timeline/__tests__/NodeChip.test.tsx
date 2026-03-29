import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NodeChip } from "../NodeChip";

describe("NodeChip", () => {
  it("should display the node id", () => {
    render(<NodeChip nodeId="api-accuracy" status="completed" />);
    expect(screen.getByText("api-accuracy")).toBeInTheDocument();
  });

  it("should display duration when provided", () => {
    render(
      <NodeChip nodeId="test-node" status="completed" duration="3m 22s" />
    );
    expect(screen.getByText("3m 22s")).toBeInTheDocument();
  });

  it("should not display duration when not provided", () => {
    render(<NodeChip nodeId="test-node" status="pending" />);
    expect(screen.queryByText(/\ds/)).not.toBeInTheDocument();
  });

  it("should apply animate-pulse class for running status", () => {
    const { container } = render(
      <NodeChip nodeId="running-node" status="running" />
    );
    const dot = container.querySelector(".animate-pulse");
    expect(dot).toBeInTheDocument();
  });

  it("should not apply animate-pulse class for completed status", () => {
    const { container } = render(
      <NodeChip nodeId="done-node" status="completed" />
    );
    const dot = container.querySelector(".animate-pulse");
    expect(dot).not.toBeInTheDocument();
  });

  it("should have data-testid with node id", () => {
    render(<NodeChip nodeId="my-node" status="failed" />);
    expect(screen.getByTestId("node-chip-my-node")).toBeInTheDocument();
  });
});

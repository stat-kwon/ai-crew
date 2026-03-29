import { describe, it, expect } from "vitest";
import { computeLevels, groupNodesByLevel, type GraphNode } from "../compute-levels";

describe("computeLevels", () => {
  it("should assign level 0 to nodes without dependencies", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "worker" },
      { id: "b", type: "worker" },
    ];
    const levels = computeLevels(nodes);
    expect(levels.get("a")).toBe(0);
    expect(levels.get("b")).toBe(0);
  });

  it("should assign level 1 to nodes depending on level-0 nodes", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "worker", depends_on: [] },
      { id: "b", type: "worker", depends_on: ["a"] },
    ];
    const levels = computeLevels(nodes);
    expect(levels.get("a")).toBe(0);
    expect(levels.get("b")).toBe(1);
  });

  it("should handle multi-level dependencies correctly", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "worker", depends_on: [] },
      { id: "b", type: "worker", depends_on: [] },
      { id: "c", type: "worker", depends_on: ["a", "b"] },
      { id: "d", type: "worker", depends_on: ["c"] },
    ];
    const levels = computeLevels(nodes);
    expect(levels.get("a")).toBe(0);
    expect(levels.get("b")).toBe(0);
    expect(levels.get("c")).toBe(1);
    expect(levels.get("d")).toBe(2);
  });

  it("should compute max dependency level when node has multiple deps", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "worker", depends_on: [] },
      { id: "b", type: "worker", depends_on: ["a"] },
      { id: "c", type: "worker", depends_on: ["a", "b"] },
    ];
    const levels = computeLevels(nodes);
    expect(levels.get("c")).toBe(2);
  });

  it("should handle empty nodes array", () => {
    const levels = computeLevels([]);
    expect(levels.size).toBe(0);
  });

  it("should handle missing dependency references gracefully", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "worker", depends_on: ["nonexistent"] },
    ];
    const levels = computeLevels(nodes);
    expect(levels.get("a")).toBe(1);
  });
});

describe("groupNodesByLevel", () => {
  it("should group nodes by their computed level", () => {
    const nodes: GraphNode[] = [
      { id: "a", type: "worker", depends_on: [] },
      { id: "b", type: "worker", depends_on: [] },
      { id: "c", type: "worker", depends_on: ["a", "b"] },
      { id: "d", type: "worker", depends_on: ["c"] },
    ];
    const groups = groupNodesByLevel(nodes);
    expect(groups).toHaveLength(3);
    expect(groups[0].level).toBe(0);
    expect(groups[0].nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(groups[1].level).toBe(1);
    expect(groups[1].nodes.map((n) => n.id)).toEqual(["c"]);
    expect(groups[2].level).toBe(2);
    expect(groups[2].nodes.map((n) => n.id)).toEqual(["d"]);
  });

  it("should return sorted levels ascending", () => {
    const nodes: GraphNode[] = [
      { id: "d", type: "worker", depends_on: ["c"] },
      { id: "c", type: "worker", depends_on: ["a"] },
      { id: "a", type: "worker", depends_on: [] },
    ];
    const groups = groupNodesByLevel(nodes);
    expect(groups.map((g) => g.level)).toEqual([0, 1, 2]);
  });

  it("should return empty array for empty input", () => {
    expect(groupNodesByLevel([])).toEqual([]);
  });
});

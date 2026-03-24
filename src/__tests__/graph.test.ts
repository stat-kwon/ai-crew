import { describe, it, expect } from "vitest";
import { validateGraph } from "../graph.js";
import type { GraphNode } from "../types.js";

function makeNode(overrides: Partial<GraphNode> & { id: string }): GraphNode {
  return {
    type: "worker",
    agent: "dev",
    skills: [],
    hooks: [],
    depends_on: [],
    config: {},
    ...overrides,
  };
}

describe("validateGraph", () => {
  // --------------------------------------------------------
  // Basic valid graph
  // --------------------------------------------------------

  it("accepts an empty node list", () => {
    const result = validateGraph([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a simple valid graph", () => {
    const result = validateGraph([
      makeNode({ id: "a" }),
      makeNode({ id: "b", depends_on: ["a"] }),
    ]);
    expect(result.valid).toBe(true);
  });

  // --------------------------------------------------------
  // verify field validation
  // --------------------------------------------------------

  describe("verify field", () => {
    it("accepts valid verify with built-in checks", () => {
      const result = validateGraph([
        makeNode({ id: "a", verify: ["test", "lint", "build"] }),
      ]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts valid verify with custom command strings", () => {
      const result = validateGraph([
        makeNode({ id: "a", verify: ["npm run e2e", "make check"] }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("accepts node without verify (undefined)", () => {
      const result = validateGraph([
        makeNode({ id: "a" }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("rejects verify that is not an array", () => {
      const node = makeNode({ id: "a" });
      // Force invalid type via cast
      (node as unknown as Record<string, unknown>).verify = "test";
      const result = validateGraph([node]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("verify"))).toBe(true);
    });

    it("rejects verify with non-string elements", () => {
      const node = makeNode({ id: "a" });
      (node as unknown as Record<string, unknown>).verify = [123, true];
      const result = validateGraph([node]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("verify"))).toBe(true);
    });

    it("rejects verify with mixed string and non-string elements", () => {
      const node = makeNode({ id: "a" });
      (node as unknown as Record<string, unknown>).verify = ["test", 42];
      const result = validateGraph([node]);
      expect(result.valid).toBe(false);
    });
  });

  // --------------------------------------------------------
  // retry field validation
  // --------------------------------------------------------

  describe("config.retry field", () => {
    it("accepts retry = 0", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: 0 } }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("accepts retry = 1", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: 1 } }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("accepts retry = 2", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: 2 } }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("accepts retry = 3", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: 3 } }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("accepts node without retry (undefined)", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: {} }),
      ]);
      expect(result.valid).toBe(true);
    });

    it("rejects retry = -1", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: -1 } }),
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
    });

    it("rejects retry = 4", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: 4 } }),
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
    });

    it("rejects retry = 1.5 (non-integer)", () => {
      const result = validateGraph([
        makeNode({ id: "a", config: { retry: 1.5 } }),
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("integer"))).toBe(true);
    });

    it("rejects retry as string", () => {
      const node = makeNode({ id: "a" });
      (node.config as Record<string, unknown>).retry = "2";
      const result = validateGraph([node]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
    });
  });

  // --------------------------------------------------------
  // Duplicate IDs
  // --------------------------------------------------------

  it("rejects duplicate node IDs", () => {
    const result = validateGraph([
      makeNode({ id: "a" }),
      makeNode({ id: "a" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  // --------------------------------------------------------
  // Dangling dependencies
  // --------------------------------------------------------

  it("rejects dependency on unknown node", () => {
    const result = validateGraph([
      makeNode({ id: "a", depends_on: ["nonexistent"] }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("unknown node"))).toBe(true);
  });

  // --------------------------------------------------------
  // Cycle detection
  // --------------------------------------------------------

  it("rejects a graph with a cycle", () => {
    const result = validateGraph([
      makeNode({ id: "a", depends_on: ["b"] }),
      makeNode({ id: "b", depends_on: ["a"] }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("cycle"))).toBe(true);
  });

  it("rejects a graph with a self-loop", () => {
    const result = validateGraph([
      makeNode({ id: "a", depends_on: ["a"] }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("cycle"))).toBe(true);
  });

  it("accepts a valid DAG with diamond shape", () => {
    const result = validateGraph([
      makeNode({ id: "a" }),
      makeNode({ id: "b", depends_on: ["a"] }),
      makeNode({ id: "c", depends_on: ["a"] }),
      makeNode({ id: "d", depends_on: ["b", "c"] }),
    ]);
    expect(result.valid).toBe(true);
  });

  // --------------------------------------------------------
  // Combined verify + retry
  // --------------------------------------------------------

  it("accepts node with both valid verify and retry", () => {
    const result = validateGraph([
      makeNode({ id: "a", config: { retry: 2 }, verify: ["test", "lint"] }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports multiple errors for invalid verify and retry together", () => {
    const node = makeNode({ id: "a", config: { retry: 5 } });
    (node as unknown as Record<string, unknown>).verify = [123];
    const result = validateGraph([node]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("verify"))).toBe(true);
    expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
  });
});

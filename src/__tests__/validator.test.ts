import { describe, it, expect } from "vitest";
import {
  validateBundleConfig,
  validateGraphYaml,
  validatePluginJson,
  validateHooksJson,
  validateStateJson,
} from "../validator.js";

describe("validateBundleConfig", () => {
  const validBundle = {
    plugin: { id: "test", name: "Test Bundle", description: "desc", version: "1.0.0" },
    defaults: { model: "claude-sonnet-4", isolation: "worktree", rules: [], mcp: [] },
    includes: { agents: [], skills: [], commands: [], hooks: [] },
    graph: { nodes: [] },
  };

  it("accepts a valid bundle config", () => {
    const result = validateBundleConfig(validBundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object input", () => {
    const result = validateBundleConfig("string");
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("must be an object");
  });

  it("rejects missing plugin", () => {
    const result = validateBundleConfig({ ...validBundle, plugin: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === ".plugin")).toBe(true);
  });

  it("rejects missing plugin.id", () => {
    const result = validateBundleConfig({
      ...validBundle,
      plugin: { name: "Test" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "plugin.id")).toBe(true);
  });

  it("rejects missing defaults.model", () => {
    const result = validateBundleConfig({
      ...validBundle,
      defaults: { isolation: "worktree" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "defaults.model")).toBe(true);
  });

  it("rejects non-array includes.agents", () => {
    const result = validateBundleConfig({
      ...validBundle,
      includes: { ...validBundle.includes, agents: "not-array" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "includes.agents")).toBe(true);
  });

  it("validates graph nodes within bundle", () => {
    const result = validateBundleConfig({
      ...validBundle,
      graph: {
        nodes: [
          { id: "n1", type: "worker", agent: "test", depends_on: [], config: { retry: 5 } },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
  });

  it("validates verify field must be string array", () => {
    const result = validateBundleConfig({
      ...validBundle,
      graph: {
        nodes: [
          { id: "n1", type: "worker", agent: "test", depends_on: [], config: {}, verify: [123] },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("verify"))).toBe(true);
  });

  it("accepts valid verify and retry fields", () => {
    const result = validateBundleConfig({
      ...validBundle,
      graph: {
        nodes: [
          {
            id: "n1",
            type: "worker",
            agent: "test",
            depends_on: [],
            config: { retry: 2 },
            verify: ["test", "lint", "build"],
          },
        ],
      },
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateGraphYaml", () => {
  it("accepts a valid graph", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "a", type: "worker", agent: "dev", depends_on: [], config: {} },
        { id: "b", type: "worker", agent: "dev", depends_on: ["a"], config: {} },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects non-object input", () => {
    const result = validateGraphYaml(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing nodes", () => {
    const result = validateGraphYaml({});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("nodes"))).toBe(true);
  });

  it("rejects invalid node type", () => {
    const result = validateGraphYaml({
      nodes: [{ id: "a", type: "unknown", agent: "dev", depends_on: [] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("type"))).toBe(true);
  });

  it("rejects router without isolation none", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "r", type: "router", agent: "dev", depends_on: [], config: { isolation: "worktree" } },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("none"))).toBe(true);
  });

  it("accepts router with isolation none", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "r", type: "router", agent: "dev", depends_on: [], config: { isolation: "none" } },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects aggregator without wait", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "agg", type: "aggregator", agent: "dev", depends_on: [] },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("wait"))).toBe(true);
  });

  it("accepts aggregator with wait", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "agg", type: "aggregator", agent: "dev", depends_on: [], wait: "all" },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects retry out of range", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "a", type: "worker", agent: "dev", depends_on: [], config: { retry: 4 } },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("retry"))).toBe(true);
  });

  it("rejects negative retry", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "a", type: "worker", agent: "dev", depends_on: [], config: { retry: -1 } },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts retry in valid range", () => {
    for (const retry of [0, 1, 2, 3]) {
      const result = validateGraphYaml({
        nodes: [
          { id: "a", type: "worker", agent: "dev", depends_on: [], config: { retry } },
        ],
      });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects non-integer retry", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "a", type: "worker", agent: "dev", depends_on: [], config: { retry: 1.5 } },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects verify with non-string elements", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "a", type: "worker", agent: "dev", depends_on: [], verify: [true, 42] },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts verify with custom command strings", () => {
    const result = validateGraphYaml({
      nodes: [
        { id: "a", type: "worker", agent: "dev", depends_on: [], verify: ["test", "npm run e2e"] },
      ],
    });
    expect(result.valid).toBe(true);
  });
});

describe("validatePluginJson", () => {
  it("accepts valid plugin.json", () => {
    const result = validatePluginJson({ name: "Test Plugin", description: "A test" });
    expect(result.valid).toBe(true);
  });

  it("rejects non-object", () => {
    const result = validatePluginJson([]);
    expect(result.valid).toBe(false);
  });

  it("rejects missing name", () => {
    const result = validatePluginJson({ description: "desc" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === ".name")).toBe(true);
  });

  it("rejects missing description", () => {
    const result = validatePluginJson({ name: "test" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === ".description")).toBe(true);
  });

  it("rejects empty name", () => {
    const result = validatePluginJson({ name: "", description: "desc" });
    expect(result.valid).toBe(false);
  });
});

describe("validateHooksJson", () => {
  it("accepts valid hooks.json", () => {
    const result = validateHooksJson({
      hooks: { PreInstall: { command: "echo hello" } },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object", () => {
    const result = validateHooksJson("string");
    expect(result.valid).toBe(false);
  });

  it("rejects missing hooks field", () => {
    const result = validateHooksJson({});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "hooks")).toBe(true);
  });

  it("warns on unknown hook events", () => {
    const result = validateHooksJson({
      hooks: { UnknownEvent: { command: "test" } },
    });
    expect(result.valid).toBe(true); // warnings don't make it invalid
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe("warning");
    expect(result.errors[0].message).toContain("Unknown hook event");
  });

  it("accepts all known hook events", () => {
    const result = validateHooksJson({
      hooks: {
        PreInstall: {},
        PostInstall: {},
        PreNodeStart: {},
        PostNodeComplete: {},
        OnError: {},
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validateStateJson", () => {
  it("accepts valid state.json", () => {
    const result = validateStateJson({
      version: "3.0",
      bundleName: "test-bundle",
      nodes: {
        node1: { status: "pending", startedAt: null, completedAt: null },
        node2: { status: "completed", startedAt: "2026-01-01", completedAt: "2026-01-01" },
      },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects non-object", () => {
    const result = validateStateJson(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing version", () => {
    const result = validateStateJson({ bundleName: "test", nodes: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === ".version")).toBe(true);
  });

  it("rejects missing bundleName", () => {
    const result = validateStateJson({ version: "3.0", nodes: {} });
    expect(result.valid).toBe(false);
  });

  it("rejects missing nodes", () => {
    const result = validateStateJson({ version: "3.0", bundleName: "test" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "nodes")).toBe(true);
  });

  it("rejects invalid node status", () => {
    const result = validateStateJson({
      version: "3.0",
      bundleName: "test",
      nodes: { n1: { status: "invalid" } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("status"))).toBe(true);
  });

  it("accepts all valid node statuses", () => {
    const result = validateStateJson({
      version: "3.0",
      bundleName: "test",
      nodes: {
        a: { status: "pending" },
        b: { status: "running" },
        c: { status: "completed" },
        d: { status: "failed" },
        e: { status: "skipped" },
      },
    });
    expect(result.valid).toBe(true);
  });
});

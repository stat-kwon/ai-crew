import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";
import { runValidate } from "../cli-validate.js";

const TEST_DIR = join(tmpdir(), "cli-validate-test-" + process.pid);

beforeEach(async () => {
  await mkdir(join(TEST_DIR, ".ai-crew"), { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

// ============================================================
// Helper to create valid config fixtures
// ============================================================

function validConfigYaml(): Record<string, unknown> {
  return {
    version: "3.0",
    bundle: "aidlc-standard",
    defaults: {
      model: "claude-sonnet-4",
      isolation: "worktree",
      rules: ["global"],
      locale: "en",
    },
  };
}

function validGraphYaml(): Record<string, unknown> {
  return {
    nodes: [
      { id: "n1", type: "worker", agent: "backend-dev", depends_on: [] },
    ],
  };
}

function validStateJson(): Record<string, unknown> {
  return {
    version: "3.0",
    bundleName: "test-bundle",
    nodes: {
      n1: { status: "pending", startedAt: null, completedAt: null },
    },
  };
}

async function writeConfig(data: Record<string, unknown>): Promise<void> {
  await writeFile(join(TEST_DIR, ".ai-crew/config.yaml"), stringify(data), "utf-8");
}

async function writeGraph(data: Record<string, unknown>): Promise<void> {
  await writeFile(join(TEST_DIR, ".ai-crew/graph.yaml"), stringify(data), "utf-8");
}

async function writeState(data: Record<string, unknown>): Promise<void> {
  await writeFile(join(TEST_DIR, ".ai-crew/state.json"), JSON.stringify(data), "utf-8");
}

// ============================================================
// Tests
// ============================================================

describe("runValidate", () => {
  it("returns 0 when all files are valid", async () => {
    await writeConfig(validConfigYaml());
    await writeGraph(validGraphYaml());
    await writeState(validStateJson());

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(0);
  });

  it("returns 1 when no files are found", async () => {
    // Remove the .ai-crew dir so nothing is found
    await rm(join(TEST_DIR, ".ai-crew"), { recursive: true, force: true });

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(1);
  });

  it("returns 0 when some files are missing but present files are valid", async () => {
    // Only config.yaml present
    await writeConfig(validConfigYaml());

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(0);
  });

  it("returns 1 when config.yaml has validation errors", async () => {
    await writeConfig({ version: "2.0" }); // missing bundle, defaults

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(1);
  });

  it("returns 1 when graph.yaml has validation errors", async () => {
    await writeGraph({ nodes: "not-an-array" });

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(1);
  });

  it("returns 1 when state.json has validation errors", async () => {
    await writeState({ version: "3.0" }); // missing bundleName, nodes

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(1);
  });

  it("returns 1 when state.json is invalid JSON", async () => {
    await writeFile(join(TEST_DIR, ".ai-crew/state.json"), "not-json{{{", "utf-8");

    const code = await runValidate(TEST_DIR);
    expect(code).toBe(1);
  });

  it("returns 0 with warnings only (e.g. router condition)", async () => {
    const graph = {
      nodes: [
        {
          id: "r1",
          type: "router",
          agent: "planner",
          depends_on: [],
          condition: "status == success",
          config: { isolation: "none" },
        },
      ],
    };
    await writeGraph(graph);

    const code = await runValidate(TEST_DIR);
    // Warnings alone should not cause failure
    expect(code).toBe(0);
  });
});

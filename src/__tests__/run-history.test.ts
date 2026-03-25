import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  slugify,
  generateRunId,
  loadRegistry,
  saveRegistry,
  createManifest,
  archiveRun,
  pruneOldRuns,
  loadPreviousManifest,
  hasCompletedNodes,
} from "../run-history.js";
import type { GraphState, RunRegistry } from "../types.js";

// ============================================================
// Helpers
// ============================================================

function makeState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    version: "3.1",
    bundleName: "test-bundle",
    nodes: {
      "node-a": { status: "completed", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" },
      "node-b": { status: "failed", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:02:00Z" },
      "node-c": { status: "skipped", startedAt: null, completedAt: null },
    },
    ...overrides,
  };
}

function manifestOpts() {
  return {
    intentDescription: "Initial build",
    intentSlug: "initial-build",
    intentSource: "user" as const,
    graphHash: "abc123",
    graphLevelCount: 3,
    model: "claude-sonnet-4",
    locale: "en",
  };
}

// ============================================================
// Tests
// ============================================================

describe("run-history", () => {
  const testDir = join(
    tmpdir(),
    `run-history-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const crewDir = join(testDir, ".ai-crew");

  beforeEach(async () => {
    await mkdir(crewDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ============================================================
  // slugify
  // ============================================================

  describe("slugify", () => {
    it("converts to lowercase and replaces spaces with hyphens", () => {
      expect(slugify("Fix Auth Bug")).toBe("fix-auth-bug");
    });

    it("removes non-alphanumeric characters", () => {
      expect(slugify("hello@world!")).toBe("hello-world");
    });

    it("trims leading and trailing hyphens", () => {
      expect(slugify("--hello--")).toBe("hello");
    });

    it("truncates to 30 characters", () => {
      const long = "a".repeat(40);
      expect(slugify(long).length).toBe(30);
    });

    it("handles Korean input by removing non-alphanumeric", () => {
      expect(slugify("인증 fix")).toBe("fix");
    });
  });

  // ============================================================
  // generateRunId
  // ============================================================

  describe("generateRunId", () => {
    it("generates id with slug, date, and sequence 1", async () => {
      const id = await generateRunId(crewDir, "initial-build", new Date("2026-03-24"));
      expect(id).toBe("initial-build-20260324-1");
    });

    it("increments sequence for same slug and date", async () => {
      // Pre-populate registry with existing run
      const registry: RunRegistry = {
        schema: "ai-crew.runs.v1",
        current: null,
        runs: [{
          runId: "initial-build-20260324-1",
          intent: "Initial build",
          state: "archived",
          createdAt: "2026-03-24T00:00:00Z",
          completedAt: "2026-03-24T01:00:00Z",
          nodesTotal: 3,
          nodesCompleted: 3,
          nodesFailed: 0,
        }],
        stats: { totalRuns: 1, totalCompleted: 1, totalFailed: 0 },
      };
      await saveRegistry(crewDir, registry);

      const id = await generateRunId(crewDir, "initial-build", new Date("2026-03-24"));
      expect(id).toBe("initial-build-20260324-2");
    });

    it("throws on empty slug", async () => {
      await expect(generateRunId(crewDir, "", new Date())).rejects.toThrow("alphanumeric");
    });
  });

  // ============================================================
  // loadRegistry / saveRegistry
  // ============================================================

  describe("registry", () => {
    it("returns empty registry when file does not exist", async () => {
      const reg = await loadRegistry(crewDir);
      expect(reg.schema).toBe("ai-crew.runs.v1");
      expect(reg.runs).toHaveLength(0);
      expect(reg.current).toBeNull();
    });

    it("round-trips registry data", async () => {
      const registry: RunRegistry = {
        schema: "ai-crew.runs.v1",
        current: "test-run-1",
        runs: [{
          runId: "test-run-1",
          intent: "Test",
          state: "running",
          createdAt: "2026-01-01T00:00:00Z",
          completedAt: null,
          nodesTotal: 2,
          nodesCompleted: 0,
          nodesFailed: 0,
        }],
        stats: { totalRuns: 1, totalCompleted: 0, totalFailed: 0 },
      };
      await saveRegistry(crewDir, registry);
      const loaded = await loadRegistry(crewDir);
      expect(loaded.current).toBe("test-run-1");
      expect(loaded.runs).toHaveLength(1);
      expect(loaded.runs[0].runId).toBe("test-run-1");
    });
  });

  // ============================================================
  // createManifest
  // ============================================================

  describe("createManifest", () => {
    it("creates manifest with correct outcome from state", () => {
      const state = makeState();
      const manifest = createManifest("test-20260324-1", state, manifestOpts());

      expect(manifest.schema).toBe("ai-crew.run.v1");
      expect(manifest.runId).toBe("test-20260324-1");
      expect(manifest.intent.description).toBe("Initial build");
      expect(manifest.state).toBe("failed"); // has failed nodes
      expect(manifest.outcome!.nodesCompleted).toEqual(["node-a"]);
      expect(manifest.outcome!.nodesFailed).toEqual(["node-b"]);
      expect(manifest.outcome!.nodesSkipped).toEqual(["node-c"]);
    });

    it("sets state to completed when no failures", () => {
      const state = makeState({
        nodes: {
          "node-a": { status: "completed", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" },
        },
      });
      const manifest = createManifest("test-20260324-1", state, manifestOpts());
      expect(manifest.state).toBe("completed");
    });

    it("computes duration for node summaries", () => {
      const state = makeState();
      const manifest = createManifest("test-20260324-1", state, manifestOpts());
      expect(manifest.nodeSummaries["node-a"].duration).toBe("1m 0s");
    });

    it("excludes pending/running nodes from summaries", () => {
      const state = makeState({
        nodes: {
          "node-a": { status: "completed", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" },
          "node-b": { status: "pending", startedAt: null, completedAt: null },
          "node-c": { status: "running", startedAt: "2026-01-01T00:00:00Z", completedAt: null },
        },
      });
      const manifest = createManifest("test-20260324-1", state, manifestOpts());
      expect(Object.keys(manifest.nodeSummaries)).toEqual(["node-a"]);
    });
  });

  // ============================================================
  // archiveRun
  // ============================================================

  describe("archiveRun", () => {
    it("moves scratchpad and checkpoints to archive", async () => {
      // Setup: create scratchpad and checkpoint files
      const scratchDir = join(crewDir, "scratchpad");
      const checkDir = join(crewDir, "checkpoints");
      await mkdir(scratchDir, { recursive: true });
      await mkdir(checkDir, { recursive: true });
      await writeFile(join(scratchDir, "L0-node-a.md"), "# node-a\nDone.");
      await writeFile(join(checkDir, "level-000.json"), "{}");
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()));

      const state = makeState();
      const manifest = createManifest("initial-build-20260324-1", state, manifestOpts());

      const archivePath = await archiveRun(crewDir, manifest);

      // Verify archive exists
      const archiveManifest = JSON.parse(
        await readFile(join(archivePath, "manifest.json"), "utf-8"),
      );
      expect(archiveManifest.state).toBe("archived");
      expect(archiveManifest.runId).toBe("initial-build-20260324-1");

      // Verify scratchpad moved
      const archivedScratchpad = await readFile(
        join(archivePath, "scratchpad", "L0-node-a.md"),
        "utf-8",
      );
      expect(archivedScratchpad).toContain("node-a");

      // Verify original scratchpad removed
      const scratchExists = await readdir(scratchDir).catch(() => null);
      expect(scratchExists).toBeNull();

      // Verify registry updated
      const registry = await loadRegistry(crewDir);
      expect(registry.runs).toHaveLength(1);
      expect(registry.runs[0].state).toBe("archived");
    });
  });

  // ============================================================
  // pruneOldRuns
  // ============================================================

  describe("pruneOldRuns", () => {
    it("removes oldest runs exceeding retention", async () => {
      // Create 3 archived runs
      for (let i = 1; i <= 3; i++) {
        const runDir = join(crewDir, "runs", `run-${i}`);
        await mkdir(runDir, { recursive: true });
        await writeFile(join(runDir, "manifest.json"), "{}");
      }

      const registry: RunRegistry = {
        schema: "ai-crew.runs.v1",
        current: null,
        runs: [
          { runId: "run-1", intent: "A", state: "archived", createdAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T01:00:00Z", nodesTotal: 1, nodesCompleted: 1, nodesFailed: 0 },
          { runId: "run-2", intent: "B", state: "archived", createdAt: "2026-01-02T00:00:00Z", completedAt: "2026-01-02T01:00:00Z", nodesTotal: 1, nodesCompleted: 1, nodesFailed: 0 },
          { runId: "run-3", intent: "C", state: "archived", createdAt: "2026-01-03T00:00:00Z", completedAt: "2026-01-03T01:00:00Z", nodesTotal: 1, nodesCompleted: 1, nodesFailed: 0 },
        ],
        stats: { totalRuns: 3, totalCompleted: 3, totalFailed: 0 },
      };
      await saveRegistry(crewDir, registry);

      const removed = await pruneOldRuns(crewDir, 2);
      expect(removed).toEqual(["run-1"]);

      const updated = await loadRegistry(crewDir);
      expect(updated.runs).toHaveLength(2);
      expect(updated.runs.map((r) => r.runId)).toEqual(["run-2", "run-3"]);
    });

    it("does nothing when within retention limit", async () => {
      const registry: RunRegistry = {
        schema: "ai-crew.runs.v1",
        current: null,
        runs: [
          { runId: "run-1", intent: "A", state: "archived", createdAt: "2026-01-01T00:00:00Z", completedAt: null, nodesTotal: 1, nodesCompleted: 1, nodesFailed: 0 },
        ],
        stats: { totalRuns: 1, totalCompleted: 1, totalFailed: 0 },
      };
      await saveRegistry(crewDir, registry);

      const removed = await pruneOldRuns(crewDir, 5);
      expect(removed).toEqual([]);
    });

    it("throws on retention < 1", async () => {
      await expect(pruneOldRuns(crewDir, 0)).rejects.toThrow("retention");
    });
  });

  // ============================================================
  // loadPreviousManifest
  // ============================================================

  describe("loadPreviousManifest", () => {
    it("returns null when no archived runs exist", async () => {
      const manifest = await loadPreviousManifest(crewDir);
      expect(manifest).toBeNull();
    });

    it("loads the most recent archived run manifest", async () => {
      const state = makeState();
      const manifest = createManifest("test-20260324-1", state, manifestOpts());
      await archiveRun(crewDir, manifest);

      // Create scratchpad/state for a second run to archive
      await mkdir(join(crewDir, "scratchpad"), { recursive: true });
      await writeFile(join(crewDir, "state.json"), JSON.stringify(state));
      const manifest2 = createManifest("test-20260325-1", state, {
        ...manifestOpts(),
        intentDescription: "Second run",
      });
      await archiveRun(crewDir, manifest2);

      const loaded = await loadPreviousManifest(crewDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.runId).toBe("test-20260325-1");
    });
  });

  // ============================================================
  // hasCompletedNodes
  // ============================================================

  describe("hasCompletedNodes", () => {
    it("returns true when nodes are completed", () => {
      expect(hasCompletedNodes(makeState())).toBe(true);
    });

    it("returns false when all nodes are pending", () => {
      const state = makeState({
        nodes: {
          "node-a": { status: "pending", startedAt: null, completedAt: null },
        },
      });
      expect(hasCompletedNodes(state)).toBe(false);
    });

    it("returns true when nodes are failed", () => {
      const state = makeState({
        nodes: {
          "node-a": { status: "failed", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" },
        },
      });
      expect(hasCompletedNodes(state)).toBe(true);
    });
  });
});

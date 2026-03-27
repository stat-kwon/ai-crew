import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createCheckpoint,
  listCheckpoints,
  restoreCheckpoint,
} from "../checkpoint.js";
import type { GraphState, SharedMemoryStore, CheckpointData } from "../types.js";

// ============================================================
// Test fixtures
// ============================================================

function makeState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    version: "3.0",
    bundleName: "test-bundle",
    nodes: {
      "node-a": { status: "completed", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" },
      "node-b": { status: "pending", startedAt: null, completedAt: null },
    },
    ...overrides,
  };
}

function makeMemory(overrides: Partial<SharedMemoryStore> = {}): SharedMemoryStore {
  return {
    version: "1.0",
    nodes: {
      "node-a": { result: "ok", count: 42 },
    },
    updatedAt: "2026-01-01T00:01:00Z",
    ...overrides,
  };
}

describe("checkpoint", () => {
  const testDir = join(
    tmpdir(),
    `checkpoint-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const crewDir = join(testDir, ".ai-crew");

  beforeEach(async () => {
    await mkdir(crewDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ----------------------------------------------------------
  // createCheckpoint
  // ----------------------------------------------------------

  describe("createCheckpoint", () => {
    it("should create a checkpoint file with correct data", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");
      await writeFile(join(crewDir, "memory.json"), JSON.stringify(makeMemory()), "utf-8");

      const path = await createCheckpoint(crewDir, 0);

      expect(path).toContain("level-000.json");
      const raw = await readFile(path, "utf-8");
      const data: CheckpointData = JSON.parse(raw);

      expect(data.level).toBe(0);
      expect(data.createdAt).toBeTruthy();
      expect(data.state.version).toBe("3.0");
      expect(data.state.bundleName).toBe("test-bundle");
      expect(data.memory.nodes["node-a"]).toEqual({ result: "ok", count: 42 });
    });

    it("should zero-pad the level to 3 digits", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");

      const path = await createCheckpoint(crewDir, 5);
      expect(path).toContain("level-005.json");
    });

    it("should handle double-digit levels", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");

      const path = await createCheckpoint(crewDir, 42);
      expect(path).toContain("level-042.json");
    });

    it("should create checkpoints directory if it does not exist", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");

      const path = await createCheckpoint(crewDir, 0);
      const raw = await readFile(path, "utf-8");
      expect(JSON.parse(raw)).toHaveProperty("level", 0);
    });

    it("should use empty memory when memory.json does not exist", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");
      // No memory.json

      const path = await createCheckpoint(crewDir, 0);
      const data: CheckpointData = JSON.parse(await readFile(path, "utf-8"));

      expect(data.memory.version).toBe("1.0");
      expect(data.memory.nodes).toEqual({});
    });

    it("should throw when state.json does not exist", async () => {
      await expect(createCheckpoint(crewDir, 0)).rejects.toThrow(
        /state\.json not found/,
      );
    });

    it("should throw when crewDir is empty", async () => {
      await expect(createCheckpoint("", 0)).rejects.toThrow("crewDir is required");
    });

    it("should throw when level is negative", async () => {
      await expect(createCheckpoint(crewDir, -1)).rejects.toThrow(
        "level must be a non-negative integer",
      );
    });

    it("should overwrite an existing checkpoint at the same level", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");

      await createCheckpoint(crewDir, 1);

      // Update state and create again at same level
      const updatedState = makeState({ bundleName: "updated-bundle" });
      await writeFile(join(crewDir, "state.json"), JSON.stringify(updatedState), "utf-8");

      const path = await createCheckpoint(crewDir, 1);
      const data: CheckpointData = JSON.parse(await readFile(path, "utf-8"));

      expect(data.state.bundleName).toBe("updated-bundle");
    });
  });

  // ----------------------------------------------------------
  // listCheckpoints
  // ----------------------------------------------------------

  describe("listCheckpoints", () => {
    it("should return empty array when checkpoints dir does not exist", async () => {
      const result = await listCheckpoints(crewDir);
      expect(result).toEqual([]);
    });

    it("should return checkpoints sorted by level", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");
      await writeFile(join(crewDir, "memory.json"), JSON.stringify(makeMemory()), "utf-8");

      // Create out of order
      await createCheckpoint(crewDir, 2);
      await createCheckpoint(crewDir, 0);
      await createCheckpoint(crewDir, 1);

      const result = await listCheckpoints(crewDir);

      expect(result).toHaveLength(3);
      expect(result[0].level).toBe(0);
      expect(result[1].level).toBe(1);
      expect(result[2].level).toBe(2);
    });

    it("should include path and createdAt in each entry", async () => {
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");

      await createCheckpoint(crewDir, 0);
      const result = await listCheckpoints(crewDir);

      expect(result).toHaveLength(1);
      expect(result[0].path).toContain("level-000.json");
      expect(result[0].createdAt).toBeTruthy();
    });

    it("should ignore non-checkpoint files in checkpoints directory", async () => {
      const dir = join(crewDir, "checkpoints");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "notes.txt"), "not a checkpoint", "utf-8");
      await writeFile(join(dir, "random.json"), "{}", "utf-8");

      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");
      await createCheckpoint(crewDir, 0);

      const result = await listCheckpoints(crewDir);
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe(0);
    });

    it("should throw when crewDir is empty", async () => {
      await expect(listCheckpoints("")).rejects.toThrow("crewDir is required");
    });
  });

  // ----------------------------------------------------------
  // restoreCheckpoint
  // ----------------------------------------------------------

  describe("restoreCheckpoint", () => {
    it("should restore state.json and memory.json from checkpoint", async () => {
      // Create initial state and checkpoint
      const originalState = makeState();
      const originalMemory = makeMemory();
      await writeFile(join(crewDir, "state.json"), JSON.stringify(originalState), "utf-8");
      await writeFile(join(crewDir, "memory.json"), JSON.stringify(originalMemory), "utf-8");
      const cpPath = await createCheckpoint(crewDir, 0);

      // Modify state and memory
      const modifiedState = makeState({ bundleName: "modified" });
      await writeFile(join(crewDir, "state.json"), JSON.stringify(modifiedState), "utf-8");
      await writeFile(
        join(crewDir, "memory.json"),
        JSON.stringify(makeMemory({ nodes: { "node-x": { foo: "bar" } } })),
        "utf-8",
      );

      // Restore
      await restoreCheckpoint(cpPath, crewDir);

      // Verify restored data
      const restoredState: GraphState = JSON.parse(
        await readFile(join(crewDir, "state.json"), "utf-8"),
      );
      const restoredMemory: SharedMemoryStore = JSON.parse(
        await readFile(join(crewDir, "memory.json"), "utf-8"),
      );

      expect(restoredState.bundleName).toBe("test-bundle");
      expect(restoredMemory.nodes["node-a"]).toEqual({ result: "ok", count: 42 });
    });

    it("should create backup files before overwriting", async () => {
      const originalState = makeState();
      const originalMemory = makeMemory();
      await writeFile(join(crewDir, "state.json"), JSON.stringify(originalState), "utf-8");
      await writeFile(join(crewDir, "memory.json"), JSON.stringify(originalMemory), "utf-8");
      const cpPath = await createCheckpoint(crewDir, 0);

      // Modify files so backup differs
      const modifiedState = makeState({ bundleName: "modified-for-backup" });
      const modifiedMemory = makeMemory({ nodes: { "node-z": { x: 1 } } });
      await writeFile(join(crewDir, "state.json"), JSON.stringify(modifiedState), "utf-8");
      await writeFile(join(crewDir, "memory.json"), JSON.stringify(modifiedMemory), "utf-8");

      await restoreCheckpoint(cpPath, crewDir);

      // Check backup files contain the modified (pre-restore) data
      const bakState: GraphState = JSON.parse(
        await readFile(join(crewDir, "state.json.bak"), "utf-8"),
      );
      const bakMemory: SharedMemoryStore = JSON.parse(
        await readFile(join(crewDir, "memory.json.bak"), "utf-8"),
      );

      expect(bakState.bundleName).toBe("modified-for-backup");
      expect(bakMemory.nodes["node-z"]).toEqual({ x: 1 });
    });

    it("should work when no existing files to back up", async () => {
      // Create a checkpoint with state
      await writeFile(join(crewDir, "state.json"), JSON.stringify(makeState()), "utf-8");
      await writeFile(join(crewDir, "memory.json"), JSON.stringify(makeMemory()), "utf-8");
      const cpPath = await createCheckpoint(crewDir, 0);

      // Remove the files (simulate fresh directory)
      await rm(join(crewDir, "state.json"), { force: true });
      await rm(join(crewDir, "memory.json"), { force: true });

      // Restore should succeed without backup errors
      await restoreCheckpoint(cpPath, crewDir);

      const restoredState: GraphState = JSON.parse(
        await readFile(join(crewDir, "state.json"), "utf-8"),
      );
      expect(restoredState.bundleName).toBe("test-bundle");
    });

    it("should throw when checkpoint file does not exist", async () => {
      await expect(
        restoreCheckpoint("/nonexistent/path/level-000.json", crewDir),
      ).rejects.toThrow(/Checkpoint file not found/);
    });

    it("should throw when checkpoint data is invalid", async () => {
      const badPath = join(crewDir, "bad-checkpoint.json");
      await writeFile(badPath, JSON.stringify({ level: 0 }), "utf-8");

      await expect(restoreCheckpoint(badPath, crewDir)).rejects.toThrow(
        /Invalid checkpoint data/,
      );
    });

    it("should throw when checkpointPath is empty", async () => {
      await expect(restoreCheckpoint("", crewDir)).rejects.toThrow(
        "checkpointPath is required",
      );
    });

    it("should throw when crewDir is empty", async () => {
      await expect(restoreCheckpoint("/some/path", "")).rejects.toThrow(
        "crewDir is required",
      );
    });
  });
});

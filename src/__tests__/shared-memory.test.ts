import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  writeNodeOutput,
  readNodeOutput,
  readDependencyOutputs,
  clearMemory,
} from "../shared-memory.js";

describe("shared-memory", () => {
  const testDir = join(tmpdir(), `shared-memory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const crewDir = join(testDir, ".ai-crew");

  beforeEach(async () => {
    await mkdir(crewDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ----------------------------------------------------------
  // writeNodeOutput
  // ----------------------------------------------------------

  describe("writeNodeOutput", () => {
    it("creates memory file when it does not exist", async () => {
      await writeNodeOutput(crewDir, "node-a", { result: "ok" });

      const raw = await readFile(join(crewDir, "memory.json"), "utf-8");
      const store = JSON.parse(raw);

      expect(store.version).toBe("1.0");
      expect(store.nodes["node-a"]).toEqual({ result: "ok" });
      expect(store.updatedAt).toBeTruthy();
    });

    it("merges data into existing store without overwriting other nodes", async () => {
      await writeNodeOutput(crewDir, "node-a", { x: 1 });
      await writeNodeOutput(crewDir, "node-b", { y: 2 });

      const raw = await readFile(join(crewDir, "memory.json"), "utf-8");
      const store = JSON.parse(raw);

      expect(store.nodes["node-a"]).toEqual({ x: 1 });
      expect(store.nodes["node-b"]).toEqual({ y: 2 });
    });

    it("overwrites data for the same node on subsequent writes", async () => {
      await writeNodeOutput(crewDir, "node-a", { v: 1 });
      await writeNodeOutput(crewDir, "node-a", { v: 2, extra: true });

      const raw = await readFile(join(crewDir, "memory.json"), "utf-8");
      const store = JSON.parse(raw);

      expect(store.nodes["node-a"]).toEqual({ v: 2, extra: true });
    });

    it("creates the crewDir if it does not exist", async () => {
      const freshDir = join(testDir, "new-crew-dir");
      await writeNodeOutput(freshDir, "node-x", { created: true });

      const raw = await readFile(join(freshDir, "memory.json"), "utf-8");
      const store = JSON.parse(raw);
      expect(store.nodes["node-x"]).toEqual({ created: true });
    });

    it("throws on empty crewDir", async () => {
      await expect(writeNodeOutput("", "n", {})).rejects.toThrow("crewDir is required");
    });

    it("throws on empty nodeId", async () => {
      await expect(writeNodeOutput(crewDir, "", {})).rejects.toThrow("nodeId is required");
    });

    it("updates the updatedAt timestamp on each write", async () => {
      await writeNodeOutput(crewDir, "node-a", { a: 1 });
      const raw1 = await readFile(join(crewDir, "memory.json"), "utf-8");
      const ts1 = JSON.parse(raw1).updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      await writeNodeOutput(crewDir, "node-b", { b: 1 });
      const raw2 = await readFile(join(crewDir, "memory.json"), "utf-8");
      const ts2 = JSON.parse(raw2).updatedAt;

      expect(new Date(ts2).getTime()).toBeGreaterThanOrEqual(new Date(ts1).getTime());
    });
  });

  // ----------------------------------------------------------
  // readNodeOutput
  // ----------------------------------------------------------

  describe("readNodeOutput", () => {
    it("returns data for an existing node", async () => {
      await writeNodeOutput(crewDir, "node-a", { result: 42 });

      const data = await readNodeOutput(crewDir, "node-a");
      expect(data).toEqual({ result: 42 });
    });

    it("returns null when node does not exist in store", async () => {
      await writeNodeOutput(crewDir, "node-a", { result: 42 });

      const data = await readNodeOutput(crewDir, "nonexistent");
      expect(data).toBeNull();
    });

    it("returns null when memory file does not exist", async () => {
      const data = await readNodeOutput(crewDir, "any-node");
      expect(data).toBeNull();
    });

    it("throws on empty crewDir", async () => {
      await expect(readNodeOutput("", "n")).rejects.toThrow("crewDir is required");
    });

    it("throws on empty nodeId", async () => {
      await expect(readNodeOutput(crewDir, "")).rejects.toThrow("nodeId is required");
    });
  });

  // ----------------------------------------------------------
  // readDependencyOutputs
  // ----------------------------------------------------------

  describe("readDependencyOutputs", () => {
    it("returns data for all specified dependency nodes", async () => {
      await writeNodeOutput(crewDir, "dep-1", { x: 1 });
      await writeNodeOutput(crewDir, "dep-2", { y: 2 });
      await writeNodeOutput(crewDir, "dep-3", { z: 3 });

      const result = await readDependencyOutputs(crewDir, ["dep-1", "dep-3"]);

      expect(result).toEqual({
        "dep-1": { x: 1 },
        "dep-3": { z: 3 },
      });
    });

    it("omits missing dependencies from the result", async () => {
      await writeNodeOutput(crewDir, "dep-1", { x: 1 });

      const result = await readDependencyOutputs(crewDir, ["dep-1", "dep-missing"]);

      expect(result).toEqual({ "dep-1": { x: 1 } });
      expect(result["dep-missing"]).toBeUndefined();
    });

    it("returns empty object when memory file does not exist", async () => {
      const result = await readDependencyOutputs(crewDir, ["dep-1"]);
      expect(result).toEqual({});
    });

    it("returns empty object for an empty dependsOn array", async () => {
      await writeNodeOutput(crewDir, "dep-1", { x: 1 });

      const result = await readDependencyOutputs(crewDir, []);
      expect(result).toEqual({});
    });

    it("throws on empty crewDir", async () => {
      await expect(readDependencyOutputs("", ["a"])).rejects.toThrow("crewDir is required");
    });
  });

  // ----------------------------------------------------------
  // clearMemory
  // ----------------------------------------------------------

  describe("clearMemory", () => {
    it("removes the memory file", async () => {
      await writeNodeOutput(crewDir, "node-a", { x: 1 });
      await clearMemory(crewDir);

      const data = await readNodeOutput(crewDir, "node-a");
      expect(data).toBeNull();
    });

    it("is a no-op when memory file does not exist", async () => {
      // Should not throw
      await clearMemory(crewDir);
    });

    it("throws on empty crewDir", async () => {
      await expect(clearMemory("")).rejects.toThrow("crewDir is required");
    });
  });

  // ----------------------------------------------------------
  // Edge cases: corrupt file handling
  // ----------------------------------------------------------

  describe("corrupt file handling", () => {
    it("throws on invalid JSON in memory file", async () => {
      await writeFile(join(crewDir, "memory.json"), "not-json{{{", "utf-8");

      await expect(readNodeOutput(crewDir, "node-a")).rejects.toThrow();
    });

    it("returns null for valid JSON that is not a SharedMemoryStore", async () => {
      await writeFile(join(crewDir, "memory.json"), JSON.stringify([1, 2, 3]), "utf-8");

      const data = await readNodeOutput(crewDir, "node-a");
      expect(data).toBeNull();
    });

    it("writeNodeOutput replaces corrupt store with fresh one", async () => {
      await writeFile(join(crewDir, "memory.json"), JSON.stringify({ foo: "bar" }), "utf-8");

      // Missing version/nodes fields -> loadStore returns null -> fresh store created
      await writeNodeOutput(crewDir, "node-a", { recovered: true });

      const data = await readNodeOutput(crewDir, "node-a");
      expect(data).toEqual({ recovered: true });
    });
  });
});

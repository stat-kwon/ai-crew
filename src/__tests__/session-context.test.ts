import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveContext, loadContext, mergeAgentLearning } from "../session-context.js";
import type { ProjectContext } from "../types.js";

function makeContext(overrides?: Partial<ProjectContext>): ProjectContext {
  return {
    techStack: ["TypeScript", "Node.js"],
    patterns: ["ESM", "vitest"],
    agentNotes: {},
    lastRunAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("session-context", () => {
  let tmpDir: string;
  let crewDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "session-ctx-"));
    crewDir = join(tmpDir, ".ai-crew");
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ── saveContext ──────────────────────────────────────────

  describe("saveContext", () => {
    it("writes project-context.json with formatted JSON", async () => {
      const ctx = makeContext();
      await saveContext(crewDir, ctx);

      const raw = await readFile(join(crewDir, "project-context.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(ctx);
      // Pretty-printed with trailing newline
      expect(raw.endsWith("\n")).toBe(true);
      expect(raw).toContain("\n  ");
    });

    it("creates the directory if it does not exist", async () => {
      const deepDir = join(tmpDir, "a", "b", ".ai-crew");
      await saveContext(deepDir, makeContext());

      const raw = await readFile(join(deepDir, "project-context.json"), "utf-8");
      expect(JSON.parse(raw).techStack).toEqual(["TypeScript", "Node.js"]);
    });

    it("overwrites an existing file", async () => {
      await saveContext(crewDir, makeContext());
      const updated = makeContext({ techStack: ["Rust"] });
      await saveContext(crewDir, updated);

      const loaded = await loadContext(crewDir);
      expect(loaded?.techStack).toEqual(["Rust"]);
    });

    it("throws if crewDir is empty", async () => {
      await expect(saveContext("", makeContext())).rejects.toThrow("crewDir must be a non-empty string");
    });

    it("throws if context has invalid techStack", async () => {
      const bad = { ...makeContext(), techStack: "not-array" } as unknown as ProjectContext;
      await expect(saveContext(crewDir, bad)).rejects.toThrow("techStack must be an array");
    });

    it("throws if context has non-string techStack items", async () => {
      const bad = { ...makeContext(), techStack: [42] } as unknown as ProjectContext;
      await expect(saveContext(crewDir, bad)).rejects.toThrow("techStack items must be strings");
    });

    it("throws if agentNotes is not an object", async () => {
      const bad = { ...makeContext(), agentNotes: "bad" } as unknown as ProjectContext;
      await expect(saveContext(crewDir, bad)).rejects.toThrow("agentNotes must be an object");
    });

    it("throws if agentNotes values are not string arrays", async () => {
      const bad = { ...makeContext(), agentNotes: { node1: [123] } } as unknown as ProjectContext;
      await expect(saveContext(crewDir, bad)).rejects.toThrow('agentNotes["node1"] items must be strings');
    });
  });

  // ── loadContext ──────────────────────────────────────────

  describe("loadContext", () => {
    it("returns null if file does not exist", async () => {
      const result = await loadContext(crewDir);
      expect(result).toBeNull();
    });

    it("loads a valid context file", async () => {
      const ctx = makeContext({ agentNotes: { backend: ["learned X"] } });
      await saveContext(crewDir, ctx);

      const loaded = await loadContext(crewDir);
      expect(loaded).toEqual(ctx);
    });

    it("throws on invalid JSON", async () => {
      const { writeFile: wf, mkdir: mkd } = await import("node:fs/promises");
      await mkd(crewDir, { recursive: true });
      await wf(join(crewDir, "project-context.json"), "not json", "utf-8");

      await expect(loadContext(crewDir)).rejects.toThrow("invalid JSON");
    });

    it("throws on valid JSON with missing fields", async () => {
      const { writeFile: wf, mkdir: mkd } = await import("node:fs/promises");
      await mkd(crewDir, { recursive: true });
      await wf(join(crewDir, "project-context.json"), '{"techStack": []}', "utf-8");

      await expect(loadContext(crewDir)).rejects.toThrow("patterns must be an array");
    });

    it("throws if crewDir is empty", async () => {
      await expect(loadContext("")).rejects.toThrow("crewDir must be a non-empty string");
    });
  });

  // ── mergeAgentLearning ──────────────────────────────────

  describe("mergeAgentLearning", () => {
    it("creates a new context if none exists", async () => {
      await mergeAgentLearning(crewDir, "backend", "use ESM imports");

      const loaded = await loadContext(crewDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.agentNotes.backend).toEqual(["use ESM imports"]);
      expect(loaded!.techStack).toEqual([]);
      expect(loaded!.patterns).toEqual([]);
    });

    it("appends to existing agent notes", async () => {
      await saveContext(crewDir, makeContext({ agentNotes: { backend: ["note1"] } }));
      await mergeAgentLearning(crewDir, "backend", "note2");

      const loaded = await loadContext(crewDir);
      expect(loaded!.agentNotes.backend).toEqual(["note1", "note2"]);
    });

    it("creates a new agent entry if nodeId not present", async () => {
      await saveContext(crewDir, makeContext({ agentNotes: { backend: ["note1"] } }));
      await mergeAgentLearning(crewDir, "frontend", "use React");

      const loaded = await loadContext(crewDir);
      expect(loaded!.agentNotes.backend).toEqual(["note1"]);
      expect(loaded!.agentNotes.frontend).toEqual(["use React"]);
    });

    it("updates the updatedAt timestamp", async () => {
      const ctx = makeContext({ updatedAt: "2020-01-01T00:00:00.000Z" });
      await saveContext(crewDir, ctx);
      await mergeAgentLearning(crewDir, "backend", "learning");

      const loaded = await loadContext(crewDir);
      expect(loaded!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });

    it("throws if nodeId is empty", async () => {
      await expect(mergeAgentLearning(crewDir, "", "note")).rejects.toThrow("nodeId must be a non-empty string");
    });

    it("throws if learning is not a string", async () => {
      await expect(
        mergeAgentLearning(crewDir, "backend", 42 as unknown as string),
      ).rejects.toThrow("learning must be a string");
    });

    it("preserves other context fields when merging", async () => {
      const ctx = makeContext({
        techStack: ["Go", "Postgres"],
        patterns: ["hexagonal"],
        agentNotes: {},
      });
      await saveContext(crewDir, ctx);
      await mergeAgentLearning(crewDir, "db", "use indexes");

      const loaded = await loadContext(crewDir);
      expect(loaded!.techStack).toEqual(["Go", "Postgres"]);
      expect(loaded!.patterns).toEqual(["hexagonal"]);
    });
  });
});

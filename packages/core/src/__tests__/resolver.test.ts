import { describe, it, expect } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseAgentFrontmatter } from "../resolver.js";

describe("parseAgentFrontmatter", () => {
  const testDir = join(tmpdir(), "resolver-test-" + Date.now());

  async function createTempFile(name: string, content: string): Promise<string> {
    await mkdir(testDir, { recursive: true });
    const path = join(testDir, name);
    await writeFile(path, content, "utf-8");
    return path;
  }

  // Cleanup is not strictly required for temp files, but good practice
  it("extracts model from valid frontmatter", async () => {
    const path = await createTempFile("agent1.md", [
      "---",
      "model: claude-opus-4",
      "---",
      "# Agent prompt",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBe("claude-opus-4");

    await rm(path);
  });

  it("handles quoted model values", async () => {
    const path = await createTempFile("agent2.md", [
      "---",
      'model: "gpt-4o"',
      "---",
      "content",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBe("gpt-4o");

    await rm(path);
  });

  it("handles single-quoted model values", async () => {
    const path = await createTempFile("agent2b.md", [
      "---",
      "model: 'gemini-2.5-pro'",
      "---",
      "content",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBe("gemini-2.5-pro");

    await rm(path);
  });

  it("returns empty object when file has no frontmatter", async () => {
    const path = await createTempFile("agent3.md", "# Just a heading\nSome content");

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBeUndefined();

    await rm(path);
  });

  it("returns empty object when frontmatter has no model", async () => {
    const path = await createTempFile("agent4.md", [
      "---",
      "name: test-agent",
      "description: A test",
      "---",
      "content",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBeUndefined();

    await rm(path);
  });

  it("returns empty object for non-existent file", async () => {
    const result = await parseAgentFrontmatter("/nonexistent/path/agent.md");
    expect(result.model).toBeUndefined();
  });

  it("returns empty object when frontmatter is unclosed", async () => {
    const path = await createTempFile("agent5.md", [
      "---",
      "model: test",
      "no closing delimiter",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBeUndefined();

    await rm(path);
  });

  it("handles frontmatter with leading whitespace", async () => {
    const path = await createTempFile("agent6.md", [
      "  ",
      "---",
      "model: claude-sonnet-4",
      "---",
      "content",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBe("claude-sonnet-4");

    await rm(path);
  });

  it("handles model among other frontmatter fields", async () => {
    const path = await createTempFile("agent7.md", [
      "---",
      "name: backend-dev",
      "version: 1.0",
      "model: claude-opus-4",
      "tags: [backend, api]",
      "---",
      "# Content",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBe("claude-opus-4");

    await rm(path);
  });

  it("returns empty object for empty model value", async () => {
    const path = await createTempFile("agent8.md", [
      "---",
      "model:",
      "---",
      "content",
    ].join("\n"));

    const result = await parseAgentFrontmatter(path);
    expect(result.model).toBeUndefined();

    await rm(path);
  });
});

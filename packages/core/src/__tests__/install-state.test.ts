import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  recordInstall,
  readInstallState,
  diagnose,
  uninstall,
} from "../install-state.js";
import type { InstallResult } from "../types.js";

let testDir: string;

function makeInstallResult(overrides: Partial<InstallResult> = {}): InstallResult {
  return {
    bundleName: "test-bundle",
    targetPath: testDir,
    filesInstalled: 3,
    graphNodes: 0,
    workflowSource: null,
    ...overrides,
  };
}

beforeEach(async () => {
  testDir = join(tmpdir(), `install-state-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(testDir, ".ai-crew"), { recursive: true });
});

afterEach(async () => {
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

// ============================================================
// recordInstall
// ============================================================

describe("recordInstall", () => {
  it("writes install-state.json with correct structure", async () => {
    const files = [
      join(testDir, ".ai-crew/config.yaml"),
      join(testDir, ".claude/settings.json"),
    ];
    // Create the files so they exist
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(files[0], "test", "utf-8");
    await writeFile(files[1], "test", "utf-8");

    await recordInstall(testDir, makeInstallResult(), files);

    const statePath = join(testDir, ".ai-crew/install-state.json");
    expect(existsSync(statePath)).toBe(true);

    const state = JSON.parse(await readFile(statePath, "utf-8"));
    expect(state.version).toBe("1.0");
    expect(state.bundleName).toBe("test-bundle");
    expect(state.files).toContain(".ai-crew/config.yaml");
    expect(state.files).toContain(".claude/settings.json");
    expect(state.installedAt).toBeDefined();
  });

  it("stores relative paths sorted alphabetically", async () => {
    const files = [
      join(testDir, "z-file.txt"),
      join(testDir, "a-file.txt"),
    ];
    for (const f of files) {
      await writeFile(f, "test", "utf-8");
    }

    await recordInstall(testDir, makeInstallResult(), files);

    const state = JSON.parse(
      await readFile(join(testDir, ".ai-crew/install-state.json"), "utf-8"),
    );
    expect(state.files).toEqual(["a-file.txt", "z-file.txt"]);
  });

  it("rejects empty targetPath", async () => {
    await expect(recordInstall("", makeInstallResult(), [])).rejects.toThrow(
      "targetPath must be a non-empty string",
    );
  });

  it("rejects non-array installedFiles", async () => {
    await expect(
      recordInstall(testDir, makeInstallResult(), "not-array" as unknown as string[]),
    ).rejects.toThrow("installedFiles must be an array");
  });
});

// ============================================================
// readInstallState
// ============================================================

describe("readInstallState", () => {
  it("returns null when install-state.json does not exist", async () => {
    const result = await readInstallState(testDir);
    expect(result).toBeNull();
  });

  it("returns parsed state when file exists", async () => {
    await recordInstall(testDir, makeInstallResult(), [
      join(testDir, ".ai-crew/config.yaml"),
    ]);

    const state = await readInstallState(testDir);
    expect(state).not.toBeNull();
    expect(state!.bundleName).toBe("test-bundle");
    expect(state!.files).toHaveLength(1);
  });

  it("returns null for malformed JSON", async () => {
    await writeFile(
      join(testDir, ".ai-crew/install-state.json"),
      "not-json",
      "utf-8",
    );
    const result = await readInstallState(testDir);
    expect(result).toBeNull();
  });

  it("returns null for JSON with wrong shape", async () => {
    await writeFile(
      join(testDir, ".ai-crew/install-state.json"),
      JSON.stringify({ wrong: "shape" }),
      "utf-8",
    );
    const result = await readInstallState(testDir);
    expect(result).toBeNull();
  });
});

// ============================================================
// diagnose
// ============================================================

describe("diagnose", () => {
  it("reports unhealthy when no install-state.json exists", async () => {
    const result = await diagnose(testDir);
    expect(result.healthy).toBe(false);
    expect(result.configMismatch).toContain(
      "No install-state.json found. Run 'ai-crew init' first.",
    );
  });

  it("reports healthy when all tracked files exist", async () => {
    const configPath = join(testDir, ".ai-crew/config.yaml");
    await writeFile(configPath, "test", "utf-8");

    await recordInstall(testDir, makeInstallResult(), [configPath]);

    const result = await diagnose(testDir);
    expect(result.healthy).toBe(true);
    expect(result.missingFiles).toHaveLength(0);
    expect(result.extraFiles).toHaveLength(0);
  });

  it("detects missing files", async () => {
    // Record a file that does not actually exist
    await recordInstall(testDir, makeInstallResult(), [
      join(testDir, ".ai-crew/nonexistent.yaml"),
    ]);

    const result = await diagnose(testDir);
    expect(result.healthy).toBe(false);
    expect(result.missingFiles).toContain(".ai-crew/nonexistent.yaml");
  });

  it("detects extra files in .ai-crew", async () => {
    // Record empty file list, but create a file in .ai-crew
    await recordInstall(testDir, makeInstallResult(), []);

    await writeFile(
      join(testDir, ".ai-crew/unexpected.txt"),
      "surprise",
      "utf-8",
    );

    const result = await diagnose(testDir);
    expect(result.healthy).toBe(false);
    expect(result.extraFiles).toContain(".ai-crew/unexpected.txt");
  });

  it("ignores runtime directories (scratchpad, sessions, checkpoints)", async () => {
    await recordInstall(testDir, makeInstallResult(), []);

    // Create runtime files that should be ignored
    await mkdir(join(testDir, ".ai-crew/scratchpad"), { recursive: true });
    await writeFile(
      join(testDir, ".ai-crew/scratchpad/notes.md"),
      "runtime",
      "utf-8",
    );

    const result = await diagnose(testDir);
    // Extra files should not include scratchpad
    expect(
      result.extraFiles.some((f) => f.includes("scratchpad")),
    ).toBe(false);
  });
});

// ============================================================
// uninstall
// ============================================================

describe("uninstall", () => {
  it("throws when no install-state.json exists", async () => {
    await expect(uninstall(testDir)).rejects.toThrow(
      "No install-state.json found",
    );
  });

  it("removes tracked files and reports counts", async () => {
    // Create files
    const configPath = join(testDir, ".ai-crew/config.yaml");
    const rulesDir = join(testDir, ".ai-crew/rules");
    await mkdir(rulesDir, { recursive: true });
    const rulePath = join(rulesDir, "global.md");

    await writeFile(configPath, "test", "utf-8");
    await writeFile(rulePath, "test", "utf-8");

    await recordInstall(testDir, makeInstallResult(), [configPath, rulePath]);

    const result = await uninstall(testDir);
    expect(result.filesRemoved).toBeGreaterThanOrEqual(2);
    expect(existsSync(configPath)).toBe(false);
    expect(existsSync(rulePath)).toBe(false);
  });

  it("cleans up empty directories", async () => {
    const deepDir = join(testDir, ".ai-crew/deep/nested");
    await mkdir(deepDir, { recursive: true });
    const filePath = join(deepDir, "file.txt");
    await writeFile(filePath, "test", "utf-8");

    await recordInstall(testDir, makeInstallResult(), [filePath]);

    const result = await uninstall(testDir);
    expect(result.filesRemoved).toBeGreaterThanOrEqual(1);
    expect(result.dirsRemoved).toBeGreaterThanOrEqual(1);
    expect(existsSync(deepDir)).toBe(false);
  });

  it("removes install-state.json itself", async () => {
    const configPath = join(testDir, ".ai-crew/config.yaml");
    await writeFile(configPath, "test", "utf-8");
    await recordInstall(testDir, makeInstallResult(), [configPath]);

    await uninstall(testDir);

    expect(existsSync(join(testDir, ".ai-crew/install-state.json"))).toBe(false);
  });

  it("handles already-deleted files gracefully", async () => {
    // Record a file, then manually delete it before uninstall
    const configPath = join(testDir, ".ai-crew/config.yaml");
    await writeFile(configPath, "test", "utf-8");
    await recordInstall(testDir, makeInstallResult(), [configPath]);

    // Manually remove
    const { unlink } = await import("node:fs/promises");
    await unlink(configPath);

    // Should not throw
    const result = await uninstall(testDir);
    // install-state.json itself still gets removed
    expect(result.filesRemoved).toBeGreaterThanOrEqual(1);
  });
});

import { readFile, writeFile, unlink, rmdir, readdir, stat } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { existsSync } from "node:fs";
import type { InstallResult, InstallState, DiagnosticResult, UninstallResult } from "./types.js";

const INSTALL_STATE_FILE = "install-state.json";
const AI_CREW_DIR = ".ai-crew";

function getStatePath(targetPath: string): string {
  return join(targetPath, AI_CREW_DIR, INSTALL_STATE_FILE);
}

/**
 * Records installation state to .ai-crew/install-state.json.
 * Called after a successful install to enable doctor/uninstall.
 */
export async function recordInstall(
  targetPath: string,
  result: InstallResult,
  installedFiles: string[],
): Promise<void> {
  if (!targetPath || typeof targetPath !== "string") {
    throw new Error("targetPath must be a non-empty string");
  }
  if (!result || typeof result !== "object") {
    throw new Error("result must be a valid InstallResult object");
  }
  if (!Array.isArray(installedFiles)) {
    throw new Error("installedFiles must be an array of strings");
  }

  const state: InstallState = {
    version: "1.0",
    bundleName: result.bundleName,
    installedAt: new Date().toISOString(),
    targetPath: result.targetPath,
    files: installedFiles.map((f) => relative(targetPath, f)).sort(),
    graphNodes: result.graphNodes,
    workflowSource: result.workflowSource,
  };

  const statePath = getStatePath(targetPath);
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Reads install state from .ai-crew/install-state.json.
 * Returns null if not found or unparseable.
 */
export async function readInstallState(
  targetPath: string,
): Promise<InstallState | null> {
  const statePath = getStatePath(targetPath);

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const raw = await readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as InstallState;

    // Basic shape validation
    if (
      typeof parsed.version !== "string" ||
      typeof parsed.bundleName !== "string" ||
      !Array.isArray(parsed.files)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Diagnoses the current installation by comparing install-state files vs filesystem.
 * Reports missing files, extra files in .ai-crew, and config mismatches.
 */
export async function diagnose(
  targetPath: string,
): Promise<DiagnosticResult> {
  const state = await readInstallState(targetPath);

  if (!state) {
    return {
      healthy: false,
      missingFiles: [],
      extraFiles: [],
      configMismatch: ["No install-state.json found. Run 'ai-crew init' first."],
    };
  }

  const missingFiles: string[] = [];
  const extraFiles: string[] = [];
  const configMismatch: string[] = [];

  // Check each recorded file exists on disk
  for (const relPath of state.files) {
    const absPath = join(targetPath, relPath);
    if (!existsSync(absPath)) {
      missingFiles.push(relPath);
    }
  }

  // Check for extra files in .ai-crew that aren't in the state
  const crewDir = join(targetPath, AI_CREW_DIR);
  if (existsSync(crewDir)) {
    const actualFiles = await collectFiles(crewDir);
    const recordedSet = new Set(state.files);

    for (const absPath of actualFiles) {
      const relPath = relative(targetPath, absPath);
      // Skip install-state.json itself and runtime files
      if (
        relPath === join(AI_CREW_DIR, INSTALL_STATE_FILE) ||
        relPath === join(AI_CREW_DIR, "state.json") ||
        relPath === join(AI_CREW_DIR, "catalog-manifest.json") ||
        relPath === join(AI_CREW_DIR, "runs.json") ||
        relPath.startsWith(join(AI_CREW_DIR, "scratchpad")) ||
        relPath.startsWith(join(AI_CREW_DIR, "sessions")) ||
        relPath.startsWith(join(AI_CREW_DIR, "checkpoints")) ||
        relPath.startsWith(join(AI_CREW_DIR, "runs"))
      ) {
        continue;
      }
      if (!recordedSet.has(relPath)) {
        extraFiles.push(relPath);
      }
    }
  }

  // Validate target path consistency
  if (state.targetPath !== targetPath) {
    configMismatch.push(
      `Target path mismatch: state says "${state.targetPath}", running from "${targetPath}"`,
    );
  }

  const healthy =
    missingFiles.length === 0 &&
    extraFiles.length === 0 &&
    configMismatch.length === 0;

  return { healthy, missingFiles, extraFiles, configMismatch };
}

/**
 * Uninstalls ai-crew by removing all tracked files and cleaning up empty directories.
 */
export async function uninstall(
  targetPath: string,
): Promise<UninstallResult> {
  const state = await readInstallState(targetPath);

  if (!state) {
    throw new Error(
      "No install-state.json found. Cannot determine which files to remove.",
    );
  }

  let filesRemoved = 0;
  let dirsRemoved = 0;
  const dirsToCheck = new Set<string>();

  // Remove all tracked files
  for (const relPath of state.files) {
    const absPath = join(targetPath, relPath);
    if (existsSync(absPath)) {
      await unlink(absPath);
      filesRemoved++;
      dirsToCheck.add(dirname(absPath));
    }
  }

  // Remove install-state.json itself
  const statePath = getStatePath(targetPath);
  if (existsSync(statePath)) {
    await unlink(statePath);
    filesRemoved++;
    dirsToCheck.add(dirname(statePath));
  }

  // Clean up empty directories (deepest first)
  const sortedDirs = Array.from(dirsToCheck).sort(
    (a, b) => b.length - a.length,
  );

  for (const dir of sortedDirs) {
    // Don't remove the project root or anything above it
    if (!dir.startsWith(targetPath) || dir === targetPath) {
      continue;
    }
    dirsRemoved += await removeEmptyDirChain(dir, targetPath);
  }

  return { filesRemoved, dirsRemoved };
}

/**
 * Recursively removes empty directories up to (but not including) stopAt.
 */
async function removeEmptyDirChain(
  dir: string,
  stopAt: string,
): Promise<number> {
  let removed = 0;
  let current = dir;

  while (current !== stopAt && current.startsWith(stopAt)) {
    if (!existsSync(current)) {
      current = dirname(current);
      continue;
    }

    try {
      const entries = await readdir(current);
      if (entries.length === 0) {
        await rmdir(current);
        removed++;
        current = dirname(current);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return removed;
}

/**
 * Recursively collects all file paths under a directory.
 */
async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  if (!existsSync(dir)) {
    return results;
  }

  const entries = await readdir(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const info = await stat(fullPath);

    if (info.isDirectory()) {
      const subFiles = await collectFiles(fullPath);
      results.push(...subFiles);
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

import { readFile, writeFile, rename, mkdir, rm, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { CheckpointData, CheckpointInfo, GraphState, SharedMemoryStore } from "./types.js";

const CHECKPOINTS_DIR = "checkpoints";
const STATE_FILE = "state.json";
const MEMORY_FILE = "memory.json";

// ============================================================
// Helpers
// ============================================================

interface NodeError extends Error {
  code?: string;
}

function isNodeError(err: unknown): err is NodeError {
  return err instanceof Error;
}

/**
 * Zero-pad a level number to 3 digits.
 * e.g. 0 -> "000", 1 -> "001", 42 -> "042"
 */
function padLevel(level: number): string {
  return String(level).padStart(3, "0");
}

/**
 * Build the checkpoint filename for a given level.
 */
function checkpointFilename(level: number): string {
  return `level-${padLevel(level)}.json`;
}

/**
 * Resolve the full path to the checkpoints directory.
 */
function checkpointsDir(crewDir: string): string {
  return join(crewDir, CHECKPOINTS_DIR);
}

/**
 * Read a JSON file and return parsed content. Returns null on ENOENT.
 */
async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Atomically write JSON to a file using the temp-file-then-rename pattern.
 * This prevents partial writes if the process is interrupted.
 */
async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });

  const tmpFile = join(dirname(filePath), `.checkpoint-${randomUUID()}.tmp`);

  try {
    await writeFile(tmpFile, JSON.stringify(data, null, 2) + "\n", "utf-8");
    await rename(tmpFile, filePath);
  } catch (err) {
    try {
      await rm(tmpFile, { force: true });
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Create a backup of a file by copying it with a .bak suffix.
 * No-op if the source file does not exist.
 */
async function backupFile(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, "utf-8");
    await writeFile(`${filePath}.bak`, content, "utf-8");
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return; // Nothing to back up
    }
    throw err;
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a checkpoint by snapshotting the current graph state and shared
 * memory store. The checkpoint is saved to .ai-crew/checkpoints/level-{N}.json.
 *
 * @param crewDir - Path to the .ai-crew directory
 * @param level   - The graph execution level to checkpoint
 * @returns The absolute path of the created checkpoint file
 *
 * @throws Error if crewDir is empty
 * @throws Error if level is negative
 * @throws Error if state.json cannot be read (does not exist)
 */
export async function createCheckpoint(
  crewDir: string,
  level: number,
): Promise<string> {
  if (!crewDir) {
    throw new Error("crewDir is required");
  }
  if (level < 0) {
    throw new Error("level must be a non-negative integer");
  }

  const statePath = join(crewDir, STATE_FILE);
  const memoryPath = join(crewDir, MEMORY_FILE);

  const state = await readJsonFile<GraphState>(statePath);
  if (!state) {
    throw new Error(`Cannot create checkpoint: ${statePath} not found`);
  }

  // Memory file may not exist yet (no nodes have written output)
  const memory = (await readJsonFile<SharedMemoryStore>(memoryPath)) ?? {
    version: "1.0",
    nodes: {},
    updatedAt: new Date().toISOString(),
  };

  const checkpointData: CheckpointData = {
    level,
    createdAt: new Date().toISOString(),
    state,
    memory,
  };

  const filePath = join(checkpointsDir(crewDir), checkpointFilename(level));
  await writeJsonAtomic(filePath, checkpointData);

  return filePath;
}

/**
 * List all checkpoints in the .ai-crew/checkpoints/ directory,
 * sorted by level in ascending order.
 *
 * @param crewDir - Path to the .ai-crew directory
 * @returns Array of CheckpointInfo sorted by level ascending
 */
export async function listCheckpoints(
  crewDir: string,
): Promise<CheckpointInfo[]> {
  if (!crewDir) {
    throw new Error("crewDir is required");
  }

  const dir = checkpointsDir(crewDir);

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const checkpoints: CheckpointInfo[] = [];

  for (const entry of entries) {
    const match = entry.match(/^level-(\d{3})\.json$/);
    if (!match) continue;

    const filePath = join(dir, entry);
    const data = await readJsonFile<CheckpointData>(filePath);
    if (!data) continue;

    checkpoints.push({
      level: parseInt(match[1], 10),
      path: filePath,
      createdAt: data.createdAt,
    });
  }

  checkpoints.sort((a, b) => a.level - b.level);

  return checkpoints;
}

/**
 * Restore a checkpoint by overwriting state.json and shared-memory.json
 * with the data from the checkpoint file.
 *
 * Existing state.json and memory.json are backed up to .bak files
 * before being overwritten.
 *
 * @param checkpointPath - Path to the checkpoint JSON file
 * @param crewDir        - Path to the .ai-crew directory
 *
 * @throws Error if checkpointPath or crewDir is empty
 * @throws Error if the checkpoint file does not exist or is invalid
 */
export async function restoreCheckpoint(
  checkpointPath: string,
  crewDir: string,
): Promise<void> {
  if (!checkpointPath) {
    throw new Error("checkpointPath is required");
  }
  if (!crewDir) {
    throw new Error("crewDir is required");
  }

  const data = await readJsonFile<CheckpointData>(checkpointPath);
  if (!data) {
    throw new Error(`Checkpoint file not found: ${checkpointPath}`);
  }

  if (!data.state || !data.memory) {
    throw new Error(`Invalid checkpoint data in ${checkpointPath}`);
  }

  const statePath = join(crewDir, STATE_FILE);
  const memoryPath = join(crewDir, MEMORY_FILE);

  // Back up existing files before overwriting
  await backupFile(statePath);
  await backupFile(memoryPath);

  // Restore using atomic writes.
  // Write memory first (less critical), then state (authoritative).
  // If crash occurs between the two writes, the old state.json remains
  // intact, which is the safer partial-failure mode.
  await writeJsonAtomic(memoryPath, data.memory);
  await writeJsonAtomic(statePath, data.state);
}

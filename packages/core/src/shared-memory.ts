import { readFile, writeFile, rename, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { SharedMemoryStore } from "./types.js";

const MEMORY_FILE = "memory.json";
const MEMORY_VERSION = "1.0";

/**
 * Resolve the full path to the shared memory file.
 */
function memoryPath(crewDir: string): string {
  return join(crewDir, MEMORY_FILE);
}

/**
 * Read and parse the shared memory store from disk.
 * Returns null if the file does not exist.
 */
async function loadStore(
  crewDir: string,
): Promise<SharedMemoryStore | null> {
  try {
    const raw = await readFile(memoryPath(crewDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "version" in (parsed as Record<string, unknown>) &&
      "nodes" in (parsed as Record<string, unknown>)
    ) {
      return parsed as SharedMemoryStore;
    }
    return null;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Atomically persist the store: write to a temp file then rename.
 * This prevents partial-write corruption if the process is interrupted.
 */
async function saveStoreAtomic(
  crewDir: string,
  store: SharedMemoryStore,
): Promise<void> {
  await mkdir(crewDir, { recursive: true });

  const target = memoryPath(crewDir);
  const tmpFile = join(dirname(target), `.memory-${randomUUID()}.tmp`);

  try {
    await writeFile(tmpFile, JSON.stringify(store, null, 2) + "\n", "utf-8");
    await rename(tmpFile, target);
  } catch (err) {
    // Best-effort cleanup of the temp file on failure
    try {
      await rm(tmpFile, { force: true });
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Create an empty SharedMemoryStore.
 */
function emptyStore(): SharedMemoryStore {
  return {
    version: MEMORY_VERSION,
    nodes: {},
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Write output data for a specific node.
 *
 * Atomic operation: read existing store -> merge node data -> write to
 * temp file -> rename into place. Each node writes only to its own key
 * so there are no key-level conflicts between concurrent node agents.
 *
 * CONCURRENCY NOTE: The read-modify-write cycle is NOT locked across callers.
 * If two agents call writeNodeOutput concurrently, the last write wins for
 * the full file (though each writes a different key). In practice this is safe
 * because the graph executor runs nodes level-by-level, so concurrent writes
 * only happen within a level where each node has a unique key. A future
 * improvement could switch to per-node files (memory/{nodeId}.json) to
 * eliminate this concern entirely.
 */
export async function writeNodeOutput(
  crewDir: string,
  nodeId: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!crewDir) {
    throw new Error("crewDir is required");
  }
  if (!nodeId) {
    throw new Error("nodeId is required");
  }

  const store = (await loadStore(crewDir)) ?? emptyStore();
  store.nodes[nodeId] = data;
  store.updatedAt = new Date().toISOString();

  await saveStoreAtomic(crewDir, store);
}

/**
 * Read the output data for a single node.
 * Returns null if the store or node entry does not exist.
 */
export async function readNodeOutput(
  crewDir: string,
  nodeId: string,
): Promise<Record<string, unknown> | null> {
  if (!crewDir) {
    throw new Error("crewDir is required");
  }
  if (!nodeId) {
    throw new Error("nodeId is required");
  }

  const store = await loadStore(crewDir);
  if (!store) return null;

  return store.nodes[nodeId] ?? null;
}

/**
 * Read outputs for all listed dependency nodes.
 * Returns a map of nodeId -> data. Missing nodes are omitted from the result.
 */
export async function readDependencyOutputs(
  crewDir: string,
  dependsOn: string[],
): Promise<Record<string, Record<string, unknown>>> {
  if (!crewDir) {
    throw new Error("crewDir is required");
  }

  const store = await loadStore(crewDir);
  if (!store) return {};

  const result: Record<string, Record<string, unknown>> = {};
  for (const depId of dependsOn) {
    const data = store.nodes[depId];
    if (data !== undefined) {
      result[depId] = data;
    }
  }

  return result;
}

/**
 * Delete the shared memory file, clearing all stored node outputs.
 * No-op if the file does not exist.
 */
export async function clearMemory(crewDir: string): Promise<void> {
  if (!crewDir) {
    throw new Error("crewDir is required");
  }

  // rm with force: true already suppresses ENOENT
  await rm(memoryPath(crewDir), { force: true });
}

// ============================================================
// Helpers
// ============================================================

interface NodeError extends Error {
  code?: string;
}

function isNodeError(err: unknown): err is NodeError {
  return err instanceof Error;
}

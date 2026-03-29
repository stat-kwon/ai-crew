import { readFile, writeFile, rename, mkdir, rm, readdir, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  GraphState,
  NodeState,
  RunManifest,
  RunRegistry,
  RunIndexEntry,
  NodeSummary,
  AidlcSnapshot,
  AidlcDocumentSnapshot,
} from "./types.js";

const RUNS_DIR = "runs";
const RUNS_REGISTRY = "runs.json";
const MANIFEST_FILE = "manifest.json";
const SCRATCHPAD_DIR = "scratchpad";
const CHECKPOINTS_DIR = "checkpoints";
const STATE_FILE = "state.json";

// ============================================================
// Helpers
// ============================================================

interface NodeError extends Error {
  code?: string;
}

function isNodeError(err: unknown): err is NodeError {
  return err instanceof Error;
}

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

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmpFile = join(dirname(filePath), `.run-history-${randomUUID()}.tmp`);
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

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath);
    return entries !== undefined;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

/**
 * Move a directory by copying then removing.
 * Uses recursive copy + remove since Node.js rename doesn't work across devices.
 */
async function moveDir(src: string, dest: string): Promise<void> {
  if (!(await dirExists(src))) return;
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
  await rm(src, { recursive: true, force: true });
}

// ============================================================
// Run ID Generation
// ============================================================

/**
 * Slugify a string for use in a run ID.
 * Lowercase, replace non-alphanumeric with hyphens, trim, max 30 chars.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

/**
 * Generate a run ID in the format: {slug}-{YYYYMMDD}-{seq}
 * Checks existing runs to determine the next sequence number.
 */
export async function generateRunId(
  crewDir: string,
  intentSlug: string,
  date?: Date,
): Promise<string> {
  const d = date ?? new Date();
  const dateStr =
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");

  const slug = slugify(intentSlug);
  if (!slug) {
    throw new Error("Intent slug must produce at least one alphanumeric character");
  }

  const prefix = `${slug}-${dateStr}-`;

  const registry = await loadRegistry(crewDir);
  let maxSeq = 0;
  for (const entry of registry.runs) {
    if (entry.runId.startsWith(prefix)) {
      const seqStr = entry.runId.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  return `${prefix}${maxSeq + 1}`;
}

// ============================================================
// Run Registry
// ============================================================

function emptyRegistry(): RunRegistry {
  return {
    schema: "ai-crew.runs.v1",
    current: null,
    runs: [],
    stats: { totalRuns: 0, totalCompleted: 0, totalFailed: 0 },
  };
}

/**
 * Load the run registry from .ai-crew/runs.json.
 * Returns an empty registry if the file does not exist.
 */
export async function loadRegistry(crewDir: string): Promise<RunRegistry> {
  const filePath = join(crewDir, RUNS_REGISTRY);
  const data = await readJsonFile<RunRegistry>(filePath);
  return data ?? emptyRegistry();
}

/**
 * Save the run registry atomically.
 */
export async function saveRegistry(crewDir: string, registry: RunRegistry): Promise<void> {
  const filePath = join(crewDir, RUNS_REGISTRY);
  await writeJsonAtomic(filePath, registry);
}

// ============================================================
// Run Manifest
// ============================================================

/**
 * Create a RunManifest from the current state.json and graph context.
 */
export function createManifest(
  runId: string,
  state: GraphState,
  options: {
    intentDescription: string;
    intentSlug: string;
    intentSource: "user" | "aidlc" | "auto";
    graphHash: string;
    graphLevelCount: number;
    model: string;
    locale: string;
  },
): RunManifest {
  const nodeIds = Object.keys(state.nodes);
  const completed = nodeIds.filter((id) => state.nodes[id].status === "completed");
  const failed = nodeIds.filter((id) => state.nodes[id].status === "failed");
  const skipped = nodeIds.filter((id) => state.nodes[id].status === "skipped");

  // Build node summaries from state (scratchpad parsing is done at prompt layer)
  const nodeSummaries: Record<string, NodeSummary> = {};
  for (const id of nodeIds) {
    const node = state.nodes[id];
    if (node.status === "pending" || node.status === "running") continue;
    nodeSummaries[id] = {
      nodeId: id,
      agent: "", // Populated by prompt layer from graph.yaml
      status: node.status as "completed" | "failed" | "skipped",
      duration: computeDuration(node),
      filesChanged: [], // Populated by prompt layer from scratchpad
      keyDecisions: [], // Populated by prompt layer from scratchpad
    };
  }

  return {
    schema: "ai-crew.run.v1",
    runId,
    intent: {
      description: options.intentDescription,
      slug: options.intentSlug,
      source: options.intentSource,
    },
    context: {
      bundleName: state.bundleName,
      graphHash: options.graphHash,
      graphNodeCount: nodeIds.length,
      graphLevelCount: options.graphLevelCount,
      model: options.model,
      locale: options.locale,
    },
    timeline: {
      createdAt: new Date().toISOString(),
      startedAt: findEarliestStart(state.nodes),
      completedAt: findLatestCompletion(state.nodes),
    },
    state: failed.length > 0 ? "failed" : "completed",
    outcome: {
      nodesCompleted: completed,
      nodesFailed: failed,
      nodesSkipped: skipped,
      summary: [],
      issues: [],
    },
    nodeSummaries,
  };
}

function computeDuration(node: NodeState): string {
  if (!node.startedAt || !node.completedAt) return "—";
  const ms = new Date(node.completedAt).getTime() - new Date(node.startedAt).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function findEarliestStart(nodes: Record<string, NodeState>): string | null {
  let earliest: string | null = null;
  for (const node of Object.values(nodes)) {
    if (node.startedAt && (!earliest || node.startedAt < earliest)) {
      earliest = node.startedAt;
    }
  }
  return earliest;
}

function findLatestCompletion(nodes: Record<string, NodeState>): string | null {
  let latest: string | null = null;
  for (const node of Object.values(nodes)) {
    if (node.completedAt && (!latest || node.completedAt > latest)) {
      latest = node.completedAt;
    }
  }
  return latest;
}

// ============================================================
// AI-DLC Snapshot Capture
// ============================================================

const AIDLC_DOCS_DIR = "aidlc-docs";
const AIDLC_STATE_FILE = "aidlc-state.md";

/**
 * Determine the stage from a document path.
 * Maps paths like "inception/requirements/requirements.md" to "requirements".
 */
function getStageFromPath(docPath: string): string {
  const parts = docPath.split("/");
  if (parts.length >= 2 && parts[0] === "inception") {
    return parts[1]; // e.g., "requirements", "user-stories", "application-design"
  }
  if (parts.length >= 1) {
    return parts[0]; // e.g., "construction", "operations"
  }
  return "unknown";
}

/**
 * Recursively collect all markdown files from a directory.
 */
async function collectMarkdownFiles(
  baseDir: string,
  relativePath: string = "",
): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  const currentDir = relativePath ? join(baseDir, relativePath) : baseDir;

  try {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryRelPath = relativePath ? join(relativePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        const subFiles = await collectMarkdownFiles(baseDir, entryRelPath);
        results.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const content = await readFile(join(baseDir, entryRelPath), "utf-8");
          results.push({ path: entryRelPath, content });
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable
  }

  return results;
}

/**
 * Capture a snapshot of aidlc-docs/ at the current moment.
 * Returns null if aidlc-docs doesn't exist.
 */
export async function captureAidlcSnapshot(projectDir: string): Promise<AidlcSnapshot | null> {
  const aidlcDocsPath = join(projectDir, AIDLC_DOCS_DIR);

  // Check if aidlc-docs exists
  if (!(await dirExists(aidlcDocsPath))) {
    return null;
  }

  // Read aidlc-state.md
  let stateMd = "";
  try {
    stateMd = await readFile(join(aidlcDocsPath, AIDLC_STATE_FILE), "utf-8");
  } catch {
    // State file doesn't exist
  }

  // Collect all markdown documents
  const files = await collectMarkdownFiles(aidlcDocsPath);

  // Filter out aidlc-state.md from documents (it's stored separately)
  const documents: AidlcDocumentSnapshot[] = files
    .filter((f) => f.path !== AIDLC_STATE_FILE)
    .map((f) => ({
      path: f.path,
      content: f.content,
      stage: getStageFromPath(f.path),
    }));

  return {
    stateMd,
    documents,
    capturedAt: new Date().toISOString(),
  };
}

// ============================================================
// Archive Run
// ============================================================

/**
 * Archive the current run's artifacts and update the registry.
 *
 * 1. Creates manifest.json from current state (with aidlcSnapshot if available)
 * 2. Moves scratchpad/ and checkpoints/ to runs/{runId}/
 * 3. Copies state.json snapshot to runs/{runId}/
 * 4. Updates runs.json registry
 */
export async function archiveRun(
  crewDir: string,
  manifest: RunManifest,
  projectDir?: string,
): Promise<string> {
  const runDir = join(crewDir, RUNS_DIR, manifest.runId);

  // Capture AI-DLC snapshot if projectDir is provided
  let manifestWithSnapshot = { ...manifest, state: "archived" as const };
  if (projectDir) {
    const snapshot = await captureAidlcSnapshot(projectDir);
    if (snapshot) {
      manifestWithSnapshot = {
        ...manifestWithSnapshot,
        aidlcSnapshot: snapshot,
      };
    }
  }

  // Initialize autoTitle and autoSummary fields (to be populated by LLM later)
  manifestWithSnapshot.autoTitle = manifest.autoTitle ?? undefined;
  manifestWithSnapshot.autoSummary = manifest.autoSummary ?? undefined;

  // Write manifest
  await writeJsonAtomic(join(runDir, MANIFEST_FILE), manifestWithSnapshot);

  // Move scratchpad and checkpoints
  await moveDir(join(crewDir, SCRATCHPAD_DIR), join(runDir, SCRATCHPAD_DIR));
  await moveDir(join(crewDir, CHECKPOINTS_DIR), join(runDir, CHECKPOINTS_DIR));

  // Snapshot state.json
  const stateData = await readJsonFile<GraphState>(join(crewDir, STATE_FILE));
  if (stateData) {
    await writeJsonAtomic(join(runDir, "state-snapshot.json"), stateData);
  }

  // Update registry
  const registry = await loadRegistry(crewDir);
  const existingIdx = registry.runs.findIndex((r) => r.runId === manifest.runId);
  const entry: RunIndexEntry = {
    runId: manifest.runId,
    intent: manifest.intent.description,
    state: "archived",
    createdAt: manifest.timeline.createdAt,
    completedAt: manifest.timeline.completedAt,
    nodesTotal: manifest.context.graphNodeCount,
    nodesCompleted: manifest.outcome?.nodesCompleted.length ?? 0,
    nodesFailed: manifest.outcome?.nodesFailed.length ?? 0,
  };

  if (existingIdx >= 0) {
    registry.runs[existingIdx] = entry;
  } else {
    registry.runs.push(entry);
  }

  // Update stats
  registry.stats.totalRuns = registry.runs.length;
  registry.stats.totalCompleted = registry.runs.filter(
    (r) => r.nodesFailed === 0 && r.state === "archived",
  ).length;
  registry.stats.totalFailed = registry.runs.filter((r) => r.nodesFailed > 0).length;

  await saveRegistry(crewDir, registry);

  return runDir;
}

// ============================================================
// Prune Old Runs
// ============================================================

/**
 * Remove archived runs exceeding the retention limit.
 * Keeps the most recent `retention` runs, deletes the rest.
 */
export async function pruneOldRuns(
  crewDir: string,
  retention: number,
): Promise<string[]> {
  if (retention < 1) {
    throw new Error("retention must be at least 1");
  }

  const registry = await loadRegistry(crewDir);
  const archived = registry.runs.filter((r) => r.state === "archived");

  if (archived.length <= retention) {
    return [];
  }

  // Sort by createdAt ascending (oldest first)
  archived.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const toRemove = archived.slice(0, archived.length - retention);
  const removedIds: string[] = [];

  for (const entry of toRemove) {
    const runDir = join(crewDir, RUNS_DIR, entry.runId);
    await rm(runDir, { recursive: true, force: true });
    removedIds.push(entry.runId);
  }

  // Update registry
  registry.runs = registry.runs.filter((r) => !removedIds.includes(r.runId));
  registry.stats.totalRuns = registry.runs.length;
  registry.stats.totalCompleted = registry.runs.filter(
    (r) => r.nodesFailed === 0 && r.state === "archived",
  ).length;
  registry.stats.totalFailed = registry.runs.filter((r) => r.nodesFailed > 0).length;

  await saveRegistry(crewDir, registry);

  return removedIds;
}

// ============================================================
// Load Previous Run Manifest
// ============================================================

/**
 * Load the manifest for the most recent archived run.
 * Returns null if no archived runs exist.
 */
export async function loadPreviousManifest(
  crewDir: string,
): Promise<RunManifest | null> {
  const registry = await loadRegistry(crewDir);
  const archived = registry.runs.filter((r) => r.state === "archived");

  if (archived.length === 0) return null;

  // Most recent archived run (last in chronological order)
  archived.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest = archived[archived.length - 1];

  const manifestPath = join(crewDir, RUNS_DIR, latest.runId, MANIFEST_FILE);
  return readJsonFile<RunManifest>(manifestPath);
}

/**
 * Check if the current state has completed nodes (indicates a previous run exists).
 */
export function hasCompletedNodes(state: GraphState): boolean {
  return Object.values(state.nodes).some(
    (n) => n.status === "completed" || n.status === "failed",
  );
}

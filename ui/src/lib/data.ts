import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import type {
  RunRegistry,
  RunManifest,
  GraphState,
  GraphDefinition,
  FileTreeNode,
  AidlcStateResponse,
  AidlcPhase,
  AidlcStage,
  ConfigYaml,
} from "@/types";

// ============================================================
// Path Resolution
// ============================================================

function hasProjectMarkers(dir: string): boolean {
  return (
    existsSync(join(dir, ".ai-crew")) ||
    existsSync(join(dir, "aidlc-docs"))
  );
}

function findProjectRoot(startDir: string): string | null {
  let current = startDir;

  while (true) {
    if (hasProjectMarkers(current)) return current;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function getTargetDir(): string {
  const envTarget = process.env.AI_CREW_TARGET_DIR;
  if (envTarget) return envTarget;

  return findProjectRoot(process.cwd()) || process.cwd();
}

function getCrewDir(): string {
  return join(getTargetDir(), ".ai-crew");
}

function getAidlcDocsDir(): string {
  return join(getTargetDir(), "aidlc-docs");
}

// ============================================================
// File Helpers
// ============================================================

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readYamlFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return yaml.load(raw) as T;
  } catch {
    return null;
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Runs Data
// ============================================================

export async function loadRegistry(): Promise<RunRegistry> {
  const registry = await readJsonFile<RunRegistry>(join(getCrewDir(), "runs.json"));
  return (
    registry ?? {
      schema: "ai-crew.runs.v1",
      current: null,
      runs: [],
      stats: { totalRuns: 0, totalCompleted: 0, totalFailed: 0 },
    }
  );
}

export async function loadRunManifest(runId: string): Promise<RunManifest | null> {
  // Canonical path: .ai-crew/runs/{runId}/manifest.json
  const canonicalPath = join(getCrewDir(), "runs", runId, "manifest.json");
  const canonical = await readJsonFile<RunManifest>(canonicalPath);
  if (canonical) return canonical;

  // Backward-compatible fallback for legacy test/fixture structures
  // where run directory names may be v1, v2... instead of runId.
  try {
    const runsDir = join(getCrewDir(), "runs");
    const entries = await readdir(runsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const legacyManifest = await readJsonFile<RunManifest>(
        join(runsDir, entry.name, "manifest.json")
      );
      if (legacyManifest?.runId === runId) {
        return legacyManifest;
      }
    }
  } catch {
    // ignore and continue
  }

  // If this is the current running run, synthesize a live manifest from state.json.
  const registry = await loadRegistry();
  if (registry.current === runId) {
    return buildCurrentRunManifest(runId, registry);
  }

  return null;
}

async function buildCurrentRunManifest(
  runId: string,
  registry: RunRegistry
): Promise<RunManifest | null> {
  const state = await loadGraphState();
  const graph = await loadGraphDefinition();
  const runEntry = registry.runs.find((r) => r.runId === runId);

  if (!state || !runEntry) return null;

  const nodeStates = Object.entries(state.nodes ?? {});
  const completed = nodeStates.filter(([, node]) => node.status === "completed").map(([id]) => id);
  const failed = nodeStates.filter(([, node]) => node.status === "failed").map(([id]) => id);
  const skipped = nodeStates.filter(([, node]) => node.status === "skipped").map(([id]) => id);

  const nodeSummaries: RunManifest["nodeSummaries"] = {};
  for (const [nodeId, node] of nodeStates) {
    if (!["completed", "failed", "skipped"].includes(node.status)) continue;

    const graphNode = graph?.nodes.find((n) => n.id === nodeId);
    nodeSummaries[nodeId] = {
      nodeId,
      agent: graphNode?.agent ?? "unknown",
      status: node.status,
      duration: "진행 중",
      filesChanged: [],
      keyDecisions: [],
    };
  }

  return {
    schema: "ai-crew.run.v1",
    runId,
    intent: {
      description: runEntry.intent,
      slug: runId,
      source: "user",
    },
    context: {
      bundleName: state.bundleName ?? "unknown",
      graphHash: state.preflight?.graphHash ?? "",
      graphNodeCount: runEntry.nodesTotal,
      graphLevelCount: 0,
      model: graph?.nodes.find((n) => n.config.model)?.config.model ?? "unknown",
      locale: "ko",
    },
    timeline: {
      createdAt: runEntry.createdAt,
      startedAt: nodeStates.find(([, node]) => node.startedAt)?.[1].startedAt ?? null,
      completedAt: runEntry.completedAt,
    },
    state: runEntry.state,
    outcome: null,
    nodeSummaries,
  };
}

// ============================================================
// Current State
// ============================================================

export async function loadGraphState(): Promise<GraphState | null> {
  return readJsonFile<GraphState>(join(getCrewDir(), "state.json"));
}

export async function loadGraphDefinition(): Promise<GraphDefinition | null> {
  const graphYaml = await readYamlFile<{ graph: GraphDefinition }>(
    join(getCrewDir(), "graph.yaml")
  );
  return graphYaml?.graph ?? null;
}

export async function loadScratchpads(): Promise<Record<string, string>> {
  const scratchpadDir = join(getCrewDir(), "scratchpad");
  const scratchpads: Record<string, string> = {};

  try {
    const files = await readdir(scratchpadDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const content = await readTextFile(join(scratchpadDir, file));
        if (content) {
          // Extract node ID from filename (e.g., "L0-plan.md" -> "plan")
          const match = file.match(/^L\d+-(.+)\.md$/);
          const nodeId = match ? match[1] : file.replace(".md", "");
          scratchpads[nodeId] = content;
        }
      }
    }
  } catch {
    // Scratchpad directory doesn't exist
  }

  return scratchpads;
}

// ============================================================
// AIDLC Docs
// ============================================================

async function buildFileTree(
  baseDir: string,
  relativePath: string = ""
): Promise<FileTreeNode[]> {
  const currentDir = relativePath ? join(baseDir, relativePath) : baseDir;
  const nodes: FileTreeNode[] = [];

  try {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const children = await buildFileTree(baseDir, entryPath);
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: "directory",
          children,
        });
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: "file",
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return nodes;
}

export async function loadAidlcDocs(): Promise<FileTreeNode[]> {
  return buildFileTree(getAidlcDocsDir());
}

export async function loadAidlcDocContent(path: string): Promise<string | null> {
  // Prevent directory traversal and absolute paths
  if (!path || path.includes("..") || path.startsWith("/")) return null;
  return readTextFile(join(getAidlcDocsDir(), path));
}

export async function loadAidlcState(): Promise<AidlcStateResponse> {
  const statePath = join(getAidlcDocsDir(), "aidlc-state.md");
  const rawContent = (await readTextFile(statePath)) ?? "";
  const phases = parseAidlcState(rawContent);
  return { phases, rawContent };
}

// ============================================================
// AIDLC State Parser
// ============================================================

function parseAidlcState(content: string): AidlcPhase[] {
  const phases: AidlcPhase[] = [];
  const lines = content.split("\n");

  let currentPhase: AidlcPhase | null = null;
  let foundCurrent = false;

  for (const line of lines) {
    // Phase header: ## INCEPTION PHASE, ## CONSTRUCTION PHASE, etc.
    const phaseMatch = line.match(/^##\s+(.+?)\s+PHASE/i);
    if (phaseMatch) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = {
        name: phaseMatch[1].toLowerCase(),
        displayName: getPhaseDisplayName(phaseMatch[1]),
        stages: [],
      };
      continue;
    }

    // Stage checkbox: - [x] Stage Name or - [ ] Stage Name
    const stageMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (stageMatch && currentPhase) {
      const completed = stageMatch[1].toLowerCase() === "x";
      const stageName = stageMatch[2].trim();
      const isCurrent = !completed && !foundCurrent;
      if (isCurrent) foundCurrent = true;

      currentPhase.stages.push({
        name: stageName.toLowerCase().replace(/\s+/g, "-"),
        displayName: stageName,
        completed,
        current: isCurrent,
      });
    }
  }

  if (currentPhase) phases.push(currentPhase);
  return phases;
}

function getPhaseDisplayName(phaseName: string): string {
  const map: Record<string, string> = {
    INCEPTION: "설계 단계",
    CONSTRUCTION: "개발 단계",
    OPERATIONS: "운영 단계",
  };
  return map[phaseName.toUpperCase()] || phaseName;
}

// ============================================================
// Config
// ============================================================

export async function loadConfig(): Promise<ConfigYaml> {
  const config = await readYamlFile<ConfigYaml>(join(getCrewDir(), "config.yaml"));
  return config ?? {};
}

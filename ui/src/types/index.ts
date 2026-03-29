// ============================================================
// Graph Execution State
// ============================================================

export interface PreflightState {
  completedAt: string;
  modelsVerified: string[];
  modelsSkipped: string[];
  gitClean: boolean;
  graphHash: string;
}

export interface GraphState {
  version: "3.0" | "3.1";
  bundleName: string;
  runId?: string;
  preflight?: PreflightState;
  nodes: Record<string, NodeState>;
}

export interface NodeState {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================================
// Graph Definition
// ============================================================

export type GraphNodeType = "worker" | "router" | "aggregator";

export interface GraphNodeConfig {
  isolation?: "worktree" | "none";
  model?: string;
  retry?: number;
}

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  agent: string;
  skills: string[];
  hooks: string[];
  depends_on: string[];
  condition?: string;
  wait?: "all" | "any";
  config: GraphNodeConfig;
}

export interface GraphDefinition {
  nodes: GraphNode[];
}

// ============================================================
// Run History Types
// ============================================================

export interface NodeSummary {
  nodeId: string;
  agent: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  duration: string;
  filesChanged: string[];
  keyDecisions: string[];
}

export interface AidlcDocumentSnapshot {
  path: string;
  content: string;
  stage: string;
}

export interface AidlcSnapshot {
  stateMd: string;
  documents: AidlcDocumentSnapshot[];
  capturedAt: string;
}

export interface RunManifest {
  schema: "ai-crew.run.v1";
  runId: string;

  intent: {
    description: string;
    slug: string;
    source: "user" | "aidlc" | "auto";
  };

  context: {
    bundleName: string;
    graphHash: string;
    graphNodeCount: number;
    graphLevelCount: number;
    model: string;
    locale: string;
  };

  timeline: {
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  };

  state: "preparing" | "running" | "completed" | "failed" | "archived";

  outcome: {
    nodesCompleted: string[];
    nodesFailed: string[];
    nodesSkipped: string[];
    summary: string[];
    issues: string[];
  } | null;

  nodeSummaries: Record<string, NodeSummary>;

  aidlcSnapshot?: AidlcSnapshot;
  autoTitle?: string;
  autoSummary?: string;
}

export interface RunIndexEntry {
  runId: string;
  intent: string;
  state: "preparing" | "running" | "completed" | "failed" | "archived";
  createdAt: string;
  completedAt: string | null;
  nodesTotal: number;
  nodesCompleted: number;
  nodesFailed: number;
}

export interface RunRegistry {
  schema: "ai-crew.runs.v1";
  current: string | null;
  runs: RunIndexEntry[];
  stats: {
    totalRuns: number;
    totalCompleted: number;
    totalFailed: number;
  };
}

// ============================================================
// AIDLC State (parsed from aidlc-state.md)
// ============================================================

export interface AidlcPhase {
  name: string;
  displayName: string;
  stages: AidlcStage[];
}

export interface AidlcStage {
  name: string;
  displayName: string;
  completed: boolean;
  current: boolean;
}

export interface AidlcStateResponse {
  phases: AidlcPhase[];
  rawContent: string;
}

// ============================================================
// File Tree
// ============================================================

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

// ============================================================
// Config
// ============================================================

export interface ConfigYaml {
  bundle?: string;
  defaults?: {
    model?: string;
    isolation?: string;
    locale?: string;
    runs?: {
      retention?: number;
      auto_archive?: boolean;
      context_depth?: number;
    };
  };
  [key: string]: unknown;
}

// ============================================================
// API Responses
// ============================================================

export interface CurrentStateResponse {
  state: GraphState | null;
  graph: GraphDefinition | null;
  runId: string | null;
  scratchpads: Record<string, string>;
}

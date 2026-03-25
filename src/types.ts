// ============================================================
// Bundle Configuration Types (graph-workflow-design.md)
// ============================================================

export interface BundlePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
}

/**
 * External workflow source reference.
 * When workflow is an object, it specifies an external source to fetch.
 * When workflow is a string, it's either a local name or "none".
 */
export interface ExternalWorkflow {
  source: string; // "github:owner/repo" or "npm:package-name"
  path: string; // subpath within the source
  ref?: string; // git ref (branch, tag, commit)
}

export interface BundleDefaults {
  model: string;
  isolation: "worktree" | "none";
  rules: string[];
  mcp: string[];
  merge_mode?: "auto" | "manual";
  locale?: string; // e.g., "ko", "en" (default: "en")
}

export interface BundleIncludes {
  agents: string[];
  skills: string[];
  commands: string[];
  hooks: string[];
}

// ============================================================
// Graph Types
// ============================================================

export type GraphNodeType = "worker" | "router" | "aggregator";

export interface GraphNodeConfig {
  isolation?: "worktree" | "none";
  model?: string;
  retry?: number; // 0-3, default 0
}

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  agent: string;
  skills: string[];
  hooks: string[];
  depends_on: string[];
  condition?: string; // e.g. "{id}.output.{key} == '{val}'"
  wait?: "all" | "any"; // aggregator only
  config: GraphNodeConfig;
  verify?: VerifyCheck[];
}

/** Verification check — built-in names or custom command strings */
export type VerifyCheck = "test" | "lint" | "build" | string;

export interface BundleGraph {
  nodes: GraphNode[];
}

// ============================================================
// AI-DLC Config
// ============================================================

export interface AidlcConfig {
  install: "native" | "embedded";
}

// ============================================================
// Bundle Config (top-level bundle.yaml schema)
// ============================================================

export interface BundleConfig {
  plugin: BundlePlugin;
  workflow: ExternalWorkflow | string | null; // object, local name, or "none"/null
  defaults: BundleDefaults;
  includes: BundleIncludes;
  graph: BundleGraph;
  aidlc?: AidlcConfig;
}

// ============================================================
// Catalog & File System Types
// ============================================================

export type CatalogType =
  | "agents"
  | "skills"
  | "commands"
  | "hooks"
  | "rules"
  | "mcp"
  | "workflows";

export interface FileMapping {
  source: string;
  destination: string;
}

export interface ResolvedFiles {
  agents: FileMapping[];
  skills: FileMapping[];
  commands: FileMapping[];
  hooks: HooksResolution;
  rules: FileMapping[];
  mcp: McpResolution;
  workflows: FileMapping[];
}

export interface HooksResolution {
  files: FileMapping[]; // handler scripts
  configs: Record<string, unknown>[]; // parsed hooks.json contents
}

export interface McpResolution {
  configs: Record<string, unknown>[]; // parsed .mcp.json contents
}

// ============================================================
// Install Types
// ============================================================

export interface InstallOptions {
  force?: boolean;
}

export interface InstallResult {
  bundleName: string;
  targetPath: string;
  filesInstalled: number;
  graphNodes: number;
  workflowSource: string | null;
}

// ============================================================
// Graph Execution State (written to .ai-crew/state.json)
// ============================================================

export interface PreflightState {
  completedAt: string;
  modelsVerified: string[];
  modelsSkipped: string[];
  gitClean: boolean;
}

export interface GraphState {
  version: "3.0";
  bundleName: string;
  preflight?: PreflightState;
  nodes: Record<string, NodeState>;
}

export interface NodeState {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================================
// Validation Types
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

// ============================================================
// Install State Types
// ============================================================

export interface InstallState {
  version: string;
  bundleName: string;
  installedAt: string;
  targetPath: string;
  files: string[];
  graphNodes: number;
  workflowSource: string | null;
}

export interface DiagnosticResult {
  healthy: boolean;
  missingFiles: string[];
  extraFiles: string[];
  configMismatch: string[];
}

export interface UninstallResult {
  filesRemoved: number;
  dirsRemoved: number;
}

// ============================================================
// Verification Types
// ============================================================

export interface VerificationResult {
  passed: boolean;
  checks: VerifyCheckResult[];
}

export interface VerifyCheckResult {
  check: string;
  passed: boolean;
  output?: string;
  durationMs: number;
}

// ============================================================
// Shared Memory Types
// ============================================================

export interface SharedMemoryStore {
  version: string;
  nodes: Record<string, Record<string, unknown>>;
  updatedAt: string;
}

// ============================================================
// Checkpoint Data Types
// ============================================================

export interface CheckpointData {
  level: number;
  createdAt: string;
  state: GraphState;
  memory: SharedMemoryStore;
}

export interface CheckpointInfo {
  level: number;
  path: string;
  createdAt: string;
}

// ============================================================
// Session Context Types
// ============================================================

export interface ProjectContext {
  techStack: string[];
  patterns: string[];
  agentNotes: Record<string, string[]>;
  lastRunAt: string;
  updatedAt: string;
}

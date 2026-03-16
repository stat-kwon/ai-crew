// ============================================================
// State Model (DESIGN.md v2.0 Section 3.1)
// ============================================================

export interface AICrewState {
  version: "2.0";
  intent: Intent | null;
  units: Unit[];
  team: TeamInfo | null;
  events: AICrewEvent[];
}

export interface Intent {
  id: string;
  description: string;
  status: IntentStatus;
  completionCriteria: CompletionCriteria[];
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  status: UnitStatus;
  dependencies: string[];
  assignedTo: string | null;
  worktree: string | null;
  branch: string | null;
  currentHat: HatType | null;
  hatHistory: HatTransition[];
  hatArtifacts: HatArtifact[];
  tasks: Task[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  files: string[];
  completedAt: string | null;
}

export interface CompletionCriteria {
  id: string;
  description: string;
  verified: boolean;
  verifiedAt: string | null;
}

export interface TeamInfo {
  name: string;
  createdAt: string;
  agents: AgentInfo[];
}

export interface AgentInfo {
  name: string;
  unitId: string;
  status: "active" | "idle" | "completed";
}

export interface HatTransition {
  from: HatType | null;
  to: HatType;
  reason: string;
  timestamp: string;
}

export interface AICrewEvent {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type IntentStatus =
  | "elaborating"
  | "ready"
  | "executing"
  | "integrating"
  | "complete";

export type UnitStatus =
  | "pending"
  | "assigned"
  | "in-progress"
  | "review"
  | "complete"
  | "blocked";

export type TaskStatus = "pending" | "in-progress" | "complete" | "skipped";

export type HatType = string;

export interface HatDefinition {
  id: string;
  name: string;
  description: string;
  rules?: string;
  artifacts: string[];
  transitions: string[];
  qualityGates: QualityGateRule[];
  modelOverride?: {
    provider?: string;
    model?: string;
  };
}

export interface HatArtifact {
  hatId: string;
  startedAt: string | null;
  completedAt: string | null;
  outputs: string[];
  gateResults: GateResult[];
}

export interface GateResult {
  command: string;
  passed: boolean;
  output?: string;
}

export type EventType =
  | "intent:created"
  | "intent:updated"
  | "intent:completed"
  | "unit:assigned"
  | "unit:started"
  | "unit:completed"
  | "task:started"
  | "task:completed"
  | "hat:changed"
  | "checkpoint:created"
  | "team:created"
  | "team:disbanded";

// ============================================================
// Config Model (DESIGN.md v2.0 Section 3.2)
// ============================================================

export interface AICrewConfig {
  version: "2.0";
  execution: ExecutionConfig;
  hats: HatsConfig;
  checkpoints: CheckpointsConfig;
  language: "ko" | "en";
}

export interface ExecutionConfig {
  maxParallelUnits: number;
  defaultModel: string;
  teammateMode: "tmux" | "in-process";
}

export interface HatsConfig {
  requirePlanApproval: boolean;
  autoTransition: boolean;
  pipeline: HatDefinition[];
  presets?: Record<string, string[]>;
}

export interface QualityGateRule {
  command: string;
  failAction: "block" | "warn";
  minCoverage?: number;
}

export interface CheckpointsConfig {
  auto: boolean;
  triggers: EventType[];
}

// ============================================================
// Checkpoint Model
// ============================================================

export interface Checkpoint {
  id: string;
  description: string;
  createdAt: string;
  state: AICrewState;
  git: {
    mainRef: string;
    branches: { name: string; ref: string }[];
  };
  changes: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
}

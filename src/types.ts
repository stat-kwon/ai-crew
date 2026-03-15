/**
 * AI-Crew Type Definitions
 */

// ============================================
// Hat System
// ============================================

export type HatType = 
  | 'planner' 
  | 'builder' 
  | 'reviewer'
  | 'observer'
  | 'hypothesizer'
  | 'experimenter'
  | 'analyst'
  | 'designer'
  | 'red-team'
  | 'blue-team'
  | 'integrator';

export type WorkflowType = 
  | 'core'        // Planner → Builder → Reviewer
  | 'hypothesis'  // Observer → Hypothesizer → Experimenter → Analyst
  | 'tdd'         // TestWriter → Implementer → Refactorer
  | 'adversarial' // Planner → Builder → RedTeam → BlueTeam → Reviewer
  | 'design';     // Planner → Designer → Reviewer

export interface HatTransition {
  from: HatType;
  to: HatType;
  reason: string;
  timestamp: Date;
}

// ============================================
// Intent & Units
// ============================================

export type IntentStatus = 'elaborating' | 'ready' | 'executing' | 'integrating' | 'complete';
export type UnitStatus = 'pending' | 'in-progress' | 'review' | 'complete' | 'blocked';
export type TaskStatus = 'pending' | 'claimed' | 'in-progress' | 'complete' | 'failed';

export interface CompletionCriteria {
  id: string;
  description: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface Intent {
  id: string;
  description: string;
  status: IntentStatus;
  completionCriteria: CompletionCriteria[];
  units: Unit[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  status: UnitStatus;
  dependencies: string[]; // Unit IDs
  assignedAgent?: string;
  worktree?: string;
  branch?: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  files: string[];
  claimedBy?: string;
  claimedAt?: Date;
  completedAt?: Date;
}

// ============================================
// Agent Team
// ============================================

export interface AgentConfig {
  name: string;
  agentId?: string;
  role: string;
  model?: string;
  worktree?: string;
  unitIds: string[];
  currentHat?: HatType;
}

export interface TeamConfig {
  name: string;
  lead: AgentConfig;
  members: AgentConfig[];
  taskListPath: string;
  communication: {
    mode: 'direct' | 'lead-only';
    broadcastOnCompletion: boolean;
  };
}

export interface TeamMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  content: string;
  timestamp: Date;
  read: boolean;
}

// ============================================
// State & Checkpoints
// ============================================

export interface Checkpoint {
  id: string;
  intentId: string;
  description: string;
  state: StateSnapshot;
  gitRef?: string;
  createdAt: Date;
}

export interface StateSnapshot {
  intent: Intent;
  team?: TeamConfig;
  messages: TeamMessage[];
}

// ============================================
// Configuration
// ============================================

export interface AICrewConfig {
  version: string;
  
  team: {
    maxAgents: number;
    defaultModel: string;
    teammateMode: 'tmux' | 'in-process';
  };
  
  hats: {
    enabled: boolean;
    defaultWorkflow: WorkflowType;
    requirePlanApproval: boolean;
  };
  
  state: {
    autoCheckpoint: boolean;
    checkpointInterval: 'task' | 'unit' | 'manual';
  };
  
  qualityGates: {
    tests: boolean;
    lint: boolean;
    coverage: number;
    customCommands?: string[];
  };
  
  templates?: {
    requirements?: string;
    design?: string;
    tasks?: string;
  };
}

// ============================================
// Events
// ============================================

export type EventType =
  | 'intent:created'
  | 'intent:updated'
  | 'unit:started'
  | 'unit:completed'
  | 'task:claimed'
  | 'task:completed'
  | 'hat:changed'
  | 'checkpoint:created'
  | 'team:created'
  | 'agent:spawned'
  | 'agent:idle'
  | 'message:sent';

export interface AICrewEvent {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

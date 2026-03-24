export type {
  AICrewState,
  Intent,
  Unit,
  Task,
  CompletionCriteria,
  TeamInfo,
  AgentInfo,
  HatTransition,
  AICrewEvent,
  HatType,
  HatDefinition,
  HatArtifact,
  GateResult,
  IntentStatus,
  UnitStatus,
  TaskStatus,
  EventType,
  AICrewConfig,
  ExecutionConfig,
  HatsConfig,
  QualityGateRule,
  CheckpointsConfig,
  Checkpoint,
} from "./types.js";

export { StateManager } from "./state.js";
export { loadConfig, saveConfig, DEFAULT_CONFIG } from "./config.js";
export { install } from "./installer.js";
export {
  filterHooksByProfile,
  filterHooksConfigByProfile,
  resolveHookProfile,
} from "./hook-profiler.js";
export type {
  HookMatcher,
  HookAction,
  HooksConfig,
  HookProfile,
} from "./hook-profiler.js";

// -- Types ------------------------------------------------------------
export type {
  // Bundle & Graph Types
  BundlePlugin,
  ExternalWorkflow,
  BundleDefaults,
  BundleIncludes,
  GraphNodeType,
  GraphNodeConfig,
  GraphNode,
  VerifyCheck,
  BundleGraph,
  AidlcConfig,
  BundleConfig,
  CatalogType,
  FileMapping,
  ResolvedFiles,
  HooksResolution,
  McpResolution,
  InstallOptions,
  InstallResult,
  GraphState,
  NodeState,
  // Validation Types
  ValidationResult,
  ValidationError,
  // Install State Types
  InstallState,
  DiagnosticResult,
  UninstallResult,
  // Verification Types
  VerificationResult,
  VerifyCheckResult,
  // Shared Memory Types
  SharedMemoryStore,
  // Checkpoint Data Types
  CheckpointData,
  CheckpointInfo,
  // Session Context Types
  ProjectContext,
} from "./types.js";

// -- Graph Engine -----------------------------------------------------
export { validateGraph } from "./graph.js";

// -- Workflow Fetcher -------------------------------------------------
export {
  fetchWorkflow,
  resolveLocal,
  getCacheKey,
} from "./workflow-fetcher.js";

// -- Resolver ---------------------------------------------------------
export {
  loadBundle,
  listBundles,
  resolveIncludes,
  getCatalogDir,
  parseAgentFrontmatter,
} from "./resolver.js";

// -- Installer --------------------------------------------------------
export { install } from "./installer.js";

// -- Install State ----------------------------------------------------
export {
  recordInstall,
  readInstallState,
  diagnose,
  uninstall,
} from "./install-state.js";

// -- Validator --------------------------------------------------------
export {
  validateBundleConfig,
  validateConfigYaml,
  validateGraphYaml,
  validatePluginJson,
  validateHooksJson,
  validateStateJson,
} from "./validator.js";

// -- Hook Profiler ----------------------------------------------------
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

// -- Verifier — Node verification checks ------------------------------
export { getDefaultCommands, verifyNode } from "./verifier.js";

// -- Shared Memory ----------------------------------------------------
export {
  writeNodeOutput,
  readNodeOutput,
  readDependencyOutputs,
  clearMemory,
} from "./shared-memory.js";

// -- Session Context — project-context.json persistence ---------------
export { saveContext, loadContext, mergeAgentLearning } from "./session-context.js";

// -- Checkpoint -------------------------------------------------------
export {
  createCheckpoint,
  listCheckpoints,
  restoreCheckpoint,
} from "./checkpoint.js";

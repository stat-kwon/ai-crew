import type { ValidationResult, ValidationError } from "./types.js";

// ============================================================
// Helpers
// ============================================================

function err(path: string, message: string, severity: "error" | "warning" = "error"): ValidationError {
  return { path, message, severity };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

function requireString(
  obj: Record<string, unknown>,
  field: string,
  path: string,
  errors: ValidationError[],
): void {
  if (typeof obj[field] !== "string" || (obj[field] as string).length === 0) {
    errors.push(err(`${path}.${field}`, `"${field}" is required and must be a non-empty string`));
  }
}

function requireObject(
  obj: Record<string, unknown>,
  field: string,
  path: string,
  errors: ValidationError[],
): Record<string, unknown> | null {
  const val = obj[field];
  if (!isObject(val)) {
    errors.push(err(`${path}.${field}`, `"${field}" is required and must be an object`));
    return null;
  }
  return val;
}

// ============================================================
// validateConfigYaml
// ============================================================

/**
 * Validate a parsed config.yaml (AICrewConfig) structure.
 * Required: version, execution.defaultModel, hats.pipeline, checkpoints, language.
 */
export function validateConfigYaml(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(data)) {
    errors.push(err("", "config.yaml must be an object"));
    return { valid: false, errors };
  }

  requireString(data, "version", "", errors);

  const execution = requireObject(data, "execution", "", errors);
  if (execution) {
    requireString(execution, "defaultModel", "execution", errors);
  }

  const hats = requireObject(data, "hats", "", errors);
  if (hats) {
    if (!Array.isArray(hats.pipeline)) {
      errors.push(err("hats.pipeline", '"pipeline" must be an array'));
    }
  }

  requireObject(data, "checkpoints", "", errors);

  if (typeof data.language !== "string" || !["ko", "en"].includes(data.language as string)) {
    errors.push(err("language", '"language" must be "ko" or "en"'));
  }

  // defaults.runs validation (optional — warn if invalid, don't error for backward compat)
  if (data.defaults && isObject(data.defaults) && (data.defaults as Record<string, unknown>).runs !== undefined) {
    const runs = (data.defaults as Record<string, unknown>).runs;
    if (isObject(runs)) {
      const r = runs as Record<string, unknown>;
      if (r.retention !== undefined && (typeof r.retention !== "number" || (r.retention as number) < 1)) {
        errors.push({ path: "defaults.runs.retention", message: '"retention" must be a number >= 1', severity: "warning" });
      }
      if (r.auto_archive !== undefined && typeof r.auto_archive !== "boolean") {
        errors.push({ path: "defaults.runs.auto_archive", message: '"auto_archive" must be a boolean', severity: "warning" });
      }
      if (r.context_depth !== undefined && (typeof r.context_depth !== "number" || (r.context_depth as number) < 0)) {
        errors.push({ path: "defaults.runs.context_depth", message: '"context_depth" must be a number >= 0', severity: "warning" });
      }
    } else {
      errors.push({ path: "defaults.runs", message: '"runs" must be an object', severity: "warning" });
    }
  }

  return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
}

// ============================================================
// validateBundleConfig
// ============================================================

/**
 * Validate a parsed bundle.yaml structure.
 * Required fields: plugin.id, plugin.name, defaults.model, includes, graph
 */
export function validateBundleConfig(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(data)) {
    errors.push(err("", "Bundle config must be an object"));
    return { valid: false, errors };
  }

  // plugin
  const plugin = requireObject(data, "plugin", "", errors);
  if (plugin) {
    requireString(plugin, "id", "plugin", errors);
    requireString(plugin, "name", "plugin", errors);
  }

  // defaults
  const defaults = requireObject(data, "defaults", "", errors);
  if (defaults) {
    requireString(defaults, "model", "defaults", errors);
  }

  // includes
  const includes = requireObject(data, "includes", "", errors);
  if (includes) {
    for (const field of ["agents", "skills", "commands", "hooks"] as const) {
      if (includes[field] !== undefined && !isStringArray(includes[field])) {
        errors.push(err(`includes.${field}`, `"${field}" must be a string array`));
      }
    }
  }

  // graph
  const graph = requireObject(data, "graph", "", errors);
  if (graph) {
    validateGraphNodes(graph, "graph", errors);
  }

  return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
}

// ============================================================
// validateGraphYaml
// ============================================================

/**
 * Validate a parsed graph.yaml structure.
 * Required: graph.nodes array with valid node definitions.
 */
export function validateGraphYaml(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(data)) {
    errors.push(err("", "Graph config must be an object"));
    return { valid: false, errors };
  }

  validateGraphNodes(data, "", errors);

  return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
}

// ============================================================
// Shared graph node validation
// ============================================================

function validateGraphNodes(
  container: Record<string, unknown>,
  basePath: string,
  errors: ValidationError[],
): void {
  const nodes = container.nodes;

  if (!Array.isArray(nodes)) {
    errors.push(err(`${basePath}.nodes`, '"nodes" must be an array'));
    return;
  }

  const validTypes = new Set(["worker", "router", "aggregator"]);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodePath = `${basePath}.nodes[${i}]`;

    if (!isObject(node)) {
      errors.push(err(nodePath, "Each node must be an object"));
      continue;
    }

    requireString(node, "id", nodePath, errors);
    requireString(node, "agent", nodePath, errors);

    // type
    if (typeof node.type !== "string" || !validTypes.has(node.type)) {
      errors.push(err(`${nodePath}.type`, `"type" must be one of: worker, router, aggregator`));
    }

    // depends_on
    if (node.depends_on !== undefined && !isStringArray(node.depends_on)) {
      errors.push(err(`${nodePath}.depends_on`, '"depends_on" must be a string array'));
    }

    // router must have isolation: none
    if (node.type === "router") {
      const config = isObject(node.config) ? node.config : {};
      if (config.isolation !== "none") {
        errors.push(err(`${nodePath}.config.isolation`, 'Router nodes must have isolation: "none"'));
      }

      // FR-9: Router condition field validation stub.
      // Router nodes may declare a `condition` field that specifies a branch
      // expression evaluated at runtime. Format: "<field> <op> <value>" where
      // op is one of: ==, !=, contains, matches.
      // Full condition evaluation is not yet implemented; emit a warning so
      // users are aware the field is recognized but not enforced.
      if (typeof node.condition === "string" && node.condition.length > 0) {
        errors.push(
          err(
            `${nodePath}.condition`,
            "Router condition evaluation not yet implemented",
            "warning",
          ),
        );
      }
    }

    // aggregator must have wait
    if (node.type === "aggregator") {
      if (node.wait !== "all" && node.wait !== "any") {
        errors.push(err(`${nodePath}.wait`, 'Aggregator nodes must specify wait: "all" | "any"'));
      }
    }

    // verify must be string[]
    if (node.verify !== undefined && !isStringArray(node.verify)) {
      errors.push(err(`${nodePath}.verify`, '"verify" must be a string array'));
    }

    // config.retry must be 0-3
    if (isObject(node.config) && node.config.retry !== undefined) {
      const retry = node.config.retry;
      if (typeof retry !== "number" || !Number.isInteger(retry) || retry < 0 || retry > 3) {
        errors.push(err(`${nodePath}.config.retry`, '"retry" must be an integer between 0 and 3'));
      }
    }
  }

  // ── Cross-node validation ──────────────────────────────────

  // Collect valid node IDs
  const nodeIds = new Set<string>();
  const seenIds = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isObject(node) || typeof node.id !== "string") continue;
    if (seenIds.has(node.id)) {
      errors.push(err(`${basePath}.nodes[${i}].id`, `Duplicate node id: "${node.id}"`));
    }
    seenIds.add(node.id);
    nodeIds.add(node.id);
  }

  // Validate depends_on references exist
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isObject(node) || !Array.isArray(node.depends_on)) continue;
    for (const dep of node.depends_on) {
      if (typeof dep === "string" && !nodeIds.has(dep)) {
        errors.push(err(
          `${basePath}.nodes[${i}].depends_on`,
          `References non-existent node: "${dep}"`,
        ));
      }
    }
  }

  // Cycle detection using Kahn's algorithm
  if (nodeIds.size > 0) {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }
    for (const node of nodes) {
      if (!isObject(node) || typeof node.id !== "string" || !Array.isArray(node.depends_on)) continue;
      for (const dep of node.depends_on) {
        if (typeof dep === "string" && nodeIds.has(dep)) {
          adj.get(dep)!.push(node.id);
          inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    let visited = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited++;
      for (const next of adj.get(current) ?? []) {
        const newDeg = (inDegree.get(next) ?? 1) - 1;
        inDegree.set(next, newDeg);
        if (newDeg === 0) queue.push(next);
      }
    }

    if (visited < nodeIds.size) {
      errors.push(err(`${basePath}.nodes`, "Circular dependency detected in graph nodes"));
    }
  }
}

// ============================================================
// validatePluginJson
// ============================================================

/**
 * Validate a parsed plugin.json structure.
 * Required: name, description.
 */
export function validatePluginJson(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(data)) {
    errors.push(err("", "plugin.json must be an object"));
    return { valid: false, errors };
  }

  requireString(data, "name", "", errors);
  requireString(data, "description", "", errors);

  return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
}

// ============================================================
// validateHooksJson
// ============================================================

const KNOWN_HOOK_EVENTS = new Set([
  "PreInstall",
  "PostInstall",
  "PreUninstall",
  "PostUninstall",
  "PreNodeStart",
  "PostNodeComplete",
  "PreLevelStart",
  "PostLevelComplete",
  "OnError",
]);

/**
 * Validate a parsed hooks.json structure.
 * Required: hooks object with known event types.
 */
export function validateHooksJson(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(data)) {
    errors.push(err("", "hooks.json must be an object"));
    return { valid: false, errors };
  }

  const hooks = data.hooks;
  if (!isObject(hooks)) {
    errors.push(err("hooks", '"hooks" is required and must be an object'));
    return { valid: false, errors };
  }

  for (const eventName of Object.keys(hooks)) {
    if (!KNOWN_HOOK_EVENTS.has(eventName)) {
      errors.push(err(
        `hooks.${eventName}`,
        `Unknown hook event "${eventName}". Known events: ${Array.from(KNOWN_HOOK_EVENTS).join(", ")}`,
        "warning",
      ));
    }
  }

  return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
}

// ============================================================
// validateStateJson
// ============================================================

const VALID_NODE_STATUSES = new Set([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

/**
 * Validate a parsed state.json (GraphState) structure.
 * Required: version, bundleName, nodes.
 */
export function validateStateJson(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(data)) {
    errors.push(err("", "state.json must be an object"));
    return { valid: false, errors };
  }

  requireString(data, "version", "", errors);
  requireString(data, "bundleName", "", errors);

  const nodes = data.nodes;
  if (!isObject(nodes)) {
    errors.push(err("nodes", '"nodes" is required and must be an object'));
    return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
  }

  for (const [nodeId, nodeState] of Object.entries(nodes)) {
    if (!isObject(nodeState)) {
      errors.push(err(`nodes.${nodeId}`, "Node state must be an object"));
      continue;
    }

    const status = nodeState.status;
    if (typeof status !== "string" || !VALID_NODE_STATUSES.has(status)) {
      errors.push(err(
        `nodes.${nodeId}.status`,
        `Invalid status "${String(status)}". Must be one of: ${Array.from(VALID_NODE_STATUSES).join(", ")}`,
      ));
    }
  }

  return { valid: errors.filter((e) => e.severity === "error").length === 0, errors };
}

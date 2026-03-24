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

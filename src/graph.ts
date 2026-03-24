import type { GraphNode, ValidationResult, ValidationError } from "./types.js";

// ============================================================
// Helpers
// ============================================================

function err(path: string, message: string, severity: "error" | "warning" = "error"): ValidationError {
  return { path, message, severity };
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

// ============================================================
// validateGraph
// ============================================================

/**
 * Validate an array of GraphNode objects for structural correctness
 * and graph-level constraints (cycles, dangling deps, verify, retry).
 *
 * This operates on typed GraphNode[] (post-parse), whereas validator.ts
 * validates raw unknown YAML data (pre-parse). Both layers are needed:
 * validator.ts catches malformed input, this catches semantic issues.
 */
export function validateGraph(nodes: GraphNode[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(nodes)) {
    errors.push(err("nodes", "nodes must be an array"));
    return { valid: false, errors };
  }

  const nodeIds = new Set<string>();

  // Pass 1: collect IDs and validate per-node fields
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = `nodes[${i}]`;

    // Duplicate ID check
    if (nodeIds.has(node.id)) {
      errors.push(err(`${path}.id`, `Duplicate node id "${node.id}"`));
    }
    nodeIds.add(node.id);

    // verify: must be a string array if present
    if (node.verify !== undefined) {
      if (!isStringArray(node.verify)) {
        errors.push(err(`${path}.verify`, '"verify" must be a string array'));
      }
    }

    // config.retry: must be integer 0-3 if present
    if (node.config?.retry !== undefined) {
      const retry = node.config.retry;
      if (typeof retry !== "number" || !Number.isInteger(retry) || retry < 0 || retry > 3) {
        errors.push(err(`${path}.config.retry`, '"retry" must be an integer between 0 and 3'));
      }
    }
  }

  // Pass 2: validate dependencies exist (no dangling refs)
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = `nodes[${i}]`;

    for (const dep of node.depends_on) {
      if (!nodeIds.has(dep)) {
        errors.push(err(`${path}.depends_on`, `Dependency "${dep}" references unknown node`));
      }
    }
  }

  // Pass 3: cycle detection via topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    if (!inDegree.has(node.id)) {
      inDegree.set(node.id, 0);
    }
    if (!adjacency.has(node.id)) {
      adjacency.set(node.id, []);
    }
  }

  for (const node of nodes) {
    for (const dep of node.depends_on) {
      if (nodeIds.has(dep)) {
        adjacency.get(dep)!.push(node.id);
        inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visited < nodeIds.size) {
    errors.push(err("nodes", "Graph contains a cycle"));
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
  };
}

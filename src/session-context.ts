import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { ProjectContext } from "./types.js";

const CONTEXT_FILENAME = "project-context.json";

/**
 * Resolves the absolute path to the project-context.json file.
 */
function contextPath(crewDir: string): string {
  return join(crewDir, CONTEXT_FILENAME);
}

/**
 * Validates that a parsed object conforms to the ProjectContext interface.
 * Returns the validated object or throws with a descriptive message.
 */
function validateContext(data: unknown): ProjectContext {
  if (data === null || typeof data !== "object") {
    throw new Error("project-context.json must contain a JSON object");
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.techStack)) {
    throw new Error("project-context.json: techStack must be an array");
  }
  for (const item of obj.techStack) {
    if (typeof item !== "string") {
      throw new Error("project-context.json: techStack items must be strings");
    }
  }

  if (!Array.isArray(obj.patterns)) {
    throw new Error("project-context.json: patterns must be an array");
  }
  for (const item of obj.patterns) {
    if (typeof item !== "string") {
      throw new Error("project-context.json: patterns items must be strings");
    }
  }

  if (obj.agentNotes === null || typeof obj.agentNotes !== "object" || Array.isArray(obj.agentNotes)) {
    throw new Error("project-context.json: agentNotes must be an object");
  }
  const notes = obj.agentNotes as Record<string, unknown>;
  for (const [key, value] of Object.entries(notes)) {
    // Legacy format: string[] (v3.0)
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item !== "string") {
          throw new Error(`project-context.json: agentNotes["${key}"] items must be strings`);
        }
      }
    // v3.1 format: Record<string, string[]> (run-scoped notes)
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const runNotes = value as Record<string, unknown>;
      for (const [runId, runItems] of Object.entries(runNotes)) {
        if (!Array.isArray(runItems)) {
          throw new Error(`project-context.json: agentNotes["${key}"]["${runId}"] must be an array`);
        }
        for (const item of runItems) {
          if (typeof item !== "string") {
            throw new Error(`project-context.json: agentNotes["${key}"]["${runId}"] items must be strings`);
          }
        }
      }
    } else {
      throw new Error(`project-context.json: agentNotes["${key}"] must be an array or object`);
    }
  }

  if (typeof obj.lastRunAt !== "string") {
    throw new Error("project-context.json: lastRunAt must be a string");
  }
  if (typeof obj.updatedAt !== "string") {
    throw new Error("project-context.json: updatedAt must be a string");
  }

  return obj as unknown as ProjectContext;
}

/**
 * Saves a ProjectContext to .ai-crew/project-context.json.
 * Creates the directory if it does not exist.
 * Validates the context before writing.
 */
export async function saveContext(
  crewDir: string,
  context: ProjectContext,
): Promise<void> {
  if (!crewDir || typeof crewDir !== "string") {
    throw new Error("crewDir must be a non-empty string");
  }

  // Validate before writing to ensure we never persist invalid data
  validateContext(context);

  const filePath = contextPath(crewDir);
  await mkdir(dirname(filePath), { recursive: true });
  const json = JSON.stringify(context, null, 2) + "\n";
  await writeFile(filePath, json, "utf-8");
}

/**
 * Loads a ProjectContext from .ai-crew/project-context.json.
 * Returns null if the file does not exist.
 * Throws if the file exists but contains invalid data.
 */
export async function loadContext(
  crewDir: string,
): Promise<ProjectContext | null> {
  if (!crewDir || typeof crewDir !== "string") {
    throw new Error("crewDir must be a non-empty string");
  }

  const filePath = contextPath(crewDir);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("project-context.json contains invalid JSON");
  }

  return validateContext(parsed);
}

/**
 * Appends a learning note to a specific agent's notes in the project context.
 * Loads the current context (or creates a default one), appends the learning
 * string to agentNotes[nodeId], and saves.
 */
export async function mergeAgentLearning(
  crewDir: string,
  nodeId: string,
  learning: string,
): Promise<void> {
  if (!crewDir || typeof crewDir !== "string") {
    throw new Error("crewDir must be a non-empty string");
  }
  if (!nodeId || typeof nodeId !== "string") {
    throw new Error("nodeId must be a non-empty string");
  }
  if (typeof learning !== "string") {
    throw new Error("learning must be a string");
  }

  const now = new Date().toISOString();

  let context = await loadContext(crewDir);
  if (context === null) {
    context = {
      techStack: [],
      patterns: [],
      agentNotes: {},
      lastRunAt: now,
      updatedAt: now,
    };
  }

  // Handle both legacy (string[]) and v3.1 (Record<string, string[]>) formats
  const existing = context.agentNotes[nodeId];
  if (Array.isArray(existing)) {
    // Legacy format: append directly
    existing.push(learning);
  } else if (existing !== null && typeof existing === "object") {
    // v3.1 format: append to "_unscoped" key (no runId available in this API)
    const runNotes = existing as Record<string, string[]>;
    if (!Array.isArray(runNotes["_unscoped"])) {
      runNotes["_unscoped"] = [];
    }
    runNotes["_unscoped"].push(learning);
  } else {
    // Not yet initialized
    context.agentNotes[nodeId] = [learning];
  }
  context.updatedAt = now;

  await saveContext(crewDir, context);
}

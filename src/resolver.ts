import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { parse } from "yaml";
import type {
  BundleConfig,
  BundleIncludes,
  CatalogType,
  FileMapping,
  ResolvedFiles,
  HooksResolution,
  McpResolution,
  CatalogManifest,
  CatalogManifestAgent,
  CatalogManifestSkill,
} from "./types.js";

export function getCatalogDir(): string {
  const thisDir = new URL(".", import.meta.url).pathname;
  return join(thisDir, "..", "catalog");
}

/**
 * Load and parse a bundle.yaml file.
 */
export async function loadBundle(
  bundleName: string,
  bundlesDir?: string,
): Promise<BundleConfig> {
  const dir =
    bundlesDir ?? join(getCatalogDir(), "bundles");
  const bundlePath = join(dir, bundleName, "bundle.yaml");

  if (!existsSync(bundlePath)) {
    throw new Error(
      `Bundle not found: ${bundleName} (looked at ${bundlePath})`,
    );
  }

  const raw = await readFile(bundlePath, "utf-8");
  const data = parse(raw) as Record<string, unknown>;

  const plugin = data.plugin as BundleConfig["plugin"];
  const workflow = parseWorkflowField(data.workflow);
  const defaults = (data.defaults as BundleConfig["defaults"]) ?? {
    model: "claude-sonnet-4",
    isolation: "worktree",
    rules: ["global"],
    mcp: [],
  };
  const includes = (data.includes as BundleConfig["includes"]) ?? {
    agents: [],
    skills: [],
    commands: [],
    hooks: [],
  };
  const graph = (data.graph as BundleConfig["graph"]) ?? { nodes: [] };

  // Normalize graph nodes with defaults
  if (graph.nodes) {
    for (const node of graph.nodes) {
      node.skills = node.skills ?? [];
      node.hooks = node.hooks ?? [];
      node.depends_on = node.depends_on ?? [];
      node.config = node.config ?? {};
    }
  }

  const aidlc = data.aidlc as BundleConfig["aidlc"] ?? undefined;

  return { plugin, workflow, defaults, includes, graph, aidlc };
}

function parseWorkflowField(
  raw: unknown,
): BundleConfig["workflow"] {
  if (raw === null || raw === undefined || raw === "none") {
    return null;
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "object") {
    return raw as BundleConfig["workflow"];
  }
  return null;
}

/**
 * List all available bundles in the catalog.
 */
export async function listBundles(
  bundlesDir?: string,
): Promise<{ name: string; description: string; version: string }[]> {
  const dir = bundlesDir ?? join(getCatalogDir(), "bundles");
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir);
  const bundles: { name: string; description: string; version: string }[] = [];

  for (const entry of entries) {
    if (entry.startsWith("_") || entry.startsWith(".")) continue;
    const bundlePath = join(dir, entry, "bundle.yaml");
    if (!existsSync(bundlePath)) continue;
    try {
      const raw = await readFile(bundlePath, "utf-8");
      const data = parse(raw) as Record<string, unknown>;
      const plugin = data.plugin as Record<string, string> | undefined;
      bundles.push({
        name: plugin?.name ?? entry,
        description: plugin?.description ?? "",
        version: plugin?.version ?? "1.0.0",
      });
    } catch {
      // skip malformed
    }
  }

  return bundles;
}

/**
 * Resolve all includes from a bundle config into file mappings.
 */
export async function resolveIncludes(
  includes: BundleIncludes,
  defaults: BundleConfig["defaults"],
  workflow: BundleConfig["workflow"],
  catalogDir?: string,
): Promise<ResolvedFiles> {
  const catDir = catalogDir ?? getCatalogDir();

  const [agents, skills, commands, hooksResult, rules, mcp, workflows] =
    await Promise.all([
      collectFiles("agents", includes.agents, catDir),
      collectFiles("skills", includes.skills, catDir),
      collectFiles("commands", includes.commands, catDir),
      collectHooks(includes.hooks, catDir),
      collectFiles("rules", defaults.rules, catDir),
      collectMcp(defaults.mcp, catDir),
      typeof workflow === "string" && workflow !== "none"
        ? collectFiles("workflows", [workflow], catDir)
        : Promise.resolve([]),
    ]);

  return {
    agents,
    skills,
    commands,
    hooks: hooksResult,
    rules,
    mcp,
    workflows,
  };
}

/**
 * Collect files for a given catalog type and list of names.
 */
async function collectFiles(
  type: CatalogType,
  names: string[],
  catalogDir: string,
): Promise<FileMapping[]> {
  const files: FileMapping[] = [];

  for (const name of names) {
    const pluginPath = join(catalogDir, type, name);
    if (!existsSync(pluginPath)) {
      throw new Error(`Plugin not found: ${type}/${name} (at ${pluginPath})`);
    }

    switch (type) {
      case "skills": {
        const skillFile = join(pluginPath, "SKILL.md");
        if (existsSync(skillFile)) {
          files.push({
            source: skillFile,
            destination: join(".claude", "skills", name, "SKILL.md"),
          });
        }
        break;
      }

      case "agents": {
        const agentFiles = await walkDir(pluginPath, [".claude-plugin"]);
        for (const f of agentFiles) {
          files.push({
            source: f,
            destination: join(".claude", "agents", relative(pluginPath, f)),
          });
        }
        break;
      }

      case "commands": {
        const cmdFiles = await walkDir(pluginPath, [".claude-plugin"]);
        for (const f of cmdFiles) {
          files.push({
            source: f,
            destination: join(
              ".claude",
              "commands",
              "crew",
              relative(pluginPath, f),
            ),
          });
        }
        break;
      }

      case "rules": {
        const rulesFile = join(pluginPath, "rules.md");
        if (existsSync(rulesFile)) {
          files.push({
            source: rulesFile,
            destination: join(".ai-crew", "rules", `${name}.md`),
          });
        }
        break;
      }

      case "workflows": {
        const entries = await readdir(pluginPath);
        for (const entry of entries) {
          if (entry === ".claude-plugin") continue;
          const entryPath = join(pluginPath, entry);
          const entryStat = await stat(entryPath);
          if (entryStat.isDirectory()) {
            const wfFiles = await walkDir(entryPath);
            for (const f of wfFiles) {
              files.push({
                source: f,
                destination: join(
                  ".ai-crew",
                  "workflow",
                  relative(pluginPath, f),
                ),
              });
            }
          } else {
            files.push({
              source: entryPath,
              destination: join(
                ".ai-crew",
                "workflow",
                relative(pluginPath, entryPath),
              ),
            });
          }
        }
        break;
      }
    }
  }

  return files;
}

/**
 * Collect hooks — separate handler scripts from hooks.json configs.
 */
async function collectHooks(
  names: string[],
  catalogDir: string,
): Promise<HooksResolution> {
  const files: FileMapping[] = [];
  const configs: Record<string, unknown>[] = [];

  for (const name of names) {
    const pluginPath = join(catalogDir, "hooks", name);
    if (!existsSync(pluginPath)) {
      throw new Error(`Hook not found: hooks/${name} (at ${pluginPath})`);
    }

    const hooksJson = join(pluginPath, "hooks.json");
    if (existsSync(hooksJson)) {
      const raw = await readFile(hooksJson, "utf-8");
      configs.push(JSON.parse(raw));
    }

    // Handler scripts (everything except hooks.json and .claude-plugin/)
    const handlerFiles = await walkDir(pluginPath, [".claude-plugin"]);
    for (const f of handlerFiles) {
      if (f.endsWith("hooks.json")) continue;
      files.push({
        source: f,
        destination: join(".ai-crew", "hooks", name, relative(pluginPath, f)),
      });
    }
  }

  return { files, configs };
}

/**
 * Collect MCP configs.
 */
async function collectMcp(
  names: string[],
  catalogDir: string,
): Promise<McpResolution> {
  const configs: Record<string, unknown>[] = [];

  for (const name of names) {
    const pluginPath = join(catalogDir, "mcp", name);
    if (!existsSync(pluginPath)) {
      throw new Error(`MCP plugin not found: mcp/${name} (at ${pluginPath})`);
    }

    const mcpJson = join(pluginPath, ".mcp.json");
    if (existsSync(mcpJson)) {
      const raw = await readFile(mcpJson, "utf-8");
      configs.push(JSON.parse(raw));
    }
  }

  return { configs };
}

async function walkDir(dir: string, excludeDirs: string[] = []): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath, excludeDirs)));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Parse YAML frontmatter from an agent .md file to extract the model field.
 *
 * Agent .md files may contain YAML frontmatter between `---` delimiters:
 * ```
 * ---
 * model: claude-opus-4
 * ---
 * # Agent prompt content...
 * ```
 *
 * Model priority (resolved by the caller, not this function):
 *   graph.yaml config.model > agent frontmatter > bundle defaults
 */
export async function parseAgentFrontmatter(
  agentMdPath: string,
): Promise<{ model?: string }> {
  let content: string;
  try {
    content = await readFile(agentMdPath, "utf-8");
  } catch {
    return {};
  }

  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return {};
  }

  // Find closing delimiter
  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    return {};
  }

  const frontmatterBlock = trimmed.slice(3, endIndex).trim();
  const result: { model?: string } = {};

  // Parse simple key: value YAML lines (no external YAML parser dependency)
  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key === "model" && value.length > 0) {
      // Strip surrounding quotes if present
      result.model = value.replace(/^["']|["']$/g, "");
      break;
    }
  }

  return result;
}

// ============================================================
// Catalog Manifest Generation
// ============================================================

/**
 * Scan the catalog directory and produce a manifest of all available
 * agents, skills, and bundles. Used by `installMinimal()` to write
 * `.ai-crew/catalog-manifest.json` so that preflight can dynamically
 * provision agents/skills without TypeScript access.
 */
export async function generateCatalogManifest(
  catalogDir?: string,
): Promise<CatalogManifest> {
  const catDir = catalogDir ?? getCatalogDir();

  // Scan agents
  const agentsDir = join(catDir, "agents");
  const agents: CatalogManifestAgent[] = [];
  if (existsSync(agentsDir)) {
    for (const name of await readdir(agentsDir)) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const agentPath = join(agentsDir, name);
      const s = await stat(agentPath);
      if (s.isDirectory()) {
        agents.push({ name, sourcePath: agentPath });
      }
    }
  }

  // Scan skills
  const skillsDir = join(catDir, "skills");
  const skills: CatalogManifestSkill[] = [];
  if (existsSync(skillsDir)) {
    for (const name of await readdir(skillsDir)) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const skillPath = join(skillsDir, name);
      const s = await stat(skillPath);
      if (s.isDirectory()) {
        skills.push({ name, sourcePath: skillPath });
      }
    }
  }

  // Scan bundles (lightweight)
  const bundlesDir = join(catDir, "bundles");
  const bundles: { name: string; description: string }[] = [];
  if (existsSync(bundlesDir)) {
    for (const name of await readdir(bundlesDir)) {
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const bundlePath = join(bundlesDir, name, "bundle.yaml");
      if (existsSync(bundlePath)) {
        try {
          const raw = await readFile(bundlePath, "utf-8");
          const parsed = parse(raw) as Record<string, unknown>;
          const plugin = parsed.plugin as Record<string, unknown> | undefined;
          bundles.push({
            name,
            description: (plugin?.description as string) ?? name,
          });
        } catch {
          bundles.push({ name, description: name });
        }
      }
    }
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    catalogDir: catDir,
    agents,
    skills,
    bundles,
  };
}

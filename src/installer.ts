import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { existsSync } from "node:fs";
import { stringify } from "yaml";
import { loadBundle, resolveIncludes, getCatalogDir, generateCatalogManifest } from "./resolver.js";
import { validateGraph } from "./graph.js";
import { fetchWorkflow } from "./workflow-fetcher.js";
import { recordInstall } from "./install-state.js";
import type {
  BundleConfig,
  FileMapping,
  InstallOptions,
  InstallResult,
  ResolvedFiles,
  GraphState,
} from "./types.js";

/**
 * Install a bundle into a target project.
 *
 * Flow:
 * 1. Load bundle.yaml
 * 2. Validate graph
 * 3. Resolve catalog includes -> file mappings
 * 4. Fetch external workflow (if any)
 * 5. Copy files to target
 * 6. Write graph.yaml, config.yaml, state.json
 * 7. Merge settings.json
 */
export async function install(
  bundleName: string,
  targetPath: string,
  options?: InstallOptions,
): Promise<InstallResult> {
  const force = options?.force ?? false;
  const crewDir = join(targetPath, ".ai-crew");
  const claudeDir = join(targetPath, ".claude");
  const catalogDir = getCatalogDir();
  const installedFiles: string[] = [];

  // Check if already initialized
  if (!force && existsSync(crewDir)) {
    throw new Error(
      ".ai-crew/ already exists. Use --force to overwrite.",
    );
  }

  // 1. Load bundle
  const bundle = await loadBundle(bundleName);

  // 2. Validate graph
  if (bundle.graph.nodes.length > 0) {
    validateGraph(bundle.graph.nodes);
  }

  // 3. Resolve includes
  const resolved = await resolveIncludes(
    bundle.includes,
    bundle.defaults,
    bundle.workflow,
    catalogDir,
  );

  // 4. Fetch external workflow
  let workflowPath: string | null = null;
  if (bundle.workflow && typeof bundle.workflow === "object") {
    workflowPath = await fetchWorkflow(bundle.workflow, catalogDir);
  } else if (typeof bundle.workflow === "string" && bundle.workflow !== "none") {
    workflowPath = await fetchWorkflow(bundle.workflow, catalogDir);
  }

  // 5. Create directories
  await createDirectories(crewDir, claudeDir);

  // 6. Copy catalog files
  let filesInstalled = 0;
  const agentCount = await copyFilesTracked(targetPath, resolved.agents, installedFiles);
  filesInstalled += agentCount;
  const skillCount = await copyFilesTracked(targetPath, resolved.skills, installedFiles);
  filesInstalled += skillCount;
  const cmdCount = await copyFilesTracked(targetPath, resolved.commands, installedFiles);
  filesInstalled += cmdCount;
  const hookCount = await copyFilesTracked(targetPath, resolved.hooks.files, installedFiles);
  filesInstalled += hookCount;
  const ruleCount = await copyFilesTracked(targetPath, resolved.rules, installedFiles);
  filesInstalled += ruleCount;

  // Copy workflow files -- native AI-DLC or embedded
  const isNativeAidlc = bundle.aidlc?.install === "native";
  if (isNativeAidlc && workflowPath) {
    // AI-DLC native: core-workflow.md -> CLAUDE.md + aidlc-rule-details/ -> .aidlc-rule-details/
    filesInstalled += await installAidlcNative(targetPath, workflowPath, catalogDir);
  } else if (resolved.workflows.length > 0) {
    // Local workflow (embedded via resolver)
    const wfCount = await copyFilesTracked(targetPath, resolved.workflows, installedFiles);
    filesInstalled += wfCount;
  } else if (
    workflowPath &&
    typeof bundle.workflow === "object" &&
    resolved.workflows.length === 0
  ) {
    // External workflow (fetched from github/npm, embedded)
    filesInstalled += await copyWorkflowDir(
      workflowPath,
      join(crewDir, "workflow"),
    );
  }

  // 7. Write graph.yaml
  if (bundle.graph.nodes.length > 0) {
    const graphPath = join(crewDir, "graph.yaml");
    await writeFile(
      graphPath,
      stringify({ graph: bundle.graph }),
      "utf-8",
    );
    installedFiles.push(graphPath);
  }

  // 8. Write config.yaml
  const workflowSource = getWorkflowSourceString(bundle.workflow);
  const configDefaults = { ...bundle.defaults };
  if (!configDefaults.locale) {
    configDefaults.locale = "en";
  }
  const configPath = join(crewDir, "config.yaml");
  await writeFile(
    configPath,
    stringify({
      version: "3.0",
      bundle: bundleName,
      workflow: workflowSource,
      defaults: configDefaults,
    }),
    "utf-8",
  );
  installedFiles.push(configPath);

  // 8.5. Write catalog-manifest.json (for preflight dynamic provisioning)
  const catalogManifest = await generateCatalogManifest(catalogDir);
  const manifestPath = join(crewDir, "catalog-manifest.json");
  await writeFile(manifestPath, JSON.stringify(catalogManifest, null, 2), "utf-8");
  installedFiles.push(manifestPath);

  // 9. Write empty state.json
  const initialState: GraphState = {
    version: "3.0",
    bundleName,
    nodes: {},
  };
  if (bundle.graph.nodes.length > 0) {
    for (const node of bundle.graph.nodes) {
      initialState.nodes[node.id] = {
        status: "pending",
        startedAt: null,
        completedAt: null,
      };
    }
  }
  const statePath = join(crewDir, "state.json");
  await writeFile(
    statePath,
    JSON.stringify(initialState, null, 2),
    "utf-8",
  );
  installedFiles.push(statePath);

  // 10. Merge settings.json
  await mergeSettings(claudeDir, resolved, catalogDir);
  installedFiles.push(join(claudeDir, "settings.json"));

  // Build result
  const result: InstallResult = {
    bundleName,
    targetPath,
    filesInstalled,
    graphNodes: bundle.graph.nodes.length,
    workflowSource,
    mode: "full",
  };

  // Record install state for doctor/uninstall
  await recordInstall(targetPath, result, installedFiles);

  return result;
}

/**
 * Minimal install: commands, rules, hooks, workflow, MCP only.
 * No agents or skills — those are provisioned dynamically by preflight.
 * Writes catalog-manifest.json so preflight knows what's available.
 */
export async function installMinimal(
  targetPath: string,
  options?: InstallOptions,
): Promise<InstallResult> {
  const force = options?.force ?? false;
  const crewDir = join(targetPath, ".ai-crew");
  const claudeDir = join(targetPath, ".claude");
  const catalogDir = getCatalogDir();

  if (!force && existsSync(crewDir)) {
    throw new Error(".ai-crew/ already exists. Use --force to overwrite.");
  }

  const installedFiles: string[] = [];

  // 1. Create directories (no agents/skills dirs)
  await mkdir(crewDir, { recursive: true });
  await mkdir(join(crewDir, "rules"), { recursive: true });
  await mkdir(claudeDir, { recursive: true });
  await mkdir(join(claudeDir, "commands", "crew"), { recursive: true });

  // 2. Resolve commands, rules, hooks, MCP (no agents/skills)
  const resolved = await resolveIncludes(
    {
      agents: [],
      skills: [],
      commands: [
        "crew-elaborate", "crew-preflight", "crew-run",
        "crew-status", "crew-integrate", "crew-checkpoint",
        "crew-restore", "crew-refine", "crew-auto",
      ],
      hooks: [],
    },
    {
      model: "claude-sonnet-4",
      isolation: "worktree",
      rules: ["global", "git-conventions"],
      mcp: ["multi-provider"],
      locale: "ko",
    },
    "aidlc",
    catalogDir,
  );

  // 3. Copy commands and rules only
  let filesInstalled = 0;
  filesInstalled += await copyFilesTracked(targetPath, resolved.commands, installedFiles);
  filesInstalled += await copyFilesTracked(targetPath, resolved.rules, installedFiles);

  // 4. Install AI-DLC workflow (native mode)
  const workflowPath = await fetchWorkflow("aidlc", catalogDir);
  if (workflowPath) {
    filesInstalled += await installAidlcNative(targetPath, workflowPath, catalogDir);
  }

  // 5. Write catalog-manifest.json
  const catalogManifest = await generateCatalogManifest(catalogDir);
  const manifestPath = join(crewDir, "catalog-manifest.json");
  await writeFile(manifestPath, JSON.stringify(catalogManifest, null, 2), "utf-8");
  installedFiles.push(manifestPath);

  // 6. Write config.yaml (bundle: "none")
  const configPath = join(crewDir, "config.yaml");
  await writeFile(
    configPath,
    stringify({
      version: "3.0",
      bundle: "none",
      workflow: "aidlc",
      defaults: {
        model: "claude-sonnet-4",
        isolation: "worktree",
        rules: ["global", "git-conventions"],
        mcp: ["multi-provider"],
        locale: "ko",
      },
    }),
    "utf-8",
  );
  installedFiles.push(configPath);

  // 7. Write empty state.json (no nodes — preflight generates graph)
  const statePath = join(crewDir, "state.json");
  await writeFile(
    statePath,
    JSON.stringify({ version: "3.0", bundleName: "none", nodes: {} }, null, 2),
    "utf-8",
  );
  installedFiles.push(statePath);

  // 8. Merge settings.json
  await mergeSettings(claudeDir, resolved, catalogDir);
  installedFiles.push(join(claudeDir, "settings.json"));

  const result: InstallResult = {
    bundleName: "none",
    targetPath,
    filesInstalled,
    graphNodes: 0,
    workflowSource: "aidlc",
    mode: "minimal",
  };

  await recordInstall(targetPath, result, installedFiles);
  return result;
}

async function createDirectories(
  crewDir: string,
  claudeDir: string,
): Promise<void> {
  const dirs = [
    crewDir,
    join(crewDir, "rules"),
    claudeDir,
    join(claudeDir, "agents"),
    join(claudeDir, "skills"),
    join(claudeDir, "commands", "crew"),
  ];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}

async function copyFilesTracked(
  targetPath: string,
  files: FileMapping[],
  tracker: string[],
): Promise<number> {
  for (const file of files) {
    const destPath = join(targetPath, file.destination);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(file.source, destPath);
    tracker.push(destPath);
  }
  return files.length;
}

async function copyWorkflowDir(
  srcDir: string,
  destDir: string,
): Promise<number> {
  const { readdir, stat, copyFile: cpFile } = await import("node:fs/promises");
  let count = 0;

  async function walk(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        await walk(srcPath, destPath);
      } else {
        await cpFile(srcPath, destPath);
        count++;
      }
    }
  }

  await walk(srcDir, destDir);
  return count;
}

/**
 * Install AI-DLC in native mode:
 * 1. core-workflow.md -> CLAUDE.md (project root)
 * 2. aidlc-rule-details/ -> .aidlc-rule-details/ (project root)
 */
async function installAidlcNative(
  targetPath: string,
  workflowPath: string,
  catalogDir: string,
): Promise<number> {
  let count = 0;

  // 1. core-workflow.md -> CLAUDE.md
  const coreWorkflow = join(catalogDir, "workflows", "aidlc", "core-workflow.md");
  const claudeMd = join(targetPath, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    await copyFile(claudeMd, join(targetPath, "CLAUDE.md.bak"));
  }
  await copyFile(coreWorkflow, claudeMd);
  count++;

  // 2. aidlc-rule-details/ -> .aidlc-rule-details/
  const ruleDetailsDir = join(workflowPath, "aidlc-rule-details");
  const src = existsSync(ruleDetailsDir) ? ruleDetailsDir : workflowPath;
  count += await copyWorkflowDir(src, join(targetPath, ".aidlc-rule-details"));

  return count;
}

async function mergeSettings(
  claudeDir: string,
  resolved: ResolvedFiles,
  catalogDir: string,
): Promise<void> {
  const settingsPath = join(claudeDir, "settings.json");
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(await readFile(settingsPath, "utf-8"));
    } catch {
      // malformed, start fresh
    }
  }

  // Merge permissions
  const permissions = (settings.permissions as Record<string, unknown>) ?? {};
  const allow = (permissions.allow as string[]) ?? [];
  for (const perm of ["Read", "Write", "Edit", "Bash", "Agent"]) {
    if (!allow.includes(perm)) allow.push(perm);
  }
  permissions.allow = allow;
  settings.permissions = permissions;

  // Merge hooks
  if (resolved.hooks.configs.length > 0) {
    const existingHooks =
      (settings.hooks as Record<string, unknown[]>) ?? {};
    for (const config of resolved.hooks.configs) {
      const hooks = (config as { hooks?: Record<string, unknown[]> }).hooks;
      if (!hooks) continue;
      for (const [event, handlers] of Object.entries(hooks)) {
        if (!existingHooks[event]) {
          existingHooks[event] = [];
        }
        if (Array.isArray(handlers)) {
          (existingHooks[event] as unknown[]).push(...handlers);
        }
      }
    }
    settings.hooks = existingHooks;
  }

  // Merge MCP servers
  if (resolved.mcp.configs.length > 0) {
    const mcpServers =
      (settings.mcpServers as Record<string, unknown>) ?? {};
    const packageRoot = new URL("..", import.meta.url).pathname.replace(
      /\/$/,
      "",
    );

    for (const config of resolved.mcp.configs) {
      for (const [name, serverConfig] of Object.entries(config)) {
        const configStr = JSON.stringify(serverConfig);
        const resolved = JSON.parse(
          configStr.replace(/__AI_CREW_ROOT__/g, packageRoot),
        );
        mcpServers[name] = resolved;
      }
    }
    settings.mcpServers = mcpServers;
  }

  await mkdir(claudeDir, { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

function getWorkflowSourceString(
  workflow: BundleConfig["workflow"],
): string | null {
  if (workflow === null) return null;
  if (typeof workflow === "string") return workflow;
  return workflow.source;
}

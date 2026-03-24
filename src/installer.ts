import { mkdir, cp, writeFile, readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { recordInstall } from "./install-state.js";
import {
  resolveHookProfile,
  filterHooksConfigByProfile,
} from "./hook-profiler.js";
import type { HooksConfig } from "./hook-profiler.js";
import type {
  AICrewConfig,
  InstallOptions,
  InstallResult,
} from "./types.js";

/** Default configuration for AI-Crew projects. */
const DEFAULT_CONFIG: AICrewConfig = {
  version: "2.0",
  execution: {
    maxParallelUnits: 3,
    defaultModel: "claude-sonnet-4",
    teammateMode: "tmux",
  },
  hats: {
    requirePlanApproval: false,
    autoTransition: true,
    pipeline: [
      {
        id: "planner",
        name: "Planner",
        description: "Task analysis, approach decision, plan documentation",
        rules: ".ai-crew/rules/hat-planner.md",
        artifacts: [".ai-crew/scratchpad/{agent}.md"],
        transitions: ["plan documented in scratchpad"],
        qualityGates: [],
      },
      {
        id: "builder",
        name: "Builder",
        description: "Code implementation, test writing",
        rules: ".ai-crew/rules/hat-builder.md",
        artifacts: ["src/**", "tests/**"],
        transitions: ["all tasks attempted", "tests written"],
        qualityGates: [
          { command: "npm test -- --related", failAction: "block" },
        ],
      },
      {
        id: "reviewer",
        name: "Reviewer",
        description: "Test/lint execution, code quality verification",
        rules: ".ai-crew/rules/hat-reviewer.md",
        artifacts: [],
        transitions: ["all tests pass", "lint passes", "criteria verified"],
        qualityGates: [
          { command: "npm run lint", failAction: "warn" },
          {
            command: "npm run test:coverage",
            failAction: "block",
            minCoverage: 80,
          },
        ],
      },
    ],
    presets: {
      core: ["planner", "builder", "reviewer"],
      tdd: ["planner", "tester", "builder", "reviewer"],
      secure: ["planner", "builder", "reviewer", "security-reviewer"],
    },
  },
  checkpoints: {
    auto: true,
    triggers: ["unit:completed", "hat:changed"],
  },
  language: "ko",
};

export interface LegacyInstallOptions {
  lang?: "ko" | "en";
  force?: boolean;
  hookProfile?: string;
}

function getTemplatesDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // In dist/cli.js -> templates/ is at ../templates/
  // In src/installer.ts -> templates/ is at ../templates/
  return join(dirname(thisFile), "..", "templates");
}

/**
 * Install a bundle into a target project.
 *
 * Signature follows the new architecture:
 *   install(bundleName, targetPath, options?)
 *
 * Currently the bundleName is recorded but the installer uses
 * the template-based approach (will be replaced by catalog
 * resolver when loadBundle / resolveIncludes are available).
 */
export async function install(
  bundleName: string,
  targetPath: string,
  options?: InstallOptions & LegacyInstallOptions,
): Promise<InstallResult> {
  const lang = options?.lang ?? "ko";
  const force = options?.force ?? false;
  const crewDir = join(targetPath, ".ai-crew");
  const claudeDir = join(targetPath, ".claude");
  const templatesDir = getTemplatesDir();
  const installedFiles: string[] = [];

  // Check if already initialized
  if (!force && existsSync(crewDir)) {
    throw new Error(
      ".ai-crew/ already exists. Use --force to overwrite.",
    );
  }

  // 1. Create .ai-crew directory structure
  const dirs = [
    crewDir,
    join(crewDir, "specs"),
    join(crewDir, "checkpoints"),
    join(crewDir, "scratchpad"),
    join(crewDir, "prompts"),
    join(crewDir, "templates"),
    join(crewDir, "rules"),
    join(crewDir, "aidlc-rule-details"),
    join(crewDir, "sessions"),
  ];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  // 2. Write config.yaml
  const configPath = join(crewDir, "config.yaml");
  const config: AICrewConfig = { ...DEFAULT_CONFIG, language: lang };
  await writeFile(configPath, stringify(config), "utf-8");
  installedFiles.push(configPath);

  // 3. Write empty state.json
  const statePath = join(crewDir, "state.json");
  await writeFile(
    statePath,
    JSON.stringify(
      { version: "2.0", intent: null, units: [], team: null, events: [] },
      null,
      2,
    ),
    "utf-8",
  );
  installedFiles.push(statePath);

  // 4. Copy prompts
  const promptFiles = await copyDirTracked(
    join(templatesDir, "prompts"),
    join(crewDir, "prompts"),
  );
  installedFiles.push(...promptFiles);

  // 5. Copy doc-templates -> .ai-crew/templates
  const templateFiles = await copyDirTracked(
    join(templatesDir, "doc-templates"),
    join(crewDir, "templates"),
  );
  installedFiles.push(...templateFiles);

  // 6. Copy rules (global.md + hat-*.md)
  const ruleFiles = await copyDirTracked(
    join(templatesDir, "rules"),
    join(crewDir, "rules"),
  );
  installedFiles.push(...ruleFiles);

  // 7. Copy aidlc-rule-details
  const aidlcSrc = join(templatesDir, "aidlc-rule-details");
  if (existsSync(aidlcSrc)) {
    await cp(aidlcSrc, join(crewDir, "aidlc-rule-details"), {
      recursive: true,
      force: true,
    });
    const aidlcFiles = await collectFilesInDir(
      join(crewDir, "aidlc-rule-details"),
    );
    installedFiles.push(...aidlcFiles);
  }

  // 8. Create .claude/commands/crew/
  const commandsDir = join(claudeDir, "commands", "crew");
  await mkdir(commandsDir, { recursive: true });
  const commandFiles = await copyDirTracked(
    join(templatesDir, "commands"),
    commandsDir,
  );
  installedFiles.push(...commandFiles);

  // 9. Create/update .claude/settings.json
  await writeSettingsJson(claudeDir);
  installedFiles.push(join(claudeDir, "settings.json"));

  // 10. Merge hooks configs with profile filtering
  const hooksFiles = await mergeHooksConfigs(
    targetPath,
    options?.hookProfile,
  );
  installedFiles.push(...hooksFiles);

  // 11. Append AI-Crew section to CLAUDE.md
  await appendClaudeMd(targetPath);
  installedFiles.push(join(targetPath, "CLAUDE.md"));

  // 12. Create .gitkeep in empty dirs
  for (const dir of ["specs", "checkpoints", "scratchpad", "sessions"]) {
    const gitkeep = join(crewDir, dir, ".gitkeep");
    if (!existsSync(gitkeep)) {
      await writeFile(gitkeep, "", "utf-8");
    }
    installedFiles.push(gitkeep);
  }

  // 13. Build result and record install state for doctor/uninstall
  const result: InstallResult = {
    bundleName,
    targetPath,
    filesInstalled: installedFiles.length,
    graphNodes: 0,
    workflowSource: null,
  };
  await recordInstall(targetPath, result, installedFiles);

  return result;
}

/**
 * Collect hooks.json files from catalog/hooks/*, merge them into a single
 * hooks config, filter by the active hook profile, and write the result
 * to .claude/hooks.json for Claude to discover.
 *
 * Returns paths of files written (empty if no hooks found).
 */
async function mergeHooksConfigs(
  projectRoot: string,
  explicitProfile?: string,
): Promise<string[]> {
  const hooksDir = join(projectRoot, "catalog", "hooks");
  if (!existsSync(hooksDir)) return [];

  const profile = resolveHookProfile(explicitProfile);

  // Collect all hooks.json from catalog/hooks/*/hooks.json
  const merged: HooksConfig = { hooks: {} };
  const entries = await readdir(hooksDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const hooksJsonPath = join(hooksDir, entry.name, "hooks.json");
    if (!existsSync(hooksJsonPath)) continue;

    try {
      const raw = await readFile(hooksJsonPath, "utf-8");
      const hookConfig = JSON.parse(raw) as HooksConfig;

      // Merge each event's matchers into the combined config
      for (const [event, matchers] of Object.entries(hookConfig.hooks)) {
        if (!merged.hooks[event]) {
          merged.hooks[event] = [];
        }
        merged.hooks[event].push(...matchers);
      }
    } catch {
      // Skip malformed hooks.json files
    }
  }

  // Filter by profile (no-op if profile is undefined)
  const filtered = filterHooksConfigByProfile(merged, profile);

  // Only write if there are hooks to install
  if (Object.keys(filtered.hooks).length === 0) return [];

  const claudeDir = join(projectRoot, ".claude");
  await mkdir(claudeDir, { recursive: true });
  const hooksOutPath = join(claudeDir, "hooks.json");
  await writeFile(hooksOutPath, JSON.stringify(filtered, null, 2), "utf-8");

  return [hooksOutPath];
}

/**
 * Copies a directory and returns absolute paths of all destination files.
 */
async function copyDirTracked(
  src: string,
  dest: string,
): Promise<string[]> {
  if (!existsSync(src)) return [];
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
  return collectFilesInDir(dest);
}

/**
 * Recursively collects all file paths under a directory.
 */
async function collectFilesInDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFilesInDir(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function writeSettingsJson(claudeDir: string): Promise<void> {
  const settingsPath = join(claudeDir, "settings.json");
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(await readFile(settingsPath, "utf-8"));
    } catch {
      // malformed, start fresh
    }
  }

  // Merge env
  const env = (settings.env as Record<string, string>) ?? {};
  env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = "1";
  settings.env = env;

  // Merge permissions
  const permissions = (settings.permissions as Record<string, unknown>) ?? {};
  const allow = (permissions.allow as string[]) ?? [];
  for (const perm of ["Read", "Write", "Edit", "Bash", "Agent"]) {
    if (!allow.includes(perm)) allow.push(perm);
  }
  permissions.allow = allow;
  settings.permissions = permissions;

  // Merge MCP servers
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  mcpServers["ai-crew"] = {
    command: "npx",
    args: ["ai-crew", "mcp"],
  };
  settings.mcpServers = mcpServers;

  await mkdir(claudeDir, { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

async function appendClaudeMd(projectRoot: string): Promise<void> {
  const claudeMdPath = join(projectRoot, "CLAUDE.md");
  const marker = "<!-- ai-crew:start -->";

  let existing = "";
  if (existsSync(claudeMdPath)) {
    existing = await readFile(claudeMdPath, "utf-8");
    if (existing.includes(marker)) return; // already has AI-Crew section
  }

  const section = `
${marker}
## AI-Crew

This project uses AI-Crew (AI-DLC on Claude Code Agent Teams).

### Commands
- \`/crew:elaborate\` — Define intent & decompose units (Inception)
- \`/crew:run\` — Create & run agent team (Construction)
- \`/crew:integrate\` — Merge results & verify (Integration)
- \`/crew:status\` — Show current state
- \`/crew:checkpoint\` — Save state snapshot
- \`/crew:restore\` — Restore previous state

### Directories
- \`.ai-crew/\` — State, config, specs, prompts
- \`.ai-crew/specs/\` — Requirements/design/task docs per intent
- \`.ai-crew/aidlc-rule-details/\` — AI-DLC methodology rules

### Reference
- State file: \`.ai-crew/state.json\`
- Config file: \`.ai-crew/config.yaml\`
<!-- ai-crew:end -->
`;

  await writeFile(claudeMdPath, existing + section, "utf-8");
}

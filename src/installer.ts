import { mkdir, cp, writeFile, readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { DEFAULT_CONFIG } from "./config.js";
import type { AICrewConfig } from "./types.js";

export interface InstallOptions {
  lang?: "ko" | "en";
  force?: boolean;
}

function getTemplatesDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // In dist/cli.js → templates/ is at ../templates/
  // In src/installer.ts → templates/ is at ../templates/
  return join(dirname(thisFile), "..", "templates");
}

export async function install(
  projectRoot: string,
  options: InstallOptions = {},
): Promise<void> {
  const lang = options.lang ?? "ko";
  const force = options.force ?? false;
  const crewDir = join(projectRoot, ".ai-crew");
  const claudeDir = join(projectRoot, ".claude");
  const templatesDir = getTemplatesDir();

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
  const config: AICrewConfig = { ...DEFAULT_CONFIG, language: lang };
  await writeFile(
    join(crewDir, "config.yaml"),
    stringify(config),
    "utf-8",
  );

  // 3. Write empty state.json
  await writeFile(
    join(crewDir, "state.json"),
    JSON.stringify(
      { version: "2.0", intent: null, units: [], team: null, events: [] },
      null,
      2,
    ),
    "utf-8",
  );

  // 4. Copy prompts
  await copyDir(join(templatesDir, "prompts"), join(crewDir, "prompts"));

  // 5. Copy doc-templates → .ai-crew/templates
  await copyDir(
    join(templatesDir, "doc-templates"),
    join(crewDir, "templates"),
  );

  // 6. Copy rules (global.md + hat-*.md)
  await copyDir(join(templatesDir, "rules"), join(crewDir, "rules"));

  // 7. Copy aidlc-rule-details
  const aidlcSrc = join(templatesDir, "aidlc-rule-details");
  if (existsSync(aidlcSrc)) {
    await cp(aidlcSrc, join(crewDir, "aidlc-rule-details"), {
      recursive: true,
      force: true,
    });
  }

  // 8. Create .claude/commands/crew/
  const commandsDir = join(claudeDir, "commands", "crew");
  await mkdir(commandsDir, { recursive: true });
  await copyDir(join(templatesDir, "commands"), commandsDir);

  // 9. Create/update .claude/settings.json
  await writeSettingsJson(claudeDir, crewDir);

  // 10. Append AI-Crew section to CLAUDE.md
  await appendClaudeMd(projectRoot);

  // 11. Create .gitkeep in empty dirs
  for (const dir of ["specs", "checkpoints", "scratchpad", "sessions"]) {
    const gitkeep = join(crewDir, dir, ".gitkeep");
    if (!existsSync(gitkeep)) {
      await writeFile(gitkeep, "", "utf-8");
    }
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  if (!existsSync(src)) return;
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
}

async function writeSettingsJson(
  claudeDir: string,
  crewDir: string,
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

이 프로젝트는 AI-Crew (AI-DLC on Claude Code Agent Teams)를 사용합니다.

### 명령어
- \`/crew:elaborate\` — Intent 정의 & Unit 분해 (Inception)
- \`/crew:execute\` — Agent Team 생성 & 실행 (Construction)
- \`/crew:integrate\` — 결과 통합 & 검증 (Integration)
- \`/crew:status\` — 현재 상태 조회
- \`/crew:checkpoint\` — 상태 스냅샷 저장
- \`/crew:restore\` — 이전 상태 복구

### 디렉토리
- \`.ai-crew/\` — 상태, 설정, 스펙, 프롬프트
- \`.ai-crew/specs/\` — Intent별 요구사항/설계/태스크 문서
- \`.ai-crew/aidlc-rule-details/\` — AI-DLC 방법론 규칙

### 참고
- 상태 파일: \`.ai-crew/state.json\`
- 설정 파일: \`.ai-crew/config.yaml\`
<!-- ai-crew:end -->
`;

  await writeFile(claudeMdPath, existing + section, "utf-8");
}

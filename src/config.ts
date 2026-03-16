import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import type { AICrewConfig } from "./types.js";

export const DEFAULT_CONFIG: AICrewConfig = {
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
        description: "Task 분석, 접근 방식 결정, 계획 문서화",
        rules: ".ai-crew/rules/hat-planner.md",
        artifacts: [".ai-crew/scratchpad/{agent}.md"],
        transitions: ["plan documented in scratchpad"],
        qualityGates: [],
      },
      {
        id: "builder",
        name: "Builder",
        description: "코드 구현, 테스트 작성",
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
        description: "테스트/lint 실행, 코드 품질 검증",
        rules: ".ai-crew/rules/hat-reviewer.md",
        artifacts: [],
        transitions: ["all tests pass", "lint passes", "criteria verified"],
        qualityGates: [
          { command: "npm run lint", failAction: "warn" },
          { command: "npm run test:coverage", failAction: "block", minCoverage: 80 },
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

function configPath(projectRoot: string): string {
  return join(projectRoot, ".ai-crew", "config.yaml");
}

export async function loadConfig(
  projectRoot: string,
): Promise<AICrewConfig> {
  try {
    const raw = await readFile(configPath(projectRoot), "utf-8");
    return parse(raw) as AICrewConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(
  projectRoot: string,
  config: AICrewConfig,
): Promise<void> {
  const dir = join(projectRoot, ".ai-crew");
  await mkdir(dir, { recursive: true });
  await writeFile(configPath(projectRoot), stringify(config), "utf-8");
}

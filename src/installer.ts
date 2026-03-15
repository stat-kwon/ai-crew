/**
 * AI-Crew Installer
 * 
 * Sets up AI-Crew in a project directory
 */

import { mkdir, writeFile, readFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { DEFAULT_CONFIG, saveConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface InstallOptions {
  projectRoot: string;
  language?: 'en' | 'ko';
  force?: boolean;
}

export async function install(options: InstallOptions): Promise<void> {
  const { projectRoot, language = 'ko', force = false } = options;
  
  console.log(chalk.cyan('\n🚀 AI-Crew Installation\n'));
  
  // Check if already installed
  const aiCrewDir = join(projectRoot, '.ai-crew');
  if (existsSync(aiCrewDir) && !force) {
    console.log(chalk.yellow('⚠️  AI-Crew already installed. Use --force to reinstall.'));
    return;
  }
  
  // Create directory structure
  console.log(chalk.gray('Creating directory structure...'));
  
  const dirs = [
    '.ai-crew',
    '.ai-crew/intents',
    '.ai-crew/checkpoints',
    '.ai-crew/scratchpad',
    '.ai-crew/templates',
    '.ai-crew/rules',
    '.claude/commands/crew',
    '.claude/teams',
    '.claude/tasks',
  ];
  
  for (const dir of dirs) {
    const fullPath = join(projectRoot, dir);
    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
    }
  }
  
  // Write config
  console.log(chalk.gray('Writing configuration...'));
  await saveConfig(projectRoot, DEFAULT_CONFIG);
  
  // Write Claude Code commands
  console.log(chalk.gray('Installing Claude Code commands...'));
  await installCommands(projectRoot, language);
  
  // Write templates
  console.log(chalk.gray('Installing templates...'));
  await installTemplates(projectRoot, language);
  
  // Write rules
  console.log(chalk.gray('Installing rules...'));
  await installRules(projectRoot, language);
  
  // Update CLAUDE.md
  console.log(chalk.gray('Updating CLAUDE.md...'));
  await updateClaudeMd(projectRoot);
  
  // Update .claude/settings.json
  console.log(chalk.gray('Updating Claude settings...'));
  await updateClaudeSettings(projectRoot);
  
  console.log(chalk.green('\n✅ AI-Crew installed successfully!\n'));
  console.log(chalk.white('Available commands:'));
  console.log(chalk.cyan('  /crew:elaborate') + ' - Define intent & decompose units');
  console.log(chalk.cyan('  /crew:execute') + '   - Create team & start execution');
  console.log(chalk.cyan('  /crew:status') + '    - Check progress');
  console.log(chalk.cyan('  /crew:integrate') + ' - Merge results');
  console.log();
}

async function installCommands(projectRoot: string, language: string): Promise<void> {
  const commandsDir = join(projectRoot, '.claude', 'commands', 'crew');
  
  const commands = getCommands(language);
  
  for (const [name, content] of Object.entries(commands)) {
    await writeFile(join(commandsDir, `${name}.md`), content, 'utf-8');
  }
}

function getCommands(language: string): Record<string, string> {
  const isKo = language === 'ko';
  
  return {
    elaborate: isKo ? `# /crew:elaborate

Intent를 정의하고 Units로 분해합니다.

## 사용법
\`\`\`
/crew:elaborate [description]
\`\`\`

## 프로세스

1. **Intent 정의**: 무엇을 만들 것인지 명확히 합니다
2. **요구사항 명확화**: 질문을 통해 세부 사항을 파악합니다
3. **Completion Criteria 설정**: 완료 기준을 정의합니다
4. **Unit 분해**: 병렬 실행 가능한 작업 단위로 분해합니다

## 출력 파일

- \`.ai-crew/intents/{id}/requirements.md\`
- \`.ai-crew/intents/{id}/design.md\`
- \`.ai-crew/intents/{id}/tasks.md\`
- \`.ai-crew/state.json\`

## 다음 단계

Elaboration 완료 후 \`/crew:execute\`로 실행을 시작합니다.
` : `# /crew:elaborate

Define intent and decompose into units.

## Usage
\`\`\`
/crew:elaborate [description]
\`\`\`

## Process

1. **Define Intent**: Clarify what to build
2. **Clarify Requirements**: Ask questions for details
3. **Set Completion Criteria**: Define done criteria
4. **Decompose Units**: Break into parallelizable work units

## Output Files

- \`.ai-crew/intents/{id}/requirements.md\`
- \`.ai-crew/intents/{id}/design.md\`
- \`.ai-crew/intents/{id}/tasks.md\`
- \`.ai-crew/state.json\`

## Next Steps

After elaboration, run \`/crew:execute\` to start execution.
`,
    
    execute: isKo ? `# /crew:execute

Agent Team을 생성하고 병렬 실행을 시작합니다.

## 사용법
\`\`\`
/crew:execute [--agents N]
\`\`\`

## 옵션

- \`--agents N\`: 최대 Agent 수 (기본: config의 maxAgents)

## 프로세스

1. **Team 생성**: 의존성 없는 Units에 Agent 할당
2. **Worktree 생성**: 각 Agent별 Git worktree 생성
3. **Task 분배**: 각 Agent에 tasks 할당
4. **병렬 실행**: 각 Agent가 Planner → Builder → Reviewer 사이클 실행

## Hat 시스템

각 Agent는 다음 순서로 Hat을 전환합니다:

1. 🎩 **Planner**: 접근 방식 설계
2. 🔨 **Builder**: 코드 구현
3. 👀 **Reviewer**: 품질 검증

## 팀원 관리

- \`Shift+Down\`: 팀원 순회
- \`Ctrl+T\`: Task 목록 토글

## 다음 단계

모든 Unit 완료 후 \`/crew:integrate\`로 통합합니다.
` : `# /crew:execute

Create Agent Team and start parallel execution.

## Usage
\`\`\`
/crew:execute [--agents N]
\`\`\`

## Options

- \`--agents N\`: Max number of agents (default: config maxAgents)

## Process

1. **Create Team**: Assign agents to independent units
2. **Create Worktrees**: Git worktree per agent
3. **Distribute Tasks**: Assign tasks to agents
4. **Parallel Execution**: Each agent runs Planner → Builder → Reviewer cycle

## Hat System

Each agent transitions through hats:

1. 🎩 **Planner**: Design approach
2. 🔨 **Builder**: Implement code
3. 👀 **Reviewer**: Validate quality

## Team Management

- \`Shift+Down\`: Cycle through teammates
- \`Ctrl+T\`: Toggle task list

## Next Steps

After all units complete, run \`/crew:integrate\` to merge.
`,

    status: isKo ? `# /crew:status

현재 진행 상황을 조회합니다.

## 사용법
\`\`\`
/crew:status [--verbose]
\`\`\`

## 출력 정보

- **Intent 상태**: elaborating | ready | executing | integrating | complete
- **Unit 별 상태**: pending | in-progress | review | complete | blocked
- **Task 진행률**: 완료/전체
- **Agent 할당**: 각 Unit 담당 Agent
- **현재 Hat**: 각 Agent의 현재 역할
` : `# /crew:status

Check current progress.

## Usage
\`\`\`
/crew:status [--verbose]
\`\`\`

## Output

- **Intent Status**: elaborating | ready | executing | integrating | complete
- **Unit Status**: pending | in-progress | review | complete | blocked
- **Task Progress**: completed/total
- **Agent Assignment**: Agent per unit
- **Current Hat**: Each agent's current role
`,

    integrate: isKo ? `# /crew:integrate

모든 Unit 결과를 main 브랜치에 통합합니다.

## 사용법
\`\`\`
/crew:integrate [--no-cleanup]
\`\`\`

## 옵션

- \`--no-cleanup\`: Worktree 삭제하지 않음

## 프로세스

1. **상태 확인**: 모든 Unit이 complete인지 확인
2. **Branch Merge**: 각 feature branch를 main에 merge
3. **충돌 해결**: 충돌 발생 시 해결 가이드 제공
4. **Cross-Unit 검증**: 통합 테스트 실행
5. **Cleanup**: Worktree 및 branch 정리

## Completion Criteria 검증

모든 Completion Criteria가 충족되었는지 확인합니다.
` : `# /crew:integrate

Merge all unit results into main branch.

## Usage
\`\`\`
/crew:integrate [--no-cleanup]
\`\`\`

## Options

- \`--no-cleanup\`: Keep worktrees

## Process

1. **Check Status**: Verify all units complete
2. **Merge Branches**: Merge feature branches to main
3. **Resolve Conflicts**: Guide through conflicts
4. **Cross-Unit Validation**: Run integration tests
5. **Cleanup**: Remove worktrees and branches

## Completion Criteria Verification

Verifies all completion criteria are satisfied.
`,

    checkpoint: isKo ? `# /crew:checkpoint

현재 상태를 저장합니다.

## 사용법
\`\`\`
/crew:checkpoint [description]
\`\`\`

## 저장 내용

- Intent 상태
- 모든 Unit/Task 상태
- Team 구성
- 현재 Git ref

## 복구

\`/crew:restore {checkpoint-id}\`로 복구할 수 있습니다.
` : `# /crew:checkpoint

Save current state.

## Usage
\`\`\`
/crew:checkpoint [description]
\`\`\`

## Saved Content

- Intent state
- All unit/task states
- Team configuration
- Current git ref

## Recovery

Restore with \`/crew:restore {checkpoint-id}\`.
`,

    restore: isKo ? `# /crew:restore

이전 상태로 복구합니다.

## 사용법
\`\`\`
/crew:restore [checkpoint-id]
\`\`\`

## 옵션

- checkpoint-id 생략 시 최근 checkpoint 목록 표시

## 복구 내용

- Intent 상태 복원
- Unit/Task 상태 복원
- Git worktree 재생성 (필요시)
` : `# /crew:restore

Restore to previous state.

## Usage
\`\`\`
/crew:restore [checkpoint-id]
\`\`\`

## Options

- Without checkpoint-id: Show recent checkpoints

## Restored Content

- Intent state
- Unit/Task states
- Git worktrees (if needed)
`,
  };
}

async function installTemplates(projectRoot: string, language: string): Promise<void> {
  const templatesDir = join(projectRoot, '.ai-crew', 'templates');
  const isKo = language === 'ko';
  
  const templates: Record<string, string> = {
    'requirements.md.hbs': isKo ? `# Requirements: {{intent.description}}

## Intent
{{intent.description}}

## Functional Requirements

{{#each functionalRequirements}}
### FR-{{@index}}: {{this.title}}
{{#each this.items}}
- **{{this.priority}}** {{this.description}}
{{/each}}

{{/each}}

## Non-Functional Requirements

{{#each nonFunctionalRequirements}}
### NFR-{{@index}}: {{this.title}}
{{#each this.items}}
- **{{this.priority}}** {{this.description}}
{{/each}}

{{/each}}

## Completion Criteria

{{#each completionCriteria}}
- [ ] {{this}}
{{/each}}
` : `# Requirements: {{intent.description}}

## Intent
{{intent.description}}

## Functional Requirements

{{#each functionalRequirements}}
### FR-{{@index}}: {{this.title}}
{{#each this.items}}
- **{{this.priority}}** {{this.description}}
{{/each}}

{{/each}}

## Non-Functional Requirements

{{#each nonFunctionalRequirements}}
### NFR-{{@index}}: {{this.title}}
{{#each this.items}}
- **{{this.priority}}** {{this.description}}
{{/each}}

{{/each}}

## Completion Criteria

{{#each completionCriteria}}
- [ ] {{this}}
{{/each}}
`,
    
    'design.md.hbs': `# Design: {{intent.description}}

## Architecture Overview

\`\`\`mermaid
{{architectureDiagram}}
\`\`\`

## Data Model

\`\`\`prisma
{{dataModel}}
\`\`\`

## API Design

{{#each apis}}
### {{this.name}}

| Method | Path | Description |
|--------|------|-------------|
{{#each this.endpoints}}
| {{this.method}} | {{this.path}} | {{this.description}} |
{{/each}}

{{/each}}

## Component Structure

\`\`\`
{{componentTree}}
\`\`\`
`,

    'tasks.md.hbs': `# Tasks: {{intent.description}}

{{#each units}}
## Unit {{@index}}: {{this.name}}

{{this.description}}

{{#each this.tasks}}
### Task {{@../index}}.{{@index}}: {{this.title}}

- [ ] {{this.description}}
- Files: {{#each this.files}}\`{{this}}\`{{#unless @last}}, {{/unless}}{{/each}}

{{/each}}

---

{{/each}}
`,
  };
  
  for (const [name, content] of Object.entries(templates)) {
    await writeFile(join(templatesDir, name), content, 'utf-8');
  }
}

async function installRules(projectRoot: string, language: string): Promise<void> {
  const rulesDir = join(projectRoot, '.ai-crew', 'rules');
  const isKo = language === 'ko';
  
  const rules = isKo ? `# AI-Crew 생성 규칙

## 일반 원칙

1. **명확성**: 모든 요구사항은 측정 가능하고 검증 가능해야 함
2. **독립성**: Unit은 가능한 독립적으로 작업 가능해야 함
3. **점진적**: 작은 단위로 나누어 빠른 피드백 가능하게

## 코드 스타일

1. TypeScript strict mode 사용
2. 모든 함수에 JSDoc 주석
3. 테스트 커버리지 80% 이상

## Git 컨벤션

- Branch: \`feature/{unit-id}\`
- Commit: \`type(scope): description\`

## 리뷰 기준

1. Completion Criteria 충족 여부
2. 테스트 통과 여부
3. 린트 통과 여부
` : `# AI-Crew Generation Rules

## General Principles

1. **Clarity**: All requirements must be measurable and verifiable
2. **Independence**: Units should be independently workable
3. **Incremental**: Break into small units for fast feedback

## Code Style

1. Use TypeScript strict mode
2. JSDoc comments for all functions
3. Test coverage 80%+

## Git Conventions

- Branch: \`feature/{unit-id}\`
- Commit: \`type(scope): description\`

## Review Criteria

1. Completion criteria satisfaction
2. Tests passing
3. Lint passing
`;

  await writeFile(join(rulesDir, 'generation-rules.md'), rules, 'utf-8');
}

async function updateClaudeMd(projectRoot: string): Promise<void> {
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  
  const aiCrewSection = `
## AI-Crew

이 프로젝트는 AI-Crew(AI-DLC + Claude Agent Teams)를 사용합니다.

### 사용 가능한 명령어

- \`/crew:elaborate\` - Intent 정의 & Unit 분해
- \`/crew:execute\` - Agent Team 생성 & 실행
- \`/crew:status\` - 진행 상황 조회
- \`/crew:integrate\` - 결과 통합
- \`/crew:checkpoint\` - 상태 저장
- \`/crew:restore\` - 상태 복구

### 디렉토리 구조

- \`.ai-crew/\` - AI-Crew 상태 및 설정
- \`.ai-crew/intents/\` - Intent별 요구사항/설계/태스크
- \`.ai-crew/checkpoints/\` - 상태 스냅샷

### Hat 시스템

각 Agent는 Planner → Builder → Reviewer 사이클로 작업합니다.
`;

  let content = '';
  
  if (existsSync(claudeMdPath)) {
    content = await readFile(claudeMdPath, 'utf-8');
    
    // Check if AI-Crew section already exists
    if (content.includes('## AI-Crew')) {
      return; // Already has section
    }
    
    content += '\n' + aiCrewSection;
  } else {
    content = `# Project Context\n${aiCrewSection}`;
  }
  
  await writeFile(claudeMdPath, content, 'utf-8');
}

async function updateClaudeSettings(projectRoot: string): Promise<void> {
  const settingsPath = join(projectRoot, '.claude', 'settings.json');
  
  let settings: Record<string, unknown> = {};
  
  if (existsSync(settingsPath)) {
    const content = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  }
  
  // Enable Agent Teams
  settings.env = {
    ...(settings.env as Record<string, string> || {}),
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
  };
  
  // Set teammate mode
  if (!settings.teammateMode) {
    settings.teammateMode = 'tmux';
  }
  
  const settingsDir = dirname(settingsPath);
  if (!existsSync(settingsDir)) {
    await mkdir(settingsDir, { recursive: true });
  }
  
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

# 카탈로그 아키텍처

> 재사용 가능한 컴포넌트 라이브러리의 구조와 설치 파이프라인

---

## 1. 개요

카탈로그(`catalog/`)는 ai-crew의 재사용 가능한 컴포넌트 라이브러리다. 에이전트, 스킬, 명령어, 규칙 등을 표준화된 구조로 패키징하여 번들을 통해 프로젝트에 설치한다.

```
catalog/
├── agents/       # 에이전트 정의 (.md)
├── skills/       # 스킬 정의 (SKILL.md)
├── commands/     # 명령어 정의 (.md)
├── hooks/        # 훅 핸들러 + hooks.json
├── rules/        # 규칙 파일 (rules.md)
├── mcp/          # MCP 서버 설정 (.mcp.json)
├── workflows/    # 워크플로우 (AI-DLC 등)
└── bundles/      # 번들 — 위 컴포넌트의 조합
```

각 컴포넌트는 `.claude-plugin/plugin.json`을 가지며, 이름, 설명, tier, 의존성, 태그를 선언한다.

---

## 2. 카탈로그 타입

| 타입 | 디렉토리 | 목적 | 설치 위치 |
|------|----------|------|-----------|
| agents | `catalog/agents/` | 에이전트 역할 정의 (프롬프트) | `.claude/agents/` |
| skills | `catalog/skills/` | 기술 도메인별 지식과 규칙 | `.claude/skills/{name}/SKILL.md` |
| commands | `catalog/commands/` | `/crew:*` 슬래시 명령어 | `.claude/commands/crew/` |
| hooks | `catalog/hooks/` | 이벤트 기반 자동화 (pre/post 훅) | `.ai-crew/hooks/` + `.claude/settings.json` |
| rules | `catalog/rules/` | 전역 규칙 및 제약사항 | `.ai-crew/rules/` |
| mcp | `catalog/mcp/` | MCP 서버 설정 | `.claude/settings.json` (mcpServers) |
| workflows | `catalog/workflows/` | 워크플로우 정의 (AI-DLC 등) | `CLAUDE.md` + `.aidlc-rule-details/` (native) 또는 `.ai-crew/workflow/` (embedded) |
| bundles | `catalog/bundles/` | 위 컴포넌트를 조합한 실행 프리셋 | `.ai-crew/config.yaml` + `graph.yaml` |

---

## 3. Plugin.json 스키마

모든 카탈로그 컴포넌트는 `.claude-plugin/plugin.json`을 포함한다:

```json
{
  "name": "builder",
  "description": "Builder agent - implements code and writes tests per plan",
  "tier": "crew",
  "requires": [],
  "tags": ["implementation"]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 컴포넌트 고유 이름 |
| `description` | string | 컴포넌트 설명 |
| `version` | string (optional) | 버전 |
| `tier` | string | 분류 계층: `independent`, `aidlc`, `crew` |
| `requires` | string[] | 의존하는 다른 컴포넌트 (예: `["graph", "state"]`) |
| `tags` | string[] | 검색 및 분류용 태그 |

---

## 4. Tier 시스템

컴포넌트는 세 계층으로 분류된다. 상위 tier는 하위 tier를 참조할 수 있지만 역방향은 불가하다.

### independent — 독립 실행 가능

ai-crew 없이도 단독으로 사용할 수 있는 범용 컴포넌트.

| 타입 | 컴포넌트 |
|------|----------|
| skills (9) | api-design, backend-node, clean-code, code-review, database-engineering, frontend-react, security-audit, testing, ultimate-ui |
| rules (3) | coding-standards, git-conventions, global |
| agents (6) | backend-dev, frontend-dev, qa-engineer, reviewer, tester, planner(주: aidlc) |

### aidlc — AI-DLC 워크플로우 의존

AI-DLC Inception/Construction 워크플로우를 전제로 하는 컴포넌트.

| 타입 | 컴포넌트 |
|------|----------|
| skills (2) | design-refinement, planning |
| commands (3) | crew-elaborate, crew-integrate, crew-refine |
| agents (1) | planner |

### crew — 그래프 실행기 의존

그래프 기반 멀티 에이전트 실행 인프라를 필요로 하는 컴포넌트.

| 타입 | 컴포넌트 |
|------|----------|
| commands (6) | crew-auto, crew-checkpoint, crew-preflight, crew-restore, crew-run, crew-status |
| hooks (3) | context-guard, quality-gate, subagent-tracker |
| agents (3) | builder, owner, pm |
| skills (1) | workflow-composer |

---

## 5. 설치 파이프라인

`ai-crew install --team <bundle> --target <path>` 실행 시:

```
bundle.yaml
    |
    v
[1] loadBundle()           bundle.yaml 파싱, 그래프 노드 정규화
    |
[2] validateGraph()        구조 검증 (순환, 중복 ID, 댕글링 참조)
    |
[3] resolveIncludes()      카탈로그에서 파일 매핑 수집
    |                       agents/  -> .claude/agents/
    |                       skills/  -> .claude/skills/{name}/SKILL.md
    |                       commands/ -> .claude/commands/crew/
    |                       hooks/   -> .ai-crew/hooks/ + hooks.json -> settings.json
    |                       rules/   -> .ai-crew/rules/{name}.md
    |                       mcp/     -> .mcp.json -> settings.json (mcpServers)
    |
[4] fetchWorkflow()        외부 워크플로우 페치 (github:, npm:)
    |
[5] copyFilesTracked()     파일 복사 (source -> destination)
    |
[6] graph.yaml 쓰기       .ai-crew/graph.yaml
    |
[7] config.yaml 쓰기      .ai-crew/config.yaml (번들명, defaults, locale)
    |
[8] state.json 쓰기       .ai-crew/state.json (모든 노드 "pending")
    |
[9] settings.json 병합    .claude/settings.json (permissions, hooks, mcpServers)
    |
[10] recordInstall()       .ai-crew/install-state.json (설치 기록)
```

`collectFiles()`는 타입별로 다른 매핑 규칙을 적용한다:

| 카탈로그 타입 | 소스 파일 | 설치 대상 |
|--------------|-----------|-----------|
| skills | `catalog/skills/{name}/SKILL.md` | `.claude/skills/{name}/SKILL.md` |
| agents | `catalog/agents/{name}/**` (`.claude-plugin` 제외) | `.claude/agents/**` |
| commands | `catalog/commands/{name}/**` (`.claude-plugin` 제외) | `.claude/commands/crew/**` |
| rules | `catalog/rules/{name}/rules.md` | `.ai-crew/rules/{name}.md` |
| hooks | 핸들러 스크립트 | `.ai-crew/hooks/{name}/` |
| hooks | `hooks.json` | `.claude/settings.json`에 병합 |
| mcp | `.mcp.json` | `.claude/settings.json` mcpServers에 병합 |
| workflows (native) | `core-workflow.md` | `CLAUDE.md` |
| workflows (native) | `aidlc-rule-details/` | `.aidlc-rule-details/` |
| workflows (embedded) | 전체 디렉토리 | `.ai-crew/workflow/` |

---

## 6. 번들 조합

번들은 카탈로그 컴포넌트의 조합 레이어다. `catalog/bundles/{name}/bundle.yaml`로 정의한다.

```yaml
plugin:
  id: plugin.aidlc-standard
  name: AIDLC Standard
  description: "AI-DLC 표준 팀: plan > build > review 순차 실행"
  version: "2.0.0"

workflow: aidlc                    # 워크플로우 참조

aidlc:
  install: native                  # native | embedded

defaults:
  model: claude-sonnet-4           # 기본 모델
  isolation: worktree              # 기본 격리 방식
  rules: [global]                  # 적용할 규칙
  mcp: [multi-provider]            # MCP 서버

includes:
  skills: [planning, testing, code-review]
  commands: [crew-auto, crew-elaborate, crew-preflight, crew-run,
             crew-integrate, crew-status, crew-checkpoint, crew-restore]
  agents: [owner, planner, builder, reviewer]
  hooks: [quality-gate]

graph:
  nodes:
    - id: plan
      type: worker
      agent: planner
      skills: [planning]
      depends_on: []
      config: { isolation: none }

    - id: build
      type: worker
      agent: builder
      skills: [testing]
      hooks: [quality-gate]
      depends_on: [plan]
      config: { isolation: worktree }

    - id: review
      type: worker
      agent: reviewer
      skills: [code-review]
      depends_on: [build]
      config: { isolation: worktree }
```

사용 가능한 번들:

| 번들 | 설명 |
|------|------|
| aidlc-standard | AI-DLC 표준 팀 (plan > build > review) |
| aidlc-tdd | AI-DLC TDD 팀 |
| fullstack | 풀스택 개발 팀 |
| advanced-fullstack | 확장 풀스택 팀 |
| e2e-premium | E2E 프리미엄 팀 |
| lightweight | 경량 팀 |

---

## 7. Rules Sync

`/crew:preflight` Step 0.6에서 실행된다. 카탈로그의 규칙 파일과 설치된 규칙 파일을 비교하여 동기화한다.

```
카탈로그 rules/         설치된 .ai-crew/rules/
    |                         |
    +--- 스캔 및 비교 --------+
    |
변경 감지 시 → 사용자에게 업데이트 여부 확인
    |
승인 시 → 카탈로그에서 .ai-crew/rules/로 복사
        → config.yaml 갱신
```

이 과정을 통해 카탈로그에서 규칙이 업데이트되었을 때 프로젝트에 반영할 수 있다. 자동 덮어쓰기는 하지 않으며 사용자의 명시적 승인이 필요하다.

---

## 8. 의존성 매트릭스

전체 카탈로그 컴포넌트를 tier별로 요약한다:

| Tier | Agents | Skills | Commands | Hooks | Rules | MCP | Workflows |
|------|--------|--------|----------|-------|-------|-----|-----------|
| independent | backend-dev, frontend-dev, qa-engineer, reviewer, tester (5) | api-design, backend-node, clean-code, code-review, database-engineering, frontend-react, security-audit, testing, ultimate-ui (9) | - | - | coding-standards, git-conventions, global (3) | - | - |
| aidlc | planner (1) | design-refinement, planning (2) | crew-elaborate, crew-integrate, crew-refine (3) | - | - | - | aidlc (1) |
| crew | builder, owner, pm (3) | workflow-composer (1) | crew-auto, crew-checkpoint, crew-preflight, crew-restore, crew-run, crew-status (6) | context-guard, quality-gate, subagent-tracker (3) | - | multi-provider, ouroboros (2) | - |
| **합계** | **9** | **12** | **9** | **3** | **3** | **2** | **1** |

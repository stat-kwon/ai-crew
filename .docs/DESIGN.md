# AI-Crew Design Document

> AI-DLC 방법론을 Claude Code Agent Teams 위에서 구현하는 플러그인

---

## 1. 개요

AI-Crew는 **Claude Code 플러그인**으로, AWS AI-DLC(AI-Driven Development Lifecycle) 방법론의 구조화된 프로세스를 Claude Code의 Agent Teams 기능 위에 올린다.

```
┌─────────────────────────────────────────────────────┐
│                     AI-Crew                          │
├─────────────────────────────────────────────────────┤
│  • State 영속화 (세션 간 상태 유지)                   │
│  • 슬래시 커맨드 (.claude/commands/crew/*.md)         │
│  • AI-DLC 규칙 내장 (.ai-crew/aidlc-rule-details/)   │
│  • Multi-Provider MCP 서버                           │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Claude Code                         │
├─────────────────────────────────────────────────────┤
│  • Agent Teams (teammate spawn, worktree isolation)  │
│  • Git Worktree 관리                                 │
│  • 코드 생성/편집                                    │
│  • 자연어 대화                                       │
└─────────────────────────────────────────────────────┘
```

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **프롬프트 중심** | 런타임 TypeScript는 최소한 (installer + MCP). 핵심 산출물은 `.claude/commands/crew/*.md` |
| **Claude 위임** | Agent 생성/제어는 Claude Code가 담당. AI-Crew는 프롬프트와 상태만 관리 |
| **State 영속화** | 모든 진행 상황을 `.ai-crew/state.json`에 저장. 세션 재시작 후 복구 가능 |
| **비침투적** | 기존 프로젝트 구조를 변경하지 않음. `.ai-crew/` 하위에만 저장 |
| **AI-DLC 규칙 직접 참조** | 슬래시 커맨드가 Claude에게 AIDLC 규칙 파일을 읽고 따르도록 지시 |

---

## 2. 데이터 모델

### 2.1 State (`state.json`)

```typescript
interface AICrewState {
  version: "2.0";
  intent: Intent | null;
  units: Unit[];
  team: TeamInfo | null;
  events: AICrewEvent[];       // 최근 100개 유지
}
```

#### Intent

하나의 작업 목표. 한 번에 하나만 활성화.

```typescript
interface Intent {
  id: string;                  // "realtime-notifications-20260316143052"
  description: string;         // "실시간 알림 시스템"
  status: IntentStatus;
  completionCriteria: CompletionCriteria[];
  createdAt: string;           // ISO 8601
  updatedAt: string;
}

type IntentStatus = "elaborating" | "ready" | "executing" | "integrating" | "complete";
```

상태 전이:
```
elaborating → ready → executing → integrating → complete
   (/crew:elaborate)  (/crew:execute)  (/crew:integrate)
```

#### Unit

Intent를 분해한 독립 작업 단위. 각 Unit은 하나의 Agent에 할당되어 worktree에서 격리 실행.

```typescript
interface Unit {
  id: string;                  // "unit-backend"
  name: string;                // "notification-backend"
  description: string;
  status: UnitStatus;
  dependencies: string[];      // 다른 Unit ID

  // Agent 할당 (execute 시 설정)
  assignedTo: string | null;   // Agent 이름
  worktree: string | null;     // worktree 경로
  branch: string | null;       // "feature/unit-backend"

  // Hat 상태
  currentHat: string | null;   // pipeline에서 정의된 Hat ID
  hatHistory: HatTransition[];
  hatArtifacts: HatArtifact[]; // Hat별 산출물 & 게이트 결과 추적

  tasks: Task[];
  startedAt: string | null;
  completedAt: string | null;
}

type UnitStatus = "pending" | "assigned" | "in-progress" | "review" | "complete" | "blocked";

interface HatArtifact {
  hatId: string;
  startedAt: string | null;
  completedAt: string | null;
  outputs: string[];           // 실제 생성된 파일 경로
  gateResults: GateResult[];
}

interface GateResult {
  command: string;
  passed: boolean;
  output?: string;
}
```

#### Task, CompletionCriteria, Event

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;          // "pending" | "in-progress" | "complete" | "skipped"
  files: string[];
  completedAt: string | null;
}

interface CompletionCriteria {
  id: string;
  description: string;
  verified: boolean;
  verifiedAt: string | null;
}

interface AICrewEvent {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventType =
  | "intent:created" | "intent:updated" | "intent:completed"
  | "unit:assigned"  | "unit:started"   | "unit:completed"
  | "task:started"   | "task:completed"
  | "hat:changed"    | "checkpoint:created"
  | "team:created"   | "team:disbanded";
```

### 2.2 Config (`config.yaml`)

```yaml
version: "2.0"

execution:
  maxParallelUnits: 3              # 동시 실행 Unit 수
  defaultModel: "claude-sonnet-4"
  teammateMode: "tmux"             # tmux | in-process

hats:
  requirePlanApproval: false
  autoTransition: true

  # Hat 파이프라인 정의 — 순서가 곧 실행 순서
  pipeline:
    - id: planner
      name: "Planner"
      description: "Task 분석, 접근 방식 결정, 계획 문서화"
      rules: ".ai-crew/rules/hat-planner.md"
      artifacts:
        - ".ai-crew/scratchpad/{agent}.md"
      transitions:
        - "plan documented in scratchpad"
      qualityGates: []

    - id: builder
      name: "Builder"
      description: "코드 구현, 테스트 작성"
      rules: ".ai-crew/rules/hat-builder.md"
      artifacts:
        - "src/**"
        - "tests/**"
      transitions:
        - "all tasks attempted"
        - "tests written"
      qualityGates:
        - command: "npm test -- --related"
          failAction: "block"

    - id: reviewer
      name: "Reviewer"
      description: "테스트/lint 실행, 코드 품질 검증"
      rules: ".ai-crew/rules/hat-reviewer.md"
      artifacts: []
      transitions:
        - "all tests pass"
        - "lint passes"
        - "criteria verified"
      qualityGates:
        - command: "npm run lint"
          failAction: "warn"
        - command: "npm run test:coverage"
          minCoverage: 80
          failAction: "block"

  # 워크플로 프리셋 (참조용)
  # presets는 자동 적용되지 않음 — pipeline을 직접 편집해야 함
  # 예: tdd 사용 시 pipeline에 tester Hat 정의를 추가
  presets:
    core: [planner, builder, reviewer]
    tdd: [planner, tester, builder, reviewer]
    secure: [planner, builder, reviewer, security-reviewer]

  # Hat별 모델/provider 오버라이드 (Cross-Check 패턴, 선택적)
  # modelOverrides:
  #   reviewer:
  #     provider: "openai"
  #     model: "codex"

checkpoints:
  auto: true
  triggers:
    - "unit:completed"
    - "hat:changed"

language: "ko"
```

#### HatDefinition 타입

```typescript
interface HatDefinition {
  id: string;
  name: string;
  description: string;
  rules?: string;              // Hat별 규칙 파일 경로
  artifacts: string[];         // glob 패턴
  transitions: string[];       // 전환 조건
  qualityGates: QualityGateRule[];
  modelOverride?: {            // Cross-Check 패턴: 다른 모델로 실행
    provider?: string;         // "openai" | "google" → agent_chat MCP 사용
    model?: string;
  };
}
```

### 2.3 Checkpoint

```typescript
interface Checkpoint {
  id: string;                  // "cp-20260316-143052"
  description: string;
  createdAt: string;
  state: AICrewState;          // 전체 상태 스냅샷
  git: {
    mainRef: string;           // HEAD commit SHA
    branches: { name: string; ref: string }[];
  };
  changes: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
}
```

---

## 3. Hat System

각 Agent는 하나의 Unit을 담당하며, `config.yaml`의 `hats.pipeline`에 정의된 Hat을 순서대로 수행한다.

### 3.1 Config-Driven Pipeline

Hat은 더 이상 하드코딩되지 않는다. `config.yaml`의 `pipeline` 배열이 Hat 순서, 규칙, 품질 게이트를 모두 정의한다.

```
START ──→ pipeline[0] (예: Planner)
               │
               │ [transitions 조건 충족]
               ▼
          pipeline[1] (예: Builder)
               │
               │ [transitions 조건 충족 + qualityGates 통과]
               ▼
          pipeline[2] (예: Reviewer)
               │
          ┌────┴────┐
          ▼         ▼
       [PASS]    [FAIL]
    Unit Complete  → 이전 Hat으로 복귀
```

기본 파이프라인 (core preset):

| Hat | 규칙 파일 | Quality Gates | 산출물 |
|-----|----------|---------------|--------|
| **Planner** | `hat-planner.md` | 없음 | `.ai-crew/scratchpad/{agent}.md` |
| **Builder** | `hat-builder.md` | `npm test -- --related` (block) | `src/**`, `tests/**` |
| **Reviewer** | `hat-reviewer.md` | `npm run lint` (warn), `npm run test:coverage` (block) | gate 결과 |

### 3.2 확장성

새 Hat 추가 시 **코드 변경 없이** config + 규칙 파일 추가만으로 가능:

```yaml
# config.yaml — pipeline에 추가
pipeline:
  - id: planner
    ...
  - id: builder
    ...
  - id: reviewer
    ...
  - id: security-reviewer          # ← 추가
    name: "Security Reviewer"
    description: "보안 취약점 스캔 및 OWASP Top 10 검증"
    rules: ".ai-crew/rules/hat-security-reviewer.md"
    artifacts: [".ai-crew/scratchpad/{agent}-security.md"]
    transitions: ["security scan passes", "no critical CVEs"]
    qualityGates:
      - command: "npm audit --audit-level=critical"
        failAction: "block"
```

### 3.3 Hat별 규칙 파일

```
.ai-crew/rules/
├── global.md               ← 전체 공통 규칙 (git commit format, 코딩 컨벤션)
├── hat-planner.md          ← Planner 전용 체크리스트
├── hat-builder.md          ← Builder 전용 규칙
└── hat-reviewer.md         ← Reviewer 전용 검증 규칙
```

Agent 프롬프트 생성 시: `global.md` + 현재 Hat의 규칙 파일을 함께 주입.

### 3.4 Quality Gate 강제

Agent Teams는 완료 검증이 없으므로(teammate가 "done" 하면 신뢰), Hat 전환 시 quality gate를 프롬프트 내에서 강제한다:

- `failAction: "block"` → 게이트 통과 전까지 다음 Hat으로 전환 불가
- `failAction: "warn"` → 경고 기록 후 진행
- 게이트 결과는 `state.json`의 `hatArtifacts[].gateResults`에 기록 (파일 기반 — 세션 재개 미지원 대비)

### 3.5 Model Routing (Cross-Check 패턴)

Hat별 `modelOverride`로 다른 모델/provider 지정 가능:

| 모드 | 설명 | 비용 |
|------|------|------|
| **inline** (기본) | 하나의 Agent가 모든 Hat을 순서대로 수행 | 1x |
| **split** | `modelOverride` 지정된 Hat만 `agent_chat` MCP로 분리 | 2-3x |

```yaml
# 예: Claude가 작성 → Codex가 리뷰
modelOverrides:
  reviewer:
    provider: "openai"
    model: "codex"
```

Hat 전환은 Agent 프롬프트 내 지시로 이루어진다. Agent가 각 단계 완료 시 `state.json`을 직접 업데이트한다.

### 3.6 비용 가이드라인

Agent Teams의 토큰 비용은 팀원 수에 비례하여 3-4x 증가한다 (Reddit 실전 리포트 기반).

| Pipeline 길이 | 예상 비용 배수 | 권장 |
|--------------|---------------|------|
| 3 hats (core) | 1x (기준) | 권장 |
| 4 hats (secure/tdd) | ~1.3x | 적합 |
| 5+ hats | 1.5x+ | 비용 대비 효과 검토 필요 |

- 기본 파이프라인은 **3-4단계**를 권장
- `modelOverride`로 외부 모델 사용 시 해당 모델의 API 비용이 추가됨
- `/crew:execute`에서 agent spawn 전 비용 추정을 표시하여 사용자가 확인

### 3.7 Context Limit Handoff

Agent가 context window 한계에 도달하면 작업이 유실될 수 있다 (Stoneforge 패턴 참고).

**Handoff 프로토콜**:
1. Agent가 현재까지의 진행 상황을 커밋 (`wip: handoff`)
2. 구조화된 handoff 노트를 `.ai-crew/scratchpad/{agent}-handoff.md`에 작성
3. Unit status를 `"in-progress"`로 유지
4. Team Lead가 새 Agent를 같은 branch에 re-spawn하여 이어받음

Handoff 노트 포맷은 `.ai-crew/rules/global.md`에 정의.

### 3.8 Shared File 충돌 방지

병렬 Unit이 같은 파일을 수정하면 integration에서 대규모 충돌이 발생한다.

**사전 분석** (`/crew:execute` Step 2):
- Agent spawn 전 Unit 간 파일 겹침을 분석
- 충돌 예상 시 공유 파일 소유권을 한 Unit에 할당
- 심한 충돌 시 해당 Unit은 순차 실행 권장

---

## 4. 실행 흐름

### 4.1 Inception (`/crew:elaborate`)

Team Lead(Claude)가 직접 수행. AI-DLC Inception 규칙 파일을 읽고 따른다.

```
사용자: /crew:elaborate 실시간 알림 시스템
         │
         ▼
Claude가 순서대로 실행:
1. .ai-crew/aidlc-rule-details/inception/workspace-detection.md 읽기 → 프로젝트 분석
2. .ai-crew/aidlc-rule-details/inception/requirements-analysis.md 읽기 → 요구사항 질의
3. .ai-crew/aidlc-rule-details/inception/user-stories.md (조건부)
4. .ai-crew/aidlc-rule-details/inception/workflow-planning.md
5. .ai-crew/aidlc-rule-details/inception/application-design.md (조건부)
6. .ai-crew/aidlc-rule-details/inception/units-generation.md → Unit 분해
         │
         ▼
산출물:
  .ai-crew/specs/{intent-id}/requirements.md
  .ai-crew/specs/{intent-id}/design.md
  .ai-crew/specs/{intent-id}/tasks.md
  .ai-crew/state.json → intent.status = "ready", units[] 생성
```

### 4.2 Construction (`/crew:execute`)

Agent Teams로 Unit별 병렬 구현. Wave 기반 실행.

```
Claude (Team Lead):
1. dependency graph 분석 → 실행 가능 Unit 식별
2. 사용자 확인
3. 각 Unit에 Agent() spawn (isolation: "worktree")
   │
   ├─ Agent "backend-dev" ─→ feature/unit-backend
   │   └─ Planner 🎩 → Builder 🔨 → Reviewer 👀
   │
   ├─ Agent "frontend-dev" ─→ feature/unit-frontend
   │   └─ Planner 🎩 → Builder 🔨 → Reviewer 👀
   │
   └─ (Non-Claude via MCP agent_chat, 선택적)
         │
4. Wave 1 완료 → deps resolved된 Wave 2 spawn
5. 전체 완료 → intent.status = "integrating"
```

각 Agent 프롬프트에 포함되는 컨텍스트:
- Unit의 specs (requirements, design, tasks)
- Hat pipeline 정의 (config.yaml → `hats.pipeline`)
- Hat별 규칙 파일 (`.ai-crew/rules/hat-*.md`)
- 공통 규칙 (`.ai-crew/rules/global.md`)
- AIDLC construction 규칙 (`construction/code-generation.md`, `construction/build-and-test.md`)

### 4.3 Integration (`/crew:integrate`)

```
1. 모든 Unit status == "complete" 확인
2. Dependency 순서대로 feature branch merge
3. 충돌 해결
4. 전체 테스트 & lint 실행
5. Completion Criteria 검증
6. Worktree 정리, branch 삭제
7. intent.status = "complete", 자동 checkpoint
8. PR 생성 (선택적)
```

---

## 5. State 영속화 & 복구

### 저장 시점

| 이벤트 | 저장 내용 |
|--------|----------|
| Intent 생성 | 전체 state (`/crew:elaborate` 시작) |
| Unit 할당 | agent, branch, worktree 정보 |
| Hat 전환 | hatHistory에 추가 |
| Task 완료 | task.status, completedAt |
| Unit 완료 | unit.status, completedAt |
| Checkpoint | 전체 state + git refs 스냅샷 |

### 복구

세션 재시작 시 `/crew:status`로 현재 상태 확인 후:
- `intent.status == "elaborating"` → `/crew:elaborate` 재실행 (이어서)
- `intent.status == "ready"` → `/crew:execute`
- `intent.status == "executing"` → `/crew:execute` (미완료 Unit 재개)
- `intent.status == "integrating"` → `/crew:integrate`

Checkpoint로 특정 시점 복구: `/crew:restore {checkpoint-id}`

---

## 6. Quality Gates

Quality gate는 **각 Hat의 `qualityGates` 필드**에 정의된다 (pipeline 내 per-hat 설정).
해당 Hat을 수행하는 Agent가 직접 실행하고 결과에 따라 진행/차단을 결정한다.

```yaml
# config.yaml → hats.pipeline 내 각 Hat에 정의
pipeline:
  - id: builder
    qualityGates:
      - command: "npm test -- --related"
        failAction: "block"       # 실패 시 다음 Hat으로 전환하지 않음
  - id: reviewer
    qualityGates:
      - command: "npm run lint"
        failAction: "warn"        # 경고만 표시
      - command: "npm run test:coverage"
        minCoverage: 80
        failAction: "block"       # 커버리지 미달 시 차단
```

게이트 결과는 `state.json`의 `unit.hatArtifacts[].gateResults`에 기록된다.
Agent Teams는 완료 검증을 하지 않으므로, quality gate 강제는 Agent 프롬프트 내에서 수행한다.

향후 Claude Code Hooks 연동으로 자동화 예정.

---

## 7. Multi-Provider MCP 서버

Claude 이외의 모델(OpenAI, Google)에 작업을 위임할 수 있는 MCP 서버를 내장한다.

### 도구

| 도구 | 설명 |
|------|------|
| `agent_chat` | Non-Claude 모델에 메시지 전송. 세션별 대화 이력 유지. |
| `list_models` | 사용 가능한 모델 목록 반환 |

### Provider

| Provider | 모델 | 환경변수 |
|----------|------|---------|
| OpenAI | gpt-4o, o3, codex | `OPENAI_API_KEY` |
| Google | gemini-2.5-pro, gemini-2.5-flash | `GOOGLE_API_KEY` |

Provider SDK는 동적 import — 미설치 시 해당 Provider를 건너뛴다.

`/crew:execute`에서 Non-Claude agent에 작업 위임 시 사용:
```
agent_chat(
  session_id: "unit-backend-agent",
  model: "gpt-4o",
  system_prompt: "...",
  message: "..."
)
```

---

## 8. 설치

```bash
cd your-project
npx ai-crew init --lang ko
```

옵션:
- `--lang ko|en` — 언어 (기본: ko)
- `--force` — 기존 설정 덮어쓰기

생성되는 구조:

```
.ai-crew/
├── config.yaml
├── state.json
├── aidlc-rule-details/      # AI-DLC 방법론 규칙 (inception, construction, ...)
├── prompts/                 # 프롬프트 템플릿
├── templates/               # 문서 템플릿 (Handlebars)
├── rules/                   # 공통 규칙 + Hat별 규칙
├── specs/                   # (빈) Intent별 스펙
├── checkpoints/             # (빈) 상태 스냅샷
├── scratchpad/              # (빈) Agent 작업 노트
└── sessions/                # (빈) MCP 세션

.claude/
├── settings.json            # Agent Teams 환경변수, MCP 서버 등록
└── commands/crew/           # 슬래시 커맨드 6개
    ├── elaborate.md
    ├── execute.md
    ├── integrate.md
    ├── status.md
    ├── checkpoint.md
    └── restore.md

CLAUDE.md                    # AI-Crew 섹션 append
```

`settings.json` 내용:
```json
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "permissions": { "allow": ["Read", "Write", "Edit", "Bash", "Agent"] },
  "mcpServers": { "ai-crew": { "command": "npx", "args": ["ai-crew", "mcp"] } }
}
```

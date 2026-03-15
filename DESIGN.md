# AI-Crew Design Document v2.0

> **AI-DLC 방법론을 Claude Code Agent Teams와 통합하는 플러그인**

---

## 1. 개요

### 1.1 AI-Crew란?

AI-Crew는 **Claude Code의 확장**으로, AI-DLC(AI-Driven Development Lifecycle) 방법론을 Claude Code Agent Teams 위에서 구현한다.

```
┌─────────────────────────────────────────────────────────┐
│                      AI-Crew                            │
├─────────────────────────────────────────────────────────┤
│  • State 영속화 (세션 간 상태 유지)                      │
│  • 구조화된 프롬프트 생성                                │
│  • 품질 게이트 (Hooks)                                  │
│  • 문서 템플릿 관리                                     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Claude Code                           │
├─────────────────────────────────────────────────────────┤
│  • Agent Teams (팀 생성/조율)                           │
│  • Git Worktree 관리                                    │
│  • 코드 생성/편집                                       │
│  • 자연어 대화                                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Claude 위임** | Agent 생성/제어는 Claude Code가 담당. AI-Crew는 프롬프트와 상태만 관리 |
| **State 영속화** | 모든 진행 상황을 파일로 저장. 세션 재시작 후 복구 가능 |
| **프롬프트 기반** | Claude Code API를 직접 호출하지 않음. 구조화된 프롬프트 생성 |
| **비침투적** | 기존 프로젝트 구조를 변경하지 않음. `.ai-crew/` 하위에만 저장 |

### 1.3 cc-sdd와의 관계

```
cc-sdd (Spec-Driven Development)
  └── /kiro:* 명령어
  └── .kiro/ 디렉토리
  └── Kiro 호환 스펙 형식

ai-crew (독립적 구현)
  └── /crew:* 명령어
  └── .ai-crew/ 디렉토리
  └── Agent Teams 통합에 최적화

결정: ai-crew는 cc-sdd와 독립적으로 동작
      - 같이 설치 가능 (충돌 없음)
      - 서로 다른 명령어 네임스페이스
      - ai-crew는 Agent Teams 활용에 특화
```

---

## 2. 아키텍처

### 2.1 컴포넌트 구조

```
┌─────────────────────────────────────────────────────────────┐
│                       AI-Crew Plugin                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Commands   │    State     │   Prompts    │     Hooks      │
│              │   Manager    │   Builder    │                │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ /crew:*      │ Intent/Unit  │ Elaboration  │ TaskCompleted  │
│ 명령어 정의   │ Task 관리    │ Execution    │ UnitCompleted  │
│              │ Checkpoint   │ Integration  │ QualityGate    │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Runtime                       │
│  • Agent Teams API (자연어 기반)                             │
│  • Git Worktree (Claude가 직접 실행)                         │
│  • File System (Claude가 직접 접근)                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 디렉토리 구조

```
project/
├── .ai-crew/                    # AI-Crew 루트 (유일한 디렉토리)
│   │
│   ├── config.yaml              # 설정
│   │
│   ├── state.json               # 현재 런타임 상태
│   │
│   ├── specs/                   # Intent별 스펙 문서
│   │   └── {intent-id}/
│   │       ├── requirements.md  # 요구사항
│   │       ├── design.md        # 설계
│   │       └── tasks.md         # 태스크 목록
│   │
│   ├── checkpoints/             # 상태 스냅샷
│   │   └── {checkpoint-id}.json
│   │
│   ├── scratchpad/              # Agent 작업 노트
│   │   └── {agent-name}.md
│   │
│   ├── templates/               # 문서 템플릿 (커스터마이징)
│   │   ├── requirements.md.hbs
│   │   ├── design.md.hbs
│   │   └── tasks.md.hbs
│   │
│   ├── prompts/                 # 프롬프트 템플릿
│   │   ├── elaborate.md
│   │   ├── execute.md
│   │   └── integrate.md
│   │
│   └── rules/                   # 생성 규칙
│       └── coding-standards.md
│
├── .claude/
│   ├── settings.json            # Agent Teams 활성화
│   └── commands/
│       └── crew/                # Claude Code 명령어
│           ├── elaborate.md
│           ├── execute.md
│           ├── status.md
│           └── integrate.md
│
└── CLAUDE.md                    # AI-Crew 컨텍스트 추가
```

---

## 3. 데이터 모델

### 3.1 State 구조

```typescript
// .ai-crew/state.json
interface AICrewState {
  version: "2.0";
  
  // 현재 활성 Intent
  intent: {
    id: string;                          // "intent-m1abc123"
    description: string;                  // "실시간 알림 시스템"
    status: IntentStatus;                // "elaborating" | "ready" | "executing" | "integrating" | "complete"
    completionCriteria: CompletionCriteria[];
    createdAt: string;                   // ISO 8601
    updatedAt: string;
  } | null;
  
  // Intent를 분해한 Units
  units: Unit[];
  
  // 현재 Team 정보 (실행 중일 때만)
  team: {
    name: string;
    createdAt: string;
    agents: AgentInfo[];
  } | null;
  
  // 최근 이벤트 로그
  events: AICrewEvent[];
}

interface Unit {
  id: string;                            // "unit-backend"
  name: string;                          // "notification-backend"
  description: string;
  status: UnitStatus;                    // "pending" | "assigned" | "in-progress" | "review" | "complete" | "blocked"
  dependencies: string[];                // Unit IDs
  
  // Agent 할당 정보
  assignedTo: string | null;             // Agent 이름
  worktree: string | null;               // worktree 경로
  branch: string | null;                 // Git branch
  
  // Hat 상태
  currentHat: HatType | null;            // "planner" | "builder" | "reviewer"
  hatHistory: HatTransition[];
  
  // Tasks
  tasks: Task[];
  
  // 타임스탬프
  startedAt: string | null;
  completedAt: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;                    // "pending" | "in-progress" | "complete" | "skipped"
  files: string[];                       // 관련 파일 경로
  completedAt: string | null;
}

interface CompletionCriteria {
  id: string;
  description: string;
  verified: boolean;
  verifiedAt: string | null;
}

interface AgentInfo {
  name: string;                          // "backend-dev"
  unitId: string;                        // 담당 Unit
  status: "active" | "idle" | "completed";
}

interface HatTransition {
  from: HatType | null;
  to: HatType;
  reason: string;
  timestamp: string;
}

interface AICrewEvent {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

type IntentStatus = "elaborating" | "ready" | "executing" | "integrating" | "complete";
type UnitStatus = "pending" | "assigned" | "in-progress" | "review" | "complete" | "blocked";
type TaskStatus = "pending" | "in-progress" | "complete" | "skipped";
type HatType = "planner" | "builder" | "reviewer";
type EventType = 
  | "intent:created" | "intent:updated" | "intent:completed"
  | "unit:assigned" | "unit:started" | "unit:completed"
  | "task:started" | "task:completed"
  | "hat:changed"
  | "checkpoint:created"
  | "team:created" | "team:disbanded";
```

### 3.2 Config 구조

```yaml
# .ai-crew/config.yaml
version: "2.0"

# 실행 설정
execution:
  maxParallelUnits: 3              # 동시 실행 Unit 수
  defaultModel: "claude-sonnet-4"  # 기본 모델
  teammateMode: "tmux"             # tmux | in-process

# Hat 설정
hats:
  workflow: "core"                 # core | tdd | adversarial
  requirePlanApproval: false       # Planner 결과 승인 필요 여부
  autoTransition: true             # 자동 Hat 전환

# Hat 전환 조건
hatTransitions:
  plannerToBuilder:
    - "plan documented in scratchpad"
  builderToReviewer:
    - "all tasks attempted"
    - "tests written"
  reviewerComplete:
    - "all tests pass"
    - "lint passes"
    - "criteria verified"

# 품질 게이트
qualityGates:
  beforeTaskComplete:
    - command: "npm test -- --related"
      failAction: "block"
  beforeUnitComplete:
    - command: "npm run lint"
      failAction: "warn"
    - command: "npm run test:coverage"
      minCoverage: 80
      failAction: "block"

# 자동 체크포인트
checkpoints:
  auto: true
  triggers:
    - "unit:completed"
    - "hat:changed"

# 언어
language: "ko"  # ko | en
```

---

## 4. 명령어 설계

### 4.1 명령어 개요

| 명령어 | Phase | 설명 |
|--------|-------|------|
| `/crew:elaborate` | Inception | Intent 정의 & Unit 분해 |
| `/crew:execute` | Construction | Agent Team 생성 & 실행 |
| `/crew:status` | Any | 현재 상태 조회 |
| `/crew:integrate` | Integration | 결과 통합 & 검증 |
| `/crew:checkpoint` | Any | 수동 상태 저장 |
| `/crew:restore` | Any | 이전 상태 복구 |
| `/crew:reset` | Any | 현재 Intent 초기화 |

### 4.2 /crew:elaborate

**목적**: Intent를 정의하고 Units로 분해

**흐름**:
```
1. 사용자: /crew:elaborate 실시간 알림 시스템

2. AI-Crew Plugin:
   - StateManager.createIntent("실시간 알림 시스템")
   - PromptBuilder.buildElaborationPrompt()
   - 프롬프트를 Claude에게 전달

3. Claude (프롬프트 기반 대화):
   - 요구사항 명확화 질문
   - Completion Criteria 정의
   - Units 분해
   - specs/{intent-id}/ 에 문서 생성

4. AI-Crew Plugin:
   - Claude 출력 파싱
   - StateManager.updateIntent(units, criteria)
   - state.json 업데이트

5. 결과:
   - state.json: intent.status = "ready"
   - specs/{intent-id}/requirements.md 생성
   - specs/{intent-id}/design.md 생성
   - specs/{intent-id}/tasks.md 생성
```

**Elaboration 프롬프트 템플릿**:
```markdown
<!-- .ai-crew/prompts/elaborate.md -->

# Elaboration Prompt

당신은 AI-DLC의 Elaboration 단계를 진행합니다.

## Context
- Intent: {{intent.description}}
- Project: {{project.type}} ({{project.framework}})
- Existing specs: {{existingSpecs}}

## Instructions

1. **요구사항 명확화**
   - 기능 범위 질문 (3-5개)
   - 기술적 제약 확인
   - 성공 기준 정의

2. **Completion Criteria 설정**
   - 측정 가능한 기준 5-7개
   - 각 기준은 검증 방법 포함

3. **Unit 분해**
   - 의존성 기준으로 분리
   - 각 Unit은 2-4시간 내 완료 가능
   - 병렬 실행 가능한 Unit 식별

4. **문서 생성**
   다음 파일을 생성하세요:
   - `.ai-crew/specs/{{intent.id}}/requirements.md`
   - `.ai-crew/specs/{{intent.id}}/design.md`
   - `.ai-crew/specs/{{intent.id}}/tasks.md`

5. **State 업데이트**
   마지막에 다음 JSON을 출력하세요:
   ```json
   {
     "action": "elaborate_complete",
     "units": [...],
     "completionCriteria": [...]
   }
   ```

## Templates
{{> requirementsTemplate}}
{{> designTemplate}}
{{> tasksTemplate}}
```

### 4.3 /crew:execute

**목적**: Agent Team을 생성하고 Construction 시작

**흐름**:
```
1. 사용자: /crew:execute

2. AI-Crew Plugin:
   - StateManager.load()
   - 실행 가능한 Units 확인 (dependencies resolved)
   - PromptBuilder.buildExecutionPrompt()

3. Claude (Agent Team 생성):
   - "Create an agent team with N teammates..."
   - 각 Agent에 Unit 할당
   - Git worktree 생성
   - 병렬 실행 시작

4. 각 Agent (Hat 순환):
   🎩 Planner:
     - Task 분석
     - 접근 방식 문서화 (.ai-crew/scratchpad/{agent}.md)
     - "Plan complete" 선언
   
   🔨 Builder:
     - 코드 구현
     - 테스트 작성
     - Task 하나씩 완료 체크
   
   👀 Reviewer:
     - 테스트 실행
     - 린트 확인
     - Completion Criteria 검증

5. AI-Crew Hooks:
   - TaskCompleted → state 업데이트
   - UnitCompleted → 다음 Unit 시작 또는 Integration

6. 결과:
   - 각 Unit의 feature branch에 코드 완성
   - state.json 업데이트
```

**Execution 프롬프트 템플릿**:
```markdown
<!-- .ai-crew/prompts/execute.md -->

# Execution Prompt

## Intent
{{intent.description}}

## Units to Execute
{{#each availableUnits}}
### Unit: {{this.name}}
- ID: {{this.id}}
- Description: {{this.description}}
- Tasks: {{this.tasks.length}}
- Dependencies: {{this.dependencies}}
{{/each}}

## Instructions

1. **Agent Team 생성**
   ```
   Create an agent team with {{availableUnits.length}} teammates.
   
   {{#each availableUnits}}
   - Teammate "{{this.suggestedAgentName}}":
     - Assigned Unit: {{this.name}}
     - Work in worktree: ../{{project.name}}-{{this.suggestedAgentName}}
     - Branch: feature/{{this.id}}
   {{/each}}
   
   Each teammate should use their own git worktree.
   ```

2. **Hat System**
   각 Agent는 다음 순서로 작업:
   
   🎩 **Planner** (먼저):
   - Task 분석
   - 접근 방식을 `.ai-crew/scratchpad/{agent-name}.md`에 기록
   - 완료 시: `[HAT:PLANNER_COMPLETE]` 출력
   
   🔨 **Builder** (다음):
   - 계획에 따라 구현
   - Task 완료 시: `[TASK:COMPLETE:{task-id}]` 출력
   - 모든 Task 완료 시: `[HAT:BUILDER_COMPLETE]` 출력
   
   👀 **Reviewer** (마지막):
   - 테스트 실행: `npm test`
   - 린트 확인: `npm run lint`
   - 성공 시: `[UNIT:COMPLETE:{unit-id}]` 출력

3. **Communication**
   - API 스펙 공유 필요 시 Team Lead에게 메시지
   - 블로킹 이슈 발생 시 즉시 보고

## Quality Gates
{{#each config.qualityGates.beforeUnitComplete}}
- {{this.command}} ({{this.failAction}})
{{/each}}
```

### 4.4 /crew:integrate

**목적**: 모든 Unit 결과를 통합

**흐름**:
```
1. 사용자: /crew:integrate

2. AI-Crew Plugin:
   - 모든 Unit status = "complete" 확인
   - PromptBuilder.buildIntegrationPrompt()

3. Claude (Integration):
   - git checkout main
   - 각 feature branch merge
   - 충돌 해결
   - Cross-unit 테스트
   - E2E 테스트
   - Completion Criteria 최종 검증

4. AI-Crew Plugin:
   - StateManager.updateIntent(status: "complete")
   - 자동 Checkpoint 생성
   - Worktree 정리 (선택적)

5. 결과:
   - main branch에 모든 변경 통합
   - PR 생성 (선택적)
```

---

## 5. Hat System 상세

### 5.1 Hat 전환 규칙

```
┌─────────────────────────────────────────────────────────┐
│                    Hat Transitions                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  START ──→ 🎩 Planner                                   │
│                  │                                       │
│                  │ [plan documented]                     │
│                  │ [approach decided]                    │
│                  ▼                                       │
│            🔨 Builder                                    │
│                  │                                       │
│                  │ [all tasks attempted]                 │
│                  │ [tests written]                       │
│                  ▼                                       │
│            👀 Reviewer                                   │
│                  │                                       │
│       ┌─────────┴─────────┐                             │
│       │                   │                              │
│       ▼                   ▼                              │
│   [PASS]              [FAIL]                            │
│   Unit Complete       Back to Builder                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Hat별 책임

| Hat | 입력 | 작업 | 출력 |
|-----|------|------|------|
| **Planner** | Unit specs, Tasks | 분석, 계획 수립 | scratchpad/{agent}.md |
| **Builder** | Plan, Tasks | 코드 작성, 테스트 작성 | 코드 파일, 테스트 파일 |
| **Reviewer** | 구현된 코드 | 테스트 실행, 린트, 검증 | Pass/Fail 결정 |

### 5.3 Hat 전환 감지

Claude 출력에서 마커를 파싱:

```
[HAT:PLANNER_COMPLETE]     → Planner → Builder
[HAT:BUILDER_COMPLETE]     → Builder → Reviewer
[TASK:COMPLETE:{id}]       → Task 상태 업데이트
[UNIT:COMPLETE:{id}]       → Unit 완료
[UNIT:BLOCKED:{id}:{reason}] → Unit 블로킹
```

---

## 6. Hooks & Quality Gates

### 6.1 Hook 정의

```typescript
// hooks/index.ts

interface Hook {
  event: EventType;
  handler: (payload: HookPayload) => Promise<HookResult>;
}

interface HookPayload {
  event: EventType;
  state: AICrewState;
  context: {
    unitId?: string;
    taskId?: string;
    agentName?: string;
  };
}

interface HookResult {
  action: "continue" | "block" | "retry";
  message?: string;
  updates?: Partial<AICrewState>;
}
```

### 6.2 기본 Hooks

```typescript
// Task 완료 시
const onTaskCompleted: Hook = {
  event: "task:completed",
  handler: async ({ state, context }) => {
    // 관련 테스트 실행
    const result = await exec(`npm test -- --related ${context.taskId}`);
    
    if (result.exitCode !== 0) {
      return {
        action: "block",
        message: "Tests failed for this task",
      };
    }
    
    return { action: "continue" };
  },
};

// Unit 완료 시
const onUnitCompleted: Hook = {
  event: "unit:completed",
  handler: async ({ state, context }) => {
    // 커버리지 체크
    const coverage = await checkCoverage();
    
    if (coverage < state.config.qualityGates.minCoverage) {
      return {
        action: "block",
        message: `Coverage ${coverage}% < ${state.config.qualityGates.minCoverage}%`,
      };
    }
    
    // 자동 체크포인트
    if (state.config.checkpoints.auto) {
      await createCheckpoint(`Unit ${context.unitId} completed`);
    }
    
    return { action: "continue" };
  },
};
```

### 6.3 Claude Code Hooks 연동

```json
// .claude/settings.json
{
  "hooks": {
    "TaskCompleted": {
      "command": "node .ai-crew/hooks/task-completed.js",
      "timeout": 30000
    },
    "TeammateIdle": {
      "command": "node .ai-crew/hooks/teammate-idle.js"
    }
  }
}
```

---

## 7. State 영속화 & 복구

### 7.1 저장 시점

| 이벤트 | 저장 내용 | 저장 위치 |
|--------|----------|----------|
| Intent 생성 | 전체 state | state.json |
| Unit 시작 | unit 상태 | state.json |
| Task 완료 | task 상태 | state.json |
| Hat 전환 | hat 이력 | state.json |
| Checkpoint | 전체 스냅샷 | checkpoints/{id}.json |

### 7.2 복구 시나리오

```typescript
// 세션 시작 시 자동 복구
async function restoreSession(): Promise<void> {
  const state = await StateManager.load();
  
  if (!state?.intent) {
    console.log("No active intent. Start with /crew:elaborate");
    return;
  }
  
  console.log(`Resuming intent: ${state.intent.description}`);
  console.log(`Status: ${state.intent.status}`);
  
  // 진행 중인 Unit 확인
  const inProgress = state.units.filter(u => u.status === "in-progress");
  
  if (inProgress.length > 0) {
    console.log(`\nIn-progress units:`);
    for (const unit of inProgress) {
      console.log(`  - ${unit.name} (${unit.currentHat})`);
      
      // Worktree 복구
      if (unit.worktree && !existsSync(unit.worktree)) {
        await exec(`git worktree add ${unit.worktree} ${unit.branch}`);
      }
    }
    
    console.log(`\nRun /crew:execute to continue`);
  }
}
```

### 7.3 Checkpoint 구조

```typescript
// .ai-crew/checkpoints/{id}.json
interface Checkpoint {
  id: string;                  // "cp-20260315-143052"
  description: string;         // "Unit backend completed"
  createdAt: string;
  
  // 전체 상태 스냅샷
  state: AICrewState;
  
  // Git 정보
  git: {
    mainRef: string;           // main branch의 commit SHA
    branches: {
      name: string;
      ref: string;
    }[];
  };
  
  // 파일 변경 요약
  changes: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
}
```

---

## 8. 프롬프트 설계

### 8.1 프롬프트 구조

모든 프롬프트는 다음 구조를 따름:

```markdown
# {Command} Prompt

## Context
- 현재 상태 정보
- 프로젝트 컨텍스트

## Instructions
- 단계별 지시사항
- 예상 출력 형식

## Templates
- 문서 템플릿 (필요시)

## State Updates
- 출력해야 할 상태 마커
```

### 8.2 마커 규약

Claude 출력에서 파싱할 마커:

```
# 상태 업데이트
[STATE:UPDATE]
{json}
[/STATE:UPDATE]

# Hat 전환
[HAT:PLANNER_COMPLETE]
[HAT:BUILDER_COMPLETE]

# Task/Unit 완료
[TASK:COMPLETE:{task-id}]
[UNIT:COMPLETE:{unit-id}]

# 블로킹/에러
[UNIT:BLOCKED:{unit-id}:{reason}]
[ERROR:{message}]
```

### 8.3 프롬프트 → Claude → 파싱 흐름

```
┌─────────────────────────────────────────────────────────┐
│                   Prompt Builder                         │
│                                                          │
│  1. 템플릿 로드 (.ai-crew/prompts/*.md)                  │
│  2. 변수 치환 (Handlebars)                               │
│  3. Context 주입 (state, config)                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
│                                                          │
│  • 프롬프트 실행                                         │
│  • 파일 생성/수정                                        │
│  • 마커 출력                                             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Output Parser                          │
│                                                          │
│  1. 마커 감지 (정규식)                                   │
│  2. JSON 파싱                                            │
│  3. StateManager.update()                                │
│  4. Hook 트리거                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 9. 설치 & 초기화

### 9.1 설치 프로세스

```bash
# 1. 글로벌 또는 프로젝트에 설치
npm install -g ai-crew
# 또는
npx ai-crew@latest

# 2. 프로젝트에 초기화
cd your-project
ai-crew init

# 3. 대화형 설정
? Language: Korean
? Max parallel units: 3
? Require plan approval: No
? Min test coverage: 80%
```

### 9.2 init이 생성하는 파일

```
.ai-crew/
├── config.yaml              # 설정
├── state.json               # 빈 상태
├── prompts/                 # 기본 프롬프트
│   ├── elaborate.md
│   ├── execute.md
│   └── integrate.md
├── templates/               # 기본 템플릿
│   ├── requirements.md.hbs
│   ├── design.md.hbs
│   └── tasks.md.hbs
└── rules/
    └── coding-standards.md

.claude/
├── settings.json            # Agent Teams 활성화
└── commands/crew/           # 명령어 정의
    ├── elaborate.md
    ├── execute.md
    ├── status.md
    ├── integrate.md
    ├── checkpoint.md
    └── restore.md

CLAUDE.md                    # AI-Crew 섹션 추가
```

---

## 10. 구현 우선순위

### Phase 1: Core (MVP)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| Types | `src/types.ts` | 모든 타입 정의 |
| Config | `src/config.ts` | YAML 로드/저장 |
| State | `src/state.ts` | State 관리 |
| CLI | `src/cli.ts` | 명령어 인터페이스 |
| Installer | `src/installer.ts` | init 로직 |

### Phase 2: Commands

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| Elaborate | `src/commands/elaborate.ts` | 프롬프트 생성 |
| Execute | `src/commands/execute.ts` | 팀 실행 프롬프트 |
| Status | `src/commands/status.ts` | 상태 조회 |
| Integrate | `src/commands/integrate.ts` | 통합 프롬프트 |

### Phase 3: Advanced

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| Hooks | `src/hooks/` | Hook 시스템 |
| Parser | `src/parser.ts` | 출력 파싱 |
| Checkpoint | `src/checkpoint.ts` | 스냅샷 관리 |

---

## 11. 참고 자료

- [AI-DLC Official](https://ai-dlc.dev/)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks)
- [Git Worktree](https://git-scm.com/docs/git-worktree)

---

*Version: 2.0 | Last Updated: 2026-03-15*

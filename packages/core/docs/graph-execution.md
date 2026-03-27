# Graph Execution Model

> ai-crew의 DAG 기반 멀티 에이전트 실행 엔진

---

## 1. 개요

ai-crew의 Construction 단계는 **방향 비순환 그래프(DAG)** 기반 실행 엔진으로 구동된다. Inception 단계에서 분해된 유닛들이 `graph.yaml`의 노드로 매핑되며, 실행기(Team Lead)가 위상정렬을 수행하여 레벨 단위로 에이전트를 스폰한다.

핵심 특성:

- **레벨 단위 병렬 실행** — 같은 레벨의 독립 노드를 동시에 처리
- **Worktree 격리** — 각 워커 에이전트는 독립 Git worktree에서 작업
- **동적 실행 전략** — 노드 속성에 따라 INLINE/PARALLEL/TEAM을 런타임에 결정
- **Scratchpad 핸드오프** — 에이전트 간 컨텍스트 전달은 scratchpad 파일을 통해 수행

---

## 2. 그래프 구조

`.ai-crew/graph.yaml`은 실행할 노드의 DAG를 정의한다.

```yaml
graph:
  nodes:
    - id: {node_id}
      type: worker | router | aggregator
      agent: {agent_name}
      skills: [{skill_name}]
      hooks: [{hook_name}]
      depends_on: [{upstream_node_ids}]
      condition: "{node}.output.{key} == '{value}'"  # 선택, router 하류 노드용
      wait: all | any                                 # aggregator 전용
      config:
        isolation: worktree | none
        model: {model_override}                       # 선택
        retry: 0-3                                    # 선택, 기본값 0
```

### 노드 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | O | 노드 고유 식별자 |
| `type` | `worker` \| `router` \| `aggregator` | O | 노드 유형. worker는 구현, router는 분기, aggregator는 합류 |
| `agent` | string | O | `.claude/agents/`의 에이전트 정의 파일명 |
| `skills` | string[] | O | `.claude/skills/`의 스킬 목록 |
| `hooks` | string[] | O | 실행 훅 목록 |
| `depends_on` | string[] | O | 상류 의존 노드 ID 목록. 빈 배열이면 루트 노드 |
| `condition` | string | - | router 하류 노드의 조건식. 조건이 false이면 skipped 처리 |
| `wait` | `all` \| `any` | aggregator 필수 | aggregator의 대기 의미론 |
| `config.isolation` | `worktree` \| `none` | - | 격리 모드. worker 기본값은 worktree |
| `config.model` | string | - | 모델 오버라이드 |
| `config.retry` | number | - | 재시도 횟수 (0-3) |

### 노드 유형

- **worker** — 실제 구현을 수행하는 노드. 기본적으로 worktree 격리 상태에서 독립 실행
- **router** — 상류 컨텍스트를 분석하여 하류 경로를 결정하는 분기 노드. 항상 `isolation: none`으로 Team Lead가 인라인 실행
- **aggregator** — 여러 상류 노드의 결과를 합류시키는 노드. `wait: all`(전체 대기) 또는 `wait: any`(하나만 대기) 의미론 지원

---

## 3. 위상정렬 & 레벨 계산

실행기는 `src/graph.ts::computeLevels()` 함수를 사용하여 **Kahn의 알고리즘**으로 위상정렬과 레벨 계산을 동시에 수행한다.

### 알고리즘

1. 모든 노드의 진입 차수(in-degree)를 계산한다
2. 진입 차수가 0인 노드를 큐에 넣고 **Level 0**으로 설정한다
3. 큐에서 노드를 꺼내며 인접 노드의 진입 차수를 감소시킨다
4. 인접 노드의 레벨을 `max(현재 레벨, 상류 레벨 + 1)`로 갱신한다
5. 진입 차수가 0이 되면 큐에 추가한다
6. 모든 노드가 처리되면 레벨 맵을 반환한다. 처리된 노드 수가 전체보다 적으면 **순환(cycle)**이 존재하므로 `null`을 반환한다

### 레벨 규칙

- **Level 0** — `depends_on`이 비어 있는 루트 노드
- **Level N** — 모든 의존 노드가 Level < N에 위치하는 노드

### 실행 계획 표시

```
Graph Execution Plan:

Level 0 (immediate):
  ○ plan [worker] — agent: planner, skills: [planning]

Level 1 (after Level 0):
  ○ db_design [worker] — agent: builder, depends_on: [plan]
  ○ api_design [worker] — agent: builder, depends_on: [plan]

Level 2 (after Level 1):
  ○ review [aggregator] — wait: all, depends_on: [db_design, api_design]
```

---

## 4. 그래프 검증

`src/graph.ts::validateGraph()` 함수는 그래프의 구조적 정합성과 의미론적 제약을 검증한다.

### 검증 규칙

| 규칙 | 설명 | 심각도 |
|------|------|--------|
| 중복 ID 금지 | 동일한 `id`를 가진 노드가 2개 이상 존재하면 안 된다 | error |
| 댕글링 참조 금지 | `depends_on`에 존재하지 않는 노드 ID가 포함되면 안 된다 | error |
| 순환 금지 | DAG에 순환(cycle)이 있으면 안 된다 (Kahn 알고리즘으로 탐지) | error |
| 루트 노드 필수 | 최소 하나의 루트 노드(`depends_on`이 빈 배열)가 존재해야 한다 | error |
| Router 격리 제한 | router 노드는 반드시 `config.isolation: "none"`이어야 한다 | error |
| Aggregator wait 필수 | aggregator 노드는 반드시 `wait: "all"` 또는 `"any"`를 지정해야 한다 | error |
| verify 형식 | `verify` 필드가 존재하면 문자열 배열이어야 한다 | error |
| retry 범위 | `config.retry`가 존재하면 0-3 사이의 정수여야 한다 | error |

### 해시 기반 신뢰 검증

실행기는 매번 전체 검증을 수행하지 않는다:

1. `state.json`의 `preflight.graphHash`를 읽는다
2. `graph.yaml`의 현재 SHA-256 해시를 계산한다
3. **해시가 일치하면** — preflight에서 이미 검증된 그래프이므로 검증을 건너뛴다
4. **해시가 다르면** — graph.yaml이 변경되었으므로 인라인 풀 검증을 수행한다
5. **preflight 기록이 없으면** — 폴백으로 풀 검증을 수행한다

---

## 5. 실행 전략

각 레벨의 노드를 실행할 때, 노드 속성에 따라 세 가지 전략 중 하나를 **런타임에** 결정한다. 번들 정체성이 아닌 그래프 구조가 전략을 결정한다.

### INLINE

Team Lead가 에이전트를 스폰하지 않고 직접 실행한다.

- `isolation: none` 노드 (router, 일부 aggregator)
- 비-Claude 모델 노드 (`config.model`이 외부 모델인 경우) — `agent_chat` MCP 도구로 호출

```
Level 0: [plan]          → INLINE (isolation: none)
Level 3: [design_gate]   → INLINE (aggregator)
```

### PARALLEL

독립적인 `Agent()` 호출로 병렬 실행한다. `isolation: "worktree"` 사용.

- 파일 도메인이 겹치지 않는 2개 이상의 worktree 노드
- 단일 worktree 노드 (팀 오버헤드 불필요)
- 대부분의 worker 레벨의 기본 전략

```
Level 2: [db_design, api_design]  → PARALLEL (independent domains)
```

### TEAM

`TeamCreate` + `SendMessage`를 통한 조율된 병렬 실행.

- 파일 범위가 겹치는 2개 이상의 노드 (병합 충돌 위험)
- 런타임 상호 통신이 필요한 노드
- `TeamCreate` 도구가 감지된 경우에만 사용 가능

```
TeamCreate(team_name: "crew-L2", description: "Level 2: [fe_auth, fe_dashboard]")
Agent(name: "fe_auth", team_name: "crew-L2", isolation: "worktree", ...)
Agent(name: "fe_dashboard", team_name: "crew-L2", isolation: "worktree", ...)
```

---

## 6. Commit-Before-Spawn

worktree 에이전트를 스폰하기 전에 반드시 커밋을 수행해야 한다.

### 이유

`git worktree add`는 **더티 워킹 트리에서 실패한다**. 실행기가 `state.json`을 갱신하면 커밋되지 않은 변경이 생기고, 이 상태에서 worktree를 생성하면 git 오류가 발생한다.

### 절차

1. `state.json`에서 해당 레벨의 모든 노드를 `running`으로 갱신하고 `startedAt` 타임스탬프를 기록한다
2. `.ai-crew/` 변경사항을 스테이징하고 커밋한다:
   ```bash
   git add .ai-crew/
   git commit -m "crew: prepare L{N} — {node_ids}"
   ```
3. 워킹 트리가 클린 상태가 되어 worktree 생성이 안전하다

### 레벨 완료 후

레벨의 모든 노드가 완료되면 결과를 수집하고 상태를 갱신한 후 다시 커밋한다:

```bash
git add .ai-crew/ aidlc-docs/aidlc-state.md
git commit -m "crew: complete L{N} — {node_ids}"
```

---

## 7. Scratchpad

에이전트 간 핸드오프와 실행 결과 기록을 위한 임시 저장소.

### 네이밍 규칙

```
.ai-crew/scratchpad/L{level}-{node_id}.md
```

레벨 접두사로 실행 순서를 추적하고, 노드 ID로 개별 추적이 가능하다.

예시: `L0-plan.md`, `L2-db_design.md`, `L7-review.md`

상류 scratchpad를 읽을 때는 `*-{dep_id}.md` 패턴으로 파일을 탐색한다.

### 스키마

```markdown
# {node_id}

## Status: {completed | failed | partial}
Agent: {agent_name} | Model: {model} | Level: {level}

## What — Tasks Performed
- {task}: {what was done}

## How — Approach & Decisions
- {approach or pattern used}
- {key decision}: {rationale}

## Result — Completion Evidence
- Files: {created/modified file list}
- Tests: {test results if applicable}
- Commits: {commit hashes and messages}

## Downstream Context
{하류 노드가 필요로 하는 정보.
이 섹션은 하류 에이전트 프롬프트에 그대로 주입된다.
구체적이고, 실행 가능하며, 간결하게 작성한다.}
```

### 필드별 역할

| 필드 | 역할 |
|------|------|
| `What` | 수행한 작업의 요약 |
| `How` | 접근 방식과 핵심 결정 사항 |
| `Result` | 완료 증거 (파일, 테스트, 커밋) |
| `Downstream Context` | 하류 노드에 전달할 컨텍스트. 하류 에이전트 프롬프트에 verbatim 주입 |

### Handoff 파일

에이전트가 컨텍스트 한도에 도달하면 진행 상황을 커밋하고 핸드오프 노트를 작성한다:

```
.ai-crew/scratchpad/L{level}-{node_id}-handoff.md
```

---

## 8. 에이전트 프롬프트 구성

스폰되는 각 에이전트는 다음 요소로 구성된 프롬프트를 받는다:

### 프롬프트 구조

```
┌─ Agent Assignment ─────────────────────────────────┐
│  역할: agent name, node type, level, skills        │
│  에이전트 정의: .claude/agents/{agent_name}.md      │
│  스킬 파일: .claude/skills/{skill}/SKILL.md        │
├─ Upstream Context ─────────────────────────────────┤
│  각 완료된 의존 노드의 scratchpad                   │
│  (Downstream Context 섹션)                          │
├─ Previous Run Context ─────────────────────────────┤
│  동일 node_id의 이전 실행 결과 (있는 경우)          │
│  - 상태, 변경 파일, 핵심 결정                       │
│  - 실패한 노드는 실패 원인 필수 포함                │
│  그래프 구조 변경 사항 (있는 경우)                   │
├─ Rules ────────────────────────────────────────────┤
│  .ai-crew/rules/ 전체                               │
├─ AIDLC Construction Rules ─────────────────────────┤
│  .ai-crew/workflow/construction/ (존재 시)          │
├─ Language ─────────────────────────────────────────┤
│  스크래치패드 내용 작성 언어 (config.yaml locale)    │
│  스키마 필드명(What/How/Result)은 항상 영어          │
├─ Output Requirements ─────────────────────────────┤
│  scratchpad 스키마, 브랜치 네이밍, 제약사항          │
└────────────────────────────────────────────────────┘
```

### 이전 실행 컨텍스트 주입 규칙

| 조건 | 동작 |
|------|------|
| 동일 node_id가 이전 manifest에 존재 | 상태, 변경 파일, 핵심 결정 주입. 실패 시 원인 필수 포함 |
| 신규 노드 (이전 manifest에 없음) | 이전 컨텍스트 없음을 명시 |
| 그래프 구조 변경 | 추가/제거된 노드 목록 포함 |
| 무관한 노드의 scratchpad | 주입하지 않음 |
| 전체 실행 이력 테이블 | 주입하지 않음 (/crew:status 전용) |

---

## 9. 에러 핸들링

### Handoff (컨텍스트 한도)

에이전트가 `L{level}-{node_id}-handoff.md`를 작성한 경우:

1. 동일 브랜치(`crew/{runId}/{node_id}`)에 연속 에이전트를 재스폰한다
2. 핸드오프 노트를 새 에이전트 프롬프트에 포함한다
3. 새 에이전트가 이전 에이전트가 중단한 지점부터 계속한다

### Blocked Nodes (노드 실패)

노드가 실패하면:

1. `state.json`에서 `failed`로 표시하고 `completedAt` 타임스탬프를 기록한다
2. 사용자에게 세 가지 선택지를 제시한다:
   - **retry** — 에이전트를 재스폰한다
   - **skip** — 하류 조건부 노드도 함께 skipped 처리될 수 있다
   - **abort** — 실행을 중단한다

### Router Failure

router 노드가 유효한 출력을 결정하지 못하면:

- 조건부 하류 노드는 모두 `skipped` 처리한다
- 비조건부 하류 노드는 정상 진행한다

### Worktree Failure

`Agent(isolation: "worktree")` 호출이 실패하면:

1. 대기 중인 `.ai-crew/` 변경사항을 커밋한다 (더티 워킹 트리가 원인일 가능성)
2. `isolation: "worktree"`로 재시도한다
3. 재시도 실패 시 git 에러를 사용자에게 보고한다 — `isolation: none`으로 **절대 자동 폴백하지 않는다**

---

## 10. Critical Rules

`/crew:run` 실행기의 18개 핵심 규칙 요약:

| # | 규칙 | 설명 |
|---|------|------|
| 1 | 그래프가 진실의 원천 | `graph.yaml`에 정의된 노드만 실행한다 |
| 2 | 레벨 단위 실행 | 의존 노드가 완료되기 전에 절대 스폰하지 않는다 |
| 3 | Commit-before-spawn | worktree 생성 전 반드시 `.ai-crew/` 상태를 커밋한다 |
| 4 | Worktree 격리 | worker 노드는 기본적으로 `isolation: "worktree"` 사용. 자동 격리 해제 금지 |
| 5 | 동적 실행 전략 | INLINE/PARALLEL/TEAM은 노드 속성에 따라 런타임 결정. 번들 정체성 기반 아님 |
| 6 | 비-Claude 모델은 MCP 사용 | 외부 모델(codex 등)은 `agent_chat` MCP로 호출. `Agent()` 사용 금지 |
| 7 | Router 인라인 실행 | Team Lead가 직접 처리. worktree 생성 없음 |
| 8 | Aggregator wait 의미론 | `wait: all`과 `wait: any`를 엄격히 구분한다 |
| 9 | 조건은 비차단 | 조건이 false이면 `skipped` 처리. `failed`가 아님 |
| 10 | Scratchpad 추적 가능성 | `L{level}-{node_id}.md` 네이밍으로 순서와 노드별 추적 보장 |
| 11 | 원자적 상태 갱신 | 레벨 전후로 즉시 커밋. 스폰 전과 후 모두 |
| 12 | AIDLC 상태 동기화 | 매 레벨 완료 시 `aidlc-docs/aidlc-state.md` 갱신 |
| 13 | 에이전트 읽기/쓰기 분리 | `aidlc-docs/` 읽기 전용, `.ai-crew/scratchpad/` 쓰기 |
| 14 | Inception 패치 제한 | `pm_review`와 `design_gate` 노드만 ouroboros를 통해 inception 패치 가능 |
| 15 | Rebase 금지 | 에이전트는 merge만 사용한다 |
| 16 | 브랜치 네이밍 | 그래프 실행기 브랜치는 `crew/{runId}/{node_id}` 형식 |
| 17 | 이전 실행 컨텍스트 범위 | 동일 node_id와 실패 노드에 대해서만 주입. 무관한 노드 scratchpad 주입 금지 |
| 18 | 해시 기반 그래프 검증 | preflight 해시 일치 시 검증 생략. 변경 또는 미실행 시에만 폴백 검증 |

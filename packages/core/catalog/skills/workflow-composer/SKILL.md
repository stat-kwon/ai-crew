---
name: workflow-composer
description: |
  Graph 기반 워크플로우를 catalog에서 자동 조합합니다.
  사용자가 목표를 설명하면 registry를 읽어 agents/skills/hooks를 추천하고,
  node 구조(DAG)와 bundle.yaml(graph 섹션 포함)을 생성합니다.
  트리거: "워크플로우 만들어줘", "플러그인 조합해줘", "bundle 생성", "graph 구성",
  "어떤 agent 써야해", "crew 설정", "/crew:compose" 등
version: 1.0.0
---

# Workflow Composer Skill

## 언제 이 Skill이 적용되는가

- 사용자가 새 워크플로우 / 번들을 만들고 싶을 때
- 어떤 agents/skills 조합이 필요한지 모를 때
- 기존 pipeline → graph 구조로 전환하고 싶을 때
- `/crew:compose <goal>` 커맨드 실행 시

---

## Step 0: Catalog Discovery

**반드시 먼저 실행** — 사용자에게 무언가를 묻기 전에 catalog를 읽어 사용 가능한 항목을 파악한다.

```
1. Read: {ai-crew-root}/.claude-plugin/registry.json
   → catalog.agents[], catalog.skills[], catalog.hooks[] 목록 확보

2. 각 항목의 description 읽기:
   - agents: catalog/agents/{name}/.claude-plugin/plugin.json  → .description
   - skills: catalog/skills/{name}/SKILL.md                   → frontmatter .description
   - hooks:  catalog/hooks/{name}/.claude-plugin/plugin.json  → .description

3. 내부적으로 Catalog Map 구성:
   agents: { name → description }
   skills: { name → description }
   hooks:  { name → description }
```

> ai-crew-root는 registry.json 위치 기준으로 판단한다.
> 설치된 프로젝트라면 `.claude-plugin/registry.json` 또는
> `node_modules/ai-crew/.claude-plugin/registry.json` 위치를 탐색한다.

---

## Step 1: Goal Elicitation

Catalog Map을 확보한 후 사용자에게 **최대 3가지** 질문으로 목표를 파악한다.
질문이 많으면 사용자가 지치므로 핵심만 묻는다.

**필수 질문:**

```
Q1. 이 워크플로우가 해결하려는 문제/목표는 무엇인가요?
    (예: "PR 생성 시 보안 리뷰 → 테스트 → 배포 승인")

Q2. 주요 단계를 순서대로 나열하면? (대략적으로도 괜찮아요)
    (예: "분석 → 백엔드 구현 + 프론트 구현 → 통합 테스트")

Q3. 분기가 필요한가요?
    (예: "오류 종류에 따라 다른 agent가 처리해야 해" → router 노드 필요)
```

**응답 파싱 후 내부 메모:**
- 병렬 단계 식별: "동시에", "병렬로", "+ " 패턴
- 조건 분기 식별: "경우에 따라", "만약", "분기"
- fan-in 식별: 여러 병렬 단계 이후 합쳐지는 단계

---

## Step 2: Node 설계

### 2-1. Node Type 선택 규칙

| 타입 | 언제 사용 | 특징 |
|------|----------|------|
| `worker` | 실제 작업 수행 (기본값) | teammate로 spawn, worktree 가능 |
| `router` | 다음 경로를 결정 | 분기 조건 평가, isolation: none |
| `aggregator` | 여러 upstream 결과 취합 | wait: all\|any 설정 |

### 2-2. Agent-Skill 매핑 가이드

Catalog Map을 보고 목표에 가장 적합한 조합을 선택한다.

**일반 패턴:**
```
분석/계획    → agent: planner      + skills: [planning]
백엔드 구현  → agent: backend-dev  + skills: [backend-node, testing]
프론트 구현  → agent: frontend-dev + skills: [frontend-react, testing]
코드 리뷰    → agent: reviewer     + skills: [code-review]
QA/통합테스트→ agent: qa-engineer  + skills: [testing]
TDD 테스트   → agent: tester       + skills: [testing]
보안 검토    → agent: reviewer     + skills: [security-audit]
경로 결정    → agent: planner      + skills: [planning]  + type: router
```

> Catalog에 없는 agent/skill이 필요하면 사용자에게 알리고 가장 유사한 것을 제안한다.

### 2-3. Node 명명 규칙

- snake_case 사용: `plan`, `build_fe`, `security_check`
- 동사+목적어 형식 권장: `analyze`, `build_api`, `review_code`
- router 노드는 `route_` 또는 `triage` prefix 권장

---

## Step 3: Edge 설계

### 3-1. depends_on 규칙
- `depends_on`에 명시된 모든 노드가 완료(또는 skip)되어야 실행
- 빈 배열이거나 미설정이면 즉시 실행 (root 노드)

### 3-2. condition 규칙 (router 연결 시)
- upstream에 `router` 타입 노드가 있을 때만 사용
- 형식: `"{node_id}.output.{key} == '{value}'"`
- router 노드는 scratchpad에 반드시 아래 형식으로 output을 기록해야 함:
  ```json
  { "output": { "key": "value" } }
  ```
- condition이 false이면 해당 노드는 **skip** (error 아님)

### 3-3. wait 규칙 (aggregator)
- `wait: all` — 모든 depends_on 노드 완료 후 실행 (기본값)
- `wait: any` — depends_on 중 하나라도 완료되면 실행

### 3-4. 공통 패턴

```
순차:         A → B → C
병렬 fan-out: A → [B, C]  (B.depends_on: [A], C.depends_on: [A])
병렬 fan-in:  [B, C] → D  (D.depends_on: [B, C], type: aggregator)
조건 분기:    A(router) → B(condition: A.output.x == 'b')
                        → C(condition: A.output.x == 'c')
다이아몬드:   A → [B,C] → D  (가장 흔한 병렬 패턴)
```

---

## Step 4: Graph 검증

bundle.yaml을 생성하기 전에 반드시 아래를 확인한다.

```
[ ] 모든 node id가 고유한가
[ ] 모든 depends_on 참조가 실제 존재하는 node id인가
[ ] 사이클이 없는가 (A→B→A 같은 순환)
[ ] depends_on이 없는 root 노드가 최소 1개인가
[ ] 모든 agent가 catalog에 존재하는가
[ ] 모든 skills가 catalog에 존재하는가
[ ] condition은 반드시 upstream에 router 타입이 있는가
[ ] router 노드에 isolation: worktree가 설정되어 있지 않은가
[ ] aggregator가 아닌 노드에 wait가 설정되어 있지 않은가
```

오류 발견 시 사용자에게 알리고 수정 방향을 제안한다.

---

## Step 5: bundle.yaml 생성

검증 통과 후 아래 스키마에 맞춰 `catalog/bundles/{bundle-name}/bundle.yaml`을 생성한다.

```yaml
plugin:
  id: plugin.{bundle-name}
  name: {Human Readable Name}
  description: "{워크플로우 한 줄 설명}"
  version: "1.0.0"

defaults:
  model: claude-sonnet-4
  isolation: worktree       # node 레벨에서 override 가능
  rules: [global]
  mcp: []                   # 필요한 mcp 목록

includes:
  # graph에서 사용된 항목만 포함 (중복 없이)
  agents:   [...]
  skills:   [...]
  hooks:    [...]
  commands: [crew-elaborate, crew-run, crew-status, crew-checkpoint]

# ─── Graph Definition ────────────────────────────────────────────
graph:
  nodes:
    - id: {node_id}
      type: worker            # worker | router | aggregator
      agent: {agent_name}
      skills: [{skill_name}]
      hooks: []               # 생략 가능
      depends_on: []          # root 노드는 생략 또는 빈 배열
      # condition: "{upstream_id}.output.{key} == '{value}'"  # router 연결 시
      # wait: all             # aggregator 전용 (all | any)
      config:
        isolation: none       # router는 반드시 none
        # model: claude-opus-4  # 특별한 경우만 override

# ─── Backward Compatibility ──────────────────────────────────────
# graph가 있으면 pipeline은 무시됨. 하지만 legacy 실행을 위해 유지 가능.
# pipeline: []
```

**파일 생성 후:**
1. 생성된 bundle.yaml의 graph를 ASCII 다이어그램으로 시각화해서 사용자에게 보여준다
2. 다음 단계 안내:
   ```
   ✅ Bundle 생성 완료: catalog/bundles/{name}/bundle.yaml

   다음 단계:
   1. make validate          → 스키마 검증
   2. make registry          → registry.json 업데이트
   3. ai-crew install --team {name}  → 프로젝트에 설치
   ```

---

## Graph 시각화 형식

생성 후 반드시 ASCII로 그래프를 보여준다:

```
예시) fullstack-secure 번들

[plan] ──────────────────────────────┐
    ↓                                │
[build_fe] ←── depends_on: [plan]   │  (병렬)
[build_be] ←── depends_on: [plan]   │  (병렬)
    ↓ ↓  (aggregator, wait: all)    │
[security_check] ←── depends_on: [build_fe, build_be]
    ↓
[review] ←── depends_on: [security_check]
```

```
예시) 조건 분기 (incident-response)

[triage] (router)
    ├─ output.domain == 'airflow' ──→ [fix_dag]
    ├─ output.domain == 'query'  ──→ [fix_query]  (병렬 실행)
    └─ output.domain == 'infra'  ──→ [fix_infra]
                                          ↓ (aggregator, wait: any)
                                      [verify]
```

---

## 제약 및 주의사항

- **catalog에 없는 항목은 사용 불가.** 필요하면 먼저 catalog에 추가하도록 안내.
- **router 노드는 코드를 작성하지 않는다.** 분석/판단만 수행하고 output을 scratchpad에 기록.
- **skills는 해당 노드의 작업에 직접 관련된 것만** 포함. 모든 skill을 다 넣지 않는다.
- **graph와 pipeline이 공존하면 graph가 우선**이다. 실행 엔진이 graph 섹션 존재 여부로 판단.
- **bundle name**은 kebab-case, 목적을 나타내는 명사구 (예: `data-platform`, `incident-response`)

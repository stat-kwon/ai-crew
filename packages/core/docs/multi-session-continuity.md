# 멀티 세션 연속성

> 반복 실행(re-run) 시 이전 실행의 컨텍스트를 보존하고 주입하는 메커니즘

---

## 1. 문제

ai-crew를 반복 실행하면 세 가지 문제가 발생한다:

1. **scratchpad 덮어쓰기** — 새 run이 `.ai-crew/scratchpad/`에 쓰면 이전 run의 산출물이 사라진다.
2. **실행 이력 부재** — 과거에 어떤 run이 있었는지, 각 run의 결과가 무엇이었는지 기록이 없다.
3. **에이전트 컨텍스트 단절** — 같은 노드를 재실행할 때 이전 실행의 결정, 실패 원인 등을 알 수 없다.

---

## 2. 해결

Run 단위 아카이브와 manifest 기반 컨텍스트 주입으로 해결한다:

```
이전 run 완료 → preflight Step 0.5 → scratchpad/ + checkpoints/ 아카이브
                                    → manifest.json 생성
                                    → runs.json 갱신
새 run 시작   → run Step 4         → 이전 manifest 로드
                                    → 에이전트 프롬프트에 컨텍스트 주입
```

---

## 3. Run ID 전략

형식: `{intent-slug}-{YYYYMMDD}-{seq}`

| 요소 | 규칙 |
|------|------|
| `intent-slug` | 사용자 입력을 slugify: 소문자, 비영숫자는 하이픈으로 치환, 앞뒤 하이픈 제거, 최대 30자 |
| `YYYYMMDD` | run 생성일 |
| `seq` | 같은 slug+date 조합이 `runs.json`에 이미 존재하면 순번 증가 |

slugify 구현 (`src/run-history.ts`):

```typescript
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}
```

예시:
- `"initial build"` → `initial-build-20260324-1`
- `"Fix auth bug!"` → `fix-auth-bug-20260324-1`
- 같은 날 두 번째: `fix-auth-bug-20260324-2`

---

## 4. RunManifest 스키마

각 run의 전체 스냅샷을 저장하는 canonical 레코드. `.ai-crew/runs/{runId}/manifest.json`에 기록된다.

```typescript
interface RunManifest {
  schema: "ai-crew.run.v1";
  runId: string;

  intent: {
    description: string;  // 사용자가 입력한 원문
    slug: string;          // slugify된 값
    source: "user" | "aidlc" | "auto";
  };

  context: {
    bundleName: string;
    graphHash: string;       // graph.yaml의 SHA-256
    graphNodeCount: number;
    graphLevelCount: number;
    model: string;           // 기본 모델
    locale: string;
  };

  timeline: {
    createdAt: string;       // ISO 8601
    startedAt: string | null;
    completedAt: string | null;
  };

  state: "preparing" | "running" | "completed" | "failed" | "archived";

  outcome: {
    nodesCompleted: string[];
    nodesFailed: string[];
    nodesSkipped: string[];
    summary: string[];
    issues: string[];
  } | null;

  nodeSummaries: Record<string, NodeSummary>;
}

interface NodeSummary {
  nodeId: string;
  agent: string;
  status: "completed" | "failed" | "skipped";
  duration: string;          // e.g. "3m 42s"
  filesChanged: string[];
  keyDecisions: string[];    // scratchpad의 ## How 섹션에서 추출
}
```

---

## 5. RunRegistry 스키마

`.ai-crew/runs.json` — 전체 실행 이력의 인덱스 파일.

```typescript
interface RunRegistry {
  schema: "ai-crew.runs.v1";
  current: string | null;        // 현재 활성 run ID
  runs: RunIndexEntry[];
  stats: {
    totalRuns: number;
    totalCompleted: number;
    totalFailed: number;
  };
}

interface RunIndexEntry {
  runId: string;
  intent: string;
  state: "preparing" | "running" | "completed" | "failed" | "archived";
  createdAt: string;
  completedAt: string | null;
  nodesTotal: number;
  nodesCompleted: number;
  nodesFailed: number;
}
```

`RunIndexEntry`는 manifest의 경량 요약이다. 전체 manifest를 로드하지 않고도 실행 이력을 빠르게 조회할 수 있다.

---

## 6. 아카이빙 흐름

`/crew:preflight` Step 0.5에서 실행된다. 9단계로 구성된다:

1. **이전 run 감지** — `state.json`에서 `completed` 또는 `failed` 노드가 있는지 확인한다.
2. **Intent 질문** — 사용자에게 새 run의 목적을 질문한다.
3. **Run ID 생성** — 사용자 입력을 slugify하여 `{slug}-{YYYYMMDD}-{seq}` 형식으로 생성한다.
4. **Manifest 생성** — 현재 `state.json`에서 노드 결과를 읽고, scratchpad의 `## How` 섹션에서 `keyDecisions`를 추출하여 `RunManifest`를 구성한다.
5. **아카이브 실행** — scratchpad/와 checkpoints/를 `.ai-crew/runs/{prevRunId}/`로 이동(move, 복사 아님)한다. `state.json`은 복사하여 `state-snapshot.json`으로 저장한다.
6. **Registry 갱신** — `runs.json`에 이전 run을 `archived`로, 새 run을 `preparing`으로 기록한다.
7. **보관 정책 적용** — 아카이브된 run이 retention 한도를 초과하면 가장 오래된 것부터 삭제한다.
8. **state.json 초기화** — 새 `runId` 설정, 버전을 `"3.1"`로 갱신, 모든 노드를 `"pending"`으로 리셋한다.
9. **요약 출력** — `"Archived: {prevRunId} ({N} completed, {M} failed)"`를 표시한다.

디스크 절약을 위해 scratchpad와 checkpoints는 복사가 아닌 이동(`mv`)을 사용한다.

---

## 7. 컨텍스트 주입 규칙

`/crew:run` Step 4에서 에이전트 프롬프트를 구성할 때 이전 run의 컨텍스트를 주입한다. 4가지 규칙이 적용된다:

### 규칙 1: 같은 노드 재실행

이전 manifest의 `nodeSummaries`에 현재 `node_id`가 있으면 해당 요약을 주입한다:

- status, filesChanged, keyDecisions를 포함
- 이전 실행이 `failed`였으면 실패 원인을 반드시 포함 (scratchpad의 Result 섹션에서 추출)
- 전체 scratchpad 내용이 아닌 요약만 주입. 전체 파일 경로(`runs/{prevRunId}/scratchpad/L{N}-{node_id}.md`)를 제공하여 필요 시 에이전트가 직접 읽을 수 있게 한다.

### 규칙 2: 새 노드

현재 `node_id`가 이전 manifest에 없으면 "이 노드는 이전 run에 없었음"을 명시한다. 불필요한 컨텍스트를 주입하지 않는다.

### 규칙 3: 그래프 구조 변경

현재 `graph.yaml`의 노드 목록과 이전 manifest의 `context` 를 비교하여 추가/삭제된 노드를 알린다. 변경이 없으면 이 섹션을 생략한다.

### 규칙 4: 주입하지 않는 것

- 전체 실행 이력 테이블 (이는 `/crew:status`용)
- 관련 없는 노드의 scratchpad (현재 노드 또는 의존 노드가 아닌 것)
- 전체 scratchpad 내용 (요약으로 충분하며, 경로만 제공)

---

## 8. 보관 정책

`config.yaml`의 `defaults.runs.retention`으로 설정한다. 기본값은 `5`.

```yaml
defaults:
  runs:
    retention: 5        # 최대 보관 run 수
    auto_archive: true  # 새 run 시작 시 자동 아카이브
    context_depth: 1    # 이전 run 컨텍스트 제공 깊이
```

보관 정책 적용 시점: `/crew:preflight` Step 0.5.7에서 아카이브 직후 실행. 아카이브된 run이 retention을 초과하면 `createdAt` 기준 오래된 순으로 삭제한다. 삭제된 run은 `runs.json`에서도 제거된다.

---

## 9. 하위 호환

v3.0(`state.json`에 `runId` 필드 없음)에서 v3.1로 자연스럽게 전환된다:

- preflight Step 0.5에서 `state.json`에 `completed`/`failed` 노드가 있지만 `runId`가 없으면, 해당 run을 `legacy-{YYYYMMDD}-1` 형태로 아카이브한다.
- `runId`가 없는 `state.json`은 v3.0으로 간주한다.
- v3.0 상태 파일을 읽는 모든 코드는 `runId` 필드를 optional로 처리한다 (`runId?: string`).
- `runs.json`이 없으면 빈 registry(`emptyRegistry()`)를 생성하여 반환한다.

# 상태 관리

> 파일 기반 상태 관리 아키텍처

---

## 1. 개요

ai-crew는 파일 기반으로 상태를 관리한다. SQLite 같은 임베디드 DB를 사용하지 않는 이유:

- 에이전트는 프롬프트 기반으로 실행된다. 파일 읽기/쓰기는 가능하지만 DB 쿼리는 불가하다.
- git 워킹 트리에서 에이전트가 독립 실행되므로 파일 시스템이 공유 인터페이스다.
- JSON 파일은 git diff로 변경 이력을 추적할 수 있다.

상태 파일은 모두 `.ai-crew/` 디렉토리에 저장되며, 원자적 쓰기(atomic write) 패턴으로 데이터 무결성을 보장한다.

---

## 2. state.json

그래프 실행 상태의 중심 파일. `/crew:run`이 주요 갱신 주체다.

```typescript
interface GraphState {
  version: "3.0" | "3.1";
  bundleName: string;
  runId?: string;          // v3.1에서 추가. v3.0에서는 없음.
  preflight?: PreflightState;
  nodes: Record<string, NodeState>;
}

interface PreflightState {
  completedAt: string;
  modelsVerified: string[];
  modelsSkipped: string[];
  gitClean: boolean;
  graphHash: string;       // graph.yaml의 SHA-256
}

interface NodeState {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
}
```

버전 변경 이력:

| 버전 | 변경사항 |
|------|----------|
| `3.0` | 초기 버전. `bundleName`, `nodes`, 선택적 `preflight` |
| `3.1` | `runId` 필드 추가. preflight Step 0.5에서 설정 |

`state.json`은 두 시점에 갱신된다:
1. **레벨 실행 전** — 해당 레벨 노드를 `running`으로 마킹, `startedAt` 기록
2. **레벨 실행 후** — 노드를 `completed`/`failed`로 마킹, `completedAt` 기록

---

## 3. config.yaml

번들 설정과 기본값. 설치 시 생성되며, preflight에서 번들명만 수정할 수 있다.

```yaml
# 번들 설치 시
version: "3.0"
bundle: aidlc-standard
workflow: aidlc
defaults:
  model: claude-sonnet-4
  isolation: worktree
  rules: [global]
  mcp: [multi-provider]
  locale: "en"

# 미니멀 설치 시 (--team 생략)
version: "3.0"
bundle: "none"
defaults:
  model: claude-sonnet-4
  isolation: worktree
  rules: [global]
  locale: "en"
```

`bundle: "none"`은 미니멀 설치를 나타낸다. 이 경우 에이전트/스킬은 설치되지 않으며, `/crew:preflight`가 `catalog-manifest.json`을 기반으로 동적 프로비저닝한다.

```typescript
interface BundleDefaults {
  model: string;
  isolation: "worktree" | "none";
  rules: string[];
  mcp: string[];
  merge_mode?: "auto" | "manual";
  locale?: string;
}
```

runs 관련 설정도 defaults에 포함할 수 있다:

```typescript
interface RunsConfig {
  retention: number;       // 최대 보관 run 수 (기본: 5)
  auto_archive: boolean;   // 새 run 시 자동 아카이브
  context_depth: number;   // 이전 run 컨텍스트 깊이 (기본: 1)
}
```

---

## 4. runs.json

실행 이력 레지스트리. 전체 run의 인덱스를 관리한다.

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

`runs.json`이 없으면 `emptyRegistry()`로 빈 레지스트리를 생성한다. 하위 호환을 위해 파일 부재를 오류로 처리하지 않는다.

---

## 5. manifest.json

아카이브된 run별 전체 스냅샷. `.ai-crew/runs/{runId}/manifest.json`에 저장된다.

```typescript
interface RunManifest {
  schema: "ai-crew.run.v1";
  runId: string;

  intent: {
    description: string;
    slug: string;
    source: "user" | "aidlc" | "auto";
  };

  context: {
    bundleName: string;
    graphHash: string;
    graphNodeCount: number;
    graphLevelCount: number;
    model: string;
    locale: string;
  };

  timeline: {
    createdAt: string;
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
```

manifest는 아카이브 시 `state`가 `"archived"`로 설정된다. `/crew:run` Step 0.3.5에서 이전 run의 manifest를 로드하여 에이전트 컨텍스트 주입에 사용한다.

---

## 6. project-context.json

프로젝트 수준의 누적 컨텍스트. 에이전트가 발견한 기술 스택, 패턴, 학습 노트를 저장한다.

```typescript
interface ProjectContext {
  techStack: string[];
  patterns: string[];
  agentNotes: Record<string, string[] | Record<string, string[]>>;
  lastRunAt: string;
  updatedAt: string;
}
```

`agentNotes`는 두 가지 형식을 지원한다:

| 형식 | 구조 | 사용 시점 |
|------|------|-----------|
| legacy (v3.0) | `{ "node_id": ["note1", "note2"] }` | `runId` 없이 기록된 노트 |
| v3.1 | `{ "node_id": { "run-id-1": ["note1"], "run-id-2": ["note2"] } }` | run 단위로 스코핑된 노트 |

`mergeAgentLearning()` 함수는 두 형식을 모두 처리한다. runId가 없는 API 호출은 `_unscoped` 키에 기록된다.

---

## 7. memory.json

노드 간 공유 메모리. 같은 레벨 또는 상위 레벨 노드의 출력을 하위 노드가 읽을 수 있다.

```typescript
interface SharedMemoryStore {
  version: string;           // "1.0"
  nodes: Record<string, Record<string, unknown>>;
  updatedAt: string;
}
```

주요 API:

| 함수 | 동작 |
|------|------|
| `writeNodeOutput(crewDir, nodeId, data)` | 노드 출력 저장 (read-modify-write) |
| `readNodeOutput(crewDir, nodeId)` | 단일 노드 출력 읽기 |
| `readDependencyOutputs(crewDir, dependsOn)` | 의존 노드들의 출력 일괄 읽기 |
| `clearMemory(crewDir)` | 전체 메모리 삭제 |

동시성 참고: 같은 레벨의 노드는 서로 다른 키에 쓰므로 키 충돌은 없다. 단, read-modify-write 사이클에 파일 수준 잠금이 없으므로 마지막 쓰기가 이긴다. 실무에서는 레벨별 순차 실행이므로 문제가 되지 않는다.

---

## 8. checkpoints/

레벨별 상태 스냅샷. `state.json`과 `memory.json`의 특정 시점 복사본을 저장한다.

```
.ai-crew/checkpoints/
├── level-000.json
├── level-001.json
└── level-002.json
```

```typescript
interface CheckpointData {
  level: number;
  createdAt: string;
  state: GraphState;
  memory: SharedMemoryStore;
}

interface CheckpointInfo {
  level: number;
  path: string;
  createdAt: string;
}
```

주요 API:

| 함수 | 동작 |
|------|------|
| `createCheckpoint(crewDir, level)` | 현재 state + memory 스냅샷 생성 |
| `listCheckpoints(crewDir)` | 모든 체크포인트 목록 (레벨 오름차순) |
| `restoreCheckpoint(checkpointPath, crewDir)` | 체크포인트에서 state.json + memory.json 복원 |

복원 시 기존 `state.json`과 `memory.json`은 `.bak` 파일로 백업된다. 복원 순서는 memory 먼저, state 나중이다 -- state가 더 권한적(authoritative)이므로 부분 실패 시 이전 state가 남아있는 것이 더 안전하다.

---

## 9. 원자적 쓰기

모든 JSON 상태 파일은 temp-file-then-rename 패턴으로 작성된다:

```typescript
async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmpFile = join(dirname(filePath), `.checkpoint-${randomUUID()}.tmp`);
  try {
    await writeFile(tmpFile, JSON.stringify(data, null, 2) + "\n", "utf-8");
    await rename(tmpFile, filePath);  // rename은 같은 파일시스템에서 원자적
  } catch (err) {
    try {
      await rm(tmpFile, { force: true });
    } catch {
      // 정리 실패 무시
    }
    throw err;
  }
}
```

이 패턴이 보장하는 것:
- 프로세스가 쓰기 중 중단되어도 원본 파일이 손상되지 않는다.
- `rename()`은 같은 파일 시스템에서 원자적 연산이다.
- 임시 파일 이름에 UUID를 사용하여 충돌을 방지한다.
- 실패 시 임시 파일을 best-effort로 정리한다.

이 패턴은 `checkpoint.ts`, `run-history.ts`, `shared-memory.ts` 세 모듈에서 동일하게 사용된다.

---

## 10. 상태 파일 요약 표

| 파일 | 경로 | 목적 | 주요 갱신 주체 | 수명 |
|------|------|------|---------------|------|
| state.json | `.ai-crew/state.json` | 그래프 노드 실행 상태 | `/crew:run`, `/crew:preflight` | run 단위 (아카이브 시 리셋) |
| config.yaml | `.ai-crew/config.yaml` | 번들 설정, 기본값 | `ai-crew install`, `/crew:preflight` | 프로젝트 전체 |
| graph.yaml | `.ai-crew/graph.yaml` | 그래프 노드 정의 | `ai-crew install`, `/crew:preflight` | 프로젝트 전체 |
| runs.json | `.ai-crew/runs.json` | 실행 이력 레지스트리 | `/crew:preflight` (Step 0.5) | 프로젝트 전체 |
| manifest.json | `.ai-crew/runs/{runId}/manifest.json` | 개별 run 스냅샷 | `/crew:preflight` (아카이브 시) | 보관 정책에 따라 삭제 |
| project-context.json | `.ai-crew/project-context.json` | 누적 프로젝트 컨텍스트 | 에이전트 (`mergeAgentLearning`) | 프로젝트 전체 |
| memory.json | `.ai-crew/memory.json` | 노드 간 공유 메모리 | 에이전트 (`writeNodeOutput`) | run 단위 (아카이브 시 이동) |
| level-NNN.json | `.ai-crew/checkpoints/level-NNN.json` | 레벨별 상태 스냅샷 | `/crew:run` (레벨 완료 시) | run 단위 (아카이브 시 이동) |
| state-snapshot.json | `.ai-crew/runs/{runId}/state-snapshot.json` | 아카이브된 state.json 복사본 | `/crew:preflight` (아카이브 시) | 보관 정책에 따라 삭제 |
| catalog-manifest.json | `.ai-crew/catalog-manifest.json` | 카탈로그 컴포넌트 인덱스 (에이전트, 스킬, 번들) | `ai-crew install` | 프로젝트 전체 |
| install-state.json | `.ai-crew/install-state.json` | 설치 기록 (doctor/uninstall용) | `ai-crew install` | 프로젝트 전체 |

# Component Methods — 상세 시그니처

## C-TYPES 확장 (src/types.ts)

### GraphNode 확장 필드
```typescript
export interface GraphNodeConfig {
  isolation?: "worktree" | "none";
  model?: string;
  retry?: number;        // NEW: 재시도 횟수 (기본: 0, 최대: 3)
}

export interface GraphNode {
  // ... 기존 필드 유지
  verify?: VerifyCheck[];  // NEW: 선택적 검증 항목
}

export type VerifyCheck = "test" | "lint" | "build" | string; // 커스텀 검증도 가능
```

### 신규 타입
```typescript
// ── Validation ──
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
export interface ValidationError {
  path: string;      // e.g. "graph.nodes[0].verify"
  message: string;
  severity: "error" | "warning";
}

// ── Install State ──
export interface InstallState {
  version: string;
  bundleName: string;
  installedAt: string;       // ISO timestamp
  targetPath: string;
  files: string[];           // 설치된 파일 상대 경로 목록
  graphNodes: number;
  workflowSource: string | null;
}
export interface DiagnosticResult {
  healthy: boolean;
  missingFiles: string[];
  extraFiles: string[];
  configMismatch: string[];
}
export interface UninstallResult {
  filesRemoved: number;
  dirsRemoved: number;
}

// ── Verification ──
export interface VerificationResult {
  passed: boolean;
  checks: VerifyCheckResult[];
}
export interface VerifyCheckResult {
  check: string;
  passed: boolean;
  output?: string;
  durationMs: number;
}

// ── Shared Memory ──
export interface SharedMemoryStore {
  version: string;
  nodes: Record<string, Record<string, unknown>>;
  updatedAt: string;
}

// ── Checkpoint ──
export interface CheckpointData {
  level: number;
  createdAt: string;
  state: GraphState;
  memory: SharedMemoryStore;
}
export interface CheckpointInfo {
  level: number;
  path: string;
  createdAt: string;
}

// ── Session Context ──
export interface ProjectContext {
  techStack: string[];
  patterns: string[];
  agentNotes: Record<string, string[]>; // nodeId → 학습 내용
  lastRunAt: string;
  updatedAt: string;
}
```

---

## C-VALIDATOR (src/validator.ts)

```typescript
/** bundle.yaml 검증 */
export function validateBundleConfig(data: unknown): ValidationResult
// 필수 필드: plugin.id, plugin.name, defaults.model, includes, graph
// 선택 필드: workflow, aidlc, defaults.locale
// graph.nodes[].verify는 string[] 타입이어야 함
// graph.nodes[].config.retry는 0-3 범위

/** graph.yaml 검증 */
export function validateGraphYaml(data: unknown): ValidationResult
// graph.nodes 배열 필수
// 각 노드: id, type, agent, depends_on 필수
// type이 "router"면 config.isolation === "none"
// type이 "aggregator"면 wait 필수

/** plugin.json 검증 */
export function validatePluginJson(data: unknown): ValidationResult
// name, description 필수

/** hooks.json 검증 */
export function validateHooksJson(data: unknown): ValidationResult
// hooks 객체 필수
// 각 이벤트는 알려진 훅 이벤트 타입이어야 함

/** state.json 검증 */
export function validateStateJson(data: unknown): ValidationResult
// version, bundleName, nodes 필수
// 각 노드: status는 유효한 값
```

---

## C-INSTALL-STATE (src/install-state.ts)

```typescript
/** 설치 내역 기록 */
export async function recordInstall(
  targetPath: string,
  result: InstallResult,
  installedFiles: string[]
): Promise<void>
// .ai-crew/install-state.json에 기록
// 이미 존재하면 덮어쓰기

/** 설치 상태 읽기 */
export async function readInstallState(
  targetPath: string
): Promise<InstallState | null>
// 없으면 null 반환

/** 진단: 설치된 파일 누락/불일치 체크 */
export async function diagnose(
  targetPath: string
): Promise<DiagnosticResult>
// install-state.json의 파일 목록 vs 실제 파일 시스템 비교
// 결과: missingFiles, extraFiles, configMismatch

/** 제거: install-state 기반 파일 삭제 */
export async function uninstall(
  targetPath: string
): Promise<UninstallResult>
// install-state.json의 파일 목록을 역순으로 삭제
// 빈 디렉토리 정리
// install-state.json 자체도 삭제
```

---

## C-VERIFIER (src/verifier.ts)

```typescript
/** 기본 검증 커맨드 매핑 */
export function getDefaultCommands(): Record<string, string>
// { test: "npm test", lint: "npm run lint", build: "npm run build" }

/** 노드 검증 실행 */
export async function verifyNode(
  nodeId: string,
  checks: VerifyCheck[],
  workDir: string,
  customCommands?: Record<string, string>,
  timeoutMs?: number  // 기본: 60000 (60초)
): Promise<VerificationResult>
// 각 check에 대해:
//   1. 커맨드 결정 (커스텀 > 기본)
//   2. child_process.exec으로 실행 (타임아웃: timeoutMs, 기본 60초)
//   3. 결과 수집 (pass/fail, output, duration)
// 하나라도 실패하면 전체 passed=false
// 타임아웃 초과 시 해당 check는 failed + "timeout" output
```

---

## C-SHARED-MEMORY (src/shared-memory.ts)

```typescript
/** 노드 출력 쓰기 (원자적) */
export async function writeNodeOutput(
  crewDir: string,
  nodeId: string,
  data: Record<string, unknown>
): Promise<void>
// .ai-crew/shared-memory.json 읽기 → 머지 → 쓰기
// 파일 잠금: write-to-temp → rename 패턴

/** 노드 출력 읽기 */
export async function readNodeOutput(
  crewDir: string,
  nodeId: string
): Promise<Record<string, unknown> | null>

/** 의존 노드 출력 일괄 읽기 */
export async function readDependencyOutputs(
  crewDir: string,
  dependsOn: string[]
): Promise<Record<string, Record<string, unknown>>>
// 각 의존 노드의 출력을 { nodeId: data } 형태로 반환

/** 메모리 초기화 */
export async function clearMemory(crewDir: string): Promise<void>

// 동시성 설계 노트:
// - 각 노드는 자신의 nodeId를 키로만 쓰기 → 키 수준 충돌 없음
// - 읽기는 항상 안전 (JSON 파싱은 원자적 파일 단위)
// - 쓰기는 read → merge → write-to-temp → rename 패턴
// - 같은 레벨에서 병렬 노드가 동시에 쓸 수 있으나 키가 겹치지 않으므로 last-write-wins로 안전
```

---

## C-CHECKPOINT (src/checkpoint.ts)

```typescript
/** 체크포인트 생성 */
export async function createCheckpoint(
  crewDir: string,
  level: number
): Promise<string>
// state.json + shared-memory.json 읽어서 합침
// .ai-crew/checkpoints/level-{N}.json에 저장
// 반환: 체크포인트 파일 경로

/** 체크포인트 목록 */
export async function listCheckpoints(
  crewDir: string
): Promise<CheckpointInfo[]>
// .ai-crew/checkpoints/ 디렉토리 스캔
// 레벨 순 정렬

/** 체크포인트 복원 */
export async function restoreCheckpoint(
  checkpointPath: string,
  crewDir: string
): Promise<void>
// 체크포인트에서 state.json + shared-memory.json 복원
// 기존 파일 백업 후 덮어쓰기
```

---

## C-SESSION-CONTEXT (src/session-context.ts)

```typescript
/** 프로젝트 컨텍스트 저장 */
export async function saveContext(
  crewDir: string,
  context: ProjectContext
): Promise<void>
// .ai-crew/project-context.json에 저장

/** 프로젝트 컨텍스트 로드 */
export async function loadContext(
  crewDir: string
): Promise<ProjectContext | null>
// 없으면 null

/** 에이전트 학습 내용 추가 (머지) */
export async function mergeAgentLearning(
  crewDir: string,
  nodeId: string,
  learning: string
): Promise<void>
// 기존 컨텍스트 로드 → agentNotes[nodeId].push(learning) → 저장
```

---

## C-CLI 확장 (src/cli.ts)

```typescript
// 새 커맨드 추가:

program.command("doctor")
  // 옵션: --target <path> (기본: cwd)
  // 동작: readInstallState → diagnose → 결과 출력
  // 출력: 건강 상태, 누락 파일, 불일치 목록

program.command("uninstall")
  // 옵션: --target <path> (기본: cwd)
  // 동작: readInstallState → uninstall → 결과 출력
  // 확인: "정말 삭제하시겠습니까?" 프롬프트

program.command("validate")
  // 옵션: --target <path> (기본: cwd)
  // 동작: .ai-crew/ 디렉토리의 모든 설정 파일 스키마 검증
  // 출력: 검증 결과 (에러/경고 목록)
```

---

## C-GRAPH 확장 (src/graph.ts)

```typescript
// validateGraph() 확장:
// - verify 필드가 있으면 string[] 타입 검증
// - config.retry가 있으면 0-3 범위 검증
```

---

## C-INSTALLER 확장 (src/installer.ts)

```typescript
// install() 함수 마지막에 추가:
// - 설치된 파일 목록 수집
// - recordInstall(targetPath, result, files) 호출
```

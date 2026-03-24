# Components — ai-crew 코어 강화

## 기존 컴포넌트 (수정 대상)

### C-CLI: CLI Entry Point
- **파일**: `src/cli.ts`
- **현재 책임**: install, list, status, mcp 커맨드
- **변경**: doctor, uninstall, validate 커맨드 추가
- **인터페이스**: commander.js Command 체인

### C-INSTALLER: Bundle Installer
- **파일**: `src/installer.ts`
- **현재 책임**: 번들 로드 → 검증 → 파일 복사 → 설정 머지
- **변경**: 설치 완료 후 install-state 기록 호출
- **인터페이스**: `install(bundleName, targetPath, options) → InstallResult`

### C-GRAPH: Graph Engine
- **파일**: `src/graph.ts`
- **현재 책임**: DAG 검증 + 토폴로지 소트
- **변경**: 새 필드(verify, retry) 검증 로직 추가
- **인터페이스**: `validateGraph(nodes)`, `topoSort(nodes) → GraphLevel[]`

### C-TYPES: Type Definitions
- **파일**: `src/types.ts`
- **현재 책임**: 모든 TypeScript 인터페이스/타입 정의
- **변경**: GraphNode 확장(verify, retry), 새 타입 추가(InstallState, SharedMemory, Checkpoint 등)

### C-INDEX: Public API
- **파일**: `src/index.ts`
- **현재 책임**: 모든 public export 집합
- **변경**: 새 모듈의 export 추가

---

## 신규 컴포넌트

### C-VALIDATOR: Schema Validator
- **파일**: `src/validator.ts`
- **책임**: bundle.yaml, graph.yaml, plugin.json, hooks.json, state.json의 구조 검증
- **설계 원칙**: 스키마를 JSON Schema 형식으로 정의, 런타임 검증은 ajv 없이 순수 TypeScript로 구현 (외부 의존성 최소화)
- **인터페이스**:
  - `validateBundle(data: unknown): ValidationResult`
  - `validateGraph(data: unknown): ValidationResult`
  - `validatePluginJson(data: unknown): ValidationResult`
  - `validateHooksJson(data: unknown): ValidationResult`
  - `validateState(data: unknown): ValidationResult`

### C-INSTALL-STATE: Install State Tracker
- **파일**: `src/install-state.ts`
- **책임**: 설치 내역 기록/조회/진단/제거
- **데이터**: `~/.ai-crew/install-state.json` (전역) 또는 `.ai-crew/install-state.json` (프로젝트)
- **인터페이스**:
  - `recordInstall(result: InstallResult, files: string[]): Promise<void>`
  - `readInstallState(targetPath: string): Promise<InstallState | null>`
  - `diagnose(targetPath: string): Promise<DiagnosticResult>`
  - `uninstall(targetPath: string): Promise<UninstallResult>`

### C-VERIFIER: Node Completion Verifier
- **파일**: `src/verifier.ts`
- **책임**: 그래프 노드 완료 시 선택적 검증 실행
- **설계 원칙**: verify 필드가 있는 노드만 검증, 없으면 패스
- **인터페이스**:
  - `verifyNode(nodeId: string, checks: string[], workDir: string): Promise<VerificationResult>`
  - `getDefaultCommands(): Record<string, string>` (test → npm test, lint → npm run lint, build → npm run build)

### C-SHARED-MEMORY: Agent Shared Memory
- **파일**: `src/shared-memory.ts`
- **책임**: 에이전트 간 구조화된 상태 읽기/쓰기
- **데이터**: `.ai-crew/shared-memory.json`
- **설계 원칙**: 노드 ID를 키로, JSON 직렬화 가능한 값을 저장. 파일 단위 원자적 쓰기.
- **인터페이스**:
  - `writeNodeOutput(nodeId: string, data: Record<string, unknown>): Promise<void>`
  - `readNodeOutput(nodeId: string): Promise<Record<string, unknown> | null>`
  - `readDependencyOutputs(dependsOn: string[]): Promise<Record<string, Record<string, unknown>>>`
  - `clear(): Promise<void>`

### C-CHECKPOINT: Automatic Checkpoint
- **파일**: `src/checkpoint.ts`
- **책임**: 레벨 완료 시 자동 체크포인트 생성, 복원
- **데이터**: `.ai-crew/checkpoints/level-{N}.json`
- **설계 원칙**: state.json + shared-memory.json의 스냅샷 저장
- **인터페이스**:
  - `createCheckpoint(level: number, state: GraphState, memory: Record<string, unknown>): Promise<string>`
  - `listCheckpoints(crewDir: string): Promise<CheckpointInfo[]>`
  - `restoreCheckpoint(checkpointPath: string, crewDir: string): Promise<void>`

### C-AGENT-PARSER: Agent Frontmatter Parser
- **파일**: `src/resolver.ts` (기존 모듈 확장)
- **책임**: 에이전트 .md 파일의 YAML 프론트매터에서 model 필드 파싱
- **설계 원칙**: resolver.ts가 이미 에이전트 파일을 처리하므로 여기에 파서 추가. 별도 모듈 불필요.
- **인터페이스**:
  - `parseAgentFrontmatter(agentMdPath: string): Promise<{ model?: string }>`
  - 모델 우선순위 해결: graph.yaml config.model > 에이전트 프론트매터 model > bundle defaults.model

### C-SESSION-CONTEXT: Project Context Cache
- **파일**: `src/session-context.ts`
- **책임**: 프로젝트 컨텍스트(기술 스택, 패턴, 에이전트 메모)를 저장/로드
- **데이터**: `.ai-crew/project-context.json`
- **설계 원칙**: 그래프 실행 완료 후 자동 저장, 다음 실행 시 자동 로드
- **인터페이스**:
  - `saveContext(context: ProjectContext): Promise<void>`
  - `loadContext(crewDir: string): Promise<ProjectContext | null>`
  - `mergeAgentLearning(nodeId: string, learning: string): Promise<void>`

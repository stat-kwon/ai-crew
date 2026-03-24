# Component Dependencies

## 의존성 매트릭스

| Component | 의존 대상 | 의존 이유 |
|-----------|----------|----------|
| **C-CLI** | C-INSTALLER, C-INSTALL-STATE, C-VALIDATOR | 커맨드 실행 시 호출 |
| **C-INSTALLER** | C-RESOLVER, C-GRAPH, C-VALIDATOR, C-INSTALL-STATE | 설치 파이프라인 |
| **C-GRAPH** | C-TYPES | GraphNode 타입 사용 |
| **C-VALIDATOR** | C-TYPES | 타입 정의 참조 |
| **C-INSTALL-STATE** | C-TYPES | InstallState, DiagnosticResult 타입 |
| **C-VERIFIER** | C-TYPES | VerificationResult 타입 |
| **C-SHARED-MEMORY** | C-TYPES | SharedMemoryStore 타입 |
| **C-CHECKPOINT** | C-TYPES, C-SHARED-MEMORY | GraphState + SharedMemory 스냅샷 |
| **C-SESSION-CONTEXT** | C-TYPES | ProjectContext 타입 |

## 의존성 그래프

```
C-CLI
 ├── C-INSTALLER
 │    ├── C-RESOLVER
 │    ├── C-GRAPH ── C-TYPES
 │    ├── C-VALIDATOR ── C-TYPES
 │    └── C-INSTALL-STATE ── C-TYPES
 ├── C-INSTALL-STATE
 └── C-VALIDATOR

/crew:run (커맨드, 런타임)
 ├── C-GRAPH
 ├── C-VERIFIER ── C-TYPES
 ├── C-SHARED-MEMORY ── C-TYPES
 ├── C-CHECKPOINT ── C-TYPES, C-SHARED-MEMORY
 └── C-SESSION-CONTEXT ── C-TYPES
```

## 통신 패턴

### 파일 시스템 기반 통신 (모든 컴포넌트)
- ai-crew는 CLI 도구이므로 모든 상태는 파일 시스템에 저장
- JSON 파일을 통한 비동기 통신: write → read
- 원자적 쓰기: temp file → rename 패턴

### 직접 함수 호출 (CLI ↔ 서비스)
- CLI에서 서비스 함수를 직접 import하여 호출
- async/await 기반 비동기 처리

### 데이터 파일 레이아웃
```
.ai-crew/
├── config.yaml              ← C-INSTALLER (write), C-VALIDATOR (read)
├── graph.yaml               ← C-INSTALLER (write), C-GRAPH (read), C-VALIDATOR (read)
├── state.json               ← C-INSTALLER (write), 런타임 (read/write), C-CHECKPOINT (read/write)
├── install-state.json       ← C-INSTALL-STATE (read/write)      NEW
├── shared-memory.json       ← C-SHARED-MEMORY (read/write)      NEW
├── project-context.json     ← C-SESSION-CONTEXT (read/write)    NEW
└── checkpoints/             ← C-CHECKPOINT (write/read)          NEW
    ├── level-0.json
    ├── level-1.json
    └── ...
```

## 변경 영향도

| 변경 | 직접 영향 | 간접 영향 |
|------|----------|----------|
| types.ts 확장 | graph.ts, validator.ts | 모든 새 모듈 |
| graph.ts 검증 확장 | installer.ts | - |
| cli.ts 커맨드 추가 | - | - |
| installer.ts install-state 추가 | install-state.ts | - |
| 새 모듈 6개 | types.ts (타입 추가) | index.ts (export 추가) |

## PR 간 의존성

```
PR-1 (types.ts 확장 + validator.ts)
 ↓
PR-2 (graph.ts 확장) ── depends on types.ts 변경
 ↓
PR-3 (verifier.ts) ── depends on types.ts VerifyCheck
 ↓
PR-4 (install-state.ts + installer.ts + cli.ts doctor/uninstall)
 ↓
PR-5 (shared-memory.ts)
 ↓
PR-6 (checkpoint.ts) ── depends on shared-memory.ts
 ↓
PR-7 (session-context.ts)
 ↓
PR-8 (훅 프로파일링) ── 독립적
 ↓
PR-9 (cli.ts validate) ── depends on validator.ts
```

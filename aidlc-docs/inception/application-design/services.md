# Services — 오케스트레이션 패턴

## 서비스 레이어 개요

ai-crew는 별도의 런타임 서비스가 아닌 **CLI 도구 + 라이브러리**입니다. 서비스 레이어는 다음과 같이 구성됩니다:

```
[CLI Commands]
    ↓ 호출
[Core Services (함수 기반)]
    ↓ 사용
[Data Layer (파일 시스템)]
```

---

## S-INSTALL: 설치 서비스

**진입점**: `ai-crew install`, `ai-crew doctor`, `ai-crew uninstall`

```
install --team <name> --target <path>
  ├── loadBundle()           [resolver.ts]
  ├── validateGraph()        [graph.ts]
  ├── validateBundleConfig() [validator.ts]     ← NEW
  ├── resolveIncludes()      [resolver.ts]
  ├── fetchWorkflow()        [workflow-fetcher.ts]
  ├── copyFiles()            [installer.ts]
  ├── mergeSettings()        [installer.ts]
  └── recordInstall()        [install-state.ts] ← NEW

doctor --target <path>
  ├── readInstallState()     [install-state.ts] ← NEW
  └── diagnose()             [install-state.ts] ← NEW

uninstall --target <path>
  ├── readInstallState()     [install-state.ts] ← NEW
  └── uninstall()            [install-state.ts] ← NEW
```

## S-VALIDATE: 검증 서비스

**진입점**: `ai-crew validate`

```
validate --target <path>
  ├── 파일 발견: .ai-crew/config.yaml, graph.yaml, state.json
  ├── validateBundleConfig() [validator.ts]
  ├── validateGraphYaml()    [validator.ts]
  ├── validateStateJson()    [validator.ts]
  └── 결과 집계 및 출력
```

## S-GRAPH-EXEC: 그래프 실행 서비스 (커맨드에서 구동)

**진입점**: `/crew:run` 커맨드 (Claude Code 내에서 실행)

현재 `/crew:run`은 마크다운 커맨드로 Claude가 해석합니다. 새 컴포넌트는 이 실행 흐름에 통합됩니다:

```
/crew:run 실행 흐름 (conceptual):

1. graph.yaml 로드
2. state.json 로드
3. topoSort() → levels 계산
4. projectContext = loadContext()              ← NEW
5. FOR EACH level:
   a. 에이전트 생성 (per node)
      - 에이전트 프롬프트에 projectContext 주입  ← NEW
      - 의존 노드의 sharedMemory 읽기          ← NEW
   b. 에이전트 실행 (parallel per level)
   c. 에이전트 완료 시:
      - writeNodeOutput(nodeId, result)        ← NEW
      - IF node.verify:
        verifyNode(nodeId, checks, workDir)    ← NEW
        IF failed → retry (up to config.retry) ← NEW
      - state.json 업데이트 (즉시 flush)
   d. createCheckpoint(level)                  ← NEW
6. saveContext(updatedContext)                  ← NEW
```

## S-CHECKPOINT: 체크포인트 서비스

**진입점**: `/crew:checkpoint` (수동), 레벨 완료 시 자동

```
자동 체크포인트 (레벨 완료 시):
  ├── state.json 읽기
  ├── shared-memory.json 읽기
  └── createCheckpoint(level)    [checkpoint.ts]

수동 복원 (/crew:restore):
  ├── listCheckpoints()          [checkpoint.ts]
  ├── 사용자 선택
  └── restoreCheckpoint(path)    [checkpoint.ts]
```

---

## 서비스 간 데이터 흐름

```
               ┌─────────────┐
               │  CLI / Cmd  │
               └──────┬──────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌─────▼─────┐  ┌───▼────┐
   │ Install │  │ Graph Exec│  │Validate│
   │ Service │  │  Service  │  │Service │
   └────┬────┘  └─────┬─────┘  └───┬────┘
        │             │             │
        │      ┌──────┼──────┐     │
        │      │      │      │     │
   ┌────▼──┐ ┌─▼──┐ ┌▼───┐ ┌▼──┐ ┌▼────────┐
   │Install│ │Veri│ │Sha-│ │Chk│ │Validator│
   │ State │ │fier│ │red │ │pt │ │         │
   │       │ │    │ │Mem │ │   │ │         │
   └───┬───┘ └─┬──┘ └┬───┘ └┬──┘ └────┬────┘
       │       │     │      │         │
       └───────┴─────┴──────┴─────────┘
                      │
              ┌───────▼───────┐
              │  File System  │
              │ .ai-crew/*.json│
              └───────────────┘
```

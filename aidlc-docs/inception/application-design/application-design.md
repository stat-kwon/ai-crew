# Application Design — ai-crew 코어 강화 통합 문서

## 설계 개요

ai-crew 하네스에 6개 새 모듈을 추가하고 4개 기존 모듈을 확장합니다.

### 신규 모듈 (6개)
| 모듈 | 파일 | 핵심 책임 |
|------|------|----------|
| Validator | `src/validator.ts` | 설정 파일 스키마 검증 |
| Install State | `src/install-state.ts` | 설치 내역 추적, 진단, 제거 |
| Verifier | `src/verifier.ts` | 노드 완료 검증 (test/lint/build) |
| Shared Memory | `src/shared-memory.ts` | 에이전트 간 구조화된 상태 공유 |
| Checkpoint | `src/checkpoint.ts` | 레벨별 자동 체크포인트 |
| Session Context | `src/session-context.ts` | 프로젝트 컨텍스트 캐싱 |

### 수정 모듈 (4개)
| 모듈 | 변경 내용 |
|------|----------|
| `src/types.ts` | GraphNode 확장 (verify, retry), 신규 타입 12개 |
| `src/graph.ts` | 새 필드 검증 로직 |
| `src/cli.ts` | doctor, uninstall, validate 커맨드 |
| `src/installer.ts` | install-state 기록 |

---

## 아키텍처 원칙

1. **파일 시스템이 데이터 레이어**: 모든 상태는 `.ai-crew/*.json`에 저장
2. **원자적 쓰기**: temp → rename 패턴으로 데이터 안전성 보장
3. **선택적 기능**: 모든 새 필드(verify, retry)는 optional — 하위 호환성 100%
4. **외부 의존성 최소화**: 순수 TypeScript로 구현, ajv 등 스키마 라이브러리 미사용
5. **단일 책임**: 각 모듈은 하나의 관심사만 담당

---

## 데이터 파일 레이아웃

```
.ai-crew/
├── config.yaml              ← 기존
├── graph.yaml               ← 기존 (verify, retry 필드 추가)
├── state.json               ← 기존
├── install-state.json       ← NEW: 설치 내역
├── shared-memory.json       ← NEW: 에이전트 간 공유 메모리
├── project-context.json     ← NEW: 프로젝트 컨텍스트 캐시
└── checkpoints/             ← NEW: 자동 체크포인트
    ├── level-0.json
    └── level-1.json
```

---

## 핵심 타입 확장

```typescript
// GraphNode 확장
interface GraphNodeConfig {
  isolation?: "worktree" | "none";
  model?: string;
  retry?: number;          // 0-3 (기본: 0)
}

interface GraphNode {
  // 기존 필드 +
  verify?: VerifyCheck[];  // ["test", "lint", "build"]
}
```

---

## 실행 흐름 통합

```
/crew:run 실행:
  graph.yaml 로드 → topoSort()
  loadContext() → 에이전트 프롬프트에 주입

  FOR EACH level:
    FOR EACH node (parallel):
      readDependencyOutputs() → 에이전트에 전달
      에이전트 실행
      writeNodeOutput() → 결과 저장

      IF node.verify:
        verifyNode() → 검증
        IF failed && config.retry > 0 && attempts < max:
          워크트리 정리 → 에이전트 재실행 → verify 재실행 (전체 사이클 반복)

      state.json 업데이트 (즉시 디스크 flush)

    createCheckpoint(level) → 자동 저장

  saveContext() → 학습 내용 저장
```

---

## PR 실행 순서

```
PR-1: types.ts + validator.ts       ← 기반 (다른 PR이 의존)
PR-2: graph.ts 확장                 ← types.ts 의존
PR-3: verifier.ts                   ← types.ts 의존
PR-4: install-state.ts + cli doctor/uninstall + installer.ts
PR-5: shared-memory.ts
PR-6: checkpoint.ts                 ← shared-memory.ts 의존
PR-7: session-context.ts
PR-8: 훅 프로파일링 (catalog/ 변경)
PR-9: cli validate                  ← validator.ts 의존
```

---

상세 설계는 개별 문서 참조:
- [components.md](./components.md) — 컴포넌트 정의
- [component-methods.md](./component-methods.md) — 메소드 시그니처
- [services.md](./services.md) — 서비스 오케스트레이션
- [component-dependency.md](./component-dependency.md) — 의존성 관계

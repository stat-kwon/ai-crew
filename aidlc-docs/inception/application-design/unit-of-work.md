# Units of Work — ai-crew 코어 강화

## 분해 전략
- **방식**: 기능 요구사항(FR) 기반 분해
- **단위**: 각 FR = 1 유닛 = 1 PR
- **병렬성**: types+validator(기반) 완료 후 7개 유닛 병렬 실행 가능

---

## Unit 1: foundation
**FR**: FR-7 (스키마 검증) + types.ts 확장
**파일**: `src/types.ts`, `src/validator.ts`, `src/__tests__/validator.test.ts`
**설명**: 모든 다른 유닛이 의존하는 기반. GraphNode 확장 (verify, retry 필드), 신규 타입 12개 정의, 5종 설정 파일 스키마 검증 엔진.
**에이전트**: backend-dev
**스킬**: backend-node, clean-code
**격리**: worktree

---

## Unit 2: graph-ext
**FR**: FR-7 일부 (graph.ts 확장)
**파일**: `src/graph.ts`, `src/__tests__/graph.test.ts`
**설명**: validateGraph()에 verify, retry 필드 검증 로직 추가. 기존 테스트 유지 + 새 테스트 추가.
**에이전트**: backend-dev
**스킬**: backend-node, testing
**격리**: worktree
**의존**: foundation

---

## Unit 3: verifier
**FR**: FR-3 (경량 검증 프로토콜)
**파일**: `src/verifier.ts`, `src/__tests__/verifier.test.ts`
**설명**: 노드 완료 시 test/lint/build 검증. child_process.exec으로 커맨드 실행, 결과 수집.
**에이전트**: backend-dev
**스킬**: backend-node, testing
**격리**: worktree
**의존**: foundation

---

## Unit 4: install-state
**FR**: FR-1 (install-state 추적)
**파일**: `src/install-state.ts`, `src/cli.ts` (doctor/uninstall), `src/installer.ts` (recordInstall 호출), `src/__tests__/install-state.test.ts`
**설명**: 설치 내역 기록, 진단(doctor), 제거(uninstall) 기능. installer.ts에 recordInstall 호출 추가.
**에이전트**: backend-dev
**스킬**: backend-node, clean-code
**격리**: worktree
**의존**: foundation

---

## Unit 5: shared-memory
**FR**: FR-4 (에이전트 간 공유 메모리)
**파일**: `src/shared-memory.ts`, `src/__tests__/shared-memory.test.ts`
**설명**: .ai-crew/shared-memory.json 기반 구조화된 상태 읽기/쓰기. 원자적 쓰기(temp→rename).
**에이전트**: backend-dev
**스킬**: backend-node, testing
**격리**: worktree
**의존**: foundation

---

## Unit 6: checkpoint
**FR**: FR-5 (자동 체크포인트 + 재시도)
**파일**: `src/checkpoint.ts`, `src/__tests__/checkpoint.test.ts`
**설명**: 레벨 완료 시 state.json + shared-memory.json 스냅샷 저장. 체크포인트 목록/복원 기능. GraphNode.config.retry 지원.
**에이전트**: backend-dev
**스킬**: backend-node, testing
**격리**: worktree
**의존**: foundation, shared-memory

---

## Unit 7: session-context
**FR**: FR-8 (경량 세션 학습)
**파일**: `src/session-context.ts`, `src/__tests__/session-context.test.ts`
**설명**: 프로젝트 컨텍스트(기술 스택, 패턴, 에이전트 메모) 저장/로드. 그래프 실행 완료 후 자동 저장.
**에이전트**: backend-dev
**스킬**: backend-node
**격리**: worktree
**의존**: foundation

---

## Unit 8: hook-profiling
**FR**: FR-6 (훅 프로파일링)
**파일**: `catalog/hooks/*/hooks.json` (profiles 필드 추가), 훅 프로파일 문서
**설명**: config.yaml에 hookProfile 필드, 각 훅에 profiles 선언, 환경변수 오버라이드.
**에이전트**: backend-dev
**스킬**: backend-node
**격리**: worktree
**의존**: 없음 (독립적)

---

## Unit 9: cli-validate
**FR**: FR-7 일부 + FR-9 (라우터 인터페이스)
**파일**: `src/cli.ts` (validate 커맨드), `src/index.ts` (export 추가)
**설명**: `ai-crew validate` 커맨드. 모든 .ai-crew/ 설정 파일 스키마 검증. 라우터 노드 인터페이스 문서화 (stub).
**에이전트**: backend-dev
**스킬**: backend-node, clean-code
**격리**: worktree
**의존**: foundation

---

## Unit 10: integration-review
**FR**: 전체 통합 검증
**설명**: 모든 유닛 완료 후 통합 테스트, 코드 리뷰, 하위 호환성 검증.
**에이전트**: reviewer
**스킬**: code-review, testing
**격리**: worktree
**의존**: 모든 유닛

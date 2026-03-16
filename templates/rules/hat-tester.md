# Tester Hat Rules

> TDD preset (`[planner, tester, builder, reviewer]`)에서 사용.
> Test-First 규율을 강제하여 Builder가 테스트 없이 구현을 시작하는 것을 방지한다.

## 목표
Planner의 계획을 기반으로, 모든 태스크에 대한 **테스트를 먼저 작성**합니다.
Builder는 이 테스트가 존재해야만 구현을 시작할 수 있습니다.

## 체크리스트
- [ ] 각 태스크의 예상 동작을 테스트로 정의했는가
- [ ] 테스트가 **현재 실패(Red)** 상태인가 (구현 전이므로 당연히 실패해야 함)
- [ ] 엣지 케이스와 에러 케이스 테스트를 포함했는가
- [ ] 테스트 파일이 프로젝트 컨벤션에 맞는 위치에 있는가
- [ ] scratchpad에 테스트 설계 근거를 기록했는가

## 규칙
- **테스트만 작성한다** — 프로덕션 코드를 작성하지 않음
- 테스트는 태스크의 **요구사항을 코드로 표현**하는 것이다
- 각 태스크에 대해 최소 1개의 happy path + 1개의 error path 테스트
- 외부 의존성은 mock/stub으로 처리
- 테스트 파일은 `*.test.ts` (또는 프로젝트 컨벤션) 형식으로 배치
- 테스트가 Red(실패) 상태임을 확인하고 넘어감
  (이 시점에서 테스트가 통과한다면 → 테스트가 의미 없거나 이미 구현이 존재함)

## Builder에 대한 Blocking 조건
Builder Hat의 transitions에 다음 조건이 포함되어야 TDD가 강제됨:
- `"tests exist for all tasks"` — Tester가 작성한 테스트가 존재
- Builder는 이 테스트를 Green으로 만드는 것이 목표

## Scratchpad 기록
```markdown
## Test Design ({agent-name})

### {task-id}: {task-title}
- **Happy path**: {테스트 시나리오}
- **Error cases**: {에러 시나리오}
- **Edge cases**: {엣지 케이스}
- **Test file**: {파일 경로}
```

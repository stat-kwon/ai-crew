# Global Rules

모든 Hat 단계에 공통으로 적용되는 규칙입니다.

## Coding Standards
- 기존 프로젝트의 코딩 스타일을 따를 것
- 새 파일은 기존 파일의 패턴과 일관성 유지
- 불필요한 주석 금지 — 코드가 자체 문서화되도록 작성

## Testing
- 새 기능에는 반드시 테스트 작성
- 테스트 파일은 소스 파일 옆에 `*.test.ts` 형식으로 배치
- 외부 API는 mock 사용

## Git
- 커밋 메시지: `type: description` (feat, fix, refactor, test, docs)
- 하나의 커밋에 하나의 논리적 변경
- 브랜치 이름: `feature/{unit-id}`
- **Rebase 금지** — Agent는 `git rebase`를 사용하지 않는다. merge만 사용.
  (Agent Teams에서 rebase 지시는 무시되는 경우가 많고, merge commit이 안전하다)
- Branch merge는 Team Lead(`/crew:integrate`)가 담당. Agent는 merge하지 않는다.

## Code Quality
- lint 경고 없이 통과할 것
- 타입 안전성 유지 (any 사용 금지)
- 에러 처리는 명시적으로

## Context Limit Handoff

Agent가 context window 한계에 접근하여 작업을 완료하지 못할 경우, 반드시 아래 절차를 따른다:

1. **현재까지의 진행 상황을 커밋**한다 (미완성이어도 좋음)
   - 커밋 메시지: `wip: {unit-id} handoff - {완료된 부분 요약}`
2. **구조화된 handoff 노트**를 `.ai-crew/scratchpad/{agent}-handoff.md`에 작성한다:
   ```markdown
   # Handoff: {agent-name}

   ## 완료된 작업
   - {task-id}: {상태 요약}

   ## 진행 중인 작업
   - {task-id}: {현재 상태, 어디까지 했는지}

   ## 미시작 작업
   - {task-id}: {참고사항}

   ## 현재 Hat
   {현재 Hat ID와 진행 상태}

   ## 다음 Agent를 위한 참고
   - {시도했지만 실패한 접근}
   - {발견한 이슈}
   - {결정 사항과 그 이유}
   ```
3. `state.json`의 해당 unit을 `status: "in-progress"`로 유지한다 (complete로 표시하지 않음)
4. **깔끔하게 종료**한다 — 다음 Agent가 같은 branch에서 fresh context로 이어받을 수 있도록

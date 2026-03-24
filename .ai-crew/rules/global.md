# Global Rules — Hard Constraints

모든 graph node agent에 주입되는 절대 규칙. 도메인 지식(HOW)은 skill이 SSOT.
여기에는 어떤 agent/skill이든 위반할 수 없는 제약만 포함한다.

## Git Constraints
- **Rebase 금지** — Agent는 `git rebase`를 사용하지 않는다. merge만 사용.
- Branch merge는 Team Lead(`/crew:integrate`)가 담당. Agent는 merge하지 않는다.
- Agent는 자신의 `crew/{node_id}` 브랜치에서만 작업한다.

## AI-DLC Integration
- `aidlc-docs/`는 설계의 source of truth이다.
- Agent는 요구사항/설계를 재분석하지 않는다 — aidlc-docs를 읽기만 한다.
- 설계 산출물 수정은 AI-DLC 워크플로우를 통해서만 수행한다.

## SSOT Principle
- **도메인 지식(HOW)은 skill이 SSOT** — Agent Rules에 skill 내용을 중복하지 않는다.
- Agent .md에는 역할 경계(WHO)와 hard constraint만 포함한다.
- 코딩 패턴, 테스트 방법, 리뷰 기준 등은 해당 skill을 참조한다.

## Context Limit Handoff
Agent가 context window 한계에 접근하여 작업을 완료하지 못할 경우:
1. 현재까지 진행 상황을 커밋한다: `wip: {node_id} handoff - {요약}`
2. `.ai-crew/scratchpad/L{level}-{node_id}-handoff.md`에 handoff 노트를 작성한다
3. `state.json`을 `in-progress` 상태로 유지한다 (complete로 표시하지 않음)
4. 다음 Agent가 같은 branch에서 이어받을 수 있도록 깔끔하게 종료한다

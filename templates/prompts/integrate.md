# Integration Prompt

## Intent
{{intent.description}}

## Completed Units
{{#each units}}
- {{this.name}} (branch: {{this.branch}})
{{/each}}

## Instructions

1. dependency 순서대로 feature branch merge
2. 충돌 해결
3. 전체 테스트 & lint 실행
4. Completion Criteria 검증
5. Worktree 정리
6. State 업데이트 (intent.status = "complete")
7. PR 생성 (선택적)

# Execution Prompt

## Intent
{{intent.description}}

## Units to Execute
{{#each availableUnits}}
### Unit: {{this.name}}
- ID: {{this.id}}
- Description: {{this.description}}
- Tasks: {{this.tasks.length}}
- Dependencies: {{this.dependencies}}
{{/each}}

## Instructions

1. **Agent Team 생성**
   각 Unit에 대해 Agent를 spawn하세요.

2. **Hat System**
   각 Agent는 다음 순서로 작업:

   🎩 **Planner** (먼저):
   - Task 분석
   - 접근 방식을 `.ai-crew/scratchpad/L{level}-{node_id}.md`에 기록
   - 완료 시: `[HAT:PLANNER_COMPLETE]` 출력

   🔨 **Builder** (다음):
   - 계획에 따라 구현
   - Task 완료 시: `[TASK:COMPLETE:{task-id}]` 출력
   - 모든 Task 완료 시: `[HAT:BUILDER_COMPLETE]` 출력

   👀 **Reviewer** (마지막):
   - 테스트 실행
   - 린트 확인
   - 성공 시: `[UNIT:COMPLETE:{unit-id}]` 출력

3. **Communication**
   - API 스펙 공유 필요 시 Team Lead에게 메시지
   - 블로킹 이슈 발생 시 즉시 보고

## Quality Gates
{{#each config.qualityGates.beforeUnitComplete}}
- {{this.command}} ({{this.failAction}})
{{/each}}

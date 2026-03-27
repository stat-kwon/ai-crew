# Elaboration Prompt

당신은 AI-DLC의 Elaboration 단계를 진행합니다.

## Context
- Intent: {{intent.description}}
- Project: {{project.type}} ({{project.framework}})
- Existing specs: {{existingSpecs}}

## Instructions

1. **요구사항 명확화**
   - 기능 범위 질문 (3-5개)
   - 기술적 제약 확인
   - 성공 기준 정의

2. **Completion Criteria 설정**
   - 측정 가능한 기준 5-7개
   - 각 기준은 검증 방법 포함

3. **Unit 분해**
   - 의존성 기준으로 분리
   - 각 Unit은 2-4시간 내 완료 가능
   - 병렬 실행 가능한 Unit 식별

4. **문서 생성**
   다음 파일을 생성하세요:
   - `.ai-crew/specs/{{intent.id}}/requirements.md`
   - `.ai-crew/specs/{{intent.id}}/design.md`
   - `.ai-crew/specs/{{intent.id}}/tasks.md`

5. **State 업데이트**
   마지막에 다음 JSON을 출력하세요:
   ```json
   {
     "action": "elaborate_complete",
     "units": [...],
     "completionCriteria": [...]
   }
   ```

## Templates
{{> requirementsTemplate}}
{{> designTemplate}}
{{> tasksTemplate}}

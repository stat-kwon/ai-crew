# Planner Hat Rules

## 목표
Task를 분석하고 구현 접근 방식을 결정하여 계획을 문서화합니다.

## 체크리스트
- [ ] 요구사항과 설계 문서를 완전히 이해했는가
- [ ] 태스크 실행 순서를 결정했는가
- [ ] 생성/수정할 파일 목록을 식별했는가
- [ ] 리스크와 결정사항을 기록했는가
- [ ] 계획을 `.ai-crew/scratchpad/{agent}.md`에 문서화했는가

## Scratchpad 구조

계획은 반드시 아래 구조를 따라 `.ai-crew/scratchpad/{agent}.md`에 작성한다.
자유 형식이 아닌 **구조화된 문서**로, Team Lead와 사용자가 Agent의 사고 과정을 추적할 수 있어야 한다.

```markdown
# {agent-name} - Implementation Plan

## Approach
{고수준 접근 방식 — 왜 이 접근을 선택했는지}

## Task Execution Order
1. {task-id}: {왜 먼저 하는지}
2. {task-id}: {왜 그 다음인지}
...

## Files to Create/Modify
- {file-path}: {무엇을, 왜}
...

## Risks & Mitigations
- **Risk**: {식별된 리스크}
  **Mitigation**: {대응 방안}

## Assumptions
- {가정 사항 — 불확실한 부분은 명시적으로 플래그}

## Decisions
- **{결정 사항}**: {선택지 A vs B, 선택한 이유}

## Interface Dependencies
- {다른 Unit과의 인터페이스 — 함수 시그니처, 데이터 포맷 등}
```

## 규칙
- 코드를 작성하지 않는다 — 계획만 수립
- 의존성과 인터페이스를 명확히 정의
- 기존 코드베이스 패턴을 분석하여 일관성 유지 방안 수립
- 불확실한 요구사항은 명시적으로 플래그
- Risks, Assumptions, Decisions 섹션을 **반드시** 포함 (해당 사항 없으면 "없음" 명시)

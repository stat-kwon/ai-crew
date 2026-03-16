# Slash Command Reference

AI-Crew의 6개 `/crew:*` 슬래시 커맨드.

## /crew:elaborate

**Phase**: Inception
**사용법**: `/crew:elaborate 실시간 알림 시스템`

AI-DLC Inception 전체를 수행. Team Lead(Claude)가 직접 실행.

| Step | 내용 | AIDLC 규칙 |
|------|------|------------|
| 0 | 상태 로드, Intent 생성 | — |
| 1 | Workspace Detection (프로젝트 분석) | `inception/workspace-detection.md` |
| 2 | Requirements Analysis (질의응답) | `inception/requirements-analysis.md` |
| 3 | User Stories (조건부) | `inception/user-stories.md` |
| 4 | Workflow Planning | `inception/workflow-planning.md` |
| 5 | Application Design (조건부) | `inception/application-design.md` |
| 6 | Units Generation (분해) | `inception/units-generation.md` |
| 7 | State 업데이트 → `intent.status = "ready"` | — |

**산출물**:
- `.ai-crew/specs/{intent-id}/requirements.md`
- `.ai-crew/specs/{intent-id}/design.md`
- `.ai-crew/specs/{intent-id}/tasks.md`
- `.ai-crew/state.json` 업데이트

---

## /crew:execute

**Phase**: Construction
**사용법**: `/crew:execute`

Agent Teams로 Unit 병렬 구현. 각 Agent는 worktree에서 격리 실행.

| Step | 내용 |
|------|------|
| 0 | 상태 검증 (`intent.status == "ready" \| "executing"`) |
| 1 | 실행 가능 Unit 식별 (dependency graph) |
| 2 | Agent 할당 계획 + **Shared File 충돌 분석** + **비용 추정** |
| 3 | 사용자 확인 |
| 4 | `Agent()` spawn (isolation: "worktree") |
| 5 | State 업데이트 (`intent.status = "executing"`) |
| 6 | 모니터링 — 완료/handoff/blocked 확인, 다음 wave spawn |

**Hat Pipeline** (각 Agent 내부, `config.yaml → hats.pipeline`에서 정의):

기본 파이프라인 (core preset):
1. **Planner** — Task 분석, 접근 방식을 **구조화된 scratchpad**에 기록 (`hat-planner.md` 규칙, Risks/Assumptions/Decisions 필수)
2. **Builder** — 코드 구현, 테스트 작성 (`hat-builder.md` 규칙, quality gate 실행)
3. **Reviewer** — 테스트 실행, lint 확인, 기준 검증 (`hat-reviewer.md` 규칙, quality gate 실행)

TDD 파이프라인 (tdd preset):
1. **Planner** → 2. **Tester** (테스트 먼저 작성, Red 상태 확인) → 3. **Builder** (테스트를 Green으로) → 4. **Reviewer**

Pipeline은 config에서 확장 가능 (예: `security-reviewer` 추가).
각 Hat 전환 시 quality gate를 강제하며, 결과를 `hatArtifacts`에 기록.
`modelOverride` 지정 시 해당 Hat은 `agent_chat` MCP로 다른 모델에 위임 (Cross-Check 패턴).

**추가 안전장치** (Reddit 실전 리서치 기반):
- **Shared File 경고**: 병렬 Unit 간 파일 충돌 사전 분석
- **Context Limit Handoff**: Agent가 context 한계 도달 시 구조화된 인수인계
- **Rebase 금지**: Agent는 merge만 사용 (rebase는 Agent Teams에서 무시됨)
- **비용 추정**: pipeline 길이 × Unit 수 기반 비용 배수 표시

---

## /crew:integrate

**Phase**: Integration
**사용법**: `/crew:integrate`

모든 Unit의 feature branch를 통합.

| Step | 내용 |
|------|------|
| 0 | 모든 Unit `status == "complete"` 확인 |
| 1 | Dependency 순서대로 branch merge |
| 2 | 충돌 해결 |
| 3 | 전체 테스트 & lint 실행 |
| 4 | Completion Criteria 검증 |
| 5 | Worktree 정리 |
| 6 | `intent.status = "complete"`, 자동 checkpoint |
| 7 | PR 생성 (선택적) |

---

## /crew:status

**Phase**: Any
**사용법**: `/crew:status`

현재 상태를 포맷팅하여 표시.

- Intent 정보 (description, status, 날짜)
- Completion Criteria 체크리스트
- Units 테이블 (이름, 상태, agent, hat, branch, task 진행률)
- Dependency graph (ASCII)
- Team 정보
- 최근 이벤트 (10개)
- 다음 가능한 액션 안내

---

## /crew:checkpoint

**Phase**: Any
**사용법**: `/crew:checkpoint [설명]`

현재 상태의 스냅샷 저장.

저장 내용:
- 전체 `state.json` 스냅샷
- Git HEAD SHA + 각 Unit branch SHA
- 파일 변경 요약

저장 위치: `.ai-crew/checkpoints/{cp-YYYYMMDD-HHMMSS}.json`

---

## /crew:restore

**Phase**: Any
**사용법**: `/crew:restore [checkpoint-id]`

이전 checkpoint로 복구.

- ID 없이 실행 시: checkpoint 목록 표시 → 선택
- ID 지정 시: 해당 checkpoint 복구
- 복구 전 현재 상태와 비교 표시, 사용자 확인 필요

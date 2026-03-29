# timeline-page -- Frontend Build Output

## What
대시보드(page.tsx)를 타임라인 히스토리 페이지로 전면 교체. 7개 신규 컴포넌트 생성, 페이지 조합, 테스트 작성.

## How
기존 대시보드의 통계 카드/개발 흐름 UI를 완전히 제거하고, 런 히스토리를 날짜별로 그룹핑하여 타임라인 형태로 표시하는 새 페이지를 구현함.

## Components Implemented

- `ui/src/components/timeline/NodeChip.tsx`: 노드 상태별 색상 칩 (completed=초록, running=보라+pulse, pending=회색, failed=빨강, skipped=회색)
- `ui/src/components/timeline/DateDivider.tsx`: 날짜 구분선 (오늘/어제/날짜 문자열)
- `ui/src/components/timeline/TimelineFilter.tsx`: 상태 필터 드롭다운 + 텍스트 검색 input
- `ui/src/components/timeline/ProjectSummaryBar.tsx`: 팀 템플릿명, 에이전트 수, 설계 진행률, 진행 바
- `ui/src/components/timeline/ActiveRunCard.tsx`: 진행 중 런 확장 카드 (보라색 테두리, NodeChip ��니맵)
- `ui/src/components/timeline/CompletedRunCard.tsx`: 완료 런 접힘 카드 (상세 보기 링크)
- `ui/src/components/timeline/FailedRunCard.tsx`: 실패 런 접힘 카드 (붉은 테두리)
- `ui/src/app/page.tsx`: 타임라인 페이지 (위 컴포넌트 조합, SWR 데이터 로드, 클라이언트 필터링)

## Files Modified

| 작업 | 파일 |
|------|------|
| 전면 교체 | `ui/src/app/page.tsx` |
| 신규 | `ui/src/components/timeline/NodeChip.tsx` |
| 신규 | `ui/src/components/timeline/DateDivider.tsx` |
| 신규 | `ui/src/components/timeline/TimelineFilter.tsx` |
| 신규 | `ui/src/components/timeline/ProjectSummaryBar.tsx` |
| 신규 | `ui/src/components/timeline/ActiveRunCard.tsx` |
| 신규 | `ui/src/components/timeline/CompletedRunCard.tsx` |
| 신규 | `ui/src/components/timeline/FailedRunCard.tsx` |
| 삭제 | `ui/src/app/__tests__/dashboard.test.tsx` (page.tsx 전면 교체로 구 테스트 무효) |
| 신규 | `ui/src/app/__tests__/timeline-page.test.tsx` |
| 신규 | `ui/src/components/timeline/__tests__/NodeChip.test.tsx` |
| 신규 | `ui/src/components/timeline/__tests__/DateDivider.test.tsx` |
| 신규 | `ui/src/components/timeline/__tests__/TimelineFilter.test.tsx` |
| 신규 | `ui/src/components/timeline/__tests__/ActiveRunCard.test.tsx` |
| 신규 | `ui/src/components/timeline/__tests__/CompletedRunCard.test.tsx` |
| 신규 | `ui/src/components/timeline/__tests__/FailedRunCard.test.tsx` |
| 수정 | `ui/vitest.config.ts` (worktree React 충돌 해결) |

## Verification

- Build: pass (TypeScript 컴파일 정상)
- Tests: 122 passed, 0 failed (13 test files)
  - 타임라인 컴포넌트 테스트: 36 passed (6 files)
  - 타임라인 페이지 통합 테스트: 11 passed (1 file)
  - 기존 테스트: 75 passed (6 files, 구 dashboard.test 삭제)

## Interface Dependencies

- API endpoints consumed:
  - `GET /api/runs` - 전체 런 목록
  - `GET /api/state` - 현재 진행 중 런 상태 (3초 폴링)
  - `GET /api/config` - 프로젝트 설정 (ProjectSummaryBar)
  - `GET /api/graph` - 노드 정의 (ProjectSummaryBar)
  - `GET /api/aidlc/state` - 설계 진행 상태 (ProjectSummaryBar)
- Shared types: RunEntry, StateData, ConfigData, GraphData, AidlcStateResponse (컴포넌트 내 정의)

## Result
타임라인 페이지가 런 히스토리를 날짜별로 그룹핑하여 표시. 진행 중 런은 확장 카드(NodeChip 미니맵), 완료/실패 런은 접힘 카드(한 줄 요약 + 상세 보기 링크). 필터/검색 정상 동작. 모든 테스트 통과.

## Downstream Context
- `page.tsx`는 이제 타임라인 페이지. 기존 대시보드 코드 완전 제거됨.
- `/runs/{runId}` 링크는 run-detail-page 노드에서 구현 필요.
- `vitest.config.ts` 변경은 worktree 환경에서의 React 이중 인스턴스 문제 해결용.

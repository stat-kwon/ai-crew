# run-detail-page — 프론트엔드 빌드 결과

## What
런 상세 페이지(`/runs/[runId]`) 신규 생성. 노드별 결과물을 레벨 기반 그룹핑과 인라인 아코디언으로 탐색 가능.

## How
- `computeLevels` 유틸: `depends_on` 기반 Kahn's algorithm으로 레벨 계산
- `RunHeader`: 런 메타데이터 (intent, runId, 시간, 상태 뱃지, 노드 완료 카운트) + 타임라인 돌아가기 링크
- `NodeList`: 레벨별 그룹핑 헤더 + NodeAccordion 렌더링
- `NodeAccordion`: 접기/펼치기 + SWR 지연 로딩(`/api/scratchpad/{nodeId}`) + ReactMarkdown 렌더링
- `page.tsx`: `/api/runs`에서 runId 매칭 + `/api/state`로 현재 런 확인 + `/api/graph`로 노드 정의 로드

## Result

### 구현된 컴포넌트
- `ui/src/app/runs/[runId]/page.tsx`: 런 상세 페이지 (dynamic route)
- `ui/src/components/run-detail/RunHeader.tsx`: 런 정보 헤더
- `ui/src/components/run-detail/NodeList.tsx`: 레벨별 노드 목록
- `ui/src/components/run-detail/NodeAccordion.tsx`: 노드 결과물 아코디언
- `ui/src/components/run-detail/compute-levels.ts`: 레벨 계산 유틸리티
- `ui/src/components/run-detail/index.ts`: 배럴 export

### 검증
- Build: pass (Compiled successfully. 기존 bundles 모듈 에러는 page-cleanup 유닛 담당)
- TypeScript: 타입 에러 0건 (run-detail 관련 파일)
- Tests: 31 passed, 0 failed
  - `compute-levels.test.ts`: 9 tests
  - `RunHeader.test.tsx`: 9 tests
  - `NodeAccordion.test.tsx`: 8 tests
  - `NodeList.test.tsx`: 5 tests

### 접근성
- 시맨틱 HTML: `section[aria-label]`, `h1`, `h2`, `button[aria-expanded][aria-controls]`
- 키보드 네비게이션: 아코디언은 `button` 요소로 포커스 가능
- `Link` 컴포넌트에 `aria-label` 적용 (돌아가기 링크)

## Downstream Context
- API 엔드포인트: `GET /api/runs`, `GET /api/state`, `GET /api/graph`, `GET /api/scratchpad/{nodeId}`
- 공유 타입: `GraphNode`, `NodeStatus`, `RunHeaderProps`, `NodeListProps`, `NodeAccordionProps`
- 타임라인 페이지에서 `/runs/[runId]`로 Link 연결 필요 (timeline-page 유닛)
- layout-overhaul 유닛의 TopBar 및 전체 폭 레이아웃 위에서 동작

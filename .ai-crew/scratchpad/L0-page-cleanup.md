# page-cleanup — Frontend Build Output

## What
불필요한 페이지, 컴포넌트, API 라우트, 테스트 파일을 일괄 삭제하여 UI 리디자인의 기반을 정리.

## How
1. 5개 페이지 디렉토리 삭제 (team, preflight, bundles, settings, develop)
2. 3개 피처 컴포넌트 디렉토리 삭제 (bundles, config, runs)
3. Sidebar.tsx, Header.tsx 및 관련 테스트 삭제
4. bundles/[name]/apply API 라우트 삭제
5. config API에서 PUT 메서드 제거 (GET 유지)
6. AppShell.tsx에서 Sidebar import 및 참조 제거
7. 삭제된 페이지/컴포넌트의 테스트 파일 삭제

## Result

### 삭제된 파일 (22개 파일, -3,244 줄)

**페이지 디렉토리:**
- `ui/src/app/team/page.tsx`
- `ui/src/app/preflight/page.tsx`
- `ui/src/app/bundles/page.tsx`
- `ui/src/app/settings/page.tsx`
- `ui/src/app/develop/page.tsx`

**컴포넌트 디렉토리:**
- `ui/src/components/bundles/BundleGrid.tsx`
- `ui/src/components/bundles/BundlePreview.tsx`
- `ui/src/components/config/ConfigForm.tsx`
- `ui/src/components/runs/GanttTimeline.tsx`
- `ui/src/components/runs/KanbanBoard.tsx`
- `ui/src/components/runs/KanbanCard.tsx`
- `ui/src/components/runs/RunList.tsx`
- `ui/src/components/runs/RunsHistoryTable.tsx`
- `ui/src/components/runs/ScratchpadModal.tsx`

**레이아웃 컴포넌트:**
- `ui/src/components/layout/Sidebar.tsx`
- `ui/src/components/layout/Header.tsx`

**API 라우트:**
- `ui/src/app/api/bundles/[name]/apply/route.ts` (POST 전체 삭제)
- `ui/src/app/api/config/route.ts` (PUT 메서드만 제거, GET 유지)

**테스트 파일:**
- `ui/src/app/__tests__/remaining-pages.test.ts`
- `ui/src/app/develop/__tests__/develop-page.test.tsx`
- `ui/src/components/layout/__tests__/sidebar.test.tsx`

### 수정된 파일 (2개)
- `ui/src/components/layout/AppShell.tsx`: Sidebar import/참조 제거, `ml-64` 제거
- `ui/src/app/api/config/route.ts`: PUT 메서드 제거, 미사용 import 정리

## Verification
- TypeScript 컴파일: pass (tsc --noEmit 에러 0건)
- 삭제된 모듈 참조 잔존: 0건 (grep 검증 완료)
- 미사용 package.json 의존성: 없음 (모든 패키지가 남은 코드에서 사용 중)

## Interface Dependencies
- API endpoints 유지: GET /api/config, GET /api/runs, GET /api/state, GET /api/graph, GET /api/aidlc/*, GET /api/scratchpad
- API endpoints 삭제: POST /api/bundles/[name]/apply, PUT /api/config
- 공유 타입: 없음 (삭제된 컴포넌트는 로컬 타입만 사용)

## Downstream Context
- `layout-overhaul` 노드: AppShell.tsx에서 Sidebar 참조가 제거됨. TopBar로 대체 시 AppShell.tsx를 직접 수정하면 됨.
- `timeline-page` 노드: page.tsx(대시보드)는 유지됨. 교체 가능.
- `docs-page` 노드: design/ 디렉토리는 유지됨.
- `run-detail` 노드: runs 컴포넌트가 삭제되었으므로 새로 구현 필요.

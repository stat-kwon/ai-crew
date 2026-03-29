# layout-overhaul -- Frontend Build Output

## What
사이드바 네비게이션을 상단 탭 바로 전환하고, 설정 드로어를 신규 생성하여 AppShell 레이아웃을 재구성했다.

## How
1. `TopBar.tsx` 신규 생성 -- 좌측 로고, 중앙 2개 탭 (타임라인/설계 문서), 우측 설정 아이콘
2. `SettingsDrawer.tsx` 신규 생성 -- 우측 슬라이드인 패널, `/api/config` 데이터 읽기 전용 표시
3. `AppShell.tsx` 수정 -- Sidebar/TopNav import 제거, TopBar/SettingsDrawer로 교체, `ml-64` 제거하여 전체 폭 레이아웃

## Result

### Components Implemented
- `ui/src/components/layout/TopBar.tsx`: 상단 탭 바 -- 로고 + 2개 탭 네비게이션 + 설정 토글
- `ui/src/components/layout/SettingsDrawer.tsx`: 설정 드로어 -- 읽기 전용 프로젝트 설정 표시 패널
- `ui/src/components/layout/AppShell.tsx`: 레이아웃 셸 수정 -- 사이드바 제거, 상단 탭 바 + 전체 폭 콘텐츠

### Tests Implemented
- `ui/src/components/layout/__tests__/topbar.test.tsx`: TopBar 9개 테스트
- `ui/src/components/layout/__tests__/settings-drawer.test.tsx`: SettingsDrawer 8개 테스트

### Verification
- Build: pass (`next build` 성공)
- Tests: 103 passed, 0 failed (기존 86 + 신규 17)

### 주요 결정 사항
- Sidebar.tsx, Header.tsx, TopNav.tsx는 삭제하지 않음 (page-cleanup 노드가 담당)
- AppShell.tsx에서 import만 제거하고 TopBar/SettingsDrawer로 교체
- SettingsDrawer에서 React hooks (useRef/useEffect) 대신 React 이벤트 핸들러 패턴 사용 -- 테스트 환경의 React 이중 인스턴스 이슈 회피
- Escape 키 처리는 onKeyDown 이벤트로 구현 (드로어 wrapper div에서 처리)

## Downstream Context
- `layout.tsx`는 변경 없음 -- AppShell 컴포넌트가 레이아웃 전환을 캡슐화
- TopBar의 탭 링크: `/` (타임라인), `/docs` (설계 문서) -- 하위 노드(timeline-page, docs-page)에서 해당 페이지 구현 필요
- SettingsDrawer는 `/api/config` API 엔드포인트 소비 -- 기존 API 그대로 사용
- Sidebar.tsx, Header.tsx, TopNav.tsx는 아직 파일 시스템에 존재하나 AppShell에서 import되지 않음

## Interface Dependencies
- API endpoints consumed: `GET /api/config`
- Shared types: 없음 (컴포넌트 내부 인터페이스만 사용)

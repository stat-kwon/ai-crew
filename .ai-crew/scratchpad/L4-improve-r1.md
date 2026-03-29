# improve-r1 — 1차 개선 빌드 결과

## Status: completed
Agent: frontend-dev | Level: 4

## What — 수행 내용
review-r1에서 보고된 Critical 이슈(SettingsDrawer 미표시 버그) 수정

## How — 수정 방법

### SettingsDrawer 버그 수정
- **근본 원인**: `SettingsDrawer`가 `isOpen=false`일 때 `return null`로 DOM을 완전히 제거
- Playwright MCP 환경에서 조건부 렌더링(null → JSX) 시 DOM 삽입 감지 실패 가능성
- **수정**: `return null` 제거, 대신 래퍼 div에 `className={isOpen ? undefined : "hidden"}` 적용
- Tailwind의 `hidden` 클래스(`display: none`)로 DOM은 유지하되 화면에서 숨김
- `data-testid="settings-drawer-root"` 추가하여 테스트 용이성 확보
- drawer aside에 `transition-transform` 클래스 추가 (향후 슬라이드 애니메이션 대비)

### 테스트 업데이트
- `settings-drawer.test.tsx`: "렌더링되지 않아야 함" 테스트를 "hidden 클래스 존재" 검증으로 변경

## Components Implemented
- `ui/src/components/layout/SettingsDrawer.tsx`: hidden 클래스 방식으로 전환
- `ui/src/components/layout/__tests__/settings-drawer.test.tsx`: 테스트 어서션 업데이트

## Result — 검증 결과

### Verification
- Build: pass (next build 성공)
- Tests: 122 passed, 0 failed

## Interface Dependencies
- API endpoints consumed: `/api/config` (SWR, isOpen일 때만 fetch)
- Shared types: `ConfigData` (SettingsDrawer 내부 정의)

## Downstream Context
- SettingsDrawer는 항상 DOM에 존재하며 `hidden` 클래스로 표시/숨김 전환
- Playwright MCP에서 settings-toggle 클릭 후 `role="dialog"` 감지 가능
- `formatDateLabel` 분리는 시간 관계상 미수행 (Major, 비필수)

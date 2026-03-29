# test-r1 — 1차 테스트 리포트

## Status: completed
Agent: tester | Model: inline (Team Lead) | Level: 2

## What — 수행 항목

### Vitest 단위 테스트
- React 이중 인스턴스 이슈 수정 (vitest.config.ts — root node_modules/react로 alias 통일)
- 수정 후 결과: **122/122 pass** (16 test files)

### Playwright MCP 브라우저 검증

| 페이지 | URL | 렌더링 | 네비게이션 | 결과 |
|--------|-----|--------|-----------|------|
| 타임라인 | `/` | OK — TopBar + 타이틀 + 필터 + 빈 상태 | OK | PASS |
| 설계 문서 | `/docs` | OK — 문서 트리 + 뷰어 + 배너 간소화 | 탭 클릭 OK | PASS |
| 설정 드로어 | ⚙ 클릭 | **미표시** — 버튼 active되나 드로어 DOM 미렌더링 | - | **FAIL** |
| 런 상세 | `/runs/[id]` | 데이터 없어 미검증 | - | SKIP |

### 콘솔 에러
- HMR 관련 static file 404 (dev 서버 stale) — 실제 버그 아님
- API 404: `/api/graph`, `/api/state`, `/api/config` — dev 환경에서 API 서버 미실행 시 정상

## How — 접근 방식
- vitest.config.ts에서 `@testing-library/react`가 사용하는 React(root node_modules)와 소스 코드 React(ui/node_modules)가 불일치하는 것을 발견
- alias를 root React로 통일하여 해결
- Playwright MCP로 실제 브라우저 접속하여 DOM 스냅샷 검증

## Result

### 버그 목록

| # | 심각도 | 설명 | 재현 방법 | 파일 |
|---|--------|------|----------|------|
| 1 | **Major** | SettingsDrawer가 열리지 않음 | TopBar ⚙ 클릭 → 드로어 미표시 | `AppShell.tsx`, `SettingsDrawer.tsx` |

### 수정된 파일
- `ui/vitest.config.ts` — React alias를 root node_modules로 통일

## Downstream Context
- vitest 122/122 pass — React 이중 인스턴스 이슈 해결됨
- **SettingsDrawer 버그**: AppShell.tsx의 `isSettingsOpen` 상태가 TopBar의 `onSettingsOpen`으로 전달되지만, 실제 렌더링이 안 됨. 원인: 드로어가 `isOpen=false`일 때 DOM을 완전히 제거하거나, CSS로 숨기는 방식 확인 필요
- /runs/[runId] 페이지는 실제 런 데이터 없이 검증 불가 — improve 노드에서 더미 데이터로 테스트 필요

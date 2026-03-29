# review-r1 — 1차 코드리뷰 리포트

## Status: completed
Agent: reviewer | Model: inline (Team Lead) | Level: 3

## What — 리뷰 대상
- L0: TopBar.tsx, SettingsDrawer.tsx, AppShell.tsx
- L1: page.tsx(타임라인), runs/[runId]/page.tsx, docs/page.tsx
- L1: 7개 타임라인 컴포넌트, 4개 런 상세 컴포넌트

## How — 리뷰 방법
- 코드 읽기 + Playwright MCP 브라우저 검증 결과 분석
- test-r1 결과(vitest 122/122) 기반 품질 확인

## Result — 발견 사항

### Critical (즉시 수정 필요)

| # | 파일 | 이슈 | 설명 |
|---|------|------|------|
| 1 | `AppShell.tsx` / `SettingsDrawer.tsx` | SettingsDrawer 미표시 | Playwright에서 ⚙ 클릭 시 드로어 DOM이 렌더링되지 않음. `SettingsDrawer`가 `isOpen=false`일 때 `return null`하는데, AppShell에서 `setIsSettingsOpen(true)`가 TopBar의 onClick과 올바르게 연결되었는지 확인 필요. Headless 환경에서 이벤트 전파 이슈일 수 있음 — `data-testid="settings-toggle"` 버튼의 onClick이 AppShell의 `setIsSettingsOpen`까지 도달하는지 확인 |

### Major (개선 권장)

| # | 파일 | 이슈 | 설명 |
|---|------|------|------|
| 2 | `page.tsx` (타임라인) | `formatDateLabel` 테스트 부재 | 유틸 함수가 컴포넌트 내에 inline 정의됨. 별도 유틸로 분리하면 단위 테스트 가능 |
| 3 | `docs/page.tsx` | `/api/aidlc/docs` 0개 문서 | dev 환경에서 API가 aidlc-docs를 읽지 못함. 하지만 이는 API 서버 설정 문제이므로 UI 코드의 결함은 아님 |
| 4 | `runs/[runId]/page.tsx` | `use(params)` 패턴 | Next.js 15의 async params에 맞는 패턴이나, React 19의 `use()` hook은 서버 컴포넌트에서 더 자연스러움. client component에서는 향후 경고 가능성. 현재는 동작함 |

### Good Practices (유지)

- TopBar: `aria-label`, `aria-current`, `data-testid` 접근성 잘 적용
- SettingsDrawer: 조건부 SWR fetch (`isOpen ? url : null`)
- NodeAccordion: lazy fetch (펼칠 때만 scratchpad 로드)
- compute-levels.ts: 순수 함수로 분리, 단위 테스트 가능
- TimelineFilter: 컴포넌트 분리 + 타입 export (`RunStatusFilter`)

## Downstream Context
### improve-r1에서 수정해야 할 사항:
1. **[Critical]** SettingsDrawer가 Playwright에서 열리지 않는 이슈 디버그 및 수정
2. **[Major]** `formatDateLabel`을 별도 유틸로 분리 (선택)
3. 전체 vitest 122/122 pass 상태 유지할 것
4. 수정 후 Playwright MCP로 SettingsDrawer 열림 재검증 필수

# code-review

## Status: completed
Agent: reviewer | Model: inline (Team Lead) | Level: 4

## What — Tasks Performed
- 통합 코드베이스 전체 변경 리뷰 (44 files, +4862 -177)
- API 파서 로직 검증
- 용어 통일 검증
- 테스트 품질 검증

## How — Approach & Decisions
- parser.ts: 파싱 로직이 실제 aidlc-state.md 포맷과 정확히 일치하는지 검증
- route.ts: found 필드와 에러 처리 적절성 확인
- 용어: page.tsx, Sidebar.tsx, bundles/settings/team 페이지에서 구용어 제거 확인

## Result — Completion Evidence
### 코드 품질 평가

**[GOOD] parser.ts**: 깔끔한 구현. 하위 호환(## N. StageName) + 신규 포맷(### PHASE) 모두 지원. 타입 안전.
**[GOOD] route.ts**: found 필드로 "데이터 없음" vs "시작 전" 정확히 구분. 에러 처리 적절.
**[GOOD] docs/helpers.ts**: 폴더 매핑 상수 + 동적 construction 스캔. 하위 호환(docs[] 유지 + groups[] 추가).
**[GOOD] page.tsx (dashboard)**: 4단계 흐름, intent 요약, 에이전트 현황 — 설계와 일치.
**[GOOD] remaining-pages**: 46개 정적 검증 테스트 — 가장 신뢰도 높은 테스트.

### 수정 필요 사항 (3건)

**[FIX-1] vitest.config.ts — React 중복 인스턴스 해결**
현재 `path.resolve(__dirname, 'node_modules/react')` 방식이 pnpm에서 불안정.
수정: `require.resolve('react')`, `require.resolve('react-dom/client')` 로 정확한 경로 사용.

**[FIX-2] sidebar.test.tsx — 다중 매칭 선택자**
`getByText(/팀 템플릿/)` → 2개 요소 매칭. `getAllByText` 사용 필요.

**[FIX-3] develop-page.test.tsx, design-page.test.tsx — SWR/fetch 모킹 불완전**
useSWR 모킹이 React 렌더링 전에 제대로 설정되지 않음. 모킹 패턴 수정 필요.

## Downstream Context
### improve 노드가 수정해야 할 항목

**improve-backend**: 없음 (API 코드 품질 양호, 테스트 통과)

**improve-frontend**: 3건 수정
1. `ui/vitest.config.ts` — require.resolve 방식으로 React alias 수정
2. `ui/src/components/layout/__tests__/sidebar.test.tsx` — getAllByText 사용
3. `ui/src/app/develop/__tests__/develop-page.test.tsx` — SWR 모킹 패턴 수정
4. `ui/src/app/design/__tests__/design-page.test.tsx` — SWR 모킹 패턴 수정

# test-all

## Status: completed
Agent: tester | Model: inline (Team Lead) | Level: 3

## What — Tasks Performed
- 통합 코드베이스 전체 vitest 실행 (7 test files, 83 tests)
- next build 검증 (타입 에러 없음)
- 실패 원인 분석

## How — Approach & Decisions
- pnpm 모노레포 환경에서 React 중복 인스턴스 문제 식별
- vitest.config.ts에 react/react-dom alias 설정했으나 일부 테스트에서 여전히 발생
- sidebar 테스트에서 `getByText` vs `getAllByText` 선택자 이슈 식별

## Result — Completion Evidence
- next build: PASS (모든 페이지 빌드 성공, 타입 에러 없음)
- Tests: 69 passed, 14 failed (3 test files)

### 통과한 테스트 (69/69)
- state-parser.test.ts: 5/5 PASS (파서 로직 + 스냅샷)
- docs-api.test.ts: 7/7 PASS (그룹핑 + 레이블)
- dashboard.test.tsx: 11/11 PASS (용어 + 데이터 표시)
- remaining-pages.test.ts: 46/46 PASS (정적 파일 분석)

### 실패한 테스트 (14/14)
1. **develop-page.test.tsx (3 tests)**: React 중복 인스턴스 — `useState` null 에러
2. **design-page.test.tsx (7 tests)**: React 중복 인스턴스 — `useState` null 에러
3. **sidebar.test.tsx (4 tests)**: React 중복 인스턴스 + `getByText(/팀 템플릿/)` 다중 매칭

## Downstream Context
### 수정 필요 사항 (improve 노드용)

**Issue 1: React 중복 인스턴스 (develop-page, design-page, sidebar)**
- 원인: pnpm hoisting으로 react 모듈이 여러 경로에 존재
- vitest.config.ts의 resolve.alias가 불충분
- 해결: vitest.config.ts에서 react, react-dom을 `require.resolve`로 정확한 단일 경로 지정

**Issue 2: sidebar.test.tsx 선택자 오류**
- `getByText(/팀 템플릿/)` → 2개 요소 매칭 (네비게이션 + 하단 배지)
- 해결: `getAllByText(/팀 템플릿/)` 사용 후 length 검증, 또는 더 구체적인 선택자 사용

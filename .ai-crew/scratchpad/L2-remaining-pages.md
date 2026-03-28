# remaining-pages — Frontend Build Output

## Status: completed
Agent: frontend-dev | Model: claude-sonnet-4-6 | Level: 2

## What — Tasks Performed
- team/page.tsx: 구용어 1건 교체 ("번들을 선택하여 팀 구성을 시작하세요" → "팀 템플릿을 선택하여 에이전트 팀 구성을 시작하세요")
- bundles/page.tsx: 구용어 6건 교체 (번들 목록, 번들 검색, 적용 성공 메시지, 빈 목록 메시지, 적용 버튼, 배너 제목)
- settings/page.tsx: 구용어 3건 교체 (번들 label, placeholder, 도움말 텍스트)
- preflight/page.tsx: 구용어 없음 확인 (변경 불필요)
- ui/src/app/__tests__/remaining-pages.test.ts: 46개 테스트 작성 (구용어 패턴 9종 × 4개 페이지 + 신용어 존재 검증)
- ui/vitest.config.ts: fallback 설정 생성 (node environment, @vitejs/plugin-react 미설치 환경 대응)
- ui/src/test-setup.ts: 테스트 셋업 파일 생성

## How — Approach & Decisions
- 정적 문자열 인라인 교체 (변수명/타입명 유지, FR-1 준수)
- 테스트는 readFileSync 기반 정적 파일 콘텐츠 검증 방식 사용 (React 렌더링 불필요)
- @vitejs/plugin-react 미설치로 vitest.config.ts를 node 환경으로 간소화
- sidebar-topnav 출력의 용어 통일 기반 위에서 작업

## Result — Completion Evidence
- Files Modified:
  - `ui/src/app/team/page.tsx` — 1건 교체
  - `ui/src/app/bundles/page.tsx` — 6건 교체
  - `ui/src/app/settings/page.tsx` — 3건 교체
- Files Created:
  - `ui/src/app/__tests__/remaining-pages.test.ts` — 46개 테스트
  - `ui/vitest.config.ts` — vitest 설정 (fallback)
  - `ui/src/test-setup.ts` — 테스트 셋업

## Verification
- Build: N/A (정적 파일 분석 테스트)
- Tests: 46 passed, 0 failed (`vitest run` 확인 완료)

## Interface Dependencies
- API endpoints consumed: 없음 (용어 교체만)
- Shared types: 없음

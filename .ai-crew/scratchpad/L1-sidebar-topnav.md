# sidebar-topnav

## Status: completed
Agent: frontend-dev | Model: claude-sonnet-4-6 | Level: 1

## What — Tasks Performed
- Sidebar.tsx: CTA "신규 프로젝트" → "프로젝트 전환" 변경
- Sidebar.tsx: 하단 배지 "팀 템플릿: {bundleName}" 형식
- TopNav.tsx: 구용어 없음 확인
- sidebar.test.tsx: 4개 테스트 작성

## How — Approach & Decisions
- 정적 문자열 인라인 교체
- vitest + @testing-library/react + jsdom 환경

## Result — Completion Evidence
- Files: Sidebar.tsx, TopNav.tsx, sidebar.test.tsx, vitest.config.ts, test-setup.ts
- Commits: 0f74824

## Downstream Context
- CTA: "프로젝트 전환" 완료
- 네비게이션: /bundles → "팀 템플릿" 완료
- 하단 배지: "팀 템플릿: {bundleName}" 완료
- 구용어 "신규 프로젝트", "번들" 제거 완료
- remaining-pages는 이 변경 기반으로 각 페이지 내부 용어 통일 필요

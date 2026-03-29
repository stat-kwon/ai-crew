# docs-page — Frontend Build Output

## What
설계 문서 페이지를 `/design` 라우트에서 `/docs` 라우트로 이동하고, 전체 폭 레이아웃에 맞춰 스타일을 조정했다.

## How

### 1. 라우트 이동
- `ui/src/app/design/page.tsx` -> `ui/src/app/docs/page.tsx` 로 이동
- `ui/src/app/design/` 디렉토리 삭제 (테스트 포함)
- 컴포넌트 이름 `DesignPage` -> `DocsPage` 로 변경

### 2. 스타일 조정 (전체 폭 대응)
- 좌측 문서 트리: `col-span-7` -> `col-span-4` (좁혀서 트리 역할에 집중)
- 우측 마크다운 뷰어: `col-span-5` -> `col-span-8` (넓혀서 문서 가독성 향상)
- 최상위 컨테이너에 `mx-auto max-w-screen-2xl` 적용하여 극단적 와이드 스크린 대응
- 문서 트리에 `max-h-[calc(100vh-320px)] overflow-y-auto` 추가
- 파일 항목을 `<div onClick>` -> `<button>` 시맨틱 태그로 변경 (접근성 개선)

### 3. 하단 배너 간소화
- "명령 실행" 버튼 제거 (CLI 영역이므로)
- 안내 문구로 대체: "CLI에서 /crew:elaborate를 실행하세요"

### 4. 페이지 제목 변경
- "설계 단계" -> "설계 문서" (TopBar 탭명과 일치)

### 5. 참조 업데이트
- `Sidebar.tsx`: `/design` -> `/docs`, 레이블 "설계 단계" -> "설계 문서"
- `TopNav.tsx`: `/design` -> `/docs`, 레이블 "설계 단계" -> "설계 문서"
- `page.tsx` (홈): 링크 `/design` -> `/docs`

## Components Implemented
- `ui/src/app/docs/page.tsx`: DocsPage — 설계 문서 페이지 (라우트 이동 + 스타일 조정)
- `ui/src/app/docs/__tests__/docs-page.test.tsx`: 15개 테스트

## Result

### Verification
- Build: pass (TypeScript 에러 없음, 기존 worktree 환경 이슈만 존재)
- Tests: 15 passed, 0 failed (docs-page.test.tsx)
- 전체 테스트: 77 passed (기존 2개 실패는 worktree 환경 이슈 — swr/next 모듈 해석)

### 변경 파일
| 작업 | 파일 |
|------|------|
| 신규 | `ui/src/app/docs/page.tsx` |
| 신규 | `ui/src/app/docs/__tests__/docs-page.test.tsx` |
| 삭제 | `ui/src/app/design/page.tsx` |
| 삭제 | `ui/src/app/design/__tests__/design-page.test.tsx` |
| 수정 | `ui/src/components/layout/Sidebar.tsx` |
| 수정 | `ui/src/components/layout/TopNav.tsx` |
| 수정 | `ui/src/app/page.tsx` |

## Interface Dependencies
- API endpoints consumed: `/api/aidlc/state`, `/api/aidlc/docs`, `/api/aidlc/docs?path=`
- Shared types: 없음 (페이지 내 자체 정의)

## Downstream Context
- TopBar (layout-overhaul)에서 `/docs` 탭 링크가 이 페이지로 연결됨
- 병합 시 Sidebar.tsx/TopNav.tsx 변경은 layout-overhaul의 TopBar.tsx로 대체될 예정

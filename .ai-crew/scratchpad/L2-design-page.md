# design-page — Frontend Build Output

## Status: completed
Agent: frontend-dev | Model: claude-sonnet-4-6 | Level: 2

## What — 수행한 작업

- **Task 1**: `DocGroup`, `DocGroupFile`, `DocsResponse` 인터페이스 추가 (api-accuracy 응답 구조에 맞춤)
- **Task 2**: docs API helpers.ts 생성 — `FOLDER_MAPPINGS`, `groupDocsByFolder()`, `getFileLabel()` 구현
- **Task 3**: docs route.ts 업데이트 — `groups[]` 반환 + `?path=` 쿼리 파라미터 지원
- **Task 4**: design/page.tsx 전면 재작성 — 그룹 카드 기반 레이아웃 구현
- **Task 5**: vitest.config.ts + test-setup.ts 생성 (React 인스턴스 중복 방지 설정 포함)
- **Task 6**: 7개 컴포넌트 테스트 작성 및 통과

## How — 접근 방식 및 결정

- **그룹 뷰**: flat list를 `groups[]` 기반 그룹 카드로 교체. 각 그룹은 폴더 아이콘 + 한글 레이블 + 파일 목록으로 구성
- **한글 레이블**: `file.label` 우선, fallback으로 파일명 변환 유지
- **마크다운 프리뷰**: 기존 react-markdown + selectedDoc 상태 패턴 그대로 유지
- **빈 상태**: `groups.length === 0` 또는 `docsData === null`일 때 "아직 생성된 문서가 없습니다" 표시
- **React 중복 문제 해결**: vitest.config.ts에서 `react`/`react-dom` alias를 root node_modules의 단일 인스턴스로 강제 지정

## Result — 검증 결과

### Verification
- Build: N/A (Next.js 페이지 — 런타임 빌드는 통합 이후 검증)
- Tests: **7 passed, 0 failed** (1 test file)

```
 ✓ src/app/design/__tests__/design-page.test.tsx (7 tests) 38ms
 Test Files  1 passed (1)
 Tests  7 passed (7)
```

### Files Created/Modified
| 파일 | 작업 |
|------|------|
| `ui/src/app/design/page.tsx` | 신규 (그룹 매핑 뷰) |
| `ui/src/app/design/__tests__/design-page.test.tsx` | 신규 |
| `ui/src/app/api/aidlc/docs/helpers.ts` | 신규 |
| `ui/src/app/api/aidlc/docs/route.ts` | 수정 (groups 반환 추가) |
| `ui/vitest.config.ts` | 신규 |
| `ui/src/test-setup.ts` | 신규 |
| `ui/package.json` | 수정 (test 스크립트, vitest 의존성) |
| `package.json` | 수정 (@testing-library 등 devDep 추가) |

### Branch
`crew/ui-improvement-20260328-1/design-page`

## Interface Dependencies
- **API 엔드포인트**: `GET /api/aidlc/docs` → `{ groups: DocGroup[] }` 소비
- **공유 타입**:
  - `DocGroup { folder, label, sortOrder, files[] }`
  - `DocGroupFile { name, label, path }`
- **upstream**: api-accuracy (helpers.ts/route.ts 변경 사항 포함)

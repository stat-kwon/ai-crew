# api-accuracy — Backend Build Output

## Status: completed
Agent: backend-dev | Model: claude-opus-4-6 | Level: 1

## What — 수행한 작업
- **Task 1**: `parseAidlcState()` 함수를 `state/parser.ts`로 추출, `AidlcStateResult` 타입 정의 (`found`, `currentStage` 포함)
- **Task 2**: `### INCEPTION PHASE` + 체크박스 패턴 인식 로직 추가, 기존 `## N. StageName` 패턴 하위 호환 유지
- **Task 3**: `state/route.ts`에서 parser import, `found` 필드 반환 (파일 미존재 시 `found: false`)
- **Task 4**: `docs/helpers.ts` 신규 생성 — `groupDocsByFolder()`, `getFileLabel()`, `FOLDER_MAPPINGS` 상수 구현
- **Task 5**: `ui/vitest.config.ts` 생성 (`@/*` path alias 포함), `package.json`에 vitest devDep + test scripts 추가
- **Task 6**: `state-parser.test.ts` — 5개 테스트 케이스 (새 포맷, 레거시, 빈 콘텐츠, 다중 Phase, 스냅샷)
- **Task 7**: `docs-api.test.ts` — 7개 테스트 케이스 (getFileLabel 3개, groupDocsByFolder 4개)

## How — 접근 방식 및 결정
- **파서 추출**: route handler와 분리하여 순수 함수 단위 테스트 가능하도록 설계
- **하위 호환**: 기존 `## N. StageName` 패턴과 새 `### PHASE` 패턴 모두 인식
- **Phase별 Stage 그룹핑**: `## Stage Progress` 섹션 내부에서만 Phase 헤더 아래 체크박스를 stage로 처리
- **docs 그룹핑**: `FOLDER_MAPPINGS` 상수 기반 매핑, 미등록 폴더는 폴더명을 label로 fallback

## Result — 검증 결과

### Verification
- Build: N/A (순수 함수 모듈, Next.js 빌드 불필요)
- Tests: **12 passed, 0 failed** (2 test files)

### Files Created/Modified
| 파일 | 작업 |
|------|------|
| `ui/src/app/api/aidlc/state/parser.ts` | 신규 |
| `ui/src/app/api/aidlc/state/route.ts` | 수정 |
| `ui/src/app/api/aidlc/docs/helpers.ts` | 신규 |
| `ui/src/app/api/aidlc/docs/route.ts` | 수정 |
| `ui/vitest.config.ts` | 신규 |
| `ui/package.json` | 수정 |
| `ui/src/app/api/aidlc/__tests__/state-parser.test.ts` | 신규 |
| `ui/src/app/api/aidlc/__tests__/docs-api.test.ts` | 신규 |

## Downstream Context

### Interface Dependencies
**state API 응답** (`dashboard-cards`, `design-page`가 소비):
```typescript
interface StateApiResponse {
  stages: StageState[];
  found: boolean;         // false이면 "설계 데이터 없음"
  currentStage?: string;  // 현재 활성 단계명
  raw?: string;
}
```

**docs API 응답** (`design-page`가 소비):
```typescript
interface DocsApiResponse {
  docs: DocFile[];       // 기존 flat list (하위 호환)
  groups: DocGroup[];    // 그룹화된 문서 목록 (신규)
}
```

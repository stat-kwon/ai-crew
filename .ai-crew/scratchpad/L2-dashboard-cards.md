# dashboard-cards — Frontend Build Output

## Status: completed
Agent: frontend-dev | Model: claude-opus-4-6 | Level: 2

## What — 수행한 작업
- **Task 1**: 용어 교체 — "현재 팀 구성" → "현재 에이전트 팀", "명 활동 중" → "개 에이전트 활동 중", "팀원 현황" → "에이전트 현황"
- **Task 2**: `getDesignProgress` 함수에서 "시작 전" → "설계 데이터 없음" (2개소 모두 교체), `found` 필드 활용
- **Task 3**: 마지막 실행 카드에 `intent.description` 우선 표시, `runId`를 부제목으로 변경, "실행 기록 없음" → "아직 실행된 작업이 없습니다"
- **Task 4**: 개발 흐름 5단계 → 4단계 축소 (elaborate → preflight → run → integrate), 다음 단계 안내 메시지 업데이트
- **Task 5**: 최근 실행 목록에 `intentDescription` 우선 표시, runId를 하위 텍스트로 표시
- **Task 6**: Badge 컴포넌트에 `size` variant 추가 (프로토타입 기준)
- **Task 7**: 테스트 11개 작성 (용어 검증 8개 + 데이터 표시 3개), vitest 설정 추가

## How — 접근 방식 및 결정
- 프로토타입(main 워킹 디렉토리) 기반으로 전체 page.tsx를 재작성 (Cloudscape → Tailwind + shadcn/ui)
- `AidlcStateResponse` 인터페이스에 `found: boolean`, `currentStage?: string` 추가 (api-accuracy 유닛 결과 반영)
- `StateData` 인터페이스에 `intent?: { description?: string }` 추가 (RunManifest 구조 반영)
- `RunEntry` 인터페이스에 `intentDescription?: string` 추가
- `getDesignProgress` 함수에 `found` 파라미터 추가 — `found === false`일 때 즉시 "설계 데이터 없음" 반환
- currentStep 로직 5단계 → 4단계로 조정

## Result — 검증 결과

### Verification
- Build: N/A (프로토타입 코드, Next.js 빌드는 통합 시 검증)
- Tests: **11 passed, 0 failed** (1 test file)

### Files Created/Modified
| 파일 | 작업 |
|------|------|
| `ui/src/app/page.tsx` | 수정 (전체 재작성 — Cloudscape → Tailwind 프로토타입 + 용어/데이터 개선) |
| `ui/src/components/ui/badge.tsx` | 수정 (size variant 추가, 프로토타입 기준으로 업데이트) |
| `ui/src/app/__tests__/dashboard.test.tsx` | 신규 (용어 검증 + 데이터 표시 테스트) |
| `ui/vitest.config.ts` | 신규 (vitest 설정 — api-accuracy 유닛 fallback) |
| `ui/src/test-setup.ts` | 신규 (testing-library jest-dom setup) |
| `ui/package.json` | 수정 (vitest, testing-library devDeps + test scripts 추가) |

## Downstream Context

### Interface Dependencies
**state API 소비** (`/api/state`):
```typescript
interface StateData {
  bundleName: string;
  runId?: string;
  intent?: { description?: string };
  nodes: Record<string, { status: string }>;
}
```

**aidlc/state API 소비** (`/api/aidlc/state`):
```typescript
interface AidlcStateResponse {
  stages: AidlcStage[];
  found: boolean;
  currentStage?: string;
}
```

**runs API 소비** (`/api/runs`):
```typescript
interface RunEntry {
  runId: string;
  state: string;
  intentDescription?: string;
  // ...기타 필드
}
```

### 용어 교체 완료 현황
| 구용어 | 신용어 | 상태 |
|--------|--------|------|
| 현재 팀 구성 | 현재 에이전트 팀 | 완료 |
| 팀원 현황 | 에이전트 현황 | 완료 |
| 명 활동 중 | 개 에이전트 활동 중 | 완료 |
| 시작 전 (fallback) | 설계 데이터 없음 | 완료 |
| 실행 기록 없음 | 아직 실행된 작업이 없습니다 | 완료 |
| 5단계 흐름 | 4단계 흐름 | 완료 |

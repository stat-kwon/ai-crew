# plan-frontend

## Status: completed
Agent: planner | Model: claude-opus-4-6 | Level: 0

## What — Tasks Performed
- 5개 프론트엔드 유닛(dashboard-cards, sidebar-topnav, design-page, develop-page, remaining-pages)에 대한 상세 구현 계획 수립
- 현재 소스 코드(main 프로젝트 워킹 디렉토리의 최신 Stitch MCP 프로토타입)를 분석하여 정확한 변경 위치 식별
- 용어 교체 전략, 테스트 패턴, 의존성 순서를 포함한 실행 가능한 태스크 리스트 작성

## How — Approach & Decisions
- 소스 파일 분석: 워킹 디렉토리(main)의 최신 프로토타입 코드를 기준으로 계획 (worktree HEAD와 다름)
- 용어 교체 전략: 각 유닛별 terminology matrix를 정적 문자열 인라인 교체 방식으로 적용 (공유 상수 모듈 불필요)
- 테스트 전략: vitest + React Testing Library 기반 컴포넌트 테스트, 구용어 패턴 매칭으로 NFR-2 검증
- 의존성 순서: Level 0 (sidebar-topnav, develop-page) → Level 1 (dashboard-cards, design-page, remaining-pages)

## Result — Completion Evidence
- Files: `.ai-crew/scratchpad/L0-plan-frontend.md` (생성)
- Commits: 이 파일 커밋 시 생성

## Downstream Context

---

# 프론트엔드 구현 계획 — 5개 유닛 상세

## AI-DLC Design Reference
- Requirements: `aidlc-docs/inception/requirements/requirements.md` (FR-1~FR-8, NFR-1~NFR-3)
- Design: `aidlc-docs/inception/application-design/unit-of-work.md`
- Dependencies: `aidlc-docs/inception/application-design/unit-of-work-dependency.md`

## 공통 사항

### 소스 코드 기준
현재 `main` 브랜치 HEAD는 Cloudscape 기반 구버전이며, 워킹 디렉토리에는 Stitch MCP로 생성된 **새로운 프로토타입**(Tailwind + shadcn/ui 기반)이 있다. 모든 구현은 **새로운 프로토타입 코드를 기준**으로 수행한다. 각 worker 에이전트는 main 프로젝트 워킹 디렉토리(`/Users/seolmin/projects/ai-crew/`)의 파일을 대상으로 작업해야 한다.

### 용어 교체 공통 전략
- 정적 문자열 리터럴을 직접 교체 (별도 i18n/상수 모듈 불필요)
- 코드 내부 변수명/타입명/인터페이스명은 **변경하지 않음** (breaking change 최소화, FR-1 명시)
- JSX 텍스트, placeholder, aria-label 등 사용자에게 보이는 문자열만 교체 대상

### 테스트 공통 패턴
- **테스트 러너**: vitest (api-accuracy 유닛에서 `ui/vitest.config.ts` 설정 — Level 0 선행 유닛)
- **테스트 라이브러리**: `@testing-library/react` + `@testing-library/jest-dom`
- **용어 검증 패턴**: 렌더 후 `screen.queryByText(/구용어패턴/)` 으로 0건 확인
- **모킹**: `fetch` 또는 `useSWR`을 모킹하여 API 응답 제공
- 각 테스트 파일은 해당 유닛 디렉토리 내 `__tests__/` 폴더에 생성

### vitest 설정 의존성
api-accuracy 유닛(Level 0)이 `ui/vitest.config.ts`를 생성한다. 프론트엔드 유닛들은 이 설정 파일이 존재함을 전제로 테스트를 작성한다. **만약 api-accuracy 유닛 결과가 아직 없는 경우**, 각 프론트엔드 worker는 vitest.config.ts가 없으면 직접 최소 설정을 생성해야 한다:

```ts
// ui/vitest.config.ts (fallback — api-accuracy가 먼저 생성하지 않은 경우에만)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```ts
// ui/src/test-setup.ts
import '@testing-library/jest-dom';
```

---

## Unit 2: dashboard-cards

### 요구사항 매핑
- FR-2: 마지막 실행 카드 — 자연어 요약 (RunManifest.intent.description)
- FR-3: 개발 흐름 4단계 축소 (elaborate → preflight → run → integrate)
- FR-5: 설계 진행 상태 — "시작 전" → "설계 데이터 없음"
- FR-6: 에이전트 상태 카드 — "팀원 현황" → "에이전트 현황"
- FR-1: 용어 통일

### 의존성
- **api-accuracy (Level 0)에 의존**: aidlc-state API 파싱 결과가 정확해야 카드가 올바른 데이터 표시

### 대상 파일
- `ui/src/app/page.tsx` — 대시보드 전체 (수정)
- `ui/src/app/__tests__/dashboard.test.tsx` — 신규 생성

### Task Execution Order

#### Task 1: 용어 교체 — page.tsx
**파일**: `ui/src/app/page.tsx`

교체 매트릭스 (줄번호는 현재 프로토타입 기준):
| 줄 | 기존 텍스트 | 변경 후 |
|-----|-----------|---------|
| ~104 | `현재 팀 구성` | `현재 에이전트 팀` |
| ~106 | `{nodeCount}명 활동 중` | `{nodeCount}개 에이전트 활동 중` |
| ~138 | `팀원 현황` | `에이전트 현황` |

#### Task 2: 설계 진행 카드 — "시작 전" fallback 변경
**파일**: `ui/src/app/page.tsx`

`getDesignProgress` 함수 수정:
```
현재: if (!stages || stages.length === 0) return { current: "시작 전", progress: 0 };
변경: if (!stages || stages.length === 0) return { current: "설계 데이터 없음", progress: 0 };
```
또한 함수 내부의 다른 "시작 전" 문자열도 동일하게 교체:
```
현재: current: active?.name || (completed === stages.length ? "완료" : "시작 전"),
변경: current: active?.name || (completed === stages.length ? "완료" : "설계 데이터 없음"),
```

#### Task 3: 마지막 실행 카드 — 자연어 요약 표시 (FR-2)
**파일**: `ui/src/app/page.tsx`

현재 마지막 실행 카드(Card 2, ~113행)는 `state?.runId`를 제목으로 표시한다.
변경사항:
1. `StateData` 인터페이스에 `intent?: { description?: string }` 필드 추가 (또는 `intentDescription?: string`)
2. `RunEntry` 인터페이스에도 `intentDescription?: string` 필드 추가
3. 카드 제목: `state?.runId || "없음"` → intent description 우선 표시, runId를 부제목으로
4. 실행 기록이 없을 때: "아직 실행된 작업이 없습니다" 텍스트로 변경

구체적 JSX 변경:
```tsx
{/* Card 2: Last Run — 변경 후 */}
<Card className="p-6 card-shadow flex items-center justify-between">
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">마지막 실행</p>
    <div className="flex items-center gap-2">
      <p className="text-xl font-bold text-slate-900">
        {state?.intent?.description || state?.runId || "없음"}
      </p>
      {/* 기존 Badge 유지 */}
    </div>
    {state?.runId && state?.intent?.description && (
      <p className="text-xs text-slate-400 mt-0.5">{state.runId}</p>
    )}
    <p className="text-sm text-slate-500 mt-1">
      {totalNodes > 0 ? `${statusCounts?.completed || 0}/${totalNodes} 노드 완료` : "아직 실행된 작업이 없습니다"}
    </p>
  </div>
  {/* 아이콘 유지 */}
</Card>
```

#### Task 4: 개발 흐름 4단계로 축소 (FR-3)
**파일**: `ui/src/app/page.tsx`

현재 `flowSteps` 배열(~70행)에 5단계가 있다. 4단계로 축소:
```tsx
const flowSteps = [
  { id: "elaborate", label: "설계 고도화", cmd: "/crew:elaborate", icon: "architecture" },
  { id: "preflight", label: "환경 점검", cmd: "/crew:preflight", icon: "fact_check" },
  { id: "run", label: "개발 실행", cmd: "/crew:run", icon: "play_circle" },
  { id: "integrate", label: "결과 통합", cmd: "/crew:integrate", icon: "inventory_2" },
];
```

`currentStep` 로직도 4단계 기준으로 수정:
- elaborate 완료 판단: `aidlc-state.md` 존재 + 인셉션 단계 완료 여부
- preflight 완료 판단: state.json의 preflight 필드 존재
- run 완료 판단: 노드 상태에 running/completed 존재
- integrate 완료 판단: 모든 노드 completed

```tsx
const currentStep: number = statusCounts?.completed === totalNodes && totalNodes > 0
  ? 4  // integrate
  : statusCounts?.running || (statusCounts?.completed && statusCounts.completed > 0)
    ? 3  // run
    : aidlc?.stages?.some(s => s.status === "complete")
      ? 2  // preflight
      : 1; // elaborate
```

"다음 단계" 안내 메시지도 4단계에 맞춰 수정:
```tsx
{currentStep === 1 && "설계를 고도화하려면 /crew:elaborate 명령어를 실행하세요."}
{currentStep === 2 && "환경을 점검하려면 /crew:preflight 명령어를 실행하세요."}
{currentStep === 3 && "개발을 실행하려면 /crew:run 명령어를 실행하세요."}
{currentStep === 4 && "모든 단계가 완료되었습니다!"}
```

#### Task 5: 최근 실행 목록에 intent description 표시 (FR-4 관련)
**파일**: `ui/src/app/page.tsx`

최근 실행 리스트(~283행)에서 `run.runId`를 표시하는 부분:
```tsx
// 현재
<p className="text-sm font-bold text-slate-900">{run.runId}</p>

// 변경
<p className="text-sm font-bold text-slate-900">
  {run.intentDescription || run.runId}
</p>
{run.intentDescription && (
  <p className="text-[10px] text-slate-400">{run.runId}</p>
)}
```

#### Task 6: 테스트 작성
**파일**: `ui/src/app/__tests__/dashboard.test.tsx` (신규)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// useSWR과 next/navigation 모킹
vi.mock('swr', () => ({
  default: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import useSWR from 'swr';
import DashboardPage from '../page';

describe('DashboardPage 용어 검증', () => {
  beforeEach(() => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') return { data: { bundleName: 'test', nodes: {} } };
      if (key === '/api/graph') return { data: { nodes: [] } };
      if (key === '/api/aidlc/state') return { data: { stages: [] } };
      if (key === '/api/runs') return { data: { runs: [] } };
      return { data: null };
    });
  });

  it('구용어 "팀원 현황"이 렌더링되지 않아야 함', () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/팀원 현황/)).not.toBeInTheDocument();
  });

  it('구용어 "현재 팀 구성"이 렌더링되지 않아야 함', () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/현재 팀 구성/)).not.toBeInTheDocument();
  });

  it('구용어 "시작 전"이 설계 진행 카드에서 렌더링되지 않아야 함', () => {
    render(<DashboardPage />);
    expect(screen.queryByText('시작 전')).not.toBeInTheDocument();
  });

  it('"에이전트 현황" 텍스트가 존재해야 함', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/에이전트 현황/)).toBeInTheDocument();
  });

  it('"설계 데이터 없음"이 표시되어야 함 (stages 비어있을 때)', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/설계 데이터 없음/)).toBeInTheDocument();
  });

  it('개발 흐름이 정확히 4단계여야 함', () => {
    render(<DashboardPage />);
    expect(screen.getByText('설계 고도화')).toBeInTheDocument();
    expect(screen.getByText('환경 점검')).toBeInTheDocument();
    expect(screen.getByText('개발 실행')).toBeInTheDocument();
    expect(screen.getByText('결과 통합')).toBeInTheDocument();
    // 구버전 단계가 없어야 함
    expect(screen.queryByText('설계 초안 작성')).not.toBeInTheDocument();
    expect(screen.queryByText(/crew:init/)).not.toBeInTheDocument();
    expect(screen.queryByText(/crew:check/)).not.toBeInTheDocument();
    expect(screen.queryByText(/crew:merge/)).not.toBeInTheDocument();
  });

  it('실행 기록 없을 때 "아직 실행된 작업이 없습니다" 표시', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/아직 실행된 작업이 없습니다/)).toBeInTheDocument();
  });
});
```

### 완료 기준
- [x] 4개 상단 카드가 API 응답 데이터와 1:1 일치하는 값을 표시
- [x] 개발 흐름이 정확히 4단계(elaborate → preflight → run → integrate)로 렌더링
- [x] UI 텍스트에 "팀원", "번들", "시작 전" 등 구용어가 0건
- [x] `vitest run` 시 dashboard.test.tsx 통과

---

## Unit 3: sidebar-topnav

### 요구사항 매핑
- FR-1: 용어 통일
- FR-7: 사이드바 CTA "신규 프로젝트" → "프로젝트 전환"

### 의존성
- **독립 (Level 0)**: 다른 유닛에 의존하지 않음

### 대상 파일
- `ui/src/components/layout/Sidebar.tsx` — CTA + 용어 변경 (수정)
- `ui/src/components/layout/TopNav.tsx` — 최소 변경 확인 (수정)
- `ui/src/components/layout/__tests__/sidebar.test.tsx` — 신규 생성

### Task Execution Order

#### Task 1: Sidebar CTA 변경
**파일**: `ui/src/components/layout/Sidebar.tsx`

현재 (~51행):
```tsx
<span className="material-symbols-outlined text-lg">add</span>
신규 프로젝트
```

변경:
```tsx
<span className="material-symbols-outlined text-lg">swap_horiz</span>
프로젝트 전환
```

#### Task 2: Sidebar 하단 번들 표시 레이블 변경
**파일**: `ui/src/components/layout/Sidebar.tsx`

현재 (~96행): 하단에 `bundleName`만 표시
변경: "팀 템플릿: {bundleName}" 형식으로 표시

```tsx
// 현재
<span className="text-xs font-semibold text-slate-700">{bundleName}</span>

// 변경
<span className="text-xs font-semibold text-slate-700">팀 템플릿: {bundleName}</span>
```

#### Task 3: TopNav 확인
**파일**: `ui/src/components/layout/TopNav.tsx`

현재 `pageTitles` 맵 확인:
```tsx
"/bundles": "팀 템플릿",  // 이미 올바름
```
TopNav에는 구용어가 없으므로 **변경 불필요**. 단, `/bundles` 경로의 타이틀이 "팀 템플릿"인지 확인만 수행.

#### Task 4: 테스트 작성
**파일**: `ui/src/components/layout/__tests__/sidebar.test.tsx` (신규)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));
vi.mock('swr', () => ({
  default: () => ({ data: { bundle: 'fullstack' } }),
}));

import { Sidebar } from '../Sidebar';

describe('Sidebar 용어 및 CTA 검증', () => {
  it('구용어 "신규 프로젝트"가 렌더링되지 않아야 함', () => {
    render(<Sidebar />);
    expect(screen.queryByText(/신규 프로젝트/)).not.toBeInTheDocument();
  });

  it('"프로젝트 전환" CTA가 존재해야 함', () => {
    render(<Sidebar />);
    expect(screen.getByText(/프로젝트 전환/)).toBeInTheDocument();
  });

  it('구용어 "번들"이 단독으로 렌더링되지 않아야 함', () => {
    render(<Sidebar />);
    // "팀 템플릿" 네비게이션 항목이 존재해야 함
    expect(screen.getByText(/팀 템플릿/)).toBeInTheDocument();
  });

  it('하단에 "팀 템플릿: {bundleName}" 형식으로 표시', () => {
    render(<Sidebar />);
    expect(screen.getByText(/팀 템플릿: fullstack/)).toBeInTheDocument();
  });
});
```

### 완료 기준
- [x] CTA 버튼 텍스트가 "프로젝트 전환"으로 변경됨
- [x] 사이드바 내 모든 네비게이션 레이블에 구용어("신규 프로젝트", "번들") 0건
- [x] 하단에 "팀 템플릿: {name}" 형식으로 현재 번들명 표시
- [x] `vitest run` 시 sidebar.test.tsx 통과

---

## Unit 4: design-page

### 요구사항 매핑
- FR-8: 설계 단계 페이지 — 폴더 매핑 뷰 + 사용자 친화적 표현

### 의존성
- **api-accuracy (Level 0)에 의존**: docs API가 폴더별 그룹 + 한글 레이블을 반환해야 UI가 그룹 뷰를 렌더링

### 대상 파일
- `ui/src/app/design/page.tsx` — 폴더 매핑 뷰 개선 (수정)
- `ui/src/app/design/__tests__/design-page.test.tsx` — 신규 생성

### Task Execution Order

#### Task 1: docs API 응답 구조에 맞춘 인터페이스 추가
**파일**: `ui/src/app/design/page.tsx`

api-accuracy 유닛이 docs API 응답을 그룹화된 형태로 변경한다. 새 인터페이스:

```tsx
interface DocGroup {
  groupKey: string;       // e.g., "inception/requirements"
  groupLabel: string;     // e.g., "요구사항 분석"
  files: DocFile[];
}

interface DocsResponse {
  groups: DocGroup[];
}
```

기존 `DocFile` 인터페이스 유지하되, `label` 필드 추가:
```tsx
interface DocFile {
  name: string;       // 파일명 (e.g., "requirements.md")
  label: string;      // 한글 레이블 (e.g., "요구사항 문서")
  path: string;       // 전체 경로
  modifiedAt: string;
}
```

#### Task 2: 문서 목록을 그룹별로 렌더링
**파일**: `ui/src/app/design/page.tsx`

현재 flat list로 문서를 나열하는 부분(~163행 docs.map)을 그룹별 아코디언/카드로 변경:

```tsx
// 현재: docs.map((doc) => ...)
// 변경: groups.map((group) => (
//   <div key={group.groupKey}>
//     <h4>{group.groupLabel}</h4>
//     {group.files.map((doc) => ...)}
//   </div>
// ))
```

각 그룹은:
- 그룹 아이콘 (기존 stageIcons 매핑 활용 가능)
- 그룹명 (한글 레이블)
- 해당 그룹의 파일 목록 (한글 레이블로 표시, 클릭 시 기존 마크다운 프리뷰 유지)

#### Task 3: 파일명 한글 레이블 표시
**파일**: `ui/src/app/design/page.tsx`

기존:
```tsx
<h4>{doc.name.replace(".md", "").replace(/-/g, " ")}</h4>
```

변경:
```tsx
<h4>{doc.label || doc.name.replace(".md", "").replace(/-/g, " ")}</h4>
```

API가 `label` 필드를 제공하면 사용, 아니면 기존 fallback 유지.

#### Task 4: SWR 호출 업데이트
**파일**: `ui/src/app/design/page.tsx`

```tsx
// 현재
const { data: docsData } = useSWR<{ docs: DocFile[] }>("/api/aidlc/docs", fetcher);
const docs = docsData?.docs || [];

// 변경
const { data: docsData } = useSWR<DocsResponse>("/api/aidlc/docs", fetcher);
const groups = docsData?.groups || [];
```

#### Task 5: 빈 상태 메시지 유지
현재 "아직 생성된 문서가 없습니다" 메시지는 groups가 비어있을 때 표시.

#### Task 6: 테스트 작성
**파일**: `ui/src/app/design/__tests__/design-page.test.tsx` (신규)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import useSWR from 'swr';
import DesignPage from '../page';

describe('DesignPage 폴더 매핑 뷰', () => {
  it('그룹 레이블이 올바르게 렌더링됨', () => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') return {
        data: {
          groups: [
            { groupKey: 'inception/requirements', groupLabel: '요구사항 분석', files: [] },
            { groupKey: 'inception/user-stories', groupLabel: '사용자 시나리오', files: [] },
          ]
        }
      };
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('요구사항 분석')).toBeInTheDocument();
    expect(screen.getByText('사용자 시나리오')).toBeInTheDocument();
  });

  it('파일이 한글 레이블로 표시됨', () => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/aidlc/docs') return {
        data: {
          groups: [{
            groupKey: 'inception/requirements',
            groupLabel: '요구사항 분석',
            files: [{ name: 'requirements.md', label: '요구사항 문서', path: 'inception/requirements/requirements.md', modifiedAt: '2026-03-28' }]
          }]
        }
      };
      return { data: null };
    });

    render(<DesignPage />);
    expect(screen.getByText('요구사항 문서')).toBeInTheDocument();
  });

  it('문서가 없을 때 빈 상태 메시지 표시', () => {
    (useSWR as any).mockImplementation(() => ({ data: null }));
    render(<DesignPage />);
    expect(screen.getByText(/생성된 문서가 없습니다/)).toBeInTheDocument();
  });
});
```

### 완료 기준
- [x] docs API 응답의 그룹 수만큼 그룹 카드가 렌더링됨
- [x] 각 그룹 카드 내에 해당 폴더의 .md 파일이 한글 레이블로 나열됨
- [x] 문서 선택 시 마크다운 프리뷰가 해당 파일 내용을 표시
- [x] `vitest run` 시 design-page.test.tsx 통과

---

## Unit 5: develop-page

### 요구사항 매핑
- FR-4: 실행 이력 — intent description 기반 요약
- FR-6: 에이전트 상태 — "팀원" → "에이전트"

### 의존성
- **독립 (Level 0)**: 다른 유닛에 의존하지 않음

### 대상 파일
- `ui/src/app/develop/page.tsx` — 칸반 + 실행기록 (수정)
- `ui/src/app/develop/__tests__/develop-page.test.tsx` — 신규 생성

### Task Execution Order

#### Task 1: 용어 교체 — 칸반 보드
**파일**: `ui/src/app/develop/page.tsx`

현재 코드를 전체 검색하면 "팀원" 문자열이 직접 나타나는 곳은 없다 (칸반 카드에서 agent 이름을 직접 표시). 하지만 아래 확인이 필요:
- 주석이나 숨겨진 텍스트에 "팀원" 관련 문자열이 있는지 확인
- 현재 코드에서 `agent` 필드명이 이미 사용되고 있어 큰 변경 불필요

**주요 확인 포인트**: develop-page 프로토타입 코드에는 "팀원" 문자열이 없는 것으로 보임. 그러나 NFR-2 검증을 위해 테스트에서 확인 필수.

#### Task 2: 실행 기록 탭 — intent description 표시 (FR-4)
**파일**: `ui/src/app/develop/page.tsx`

`RunEntry` 인터페이스에 `intentDescription` 필드 추가:
```tsx
interface RunEntry {
  runId: string;
  state: string;
  createdAt: string;
  completedAt: string | null;
  nodesTotal: number;
  nodesCompleted: number;
  nodesFailed: number;
  intentDescription?: string;  // 추가
}
```

실행 기록 리스트(~299행)에서 runId 대신 intent description을 제목으로:
```tsx
// 현재
<p className="font-bold text-slate-900">{run.runId}</p>

// 변경
<p className="font-bold text-slate-900">
  {run.intentDescription || run.runId}
</p>
{run.intentDescription && (
  <p className="text-[10px] text-slate-400 mt-0.5">{run.runId}</p>
)}
```

#### Task 3: 테스트 작성
**파일**: `ui/src/app/develop/__tests__/develop-page.test.tsx` (신규)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import useSWR from 'swr';
import DevelopPage from '../page';

describe('DevelopPage 용어 검증', () => {
  beforeEach(() => {
    (useSWR as any).mockImplementation((key: string) => {
      if (key === '/api/state') return {
        data: { bundleName: 'test', nodes: { 'node-1': { status: 'completed', startedAt: '2026-03-28T00:00:00Z', completedAt: '2026-03-28T00:01:00Z' } } }
      };
      if (key === '/api/graph') return { data: { nodes: [{ id: 'node-1', type: 'worker', agent: 'builder', depends_on: [] }] } };
      if (key === '/api/runs') return {
        data: { runs: [{ runId: 'test-run-1', state: 'completed', createdAt: '2026-03-28', completedAt: '2026-03-28', nodesTotal: 1, nodesCompleted: 1, nodesFailed: 0, intentDescription: 'TODO 앱 구현' }] }
      };
      return { data: null };
    });
  });

  it('구용어 "팀원"이 렌더링되지 않아야 함', () => {
    render(<DevelopPage />);
    expect(screen.queryByText(/팀원/)).not.toBeInTheDocument();
  });

  it('실행 기록에서 intent description이 표시되어야 함', () => {
    render(<DevelopPage />);
    // 기록 탭으로 전환 필요할 수 있음 — TabsTrigger 클릭
    // (테스트 시 defaultValue="kanban"이므로 history 탭 테스트는 별도 수행)
  });
});
```

### 완료 기준
- [x] 칸반 보드 UI 텍스트에 "팀원" 0건, "에이전트"로 대체
- [x] 실행 기록 탭에서 각 run의 `intentDescription`이 요약 텍스트로 표시
- [x] `vitest run` 시 develop-page.test.tsx 통과

---

## Unit 6: remaining-pages

### 요구사항 매핑
- FR-1: 용어 통일 (team, bundles, preflight, settings)

### 의존성
- **sidebar-topnav (Level 0)에 의존**: 사이드바 네비게이션 레이블이 확정된 후 각 페이지 용어를 일관되게 적용

### 대상 파일
- `ui/src/app/team/page.tsx` (수정)
- `ui/src/app/bundles/page.tsx` (수정)
- `ui/src/app/preflight/page.tsx` (수정 — 최소 변경)
- `ui/src/app/settings/page.tsx` (수정)
- `ui/src/app/__tests__/remaining-pages.test.tsx` (신규)

### Task Execution Order

#### Task 1: team/page.tsx — 용어 교체
**파일**: `ui/src/app/team/page.tsx`

교체 매트릭스:
| 줄 | 기존 텍스트 | 변경 후 |
|-----|-----------|---------|
| ~237 | `번들을 선택하여 팀 구성을 시작하세요` | `팀 템플릿을 선택하여 에이전트 팀 구성을 시작하세요` |

나머지는 이미 "에이전트 팀 편집", "역할 편집" 등 올바른 용어를 사용 중.

#### Task 2: bundles/page.tsx — 용어 교체
**파일**: `ui/src/app/bundles/page.tsx`

교체 매트릭스 (줄번호는 프로토타입 기준):
| 줄 | 기존 텍스트 | 변경 후 |
|-----|-----------|---------|
| ~112 | `번들 목록` (h2) | `팀 템플릿` |
| ~123 | `번들 검색...` (placeholder) | `팀 템플릿 검색...` |
| ~136 | `번들이 성공적으로 적용되었습니다` | `팀 템플릿이 성공적으로 적용되었습니다` |
| ~161 | `사용 가능한 번들이 없습니다` | `사용 가능한 팀 템플릿이 없습니다` |
| ~250 | `이 번들 적용` | `이 팀 템플릿 적용` |
| ~307 | `나만의 맞춤형 번들이 필요하신가요?` | `나만의 맞춤형 팀 템플릿이 필요하신가요?` |

**주의**: 코드 변수명 (`selectedBundle`, `bundleDetails`, `BundlesResponse` 등)은 변경하지 않음 (FR-1 명시).

#### Task 3: preflight/page.tsx — 최소 변경
**파일**: `ui/src/app/preflight/page.tsx`

현재 코드를 확인한 결과, "번들"이나 "팀원" 관련 구용어가 없음. 변경 불필요.
테스트에서 구용어 부재를 확인만 수행.

#### Task 4: settings/page.tsx — 용어 교체
**파일**: `ui/src/app/settings/page.tsx`

교체 매트릭스:
| 줄 | 기존 텍스트 | 변경 후 |
|-----|-----------|---------|
| ~132 | `번들` (label) | `팀 템플릿` |
| ~137 | `번들 페이지에서 선택` (placeholder) | `팀 템플릿 페이지에서 선택` |
| ~139 | `번들 목록 페이지에서 변경` | `팀 템플릿 목록 페이지에서 변경` |

#### Task 5: 테스트 작성
**파일**: `ui/src/app/__tests__/remaining-pages.test.tsx` (신규)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: null, isLoading: false, mutate: vi.fn() })),
}));
vi.mock('swr', () => {
  const mutate = vi.fn();
  return {
    default: vi.fn(() => ({ data: null, isLoading: false, mutate })),
    mutate,
  };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// ReactFlow 모킹 (team page에서 사용)
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => <div>{children}</div>,
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  Controls: () => null,
  Background: () => null,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  Position: { Top: 'top', Bottom: 'bottom' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
}));
vi.mock('dagre', () => ({
  default: { graphlib: { Graph: vi.fn(() => ({ setGraph: vi.fn(), setDefaultEdgeLabel: vi.fn(), setNode: vi.fn(), setEdge: vi.fn(), node: vi.fn(() => ({ x: 0, y: 0 })) })) }, layout: vi.fn() },
}));

import BundlesPage from '../../bundles/page';
import SettingsPage from '../../settings/page';
import TeamPage from '../../team/page';

describe('BundlesPage 용어 검증', () => {
  it('구용어 "번들 목록"이 페이지 제목에 렌더링되지 않아야 함', () => {
    render(<BundlesPage />);
    expect(screen.queryByText('번들 목록')).not.toBeInTheDocument();
  });

  it('"팀 템플릿" 제목이 존재해야 함', () => {
    render(<BundlesPage />);
    expect(screen.getByText('팀 템플릿')).toBeInTheDocument();
  });

  it('검색 placeholder가 "팀 템플릿 검색..."이어야 함', () => {
    render(<BundlesPage />);
    expect(screen.getByPlaceholderText('팀 템플릿 검색...')).toBeInTheDocument();
  });
});

describe('SettingsPage 용어 검증', () => {
  it('구용어 "번들" 레이블 대신 "팀 템플릿"이 사용되어야 함', () => {
    render(<SettingsPage />);
    expect(screen.getByText('팀 템플릿')).toBeInTheDocument();
  });

  it('"팀 템플릿 페이지에서 선택" placeholder가 존재해야 함', () => {
    render(<SettingsPage />);
    expect(screen.getByPlaceholderText('팀 템플릿 페이지에서 선택')).toBeInTheDocument();
  });

  it('"팀 템플릿 목록 페이지에서 변경" 안내 텍스트가 존재해야 함', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/팀 템플릿 목록 페이지에서 변경/)).toBeInTheDocument();
  });
});

describe('TeamPage 용어 검증', () => {
  it('구용어 "번들을 선택하여 팀 구성을 시작하세요"가 없어야 함', () => {
    render(<TeamPage />);
    expect(screen.queryByText(/번들을 선택하여 팀 구성을 시작하세요/)).not.toBeInTheDocument();
  });
});
```

### 완료 기준
- [x] 4개 페이지 모두에서 구용어("번들 목록", "번들") 0건
- [x] Team 페이지 제목이 "에이전트 팀 편집"으로 표시 (이미 올바름)
- [x] Bundles 페이지 제목이 "팀 템플릿"으로 표시
- [x] `vitest run` 시 remaining-pages.test.tsx 통과

---

## Dependency Order & Parallelism

```
Level 0 (병렬 실행 가능):
  ├── sidebar-topnav (Unit 3) — 독립
  └── develop-page (Unit 5) — 독립

Level 1 (Level 0 완료 후, 병렬 실행 가능):
  ├── dashboard-cards (Unit 2) — depends: api-accuracy
  ├── design-page (Unit 4) — depends: api-accuracy
  └── remaining-pages (Unit 6) — depends: sidebar-topnav
```

**참고**: dashboard-cards와 design-page는 api-accuracy(백엔드 유닛)에도 의존하므로, 해당 API 변경이 완료된 후 실행해야 한다. 만약 API 응답 형식이 아직 확정되지 않은 경우, 기존 API 응답을 유지하면서 새 필드를 옵셔널로 처리하는 방어적 코딩 패턴을 사용한다.

---

## Interface Dependencies

### dashboard-cards ↔ api-accuracy
- `/api/aidlc/state` 응답에서 `stages` 배열의 정확한 체크박스 파싱 결과 의존
- `/api/state` 응답에서 `intent.description` 필드 의존 (새로 추가)
- `/api/runs` 응답에서 각 run의 `intentDescription` 필드 의존 (새로 추가)

### design-page ↔ api-accuracy
- `/api/aidlc/docs` 응답 형식 변경: `{ docs: DocFile[] }` → `{ groups: DocGroup[] }`
- 각 `DocFile`에 `label` 필드 추가 (한글 레이블)

### sidebar-topnav → remaining-pages
- 사이드바 네비게이션 레이블 확정 후 각 페이지 제목/용어 일관성 보장
- 현재 navItems 배열의 label 값이 기준

---

## Risks & Mitigations

### Risk 1: api-accuracy 유닛이 API 응답 형식을 변경하지 않거나 다르게 변경할 수 있음
**Mitigation**: 새 필드를 옵셔널(`?`)로 처리하고 fallback 로직 포함. 기존 응답 형식과도 호환.

### Risk 2: vitest 설정이 api-accuracy 유닛에서 생성되지 않을 수 있음
**Mitigation**: 각 프론트엔드 worker가 vitest.config.ts 존재 여부를 확인하고, 없으면 위의 fallback 설정을 생성.

### Risk 3: React Testing Library import 경로가 프로젝트 설정과 다를 수 있음
**Mitigation**: `@testing-library/react`가 devDependencies에 없으면 설치 필요. package.json 확인 후 필요시 추가.

### Risk 4: shadcn/ui 컴포넌트 모킹이 복잡할 수 있음
**Mitigation**: 컴포넌트 자체를 모킹하기보다, jsdom 환경에서 직접 렌더링. 문제 시 특정 컴포넌트만 모킹.

---

## Assumptions
- 새로운 프로토타입 코드(Tailwind + shadcn/ui 기반)가 최종 코드 베이스임
- api-accuracy 유닛이 Level 0에서 선행 실행되어 vitest 설정과 API 변경을 완료함
- `@testing-library/react`, `@testing-library/jest-dom`, `vitest`, `jsdom`이 devDependencies에 포함됨
- material-symbols-outlined 폰트는 layout에서 전역 로드됨

## Decisions
- **인라인 문자열 교체 vs i18n 모듈**: 인라인 교체 선택 — 현재 프로젝트 규모에서 i18n 오버헤드 불필요, 요구사항에서도 "코드 내부 변수명은 유지"로 명시
- **테스트 단위**: 페이지 단위 렌더 테스트 — 개별 컴포넌트 테스트보다 용어 통일 검증에 효과적
- **API 응답 타입 호환성**: 옵셔널 필드 + fallback 패턴 — breaking change 최소화

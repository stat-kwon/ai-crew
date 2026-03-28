# plan-backend

## Status: completed
Agent: planner | Model: claude-opus-4-6 | Level: 0

## What — Tasks Performed
- **AI-DLC 설계 아티팩트 분석**: requirements.md, unit-of-work.md, unit-of-work-dependency.md 전체 검토
- **기존 소스 코드 분석**: state/route.ts, docs/route.ts 현재 구현 파악
- **실제 aidlc-state.md 포맷 확인**: `### INCEPTION PHASE` + `- [x]`/`- [ ]` 패턴 확인
- **Unit 1: api-accuracy 구현 계획 수립**: 파서 강화, docs API 그룹핑, Vitest 설정, 테스트 전략 포함

## How — Approach & Decisions
- **기존 코드 보존 원칙**: `parseAidlcState()` 함수의 기존 `## N. StageName` 패턴을 유지하면서 새 패턴을 추가 (하위 호환)
- **파서 export 분리**: `parseAidlcState()`를 별도 모듈로 추출하여 테스트 용이성 확보
- **Vitest 선택 이유**: package.json에 이미 `@playwright/test`가 있으나 유닛 테스트용으로는 Vitest가 적합. Next.js + TypeScript path alias(`@/*`) 지원 필요
- **폴더 매핑은 상수 기반**: docs API의 그룹 매핑을 하드코딩 상수로 관리 (AI-DLC 폴더 구조는 안정적이므로 동적 감지 불필요)

## Result — Completion Evidence
- Files: `.ai-crew/scratchpad/L0-plan-backend.md` (본 문서)
- Commits: 본 문서 커밋 참조

## Downstream Context

아래는 `api-accuracy` 워커 에이전트가 따라야 할 상세 구현 계획입니다.

---

### AI-DLC Design Reference
- Requirements: `aidlc-docs/inception/requirements/requirements.md` (FR-5, FR-8, NFR-1)
- Design: `aidlc-docs/inception/application-design/unit-of-work.md` (Unit 1: api-accuracy)

---

### Task Execution Order

#### Task 1: `parseAidlcState()` 함수를 별도 모듈로 추출

**파일**: `ui/src/app/api/aidlc/state/parser.ts` (신규)

현재 `route.ts` 안에 인라인으로 존재하는 `parseAidlcState()` 함수와 `StageState` 인터페이스를 별도 파일로 추출합니다. 이렇게 하면 Next.js route handler를 거치지 않고 순수 함수 단위 테스트가 가능합니다.

**추출할 타입/함수**:
```typescript
// ui/src/app/api/aidlc/state/parser.ts

export interface StageTask {
  text: string;
  done: boolean;
}

export interface StageState {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: StageTask[];
  phase?: string;  // 새로 추가: "INCEPTION PHASE", "CONSTRUCTION PHASE" 등
}

export interface AidlcStateResult {
  stages: StageState[];
  found: boolean;       // 새로 추가: 파일 존재 여부
  currentStage?: string; // 새로 추가: aidlc-state.md의 "Current Stage" 값
}

export function parseAidlcState(content: string): AidlcStateResult;
```

**핵심 변경**: `found` 필드 추가로 "데이터 없음" vs "시작 전" 구분 가능.

---

#### Task 2: `parseAidlcState()` 파서 로직 강화

**파일**: `ui/src/app/api/aidlc/state/parser.ts`

실제 `aidlc-state.md` 포맷을 분석한 결과, 현재 파서가 인식하지 못하는 패턴:

**현재 파서가 인식하는 패턴**:
```markdown
## 1. Requirements
- [x] Task A
- [ ] Task B
```

**실제 aidlc-state.md 포맷 (인식 필요)**:
```markdown
### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis
- [x] User Stories (SKIPPED - pure enhancement)
- [x] Workflow Planning
- [x] Application Design (COMPLETED - unit decomposition artifacts generated)
- [x] Units Generation
```

**구현해야 할 파싱 규칙**:

1. **Phase 헤더 인식**: `### {PHASE_NAME}` 패턴 (예: `### INCEPTION PHASE`, `### CONSTRUCTION PHASE`)
   - 정규식: `/^###\s+(.+)$/`
   - Phase 헤더를 만나면 새로운 phase context 시작

2. **기존 Stage 헤더 유지**: `## N. StageName` 패턴도 계속 인식 (하위 호환)
   - 정규식: `/^##\s+\d+\.\s+(.+)$/` (기존과 동일)

3. **체크박스 인식 확장**: 현재 정규식을 유지하되, 괄호 안 주석 처리
   - 정규식: `/^-\s+\[([ xX])\]\s+(.+)$/` (기존과 동일)
   - `text` 값에서 괄호 주석은 그대로 보존 (UI에서 표시 가능)

4. **Current Stage 추출**: `## Project Information` 섹션에서 `- **Current Stage**:` 값 파싱
   - 정규식: `/^\-\s+\*\*Current Stage\*\*:\s*(.+)$/`
   - 이 값을 `AidlcStateResult.currentStage`에 저장

5. **Phase별 Stage 그룹핑**: Phase 헤더 아래의 체크박스는 해당 phase에 속하는 stage로 처리
   - Phase 헤더 아래 체크박스가 있으면 각 체크박스를 하나의 "stage"로 처리
   - 이때 `StageState.phase` 필드에 phase명 저장

**구현 로직 (의사코드)**:
```typescript
export function parseAidlcState(content: string): AidlcStateResult {
  const stages: StageState[] = [];
  const lines = content.split("\n");
  let currentPhase: string | undefined;
  let currentStage: StageState | null = null;
  let currentStageName: string | undefined;
  let inStageProgress = false;  // "## Stage Progress" 섹션 내부인지
  let resultCurrentStage: string | undefined;

  for (const line of lines) {
    // 1) Current Stage 메타데이터 추출
    const currentStageMatch = line.match(/^-\s+\*\*Current Stage\*\*:\s*(.+)$/);
    if (currentStageMatch) {
      resultCurrentStage = currentStageMatch[1].trim();
      continue;
    }

    // 2) "## Stage Progress" 섹션 감지
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (h2Match[1].trim() === "Stage Progress") {
        inStageProgress = true;
      } else if (inStageProgress) {
        // 다른 h2를 만나면 Stage Progress 섹션 종료
        inStageProgress = false;
      }
    }

    // 3) Phase 헤더 인식 (### INCEPTION PHASE 등)
    const phaseMatch = line.match(/^###\s+(.+)$/);
    if (phaseMatch) {
      // 이전 stage 저장
      if (currentStage) stages.push(currentStage);
      currentStage = null;
      currentPhase = phaseMatch[1].trim();
      continue;
    }

    // 4) 기존 스타일 Stage 헤더 (## N. StageName)
    const stageMatch = line.match(/^##\s+\d+\.\s+(.+)$/);
    if (stageMatch) {
      if (currentStage) stages.push(currentStage);
      currentStage = {
        name: stageMatch[1].trim(),
        status: "pending",
        tasks: [],
        phase: currentPhase,
      };
      continue;
    }

    // 5) 체크박스 처리
    const checkboxMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (checkboxMatch) {
      const done = checkboxMatch[1].toLowerCase() === "x";
      const text = checkboxMatch[2].trim();

      if (inStageProgress && currentPhase && !currentStage) {
        // Phase 내 직접 체크박스 → 각 체크박스가 하나의 stage
        stages.push({
          name: text,
          status: done ? "complete" : "pending",
          tasks: [{ text, done }],
          phase: currentPhase,
        });
      } else if (currentStage) {
        // 기존 방식: stage 아래 체크박스는 task
        currentStage.tasks.push({ text, done });
      }
    }
  }

  if (currentStage) stages.push(currentStage);

  // status 계산 (기존 로직 유지 — 기존 스타일 stage에 대해)
  for (const stage of stages) {
    if (stage.tasks.length > 1 || (stage.tasks.length === 1 && stage.status === "pending")) {
      const completedCount = stage.tasks.filter(t => t.done).length;
      if (completedCount === stage.tasks.length && stage.tasks.length > 0) {
        stage.status = "complete";
      } else if (completedCount > 0) {
        stage.status = "active";
      }
    }
  }

  return {
    stages,
    found: true,
    currentStage: resultCurrentStage,
  };
}
```

---

#### Task 3: `state/route.ts` — 파서 import 및 응답 확장

**파일**: `ui/src/app/api/aidlc/state/route.ts` (수정)

```typescript
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseAidlcState } from "./parser";

function getTargetDir(): string {
  return process.env.AI_CREW_TARGET_DIR || process.cwd();
}

export async function GET() {
  try {
    const targetDir = getTargetDir();
    const statePath = join(targetDir, "aidlc-docs", "aidlc-state.md");

    if (!existsSync(statePath)) {
      // found: false → UI에서 "설계 데이터 없음"으로 표시 가능
      return NextResponse.json({ stages: [], found: false });
    }

    const content = await readFile(statePath, "utf-8");
    const result = parseAidlcState(content);

    return NextResponse.json({
      stages: result.stages,
      found: true,
      currentStage: result.currentStage,
      raw: content,
    });
  } catch (error) {
    console.error("Error reading AIDLC state:", error);
    return NextResponse.json(
      { error: "Failed to read AIDLC state" },
      { status: 500 }
    );
  }
}
```

**핵심 변경**:
- `found: false` 반환 (파일 없을 때) → "데이터 없음" vs "시작 전" 구분 (FR-5, NFR-1)
- `currentStage` 필드 추가 → UI에서 현재 활성 단계명 표시
- `parseAidlcState()`를 외부 모듈에서 import

---

#### Task 4: `docs/route.ts` — 폴더 매핑 메타데이터 추가

**파일**: `ui/src/app/api/aidlc/docs/route.ts` (수정)

**추가할 상수 — 폴더-그룹 매핑**:
```typescript
interface FolderMapping {
  folder: string;         // 상대 경로 (aidlc-docs/ 기준)
  groupLabel: string;     // 한글 그룹 라벨
  sortOrder: number;      // 표시 순서
}

const FOLDER_MAPPINGS: FolderMapping[] = [
  { folder: "inception/requirements", groupLabel: "요구사항 분석", sortOrder: 1 },
  { folder: "inception/user-stories", groupLabel: "사용자 시나리오", sortOrder: 2 },
  { folder: "inception/plans", groupLabel: "작업 계획", sortOrder: 3 },
  { folder: "inception/application-design", groupLabel: "애플리케이션 설계", sortOrder: 4 },
  // construction units는 동적 감지
];

const FILE_LABEL_MAP: Record<string, string> = {
  "requirements.md": "요구사항 문서",
  "user-stories.md": "사용자 스토리",
  "workflow-plan.md": "워크플로우 계획",
  "unit-of-work.md": "유닛 정의",
  "unit-of-work-dependency.md": "유닛 의존성 매트릭스",
  "aidlc-state.md": "AI-DLC 상태 추적",
  "audit.md": "감사 로그",
};
```

**응답 형식 확장** — 기존 flat `docs[]` 에 더해 `groups[]` 추가:
```typescript
interface DocGroup {
  folder: string;       // 예: "inception/requirements"
  label: string;        // 예: "요구사항 분석"
  sortOrder: number;
  files: {
    name: string;       // 파일명
    label: string;      // 한글 레이블 (매핑 없으면 파일명 그대로)
    path: string;       // aidlc-docs/ 기준 상대 경로
  }[];
}
```

**응답 예시**:
```json
{
  "docs": [ ... ],       // 기존 flat list 유지 (하위 호환)
  "groups": [
    {
      "folder": "inception/requirements",
      "label": "요구사항 분석",
      "sortOrder": 1,
      "files": [
        {
          "name": "requirements.md",
          "label": "요구사항 문서",
          "path": "inception/requirements/requirements.md"
        }
      ]
    }
  ]
}
```

**construction units 동적 감지 로직**:
```typescript
// construction/ 하위 디렉토리를 스캔하여 유닛 그룹 동적 생성
const constructionDir = join(docsDir, "construction");
if (existsSync(constructionDir)) {
  const entries = await readdir(constructionDir);
  for (const entry of entries) {
    const entryPath = join(constructionDir, entry);
    const entryStat = await stat(entryPath);
    if (entryStat.isDirectory()) {
      // "build-and-test" → "빌드 및 테스트", 그 외 → "유닛: {name}"
      const label = entry === "build-and-test"
        ? "빌드 및 테스트"
        : `유닛: ${entry}`;
      // 동적 그룹으로 추가
    }
  }
}
```

**파일 레이블 변환 함수**:
```typescript
function getFileLabel(fileName: string): string {
  return FILE_LABEL_MAP[fileName] || fileName.replace(/\.md$/, "").replace(/[-_]/g, " ");
}
```

---

#### Task 5: Vitest 설정

**파일**: `ui/vitest.config.ts` (신규)

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",          // API 테스트이므로 node 환경
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),   // tsconfig의 @/* 경로 alias 매핑
    },
  },
});
```

**package.json 수정** — `scripts`에 추가:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**devDependencies 추가**:
```json
{
  "devDependencies": {
    "vitest": "^3.2.1"
  }
}
```

---

#### Task 6: 파서 스냅샷 테스트

**파일**: `ui/src/app/api/aidlc/__tests__/state-parser.test.ts` (신규)

```typescript
import { describe, it, expect } from "vitest";
import { parseAidlcState } from "../state/parser";

describe("parseAidlcState", () => {
  // 1) 실제 aidlc-state.md 포맷 파싱 테스트
  it("### INCEPTION PHASE + 체크박스 패턴을 정확히 파싱한다", () => {
    const content = `# AI-DLC State Tracking

## Project Information
- **Project Type**: Brownfield
- **Current Stage**: INCEPTION - Units Generation Complete

## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis
- [x] User Stories (SKIPPED - pure enhancement)
- [ ] Workflow Planning
- [ ] Application Design
- [ ] Units Generation`;

    const result = parseAidlcState(content);

    expect(result.found).toBe(true);
    expect(result.currentStage).toBe("INCEPTION - Units Generation Complete");
    expect(result.stages).toHaveLength(6);

    // 완료된 항목
    expect(result.stages[0]).toMatchObject({
      name: "Workspace Detection",
      status: "complete",
      phase: "INCEPTION PHASE",
    });
    expect(result.stages[2]).toMatchObject({
      name: "User Stories (SKIPPED - pure enhancement)",
      status: "complete",
    });

    // 미완료 항목
    expect(result.stages[3]).toMatchObject({
      name: "Workflow Planning",
      status: "pending",
    });

    // 진행률 계산 검증 (NFR-1: 체크박스 수 1:1 일치)
    const completed = result.stages.filter(s => s.status === "complete").length;
    const total = result.stages.length;
    expect(completed).toBe(3);
    expect(total).toBe(6);
  });

  // 2) 기존 ## N. StageName 패턴 하위 호환 테스트
  it("기존 ## N. StageName 패턴도 파싱한다 (하위 호환)", () => {
    const content = `## 1. Requirements
- [x] Gather requirements
- [x] Validate requirements

## 2. Design
- [x] Create architecture
- [ ] Review design`;

    const result = parseAidlcState(content);

    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].name).toBe("Requirements");
    expect(result.stages[0].status).toBe("complete");
    expect(result.stages[1].name).toBe("Design");
    expect(result.stages[1].status).toBe("active");
  });

  // 3) 빈 콘텐츠 테스트
  it("빈 콘텐츠는 빈 stages 배열을 반환한다", () => {
    const result = parseAidlcState("");
    expect(result.stages).toHaveLength(0);
    expect(result.found).toBe(true);
  });

  // 4) 다중 Phase 테스트
  it("다중 Phase(INCEPTION + CONSTRUCTION)를 올바르게 구분한다", () => {
    const content = `## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis

### CONSTRUCTION PHASE
- [ ] Code Generation
- [ ] Build and Test`;

    const result = parseAidlcState(content);

    expect(result.stages).toHaveLength(4);
    expect(result.stages[0].phase).toBe("INCEPTION PHASE");
    expect(result.stages[1].phase).toBe("INCEPTION PHASE");
    expect(result.stages[2].phase).toBe("CONSTRUCTION PHASE");
    expect(result.stages[3].phase).toBe("CONSTRUCTION PHASE");
  });

  // 5) 스냅샷 테스트 — 전체 파싱 결과의 구조 안정성 검증
  it("실제 aidlc-state.md 전체 포맷의 파싱 결과 스냅샷", () => {
    const realContent = `# AI-DLC State Tracking

## Project Information
- **Project Type**: Brownfield
- **Start Date**: 2026-03-28T17:35:00Z
- **Current Stage**: INCEPTION - Units Generation Complete

## Workspace State
- **Existing Code**: Yes

## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis
- [x] User Stories (SKIPPED - pure enhancement)
- [x] Workflow Planning
- [x] Application Design (COMPLETED - unit decomposition artifacts generated)
- [x] Units Generation

## Execution Plan Summary
- **Total Stages**: 3`;

    const result = parseAidlcState(realContent);
    expect(result).toMatchSnapshot();
  });
});
```

---

#### Task 7: Docs API 테스트

**파일**: `ui/src/app/api/aidlc/__tests__/docs-api.test.ts` (신규)

이 테스트는 docs route의 그룹핑 로직을 검증합니다. Next.js route handler를 직접 테스트하기 어려우므로, 그룹핑 로직을 별도 함수로 추출하여 테스트하는 것이 좋습니다.

```typescript
// docs/route.ts에서 추출할 함수:
// export function groupDocsByFolder(docs: DocFile[]): DocGroup[]
// export function getFileLabel(fileName: string): string

import { describe, it, expect } from "vitest";
import { groupDocsByFolder, getFileLabel } from "../docs/helpers";

describe("getFileLabel", () => {
  it("알려진 파일명은 한글 레이블을 반환한다", () => {
    expect(getFileLabel("requirements.md")).toBe("요구사항 문서");
    expect(getFileLabel("unit-of-work.md")).toBe("유닛 정의");
  });

  it("알려지지 않은 파일명은 확장자를 제거하고 하이픈을 공백으로 변환한다", () => {
    expect(getFileLabel("some-unknown-file.md")).toBe("some unknown file");
  });
});

describe("groupDocsByFolder", () => {
  it("inception 폴더의 문서를 올바른 그룹으로 매핑한다", () => {
    const docs = [
      { name: "requirements.md", path: "inception/requirements/requirements.md", stage: "inception" },
      { name: "unit-of-work.md", path: "inception/application-design/unit-of-work.md", stage: "inception" },
    ];

    const groups = groupDocsByFolder(docs);

    const reqGroup = groups.find(g => g.folder === "inception/requirements");
    expect(reqGroup).toBeDefined();
    expect(reqGroup!.label).toBe("요구사항 분석");
    expect(reqGroup!.files).toHaveLength(1);
    expect(reqGroup!.files[0].label).toBe("요구사항 문서");

    const designGroup = groups.find(g => g.folder === "inception/application-design");
    expect(designGroup).toBeDefined();
    expect(designGroup!.label).toBe("애플리케이션 설계");
  });

  it("빈 docs 배열은 빈 groups를 반환한다", () => {
    const groups = groupDocsByFolder([]);
    expect(groups).toHaveLength(0);
  });

  it("그룹은 sortOrder 기준으로 정렬된다", () => {
    const docs = [
      { name: "unit-of-work.md", path: "inception/application-design/unit-of-work.md", stage: "inception" },
      { name: "requirements.md", path: "inception/requirements/requirements.md", stage: "inception" },
    ];

    const groups = groupDocsByFolder(docs);
    expect(groups[0].folder).toBe("inception/requirements");     // sortOrder 1
    expect(groups[1].folder).toBe("inception/application-design"); // sortOrder 4
  });
});
```

---

### Files to Create/Modify

| 파일 경로 | 작업 | 용도 |
|-----------|------|------|
| `ui/src/app/api/aidlc/state/parser.ts` | 신규 | `parseAidlcState()` 함수 + 타입 추출 |
| `ui/src/app/api/aidlc/state/route.ts` | 수정 | parser import, `found` 필드 추가 |
| `ui/src/app/api/aidlc/docs/helpers.ts` | 신규 | `groupDocsByFolder()`, `getFileLabel()`, 매핑 상수 |
| `ui/src/app/api/aidlc/docs/route.ts` | 수정 | helpers import, `groups[]` 응답 추가 |
| `ui/vitest.config.ts` | 신규 | Vitest 설정 (`@/*` alias 포함) |
| `ui/package.json` | 수정 | `vitest` devDep + test scripts 추가 |
| `ui/src/app/api/aidlc/__tests__/state-parser.test.ts` | 신규 | 파서 단위 테스트 + 스냅샷 |
| `ui/src/app/api/aidlc/__tests__/docs-api.test.ts` | 신규 | docs 그룹핑 로직 테스트 |

---

### Interface Dependencies

**state API 응답 인터페이스 (dashboard-cards, design-page가 소비)**:
```typescript
// GET /api/aidlc/state 응답
interface StateApiResponse {
  stages: StageState[];
  found: boolean;         // 신규: false이면 "설계 데이터 없음"
  currentStage?: string;  // 신규: 현재 활성 단계명
  raw?: string;           // 기존 유지
  error?: string;         // 에러 시
}
```

**docs API 응답 인터페이스 (design-page가 소비)**:
```typescript
// GET /api/aidlc/docs 응답 (목록)
interface DocsApiResponse {
  docs: DocFile[];        // 기존 유지 (하위 호환)
  groups: DocGroup[];     // 신규: 그룹화된 문서 목록
  error?: string;
}
```

---

### Risks & Mitigations

- **Risk**: `aidlc-state.md` 포맷이 AI-DLC 버전에 따라 변경될 수 있음
  **Mitigation**: 기존 `## N.` 패턴과 새 `### PHASE` 패턴 모두 인식하여 호환성 확보. 스냅샷 테스트로 회귀 감지.

- **Risk**: Vitest와 Next.js 간 모듈 해석 충돌 (특히 `@/*` path alias)
  **Mitigation**: `vitest.config.ts`에 `resolve.alias` 명시. 테스트 대상을 순수 함수(parser.ts, helpers.ts)로 제한하여 Next.js 의존성 최소화.

- **Risk**: `docs/route.ts`의 그룹핑이 실제 폴더 구조와 불일치할 수 있음
  **Mitigation**: 매핑에 없는 폴더는 폴더명을 그대로 label로 사용하는 fallback 로직 추가.

---

### Assumptions

- `aidlc-state.md`의 `## Stage Progress` 섹션 아래에만 파싱 대상 체크박스가 위치한다고 가정 (다른 섹션의 체크박스는 무시)
- `vitest` 패키지만 추가하면 충분 (jsdom/happy-dom 불필요 — API 테스트이므로 node 환경)
- `docs/route.ts`의 기존 flat `docs[]` 응답을 유지하여 하위 호환성 보장

---

### Decisions

- **파서 추출 위치**: `state/parser.ts` (route와 같은 디렉토리) — 다른 모듈에서도 import 가능하면서 co-location 유지
- **그룹핑 함수 위치**: `docs/helpers.ts` — route handler와 분리하여 테스트 용이성 확보
- **construction 유닛 동적 감지**: 하드코딩하지 않고 `construction/` 하위 디렉토리를 런타임 스캔 — 유닛 수/이름이 프로젝트마다 다르므로
- **`found` 필드 도입**: boolean 값으로 단순화 (파일 존재 = true, 미존재 = false). UI에서 `found === false`이면 "설계 데이터 없음", `found === true && stages.length === 0`이면 "진행 상태 없음"으로 구분

# AI-Crew UI Design Document

> 설계/구성 시각화 도구 — 프로세스 투명화를 통한 진입 장벽 제거

## 1. Background & Motivation

### 현재 문제

ai-crew는 CLI 기반 도구로, AI-DLC와 Ouroboros 워크플로우가 터미널 안에서만 동작한다.

- **AI-DLC**: Workspace Detection → Requirements → User Stories → App Design → Units Generation 순서를 알려면 CLAUDE.md를 읽거나 슬래시 커맨드를 직접 실행해야 함
- **Ouroboros**: Interview → Seed → Execute → Evaluate → Evolve 루프의 진행 상태와 진화 히스토리가 로그에 묻힘
- **Graph 편집**: graph.yaml을 수작업으로 편집해야 하며, 노드 의존성 관계를 텍스트로 파악하기 어려움

### 해결 방향

UI를 통해 **워크플로우 전체 흐름, 생성 문서, 진행 상태**를 시각적으로 표현한다. AI-DLC/OOO를 모르는 사용자도 "지금 어떤 단계에 있고, 뭐가 만들어졌고, 다음에 뭐가 남았는지"를 화면 하나로 파악할 수 있다.

### 핵심 가치

| 기존 (CLI only) | UI 추가 후 |
|-----------------|-----------|
| 슬래시 커맨드 암기 필요 | 단계가 시각적으로 보임 |
| 문서 위치를 찾아야 함 | 클릭하면 바로 열람 |
| 진행 상태를 state.json으로 확인 | 칸반/보드로 실시간 표시 |
| OOO 진화 과정이 로그에 묻힘 | 버전별 비교 가능 |
| 팀에 설명하기 어려움 | 화면 공유하면 끝 |

---

## 2. Scope: 설계/구성 vs 실행 분리

### 핵심 결정

**UI는 설계와 구성만 담당하고, 실제 실행은 사용자가 Claude Code CLI에서 직접 수행한다.**

```
[UI] 설계 & 팀 구성
  │
  │  graph.yaml, config.yaml, aidlc-docs/ 생성/편집
  ▼
[사용자] Claude Code CLI에서 직접 실행
  │
  │  $ claude
  │  > /crew:preflight
  │  > /crew:run
  │
  ▼
[UI] 결과 열람 (runs/, scratchpad/, state.json 읽기)
```

### 이 분리의 장점

| 항목 | 효과 |
|------|------|
| WebSocket 불필요 | 실시간 스트리밍 없으므로 REST만으로 충분 |
| CLI 의존성 제로 | child_process.spawn 불필요 |
| 유지보수 비용 최소 | 파일 스키마만 의존, 코어 로직 변경에 무관 |
| 테스트 범위 | CLI stdout 파싱 같은 불안정한 영역 없음 |
| 점진적 확장 | 나중에 실행 모니터링 붙이고 싶으면 그때 추가 |

### UI가 다루는 범위

1. **AI-DLC Inception 시각화** — 단계별 진행률, 생성 문서 열람
2. **Ouroboros 진화 추적** — Interview → Seed → Execute → Evaluate 루프 시각화
3. **Graph DAG 에디터** — 시각적 노드/엣지 편집 (graph.yaml)
4. **번들 선택기** — 카탈로그 번들 브라우징 및 선택
5. **설정 에디터** — config.yaml 폼 편집
6. **실행 이력 열람** — 과거 실행 결과 조회 (runs.json, scratchpad)
7. **칸반 보드** — 노드 상태별 시각화 (사후 확인용)

### UI가 다루지 않는 범위

- CLI 실행 (spawn/exec)
- 실시간 stdout/stderr 스트리밍
- Agent 프로세스 관리
- Worktree 생성/정리

---

## 3. Technical Architecture

### 3.1 기술 스택

| Layer | 선택 | 이유 |
|-------|------|------|
| Framework | Next.js 15 (App Router) | SSR + API routes 통합, standalone 빌드 |
| UI Library | React 19 | Next.js 기본 |
| Design System | Tailwind CSS + shadcn/ui | 빠른 개발, 일관된 디자인 |
| Graph Editor | @xyflow/react (ReactFlow) | 성숙한 DAG 에디터, 커스텀 노드 지원 |
| Graph Layout | dagre | 자동 계층 레이아웃 |
| Data Fetching | SWR | 폴링 기반 갱신, 캐싱 |
| YAML | yaml (core와 동일) | graph.yaml/config.yaml 파싱 |

### 3.2 모노레포 구조

현재 ai-crew는 단일 패키지. pnpm workspaces 기반 모노레포로 전환한다.

```
ai-crew/                          # 워크스페이스 루트
├── pnpm-workspace.yaml
├── package.json                  # private: true, 워크스페이스 오케스트레이션
├── packages/
│   ├── core/                     # 기존 ai-crew 패키지 (name: "ai-crew")
│   │   ├── src/
│   │   ├── catalog/
│   │   ├── tests/
│   │   ├── docs/
│   │   ├── package.json          # bin: { "ai-crew": "./dist/cli.js" }
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── ui/                       # @ai-crew/ui 패키지 (신규)
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   ├── components/
│       │   ├── lib/
│       │   └── hooks/
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
```

### 3.3 공유 타입 전략

별도 타입 패키지 없이, UI가 core를 직접 의존한다:

```json
// packages/ui/package.json
{
  "dependencies": {
    "ai-crew": "workspace:*"
  }
}
```

```typescript
// UI에서 core 타입과 함수 직접 사용
import type { GraphState, GraphNode, RunRegistry, RunManifest } from "ai-crew";
import { computeLevels, validateGraph, loadRegistry, listBundles } from "ai-crew";
```

core의 `src/index.ts`가 이미 모든 타입과 주요 함수를 export하고 있으므로 추가 작업 불필요.

### 3.4 CLI 통합

`packages/core/src/cli.ts`에 `ui` 서브커맨드 추가:

```typescript
program
  .command("ui")
  .description("Launch the AI-Crew web UI")
  .option("--target <path>", "Project path", process.cwd())
  .option("--port <port>", "Port number", "3000")
  .action(async (options) => {
    try {
      const { startUi } = await import("@ai-crew/ui/server");
      await startUi({
        targetDir: resolve(options.target),
        port: parseInt(options.port),
      });
    } catch {
      console.error(chalk.red("@ai-crew/ui is not installed."));
      console.error("Run: pnpm add @ai-crew/ui");
      process.exit(1);
    }
  });
```

`@ai-crew/ui`는 **optional dependency**로 처리하여, UI 없이도 core CLI가 정상 동작한다.

---

## 4. API Layer Design

### 4.1 Target Directory

UI는 특정 프로젝트 디렉토리의 `.ai-crew/`와 `aidlc-docs/`를 읽는다. `ai-crew ui --target <path>` 커맨드로 전달된 경로를 환경변수로 주입:

```
AI_CREW_TARGET_DIR=/path/to/project
```

### 4.2 API Routes

모든 API route는 Next.js Server Component / Route Handler로 구현. 파일 시스템 직접 접근.

| Route | Method | 대상 파일 | 용도 |
|-------|--------|----------|------|
| `/api/state` | GET | `.ai-crew/state.json` | 그래프 실행 상태 |
| `/api/graph` | GET | `.ai-crew/graph.yaml` | 그래프 정의 읽기 |
| `/api/graph` | PUT | `.ai-crew/graph.yaml` | DAG 에디터에서 저장 |
| `/api/config` | GET | `.ai-crew/config.yaml` | 설정 읽기 |
| `/api/config` | PUT | `.ai-crew/config.yaml` | 설정 편집 후 저장 |
| `/api/runs` | GET | `.ai-crew/runs.json` | 실행 이력 목록 |
| `/api/runs/[runId]` | GET | `.ai-crew/runs/{id}/manifest.json` | 실행 상세 (manifest) |
| `/api/scratchpad/[nodeId]` | GET | `.ai-crew/scratchpad/` | 노드별 산출물 |
| `/api/aidlc/state` | GET | `aidlc-docs/aidlc-state.md` | AI-DLC 단계 상태 (마크다운 파싱) |
| `/api/aidlc/docs` | GET | `aidlc-docs/**` | 생성된 문서 목록 및 내용 |
| `/api/bundles` | GET | `catalog/bundles/` | 번들 목록 |
| `/api/bundles/[name]` | GET | `catalog/bundles/{name}/` | 번들 상세 |
| `/api/memory` | GET | `.ai-crew/memory.json` | 공유 메모리 |

### 4.3 Core 함수 재사용

API route에서 core 패키지의 기존 함수를 직접 사용:

- `loadRegistry(crewDir)` — runs.json 로딩
- `computeLevels(nodes)` — DAG 레벨 계산
- `validateGraph(nodes)` — 그래프 유효성 검사 (저장 전)
- `validateConfigYaml(content)` — 설정 유효성 검사
- `listBundles()` / `loadBundle(name)` — 카탈로그 조회
- `loadContext(crewDir)` — 프로젝트 컨텍스트

### 4.4 보안

모든 파일 접근 경로가 target directory 하위로 제한되도록 path traversal 방어:

```typescript
function safePath(targetDir: string, relativePath: string): string {
  const resolved = path.resolve(targetDir, relativePath);
  if (!resolved.startsWith(path.resolve(targetDir))) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}
```

---

## 5. UI Pages & Components

### 5.1 페이지 구조

```
src/app/
  layout.tsx           # 사이드바 + 헤더 (프로젝트명, 번들명)
  page.tsx              # 대시보드 (요약 정보)
  inception/
    page.tsx            # AI-DLC Inception 시각화
  graph/
    page.tsx            # DAG 에디터
  bundles/
    page.tsx            # 번들 선택기
  config/
    page.tsx            # 설정 에디터
  runs/
    page.tsx            # 실행 이력 목록
    [runId]/
      page.tsx          # 실행 상세 + 칸반
  api/
    state/route.ts
    graph/route.ts
    config/route.ts
    runs/route.ts
    runs/[runId]/route.ts
    scratchpad/[nodeId]/route.ts
    aidlc/state/route.ts
    aidlc/docs/route.ts
    bundles/route.ts
    bundles/[name]/route.ts
    memory/route.ts
```

### 5.2 주요 컴포넌트

```
src/components/
  layout/
    Sidebar.tsx          # 네비게이션 사이드바
    Header.tsx           # 상단 바 (프로젝트, 번들 정보)
  inception/
    StageFlow.tsx        # AI-DLC 수평 파이프라인
    StageCard.tsx        # 개별 스테이지 카드 (상태, 문서 수)
    DocumentList.tsx     # 스테이지별 생성 문서 목록
  graph/
    DagCanvas.tsx        # ReactFlow 기반 DAG 캔버스
    NodeCard.tsx         # 드래그 가능한 노드 (타입별 색상)
    EdgeLine.tsx         # 의존성 엣지
    NodeEditor.tsx       # 노드 속성 편집 사이드 패널
    AddNodeDialog.tsx    # 노드 추가 다이얼로그
  runs/
    RunList.tsx          # 실행 이력 테이블
    KanbanBoard.tsx      # 상태별 컬럼 (pending|running|completed|failed)
    KanbanCard.tsx       # 노드 칸반 카드
    RunTimeline.tsx      # Gantt 스타일 타임라인
  config/
    ConfigForm.tsx       # config.yaml 폼
    ModelSelector.tsx    # 모델 선택 드롭다운
  bundles/
    BundleGrid.tsx       # 번들 그리드 뷰
    BundlePreview.tsx    # 번들 상세 프리뷰
```

### 5.3 페이지별 상세

#### 대시보드 (`/`)
- 프로젝트 이름, 현재 번들, 노드 수
- 마지막 실행 상태 요약
- 각 섹션으로의 퀵 링크

#### AI-DLC Inception (`/inception`)
- `aidlc-state.md`의 체크박스 파싱 → 스테이지 진행률
- 수평 파이프라인: `Requirements → User Stories → App Design → Units`
- 각 스테이지 카드: 상태 (pending/active/complete), 문서 수, 클릭 시 문서 목록
- 문서 클릭 시 마크다운 렌더링 뷰

#### Graph DAG Editor (`/graph`)
- `graph.yaml` 로드 → `computeLevels()` → dagre 레이아웃 → ReactFlow 렌더링
- 노드 색상: worker=blue, router=amber, aggregator=green
- 노드 클릭 → 사이드 패널 (agent, skills, hooks, config 편집)
- 엣지 드래그로 의존성 연결
- 저장 시 `validateGraph()` 실행, 오류 시 인라인 표시
- 번들에서 auto-generate 옵션

#### 번들 선택기 (`/bundles`)
- `listBundles()` → 그리드 카드 (이름, 설명, 노드 수)
- 카드 클릭 → 포함된 에이전트, 스킬, 훅 프리뷰
- "이 번들로 설치" → config.yaml/graph.yaml 생성

#### 설정 에디터 (`/config`)
- config.yaml 필드별 폼: model, isolation, locale, merge_mode, hooks_profile
- `validateConfigYaml()` 기반 실시간 유효성 검사
- 변경 시 diff 프리뷰 후 저장

#### 실행 이력 (`/runs`)
- runs.json → 테이블 (runId, intent, 상태, 시간, 완료/실패 노드 수)
- 행 클릭 → 실행 상세 페이지

#### 실행 상세 + 칸반 (`/runs/[runId]`)
- 탭 전환: 칸반 / 타임라인
- **칸반**: 노드 카드를 상태 컬럼에 배치
- **타임라인**: Gantt 차트 (노드별 시작~완료 시간)
- 노드 카드 클릭 → 스크래치패드 내용 열람
- manifest.json의 summary, issues, keyDecisions 표시

---

## 6. Deployment & Packaging

### 6.1 Next.js Standalone Build

```typescript
// next.config.ts
export default {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),  // 모노레포 루트
  },
};
```

### 6.2 서버 진입점

```typescript
// packages/ui/src/server.ts
export async function startUi(opts: { targetDir: string; port: number }) {
  process.env.AI_CREW_TARGET_DIR = opts.targetDir;
  process.env.PORT = String(opts.port);
  // standalone server 시작
  // 브라우저 자동 오픈
}
```

### 6.3 npm 배포

- 패키지명: `@ai-crew/ui`
- `files` 필드: `.next/standalone/`, `public/` 포함
- `prepublishOnly`: `next build` 실행
- core의 optional dependency로 등록

---

## 7. Implementation Phases

| Phase | 작업 | 핵심 산출물 |
|-------|------|-----------|
| **0** | 모노레포 전환 | pnpm workspaces, packages/core 이동 |
| **1** | UI 스캐폴딩 + API routes + 대시보드 | packages/ui 기본 구조, `ai-crew ui` 커맨드 |
| **2** | 읽기 전용 뷰 | Inception 시각화, 실행 이력, 칸반 |
| **3** | 인터랙티브 에디터 | DAG 에디터, 설정 에디터, 번들 선택 |
| **4** | 프로덕션 패키징 | standalone 빌드, npm 배포 |
| **5** (후순위) | Ouroboros 진화 추적, 라이브 폴링, 다크모드 | 확장 기능 |

---

## 8. Risks & Mitigations

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 모노레포 전환 시 npm publish 깨짐 | 높음 | `npm pack` 검증, CI에서 publish 테스트 |
| getCatalogDir() 경로 해석 변경 | 중간 | import.meta.url 기반이므로 dist/↔catalog/ 상대경로 유지 확인 |
| Next.js standalone 빌드 크기 | 낮음 | outputFileTracingRoot으로 최적화 |
| graph.yaml 동시 쓰기 충돌 | 중간 | proper-lockfile 또는 mtime 기반 optimistic concurrency |
| 파일 스키마 변경 시 UI 수정 필요 | 중간 | core 타입 직접 의존으로 컴파일 타임 오류 감지 |
| AI-DLC state.md 파싱 불안정 | 낮음 | 마크다운 체크박스 파싱은 정규식으로 충분, 별도 파서 불필요 |

---

## 9. Data Flow Summary

```
┌──────────────────────────────────────────────┐
│                  Browser UI                   │
│                                               │
│  /inception  /graph  /runs  /config  /bundles │
│       │         │      │       │        │     │
│       └─────────┴──────┴───────┴────────┘     │
│                     │                         │
│              SWR (fetch + poll)                │
└──────────────────────┬────────────────────────┘
                       │ HTTP (REST)
┌──────────────────────┴────────────────────────┐
│            Next.js API Routes                  │
│                                               │
│  /api/state  /api/graph  /api/runs  /api/...  │
│       │          │           │                │
│  core functions: loadRegistry, validateGraph  │
│                computeLevels, listBundles     │
└──────────────────────┬────────────────────────┘
                       │ fs.readFile / fs.writeFile
┌──────────────────────┴────────────────────────┐
│              File System                       │
│                                               │
│  .ai-crew/          │  aidlc-docs/            │
│    state.json       │    aidlc-state.md       │
│    graph.yaml       │    inception/           │
│    config.yaml      │    construction/        │
│    runs.json        │                         │
│    runs/{id}/       │                         │
│    scratchpad/      │                         │
│    memory.json      │                         │
└───────────────────────────────────────────────┘
```

결합점은 **파일 시스템** 하나뿐이다. UI ↔ CLI 사이에 프로세스 의존성이 없으며, 각각 독립적으로 동작한다.

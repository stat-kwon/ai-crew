# UI 리디자인 v3 — 런 격리 기반 히스토리 대시보드

> **문서 유형**: 설계 초안 (Draft)
> **작성일**: 2026-03-29
> **전제**: AI-DLC native 변형 금지 / ai-crew 레이어에서만 확장

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                    UI (Next.js)                      │
│  타임라인 · 런 상세 · 설계 문서 · 설정 드로어        │
└────────────────────┬────────────────────────────────┘
                     │ SWR fetch
┌────────────────────▼────────────────────────────────┐
│               API Routes (/api/*)                    │
│  runs · runs/{runId} · aidlc · config · graph        │
└────────────────────┬────────────────────────────────┘
                     │ fs.readFile
┌────────────────────▼────────────────────────────────┐
│            .ai-crew/ (파일 기반 백엔드)               │
│                                                      │
│  runs.json ← 런 레지스트리                            │
│  runs/{runId}/ ← 런별 격리 스토리지                   │
│    manifest.json                                     │
│    graph.yaml                                        │
│    state.json                                        │
│    scratchpad/                                       │
│    aidlc-snapshot/                                   │
│                                                      │
│  config.yaml ← 프로젝트 설정 (현재)                   │
│  graph.yaml ← 현재 활성 그래프                        │
│  state.json ← 현재 활성 런 상태                       │
└──────────────────────────────────────────────────────┘
                     │ 읽기 전용 참조
┌────────────────────▼────────────────────────────────┐
│           aidlc-docs/ (AI-DLC 소유, 변형 금지)        │
│  inception/ · construction/ · aidlc-state.md · audit │
└──────────────────────────────────────────────────────┘
```

**핵심 원칙:**
- **aidlc-docs/**: AI-DLC가 생성/관리. 항상 "현재" 상태. 읽기만 함.
- **.ai-crew/runs/**: ai-crew가 관리. 런별 스냅샷. UI의 실질적 데이터 소스.
- **UI**: `.ai-crew/`만 읽어서 히스토리 표시. aidlc-docs는 "현재 설계 문서" 탭에서만 직접 참조.

---

## 2. .ai-crew/ 파일 구조 (백엔드)

### 2.1 전체 구조

```
.ai-crew/
├── config.yaml                  ← 프로젝트 설정 (불변)
├── catalog-manifest.json        ← 카탈로그 (불변)
│
├── runs.json                    ← 런 레지스트리 (전체 런 목록 + 메타)
│
├── active/                      ← 현재 활성 런 (심링크 또는 직접 기록)
│   ├── graph.yaml               ← 현재 그래프
│   ├── state.json               ← 현재 노드 상태 (실시간 갱신)
│   └── scratchpad/              ← 현재 런 에이전트 결과물
│       ├── L0-layout-overhaul.md
│       └── L1-timeline-page.md
│
├── runs/                        ← 완료된 런 아카이브
│   ├── ui-improvement-20260328-1/
│   │   ├── manifest.json        ← 런 메타데이터
│   │   ├── graph.yaml           ← 이 런의 그래프 스냅샷
│   │   ├── state.json           ← 이 런의 최종 노드 상태
│   │   ├── scratchpad/          ← 이 런의 에이전트 결과물
│   │   │   ├── L0-plan-backend.md
│   │   │   └── L1-api-accuracy.md
│   │   └── aidlc-snapshot/      ← 이 런 완료 시점의 aidlc-docs 스냅샷
│   │       ├── inception/
│   │       │   ├── requirements/
│   │       │   ├── plans/
│   │       │   └── application-design/
│   │       ├── construction/
│   │       └── aidlc-state.md
│   │
│   └── ui-redesign-20260329-1/
│       ├── manifest.json
│       ├── graph.yaml
│       ├── state.json
│       ├── scratchpad/
│       └── aidlc-snapshot/
│
├── rules/                       ← 에이전트 규칙 (기존)
├── checkpoints/                 ← 체크포인트 (기존)
└── install-state.json           ← 설치 상태 (기존)
```

### 2.2 active/ vs runs/{runId}/

| 구분 | active/ | runs/{runId}/ |
|------|---------|--------------|
| **용도** | 현재 진행 중인 런 | 완료/실패한 런 아카이브 |
| **갱신** | /crew:run 중 실시간 | 아카이브 후 불변 |
| **state.json** | 노드 상태 실시간 변경 | 최종 상태 스냅샷 |
| **scratchpad/** | 에이전트가 직접 기록 | 아카이브 시 이동 |
| **aidlc-snapshot/** | 없음 (aidlc-docs 직접 참조) | 런 완료 시점 복사본 |

### 2.3 runs.json (런 레지스트리)

```json
{
  "version": "2.0",
  "activeRunId": "ui-redesign-20260329-1",
  "runs": [
    {
      "runId": "ui-improvement-20260328-1",
      "state": "completed",
      "cycle": 1,
      "createdAt": "2026-03-28T09:30:00Z",
      "completedAt": "2026-03-28T10:14:00Z",
      "intentDescription": "UI 개선 — 용어 통일 및 대시보드 카드 정확도",
      "nodesTotal": 14,
      "nodesCompleted": 13,
      "nodesFailed": 0,
      "graphHash": "bfe96f44...",
      "hasAidlcSnapshot": true,
      "artifacts": {
        "scratchpadFiles": 14,
        "aidlcDocsFiles": 12,
        "gitCommits": 8
      }
    },
    {
      "runId": "ui-redesign-20260329-1",
      "state": "completed",
      "cycle": 2,
      "createdAt": "2026-03-29T10:30:00Z",
      "completedAt": "2026-03-29T11:16:30Z",
      "intentDescription": "UI 전면 리디자인 — 히스토리 중심 3페이지 구조",
      "nodesTotal": 13,
      "nodesCompleted": 13,
      "nodesFailed": 0,
      "graphHash": "510f61f2...",
      "hasAidlcSnapshot": true,
      "artifacts": {
        "scratchpadFiles": 13,
        "aidlcDocsFiles": 15,
        "gitCommits": 12
      }
    }
  ]
}
```

### 2.4 manifest.json (런별 상세 메타)

```json
{
  "schema": "ai-crew.run.v2",
  "runId": "ui-redesign-20260329-1",
  "cycle": 2,
  "intent": {
    "description": "UI 전면 리디자인 — 히스토리 중심 3페이지 구조",
    "source": "aidlc-docs/construction/ui-redesign/ui-redesign-proposal.md"
  },
  "timing": {
    "createdAt": "2026-03-29T10:30:00Z",
    "completedAt": "2026-03-29T11:16:30Z",
    "totalDurationMs": 2790000
  },
  "graph": {
    "nodeCount": 13,
    "levelCount": 9,
    "hash": "510f61f2..."
  },
  "nodeSummaries": {
    "layout-overhaul": {
      "agent": "frontend-dev",
      "model": "claude-opus-4-6",
      "status": "completed",
      "durationMs": 537000,
      "filesChanged": ["ui/src/components/layout/TopBar.tsx", "ui/src/components/layout/SettingsDrawer.tsx"],
      "keyDecisions": ["사이드바 제거 → TopBar로 전환", "SettingsDrawer hidden class 방식"]
    }
  },
  "quality": {
    "vitest": { "total": 122, "passed": 122, "failed": 0 },
    "build": "pass",
    "playwright": { "total": 3, "passed": 3 }
  }
}
```

### 2.5 aidlc-snapshot/ 생성 규칙

**타이밍**: `/crew:integrate` 완료 시점

**범위**: `aidlc-docs/` 전체 (inception/ + construction/ + aidlc-state.md + audit.md)

**방법**:
```bash
cp -r aidlc-docs/ .ai-crew/runs/{runId}/aidlc-snapshot/
```

**제외**: 없음 (전체 복사로 완전한 시점 복원 보장)

**aidlc-docs와의 관계**:
- aidlc-docs/: AI-DLC가 -vN 방식으로 누적 관리 (변형 안 함)
- aidlc-snapshot/: ai-crew가 런 시점별로 스냅샷 저장 (UI에서 읽음)

---

## 3. 아카이브 생명주기

```
/crew:elaborate (새 사이클 시작)
  └── 이전 active/ → runs/{prevRunId}/ 이동
  └── aidlc-docs/ → runs/{prevRunId}/aidlc-snapshot/ 복사
  └── active/ 비우고 새 런 준비

/crew:preflight
  └── active/graph.yaml 생성
  └── active/state.json 초기화

/crew:run (실행 중)
  └── active/state.json 실시간 갱신
  └── active/scratchpad/ 에이전트가 기록

/crew:integrate (완료)
  └── active/ → runs/{currentRunId}/ 복사
  └── aidlc-docs/ → runs/{currentRunId}/aidlc-snapshot/ 복사
  └── runs.json 갱신 (state: "completed")
  └── active/ 유지 (다음 사이클까지)
```

---

## 4. API 설계

### 4.1 엔드포인트 목록

| Method | Path | 소스 | 설명 |
|--------|------|------|------|
| GET | `/api/runs` | `runs.json` | 전체 런 목록 |
| GET | `/api/runs/{runId}` | `runs/{runId}/manifest.json` | 런 상세 메타 |
| GET | `/api/runs/{runId}/graph` | `runs/{runId}/graph.yaml` | 런의 그래프 |
| GET | `/api/runs/{runId}/nodes` | `runs/{runId}/state.json` | 런의 노드 상태 |
| GET | `/api/runs/{runId}/scratchpad/{nodeId}` | `runs/{runId}/scratchpad/` | 에이전트 결과물 |
| GET | `/api/runs/{runId}/docs` | `runs/{runId}/aidlc-snapshot/` | 런 시점 문서 목록 |
| GET | `/api/runs/{runId}/docs?path=` | `runs/{runId}/aidlc-snapshot/` | 런 시점 문서 내용 |
| GET | `/api/active` | `active/state.json` | 현재 런 상태 (실시간) |
| GET | `/api/active/graph` | `active/graph.yaml` | 현재 그래프 |
| GET | `/api/active/scratchpad/{nodeId}` | `active/scratchpad/` | 현재 에이전트 결과물 |
| GET | `/api/config` | `config.yaml` | 프로젝트 설정 |
| GET | `/api/aidlc/state` | `aidlc-docs/aidlc-state.md` | 현재 설계 상태 |
| GET | `/api/aidlc/docs` | `aidlc-docs/` | 현재 설계 문서 (최신) |
| GET | `/api/aidlc/docs?path=` | `aidlc-docs/` | 현재 문서 내용 |

### 4.2 런 목록 응답 예시

```json
GET /api/runs

{
  "activeRunId": "ui-redesign-20260329-1",
  "runs": [
    {
      "runId": "ui-redesign-20260329-1",
      "state": "completed",
      "cycle": 2,
      "createdAt": "2026-03-29T10:30:00Z",
      "completedAt": "2026-03-29T11:16:30Z",
      "intentDescription": "UI 전면 리디자인 — 히스토리 중심 3페이지 구조",
      "nodesTotal": 13,
      "nodesCompleted": 13,
      "nodesFailed": 0,
      "hasAidlcSnapshot": true
    },
    {
      "runId": "ui-improvement-20260328-1",
      "state": "completed",
      "cycle": 1,
      "createdAt": "2026-03-28T09:30:00Z",
      "completedAt": "2026-03-28T10:14:00Z",
      "intentDescription": "UI 개선 — 용어 통일 및 대시보드 카드 정확도",
      "nodesTotal": 14,
      "nodesCompleted": 13,
      "nodesFailed": 0,
      "hasAidlcSnapshot": true
    }
  ]
}
```

### 4.3 런 상세 응답 예시

```json
GET /api/runs/ui-redesign-20260329-1

{
  "runId": "ui-redesign-20260329-1",
  "intent": { "description": "UI 전면 리디자인 — 히스토리 중심 3페이지 구조" },
  "cycle": 2,
  "timing": {
    "createdAt": "2026-03-29T10:30:00Z",
    "completedAt": "2026-03-29T11:16:30Z",
    "totalDurationMs": 2790000
  },
  "graph": {
    "nodes": [ ... ],
    "nodeCount": 13,
    "levelCount": 9
  },
  "nodes": {
    "layout-overhaul": {
      "status": "completed",
      "agent": "frontend-dev",
      "model": "claude-opus-4-6",
      "startedAt": "2026-03-29T10:35:00Z",
      "completedAt": "2026-03-29T10:44:00Z",
      "level": 0
    }
  },
  "quality": {
    "vitest": { "total": 122, "passed": 122, "failed": 0 },
    "build": "pass",
    "playwright": { "total": 3, "passed": 3 }
  },
  "aidlcDocs": [
    { "path": "inception/requirements/requirements-v2.md", "label": "요구사항 분석" },
    { "path": "inception/plans/execution-plan-v2.md", "label": "작업 계획" }
  ]
}
```

---

## 5. UI 페이지 설계

### 5.1 페이지 구조 (3+1)

| 페이지 | 라우트 | 데이터 소스 |
|--------|--------|------------|
| 타임라인 (홈) | `/` | `/api/runs` + `/api/active` |
| 런 상세 | `/runs/{runId}` | `/api/runs/{runId}` |
| 설계 문서 (현재) | `/docs` | `/api/aidlc/docs` (aidlc-docs 직접) |
| 설계 문서 (런 시점) | `/runs/{runId}/docs` | `/api/runs/{runId}/docs` (aidlc-snapshot) |

### 5.2 타임라인 (홈)

```
┌─────────────────────────────────────────────────────────┐
│ ◆ AI-Crew Studio          타임라인  설계 문서        ⚙  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ 프로젝트 현황 ──────────────────────────────────────┐│
│ │ dynamic-20260328 · 에이전트 13개 · 설계 9/9 · 100%  ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│  [전체 ▾] [검색...]                                     │
│                                                         │
│  2026-03-29 ──────────────────────────────────────────  │
│                                                         │
│  ┌─ cycle 2 ── ✅ 완료 ──────────────────────────────┐ │
│  │ "UI 전면 리디자인 — 히스토리 중심 3페이지 구조"    │ │
│  │ ui-redesign-20260329-1                              │ │
│  │ 13/13 노드 · 47분 · 📄 15개 문서                   │ │
│  │                                    [상세 보기 →]    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  2026-03-28 ──────────────────────────────────────────  │
│                                                         │
│  ┌─ cycle 1 ── ✅ 완료 ──────────────────────────────┐ │
│  │ "UI 개선 — 용어 통일 및 대시보드 카드 정확도"      │ │
│  │ ui-improvement-20260328-1                           │ │
│  │ 13/14 노드 · 44분 · 📄 12개 문서                   │ │
│  │                                    [상세 보기 →]    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**변경점 (v2 대비)**:
- 런 카드에 `cycle` 번호 표시
- 문서 수 (`aidlcDocsFiles`) 표시
- 데이터 소스: `runs.json` (아카이브 포함)

### 5.3 런 상세

```
┌─────────────────────────────────────────────────────────┐
│ ◆ AI-Crew Studio          타임라인  설계 문서        ⚙  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ← 타임라인                                             │
│                                                         │
│ ┌─ 런 정보 ──────────────────────────────────────────┐  │
│ │ cycle 2 · "UI 전면 리디자인"                        │  │
│ │ ui-redesign-20260329-1 · 10:30~11:16 · 47분        │  │
│ │ ✅ 13/13 노드 · vitest 122 pass · build pass       │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│  [노드 결과]  [설계 문서]                  ← 탭 전환     │
│                                                         │
│ ┌─ 노드 결과 탭 ─────────────────────────────────────┐  │
│ │                                                     │  │
│ │ Level 0 (병렬)                                      │  │
│ │ ┌──────────────────────────────────────────────┐   │  │
│ │ │ ✅ layout-overhaul · frontend-dev · 8분 57초 │   │  │
│ │ │ [결과물 보기 ▾]                               │   │  │
│ │ │ ┌──────────────────────────────────────────┐ │   │  │
│ │ │ │ # layout-overhaul                        │ │   │  │
│ │ │ │ ## What — 수행 내용                       │ │   │  │
│ │ │ │ TopBar + SettingsDrawer 생성...           │ │   │  │
│ │ │ └──────────────────────────────────────────┘ │   │  │
│ │ └──────────────────────────────────────────────┘   │  │
│ │ ┌──────────────────────────────────────────────┐   │  │
│ │ │ ✅ page-cleanup · frontend-dev · 3분 48초    │   │  │
│ │ │ [결과물 보기 ▸]                               │   │  │
│ │ └──────────────────────────────────────────────┘   │  │
│ │                                                     │  │
│ │ Level 1 (병렬)                                      │  │
│ │ ...                                                 │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─ 설계 문서 탭 (이 런 시점) ────────────────────────┐  │
│ │                                                     │  │
│ │ 📂 인셉션                                           │  │
│ │ ├─ 📁 요구사항 분석                                 │  │
│ │ │  └ 📄 requirements-v2.md                         │  │
│ │ ├─ 📁 작업 계획                                     │  │
│ │ │  └ 📄 execution-plan-v2.md                       │  │
│ │ └─ 📁 애플리케이션 설계                             │  │
│ │    └ 📄 unit-of-work-v2.md                         │  │
│ │                                                     │  │
│ │ 📂 컨스트럭션                                       │  │
│ │ └─ 📁 build-and-test                               │  │
│ │    └ 📄 test-results.md                            │  │
│ │                                                     │  │
│ │ [문서 클릭 시 마크다운 렌더링]                       │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**변경점 (v2 대비)**:
- 런 상세 안에 **2개 탭** (노드 결과 / 설계 문서)
- "설계 문서" 탭은 `aidlc-snapshot/`에서 읽음 (그 런 시점의 문서)
- quality 정보 (vitest, build, playwright) 런 헤더에 표시

### 5.4 설계 문서 (글로벌 탭)

- 기존 `/docs` 유지 — `aidlc-docs/` 직접 읽기 (항상 최신)
- 런 상세의 "설계 문서" 탭과 구분: 여기는 "현재", 거기는 "그 시점"

### 5.5 설정 드로어

- 기존 유지 — `/api/config` 읽기 전용

---

## 6. 데이터 흐름 요약

```
사용자: "이전에 뭘 했지?"
  → 타임라인 / → /api/runs → runs.json
  → 런 카드 목록 (날짜별, cycle 표시)

사용자: "그때 에이전트 결과가 뭐였지?"
  → 런 상세 /runs/{id} → /api/runs/{id} → manifest.json + state.json
  → 노드 아코디언 → /api/runs/{id}/scratchpad/{node} → scratchpad/

사용자: "그때 설계 문서가 뭐였지?"
  → 런 상세 [설계 문서] 탭 → /api/runs/{id}/docs → aidlc-snapshot/

사용자: "현재 진행 중인 런은?"
  → 타임라인 ActiveRunCard → /api/active → active/state.json (3초 폴링)

사용자: "최신 설계 문서는?"
  → 설계 문서 /docs → /api/aidlc/docs → aidlc-docs/ 직접
```

---

## 7. 구현 범위

### 7.1 백엔드 (.ai-crew/ 구조 변경)

| 작업 | 설명 |
|------|------|
| `active/` 디렉토리 도입 | 기존 flat state.json, graph.yaml, scratchpad/ → active/ 하위로 이동 |
| `runs/{runId}/` 격리 | 아카이브 시 active/ → runs/{runId}/ 이동 + aidlc-snapshot 복사 |
| `manifest.json` 생성 | /crew:integrate에서 nodeSummaries, quality, timing 기록 |
| `runs.json` v2 | activeRunId, cycle, hasAidlcSnapshot, artifacts 필드 추가 |

### 7.2 스킬/커맨드 수정

| 파일 | 변경 |
|------|------|
| `/crew:elaborate` | active/ 경로로 state/graph 기록 |
| `/crew:preflight` | active/ 경로, 아카이브 로직에 aidlc-snapshot 추가 |
| `/crew:run` | active/scratchpad/ 경로로 에이전트 기록 |
| `/crew:integrate` | manifest.json 생성, aidlc-snapshot 복사, runs/ 아카이브 |

### 7.3 API 라우트

| 라우트 | 변경 |
|--------|------|
| `GET /api/runs` | runs.json v2 형식 반환 |
| `GET /api/runs/{runId}` | runs/{runId}/manifest.json 읽기 (신규) |
| `GET /api/runs/{runId}/graph` | runs/{runId}/graph.yaml 읽기 (신규) |
| `GET /api/runs/{runId}/nodes` | runs/{runId}/state.json 읽기 (신규) |
| `GET /api/runs/{runId}/scratchpad/{nodeId}` | runs/{runId}/scratchpad/ 읽기 (신규) |
| `GET /api/runs/{runId}/docs` | runs/{runId}/aidlc-snapshot/ 읽기 (신규) |
| `GET /api/active` | active/state.json 읽기 (기존 /api/state 대체) |
| `GET /api/active/graph` | active/graph.yaml 읽기 (기존 /api/graph 대체) |
| `GET /api/config` | 기존 유지 |
| `GET /api/aidlc/*` | 기존 유지 (aidlc-docs 직접) |

### 7.4 UI 컴포넌트

| 변경 유형 | 대상 |
|----------|------|
| 수정 | 타임라인 — cycle 표시, 문서 수 표시, /api/active 폴링 |
| 수정 | 런 상세 — 2탭 구조 (노드 결과 + 설계 문서), /api/runs/{id} 사용 |
| 신규 | `RunDocsPanel` — aidlc-snapshot 트리 + 마크다운 뷰어 |
| 유지 | 설계 문서 (/docs) — 기존 그대로 |
| 유지 | TopBar, SettingsDrawer — 기존 그대로 |

---

## 8. 마이그레이션 (현재 상태 → 새 구조)

```
현재:
  .ai-crew/state.json       → active/state.json
  .ai-crew/graph.yaml       → active/graph.yaml
  .ai-crew/scratchpad/      → active/scratchpad/
  .ai-crew/runs.json        → runs.json (v2 형식으로 마이그레이션)
  .ai-crew/runs/{id}/       → 유지 (manifest.json 추가 생성)

기존 API 호환:
  /api/state  → /api/active로 리다이렉트 (또는 active/state.json 직접 읽기)
  /api/graph  → /api/active/graph로 리다이렉트
```

---

## 9. 미해결 질문

1. **aidlc-snapshot 저장 용량**: aidlc-docs가 커지면 매 런마다 전체 복사가 부담. 증분 복사(diff) 또는 git ref 기반 스냅샷으로 대체?
2. **active 런 중 UI 표시**: /crew:run 실행 중에 active/state.json이 실시간 갱신되는데, UI에서 3초 폴링이 충분한가?
3. **retention 정책**: 오래된 runs/{runId}/ 삭제 시 aidlc-snapshot도 함께 삭제?
4. **런 없이 elaborate만 한 경우**: /crew:run을 안 하고 /crew:elaborate만 반복하면 런 기록이 없음. 이 경우 UI에 뭘 보여줘야 하나?

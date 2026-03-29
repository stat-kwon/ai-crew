# 요구사항 문서 v2 — UI 전면 리디자인

> **인텐트**: AI-Crew Studio UI를 히스토리 중심 3페이지 구조로 전면 재구성
> **유형**: Enhancement (기존 기능 대폭 변경)
> **범위**: Multiple Components (레이아웃 + 7→3 페이지 + 컴포넌트 전면 교체)
> **복잡도**: Moderate (기존 데이터/API 활용, UI 레이어만 변경)

---

## 1. 인텐트 분석

### 1.1 핵심 사용 시나리오

```
사용자: CLI(Claude Code)에서 작업 수행
UI 역할: 프로젝트 히스토리 뷰어 & 진행 상태 트래커 (읽기 전용)

핵심 질문:
  - "이전에 어떤 작업을 했는가?"
  - "현재 어디까지 완료되었는가?"
  - "각 에이전트의 결과물은 어떠했는가?"
```

### 1.2 설계 원칙

1. **UI = 읽기 전용 관찰 도구** — 실행/조작은 CLI의 영역
2. **히스토리 퍼스트** — 과거 → 현재 → 미래 흐름으로 정보 배치
3. **최소 페이지, 최대 깊이** — 페이지 수를 줄이고 드릴다운으로 깊이 확보
4. **역할 분리** — 런 상세 = 에이전트 결과물, 설계 문서 = 문서 탐색

---

## 2. 기능 요구사항

### FR-1: 정보 아키텍처 재구성 (7페이지 → 3페이지)

**제거 대상 (4개)**:
| 페이지 | 제거 근거 |
|--------|----------|
| 팀 편집 (`/team`) | CLI에서 graph.yaml로 처��� |
| 환경 점검 (`/preflight`) | CLI에서 /crew:preflight로 처리 |
| 팀 템플��� (`/bundles`) | CLI에서 번들 전환 |
| 설정 (`/settings`) | CLI에서 config.yaml 수정 |

**유지 대상 (3개)**:
| 페이지 | 역할 | 라우트 |
|--------|------|--------|
| 타임라인 (홈) | 프로젝트 히스토리 + 현재 상태 | `/` |
| 런 상세 | 노드별 결과물 드릴다운 | `/runs/[runId]` |
| 설계 문�� | aidlc-docs 전체 탐색 | `/docs` |

### FR-2: 네비게이션 전환 (사이드바 → 상단 탭 바)

- 좌측 사이드바(w-64) **제거**
- 상단 탭 바(h-14) **신규**:
  - 좌: 로고 (◆ AI-Crew Studio)
  - 중앙: 탭 2개 (타임라인 | 설계 문서)
  - 우: ⚙ 설정 아이콘 → 드로어 (읽기 전용 정보)
- 콘텐츠 영역: `100vw` 전체 폭 사용 (기존 대비 256px 확보)

### FR-3: 타임라인 페이지 (홈)

**프로젝트 현황 바**:
- 팀 템플릿명, 에이전트 수, 설계 진행률 (1줄 요약)
- 전체 노드 진행 바

**타임라인 목록**:
- 날짜별 그룹핑 (`DateDivider`)
- 필터: 상태(전체/완료/실패), 텍스트 검색

**런 카드 상태별 표시**:
| 상태 | 카드 형태 | 표시 정보 |
|------|----------|----------|
| 진행 중 | **확장** — 보라색 테두리, 노드 미니맵 | intent, runId, 노드별 상태 칩, 경과 시간 |
| 완료 | **접힘** — 한 줄 요약 | intent, runId, 노드 수, 소요 시간 |
| 실패 | **접힘** — 붉은 테두리 | intent, runId, 실패 노드 + 사유 |

**노드 미니맵** (진행 중 런에만):
- ✅ 완료 = 초록 칩 + 소요시간
- 🔵 진행 = 보라 칩 + 펄스 애니메이션
- ⏳ 대기 = 회색 칩
- 🔴 실패 = 빨강 칩

### FR-4: 런 상세 페이지

**진입**: 타임라인 → [상세 보기] 클릭

**런 헤더** (상단 전체 폭):
- intent description (메인 타이틀)
- runId, 시작~종료 시간, 총 소요시간
- 상태 뱃지, 노드 완료 카운트

**노드 목록** (전체 폭, 1컬럼):
- 레벨별 그룹핑 (Level 0, 1, 2, ...)
- 각 노드: 상태 아이콘 + 노드명 + agent명 + 소요시간
- **인라인 아코디언**: 클릭 시 바로 아래에 scratchpad 마크다운 렌더링
- 접힌 상태에서도 한 줄 요약 표시

**문서 패널 없음**: 런 상세는 노드 결과물에만 집중. 문서는 설계 문서 탭에서 접근.

### FR-5: 설계 문서 페이지

- 기존 구조 유지: 좌측 폴더 트리 (30%) + 우측 마크다운 뷰어 (70%)
- 상단: 설계 진행 현황 스텝퍼 (aidlc-state.md 파��)
- 폴더 한국어 레이블 매핑 유지
- 상단 탭 바와 연동 (사이드바 대신)

### FR-6: 설정 드로어

- ⚙ 아이콘 클릭 → 우측 슬라이드인 패널 (w-80)
- **읽기 전용** 정보 표시:
  - 프로젝트 정보 (팀 템플릿, 에이전트 수, 설계 상태)
  - 설정값 (isolation, merge_mode, locale)
- "CLI에서 수정하세요" 안내 문구

---

## 3. 비기능 요구사항

### NFR-1: 데이터 정확성

- 타임라인 런 목록은 `/api/runs` 데이터와 100% 일치
- 현재 런 상태는 `/api/state`와 실시간 동기화 (3~5초 폴링)
- 노드 레벨 정보는 graph.yaml의 `depends_on`으로 정확히 계산
- 검증: Vitest 스냅샷 테스트

### NFR-2: UI 일관성

- Tailwind CSS + shadcn/ui 디자인 시스템 유지
- 색상 체계: 인디고(주색), 에메랄드(완료), 로즈(실패), 슬레이트(대기/배경)
- 제거된 페이지 관련 코드 0건 잔존
- 검증: 빌드 성공 + 미사용 import 0건

### NFR-3: 하위 호환성

- `.ai-crew/` 디렉토리 구조 변경 없음
- `aidlc-docs/` 구조 변경 없음
- 기존 API 엔드포인트 유지 (추가만 가능, 삭제 불가)
- CLI 명령어 영향 없음

### NFR-4: 성능

- 타임라인 페이지 초기 로드: 1초 이내
- 런 상세 진입: 500ms 이내
- 아코디언 펼침 (scratchpad 로드): 300ms 이내

---

## 4. 범위 외 (명시적 제외)

- 다크 모드 추가
- 비주얼 톤 전면 변경 (색상/폰트/카드 스타일)
- 런↔문서 정밀 매핑 (manifest.json 확장)
- UI에서의 실행/조작 기능 (런 시작, 설정 변경 등)
- 모바일 반응형 최적화 (데스크톱 우선)

---

## 5. 컴포넌트 변경 요약

### 제거

| 대상 | 유형 |
|------|------|
| `ui/src/app/team/` | 페이지 |
| `ui/src/app/preflight/` | 페이지 |
| `ui/src/app/bundles/` | 페이지 |
| `ui/src/app/settings/` | 페이지 |
| `ui/src/app/develop/` | 페이지 (런 상세로 대체) |
| `ui/src/components/layout/Sidebar.tsx` | 컴포넌트 |
| `ui/src/components/layout/Header.tsx` | 컴포넌트 |
| `ui/src/components/bundles/` | 디렉토리 |
| `ui/src/components/config/` | 디렉토리 |

### 신규

| 대상 | 역할 |
|------|------|
| `components/layout/TopBar.tsx` | 상단 탭 네비게이션 |
| `components/layout/SettingsDrawer.tsx` | 설정 드로어 |
| `components/timeline/ProjectSummaryBar.tsx` | 프로젝트 현황 |
| `components/timeline/ActiveRunCard.tsx` | 진행 중 런 카드 |
| `components/timeline/CompletedRunCard.tsx` | 완료 런 카드 |
| `components/timeline/FailedRunCard.tsx` | 실패 런 카드 |
| `components/timeline/NodeChip.tsx` | 노드 미니맵 칩 |
| `components/timeline/TimelineFilter.tsx` | 필터/검색 |
| `components/timeline/DateDivider.tsx` | 날짜 구분선 |
| `components/run-detail/RunHeader.tsx` | 런 정보 헤더 |
| `components/run-detail/NodeList.tsx` | 레벨별 노드 목록 |
| `components/run-detail/NodeAccordion.tsx` | 결과물 아코디언 |
| `app/runs/[runId]/page.tsx` | 런 상세 페이지 |

### 수정

| 대상 | 변경 내용 |
|------|----------|
| `app/layout.tsx` | 사이드바 → TopBar 레이아웃 |
| `app/page.tsx` | 대시보드 → 타임라인 전면 교체 |
| `app/design/page.tsx` | `/docs` 라우트로 이동, 스타일 조정 |

---

## 6. API 활용 계획

| API | 사용 위치 | 용도 |
|-----|----------|------|
| `GET /api/runs` | 타임라인 | 전체 런 목록 |
| `GET /api/runs/{runId}` | 런 상세 | 특정 런 노드 상태 |
| `GET /api/state` | 타임라인 | 현재 진행 중 런 |
| `GET /api/graph` | 타임라인/런 상세 | 노드 정의 |
| `GET /api/config` | 현황 바/설정 드로어 | 설정값 |
| `GET /api/aidlc/state` | 설계 문서/현황 바 | 설계 진행 상태 |
| `GET /api/aidlc/docs` | 설계 문서 | 문서 목록 |
| `GET /api/aidlc/docs?path=` | 설계 문서 | 문서 내용 |
| `GET /api/scratchpad/{nodeId}` | 런 상세 아코디언 | 노드 결과물 |

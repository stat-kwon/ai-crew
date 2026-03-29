# 유닛 분해 v2 — UI 전면 리디자인

---

## Unit 1: layout-overhaul (레이아웃 전환)

**레벨**: 0 (선행 의존성 없음)
**에이전트**: frontend-dev
**스킬**: frontend-react, clean-code

### 담당 범위

사이드바 네비게이션을 상단 탭 바로 전환하고, AppShell 레이아웃을 재구성한다.

### 대상 파일

| 작업 | 파일 |
|------|------|
| 제거 | `ui/src/components/layout/Sidebar.tsx` |
| 제거 | `ui/src/components/layout/Header.tsx` |
| 신규 | `ui/src/components/layout/TopBar.tsx` |
| 신규 | `ui/src/components/layout/SettingsDrawer.tsx` |
| 수정 | `ui/src/app/layout.tsx` |

### 상세 작업

1. `TopBar.tsx` 생성:
   - 좌: 로고 (◆ AI-Crew Studio / The Cognitive Architect)
   - 중앙: 탭 2개 (타임라인 | 설계 문서) — `usePathname()` 기반 active 상태
   - 우: ⚙ 설정 아이��� (SettingsDrawer 토글)
   - 높이: h-14, 전체 폭, `bg-white border-b`

2. `SettingsDrawer.tsx` 생성:
   - 우측 슬라이드인 패널 (w-80)
   - 읽기 전용: 프로젝트 정보 + 설정값 표시
   - `/api/config` 데이터 사용
   - 오버레이 클릭 시 닫기

3. `layout.tsx` 수정:
   - Sidebar 제거 → TopBar로 교체
   - `ml-64` 제거 → 전체 폭 콘텐츠
   - 레이아웃: `flex flex-col` (TopBar 위 + 콘텐츠 아래)

### 완료 기준

- [ ] Sidebar.tsx, Header.tsx 제거됨
- [ ] TopBar가 2개 탭 네비게이션 정상 동작
- [ ] SettingsDrawer가 열림/닫힘 정상 동작
- [ ] layout.tsx가 전체 폭 레이아웃으로 렌더링
- [ ] `next build` 성공

---

## Unit 2: page-cleanup (페이지 제거 + 라우팅 정리)

**레벨**: 0 (선행 의존성 없음)
**에이전트**: frontend-dev
**스킬**: frontend-react, clean-code

### 담당 범위

불필요한 4개 페이지와 관련 컴포넌트를 제거하고, develop 페이지를 제거한다.

### 대상 파일

| 작업 | 파일/디렉토리 |
|------|-------------|
| 제거 | `ui/src/app/team/` |
| 제거 | `ui/src/app/preflight/` |
| 제거 | `ui/src/app/bundles/` |
| 제거 | `ui/src/app/settings/` |
| 제거 | `ui/src/app/develop/` |
| 제거 | `ui/src/components/bundles/` |
| 제거 | `ui/src/components/config/` |
| 제거 | `ui/src/components/runs/` (칸반보드 등 — 런 상세에서 새로 구현) |
| 정리 | 관련 API 라우트 중 미사용 제거 (bundles apply 등) |
| 정리 | 관련 테스트 파일 제거 또는 업데이트 |

### 상세 작업

1. 5개 페이지 디렉토리 삭제
2. 관련 피처 컴포넌트 디렉토리 삭제
3. 미사용 API 라우트 확인 후 제거:
   - `POST /api/bundles/{name}/apply` — UI에서 더 이상 호출 안 함
   - `PUT /api/config` — UI에서 더 이상 호출 안 함
4. 관련 테스트 파일 제거
5. 미사용 import/의존성 정리

### 완료 기준

- [ ] 5개 페이지 디렉토리 완전 삭제
- [ ] 관련 컴포넌트 디렉토리 완전 삭제
- [ ] 미사용 API 라우트 제거됨
- [ ] `next build` 성공 (미사용 import 0건)
- [ ] 제거된 페이지 관련 코드 grep 0건

---

## Unit 3: timeline-page (타임라인 홈)

**레벨**: 1 (layout-overhaul, page-cleanup 완료 후)
**에이전트**: frontend-dev
**스킬**: frontend-react, testing, clean-code

### 담당 범위

대시보드(page.tsx)를 타임라인 히스토리 페이지로 전면 교체한다.

### 대상 파일

| 작업 | 파일 |
|------|------|
| 전면 교체 | `ui/src/app/page.tsx` |
| 신규 | `ui/src/components/timeline/ProjectSummaryBar.tsx` |
| 신규 | `ui/src/components/timeline/ActiveRunCard.tsx` |
| 신규 | `ui/src/components/timeline/CompletedRunCard.tsx` |
| 신규 | `ui/src/components/timeline/FailedRunCard.tsx` |
| 신규 | `ui/src/components/timeline/NodeChip.tsx` |
| 신규 | `ui/src/components/timeline/TimelineFilter.tsx` |
| 신규 | `ui/src/components/timeline/DateDivider.tsx` |
| 수정 | 관련 테스트 파일 |

### 상세 작업

1. `ProjectSummaryBar`: 팀 템플릿명 + 에이전트 수 + 설계 진행률 + 노드 진행 바
   - 데이터: `/api/config`, `/api/graph`, `/api/aidlc/state`

2. `TimelineFilter`: 상태 필터 (전체/진행 중/완료/실패) + 텍스트 검색
   - 클라이언트 사이드 필터링

3. `DateDivider`: 날짜 문자열 표시 (createdAt 기준 그룹핑)

4. `ActiveRunCard`: 현재 진행 중 런 확장 카드
   - 데이터: `/api/state`, `/api/graph`
   - NodeChip 미니맵 표시
   - 보라색 테두리, 실시간 갱신 (3초)

5. `CompletedRunCard`: 완료 런 접힘 카드
   - intent, runId, 노드 수, 소요 시간
   - [상세 보기 →] 링크 → `/runs/[runId]`

6. `FailedRunCard`: 실패 런 접힘 카드
   - 붉은 테두리, 실패 노드 + 사유

7. `NodeChip`: 노드 상태별 색상 칩 (완료/진행/대기/실패)

8. `page.tsx` 전면 교체: 위 컴포넌트 조합

### 완료 기준

- [ ] 타임라인 페이지가 런 히스토리를 날짜별로 표시
- [ ] 진행 중 런은 확장 상태로 노드 미니맵 표시
- [ ] 완료/실패 런은 접힌 상태로 한 줄 요약 표시
- [ ] 필터/검색 정상 동작
- [ ] [상세 보기] 클릭 시 `/runs/[runId]`로 네비게이션
- [ ] Vitest 테스트 작성 및 통과

---

## Unit 4: run-detail-page (런 상세)

**레벨**: 1 (layout-overhaul, page-cleanup 완료 후)
**에이전트**: frontend-dev
**스킬**: frontend-react, testing, clean-code

### 담당 범위

런 상세 페이지를 신규 생성한다. 노드별 결과물을 인라인 아코디언으로 탐색한다.

### 대상 파일

| 작업 | 파일 |
|------|------|
| 신규 | `ui/src/app/runs/[runId]/page.tsx` |
| 신규 | `ui/src/components/run-detail/RunHeader.tsx` |
| 신규 | `ui/src/components/run-detail/NodeList.tsx` |
| 신규 | `ui/src/components/run-detail/NodeAccordion.tsx` |
| 신규 | 관련 테스트 파일 |

### 상세 작업

1. `RunHeader`: 런 정보 헤더
   - intent description (text-lg font-bold)
   - runId (text-xs text-slate-400)
   - 시작~종료 시간, 총 소요시간
   - 상태 뱃지 + "X/Y 노드 완료"
   - ← 타임라인으로 돌아가기 링크

2. `NodeList`: 레벨별 그룹핑 노드 목록
   - graph.yaml의 `depends_on`으로 레벨 계산
   - 레벨 헤더: "Level 0 (병렬)", "Level 1 (의존성 있음)" 등
   - 각 노드를 NodeAccordion으로 렌더링

3. `NodeAccordion`: 노드 결과물 아코디언
   - 헤더: [상태 아이콘] 노드명 · agent명 · 소요시간
   - [결과물 보기 ▾] 클릭 시 펼침
   - 펼침 영역: `/api/scratchpad/{nodeId}` → 마크다운 렌더링
   - ReactMarkdown + remarkGfm 사용

4. `page.tsx`: runId 파라미터로 데이터 로드
   - `/api/runs/{runId}` (또는 `/api/state` + runId 매칭)
   - `/api/graph` (노드 정의)

### 완료 기준

- [ ] `/runs/[runId]` 라우트에서 런 상세 정상 렌더링
- [ ] 노드가 레벨별로 정확히 그룹핑됨
- [ ] 아코디언 클��� 시 scratchpad 마크다운이 인라인으로 렌더링
- [ ] ← 돌아가기 링크가 타임라인으로 네비게이션
- [ ] Vitest 테스트 작성 및 통과

---

## Unit 5: docs-page (설계 문서 페이지 조정)

**레벨**: 1 (layout-overhaul 완료 후)
**에이전트**: frontend-dev
**스킬**: frontend-react, testing, clean-code

### 담당 범위

기�� 설계 단계 페이지의 라우트를 `/docs`로 이동하고, 상단 탭 바와 연동한다.

### 대상 파일

| 작업 | 파일 |
|------|------|
| 이동 | `ui/src/app/design/page.tsx` → `ui/src/app/docs/page.tsx` |
| 수정 | 페이지 스타일 조정 (전체 폭 대응) |
| 수정 | 관련 테스트 파일 |

### 상세 작업

1. `/design` → `/docs`로 라우트 변경
   - `app/design/` 디렉토리를 `app/docs/`로 이동
   - TopBar 탭에서 `/docs`로 링크

2. 전체 폭 대응:
   - 사이드바가 없으므로 좌측 트리 비율 조정 (30% 유지 또는 20%로 축소)
   - 우측 뷰어 영역 확대

3. 스텝퍼 스타일 조정:
   - 기존 기능 유지
   - TopBar와 시각적 일관성 확보

4. 하단 배너 제거 또는 간소화:
   - `/crew:elaborate` 실행 버튼은 CLI 영역이므로 제거

### 완료 기준

- [ ] `/docs` 라우트에서 설계 문서 페이지 정상 렌더링
- [ ] TopBar "설계 문서" 탭 클릭 시 `/docs`로 이동
- [ ] 폴더 트리 + 마크다운 뷰어 정상 동작
- [ ] 전체 폭에서 레이아웃 깨지지 않음
- [ ] Vitest 테스트 작성 및 통과

---

## 유닛 의존성 매트릭스

```
              layout  cleanup  timeline  run-detail  docs
layout          -       -        ←           ←        ←
cleanup         -       -        ←           ←        -
timeline        →       →        -           -        -
run-detail      →       →        -           -        -
docs            →       -        -           -        -

→ = depends on (선행)
← = depended by (후행)
```

## 실행 순서

| Level | 노드 | 병�� | 의존성 |
|-------|------|------|--------|
| 0 | layout-overhaul, page-cleanup | 2 병렬 | 없음 |
| 1 | timeline-page, run-detail-page, docs-page | 3 병렬 | Level 0 완료 |
| 2 | test-all | 1 | Level 1 전체 완료 |
| 3 | code-review | 1 | test-all 완료 |
| 4 | improve-frontend | 1 | code-review 완료 |
| 5 | build-verify, qa-final | 2 병렬 | improve 완료 |

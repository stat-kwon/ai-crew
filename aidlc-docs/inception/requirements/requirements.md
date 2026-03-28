# 요구사항 문서

## Intent Analysis

- **사용자 요청**: AI-Crew Studio UI의 잘못된 부분을 완전히 개선. UI, backend, ai-crew 구조 변경 가능. AI-DLC 라이프사이클과 폴더 생성 구조를 면밀히 파악하여 개선.
- **요청 유형**: Enhancement / Refactoring
- **범위**: System-wide (UI 전체 + Backend API + ai-crew 상태 구조)
- **복잡도**: Complex

---

## FR-1: 용어 체계 통일 (에이전트 중심)

**현재 문제**: UI에서 "팀", "팀원", "번들", "에이전트", "노드"가 혼재

**요구사항**:
- 모든 UI에서 에이전트 중심 용어로 통일:
  - `에이전트(Agent)` — 개별 실행 단위
  - `에이전트 팀(Agent Team)` — graph.yaml에 정의된 에이전트 그룹
  - `번들(Bundle)` → `팀 템플릿(Team Template)` — 사전 정의된 팀 구성 프리셋
- 사이드바, 대시보드 카드, 페이지 제목, 상세 페이지 모두 일관 적용
- 코드 내부 변수명/타입명은 기존 유지 (breaking change 최소화)

---

## FR-2: 대시보드 "마지막 실행" 카드 — 자연어 요약

**현재 문제**: run ID(`todo-app-20260328-1`)가 그대로 표시되어 의미 파악 어려움

**요구사항**:
- `RunManifest.intent.description`을 활용하여 자연어 요약 표시
- 카드에 표시할 정보:
  - **제목**: intent description (예: "TODO 앱 백엔드 API 구현")
  - **부제**: run ID (작은 글씨)
  - **상태**: 진행률 (완료 노드/전체 노드)
  - **시간**: 경과 시간 또는 완료 시각
- 실행 기록이 없을 때: "아직 실행된 작업이 없습니다" 표시

---

## FR-3: 개발 흐름(Flow Steps) — 실제 명령어 기반 4단계

**현재 문제**: `/crew:init`, `/crew:check`, `/crew:merge` 등 존재하지 않는 명령어 포함

**요구사항**:
- 4단계로 축소 (실제 등록된 스킬 기반):
  1. **설계 고도화** — `/crew:elaborate`
  2. **환경 점검** — `/crew:preflight`
  3. **개발 실행** — `/crew:run`
  4. **결과 통합** — `/crew:integrate`
- 각 단계의 완료 상태를 실제 데이터로 판단:
  - elaborate: `aidlc-docs/aidlc-state.md` 존재 여부 + 인셉션 단계 완료 여부
  - preflight: `.ai-crew/state.json`의 `preflight` 필드 존재 여부
  - run: `state.json`의 노드 상태 (running/completed)
  - integrate: 모든 노드 completed 여부

---

## FR-4: 실행 이력 — 하이브리드 구조

**현재 문제**: 다중 세션 실행의 아카이빙/표현 방식 미흡

**요구사항**:
- **메타데이터**: `.ai-crew/runs/` 유지 (manifest.json, state-snapshot.json, scratchpad/)
- **AI-DLC 생성 문서**: `aidlc-docs/` 유지 (요구사항, 설계, 코드 요약 등)
- **연결**: `RunManifest`에 `aidlcDocsSnapshot` 필드 추가 가능 — 해당 run 시점의 주요 aidlc-docs 파일 목록 참조
- **UI 표현**:
  - 최근 실행 카드: intent 기반 자연어 요약 + 상태 + 노드 수
  - 실행 기록 탭: 날짜별 그룹핑, 각 run의 상세 정보 접근 가능
  - 개별 run 클릭 시: manifest 상세 + 노드별 결과 + scratchpad 보기

---

## FR-5: 설계 진행 상태 — 정확한 정보 제공

**현재 문제**: 설계 완료 데이터가 있는데 "시작 전"으로 표시됨

**요구사항**:
- `aidlc-state.md` 파싱 로직 강화:
  - 현재 `## N. StageName` 패턴 외에 `### INCEPTION PHASE` 등 다양한 형식 인식
  - 체크박스(`- [x]`/`- [ ]`) 기반 진행률 계산
- 데이터 없을 때: "설계 데이터 없음" (not "시작 전") — 정확한 정보 전달
- `aidlc-docs/` 디렉토리 자체의 존재 여부와 하위 파일 수를 보조 지표로 활용
- 대시보드 카드에서 현재 활성 단계명과 진행률(%) 정확히 표시

---

## FR-6: 에이전트 상태 카드 개선

**현재 문제**: "팀원 현황" 명칭과 정보 표현이 부적절

**요구사항**:
- 카드명: "에이전트 현황"
- 표시 정보:
  - graph 노드 수 + 각 상태별 수 (대기/진행/완료/실패)
  - progress bar 유지 (시각적 비율 표현)
  - graph가 없을 때: "에이전트 팀이 구성되지 않았습니다" 표시
- 용어를 "에이전트"로 통일

---

## FR-7: 사이드바 CTA — 프로젝트 전환

**현재 문제**: "신규 프로젝트" 버튼이 번들 목록으로 연결되며 의미가 불분명

**요구사항**:
- CTA를 "프로젝트 전환"으로 변경
- 클릭 시: 현재 설치된 번들과 사용 가능한 다른 번들 표시
- 번들 적용(전환) 시 기존 상태 아카이브 확인 메시지 표시
- 현재 활성 번들명을 사이드바 하단에 유지 표시

---

## FR-8: 설계 단계 페이지 — 폴더 매핑 뷰 + 사용자 친화적 표현

**현재 문제**: aidlc-docs 폴더 구조를 모르면 문서 구조 이해 어려움

**요구사항**:
- AI-DLC 인셉션 폴더 구조를 사용자 친화적 그룹으로 매핑:
  - `inception/requirements/` → "요구사항 분석"
  - `inception/user-stories/` → "사용자 시나리오"
  - `inception/plans/` → "작업 계획"
  - `inception/application-design/` → "애플리케이션 설계"
  - `construction/{unit}/` → "유닛: {unit명}"
- 각 그룹 아래 해당 폴더의 .md 파일 나열
- 파일명을 사람이 읽기 쉬운 한글 레이블로 변환 (예: `requirements.md` → "요구사항 문서")
- 폴더 구조를 모르는 사용자도 직관적으로 탐색 가능
- 문서 선택 시 우측 마크다운 프리뷰 유지

---

## NFR-1: 데이터 정확성

- 모든 대시보드 카드는 실제 파일 시스템 상태와 동기화
- `aidlc-state.md` 체크박스 수와 UI 진행률이 1:1 정확히 일치해야 함 (예: `- [x]` 3개 / 전체 6개 → 50%)
- 파일 시스템에 존재하지 않는 데이터를 UI에 표시하지 않음
- 데이터 없음과 "시작 전"을 명확히 구분 표시
- API 에러 시 사용자에게 적절한 에러 메시지 표시
- **검증 방법**: API 응답 스냅샷 테스트 (Vitest) + E2E 테스트 (Playwright)

## NFR-2: UI 일관성

- 모든 페이지에서 동일한 디자인 시스템 (Tailwind + shadcn/ui 기반) 사용
- 용어 체계 전체 UI에 일관 적용
- 반응형 레이아웃 유지
- **검증 기준**: 각 유닛의 terminology matrix에 정의된 구용어가 해당 유닛 범위의 UI 텍스트에서 0건 노출
- **검증 방법**: Vitest 단위 테스트에서 렌더링된 텍스트 내 구용어 패턴 매칭 검증

## NFR-3: 호환성

- 기존 `.ai-crew/` 파일 구조와 하위 호환 유지
- `ai-crew` 코어 패키지의 타입/API는 최소한으로만 변경
- 기존 CLI 명령어 동작에 영향 없음

---

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | No | Requirements Analysis |

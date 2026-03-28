# 요구사항 검증 질문

스크린샷 주석과 코드 분석을 통해 식별된 문제점들을 확인합니다. 각 질문의 `[Answer]:` 태그 뒤에 선택 문자를 기재해 주세요.

---

## Question 1
**용어 통일**: 현재 UI에서 "팀", "팀원", "번들", "에이전트", "노드"가 혼재되어 있습니다. 스크린샷에서 "팀 = Team으로 통일 필요"라고 언급하셨는데, 어떤 용어 체계를 사용하고 싶으신가요?

A) **에이전트 중심**: 에이전트(Agent), 에이전트 팀(Agent Team), 번들은 팀 템플릿으로 — 기술적 정확성 우선
B) **팀 비유 중심**: 팀(Team), 팀원(Member), 번들은 팀 구성 프리셋으로 — 사용자 친화적 비유 우선
C) **혼합**: 에이전트는 기술 문맥에서, 팀/팀원은 UI 표시에서 사용 — 문맥에 따라 다르게
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 2
**대시보드 "마지막 실행" 카드**: 현재 run ID(`todo-app-20260328-1`)가 그대로 표시됩니다. 스크린샷에서 "실제 title/description을 generate해서 마지막 실행 요약을 모르는 사람이 봐도 알 수 있게"라고 하셨습니다. 실행 요약을 어떻게 표현하면 좋겠습니까?

A) **자연어 요약**: AI가 intent description 기반으로 한줄 요약 생성 (예: "TODO 앱 백엔드 API 구현") + 진행률
B) **구조화 표시**: intent slug + 노드 완료 현황 + 소요 시간 (예: "todo-app | 3/5 완료 | 12분")
C) **카드 확장**: 요약 + 최근 완료된 노드 목록 + 주요 결과물 미리보기
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 3
**개발 흐름(Flow Steps)**: 현재 5단계(`/crew:init`, `/crew:elaborate`, `/crew:check`, `/crew:run`, `/crew:merge`)가 표시되는데, 스크린샷에서 "실제 없는 command도 포함되어 있음"이라고 지적하셨습니다. 실제 등록된 스킬/명령어를 확인하면:
- `/crew:elaborate` (있음)
- `/crew:preflight` (있음, `/crew:check`는 없음)
- `/crew:run` (있음)
- `/crew:integrate` (있음, `/crew:merge`는 없음)
- `/crew:init`는 별도 존재하지 않음

개발 흐름을 어떻게 수정하면 좋겠습니까?

A) **실제 명령어 기반**: elaborate → preflight → run → integrate 4단계로 축소 (init 제거)
B) **init 추가 후 5단계 유지**: `/crew:init` 스킬을 신규 생성하여 설계 초안 작성 단계 추가
C) **유연한 표현**: 명령어 대신 단계 이름만 표시하고 (설계→점검→실행→통합), 해당 명령어는 tooltip으로
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 4
**실행 이력 관리 구조**: 스크린샷에서 "서로 다른 세션의 N번 실행을 어떻게 아카이빙하며 표현할 지 완전히 다시 생각해볼 필요가 있음", "ai-dlc로 N번 다른세션에서 실행했다고 가정할 때 생성된 문서들은 crew에서 관리하지 않고 최근 실행을 파일로 관리할 새로운 구조가 필요"라고 하셨습니다. 현재 `.ai-crew/runs.json` + `.ai-crew/runs/{runId}/` 구조를 어떻게 개선하면 좋겠습니까?

A) **현재 구조 유지 + UI 개선만**: runs.json 인덱스는 유지하고 UI에서 세션별 그룹핑, 필터링, 타임라인 뷰 추가
B) **aidlc-docs 통합**: 실행 결과 문서를 `aidlc-docs/construction/{runId}/` 하위에 저장하여 AI-DLC 라이프사이클과 통합
C) **하이브리드**: 실행 메타데이터는 `.ai-crew/runs/`에, AI-DLC 생성 문서는 `aidlc-docs/`에 — 각자 역할에 맞게 분리
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 5
**설계 진행 상태 정확도**: 스크린샷에서 "설계 완료된 데이터에서 시작 전으로 나옴"이라고 지적하셨습니다. 현재 `aidlc-state.md` 파싱 로직이 `## N. StageName` + 체크박스 형식만 인식합니다. 개선 방향은?

A) **파싱 로직 강화**: 현재 마크다운 기반 aidlc-state.md의 다양한 형식을 인식하도록 파서 개선 + 없을 때 "데이터 없음" 표시
B) **JSON 상태 파일 도입**: `aidlc-docs/aidlc-state.json`을 별도 생성하여 구조화된 상태 추적 (마크다운은 사람이 보는 용도로 유지)
C) **state.json 확장**: 기존 `.ai-crew/state.json`에 AI-DLC 설계 상태 필드를 추가하여 단일 상태 소스로 통합
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 6
**팀원 현황 카드**: 스크린샷에서 "팀원 현황이 적절한 지 모르겠음"이라고 하셨습니다. 현재 이 카드는 graph node의 실행 상태(완료/진행/대기)를 progress bar로 표시합니다. 어떤 정보가 더 적절할까요?

A) **에이전트 역할 요약**: 각 에이전트의 이름과 현재 할당된 작업, 역할 타입(worker/aggregator/router) 표시
B) **실행 진행률 유지**: 현재 방식 유지하되 "에이전트 진행 현황"으로 이름 변경, 각 상태별 에이전트 수 표시
C) **제거하고 대체**: 이 카드를 "프로젝트 개요"(intent, 범위, 기술 스택 요약)로 대체
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 7
**사이드바 "신규 프로젝트" 버튼**: 현재 번들 목록 페이지로 연결됩니다. AI-Crew에서 "새 프로젝트"의 의미와 흐름은 무엇인가요?

A) **번들 선택 → 설치**: 번들을 선택하면 `ai-crew install --team <name>` 실행 후 새 graph 생성
B) **Intent 입력 → elaborate**: 새 프로젝트 시작 시 intent를 입력받고 `/crew:elaborate` 워크플로우 시작
C) **제거**: 신규 프로젝트 버튼은 CLI 도구이므로 UI에서 불필요 — 제거하고 팀 변경/관리만 제공
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question 8
**설계 단계(Design) 페이지와 aidlc-docs 연동**: 현재 설계 페이지는 `aidlc-state.md`를 파싱하여 스테퍼로 표시하고 `aidlc-docs/` 하위 문서를 리스트합니다. AI-DLC 인셉션 단계의 실제 폴더 구조(`inception/requirements/`, `inception/user-stories/`, `inception/plans/`, `inception/application-design/`)를 반영하여 어떻게 개선하면 좋겠습니까?

A) **폴더 매핑 뷰**: 각 인셉션 스테이지를 폴더별로 그룹핑하여 트리 뷰로 표시, 문서 선택 시 마크다운 프리뷰
B) **타임라인 뷰**: 인셉션 → 컨스트럭션 → 오퍼레이션 3페이즈를 타임라인으로 표시, 각 문서는 해당 단계 아래 나열
C) **현재 방식 유지 + 정확도 개선**: 스테퍼 + 문서 리스트 유지, 폴더 스캔 로직과 파싱 정확도만 개선
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]:

---

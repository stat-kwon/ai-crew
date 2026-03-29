# AI-Crew Studio UI 방향 문서 v3

> 작성일: 2026-03-29  
> 성격: 구현 기준 문서  
> 원칙: **CLI가 작업의 중심, UI는 읽기 전용 관찰 도구**

---

## 1. 목표

AI-Crew UI는 "지금 무엇이 진행 중인지"와 "과거에 무엇이 어떻게 바뀌었는지"를 빠르게 파악하게 해주는 프로젝트 관찰 도구다.

사용자가 UI에서 반드시 답을 얻어야 하는 질문은 아래 5가지다.

1. 지금 어떤 런(run)이 진행 중인가?
2. 현재 그래프에서 어떤 노드가 완료/실패/대기 상태인가?
3. 과거 v1 / v2 / v3 등 각 런에서 무엇이 달라졌는가?
4. 각 런 시점의 AI-DLC 설계 문서는 어떤 상태였는가?
5. 현재 최신 `aidlc-docs/`와 과거 스냅샷 사이의 흐름은 어떻게 이어지는가?

즉, 이 UI는 **실행 도구가 아니라 프로젝트 기억 장치(project memory viewer)** 다.

---

## 2. 비목표

다음은 이번 범위에서 의도적으로 제외한다.

- UI에서 런 실행/중지/수정
- `aidlc-docs/` 직접 수정
- `config.yaml` 직접 편집
- 그래프 편집기
- 양방향 협업 기능
- 완전한 diff 에디터

---

## 3. 핵심 원칙

### 3.1 읽기 전용

- `aidlc-docs/` 는 AI-DLC 소유 영역이며 **절대 수정하지 않는다**.
- UI는 데이터를 보여주기 위해 가공할 수는 있지만, 원본 파일은 변경하지 않는다.
- 현재/과거 비교, 진행률 표시, 버전 라벨링 등은 **ai-crew 레이어에서 파생 데이터로 생성**한다.

### 3.2 현재와 과거를 둘 다 보여준다

UI는 두 시점을 동시에 다뤄야 한다.

- **현재(Current)**: `.ai-crew/state.json`, `scratchpad/`, 최신 `aidlc-docs/`
- **과거(History)**: `.ai-crew/runs/{runId}/manifest.json` 내부의 `aidlcSnapshot`

### 3.3 AI-DLC를 몰라도 이해 가능해야 한다

사용자는 AI-DLC 내부 용어를 몰라도 아래처럼 읽을 수 있어야 한다.

- Inception → 설계 단계
- Construction → 개발 단계
- Operations → 운영 단계

그리고 각 단계는 체크리스트/문서/요약 카드로 보조 설명한다.

### 3.4 flat한 변화 이력 노출

런 목록은 추상적인 내부 ID보다 **v1, v2, v3…** 같은 평면 버전 감각을 제공해야 한다.

단, 표시용 버전 라벨일 뿐이며 실제 식별자는 `runId` 를 사용한다.

---

## 4. 데이터 소유권

| 영역 | 소유자 | 역할 | UI 관점 |
|---|---|---|---|
| `aidlc-docs/` | AI-DLC | 현재 설계 원본 | 최신 상태 읽기 전용 |
| `.ai-crew/state.json` | ai-crew | 현재 그래프 실행 상태 | 현재 상태 화면 소스 |
| `.ai-crew/scratchpad/` | ai-crew | 현재 런의 노드 출력 | 현재 상태 상세 소스 |
| `.ai-crew/runs.json` | ai-crew | 런 인덱스 | 히스토리 목록 소스 |
| `.ai-crew/runs/{runId}/manifest.json` | ai-crew | 과거 런의 정규 스냅샷 | 히스토리 상세 소스 |
| `.ai-crew/config.yaml` | ai-crew | 설정 원본 | 설정 화면 읽기 전용 |

---

## 5. 디렉토리/파일 모델

```text
프로젝트/
├── aidlc-docs/
│   ├── aidlc-state.md
│   ├── inception/
│   │   ├── requirements/requirements.md
│   │   ├── user-stories/user-stories.md
│   │   └── application-design/*.md
│   └── ...
│
└── .ai-crew/
    ├── config.yaml
    ├── graph.yaml
    ├── state.json
    ├── runs.json
    ├── scratchpad/
    │   └── L{level}-{node_id}.md
    └── runs/
        └── {runId}/
            ├── manifest.json
            ├── state-snapshot.json
            └── scratchpad/
```

---

## 6. manifest 확장 규약

`RunManifest` 는 과거 런을 복원하는 canonical record 여야 한다.

```ts
interface RunManifest {
  schema: "ai-crew.run.v1";
  runId: string;
  intent: {
    description: string;
    slug: string;
    source: "user" | "aidlc" | "auto";
  };
  context: {
    bundleName: string;
    graphHash: string;
    graphNodeCount: number;
    graphLevelCount: number;
    model: string;
    locale: string;
  };
  timeline: {
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  };
  state: "preparing" | "running" | "completed" | "failed" | "archived";
  outcome: {
    nodesCompleted: string[];
    nodesFailed: string[];
    nodesSkipped: string[];
    summary: string[];
    issues: string[];
  } | null;
  nodeSummaries: Record<string, NodeSummary>;

  aidlcSnapshot?: {
    stateMd: string;
    documents: {
      path: string;
      content: string;
      stage: string;
    }[];
    capturedAt: string;
  };

  autoTitle?: string;
  autoSummary?: string;
}
```

### 6.1 `aidlcSnapshot`

- 런 완료 시점의 `aidlc-state.md` 와 주요 문서를 캡처한다.
- 현재 `aidlc-docs/` 와 분리된 과거 스냅샷이다.
- 히스토리 상세에서 **설계 스냅샷 탭**의 주 데이터가 된다.

### 6.2 `autoTitle`, `autoSummary`

- 현재는 선택적(optional) 필드로만 유지한다.
- UI는 값이 있으면 우선 노출하고, 없으면 `intent.description` 을 fallback 으로 사용한다.

---

## 7. 화면 구조

## 7.1 `/` 홈

목적: 프로젝트의 현재 상태와 최근 변화 흐름을 1스크린에서 파악.

구성:

- **현재 진행 카드**
  - runId
  - 진행률
  - 완료/실패/대기 노드 수
  - `/current` 이동 링크
- **이전 작업 목록**
  - 최신순 정렬
  - `vN` 라벨
  - 제목(가능하면 `autoTitle`, 없으면 `intent`)
  - 날짜, 상태, 완료/실패 개수
  - `/history?run=...` 링크

### 7.2 `/current` 현재 상태

탭 2개로 구성.

#### A. 개발 진행
- 레벨 기반 타임라인
- 노드 카드
  - 상태 뱃지
  - agent
  - worker/router/aggregator 타입
  - scratchpad 펼침
- 로딩/에러/빈 상태 처리 필수

#### B. 설계 단계
- `aidlc-state.md` 를 파싱해 phase/stage 체크리스트로 표시
- 현재 단계 하이라이트
- 사용자가 AI-DLC를 몰라도 이해하도록 한국어 라벨 제공

### 7.3 `/history` 히스토리

가장 중요한 화면.

좌측:
- 런 목록
- 최신순 정렬
- `vN` 라벨, 날짜, 상태, intent/summary

우측:
- 선택된 런 상세
- 탭:
  - **개발 진행**: `nodeSummaries`, outcome, issues
  - **설계 스냅샷**: `aidlcSnapshot.documents`
- 향후 비교 탭은 확장 가능 구조로만 고려

핵심 요구사항:
- manifest 로드 실패 시 명확한 에러 상태 표시
- canonical 경로(`runs/{runId}/manifest.json`) 우선
- 레거시 fixture 호환이 필요하면 fallback 탐색 허용

### 7.4 `/docs` 설계 문서

목적: 최신 `aidlc-docs/` 를 그대로 읽는 문서 브라우저.

구성:
- 좌측 파일 트리
- 우측 마크다운 뷰어
- 폴더/파일 선택 상태 유지
- 문서가 없으면 빈 상태 표시

### 7.5 `/settings` 설정

목적: `.ai-crew/config.yaml` 를 읽기 전용으로 보여주기.

구성:
- YAML 원문 뷰어
- 핵심 설정 요약 카드
  - bundle
  - defaults.model
  - defaults.locale
  - runs.retention

---

## 8. 상태 UX 규칙

모든 페이지는 아래 4가지 상태를 일관되게 가져야 한다.

1. **로딩**: skeleton 또는 loading state
2. **에러**: 실패 원인을 설명하는 error state
3. **빈 상태**: 데이터가 없을 때 안내 문구
4. **정상 상태**: 데이터 렌더링

특히 아래는 빠지면 안 된다.

- 현재 런 없음
- 히스토리 없음
- aidlc-docs 없음
- config 없음
- 특정 run manifest 없음
- 특정 문서 내용 없음

---

## 9. API 설계

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/runs` | 런 레지스트리 반환 |
| GET | `/api/runs/[runId]` | 런 manifest 반환 |
| GET | `/api/current` | 현재 graph/state/scratchpad 반환 |
| GET | `/api/aidlc/docs` | 최신 aidlc-docs 파일 트리 반환 |
| GET | `/api/aidlc/docs/[...path]` | 특정 최신 문서 내용 반환 |
| GET | `/api/aidlc/state` | aidlc-state.md 파싱 결과 반환 |
| GET | `/api/config` | config.yaml 파싱 결과 반환 |

환경 변수:

```bash
AI_CREW_TARGET_DIR=/path/to/project
```

---

## 10. 구현 메모

### 10.1 히스토리 manifest 로드

반드시 아래 순서를 따른다.

1. `.ai-crew/runs/{runId}/manifest.json` 직접 조회
2. 없으면 테스트/레거시 fixture 호환용 fallback 탐색 허용
3. 그래도 없으면 404 반환

### 10.2 UI 표시용 버전 라벨

- 런 목록에서 최신순으로 정렬 후 `vN ... v1` 로 라벨링
- 실제 데이터 저장은 `runId` 기준

### 10.3 현재/과거 분리

- `/docs` 는 항상 **최신 aidlc-docs**
- `/history` 의 설계 스냅샷은 항상 **manifest 내부 aidlcSnapshot**
- 둘을 혼동하지 않도록 라벨을 명확히 둔다

---

## 11. 테스트 기준

최소 검증 항목:

- 홈: 현재 진행 카드 / 이전 작업 목록 노출
- 현재 상태: 개발 진행 탭 / 설계 단계 탭 동작
- 히스토리: 런 선택 / manifest 로드 / 스냅샷 탭 동작
- 설계 문서: 파일 트리 / 문서 열기
- 설정: YAML 렌더링
- 빈 상태/에러 상태: 최소 대표 케이스 검증
- 빌드 타입체크 통과

테스트 데이터는 `/tmp/test-project` 기준으로 유지하되, fixture 변경 시 Playwright 기대값도 함께 갱신한다.

---

## 12. 후속 TODO

- `autoTitle` / `autoSummary` 생성 로직
- 현재 최신 문서와 과거 스냅샷 diff 탭
- retention 시각화
- 다크모드
- 모바일 대응

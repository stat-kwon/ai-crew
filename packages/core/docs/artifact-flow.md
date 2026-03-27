# Artifact Flow Architecture

> ai-crew의 아티팩트 흐름과 소유권 규칙

---

## 1. 개요

ai-crew는 2단계 워크플로우를 사용한다:

1. **AI-DLC Inception** (설계) — 요구사항 분석, 아키텍처 설계, 유닛 분해
2. **Graph Agent Construction** (구현) — 그래프 기반 병렬 에이전트 실행

각 단계는 독립된 아티팩트 저장소를 가지며, 명확한 소유권 규칙이 적용된다.

---

## 2. 아티팩트 저장소

```
aidlc-docs/          -> 설계 아티팩트 (AI-DLC Inception)
.ai-crew/scratchpad/ -> 실행 핸드오프 (Graph Agent Construction)
.ai-crew/runs/       -> 실행 이력 아카이브 (Run History)
.ai-crew/runs.json   -> 실행 레지스트리 (Run Registry)
project root/        -> 코드 산출물 (최종 결과물)
```

| 저장소 | 역할 | 생성 시점 |
|--------|------|-----------|
| `aidlc-docs/inception/` | 요구사항, 설계, 유저스토리 등 설계 문서 | Inception 단계 |
| `aidlc-docs/construction/` | 구현 결과 요약 | `/crew:integrate` 실행 시 |
| `.ai-crew/scratchpad/` | 에이전트 간 실행 핸드오프 | `/crew:run` 실행 시 |
| `.ai-crew/runs/` | 과거 실행 이력 아카이브 (scratchpad, state 스냅샷) | `/crew:preflight` 실행 시 |
| `.ai-crew/runs.json` | 전체 실행 레지스트리 (현재/과거 run 색인) | `/crew:preflight` 실행 시 |
| `.ai-crew/catalog-manifest.json` | 카탈로그에서 사용 가능한 에이전트/스킬/번들 목록 | `ai-crew install` 실행 시 |
| 프로젝트 루트 | 실제 코드 파일 | Construction 단계 |

---

## 3. 생명주기 규칙

### aidlc-docs/inception/
- Inception 단계에서 **쓰기 가능**
- Construction 단계에서 **읽기 전용** (freeze)
- 예외: `pm_review`와 `design_gate` 노드만 ouroboros(ooo)를 통해 패치 가능

### .ai-crew/scratchpad/
- **임시(ephemeral)** 저장소
- `/crew:run` 실행 시 에이전트가 생성
- `/crew:integrate` 후 아카이브

### aidlc-docs/construction/
- `/crew:integrate`만 쓰기 가능
- scratchpad 내용을 요약하여 변환

---

## 4. 데이터 흐름도

```
/crew:elaborate  ->  aidlc-docs/inception/
       |
/crew:refine     ->  aidlc-docs/inception/ (ooo evaluate/evolve)
       |
       -- inception/ freeze --
       |
/crew:preflight  ->  Step 0.5: .ai-crew/runs/{runId}/ (이전 scratchpad 아카이브)
       |              Step 0.6: 번들 규칙 동기화 (rules sync)
       |              Step 1: 동적 그래프 셋업 (catalog-manifest.json → 에이전트/스킬 프로비저닝)
       |
/crew:run        ->  .ai-crew/scratchpad/ (에이전트: aidlc-docs/ 읽기, scratchpad 쓰기)
       |              +-- pm_review: ooo를 통해 inception/ 패치 가능
       |              +-- design_gate: ooo를 통해 inception/ 패치 가능
       |
/crew:integrate  ->  aidlc-docs/construction/ (scratchpad -> 요약)
                     worktree 브랜치 -> main 병합
```

---

## 5. 상태 추적

| 파일 | 추적 대상 | 갱신 주체 | 수명 |
|------|-----------|-----------|------|
| `aidlc-docs/aidlc-state.md` | AI-DLC 단계 진행 | elaborate, refine, integrate | 프로젝트 전체 |
| `.ai-crew/state.json` | 그래프 노드 상태 | `/crew:run` | 실행 단위 |
| `.ai-crew/runs.json` | Run 레지스트리 (전체 실행 색인, 통계) | `/crew:preflight`, archiveRun | 프로젝트 전체 |
| `.ai-crew/runs/{runId}/manifest.json` | 개별 Run 스냅샷 (intent, 결과, 타임라인) | archiveRun | 아카이브 후 영구 |
| `.ai-crew/catalog-manifest.json` | 사용 가능한 카탈로그 컴포넌트 목록 | `ai-crew install` | 프로젝트 전체 |
| `aidlc-docs/audit.md` | 모든 상호작용 로그 | 모든 명령어 | 프로젝트 전체 |

---

## 6. 권한 매트릭스

| 에이전트/명령어 | aidlc-docs/inception/ | aidlc-docs/construction/ | scratchpad/ |
|---|---|---|---|
| `/crew:elaborate` | WRITE | - | - |
| `/crew:refine` | WRITE (ooo) | - | - |
| `/crew:run` 에이전트 | READ-ONLY | - | WRITE |
| `pm_review` 노드 | PATCH (ooo only) | - | WRITE |
| `design_gate` 노드 | PATCH (ooo only) | - | WRITE |
| `/crew:integrate` | - | WRITE | READ |

---

## 7. 사용자 흐름 (6개 명령어)

1. **`/crew:elaborate`** — AI-DLC Inception 실행. 요구사항 분석부터 유닛 분해까지 설계 문서를 생성한다.
2. **`/crew:refine`** — ouroboros를 통해 설계를 반복 개선한다. 수렴할 때까지 evaluate/evolve 사이클을 실행한다.
3. **`/crew:preflight`** — 실행 전 환경을 준비한다. 이전 run의 scratchpad를 `.ai-crew/runs/{runId}/`에 아카이브하고, 번들 규칙을 동기화하며, `catalog-manifest.json`을 기반으로 설계 문서에 맞는 그래프를 동적 생성하고 에이전트/스킬을 프로비저닝한다.
4. **`/crew:run`** — 그래프 실행기를 시작한다. 각 유닛이 독립 worktree에서 병렬로 구현된다. 에이전트는 inception 문서를 읽고 scratchpad에 결과를 기록한다.
5. **`/crew:status`** — 현재 실행 상태를 모니터링한다. 노드별 진행 상황과 전체 그래프 상태를 표시한다.
6. **`/crew:integrate`** — scratchpad를 construction 문서로 변환하고, worktree 브랜치를 main에 병합한다.

---

## 8. 설계 결정

### 왜 dual-write를 하지 않는가
단일 책임 원칙. inception과 construction에 동시에 쓰면 불일치(divergence) 위험이 발생한다. 각 저장소는 하나의 명령어만 쓰기 권한을 가진다.

### 왜 scratchpad는 아카이브하는가
scratchpad는 에이전트 간 핸드오프를 위한 작업 공간이다. 매 run 시작 전 `/crew:preflight`가 이전 scratchpad를 `.ai-crew/runs/{runId}/scratchpad/`에 아카이브한다. 이렇게 하면 새 run은 깨끗한 상태에서 시작하면서도, 과거 실행의 중간 산출물을 디버깅이나 비교 목적으로 참조할 수 있다.

### 왜 run history를 파일 기반으로 관리하는가
외부 DB 의존성 없이 git과 자연스럽게 통합된다. `runs.json`은 가벼운 색인 역할을 하고, 각 `runs/{runId}/` 디렉토리는 manifest, state 스냅샷, scratchpad를 독립적으로 보관한다. 파일 기반이므로 `ls`, `cat`, `jq` 같은 표준 도구로 바로 조회할 수 있고, git으로 버전 관리하거나 `.gitignore`로 제외하는 선택도 팀에 맡길 수 있다.

### 왜 integrate가 변환하는가
관심사 분리(separation of concerns). 에이전트는 구현에 집중하고, 문서화는 integrate가 일괄 처리한다. 이렇게 하면 에이전트가 문서 형식을 신경 쓸 필요가 없다.

### 왜 pm_review/design_gate가 inception을 패치할 수 있는가
현실적인 피드백 루프. 구현 중 설계 결함을 발견하면 즉시 반영해야 한다. ooo의 evaluate/evolve를 통해서만 패치가 가능하므로 통제된 방식으로 업데이트된다.

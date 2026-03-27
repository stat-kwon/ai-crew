# Preflight / Run 분리 아키텍처

> preflight는 준비와 검증을 담당하고, run은 실행만 담당한다.

---

## 1. 개요

ai-crew의 실행 파이프라인은 두 명령어로 분리된다:

- **`/crew:preflight`** — 준비와 검증의 SSOT(Single Source of Truth). 동적 그래프 셋업, 에이전트/스킬 프로비저닝, 그래프 검증, 모델 인증, git 정리, 이전 run 아카이브를 모두 처리한다.
- **`/crew:run`** — 실행에만 집중한다. preflight의 검증 결과를 신뢰하되, 그래프가 변경된 경우 fallback 검증을 수행한다.

이 분리의 핵심 원칙: preflight가 한 번 검증하면 run은 재검증하지 않는다. Hash 기반 신뢰 메커니즘이 이를 보장한다.

v3.1에서 preflight는 **동적 프로비저너** 역할을 추가로 수행한다. `catalog-manifest.json`을 읽어 설계 문서에 맞는 에이전트/스킬을 카탈로그에서 프로비저닝하고, 그래프를 자동 생성한다.

---

## 2. 역할 매트릭스

| 책임 | `/crew:preflight` | `/crew:run` |
|------|-------------------|-------------|
| graph.yaml 로드 | O | O |
| 그래프 구조 검증 (중복 ID, 순환, 댕글링 참조) | O (SSOT) | fallback만 |
| 그래프 의미 검증 (router isolation, aggregator wait) | O (SSOT) | fallback만 |
| 에이전트/스킬 파일 존재 확인 | O (SSOT) | fallback만 |
| 레벨 계산 (Kahn's topological sort) | O (표시용) | O (실행용) |
| 모델 인증 (API 키 확인) | O | - |
| git 워킹 트리 정리 | O | - |
| 이전 run 아카이브 (Step 0.5) | O | - |
| 번들 규칙 동기화 (Step 0.6) | O | - |
| catalog-manifest.json 스캔 (Step 1.3) | O | - |
| 설계 문서 기반 그래프 생성 (Step 1.4) | O | - |
| 에이전트/스킬 프로비저닝 (Step 1.7) | O | - |
| graph.yaml 쓰기 (Step 1.8) | O | - |
| state.json graphHash 기록 | O | - |
| 노드 실행 (Agent 스폰) | - | O |
| scratchpad 수집 | - | O |
| aidlc-state.md 갱신 | - | O |

---

## 3. Hash 기반 신뢰

preflight가 그래프를 검증한 후 SHA-256 해시를 `state.json`에 기록한다:

```bash
shasum -a 256 .ai-crew/graph.yaml | cut -d ' ' -f 1
```

run이 시작될 때 현재 `graph.yaml`의 해시를 계산하여 비교한다:

| 상황 | run의 동작 |
|------|-----------|
| 해시 일치 | 검증 생략. `"Graph validated by preflight ({completedAt}). Skipping re-validation."` 출력 |
| 해시 불일치 | preflight 이후 그래프가 변경됨. `validateGraph()` 전체 실행 (fallback) |
| preflight 없음 (`state.json`에 `preflight` 필드 없음) | 경고 출력 후 전체 검증 실행. 실행은 차단하지 않음 |

이 설계로 인해:
- 일반적인 경로(happy path)에서 run은 검증 오버헤드 없이 즉시 실행을 시작한다.
- 그래프가 수동으로 편집된 비정상 경로에서도 안전하게 fallback한다.

---

## 4. Preflight 전체 흐름

```
Step 0: 환경 감지
  config.yaml, graph.yaml, state.json 로드
  aidlc-docs/ 존재 여부로 네이티브 AI-DLC 모드 판별
     |
Step 0.5: Run History 확인
  이전 run 존재 시 → 사용자에게 intent 질문
  → Run ID 생성 ({slug}-{YYYYMMDD}-{seq})
  → manifest.json 생성 → scratchpad/ + checkpoints/ 아카이브
  → runs.json 갱신 → 보관 정책 적용 → state.json 초기화
     |
Step 0.6: 번들 규칙 동기화
  카탈로그 rules와 설치된 rules 비교
  변경 있으면 사용자 선택 후 동기화
     |
Step 1: 동적 그래프 셋업 (Step 1.1 ~ 1.8)
  1.1 설치 모드 감지 (bundle: "none" → dynamic, bundle: "<name>" → bundle mode)
  1.2 설계 문서 스캔 (aidlc-docs/inception/ 읽기)
  1.3 카탈로그 스캔 (catalog-manifest.json에서 사용 가능한 에이전트/스킬 조회)
  1.4 그래프 제안 생성 (유닛 → 노드 매핑, 에이전트/스킬 할당)
  1.5 그래프 검증 (SSOT — 중복 ID, 순환, 댕글링 참조 등)
  1.6 사용자 승인 (레벨별 실행 계획 표시 → Approve/Modify/Cancel)
  1.7 에이전트/스킬 프로비저닝 (카탈로그 → .claude/agents/, .claude/skills/ 복사)
  1.8 파일 쓰기 (graph.yaml, state.json, config.yaml 갱신)
     |
Step 3: 모델 확인
  그래프의 모든 모델 참조 추출 → 제공자별 인증 확인
  실패 시: 인증 안내 / 환경변수 설정 / Claude로 교체 / 건너뛰기
     |
Step 4: Git 준비
  워킹 트리 상태 확인 (dirty면 커밋/stash/중단 선택)
  stale worktree 정리
     |
Step 5: 요약 및 기록
  graphHash 계산 및 state.json 기록
  preflight 상태 저장 (completedAt, modelsVerified, gitClean)
```

---

## 5. 설계 결정

### 왜 검증의 SSOT가 preflight인가
검증은 사용자 상호작용이 필요한 작업이다 (모델 인증 실패 시 선택, git dirty 시 선택). run은 자동화된 실행이므로 사용자 상호작용을 최소화해야 한다. 검증과 실행을 분리하면 run이 시작된 후에는 멈추지 않는다.

### 왜 run에 fallback이 있는가
preflight 이후 사용자가 `graph.yaml`을 수동으로 편집할 수 있다. 또한 preflight를 건너뛰고 바로 run을 실행할 수도 있다. 두 경우 모두 안전망이 필요하다. 단, fallback은 경고를 출력한다 -- 정상 워크플로우에서는 preflight를 먼저 실행해야 한다.

### 왜 preflight가 run을 차단하지 않는가
preflight 미실행은 WARNING이지 ERROR가 아니다. 단순한 그래프에서는 preflight 없이도 run이 동작해야 한다. 반면 git dirty 상태는 preflight 내에서 hard gate다 -- worktree 생성이 실패하기 때문이다.

### 왜 graphHash에 SHA-256을 사용하는가
파일 내용의 바이트 단위 동일성을 검증한다. YAML 파싱 후 비교하면 주석이나 포맷 변경을 무시하지만, 의도적인 변경도 놓칠 수 있다. SHA-256은 어떤 변경이든 감지하므로 보수적인 선택이다.

# ai-crew

[Claude Code](https://docs.anthropic.com/en/docs/claude-code)를 위한 카탈로그 기반 플러그인 조합 플랫폼.

에이전트, 스킬, 규칙, 커맨드를 재사용 가능한 카탈로그 컴포넌트로 관리하고, 번들로 조합하여 그래프 기반 병렬 코드 생성을 수행하는 멀티 에이전트 오케스트레이터.

## 설치

```bash
npm install -g ai-crew
```

## 빠른 시작

```bash
# 미니멀 설치 (커맨드, 규칙, 워크플로우만 — 기본값)
ai-crew install --target ./my-project

# Claude Code에서 워크플로우 실행
/crew:elaborate "React와 Node.js로 투두 앱 만들기"
/crew:preflight    # 설계 문서 기반으로 그래프 + 에이전트/스킬 자동 프로비저닝
/crew:run
/crew:integrate
```

프리셋 번들을 사용하려면 `--team` 옵션을 추가한다:

```bash
# 사용 가능한 팀 번들 목록
ai-crew list

# 번들 프리셋으로 설치 (에이전트/스킬/그래프 포함)
ai-crew install --team fullstack --target ./my-project
```

## 사용 가능한 번들

| 번들 | 설명 | 노드 수 |
|------|------|---------|
| `fullstack` | Frontend + Backend 병렬, 리뷰 + QA | 5 |
| `aidlc-standard` | Plan → Build → Review 순차 실행 | 3 |
| `aidlc-tdd` | Plan → Test → Build → Review (TDD) | 4 |
| `advanced-fullstack` | 보안 감사 포함 병렬 실행 | 7 |
| `e2e-premium` | 설계 게이트 포함 전체 파이프라인 | 13 |
| `lightweight` | 최소 구성: plan + 병렬 빌드 | 3 |

## 아키텍처

```
catalog/              → 재사용 가능한 컴포넌트 (소스 저장소)
  agents/             → 에이전트 정의 (backend-dev, frontend-dev, reviewer, ...)
  skills/             → 도메인 스킬 (backend-node, testing, clean-code, ...)
  commands/           → 슬래시 커맨드 (/crew:run, /crew:preflight, ...)
  rules/              → 전역 규칙 (coding-standards, git-conventions, ...)
  bundles/            → 팀 구성 (fullstack, aidlc-standard, ...)

ai-crew install       → 카탈로그 항목을 프로젝트에 복사
  --target .          → 미니멀 설치 (커맨드/규칙/워크플로우 + catalog-manifest.json)
  --team <name>       → 번들 프리셋 설치 (에이전트/스킬/그래프 포함)
  .ai-crew/           → 상태, 그래프, 규칙, 카탈로그 매니페스트, 스크래치패드
  .claude/            → 에이전트, 스킬, 커맨드 (Claude Code가 읽는 경로)
  CLAUDE.md           → 프로젝트 워크플로우 설정
```

## 그래프 실행 모델

각 번들은 작업 노드의 DAG(방향 비순환 그래프)를 정의합니다:

```yaml
# .ai-crew/graph.yaml
graph:
  nodes:
    - id: frontend
      type: worker
      agent: frontend-dev
      skills: [frontend-react, testing]
      depends_on: [plan]
      config:
        isolation: worktree
```

`/crew:run`은 노드를 레벨별로 실행합니다:
- **Level 0**: 루트 노드 (의존성 없음) — 병렬 실행
- **Level N**: 모든 의존성이 완료된 노드
- 각 워커는 `crew/{runId}/{node_id}` 브랜치의 격리된 git worktree에서 실행

## 카탈로그 메타데이터

모든 카탈로그 항목은 `plugin.json`에 티어 분류를 가집니다:

```json
{
  "name": "backend-node",
  "description": "Node.js backend development patterns",
  "tier": "independent",
  "requires": [],
  "tags": ["implementation", "backend", "nodejs"]
}
```

| 티어 | 의미 |
|------|------|
| `independent` | 어디서든 사용 가능, 워크플로우 의존성 없음 |
| `aidlc` | AI-DLC 워크플로우 필요 (aidlc-docs/) |
| `crew` | 그래프 오케스트레이션 내부용 |

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `ai-crew install --target <path>` | 미니멀 설치 (기본값) |
| `ai-crew install --team <name> --target <path>` | 번들 프리셋 설치 |
| `ai-crew list` | 사용 가능한 번들 목록 |
| `ai-crew status` | 현재 상태 조회 |
| `ai-crew doctor` | 설치 진단 |
| `ai-crew validate` | 설정 파일 검증 |
| `ai-crew uninstall` | 설치 제거 |
| `ai-crew mcp` | MCP 서버 시작 |

## 슬래시 커맨드 (Claude Code 내)

| 커맨드 | 단계 | 설명 |
|--------|------|------|
| `/crew:elaborate` | Inception | 요구사항 정의 및 설계 |
| `/crew:refine` | Inception | 반복적 설계 고도화 |
| `/crew:preflight` | Setup | 동적 그래프 셋업, 에이전트/스킬 프로비저닝, 모델/git 검증 |
| `/crew:run` | Construction | 그래프 실행 (병렬 에이전트) |
| `/crew:integrate` | Construction | 브랜치 병합 및 PR 생성 |
| `/crew:status` | 전체 | 워크플로우 상태 조회 |

## 멀티 세션 연속성

이전 실행은 의미 있는 ID로 아카이브됩니다:

```
.ai-crew/runs/
  initial-build-20260324-1/
    manifest.json       # 의도, 결과, 노드별 요약
    scratchpad/         # 에이전트 산출물 보존
  fix-auth-20260325-1/
    manifest.json
    scratchpad/
```

후속 실행 시 에이전트는 이전 실행에서 무엇이 변경되었는지 컨텍스트를 받습니다.

## 문서

자세한 아키텍처 문서는 [docs/](./docs/)를 참고하세요:
- [아티팩트 흐름](./docs/artifact-flow.md) — 데이터 소유권과 생명주기
- [그래프 실행](./docs/graph-execution.md) — DAG 실행 모델
- [Preflight/Run 역할 분리](./docs/preflight-run-separation.md) — 검증 아키텍처
- [멀티 세션 연속성](./docs/multi-session-continuity.md) — Run 이력 시스템
- [카탈로그 아키텍처](./docs/catalog-architecture.md) — 플러그인 조합
- [상태 관리](./docs/state-management.md) — 전체 상태 파일

## 라이선스

MIT

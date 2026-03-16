# Claude Code Agent Teams - Reddit 상세 리서치

> 인기순으로 정리한 Reddit 포스트 및 댓글 분석

---

## 📊 Post #1: 내부 구조 리버스 엔지니어링

**출처**: [r/ClaudeCode - I reverse engineered how Agent Teams works under the hood](https://www.reddit.com/r/ClaudeCode/comments/1qyj35i/)
**날짜**: 2026-02-07
**작성자**: cs50victor

### 핵심 발견

Agent Teams가 출시된 후 내부 구조를 리버스 엔지니어링한 결과:

```
런타임: tmux
각 teammate = 별도의 claude CLI 프로세스 (tmux split)

숨겨진 플래그:
  --agent-id
  --agent-name  
  --team-name
  --agent-color

메시지 저장: ~/.claude/teams/<team>/inboxes/ (JSON 파일, fcntl 잠금)
태스크 저장: ~/.claude/tasks/<team>/ (번호 매긴 JSON 파일)

데이터베이스 없음, 데몬 없음, 네트워크 레이어 없음
오직 파일시스템만 사용
```

### 조율 메커니즘

- Task 의존성 + 사이클 감지
- 원자적 config 쓰기
- shutdown 요청/응답 프로토콜
- plan 승인 구조

### 🔗 오픈소스 구현

> "전체 프로토콜을 독립 MCP 서버로 재구현했습니다. 모든 MCP 클라이언트에서 agent teams 실행 가능."

**GitHub**: https://github.com/cs50victor/claude-code-teams-mcp

### 댓글 인사이트

> "파일시스템 inbox의 메시지 순서가 까다롭습니다. HFS+는 1초 해상도라서 같은 초 내 두 agent가 메시지 쓰면 순서가 비결정적입니다. 번호 매긴 파일명이나 UUID 정렬이 필요합니다."

---

## 📊 Post #2: 설정 가이드 (Full Walkthrough)

**출처**: [r/ClaudeCode - How to Set Up Claude Code Agent Teams](https://www.reddit.com/r/ClaudeCode/comments/1qz8tyy/)
**날짜**: 2026-02-08

### Old vs New 모델 비교

| 구분 | Old Sub-agent | New Agent Teams |
|------|---------------|-----------------|
| **실행** | task tool 호출 → 격리 작업 → 요약만 반환 | 공유 task list, 직접 메시징 |
| **통신** | 없음 | 실시간 조율, 토론, 업데이트 |
| **종료** | 세션 자동 종료 | 명시적 lifecycle 제어 |

### 내부 도구 5가지

```typescript
1. TeamCreate     // 팀 스캐폴딩 (.claude/teams/ 폴더 생성)
2. TaskCreate     // JSON 파일로 task 추가 (상태, 의존성, 소유권)
3. Task tool      // name, team_name 파라미터로 팀 모드 활성화
4. taskUpdate     // task claim, 상태 업데이트, 완료 표시
5. sendMessage    // DM 또는 broadcast (inbox/에 저장)
```

### 메시지 프로토콜

```xml
<teammate-message teammate_id="...">
  메시지 내용
</teammate-message>
```

### 베스트 Use Case: 멀티 가설 디버깅

> "5명의 agent teammate를 spawn해서 서로 다른 이론 조사. 서로 대화하고, 서로의 아이디어를 과학적 토론처럼 반박하고, findings doc에 합의 내용 업데이트."

### Pro Tip: tmux/iTerm2 사용

```bash
# iTerm2 설정
Settings → General → Magic → Python API 활성화

# 실행
claude --teammate-mode tmux
```

---

## 📊 Post #3: Multi-Provider 지원 프록시

**출처**: [r/LocalLLaMA - Made Claude Code Agent Teams model-agnostic](https://www.reddit.com/r/LocalLLaMA/comments/1qyzrfs/)
**날짜**: 2026-02-08
**작성자**: Pickle-Pixel

### 핵심 아이디어

> "Claude Code Agent Teams가 현재 최고의 multi-agent 코딩 시스템. 15+ 도구, 파일 접근, bash, git, task 조율, 메시징. 그런데 모든 agent가 Claude여야 함."

### HydraTeams 프록시

Anthropic API 호출을 가로채서 OpenAI Chat Completions 형식으로 변환:

```
지원 모델:
- OpenAI API (GPT-4o, GPT-4o-mini 등)
- ChatGPT Plus (GPT-5.3-codex, 추가 비용 없음)
- Ollama (로드맵)
```

### 기술 스펙

```
- 1,600줄 TypeScript
- 런타임 의존성 없음
- SSE 스트림 변환
- 메시지 히스토리 매핑
- 도구 정의 변환
- 모델명 스푸핑 (Claude Code가 내부적으로 검증)
```

**GitHub**: https://github.com/Pickle-Pixel/HydraTeams

### 미래 가능성

> "Ollama 지원 완료되면, Claude Code lead agent가 완전히 로컬 모델로 구동되는 teammates를 spawn 가능. 완전한 agent 기능, worker에 대한 클라우드 의존성 제로."

---

## 📊 Post #4: 대규모 기능 구현 + Gemini 코드 리뷰

**출처**: [r/ClaudeCode - I had Claude's Agent Teams implement a large feature](https://www.reddit.com/r/ClaudeCode/comments/1qx5s4s/)
**날짜**: 2026-02-06
**작성자**: iloom-ai 개발자

### 실험 내용

> "Agent Teams로 내 버전의 Agent Teams를 구현해봄. 성공하면 직접 만들 필요 없고, 실패하면 만들어야 함."

### 워크플로우

1. Epic issue를 7개 child-issues로 분해 (의존성 관계 포함)
2. Claude에게 GitHub issue + dependency tree 제공
3. **delegate mode**로 Agent Team 실행
4. **worktree 사용 지시** (같은 branch 제안 무시)
5. 저녁 먹고 돌아오니 "완료"

### 문제 발생

> "Gemini 3 Pro 코드 리뷰가 **19개의 상당한 이슈** 발견. 명백한 것들도 포함."

### 교훈

```
✅ UX 훌륭함 - DAG 완벽 이해, wave별 agent spawn
✅ 네비게이션 쉬움 - 각 agent 상태 실시간 확인
❌ Worktree 사용 별도 지시 필요 (같은 branch 제안)
❌ Rebase 지시 무시 (merge commit 생성)
❌ 코드 품질 - 다른 모델 리뷰 필수
```

### 우려사항

> "Human dev team에게는 문제. Bare bones Agent Teams는 많은 코드를 생산하지만 thought process, risks, assumptions, decisions에 대한 insight가 거의 없음. 그 PR들은 험난할 것."

### 보너스 팁

> "Ctrl+S로 프롬프트 임시 저장 가능! 프롬프트 작성 중 다른 걸 빨리 써야 할 때 사용. 두 번째 프롬프트 제출하면 바로 복원됨."

---

## 📊 Post #5: 3명 Agent가 15분만에 리팩토링 완료

**출처**: [r/AI_Agents - Claude Code just spawned 3 AI agents](https://www.reddit.com/r/AI_Agents/comments/1qydazj/)
**날짜**: 2026-02-07

### 실험 결과

```
Task: 리팩토링
Agent 구성:
  - Backend agent
  - Frontend agent  
  - Code reviewer

결과:
  - 터미널 3개 pane으로 분할
  - 15분만에 완료
  - 첫 시도에 동작
```

### 개발자 소감

> "6년 코딩했는데, 진짜로 내 일이 '코드 작성'에서 'AI 팀 지휘'로 바뀌는 느낌이 처음. 흥분되는지 무서운지 모르겠음. 아마 둘 다."

### 댓글 팁

```bash
# 저렴한 모델 사용 (비용 절감)
/model  # Claude Code에서 모델 목록 확인
# Haiku 선택 (복잡하지 않은 작업에)
```

---

## 📊 Post #6: TDD 강제 실험 (20년차 Rails 개발자)

**출처**: [r/ClaudeAI - Agent Teams in Claude Code: My experiment with AI-enforced TDD](https://www.reddit.com/r/ClaudeAI/comments/1qzbagx/)
**날짜**: 2026-02-08

### 설정

```
@test-writer agent: 테스트만 작성, 테스트 준비까지 구현 작업 차단
@coder agent: 테스트 완료 대기 후 구현
```

### 관찰 결과

```
✅ 진정한 test-first 규율 강제 ("나중에 테스트 추가할게" 불가능)
✅ blocking 메커니즘으로 자동 조율
✅ 자연스러운 red-green-refactor 리듬
✅ 각 agent가 역할에 집중
✅ 커밋 히스토리 깔끔 - 작고 집중된 PR
```

### 핵심 인사이트

> "test-writer가 구현 조기 시작을 절대 허용 안 함. 지치지 않고 품질 타협 안 하는 전담 QA 페어 프로그래머 같음."

### 예시 워크플로우

```
weeks_data 리팩토링 (6개 tasks)

1. test-writer: Task #2 시작 (Data class 테스트)
2. coder: 대기 중...
3. test-writer: 테스트 완료
4. coder: Task #1 시작
5. (번갈아가며 진행)
```

---

## 📊 Post #7: "Agent Teams는 의미없다" (반대 의견)

**출처**: [r/ClaudeCode - Convince me that agent teams are not pointless](https://www.reddit.com/r/ClaudeCode/comments/1r90qmb/)
**날짜**: 2026-02 (3주 전)

### 비판적 관점

> "다양한 용도로 시도함: 연구, 계획, 코드 리뷰, 구현, QA 등. 압도적 결론: **'마케팅 좋은 비싼 subagents'**"

### 문제점 지적

```
❌ Subagents와 달리 백그라운드 실행 불가
❌ 상당한 통신 오버헤드
❌ Idle 알림이 team leader 컨텍스트 윈도우 빠르게 채움
❌ "agents가 서로 대화하고 토론" → 실제로 가치 생산 거의 없음
```

### 도전 질문

> "Agent Teams로 할 수 있고 일반 Subagent spawning으로는 할 수 없는 구체적인 예시를 듣고 싶습니다."

### 반박 댓글 (고급 사용자)

> "내 설정에서는 agent teams의 agents가 headless codex-5.3-high 세션을 호출해서 계획과 코드를 리뷰하게 함. 또한 5시간 사용량 한도의 80% 도달 시 모든 세션과 agents에게 안전한 중단점으로 이동하라고 알림하는 active usage limit monitoring이 있음."

---

## 📊 Post #8: Multi-Swarm 플러그인

**출처**: [r/ClaudeCode - Multi-swarm plugin: run parallel agent teams with worktrees](https://www.reddit.com/r/ClaudeCode/comments/1rp8a4p/)
**날짜**: 2026-03 (1주 전)
**작성자**: itsgaldoron

### 문제 인식

> "큰 기능 작업 중인데 claude code는 순차적. 한 번에 하나씩. 5개 독립 조각 (API, UI, 테스트, DB 마이그레이션) 있으면 하나 끝나고 다음 시작까지 기다려야 함. 멍청한 느낌."

### Multi-Swarm 기능

```bash
/multi-swarm "add user auth with login, signup, password reset"

결과:
- 작업을 병렬 subtasks로 분해
- N개 concurrent claude code 세션 spawn
- 각자 git worktree에서 독립 실행
- 파일 충돌 없음
```

### 각 Swarm 구성

```
- feature-builder
- test-writer
- code-reviewer
- researcher
```

### 고급 기능

```
✅ DAG 스케줄링 (swarm 간 의존성)
✅ Streaming merge (완료된 swarm 즉시 merge)
✅ Inter-swarm 메시징 (공유 파일 경고)
✅ Checkpoint/resume (세션 크래시 복구)
✅ LiteLLM gateway (여러 API 키로 토큰 로테이션)
```

### 설치

```bash
claude plugin marketplace add https://github.com/itsgaldoron/multi-swarm
claude plugin install multi-swarm@multi-swarm-marketplace
```

---

## 📊 Post #9: Stoneforge 오케스트레이터

**출처**: [r/ClaudeAI - I built an open-source orchestrator for running multiple Claude Code agents](https://www.reddit.com/r/ClaudeAI/comments/1rl11b4/)
**날짜**: 2026-03 (2주 전)

### 해결하는 문제

```
❌ 각 agent 세션마다 같은 설정 반복
❌ 컨텍스트 윈도우 조용히 degrading
❌ agent 터미널 간 context switching으로 번아웃
```

### Stoneforge 작동 방식

```
1. Director agent가 목표를 우선순위 tasks + 의존성으로 분해
2. Dispatch daemon이 idle workers에 tasks 할당
3. 각 worker = 독립 git worktree + 별도 branch + 별도 directory
4. Task 완료 → steward가 테스트, 코드 리뷰 → 합격 시 squash-merge
```

### 핵심 기능: Handoff

> "Worker가 컨텍스트 한도 접근 시, 진행 상황 커밋 + 구조화된 handoff 노트 작성 + 깔끔히 종료. 다음 worker가 같은 branch에서 fresh context + 시도한 것의 full history로 픽업."

### Agent Teams와 비교

| 구분 | Agent Teams | Stoneforge |
|------|-------------|------------|
| 상태 저장 | 임시 파일 기반 task list | SQLite + JSONL (event-sourced) |
| UI | 터미널만 | Web dashboard (live output, kanban) |
| Merge | 수동 | Steward가 자동 처리 |
| 지원 도구 | Claude Code만 | Claude Code + Codex + OpenCode |

### 설치

```bash
npm install -g @stoneforge/smithy
sf init
```

**GitHub**: https://github.com/stoneforge-ai/stoneforge

---

## 📋 종합 정리

### 🔑 핵심 인사이트

| 주제 | 인사이트 |
|------|----------|
| **내부 구조** | tmux + 파일시스템 (DB/네트워크 없음) |
| **최적 Use Case** | 멀티 가설 디버깅, TDD 강제, 병렬 리뷰 |
| **주의점** | 토큰 3-4x, 같은 파일 편집 충돌, 코드 품질 검증 필요 |
| **필수 설정** | Worktree 격리, 다른 모델로 리뷰 |

### 🛠️ 유용한 도구들

| 도구 | 기능 | GitHub |
|------|------|--------|
| claude-code-teams-mcp | MCP 서버로 재구현 | cs50victor/claude-code-teams-mcp |
| HydraTeams | Multi-provider 프록시 | Pickle-Pixel/HydraTeams |
| multi-swarm | 병렬 swarm + worktree | itsgaldoron/multi-swarm |
| Stoneforge | 오케스트레이터 + Web UI | stoneforge-ai/stoneforge |

### ⚡ Quick Tips

```bash
# 모델 변경 (비용 절감)
/model

# 프롬프트 임시 저장
Ctrl+S

# Teammate mode
claude --teammate-mode tmux

# Worktree 격리 (필수!)
claude -w feature-name
```

---

*Last Updated: 2026-03-16*

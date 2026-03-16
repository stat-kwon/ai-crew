# Claude Code Agent Teams (Experimental) 연구 정리

> Reddit, 블로그, 커뮤니티에서 수집한 실전 정보

---

## 1. 개요

### Agent Teams란?
- 여러 Claude Code 세션이 **팀으로 협업**하는 실험적 기능
- Team Lead(메인 세션)가 조율, Teammates(개별 세션)가 병렬 작업
- **공유 Task List** + **직접 메시징**으로 조율

### 활성화 방법
```bash
# 환경변수
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 또는 settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## 2. Agent Teams vs Subagents

| 특성 | Subagents | Agent Teams |
|------|-----------|-------------|
| **통신** | Main에게만 보고 | 팀원 간 직접 메시징 |
| **조율** | Main이 모든 것 관리 | 공유 Task List로 자체 조율 |
| **컨텍스트** | 결과만 요약해서 반환 | 각자 독립적 컨텍스트 |
| **토큰 비용** | 낮음 | 높음 (3-4x) |
| **패턴** | Hub-and-Spoke | Mesh (any-to-any) |

**핵심 질문**: "팀원들이 서로 통신해야 하나?"
- Yes → Agent Teams
- No → Subagents 또는 /batch

---

## 3. 적합한 Use Cases

### ✅ 강력한 Use Cases

| 사용 사례 | 설명 |
|----------|------|
| **연구 & 리뷰** | 여러 관점에서 동시 조사 → 발견 공유 & 도전 |
| **새 모듈/기능** | 각 팀원이 별도 컴포넌트 담당 (파일 충돌 없음) |
| **디버깅 (경쟁 가설)** | 여러 가설을 병렬로 테스트, 서로 반박 |
| **Cross-layer 조율** | Frontend/Backend/Tests 각각 담당 |
| **토론 & 합의** | 아키텍처 결정에 대해 여러 입장 논쟁 → 최선안 도출 |
| **대규모 분류** | 큰 데이터셋을 분할해서 병렬 처리 |

### ❌ 피해야 할 경우

- **순차적 작업** → 단일 세션이 효율적
- **같은 파일 동시 편집** → 충돌 발생
- **긴밀한 의존성** → 오버헤드가 이점 초과
- **통신 불필요한 독립 작업** → /batch가 더 간단

---

## 4. Reddit 커뮤니티 인사이트

### 🔥 실전 팁 (고급 사용자들)

#### 팁 1: Codex로 Cross-Check
```
"내 설정에서 핵심은 agent teams의 agents가 headless codex-5.3-high 
세션을 호출해서 계획과 코드를 리뷰하게 하는 것"
```
- Claude가 작성 → Codex가 검증 → 품질 향상

#### 팁 2: Usage Limit 모니터링
```
"80% 사용량 도달 시 모든 세션과 agents에게 
안전한 중단점으로 이동하라고 알림"
```
- 토큰 소진 방지를 위한 graceful pause

#### 팁 3: 13-Agent 팀 구성 (피어 리뷰)
```
"별도의 critic agent가 출력을 리뷰한 후 
사용자에게 전달 → 놀라울 정도로 많은 이슈 캐치"
```

#### 팁 4: 파일 경계 명확히
```
"조율 문제가 코딩 문제보다 어렵다. 
design agent와 coder agent가 서로의 변경을 밟지 않도록 해야"
```

### ⚠️ 주의사항 (비판적 의견)

```
"Agent Teams는 기본적으로 '마케팅이 좋은 비싼 subagents'...
idle 알림이 team leader의 컨텍스트 윈도우를 빠르게 채움"
```

**반박 관점**:
- 복잡한 탐색/리서치에서는 가치 있음
- 단순 병렬 작업에는 과도함

---

## 5. 실전 Best Practices

### 5.1 Worktree 격리 (필수)

```bash
# 각 Agent가 독립된 worktree에서 작업
git worktree add ../project-agent1 main
git worktree add ../project-agent2 main

# 또는 claude --worktree 옵션 사용
claude --worktree feature-auth
```

**왜 중요한가?**
- 같은 파일 편집 시 덮어쓰기 발생
- merge resolution이 coordination layer에 없음
- **작업 분해를 파일 경계에 맞춰야 함**

### 5.2 단계별 검증 없음 문제

```
"Team Lead가 task 할당은 하지만, task 완료를 검증하지 않음.
Teammate가 'done' 하면 그냥 신뢰함"
```

**해결책**:
- Hook으로 품질 게이트 추가
- TaskCompleted 시 테스트 실행
- 별도 validator agent 운영

### 5.3 모델 선택 제한

```
"모든 teammate가 같은 모델 사용. 
Planning task와 grep task가 같은 토큰 소비"
```

**우회책**:
- Custom Agents는 per-agent 모델 선택 지원 (단, single-session)
- 속도 vs 비용 트레이드오프

### 5.4 팀 크기 권장

| 팀 크기 | 권장 |
|---------|------|
| 2-3명 | ✅ 관리 용이 |
| 4-5명 | ⚠️ 조율 오버헤드 증가 |
| 6명+ | ❌ 모니터링 어려움 |

**권장**: Task 5-6개당 Teammate 1명

---

## 6. 아키텍처 패턴

### 6.1 Phase 기반 실행

```
Phase 1 (Sequential): 
  Team Lead: 아키텍처 정의

Phase 2 (Parallel):
  ├─ Agent 1: Backend 구현
  ├─ Agent 2: Frontend 구현
  └─ Agent 3: Tests 작성

Phase 3 (Sequential):
  Team Lead: Integration + Validation
```

### 6.2 계층적 팀

```
Team Lead
│
├─ Agent 1 (Backend Lead)
│   ├─ Agent 1a: Controllers
│   └─ Agent 1b: Services
│
└─ Agent 2 (Frontend Lead)
    ├─ Agent 2a: Components
    └─ Agent 2b: State Management
```

### 6.3 Debate 패턴

```
Orchestrator (나 = Team Lead)
│
├─ Claude Agents → Agent() tool로 spawn
│   ├─ senior-dev (claude-sonnet)
│   └─ architect (claude-opus)
│
└─ Non-Claude Agents → agent_chat MCP로 호출
    ├─ codex-reviewer (openai-codex)
    └─ gemini-analyst (google)
```

---

## 7. 토큰 비용 관리

### 비용 공식
```
3-teammate team ≈ 3-4x 단일 세션 토큰
```

### 비용 절감 전략

| 전략 | 설명 |
|------|------|
| **CLAUDE.md 최적화** | 모듈 경계, 검증 명령어 명시 → 탐색 비용 감소 |
| **Permission 사전 승인** | 권한 프롬프트 flood 방지 |
| **짧은 팀 수명** | review 같은 단발 작업에 적합 |
| **Sonnet 사용** | Opus 대비 비용 효율 (복잡도 낮은 작업) |

---

## 8. 알려진 제한사항

| 제한 | 상태 | 우회책 |
|------|------|--------|
| 세션 재개 미지원 | 현재 | /resume, /rewind가 teammate 복구 안 함 |
| Task 상태 지연 | 현재 | 수동으로 task 상태 업데이트 |
| Shutdown 느림 | 현재 | 현재 요청 완료까지 대기 |
| 팀당 1개 세션 | 현재 | 이전 팀 정리 후 새 팀 생성 |
| 중첩 팀 불가 | 현재 | Lead만 팀 관리 가능 |
| Split pane 제한 | 현재 | tmux 또는 iTerm2 필요 |

---

## 9. 커뮤니티 도구 & 플러그인

| 도구 | 기능 |
|------|------|
| **multi-swarm** | Task 자동 분해 → N개 worktree로 병렬 실행 |
| **claude-teams-brain** | 역할별 메모리 라우팅 (backend agent → backend 히스토리) |
| **ClaudeFast Code Kit** | 18개 전문 agent + 사전 구성된 팀 오케스트레이션 |

---

## 10. 결론 & 권장사항

### 언제 사용?

| 상황 | 권장 |
|------|------|
| 복잡한 탐색/리서치 | ✅ Agent Teams |
| 다각도 코드 리뷰 | ✅ Agent Teams |
| 아키텍처 토론 | ✅ Agent Teams |
| 단순 병렬 작업 | ❌ /batch 또는 Subagents |
| 같은 파일 편집 | ❌ 단일 세션 |
| 순차적 워크플로우 | ❌ 구조화된 오케스트레이션 |

### 핵심 원칙

1. **파일 경계 명확히** - 팀 생성 전 작업 분해
2. **Worktree 필수** - 충돌 방지
3. **작은 팀 시작** - 2-3명으로 시작
4. **검증 추가** - Hook으로 품질 게이트
5. **비용 모니터링** - 3-4x 토큰 소비 예상

---

## 참고 자료

- [Claude Code Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [ClaudeFast Complete Guide](https://claudefa.st/blog/guide/agents/agent-teams)
- [Reddit r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/)
- [Reddit r/ClaudeAI](https://www.reddit.com/r/ClaudeAI/)

---

*Last Updated: 2026-03-16*

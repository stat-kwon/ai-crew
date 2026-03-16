# Multi-Provider MCP Server

AI-Crew는 Claude 이외의 모델(OpenAI, Google)과 대화할 수 있는 MCP 서버를 내장한다.

## 구조

```
Team Lead (Claude Code)
├── Claude Agents         → Agent() tool (기본, inline 모드)
│   model: sonnet/opus/haiku
│   └── Hat pipeline 내 모든 Hat을 순서대로 수행
│
└── Non-Claude Agents     → agent_chat MCP tool (split 모드)
    ├── OpenAI: gpt-4o, o3, codex
    └── Google: gemini-2.5-pro, gemini-2.5-flash
```

## Hat별 Model Routing (Cross-Check 패턴)

`config.yaml`의 `hats.pipeline`에서 Hat별로 `modelOverride`를 지정하면, 해당 Hat만 `agent_chat` MCP를 통해 다른 모델에 위임할 수 있다.

```yaml
# config.yaml
hats:
  pipeline:
    - id: builder
      # modelOverride 없음 → Claude Agent 내에서 inline 실행 (기본)
    - id: reviewer
      modelOverride:
        provider: "openai"
        model: "codex"         # Codex가 코드 리뷰
```

| 모드 | 설명 | 비용 |
|------|------|------|
| **inline** (기본) | `modelOverride` 없음 — 하나의 Agent가 모든 Hat 수행 | 1x |
| **split** | `modelOverride` 지정 — 해당 Hat만 `agent_chat` MCP로 분리 | 2-3x |

Agent Teams는 모든 teammate가 같은 모델을 사용하므로, 다른 모델로 검증하려면 `agent_chat` MCP를 통해 우회한다.

## MCP 도구

### agent_chat

Non-Claude 모델에 메시지를 보내고 응답을 받는다. 세션별 대화 이력 유지.

```
agent_chat(
  session_id: "unit-backend-agent",
  model: "gpt-4o",
  system_prompt: "You are a backend developer...",
  message: "Implement the notification service..."
)
```

### list_models

설정된 모든 Provider의 사용 가능한 모델 목록 반환.

## Provider

| Provider | SDK | 환경변수 | 모델 |
|----------|-----|---------|------|
| OpenAI | `openai` (동적 import) | `OPENAI_API_KEY` | gpt-4o, gpt-4o-mini, o3, o3-mini, codex |
| Google | `@google/generative-ai` (동적 import) | `GOOGLE_API_KEY` | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash |

Provider SDK는 **선택적 의존성** — 설치되지 않으면 해당 Provider를 건너뛴다.

## 등록

인스톨러가 `.claude/settings.json`에 자동 등록:

```json
{
  "mcpServers": {
    "ai-crew": {
      "command": "npx",
      "args": ["ai-crew", "mcp"]
    }
  }
}
```

## 소스 구조

```
src/mcp/
├── server.ts           # MCP 서버 (stdio transport)
├── registry.ts         # model → provider 라우팅, lazy 초기화
├── session.ts          # 세션별 대화 이력 (in-memory, 최대 50 메시지)
└── providers/
    ├── base.ts         # Provider 인터페이스
    ├── openai.ts       # OpenAI 구현
    └── google.ts       # Google 구현
```

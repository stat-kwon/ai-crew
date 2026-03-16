# AI-Crew Architecture

## 핵심 원칙

- **프롬프트 중심 설계** — 런타임 TypeScript는 최소한(installer + MCP server). 핵심 산출물은 `.claude/commands/crew/*.md`
- **Claude 위임** — Agent 생성/제어는 Claude Code가 담당. AI-Crew는 프롬프트와 상태만 관리
- **State 영속화** — 모든 진행 상황을 `.ai-crew/state.json`에 저장. 세션 재시작 후 복구 가능
- **비침투적** — 기존 프로젝트 구조를 변경하지 않음. `.ai-crew/` 하위에만 저장

## 컴포넌트 구조

```
┌─────────────────────────────────────────────────────┐
│                    AI-Crew Plugin                     │
├──────────────┬──────────────┬───────────────────────┤
│   Commands   │    State     │     MCP Server        │
│ /crew:*      │ state.json   │ agent_chat            │
│ (프롬프트)    │ config.yaml  │ list_models           │
├──────────────┴──────────────┴───────────────────────┤
│                    Installer                         │
│ npx ai-crew init → 디렉토리/설정/커맨드 생성          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Claude Code Runtime                 │
│  • Agent Teams (teammate spawn, worktree isolation)  │
│  • Git Worktree (branch별 격리)                      │
│  • File System (상태/스펙 파일 직접 접근)              │
└─────────────────────────────────────────────────────┘
```

## 실행 흐름

```
사용자 → /crew:elaborate "알림 시스템"
         │
         ▼
   Team Lead (Claude Code)
   ├─ AIDLC Inception 규칙 읽기
   ├─ 요구사항 분석 & 사용자 질의
   ├─ Unit 분해 & 스펙 문서 생성
   └─ state.json 업데이트 (status: "ready")
         │
사용자 → /crew:execute
         │
         ▼
   Team Lead → Agent() spawn (Unit별)
   ├─ Agent A: Unit-1 (worktree isolation)
   │   └─ Planner 🎩 → Builder 🔨 → Reviewer 👀
   ├─ Agent B: Unit-2 (worktree isolation)
   │   └─ Planner 🎩 → Builder 🔨 → Reviewer 👀
   └─ (Non-Claude) agent_chat MCP (선택적)
         │
사용자 → /crew:integrate
         │
         ▼
   Team Lead
   ├─ dependency 순서대로 branch merge
   ├─ 전체 테스트 & lint
   ├─ Completion Criteria 검증
   └─ PR 생성 (선택적)
```

## 디렉토리 구조

인스톨러(`npx ai-crew init`)가 대상 프로젝트에 생성하는 구조:

```
project/
├── .ai-crew/
│   ├── config.yaml              # 실행 설정 (모델, 병렬 수, 품질 게이트)
│   ├── state.json               # 런타임 상태 (intent, units, events)
│   ├── specs/{intent-id}/       # Intent별 스펙 (requirements, design, tasks)
│   ├── aidlc-rule-details/      # AI-DLC 방법론 규칙 (inception, construction, ...)
│   ├── prompts/                 # 프롬프트 템플릿
│   ├── templates/               # 문서 템플릿 (Handlebars)
│   ├── rules/                   # 공통 규칙(global.md) + Hat별 규칙(hat-*.md)
│   ├── checkpoints/             # 상태 스냅샷
│   ├── scratchpad/              # Agent 작업 노트
│   └── sessions/                # MCP 세션 이력
│
├── .claude/
│   ├── settings.json            # Agent Teams 환경변수, MCP 서버 등록
│   └── commands/crew/           # 슬래시 커맨드 6개
│       ├── elaborate.md         # Inception
│       ├── execute.md           # Construction
│       ├── integrate.md         # Integration
│       ├── status.md            # 상태 조회
│       ├── checkpoint.md        # 스냅샷 저장
│       └── restore.md           # 스냅샷 복구
│
└── CLAUDE.md                    # AI-Crew 섹션 추가됨
```

## 소스 구조 (ai-crew 패키지)

```
src/
├── cli.ts              # CLI 진입점 (init, status, mcp)
├── installer.ts        # npx ai-crew init 로직
├── config.ts           # config.yaml 로드/저장
├── state.ts            # StateManager (intent, units, checkpoints, events)
├── types.ts            # 전체 타입 정의
├── index.ts            # 모듈 export
└── mcp/
    ├── server.ts       # MCP 서버 (agent_chat, list_models)
    ├── registry.ts     # Provider 레지스트리 & 모델 카탈로그
    ├── session.ts      # 세션별 대화 이력 관리
    └── providers/
        ├── base.ts     # Provider 인터페이스
        ├── openai.ts   # OpenAI (GPT-4o, o3, Codex)
        └── google.ts   # Google (Gemini)

templates/              # 인스톨러가 대상 프로젝트에 복사하는 파일
├── commands/           # → .claude/commands/crew/
├── prompts/            # → .ai-crew/prompts/
├── doc-templates/      # → .ai-crew/templates/
├── rules/              # → .ai-crew/rules/
└── aidlc-rule-details/ # → .ai-crew/aidlc-rule-details/ (빌드 시 복사)
```

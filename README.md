# 🚀 AI-Crew

> AI-DLC 방법론 + Claude Code Agent Teams 통합 플러그인

AI-Crew는 AWS의 AI-DLC(AI-Driven Development Lifecycle) 방법론을 Claude Code의 Agent Teams 기능과 결합하여, 병렬 AI 개발 워크플로우를 제공합니다.

## ✨ Features

- **🎯 Elaboration**: 자연어로 요구사항 정의 → Unit 자동 분해
- **👥 Agent Teams**: Unit별 전담 Agent 자동 생성 (Git Worktree 격리)
- **🎩 Hat System**: Planner → Builder → Reviewer 자동 전환
- **💾 State Persistence**: 세션 간 상태 유지 & 복구
- **✅ Backpressure**: 테스트/린트 기반 품질 게이트

## 📦 Installation

```bash
# 프로젝트에 설치
cd your-project
npx ai-crew@latest install

# 또는 글로벌 설치
npm install -g ai-crew
ai-crew install
```

## 🚀 Quick Start

```bash
# 1. Elaboration - 무엇을 만들지 정의
/crew:elaborate

# 2. Execute - Agent Team이 병렬 실행
/crew:execute

# 3. Status - 진행 상황 확인
/crew:status

# 4. Integrate - 결과 통합
/crew:integrate
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `/crew:elaborate` | Intent 정의 & Unit 분해 |
| `/crew:execute` | Agent Team 생성 & 실행 |
| `/crew:status` | 현재 진행 상황 조회 |
| `/crew:integrate` | Unit 결과 통합 |
| `/crew:checkpoint` | 현재 상태 저장 |
| `/crew:restore` | 이전 상태 복구 |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AI-Crew                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │ /elaborate  │───→│         INCEPTION               │ │
│  └─────────────┘    │  - Requirements 정의            │ │
│                     │  - Completion Criteria 설정     │ │
│                     │  - Units 분해                   │ │
│                     └─────────────────────────────────┘ │
│                                   │                      │
│                                   ▼                      │
│  ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │  /execute   │───→│        CONSTRUCTION             │ │
│  └─────────────┘    │                                  │ │
│                     │  Team Lead (조율)                │ │
│                     │    ├── Agent 1 (worktree)       │ │
│                     │    ├── Agent 2 (worktree)       │ │
│                     │    └── Agent N (worktree)       │ │
│                     │                                  │ │
│                     │  Each: Planner→Builder→Reviewer │ │
│                     └─────────────────────────────────┘ │
│                                   │                      │
│                                   ▼                      │
│  ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │ /integrate  │───→│        INTEGRATION              │ │
│  └─────────────┘    │  - Merge all branches           │ │
│                     │  - Cross-unit validation        │ │
│                     └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

설치 후 생성되는 구조:

```
your-project/
├── .ai-crew/
│   ├── config.yaml          # AI-Crew 설정
│   ├── state.json           # 현재 상태
│   ├── intents/             # Intent 정의
│   │   └── {intent-id}/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   ├── checkpoints/         # 상태 스냅샷
│   └── scratchpad/          # Agent 작업 노트
├── .claude/
│   └── commands/            # Claude Code 명령어
│       └── crew/
│           ├── elaborate.md
│           ├── execute.md
│           └── ...
└── CLAUDE.md                # (기존 파일에 컨텍스트 추가)
```

## ⚙️ Configuration

`.ai-crew/config.yaml`:

```yaml
# AI-Crew Configuration
version: "0.1"

# Team 설정
team:
  maxAgents: 5
  defaultModel: "claude-sonnet-4"
  teammateMode: "tmux"  # tmux | in-process

# Hat 설정
hats:
  enabled: true
  requirePlanApproval: false  # Planner 승인 필요 여부

# State 관리
state:
  autoCheckpoint: true
  checkpointInterval: "task"  # task | unit | manual

# 품질 게이트
qualityGates:
  tests: true
  lint: true
  coverage: 80
```

## 🔧 Customization

### 템플릿 커스터마이징

`.ai-crew/templates/` 디렉토리에서 템플릿 수정:

- `requirements.md.hbs` - 요구사항 문서 형식
- `design.md.hbs` - 설계 문서 형식
- `tasks.md.hbs` - 태스크 목록 형식

### 규칙 추가

`.ai-crew/rules/` 디렉토리에 규칙 파일 추가:

```markdown
# my-rules.md

## Coding Standards
- Use TypeScript strict mode
- All functions must have JSDoc comments
- ...
```

## 📚 References

- [AI-DLC Official](https://ai-dlc.dev/)
- [AWS AI-DLC Blog](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)

## 📄 License

MIT

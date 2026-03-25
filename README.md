# ai-crew

Catalog-based Plugin Composition Platform for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

Graph-based multi-agent orchestrator that manages agents, skills, rules, and commands as reusable catalog components. Bundles compose these into team configurations for parallel code generation.

## Install

```bash
npm install -g ai-crew
```

## Quick Start

```bash
# List available team bundles
ai-crew list

# Install a team into your project
ai-crew install --team fullstack --target ./my-project

# In Claude Code, run the workflow
/crew:elaborate "Build a todo app with React and Node.js"
/crew:preflight
/crew:run
/crew:integrate
```

## Available Bundles

| Bundle | Description | Nodes |
|--------|-------------|-------|
| `fullstack` | Frontend + Backend parallel, then review + QA | 5 |
| `aidlc-standard` | Plan → Build → Review sequential | 3 |
| `aidlc-tdd` | Plan → Test → Build → Review (TDD) | 4 |
| `advanced-fullstack` | Parallel with security audit | 7 |
| `e2e-premium` | Full pipeline with design gates | 13 |
| `lightweight` | Minimal: plan + parallel build | 3 |

## Architecture

```
catalog/              → Reusable components (source of truth)
  agents/             → Agent definitions (backend-dev, frontend-dev, reviewer, ...)
  skills/             → Domain skills (backend-node, testing, clean-code, ...)
  commands/           → Slash commands (/crew:run, /crew:preflight, ...)
  rules/              → Global rules (coding-standards, git-conventions, ...)
  bundles/            → Team compositions (fullstack, aidlc-standard, ...)

ai-crew install       → Copies catalog items to project
  .ai-crew/           → State, graph, rules, scratchpad
  .claude/            → Agents, skills, commands (Claude Code reads these)
  CLAUDE.md           → Project workflow config
```

## Graph Execution Model

Each bundle defines a DAG (Directed Acyclic Graph) of work nodes:

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

`/crew:run` executes nodes level-by-level:
- **Level 0**: Root nodes (no dependencies) — run in parallel
- **Level N**: Nodes whose dependencies are all complete
- Each worker runs in an isolated git worktree on branch `crew/{node_id}`

## Catalog Metadata

Every catalog item has a `plugin.json` with tier classification:

```json
{
  "name": "backend-node",
  "description": "Node.js backend development patterns",
  "tier": "independent",
  "requires": [],
  "tags": ["implementation", "backend", "nodejs"]
}
```

| Tier | Meaning |
|------|---------|
| `independent` | Works anywhere, no workflow dependency |
| `aidlc` | Requires AI-DLC workflow (aidlc-docs/) |
| `crew` | Graph orchestration internal |

## Commands

| Command | Description |
|---------|-------------|
| `ai-crew install --team <name> --target <path>` | Install a bundle |
| `ai-crew list` | List available bundles |
| `ai-crew status` | Show current state |
| `ai-crew doctor` | Diagnose installation |
| `ai-crew validate` | Validate config files |
| `ai-crew uninstall` | Remove installation |
| `ai-crew mcp` | Start MCP server |

## Slash Commands (in Claude Code)

| Command | Phase | Description |
|---------|-------|-------------|
| `/crew:elaborate` | Inception | Define requirements and design |
| `/crew:refine` | Inception | Iterative design refinement |
| `/crew:preflight` | Setup | Validate graph, models, git, rules |
| `/crew:run` | Construction | Execute graph (parallel agents) |
| `/crew:integrate` | Construction | Merge branches, create PR |
| `/crew:status` | Any | Show workflow state |

## Multi-Session Continuity

Previous runs are archived with descriptive IDs:

```
.ai-crew/runs/
  initial-build-20260324-1/
    manifest.json       # Intent, outcome, node summaries
    scratchpad/         # Preserved agent outputs
  fix-auth-20260325-1/
    manifest.json
    scratchpad/
```

Agents in subsequent runs receive context about what changed since the last run.

## Documentation

See [docs/](./docs/) for detailed architecture documentation:
- [Artifact Flow](./docs/artifact-flow.md) — Data ownership and lifecycle
- [Graph Execution](./docs/graph-execution.md) — DAG execution model
- [Preflight/Run Separation](./docs/preflight-run-separation.md) — Validation architecture
- [Multi-Session Continuity](./docs/multi-session-continuity.md) — Run history system
- [Catalog Architecture](./docs/catalog-architecture.md) — Plugin composition
- [State Management](./docs/state-management.md) — All state files

## License

MIT

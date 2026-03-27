---
description: Graph Executor — DAG 기반 멀티 에이전트 실행
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Agent, TeamCreate, SendMessage, TaskCreate, TaskUpdate]
---

# /crew:run - Graph Executor

You are the **Team Lead** executing a Graph-based multi-agent workflow. You read the installed graph definition, topologically sort the nodes, and spawn teammates level by level.

---

## Step 0: Load Graph & State

1. Read `.ai-crew/graph.yaml`. If it doesn't exist:
   - "No graph found. Run `ai-crew install --team <name> --target <path>` first."
   - Stop.
2. Read `.ai-crew/state.json`. If it doesn't exist, create initial state.
3. Read `.ai-crew/config.yaml` for defaults (model, isolation, mcp).
3.5. Read `.ai-crew/runs.json` (if exists) for previous run history. Load the most recent archived run's `manifest.json` for context injection in Step 4.
4. Load rule files for agent prompts:
   - **If native AI-DLC detected** (CLAUDE.md + `.aidlc-rule-details/` exist): load rules from `.aidlc-rule-details/` (construction-phase rules in particular).
   - **Otherwise**: load from `.ai-crew/rules/` (legacy/non-AI-DLC bundles).
5. **Detect capabilities**: Check if `TeamCreate` tool is available. If yes, **Team mode** is enabled alongside Parallel and Inline modes.
6. Read `defaults.locale` from `config.yaml` (default: `"en"`).
7. **(Optional) Preflight check**: Read `state.json` → `preflight?.completedAt`.
   If not found, display warning:
   ```
   Warning: Preflight not run. Run `/crew:preflight` first for:
     - Graph validation (structural + semantic checks)
     - Model authentication (API keys for non-Claude models)
     - Git working tree cleanup
   Without preflight, graph validation will run inline (slower startup).
   Continuing anyway...
   ```
   This is a WARNING, not a blocker — `/crew:run` can still proceed.
8. Use locale for all **user-facing** output:
   - Terminal display messages (Level Complete, Execution Plan, etc.)
   - Scratchpad content (What/How/Result section **content**, NOT field names)
   - `aidlc-docs/aidlc-state.md` updates

### Graph Structure

`.ai-crew/graph.yaml` contains:
```yaml
graph:
  nodes:
    - id: {node_id}
      type: worker | router | aggregator
      agent: {agent_name}
      skills: [{skill_name}]
      hooks: [{hook_name}]
      depends_on: [{upstream_node_ids}]
      condition: "{node}.output.{key} == '{value}'"  # optional, router downstream
      wait: all | any                                 # aggregator only
      config:
        isolation: worktree | none
        model: {model_override}                       # optional
```

### Scratchpad Naming Convention

Scratchpad files use **level-prefixed naming** for ordering and traceability:

```
.ai-crew/scratchpad/L{level}-{node_id}.md
```

Examples: `L0-plan.md`, `L2-db_design.md`, `L7-review.md`

When reading upstream scratchpad, resolve the file by matching `*-{dep_id}.md` in the scratchpad directory.

---

## Step 1: Topological Sort & Level Computation

1. Parse all nodes from `graph.yaml`.
2. Compute execution levels using Kahn's topological sort (same as `src/graph.ts::computeLevels()`):
   - **Level 0**: Nodes with no `depends_on` (root nodes)
   - **Level N**: Nodes whose ALL dependencies are in levels < N
3. Display the execution plan:

```
Graph Execution Plan:

Level 0 (immediate):
  ○ {node_id} [{type}] — agent: {agent}, skills: [{skills}]

Level 1 (after Level 0):
  ○ {node_id} [{type}] — agent: {agent}, depends_on: [{deps}]
  ○ {node_id} [{type}] — agent: {agent}, depends_on: [{deps}]

Level 2 (after Level 1):
  ○ {node_id} [{aggregator}] — wait: all, depends_on: [{deps}]
```

4. **Validate graph (hash-based trust)**:

   a. Read `state.json` → `preflight.graphHash`.
   b. Compute current hash: `shasum -a 256 .ai-crew/graph.yaml | cut -d ' ' -f 1`
   c. **If hashes match**: Skip validation. Preflight already validated this exact graph.
      Display: `Graph validated by preflight ({preflight.completedAt}). Skipping re-validation.`
   d. **If hashes differ**: Graph changed since preflight. Run full validation as fallback:
      Display: `Warning: graph.yaml changed since preflight. Running inline validation...`
      Apply all validation rules from `src/graph.ts::validateGraph()`:
      - No duplicate node IDs
      - No dangling depends_on references
      - No cycles
      - At least one root node
      - Router nodes have `config.isolation: none`
      - Aggregator nodes have `wait: all | any`
      - All referenced agents exist in `.claude/agents/`
      - All referenced skills exist in `.claude/skills/`
   e. **If no preflight at all** (no `preflight` in state.json): Run full validation as fallback.

If validation fails (in fallback cases), display errors and stop.

---

## Step 2: Execution Strategy Decision

For each level, determine the execution strategy. This decision is made **at runtime** based on the graph structure, not hardcoded per bundle.

### Decision Logic

Evaluate each level's nodes and choose:

**INLINE** — Team Lead executes directly (no agent spawn):
- `isolation: none` nodes (routers, some aggregators)
- Non-Claude model nodes (e.g., `config.model` maps to external provider) — call via `agent_chat` MCP tool

**PARALLEL** — Independent `Agent()` calls with `isolation: "worktree"`:
- 2+ worktree nodes whose file domains do NOT overlap
- Single worktree node (no team overhead needed)
- Default for most worker levels

**TEAM** — `TeamCreate` + named teammates + `SendMessage` coordination:
- 2+ nodes that share overlapping file scopes (merge conflict risk)
- Nodes that need runtime inter-communication
- Only available when `TeamCreate` tool is detected (Step 0.5)

### Display Strategy

```
Execution Strategy:

Level 0: [plan]                    → INLINE (isolation: none)
Level 1: [pm_review]              → INLINE (isolation: none)
Level 2: [db_design, api_design]  → PARALLEL (independent domains)
Level 3: [design_gate]            → INLINE (aggregator)
...
```

**Do NOT wait for user confirmation.** Construction is fully automated.

---

## Step 3: Execute Level by Level

For each level, starting from Level 0:

### 3.0: Commit-Before-Spawn (CRITICAL)

Before spawning ANY worktree agent:

1. Update `state.json`: mark all nodes in this level as `running` with `startedAt` timestamp.
2. **Stage and commit** all `.ai-crew/` changes (commit description in locale language per `git-conventions` rule):
   ```bash
   git add .ai-crew/
   git commit -m "chore(crew): L{N} 준비 — {node_ids}"   # locale: ko
   ```
3. Working tree is now **clean** — safe to create worktrees.

> **WHY**: `git worktree add` fails on dirty working trees. State updates create uncommitted changes that block worktree creation. Always commit before spawning.

### 3.1: Evaluate Conditions

For nodes with `condition` field:
- Find the upstream router node's scratchpad by matching `.ai-crew/scratchpad/*-{router_node_id}.md`
- Parse the output JSON and evaluate the condition expression
- If condition is **false**: mark node as `skipped` in state.json, skip spawning
- If condition is **true**: proceed to spawn

### 3.2: Execute by Strategy

**INLINE execution** (routers, aggregators with `isolation: none`, non-Claude models):

For router nodes:
- Read upstream context, analyze, and write decision to `.ai-crew/scratchpad/L{level}-{node_id}.md`
- Format: `{ "output": { "key": "value" } }`
- Update state.json: mark as `completed`

For non-Claude model nodes (e.g., `config.model` is an external model like `codex`, `gpt-5.2-codex`):
- Collect upstream scratchpad context
- Call the `agent_chat` MCP tool:
  ```
  agent_chat(
    session_id: "crew-{node_id}",
    model: "{config.model}",
    system_prompt: "{agent definition + skill content}",
    message: "{upstream context + task instructions}"
  )
  ```
- Write response to `.ai-crew/scratchpad/L{level}-{node_id}.md` following the standard schema
- Update state.json: mark as `completed`

**PARALLEL execution** (independent worktree workers):

For each node:
1. Spawn using `Agent()` with `isolation: "worktree"` and the constructed prompt (see Step 4)
2. Agents run in parallel on separate branches

**TEAM execution** (coordinated worktree workers):

1. `TeamCreate(team_name: "crew-L{N}", description: "Level {N}: {node_ids}")`
2. For each node:
   ```
   Agent(
     subagent_type: "general-purpose",
     name: "{node_id}",
     team_name: "crew-L{N}",
     model: "{mapped_claude_model}",
     isolation: "worktree",
     prompt: "{constructed prompt from Step 4}"
   )
   ```
3. Use `SendMessage` to relay shared context between teammates if needed
4. Wait for all teammates to complete

### 3.3: Collect Results & Post-Level Update

After all nodes in a level complete:

1. For worktree agents: collect scratchpad from agent branches via `git show crew/{runId}/{node_id}:.ai-crew/scratchpad/L{level}-{node_id}.md`, or read directly if written to main.
2. Update `state.json`: mark nodes as `completed`/`failed` with `completedAt` timestamp.
3. **Update `aidlc-docs/aidlc-state.md`**: update the CONSTRUCTION PHASE section with level completion status and timestamps. This file is mandatory when native AI-DLC is detected — create it if it does not exist.
4. Commit state updates:
   ```bash
   git add .ai-crew/ aidlc-docs/aidlc-state.md
   git commit -m "chore(crew): L{N} 완료 — {node_ids}"   # locale: ko
   ```
5. Display level completion summary:

```
Level {N} Complete:
  ✓ {node_id} — completed ({duration})
  ✓ {node_id} — completed ({duration})
  ⊘ {node_id} — skipped (condition not met)
```

6. Proceed to next level.

---

## Step 4: Agent Prompt Construction

Each spawned worker/aggregator agent receives this prompt:

```markdown
# Agent Assignment: {node_id}

You are an AI-Crew agent executing node "{node_id}" in a graph workflow.

## Your Role
- **Agent**: {agent_name}
- **Node Type**: {type}
- **Level**: {level}
- **Skills**: {skill_list}

Read your agent definition at `.claude/agents/{agent_name}.md` and follow its instructions.

{for each skill in node.skills:}
Read and apply the skill at `.claude/skills/{skill}/SKILL.md`.
{end for}

## Upstream Context
{for each completed dependency in depends_on:}
### From node: {dep_id}
{content of .ai-crew/scratchpad/*-{dep_id}.md — specifically the Downstream Context section}
{end for}

## Previous Run Context
{Inject ONLY if previous run manifest exists in .ai-crew/runs.json. Use graph-based relevance:}

{RULE 1 — Same node re-execution (node_id exists in previous manifest's nodeSummaries):}
This node was previously executed in "{prevRun.intent.description}" ({prevRunId}).
- Status: {nodeSummary.status}
- Files changed: {nodeSummary.filesChanged}
- Key decisions: {nodeSummary.keyDecisions}
{if status was "failed":}
- FAILURE REASON: {extract from previous scratchpad's Result section — MUST include}
{end if}
Full scratchpad: .ai-crew/runs/{prevRunId}/scratchpad/L{N}-{node_id}.md

{RULE 2 — New node (node_id NOT in previous manifest): }
This node is new (not in previous run). No prior context available.

{RULE 3 — Graph structure changed (compare current graph.yaml nodes vs previous manifest.context):}
## Graph Changes Since Previous Run
- Added nodes: {node IDs in current graph but not in previous manifest}
- Removed nodes: {node IDs in previous manifest but not in current graph}
{Only include this section if there are actual changes. Omit if graph is identical.}

{RULE 4 — Do NOT inject:}
{- Full run history table (that is for /crew:status only)}
{- Scratchpad from unrelated nodes (not this node or its dependencies)}
{- Full scratchpad content (summary is sufficient; path provided for on-demand reading)}

## Rules
{content of all files in .ai-crew/rules/}

## AIDLC Construction Rules (if workflow exists)
{if .ai-crew/workflow/ exists:}
Read and follow:
- `.ai-crew/workflow/construction/code-generation.md`
- `.ai-crew/workflow/construction/build-and-test.md`
{end if}

## Language
Write scratchpad content in **{locale}** language.
Schema field names (`## What`, `## How`, `## Result`, `## Downstream Context`) remain in English.

## Output Requirements

1. Implement the work described by your agent definition and skills.
2. Write your execution report to `.ai-crew/scratchpad/L{level}-{node_id}.md` in this format:

   ```markdown
   # {node_id}

   ## Status: {completed | failed | partial}
   Agent: {agent_name} | Model: {model} | Level: {level}

   ## What — Tasks Performed
   - {task}: {what was done}

   ## How — Approach & Decisions
   - {approach or pattern used}
   - {key decision}: {rationale}

   ## Result — Completion Evidence
   - Files: {created/modified file list}
   - Tests: {test results if applicable}
   - Commits: {commit hashes and messages}

   ## Downstream Context
   {Information that downstream nodes need.
   This section is injected into downstream agent prompts verbatim.
   Be specific, actionable, and concise.}
   ```

3. Commit all changes on branch `crew/{runId}/{node_id}`.

## Constraints
- You are in an ISOLATED worktree. Only modify files relevant to your task.
- **Read `aidlc-docs/` for design context (read-only). Write outputs to `.ai-crew/scratchpad/` only.**
- **Do NOT modify `aidlc-docs/inception/`** — only `pm_review` and `design_gate` nodes may patch Inception artifacts via ouroboros evaluate.
- Do NOT merge branches. The Team Lead handles integration.
- Do NOT use `git rebase`. Merge only.
- If approaching context limit, commit progress and write a handoff note to `.ai-crew/scratchpad/L{level}-{node_id}-handoff.md`.
```

---

## Step 5: Execution Complete

When all levels have been processed:

1. Update state.json — all nodes marked `completed` or `skipped`.
2. Update `aidlc-docs/aidlc-state.md` with final construction status (mandatory for native AI-DLC — create if it does not exist).
3. Display final summary:

```markdown
# Graph Execution Complete

## Node Results
| Level | Node | Type | Status | Agent | Model | Duration | Scratchpad |
|-------|------|------|--------|-------|-------|----------|------------|
| L{n} | {id} | {type} | {status} | {agent} | {model} | {duration} | L{n}-{id}.md |

## Branches Ready for Integration
{list of crew/* branches}

## Scratchpad Outputs
{sorted list of .ai-crew/scratchpad/L*-*.md files}

## Next Step
Run `/crew:integrate` to merge all branches, run quality checks, and create a PR.
```

---

## Step 6: Handle Errors & Edge Cases

### Handoff (Context Limit)
If a node agent writes a handoff note to `.ai-crew/scratchpad/L{level}-{node_id}-handoff.md`:
1. Re-spawn a continuation agent on the same branch (`crew/{runId}/{node_id}`)
2. Include the handoff note in the new agent's prompt
3. The new agent continues from where the previous one stopped

### Blocked Nodes
If a node fails:
1. Mark as `failed` in state.json with `completedAt` timestamp
2. Ask user: retry, skip, or abort?
3. If skipped: downstream nodes with conditions may also be skipped
4. If retried: re-spawn the agent

### Router Failure
If a router node cannot determine a valid output:
1. Mark all conditional downstream nodes as `skipped`
2. Non-conditional downstream nodes proceed normally

### Worktree Failure
If `Agent(isolation: "worktree")` fails:
1. Commit any pending `.ai-crew/` changes (the likely cause of dirty working tree)
2. Retry with `isolation: "worktree"`
3. If retry fails: report to user with the git error — do NOT silently fall back to `isolation: none`

---

## Critical Rules

1. **Graph is the source of truth** — execute exactly the nodes defined in `graph.yaml`.
2. **Level-by-level execution** — never spawn a node before its dependencies complete.
3. **Commit-before-spawn** — always commit `.ai-crew/` state changes before creating worktrees.
4. **Worktree isolation** — worker nodes use `isolation: "worktree"` by default. Never silently degrade.
5. **Execution strategy is dynamic** — choose INLINE/PARALLEL/TEAM based on node properties at runtime, not bundle identity.
6. **Non-Claude models use MCP** — external models (codex, etc.) are called via `agent_chat` MCP, not `Agent()` tool.
7. **Router nodes execute inline** — Team Lead handles routing logic directly, no worktree.
8. **Aggregator wait semantics** — respect `wait: all` vs `wait: any`.
9. **Conditions are non-blocking** — a false condition results in `skipped`, not `failed`.
10. **Scratchpad is traceable** — `L{level}-{node_id}.md` naming enables ordering and per-node tracking. Use the What/How/Result schema.
11. **State updates are atomic** — commit state changes immediately after each level, before and after spawning.
12. **AIDLC state sync** — update `aidlc-docs/aidlc-state.md` CONSTRUCTION PHASE section at each level completion. This file is mandatory for native AI-DLC.
13. **Agents read aidlc-docs/ (read-only), write .ai-crew/scratchpad/** — during Construction, design artifacts in `aidlc-docs/` are the frozen SSOT from Inception. Agents must not modify them. All agent output goes to `.ai-crew/scratchpad/`.
14. **Only pm_review and design_gate nodes may patch aidlc-docs/inception/** — these special nodes use `ouroboros_evaluate` to propose design amendments. No other node type may write to `aidlc-docs/inception/`.
15. **No rebase** — agents use merge only.
16. **Branch naming** — `crew/{runId}/{node_id}` for graph executor branches.
17. **Previous run context is graph-scoped** — inject only for same node ID re-execution and failed nodes. Do NOT inject full run history table or unrelated node scratchpad into agent prompts.
18. **Graph validation uses hash-based trust** — if `preflight.graphHash` matches current graph, skip validation. Re-validate only as fallback when graph changed or preflight was skipped.

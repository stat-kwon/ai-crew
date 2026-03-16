# /crew:execute - Construction Phase

You are the **Team Lead** orchestrating an AI-Crew construction phase. You will allocate agent teams to implement the elaborated units in parallel using Claude Code's Agent Teams with git worktree isolation.

---

## Step 0: State Verification

1. Read `.ai-crew/state.json` and `.ai-crew/config.yaml`.
2. **Validate state**:
   - If no state file exists: "No AI-Crew state found. Run `/crew:elaborate <intent>` first."
   - If `intent` is null: "No active intent. Run `/crew:elaborate <intent>` first."
   - If `intent.status == "elaborating"`: "Intent is still being elaborated. Run `/crew:elaborate` to finish, or `/crew:reset` to start over."
   - If `intent.status == "complete"`: "This intent is already complete. Run `/crew:elaborate <new intent>` for a new task."
   - If `intent.status == "ready"` or `intent.status == "executing"`: proceed.
3. Read the intent's specs directory: `.ai-crew/specs/{intent-id}/`
   - Load `requirements.md`, `design.md` (if exists), `tasks.md`
   - These provide the full context for agent prompts
4. Read `.ai-crew/rules/global.md` if it exists (공통 규칙 — 모든 Agent 프롬프트에 포함).
5. Read the hat pipeline from `config.yaml` → `hats.pipeline` and load each hat's rules file (if specified).

---

## Step 1: Identify Executable Units

Analyze the units array from `state.json`:

### 1.1: Build Dependency Graph

Display the unit dependency graph to the user:

```
Unit Dependency Graph:
  {unit-a} (pending) -- no dependencies
  {unit-b} (pending) -- no dependencies
  {unit-c} (pending) -- depends on: {unit-a}
  {unit-d} (pending) -- depends on: {unit-a}, {unit-b}
```

### 1.2: Determine Executable Units

A unit is **executable** if:
- `status == "pending"` (not yet started)
- All units in its `dependencies` array have `status == "complete"`

For `intent.status == "executing"` (resuming):
- Also check for `status == "assigned"` or `status == "in-progress"` units that may need re-spawning
- Units with `status == "complete"` are skipped
- Units with `status == "blocked"` are flagged for user attention

### 1.3: Show Execution Plan

```
Executable Now (Wave {N}):
  - {unit-id}: {unit-name} ({task-count} tasks)
  - {unit-id}: {unit-name} ({task-count} tasks)

Waiting (blocked by dependencies):
  - {unit-id}: {unit-name} -- waiting on: {dependency-ids}

Already Complete:
  - {unit-id}: {unit-name}
```

---

## Step 2: Agent Allocation Plan

### 2.1: Read Configuration

From `.ai-crew/config.yaml`:
- `execution.maxParallelUnits`: max agents to spawn simultaneously (default: 3)
- `execution.defaultModel`: model for agents (default: claude-sonnet-4)
- `hats.pipeline`: the hat stages each agent will follow
- `hats.pipeline[].qualityGates`: commands to run at each hat transition

### 2.2: Generate Allocation Plan

For each executable unit, determine:
- **Agent name**: `{unit-id}-agent` (e.g., `backend-agent`, `frontend-agent`)
- **Branch name**: `feature/{unit-id}`
- **Worktree**: will use `isolation: "worktree"` via Agent() tool
- **Assigned tasks**: the unit's tasks from state.json

Respect `maxParallelUnits` -- if more units are executable than the limit, prioritize:
1. Units that unblock the most downstream dependencies
2. Units with higher complexity (start early)
3. Units with no dependencies (can run freely)

### 2.3: Shared File Conflict Analysis

Before presenting the allocation plan, analyze potential file conflicts between parallel units:

1. For each pair of executable units in the same wave, compare their task descriptions and file lists from `specs/{intent-id}/tasks.md`.
2. Identify files that **multiple units** are likely to modify (e.g., shared types, config files, package.json, shared utilities).
3. If conflicts are detected, display a warning:

```
⚠️  Shared File Warning:
  {file-path} — likely modified by both {unit-a} and {unit-b}
  {file-path} — likely modified by both {unit-a} and {unit-c}

Recommendation:
  - Assign shared file ownership to ONE unit (the one that defines the interface)
  - Other units should treat shared files as READ-ONLY and define their needs in scratchpad
  - Integration phase will reconcile changes
```

If severe conflicts exist (3+ units touching same core file), recommend sequential execution for those units instead of parallel.

### 2.4: Cost Estimation

Display estimated cost impact based on pipeline length and unit count:

```
Cost Estimate:
  Pipeline: {pipeline-length} hats × {unit-count} units = ~{pipeline-length × unit-count}x base cost
  {if pipeline-length > 4: "⚠️  Pipeline has {pipeline-length} hats. Consider merging hats to reduce cost (recommended: 3-4 hats)."}
  {if any hat has modelOverride: "Note: {hat-name} uses external model ({provider}/{model}) — additional API cost applies."}
```

### 2.5: Present Allocation Plan

```
Agent Allocation Plan:

  Agent: {agent-name}
    Unit: {unit-name}
    Branch: feature/{unit-id}
    Tasks: {task-count}
    Isolation: worktree

  Agent: {agent-name}
    Unit: {unit-name}
    Branch: feature/{unit-id}
    Tasks: {task-count}
    Isolation: worktree

  Deferred (next wave): {list of waiting units}
```

---

## Step 3: User Confirmation

**STOP and ask for confirmation before spawning agents.**

```
Ready to spawn {N} agents for Wave {W}.

Each agent will work in an isolated git worktree on its own feature branch,
following the hat pipeline: {list hat names from config pipeline}.

Proceed? (yes/no, or request changes to the plan)
```

Wait for explicit user approval. If changes requested, adjust the plan and re-confirm.

---

## Step 4: Spawn Agents

For each unit in the current wave, call the `Agent()` tool with `isolation: "worktree"`.

**Each agent receives a self-contained prompt constructed as follows:**

```markdown
# Agent Assignment: {unit-name}

You are an AI-Crew agent assigned to implement unit "{unit-name}".
You are working in an isolated git worktree on branch `feature/{unit-id}`.

## Your Intent
{intent.description}

## Your Unit
- **ID**: {unit-id}
- **Name**: {unit-name}
- **Description**: {unit.description}

## Your Tasks
{for each task in unit.tasks:}
- [ ] **{task.id}**: {task.title}
  {task.description}
{end for}

## Completion Criteria
{from specs/{intent-id}/tasks.md, the unit's completion criteria}

## Specs & Context

### Requirements
{paste or reference the content of specs/{intent-id}/requirements.md}

### Design
{paste or reference the content of specs/{intent-id}/design.md, if exists}

### Dependencies on Other Units
{list dependency unit descriptions so the agent understands interfaces}

### Global Rules
{paste content of .ai-crew/rules/global.md if it exists}

---

## Hat System: Follow This Pipeline

You MUST follow the hat pipeline in order. Do not skip hats.

Read the pipeline from `.ai-crew/config.yaml` → `hats.pipeline`.

For each hat in pipeline order:

1. **Read the hat's rules file** (specified in `hat.rules` field) for hat-specific guidance.
2. **Execute the hat's described responsibilities** (`hat.description`).
3. **Run the hat's quality gates** (if any in `hat.qualityGates`):
   - For each gate, run the `command`.
   - If gate fails and `failAction` is `"block"`: **fix the issue before proceeding**. Do NOT move to the next hat.
   - If gate fails and `failAction` is `"warn"`: note the warning in scratchpad but proceed.
4. **Record artifacts**: Track outputs in `.ai-crew/state.json` → unit's `hatArtifacts` array:
   ```json
   {
     "hatId": "{hat.id}",
     "startedAt": "{ISO timestamp}",
     "completedAt": "{ISO timestamp}",
     "outputs": ["{list of files created/modified}"],
     "gateResults": [
       { "command": "{gate.command}", "passed": true/false, "output": "{summary}" }
     ]
   }
   ```
5. When ALL transition conditions (`hat.transitions`) are met, move to the next hat.

The pipeline for this project is:
{For each hat in config.yaml hats.pipeline, list:}
  **Hat {index}: {hat.name}** — {hat.description}
    Rules: {hat.rules or "none"}
    Quality Gates: {hat.qualityGates or "none"}
    Transitions: {hat.transitions}
{end for}

### Model Routing per Hat

For each hat, check `modelOverride` in config:
- **미지정 (기본)**: 현재 Agent 내에서 Hat 전환 (inline 모드)
- **provider 지정**: agent_chat MCP tool로 해당 모델 호출 (split 모드)
  - 예: reviewer에 `provider: "openai", model: "codex"` → Codex가 코드 리뷰
  - Cross-Check 패턴: Claude가 작성 → 다른 모델이 검증

---

## AIDLC Construction Rules

Read and follow these rule files for detailed construction guidance:
- `.ai-crew/aidlc-rule-details/construction/functional-design.md` -- for detailed business logic design
- `.ai-crew/aidlc-rule-details/construction/code-generation.md` -- for code generation patterns and rules
- `.ai-crew/aidlc-rule-details/construction/build-and-test.md` -- for build and test procedures

**Key rules from code-generation**:
- Application code goes in the workspace root (NEVER in `.ai-crew/`)
- For brownfield: modify existing files in-place (never create copies like `ClassName_modified.java`)
- For greenfield single-unit: use `src/`, `tests/`, `config/` in workspace root
- For greenfield multi-unit (microservices): `{unit-name}/src/`, `{unit-name}/tests/`
- For greenfield multi-unit (monolith): `src/{unit-name}/`, `tests/{unit-name}/`
- Add `data-testid` attributes to interactive UI elements

---

## Important Constraints

- You are working in an ISOLATED worktree. Do NOT modify files outside your branch.
- Communicate with Team Lead only if you are BLOCKED (missing interface, unclear requirement).
- Do NOT merge branches. The Team Lead handles integration via `/crew:integrate`.
- Do NOT use `git rebase`. Use merge only.
- State updates to `.ai-crew/state.json` should be surgical -- only update YOUR unit and tasks.

## Context Limit Handoff

If you are approaching your context window limit and cannot complete all tasks:
1. Commit all current progress (`wip: {unit-id} handoff - {summary}`)
2. Write a structured handoff note to `.ai-crew/scratchpad/{agent-name}-handoff.md` (see `.ai-crew/rules/global.md` for format)
3. Keep unit status as `"in-progress"` (do NOT mark as complete)
4. The Team Lead will re-spawn a fresh agent to continue from your handoff note on the same branch.
```

---

## Step 5: Update State

After spawning agents, immediately update `.ai-crew/state.json`:

```json
{
  "intent": {
    ...existing,
    "status": "executing",
    "updatedAt": "{now}"
  },
  "units": [
    {
      ...for each spawned unit,
      "status": "assigned",
      "assignedTo": "{agent-name}",
      "branch": "feature/{unit-id}",
      "currentHat": "{first hat id from pipeline}",
      "hatHistory": [
        { "from": null, "to": "{first hat id}", "reason": "Agent spawned", "timestamp": "{now}" }
      ],
      "hatArtifacts": [],
      "startedAt": "{now}"
    },
    ...other units unchanged
  ],
  "team": {
    "name": "crew-{intent-id}",
    "createdAt": "{now}",
    "agents": [
      { "name": "{agent-name}", "unitId": "{unit-id}", "status": "active" },
      ...
    ]
  },
  "events": [
    ...existing,
    { "type": "team:created", "payload": { "agentCount": {N} }, "timestamp": "{now}" },
    { "type": "unit:assigned", "payload": { "unitId": "{id}", "agent": "{name}" }, "timestamp": "{now}" },
    ...for each unit
  ]
}
```

---

## Step 6: Monitor & Continue

After the current wave of agents completes:

### 6.1: Check Results

1. Re-read `.ai-crew/state.json` to see updated unit statuses.
2. For each spawned unit:
   - If `status == "complete"`: success, note completion
   - If `status == "in-progress"` or `status == "assigned"`: agent may still be running or may have failed
   - If `status == "blocked"`: report the blocking reason to the user

3. Display a wave completion summary:
   ```
   Wave {N} Results:
     {unit-name}: COMPLETE ({task-count} tasks, {files-changed} files)
     {unit-name}: COMPLETE ({task-count} tasks, {files-changed} files)
     {unit-name}: BLOCKED -- {reason}

   Hat Artifact Summary:
     {unit-name}:
       planner: completed, 0 gates
       builder: completed, 1/1 gates passed
       reviewer: completed, 2/2 gates passed
   ```

### 6.2: Spawn Next Wave

After a wave completes, re-evaluate executable units:
1. Check which pending units now have all dependencies resolved
2. If new units are executable, prepare a new allocation plan
3. Show the plan to the user and request confirmation
4. Spawn the next wave of agents
5. Update state accordingly

Repeat until no more units remain.

### 6.3: Handle Handoff (Context Limit)

If a unit has `status == "in-progress"` and a handoff file exists at `.ai-crew/scratchpad/{agent-name}-handoff.md`:

1. Read the handoff note to understand progress and remaining work.
2. Re-spawn a new agent with `isolation: "worktree"` on the **existing feature branch** (`feature/{unit-id}`).
   The previous agent's commits are already on this branch, so the new worktree will have all prior progress.
   - Include the original agent prompt
   - **Plus** the handoff note content appended as "Previous Agent Handoff" section
   - The new agent continues from the hat and task where the previous one stopped
3. Update team info: replace old agent entry with new agent.
4. If the previous worktree still exists (not cleaned up), remove it first to avoid conflicts.

### 6.4: Handle Blocked Units

If any unit is blocked:
- Display the blocking reason
- Ask the user for guidance:
  - Provide missing information
  - Modify the unit's scope
  - Skip the unit
  - Manually unblock by resolving the dependency

---

## Step 7: Execution Complete

When all units have `status == "complete"`:

1. Update state:
   ```json
   {
     "intent": {
       ...existing,
       "status": "integrating",
       "updatedAt": "{now}"
     },
     "events": [
       ...existing,
       { "type": "team:disbanded", "payload": { "reason": "all units complete" }, "timestamp": "{now}" }
     ]
   }
   ```

2. Present the completion summary:

```markdown
# Construction Complete

## Intent
**{intent.description}**

## Unit Results
| Unit | Status | Tasks | Branch | Agent |
|------|--------|-------|--------|-------|
| {name} | Complete | {done}/{total} | feature/{id} | {agent} |
| ... | ... | ... | ... | ... |

## Branches Ready for Integration
{list of feature branches}

## Quality Gate Results (from hatArtifacts)
{for each unit, for each hat with gates:}
  {unit-name} → {hat-name}: {pass/fail per gate}
{end for}

## Agent Work Notes
See `.ai-crew/scratchpad/` for detailed implementation notes from each agent.

## Next Step
Run `/crew:integrate` to merge all feature branches, run cross-unit tests, and verify completion criteria.
```

---

## Multi-Provider Agents (Optional)

If `.ai-crew/config.yaml` defines `modelOverride` for specific hats in the pipeline:

For hats with `modelOverride.provider` specified, instead of executing inline, use the configured MCP tool (e.g., `agent_chat`) to send the hat's responsibilities to the specified model. The hat's rules file content and quality gates are included in the prompt sent to the external model.

This enables the **Cross-Check pattern**: one model writes code (Builder), another model reviews it (Reviewer with different provider).

This is an optional extension. The default behavior executes all hats inline within the same Claude Agent.

---

## Critical Rules

1. **Always verify state before acting** -- never spawn agents without a "ready" or "executing" intent.
2. **Worktree isolation is mandatory** -- every agent MUST use `isolation: "worktree"` to prevent conflicts.
3. **User confirms before spawning** -- never auto-spawn agents. Always show the allocation plan and get approval.
4. **Respect maxParallelUnits** -- do not exceed the configured limit from `config.yaml`.
5. **Agents are self-contained** -- each agent prompt must include ALL context needed. Agents cannot read each other's worktrees.
6. **State updates are surgical** -- agents only update their own unit/tasks in state.json. The Team Lead updates team-level state.
7. **Hat pipeline is mandatory** -- agents must follow the pipeline from config.yaml in order. No skipping.
8. **Quality gates are enforced** -- `failAction: "block"` gates MUST pass before hat transition. This compensates for Agent Teams' lack of completion verification.
9. **Artifacts are file-based** -- all hat outputs are recorded in state.json's hatArtifacts for crash recovery (Agent Teams don't support session resume).
10. **Monitor between waves** -- after each wave, check results before spawning the next wave.
11. **Feature branches are sacred** -- agents create code on feature branches only. No direct commits to main.
12. **Events are append-only** -- never remove events, only add new ones.
13. **Include AIDLC construction rules** -- each agent prompt must reference the construction rule files so agents follow the full methodology.
14. **Scratchpad for transparency** -- agents write their plans and notes to `.ai-crew/scratchpad/{agent-name}.md` so the Team Lead and user can review reasoning. Planner must use the structured format (Approach, Risks, Assumptions, Decisions).
15. **No rebase** -- agents must NOT use `git rebase`. Only merge is allowed. Rebase instructions are often ignored by Agent Teams and cause issues.
16. **Shared file awareness** -- before spawning parallel agents, analyze potential file conflicts. Assign shared file ownership to one unit when possible.
17. **Handoff on context limit** -- if an agent hits context limits, it must commit progress + write a structured handoff note. Team Lead re-spawns a continuation agent.
18. **Cost awareness** -- display pipeline cost estimation before user confirmation. Recommend 3-4 hats maximum for cost efficiency.

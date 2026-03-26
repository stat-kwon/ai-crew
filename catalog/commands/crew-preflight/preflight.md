# /crew:preflight - Pre-flight Check

You are executing a **pre-flight check** before graph-based construction. This command sits between `/crew:refine` and `/crew:run` in the workflow pipeline.

**Purpose**: Dynamic bundle setup + model authentication + git readiness verification.

**Non-destructive principle**: This command NEVER modifies `aidlc-docs/`, `.claude/agents/`, `.claude/skills/`, `CLAUDE.md`, or `.aidlc-rule-details/`. Only `.ai-crew/graph.yaml`, `.ai-crew/state.json`, `.ai-crew/config.yaml` (bundle name only), `.ai-crew/runs.json`, and `.ai-crew/runs/` (archiving) may be changed. `.ai-crew/scratchpad/` and `.ai-crew/checkpoints/` are moved (not deleted) to `.ai-crew/runs/{runId}/` during archiving.

---

## Step 0: Environment Detection

1. Read `.ai-crew/config.yaml`. If missing:
   - "No AI-Crew installation found. Run `ai-crew install --team <name> --target <path>` first."
   - Stop.
2. Read `.ai-crew/graph.yaml` (may not exist yet).
3. Read `.ai-crew/state.json`. If missing:
   - "No state found. Run `/crew:elaborate` first."
   - Stop.
4. Check for `aidlc-docs/` → determine native AI-DLC mode.
5. Read `defaults.locale` from config.yaml (default: `"en"`).

---

## Step 0.5: Run History Check

Check if a previous run exists and archive it before starting a new one.

1. Read `state.json`. If any node has status `completed` or `failed`:
   - A previous run exists and needs archiving.

2. Ask the user for the **intent** of the new run:
   ```
   Previous run detected ({N} nodes completed, {M} failed).
   What is this new run about?

   Examples: initial-build, fix-auth-bug, add-monitoring, refactor-graph
   ```
   Wait for user input.

3. Generate Run ID:
   - Slugify the user's intent input (lowercase, hyphens, max 30 chars)
   - Format: `{slug}-{YYYYMMDD}-{seq}` (seq increments if same slug+date exists in `runs.json`)
   - If `aidlc-docs/inception/requirements/` exists, suggest intent from requirements

4. Create manifest from current state:
   - Read `state.json` for node outcomes
   - Read scratchpad files for each completed/failed node: extract `## How` section for `keyDecisions`
   - Build `RunManifest` with `schema: "ai-crew.run.v1"`

5. Archive the previous run:
   ```bash
   # Move artifacts to archive
   mkdir -p .ai-crew/runs/{prevRunId}/
   # Move scratchpad and checkpoints (not copy — to prevent disk bloat)
   mv .ai-crew/scratchpad/ .ai-crew/runs/{prevRunId}/scratchpad/
   mv .ai-crew/checkpoints/ .ai-crew/runs/{prevRunId}/checkpoints/
   cp .ai-crew/state.json .ai-crew/runs/{prevRunId}/state-snapshot.json
   # Write manifest
   # Write to .ai-crew/runs/{prevRunId}/manifest.json
   ```

6. Update `.ai-crew/runs.json`:
   - Add/update previous run entry with `state: "archived"`
   - Add new run entry with `state: "preparing"`
   - Update stats

7. Apply retention policy:
   - Read `defaults.runs.retention` from config.yaml (default: 5)
   - If archived runs exceed retention, delete oldest run directories and remove from `runs.json`

8. Reset `state.json` for new run:
   - Set `runId` to the new Run ID
   - Set `version` to `"3.1"`
   - Reset all node statuses to `"pending"`

9. Display summary:
   ```
   Archived: {prevRunId} ({N} nodes completed, {M} failed)
   Starting: {newRunId}
   ```

If no completed/failed nodes exist (fresh state): set `runId` in state.json and proceed to Step 1.

---

## Step 1: Bundle Decision

Present the current state and four options:

```
Pre-flight: Bundle Configuration

Current bundle: {bundle name from config.yaml}
Current graph: {N nodes across M levels} (or "no graph defined")

How would you like to configure the execution graph?

A) Use existing bundle as-is
   Keep current graph.yaml. Proceed to model check.

B) Customize graph based on design artifacts
   Read aidlc-docs/ to propose a modified graph. Agents/skills stay within what's installed.

C) Create temporary graph (project-local)
   Auto-generate a fresh graph from design. Only .ai-crew/graph.yaml is modified.
   Not saved to catalog — only used for this project.

D) Create official bundle (add to catalog)
   Use workflow-composer skill to create catalog/bundles/{name}/bundle.yaml.
   Extract graph into .ai-crew/graph.yaml (no re-install needed).
   Reusable across projects.
```

Wait for user selection before proceeding.

### Option A: Use as-is
- Skip Step 2 (Graph Proposal), but **still validate**: run the validation rules from Step 2.4 against the existing graph.yaml.
  If validation fails, display errors and offer to switch to Option B (customize) or Option C (recreate).
- Compute and display levels using the algorithm from Step 2.5.
- Display current graph as ASCII for confirmation.
- Proceed to Step 3 (Model Check).

### Option B: Customize graph
- Proceed to Step 2 with **modification mode** (read current graph as base, propose changes).

### Option C: Temporary graph
- Proceed to Step 2 with **creation mode** (generate fresh graph from design).
- After approval: update `.ai-crew/config.yaml` bundle field to `"local-{YYYYMMDD}"`.

### Option D: Official bundle
1. Invoke the **workflow-composer** skill (read `.claude/skills/workflow-composer/SKILL.md`).
2. The skill creates `catalog/bundles/{name}/bundle.yaml`.
3. After bundle creation, **extract graph** from the new bundle.yaml:
   - Parse `graph.nodes` from the generated bundle.yaml.
   - Write to `.ai-crew/graph.yaml`.
   - Update `.ai-crew/config.yaml` bundle field to the new bundle name.
   - Rebuild `.ai-crew/state.json` with new node list (all `"pending"`).
4. **Check for missing agents/skills**:
   - Compare bundle's `includes.agents` with files in `.claude/agents/`.
   - Compare bundle's `includes.skills` with files in `.claude/skills/`.
   - If all present: proceed normally.
   - If missing:
     ```
     The following are required by the new bundle but not installed:
       Agents: {missing list}
       Skills: {missing list}

     Options:
       1) Adjust graph to use only installed agents/skills
       2) Run ai-crew install --team {name} --target . --force
          WARNING: This resets .ai-crew/state.json and scratchpad/
       3) Manually copy missing files and continue
     ```
5. Do NOT run `ai-crew install` automatically.

---

## Step 2: Graph Proposal (Design-Based)

**Executes for Option B and C only.**

### 2.1: Read Design Artifacts

Scan for design documents (read-only):
- `aidlc-docs/inception/application-design/tasks.md` — `## Node: {id}` sections with agent, skills, tasks
- `aidlc-docs/inception/application-design/unit-of-work.md` — unit definitions
- `aidlc-docs/inception/application-design/unit-of-work-dependency.md` — dependency matrix
- If no aidlc-docs: check `.ai-crew/specs/` for lightweight specs.

### 2.2: Discover Installed Agents & Skills

```bash
ls .claude/agents/    # Available agent definitions
ls .claude/skills/    # Available skill definitions
```

Only propose nodes using installed agents and skills.

### 2.3: Generate Graph Nodes

For each unit-of-work from the design:

1. **id**: snake_case from unit name.
2. **type**: `worker` (default), `aggregator` for review/gate nodes.
3. **agent**: Match unit domain to installed agents:
   - frontend/UI/React → `frontend-dev`
   - backend/API/Node → `backend-dev`
   - database/schema → `backend-dev`
   - test/TDD → `tester`
   - review/quality → `reviewer`
   - plan/design → `planner`
   - security → `reviewer`
4. **skills**: Match unit technology to installed skills.
5. **depends_on**: From design dependency chain.
6. **config.isolation**: `worktree` for workers, `none` for planners/routers.
7. **config.model**: Use bundle defaults unless design specifies otherwise.

### 2.4: Validate Graph (Canonical Validation Point)

This step is the **single source of truth (SSOT)** for graph validation. The `/crew:run` command trusts this validation via `graphHash` and only re-validates as a fallback when the graph changes after preflight.

Apply all rules from `src/graph.ts::validateGraph()` plus file existence checks:

**Structural rules** (same as `src/graph.ts::validateGraph()`):
- No duplicate node IDs
- No dangling depends_on references
- No cycles (Kahn's algorithm)
- At least one root node (empty depends_on)
- `verify` field must be string[] if present
- `config.retry` must be integer 0-3 if present

**Semantic rules**:
- Router nodes have `config.isolation: none`
- Aggregator nodes have `wait: all | any`

**File existence checks**:
- All referenced agents exist in `.claude/agents/`
- All referenced skills exist in `.claude/skills/`

### 2.5: Display & Approve

**Level computation** (Kahn's topological sort — same algorithm as `src/graph.ts::computeLevels()`):
1. Level 0: All nodes with empty `depends_on` (root nodes)
2. Level N: Nodes whose ALL dependencies are assigned to levels < N
3. Nodes at the same level can execute in parallel

This is identical to the algorithm used by `/crew:run` Step 1 for execution ordering.

Show proposed graph as ASCII diagram:

```
Proposed Graph ({N} nodes, {M} levels):

Level 0: [node_a]
Level 1: [node_b] [node_c] [node_d]  (parallel)
Level 2: [node_e]                     (depends on b,c,d)
Level 3: [review]                     (aggregator, wait: all)
```

Show full node details in a table:

```
| Node | Type | Agent | Skills | Depends On | Model |
|------|------|-------|--------|------------|-------|
| ... | ... | ... | ... | ... | ... |
```

Ask user:
- **Approve**: Write graph.yaml + rebuild state.json
- **Modify**: Let user describe changes, regenerate
- **Cancel**: Return to Step 1

### 2.6: Write Files

On approval:
1. Write `.ai-crew/graph.yaml` with the proposed graph.
2. Rebuild `.ai-crew/state.json`: keep `version` and `bundleName`, replace `nodes` with new set (all `"pending"`).
3. If Option C: update `.ai-crew/config.yaml` bundle field to `"local-{YYYYMMDD}"`.

---

## Step 3: Model Check

### 3.1: Extract Models

Parse all model references from the graph:
- Each node's `config.model` (if set)
- `defaults.model` from `.ai-crew/config.yaml`

### 3.2: Classify Models

| Pattern | Provider | Auth Required |
|---------|----------|--------------|
| `claude-*` | Anthropic | No (built-in) |
| `codex*` | Codex CLI | Yes |
| `gpt-*`, `o3*` | OpenAI | Yes |
| `gemini-*` | Google | Yes |

### 3.3: Check Authentication

For each non-Claude model, check in order:

**Codex** (checks must match `catalog/mcp/multi-provider/src/providers/codex.ts` credential resolution):
```bash
# 1. Check env var (highest priority)
[ -n "$CODEX_ACCESS_TOKEN" ] && echo "CODEX_ACCESS_TOKEN: set" || echo "CODEX_ACCESS_TOKEN: not set"

# 2. Check macOS Keychain (must match exact service name used by codex CLI)
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
CODEX_HASH=$(echo -n "$CODEX_HOME" | shasum -a 256 | cut -c1-16)
security find-generic-password -s "Codex Auth" -a "cli|${CODEX_HASH}" -w 2>/dev/null && echo "Keychain (Codex Auth): found" || echo "Keychain (Codex Auth): not found"

# 3. Check file credential (~/.codex/auth.json)
[ -f "${CODEX_HOME}/auth.json" ] && echo "auth.json: found" || echo "auth.json: not found"
```

**Important**: If none of the above succeed, Codex nodes will fail at runtime. Do NOT fall back to `OPENAI_API_KEY` — that is for OpenAI provider, not Codex. If user has `codex auth` configured, one of the three checks above must pass.

**OpenAI (gpt-\*)**:
```bash
[ -n "$OPENAI_API_KEY" ] && echo "set" || echo "not set"
```

**Google (gemini-\*)**:
```bash
[ -n "$GOOGLE_API_KEY" ] && echo "set" || echo "not set"
```

### 3.4: Report & Fix

```
Model Authentication Check:

  [PASS] claude-sonnet-4 — built-in
  [PASS] claude-opus-4 — built-in
  [FAIL] codex — no token found

Affected nodes: security, review, qa

Options:
  1) Authenticate now: type `! codex auth` to login
  2) Set environment variable: export CODEX_ACCESS_TOKEN=...
  3) Replace with Claude model in graph.yaml
  4) Skip (nodes may fail at runtime)
```

If user chooses option 3:
- Ask which Claude model to use (default: `claude-sonnet-4`).
- Update the affected nodes in `.ai-crew/graph.yaml`.
- Display updated node list.

Record results for state.json.

---

## Step 4: Git Readiness

### 4.1: Check Working Tree

```bash
git status --short
```

If output is non-empty (dirty):
```
Git Status: DIRTY

Uncommitted changes:
  {git status output}

Worktree agents require a clean working tree.

Options:
  A) Auto-commit all changes
     git add -A && git commit -m "crew: pre-flight commit"
  B) Stash changes
     git stash push -m "crew-preflight-{timestamp}"
  C) Abort — fix manually and re-run /crew:preflight
```

Execute chosen option, then re-check.

### 4.2: Check Stale Worktrees

```bash
git worktree list
```

If any worktrees matching `crew/` pattern exist:
```
Stale worktrees detected:
  {worktree list}

Run `git worktree prune` to clean up? (y/n)
```

### 4.3: Verify Clean State

Final check:
```bash
git status --short
```
Must be empty. If not, report remaining issues and stop.

---

## Step 5: Summary & Record

### 5.1: Display Summary

```
========================================
  Pre-flight Check Complete
========================================

Bundle:   {name}
Graph:    {N nodes, M levels}
Models:   {all verified / N authenticated, M skipped}
Git:      clean

Next step: /crew:run
```

### 5.2: Update State

Compute `graphHash` by reading the raw content of `.ai-crew/graph.yaml` and generating its SHA-256 hash:
```bash
shasum -a 256 .ai-crew/graph.yaml | cut -d ' ' -f 1
```
This hash allows `/crew:run` to detect if the graph changed since preflight.

Write preflight state to `.ai-crew/state.json`:

```json
{
  "version": "3.1",
  "bundleName": "{name}",
  "runId": "{current run ID}",
  "preflight": {
    "completedAt": "{ISO 8601 timestamp}",
    "modelsVerified": ["{model1}", "{model2}"],
    "modelsSkipped": ["{model3}"],
    "gitClean": true,
    "graphHash": "{SHA-256 of graph.yaml content}"
  },
  "nodes": {
    "{node_id}": { "status": "pending", "startedAt": null, "completedAt": null },
    ...
  }
}
```

### 5.3: Log in Audit (if native AI-DLC)

Append to `aidlc-docs/audit.md`:
```markdown
## Pre-flight Check
**Timestamp**: {ISO 8601}
**Bundle Decision**: {A/B/C/D — description}
**Graph**: {N nodes, M levels}
**Models Verified**: {list}
**Models Skipped**: {list}
**Git Status**: clean
**Context**: Pre-flight validation before /crew:run
```

---

## Critical Rules

1. **Non-destructive**: Never modify aidlc-docs/, agents/, skills/, CLAUDE.md, or .aidlc-rule-details/.
2. **Allowed modifications**: `.ai-crew/graph.yaml`, `state.json`, `config.yaml` (bundle name), `runs.json`, and `runs/` (archiving).
3. **Run archival**: Step 0.5 archives previous runs to `.ai-crew/runs/{runId}/`. Scratchpad and checkpoints are moved (not copied) to prevent disk bloat. `runs.json` is the registry.
4. **Retention policy**: Oldest archived runs are pruned per `defaults.runs.retention` (default: 5).
5. **No silent fallback**: If model auth fails, explicitly report and ask — never silently substitute.
6. **No auto-install**: Never run `ai-crew install --force` automatically. Always inform the user of consequences.
7. **Git must be clean**: Do not proceed to /crew:run until git status is clean. This is a hard gate, not a soft warning.
8. **Locale-aware**: Use `defaults.locale` for user-facing output.
9. **Design artifacts are read-only**: Read aidlc-docs/ for graph proposal but never write to it.

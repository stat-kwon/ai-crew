# /crew:preflight - Pre-flight Check

You are executing a **pre-flight check** before graph-based construction. This command sits between `/crew:refine` and `/crew:run` in the workflow pipeline.

**Purpose**: Dynamic bundle setup + model authentication + git readiness verification.

**Non-destructive principle**: This command NEVER modifies `aidlc-docs/`, `CLAUDE.md`, or `.aidlc-rule-details/`. It MAY add new files to `.claude/agents/` and `.claude/skills/` (provisioning from catalog). Only `.ai-crew/graph.yaml`, `.ai-crew/state.json`, `.ai-crew/config.yaml`, `.ai-crew/runs.json`, `.ai-crew/runs/` (archiving), and `.ai-crew/rules/` (sync) may be changed. `.ai-crew/scratchpad/` and `.ai-crew/checkpoints/` are moved (not deleted) to `.ai-crew/runs/{runId}/` during archiving.

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

## Step 1: Dynamic Graph Setup

This step analyzes design artifacts and dynamically provisions the execution graph.

### 1.1: Detect Installation Mode

Read `.ai-crew/config.yaml`:
- If `bundle: "none"` → **Dynamic mode** (minimal install, proceed to 1.2)
- If `bundle: "<name>"` → **Bundle mode** (full install with existing graph)

**Bundle mode**: Check if `.ai-crew/graph.yaml` exists and is valid.
  - If valid: display graph summary, ask user:
    - **Keep**: Proceed to Step 3 (Model Check)
    - **Regenerate**: Continue to 1.2 (treat as dynamic mode)
  - If missing/invalid: Continue to 1.2

### 1.2: Scan Design Artifacts

Read design documents (read-only):
- `aidlc-docs/inception/application-design/tasks.md` — `## Node: {id}` sections
- `aidlc-docs/inception/application-design/unit-of-work.md` — unit definitions
- `aidlc-docs/inception/application-design/unit-of-work-dependency.md` — dependency matrix
- If no aidlc-docs: check `.ai-crew/specs/` for lightweight specs

If no design artifacts found:
- "No design artifacts found. Run `/crew:elaborate` first."
- Stop.

### 1.3: Scan Available Catalog

Read `.ai-crew/catalog-manifest.json`:
- List available agents with names
- List available skills with names
- List available bundle presets

If manifest is missing:
- "catalog-manifest.json not found. Re-run `ai-crew install --target .` to regenerate."
- Stop.

Display:
```
Available from catalog:
  Agents: planner, frontend-dev, backend-dev, reviewer, qa-engineer, ...
  Skills: planning, frontend-react, backend-node, testing, code-review, ...
  Bundle presets: fullstack, lightweight, aidlc-standard, ...
```

### 1.4: Generate Graph Proposal

For each unit-of-work from the design:
1. **id**: snake_case from unit name
2. **type**: `worker` (default), `aggregator` for review/gate nodes
3. **agent**: Match unit domain to available agents (from manifest):
   - frontend/UI/React → `frontend-dev`
   - backend/API/Node → `backend-dev`
   - database/schema → `backend-dev`
   - test/TDD → `tester`
   - review/quality → `reviewer`
   - plan/design → `planner`
4. **skills**: Match unit technology to available skills
5. **depends_on**: From design dependency chain
6. **config.isolation**: `worktree` for workers, `none` for planners/routers
7. **config.model**: Use defaults from config.yaml

If a matching bundle preset exists, mention it:
```
Tip: This graph resembles the "fullstack" bundle preset.
```

### 1.5: Validate Graph (SSOT)

This step is the **single source of truth** for graph validation. `/crew:run` trusts this via `graphHash`.

Apply all rules from `src/graph.ts::validateGraph()`:
- No duplicate node IDs
- No dangling depends_on references
- No cycles (Kahn's algorithm)
- At least one root node
- Router nodes have `config.isolation: none`
- Aggregator nodes have `wait: all | any`

Plus: All referenced agents and skills exist in catalog-manifest.json.

### 1.6: Display & Approve

**Level computation** (Kahn's topological sort — `src/graph.ts::computeLevels()`):
1. Level 0: All nodes with empty `depends_on`
2. Level N: Nodes whose ALL dependencies are in levels < N

Show proposed graph as ASCII diagram:
```
Proposed Graph ({N} nodes, {M} levels):

Level 0: [node_a]
Level 1: [node_b] [node_c] [node_d]  (parallel)
Level 2: [node_e]                     (depends on b,c,d)
Level 3: [review]                     (aggregator, wait: all)
```

Show full node details table:
```
| Node | Type | Agent | Skills | Depends On | Model |
|------|------|-------|--------|------------|-------|
```

Ask user:
- **Approve**: Proceed to 1.7
- **Modify**: User describes changes, regenerate from 1.4
- **Cancel**: Stop

### 1.7: Provision Agents & Skills

On approval, copy needed agents and skills from catalog to project.
Read `catalog-manifest.json` for source paths.

For each agent referenced in the graph:
```bash
if [ ! -f ".claude/agents/{agent-name}.md" ]; then
  mkdir -p .claude/agents/
  cp {sourcePath}/{agent-name}.md .claude/agents/{agent-name}.md
fi
```

For each skill referenced in the graph:
```bash
if [ ! -d ".claude/skills/{skill-name}" ]; then
  mkdir -p .claude/skills/{skill-name}/
  cp {sourcePath}/SKILL.md .claude/skills/{skill-name}/SKILL.md
fi
```

Display:
```
Provisioned from catalog:
  Agents: planner, frontend-dev, backend-dev, reviewer (4 new)
  Skills: planning, frontend-react, backend-node, testing (4 new)
```

### 1.8: Write Files

1. Write `.ai-crew/graph.yaml` with the approved graph
2. Rebuild `.ai-crew/state.json`: set nodes from graph (all `"pending"`)
3. Update `.ai-crew/config.yaml` bundle field to `"dynamic-{YYYYMMDD}"`

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

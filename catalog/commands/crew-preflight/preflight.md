# /crew:preflight - Pre-flight Check

You are executing a **pre-flight check** before graph-based construction. This command sits between `/crew:refine` and `/crew:run` in the workflow pipeline.

**Purpose**: Dynamic bundle setup + model authentication + git readiness verification.

**Non-destructive principle**: This command NEVER modifies `aidlc-docs/`, `.ai-crew/scratchpad/`, `.claude/agents/`, `.claude/skills/`, `CLAUDE.md`, or `.aidlc-rule-details/`. Only `.ai-crew/graph.yaml`, `.ai-crew/state.json`, and `.ai-crew/config.yaml` (bundle name only) may be changed.

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
- Skip Step 2 (Graph Proposal).
- Proceed to Step 3 (Model Check).
- Display current graph as ASCII for confirmation.

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

### 2.4: Validate Graph

Apply the same rules as `src/graph.ts::validateGraph()`:
- No duplicate node IDs
- No dangling depends_on references
- No cycles
- At least one root node (empty depends_on)
- Router nodes have `isolation: none`
- Aggregator nodes have `wait` field

### 2.5: Display & Approve

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

**Codex**:
```bash
# Check env var (do NOT echo the value)
[ -n "$CODEX_ACCESS_TOKEN" ] && echo "CODEX_ACCESS_TOKEN: set" || echo "CODEX_ACCESS_TOKEN: not set"
# Check macOS Keychain
security find-generic-password -s "codex" -w 2>/dev/null && echo "Keychain: found" || echo "Keychain: not found"
# Fallback: check OPENAI_API_KEY
[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_API_KEY: set" || echo "OPENAI_API_KEY: not set"
```

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

Write preflight state to `.ai-crew/state.json`:

```json
{
  "version": "3.0",
  "bundleName": "{name}",
  "preflight": {
    "completedAt": "{ISO 8601 timestamp}",
    "modelsVerified": ["{model1}", "{model2}"],
    "modelsSkipped": ["{model3}"],
    "gitClean": true
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

1. **Non-destructive**: Never modify aidlc-docs/, scratchpad/, agents/, skills/, CLAUDE.md, or .aidlc-rule-details/.
2. **Graph-only changes**: Only .ai-crew/graph.yaml, state.json, and config.yaml (bundle name) may be modified.
3. **No silent fallback**: If model auth fails, explicitly report and ask — never silently substitute.
4. **No auto-install**: Never run `ai-crew install --force` automatically. Always inform the user of consequences.
5. **Git must be clean**: Do not proceed to /crew:run until git status is clean. This is a hard gate, not a soft warning.
6. **Locale-aware**: Use `defaults.locale` for user-facing output.
7. **Design artifacts are read-only**: Read aidlc-docs/ for graph proposal but never write to it.

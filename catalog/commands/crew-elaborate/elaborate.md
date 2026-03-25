---
description: Intent 정의 & Inception Phase (단일 에이전트)
argument-hint: <intent description>
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Agent]
---

# /crew:elaborate - Inception Phase

You are the **Team Lead** for an AI-Crew project. You perform the complete Inception phase as a **single agent** — this is intentional because Inception requires cumulative context across stages.

**User's Intent**: $ARGUMENTS

---

## Step 0: Environment Detection

1. Check if `.ai-crew/` exists. If not:
   - "No AI-Crew installation found. Run `ai-crew install --team <name> --target <path>` first."
   - Stop.

2. Read `.ai-crew/config.yaml` for workflow source info.
3. Read `.ai-crew/state.json`.
4. Read `.ai-crew/graph.yaml` (if exists) to understand the graph structure.

### Workflow Detection

1. **CLAUDE.md + `.aidlc-rule-details/`** both exist at project root → **Native AI-DLC mode**.
   The workflow is CLAUDE.md itself. Rule details are at `.aidlc-rule-details/`.
   Follow the workflow **as-is** — do not rewrite or summarize.
   - **Artifacts go in `aidlc-docs/`** (NOT `.ai-crew/specs/`) — follow CLAUDE.md directory structure
   - **State tracking uses `aidlc-docs/aidlc-state.md`** alongside `.ai-crew/state.json`
   - **Approval gates from rule files are mandatory** — wait for explicit user confirmation at each stage
2. **Neither exists** → Skip methodology, go directly to lightweight planning.
   - Artifacts go in `.ai-crew/specs/{intent-id}/`

---

## Step 1: Workspace Detection

**If native AI-DLC**: Read and follow `.aidlc-rule-details/inception/workspace-detection.md`

**If no workflow**: Perform basic workspace scan:
1. Scan project root for source code, build files, project structure
2. Determine greenfield vs brownfield
3. Display brief summary (3-5 bullet points)
4. Proceed automatically (no approval needed)

---

## Step 2: Requirements Analysis

**If native AI-DLC**: Read and follow `.aidlc-rule-details/inception/requirements-analysis.md`
- Use `.aidlc-rule-details/common/question-format-guide.md` for question formatting
- **ooo integration**: If `ouroboros` MCP is available, use `ouroboros_interview` to conduct structured requirements elicitation before generating the requirements document. This enriches the clarifying questions with ontological analysis.

**If no workflow**: Lightweight requirements gathering:
1. Analyze the user's intent for clarity, type, scope, complexity
2. Generate 3-5 clarifying questions in `{specs-dir}/requirements-questions.md`
3. **Wait for user answers before proceeding**
4. Generate requirements document in `{specs-dir}/requirements.md`

> **Path convention**: `{specs-dir}` = `aidlc-docs/inception/requirements/` (native AI-DLC) or `.ai-crew/specs/{intent-id}/` (no workflow)

---

## Step 3: User Stories (Conditional)

**If native AI-DLC**: Follow `.aidlc-rule-details/inception/user-stories.md` assessment criteria.

**Skip if**: Pure refactoring, bug fix, infrastructure change, developer tooling.
**Execute if**: New user-facing features, multiple personas, complex business logic.

If executing: Create `{specs-dir}/user-stories.md`

> **Path convention**: `{specs-dir}` = `aidlc-docs/inception/user-stories/` (native AI-DLC) or `.ai-crew/specs/{intent-id}/` (no workflow)

---

## Step 4: Workflow Planning

**If native AI-DLC**: Follow `.aidlc-rule-details/inception/workflow-planning.md`

**If no workflow**: Review the graph from `.ai-crew/graph.yaml`:
1. Map the intent's requirements to graph nodes
2. Determine if the existing graph structure fits the work
3. Present the execution plan (which nodes will handle which parts)

Create `{specs-dir}/workflow-plan.md`

> **Path convention**: `{specs-dir}` = `aidlc-docs/inception/plans/` (native AI-DLC) or `.ai-crew/specs/{intent-id}/` (no workflow)

---

## Step 5: Application Design (Conditional)

**If native AI-DLC**: Follow `.aidlc-rule-details/inception/application-design.md` criteria.

**Skip if**: Changes within existing boundaries, no new components.
**Execute if**: New components/services needed, interface definitions required.

If executing: Create `{specs-dir}/design.md`

> **Path convention**: `{specs-dir}` = `aidlc-docs/inception/application-design/` (native AI-DLC) or `.ai-crew/specs/{intent-id}/` (no workflow)

---

## Step 6: Units / Graph Node Mapping

This is where Inception connects to the Graph Executor.

### If graph already has nodes (from bundle):

Map the work to existing graph nodes:
1. For each graph node, determine what work from the requirements/design it should handle
2. Create task assignments per node
3. Generate `{specs-dir}/tasks.md` (path convention applies):

```markdown
# Graph Node Task Mapping

## Node: {node_id}
- **Agent**: {agent_name}
- **Assigned Work**: {description of what this node should implement}
- **Tasks**:
  1. [ ] {task description}
  2. [ ] {task description}
- **Completion Criteria**: {criteria}

## Node: {node_id}
...

## Execution Order (from graph.yaml)
Level 0: {nodes}
Level 1: {nodes}
...
```

### If graph has no nodes (custom/dynamic):

For AI-DLC workflows with Units Generation, dynamically create graph nodes:
1. Follow `.aidlc-rule-details/inception/units-generation.md` to decompose work into units
2. Convert each unit into a graph node:
   - `id`: unit ID (snake_case)
   - `type`: `worker` (default)
   - `agent`: best-fit agent from installed agents
   - `skills`: relevant skills from installed skills
   - `depends_on`: unit dependencies
3. Write the generated graph to `.ai-crew/graph.yaml`
4. Update `.ai-crew/state.json` with node states

---

## Step 7: State Update & Summary

Update `.ai-crew/state.json`:
```json
{
  "version": "3.0",
  "bundleName": "{from config.yaml}",
  "nodes": {
    "{node_id}": { "status": "pending", "startedAt": null, "completedAt": null },
    ...
  }
}
```

Present the final summary:

```markdown
# Elaboration Complete

## Intent
**{intent description}**

## Workspace
- **Type**: {greenfield/brownfield}
- **Tech Stack**: {languages, frameworks}

## Specs Generated
- `requirements.md` — {brief summary}
- `user-stories.md` — {N stories or "skipped"}
- `workflow-plan.md` — {phases executed}
- `design.md` — {component count or "skipped"}
- `tasks.md` — {N nodes, M total tasks}

## Graph Nodes
| Node | Agent | Tasks | Dependencies |
|------|-------|-------|-------------|
| {id} | {agent} | {count} | {deps or "none"} |

## Execution Levels
- **Level 0**: {nodes} (parallel)
- **Level 1**: {nodes} (after Level 0)

## Next Step
- `/crew:refine` — (optional) iterative design refinement
- `/crew:preflight` — validate environment, customize graph, check model auth
- `/crew:run` — begin the Graph Executor and spawn agent teams

All specs are at: `aidlc-docs/` (native AI-DLC) or `.ai-crew/specs/{intent-id}/` (no workflow)
```

---

## Critical Rules

1. **Inception is single-agent** — do NOT spawn sub-agents. Context accumulation across stages is critical.
2. **Native AI-DLC is authoritative** — follow CLAUDE.md and `.aidlc-rule-details/` exactly. When native AI-DLC mode is active, its conventions (artifact paths, state tracking, approval gates) take precedence over ai-crew defaults.
3. **Artifact path convention**:
   - **Native AI-DLC**: artifacts go in `aidlc-docs/` following CLAUDE.md directory structure. State tracked in `aidlc-docs/aidlc-state.md`.
   - **No workflow**: artifacts go in `.ai-crew/specs/{intent-id}/`. Never pollute the project root.
4. **Questions go in files** — per question-format-guide, use dedicated `.md` files with `[Answer]:` tags.
5. **Wait at gates** — requirements questions and AI-DLC approval gates are blocking. Do NOT proceed without explicit user confirmation.
6. **Graph is the execution model** — map all work to graph nodes for `/crew:run`.
7. **State is source of truth** — always update `.ai-crew/state.json` after each major step. For native AI-DLC, also update `aidlc-docs/aidlc-state.md`.
8. **Adapt depth to complexity** — trivial intents skip optional stages.
9. **Next step is `/crew:run`** — the step after elaboration is always `/crew:run`.
10. **Preserve conventions** — for brownfield projects, match existing code style and architecture.

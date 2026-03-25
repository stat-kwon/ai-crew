---
description: 현재 AI-Crew Graph 워크플로우 상태 조회
allowed-tools: [Read, Glob, Grep]
---

# /crew:status -- Show AI-Crew State

Display the current status of the AI-Crew Graph workflow. Read state and graph files, format clearly, and show what's happening and what the user can do next.

---

## Step 0: Read State & Graph

1. Read `.ai-crew/state.json`.
   - If the file does not exist, go to Step 1 (no installation).
2. Read `.ai-crew/graph.yaml` (if exists).
3. Read `.ai-crew/config.yaml` (if exists).
4. Read `aidlc-docs/aidlc-state.md` (if exists) — this tracks AI-DLC stage progression across Inception and Construction phases.
5. Read `.ai-crew/runs.json` (if exists) — run history registry.

---

## Step 1: Handle No Installation

If state file does not exist:

```
══════════════════════════════════
  AI-Crew Status
══════════════════════════════════

  No AI-Crew installation found.

  Get started:
    ai-crew install --team <name> --target <path>

══════════════════════════════════
```

Stop here.

---

## Step 2: Display Formatted Status

### 2.1 Header

```
══════════════════════════════════════════════════════════════
  AI-Crew Status
══════════════════════════════════════════════════════════════

  Bundle:     {state.bundleName}
  Version:    {state.version}
```

### 2.1.5 Run History (if runs.json exists)

If `.ai-crew/runs.json` was loaded and has entries, display run history:

```
  Run History:
  ┌──────────────────────────────────┬───────────────────────────┬───────────┬─────────┐
  │ Run ID                           │ Intent                    │ Status    │ Nodes   │
  ├──────────────────────────────────┼───────────────────────────┼───────────┼─────────┤
  │ initial-build-20260324-1         │ Graph executor 초기 구현   │ archived  │ 10/10   │
  │ fix-auth-20260325-1              │ 인증 모듈 버그 수정        │ archived  │ 3/3     │
  │ add-monitoring-20260325-1        │ 모니터링 추가             │ running   │ 0/5     │
  └──────────────────────────────────┴───────────────────────────┴───────────┴─────────┘

  Current Run: add-monitoring-20260325-1
  Total: 3 runs (2 completed, 0 failed)
```

If no runs.json exists, skip this section.

### 2.2 Graph Nodes

Read `state.nodes` and `graph.yaml` nodes, display a formatted table:

```
  Graph Nodes:
  ┌──────────────┬────────────┬─────────────┬─────────────────┬──────────────┐
  │ Node         │ Type       │ Agent       │ Status          │ Branch       │
  ├──────────────┼────────────┼─────────────┼─────────────────┼──────────────┤
  │ plan         │ worker     │ planner     │ completed       │ --           │
  │ frontend     │ worker     │ frontend-dev│ running         │ crew/frontend│
  │ backend      │ worker     │ backend-dev │ running         │ crew/backend │
  │ review       │ aggregator │ reviewer    │ pending         │ --           │
  └──────────────┴────────────┴─────────────┴─────────────────┴──────────────┘

  Status: 1 completed, 2 running, 1 pending
```

Status indicators:
- `pending` — not yet started
- `running` — agent actively working
- `completed` — done
- `skipped` — condition not met or skipped
- `failed` — error occurred

### 2.3 Execution Levels

Read graph.yaml and compute execution levels:

```
  Execution Levels:
    Level 0: plan (completed)
    Level 1: frontend (running), backend (running)
    Level 2: review (pending — waiting for Level 1)
```

### 2.4 Scratchpad Outputs

List scratchpad files sorted by level prefix:

```
  Scratchpad:
    .ai-crew/scratchpad/L0-plan.md         (exists)
    .ai-crew/scratchpad/L1-frontend.md     (not yet)
    .ai-crew/scratchpad/L1-backend.md      (not yet)
    .ai-crew/scratchpad/L2-review.md       (not yet)
```

### 2.5 AI-DLC Stage Status (if aidlc-state.md exists)

If `aidlc-docs/aidlc-state.md` was loaded in Step 0, display the AI-DLC stage progression:

```
  AI-DLC Stages:
    INCEPTION:
      Workspace Detection    ✓ completed
      Requirements Analysis  ✓ completed
      User Stories            ✓ completed
      Workflow Planning       ✓ completed
      Application Design     ○ skipped
      Units Generation       ✓ completed
    CONSTRUCTION:
      Level 0                ✓ completed
      Level 1                ● running
      Level 2                ○ pending
```

Parse `aidlc-state.md` for stage completion markers and display alongside graph node status.

### 2.6 Specs (if elaboration was done)

Check if `.ai-crew/specs/` or `aidlc-docs/inception/` has content:

```
  Specs:
    requirements.md     ✓
    workflow-plan.md    ✓
    tasks.md            ✓
    design.md           (not created)
```

---

## Step 3: Show Available Next Actions

Based on current node statuses:

**If all nodes are `pending`:**
```
  Next Actions:
    /crew:elaborate <intent>    Define intent and map to graph nodes
    /crew:run                   Execute the graph immediately
```

**If some nodes are `running`:**
```
  Next Actions:
    /crew:status                Refresh status
    /crew:checkpoint            Save current progress

  Note: Agents are actively working. Wait for completion or check scratchpad for progress.
```

**If all nodes are `completed` or `skipped`:**
```
  Next Actions:
    /crew:integrate             Merge all branches and verify
    /crew:checkpoint            Save state before integration
```

**If any node is `failed`:**
```
  Next Actions:
    /crew:run                   Retry failed nodes
    /crew:status                Refresh status

  Failed nodes:
    {node_id}: {check .ai-crew/scratchpad/*-{node_id}.md for details}
```

---

## Closing

```
══════════════════════════════════════════════════════════════
```

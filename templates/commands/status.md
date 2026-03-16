# /crew:status -- Show AI-Crew State

You are displaying the current status of the AI-Crew workflow. Read the state file, format it clearly, and show the user what is happening and what they can do next.

---

## Step 0: Read State

1. Read `.ai-crew/state.json`.
   - If the file does not exist, go to Step 1 (no intent path).
   - If the file exists but cannot be parsed, report: "Error: `.ai-crew/state.json` is corrupted. Run `/crew:restore` to recover from a checkpoint, or `/crew:reset` to start fresh."

---

## Step 1: Handle No Active Intent

If `state.intent` is `null` or the state file does not exist, display:

```
══════════════════════════════════════
  AI-Crew Status
══════════════════════════════════════

  No active intent.

  Get started:
    /crew:elaborate <description>   Define a new intent and break it into units
    /crew:restore                   Restore from a previous checkpoint

══════════════════════════════════════
```

Then stop. Do not proceed to Step 2.

---

## Step 2: Display Formatted Status

### 2.1 Intent Header

```
══════════════════════════════════════════════════════════════
  AI-Crew Status
══════════════════════════════════════════════════════════════

  Intent:     {intent.description}
  ID:         {intent.id}
  Status:     {intent.status}    <-- use color/emphasis: elaborating=yellow, ready=blue, executing=green, integrating=cyan, complete=bold green
  Created:    {intent.createdAt}
  Updated:    {intent.updatedAt}
```

### 2.2 Completion Criteria

Read `intent.completionCriteria[]` and display as a checklist:

```
  Completion Criteria:
    [x] All API endpoints return correct status codes          (verified 2026-03-15T14:30:00Z)
    [x] Test coverage >= 80%                                   (verified 2026-03-15T14:32:00Z)
    [ ] WebSocket connections handle reconnection gracefully
    [ ] Performance under 200ms p95 response time
                                                         2/4 verified
```

### 2.3 Units Table

Read `units[]` and display a formatted table. Include all relevant fields:

```
  Units:
  ┌────────────────────┬─────────────┬───────────────┬──────────┬──────────────────────┬────────────┐
  │ Unit               │ Status      │ Assigned To   │ Hat      │ Branch               │ Tasks      │
  ├────────────────────┼─────────────┼───────────────┼──────────┼──────────────────────┼────────────┤
  │ unit-shared-types  │ complete    │ shared-dev    │ --       │ feature/unit-shared   │ 3/3        │
  │ unit-backend       │ in-progress │ backend-dev   │ builder  │ feature/unit-backend  │ 2/5        │
  │ unit-frontend      │ pending     │ --            │ --       │ --                   │ 0/4        │
  │ unit-e2e-tests     │ blocked     │ --            │ --       │ --                   │ 0/2        │
  └────────────────────┴─────────────┴───────────────┴──────────┴──────────────────────┴────────────┘
```

For the Tasks column, count tasks with `status == "complete"` vs total tasks in each unit.

### 2.4 Dependency Graph

Build an ASCII dependency graph from the `units[].dependencies` data:

```
  Dependency Graph:
    unit-shared-types
      ├──> unit-backend
      └──> unit-frontend
             └──> unit-e2e-tests
                    └──> (also depends on unit-backend)
```

If there are no dependencies (all units are independent), display:

```
  Dependency Graph:
    All units are independent (no dependencies).
```

### 2.5 Team Info

If `state.team` is not `null` (team is active during execution), display:

```
  Team: {team.name}
  Created: {team.createdAt}
  ┌───────────────┬──────────────────────┬──────────┐
  │ Agent         │ Unit                 │ Status   │
  ├───────────────┼──────────────────────┼──────────┤
  │ backend-dev   │ unit-backend         │ active   │
  │ frontend-dev  │ unit-frontend        │ idle     │
  │ shared-dev    │ unit-shared-types    │ completed│
  └───────────────┴──────────────────────┴──────────┘
```

If `state.team` is `null`, skip this section entirely.

### 2.6 Recent Events

Read `state.events[]`, take the **last 10** entries (sorted by timestamp descending), and display:

```
  Recent Events:
    2026-03-15 14:32:00  task:completed      unit-backend / task-api-routes
    2026-03-15 14:30:00  hat:changed         unit-backend: planner -> builder
    2026-03-15 14:28:00  unit:started         unit-backend
    2026-03-15 14:25:00  unit:assigned        unit-shared-types -> shared-dev
    2026-03-15 14:20:00  team:created         crew-notification-system
    2026-03-15 14:15:00  intent:updated       status: executing
    2026-03-15 14:00:00  intent:created       "Real-time notification system"
```

If there are no events, display: "No events recorded yet."

---

## Step 3: Show Available Next Actions

Based on the current `intent.status`, display contextual suggestions:

**If status is `"elaborating"`:**
```
  Next Actions:
    - Continue the elaboration conversation to finalize requirements and units.
    - When ready, the status will advance to "ready".
```

**If status is `"ready"`:**
```
  Next Actions:
    /crew:execute       Start the construction phase with an Agent Team
    /crew:elaborate     Re-run elaboration to modify units or criteria
    /crew:checkpoint    Save current state before execution
```

**If status is `"executing"`:**
```
  Next Actions:
    /crew:execute       Resume execution (reconnect to running agents)
    /crew:status        Refresh status
    /crew:checkpoint    Save current progress

  Tips:
    - Units in "blocked" status may need dependency resolution.
    - Use /crew:execute to re-assign or continue blocked units.
```

**If status is `"integrating"`:**
```
  Next Actions:
    /crew:integrate     Continue or retry integration
    /crew:status        Refresh status
```

**If status is `"complete"`:**
```
  Next Actions:
    /crew:elaborate <new intent>    Start a new intent
    /crew:restore                   Restore a previous checkpoint
    /crew:reset                     Clear state for a fresh start

  This intent is complete. All units have been integrated.
```

---

## Closing Line

End with a single separator:

```
══════════════════════════════════════════════════════════════
```

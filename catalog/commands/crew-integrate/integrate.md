---
description: Graph 실행 결과 통합 & 검증 (Integration Phase)
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash]
---

# /crew:integrate -- Integration Phase

You are executing the **Integration Phase** of the AI-Crew Graph workflow. Your job is to merge all completed node branches, run quality checks, and clean up worktrees.

Follow each step below precisely. Report progress as you go.

---

## Step 0: Load State and Verify Readiness

1. Read `.ai-crew/state.json` and `.ai-crew/graph.yaml`.
   - If no state or graph: "No AI-Crew state found. Run `/crew:elaborate` then `/crew:run` first."
   - Stop.
1.5. Read `defaults.locale` from `.ai-crew/config.yaml` (default: `"en"`). Write all construction summaries (`aidlc-docs/construction/`) and terminal output in the locale language.
2. Check every node in `state.json` → `nodes`:
   - Each node must have `status == "completed"` or `status == "skipped"`.
   - If any node is `running`, `pending`, or `failed`:
     ```
     Node Status:
       plan      completed
       frontend  completed
       backend   running     <-- NOT READY
     ```
     Suggest: "Run `/crew:run` to complete remaining nodes, or `/crew:status` for details."
     **Do not proceed** until all nodes are completed or skipped.

---

## Step 1: Build Merge Order from Graph

1. Read `graph.yaml` → `graph.nodes[]`.
2. Perform a **topological sort** using `depends_on` fields.
3. Only include nodes with `status == "completed"` (skip `skipped` nodes).
4. Filter to nodes that used worktree isolation (these have branches to merge).
5. Display the merge order:
   ```
   Merge Order:
     1. plan        (no deps, isolation: none — no branch to merge)
     2. frontend    (depends_on: [plan])
     3. backend     (depends_on: [plan])
     4. review      (depends_on: [frontend, backend], isolation: none — no branch)

   Branches to merge: crew/frontend, crew/backend
   ```

---

## Step 2: Merge Node Branches

For each node with a worktree branch, in dependency-sorted order:

1. Identify the branch: `crew/{node_id}`.
2. Check if the branch exists: `git branch --list crew/{node_id}`.
3. If the branch exists:
   - Run: `git merge crew/{node_id} --no-ff -m "integrate: merge {node_id}"`
4. **If the merge succeeds**: report and move on.
5. **If there are merge conflicts**:
   a. List conflicted files.
   b. Attempt auto-resolution (prefer feature branch changes).
   c. If auto-resolution fails, show conflict to user and **wait for guidance**.
6. After each merge:
   ```
   [MERGED] crew/backend -> current branch (5 files changed, +200 -30)
   ```

---

## Step 3: Run Quality Checks

1. Read `.ai-crew/graph.yaml` → collect all `hooks` from nodes.
2. For each hook referenced, look for corresponding quality gate definitions.
3. Run available quality checks on the merged codebase:
   - If project has `package.json` with test/lint scripts: run them
   - Report results:
   ```
   Quality Checks:
     [PASS] npm test
     [PASS] npm run lint
     [WARN] npm run test:coverage (coverage: 75%, no threshold set)
   ```
4. If any critical check fails, report and ask user how to proceed.

---

## Step 4: Clean Up Worktrees and Branches

1. For each node that used worktree isolation:
   a. Check if a worktree exists for `crew/{node_id}`.
   b. If exists: `git worktree remove <path> --force`
2. Delete merged branches:
   - `git branch -d crew/{node_id}` for each merged branch.
3. Display cleanup summary:
   ```
   Cleanup:
     Worktrees removed: 2
     Branches deleted:  2
   ```

---

## Step 4.5: Convert Scratchpad to aidlc-docs/construction/ Summaries

When native AI-DLC is detected (CLAUDE.md + `.aidlc-rule-details/` exist), convert ephemeral scratchpad outputs into permanent construction documentation:

1. **Review reports**: For nodes with agent type `reviewer` or `pm_review`, convert their scratchpad to:
   - `aidlc-docs/construction/{unit-name}/review-report.md`

2. **Test results**: For nodes that produced test output (check scratchpad `## Result` section for test references), consolidate into:
   - `aidlc-docs/construction/build-and-test/test-results.md`

3. **Code change summaries**: For each worker node, generate a concise summary from scratchpad `## What` and `## Result` sections:
   - `aidlc-docs/construction/{unit-name}/code/summary.md`

4. **Update `aidlc-docs/aidlc-state.md`**: Mark the CONSTRUCTION PHASE as complete with ISO 8601 timestamp.

5. **Append to `aidlc-docs/audit.md`**:
   ```markdown
   ## Integration Complete
   **Timestamp**: {ISO 8601}
   **Nodes Integrated**: {list of completed node IDs}
   **Branches Merged**: {list of merged branches}
   **PR**: {PR URL if created}
   **Context**: Construction phase integration via /crew:integrate
   ```

---

## Step 5: Update State

1. Update `.ai-crew/state.json`:
   - All nodes remain with their final status.
2. Create a checkpoint file at `.ai-crew/checkpoints/cp-{YYYYMMDD}-{HHmmss}.json`:
   ```json
   {
     "id": "cp-{YYYYMMDD}-{HHmmss}",
     "description": "Integration complete",
     "createdAt": "<ISO 8601>",
     "state": { ... full state snapshot ... },
     "git": {
       "mainRef": "<current HEAD SHA>",
       "branches": []
     }
   }
   ```

---

## Step 6: Create Pull Request (Mode-Based)

Read `.ai-crew/config.yaml` → `defaults.merge_mode` (default: `manual`).

### PR Creation (both modes)

Always create a PR automatically:

```bash
gh pr create \
  --title "feat: {summary from scratchpad}" \
  --body "$(cat <<'EOF'
## Summary
{auto-generated from .ai-crew/scratchpad/L*-*.md files, sorted by level}

## Graph Nodes Integrated
| Node | Agent | Status |
|------|-------|--------|
| {id} | {agent} | completed |

---
Generated by AI-Crew `/crew:integrate`
EOF
)"
```

### Auto Mode (`merge_mode: auto`)

After PR creation:
1. Verify all quality checks passed (Step 3 results)
2. If all passed → auto-merge:
   ```bash
   gh pr merge --merge --delete-branch
   ```
3. Report result:
   ```
   PR #{number} created and merged automatically.
   URL: {PR URL}
   ```
4. If quality checks failed → fall back to manual mode with warning:
   ```
   Quality checks failed. PR created but NOT auto-merged.
   Review and merge manually: {PR URL}
   ```

### Manual Mode (`merge_mode: manual`, default)

After PR creation:
```
PR #{number} created.
URL: {PR URL}

Review the changes and merge when ready.
```

---

## Final Output

```
========================================
  AI-Crew Integration Complete
========================================

Bundle:     {bundleName}
Nodes:      {completed}/{total} completed, {skipped} skipped
Branches:   {N} merged
Checkpoint: cp-{id}
PR:         {PR URL}
Merge Mode: {auto | manual}
Status:     {merged | awaiting review}

All changes have been integrated into the current branch.
```

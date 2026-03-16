# /crew:integrate -- Integration Phase

You are executing the **Integration Phase** of the AI-DLC workflow managed by AI-Crew. Your job is to merge all completed feature branches, run quality gates, verify completion criteria, and clean up worktrees.

Follow each step below precisely. Do not skip steps. Report progress as you go.

---

## Step 0: Load State and Verify Readiness

1. Read `.ai-crew/state.json` and parse it.
2. Verify that `intent` exists and `intent.status` is `"executing"` or `"integrating"`.
   - If `intent` is `null`, stop and tell the user: "No active intent found. Run `/crew:elaborate` first."
3. Check every entry in `units[]` -- each must have `status == "complete"`.
   - If any unit is **not** complete, display a summary table:
     ```
     Unit              Status        Assigned To
     ─────────────────────────────────────────────
     unit-backend      complete      backend-dev
     unit-frontend     in-progress   frontend-dev   <-- NOT READY
     ```
   - Then suggest: "Run `/crew:execute` to continue incomplete units, or `/crew:status` for details."
   - **Do not proceed** with integration until all units are complete.
4. Update `intent.status` to `"integrating"` in state.json.
5. Log event: `{ "type": "intent:updated", "payload": { "status": "integrating" }, "timestamp": "<ISO 8601>" }`

---

## Step 1: Build Merge Order from Dependency Graph

1. Read the `units[]` array from state.
2. For each unit, examine its `dependencies[]` field (list of unit IDs it depends on).
3. Perform a **topological sort** to determine merge order:
   - Units with no dependencies are merged first.
   - A unit is only merged after all its dependencies have been merged.
   - If there is a cycle, stop and report the error to the user.
4. Display the computed merge order:
   ```
   Merge Order:
     1. unit-shared-types   (no deps)
     2. unit-backend         (depends on: unit-shared-types)
     3. unit-frontend        (depends on: unit-shared-types)
     4. unit-e2e-tests       (depends on: unit-backend, unit-frontend)
   ```

---

## Step 2: Merge Feature Branches

For each unit in the dependency-sorted order:

1. Identify the branch from `unit.branch` (e.g., `feature/unit-backend`).
2. Run: `git merge feature/{unit-id} --no-ff -m "integrate: merge {unit-name} ({unit-id})"`
3. **If the merge succeeds**: report success and move to the next branch.
4. **If there are merge conflicts**:
   a. List all conflicted files.
   b. Attempt auto-resolution by reading both sides and applying a sensible merge:
      - For code files: prefer the feature branch changes unless they contradict another already-merged unit.
      - For config/lock files: regenerate where possible.
   c. After auto-resolution, run `git add` on resolved files and `git commit`.
   d. If any conflict cannot be auto-resolved, show the conflict to the user with both sides and ask for guidance. **Do not proceed** until the user confirms resolution.
5. After each successful merge, report:
   ```
   [MERGED] feature/unit-backend -> current branch (3 files changed, +142 -23)
   ```

---

## Step 3: Run Quality Gates

1. Read `.ai-crew/config.yaml` and look for `qualityGates` section.
2. Execute each quality gate command defined under `beforeUnitComplete` and any integration-level gates:
   - For each command (e.g., `npm test`, `npm run lint`):
     a. Run the command.
     b. Capture stdout/stderr and exit code.
     c. If exit code is 0: mark as PASS.
     d. If exit code is non-zero:
        - If `failAction` is `"block"`: stop integration and report the failure. Show the output. Ask the user how to proceed.
        - If `failAction` is `"warn"`: report a warning but continue.
3. Display results:
   ```
   Quality Gates:
     [PASS] npm run lint
     [PASS] npm test
     [PASS] npm run test:coverage (coverage: 87% >= 80%)
   ```
4. If any blocking gate fails, do NOT proceed. Suggest fixes if possible.

---

## Step 4: Verify Completion Criteria

1. Read `intent.completionCriteria[]` from state.
2. For each criterion:
   a. Read the `description` field.
   b. Attempt to verify it by examining the merged codebase:
      - If it references tests passing: check test results from Step 3.
      - If it references file existence: check if files exist.
      - If it references API endpoints: check route definitions.
      - If it references documentation: check for doc files.
      - If it cannot be automatically verified: ask the user to confirm.
   c. Mark `verified: true` and set `verifiedAt` to the current ISO 8601 timestamp.
3. Display verification results:
   ```
   Completion Criteria:
     [x] All API endpoints return correct status codes  (verified)
     [x] Test coverage >= 80%                           (verified: 87%)
     [x] WebSocket connections handle reconnection       (verified)
     [ ] Performance under 200ms p95 response time       (needs manual verification)
   ```
4. Update `intent.completionCriteria` in state.json with the verification results.

---

## Step 5: Clean Up Worktrees

1. For each unit in `units[]`:
   a. If `unit.worktree` is set and the directory exists:
      - Run: `git worktree remove {unit.worktree} --force`
      - Report: `[REMOVED] worktree: {unit.worktree}`
   b. If the worktree directory does not exist, skip silently.
2. For each unit in `units[]`:
   a. If `unit.branch` is set:
      - Run: `git branch -d feature/{unit-id}`
      - If the branch delete fails (not fully merged), report a warning but continue.
      - Report: `[DELETED] branch: feature/{unit-id}`
3. Display cleanup summary:
   ```
   Cleanup:
     Worktrees removed: 3
     Branches deleted:  3
   ```

---

## Step 6: Update State and Checkpoint

1. Set `intent.status` to `"complete"`.
2. Set `intent.updatedAt` to current ISO 8601 timestamp.
3. Set `team` to `null` (team is disbanded).
4. Log event: `{ "type": "intent:completed", "payload": { "intentId": "<id>" }, "timestamp": "<ISO 8601>" }`
5. Log event: `{ "type": "team:disbanded", "payload": {}, "timestamp": "<ISO 8601>" }`
6. Save `state.json`.
7. Create a checkpoint file at `.ai-crew/checkpoints/cp-{YYYYMMDD}-{HHmmss}.json` containing:
   ```json
   {
     "id": "cp-{YYYYMMDD}-{HHmmss}",
     "description": "Integration complete: {intent.description}",
     "createdAt": "<ISO 8601>",
     "state": { ... full state snapshot ... },
     "git": {
       "mainRef": "<current HEAD SHA>",
       "branches": []
     },
     "changes": {
       "added": [ ... list of new files across all units ... ],
       "modified": [ ... ],
       "deleted": [ ... ]
     }
   }
   ```
8. Log event: `{ "type": "checkpoint:created", "payload": { "checkpointId": "cp-..." }, "timestamp": "<ISO 8601>" }`
9. Save `state.json` again (to include the checkpoint event).

---

## Step 7: Optionally Create a Pull Request

1. Ask the user: "Would you like to create a Pull Request for this integration?"
2. If the user says **yes**:
   a. Collect a summary of all changes:
      - List all units and their descriptions.
      - Summarize files changed, added, deleted.
      - List verified completion criteria.
   b. Run:
      ```
      gh pr create \
        --title "feat: {intent.description}" \
        --body "## Summary

      {auto-generated summary of all units and changes}

      ## Completion Criteria

      {checklist of all criteria with verified status}

      ## Units Integrated

      {table of units with descriptions}

      ---
      Generated by AI-Crew /crew:integrate"
      ```
   c. Report the PR URL to the user.
3. If the user says **no**: skip and report that integration is complete without a PR.

---

## Final Output

After all steps, display a summary:

```
========================================
  AI-Crew Integration Complete
========================================

Intent:    {intent.description}
Status:    complete
Units:     {N} merged
Criteria:  {verified}/{total} verified
Checkpoint: cp-{id}
PR:        {PR URL or "none"}

All changes have been integrated into the current branch.
```

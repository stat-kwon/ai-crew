# /restore — Restore from a Checkpoint

Restore the ai-crew state and optionally git branches from a previously saved checkpoint.

**Arguments:** $ARGUMENTS may contain a checkpoint ID (e.g., `cp-20260316-143022`). If omitted, list available checkpoints and ask the user to choose.

---

## Step 0: Select Checkpoint

**If $ARGUMENTS is empty or not provided:**

1. List all `.json` files in `.ai-crew/checkpoints/`.
2. If none exist, inform the user: "No checkpoints found." and stop.
3. For each checkpoint file, read it and display a table:

```
ID                   | Description          | Date                 | Intent         | Units
---------------------+----------------------+----------------------+----------------+------
cp-20260316-143022   | Before refactor      | 2026-03-16 14:30:22  | build-feature  | 3
cp-20260315-091500   | Manual checkpoint    | 2026-03-15 09:15:00  | fix-bugs       | 2
```

4. Ask the user: "Which checkpoint would you like to restore? Enter the ID."
5. Wait for the user's response before proceeding.

**If $ARGUMENTS contains a checkpoint ID:**

- Verify the file `.ai-crew/checkpoints/{id}.json` exists.
- If it does not exist, inform the user and list available checkpoints instead.

## Step 1: Read Checkpoint

Read `.ai-crew/checkpoints/{id}.json` and parse the full checkpoint object.

## Step 2: Show Restoration Plan

Display what will change by comparing the current state to the checkpoint state:

1. **State changes** — compare current `.ai-crew/state.json` with `checkpoint.state`:
   - Current intent vs checkpoint intent
   - Current unit count vs checkpoint unit count
   - Any units that will be added, removed, or changed in status

2. **Git branches affected** — list branches from `checkpoint.git.branches`:
   - For each branch, show whether it exists locally and whether its current SHA differs from the checkpoint SHA.
   - Note the checkpoint's `mainRef` vs current HEAD.

3. **File changes at time of checkpoint** — show the `checkpoint.changes` summary.

Then ask: **"Proceed with restore? (yes/no)"**

Do NOT proceed without user confirmation.

## Step 3: Restore State

Once confirmed:

1. **Write state** — replace `.ai-crew/state.json` entirely with `checkpoint.state`.

2. **Restore git branches (optional)** — ask the user: "Also restore git branch positions? (yes/no)"
   - If yes, for each branch in `checkpoint.git.branches`:
     - If the branch exists locally: `git checkout <branch> && git reset --hard <ref>`
     - If the branch does not exist: `git checkout -b <branch> <ref>`
   - After branch restoration, checkout the branch the user was on before the restore, or fall back to the main branch.
   - If no, skip git restoration entirely.

## Step 4: Record Restore Event

Add an event to the `events` array in the newly restored `.ai-crew/state.json`:

```json
{
  "type": "checkpoint:restored",
  "checkpointId": "<checkpoint-id>",
  "timestamp": "<ISO 8601 timestamp>",
  "description": "Restored from checkpoint <checkpoint-id>"
}
```

If no `events` array exists, create one.

## Step 5: Confirm and Show Status

Display a summary:

```
Restored from checkpoint: <checkpoint-id>
Description:              <original checkpoint description>
Original date:            <checkpoint createdAt>
Intent:                   <restored intent name/id>
Units:                    <count> units restored
Git branches:             <restored | skipped>
```

Then show the current state by reading and summarizing `.ai-crew/state.json`.

---
description: 이전 체크포인트에서 상태 복구
argument-hint: [checkpoint-id]
allowed-tools: [Read, Write, Bash]
---

# /crew:restore — Restore from a Checkpoint

Restore the AI-Crew graph state and optionally git branches from a checkpoint.

**Arguments:** $ARGUMENTS may contain a checkpoint ID (e.g., `cp-20260317-143022`).

---

## Step 0: Select Checkpoint

**If no ID provided:**

1. List all `.json` files in `.ai-crew/checkpoints/`.
2. If none: "No checkpoints found." Stop.
3. Display:
   ```
   ID                   | Description          | Date                 | Bundle
   ---------------------+----------------------+----------------------+--------
   cp-20260317-143022   | Before integration   | 2026-03-17 14:30:22  | aidlc-standard
   cp-20260316-091500   | Manual checkpoint    | 2026-03-16 09:15:00  | fullstack
   ```
4. Ask: "Which checkpoint to restore? Enter the ID."
5. Wait for response.

**If ID provided:**
- Verify `.ai-crew/checkpoints/{id}.json` exists.
- If not: list available checkpoints instead.

## Step 1: Read Checkpoint

Parse `.ai-crew/checkpoints/{id}.json`.

## Step 2: Show Restoration Plan

Compare current state vs checkpoint:

1. **State changes**: Current bundle/node statuses vs checkpoint.
2. **Git branches**: List branches from `checkpoint.git.branches`, compare with local.
3. **Changes at checkpoint time**: Show `checkpoint.changes` summary.

Ask: **"Proceed with restore? (yes/no)"**

Do NOT proceed without confirmation.

## Step 3: Restore State

Once confirmed:

1. **Write state** — replace `.ai-crew/state.json` with `checkpoint.state`.
2. **Restore AI-DLC state** — if `checkpoint.aidlcState` is present, write it to `aidlc-docs/aidlc-state.md`.
3. **Restore git branches (optional)** — ask: "Also restore git branch positions? (yes/no)"
   - If yes: for each branch in `checkpoint.git.branches`:
     - Exists: `git checkout <branch> && git reset --hard <ref>`
     - Doesn't exist: `git checkout -b <branch> <ref>`
   - Return to previous branch afterward.
   - If no: skip git restoration.

## Step 4: Confirm

```
Restored from checkpoint: <id>
Description:              <original description>
Original date:            <createdAt>
Bundle:                   <bundleName>
Nodes:                    <count> nodes restored
Git branches:             <restored | skipped>
```

Then show a brief state summary.

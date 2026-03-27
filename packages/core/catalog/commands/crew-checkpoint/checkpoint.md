---
description: 상태 스냅샷 저장 (수동 체크포인트)
argument-hint: [description]
allowed-tools: [Read, Write, Bash]
---

# /crew:checkpoint — Create a Manual Checkpoint

Save a snapshot of the current AI-Crew graph state and git context for later recovery.

**Arguments:** $ARGUMENTS may contain an optional description.

---

## Step 0: Validate State

Read `.ai-crew/state.json`.

- If the file does not exist: "Nothing to checkpoint — no AI-Crew installation found." Stop.

## Step 1: Gather Checkpoint Data

1. **Full state snapshot** — contents of `.ai-crew/state.json`.
2. **AI-DLC state snapshot** — contents of `aidlc-docs/aidlc-state.md` (if exists). Include as `aidlcState` field in checkpoint JSON.
3. **Current git HEAD SHA** — `git rev-parse HEAD`.
4. **Node branches** — for each node in state.json with status `running` or `completed`, check if branch `crew/{runId}/{node_id}` exists and get its SHA via `git rev-parse crew/{runId}/{node_id}`.
5. **File changes** — `git diff --name-status HEAD` to categorize files.

## Step 2: Generate Checkpoint ID

```
cp-YYYYMMDD-HHMMSS
```

Use local system time. Example: `cp-20260317-143022`.

## Step 3: Write Checkpoint File

Create `.ai-crew/checkpoints/` if needed.

Write to `.ai-crew/checkpoints/{id}.json`:

```json
{
  "id": "<checkpoint-id>",
  "description": "<from $ARGUMENTS, or 'Manual checkpoint'>",
  "createdAt": "<ISO 8601>",
  "state": { ... full state.json contents ... },
  "aidlcState": "<contents of aidlc-docs/aidlc-state.md, or null if not present>",
  "git": {
    "mainRef": "<HEAD SHA>",
    "branches": [
      { "name": "crew/{runId}/{node_id}", "ref": "<SHA>" }
    ]
  },
  "changes": {
    "added": ["..."],
    "modified": ["..."],
    "deleted": ["..."]
  }
}
```

## Step 4: Confirm

```
Checkpoint created: <id>
Description:        <description>
Bundle:             <state.bundleName>
Nodes:              <total> nodes, <branches> branches captured
Git HEAD:           <short SHA>
Saved to:           .ai-crew/checkpoints/<id>.json
```

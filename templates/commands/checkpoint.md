# /checkpoint — Create a Manual Checkpoint

Create a snapshot of the current ai-crew state and git context so it can be restored later.

**Arguments:** $ARGUMENTS may contain an optional description for the checkpoint.

---

## Step 0: Validate Active Intent

Read `.ai-crew/state.json`.

- If the file does not exist or there is no active intent (`currentIntent` is null or missing), inform the user: "Nothing to checkpoint — no active intent found." and stop.

## Step 1: Gather Checkpoint Data

Collect the following information:

1. **Full state snapshot** — the entire contents of `.ai-crew/state.json`.
2. **Current git HEAD SHA** — run `git rev-parse HEAD`.
3. **Unit branches and their SHAs** — for each unit in `state.json`, get the branch name and run `git rev-parse <branch>` to capture its current ref. Skip branches that do not exist locally.
4. **File changes summary** — run `git diff --stat` and `git diff --cached --stat` to capture both staged and unstaged changes. Also run `git diff --name-status HEAD` to categorize files as added (A), modified (M), or deleted (D).

## Step 2: Generate Checkpoint ID

Generate an ID using the current timestamp:

```
cp-YYYYMMDD-HHMMSS
```

Use the local system time. For example: `cp-20260316-143022`.

## Step 3: Write Checkpoint File

Create the directory `.ai-crew/checkpoints/` if it does not exist.

Write the checkpoint to `.ai-crew/checkpoints/{id}.json` with this structure:

```json
{
  "id": "<checkpoint-id>",
  "description": "<from $ARGUMENTS, or 'Manual checkpoint' if none provided>",
  "createdAt": "<ISO 8601 timestamp>",
  "state": "<full state.json contents as an object>",
  "git": {
    "mainRef": "<HEAD SHA>",
    "branches": [
      { "name": "<branch-name>", "ref": "<SHA>" }
    ]
  },
  "changes": {
    "added": ["<list of added files>"],
    "modified": ["<list of modified files>"],
    "deleted": ["<list of deleted files>"]
  }
}
```

## Step 4: Record Event in State

Add an event entry to the `events` array in `.ai-crew/state.json`:

```json
{
  "type": "checkpoint:created",
  "checkpointId": "<checkpoint-id>",
  "timestamp": "<ISO 8601 timestamp>",
  "description": "<checkpoint description>"
}
```

If no `events` array exists in state.json, create one.

## Step 5: Confirm to User

Display a summary:

```
Checkpoint created: <checkpoint-id>
Description:        <description>
Intent:             <current intent name/id>
Units:              <count> units, <count> branches captured
Git HEAD:           <short SHA>
File changes:       <N> added, <N> modified, <N> deleted
Saved to:           .ai-crew/checkpoints/<id>.json
```

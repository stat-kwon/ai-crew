---
description: AI-DLC Inception Auto Mode (Owner Agent drives, stops only at mandatory gates)
argument-hint: <intent description>
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Agent]
---

# /crew:auto - AI-DLC Inception Auto Mode

Launch the **Owner Agent** to drive the AI-DLC Inception phase automatically. The agent proceeds through all stages without waiting, except at mandatory gates.

**User's Intent**: $ARGUMENTS

---

## Step 0: Environment Detection

1. Check if `.ai-crew/` exists. If not:
   - "No AI-Crew installation found. Run `ai-crew install --team <name> --target <path>` first."
   - Stop.

2. Read `.ai-crew/config.yaml` for bundle and workflow info.
3. Read `.ai-crew/state.json`.
4. Read `.ai-crew/graph.yaml` (if exists).

### Native AI-DLC Verification

1. **CLAUDE.md** exists at project root AND contains AI-DLC workflow → confirmed
2. **`.aidlc-rule-details/`** exists at project root → rule details available. Load stage-specific rules from this directory (e.g., `.aidlc-rule-details/inception/workspace-detection.md`, `.aidlc-rule-details/inception/requirements-analysis.md`, etc.)
3. If either missing → "AI-DLC native installation incomplete. Expected CLAUDE.md and .aidlc-rule-details/"

---

## Step 1: Launch Owner Agent

Delegate the entire Inception phase to the Owner Agent (`.claude/agents/owner.md`):

```
Use the Agent tool to launch the owner agent with:
- The user's intent: "$ARGUMENTS"
- Mode: auto
- The agent will follow CLAUDE.md (AI-DLC core workflow) exactly
- It will auto-proceed through stages, stopping only at:
  1. Requirements Analysis — clarifying questions (needs user answers)
  2. Requirements Analysis — approval (needs user confirmation)
  3. Workflow Planning — approval (needs user confirmation)
```

---

## Step 2: Post-Inception

After the Owner Agent completes Inception:

1. Verify artifacts:
   - `aidlc-docs/` contains all AI-DLC documentation
   - `.ai-crew/graph.yaml` is generated (if units were created)
   - `.ai-crew/state.json` is updated

2. Present completion summary and next step: `/crew:run`

---

## Mandatory Gates

The Owner Agent will pause at these mandatory AI-DLC approval gates:

1. **Reverse Engineering Approval** (brownfield only) — approve reverse engineering artifacts before proceeding
2. **Requirements Clarifying Questions** — answer questions about your intent
3. **Requirements Approval** — approve the requirements document
4. **User Stories Approval** (if executed) — approve user stories and personas
5. **Workflow Planning Approval** — approve the execution plan
6. **Application Design Approval** (if executed) — approve component design and interfaces
7. **Units Generation Approval** (if executed) — approve work decomposition and graph node mapping

All other stages proceed automatically. Gate rules are defined in `.aidlc-rule-details/inception/` — each stage's rule file specifies its approval format.

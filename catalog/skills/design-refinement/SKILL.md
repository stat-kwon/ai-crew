---
name: design-refinement
description: |
  Iterative design document refinement using ouroboros MCP's ontological
  analysis engine. Evaluates design artifacts through a 3-stage pipeline,
  identifies gaps via Wonder, proposes ontology mutations via Reflect, and
  tracks convergence across generations. Requires ouroboros MCP server.
version: 2.0.0
---

# Design Refinement Skill

## When This Skill Applies
- After Application Design completion (Inception phase)
- After Functional Design completion (Construction phase)
- After NFR Design completion (Construction phase)
- When user explicitly requests design review via `/crew:refine`

## Permission Rules
- This skill writes directly to `aidlc-docs/inception/` during Inception phase.
- During Construction, only `pm_review` and `design_gate` nodes may use this skill to patch `aidlc-docs/inception/`.
- All patches must be logged in `aidlc-docs/audit.md` with ISO 8601 timestamp.

## Process Overview

```
Gen 1: Gather Artifacts → Seed → Evaluate → Wonder → Reflect → Mutations
Gen 2: Apply Mutations → Re-Evaluate → Wonder → Reflect → Mutations
...until convergence (similarity ≥ 0.95) or user approves or max 10 iterations
```

## Execution

### Step 0: Load ouroboros MCP Tools (Required)

The ouroboros MCP tools may be registered as deferred tools. Load them before proceeding.

1. Use `ToolSearch` to find ouroboros MCP tools:
   ```
   ToolSearch query: "+ouroboros evaluate"
   ```
2. If found → proceed to **Step 1**
3. If NOT found → display the following message and **stop**:

```
ouroboros MCP server is not available.

To use design refinement, install ouroboros-ai:

  pip install ouroboros-ai

Then ensure it is registered in your `.claude/settings.json` mcpServers.
Run `ai-crew install --team <name> --target <path>` to auto-configure.
```

**IMPORTANT**: Do NOT skip this step. Do NOT proceed without ouroboros MCP tools.

---

### Step 1: Gather Design Artifacts

Scan `aidlc-docs/` for design artifacts:
- `aidlc-docs/inception/application-design/` — Application Design
- `aidlc-docs/construction/*/functional-design/` — Functional Design (per unit)
- `aidlc-docs/construction/*/nfr-design/` — NFR Design (per unit)

Read all relevant design files and concatenate into a single design context string.

Also read context from:
- `aidlc-docs/inception/requirements/` — original requirements
- `aidlc-docs/inception/user-stories/` — if exists

---

### Step 2: Generate Seed via MCP

Use `ouroboros_generate_seed` to create the seed from design artifacts automatically:

```
ouroboros_generate_seed:
  goal: <extracted from aidlc-docs/inception/requirements/>
  constraints: <from requirements + NFR requirements>
  acceptance_criteria: <from requirements document>
  context: <concatenated design artifact content from Step 1>
```

The MCP tool generates a structured seed YAML with ontology, evaluation principles, and exit conditions derived from the design context.

**User Review**: Present the generated seed summary to the user before proceeding:
```
Ouroboros seed generated from design artifacts.

- Goal: {extracted goal}
- Constraints: {count} constraints
- Acceptance Criteria: {count} criteria
- Ontology nodes: {count}

Proceed with evaluation? (Y/n)
```

If user requests changes, adjust the seed parameters and regenerate.

---

### Step 3: Measure Drift & Evaluate via MCP

**3a. Measure Drift** — Call `ouroboros_measure_drift` to quantify how far the current design has drifted from requirements:

```
ouroboros_measure_drift:
  session_id: <generate or reuse>
  artifact: <design document content>
  seed_content: <seed from Step 2>
```

- If drift score > 0.3 → display warning:
  ```
  ⚠ Drift score: {score} (threshold: 0.3)
  The design has diverged significantly from requirements.
  Consider addressing drift before continuing.
  ```
- If drift score ≤ 0.3 → note score and proceed

**3b. Evaluate** — Call `ouroboros_evaluate` with:
```
ouroboros_evaluate:
  session_id: <same session>
  artifact: <design document content>
  seed_content: <seed from Step 2>
  artifact_type: "docs"
  trigger_consensus: false
```

Present evaluation results to user. Note the scores for convergence tracking.

---

### Step 4: Evolve (Ontology-Only)

If evaluation identifies gaps, call `ouroboros_evolve_step` with:
```
lineage_id: <new or existing>
seed_content: <seed YAML>
execute: false          # ontology-only — no code generation
```

This runs the Wonder → Reflect cycle:
- **Wonder**: "What do we still not know about this design?"
- **Reflect**: "How should the design specification evolve?"

Check the `action` in the response:
- `continue` → Present mutations to user, then call again if approved
- `converged` → Design has stabilized — present final ontology
- `stagnated` → Same issues repeating — trigger lateral thinking (see Stagnation section)
- `exhausted` → Max generations reached — present best result

---

### Step 5: User Review

After each evolution step:
1. Compare current ontology with previous generation (MCP returns similarity)
2. If similarity ≥ 0.95 → **converged**, present final result
3. If same mutations proposed 3+ times → **stagnated**, trigger lateral thinking
4. If generation count ≥ 10 → **exhausted**, present best result
5. Otherwise → present mutations and ask user to continue

Present proposed ontology mutations with severity ratings. Ask user:

```
Options:
A) Apply mutations & continue refinement
B) Apply mutations & finish (design approved)
C) Trigger lateral thinking (contrarian/simplifier perspectives)
D) Discard & finish
```

---

### Step 6: Apply Accepted Mutations

Apply accepted changes to the design documents in `aidlc-docs/`.

---

### Step 7: Final Verification via AC Dashboard

After all mutations are applied (convergence, exhaustion, or user approval), call `ouroboros_ac_dashboard` for a final acceptance criteria check:

```
ouroboros_ac_dashboard:
  session_id: <current session>
```

Present the AC compliance dashboard to the user:

```markdown
## Acceptance Criteria Dashboard

| #  | Acceptance Criterion | Status | Notes         |
|----|----------------------|--------|---------------|
| 1  | {criterion}          | PASS   |               |
| 2  | {criterion}          | FAIL   | {gap detail}  |

**Overall**: {pass_count}/{total} criteria met
```

If any AC is FAIL, inform the user and suggest:
- Run another refinement cycle to address remaining gaps
- Proceed to implementation with known gaps documented

---

## Stagnation Breaking

When the same issues repeat across 3+ iterations (stagnation detected), use `ouroboros_lateral_think` to generate alternative perspectives:

```
ouroboros_lateral_think:
  session_id: <current session>
  seed_content: <current seed YAML>
  stuck_on: <description of the repeating issues>
```

The MCP tool returns **Contrarian** and **Simplifier** analyses:

- **Contrarian**: Challenges assumptions, considers opposites, questions the problem statement itself
- **Simplifier**: Challenges abstractions, proposes scope cuts, applies YAGNI

Present both perspectives from the MCP response to the user and ask which direction to take.

---

## Output Format

After each refinement iteration, present:

```markdown
## Design Refinement — Generation N/10

### Evaluation Results
| Metric          | Score |
|-----------------|-------|
| AC Compliance   | X%    |
| Goal Alignment  | X.XX  |
| Drift Score     | X.XX  |
| Overall Score   | X.XX  |

### Wonder: Gaps Found
| # | Question    | Finding | Severity |
|---|-------------|---------|----------|
| 1 | Essence     | ...     | Major    |

### Reflect: Ontology Mutations
| # | Action | Target | Reason | Severity |
|---|--------|--------|--------|----------|
| 1 | ADD    | ...    | ...    | Major    |

### Convergence Status
- **Generation**: N/10
- **Mutation Trend**: {increasing/stable/decreasing}
- **Signal**: {continuing/converging/stagnating}

### Questions for Author
1. [Decision requiring human judgment]

---
**Options:**
A) Apply mutations & continue refinement
B) Apply mutations & finish (design approved)
C) Trigger lateral thinking (contrarian/simplifier perspectives)
D) Discard & finish
```

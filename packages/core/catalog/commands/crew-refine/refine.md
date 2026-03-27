---
description: 설계서 보완 — ouroboros 기반 반복 개선
argument-hint: [design-stage]
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Agent]
---

# /crew:refine - Design Document Refinement

You refine design documents using ontological analysis and iterative evaluation. This command uses the **design-refinement** skill with ouroboros MCP integration (required).

> **Role**: This command acts as an **optional quality gate between design (Inception) and implementation (Construction)**. After AI-DLC Inception produces design artifacts in `aidlc-docs/`, you can run `/crew:refine` to iteratively improve them before proceeding to `/crew:run` for implementation. This step is **not mandatory** — if the design is already solid, skip directly to `/crew:run`.
>
> **Write scope**: `/crew:refine` writes directly to `aidlc-docs/inception/` — this is correct because it runs during the Inception phase (before Construction begins). During Construction, `pm_review` and `design_gate` graph nodes also use the design-refinement skill to propose Inception design patches via `ouroboros_evaluate`.

**Target**: $ARGUMENTS

---

## Step 0: Environment Detection

1. Check if `.ai-crew/` exists. If not:
   - "No AI-Crew installation found. Run `ai-crew install --team <name> --target <path>` first."
   - Stop.

2. Read `.ai-crew/config.yaml` for bundle info.
3. Read `defaults.locale` from config.yaml (default: `"en"`). Write all design refinement output and terminal messages in the locale language.
4. Check if `aidlc-docs/` exists. If not:
   - "No design artifacts found. Run `/crew:elaborate` first to generate design documents."
   - Stop.

---

## Step 1: Discover Design Artifacts

Scan for design documents in `aidlc-docs/`:

```
aidlc-docs/
├── inception/
│   ├── application-design/    ← Application Design artifacts
│   └── requirements/          ← Requirements (for context)
└── construction/
    └── {unit-name}/
        ├── functional-design/ ← Functional Design artifacts
        ├── nfr-requirements/  ← NFR Requirements
        └── nfr-design/        ← NFR Design artifacts
```

List all discovered design documents with their stage and modification date.

---

## Step 2: Select Target

If `$ARGUMENTS` specifies a design stage (e.g., "application-design", "functional-design"):
- Filter to that stage's artifacts only

If `$ARGUMENTS` is empty:
- Present discovered artifacts and ask user which to refine:

```
Which design documents would you like to refine?

A) Application Design (inception/application-design/)
B) Functional Design — {unit-name} (construction/{unit-name}/functional-design/)
C) NFR Design — {unit-name} (construction/{unit-name}/nfr-design/)
D) All design documents
```

---

## Step 3: Load Context

Read the following for context:
1. **Requirements**: `aidlc-docs/inception/requirements/` — original requirements
2. **User Stories**: `aidlc-docs/inception/user-stories/` — if exists
3. **Target Design**: The selected design artifacts from Step 2

---

## Step 4: Execute Refinement

Apply the **design-refinement** skill (see `.claude/skills/design-refinement/SKILL.md`):

1. The skill verifies ouroboros MCP availability (required — stops if unavailable)
2. Generates seed via `ouroboros_generate_seed` from design artifacts (user reviews)
3. Measures drift via `ouroboros_measure_drift` (warns if drift > 0.3)
4. Evaluates via `ouroboros_evaluate` and evolves via `ouroboros_evolve_step`
5. Breaks stagnation via `ouroboros_lateral_think` when needed
6. Presents findings and proposed changes to the user
7. User decides which changes to accept
8. Repeats until convergence or user is satisfied
9. Runs `ouroboros_ac_dashboard` for final acceptance criteria verification

---

## Step 5: Apply & Record

After user approves final changes:

1. Update the design documents in `aidlc-docs/`
2. Append the refinement entry to `aidlc-docs/audit.md` (never overwrite existing content):
   ```markdown
   ## Design Refinement
   **Timestamp**: [ISO 8601 format, e.g., 2026-03-24T14:30:00Z]
   **Target**: [design stage and unit]
   **Iterations**: [count]
   **Changes Applied**: [summary of accepted changes]
   **Method**: MCP (ouroboros)
   ```

3. Present completion summary:
   ```
   Design refinement complete.
   - Target: {stage/unit}
   - Iterations: {N}
   - Changes applied: {count}
   - Method: MCP (ouroboros)

   Updated files:
   - aidlc-docs/{path}/{file}.md

   Next steps:
   - `/crew:refine [stage]` — refine another design stage
   - `/crew:preflight` — validate environment, customize graph, check model auth
   - `/crew:run` — proceed to implementation (Construction phase)
   ```

---

## Critical Rules

1. **Read before writing** — always read the full design artifact before proposing changes.
2. **Preserve structure** — maintain existing document headings, formatting, and conventions.
3. **User decides** — never auto-apply changes. Always present and get approval.
4. **Context matters** — always load requirements for context. Design must align with requirements.
5. **Audit everything** — log all refinement activity in audit.md.
6. **Iterative, not destructive** — each iteration improves, never discards previous valid work.

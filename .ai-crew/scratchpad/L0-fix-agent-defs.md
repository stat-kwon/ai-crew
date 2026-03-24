# fix-agent-defs — Build Output

## Changes Made

### owner.md
- Added "Inception to Construction Handoff" section: documents that aidlc-docs/inception/ is frozen after Inception, distinguishes aidlc-state.md vs state.json
- Added "Audit Logging" section: ISO 8601, raw input preservation, append-only
- Graph Generation now presents `/crew:refine` (optional) then `/crew:run`
- Added critical rule #6: Inception artifacts are frozen

### planner.md
- Added "Data Flow Constraints" section before Investigation Protocol: explicitly states aidlc-docs/inception/ is READ-ONLY during Construction, reads from aidlc-docs/, writes to scratchpad/

### pm.md
- Investigation Protocol step 2 now reads aidlc-state.md (AI-DLC stage tracking) in addition to state.json (graph node tracking), with explanation that these are separate concerns
- Added "Inception Artifact Patching" section: pm_review and design_gate are the ONLY nodes allowed to patch aidlc-docs/inception/ via ooo evaluate, patches must be logged in audit.md
- Updated Rules to reference both state.json and aidlc-state.md

### builder.md, frontend-dev.md, backend-dev.md
- Added "Data Flow Constraints" section: aidlc-docs/ is READ-ONLY, reads from scratchpad for plans and aidlc-docs for design context, writes to scratchpad + project source code

### tester.md
- Added "Data Flow Constraints" section: aidlc-docs/ is READ-ONLY, writes to scratchpad + project test files

### reviewer.md
- Added "Data Flow Constraints" section: aidlc-docs/ is READ-ONLY, writes to scratchpad ONLY
- Removed dual-write pattern (previously wrote to both scratchpad AND aidlc-docs/construction/)
- Removed second output destination section (aidlc-docs/construction/{unit-name}/review-report.md)
- Added note that /crew:integrate converts scratchpad to permanent aidlc-docs record
- Fixed failure mode: "Forgetting aidlc-docs" changed to "Writing to aidlc-docs/"
- Removed duplicate checklist item for aidlc-docs report

### qa-engineer.md
- Added "Data Flow Constraints" section: aidlc-docs/ is READ-ONLY, writes to scratchpad + project test files

## Verification
- Build: N/A (markdown-only changes, no code modified)
- Tests: N/A (no test files affected)

## Decisions
- Kept all existing functionality intact; only added/modified the architecture alignment sections
- Used consistent "Data Flow Constraints" section naming across all Construction agents
- For reviewer, replaced dual-write with scratchpad-only + note about /crew:integrate

## Issues
- None

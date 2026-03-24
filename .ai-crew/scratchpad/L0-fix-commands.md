# fix-commands -- Build Output

## Changes Made

- `catalog/commands/crew-elaborate/elaborate.md:54`: Added ooo interview integration point at Requirements Analysis stage for structured requirements elicitation via ouroboros MCP.
- `catalog/commands/crew-auto/auto.md:28-30`: Added `.aidlc-rule-details/` reference for rule loading in Native AI-DLC Verification.
- `catalog/commands/crew-auto/auto.md:65-77`: Expanded Mandatory Gates from 3 to 7, adding Reverse Engineering, User Stories, Application Design, and Units Generation approval gates.
- `catalog/commands/crew-run/run.md:20-22`: Changed rule loading from `.ai-crew/rules/` to `.aidlc-rule-details/` when native AI-DLC detected.
- `catalog/commands/crew-run/run.md:210`: Changed aidlc-state.md from optional ("if it exists") to mandatory for native AI-DLC.
- `catalog/commands/crew-run/run.md:315-316`: Removed "if file exists" from Step 5 aidlc-state update.
- `catalog/commands/crew-run/run.md:377-379`: Added critical rules 15-16: agents read aidlc-docs/ (read-only), write scratchpad/; only pm_review/design_gate may patch inception/.
- `catalog/commands/crew-run/run.md:304-306`: Added read-only and write-scope constraints to agent prompt template.
- `catalog/commands/crew-integrate/integrate.md:105-132`: Added Step 4.5 for scratchpad-to-aidlc-docs/construction/ conversion (review reports, test results, code summaries), aidlc-state.md update, and audit.md append with ISO 8601.
- `catalog/commands/crew-status/status.md:18`: Added aidlc-state.md reading in Step 0.
- `catalog/commands/crew-status/status.md:105-126`: Added Section 2.5 for AI-DLC Stage Status display; renumbered Specs to 2.6 and updated to check aidlc-docs/inception/ as well.
- `catalog/commands/crew-checkpoint/checkpoint.md:19`: Added aidlcState field to checkpoint data gathering.
- `catalog/commands/crew-checkpoint/checkpoint.md:44`: Added aidlcState field to checkpoint JSON schema.
- `catalog/commands/crew-restore/restore.md:55-56`: Added aidlc-state.md restoration from checkpoint.aidlcState.
- `catalog/commands/crew-refine/refine.md:12-13`: Added write scope clarification -- refine writes to aidlc-docs/inception/ (correct during Inception), pm_review/design_gate also use this skill during Construction.
- `catalog/commands/crew-refine/refine.md:99`: Changed audit logging to explicitly require ISO 8601 format and append-only behavior.

## Verification
- Build: `npm run build` -> pass
- Tests: N/A (markdown template files, no unit tests applicable)

## Decisions
- Kept all edits minimal and targeted -- only added/modified lines directly related to the architecture alignment requirements.
- For crew:run rule loading, used conditional logic (native AI-DLC vs legacy) rather than removing `.ai-crew/rules/` entirely, preserving backward compatibility for non-AI-DLC bundles.
- For crew:status, added a new section 2.5 for AI-DLC stages rather than merging into existing sections, keeping display concerns separated.
- For crew:integrate Step 4.5, placed it between existing Steps 4 and 5 to maintain logical flow (convert before updating state).

## Issues
- None encountered. All edits were straightforward additive changes to markdown command files.

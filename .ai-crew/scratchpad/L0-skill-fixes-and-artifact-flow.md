# skill-fixes-and-artifact-flow -- Build Output

## Changes Made
- `catalog/skills/planning/SKILL.md:63-65`: Added "Artifact Flow" section documenting that plans write to scratchpad for graph executor consumption, and that aidlc-docs/inception/ is read-only during Construction.
- `catalog/skills/design-refinement/SKILL.md:19-22`: Added "Permission Rules" section specifying write permissions during Inception, pm_review/design_gate-only patching during Construction, and audit.md logging requirement.
- `docs/artifact-flow.md`: Created new artifact flow architecture document in Korean covering all 8 sections: overview, artifact stores, lifecycle rules, data flow diagram, state tracking, permission matrix, user flow, and design decisions.

## Verification
- Build: N/A (documentation-only changes, no code to build)
- Tests: N/A (no code changes requiring tests)

## Decisions
- Placed "Artifact Flow" section in planning SKILL.md before "Escalation & Stop Conditions" for logical reading order
- Placed "Permission Rules" section in design-refinement SKILL.md immediately after "When This Skill Applies" since permissions are a prerequisite concern
- Wrote docs/artifact-flow.md entirely in Korean to match existing docs/ convention (usage-guide.md, graph-workflow-design.md)

## Issues
- None

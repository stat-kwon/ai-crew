---
name: planning
description: Graph node implementation planning from AI-DLC design artifacts
version: 1.1.0
---

# Planning Skill

## When This Skill Applies
- Graph executor activates a plan node
- AI-DLC design artifacts exist in `aidlc-docs/`
- Upstream scratchpad provides context that needs task decomposition

## Do Not Use When
- AI-DLC Inception is not complete (no `aidlc-docs/` artifacts)
- Task is a simple bug fix with no design documents
- Requirements analysis is needed (use AI-DLC Inception instead)

## Steps

### 1. Load AI-DLC Artifacts (MANDATORY first step)

Read the AI-DLC design documents — these are the source of truth:
1. `aidlc-docs/inception/requirements/` — what to build
2. `aidlc-docs/inception/application-design/` — how it's designed
3. `aidlc-docs/construction/{unit}/` — unit-level design if exists
4. `aidlc-docs/inception/user-stories/` — if exists

**Do NOT re-analyze requirements.** AI-DLC already did this.

### 2. Map Design to Code Tasks

Convert each design element into concrete, file-level work items:
1. Map requirements → specific files to create/modify
2. Identify function signatures, data types, API contracts
3. Sequence tasks by dependency order
4. Identify cross-unit interfaces

### 3. Produce Task List

Write to `.ai-crew/scratchpad/L{level}-{node_id}.md`:

- **AI-DLC References**: Which design docs were used
- **Task Execution Order**: Concrete file/function-level tasks
- **Files to Create/Modify**: With purpose
- **Interface Dependencies**: Cross-unit contracts
- **Risks & Mitigations**: With responses
- **Assumptions**: Flagged uncertainties
- **Decisions**: Key choices with rationale

## Tool Usage
- Use `Read` and `Glob` to scan the codebase
- Use `Grep` to find patterns, conventions, and existing implementations
- Use `Agent` (Explore subagent) for deeper codebase analysis when needed
- Do NOT write code — task planning only

## Examples

**Good**: Read `aidlc-docs/inception/application-design/auth-design.md`, then produce: "Task 1: Create `src/auth/token.ts` with `validateToken(jwt: string): TokenPayload`. Task 2: Create `src/auth/middleware.ts` with `authMiddleware(req, res, next)`."

**Bad**: Ignore aidlc-docs/ and start from scratch: "Let me analyze what an auth system needs..." — This duplicates AI-DLC's work.

## Artifact Flow
- Plans are written to `.ai-crew/scratchpad/` for graph executor consumption. `/crew:integrate` later summarizes results to `aidlc-docs/construction/`.
- `aidlc-docs/inception/` is read-only during Construction. Do not modify inception artifacts from plan nodes.

## Escalation & Stop Conditions
- If AI-DLC artifacts are missing → stop, recommend running `/crew:elaborate` first
- If design contradicts existing code → document the conflict, proceed with codebase-compatible approach, flag for review

## Final Checklist
- [ ] All AI-DLC design artifacts loaded and referenced
- [ ] Tasks map to specific file paths (not vague descriptions)
- [ ] Task order respects dependencies
- [ ] Risks section is non-empty (or explicitly "None")
- [ ] Plan written to `.ai-crew/scratchpad/L{level}-{node_id}.md`

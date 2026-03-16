# /crew:elaborate - Inception Phase

You are the **Team Lead** for an AI-Crew project. You will perform the complete AI-DLC Inception phase for the user's intent. Your job is to transform a high-level intent description into a fully elaborated, unit-decomposed plan ready for agent team execution.

**User's Intent**: $ARGUMENTS

---

## Step 0: State Loading & Intent Initialization

1. Check if `.ai-crew/state.json` exists. Read it if it does.
2. Check if `.ai-crew/config.yaml` exists. Read it if it does.
3. **If an active intent exists** with `status != "complete"`:
   - Display the existing intent summary (id, description, status).
   - Ask the user: "An active intent already exists. Resume it, or start fresh?"
   - If resume: skip to the step matching the current state.
   - If fresh: archive the current intent (move specs to `specs/{old-intent-id}-archived/`) and proceed.
4. **If no active intent or starting fresh**:
   - Generate an intent ID: slugify the first 40 chars of `$ARGUMENTS`, append `-` and a short timestamp (e.g., `realtime-notifications-20260316143052`).
   - Create the initial state:
     ```json
     {
       "version": "2.0",
       "intent": {
         "id": "<generated-id>",
         "description": "$ARGUMENTS",
         "status": "elaborating",
         "completionCriteria": [],
         "createdAt": "<ISO-8601-now>",
         "updatedAt": "<ISO-8601-now>"
       },
       "units": [],
       "team": null,
       "events": [
         {
           "type": "intent:created",
           "payload": { "description": "$ARGUMENTS" },
           "timestamp": "<ISO-8601-now>"
         }
       ]
     }
     ```
   - Write this to `.ai-crew/state.json`.
   - Create the specs directory: `.ai-crew/specs/{intent-id}/`

---

## Step 1: Workspace Detection

**Read and follow**: `.ai-crew/aidlc-rule-details/inception/workspace-detection.md`

Perform a thorough workspace analysis:

1. **Scan the project root** (NOT `.ai-crew/`):
   - Look for source code files (`.ts`, `.js`, `.py`, `.java`, `.go`, `.rs`, `.rb`, `.php`, `.kt`, `.scala`, `.cpp`, `.c`, `.cs`, etc.)
   - Check for build files (`package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`, etc.)
   - Identify project structure (monolith, microservices, library, monorepo, empty)
   - Read existing `CLAUDE.md`, `README.md`, or similar docs for project context

2. **Record findings** internally:
   - **Existing Code**: Yes/No
   - **Project Type**: Greenfield / Brownfield
   - **Programming Languages**: list
   - **Build System**: name
   - **Project Structure**: type
   - **Frameworks/Libraries**: list

3. **Determine approach**:
   - Greenfield: proceed directly to Requirements Analysis
   - Brownfield: note existing patterns, conventions, and architecture for context in later steps

4. **Display a brief workspace summary** to the user (3-5 bullet points). Do NOT ask for approval -- proceed automatically.

---

## Step 2: Requirements Analysis

**Read and follow**: `.ai-crew/aidlc-rule-details/inception/requirements-analysis.md`
**Reference**: `.ai-crew/aidlc-rule-details/common/question-format-guide.md`

### 2.1: Analyze the User's Intent

Assess the request on these dimensions:
- **Clarity**: Clear / Vague / Incomplete
- **Type**: New Feature / Bug Fix / Refactoring / Enhancement / Migration / New Project
- **Scope**: Single File / Single Component / Multiple Components / System-wide
- **Complexity**: Trivial / Simple / Moderate / Complex

### 2.2: Determine Requirements Depth

Based on the analysis:
- **Minimal**: Clear and simple request, just document the basic understanding
- **Standard**: Needs clarification, functional and non-functional requirements needed
- **Comprehensive**: Complex project, high risk, detailed requirements with traceability

### 2.3: Generate Clarifying Questions

Create the file `.ai-crew/specs/{intent-id}/requirements-questions.md` with 3-7 clarifying questions using the question format guide:

```markdown
# Requirements Clarification Questions

Please answer the following questions to help clarify the requirements for: {intent description}

## Question 1
{question text}

A) {option}
B) {option}
...
X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2
...
```

**Question areas to cover** (adapt to context):
- Functional scope and boundaries
- User-facing behavior expectations
- Non-functional requirements (performance, security, scalability)
- Technical constraints or preferences
- Integration points with existing systems
- Success criteria and acceptance conditions
- Edge cases and error handling expectations

**Present the questions to the user and STOP. Wait for all answers before proceeding.**

### 2.4: Analyze Answers

After receiving answers:
1. Read the answered questions file
2. Check for contradictions, ambiguities, or vague responses ("not sure", "depends", "mix of")
3. If ANY ambiguity exists, create `.ai-crew/specs/{intent-id}/requirements-clarification.md` with follow-up questions
4. Repeat until all ambiguities are resolved

### 2.5: Generate Requirements Document

Create `.ai-crew/specs/{intent-id}/requirements.md`:

```markdown
# Requirements: {intent description}

## Intent Analysis
- **Request**: {original description}
- **Type**: {type}
- **Scope**: {scope}
- **Complexity**: {complexity}
- **Project Type**: {greenfield/brownfield}

## Functional Requirements
{numbered list of functional requirements derived from intent + answers}

## Non-Functional Requirements
{performance, security, scalability, maintainability requirements}

## Constraints
{technical constraints, dependencies, limitations}

## Success Criteria
{measurable completion criteria}

## Out of Scope
{explicitly excluded items}
```

Update `.ai-crew/state.json`: add `completionCriteria` array to the intent.

---

## Step 3: User Stories (Conditional)

**Read**: `.ai-crew/aidlc-rule-details/inception/user-stories.md`

### Assessment: Should user stories be generated?

**SKIP user stories if**:
- Pure refactoring with zero user impact
- Isolated bug fix with clear scope
- Infrastructure-only changes
- Developer tooling changes
- Simple, single-component enhancement with obvious behavior

**EXECUTE user stories if**:
- New user-facing features
- Multiple user personas involved
- Complex business logic with multiple scenarios
- Cross-team or multi-stakeholder project
- User experience changes

If skipping, inform the user: "Skipping user stories -- this task is straightforward enough to proceed directly to workflow planning." Then jump to Step 4.

If executing:
1. Create `.ai-crew/specs/{intent-id}/user-stories.md` with:
   - User personas (if multiple user types)
   - User stories in "As a [persona], I want [goal], so that [benefit]" format
   - Acceptance criteria for each story (Given/When/Then or checklist)
   - Stories should follow INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
2. Present to user for review. Wait for approval before proceeding.

---

## Step 4: Workflow Planning

**Read and follow**: `.ai-crew/aidlc-rule-details/inception/workflow-planning.md`

Determine which downstream phases are needed:

### 4.1: Phase Determination

For each optional phase, decide EXECUTE or SKIP with rationale:

| Phase | Execute If | Skip If |
|-------|-----------|---------|
| **Application Design** | New components/services needed, component interfaces need definition | Changes within existing boundaries, no new components |
| **Units Generation** | Multiple independent work streams, data models or APIs, complex business logic | Single unit of work, straightforward implementation |
| **Functional Design** | Complex business rules, domain modeling needed | Simple CRUD, clear implementation path |

### 4.2: Generate Workflow Plan

Create `.ai-crew/specs/{intent-id}/workflow-plan.md` with:
- Phase execution decisions (EXECUTE/SKIP + rationale for each)
- Dependency analysis
- Risk assessment (Low/Medium/High)
- Estimated complexity

Present a brief summary to the user. Proceed unless changes requested.

---

## Step 5: Application Design (Conditional)

**Read and follow**: `.ai-crew/aidlc-rule-details/inception/application-design.md`

**Skip** if workflow planning determined this phase is not needed. Jump to Step 6.

If executing:
1. Identify main functional components and their responsibilities
2. Define component interfaces (method signatures, input/output types)
3. Design service layer for orchestration
4. Map component dependencies and communication patterns

Create `.ai-crew/specs/{intent-id}/design.md`:

```markdown
# Application Design: {intent description}

## Component Overview
{high-level component diagram or description}

## Components

### {Component Name}
- **Purpose**: {what it does}
- **Responsibilities**: {bullet list}
- **Interface**:
  - `{methodName}({params}): {returnType}` -- {description}
- **Dependencies**: {list of components it depends on}

## Service Layer
{service definitions and orchestration patterns}

## Component Dependencies
{dependency matrix or graph showing relationships}

## Data Flow
{how data moves between components}
```

Present to user for review.

---

## Step 6: Units Generation

**Read and follow**: `.ai-crew/aidlc-rule-details/inception/units-generation.md`

Break the work down into executable **units** -- discrete, parallelizable work packages that can be assigned to individual agents.

### 6.1: Decomposition Strategy

Consider:
- **Dependency boundaries**: units should minimize cross-dependencies
- **Parallelism**: maximize units that can run concurrently
- **Size**: each unit should be completable in a single focused session (2-4 hours of agent work)
- **Testability**: each unit should be independently testable
- **Story mapping**: if user stories exist, map stories to units

### 6.2: Generate Tasks File

Create `.ai-crew/specs/{intent-id}/tasks.md`:

```markdown
# Units & Tasks: {intent description}

## Unit Dependency Graph

{text or mermaid diagram showing unit dependencies}

## Units

### Unit: {unit-id} -- {unit-name}
- **Description**: {what this unit delivers}
- **Dependencies**: {list of unit IDs this depends on, or "none"}
- **Stories**: {mapped user story IDs, if applicable}
- **Estimated Complexity**: {simple/moderate/complex}

#### Tasks
1. [ ] {task-title} -- {brief description}
2. [ ] {task-title} -- {brief description}
3. [ ] {task-title} -- {brief description}

#### Completion Criteria
- {measurable criterion}
- {measurable criterion}

#### Suggested Branch
`feature/{unit-id}`

---

### Unit: {unit-id} -- {unit-name}
...

## Execution Order

### Wave 1 (parallel)
- {unit-id}: {unit-name}
- {unit-id}: {unit-name}

### Wave 2 (after Wave 1)
- {unit-id}: {unit-name}

### Wave 3 (after Wave 2)
- {unit-id}: {unit-name}
```

### 6.3: For single-unit intents

If the entire intent is a single unit:
- Still create the unit structure (one unit with all tasks)
- Note that parallel execution is not applicable
- The execute phase will run a single agent

---

## Step 7: State Update

Update `.ai-crew/state.json` with the full elaboration results:

```json
{
  "version": "2.0",
  "intent": {
    "id": "{intent-id}",
    "description": "$ARGUMENTS",
    "status": "ready",
    "completionCriteria": [
      { "id": "cc-1", "description": "{criterion}", "verified": false, "verifiedAt": null },
      ...
    ],
    "createdAt": "{original}",
    "updatedAt": "{now}"
  },
  "units": [
    {
      "id": "{unit-id}",
      "name": "{unit-name}",
      "description": "{description}",
      "status": "pending",
      "dependencies": ["{other-unit-id}", ...],
      "assignedTo": null,
      "worktree": null,
      "branch": "feature/{unit-id}",
      "currentHat": null,
      "hatHistory": [],
      "tasks": [
        {
          "id": "{task-id}",
          "title": "{title}",
          "description": "{description}",
          "status": "pending",
          "files": [],
          "completedAt": null
        },
        ...
      ],
      "startedAt": null,
      "completedAt": null
    },
    ...
  ],
  "team": null,
  "events": [
    ...existing events,
    {
      "type": "intent:updated",
      "payload": { "status": "ready", "unitCount": {N} },
      "timestamp": "{now}"
    }
  ]
}
```

---

## Step 8: Summary & Next Steps

Present the final elaboration summary to the user:

```markdown
# Elaboration Complete

## Intent
**{intent description}**

## Workspace
- **Type**: {greenfield/brownfield}
- **Tech Stack**: {languages, frameworks}

## Specs Generated
- `requirements.md` -- {brief summary}
- `user-stories.md` -- {N stories} (or "skipped")
- `workflow-plan.md` -- {phases to execute}
- `design.md` -- {component count} components (or "skipped")
- `tasks.md` -- {N units}, {M total tasks}

## Units Overview
| Unit | Tasks | Dependencies | Complexity |
|------|-------|-------------|------------|
| {name} | {count} | {deps or "none"} | {level} |
| ... | ... | ... | ... |

## Execution Waves
- **Wave 1**: {units} (parallel)
- **Wave 2**: {units} (after Wave 1)
- ...

## Next Step
Run `/crew:execute` to begin the Construction phase with Agent Teams.

All specs are at: `.ai-crew/specs/{intent-id}/`
```

---

## Critical Rules

1. **All specs go in `.ai-crew/specs/{intent-id}/`** -- never pollute the project root with AI-Crew artifacts.
2. **State is the source of truth** -- always update `.ai-crew/state.json` after each major step.
3. **Follow the AIDLC rule files** -- read each referenced `.md` file before executing that step. The rules contain important nuances about depth, quality gates, and edge cases.
4. **Ask questions using files, not chat** -- per the question-format-guide, clarifying questions go in dedicated `.md` files with `[Answer]:` tags.
5. **Wait for user answers at gates** -- Steps 2 (requirements questions) and optionally 3 (user stories review) are blocking. Do NOT proceed without answers.
6. **Adapt depth to complexity** -- trivial intents skip user stories and application design. Complex intents execute all steps. Use your judgment.
7. **Units must be agent-assignable** -- each unit should be self-contained enough that an agent with the unit's spec, tasks, and project context can implement it independently.
8. **Preserve existing project conventions** -- for brownfield projects, match existing code style, directory structure, naming conventions, and architectural patterns.
9. **Intent IDs are stable** -- once generated, the intent ID does not change. All references use the same ID throughout the lifecycle.
10. **Events are append-only** -- never remove events from `state.json`, only append new ones.

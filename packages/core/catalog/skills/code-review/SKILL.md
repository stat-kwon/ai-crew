---
name: code-review
description: |
  Structured code review with severity ratings, explicit priority pyramid,
  type safety checks, and design review. Use when reviewing code changes,
  pull requests, or performing quality checks.
version: 2.0.0
---

# Code Review Skill

## When This Skill Applies
- User asks to review code or PR
- Agent is in reviewer role
- Quality gate check is needed
- Post-implementation validation

## Do Not Use When
- Writing or implementing code (use implementation skills)
- Running tests only without review (use testing skill)
- Reviewing design documents (use AI-DLC workflow)

---

## Review Pyramid (Priority Order)

Review findings in this strict priority order. Higher-priority issues block merge; lower-priority issues are suggestions.

| Priority | Category | Blocks Merge? | Examples |
|----------|----------|--------------|----------|
| 1 | **Security** | YES | SQL injection, XSS, exposed secrets, missing auth |
| 2 | **Correctness** | YES | Logic errors, race conditions, data loss risk |
| 3 | **Performance** | Sometimes | N+1 queries, memory leaks, missing indexes |
| 4 | **Design** | Sometimes | SRP violations, wrong abstraction, tight coupling |
| 5 | **Readability** | No | Unclear names, complex expressions, missing context |
| 6 | **Convention** | No | Formatting, import order, file organization |

**Rule**: Never block a PR for convention issues alone. Auto-formatters handle convention; reviewers handle correctness.

---

## Review Process

### 1. Read Changed Files
- Identify all modified, added, and deleted files
- Understand the context of each change (read surrounding code if needed)
- Check the PR description for intent — does the code match the stated goal?

### 2. Security Review
- Input validation and sanitization at all boundaries
- Authentication/authorization checks on new endpoints
- SQL injection, XSS, CSRF vulnerabilities
- Secrets or credentials in code (including debug/test secrets)
- Dependency additions — check for known vulnerabilities

### 3. Correctness Review
- Logic errors and edge cases
- Null/undefined handling (check all optional chains)
- Error handling completeness (what happens when X fails?)
- Race conditions in async code
- State consistency (can the system reach an invalid state?)

### 4. Performance Review
- N+1 queries (any query inside a loop)
- Unnecessary re-renders (React — missing memoization on expensive components)
- Memory leaks (event listeners not cleaned up, subscriptions not cancelled)
- Inefficient algorithms (O(n²) where O(n) is possible)
- Missing database indexes for new queries

### 5. Design Review

#### SRP Violation Detection
```
Does this function/class do more than one thing?
  Signs: "and" in the name, multiple reasons to change,
  unrelated imports, method groups that don't interact
```

#### Dependency Direction (Clean Architecture)
```
Domain → Application → Infrastructure
        (inward only)

BAD:  Domain entity imports from database layer
GOOD: Database layer implements interface defined in domain
```

#### Interface Design Check
- Are interfaces defined by consumers (not implementers)?
- Are types narrow (only what's needed, not the entire object)?
- Are generic types adding value or just complexity?

---

## Type Safety Review

### `any` Detection
Every `any` in TypeScript is a potential runtime error. Flag all uses.

| Usage | Verdict | Alternative |
|-------|---------|-------------|
| `catch (err: any)` | Acceptable (TS limitation) | `catch (err: unknown)` and narrow |
| `JSON.parse()` result | Needs validation | Use zod/io-ts to parse and validate |
| Function parameter `any` | Block | Use generics or union type |
| Third-party lib workaround | Acceptable with comment | `// @ts-expect-error: [reason]` |

### Type Inference vs Explicit Types
- **Let TypeScript infer** when the type is obvious: `const x = 5` (not `const x: number = 5`)
- **Be explicit** at function boundaries: parameters and return types
- **Be explicit** for exported APIs: always annotate public interfaces

### Generic Overuse
```typescript
// BAD: Generic adds no value
function getFirst<T>(arr: T[]): T | undefined { return arr[0]; }
// If T is always string in practice, just use string

// GOOD: Generic enables real reuse
function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]>
```

---

## Rating Severity

- **Critical**: Security vulnerability, data loss risk, crash — blocks merge
- **Major**: Logic error, performance issue, missing error handling — likely blocks
- **Minor**: Naming, minor optimization, style — does not block
- **Info**: Suggestion, alternative approach, learning opportunity — optional

---

## Report Format

```markdown
## Code Review Report

### Summary
{overall assessment: approve / request changes / needs discussion}

### Issues Found
| # | Severity | Category | File:Line | Description |
|---|----------|----------|-----------|-------------|

### Recommendations
{actionable suggestions, grouped by theme}
```

---

## Examples

**Good review comment**: "Missing input validation at `auth.ts:42` — the `userId` parameter is passed directly to the database query without sanitization. This is a SQL injection risk (Critical/Security). Fix: Add `validateUUID(userId)` before the query, or use parameterized queries."

**Bad review comment**: "Consider improving error handling in the auth module." — Vague, no location, not actionable.

**Good design feedback**: "The `OrderService` class handles both order validation and payment processing (SRP violation). When payment logic changes, this class changes for reasons unrelated to orders. Suggest: Extract `PaymentProcessor` and inject it."

**Bad design feedback**: "This should use dependency injection." — No explanation of the problem it solves.

---

## Anti-Patterns

**1. Nitpicking**
```
// BAD: Blocking PR for style preferences
"I'd use a ternary here instead of if/else"
"Can you rename `idx` to `index`?"

// GOOD: Save for team conventions discussion, not PR review
// Only mention style if it genuinely hurts readability
```

**2. Rubber-stamping**
```
// BAD: "LGTM 👍" on 500-line PR after 2 minutes
// GOOD: Read every changed file. If you can't invest the time,
//   say so and ask someone else to review.
```

**3. Scope creep in review**
```
// BAD: "While you're here, can you also refactor the User model?"
// GOOD: "I noticed the User model could use cleanup —
//   want me to create a follow-up issue?"
```

**4. Reviewing code you don't understand**
```
// BAD: Approving unfamiliar database migration without understanding impact
// GOOD: "I'm not familiar with this migration pattern —
//   tagging @db-team for a second review on the schema changes."
```

---

## Escalation & Stop Conditions
- Critical security issue → flag as blocking, do not approve until fixed
- 10+ issues in same file → suggest rewrite rather than patching
- Pattern problem (same issue across many files) → flag as architectural concern
- Missing tests for new business logic → request tests before approval

## Final Checklist
- [ ] All changed files reviewed with file:line references
- [ ] Security category checked (Priority 1)
- [ ] Correctness verified — logic, edge cases, error handling (Priority 2)
- [ ] Type safety reviewed — no untyped `any` without justification
- [ ] Design principles checked — SRP, dependency direction
- [ ] Test coverage assessed for new code
- [ ] Severity ratings applied to all findings
- [ ] Findings ordered by Review Pyramid priority

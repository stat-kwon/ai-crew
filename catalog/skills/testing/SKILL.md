---
name: testing
description: |
  Test writing skill with strategy, framework selection, contract testing,
  flaky test management, and coverage guidance. Handles unit, integration,
  e2e tests and TDD workflow.
version: 2.0.0
---

# Testing Skill

## When This Skill Applies
- Writing tests for new or existing code
- TDD workflow (write tests first)
- Quality gate verification
- Coverage improvement
- Test strategy decisions
- Contract testing between frontend and backend

## Do Not Use When
- Exploring or understanding code (use Read/Grep directly)
- Writing production code (use the relevant implementation skill)
- Running existing tests only (use Bash directly)

---

## Test Strategy

### Decision: Test Pyramid vs Testing Trophy

| Approach | Shape | Emphasis | Best For |
|----------|-------|----------|----------|
| Test Pyramid | Many unit → fewer integration → few e2e | Fast feedback, isolation | Libraries, pure logic, algorithms |
| Testing Trophy | Few unit → many integration → some e2e | Confidence in real behavior | Web apps, APIs, fullstack |

**Decision rule**: For business applications (APIs, web apps), prefer the Testing Trophy — integration tests give the highest confidence-to-cost ratio. For libraries and pure functions, the traditional pyramid works well.

### Decision: When to Use Which Test Type

```
Is it pure logic with no dependencies?
  → Unit test (fast, isolated, many)

Does it involve multiple components working together?
  → Integration test (real dependencies where practical, mock at boundaries)

Does it verify a user journey end-to-end?
  → E2E test (few, critical paths only)

Does it verify frontend↔backend API agreement?
  → Contract test (Pact or MSW-based)
```

| Test Type | Speed | Confidence | Cost to Maintain | Quantity |
|-----------|-------|------------|-----------------|----------|
| Unit | ~1ms | Low-Medium | Low | Many |
| Integration | ~100ms | High | Medium | Moderate |
| E2E | ~seconds | Highest | High | Few (critical paths) |
| Contract | ~10ms | Medium-High | Low | Per API endpoint |

---

## Contract Testing

### Why: Fullstack Parallel Development
When frontend and backend develop in parallel, API contracts can drift. Contract tests catch this before integration.

### Pattern: Consumer-Driven Contracts with MSW

```typescript
// Shared contract definition (source of truth)
// contracts/user-api.ts
export const userContract = {
  getUser: {
    method: 'GET' as const,
    path: '/api/users/:id',
    response: {
      id: 'string',
      name: 'string',
      email: 'string',
    },
  },
};

// Frontend test — MSW handler validates contract
import { http, HttpResponse } from 'msw';
const handlers = [
  http.get('/api/users/:id', () =>
    HttpResponse.json({ id: '1', name: 'Alice', email: 'alice@example.com' })
  ),
];

// Backend test — supertest validates same contract shape
it('GET /api/users/:id returns contract-compliant response', async () => {
  const res = await request(app).get('/api/users/1');
  expect(res.body).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    email: expect.any(String),
  });
});
```

### Pattern: Pact for Microservices
Use Pact when frontend and backend are in separate repos/teams. The consumer generates a pact file, the provider verifies against it in CI.

---

## Framework Selection

### Decision: vitest vs jest

| Factor | vitest | jest |
|--------|--------|------|
| Vite-based project | Best (native) | Needs config |
| ESM support | Native | Experimental |
| Speed | Faster (Vite transform) | Slower (Babel) |
| Ecosystem / maturity | Growing | Established |
| Watch mode | HMR-level fast | Good |

**Rule**: Use vitest for Vite projects, jest for everything else. Don't mix — pick one per project.

### MSW for API Mocking

```typescript
// Prefer MSW over manual fetch mocks — it intercepts at the network level
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users', () =>
    HttpResponse.json([{ id: '1', name: 'Alice' }])
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Override for specific test
it('handles server error', async () => {
  server.use(
    http.get('/api/users', () => HttpResponse.json(null, { status: 500 }))
  );
  // ... test error handling
});
```

### React Testing Library Patterns

```tsx
// GOOD: Query by role (accessible, resilient to refactoring)
const submitButton = screen.getByRole('button', { name: /submit/i });
const emailInput = screen.getByLabelText(/email/i);

// BAD: Query by test ID when accessible query exists
const submitButton = screen.getByTestId('submit-btn');

// GOOD: Test user behavior
await userEvent.type(emailInput, 'test@example.com');
await userEvent.click(submitButton);
expect(screen.getByText(/success/i)).toBeInTheDocument();

// BAD: Test implementation details
expect(component.state.email).toBe('test@example.com');
```

---

## Test Structure

### Naming Convention
```typescript
describe('OrderService', () => {
  describe('calculateTotal', () => {
    it('should apply discount when order exceeds $100', () => { ... });
    it('should throw ValidationError when items array is empty', () => { ... });
    it('should round total to 2 decimal places', () => { ... });
  });
});
```

**Pattern**: `should {expected behavior} when {condition}`

### Coverage Targets

- Happy path: primary use case
- Error path: expected failure modes
- Edge cases: boundary values, empty inputs, null handling
- Integration: component interaction points

### TDD Flow (when applicable)
1. **Red**: Write failing test that describes expected behavior
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code while keeping tests green

---

## Flaky Test Management

### Detection
- Track test pass rates in CI (any test < 99% pass rate is flaky)
- Tag flaky tests immediately when discovered

### Decision: Retry vs Fix vs Quarantine

```
Is the root cause known?
  YES → Fix it. Never retry a test with a known bug.
  NO  → Is it blocking CI for the team?
    YES → Quarantine (skip in CI, track in issue tracker)
    NO  → Investigate with retry + logging to gather data
```

### Common Flaky Causes and Fixes
| Cause | Fix |
|-------|-----|
| Timing/race condition | Use `waitFor()`, `findBy*` queries, not `sleep()` |
| Shared state between tests | Isolate — reset DB, clear mocks in `beforeEach` |
| Network dependency | Mock with MSW |
| Non-deterministic data | Use fixed seeds, factories, not `Math.random()` |
| Port conflicts | Use random ports or dynamic allocation |

---

## Coverage Guidance

### The 80% Coverage Trap
Line coverage alone is misleading. 80% line coverage with no branch coverage misses critical error paths.

**Decision: What to measure**
| Metric | Value | Limitation |
|--------|-------|-----------|
| Line coverage | Easy to understand | Doesn't catch missing branches |
| Branch coverage | Catches if/else paths | Doesn't measure behavior quality |
| Mutation testing | Highest confidence | Slow, complex setup |

**Rule**: Target branch coverage over line coverage. A function with 100% line coverage but 50% branch coverage has untested error paths.

### What NOT to Test
- Third-party library internals (trust the library)
- Trivial getters/setters with no logic
- Framework boilerplate (React component that just renders children)
- Auto-generated code (GraphQL types, Prisma client)

---

## Test Quality Rules
- Tests should be independent (no shared mutable state)
- Tests should be deterministic (no flaky tests)
- Mock external dependencies, not internal logic
- Prefer real implementations over mocks when practical
- Each test should verify one behavior

---

## Anti-Patterns

**1. Snapshot abuse**
```typescript
// BAD: Snapshot of entire component output — breaks on any change, nobody reads the diff
expect(component).toMatchSnapshot();

// GOOD: Assert specific, meaningful values
expect(screen.getByRole('heading')).toHaveTextContent('Welcome, Alice');
expect(screen.getByRole('list').children).toHaveLength(3);
```

**2. Testing implementation details**
```typescript
// BAD: Testing internal state — breaks on refactoring
expect(component.state.isLoading).toBe(false);
expect(mockFn).toHaveBeenCalledTimes(1);

// GOOD: Testing observable behavior
expect(screen.getByText('Data loaded')).toBeInTheDocument();
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
```

**3. Slow test suites**
```typescript
// BAD: Real API calls, real database, no parallelization
beforeAll(async () => { await seedDatabase(); });  // 5 seconds per test file

// GOOD: In-memory or mocked dependencies, parallel test files
// Use vitest --pool=threads or jest --maxWorkers=auto
```

**4. Tests that pass but verify nothing**
```typescript
// BAD: "Coverage padding" — test exists but asserts nothing meaningful
it('should render', () => {
  render(<UserProfile user={mockUser} />);
  // No assertions!
});

// GOOD: Assert meaningful behavior
it('should display user name and email', () => {
  render(<UserProfile user={mockUser} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('alice@example.com')).toBeInTheDocument();
});
```

---

## Escalation & Stop Conditions
- If test framework is not set up → document what's needed, flag for setup
- If 3+ tests fail for the same root cause → fix the root cause, not individual tests
- If existing tests are flaky → fix flakiness before adding new tests
- If coverage drops below project threshold → flag before merging

## Final Checklist
- [ ] Test file location matches project conventions
- [ ] Happy path, error path, and edge cases covered
- [ ] Tests are independent and deterministic
- [ ] External dependencies mocked (MSW for HTTP, mocks for services)
- [ ] Branch coverage checked for critical paths
- [ ] No snapshot tests for dynamic content
- [ ] All tests run and produce expected results

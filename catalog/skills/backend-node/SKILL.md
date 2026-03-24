---
name: backend-node
description: |
  Node.js backend development patterns including API implementation,
  database integration, resilience, observability, and server architecture.
version: 2.0.0
---

# Backend Node Skill

## When This Skill Applies
- Building REST or GraphQL APIs
- Database schema and query design
- Server-side business logic
- Backend testing
- Resilience and error handling patterns

## Do Not Use When
- Frontend/UI implementation (use frontend-react skill)
- Infrastructure/deployment configuration (use infrastructure design)
- API contract design from scratch (use api-design skill)
- Database schema design and migration strategy (use database-engineering skill)
- Project uses a different backend language/framework (adapt patterns accordingly)

---

## API Implementation

### Error Response Standard (RFC 7807)
Always return structured errors using `application/problem+json`:

```typescript
interface ProblemDetails {
  type: string;       // URI identifying error class
  title: string;      // Stable human-readable summary
  status: number;     // HTTP status code
  detail?: string;    // Instance-specific explanation
  instance?: string;  // Request trace ID
}
```

**Decision: When to use which status code:**
- `400` — Malformed request (bad JSON, missing required field)
- `422` — Well-formed but semantically invalid (email format wrong)
- `409` — Conflict with current state (duplicate, stale update)
- `429` — Rate limit exceeded (always include `Retry-After` header)

### Pagination

**Decision: Cursor vs Offset**
| Factor | Cursor | Offset |
|--------|--------|--------|
| Dataset changes during paging | Safe | Skips/duplicates |
| Deep pages (page 1000+) | Constant perf | Degrades |
| "Jump to page N" needed | Not possible | Works |
| Implementation complexity | Higher | Lower |

**Rule**: Default to cursor-based. Use offset only for admin dashboards or small static datasets.

```typescript
// Cursor pagination — fetch one extra row to detect hasMore
const rows = await db.query(
  `SELECT * FROM items WHERE id > $1 ORDER BY id ASC LIMIT $2`,
  [decodeCursor(cursor), limit + 1]
);
const hasMore = rows.length > limit;
const data = hasMore ? rows.slice(0, limit) : rows;
```

### API Versioning
- **Public APIs**: URL path versioning (`/v1/resources`)
- **Internal APIs**: Header versioning (`Api-Version: 2`)
- **Breaking change definition**: Removing a field, changing a field type, changing response structure, removing an endpoint

---

## Database Patterns

> For schema design, migration strategy, and indexing deep-dives, use the **database-engineering** skill. This section covers Node.js-specific integration patterns.

### N+1 Query Detection and Prevention

```typescript
// BAD: N+1 — one query per order
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  user.orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
}

// GOOD: Batch load with IN clause
const users = await db.query('SELECT * FROM users');
const userIds = users.map(u => u.id);
const orders = await db.query('SELECT * FROM orders WHERE user_id = ANY($1)', [userIds]);
const ordersByUser = groupBy(orders, 'user_id');
users.forEach(u => u.orders = ordersByUser[u.id] ?? []);
```

**Detection rule**: Any query inside a loop is a potential N+1. Use query logging in development to count queries per request.

### Transaction Patterns

```typescript
// Use a transaction wrapper that auto-rollbacks on error
async function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await db.beginTransaction();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// Usage
await withTransaction(async (tx) => {
  await tx.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await tx.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
});
```

### Connection Pool Management
- Set pool size based on: `pool_size = (cpu_cores * 2) + disk_spindles` (PgBouncer rule of thumb)
- Always set `connectionTimeoutMillis` and `idleTimeoutMillis`
- Monitor pool exhaustion with metrics (`pool.waitingCount > 0` is a warning)

---

## Resilience Patterns

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries: number; baseDelayMs: number; retryOn: (err: Error) => boolean }
): Promise<T> {
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === opts.maxRetries || !opts.retryOn(err as Error)) throw err;
      const delay = opts.baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
```

**Decision: When to retry**
- `5xx` from downstream → Retry (transient)
- `429` → Retry with `Retry-After`
- `4xx` → Never retry (client error, won't change)
- Network timeout → Retry if operation is idempotent

### Circuit Breaker
- **Closed** (normal) → Track failure rate
- **Open** (failing) → Fast-fail for `resetTimeoutMs`, return fallback
- **Half-open** → Allow one probe request, close on success

**Rule**: Every external HTTP call and database query should have a timeout. No timeout = unbounded resource leak.

### Graceful Degradation
- Cache recent responses; serve stale data when dependency is down
- Disable non-critical features (recommendations, analytics) to preserve core functionality
- Return partial results with degradation indicator in response

---

## Observability

### Structured Logging Pattern

```typescript
// Every log entry MUST include these fields
interface LogContext {
  requestId: string;       // Unique per request (from X-Request-ID or generated)
  correlationId: string;   // Shared across service boundaries
  service: string;         // Service name
  timestamp: string;       // ISO 8601
}

// BAD: unstructured
logger.info(`User ${userId} created order ${orderId}`);

// GOOD: structured with context
logger.info('Order created', {
  requestId: ctx.requestId,
  correlationId: ctx.correlationId,
  userId,
  orderId,
  amount: order.total,
});
```

### Error Context Rules
- Always log the original error with stack trace
- Include the operation that failed and its inputs (sanitized — no passwords/tokens)
- Include downstream service name and response status for external call failures
- Use error codes (not just messages) for machine-parseable alerting

---

## Error Handling

### Typed Error Classes

```typescript
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly type: string;
  readonly isOperational = true;  // Distinguish from programmer errors
}

class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly type = 'not-found';
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}

class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly type = 'validation-error';
  constructor(public readonly fields: { field: string; message: string }[]) {
    super('Validation failed');
  }
}
```

### Global Error Handler

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    // Known operational error — return structured response
    return res.status(err.statusCode).json({
      type: `https://api.example.com/errors/${err.type}`,
      title: err.message,
      status: err.statusCode,
      instance: req.requestId,
    });
  }
  // Unknown error — log full context, return generic 500
  logger.error('Unhandled error', { err, requestId: req.requestId });
  res.status(500).json({
    type: 'https://api.example.com/errors/internal',
    title: 'Internal server error',
    status: 500,
  });
});
```

---

## Security
- Validate and sanitize all input at API boundaries
- Use environment variables for secrets (never hardcode)
- Implement rate limiting (token bucket for user-facing)
- Set security headers (helmet)
- Use CORS properly — explicit allowlist, not `*` in production

---

## Anti-Patterns

**1. String interpolation in SQL**
```typescript
// BAD — SQL injection
db.query(`SELECT * FROM users WHERE email = '${email}'`);
// GOOD — parameterized
db.query('SELECT * FROM users WHERE email = $1', [email]);
```

**2. Swallowing errors silently**
```typescript
// BAD — error disappears, debugging nightmare
try { await sendEmail(user); } catch (e) { /* ignore */ }
// GOOD — log and continue if non-critical
try { await sendEmail(user); } catch (e) {
  logger.warn('Email send failed', { userId: user.id, error: e });
}
```

**3. Missing timeouts on external calls**
```typescript
// BAD — waits forever if downstream hangs
const resp = await fetch('https://payment-service/charge', { method: 'POST', body });
// GOOD — explicit timeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
const resp = await fetch('https://payment-service/charge', {
  method: 'POST', body, signal: controller.signal,
});
```

**4. Exposing internal errors to clients**
```typescript
// BAD — leaks stack trace and internal details
res.status(500).json({ error: err.message, stack: err.stack });
// GOOD — generic message, log internally
logger.error('Unhandled', { err });
res.status(500).json({ type: 'internal', title: 'Internal server error', status: 500 });
```

---

## Escalation & Stop Conditions
- Security vulnerability detected → flag immediately, do not deploy
- Database migration conflicts → resolve before proceeding
- External service dependency unavailable → mock and flag for integration testing
- N+1 query detected → fix before merging

## Final Checklist
- [ ] All input validated at API boundaries
- [ ] Parameterized queries used (no string interpolation in SQL)
- [ ] Error handling with typed errors and global handler
- [ ] No hardcoded secrets (environment variables used)
- [ ] Timeouts set on all external calls
- [ ] Structured logging with request-id and correlation-id
- [ ] N+1 queries checked and eliminated
- [ ] Retry/circuit breaker for external dependencies
- [ ] Integration tests written for API endpoints

---
name: database-engineering
description: |
  Database schema design, migration strategy, indexing, query optimization,
  and connection management. Covers relational databases with patterns
  applicable to PostgreSQL, MySQL, and SQLite.
version: 1.0.0
---

# Database Engineering Skill

## When This Skill Applies
- Designing database schemas for new features
- Writing and reviewing migrations
- Optimizing slow queries
- Choosing indexing strategies
- Connection pool tuning
- Deciding normalization vs denormalization

## Do Not Use When
- API endpoint implementation (use backend-node skill)
- NoSQL-specific design (document stores, graph DBs — adapt patterns)
- Infrastructure provisioning (use infrastructure design)
- ORM-specific API questions (check ORM documentation)

---

## Schema Design

### Decision: Normalization vs Denormalization

| Factor | Normalize (3NF) | Denormalize |
|--------|-----------------|-------------|
| Write patterns | Many updates to shared data | Rare updates, append-heavy |
| Read patterns | Complex joins acceptable | Need fast single-table reads |
| Data integrity | Critical (financial, medical) | Eventual consistency OK |
| Storage cost | Lower (no duplication) | Higher (duplicated data) |
| Query simplicity | More joins | Fewer joins |

**Decision rule**: Start normalized. Denormalize specific tables only when you have measured query performance problems and the join is the bottleneck.

### Relationship Design

#### One-to-Many (1:N)
```sql
-- Foreign key on the "many" side
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

#### Many-to-Many (M:N)
```sql
-- Junction table with composite primary key
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
```

#### Polymorphic Associations
```sql
-- GOOD: Separate FK columns (type-safe, indexable)
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  body TEXT NOT NULL,
  article_id UUID REFERENCES articles(id),
  video_id UUID REFERENCES videos(id),
  CHECK (
    (article_id IS NOT NULL AND video_id IS NULL) OR
    (article_id IS NULL AND video_id IS NOT NULL)
  )
);

-- BAD: commentable_type + commentable_id (no FK constraint, no type safety)
-- This is the EAV anti-pattern for relationships
```

### Primary Key Strategy

| Type | Pros | Cons | Use When |
|------|------|------|----------|
| UUID v4 | Globally unique, no coordination | 36 bytes, random = bad index locality | Distributed systems, public-facing IDs |
| UUID v7 | Sortable by time + globally unique | 36 bytes | Best default for new projects |
| BIGSERIAL | 8 bytes, fast, good locality | Sequential = guessable, coordination needed | Internal-only tables, high-write |
| CUID2 | URL-safe, sortable, collision-resistant | String type, larger than int | Public-facing IDs in web apps |

**Rule**: Default to UUID v7 for new projects. Use BIGSERIAL only for high-write internal tables where size matters.

---

## Migrations

### Up/Down Pattern
Every migration MUST have both up (apply) and down (rollback):

```sql
-- migrations/20240115_add_email_verified.up.sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

-- migrations/20240115_add_email_verified.down.sql
ALTER TABLE users DROP COLUMN email_verified;
```

### Zero-Downtime Migration Pattern

For breaking changes, use the expand-contract pattern:

```
Phase 1 (Expand): Add new column alongside old
  ALTER TABLE users ADD COLUMN display_name TEXT;

Phase 2 (Backfill): Copy data, deploy code that writes to both
  UPDATE users SET display_name = name WHERE display_name IS NULL;

Phase 3 (Switch): Deploy code that reads from new column only

Phase 4 (Contract): Remove old column
  ALTER TABLE users DROP COLUMN name;
```

**Rule**: Never rename or drop a column in a single migration if the application is running. Always use expand-contract.

### Dangerous Migration Operations

| Operation | Risk | Safe Alternative |
|-----------|------|-----------------|
| DROP COLUMN | Data loss, app crash if code reads it | Expand-contract over 2+ deploys |
| RENAME COLUMN | App crash on old code | Add new → backfill → switch → drop old |
| ADD NOT NULL without default | Locks table, fails on existing rows | ADD with DEFAULT, then ALTER DROP DEFAULT |
| CREATE INDEX | Locks table on large tables | CREATE INDEX CONCURRENTLY (Postgres) |
| ALTER TYPE | Full table rewrite | Add new column, backfill, switch |

### Rollback Strategy
- Every migration must be reversible
- Test rollback in staging before production
- For data migrations: backup affected rows before modification
- **Never** rollback in production without testing the down migration first

---

## Indexing

### Index Type Selection

| Type | Use For | Example |
|------|---------|---------|
| B-tree (default) | Equality, range, sorting, LIKE 'prefix%' | Most queries |
| Hash | Equality only (faster than B-tree for =) | Lookup tables |
| GIN | Full-text search, JSONB containment, arrays | `WHERE tags @> '{news}'` |
| GiST | Geometric, range types, proximity | PostGIS, tsrange |

### Composite Index Rules

A composite index on `(a, b, c)` serves queries on:
- `WHERE a = ?` — Yes
- `WHERE a = ? AND b = ?` — Yes
- `WHERE a = ? AND b = ? AND c = ?` — Yes
- `WHERE b = ? AND c = ?` — **No** (leftmost prefix rule)
- `WHERE a = ? AND c = ?` — Partial (uses `a` only)

**Column ordering rule**: Most selective (highest cardinality) column first, then by query frequency.

### Covering Index
Include all columns the query needs, so the DB never hits the table:

```sql
-- Query: SELECT email, name FROM users WHERE email = ?
CREATE INDEX idx_users_email_covering ON users(email) INCLUDE (name);
-- Index-only scan — no table lookup
```

### When NOT to Index
- Tables with fewer than 1,000 rows (sequential scan is faster)
- Columns with very low cardinality (boolean, status with 3 values)
- Write-heavy tables where index maintenance cost exceeds read benefit
- Columns rarely used in WHERE/JOIN/ORDER BY

---

## Query Optimization

### Reading EXPLAIN Output

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 'abc' ORDER BY created_at DESC LIMIT 10;
```

Key things to look for:
| Signal | Meaning | Action |
|--------|---------|--------|
| Seq Scan on large table | Missing index | Add index on filter column |
| Nested Loop with high row count | N+1 or cartesian join | Fix join condition or use batch |
| Sort with high cost | Missing index for ORDER BY | Add composite index (filter + sort) |
| actual rows >> estimated rows | Stale statistics | Run ANALYZE |
| Bitmap Heap Scan | Index hit many rows | Consider partial index or query redesign |

### N+1 Detection and Resolution

```sql
-- BAD: One query per user to get orders (N+1)
-- Application code: for each user, SELECT * FROM orders WHERE user_id = ?

-- GOOD: Single query with JOIN
SELECT u.id, u.name, o.id as order_id, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = true;

-- GOOD: Batch with IN (when JOIN would return too much data)
SELECT * FROM orders WHERE user_id = ANY($1);  -- $1 = array of user IDs
```

### Subquery vs JOIN

| Use JOIN When | Use Subquery When |
|---------------|------------------|
| Need columns from both tables | Need existence check (`EXISTS`) |
| Result set is manageable | Correlated subquery is more readable |
| Performance testing shows JOIN is faster | Need aggregate in filter (`WHERE x > (SELECT AVG...)`) |

**Rule**: Default to JOIN. Use subquery when it's more readable or when EXISTS/NOT EXISTS is needed.

### Pagination with Cursor (Keyset Pagination)

```sql
-- BAD: OFFSET degrades linearly
SELECT * FROM articles ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
-- DB must scan and discard 10,000 rows

-- GOOD: Keyset pagination using indexed column
SELECT * FROM articles
WHERE created_at < $1  -- cursor value from last row of previous page
ORDER BY created_at DESC
LIMIT 20;
-- Starts from index position, constant performance
```

**Requirement**: The cursor column(s) must have a unique, ordered index.

---

## Connection Management

### Pool Sizing

**Formula** (PostgreSQL rule of thumb):
```
optimal_pool_size = (cpu_cores * 2) + effective_disk_spindles
```

For cloud databases (SSD): `cpu_cores * 2 + 1` is a reasonable starting point.

| Setting | Recommendation |
|---------|---------------|
| Min connections | 2-5 (keep warm) |
| Max connections | Formula above per service instance |
| Idle timeout | 30-60 seconds |
| Connection timeout | 5 seconds (fail fast) |
| Statement timeout | 30 seconds (prevent runaway queries) |

### Transaction Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use When |
|-------|-----------|-------------------|-------------|----------|
| Read Committed (default) | No | Possible | Possible | Most CRUD operations |
| Repeatable Read | No | No | Possible | Reports that need consistent snapshot |
| Serializable | No | No | No | Financial operations, inventory |

**Decision rule**: Use Read Committed (default) unless you have a specific consistency requirement. Serializable adds significant overhead.

```typescript
// Only upgrade isolation when needed
await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
await db.query('UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2', [qty, productId]);
await db.query('COMMIT');
```

---

## Anti-Patterns

**1. EAV (Entity-Attribute-Value) pattern abuse**
```sql
-- BAD: Dynamic attributes as key-value pairs
CREATE TABLE attributes (
  entity_id UUID, attribute_name TEXT, attribute_value TEXT
);
-- No type safety, no constraints, impossible to query efficiently

-- GOOD: JSONB column for truly dynamic attributes
ALTER TABLE products ADD COLUMN metadata JSONB DEFAULT '{}';
-- Or: dedicated columns for known attributes
```

**2. Soft delete everywhere**
```sql
-- BAD: Every table has is_deleted, queries always need WHERE is_deleted = false
-- Problems: forgotten filters, index bloat, UNIQUE constraints broken

-- GOOD: Use soft delete ONLY when you have a legal/audit requirement
-- Otherwise: hard delete + audit log table
-- If soft delete is needed: use deleted_at TIMESTAMPTZ (null = active)
-- And use a partial index: CREATE INDEX idx_active ON users(id) WHERE deleted_at IS NULL;
```

**3. UUID v4 as clustered primary key**
```sql
-- BAD: Random UUIDs cause index page splits and fragmentation
CREATE TABLE events (id UUID PRIMARY KEY DEFAULT gen_random_uuid());

-- GOOD: Use UUID v7 (time-ordered) or BIGSERIAL for write-heavy tables
CREATE TABLE events (id UUID PRIMARY KEY DEFAULT uuidv7());
```

**4. Missing foreign key constraints**
```sql
-- BAD: "We'll enforce relationships in the application"
-- Application bugs WILL create orphaned rows

-- GOOD: Always use FK constraints with appropriate ON DELETE action
CREATE TABLE orders (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);
```

**5. Unbounded queries**
```sql
-- BAD: No LIMIT — returns millions of rows
SELECT * FROM logs WHERE level = 'error';

-- GOOD: Always LIMIT, even for internal queries
SELECT * FROM logs WHERE level = 'error' ORDER BY created_at DESC LIMIT 100;
```

---

## Escalation & Stop Conditions
- Migration drops data without backup → STOP, add rollback plan
- Query without LIMIT on large table → fix before deploying
- Missing index on production query > 100ms → flag for immediate fix
- Foreign key constraint missing → add before data is inserted

## Final Checklist
- [ ] Schema normalized (denormalization justified with evidence)
- [ ] All relationships have foreign key constraints
- [ ] Primary key strategy chosen and consistent
- [ ] Migrations have both up and down scripts
- [ ] Breaking migrations use expand-contract pattern
- [ ] Indexes created for all WHERE/JOIN/ORDER BY columns
- [ ] EXPLAIN analyzed for critical queries
- [ ] Connection pool sized appropriately
- [ ] No unbounded queries (LIMIT on all SELECTs)
- [ ] N+1 queries checked and eliminated

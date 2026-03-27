---
name: api-design
description: |
  API contract design for fullstack development. Contract-first with OpenAPI,
  REST patterns, versioning, authentication, error standards, and GraphQL
  decision criteria. Used by both API producers and consumers.
version: 1.0.0
---

# API Design Skill

## When This Skill Applies
- Designing new API endpoints or services
- Writing OpenAPI / Swagger specifications
- Deciding between REST, GraphQL, or gRPC
- Establishing error response format standards
- Designing pagination, versioning, or authentication schemes
- Frontend↔Backend contract definition in fullstack projects

## Do Not Use When
- Implementing API handlers (use backend-node skill)
- Internal function/method interfaces (use clean-code skill)
- Database schema design (use database-engineering skill)
- Security audit of existing APIs (use security-audit skill)

---

## Core Principle: Contract-First Development

**Design the API contract before writing implementation code.**

In AI-DLC workflow: Design artifacts → OpenAPI spec → Implementation. The spec is the single source of truth that both frontend and backend develop against.

```
AI-DLC Design Output
    ↓
OpenAPI 3.1 Spec (contract)
    ↓                ↓
Backend implements   Frontend develops against
server handlers      mock server (MSW/Prism)
    ↓                ↓
Contract tests verify both sides match
```

---

## REST Design

### Resource Naming
- **Plural nouns**: `/users`, `/orders`, `/articles`
- **Kebab-case**: `/user-profiles`, not `/userProfiles`
- **No verbs in path**: `POST /orders` not `POST /create-order`
- **Sub-resources for ownership**: `/users/{id}/orders`
- **Actions as sub-resource verbs** (when CRUD doesn't fit): `POST /orders/{id}/cancel`

### HTTP Method Semantics

| Method | Idempotent | Safe | Body | Use For |
|--------|-----------|------|------|---------|
| GET | Yes | Yes | No | Read resource(s) |
| POST | No | No | Yes | Create, trigger action |
| PUT | Yes | No | Yes | Full replace |
| PATCH | No | No | Yes | Partial update |
| DELETE | Yes | No | No | Remove |

### Status Code Guide

| Scenario | Code | When |
|----------|------|------|
| Success with body | 200 | GET, PUT, PATCH |
| Created | 201 | POST that creates |
| Success, no body | 204 | DELETE, PUT with no response |
| Bad request | 400 | Malformed JSON, missing required field |
| Unauthorized | 401 | Missing or invalid token |
| Forbidden | 403 | Valid token, insufficient permission |
| Not found | 404 | Resource doesn't exist |
| Conflict | 409 | Duplicate, stale update (optimistic lock) |
| Validation error | 422 | Well-formed but semantically invalid |
| Rate limited | 429 | Always include `Retry-After` |
| Server error | 500 | Unexpected failure |

---

## Error Response Standard (RFC 7807)

All APIs MUST use a consistent error format. Use `application/problem+json`.

```typescript
interface ProblemDetails {
  type: string;       // URI identifying error class (stable, machine-readable)
  title: string;      // Human-readable summary (stable per type)
  status: number;     // HTTP status code (redundant but useful for clients)
  detail?: string;    // Instance-specific human-readable explanation
  instance?: string;  // URI of the failing request (e.g., trace ID)
}

// Validation errors — extend with field-level details
interface ValidationProblem extends ProblemDetails {
  errors: Array<{ field: string; message: string; code: string }>;
}
```

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Request validation failed",
  "status": 422,
  "detail": "2 fields failed validation",
  "instance": "/requests/req-abc123",
  "errors": [
    { "field": "email", "message": "Must be a valid email address", "code": "invalid_format" },
    { "field": "name", "message": "Must not be empty", "code": "required" }
  ]
}
```

---

## Pagination

### Decision: Cursor vs Offset

| Factor | Cursor-Based | Offset-Based |
|--------|-------------|-------------|
| Data changes during paging | Safe (stable) | Skips/duplicates |
| Deep pages (page 1000+) | O(1) per page | O(n) — DB scans offset rows |
| "Jump to page N" | Not possible | Works |
| Total count available | No (or expensive) | Yes |
| Implementation complexity | Higher | Lower |

**Decision rule**:
- User-facing lists, feeds, infinite scroll → **Cursor**
- Admin tables with page numbers, small datasets → **Offset**
- Default to cursor unless "jump to page" is a hard requirement

### Cursor Pagination Response Shape

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;  // Opaque, base64-encoded
    hasMore: boolean;
  };
}

// Request: GET /v1/articles?cursor=abc123&limit=20
// Response: { data: [...], pagination: { nextCursor: "def456", hasMore: true } }
```

### Offset Pagination Response Shape

```typescript
interface OffsetPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
```

---

## Versioning

### Decision: URL Path vs Header

| Factor | URL Path (`/v1/`) | Header (`Api-Version: 2`) |
|--------|-------------------|--------------------------|
| Visibility | Obvious in URL | Hidden in headers |
| Caching | Cache-friendly (different URLs) | Needs Vary header |
| Browser testability | Easy (just change URL) | Needs tooling |
| Multiple versions simultaneously | Easy (separate routers) | Middleware logic |

**Decision rule**:
- Public/partner APIs → **URL path** (`/v1/`, `/v2/`)
- Internal APIs → **Header** (less URL pollution)

### What Constitutes a Breaking Change
These require a new version:
- Removing a field from response
- Changing a field type
- Renaming a field
- Removing an endpoint
- Changing error response structure
- Making an optional parameter required

These do NOT require a new version:
- Adding a new optional field to response
- Adding a new endpoint
- Adding a new optional parameter
- Adding a new enum value

---

## Authentication Patterns

### Decision: Which Scheme

| Scheme | Use When | Security Level |
|--------|----------|---------------|
| API Key | Server-to-server, simple integrations | Low (rotate frequently) |
| JWT Bearer | Stateless user sessions, SPAs | Medium |
| OAuth2 + OIDC | Delegated access, third-party apps, SSO | High |
| Session cookie | Traditional web apps, SSR | Medium (CSRF protection needed) |

### JWT Best Practices
- **Short-lived access tokens** (15-60 minutes)
- **Refresh tokens** stored securely (httpOnly cookie, not localStorage)
- **Verify signature AND claims** (exp, iss, aud)
- **Never store sensitive data in payload** (it's base64, not encrypted)

### API Key Best Practices
- Hash stored keys (bcrypt/SHA-256), never store plaintext
- Prefix keys for identification: `sk_live_`, `sk_test_`
- Support key rotation without downtime (accept old key for grace period)

---

## GraphQL

### Decision: When REST, When GraphQL

```
Is the primary consumer a UI with diverse data needs?
  YES → Do different pages need very different fields from the same resources?
    YES → GraphQL (eliminates over/under-fetching)
    NO  → REST is fine
  NO → Is it service-to-service?
    YES → REST or gRPC (simpler, better caching)
    NO  → Default to REST
```

| Factor | Favor REST | Favor GraphQL |
|--------|-----------|---------------|
| Consumer diversity | Few, similar consumers | Many, diverse consumers |
| Data fetching | Fixed response shapes OK | Need flexible field selection |
| Caching | HTTP caching sufficient | Need fine-grained caching |
| Team experience | REST-familiar team | GraphQL-experienced team |
| Real-time needs | SSE / webhooks enough | Need subscriptions |

### GraphQL Pitfalls
- **No automatic HTTP caching** — need persisted queries or a caching layer
- **N+1 resolver problem** — use DataLoader pattern
- **Unbounded queries** — always implement query depth limiting and cost analysis
- **Schema ≠ Database** — design schema from consumer needs, not table structure

---

## OpenAPI Spec Best Practices

### Structure
```yaml
openapi: 3.1.0
info:
  title: Service Name API
  version: 1.0.0

paths:
  /v1/resources:
    get:
      operationId: listResources    # Unique, used for SDK generation
      tags: [Resources]              # Group in docs
      parameters: [...]
      responses:
        '200': { $ref: '#/components/responses/ResourceList' }
        '400': { $ref: '#/components/responses/BadRequest' }

components:
  schemas: {}      # Reusable data models
  responses: {}    # Reusable response definitions
  parameters: {}   # Reusable parameters (pagination, filtering)
  securitySchemes: {}
```

### Rules
- Every endpoint MUST have an `operationId` (required for SDK generation)
- Use `$ref` for all reusable components — never inline shared schemas
- Define error responses as reusable components
- Include `example` values for all schemas

---

## Anti-Patterns

**1. Chatty API (too many round trips)**
```
// BAD: Client makes 5 calls to render a page
GET /users/1
GET /users/1/orders
GET /users/1/preferences
GET /users/1/notifications
GET /users/1/recommendations

// GOOD: Composite endpoint or query parameter for includes
GET /users/1?include=orders,preferences
// Or: GraphQL if this pattern is widespread
```

**2. Inconsistent error format**
```json
// BAD: Different shapes from different endpoints
{ "error": "Not found" }
{ "message": "Validation failed", "errors": [...] }
{ "code": 422, "msg": "Bad input" }

// GOOD: One shape everywhere (RFC 7807)
{ "type": "...", "title": "...", "status": 422, "detail": "..." }
```

**3. Leaking internal structure**
```json
// BAD: Response mirrors database columns
{ "user_id": 1, "created_at": "...", "updated_at": "...", "_version": 3 }

// GOOD: Response shaped for consumer needs
{ "id": "usr_abc", "createdAt": "...", "name": "Alice" }
```

**4. Missing idempotency for unsafe operations**
```
// BAD: POST /payments with no idempotency — retry = double charge
// GOOD: Require Idempotency-Key header for mutating operations
POST /payments
Idempotency-Key: unique-client-generated-id
```

---

## Escalation & Stop Conditions
- Breaking change to published API → requires version bump, migration plan
- No error format standard defined → establish before building endpoints
- API contract disagreement between frontend and backend → resolve before implementation

## Final Checklist
- [ ] OpenAPI spec written before implementation
- [ ] Consistent error format (RFC 7807) defined
- [ ] Pagination strategy chosen and documented
- [ ] Versioning strategy chosen (URL path or header)
- [ ] Authentication scheme selected and documented
- [ ] All endpoints have operationId
- [ ] No verbs in resource paths
- [ ] Breaking change policy defined

---
name: clean-code
description: |
  Code quality principles shared across all implementation agents.
  SOLID, function design, naming, code smells, and refactoring triggers.
  SSOT for quality — backend-node, frontend-react reference this skill.
version: 1.0.0
---

# Clean Code Skill

## When This Skill Applies
- Writing new production code (any language/framework)
- Refactoring existing code
- Reviewing code for quality and maintainability
- Deciding when to extract vs inline vs leave alone

## Do Not Use When
- Performance optimization (clean code prioritizes readability; profile first)
- Architecture decisions at system level (use design-refinement or AI-DLC)
- Test-specific patterns (use testing skill)

---

## Core Principle

**Code is read far more often than written. Optimize for the reader.**

Every decision below serves this principle. If a "clean code" rule makes the code harder to read, the rule is wrong for that context.

---

## SOLID Principles

### Single Responsibility (SRP)
**Detection**: "This class/function changes when X changes AND when Y changes."

```typescript
// BAD: UserService handles auth AND profile AND notifications
class UserService {
  async login(email: string, password: string) { ... }
  async updateProfile(id: string, data: ProfileData) { ... }
  async sendWelcomeEmail(user: User) { ... }
}

// GOOD: Each class has one reason to change
class AuthService { async login(email: string, password: string) { ... } }
class ProfileService { async updateProfile(id: string, data: ProfileData) { ... } }
class NotificationService { async sendWelcomeEmail(user: User) { ... } }
```

### Open/Closed (OCP)
**Detection**: "I have to modify existing code every time I add a new variant."

```typescript
// BAD: Adding a new payment type requires modifying this function
function processPayment(type: string, amount: number) {
  if (type === 'credit') { ... }
  else if (type === 'paypal') { ... }
  else if (type === 'crypto') { ... }  // New type = modify existing code
}

// GOOD: New types extend without modifying existing code
interface PaymentProcessor { process(amount: number): Promise<Receipt>; }
class CreditProcessor implements PaymentProcessor { ... }
class PaypalProcessor implements PaymentProcessor { ... }

const processors: Record<string, PaymentProcessor> = { credit: new CreditProcessor(), ... };
function processPayment(type: string, amount: number) {
  return processors[type].process(amount);
}
```

### Liskov Substitution (LSP)
**Detection**: "I have to check the subtype before using it."

```typescript
// BAD: Square overrides Rectangle in a way that breaks expectations
class Rectangle { setWidth(w: number) { this.w = w; } setHeight(h: number) { this.h = h; } }
class Square extends Rectangle { setWidth(w: number) { this.w = w; this.h = w; } }
// rect.setWidth(5); rect.setHeight(3); rect.area() === 15 is broken for Square
```

**Rule**: If a subclass surprises the caller, the inheritance is wrong. Prefer composition.

### Interface Segregation (ISP)
**Detection**: "I'm forced to implement methods I don't need."

```typescript
// BAD: ReadOnlyRepo forced to implement save/delete
interface Repository<T> {
  find(id: string): Promise<T>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

// GOOD: Split by usage
interface Readable<T> { find(id: string): Promise<T>; }
interface Writable<T> { save(entity: T): Promise<void>; }
interface Deletable { delete(id: string): Promise<void>; }
```

### Dependency Inversion (DIP)
**Detection**: "High-level module imports from low-level module directly."

```typescript
// BAD: Business logic depends on specific database
import { PrismaClient } from '@prisma/client';
class OrderService {
  private db = new PrismaClient();
}

// GOOD: Business logic depends on abstraction
interface OrderRepository { findById(id: string): Promise<Order>; }
class OrderService {
  constructor(private repo: OrderRepository) {}
}
```

### When NOT to Apply SOLID
- **Single implementation**: Don't create an interface for a class that will only ever have one implementation. YAGNI.
- **Simple scripts**: A 50-line CLI script doesn't need DIP.
- **Hot path performance**: Sometimes a direct call is faster than polymorphism. Profile first.

---

## Function Design

### Rules
1. **Single responsibility**: A function does one thing. If you need "and" to describe it, split it.
2. **Parameter count**: 0-2 ideal, 3 acceptable. 4+ → use an options object.
3. **Abstraction level consistency**: Don't mix high-level operations with low-level details.

```typescript
// BAD: Mixed abstraction levels
async function processOrder(order: Order) {
  // High-level
  validateOrder(order);
  // Suddenly low-level
  const tax = order.items.reduce((sum, i) => sum + i.price * i.qty * 0.08, 0);
  const shipping = order.total > 50 ? 0 : 5.99;
  // Back to high-level
  await chargeCustomer(order.customer, order.total + tax + shipping);
  await sendConfirmation(order);
}

// GOOD: Consistent abstraction level
async function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order);
  await chargeCustomer(order.customer, total);
  await sendConfirmation(order);
}
```

### Too Many Parameters

```typescript
// BAD: 5 positional parameters
function createUser(name: string, email: string, role: string, team: string, active: boolean) { ... }

// GOOD: Options object
interface CreateUserOptions { name: string; email: string; role: string; team: string; active?: boolean; }
function createUser(options: CreateUserOptions) { ... }
```

---

## Naming

### Principles
1. **Reveal intent**: The name should answer why it exists, what it does, and how it's used
2. **No abbreviations**: `btn` → `button`, `usr` → `user`, `mgr` → `manager`
3. **Searchable**: `SECONDS_PER_DAY = 86400` not magic number `86400`
4. **Scope-proportional length**: Loop variable `i` is fine; module-level needs descriptive name

### Patterns by Entity Type

| Entity | Pattern | Bad | Good |
|--------|---------|-----|------|
| Boolean | Question form | `flag`, `status` | `isActive`, `hasPermission`, `canEdit` |
| Function | Verb + noun | `data()`, `process()` | `fetchUserProfile()`, `validateEmail()` |
| Class/Type | Noun | `Manager`, `Processor` | `EmailSender`, `InvoiceCalculator` |
| Collection | Plural noun | `list`, `data` | `activeUsers`, `pendingOrders` |
| Constant | SCREAMING_SNAKE | `86400` | `SECONDS_PER_DAY` |
| Event handler | `on` + event | `click()` | `onSubmitClick()`, `handleFormSubmit()` |

### Naming Anti-Patterns
- **Generic names**: `data`, `result`, `temp`, `info`, `item` — almost always replaceable with something specific
- **Hungarian notation**: `strName`, `arrItems` — types are the type system's job
- **Negative booleans**: `isNotReady` — use `isReady` and negate at usage

---

## Code Smells

### Long Method (>30 lines)
**Trigger**: You need to scroll to read the function, or the function has sections separated by comments.
**Fix**: Extract Method — each comment section becomes a named function.

### God Class (>300 lines, >7 methods)
**Trigger**: Class name contains "Manager", "Handler", "Processor", or "Service" and does many unrelated things.
**Fix**: Extract Class by responsibility. Each new class should have a single reason to change.

### Feature Envy
**Trigger**: A method uses more data from another class than its own.
```typescript
// BAD: calculateDiscount reaches into customer's internals
function calculateDiscount(customer: Customer) {
  if (customer.orders.length > 10 && customer.totalSpent > 1000 && customer.loyaltyTier === 'gold') { ... }
}
// GOOD: Move to Customer where the data lives
class Customer {
  isEligibleForDiscount(): boolean { ... }
}
```

### Shotgun Surgery
**Trigger**: A single change requires editing 5+ files. The responsibility is scattered.
**Fix**: Move related logic into a single module/class.

---

## Refactoring Triggers

### Decision: When to Refactor vs Leave Alone

```
Is the code about to change for a feature/bug?
  YES → Refactor first, then implement (Boy Scout Rule)
  NO  → Is it causing bugs or blocking features?
    YES → Prioritize refactoring
    NO  → Leave it alone. Working code > theoretical purity.
```

**Rule**: Never refactor code that isn't covered by tests. Write tests first, then refactor.

### Refactoring Confidence Levels
| Change | Confidence | Requires |
|--------|-----------|----------|
| Rename | High | Find-all-references |
| Extract function | High | Basic tests |
| Move method to another class | Medium | Integration tests |
| Change inheritance to composition | Low | Comprehensive tests |
| Merge/split classes | Low | Comprehensive tests + team review |

---

## Anti-Patterns

**1. Premature abstraction**
```typescript
// BAD: Creating AbstractBaseRepositoryFactory for one entity
// "We might need this later" — you won't
abstract class AbstractBaseRepository<T> { ... }
class UserRepository extends AbstractBaseRepository<User> { ... }
// UserRepository is the only implementation. The abstraction adds complexity for zero benefit.

// GOOD: Start concrete, abstract when second use case appears
class UserRepository {
  async findById(id: string): Promise<User> { ... }
}
```

**2. Clever code**
```typescript
// BAD: Clever one-liner that requires mental compilation
const r = a ? b ? c : d : e ? f : g;

// GOOD: Clear, readable, boring
if (a) {
  return b ? c : d;
}
return e ? f : g;
```

**3. Dead code retention**
```typescript
// BAD: Commented-out code "just in case"
// function oldCalculation(x) { ... }  // Removed 2024-01-15, keeping for reference

// GOOD: Delete it. Git has history. Dead code is noise.
```

**4. Comments that restate the code**
```typescript
// BAD
// Increment counter by 1
counter += 1;

// GOOD: Comment explains WHY, not WHAT
// Rate limit reset happens at minute boundary, not rolling window
counter = 0;
```

---

## Escalation & Stop Conditions
- Refactoring without test coverage → write tests first
- God class detected → flag for decomposition before adding more features
- 3+ code smells in same file → suggest refactoring pass before proceeding

## Final Checklist
- [ ] Functions do one thing at one abstraction level
- [ ] Names reveal intent (no abbreviations, no generic names)
- [ ] No function has more than 3 parameters (use options object)
- [ ] No dead code or commented-out code
- [ ] SOLID violations addressed (or documented as intentional)
- [ ] Code smells checked: Long Method, God Class, Feature Envy
- [ ] No premature abstractions (every abstraction has 2+ implementations or clear need)

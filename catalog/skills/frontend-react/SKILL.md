---
name: frontend-react
description: |
  React frontend development patterns including component design,
  state management, performance, accessibility, and UI best practices.
version: 2.0.0
---

# Frontend React Skill

## When This Skill Applies
- Building React components and pages
- State management decisions
- UI/UX implementation
- Frontend testing
- Performance optimization
- Accessibility compliance

## Do Not Use When
- Backend/API implementation (use backend-node skill)
- Security-specific review (use security-audit skill)
- API contract design (use api-design skill)
- Project uses a different UI framework (adapt patterns accordingly)

---

## Component Design

### Composition Pattern Decision

**Decision: When to use which pattern**
| Pattern | Use When | Avoid When |
|---------|----------|------------|
| Children composition | Layout wrappers, slots | Need to pass data down |
| Render props | Consumer controls rendering, need runtime flexibility | Simple data passing (use hooks) |
| Custom hooks | Reusable stateful logic, shared across components | Logic is component-specific and simple |
| HOCs | Cross-cutting concerns (legacy codebases) | Always prefer hooks in new code |

```tsx
// GOOD: Composition with children — flexible, readable
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>{content}</Card.Body>
</Card>

// GOOD: Custom hook — reusable logic extraction
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

### Error Boundaries

Every feature boundary should have an error boundary. Errors in one feature should not crash the entire app.

```tsx
// Wrap feature boundaries, not individual components
<ErrorBoundary fallback={<FeatureErrorFallback />}>
  <DashboardFeature />
</ErrorBoundary>

// Error boundaries do NOT catch:
// - Event handlers (use try/catch)
// - Async code (use try/catch)
// - Server-side rendering
// - Errors in the boundary itself
```

**Rule**: Place error boundaries at route level and around independently-failing features. Not around every component.

---

## State Management

### Decision: Server State vs Client State

| Question | Server State | Client State |
|----------|-------------|--------------|
| Where does truth live? | Database/API | Browser only |
| Examples | User profile, orders, products | UI toggles, form input, modal open |
| Tool | React Query / SWR / TanStack Query | useState / useReducer / Context |
| Cache invalidation needed? | Yes | No |

```tsx
// Server state — use React Query, NOT useState + useEffect
// BAD
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers).finally(() => setLoading(false));
}, []);

// GOOD
const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json()),
});
```

### Decision: When to lift state vs use Context

```
Is the state used by 2+ siblings?
  YES → Lift to nearest common parent
    Is prop drilling through 3+ levels?
      YES → Use Context (or state management library)
      NO  → Props are fine
  NO → Keep local (useState)
```

**Rule**: Context is for low-frequency updates (theme, auth, locale). For high-frequency updates (form state, animation), use local state or a dedicated library to avoid unnecessary re-renders.

---

## Performance

### Core Web Vitals Targets
| Metric | Target | What It Measures |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Loading speed |
| INP (Interaction to Next Paint) | < 200ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |

### Lazy Loading Decision

```
Is the component above the fold (visible on initial load)?
  YES → Import normally (static import)
  NO  → Is it > 20KB or on a different route?
    YES → React.lazy() + Suspense
    NO  → Static import is fine
```

```tsx
// Route-level code splitting
const Settings = lazy(() => import('./pages/Settings'));

<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

### Memoization Decision

**Rule: Measure before optimizing.** Only memoize when you have evidence of a performance problem.

```
Is the component re-rendering unnecessarily?
  → First: check if parent is re-rendering unnecessarily. Fix that first.
  → If parent is correct but child is expensive: React.memo()

Is a computation visibly slow (>16ms)?
  → useMemo()

Is a callback causing child re-renders?
  → useCallback() (only when child is wrapped in React.memo)
```

```tsx
// BAD: Premature memoization everywhere
const MemoizedButton = React.memo(Button);  // Button is cheap, memo is waste

// GOOD: Memoize expensive computation with evidence
const sortedItems = useMemo(
  () => items.sort((a, b) => complexCompare(a, b)),
  [items]  // Only when items change, and sorting is measurably slow
);
```

---

## Accessibility (WCAG 2.2 Level AA)

### Semantic HTML Selection Guide
| Need | Use | Not |
|------|-----|-----|
| Navigation links | `<a href>` | `<div onClick>` |
| Actions/buttons | `<button>` | `<div onClick>` |
| Page sections | `<main>`, `<nav>`, `<aside>` | `<div class="main">` |
| Lists | `<ul>/<ol>` | `<div>` with CSS bullets |
| Tables of data | `<table>` | CSS grid of divs |

### Keyboard Navigation Checklist
- [ ] All interactive elements focusable via Tab
- [ ] Focus order matches visual order
- [ ] Focus visible indicator on all focusable elements (never `outline: none` without replacement)
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys navigate within composite widgets (tabs, menus, listboxes)

### ARIA Rules
1. **Don't use ARIA if native HTML works** — `<button>` is better than `<div role="button">`
2. **Every interactive custom widget needs**: `role`, keyboard handler, `aria-label` or `aria-labelledby`
3. **Dynamic content**: Use `aria-live="polite"` for status messages, `aria-live="assertive"` for errors

### Focus Management
```tsx
// After route change or modal open, move focus programmatically
const headingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => {
  headingRef.current?.focus();
}, []);

<h1 ref={headingRef} tabIndex={-1}>Page Title</h1>
```

---

## Styling
- Follow project's existing styling approach
- Maintain consistent spacing, colors, and typography via design tokens
- Ensure responsive design (mobile-first breakpoints)
- Prefer CSS modules or project's chosen solution over inline styles

---

## Testing
- Test user behavior, not implementation details
- Use React Testing Library patterns (`getByRole`, `getByLabelText` over `getByTestId`)
- Test accessibility (check ARIA roles, keyboard interaction)
- Mock API calls with MSW, not UI components
- Add `data-testid` only when no accessible selector exists

---

## Anti-Patterns

**1. Prop drilling through many layers**
```tsx
// BAD: Threading props through 4+ components that don't use them
<App user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <UserAvatar user={user} />

// GOOD: Context for cross-cutting data
const UserContext = createContext<User | null>(null);
// Provide at top, consume where needed
```

**2. God component (500+ lines, multiple responsibilities)**
```tsx
// BAD: Dashboard component that fetches data, handles forms, renders charts, manages state
function Dashboard() { /* 600 lines of everything */ }

// GOOD: Decompose by responsibility
function Dashboard() {
  return (
    <DashboardLayout>
      <MetricsPanel />
      <RecentActivityFeed />
      <QuickActions />
    </DashboardLayout>
  );
}
```

**3. useEffect for derived state**
```tsx
// BAD: Syncing state with useEffect
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);
useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);

// GOOD: Derive during render
const filteredItems = items.filter(i => i.active);
// Or useMemo if filter is expensive
```

**4. Fetching in useEffect without cleanup**
```tsx
// BAD: Race condition, no loading/error state, no cleanup
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);

// GOOD: Use React Query / SWR, or at minimum handle cleanup
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(r => r.json()).then(setUser).catch(() => {});
  return () => controller.abort();
}, [id]);
```

---

## Escalation & Stop Conditions
- If design spec is missing → use AI-DLC design artifacts or flag for clarification
- If state management approach conflicts with existing patterns → follow existing, flag for review
- Component over 200 lines → consider splitting before proceeding
- Accessibility violation detected → fix before merging

## Final Checklist
- [ ] Components follow project's existing styling approach
- [ ] Interactive elements have accessible names (label, aria-label)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Error boundaries around feature boundaries
- [ ] Server state uses React Query/SWR (not useState+useEffect)
- [ ] Responsive design verified (if applicable)
- [ ] Component tests written and passing
- [ ] No unnecessary re-renders (memoization only where measured)

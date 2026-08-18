---
name: automated-code-review
description: Comprehensive peer review and scalability checklist for evaluating code deltas. Activate when reviewing any code change touching algorithmic logic, React/Vue/Next.js components, data persistence, database queries, async operations, or bilingual RTL/LTR layouts. Do NOT activate for config-only changes, documentation updates, or asset additions with no logic changes.
inputs:
  - List of modified files and their code diffs
  - Framework context (React 19, Next.js 15, Vue 3, etc.)
outputs:
  - Structured Code Review Report (APPROVED / CHANGES REQUESTED) with line-cited findings and drop-in remediation code
---

# Automated Code Review, Scalability & UX Protocol

This skill guides any agent or reviewer subagent in performing high-rigor, adversarial peer reviews focusing on **Scalability, Algorithmic Efficiency, Database I/O, State Lifecycle, Resource Teardown, and Bi-Directional UX**.

---

## 1. Scalability & Performance Matrix

### A. Algorithmic Complexity & Allocation Efficiency
* **Target Complexity**: $O(1)$, $O(\log N)$, or $O(N)$ — no exceptions without explicit justification.
* **Reject $O(N^2)$ Anti-Patterns**:
  * Nested iterations: `array.map()` containing `array.find()` or `array.includes()` → use `Set`/`Map` for $O(1)$ lookups.
  * **Quadratic Reducer Spread**: `items.reduce((acc, x) => ({ ...acc, [x.id]: x }), {})` — spreading in every iteration is $O(N^2)$; use `acc[x.id] = x; return acc;` instead.
  * **Redundant Filter Scans**: Multiple `.filter()` calls on the same collection → consolidate into a single $O(N)$ pass with a counter/reducer.
  * **Memory Allocation in Loops**: Avoid `Array.from(str).filter().join()` inside high-frequency paths; use direct `str.replace(/regex/g, '')` instead.
  * **Formatter Caching**: Cache `new Intl.DateTimeFormat()` in module-level `Map`s keyed by locale+options; never re-instantiate per row.

### B. Database & I/O Scalability
* **N+1 Query Prevention**: Every loop that triggers a DB query is an N+1 violation. Enforce DataLoader batching or join-based queries.
* **Keyset / Cursor Pagination**: Reject `LIMIT/OFFSET` pagination on large collections; enforce keyset (`WHERE id > last_id`) or cursor-based pagination.
* **Connection Pooling**: Verify DB clients are pooled (PgPool, Firestore batch) — never open a new connection per request.
* **Query Indexing**: Verify that all `WHERE`, `ORDER BY`, and join columns used in queries have matching compound indexes.
* **Firestore Query Limits**: Verify composite indexes for multi-field `where()` + `orderBy()` Firestore queries.

### C. Framework-Specific State Lifecycle (React 19 / Next.js 15 / Vue 3)

**React 19:**
* **Context Value Memoization**: All `<Context.Provider value={{...}}>` values **MUST** be wrapped in `useMemo`; handler functions **MUST** be wrapped in `useCallback`.
* **Component Memoization**: High-frequency list items **MUST** be wrapped in `React.memo` with memoized handlers.
* **React 19 Server Components (RSC)**: Verify `'use client'` boundary placement — data-fetching and I/O should stay in Server Components; interactivity in Client Components.
* **Server Actions**: Use `useActionState` and `useOptimistic` for mutations; never trigger server actions from `useEffect`.
* **Transitions & Streaming**: Use `useTransition` + `<Suspense>` boundaries for non-urgent state updates and streaming SSR.

**Vue 3:**
* Verify `effectScope()` teardown on composables using watchers or subscriptions.
* Ensure `onUnmounted` hooks clean up all reactive side effects.

### D. Memory Leak & Resource Teardown
Every resource acquired during a component lifecycle **MUST** be explicitly released on unmount. Audit for:
* `setTimeout`/`setInterval` — clear via `useRef` + `useEffect` cleanup.
* `setInterval` polling — verify `clearInterval` on unmount.
* WebSockets — verify `ws.close()` on teardown.
* Web Workers — verify `worker.terminate()` on teardown.
* Canvas 2D/WebGL contexts — verify `context.canvas.remove()` or explicit context loss.
* Object URLs — verify `URL.revokeObjectURL()` after use.
* `AbortController` — wire to `fetch` calls; abort in `useEffect` cleanup.
* `p-limit` concurrency pools — cap unbounded `Promise.all` over large arrays.

### E. Concurrency & Async Race Safety
* **Out-of-Order Responses**: Attach request sequence IDs; discard responses where `seq < lastSeq`.
* **Last-Write-Wins**: Asynchronous write operations must use locks, serial queues, or atomic functional updaters.
* **Storage Quota Handling**: `localStorage.setItem` must be wrapped to catch `QuotaExceededError` and surface it to the user — never fail silently.
* **Empty State Fallback Invariant**: Verify that an empty collection (`'[]'`) does NOT accidentally trigger a default-data resurrection on reload.

---

## 2. Bi-Directional Layout, Accessibility & Theming (RTL/LTR)

* **Logical CSS Positioning**: Never hardcode physical offsets (`left-[X]px`) for elements in bilingual apps. Use logical Tailwind classes: `ltr:left-[X]px rtl:right-[X]px`.
* **Directional Icons**: Flip arrows (`→`/`←`) based on `isRTL`; alternatively apply `rtl:rotate-180`.
* **Number Isolation**: Wrap tracking numbers, IDs, and phone numbers in `<bdi dir="ltr">` to prevent punctuation flipping in RTL mode.
* **Theme Contrast (WCAG AA 4.5:1)**: Use semantic CSS custom properties (`var(--bg-surface)`, `var(--text-primary)`) — never hardcode dark mode text classes on light mode backgrounds.
* **Touch Targets (WCAG 2.5.5)**: Maintain $\ge 44\times 44\text{px}$ interactive targets on mobile.
* **Pinch-to-Zoom**: Never set `user-scalable=no` or `maximum-scale=1.0` — violates WCAG 1.4.4.

---

## 3. Structured Review Output Template

```markdown
# 🔍 Code Review & Scalability Report

## Summary Verdict: [ APPROVED | CHANGES REQUESTED ]

### 1. Algorithmic Complexity & Allocation
- **Big-O Budget**: [O(1)/O(N) verified | Flagged: describe issue]
- **Reducer / Loop Anti-Patterns**: [Pass | Issue: file:line]
- **Formatter & Allocator Caching**: [Pass | Issue: file:line]

### 2. Database & I/O Scalability
- **N+1 Queries**: [Pass | Issue: describe pattern]
- **Pagination Strategy**: [Keyset/Cursor | OFFSET (rejected)]
- **Index Coverage**: [Pass | Missing index on: column]

### 3. Framework Lifecycle & Memory Teardown
- **Context Memoization (useMemo/useCallback)**: [Pass | Issue: file:line]
- **Component Memoization (React.memo)**: [Pass | Issue: file:line]
- **Resource Cleanup (timers, workers, sockets, URLs)**: [Pass | Leak at: file:line]

### 4. Concurrency & State Edge Cases
- **Race Conditions**: [Pass | Issue: describe]
- **Storage Quota Handling**: [Pass | Silent failure at: file:line]
- **Empty State Fallback**: [Pass | Resurrection risk at: file:line]

### 5. RTL/LTR & Accessibility
- **Logical CSS Positioning**: [Pass | Hardcoded offset at: file:line]
- **WCAG Contrast & Touch Targets**: [Pass | Issue: describe]

### 6. Critical Blocking Issues (if CHANGES REQUESTED)
| File:Line | Issue | Severity | Drop-In Fix |
|---|---|---|---|
| file.js:N | Description | HIGH | `code fix` |
```

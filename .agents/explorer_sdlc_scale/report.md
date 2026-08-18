# 🚀 Scalability, Concurrency & Modern Framework Standards Audit Report (R3)

**Author**: `explorer_sdlc_scale` (Scalability, Concurrency & Modern Framework Standards Investigator)  
**Date**: 2026-08-18  
**Target Artifacts**:
- `/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/automated-code-review/SKILL.md`
- `/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/skills/software-development-standards/SKILL.md`
- `/home/sahar/.gemini/config/plugins/agentic-sdlc-framework/rules/sdlc_pipeline.md`
- `/home/sahar/Deliveree/AGENTS.md`
- `/home/sahar/Deliveree/.agents/skills/automated-code-review/SKILL.md`
- `/home/sahar/Deliveree/.agents/skills/software-development-standards/SKILL.md`

---

## 1. Executive Summary & Audit Baseline

Modern enterprise applications face stringent scalability, concurrency, and performance requirements. In an autonomous multi-agent SDLC framework, subagents (specifically the **Developer** implementing code in Gate 2 and the **Code Reviewer** evaluating code in Gate 3) rely directly on skill instructions and rulebooks to detect algorithmic anti-patterns, prevent memory leaks, ensure async safety, and enforce database scalability.

### Core Audit Findings:
1. **Critical Gap in Database & I/O Scalability**: While `automated-code-review/SKILL.md` lists "N+1 queries" in its YAML frontmatter description (Line 3), **the entire body of the skill (Lines 6–69) contains zero instructions, rules, or checklists regarding N+1 queries, DataLoader, cursor pagination, connection pools, or query indexing.**
2. **Superficial Algorithmic Complexity Guidelines**: Current Big-O guidelines in `automated-code-review/SKILL.md` (Lines 16–23) only mention basic nested loops (`.map()` with `.find()`), omitting quadratic object spreading in reducers (`acc = { ...acc, [k]: v }`), nested `Set` re-instantiations inside loop predicates, quadratic string concatenations, and auxiliary space complexity budgets.
3. **Outdated Frontend Architecture**: State lifecycle rules in `automated-code-review/SKILL.md` (Lines 24–29) and `software-development-standards/SKILL.md` (Lines 48–54) are restricted to basic React 16/17 `useMemo`/`useCallback` patterns. They completely lack coverage of **React 19 Server Components (RSC) vs Client Components (`'use client'`)**, Server Actions (`useActionState`, `useOptimistic`), concurrent transitions (`useTransition`), Next.js 14/15 App Router caching/streaming boundaries (`<Suspense>`), and Vue 3 / Nuxt 3 `effectScope` / store cleanup.
4. **Incomplete Memory Leak & Resource Teardown Protocol**: Although timer clearing via `useRef` is mentioned, instructions omit complete cleanup protocols for DOM event listeners (reference preservation), `AbortController` cancellation propagation, Web Worker termination (`worker.terminate()`), WebSocket connection teardown (`ws.close()`), Canvas 2D/WebGL context loss, Object URL revocation (`URL.revokeObjectURL`), and MediaStream track termination.
5. **Absence of Concurrency Throttling & Race Condition Controls**: No guidelines exist for concurrency batching (`p-limit`), handling out-of-order async response races (request generation counters vs `AbortController`), Optimistic Concurrency Control (OCC via `ETag` / versioning), or idempotent retries with jitter.

---

## 2. Exhaustive Technical Audit by Dimension

### Dimension 1: Algorithmic Complexity, Data Processing & Allocation Efficiency

#### 1.1 Big-O Time & Space Complexity Budgets
- **Current State (`automated-code-review/SKILL.md:16-17`)**:
  ```markdown
  ### A. Algorithmic Complexity & Allocation Efficiency
  * **Target Complexity**: $O(1)$, $O(\log N)$, or $O(N)$ time complexity.
  ```
- **Deficiencies**:
  - Lacks auxiliary space complexity limits (e.g., $O(1)$ auxiliary space for in-place streaming vs $O(N)$ auxiliary heap allocation).
  - Lacks payload-size scaling thresholds (e.g. data sets $> 1,000$ items must not block the JavaScript single-threaded event loop).

#### 1.2 Accidental $O(N^2)$ Iterations & Anti-Patterns
Current instructions only cite nested array `.find()` / `.includes()`. The following 4 critical $O(N^2)$ patterns must be codified:
1. **Object Spread in Reducers / Loops ($O(N^2)$ Time and Space)**:
   ```typescript
   // ❌ CRITICAL ANTI-PATTERN: O(N^2) time & memory due to shallow copy on each iteration
   const index = items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});

   // ✅ PROMOTED PATTERN: O(N) single-pass Map or Object mutation
   const index = new Map<string, Item>();
   for (const item of items) {
     index.set(item.id, item);
   }
   ```
2. **Re-Instantiating Lookups Inside Loop Predicates ($O(N \times M)$)**:
   ```typescript
   // ❌ CRITICAL ANTI-PATTERN: Set created inside predicate executes M times inside loop of size N
   const filtered = listA.filter(itemA => new Set(listB.map(b => b.id)).has(itemA.id));

   // ✅ PROMOTED PATTERN: Pre-instantiate Set once outside the iteration loop (O(N + M))
   const allowedIds = new Set(listB.map(b => b.id));
   const filtered = listA.filter(itemA => allowedIds.has(itemA.id));
   ```
3. **Chained Intermediate Array Transformations**:
   ```typescript
   // ❌ SUBOPTIMAL: Allocates 3 intermediate arrays in memory
   const result = items
     .filter(x => x.active)
     .map(x => x.value)
     .filter(x => x > 100);

   // ✅ PROMOTED PATTERN: Single-pass transformation using reduce, for-of, or iterator helpers
   const result: number[] = [];
   for (const x of items) {
     if (x.active && x.value > 100) {
       result.push(x.value);
     }
   }
   ```
4. **Quadratic String Concatenation**:
   - Repeatedly appending large strings via `str += chunk` creates new string allocations on every concatenation. For large payloads, require `Array.push()` followed by `.join('')` or native `TransformStream`.

#### 1.3 Single-Pass Grouping & Hash-Map Indexing
- Modern standard (ES2024 / Node 21+): `Map.groupBy(items, item => item.status)` or `Object.groupBy(items, item => item.status)`.
- Fallback for pre-ES2024:
  ```typescript
  export function groupBy<K, V>(items: readonly V[], keyFn: (item: V) => K): Map<K, V[]> {
    const map = new Map<K, V[]>();
    for (const item of items) {
      const key = keyFn(item);
      const group = map.get(key);
      if (group) {
        group.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }
  ```

#### 1.4 Memory-Bounded Streaming & Batching
- **Anti-Pattern**: Loading a $100\text{MB}$ CSV / JSON array into Node.js buffer via `fs.readFile()` or `response.json()`.
- **Standard**:
  - Use `stream/consumers`, Node.js `ReadableStream`, or async generators (`for await (const chunk of stream)`).
  - Chunk CPU-intensive processing using microtasks or `setImmediate` / `scheduler.yield()` to yield control back to the event loop.

---

### Dimension 2: Modern Frontend & Framework Lifecycles

#### 2.1 React 19 Standards: Server Components vs Client Components
- **Server Component First (`RSC`)**:
  - Default all components to Server Components. Only add `'use client'` when the component uses browser APIs (`window`, `localStorage`), client hooks (`useState`, `useEffect`, `useRef`), or interactive event handlers (`onClick`, `onChange`).
  - Pass server data directly as props; avoid fetching data in `useEffect` on the client when it can be fetched on the server, eliminating client-side waterfall render cascades.
- **React 19 Server Actions & Form Hooks**:
  - Use `useActionState` (replacing deprecated `useFormState`) for form submission state and pending transitions.
  - Use `useOptimistic` for instantaneous UI updates with automatic rollback on server action rejection.
  - Use `useTransition` / `startTransition` to mark state updates as non-blocking transitions.
- **Stale Closures & Hook Dependency Safety**:
  - Avoid stale closures in async callbacks or event listeners without re-running effects:
  ```typescript
  // ✅ useLatestRef pattern to access freshest props/state without triggering effect re-execution
  function useLatest<T>(value: T): React.MutableRefObject<T> {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  }
  ```

#### 2.2 Next.js (App Router) SSR/SSG Caching & Streaming
- **Granular Streaming Boundaries**:
  - Wrap slow data-fetching components in `<Suspense fallback={<Skeleton />}>` to enable progressive HTML streaming without blocking page TTFB.
- **Caching & Revalidation**:
  - Use `unstable_cache` or tag-based revalidation (`revalidateTag('products')`) over broad time-based cache purging.
- **Hydration Mismatch Immunity**:
  - Never render client-specific values (current timestamp `new Date()`, random IDs `Math.random()`, or `localStorage` values) directly during initial SSR.
  - Standard pattern: Use `useSyncExternalStore` or an `isMounted` state gate to defer rendering client-only UI until after hydration.

#### 2.3 Vue 3 & Nuxt 3 Composition API
- **Memory Leak Prevention**:
  - Always clean up side effects in `onUnmounted` or `onScopeDispose`.
  - When creating asynchronous watchers inside composables, ensure they are registered inside an `effectScope` so they can be disposed cleanly when the scope is unmounted.
  - Pinia stores: Reset transient component state in store actions upon route change or unmount.

---

### Dimension 3: Memory Leak Prevention & Lifecycle Teardown

#### 3.1 DOM Event Listener Cleanup
- **Anti-Pattern**: Passing an anonymous function or inline arrow function to `addEventListener`:
  ```typescript
  // ❌ MEMORY LEAK: removeEventListener with a new arrow function does NOT remove the listener
  useEffect(() => {
    window.addEventListener('resize', () => handleResize());
    return () => window.removeEventListener('resize', () => handleResize());
  }, []);
  ```
- **Standard**:
  ```typescript
  // ✅ PROMOTED: Store stable reference or memoized handler
  useEffect(() => {
    const handleResize = () => { /* ... */ };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  ```

#### 3.2 Async Cancellation: `AbortController` & Signal Propagation
- **Standard**: Every network fetch, stream reader, or asynchronous promise chain triggered by user interaction or mounting must accept an `AbortSignal`.
```typescript
useEffect(() => {
  const controller = new AbortController();

  async function loadData() {
    try {
      const response = await fetch('/api/data', { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setState(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Expected cancellation on unmount - do not treat as runtime error
        return;
      }
      setError(err);
    }
  }

  loadData();
  return () => controller.abort();
}, [query]);
```

#### 3.3 Complete Resource Disposal Checklist
Every reviewer and developer must verify disposal of the following resources:
1. **Web Workers**: `worker.terminate()`.
2. **WebSocket / EventSource**: `ws.close(1000, "Component unmounted")` and `eventSource.close()`.
3. **Object URLs**: `URL.revokeObjectURL(blobUrl)` immediately after image load or component teardown.
4. **MediaStream / WebRTC**: `stream.getTracks().forEach(track => track.stop())` and `peerConnection.close()`.
5. **Canvas Contexts**: Nullify references, detach WebGL buffer bindings, call `gl.getExtension('WEBGL_lose_context')?.loseContext()`.
6. **Timers & Animation Frames**: `clearTimeout`, `clearInterval`, `cancelAnimationFrame(rafIdRef.current)`.

---

### Dimension 4: Concurrency, Async Safety & Race Conditions

#### 4.1 Concurrency Throttling for Parallel Async Operations
- **Anti-Pattern**: Executing thousands of promises simultaneously via unbounded `Promise.all`:
  ```typescript
  // ❌ CRITICAL SCALABILITY FLAW: Exhausts socket pool, file descriptors, and memory
  await Promise.all(urls.map(url => fetch(url)));
  ```
- **Standard**: Enforce concurrency limits using `p-limit` or a worker pool:
  ```typescript
  import pLimit from 'p-limit';

  export async function fetchWithConcurrencyLimit<T, R>(
    items: readonly T[],
    fn: (item: T) => Promise<R>,
    concurrency = 5
  ): Promise<R[]> {
    const limit = pLimit(concurrency);
    return Promise.all(items.map(item => limit(() => fn(item))));
  }
  ```

#### 4.2 Out-of-Order API Response Races
- **Problem**: When user rapidly changes query filters (Filter A $\rightarrow$ Filter B), Request A may resolve after Request B, corrupting the UI with stale data.
- **Solution 1**: Abort previous in-flight request via `AbortController` (see 3.2).
- **Solution 2**: Monotonically increasing request sequence generation ID:
  ```typescript
  const reqIdRef = useRef(0);

  const fetchData = useCallback(async (query: string) => {
    const currentId = ++reqIdRef.current;
    setLoading(true);
    const result = await api.search(query);
    // Ignore stale out-of-order response
    if (currentId !== reqIdRef.current) return;
    setData(result);
    setLoading(false);
  }, []);
  ```

#### 4.3 Optimistic Concurrency Control (OCC) & Idempotency
- **Distributed State Updates**:
  - Include version number (`version`) or `ETag` in write payloads.
  - Server verifies `WHERE id = :id AND version = :expectedVersion`. Return `409 Conflict` if version mismatch occurs.
- **Idempotent Retries**:
  - External API mutations must supply an `Idempotency-Key` UUID header.
  - Retry logic must implement **Exponential Backoff with Full Jitter**:
    $$T_{\text{sleep}} = \text{random}(0, \min(T_{\max}, T_{\text{base}} \times 2^{\text{attempt}}))$$

---

### Dimension 5: Database & I/O Scalability

#### 5.1 Eliminating N+1 Query Patterns
- **Anti-Pattern**: Iterating over a list of parent entities and executing a query for each parent's children:
  ```typescript
  // ❌ N+1 QUERY ANTI-PATTERN: 1 query for orders + N queries for users
  const orders = await db.orders.findMany();
  for (const order of orders) {
    order.user = await db.users.findById(order.userId);
  }
  ```
- **Standard**:
  1. **SQL JOIN / Eager Loading**: `SELECT orders.*, users.* FROM orders JOIN users ON orders.user_id = users.id`.
  2. **DataLoader / Batch Loading**: Batch IDs into a single `WHERE id IN (...)` query across execution ticks:
  ```typescript
  import DataLoader from 'dataloader';

  const userLoader = new DataLoader<string, User>(async (userIds) => {
    const users = await db.users.findMany({ where: { id: { in: userIds } } });
    const userMap = new Map(users.map(u => [u.id, u]));
    return userIds.map(id => userMap.get(id) || null);
  });
  ```

#### 5.2 Keyset / Cursor-Based Pagination Standards
- **Offset Pagination Flaw**: `SELECT * FROM deliveries ORDER BY created_at DESC LIMIT 20 OFFSET 100000;`  
  *Complexity*: $O(N)$ — database scans and discards 100,000 rows.
- **Keyset Pagination Standard**:  
  `SELECT * FROM deliveries WHERE (created_at, id) < (:last_created_at, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20;`  
  *Complexity*: $O(\log N + K)$ — direct B-Tree index seek.

#### 5.3 Connection Pooling & Deadlock Avoidance
- **Pool Sizing**: Pool size must be bounded (`max: 20-50`) with explicit acquisition timeout (`acquireTimeoutMillis: 5000`) and idle timeout.
- **Deadlock Avoidance**: When acquiring multiple locks across tables/rows within a transaction, always acquire locks in a globally deterministic order (e.g. sorted by primary key ascending).
- **Transaction Timeout**: Set strict statement timeouts (`SET statement_timeout = '3000ms'`) to prevent hanging queries from exhausting the connection pool.

---

## 3. Line-Cited Critiques of SDLC Framework Files

| Target File | Line(s) | Current Content / Omission | Severity | Impact & Required Fix |
|-------------|---------|----------------------------|----------|-----------------------|
| `skills/automated-code-review/SKILL.md` | L3 | Frontmatter mentions "N+1 queries" | **HIGH** | Inconsistency: Mentioned in metadata but totally missing from skill body. Add dedicated Database & I/O section. |
| `skills/automated-code-review/SKILL.md` | L16–23 | Only mentions basic nested `.map()` + `.find()` | **HIGH** | Misses reducer object spread $O(N^2)$, nested Set instantiation $O(N \times M)$, quadratic string concat, and Map.groupBy. |
| `skills/automated-code-review/SKILL.md` | L24–29 | Only mentions `useMemo`, `useCallback`, `React.memo` | **HIGH** | Ignores React 19 RSC boundaries, Server Actions (`useActionState`), `useOptimistic`, and Next.js / Vue 3 lifecycles. |
| `skills/automated-code-review/SKILL.md` | L27–28 | Mentions `useRef` for timers | **MEDIUM** | Incomplete teardown: Lacks `AbortController` cancellation, Web Workers, WebSockets, Canvas, and Object URL revocation. |
| `skills/automated-code-review/SKILL.md` | L30–35 | Brief mention of locking & functional updaters | **HIGH** | Lacks concrete concurrency throttling (`p-limit`), request sequence ID race condition elimination, and OCC/ETags. |
| `skills/automated-code-review/SKILL.md` | L37–46 | Bi-directional RTL/LTR embedded in scalability skill | **MEDIUM** | UI layout rules should be organized under a clear UX section while elevating core backend/data scalability to top tier. |
| `skills/automated-code-review/SKILL.md` | L50–68 | Review template has only 3 sparse bullet points | **MEDIUM** | Upgrade review template with rigorous Big-O, Lifecycle, Concurrency, and I/O scalability checklists. |
| `skills/software-development-standards/SKILL.md` | L48–54 | Single sentence on side-effect cleanup | **HIGH** | Needs concrete guidelines and code templates for `AbortController`, `useLatestRef`, and stream batching. |
| `rules/sdlc_pipeline.md` | L43–48 | Gate 3 summary lacks modern concurrency & I/O rules | **MEDIUM** | Add explicit requirements for concurrency throttling, request cancellation, DataLoader, and cursor pagination. |
| `rules/sdlc_pipeline.md` | L69–78 | Sign-off criteria only checks $O(N^2)$ and memory leaks | **MEDIUM** | Expand sign-off criteria to block unthrottled `Promise.all`, unindexed queries, and missing async request cancellation. |
| `Deliveree/AGENTS.md` | L41–45 | Stage 3 description lacks React 19, concurrency & I/O | **MEDIUM** | Align with updated Gate 3 criteria in `sdlc_pipeline.md`. |

---

## 4. Drop-In Text Enhancements

### 4.1 Drop-In Replacement for `skills/automated-code-review/SKILL.md`

```markdown
---
name: automated-code-review
description: Comprehensive peer review and scalability checklist for evaluating code deltas. Focuses on Big-O algorithmic complexity, memory leak prevention, async safety, N+1 queries, modularity, and test coverage.
---

# Automated Code Review, Scalability & Architecture Protocol

This skill guides any agent or reviewer subagent in performing high-rigor, adversarial peer reviews focusing on **Scalability, Algorithmic Efficiency, Modern Framework Lifecycles, Concurrency Safety, and I/O Scalability**.

---

## 1. Algorithmic Complexity & Data Processing Audit

When evaluating any code delta, audit against these non-negotiable complexity standards:

### A. Big-O Complexity & Allocation Budgets
* **Time Complexity Budgets**: Enforce $O(1)$, $O(\log N)$, or $O(N)$ complexity for data transformations and query handling. Reject accidental $O(N^2)$ algorithms.
* **Space Complexity & Allocations**: Enforce $O(1)$ auxiliary space where possible. Reject operations that duplicate large collections into intermediate arrays.

### B. Rejecting Accidental $O(N^2)$ & Quadratic Anti-Patterns
1. **Nested Array Iterations**:
   * Reject `array.map()` or `array.filter()` containing inner `.find()`, `.filter()`, `.indexOf()`, or `.includes()`.
   * **Fix**: Pre-index the secondary collection into a `Map` or `Set` before the loop to achieve $O(N + M)$ single-pass execution.
2. **Object Spread in Reducers / Iterations**:
   * Reject `reduce((acc, item) => ({ ...acc, [item.id]: item }), {})`. Object spread copies all existing keys on every iteration, causing $O(N^2)$ CPU and memory overhead.
   * **Fix**: Use a `Map` or mutate an initialized accumulator object directly within a single pass.
3. **Lookup Re-Instantiation in Predicates**:
   * Reject creating a `new Set(collection)` or regex instance inside `.filter(x => ...)` or inner loop bodies.
   * **Fix**: Instantiate sets and compiled regexes outside the loop.
4. **Single-Pass Aggregation & Grouping**:
   * Reject multiple consecutive `.filter()` passes on the same collection for statistics/tab counts.
   * **Fix**: Use `Map.groupBy()` / `Object.groupBy()` (or a single-pass `reduce`/`for...of` loop).
5. **Memory-Bounded Streaming**:
   * For datasets or files $>10\text{MB}$, reject loading the entire payload into in-memory buffers (`fs.readFile`, `res.json()`). Use streaming pipelines (`ReadableStream`, async generators).

---

## 2. Modern Frontend & Framework Lifecycles

### A. React 19 & Next.js (App Router) Standards
* **Server Components (RSC) vs Client Components**:
  * Default all components to Server Components. Restrict `'use client'` strictly to interactive leaves (components utilizing state, effects, or DOM event listeners).
  * Eliminate client-side fetching waterfalls by fetching data directly in Server Components and streaming via `<Suspense>`.
* **Server Actions & Action State**:
  * Use `useActionState` (replacing deprecated `useFormState`) and `useOptimistic` for forms and state mutations.
  * Wrap non-blocking state updates in `useTransition` / `startTransition`.
* **Stale Closure Immunity**:
  * In custom hooks and async callbacks, use ref caching (`useLatestRef`) to access current state/props without triggering unnecessary effect re-executions.
* **SSR / Hydration Mismatch Safety**:
  * Guard client-only values (timestamps, `localStorage`, `window.innerWidth`) with `useSyncExternalStore` or post-mount flags to prevent server-client hydration mismatches.

### B. Vue 3 & Nuxt 3 Composition Standards
* **Scope Teardown**: Ensure asynchronous watchers and event emitters created in composables are wrapped in `effectScope` and disposed on unmount.
* **Store Cleanup**: Pinia stores must clean up subscriptions and reset transient state on route navigation.

---

## 3. Memory Leak Prevention & Lifecycle Teardown

Audit code deltas for strict resource disposal on unmount or scope destruction:

1. **DOM Event Listeners**: Ensure `removeEventListener` references the exact stable function reference registered via `addEventListener`.
2. **Async Cancellation via `AbortController`**:
   * All network requests (`fetch`, Axios) and async operations tied to component lifecycles **MUST** accept an `AbortSignal`.
   * Trigger `controller.abort()` in cleanup functions. Explicitly catch and ignore `AbortError`.
3. **Timer & Animation Cleanup**:
   * Store timer and animation frame IDs in refs (`useRef`). Clear them explicitly on unmount (`clearTimeout`, `clearInterval`, `cancelAnimationFrame`).
4. **Heavy Resource Disposal**:
   * **Web Workers**: Call `worker.terminate()`.
   * **WebSockets / EventSource**: Call `ws.close(1000)` / `eventSource.close()`.
   * **Object URLs**: Call `URL.revokeObjectURL(url)` after blob loading.
   * **MediaStreams**: Stop all tracks via `stream.getTracks().forEach(t => t.stop())`.
   * **Canvas Contexts**: Detach event listeners and release WebGL contexts (`gl.getExtension('WEBGL_lose_context')?.loseContext()`).

---

## 4. Concurrency, Async Safety & Race Conditions

1. **Concurrency Throttling**:
   * Unbounded `Promise.all(largeArray.map(...))` is strictly prohibited.
   * Enforce bounded concurrency using `p-limit` or worker queues (recommended concurrency: $3\text{--}10$).
2. **Eliminating Out-of-Order API Races**:
   * When handling rapid filter or search input changes, prevent stale responses from overwriting current state.
   * **Fix**: Use `AbortController` to abort in-flight requests or track monotonically increasing request sequence IDs (`requestIdRef.current === currentId`).
3. **Optimistic Concurrency Control (OCC) & Idempotency**:
   * Data mutations against shared entities must check entity versioning or `ETag` headers to prevent last-write-wins collisions.
   * External network retries must include `Idempotency-Key` headers and utilize exponential backoff with full jitter.

---

## 5. Database, I/O & Backend Scalability

1. **Eliminating N+1 Queries**:
   * Reject loops executing database queries per item.
   * **Fix**: Use SQL `JOIN`s, eager loading, or `DataLoader` to batch lookups into single `WHERE id IN (...)` operations.
2. **Pagination Architecture**:
   * Reject `OFFSET ... LIMIT ...` on large or rapidly growing datasets.
   * **Fix**: Enforce keyset/cursor-based pagination using indexed composite keys (`WHERE (created_at, id) < (:last_date, :last_id)`).
3. **Connection Pooling & Query Bounds**:
   * Ensure database connection pools have explicit upper bounds, acquisition timeouts, and idle cleanup.
   * Enforce query statement timeouts (`statement_timeout`) to prevent hanging queries from starving connection pools.
   * Acquire locks in consistent global order (e.g. sorted by entity ID) to prevent transactional deadlocks.

---

## 6. Bi-Directional Layout, Accessibility & Theming (UX Standards)

* **Logical CSS Positioning**: Never hardcode physical offsets (`left-[X]px`). Use logical CSS properties or directional classes: `ltr:left-[X]px rtl:right-[X]px`, `ms-4`, `pe-2`.
* **Directional Glyphs**: Flip navigation arrows and directional icons when `isRTL` is active.
* **Number & Suffix Isolation**: Wrap mixed alphanumeric strings, phone numbers, and tracking codes in `<bdi dir="ltr">`.
* **WCAG AA Contrast (4.5:1)**: Enforce semantic CSS variables for surface and text colors across light and dark themes.
* **Touch Targets & Viewport**: Maintain $\ge 44\times 44\text{px}$ touch targets. Never set `user-scalable=no`.

---

## 7. Structured Review Output Template

```markdown
# 🔍 Code Review & Scalability Report

## Summary Verdict: [ APPROVED | CHANGES REQUESTED ]

### 1. Algorithmic Complexity & Data Processing
- **Time Complexity**: [Pass: O(1) / O(N) single-pass | Reject: Accidental O(N^2)]
- **Space & Allocations**: [Pass: Bounded heap allocations / formatters cached / streaming]

### 2. Framework Lifecycles & React 19 / SSR
- **Server/Client Boundaries**: [Pass: Leaf-only 'use client' / zero client waterfalls]
- **State & Action Transitions**: [Pass: useActionState / useOptimistic / useTransition]
- **Hydration Safety**: [Pass: Client-only guards in place]

### 3. Memory Leaks & Resource Teardown
- **Event Listeners & Timers**: [Pass: Stable handler references / ref cleanup]
- **Async Cancellation**: [Pass: AbortController signal propagation & error handling]
- **Resource Disposal**: [Pass: Workers, WebSockets, Object URLs, Canvas disposed]

### 4. Concurrency & Async Safety
- **Throttling**: [Pass: Bounded concurrency via p-limit]
- **Race Condition Immunity**: [Pass: Request sequence IDs / AbortController]
- **OCC & Idempotency**: [Pass: Version checks / Idempotency keys]

### 5. Database & I/O Scalability
- **N+1 Query Elimination**: [Pass: DataLoader / JOINs verified]
- **Pagination**: [Pass: Keyset/cursor-based pagination enforced]
- **Connection & Lock Safety**: [Pass: Statement timeouts / deterministic lock order]

### 6. UX, Accessibility & Bi-Directional Layout
- **RTL/LTR & Accessibility**: [Pass: Logical CSS / <bdi> isolation / WCAG AA]

### 7. Critical Issues & Blocking Changes (if CHANGES REQUESTED)
- **[File:Line]**: [Specific anti-pattern identified, risk explanation, and drop-in code fix]
```
```

---

### 4.2 Drop-In Enhancements for `skills/software-development-standards/SKILL.md`

Add the following sub-sections to Section 3 ("State Management & Lifecycle Safety"):

```markdown
### B. Async Cancellation & Signal Propagation
* **Mandatory AbortSignals**: All asynchronous service methods and network adapters must accept an optional `AbortSignal`.
* **Cleanup Wiring**: Components initiating async operations must initialize an `AbortController` in their effect lifecycle and abort on unmount.
* **Defensive Abort Handling**: Service layers and UI hooks must explicitly catch `AbortError` and suppress error alerts for expected cancellations.

### C. Concurrency Throttling & Batch Processing
* **Bounded Parallelism**: When mapping over dynamic collections with asynchronous tasks, use concurrency limiters (`p-limit`) rather than raw `Promise.all`.
* **Single-Pass Aggregations**: Favor single-pass reducers, `Map`/`Set` indexes, and native `Map.groupBy` over multiple chained filtering operations.
```

---

### 4.3 Drop-In Enhancements for `rules/sdlc_pipeline.md` & `AGENTS.md`

Update Gate 3 in both files to reflect full scalability coverage:

```markdown
### Gate 3: Scalability & Peer Code Review (Code Reviewer Subagent)
* **Skill**: `automated-code-review`
* **Complexity & Allocation Audit**: Enforce $O(1)/O(N)$ budgets. Reject $O(N^2)$ iterations, reducer object spread copies, and un-cached loop allocations.
* **Modern Framework Lifecycles**: Enforce React 19 Server Component boundaries, `useActionState`/`useOptimistic` transitions, and hydration safety.
* **Memory & Resource Teardown**: Enforce cleanup of event listeners, timers, `AbortController`s, WebSockets, Web Workers, and Object URLs.
* **Concurrency & Race Safety**: Enforce `p-limit` throttling, request sequence ID tracking, and Optimistic Concurrency Control (OCC).
* **Database & I/O Scalability**: Eliminate N+1 queries using DataLoader/JOINs; enforce keyset/cursor pagination and bounded connection pools.
```

Update Non-Negotiable Sign-Off Criteria (Section 3) to:
```markdown
## 3. Non-Negotiable Sign-Off Criteria

No feature or change is approved if:
1. Any automated test fails.
2. The linter or typechecker emits errors.
3. The build fails or emits critical warnings.
4. Any OWASP vulnerability (ASVS Level 3) is present.
5. An uncontrolled $O(N^2)$ algorithm, memory leak, or missing resource teardown is detected.
6. Unbounded async operations (`Promise.all` over dynamic data) or unhandled async race conditions exist.
7. An N+1 database query pattern or unindexed table scan is introduced.
8. Rate limiting is missing on exposed endpoints or intensive operations.
```

---

## 5. Concrete Code Reference Implementations

### Pattern 1: $O(N)$ Single-Pass Indexing vs $O(N^2)$ Reducer Spread
```typescript
// ❌ REJECT: O(N^2) time and memory overhead
export function createLookupBad<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
}

// ✅ APPROVE: O(N) single-pass Map lookup
export function createLookupGood<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}
```

### Pattern 2: React 19 State Lifecycle with Cancellation & Race Condition Immunity
```typescript
import { useState, useEffect, useRef } from 'react';

interface SearchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useSearchWithCancel<T>(query: string, fetcher: (q: string, signal: AbortSignal) => Promise<T>): SearchState<T> {
  const [state, setState] = useState<SearchState<T>>({ data: null, loading: false, error: null });
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!query.trim()) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const currentReqId = ++reqIdRef.current;
    const controller = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    fetcher(query, controller.signal)
      .then(data => {
        // Prevent stale out-of-order responses from overwriting newer queries
        if (currentReqId === reqIdRef.current) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (currentReqId === reqIdRef.current) {
          setState({ data: null, loading: false, error: err instanceof Error ? err : new Error(String(err)) });
        }
      });

    return () => {
      controller.abort();
    };
  }, [query, fetcher]);

  return state;
}
```

### Pattern 3: Concurrency Throttling with `p-limit`
```typescript
import pLimit from 'p-limit';

export async function processBatchConcurrently<T, R>(
  items: readonly T[],
  processor: (item: T) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const limit = pLimit(concurrency);
  return Promise.all(items.map(item => limit(() => processor(item))));
}
```

### Pattern 4: DataLoader Batching to Eliminate N+1 Queries
```typescript
import DataLoader from 'dataloader';

export interface User {
  id: string;
  name: string;
}

export function createUserDataLoader(fetchUsersBatch: (ids: readonly string[]) => Promise<User[]>): DataLoader<string, User | null> {
  return new DataLoader<string, User | null>(async (ids) => {
    const users = await fetchUsersBatch(ids);
    const userMap = new Map(users.map(u => [u.id, u]));
    return ids.map(id => userMap.get(id) ?? null);
  });
}
```

---

## 6. Synthesis & Verification Summary

The proposed enhancements transform Gate 3 from a basic React memoization check into an **enterprise-grade Scalability, Concurrency, and Modern Framework Quality Gate**. Subagents executing peer reviews under this enhanced protocol will systematically detect and eliminate:
1. Quadratic CPU/memory bottlenecks ($O(N^2)$ spread, un-cached sets, intermediate array churn).
2. React 19 / Next.js / Vue 3 hydration mismatches and rendering waterfalls.
3. Memory leaks across the full spectrum of DOM, timers, workers, streams, canvases, and WebSockets.
4. Async race conditions and unthrottled network floods.
5. Database N+1 queries, unindexed table scans, and connection pool exhaustion.

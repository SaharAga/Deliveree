---
name: automated-code-review
description: Comprehensive peer review and scalability checklist for evaluating code deltas. Activate when reviewing any code change touching algorithmic logic, React/Vue/Next.js components, data persistence, database queries, async operations, or bilingual RTL/LTR layouts. Do NOT activate for config-only changes, documentation updates, or asset additions with no logic changes.
inputs:
  - List of modified files and their code diffs
  - Framework context (React 19, Next.js 15, Vue 3, etc.)
outputs:
  - Structured Code Review Report (APPROVED / CHANGES REQUESTED) with line-cited findings, specialist consultation notes, and drop-in remediation code
---

# Automated Code Review, Scalability & UX Protocol

This skill guides any agent or reviewer subagent in performing high-rigor, adversarial peer reviews focusing on **Scalability, Algorithmic Efficiency, Database I/O, State Lifecycle, Resource Teardown, Bi-Directional UX, and Domain Specialist Consultation**.

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
* **Touch Targets (WCAG 2.5.5)**: Maintain $\ge 48\times 48\text{px}$ interactive targets on mobile.
* **Pinch-to-Zoom**: Never set `user-scalable=no` or `maximum-scale=1.0` — violates WCAG 1.4.4.

---

## 3. Domain Specialist Consultation Protocol

Before issuing a final code review verdict on non-trivial code modifications, `code_reviewer` must consult the relevant Subsystem Component Specialist based on the changed file paths:

### Subsystem Mapping & Consultation Matrix

| Subsystem Domain | Owning Specialist | Mandatory Consultation Invariants |
| :--- | :--- | :--- |
| **Auth & Cloud Infrastructure** | `auth_cloud_specialist` | - Verify Firebase Spark free-tier quotas (reads $\le 50\text{k/day}$, writes $\le 20\text{k/day}$).<br>- Enforce GDPR data deletion cascades (`deleteAllUserData`).<br>- Verify Firestore security rule constraints and auth token claims. |
| **Delivery & Data Pipeline** | `delivery_pipeline_specialist` | - Validate Zod schema coverage on all incoming package payloads.<br>- Check regex catastrophic backtracking (ReDoS) on carrier detector patterns.<br>- Ensure immutability in timeline tracking and status transitions. |
| **UI/UX & Ergonomics** | `ui_ux_specialist` | - Verify mobile touch targets $\ge 48\times 48\text{px}$ and safe-area inset propagation (`env(safe-area-inset-*)`).<br>- Check Hebrew RTL / English LTR mirror symmetry and logical Tailwind classes.<br>- Verify WCAG 2.2 AAA contrast and focus trap handling on modal dialogs. |
| **PWA & Offline Resilience** | `pwa_offline_specialist` | - Check Service Worker cache version incrementation in `public/sw.js`.<br>- Verify `SKIP_WAITING` and `controllerchange` auto-update handlers.<br>- Ensure offline fallback and zero quota exception crashes in `localStorage`/IndexedDB. |
| **Feedback & Telemetry** | `feedback_telemetry_specialist` | - Verify error payload sanitization (no raw stack traces or tokens in feedback documents).<br>- Check rate limiting on feedback submission endpoints.<br>- Ensure non-blocking async execution for notification dispatchers (`notify.py`, Telegram bots). |

### Consultation Workflow Steps
1. **Analyze Diff Scope**: Identify which domain specialists map to the modified files.
2. **Execute Invariant Check**: Verify that all domain-specific invariants are satisfied by the changes.
3. **Document in Review Report**: Include a dedicated "Domain Specialist Consultation" section in the review output recording checks passed or remediation requests.

---

## 4. Corporate Scalability, FinOps & Vendor Quota Protocol

Reviewers must evaluate the **unit economics, vendor quota burn, and subscription dependency** of code changes:

### A. Vendor Tier & Quota Limits
* **Firebase Free (Spark)**:
  * Reads: $\le 50,000\text{/day}$ | Writes: $\le 20,000\text{/day}$ | Storage: $\le 1\text{ GB}$.
  * *Requirement*: Reject unbounded pollers or multi-read loops. Use real-time snapshot listeners with local document caches or IndexedDB persistence.
* **Hosting Bandwidth (Vercel / CDN)**:
  * Vercel Free: $\le 100\text{ GB/month}$ | Cloudflare Pages: Unlimited.
  * *Requirement*: Audit bundle size changes. Enforce route-based code splitting (`React.lazy`), dynamic imports, and aggressive PWA asset caching so returning users consume 0 hosting bandwidth.
* **Third-Party Carrier APIs (17Track, DHL, Israel Post)**:
  * Free API tiers often limit calls to $100\text{--}500\text{ requests/day}$.
  * *Requirement*: Implement strict serverless caching / TTLs (minimum 1--4 hours per tracking lookup) to prevent premature paid API tier upgrades.

### B. Vendor Lock-In & Zero-Cost Fallback
* Avoid hard dependencies on proprietary cloud services without abstraction adapters (e.g. use clean repository/storage adapters like `cloudStorageAdapter.js` that can seamlessly switch between Firebase, Supabase, or PostgreSQL).
* Provide low-cost or zero-cost migration paths for any feature that approaches corporate tier ceilings.

---

## 5. Structured Review Output Template

```markdown
# 🔍 Code Review & Scalability Report

## Summary Verdict: [ APPROVED | CHANGES REQUESTED ]

### 1. Technical Scalability (Code & Architecture)
- **Big-O Budget**: [O(1)/O(N) verified | Flagged: describe issue]
- **Reducer / Loop Anti-Patterns**: [Pass | Issue: file:line]
- **Formatter & Allocator Caching**: [Pass | Issue: file:line]
- **Database & I/O (N+1 / Keyset Pagination)**: [Pass | Issue: describe pattern]
- **Framework Lifecycle & Memory Teardown**: [Pass | Leak at: file:line]
- **Concurrency & State Edge Cases**: [Pass | Race condition/resurrection risk]

### 2. Domain Specialist Consultation
- **Consulted Specialist(s)**: [e.g. `auth_cloud_specialist`, `delivery_pipeline_specialist`]
- **Domain Invariant Checks**: [e.g. Firestore Spark read budget verified; Zod schema sanitization confirmed]
- **Specialist Verdict**: [APPROVED | REMEDIATION REQUIRED]

### 3. Corporate & FinOps Scalability (Quotas & Unit Economics)
- **Vendor Quota Burn (Firebase / APIs)**: [Compliant with Spark/Free quotas | Excessive DB read/write pattern flagged]
- **Bandwidth & Bundle Size Impact**: [Optimized / PWA-cached | Uncompressed asset/bundle bloat flagged]
- **API Cache & TTL Strategy**: [Pass (TTL >= 1h) | Missing cache on external API calls]
- **Lock-in & Zero-Cost Fallback**: [Adapter pattern respected | Proprietary lock-in flagged]

### 4. RTL/LTR & Accessibility
- **Logical CSS Positioning**: [Pass | Hardcoded offset at: file:line]
- **WCAG Contrast & Touch Targets**: [Pass | Issue: describe]

### 5. Critical Blocking Issues (if CHANGES REQUESTED)
| File:Line | Category (Technical / Domain / Corporate) | Issue | Severity | Drop-In Fix |
|---|---|---|---|---|
| file.js:N | Domain Specialist | Missing Zod schema parsing on imported payload | HIGH | `code fix` |
```

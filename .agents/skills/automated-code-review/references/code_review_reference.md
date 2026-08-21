# Automated Code Review Reference & Checklists

---

## 1. Technical Scalability & Performance

### A. Algorithmic Complexity ($O(1)$ to $O(N)$)
- **Nested Iterations**: Avoid `array.map()` containing `array.find()` or `array.includes()` -> use `Set`/`Map`.
- **Quadratic Reducer Spread**: `items.reduce((acc, x) => ({ ...acc, [x.id]: x }), {})` is $O(N^2)$. Mutate accumulator in-place: `acc[x.id] = x; return acc;`.
- **Formatter Caching**: Cache `Intl.DateTimeFormat` instances in module-level `Map`s; do not re-instantiate per list row.

### B. Database & I/O
- **N+1 Queries**: Eliminate queries inside loops; batch or join queries.
- **Pagination**: Use cursor or keyset pagination on collections that grow over time.
- **Connection Reuse**: Reuse existing Firebase/storage adapter instances.

### C. Framework State Lifecycle (React / Client State)
- **Context Memoization**: Wrap `<Context.Provider value={{...}}>` in `useMemo` and callbacks in `useCallback`.
- **Resource Teardown**: Clean up `setTimeout`, `setInterval`, `addEventListener`, `AbortController`, and `URL.revokeObjectURL` on unmount.
- **Storage Quota**: Catch `QuotaExceededError` on `localStorage`/`IndexedDB` operations.

---

## 2. Bilingual RTL/LTR & Accessibility

- **Logical CSS**: Use `ltr:left-[X]px rtl:right-[X]px` or logical margin/padding instead of physical left/right.
- **Directional Flipping**: Mirror directional icons (`→`/`←`) for RTL.
- **Number Isolation**: Wrap numbers, IDs, and tracking codes in `<bdi dir="ltr">`.
- **WCAG Contrast & Targets**: Ensure mobile touch targets $\ge 48\times 48\text{px}$ and text contrast $\ge 4.5:1$.

---

## 3. Domain Specialist Consultation Matrix

| Subsystem Domain | Owning Specialist | Key Checks |
|---|---|---|
| **Auth & Cloud** | `auth_cloud_specialist` | Spark read/write budgets, GDPR deletion cascade, Firestore rule ownership. |
| **Delivery Pipeline** | `delivery_pipeline_specialist` | Zod schema parsing, carrier detector regex safety (anti-ReDoS). |
| **UI/UX & Ergonomics** | `ui_ux_specialist` | Touch targets $\ge 48\text{px}$, RTL/LTR mirror symmetry, safe-area insets. |
| **PWA & Offline** | `pwa_offline_specialist` | Service worker cache invalidation, offline fallbacks, quota handling. |

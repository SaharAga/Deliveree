# Software Development Standards Reference

---

## 1. Clean Architecture Layers

1. **Presentation Layer (`src/components/`, `src/App.jsx`)**:
   - Focus on DOM rendering, styling (Tailwind), accessibility, and capturing user actions.
   - Delegate state operations and I/O to custom hooks and service adapters.
2. **Business / Domain Layer (`src/context/`, `src/utils/`, `src/schemas/`)**:
   - Manage state transitions, business invariants, data sanitization, and Zod schemas.
3. **Data / Infrastructure Layer (`src/services/`)**:
   - Abstract external storage and APIs behind interfaces (e.g. `idbStorageAdapter`, `cloudStorageAdapter`).

---

## 2. Defensive Error Sanitization (CWE-209 Prevention)

Always catch and normalize errors from external or async calls into sanitized structures. Never leak raw stack traces, DB schema internals, or auth keys to user UI:
```typescript
export interface AppError {
  code: string;
  message: string;
  status?: number;
  details?: unknown; // Sanitized of internal paths
}
```

---

## 3. Cost-Aware Development (FinOps & Spark Quotas)

- **Firestore Free Tier (Spark)**: 50k reads / 20k writes per day.
  - Avoid short polling loops; use local IndexedDB cache first.
  - Batch updates (`writeBatch`) when modifying multiple records.
- **Bundle & Bandwidth**:
  - Dynamically load heavy components using `React.lazy()`.
  - Use SVG/vector icons and ensure PWA Service Worker caches assets.

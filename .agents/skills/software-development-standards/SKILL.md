---
name: software-development-standards
description: Best practices and engineering standards for application implementation. Use when writing new React components, services, utility functions, hooks, or schema validations. Do NOT use for high-level project management, pure test runner verification, or documentation-only tasks.
inputs:
  - Feature specification and target component layer
  - API and schema contracts
outputs:
  - Clean, modular, defensive code with co-located unit tests and zero lint/type errors
---

# Software Development Standards

This skill provides essential guidelines for writing maintainable, modular, and reliable code.

---

## 1. Core Engineering Invariants

1. **Clean Architecture**: Decouple UI components (`src/components/`), domain logic (`src/context/`, `src/utils/`), and storage services (`src/services/`).
2. **Defensive Programming**: Validate inputs with schemas (Zod), sanitize error payloads before display, and isolate UI failure with Error Boundaries.
3. **Lifecycle & Cleanup**: Always clean up timers, intervals, event listeners, and `AbortController` instances in component unmount effects.
4. **Co-located Tests**: Write unit/integration tests alongside source files (`Component.jsx` $\rightarrow$ `Component.test.jsx`).
5. **FinOps & Cache-First**: Prefer local cache (IndexedDB) and batched writes to conserve free-tier cloud quotas.

*(For detailed architectural layers and error sanitization examples, see `references/development_standards_guide.md`)*

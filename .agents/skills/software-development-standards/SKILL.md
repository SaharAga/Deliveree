---
name: software-development-standards
description: Best practices and engineering standards for software development. Activate when implementing new features, components, services, data adapters, or refactoring existing modules. Covers Clean Architecture, separation of concerns, defensive typing, error sanitization, state management, and co-locating unit tests. Do NOT activate for simple documentation updates or asset-only changes.
inputs:
  - Feature specification and target component layer
  - API / Schema contracts
outputs:
  - Clean, modular, defensive code with co-located unit testbenches and zero linter/type errors
---

# Software Development Standards & Best Practices

This skill outlines the strict development standards required for building scalable, maintainable, secure, and reliable applications.

---

## 1. Architectural Principles

### A. Separation of Concerns & Clean Architecture
Structure code into distinct, decoupled layers:
1. **Presentation Layer (UI / Components)**:
   * Pure UI rendering, styling, accessibility (ARIA, RTL/LTR), and user event capture.
   * Free of direct network/API calls or complex business calculation loops.
2. **Business / Domain Layer (Hooks, Controllers, Reducers, Domain Models)**:
   * Core application logic, validations, state transitions, and computations.
3. **Data / Infrastructure Layer (Services, API Clients, Storage Adapters)**:
   * Network requests, local storage caching, external SDK wrappers, database interactions.

### B. Clean Code & Modularity
* **Single Responsibility**: Each function, hook, or component must do exactly one thing well.
* **Pure Functions Where Possible**: Prefer deterministic functions with zero side effects for calculations and data transforms.
* **Explicit Over Implicit**: Avoid magic strings and numbers. Define `const` enums and configuration maps.

---

## 2. Defensive Programming & Error Sanitization

* **Explicit Error Boundaries**: Wrap critical UI sections in Error Boundaries to isolate failures without crashing the entire application.
* **Structured Error Sanitization (CWE-209 Prevention)**:
  * Always catch and normalize errors from external calls into standard, sanitized error shapes.
  * **Never** leak raw stack traces, database schema names, internal IP addresses, or environment variables to client surfaces or API responses.
  ```typescript
  export interface AppError {
    code: string;
    message: string;
    status?: number;
    details?: unknown; // Stripped of stack traces and internal paths
  }
  ```
* **Graceful Degradation**: Provide sensible fallback states (skeleton loaders, retry buttons, cached data) when network operations fail.
* **No Swallowed Exceptions**: Never use empty `catch {}` blocks. Always log or propagate errors appropriately.

---

## 3. State Management & Lifecycle Safety

* **Single Source of Truth**: Avoid duplicating state across multiple places. Derive state whenever possible.
* **Cleanup on Unmount**: Always cleanup side-effects (event listeners, timers, intervals, WebSocket connections, AbortControllers) in `useEffect` or composable teardown functions.
* **Immutability**: Never mutate state objects or arrays in-place. Use immutable update patterns.

---

## 4. Automated Testing Requirements

* **Test Co-Location**: Place unit tests next to the code they test (e.g. `Button.jsx` $\rightarrow$ `Button.test.jsx`, `deliveryService.js` $\rightarrow$ `deliveryService.test.js`).
* **Test the Contract, Not Implementation**: Test user-visible behaviors, expected inputs/outputs, and error handling rather than internal implementation details.
* **5-Tier Test Coverage**:
  1. Happy path (valid inputs).
  2. Boundary conditions (empty lists, 0, max limits).
  3. Error path (network failure, 4xx/5xx responses, malformed data).
  4. Adversarial edge cases (XSS strings, oversized payloads, prototype pollution).

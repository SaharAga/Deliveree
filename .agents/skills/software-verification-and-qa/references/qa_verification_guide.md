# QA & Test Verification Reference

---

## 1. 5-Tier Testbench Hierarchy

| Tier | Focus | Description & Example |
|---|---|---|
| **T1: Unit** | Pure logic | Pure utility functions with zero I/O (`dateUtils.formatDate`). |
| **T2: Boundary** | Edge inputs | Null, empty arrays, oversized strings, type coercions. |
| **T3: Integration** | Multi-module | Service $\leftrightarrow$ storage adapter round-trips. |
| **T4: E2E Flows** | User scenarios | Modal opens $\rightarrow$ user inputs $\rightarrow$ state updates $\rightarrow$ DOM renders. |
| **T5: Adversarial** | Stress & Chaos | XSS payload injection, storage quota errors, network latency. |

---

## 2. Anti-Facade Rules

- Scan test files for meaningless assertions (`expect(true).toBe(true)` or `expect(1).toBe(1)`).
- Flag permanently skipped test blocks (`it.skip`, `describe.skip`, `xit`, `xdescribe`).
- Flag left-over focused test runners (`it.only`, `fit`).

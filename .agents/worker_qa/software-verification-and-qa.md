# Software Verification & QA Protocol

This skill guides the **QA Verifier Subagent** in running automated quality gates, executing test suites, validating builds, and ensuring software stability.

---

## 1. Automated Verification Sequence

The QA Verifier runs the verification testbench in 4 stages:

### Stage 1: Static Analysis & Linting
* Run workspace linter (e.g. `npm run lint` or `npx oxlint` / `eslint`).
* **Rule**: Zero linter errors and zero unresolved warnings permitted.

### Stage 2: Type Checking
* If TypeScript or JSDoc typechecking is configured (e.g. `npx tsc --noEmit`), execute the type checker.
* **Rule**: Zero compilation/type errors permitted.

### Stage 3: Automated Test Execution
* Run unit and integration tests (e.g. `npm test` or `npx vitest run`).
* **Requirements**:
  * 100% pass rate on all test suites.
  * Validate that assertions cover edge cases (null inputs, empty state, error responses).
  * Check that regressions do not occur in previously working modules.

### Stage 4: Production Build Validation
* Execute production bundle build (`npm run build`).
* **Requirements**:
  * Build finishes with exit code 0.
  * Verify that bundle sizes are within reasonable thresholds and no missing module errors occur.

---

## 2. Structured QA Verification Report

Every QA run must produce a structured verification report:

```markdown
# 🧪 QA & Test Verification Report

## Overall Status: [ PASS | FAIL ]

### Test Suite Execution
- **Linter Check (`npm run lint`)**: [ ✅ PASSED / ❌ FAILED ]
- **Type Check**: [ ✅ PASSED / ❌ FAILED ]
- **Unit & Integration Tests**: [ ✅ X/X Passed / ❌ Failures ]
- **Production Build (`npm run build`)**: [ ✅ PASSED / ❌ FAILED ]

### Acceptance Criteria Checklist
- [x] Requirement 1: [Status]
- [x] Requirement 2: [Status]

### Failure Diagnostics (if FAIL)
- **Error Description**: [Exact error message and stack trace]
- **Failing Test / File**: [Path to test or failing component]
- **Recommended Action**: [Details on how to resolve the build or test failure]
```

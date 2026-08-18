---
name: software-verification-and-qa
description: Quality assurance and test execution protocol. Activate when verifying any code change — runs static analysis, type checking, 5-tier testbench hierarchy with anti-facade injection detection, and production build validation. Do NOT activate for planning-only phases or tasks that make no code changes.
inputs:
  - Workspace root path
  - List of modified files (for scoped coverage analysis)
outputs:
  - Structured QA Verification Report (PASS / FAIL) with exact command output, coverage metrics, and anti-facade scan results
---

# Software Verification & QA Protocol

This skill guides any agent or QA verifier subagent in running automated quality gates, executing multi-tier testbenches, validating builds, and ensuring software stability.

---

## 1. Deterministic Gate Commands

Run these exact commands in sequence. All must exit with code 0:

```bash
# Gate 1: Static Analysis & Linting
npx oxlint -D warnings --deny-warnings     # Zero warnings policy
npm run lint                                # ESLint if configured

# Gate 2: Type Checking
npx tsc --noEmit --strict                  # Zero type errors

# Gate 3: 5-Tier Testbench
npm test                                    # or: npx vitest run --coverage

# Gate 4: Production Build
npm run build                              # Zero build warnings / missing modules
```

---

## 2. 5-Tier Testbench Hierarchy

Every test suite should cover all 5 tiers. Verify that the existing test suite addresses each:

| Tier | Description | Example |
|:---:|---|---|
| **T1: Unit** | Individual pure functions in isolation, no I/O or DOM | `sanitizeString('xss<script>')` returns clean string |
| **T2: Boundary** | Null inputs, empty arrays, max-length strings, type coercions | `validatePackageList(null)`, `sanitizeString('', 0)` |
| **T3: Pairwise Integration** | Two-module interactions (service calls context, hook calls service) | `deliveryService.savePackages()` → `getPackages()` round-trip |
| **T4: E2E Scenarios** | Full user flows from UI interaction to storage/response | `SmartImportModal` parses SMS → validates → stores → renders card |
| **T5: Adversarial Stress** | Injection payloads, quota exhaustion, concurrency races, large inputs | XSS strings in `trackingNumber`, 10,001 items in import, simultaneous save+get |

---

## 3. Anti-Facade Fault Injection Detection

After running the test suite, scan for dummy assertions that provide false confidence:

```bash
# Scan for trivially-passing fake assertions
grep -rn "expect(true).toBe(true)\|expect(1).toBe(1)\|expect('').toBe('')" src/
grep -rn "it\.skip\|test\.skip\|xit\|xtest\|xdescribe" src/
grep -rn "\.only(" src/
```

**Rule**: Any test file containing dummy assertions (`expect(true).toBe(true)`) or permanently-skipped tests (`it.skip`) is a **FAIL** and must be remediated before Gate 5 passes.

---

## 4. Coverage Thresholds

If coverage reporting is configured (`--coverage`), enforce:
* **Statement Coverage**: ≥ 70%
* **Branch Coverage**: ≥ 60%
* **Function Coverage**: ≥ 80%

Critical utility files (`packageValidator.js`, `smartParser.js`, `carrierDetector.js`) must maintain ≥ 90% branch coverage.

---

## 5. Build Quality Checks

After `npm run build`:
* Verify bundle sizes are within reasonable thresholds (flag if JS > 1MB uncompressed without justification).
* Confirm no `WARN` entries in Vite / webpack output about missing modules, unresolved imports, or circular dependencies.
* Confirm the PWA service worker (if present) precaches all production-hashed assets.

---

## 6. Structured QA Verification Report

```markdown
# 🧪 QA & Test Verification Report

## Overall Status: [ PASS | FAIL ]

### Gate Results
| Gate | Command | Status | Notes |
|---|---|---|---|
| Linting | `oxlint -D warnings` | ✅ / ❌ | N errors, N warnings |
| Type Check | `tsc --noEmit --strict` | ✅ / ❌ | N errors |
| Test Suite | `vitest run --coverage` | ✅ X/X / ❌ N failed | Coverage: X% stmt, X% branch |
| Anti-Facade | `grep expect(true)...` | ✅ Clean / ❌ Found at file:line |
| Build | `npm run build` | ✅ / ❌ | Bundle: X kB JS, X kB CSS |

### Testbench Tier Coverage
- **T1 Unit**: [Covered / Missing: describe]
- **T2 Boundary**: [Covered / Missing: describe]
- **T3 Integration**: [Covered / Missing: describe]
- **T4 E2E Scenarios**: [Covered / Missing: describe]
- **T5 Adversarial Stress**: [Covered / Missing: describe]

### Failure Diagnostics (if FAIL)
- **Error**: [Exact message and stack trace]
- **Failing Test / File**: [Path and test name]
- **Recommended Action**: [Targeted remediation steps]
```

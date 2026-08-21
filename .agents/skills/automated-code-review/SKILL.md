---
name: automated-code-review
description: Code review and scalability auditing protocol. Use when evaluating pull requests, git diffs, or code changes for algorithmic complexity, memory cleanup, React state lifecycle, database efficiency, and RTL/LTR layout correctness. Do NOT use for config-only updates, documentation changes, or static asset commits without logic.
inputs:
  - List of modified files and diffs
  - Architectural context of the application
outputs:
  - Structured Code Review Report (APPROVED / CHANGES REQUESTED) with Scope Challenge assessments and drop-in fixes
---

# Automated Code Review & Scalability Protocol

This skill guides peer code reviews focusing on technical scalability, memory safety, and scope relevance.

---

## 1. The Scope Challenge Requirement (Mandatory)

Before flagging any issue as blocking:
> **Scope Challenge**: The reviewer must state in one line why this issue matters *for this specific app at its current stage (client-only PWA)*.
> Issues that are theoretical, premature micro-optimizations, or out-of-scope for the current architecture must NOT block the gate — log them to `DEFERRED.md` instead.

---

## 2. Core Review Areas

1. **Algorithmic Complexity**: Target $O(1)$ to $O(N)$. Flag nested loop lookups ($O(N^2)$) and quadratic reducer spreads.
2. **Resource & Memory Teardown**: Verify cleanup of timers, event listeners, AbortControllers, and object URLs on component unmount.
3. **Async Race & Storage Safety**: Verify out-of-order response handling, last-write-wins safety, and `QuotaExceededError` handling.
4. **Bilingual RTL/LTR**: Verify logical CSS positioning, `<bdi dir="ltr">` around tracking codes, and $\ge 48\text{px}$ touch targets.
5. **Specialist Consultation**: Consult owning specialist invariants for Auth, Delivery, UI/UX, or PWA files.

*(For detailed checklists and patterns, see `references/code_review_reference.md`)*

---

## 3. Structured Review Output Template

```markdown
# 🔍 Code Review Report

## Summary Verdict: [ APPROVED | CHANGES REQUESTED ]

### 1. Scope Challenge & Technical Scalability
- **Big-O Complexity & Loops**: [Pass / Flagged: file:line]
- **Lifecycle & Memory Teardown**: [Pass / Flagged: file:line]
- **Async Safety & Storage Quota**: [Pass / Flagged: file:line]
- **RTL/LTR & Ergonomics**: [Pass / Flagged: file:line]

### 2. Scope-Challenged & Deferred Items (Logged to DEFERRED.md)
| File:Line | Finding | Reason Deferred (Non-blocking) |
|---|---|---|
| file.js:N | Description | Why not critical at current stage |

### 3. Domain Specialist Invariant Check
- **Consulted Subsystem**: [`auth_cloud_specialist` | `delivery_pipeline_specialist` | `ui_ux_specialist` | `pwa_offline_specialist` | N/A]
- **Invariant Verdict**: [APPROVED | REMEDIATION REQUIRED]

### 4. Critical Blocking Issues (if CHANGES REQUESTED)
| File:Line | Category | Issue & Scope Justification | Remediation |
|---|---|---|---|
| file.js:N | Technical | Why this breaks correctness/scale now | Drop-in fix |
```

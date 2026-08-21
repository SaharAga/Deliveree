---
name: sdlc-orchestrator
description: Orchestration protocol for Project Managers and Lead Agents. Use when decomposing and coordinating multi-stage feature development, refactors, or fixes across Developer, Code Reviewer, Security Auditor, and QA Verifier roles. Do NOT use for single-file trivial fixes, read-only research lookups, or documentation-only updates.
inputs:
  - High-level feature request or engineering goal
  - Workspace repository context
outputs:
  - Decomposed execution plan with contract definitions and distinct subagent dispatches
---

# SDLC Orchestration Protocol

This skill guides the Lead Orchestrator in managing software changes across the 4 standard quality gates.

---

## 1. Core Orchestration Rules

1. **Strict Orchestrator Hands-Off Rule**: The Orchestrator does not write application code (`src/**`) directly for multi-domain features; it plans, decomposes, dispatches subagents, and arbitrates gates.
2. **Distinct Subagent Execution**: The Orchestrator **MUST ALWAYS** dispatch separate, dedicated subagents for Code Review (Gate 2), Security Audit (Gate 3), and QA Verification (Gate 4). Self-review is strictly forbidden.
3. **Standard 4-Stage Pipeline**:
   ```
   [Gate 1: Implementation] --> [Gate 2: Code Review] --> [Gate 3: Security Audit] --> [Gate 4: QA Verification] --> [Done]
          (Developer)              (Code Reviewer)         (Security Auditor)              (QA Verifier)
   ```
   *No challenger/auditor/victory-auditor layer is used for routine app development.*
4. **Bounded Remediation**: Maximum 3 remediation retries per gate before logging to `DEAD_ENDS.md` and escalating to the user.

*(For detailed subagent profiles and retry flows, see `references/orchestration_reference.md`)*

---

## 2. Subagent Dispatch Templates

### Gate 1: Developer Dispatch
* **Subagent Name**: `developer` (or component specialist: `ui_ux_specialist`, `auth_cloud_specialist`, `delivery_pipeline_specialist`)
* **Target Skills**: `software-development-standards`
```markdown
Activate the `software-development-standards` skill.
Task: [Describe components, services, or features to implement]
Files: [Target file paths]
Contract: [TypeScript interfaces / Zod schemas]
```

### Gate 2: Code Review Dispatch
* **Subagent Name**: `code_reviewer`
* **Target Skills**: `automated-code-review`
```markdown
Activate the `automated-code-review` skill.
Review Target: [List of modified files and diffs]
Execute Scope Challenge: Verify issue relevance for this client-only PWA before flagging.
```

### Gate 3: Security Audit Dispatch
* **Subagent Name**: `security_auditor`
* **Target Skills**: `owasp-security-and-rate-limiting`
```markdown
Activate the `owasp-security-and-rate-limiting` skill.
Audit Target: [List of modified files and attack surfaces]
Evaluate against Deliveree Security Baseline.
```

### Gate 4: QA Verification Dispatch
* **Subagent Name**: `qa_verifier`
* **Target Skills**: `software-verification-and-qa`
```markdown
Activate the `software-verification-and-qa` skill.
Tasks: Linting, Typecheck, 5-Tier Testbench, Anti-Facade scan, Build.
```

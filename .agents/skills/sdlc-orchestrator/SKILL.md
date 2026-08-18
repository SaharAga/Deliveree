---
name: sdlc-orchestrator
description: Master orchestration guide for Project Managers and Lead Agents. Activate when planning and decomposing a new feature, bugfix, refactor, or infrastructure change that requires multiple subagent stages. Do NOT activate for read-only research tasks, single-file trivial fixes, or documentation-only updates.
inputs:
  - High-level user requirement or feature request
  - Target repository / workspace context
outputs:
  - Decomposed task plan with API contracts, acceptance criteria, and staged subagent invocations
---

# SDLC Orchestrator & Project Manager Skill

This skill guides the primary Orchestrator agent in planning, delegating, and verifying software engineering tasks using specialized subagents that activate designated modular skills.

---

## 1. Orchestrator Responsibilities

1. **Deconstruct Requirements**: Break user requests into decoupled, modular tasks across the 7 SDLC stages.
2. **Define Contracts First**: Establish TypeScript types, API payloads, and error codes before invoking developer agents.
3. **Manage 7-Stage Pipeline Gates**:
   ```
   [Spec & Architecture] --> [UI/UX Architect] --> [Developer] --> [Code Reviewer] --> [Security & Red Team] --> [Performance & Chaos] --> [QA Verifier] --> [Production Ready]
   ```
4. **Enforce Gate Thresholds**: Reject subagent output if any gate fails (unresolved review comments, accessibility violations, security flags, or failing testbenches).
5. **Independent Review Invariant**: The Orchestrator **MUST NOT** self-review its own changes. Review, Security, Performance, and QA gates MUST always be executed by independent subagents.

---

## 2. Bounded Remediation Loop

If a gate rejects a code delta, dispatch a targeted remediation task to the Developer subagent with the exact issue, file, line number, and recommended fix.

**Loop Termination Rules:**
* Maximum remediation retries: `MAX_RETRIES = 3` per failing gate.
* If a gate fails after 3 retries, log the dead-end in `DEAD_ENDS.md` (root of the workspace) with a description of the attempted approaches.
* Escalate to the user with a clear summary and await a decision — do NOT continue looping.

```
Retry 1 → Developer fixes → Gate re-run
Retry 2 → Developer fixes → Gate re-run
Retry 3 → Developer fixes → Gate re-run
FAIL     → Write DEAD_ENDS.md → Notify user via remote-notifications-and-chat
```

---

## 3. Skill-Driven Subagent Invocation Templates

### A. UI/UX & Human Factors Architect Subagent
* **Subagent Name**: `ui_ux_architect`
* **Target Skills**: `ui-ux-design-systems`, `modern-web-guidance`, `software-development-standards`
* **Tool Permissions**: `view_file`, `write_to_file`, `replace_file_content`, `list_dir`, `grep_search`, `find_by_name`, `run_command`
```markdown
Activate the `ui-ux-design-systems` skill.
Task: [Design or audit UI/UX layouts, flows, and animations]
Target Files: [List of component files]
Requirements:
- Mobile-first touch ergonomics (>= 48x48px tap targets, thumb reach).
- Bilingual RTL/LTR symmetry (Hebrew / English logical properties).
- Frictionless user flows (1-click SSO, zero redundant modal prompts).
- WCAG 2.2 AAA accessibility (>= 7:1 contrast ratios, semantic ARIA tree).
```

### B. Developer Subagent
* **Subagent Name**: `developer`
* **Target Skill**: `software-development-standards`
* **Tool Permissions**: `view_file`, `write_to_file`, `replace_file_content`, `list_dir`, `grep_search`, `run_command`
```markdown
Activate the `software-development-standards` skill.
Task: [Describe the feature or component to implement]
Target Files: [List of files to create or modify]
API / Data Contract: [Explicit types / schemas]
Requirements:
- Follow Clean Architecture and separation of concerns.
- Write strongly-typed, self-documenting code.
- Co-locate unit tests for every new function/component.
- Handle all boundary conditions and error states gracefully.
```

### C. Scalability & Code Reviewer Subagent
* **Subagent Name**: `code_reviewer`
* **Target Skill**: `automated-code-review`
* **Tool Permissions**: `view_file`, `list_dir`, `grep_search`, `find_by_name`, `run_command` (read-only)
```markdown
Activate the `automated-code-review` skill.
Review Target: [List of modified files and their diffs]
Framework Context: [React 19 / Next.js 15 / Vue 3 / etc.]
Evaluate against:
1. Algorithmic complexity (O(N) budget, quadratic patterns, allocation efficiency).
2. Database I/O scalability (N+1, keyset pagination, index coverage).
3. Framework lifecycle & memory teardown (memoization, timer/socket/worker cleanup).
4. Concurrency & state edge cases (race conditions, storage quota, empty-state invariant).
5. RTL/LTR layout and WCAG accessibility compliance.
Output: Structured review (APPROVED / CHANGES REQUESTED) with line-cited findings.
```

### D. Enterprise Security Auditor & Adversarial Pentester
* **Subagent Names**: `security_auditor`, `adversarial_pentester`
* **Target Skill**: `owasp-security-and-rate-limiting`
* **Tool Permissions**: `view_file`, `list_dir`, `grep_search`, `find_by_name`, `run_command`, `write_to_file`
```markdown
Activate the `owasp-security-and-rate-limiting` skill.
Audit Target: [List of modified files or attack surfaces]
Evaluate against:
1. OWASP ASVS Level 3 & API Top 10 (BOLA, BFLA, Injection, XSS, SSRF dual-stack).
2. Cryptographic standards (timingSafeEqual, Argon2id, CSPRNG).
3. Anti-ReDoS regex audit (adjacent quantifier traps).
4. Rate limiting (distributed sliding window, dual-key, RFC headers).
5. Input parsing (schema allowlisting, prototype pollution, error sanitization).
6. Security headers, CORS, and secrets scan.
7. Controlled adversarial Red Team exploitation.
Output: Structured security report (PASS / FAIL) with severity-graded remediation.
```

### E. Performance & Chaos Stress Engineer
* **Subagent Name**: `perf_chaos_engineer`
* **Target Skills**: `performance-and-chaos-stress`, `automated-code-review`, `software-verification-and-qa`
* **Tool Permissions**: `view_file`, `list_dir`, `grep_search`, `find_by_name`, `run_command`
```markdown
Activate the `performance-and-chaos-stress` skill.
Task: [Stress test client rendering, Core Web Vitals, and offline chaos resilience]
Target Metrics:
1. CWV: LCP < 800ms, INP < 50ms, CLS = 0.00.
2. High-load stress: 1,000+ packages in memory with smooth 60fps filtering.
3. Chaos resilience: Spotty 3G network drops, offline PWA caching, LocalStorage quota recovery.
Output: Structured Performance & Chaos Stress Report.
```

### F. QA Verifier Subagent
* **Subagent Name**: `qa_verifier`
* **Target Skill**: `software-verification-and-qa`
* **Tool Permissions**: `view_file`, `list_dir`, `grep_search`, `find_by_name`, `run_command` (read-only, non-destructive)
```markdown
Activate the `software-verification-and-qa` skill.
Tasks:
1. Run workspace linting: `oxlint -D warnings` / `npm run lint`.
2. Run type checker: `tsc --noEmit --strict`.
3. Run 5-tier testbench: `npm test` / `vitest run --coverage`.
4. Run production build: `npm run build`.
5. Verify anti-facade: scan for dummy assertions (expect(true).toBe(true)).
Output: Verification summary (PASS / FAIL with exact test output and coverage metrics).
```

---

## 4. Remote Notifications for Long-Running Pipelines

When the pipeline spans multiple hours or requires user approval at a gate:
* Use the `remote-notifications-and-chat` skill to dispatch a Telegram interactive message with gate status and `[Approve ✅] / [Reject ❌]` buttons.
* Never block indefinitely waiting for the user in the IDE — always fall back to a remote ping.

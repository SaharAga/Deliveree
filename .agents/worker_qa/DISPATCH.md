## 2026-08-18T08:13:51Z
You are the QA Verifier & Testbench Auditor (Worker).
Your working directory is `/home/sahar/Deliveree/.agents/worker_qa/`.
You MUST read the authoritative user request at `/home/sahar/Deliveree/.agents/ORIGINAL_REQUEST.md`, the rulebook at `/home/sahar/Deliveree/AGENTS.md`, and the skill guide at `/home/sahar/Deliveree/.agents/skills/software-verification-and-qa/SKILL.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission: Execute automated QA verification runs (Stage 5) and perform a comprehensive Testbench Quality & Coverage Gap Audit across Deliveree (/home/sahar/Deliveree).

Audit & Verification Tasks:
1. Execute Automated QA Testbench:
   - Run linter: `npx oxlint` (or `npm run lint` if defined).
   - Run unit/integration tests: `npm test` or `npx vitest run`.
   - Run production build: `npm run build`.
   - Document exact command outputs, exit codes, warnings, and errors.
2. Deep Testbench Coverage & Quality Audit:
   - Examine all existing test files:
     - `src/context/AuthContext.test.jsx`
     - `src/services/cloudStorageAdapter.test.js`
     - `src/services/deliveryService.test.js`
     - `src/utils/carrierDetector.test.js`
     - `src/utils/dateUtils.test.js`
     - `src/utils/packageValidator.test.js`
     - `src/utils/smartParser.test.js`
   - Evaluate whether these testbenches cover all critical failure modes, edge cases (empty states, malformed strings, null/undefined, extreme timestamps, invalid schemas, rejection handling, network timeouts).
   - Identify untested components (e.g. `App.jsx`, `AddEditPackageModal.jsx`, `PackageDetailModal.jsx`, `SmartImportModal.jsx`, `LanguageContext.jsx`, `ThemeContext.jsx`, `ErrorBoundary.jsx`, `sw.js`).
   - Assess mock fidelity vs reality (e.g. Firebase mocks, LocalStorage mocks).

Deliverables:
1. Maintain `progress.md` with timestamps.
2. Write a detailed report at `/home/sahar/Deliveree/.agents/worker_qa/report.md` detailing:
   - Exact QA execution results (linter, tests, build) with full logs.
   - Comprehensive testbench evaluation (what is well-tested vs blindspots).
   - Recommended test suites and specific test cases needed to reach 100% robust coverage.
3. Write `/home/sahar/Deliveree/.agents/worker_qa/handoff.md` and use `send_message` to notify your orchestrator when done.

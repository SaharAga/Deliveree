---
name: agent-sync
description: Check in on the Antigravity <-> Claude collaboration workflow (docs/AGENT_SYNC.md), read Claude's latest responses/critiques, ground verification in live code, update the action board, and post Antigravity's reply. Use when the user asks to "sync with Claude", "check agent sync", "reply to Claude", or asks to coordinate next steps with Claude.
inputs:
  - Claude's latest response or branch updates
  - Local repository ground truth (PROJECT_STATE.md, AGY_TASKS.md, source code)
outputs:
  - Grounded answers to Claude's questions
  - Updated Collaborative Action Board
  - Concise user briefing
---

# Agent Sync (Antigravity <-> Claude)

Antigravity and Claude collaborate asynchronously using `docs/AGENT_SYNC.md`. This skill outlines the fixed protocol for Antigravity's turn in the discussion.

## Protocol & Procedure

1. **Fetch and inspect remote branches**:
   - Run `git fetch origin` to check for new branches pushed by Claude (e.g. `claude/*`).
   - Read the latest Claude comments from `docs/AGENT_SYNC.md` or from Claude's feature branch.

2. **Verify Claims against Ground Truth**:
   - Do NOT take claims at face value. Inspect real source code, `PROJECT_STATE.md`, test suites, and linters.
   - For example, verify whether tasks in `docs/AGY_TASKS.md` are already implemented, check security files (`privacySanitizer.js`, `firestore.rules`), or examine services (`syncQueueService.js`).

3. **Formulate Antigravity's Response**:
   - Answer Claude's questions directly with technical rationale and citations to files.
   - Update the **Collaborative Action Board** with task IDs, owners, priorities, and current statuses.
   - Outline clear recommendations for the current sprint (e.g. v0.7.0).

4. **Summarize for the User**:
   - Present a crisp, 3-5 sentence summary highlighting decisions made, tasks assigned, and immediate next actions.

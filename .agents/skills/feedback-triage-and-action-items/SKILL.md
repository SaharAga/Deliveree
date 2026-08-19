---
name: feedback-triage-and-action-items
description: Automated ingestion, triage, priority classification, and action items generation from alpha tester and user feedback in Cloud Firestore and local buffers.
---

# User Feedback Triage & Action Items Automation Skill

This skill defines the protocol for processing, classifying, and converting raw user feedback and bug reports into structured developer action items and remote alerts.

---

## 1. Feedback Pipeline Lifecycle

1. **Collection**: Ingested via `FeedbackModal.jsx` -> Firestore `/feedback` collection (`status: 'pending'`).
2. **Triage & Classification**:
   - `🚨 [P0-Critical]`: Crashes, data loss, total tracking failure, ratings <= 2.
   - `⚠️ [P1-High]`: Tracking discrepancies, auth/sync errors, ratings <= 3.
   - `💡 [P2-Normal]`: Feature requests, export options, minor UI/copy.
3. **Action Items Generation**: Automatically generates reproduction checklist and maps affected codebase components to `.agents/backlog/FEEDBACK_ACTION_ITEMS.md`.
4. **Notification**: Dispatches real-time Telegram alerts for high-priority items.
5. **State Tracking**: Marks records as `status: 'triaged'` to eliminate duplicate processing.

---

## 2. CLI Execution & Automation

* **One-shot triage**:
  ```bash
  python3 scripts/feedback_triage.py --once
  # or
  npm run feedback:triage
  ```

* **Continuous Background Daemon**:
  ```bash
  python3 scripts/feedback_daemon.py --interval 120
  # or
  npm run feedback:daemon
  ```

* **Testing / Mock Data**:
  ```bash
  python3 scripts/feedback_triage.py --mock-sample
  ```

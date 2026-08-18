---
name: remote-notifications-and-chat
description: Asynchronous remote communication via Telegram 2-way chatbot bridge and Gmail SMTP email. Use when long-running workflows complete, when urgent sign-offs/approvals are required, or when the user wants updates delivered directly to their phone/Telegram.
---

# Remote Notifications & Telegram Chatbot Bridge Skill

This skill defines the communication protocols for alerting and interacting with the user remotely via **Telegram** (2-way interactive) and **Email** (Gmail SMTP status reports).

---

## 1. When to Use Remote Communication

Agents, subagents, and orchestrators should leverage remote notifications when:
1. **Long-Running Task Completion**: A lengthy build, test suite regression, or full multi-stage SDLC pipeline finishes.
2. **Interactive Decision Gates**: The agent reaches an architectural decision, ambiguous requirement, or release gate that needs user approval before proceeding.
3. **Critical Failures / Blockers**: Unrecoverable test failures, breaking lint regressions, or security audit rejections that need immediate attention.
4. **Explicit User Request**: When the user requests a remote alert or ping (e.g. *"let me know on Telegram when tests pass"*).

---

## 2. Channels Overview

| Channel | Script / Utility | Direction | Best For |
| :--- | :--- | :--- | :--- |
| **Telegram Bot** | `scripts/telegram_bot.py` | **2-Way** (Send & Receive) | Instant push alerts, interactive questions, inline button approvals (`[Approve]`, `[Reject]`). |
| **Email (Gmail)** | `scripts/notify.py` | **1-Way** (HTML Reports) | Formal build summaries, multi-line diff reports, test run digests. |

Credentials are automatically loaded from `.env.local` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`).

---

## 3. Telegram Bridge Playbook

The Telegram bridge connects to `@sahar_deliveree_bot`.

### A. Send an Instant Push Notification
Use when informing the user of task status without blocking:
```bash
python3 scripts/telegram_bot.py --send "🚀 <b>Stage 5 Passed:</b> All test cases passed and production build is green!"
```

### B. Ask an Interactive Question with Buttons (2-Way)
Use when a gate requires user input or approval. The command sends the question with inline buttons, waits for the user to tap a button or reply on Telegram, and outputs `USER_RESPONSE:<answer>`:
```bash
python3 scripts/telegram_bot.py \
  --ask "Gate 1 Sign-Off: Ready to execute implementation. Proceed?" \
  --options "Approve ✅,Reject ❌,Modify Plan 📝" \
  --timeout 180
```

#### Parsing User Response:
* The CLI output prints `USER_RESPONSE:<selected_option_or_text>`.
* The agent can capture this output directly to continue execution.

---

## 4. Email Reports Playbook

Use `scripts/notify.py` to dispatch formatted HTML emails with status tags:

```bash
# Success Alert
python3 scripts/notify.py -s "Build Passed" -m "All test suites and linters verified clean." --status SUCCESS

# Warning / Action Required
python3 scripts/notify.py -s "Security Gate Alert" -m "Security vulnerability detected. Remediation required." --status ERROR
```

Supported statuses: `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `ACTION_REQUIRED`.

---

## 5. Security & Isolation Rules

1. **Zero Secret Leakage**: Never hardcode tokens or chat IDs in source code, scripts, or commit history.
2. **Network Sandbox**: In Antigravity terminal execution, network requests to `api.telegram.org` or `smtp.gmail.com` require unsandboxed network permission (`BypassSandbox: true`).
3. **Whitelist Authorization**: The Telegram bridge only processes inputs from the paired `TELEGRAM_CHAT_ID`, preventing unauthorized remote triggers.

---

## 6. Idle Timeout & Attention-Ping Policy

1. **Away from Laptop / Unresponsive Flow**: When the user is away from their laptop or does not respond within a reasonable interval:
   * The agent MUST dispatch a Telegram notification or interactive question with clickable buttons (`python3 scripts/telegram_bot.py --ask "..." --options "..."`).
   * This immediately pushes a phone notification to the user, allowing one-tap approvals or custom text feedback from mobile.
2. **Priority Pings**: Always prioritize Telegram pings for gate sign-offs, deployment confirmations, or blocking ambiguity.

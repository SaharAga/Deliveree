---
name: remote-notifications-and-chat
description: Asynchronous remote communication via Telegram 2-way chatbot bridge and Gmail SMTP email. Use when long-running workflows complete, when urgent sign-offs/approvals are required, or when the user wants updates delivered directly to their phone/Telegram.
---

# Remote Notifications & Telegram Chatbot Bridge Skill

This skill defines the communication protocols for alerting and interacting with the user remotely via **Telegram** (2-way interactive background service) and **Email** (Gmail SMTP status reports).

---

## 1. When to Use Remote Communication

Agents, subagents, and orchestrators should leverage remote notifications when:
1. **Long-Running Task Completion**: A lengthy build, test suite regression, or full multi-stage SDLC pipeline finishes.
2. **Interactive Decision Gates**: The agent reaches an architectural decision, ambiguous requirement, or release gate that needs user approval before proceeding.
3. **Critical Failures / Blockers**: Unrecoverable test failures, breaking lint regressions, or security audit rejections that need immediate attention.
4. **Explicit User Request / Mobile Triage**: When the user requests a remote alert or ping (e.g. *"let me know on Telegram when tests pass"*), or when instructions/feedback are provided from Telegram mobile.

---

## 2. Channels Overview

| Channel | Script / Utility | Direction | Best For |
| :--- | :--- | :--- | :--- |
| **Telegram Bot (Daemon)** | `scripts/telegram_daemon.py` (systemd user service) | **2-Way** (24/7 background listener) | Auto-poll Telegram updates, execute bot commands (`/status`, `/test`, `/build`, `/inbox`), save screenshots to `.agents/media/`, and flush queued agent alerts. |
| **Telegram Bot (CLI)** | `scripts/telegram_bot.py` | **2-Way** (Send, Queue & Ask) | Autonomous push alerts, zero-permission outbox queueing (`--queue`), interactive questions (`--ask`), and inbox inspection. |
| **Email (Gmail)** | `scripts/notify.py` | **1-Way** (HTML Reports) | Formal build summaries, multi-line diff reports, test run digests. |

Credentials are automatically loaded from `.env.local` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`).

---

## 3. Autonomous Daemon Architecture & Service Management

The Telegram bot runs 24/7 as a systemd user service (`deliveree-telegram.service`), surviving reboots, terminal closes, and sandbox isolation.

### Service Commands:
```bash
# Check status
systemctl --user status deliveree-telegram.service

# View live logs
journalctl --user -u deliveree-telegram.service -f

# Restart daemon
systemctl --user restart deliveree-telegram.service
```

---

## 4. Telegram Bridge Playbook

The Telegram bridge connects to `@sahar_deliveree_bot`.

### A. Autonomous Zero-Permission Outbound Notification (Recommended)
Use when informing the user of task status from within the sandboxed agent without requiring network tool approvals:
```bash
python3 scripts/telegram_bot.py --queue "🚀 <b>Stage 5 Passed:</b> All test cases passed and production build is green!"
```
*Writes to `.agents/tg_outbox.jsonl` — the background daemon flushes and sends it via Telegram within <0.5s.*

### B. Direct API Push Notification (Requires Network)
```bash
python3 scripts/telegram_bot.py --send "🚀 <b>Build Passed:</b> Deployed successfully to staging."
```

### C. Ask an Interactive Question with Buttons (2-Way)
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

### D. Check Incoming User Instructions & Feedback
```bash
python3 scripts/telegram_bot.py --inbox
```
*Or view `.agents/inbox.jsonl` directly.*

---

## 5. Supported Telegram User Commands

When the user chats with `@sahar_deliveree_bot` on Telegram, the daemon responds directly:
* `/status` — Executes `npm run lint` and checks workspace health.
* `/test` — Executes `npm test` and returns summarized test pass/fail results.
* `/build` — Runs `npm run build` production check.
* `/inbox` — Displays the last 5 messages queued in the agent context.
* `/ping` — Verifies daemon connectivity and bot latency.
* `/help` — Lists all available bot commands.
* **Any plain text message or screenshot** — Logged into `.agents/inbox.jsonl` (and `.agents/media/` for photos) and immediately acknowledged to the user.

---

## 6. Email Reports Playbook

Use `scripts/notify.py` to dispatch formatted HTML emails with status tags:

```bash
# Success Alert
python3 scripts/notify.py -s "Build Passed" -m "All test suites and linters verified clean." --status SUCCESS

# Warning / Action Required
python3 scripts/notify.py -s "Security Gate Alert" -m "Security vulnerability detected. Remediation required." --status ERROR
```

Supported statuses: `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `ACTION_REQUIRED`.

---

## 7. Security & Isolation Rules

1. **Zero Secret Leakage**: Never hardcode tokens or chat IDs in source code, scripts, or commit history.
2. **Autonomous Sandbox Safety**: Use `--queue` from subagents so network permissions are never requested.
3. **Whitelist Authorization**: The Telegram bridge only processes inputs from the paired `TELEGRAM_CHAT_ID`, preventing unauthorized remote triggers.
4. **HTML Entity Fallback**: `scripts/telegram_bridge.py` automatically falls back to plain text if HTML tags or entities fail validation.

---

## 8. Idle Timeout & Attention-Ping Policy

1. **Away from Laptop / Unresponsive Flow**: When the user is away from their laptop or does not respond within a reasonable interval:
   * The agent MUST dispatch a Telegram notification or interactive question with clickable buttons (`python3 scripts/telegram_bot.py --ask "..." --options "..."`).
   * This immediately pushes a phone notification to the user, allowing one-tap approvals or custom text feedback from mobile.
2. **Priority Pings**: Always prioritize Telegram pings for gate sign-offs, deployment confirmations, or blocking ambiguity.

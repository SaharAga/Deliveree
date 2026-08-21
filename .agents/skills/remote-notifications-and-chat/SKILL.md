---
name: remote-notifications-and-chat
description: Asynchronous remote alerting via Telegram bot bridge and email reports. Use when long-running jobs finish, when an interactive user approval is required, or when the user explicitly requests remote updates. Do NOT use for standard within-IDE agent-to-agent message passing.
inputs:
  - Alert message or interactive prompt
  - Notification urgency / channel selection
outputs:
  - Queued outbox entry or recorded user response
---

# Remote Notifications & Telegram Bridge

This skill defines protocols for notifying and querying the user remotely via Telegram and Email.

---

## 1. Quick Playbook

### A. Zero-Permission Outbox Alert (Recommended for Sandboxed Agents)
Writes an alert to `.agents/tg_outbox.jsonl` — the background daemon pushes it to Telegram immediately:
```bash
python3 scripts/telegram_bot.py --queue "🚀 <b>Stage Completed:</b> All checks passed!"
```

### B. Interactive Question with Clickable Buttons (2-Way Approval)
Sends a prompt to the user's mobile device and blocks until a button is pressed or reply received:
```bash
python3 scripts/telegram_bot.py \
  --ask "Gate Sign-Off: Ready to proceed?" \
  --options "Approve ✅,Reject ❌" \
  --timeout 180
```
*Captures output in format `USER_RESPONSE:<selected_option>`.*

### C. Check Queued Incoming Messages
```bash
python3 scripts/telegram_bot.py --inbox
```
*(Or inspect `.agents/inbox.jsonl` directly)*

*(For daemon systemd service management and email reports, see `references/remote_notifications_guide.md`)*

# Remote Notifications & Telegram Daemon Reference

---

## 1. Telegram Background Daemon

The Telegram bot runs as a systemd user service (`deliveree-telegram.service`):
```bash
# Check service status
systemctl --user status deliveree-telegram.service

# View live stream logs
journalctl --user -u deliveree-telegram.service -f

# Restart daemon
systemctl --user restart deliveree-telegram.service
```

---

## 2. Supported Telegram User Commands

When the user interacts with `@sahar_deliveree_bot`:
- `/status` — Checks workspace health (`npm run lint`).
- `/test` — Runs unit tests (`npm test`).
- `/build` — Runs production build (`npm run build`).
- `/inbox` — Shows recent messages queued for the agent.
- `/ping` — Checks daemon connectivity.

---

## 3. Gmail SMTP Reports (`scripts/notify.py`)

```bash
python3 scripts/notify.py -s "Build Succeeded" -m "All tests passed." --status SUCCESS
```
Supported statuses: `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `ACTION_REQUIRED`.

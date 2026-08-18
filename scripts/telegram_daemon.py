#!/usr/bin/env python3
"""
Deliveree Telegram Daemon — SOLE owner of getUpdates polling.

File-based IPC for agent interaction:
  .agents/tg_ask.json   — agent writes a question here to ask the user
  .agents/tg_answer.txt — daemon writes user's response here
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from telegram_bridge import TelegramSender, get_config


AGENTS_DIR_NAME = ".agents"
ASK_FILE_NAME   = "tg_ask.json"
ANS_FILE_NAME   = "tg_answer.txt"
INBOX_FILE_NAME = "inbox.jsonl"


def log_inbox(root_dir: Path, sender: str, text: str):
    inbox = root_dir / AGENTS_DIR_NAME / INBOX_FILE_NAME
    inbox.parent.mkdir(parents=True, exist_ok=True)
    entry = {"timestamp": datetime.now(timezone.utc).isoformat(), "sender": sender, "channel": "telegram", "message": text}
    with open(inbox, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def handle_command(text: str, root_dir: Path) -> str:
    """Instant bot commands — return response string or None for plain messages."""
    lower = text.strip().lower()
    node_path = f"/home/sahar/.local/nodejs/bin:{os.environ.get('PATH', '')}"
    env = {**os.environ, "PATH": node_path}

    if lower in ["/status", "status", "health"]:
        try:
            r = subprocess.run(["npm", "run", "lint"], cwd=str(root_dir), capture_output=True, text=True, timeout=30, env=env)
            emoji = "✅" if r.returncode == 0 else "⚠️"
            return f"{emoji} <b>Linter:</b>\n<code>{(r.stdout or r.stderr).strip()}</code>"
        except Exception as e:
            return f"❌ {e}"

    if lower in ["/test", "test", "run tests"]:
        try:
            r = subprocess.run(["npm", "test"], cwd=str(root_dir), capture_output=True, text=True, timeout=60, env=env)
            emoji = "✅" if r.returncode == 0 else "❌"
            summary = "\n".join(l for l in r.stdout.splitlines() if any(w in l for w in ["Tests", "passed", "failed", "Duration"]))
            return f"{emoji} <b>Tests:</b>\n<code>{summary or r.stdout[-400:]}</code>"
        except Exception as e:
            return f"❌ {e}"

    if lower in ["/build", "build"]:
        try:
            r = subprocess.run(["npm", "run", "build"], cwd=str(root_dir), capture_output=True, text=True, timeout=90, env=env)
            emoji = "✅" if r.returncode == 0 else "❌"
            return f"{emoji} <b>Build:</b>\n<code>{(r.stdout or r.stderr).strip()[-400:]}</code>"
        except Exception as e:
            return f"❌ {e}"

    if lower in ["/help", "help"]:
        return (
            "🤖 <b>Deliveree Bot Commands:</b>\n\n"
            "• <code>/status</code> — Lint check\n"
            "• <code>/test</code>   — Run unit tests\n"
            "• <code>/build</code>  — Production build\n"
            "• <code>/help</code>   — This menu\n"
            "• Any text or photo → logged to agent inbox"
        )

    return None


def check_pending_ask(root_dir: Path, sender: TelegramSender) -> dict | None:
    """If agent left a question file, send it and remove the file. Returns spec dict or None."""
    ask_file = root_dir / AGENTS_DIR_NAME / ASK_FILE_NAME
    if not ask_file.is_file():
        return None
    try:
        spec = json.loads(ask_file.read_text(encoding="utf-8"))
        ask_file.unlink()
        return spec
    except Exception:
        return None


def run_daemon():
    config   = get_config()
    token    = config["bot_token"]
    chat_id  = config["chat_id"]
    root_dir = config["root_dir"]

    if not token or not chat_id:
        print("❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env.local", file=sys.stderr)
        sys.exit(1)

    sender  = TelegramSender(token=token, chat_id=chat_id)
    api_url = f"https://api.telegram.org/bot{token}/getUpdates"

    import urllib.request
    import urllib.error

    print(f"🚀 Telegram Daemon v2 started. Chat ID: {chat_id}")

    offset = None
    pending_ask = None
    ans_file    = root_dir / AGENTS_DIR_NAME / ANS_FILE_NAME

    while True:
        try:
            # 1. Check if agent wrote a new question to ask
            spec = check_pending_ask(root_dir, sender)
            if spec:
                pending_ask = spec
                question    = spec.get("question", "")
                options     = spec.get("options", [])
                reply_markup = None
                if options:
                    keyboard = [[{"text": o, "callback_data": o} for o in options[i:i+2]] for i in range(0, len(options), 2)]
                    reply_markup = {"inline_keyboard": keyboard}
                sender.send_message(f"❓ <b>Question from Antigravity:</b>\n\n{question}", reply_markup=reply_markup)
                print(f"📤 Sent question to user: {question[:60]}...")
                if ans_file.exists():
                    ans_file.unlink()

            # 2. Poll for updates
            payload = json.dumps({"timeout": 15, **({"offset": offset} if offset else {})}).encode()
            req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read())

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                # Handle button press
                if "callback_query" in update:
                    cb      = update["callback_query"]
                    user_id = str(cb.get("from", {}).get("id", ""))
                    if user_id == chat_id:
                        answer = cb.get("data", "")
                        sender.answer_callback(cb["id"], f"✅ {answer}")
                        sender.send_message(f"✅ <b>Received:</b> {answer}")
                        log_inbox(root_dir, "Sahar", f"[button] {answer}")
                        if pending_ask:
                            ans_file.parent.mkdir(parents=True, exist_ok=True)
                            ans_file.write_text(answer, encoding="utf-8")
                            pending_ask = None
                    continue

                # Handle message (text or photo/caption)
                msg     = update.get("message", {})
                user_id = str(msg.get("chat", {}).get("id", ""))
                text    = msg.get("text") or msg.get("caption") or ""
                name    = msg.get("from", {}).get("first_name", "User")
                
                # Check for photo attachment
                if "photo" in msg:
                    photo_file_id = msg["photo"][-1]["file_id"]
                    text = f"[Photo uploaded: file_id={photo_file_id}] {text}".strip()

                if user_id != chat_id or not text:
                    continue

                print(f"📩 [{datetime.now().strftime('%H:%M:%S')}] {name}: {text}")
                log_inbox(root_dir, name, text)

                if pending_ask:
                    sender.send_message(f"✅ <b>Received:</b> <i>\"{text}\"</i>")
                    ans_file.parent.mkdir(parents=True, exist_ok=True)
                    ans_file.write_text(text, encoding="utf-8")
                    pending_ask = None
                else:
                    reply = handle_command(text, root_dir)
                    if reply:
                        sender.send_message(reply)
                    else:
                        sender.send_message(
                            f"📥 <b>Received:</b> <i>\"{text}\"</i>\n\n"
                            f"Logged to workspace."
                        )

            time.sleep(0.2)

        except KeyboardInterrupt:
            print("\n🛑 Daemon stopped.")
            break
        except Exception as exc:
            print(f"⚠️ Polling error: {exc}", file=sys.stderr)
            time.sleep(3)


if __name__ == "__main__":
    run_daemon()

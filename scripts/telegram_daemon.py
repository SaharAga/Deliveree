#!/usr/bin/env python3
"""
Deliveree Telegram Daemon — 24/7 background bridge service.
- Multi-threaded: Instant outbound queue dispatch (<0.5s) + Instant inbound long-polling.
- Handles user commands (/status, /test, /build, /inbox, /feedback, /help, /ping).
- Logs incoming messages and media into .agents/inbox.jsonl.
- Handles agent questions (.agents/tg_ask.json -> .agents/tg_answer.txt).
- Flushes outbound queue (.agents/tg_outbox.jsonl -> Telegram).
"""

import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from telegram_bridge import TelegramSender, get_config
from ai_responder import respond_to_message


AGENTS_DIR_NAME  = ".agents"
ASK_FILE_NAME    = "tg_ask.json"
ANS_FILE_NAME    = "tg_answer.txt"
OUTBOX_FILE_NAME = "tg_outbox.jsonl"
INBOX_FILE_NAME  = "inbox.jsonl"
MEDIA_DIR_NAME   = "media"
BUFFER_FILE_NAME = "feedback_buffer.json"
BACKLOG_FILE_REL = Path(".agents") / "backlog" / "FEEDBACK_ACTION_ITEMS.md"

pending_ask_lock = threading.Lock()
pending_ask_state = {"spec": None}


def log_inbox(root_dir: Path, sender: str, text: str, extra: dict = None):
    inbox = root_dir / AGENTS_DIR_NAME / INBOX_FILE_NAME
    inbox.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sender": sender,
        "channel": "telegram",
        "message": text,
        **(extra or {})
    }
    with open(inbox, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def get_node_env() -> dict:
    node_path = f"/home/sahar/.local/nodejs/bin:/usr/local/bin:/usr/bin:/bin:{os.environ.get('PATH', '')}"
    return {**os.environ, "PATH": node_path}


def format_feedback_summary(root_dir: Path) -> str:
    """Formats a concise report of feedback items and triage status for Telegram."""
    buffer_path = root_dir / AGENTS_DIR_NAME / BUFFER_FILE_NAME
    backlog_path = root_dir / BACKLOG_FILE_REL

    items = []
    if buffer_path.is_file():
        try:
            items = json.loads(buffer_path.read_text(encoding="utf-8"))
        except Exception:
            items = []

    total_items = len(items)
    pending_items = [i for i in items if i.get("status", "pending") == "pending"]
    triaged_items = [i for i in items if i.get("status") == "triaged"]

    lines = [
        "📊 <b>Deliveree Alpha Feedback Report</b>",
        f"• <b>Total Submissions:</b> {total_items}",
        f"• <b>Pending Triage:</b> {len(pending_items)}",
        f"• <b>Triaged Action Items:</b> {len(triaged_items)}",
        ""
    ]

    if items:
        lines.append("📝 <b>Last 5 Submissions:</b>")
        last_five = items[-5:]
        for item in reversed(last_five):
            emoji = "🚨" if item.get("type") == "bug" else ("💡" if item.get("type") == "feature" else "❤️")
            status_icon = "⏳" if item.get("status", "pending") == "pending" else "✅"
            user_info = item.get("user", "Tester")
            user_str = user_info.get("name", "Tester") if isinstance(user_info, dict) else str(user_info)
            msg_snippet = item.get("message", "").replace("<", "&lt;").replace(">", "&gt;")[:75]
            rating = item.get("rating", 5)
            lines.append(f"{emoji} {status_icon} <b>[{item.get('type','bug')}]</b> ⭐{rating} <i>{user_str}</i>: {msg_snippet}")
    else:
        lines.append("ℹ️ No feedback records found in buffer.")

    if backlog_path.is_file():
        lines.append(f"\n📋 Backlog available at: <code>{BACKLOG_FILE_REL}</code>")

    return "\n".join(lines)


def handle_command(text: str, root_dir: Path) -> str | None:
    """Instant bot commands — return response string or None for plain messages."""
    trimmed = text.strip()
    cmd = trimmed.split()[0].lower() if trimmed else ""
    env = get_node_env()

    if cmd in ["/status", "status", "health"]:
        try:
            r = subprocess.run(["npm", "run", "lint"], cwd=str(root_dir), capture_output=True, text=True, timeout=35, env=env)
            emoji = "✅" if r.returncode == 0 else "⚠️"
            output = (r.stdout or r.stderr).strip()
            return f"{emoji} <b>Deliveree Health & Lint:</b>\n<code>{output[-500:] if output else 'Clean'}</code>"
        except Exception as e:
            return f"❌ Error running status check: {e}"

    if cmd in ["/test", "test"]:
        try:
            r = subprocess.run(["npm", "test"], cwd=str(root_dir), capture_output=True, text=True, timeout=60, env=env)
            emoji = "✅" if r.returncode == 0 else "❌"
            summary = "\n".join(l for l in r.stdout.splitlines() if any(w in l for w in ["Tests", "passed", "failed", "Duration", "Suites"]))
            return f"{emoji} <b>Test Results:</b>\n<code>{summary or r.stdout[-400:]}</code>"
        except Exception as e:
            return f"❌ Error running tests: {e}"

    if cmd in ["/build", "build"]:
        try:
            r = subprocess.run(["npm", "run", "build"], cwd=str(root_dir), capture_output=True, text=True, timeout=90, env=env)
            emoji = "✅" if r.returncode == 0 else "❌"
            out = (r.stdout or r.stderr).strip()
            return f"{emoji} <b>Build Status:</b>\n<code>{out[-400:] if out else 'Build succeeded'}</code>"
        except Exception as e:
            return f"❌ Error running build: {e}"

    if cmd in ["/inbox", "inbox"]:
        inbox_file = root_dir / AGENTS_DIR_NAME / INBOX_FILE_NAME
        if not inbox_file.is_file():
            return "📭 Inbox is empty."
        try:
            lines = [json.loads(l) for l in inbox_file.read_text(encoding="utf-8").splitlines() if l.strip()]
            if not lines:
                return "📭 Inbox is empty."
            recent = lines[-5:]
            items = []
            for item in recent:
                ts = item.get("timestamp", "")[:19].replace("T", " ")
                snd = item.get("sender", "User")
                msg = item.get("message", "")[:80]
                items.append(f"• <b>[{ts}] {snd}:</b> {msg}")
            return "📬 <b>Recent Agent Inbox (last 5):</b>\n\n" + "\n".join(items)
        except Exception as e:
            return f"❌ Error reading inbox: {e}"

    if cmd in ["/feedback", "feedback", "/fb"]:
        try:
            return format_feedback_summary(root_dir)
        except Exception as e:
            return f"❌ Error generating feedback summary: {e}"

    if cmd in ["/ping", "ping"]:
        return "🏓 <b>Pong!</b> Deliveree Telegram Daemon is active and connected."

    if cmd in ["/start", "/help", "help"]:
        return (
            "🤖 <b>Deliveree AI Assistant Bot</b>\n\n"
            "• <code>/feedback</code> — View latest tester feedback & triage status\n"
            "• <code>/status</code>   — Run linter & project check\n"
            "• <code>/test</code>     — Run unit test suite\n"
            "• <code>/build</code>    — Run production build verification\n"
            "• <code>/inbox</code>    — View recent messages queued for the AI agent\n"
            "• <code>/ping</code>     — Check bot daemon health\n"
            "• <code>/help</code>     — Show this guide\n\n"
            "💬 <b>Direct Agent Chat:</b> Any message or screenshot you send is immediately logged into the AI agent's active queue."
        )

    return None


def download_telegram_file(token: str, file_id: str, dest_path: Path) -> bool:
    try:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        info_url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
        req = urllib.request.Request(info_url, headers={"User-Agent": "DelivereeAgent/2.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("ok"):
            file_path = data["result"]["file_path"]
            dl_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
            urllib.request.urlretrieve(dl_url, str(dest_path))
            return True
    except Exception as e:
        print(f"⚠️ Error downloading Telegram file {file_id}: {e}", file=sys.stderr, flush=True)
    return False


def outbox_and_ask_worker(root_dir: Path, sender: TelegramSender, stop_event: threading.Event):
    """Background worker that continuously processes outbound messages and pending questions."""
    outbox_file = root_dir / AGENTS_DIR_NAME / OUTBOX_FILE_NAME
    ask_file    = root_dir / AGENTS_DIR_NAME / ASK_FILE_NAME
    ans_file    = root_dir / AGENTS_DIR_NAME / ANS_FILE_NAME

    while not stop_event.is_set():
        try:
            # 1. Flush Outbox
            if outbox_file.is_file():
                content = outbox_file.read_text(encoding="utf-8").strip()
                if content:
                    lines = [l for l in content.splitlines() if l.strip()]
                    outbox_file.write_text("", encoding="utf-8")
                    for line in lines:
                        try:
                            entry = json.loads(line)
                            text = entry.get("text", "")
                            reply_markup = entry.get("reply_markup")
                            if text:
                                sender.send_message(text, reply_markup=reply_markup)
                                print(f"📤 [Outbox] Dispatched message: {text[:60]}...", flush=True)
                        except Exception as e:
                            print(f"⚠️ Error sending outbox entry: {e}", file=sys.stderr, flush=True)

            # 2. Check Pending Question from Agent
            if ask_file.is_file():
                try:
                    spec = json.loads(ask_file.read_text(encoding="utf-8"))
                    ask_file.unlink()
                    with pending_ask_lock:
                        pending_ask_state["spec"] = spec
                    question = spec.get("question", "")
                    options  = spec.get("options", [])
                    reply_markup = None
                    if options:
                        keyboard = [[{"text": o, "callback_data": o} for o in options[i:i+2]] for i in range(0, len(options), 2)]
                        reply_markup = {"inline_keyboard": keyboard}
                    sender.send_message(f"❓ <b>Question from Antigravity:</b>\n\n{question}", reply_markup=reply_markup)
                    print(f"📤 Sent interactive question to user: {question[:60]}...", flush=True)
                    if ans_file.exists():
                        ans_file.unlink()
                except Exception as e:
                    print(f"⚠️ Error processing ask file: {e}", file=sys.stderr, flush=True)

        except Exception as e:
            print(f"⚠️ Outbox worker exception: {e}", file=sys.stderr, flush=True)

        time.sleep(0.5)


def run_daemon():
    config   = get_config()
    token    = config["bot_token"]
    chat_id  = config["chat_id"]
    root_dir = config["root_dir"]

    if not token or not chat_id:
        print("❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env.local", file=sys.stderr, flush=True)
        sys.exit(1)

    sender  = TelegramSender(token=token, chat_id=chat_id)
    api_url = f"https://api.telegram.org/bot{token}/getUpdates"

    print(f"🚀 Deliveree Telegram Daemon started (threaded). Bound to Chat ID: {chat_id}", flush=True)

    stop_event = threading.Event()
    worker_thread = threading.Thread(
        target=outbox_and_ask_worker,
        args=(root_dir, sender, stop_event),
        daemon=True,
        name="OutboxWorker"
    )
    worker_thread.start()

    offset = None
    ans_file = root_dir / AGENTS_DIR_NAME / ANS_FILE_NAME

    while True:
        try:
            # Poll for Telegram updates (long polling)
            payload = json.dumps({"timeout": 15, **({"offset": offset} if offset else {})}).encode()
            req = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "DelivereeAgent/2.0"})
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                # Handle button click (callback_query)
                if "callback_query" in update:
                    cb      = update["callback_query"]
                    user_id = str(cb.get("from", {}).get("id", ""))
                    if user_id == chat_id:
                        answer = cb.get("data", "")
                        sender.answer_callback(cb["id"], f"Selected: {answer}")
                        sender.send_message(f"✅ <b>Recorded option:</b> <i>{answer}</i>")
                        log_inbox(root_dir, "Sahar", f"[button] {answer}", {"type": "button_selection"})
                        with pending_ask_lock:
                            if pending_ask_state["spec"]:
                                ans_file.parent.mkdir(parents=True, exist_ok=True)
                                ans_file.write_text(answer, encoding="utf-8")
                                pending_ask_state["spec"] = None
                    continue

                # Handle incoming message
                msg     = update.get("message", {})
                user_id = str(msg.get("chat", {}).get("id", ""))
                text    = msg.get("text") or msg.get("caption") or ""
                name    = msg.get("from", {}).get("first_name", "User")
                msg_id  = msg.get("message_id")
                
                # Check for photo / document attachment
                media_meta = {}
                if "photo" in msg:
                    photo_file_id = msg["photo"][-1]["file_id"]
                    media_path = root_dir / AGENTS_DIR_NAME / MEDIA_DIR_NAME / f"photo_{int(time.time())}.jpg"
                    if download_telegram_file(token, photo_file_id, media_path):
                        media_meta = {"media_type": "photo", "local_file": str(media_path.relative_to(root_dir))}
                        text = f"[Photo uploaded: {media_path.name}] {text}".strip()
                    else:
                        text = f"[Photo: {photo_file_id}] {text}".strip()

                if "document" in msg:
                    doc = msg["document"]
                    doc_id = doc["file_id"]
                    doc_name = doc.get("file_name", f"doc_{int(time.time())}")
                    media_path = root_dir / AGENTS_DIR_NAME / MEDIA_DIR_NAME / doc_name
                    if download_telegram_file(token, doc_id, media_path):
                        media_meta = {"media_type": "document", "local_file": str(media_path.relative_to(root_dir))}
                        text = f"[Document uploaded: {doc_name}] {text}".strip()

                if user_id != chat_id or not text:
                    continue

                print(f"📩 [{datetime.now().strftime('%H:%M:%S')}] {name}: {text}", flush=True)
                log_inbox(root_dir, name, text, {"message_id": msg_id, **media_meta})

                # Check if this is an answer to a pending question
                is_pending = False
                with pending_ask_lock:
                    if pending_ask_state["spec"]:
                        is_pending = True
                        pending_ask_state["spec"] = None

                if is_pending:
                    sender.send_message(f"✅ <b>Received answer:</b> <i>\"{text}\"</i>")
                    ans_file.parent.mkdir(parents=True, exist_ok=True)
                    ans_file.write_text(text, encoding="utf-8")
                else:
                    # Check if command
                    reply = handle_command(text, root_dir)
                    if reply:
                        sender.send_message(reply)
                    else:
                        # Autonomous AI conversational bridge response (run async in worker thread)
                        def generate_and_send_ai_reply(user_query: str, user_name: str, media_loc: str | None):
                            try:
                                ai_reply = respond_to_message(user_query, user_name=user_name, media_path=media_loc, root_dir=root_dir)
                                if ai_reply:
                                    sender.send_message(ai_reply)
                                    print(f"🤖 [AI Responder] Replied to {user_name}: {ai_reply[:60]}...", flush=True)
                            except Exception as e:
                                print(f"⚠️ Error generating AI reply: {e}", file=sys.stderr, flush=True)

                        attached_media = media_meta.get("local_file")
                        threading.Thread(
                            target=generate_and_send_ai_reply,
                            args=(text, name, attached_media),
                            daemon=True
                        ).start()

            time.sleep(0.1)

        except KeyboardInterrupt:
            print("\n🛑 Deliveree Telegram Daemon stopping...", flush=True)
            stop_event.set()
            break
        except Exception as exc:
            print(f"⚠️ Polling error: {exc}", file=sys.stderr, flush=True)
            time.sleep(3)


if __name__ == "__main__":
    run_daemon()

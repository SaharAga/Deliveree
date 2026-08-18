#!/usr/bin/env python3
"""
Deliveree Telegram CLI — send-only + IPC ask (no polling).
The daemon (telegram_daemon.py) is the sole poller.
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from telegram_bridge import TelegramSender, get_config


def ask_via_daemon(root_dir: Path, question: str, options: list[str], timeout_s: int) -> str:
    """Write question spec for daemon, wait for daemon to write answer."""
    agents_dir = root_dir / ".agents"
    agents_dir.mkdir(parents=True, exist_ok=True)
    ask_file = agents_dir / "tg_ask.json"
    ans_file = agents_dir / "tg_answer.txt"

    # Remove stale answer
    if ans_file.exists():
        ans_file.unlink()

    # Write spec for daemon to pick up
    ask_file.write_text(
        json.dumps({"question": question, "options": options}),
        encoding="utf-8"
    )
    print(f"📤 Question posted for daemon. Waiting up to {timeout_s}s for response...")

    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if ans_file.is_file():
            answer = ans_file.read_text(encoding="utf-8").strip()
            ans_file.unlink()
            return answer
        time.sleep(0.5)

    # Timed out — clean up
    if ask_file.exists():
        ask_file.unlink()
    print("⌛ Timed out waiting for response.", file=sys.stderr)
    return ""


def main():
    parser = argparse.ArgumentParser(description="Deliveree Telegram CLI")
    parser.add_argument("--send",    "-s",  help="Send a message")
    parser.add_argument("--photo",   "-p",  help="Send a photo")
    parser.add_argument("--caption", "-c",  help="Caption for photo")
    parser.add_argument("--ask",     "-a",  help="Ask a question (daemon picks up, polls for reply)")
    parser.add_argument("--options", "-o",  help="Comma-separated button options")
    parser.add_argument("--timeout",        type=int, default=300, help="Timeout seconds for --ask")
    parser.add_argument("--test",           action="store_true", help="Send a test message")
    parser.add_argument("--pair",           action="store_true", help="Pair bot (one-time setup)")
    args = parser.parse_args()

    config    = get_config()
    token     = config["bot_token"]
    chat_id   = config["chat_id"]
    root_dir  = config["root_dir"]

    if not token:
        print("❌ Missing TELEGRAM_BOT_TOKEN in .env.local", file=sys.stderr)
        sys.exit(1)

    sender = TelegramSender(token=token, chat_id=chat_id)

    if args.pair:
        import urllib.request
        res = json.loads(urllib.request.urlopen(
            f"https://api.telegram.org/bot{token}/getMe"
        ).read())
        if res.get("ok"):
            bot = res["result"]
            print(f"✅ Bot: @{bot['username']} — send /start to it, then set TELEGRAM_CHAT_ID manually.")
        else:
            print("❌ Invalid token")
            sys.exit(1)
        sys.exit(0)

    if not chat_id:
        print("❌ Missing TELEGRAM_CHAT_ID in .env.local. Run --pair first.", file=sys.stderr)
        sys.exit(1)

    if args.test:
        ok = sender.send_message("🎉 <b>Deliveree Telegram Bridge v2 — send-only test OK!</b>")
        sys.exit(0 if ok else 1)

    if args.photo:
        ok = sender.send_photo(args.photo, caption=args.caption)
        sys.exit(0 if ok else 1)

    if args.send:
        ok = sender.send_message(args.send)
        sys.exit(0 if ok else 1)

    if args.ask:
        options = [o.strip() for o in args.options.split(",")] if args.options else []
        answer  = ask_via_daemon(root_dir, args.ask, options, args.timeout)
        if answer:
            print(f"USER_RESPONSE:{answer}")
            sys.exit(0)
        sys.exit(1)

    parser.print_help()


if __name__ == "__main__":
    main()

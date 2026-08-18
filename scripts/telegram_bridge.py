#!/usr/bin/env python3
"""
Deliveree Telegram Bridge — Shared utilities only (no polling).
Provides send_message and send_photo via Telegram Bot API.
Used by both the daemon and one-shot CLI calls.
"""

import json
import os
import time
import urllib.request
import urllib.error
from pathlib import Path


def load_env_file(filepath: Path) -> dict:
    env_vars = {}
    if not filepath.is_file():
        return env_vars
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip().strip("\"'")
    return env_vars


def get_config():
    root_dir = Path(__file__).resolve().parent.parent
    env_local = load_env_file(root_dir / ".env.local")
    env_main  = load_env_file(root_dir / ".env")
    merged = {**env_main, **env_local, **os.environ}
    return {
        "bot_token": merged.get("TELEGRAM_BOT_TOKEN", "").strip(),
        "chat_id":   merged.get("TELEGRAM_CHAT_ID", "").strip(),
        "root_dir":  root_dir,
    }


class TelegramSender:
    """Stateless sender — only POST requests, never polls getUpdates."""

    def __init__(self, token: str, chat_id: str = ""):
        self.token   = token
        self.chat_id = chat_id
        self.base    = f"https://api.telegram.org/bot{token}"

    def _post(self, endpoint: str, data: dict = None, timeout: int = 30):
        url  = f"{self.base}/{endpoint}"
        body = json.dumps(data or {}).encode("utf-8")
        req  = urllib.request.Request(
            url, data=body,
            headers={"Content-Type": "application/json", "User-Agent": "DelivereeAgent/2.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err = json.loads(e.read().decode("utf-8", errors="ignore")).get("description", str(e))
            print(f"❌ Telegram API Error ({e.code}): {err}")
            return None
        except Exception as exc:
            print(f"❌ Request error: {exc}")
            return None

    def send_message(self, text: str, reply_markup: dict = None, chat_id: str = None) -> bool:
        payload = {
            "chat_id":    chat_id or self.chat_id,
            "text":       text,
            "parse_mode": "HTML",
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        res = self._post("sendMessage", payload)
        return bool(res and res.get("ok"))

    def send_photo(self, photo_path: str, caption: str = None, chat_id: str = None) -> bool:
        path = Path(photo_path)
        if not path.is_file():
            print(f"❌ Photo not found: {photo_path}")
            return False
        target_chat = chat_id or self.chat_id
        boundary = f"----Boundary{int(time.time()*1000)}"
        body = bytearray()

        def field(name, value):
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())

        field("chat_id", target_chat)
        if caption:
            field("caption", caption)
            field("parse_mode", "HTML")
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"{path.name}\"\r\nContent-Type: image/png\r\n\r\n".encode())
        body.extend(path.read_bytes())
        body.extend(f"\r\n--{boundary}--\r\n".encode())
        req = urllib.request.Request(
            f"{self.base}/sendPhoto", data=bytes(body),
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "User-Agent": "DelivereeAgent/2.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                res = json.loads(resp.read())
                return bool(res and res.get("ok"))
        except Exception as exc:
            print(f"❌ Photo upload error: {exc}")
            return False

    def answer_callback(self, cb_id: str, text: str = ""):
        self._post("answerCallbackQuery", {"callback_query_id": cb_id, "text": text})

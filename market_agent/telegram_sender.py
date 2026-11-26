"""
Telegram Dispatcher
Sends formatted briefings directly to the user's Telegram chat.
Handles markdown parsing, automatic chunking for long messages, and fallback safety.
"""

import json
import urllib.request
import urllib.error

TELEGRAM_MAX_LENGTH = 4000

def split_message(text: str, max_len: int = TELEGRAM_MAX_LENGTH) -> list:
    """Splits a long message at newline boundaries to avoid Telegram's 4096 char limit."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    lines = text.split("\n")
    current_chunk = []
    current_length = 0

    for line in lines:
        if current_length + len(line) + 1 > max_len:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_length = len(line) + 1
        else:
            current_chunk.append(line)
            current_length += len(line) + 1

    if current_chunk:
        chunks.append("\n".join(current_chunk))
    return chunks

def send_telegram_message(bot_token: str, chat_id: str, text: str) -> bool:
    """Sends a message to the specified Telegram chat."""
    if not bot_token or not chat_id:
        print("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    chunks = split_message(text)
    all_success = True

    for chunk in chunks:
        payload = {
            "chat_id": chat_id,
            "text": chunk,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                if not res_data.get("ok"):
                    all_success = False
                    print(f"[Telegram] API returned error: {res_data}")
        except urllib.error.HTTPError as e:
            # If markdown parsing fails due to unescaped special chars, retry without markdown
            err_body = e.read().decode("utf-8")
            if "can't parse entities" in err_body:
                print("[Telegram] Markdown parsing issue, retrying in plain text...")
                payload.pop("parse_mode", None)
                retry_req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                try:
                    with urllib.request.urlopen(retry_req, timeout=10) as retry_resp:
                        pass
                except Exception as retry_err:
                    print(f"[Telegram] Plain text fallback error: {retry_err}")
                    all_success = False
            else:
                print(f"[Telegram] HTTP Error {e.code}: {err_body}")
                all_success = False
        except Exception as e:
            print(f"[Telegram] Network/Connection error: {e}")
            all_success = False

    return all_success

def test_telegram_connection(bot_token: str, chat_id: str) -> bool:
    """Sends a quick test ping to confirm setup."""
    test_msg = "🤖 *Market & Tech Agent Initialized!*\n\nYour automated pulse agent is successfully connected to Telegram. You will receive updates every 4 hours."
    return send_telegram_message(bot_token, chat_id, test_msg)


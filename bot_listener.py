"""
Telegram Interactive & Automated News Bot
Automatically pushes fresh market & tech news without user doing anything.
Also responds to instant commands if requested.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
from datetime import datetime

# Local imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config
from agent import load_dotenv, run_pipeline
from telegram_sender import send_telegram_message

def get_telegram_updates(bot_token: str, offset: int, timeout: int = 20) -> tuple:
    """Long-polls Telegram for incoming user commands."""
    url = f"https://api.telegram.org/bot{bot_token}/getUpdates?offset={offset}&timeout={timeout}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout + 5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                updates = data.get("result", [])
                max_update_id = offset
                for u in updates:
                    uid = u.get("update_id", 0)
                    if uid >= max_update_id:
                        max_update_id = uid + 1
                return updates, max_update_id
    except urllib.error.URLError:
        pass
    except Exception as e:
        print(f"[Listener] Long poll notice: {e}")
    return [], offset

def start_interactive_listener():
    load_dotenv()
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or config.TELEGRAM_BOT_TOKEN
    chat_id = os.getenv("TELEGRAM_CHAT_ID") or config.TELEGRAM_CHAT_ID

    if not bot_token or not chat_id:
        print("❌ Cannot start listener: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.")
        return

    interval_minutes = getattr(config, "SCHEDULE_INTERVAL_MINUTES", 60)
    interval_seconds = interval_minutes * 60

    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🤖 MarketPulse Auto-News Bot is LIVE!")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ⏱️ Auto-News Cadence: Every {interval_minutes} minutes without doing anything.")

    # 1. Fire an immediate automated update right away on launch!
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🚀 Dispatching first automated market & tech briefing...")
    try:
        run_pipeline(dry_run=False)
    except Exception as e:
        print(f"[Initial Dispatch Error] {e}")

    offset = 0
    # Clean up old backlog updates
    updates, next_offset = get_telegram_updates(bot_token, offset, timeout=1)
    if updates:
        offset = next_offset

    last_scheduled_run = time.time()

    while True:
        try:
            # 1. Listen for user messages (long poll 20s)
            updates, offset = get_telegram_updates(bot_token, offset, timeout=20)

            for u in updates:
                msg = u.get("message", {}) or u.get("edited_message", {})
                from_chat_id = str(msg.get("chat", {}).get("id", ""))
                text = msg.get("text", "").strip()

                if from_chat_id == str(chat_id) and text:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] 📩 Received user message: '{text}'. Triggering instant pulse...")
                    send_telegram_message(
                        bot_token,
                        chat_id,
                        "⚡ _Analyzing live markets & fetching latest news right now..._"
                    )
                    run_pipeline(dry_run=False)
                    last_scheduled_run = time.time()

            # 2. Automated periodic broadcast (hands-free!)
            current_time = time.time()
            if current_time - last_scheduled_run >= interval_seconds:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⏰ Auto-dispatching scheduled {interval_minutes}-minute pulse...")
                run_pipeline(dry_run=False)
                last_scheduled_run = current_time

        except KeyboardInterrupt:
            print("\nStopping bot listener.")
            break
        except Exception as e:
            print(f"[Listener Exception] {e}")
            time.sleep(3)

if __name__ == "__main__":
    start_interactive_listener()

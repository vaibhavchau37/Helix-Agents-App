#!/usr/bin/env python3
"""
Telegram Chat ID Auto-Detector
Queries Telegram getUpdates to automatically find your Chat ID
after you send /start or a message to your bot.
"""

import os
import sys
import json
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from agent import load_dotenv

def get_chat_id():
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("❌ Error: TELEGRAM_BOT_TOKEN is not set in .env")
        return

    url = f"https://api.telegram.org/bot{token}/getUpdates"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data.get("ok"):
                print(f"❌ Telegram API error: {data}")
                return

            results = data.get("result", [])
            if not results:
                print("⚠️ No messages found yet!")
                print("👉 Please open your bot in Telegram and tap 'Start' or send a message like 'hello'.")
                print("Then run this script again!")
                return

            # Grab latest message
            latest_msg = results[-1].get("message", {}) or results[-1].get("channel_post", {})
            chat = latest_msg.get("chat", {})
            sender = latest_msg.get("from", {})

            chat_id = chat.get("id")
            first_name = sender.get("first_name", "User")
            username = sender.get("username", "")

            if chat_id:
                print(f"\n✅ Found Chat ID: {chat_id} (for {first_name} @{username})")
                
                # Update .env automatically
                env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
                lines = []
                chat_id_set = False
                if os.path.exists(env_path):
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.startswith("TELEGRAM_CHAT_ID="):
                                lines.append(f"TELEGRAM_CHAT_ID={chat_id}\n")
                                chat_id_set = True
                            else:
                                lines.append(line)
                if not chat_id_set:
                    lines.append(f"TELEGRAM_CHAT_ID={chat_id}\n")

                with open(env_path, "w", encoding="utf-8") as f:
                    f.writelines(lines)

                print(f"💾 Updated {env_path} with TELEGRAM_CHAT_ID={chat_id}")
                print("\n🎉 Setup complete! You can now run:")
                print("   python3 agent.py --test-telegram")
                print("   python3 agent.py --once\n")

    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    get_chat_id()


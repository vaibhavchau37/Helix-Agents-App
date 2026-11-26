#!/usr/bin/env python3
"""
Personal Market & Tech Pulse Agent
Main CLI and Execution Daemon.
"""

import os
import sys
import time
import argparse
from datetime import datetime

# Local directory imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from fetchers.market_data import fetch_all_market_data
from fetchers.news_feed import fetch_all_news
from summarizer import generate_briefing
from telegram_sender import send_telegram_message, test_telegram_connection

def load_dotenv():
    """Lightweight .env file parser so zero third-party packages are required."""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    val = val.strip().strip("'").strip('"')
                    os.environ.setdefault(key.strip(), val)

def run_pipeline(dry_run: bool = False) -> str:
    """Executes a single cycle of the market & tech pulse agent."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🔍 Fetching financial market data...")
    market_data = fetch_all_market_data(config.MARKET_SYMBOLS)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 📰 Fetching tech tools & world news...")
    news_data = fetch_all_news(config.RSS_FEEDS, hn_limit=config.HN_TOP_STORIES_COUNT)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🧠 Generating intelligence briefing...")
    gemini_key = os.getenv("GEMINI_API_KEY") or config.GEMINI_API_KEY
    briefing = generate_briefing(market_data, news_data, gemini_api_key=gemini_key)

    if dry_run:
        print("\n" + "="*50)
        print("DRY RUN BRIEFING PREVIEW:")
        print("="*50)
        print(briefing)
        print("="*50 + "\n")
        return briefing

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or config.TELEGRAM_BOT_TOKEN
    chat_id = os.getenv("TELEGRAM_CHAT_ID") or config.TELEGRAM_CHAT_ID

    if not bot_token or not chat_id:
        print("\n[WARNING] Telegram credentials not configured!")
        print("Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env or environment.")
        print("Here is the generated briefing preview:\n")
        print(briefing)
        return briefing

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 📤 Dispatching to Telegram chat {chat_id}...")
    success = send_telegram_message(bot_token, chat_id, briefing)
    if success:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ Briefing delivered successfully to Telegram!")
    else:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ Failed to dispatch to Telegram. Check credentials.")

    return briefing

def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Personal Market & Tech Pulse Agent")
    parser.add_argument("--test", action="store_true", help="Perform a dry run and print briefing locally without sending to Telegram")
    parser.add_argument("--test-telegram", action="store_true", help="Send a test ping message to your Telegram chat to verify setup")
    parser.add_argument("--once", action="store_true", help="Fetch data and send briefing to Telegram once, then exit")
    parser.add_argument("--daemon", action="store_true", help="Run continuously in the background")
    parser.add_argument("--interval", type=int, default=getattr(config, "SCHEDULE_INTERVAL_MINUTES", 60), help="Interval in minutes for daemon mode (default: 60)")

    args = parser.parse_args()

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or config.TELEGRAM_BOT_TOKEN
    chat_id = os.getenv("TELEGRAM_CHAT_ID") or config.TELEGRAM_CHAT_ID

    if args.test_telegram:
        print(f"Verifying Telegram credentials for Chat ID: {chat_id}...")
        if test_telegram_connection(bot_token, chat_id):
            print("✅ Telegram connection verified! Test ping sent.")
        else:
            print("❌ Telegram connection failed. Check your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.")
        return

    if args.test:
        run_pipeline(dry_run=True)
        return

    if args.once or not args.daemon:
        # Default behavior if run without arguments: run once
        run_pipeline(dry_run=False)
        return

    # Daemon mode: runs every X minutes
    interval_seconds = args.interval * 60
    print(f"🚀 Market & Tech Pulse Agent started in background daemon mode.")
    print(f"⏱️ Update cycle: Every {args.interval} minutes ({interval_seconds}s). Press Ctrl+C to stop.")

    while True:
        try:
            run_pipeline(dry_run=False)
        except Exception as e:
            print(f"[Error in execution loop] {e}")

        print(f"Sleeping for {args.interval} minutes until next pulse...")
        time.sleep(interval_seconds)

if __name__ == "__main__":
    main()


# Configuration for Personal Market & Tech Pulse Agent
import os

# Telegram Settings
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Optional Gemini API Key for smart AI distillation
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Automatic news broadcast interval in minutes (e.g. 60 = every 1 hour)
# Set to 30 for every 30 minutes, 60 for every 1 hour, etc.
SCHEDULE_INTERVAL_MINUTES = int(os.getenv("SCHEDULE_INTERVAL_MINUTES", "60"))

# Assets & Symbols to track via Yahoo Finance
MARKET_SYMBOLS = {
    # US & Global Major Indices
    "S&P 500": "^GSPC",
    "Nasdaq 100": "^IXIC",
    "Dow Jones": "^DJI",
    "India Nifty 50": "^NSEI",
    
    # Key Tech Giants (Mag 7 / Tech Leaders)
    "Nvidia": "NVDA",
    "Apple": "AAPL",
    "Microsoft": "MSFT",
    "Google": "GOOGL",
    "Tesla": "TSLA",
    
    # Crypto
    "Bitcoin": "BTC-USD",
    "Ethereum": "ETH-USD",
    
    # Commodities & Macro Indicators
    "Gold": "GC=F",
    "Crude Oil (WTI)": "CL=F",
    "US 10Y Yield": "^TNX",
    "US Dollar Index": "DX-Y.NYB",
}

# RSS Feeds for Tech, Tools, and Global Macro
RSS_FEEDS = {
    "tech": [
        ("TechCrunch", "https://techcrunch.com/feed/"),
        ("The Verge", "https://www.theverge.com/rss/index.xml"),
        ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
    ],
    "macro_world": [
        ("Google News Business", "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en"),
        ("Google News Markets", "https://news.google.com/rss/search?q=stock+market+economy&hl=en-US&gl=US&ceid=US:en"),
        ("MarketWatch", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    ]
}

# Hacker News top stories count
HN_TOP_STORIES_COUNT = 6

"""
Briefing Summarizer
Produces a clean, easy-to-understand executive briefing.
Breaks down complex market jargon into clear, bite-sized sections:
1. Markets at a Glance (with easy color status)
2. Tech & Tools Radar (What happened & Why it matters)
3. World & Macro Drivers
4. 1-Sentence Bottom Line
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

def clean_text(text: str) -> str:
    """Removes problematic markdown characters and trims string."""
    if not text:
        return ""
    return text.replace("*", "").replace("_", "").replace("`", "").strip()

def format_native_briefing(market_data: dict, news_data: dict) -> str:
    """Beautiful, easy-to-digest layout designed for fast reading on mobile."""
    now_str = datetime.now().strftime("%b %d, %Y • %I:%M %p")
    lines = []

    lines.append("🌐 *MARKET & TECH PULSE*")
    lines.append(f"🕒 _{now_str}_\n")

    # 1. Markets Section
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append("📊 *MARKETS AT A GLANCE*")

    indices = [
        ("S&P 500", "US Broad Market"),
        ("Nasdaq 100", "US Tech Index"),
        ("Dow Jones", "US Blue Chips"),
        ("India Nifty 50", "Indian Market")
    ]

    for name, desc in indices:
        info = market_data.get(name, {})
        if info and not info.get("error"):
            price = info["price"]
            pct = info["change_pct"]
            icon = "🟢" if pct > 0.05 else ("🔴" if pct < -0.05 else "⚪")
            sign = "+" if pct > 0 else ""
            p_str = f"{price:,.1f}" if price >= 1000 else f"{price:.2f}"
            lines.append(f"{icon} *{name}*: `{p_str}` ({sign}{pct:.2f}%) • _{desc}_")

    # Tech Giants
    lines.append("\n💻 *Tech Leaders (Big Tech & AI)*")
    tech_stocks = ["Nvidia", "Apple", "Microsoft", "Google", "Tesla"]
    for name in tech_stocks:
        info = market_data.get(name, {})
        if info and not info.get("error"):
            price = info["price"]
            pct = info["change_pct"]
            icon = "🟢" if pct > 0.05 else ("🔴" if pct < -0.05 else "⚪")
            sign = "+" if pct > 0 else ""
            lines.append(f"{icon} *{name}*: `${price:.2f}` ({sign}{pct:.2f}%)")

    # Crypto & Commodities
    lines.append("\n🪙 *Crypto & Commodities*")
    assets = [
        ("Bitcoin", "BTC"),
        ("Ethereum", "ETH"),
        ("Gold", "Precious Metal"),
        ("Crude Oil (WTI)", "Energy"),
        ("US 10Y Yield", "Bond Rates")
    ]
    for name, label in assets:
        info = market_data.get(name, {})
        if info and not info.get("error"):
            price = info["price"]
            pct = info["change_pct"]
            icon = "🟢" if pct > 0.05 else ("🔴" if pct < -0.05 else "⚪")
            sign = "+" if pct > 0 else ""
            p_str = f"${price:,.0f}" if price >= 1000 else f"${price:.2f}"
            if "Yield" in name:
                p_str = f"{price:.2f}%"
            lines.append(f"{icon} *{name}*: `{p_str}` ({sign}{pct:.2f}%)")

    # 2. Tech & Tools Radar
    lines.append("\n━━━━━━━━━━━━━━━━━━━━")
    lines.append("🚀 *TECH & TOOLS RADAR*")
    lines.append("_What new tools and software breakthroughs happened:_")

    tech_items = news_data.get("tech_and_tools", [])
    if tech_items:
        for idx, item in enumerate(tech_items[:5], 1):
            title = clean_text(item.get("title", ""))
            source = item.get("source", "")
            url = item.get("url") or item.get("link") or ""
            if url:
                lines.append(f"\n{idx}️⃣ [{title}]({url})\n   ↳ _Source: {source}_")
            else:
                lines.append(f"\n{idx}️⃣ *{title}*\n   ↳ _Source: {source}_")
    else:
        lines.append("• _No new tool releases detected in this window._")

    # 3. World & Macro Drivers
    lines.append("\n━━━━━━━━━━━━━━━━━━━━")
    lines.append("🌍 *WORLD & MACRO DRIVERS*")
    lines.append("_Key economic and world headlines driving market sentiment:_")

    macro_items = news_data.get("world_macro", [])
    if macro_items:
        for idx, item in enumerate(macro_items[:4], 1):
            title = clean_text(item.get("title", ""))
            source = item.get("source", "")
            url = item.get("url") or item.get("link") or ""
            if url:
                lines.append(f"• [{title}]({url}) _({source})_")
            else:
                lines.append(f"• *{title}* _({source})_")
    else:
        lines.append("• _Global financial flow remains calm._")

    lines.append("\n━━━━━━━━━━━━━━━━━━━━")
    lines.append("💬 _Tip: Send me any message or /now on Telegram for an instant fresh update anytime!_")

    return "\n".join(lines)


def summarize_with_gemini(api_key: str, market_data: dict, news_data: dict) -> str:
    """Uses Gemini API to synthesize an ultra-clear, simple-English executive brief."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    prompt = f"""
You are a personal financial and tech intelligence assistant.
Your goal is to make market moves and tech news crystal clear and effortless to understand in under 60 seconds.
Avoid unnecessary financial jargon. Explain what is happening in plain, everyday language.

Raw Market Data:
{json.dumps(market_data, indent=2)}

Top Tech & Tools News:
{json.dumps(news_data.get('tech_and_tools', [])[:7], indent=2)}

World Macro News:
{json.dumps(news_data.get('world_macro', [])[:5], indent=2)}

CRITICAL FORMATTING INSTRUCTIONS:
- Use Telegram Markdown (*bold*, _italic_, `code`, [text](url)).
- Target 350-450 words.
- Structure your response exactly with these headers:

🌐 *MARKET & TECH PULSE*
🕒 _(Current Date & Time)_

━━━━━━━━━━━━━━━━━━━━
📊 *MARKETS AT A GLANCE*
- List 4-5 key indices and tech stocks with 🟢 (up) or 🔴 (down) and a 3-word plain English note (e.g. "Tech driving gains", "Oil down on supply ease").

━━━━━━━━━━━━━━━━━━━━
🚀 *NEW TECH & TOOLS*
For the 3-4 best tech/tool stories:
1️⃣ *[Tool / Story Title]*
   ↳ *What it is*: (1 simple sentence explaining the tool/news)
   ↳ *Why it matters*: (1 sentence on who benefits or its impact)

━━━━━━━━━━━━━━━━━━━━
🌍 *WORLD & MACRO HIGHLIGHTS*
- 2-3 bullet points summarizing major economic or geopolitical news and its practical effect on everyday people and investors.

━━━━━━━━━━━━━━━━━━━━
💡 *THE BOTTOM LINE*
1-2 punchy sentences summarizing today's overall mood.

💬 _Tip: Send /now anytime for an instant pulse!_
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1000
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates:
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text:
                    return text.strip()
    except Exception as e:
        print(f"[Summarizer] Gemini API call notice ({e}), using native template.")

    return format_native_briefing(market_data, news_data)


def generate_briefing(market_data: dict, news_data: dict, gemini_api_key: str = "") -> str:
    """Main entrypoint to generate briefing."""
    if gemini_api_key and gemini_api_key.strip():
        return summarize_with_gemini(gemini_api_key.strip(), market_data, news_data)
    return format_native_briefing(market_data, news_data)

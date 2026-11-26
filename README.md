# 🌐 Personal Market & Tech Pulse Agent

An autonomous intelligence agent that continuously tracks financial markets, tech/AI tools, and global macro trends, synthesizing them into a sharp executive briefing delivered straight to your **Telegram** every 4 hours.

---

## ⚡ What It Monitors

1. **Global Financial Markets**:
   * **Indices**: S&P 500, Nasdaq 100, Dow Jones, Nifty 50.
   * **Tech Giants**: Nvidia, Apple, Microsoft, Google, Tesla.
   * **Crypto & Commodities**: Bitcoin, Ethereum, Gold, Crude Oil (WTI), US 10Y Treasury Yield, US Dollar Index.
2. **Tech & Tools Radar**:
   * Hacker News top discussions & tool releases.
   * TechCrunch, The Verge, and Ars Technica headlines.
3. **World & Macro Drivers**:
   * Global business and macroeconomic drivers affecting market sentiment.
4. **AI Synthesis**:
   * Generates a clean, 60-second executive read. Uses **Gemini AI** if an API key is provided, or a high-quality built-in template engine if offline/no key.

---

## 🚀 2-Minute Setup

### Step 1: Create your Telegram Bot (60 seconds)
1. Open Telegram and search for [`@BotFather`](https://t.me/BotFather).
2. Send `/newbot`.
3. Give your bot a name (e.g., `MyMarketPulseBot`) and a username ending in `bot` (e.g., `raunak_market_pulse_bot`).
4. Copy the **HTTP API Token** (looks like `7123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`).

### Step 2: Get your Telegram Chat ID (15 seconds)
1. In Telegram, search for [`@userinfobot`](https://t.me/userinfobot) and tap **Start**.
2. It will reply with your numeric **Id** (e.g. `987654321`).
3. Send a greeting message (e.g. `hello`) to your newly created bot from Step 1 so it has permission to message you.

### Step 3: Configure `.env`
Inside the `market_agent` folder, create your `.env` file:

```bash
cd /Users/raunak/Downloads/project/market_agent
cp .env.example .env
```

Open `.env` and fill in:
```ini
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Optional: Get a free key at https://aistudio.google.com/
GEMINI_API_KEY=
```

---

## 🧪 Testing Your Agent

### 1. Test Telegram Connection
Verify that your bot can send messages to your phone:
```bash
python3 agent.py --test-telegram
```
*(You will instantly receive a test message on Telegram)*

### 2. Run a One-Time Pulse
Fetch live market data, synthesize the report, and send it to your Telegram immediately:
```bash
python3 agent.py --once
```

### 3. Local Dry Run (Without Telegram)
Preview what the report looks like in your terminal:
```bash
python3 agent.py --test
```

---

## 🕒 Running Automatically (Every 4 Hours)

### Option A: macOS Native Background Service (Recommended)
Automatically runs every 4 hours, starts on boot, and runs quietly in the background:
```bash
./install_launchd.sh
```
* To check logs: `cat agent.log`
* To stop service: `launchctl unload ~/Library/LaunchAgents/com.user.marketpulse.plist`

### Option B: Terminal Background Daemon
```bash
python3 agent.py --daemon &
```
*(You can customize the interval with `--interval 2` or `--interval 4`)*


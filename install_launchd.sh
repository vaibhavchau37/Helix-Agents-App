#!/bin/bash
# Installs MarketPulse as a persistent macOS Background Daemon
# Listens for instant Telegram commands (/now) 24/7 AND pushes regular updates!

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.user.marketpulse"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

mkdir -p "$HOME/Library/LaunchAgents"

cat << EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>-u</string>
        <string>/Users/raunak/market_agent/bot_listener.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/raunak/market_agent</string>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/raunak/market_agent/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/raunak/market_agent/agent_error.log</string>
</dict>
</plist>
EOF

# Unload previous instance
launchctl unload "$PLIST_PATH" 2>/dev/null

# Load new persistent service
launchctl load "$PLIST_PATH"

echo "✅ Installed persistent background service: ${PLIST_NAME}"
echo "⚡ Instant updates enabled: Message your bot on Telegram (/now) anytime!"
echo "⏱️ Scheduled updates: Still runs automatically every 4 hours."
echo "📜 Logs: ${AGENT_DIR}/agent.log"

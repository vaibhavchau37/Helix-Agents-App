const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface MarketQuote {
  name: string;
  ticker: string;
  category: "index" | "tech" | "macro";
  price?: number;
  prevClose?: number;
  change?: number;
  changePct?: number;
  currency?: string;
  error?: string;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  score?: number;
}

const MARKET_SYMBOLS: { name: string; ticker: string; category: "index" | "tech" | "macro" }[] = [
  { name: "S&P 500", ticker: "^GSPC", category: "index" },
  { name: "Nasdaq 100", ticker: "^IXIC", category: "index" },
  { name: "Dow Jones", ticker: "^DJI", category: "index" },
  { name: "India Nifty 50", ticker: "^NSEI", category: "index" },
  { name: "Nvidia", ticker: "NVDA", category: "tech" },
  { name: "Apple", ticker: "AAPL", category: "tech" },
  { name: "Microsoft", ticker: "MSFT", category: "tech" },
  { name: "Google", ticker: "GOOGL", category: "tech" },
  { name: "Tesla", ticker: "TSLA", category: "tech" },
  { name: "Bitcoin", ticker: "BTC-USD", category: "macro" },
  { name: "Ethereum", ticker: "ETH-USD", category: "macro" },
  { name: "Gold", ticker: "GC=F", category: "macro" },
  { name: "Crude Oil (WTI)", ticker: "CL=F", category: "macro" },
  { name: "US 10Y Yield", ticker: "^TNX", category: "macro" },
  { name: "US Dollar Index", ticker: "DX-Y.NYB", category: "macro" },
];

async function fetchQuote(item: { name: string; ticker: string; category: "index" | "tech" | "macro" }): Promise<MarketQuote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return { ...item, error: `HTTP ${res.status}` };
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { ...item, error: "No chart data" };

    const meta = result.meta ?? {};
    let price: number | undefined = meta.regularMarketPrice;
    let prevClose: number | undefined = meta.chartPreviousClose ?? meta.previousClose;

    if (price == null || prevClose == null) {
      const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: unknown) => typeof c === "number");
      if (closes.length > 0) {
        price = closes[closes.length - 1];
        prevClose = closes.length > 1 ? closes[closes.length - 2] : price;
      }
    }

    if (price == null || !prevClose) return { ...item, error: "Incomplete price data" };
    const change = price - prevClose;
    const changePct = (change / prevClose) * 100;
    return {
      ...item,
      price,
      prevClose,
      change,
      changePct,
      currency: meta.currency ?? "USD",
    };
  } catch (err) {
    return { ...item, error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchHackerNews(limit = 6): Promise<NewsItem[]> {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];
    const ids: number[] = (await res.json()).slice(0, limit);
    const items = await Promise.all(
      ids.map(async (id) => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemRes.ok) return null;
          const d = await itemRes.json();
          if (!d?.title) return null;
          return {
            title: String(d.title),
            url: d.url || `https://news.ycombinator.com/item?id=${id}`,
            score: d.score ?? 0,
            source: "HackerNews",
          } as NewsItem;
        } catch {
          return null;
        }
      })
    );
    return items.filter((x): x is NewsItem => x !== null);
  } catch {
    return [];
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchRss(source: string, url: string, limit = 4): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    const xml = await res.text();
    const results: NewsItem[] = [];

    const itemMatches = xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi);
    for (const m of itemMatches) {
      if (results.length >= limit) break;
      const block = m[1];
      const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      if (titleMatch?.[1]) {
        results.push({
          title: decodeXml(titleMatch[1]),
          url: linkMatch?.[1] ? decodeXml(linkMatch[1]) : "",
          source,
        });
      }
    }

    if (results.length === 0) {
      const entryMatches = xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi);
      for (const m of entryMatches) {
        if (results.length >= limit) break;
        const block = m[1];
        const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
        if (titleMatch?.[1]) {
          results.push({
            title: decodeXml(titleMatch[1]),
            url: linkMatch?.[1] ?? "",
            source,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

function cleanMd(text: string): string {
  return text.replace(/[*_`]/g, "").trim();
}

function buildNativeBriefing(quotes: MarketQuote[], techNews: NewsItem[], macroNews: NewsItem[]): string {
  const nowStr = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lines: string[] = [
    "🌐 *MARKET & TECH PULSE*",
    `🕒 _${nowStr}_\n`,
    "━━━━━━━━━━━━━━━━━━━━",
    "📊 *MARKETS AT A GLANCE*",
  ];

  const byCat = (cat: "index" | "tech" | "macro") => quotes.filter((q) => q.category === cat && q.price != null);

  for (const q of byCat("index")) {
    const pct = q.changePct ?? 0;
    const icon = pct > 0.05 ? "🟢" : pct < -0.05 ? "🔴" : "⚪";
    const sign = pct > 0 ? "+" : "";
    const pStr = q.price! >= 1000 ? q.price!.toLocaleString("en-US", { maximumFractionDigits: 1 }) : q.price!.toFixed(2);
    lines.push(`${icon} *${q.name}*: \`${pStr}\` (${sign}${pct.toFixed(2)}%)`);
  }

  lines.push("\n💻 *Tech Leaders (Big Tech & AI)*");
  for (const q of byCat("tech")) {
    const pct = q.changePct ?? 0;
    const icon = pct > 0.05 ? "🟢" : pct < -0.05 ? "🔴" : "⚪";
    const sign = pct > 0 ? "+" : "";
    lines.push(`${icon} *${q.name}*: \`$${q.price!.toFixed(2)}\` (${sign}${pct.toFixed(2)}%)`);
  }

  lines.push("\n🪙 *Crypto & Commodities*");
  for (const q of byCat("macro")) {
    const pct = q.changePct ?? 0;
    const icon = pct > 0.05 ? "🟢" : pct < -0.05 ? "🔴" : "⚪";
    const sign = pct > 0 ? "+" : "";
    const pStr = q.name.includes("Yield")
      ? `${q.price!.toFixed(2)}%`
      : q.price! >= 1000
      ? `$${Math.round(q.price!).toLocaleString("en-US")}`
      : `$${q.price!.toFixed(2)}`;
    lines.push(`${icon} *${q.name}*: \`${pStr}\` (${sign}${pct.toFixed(2)}%)`);
  }

  lines.push("\n━━━━━━━━━━━━━━━━━━━━", "🚀 *TECH & TOOLS RADAR*");
  if (techNews.length > 0) {
    techNews.slice(0, 5).forEach((item, idx) => {
      const title = cleanMd(item.title);
      lines.push(item.url ? `\n${idx + 1}. [${title}](${item.url}) _(${item.source})_` : `\n${idx + 1}. *${title}* _(${item.source})_`);
    });
  } else {
    lines.push("• _No new tool releases detected in this window._");
  }

  lines.push("\n━━━━━━━━━━━━━━━━━━━━", "🌍 *WORLD & MACRO DRIVERS*");
  if (macroNews.length > 0) {
    macroNews.slice(0, 4).forEach((item) => {
      const title = cleanMd(item.title);
      lines.push(item.url ? `• [${title}](${item.url}) _(${item.source})_` : `• *${title}* _(${item.source})_`);
    });
  } else {
    lines.push("• _Global financial flow remains calm._");
  }

  return lines.join("\n");
}

async function summarizeWithGemini(
  apiKey: string,
  quotes: MarketQuote[],
  techNews: NewsItem[],
  macroNews: NewsItem[]
): Promise<string> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = `You are a personal financial and tech intelligence assistant. Make market moves and tech news crystal clear and effortless to understand in under 60 seconds using plain language.

Market Data: ${JSON.stringify(quotes.filter((q) => q.price != null))}
Tech & Tools News: ${JSON.stringify(techNews.slice(0, 7))}
World Macro News: ${JSON.stringify(macroNews.slice(0, 5))}

Use Telegram Markdown (*bold*, _italic_, \`code\`, [text](url)). Target 300-420 words with sections:
🌐 *MARKET & TECH PULSE*
📊 *MARKETS AT A GLANCE*
🚀 *NEW TECH & TOOLS*
🌍 *WORLD & MACRO HIGHLIGHTS*
💡 *THE BOTTOM LINE*`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return String(text).trim();
    }
  } catch {
    // Fallback to native briefing
  }
  return buildNativeBriefing(quotes, techNews, macroNews);
}

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), parse_mode: "Markdown" }),
  });
  const data = await res.json();
  if (!data.ok && String(data.description || "").includes("can't parse entities")) {
    const retry = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
    });
    const retryData = await retry.json();
    return { ok: Boolean(retryData.ok), error: retryData.description };
  }
  return { ok: Boolean(data.ok), error: data.description };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action || "fetch";
    const botToken: string = body.botToken || Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const chatId: string = body.chatId || Deno.env.get("TELEGRAM_CHAT_ID") || "";
    const geminiKey: string = body.geminiKey || Deno.env.get("GEMINI_API_KEY") || "";

    if (action === "test") {
      if (!botToken || !chatId) {
        return new Response(JSON.stringify({ ok: false, error: "Bot Token and Chat ID are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await sendTelegram(
        botToken,
        chatId,
        "🤖 *Helix MarketPulse Connected!*\n\nYour Helix Agents App is linked to Telegram."
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [quotes, hn, tc, verge, gnews, mw] = await Promise.all([
      Promise.all(MARKET_SYMBOLS.map(fetchQuote)),
      fetchHackerNews(6),
      fetchRss("TechCrunch", "https://techcrunch.com/feed/", 3),
      fetchRss("The Verge", "https://www.theverge.com/rss/index.xml", 3),
      fetchRss("Google News Business", "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en", 4),
      fetchRss("MarketWatch", "https://feeds.content.dowjones.io/public/rss/mw_topstories", 3),
    ]);

    const techNews = [...hn, ...tc, ...verge];
    const macroNews = [...gnews, ...mw];
    const briefing = geminiKey
      ? await summarizeWithGemini(geminiKey, quotes, techNews, macroNews)
      : buildNativeBriefing(quotes, techNews, macroNews);

    let telegramResult: { ok: boolean; error?: string } | null = null;
    if (action === "send") {
      if (!botToken || !chatId) {
        telegramResult = { ok: false, error: "Missing Telegram credentials" };
      } else {
        telegramResult = await sendTelegram(botToken, chatId, briefing);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        quotes,
        techNews,
        macroNews,
        briefing,
        telegram: telegramResult,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { supabase } from './supabase';

export interface MarketQuote {
  name: string;
  ticker: string;
  category: 'index' | 'tech' | 'macro';
  price?: number;
  prevClose?: number;
  change?: number;
  changePct?: number;
  currency?: string;
  error?: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  score?: number;
}

export interface MarketPulseResponse {
  ok: boolean;
  quotes: MarketQuote[];
  techNews: NewsItem[];
  macroNews: NewsItem[];
  briefing: string;
  telegram?: { ok: boolean; error?: string } | null;
  generatedAt: string;
  sourceMode?: 'edge-function' | 'browser-fallback';
}

export interface MarketPulseConfig {
  botToken: string;
  chatId: string;
  geminiKey: string;
  intervalMinutes: number;
  autoEnabled: boolean;
}

const CONFIG_KEY = 'helix_market_pulse_config';

export function loadPulseConfig(): MarketPulseConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken ?? '',
        chatId: parsed.chatId ?? '',
        geminiKey: parsed.geminiKey ?? '',
        intervalMinutes: Number(parsed.intervalMinutes) || 60,
        autoEnabled: Boolean(parsed.autoEnabled),
      };
    }
  } catch {
    // ignore
  }
  return {
    botToken: '',
    chatId: '',
    geminiKey: '',
    intervalMinutes: 60,
    autoEnabled: false,
  };
}

export function savePulseConfig(cfg: MarketPulseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

async function fetchBrowserFallback(
  action: 'fetch' | 'send',
  cfg: MarketPulseConfig
): Promise<MarketPulseResponse> {
  const quotes: MarketQuote[] = [];
  const techNews: NewsItem[] = [];
  const macroNews: NewsItem[] = [];

  try {
    const cgRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
    );
    if (cgRes.ok) {
      const cg = await cgRes.json();
      if (cg.bitcoin) {
        quotes.push({
          name: 'Bitcoin',
          ticker: 'BTC-USD',
          category: 'macro',
          price: cg.bitcoin.usd,
          changePct: cg.bitcoin.usd_24h_change,
        });
      }
      if (cg.ethereum) {
        quotes.push({
          name: 'Ethereum',
          ticker: 'ETH-USD',
          category: 'macro',
          price: cg.ethereum.usd,
          changePct: cg.ethereum.usd_24h_change,
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (hnRes.ok) {
      const ids: number[] = (await hnRes.json()).slice(0, 6);
      const items = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!r.ok) return null;
          const d = await r.json();
          if (!d?.title) return null;
          return {
            title: String(d.title),
            url: d.url || `https://news.ycombinator.com/item?id=${id}`,
            score: d.score ?? 0,
            source: 'HackerNews',
          } as NewsItem;
        })
      );
      items.forEach((i) => {
        if (i) techNews.push(i);
      });
    }
  } catch {
    // ignore
  }

  const nowStr = new Date().toLocaleString();
  const lines = [
    '🌐 *MARKET & TECH PULSE*',
    `🕒 _${nowStr}_\n`,
    '📊 *Crypto Snapshot*',
    ...quotes.map((q) => {
      const pct = q.changePct ?? 0;
      const icon = pct >= 0 ? '🟢' : '🔴';
      const sign = pct >= 0 ? '+' : '';
      return `${icon} *${q.name}*: \`$${q.price?.toLocaleString()}\` (${sign}${pct.toFixed(2)}%)`;
    }),
    '\n🚀 *TECH & TOOLS RADAR*',
    ...techNews.slice(0, 5).map((t, i) => `${i + 1}. [${t.title.replace(/[*_`]/g, '')}](${t.url}) _(HackerNews)_`),
    '\n_Note: Deploy the `market-pulse` Supabase Edge Function for full S&P 500, Nasdaq, Nifty 50, stocks, and RSS macro feeds._',
  ];
  const briefing = lines.join('\n');

  let telegram: { ok: boolean; error?: string } | null = null;
  if (action === 'send') {
    if (!cfg.botToken || !cfg.chatId) {
      telegram = { ok: false, error: 'Missing Bot Token or Chat ID' };
    } else {
      telegram = await sendTelegramDirect(cfg.botToken, cfg.chatId, briefing);
    }
  }

  return {
    ok: true,
    quotes,
    techNews,
    macroNews,
    briefing,
    telegram,
    generatedAt: new Date().toISOString(),
    sourceMode: 'browser-fallback',
  };
}

async function sendTelegramDirect(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4000),
        parse_mode: 'Markdown',
      }),
    });
    const data = await res.json();
    return { ok: Boolean(data.ok), error: data.description };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runMarketPulse(
  action: 'fetch' | 'send',
  cfg: MarketPulseConfig
): Promise<MarketPulseResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('market-pulse', {
      body: {
        action,
        botToken: cfg.botToken,
        chatId: cfg.chatId,
        geminiKey: cfg.geminiKey,
      },
    });
    if (!error && data?.ok) {
      return { ...(data as MarketPulseResponse), sourceMode: 'edge-function' };
    }
  } catch {
    // Fall back to browser-direct fetch
  }

  return fetchBrowserFallback(action, cfg);
}

export async function testTelegramSetup(cfg: MarketPulseConfig): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.botToken || !cfg.chatId) {
    return { ok: false, error: 'Enter both Bot Token and Chat ID first.' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('market-pulse', {
      body: {
        action: 'test',
        botToken: cfg.botToken,
        chatId: cfg.chatId,
      },
    });
    if (!error && data) return data as { ok: boolean; error?: string };
  } catch {
    // fallback
  }
  return sendTelegramDirect(
    cfg.botToken,
    cfg.chatId,
    '🤖 *Helix MarketPulse Connected!*\n\nYour Helix Agents App is linked to Telegram.'
  );
}

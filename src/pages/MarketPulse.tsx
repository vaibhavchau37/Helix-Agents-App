import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Send, RefreshCw, Globe, Cpu, Newspaper,
  Settings2, CheckCircle2, AlertCircle, ExternalLink, Clock, Zap,
} from 'lucide-react';
import { TopBar, LoadingSpinner } from '../components/Layout';
import { useToast } from '../lib/toast';
import {
  loadPulseConfig,
  savePulseConfig,
  runMarketPulse,
  testTelegramSetup,
  type MarketPulseConfig,
  type MarketPulseResponse,
} from '../lib/marketPulse';

export function MarketPulsePage() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<MarketPulseConfig>(() => loadPulseConfig());
  const [data, setData] = useState<MarketPulseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const refresh = useCallback(async (action: 'fetch' | 'send' = 'fetch') => {
    if (action === 'send') setSending(true);
    else setLoading(true);

    try {
      const res = await runMarketPulse(action, cfg);
      setData(res);
      if (action === 'send') {
        if (res.telegram?.ok) {
          toast('Market & Tech briefing sent to Telegram', 'success');
        } else {
          toast(res.telegram?.error || 'Failed to send to Telegram', 'error');
        }
      }
    } finally {
      setLoading(false);
      setSending(false);
    }
  }, [cfg, toast]);

  useEffect(() => {
    refresh('fetch');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cfg.autoEnabled) return;
    const ms = Math.max(5, cfg.intervalMinutes) * 60 * 1000;
    const id = setInterval(() => {
      refresh('send');
    }, ms);
    return () => clearInterval(id);
  }, [cfg.autoEnabled, cfg.intervalMinutes, refresh]);

  function handleSaveConfig(next: MarketPulseConfig) {
    setCfg(next);
    savePulseConfig(next);
    toast('Telegram & schedule settings saved', 'success');
  }

  async function handleTestTelegram() {
    setTesting(true);
    const res = await testTelegramSetup(cfg);
    setTesting(false);
    if (res.ok) {
      toast('Telegram test ping delivered!', 'success');
    } else {
      toast(res.error || 'Telegram connection failed', 'error');
    }
  }

  const indices = data?.quotes.filter((q) => q.category === 'index' && q.price != null) ?? [];
  const techStocks = data?.quotes.filter((q) => q.category === 'tech' && q.price != null) ?? [];
  const macroAssets = data?.quotes.filter((q) => q.category === 'macro' && q.price != null) ?? [];

  return (
    <>
      <TopBar
        title="Market Pulse"
        subtitle="Autonomous market, tech tools & macro briefing agent"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig((s) => !s)}
              className="btn bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]"
            >
              <Settings2 size={13} />
              Telegram Config
            </button>
            <button
              onClick={() => refresh('fetch')}
              disabled={loading}
              className="btn bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => refresh('send')}
              disabled={sending}
              className="btn bg-[var(--accent)] text-white hover:bg-[var(--accent-dim)]"
            >
              <Send size={13} />
              {sending ? 'Sending...' : 'Send Pulse to Telegram'}
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
        {/* Telegram & Auto-Schedule Config Drawer */}
        {showConfig && (
          <div className="panel p-4 space-y-3 border-[var(--accent)]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-[var(--accent)]" />
                <h3 className="text-[13px] font-semibold text-[var(--text)]">Telegram & Auto-News Configuration</h3>
              </div>
              <span className="text-[11px] text-[var(--text-mute)]">
                Stored locally in your browser
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--text-mute)] mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  value={cfg.botToken}
                  onChange={(e) => setCfg({ ...cfg, botToken: e.target.value })}
                  placeholder="123456:ABC..."
                  className="w-full px-3 py-1.5 rounded-[5px] bg-[var(--bg)] border border-[var(--border)] text-[12px] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-mute)] mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  value={cfg.chatId}
                  onChange={(e) => setCfg({ ...cfg, chatId: e.target.value })}
                  placeholder="e.g. 1181219663"
                  className="w-full px-3 py-1.5 rounded-[5px] bg-[var(--bg)] border border-[var(--border)] text-[12px] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-mute)] mb-1">Gemini API Key (Optional)</label>
                <input
                  type="password"
                  value={cfg.geminiKey}
                  onChange={(e) => setCfg({ ...cfg, geminiKey: e.target.value })}
                  placeholder="For AI executive summaries"
                  className="w-full px-3 py-1.5 rounded-[5px] bg-[var(--bg)] border border-[var(--border)] text-[12px] text-[var(--text)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-[12px] text-[var(--text-dim)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.autoEnabled}
                    onChange={(e) => setCfg({ ...cfg, autoEnabled: e.target.checked })}
                  />
                  <Clock size={13} className="text-[var(--emerald)]" />
                  Auto-send while app is open every
                </label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={cfg.intervalMinutes}
                  onChange={(e) => setCfg({ ...cfg, intervalMinutes: Number(e.target.value) || 60 })}
                  className="w-16 px-2 py-1 rounded-[5px] bg-[var(--bg)] border border-[var(--border)] text-[12px] text-[var(--text)]"
                />
                <span className="text-[11.5px] text-[var(--text-mute)]">minutes</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestTelegram}
                  disabled={testing}
                  className="btn bg-[var(--panel-2)] text-[var(--text)] border border-[var(--border)]"
                >
                  {testing ? 'Testing...' : 'Test Telegram Ping'}
                </button>
                <button
                  onClick={() => handleSaveConfig(cfg)}
                  className="btn bg-[var(--emerald)] text-[#111] font-semibold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-mute)]">
          <div className="flex items-center gap-2">
            {data?.sourceMode === 'edge-function' ? (
              <span className="flex items-center gap-1 text-[var(--emerald)]">
                <CheckCircle2 size={12} /> Full Edge Function Feed Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--amber)]">
                <AlertCircle size={12} /> Browser Live Fallback (deploy `market-pulse` Edge Function for full indices & RSS)
              </span>
            )}
          </div>
          {data?.generatedAt && (
            <span>Last updated: {new Date(data.generatedAt).toLocaleTimeString()}</span>
          )}
        </div>

        {loading && !data ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Market Quotes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <QuoteCard title="Global Indices" icon={TrendingUp} items={indices} />
              <QuoteCard title="Big Tech & AI" icon={Cpu} items={techStocks} isUsd />
              <QuoteCard title="Crypto & Macro" icon={Globe} items={macroAssets} isUsd />
            </div>

            {/* News & Briefing Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tech & Tools + Macro News */}
              <div className="lg:col-span-2 space-y-4">
                <div className="panel p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu size={15} className="text-[var(--accent)]" />
                    <h3 className="text-[13px] font-semibold text-[var(--text)]">Tech & Tools Radar</h3>
                  </div>
                  <div className="space-y-2">
                    {(data?.techNews ?? []).slice(0, 8).map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="panel-2 p-2.5 flex items-start justify-between gap-3 panel-hover block"
                      >
                        <div>
                          <p className="text-[12px] font-medium text-[var(--text)]">{item.title}</p>
                          <p className="text-[10.5px] text-[var(--text-mute)] mt-0.5">
                            {item.source}{item.score ? ` • ${item.score} pts` : ''}
                          </p>
                        </div>
                        {item.url && <ExternalLink size={12} className="text-[var(--text-mute)] shrink-0 mt-1" />}
                      </a>
                    ))}
                  </div>
                </div>

                {(data?.macroNews?.length ?? 0) > 0 && (
                  <div className="panel p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Newspaper size={15} className="text-[var(--emerald)]" />
                      <h3 className="text-[13px] font-semibold text-[var(--text)]">World & Macro Drivers</h3>
                    </div>
                    <div className="space-y-2">
                      {data!.macroNews.slice(0, 6).map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="panel-2 p-2.5 flex items-start justify-between gap-3 panel-hover block"
                        >
                          <div>
                            <p className="text-[12px] font-medium text-[var(--text)]">{item.title}</p>
                            <p className="text-[10.5px] text-[var(--text-mute)] mt-0.5">{item.source}</p>
                          </div>
                          {item.url && <ExternalLink size={12} className="text-[var(--text-mute)] shrink-0 mt-1" />}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Telegram Briefing Preview */}
              <div className="panel p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-[var(--text)]">Telegram Briefing Preview</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--panel-3)] text-[var(--text-dim)]">
                    Markdown
                  </span>
                </div>
                <pre className="flex-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[var(--text-dim)] bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-3 max-h-[540px] overflow-y-auto thin-scroll font-sans">
                  {data?.briefing || 'No briefing generated yet.'}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function QuoteCard({
  title,
  icon: Icon,
  items,
  isUsd = false,
}: {
  title: string;
  icon: typeof TrendingUp;
  items: NonNullable<MarketPulseResponse['quotes']>;
  isUsd?: boolean;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-[var(--accent)]" />
        <h3 className="text-[13px] font-semibold text-[var(--text)]">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[11.5px] text-[var(--text-mute)] py-4 text-center">No quotes in current feed</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((q) => {
            const pct = q.changePct ?? 0;
            const up = pct > 0.05;
            const down = pct < -0.05;
            const color = up ? 'text-[var(--emerald)]' : down ? 'text-[var(--rose)]' : 'text-[var(--text-mute)]';
            const sign = pct > 0 ? '+' : '';
            const priceStr = q.name.includes('Yield')
              ? `${q.price?.toFixed(2)}%`
              : `${isUsd ? '$' : ''}${
                  (q.price ?? 0) >= 1000
                    ? q.price?.toLocaleString('en-US', { maximumFractionDigits: 1 })
                    : q.price?.toFixed(2)
                }`;
            return (
              <div key={q.ticker} className="panel-2 px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[var(--text)]">{q.name}</p>
                  <p className="text-[10px] text-[var(--text-mute)]">{q.ticker}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-[var(--text)]">{priceStr}</p>
                  <p className={`text-[10.5px] font-medium ${color}`}>
                    {sign}{pct.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { ScrollText, Filter, Terminal, Pause, Play, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, LoadingSpinner, EmptyState } from '../components/Layout';
import type { ExecutionLog, LogLevel } from '../lib/types';

const logLevelText: Record<string, string> = {
  info: 'text-[var(--sky)]', success: 'text-[var(--emerald)]', warning: 'text-[var(--amber)]', error: 'text-[var(--rose)]',
};
const logLevelDot: Record<string, string> = {
  info: 'bg-[var(--sky)]', success: 'bg-[var(--emerald)]', warning: 'bg-[var(--amber)]', error: 'bg-[var(--rose)]',
};
const logLevelBg: Record<string, string> = {
  info: 'bg-[var(--sky)]/10', success: 'bg-[var(--emerald)]/10', warning: 'bg-[var(--amber)]/10', error: 'bg-[var(--rose)]/10',
};

export function LogsPage() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase.from('execution_logs').select('*').order('created_at', { ascending: false }).limit(200);
    setLogs((data || []) as ExecutionLog[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Realtime + poll
  useEffect(() => {
    const ch = supabase.channel('logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'execution_logs' }, () => load())
      .subscribe();
    const interval = setInterval(load, 4000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, []);

  // Auto-scroll to top on new logs
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);
  const counts = {
    all: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    success: logs.filter((l) => l.level === 'success').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    error: logs.filter((l) => l.level === 'error').length,
  };

  function exportLogs() {
    const text = filtered.map((l) => `[${l.created_at}] [${l.level.toUpperCase()}] ${l.message}${l.exit_code !== null ? ` (exit ${l.exit_code})` : ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <TopBar
        title="Logs"
        subtitle="Execution logs from all agent activities"
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`btn btn-ghost ${autoScroll ? 'text-[var(--accent)]' : ''}`}
              title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
            >
              {autoScroll ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button onClick={exportLogs} className="btn btn-ghost" title="Export logs">
              <Download size={13} />
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <Filter size={13} className="text-[var(--text-mute)] mr-1" />
          {(['all', 'info', 'success', 'warning', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                filter === f ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'bg-[var(--panel-2)] text-[var(--text-mute)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-light)]'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} <span className="text-[var(--text-mute)]/60 ml-0.5">{counts[f]}</span>
            </button>
          ))}
          <span className="ml-auto text-[10px] text-[var(--text-mute)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] pulse-dot" /> Live
          </span>
        </div>

        {loading ? <LoadingSpinner label="Loading logs..." /> :
          filtered.length === 0 ? <EmptyState icon={ScrollText} title="No logs found" message="Execution logs from sandbox runs and agent activities will appear here." /> :
          <div ref={scrollRef} className="panel p-3 text-[11px] space-y-0 max-h-[700px] overflow-y-auto mono thin-scroll">
            {filtered.map((l) => (
              <div key={l.id} className="flex items-start gap-2.5 py-[7px] border-b border-[var(--border)]/25 last:border-0 fade-in">
                <span className="text-[var(--text-mute)] shrink-0 w-28 text-[10px]">{new Date(l.created_at).toLocaleString()}</span>
                <span className={`shrink-0 font-semibold uppercase w-14 px-1.5 py-0.5 rounded text-center text-[9px] ${logLevelText[l.level]} ${logLevelBg[l.level]}`}>{l.level}</span>
                <span className="text-[var(--text-dim)] break-all whitespace-pre-wrap flex-1 leading-relaxed">{l.message}</span>
                {l.exit_code !== null && (
                  <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${l.exit_code === 0 ? 'text-[var(--emerald)] bg-[var(--emerald)]/10' : 'text-[var(--rose)] bg-[var(--rose)]/10'}`}>exit {l.exit_code}</span>
                )}
              </div>
            ))}
          </div>
        }
        {filtered.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 text-[10.5px] text-[var(--text-mute)]">
            <Terminal size={11} /> {filtered.length} of {logs.length} entries
          </div>
        )}
      </div>
    </>
  );
}

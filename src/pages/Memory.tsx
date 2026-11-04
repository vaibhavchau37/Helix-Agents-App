import { useEffect, useState, useCallback } from 'react';
import { Brain, Search, Bug, Lightbulb, GitBranch, BookOpen, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, LoadingSpinner, EmptyState } from '../components/Layout';
import type { MemoryEntry, MemoryType } from '../lib/types';
import type { LucideIcon } from 'lucide-react';

const typeInfo: Record<MemoryType, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  bug: { icon: Bug, color: 'text-[var(--rose)]', bg: 'bg-[var(--rose)]/10', label: 'Bug' },
  solution: { icon: Lightbulb, color: 'text-[var(--emerald)]', bg: 'bg-[var(--emerald)]/10', label: 'Solution' },
  pattern: { icon: GitBranch, color: 'text-[var(--violet)]', bg: 'bg-[var(--violet)]/10', label: 'Pattern' },
  learning: { icon: BookOpen, color: 'text-[var(--sky)]', bg: 'bg-[var(--sky)]/10', label: 'Learning' },
};

export function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('memory_entries').select('*').order('created_at', { ascending: false }).limit(200);
    setEntries((data || []) as MemoryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('memory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_entries' }, load)
      .subscribe();
    const interval = setInterval(load, 8000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [load]);

  const filtered = entries.filter((e) => {
    if (typeFilter !== 'all' && e.entry_type !== typeFilter) return false;
    if (search && !(`${e.title} ${e.content} ${e.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });
  const counts: Record<string, number> = { all: entries.length };
  (['bug', 'solution', 'pattern', 'learning'] as MemoryType[]).forEach((t) => { counts[t] = entries.filter((e) => e.entry_type === t).length; });

  return (
    <>
      <TopBar title="Memory" subtitle="Long-term knowledge base — bugs, solutions, patterns" />
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-mute)]" />
            <input className="input pl-9" placeholder="Search memory..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'bug', 'solution', 'pattern', 'learning'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`text-[11px] px-2.5 py-1.5 rounded-[5px] font-medium transition-all ${
                  typeFilter === f ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'bg-[var(--panel-2)] text-[var(--text-mute)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-light)]'
                }`}
              >
                {f === 'all' ? 'All' : typeInfo[f].label} <span className="text-[var(--text-mute)]/60 ml-0.5">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? <LoadingSpinner label="Loading..." /> :
          filtered.length === 0 ? <EmptyState icon={Brain} title="No memory entries" message="Helix Agents stores knowledge from every bug it fixes and pattern it discovers. Entries appear here as the system learns." /> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((e) => {
              const info = typeInfo[e.entry_type];
              const Icon = info.icon;
              return (
                <div key={e.id} className="panel p-3.5 panel-hover fade-in">
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 ${info.bg}`}>
                      <Icon size={15} className={info.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text)] line-clamp-2 leading-snug">{e.title}</p>
                      <p className="text-[9.5px] text-[var(--text-mute)] mt-1 flex items-center gap-1">
                        {info.label} · {new Date(e.created_at).toLocaleDateString()}
                        {e.similarity_score != null && <><span>·</span> <span className="text-[var(--accent)]">{(e.similarity_score * 100).toFixed(0)}% match</span></>}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] line-clamp-4 whitespace-pre-wrap mb-2.5 leading-relaxed">{e.content}</p>
                  {e.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-[var(--border)]/40">
                      {e.tags.map((t) => (
                        <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-mute)]">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        }
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 text-[10.5px] text-[var(--text-mute)]">
            <Database size={11} /> {entries.length} total entries
          </div>
        )}
      </div>
    </>
  );
}

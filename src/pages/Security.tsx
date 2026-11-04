import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronRight, ShieldX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, LoadingSpinner, EmptyState, StatusBadge } from '../components/Layout';
import { useToast } from '../lib/toast';
import type { SecurityReport, Severity } from '../lib/types';

const severityStyle: Record<Severity, { text: string; bg: string; dot: string }> = {
  critical: { text: 'text-[var(--rose)]', bg: 'bg-[var(--rose)]/10', dot: 'bg-[var(--rose)]' },
  high: { text: 'text-[var(--orange)]', bg: 'bg-[var(--orange)]/10', dot: 'bg-[var(--orange)]' },
  medium: { text: 'text-[var(--amber)]', bg: 'bg-[var(--amber)]/10', dot: 'bg-[var(--amber)]' },
  low: { text: 'text-[var(--sky)]', bg: 'bg-[var(--sky)]/10', dot: 'bg-[var(--sky)]' },
  info: { text: 'text-[var(--text-dim)]', bg: 'bg-[var(--panel-3)]', dot: 'bg-[var(--text-mute)]' },
};
const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export function SecurityPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('security_reports').select('*, projects(title)').order('created_at', { ascending: false }).limit(200);
    setReports((data || []) as SecurityReport[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('security-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_reports' }, load)
      .subscribe();
    const interval = setInterval(load, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [load]);

  async function updateStatus(id: string, status: 'open' | 'mitigated' | 'ignored') {
    await supabase.from('security_reports').update({ status }).eq('id', id);
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    const labels = { open: 'reopened', mitigated: 'mitigated', ignored: 'ignored' };
    toast(`Finding ${labels[status]}`, status === 'mitigated' ? 'success' : 'info');
  }

  async function bulkMitigate() {
    const openIds = reports.filter((r) => r.status === 'open').map((r) => r.id);
    if (openIds.length === 0) return;
    await supabase.from('security_reports').update({ status: 'mitigated' }).in('id', openIds);
    setReports((prev) => prev.map((r) => r.status === 'open' ? { ...r, status: 'mitigated' } : r));
    toast(`${openIds.length} findings mitigated`, 'success');
  }

  const filtered = severityFilter === 'all' ? reports : reports.filter((r) => r.severity === severityFilter);
  const sorted = [...filtered].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
  const counts: Record<string, number> = { all: reports.length };
  severityOrder.forEach((s) => { counts[s] = reports.filter((r) => r.severity === s).length; });
  const openCount = reports.filter((r) => r.status === 'open').length;

  return (
    <>
      <TopBar
        title="Security"
        subtitle="Vulnerability findings across all projects"
        actions={
          openCount > 0 ? (
            <button onClick={bulkMitigate} className="btn btn-primary">
              <ShieldCheck size={14} /> Mitigate All ({openCount})
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        {/* Severity summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {(['all', ...severityOrder] as const).map((s) => {
            const sty = s !== 'all' ? severityStyle[s as Severity] : null;
            return (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`panel p-2.5 text-left panel-hover ${severityFilter === s ? 'border-[var(--accent)]/30' : ''}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {sty && <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} />}
                  <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--text-mute)] font-medium">{s}</p>
                </div>
                <p className={`text-[18px] font-bold leading-none ${s === 'all' ? 'text-[var(--text)]' : sty?.text}`}>{counts[s]}</p>
              </button>
            );
          })}
        </div>

        {loading ? <LoadingSpinner label="Loading..." /> :
          sorted.length === 0 ? <EmptyState icon={ShieldAlert} title="No security findings" message="The Security agent scans dependencies and source code for vulnerabilities. Findings will appear here." /> :
          <div className="space-y-2 max-w-4xl">
            {sorted.map((r) => {
              const proj = (r as unknown as { projects: { title: string } | null }).projects;
              const isExpanded = expanded === r.id;
              const sty = severityStyle[r.severity];
              return (
                <div key={r.id} className="panel overflow-hidden fade-in">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                    className="w-full p-3 flex items-center gap-2.5 text-left hover:bg-[var(--panel-2)]/40 transition-colors"
                  >
                    <span className={`shrink-0 badge ${sty.bg} ${sty.text}`}>{r.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text)]">{r.title}</p>
                      <p className="text-[9.5px] text-[var(--text-mute)] mt-0.5">
                        {r.category} {proj ? <><span>·</span> {proj.title}</> : ''}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                    {isExpanded ? <ChevronDown size={14} className="text-[var(--text-mute)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--text-mute)] shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-0.5 space-y-2.5 fade-in-fast">
                      <div>
                        <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--rose)] font-semibold mb-1">Description</p>
                        <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{r.description}</p>
                      </div>
                      <div>
                        <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--emerald)] font-semibold mb-1">Recommendation</p>
                        <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{r.recommendation}</p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-2.5 border-t border-[var(--border)]">
                        <span className="text-[9.5px] text-[var(--text-mute)] mr-0.5">Status:</span>
                        {(['open', 'mitigated', 'ignored'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(r.id, s)}
                            className={`text-[10.5px] px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                              r.status === s
                                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                                : 'bg-[var(--panel-2)] text-[var(--text-mute)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--border-light)]'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        }

        {reports.length > 0 && reports.every(r => r.status === 'mitigated') && (
          <div className="panel p-3.5 mt-4 flex items-center gap-2.5 max-w-4xl fade-in">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--emerald)]/10 flex items-center justify-center">
              <ShieldCheck size={16} className="text-[var(--emerald)]" />
            </div>
            <p className="text-[12px] text-[var(--text-dim)]">All findings mitigated.</p>
          </div>
        )}
        {reports.length > 0 && reports.some(r => r.status === 'open') && reports.filter(r => r.severity === 'critical' || r.severity === 'high').some(r => r.status === 'open') && (
          <div className="panel p-3.5 mt-4 flex items-center gap-2.5 max-w-4xl fade-in">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--rose)]/10 flex items-center justify-center">
              <ShieldX size={16} className="text-[var(--rose)]" />
            </div>
            <p className="text-[12px] text-[var(--text-dim)]">High-severity findings still open. Review before deploying.</p>
          </div>
        )}
      </div>
    </>
  );
}

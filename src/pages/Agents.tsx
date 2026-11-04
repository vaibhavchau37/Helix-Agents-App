import { useEffect, useState, useCallback } from 'react';
import { Cpu, Code2, TestTube2, ShieldCheck, Gauge, Bot, Zap, Network, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, LoadingSpinner, StatusBadge } from '../components/Layout';
import { useCountUp } from '../lib/hooks';
import type { AgentName, AgentRun } from '../lib/types';
import type { LucideIcon } from 'lucide-react';

const AGENT_INFO: Record<AgentName, { label: string; icon: LucideIcon; color: string; bg: string; description: string; capabilities: string[] }> = {
  supervisor: {
    label: 'Supervisor', icon: Cpu, color: 'text-[var(--sky)]', bg: 'bg-[var(--sky)]/10',
    description: 'The orchestrator. Receives requirements, decomposes them into tasks, routes work to specialist agents, and tracks overall progress.',
    capabilities: ['Requirement parsing', 'Task decomposition', 'Agent routing', 'Pipeline orchestration', 'Conflict resolution'],
  },
  coder: {
    label: 'Coder', icon: Code2, color: 'text-[var(--emerald)]', bg: 'bg-[var(--emerald)]/10',
    description: 'Generates project structure, source files, configuration, and documentation from the task graph produced by the Supervisor.',
    capabilities: ['Project scaffolding', 'API code generation', 'Test suite creation', 'Dockerfile writing', 'Documentation'],
  },
  tester: {
    label: 'Tester', icon: TestTube2, color: 'text-[var(--amber)]', bg: 'bg-[var(--amber)]/10',
    description: 'Runs static analysis on generated code, validates test coverage, captures stdout/stderr, and reports failures back to the Supervisor.',
    capabilities: ['Static analysis', 'Test coverage validation', 'Log capture', 'Exit-code analysis', 'Failure reporting'],
  },
  security: {
    label: 'Security', icon: ShieldCheck, color: 'text-[var(--rose)]', bg: 'bg-[var(--rose)]/10',
    description: 'Scans dependencies for known CVEs, inspects source for insecure patterns, and produces a prioritized vulnerability report.',
    capabilities: ['Dependency scanning', 'CVE matching', 'Source audit', 'Configuration review', 'Remediation advice'],
  },
  performance: {
    label: 'Performance', icon: Gauge, color: 'text-[var(--violet)]', bg: 'bg-[var(--violet)]/10',
    description: 'Profiles CPU and memory usage from code structure, measures estimated latency and throughput, and recommends optimizations.',
    capabilities: ['Code complexity analysis', 'Memory profiling', 'Latency estimation', 'Throughput benchmarking', 'Optimization tips'],
  },
};

export function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgentName>('supervisor');

  const load = useCallback(async () => {
    const { data } = await supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(100);
    setRuns((data || []) as AgentRun[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_runs' }, load)
      .subscribe();
    const interval = setInterval(load, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [load]);

  const agentRuns = runs.filter((r) => r.agent === selected);
  const info = AGENT_INFO[selected];
  const runningCount = runs.filter((r) => r.status === 'running').length;

  return (
    <>
      <TopBar
        title="Agents"
        subtitle="Multi-agent architecture and execution history"
        actions={
          runningCount > 0 ? (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--accent)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
              {runningCount} running
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-mute)]">
              <Activity size={12} /> Idle
            </span>
          )
        }
      />
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        {/* Agent cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
          {(Object.keys(AGENT_INFO) as AgentName[]).map((name) => {
            const a = AGENT_INFO[name];
            const Icon = a.icon;
            const count = runs.filter((r) => r.agent === name).length;
            const active = selected === name;
            const isRunning = runs.some((r) => r.agent === name && r.status === 'running');
            return (
              <button
                key={name}
                onClick={() => setSelected(name)}
                className={`panel p-3.5 text-left panel-hover relative ${active ? 'border-[var(--accent)]/30' : ''}`}
              >
                {isRunning && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
                )}
                <div className={`w-9 h-9 rounded-[6px] flex items-center justify-center mb-2 ${a.bg} transition-transform ${active ? 'scale-105' : ''}`}>
                  <Icon size={17} className={a.color} />
                </div>
                <p className="text-[12px] font-semibold text-[var(--text)]">{a.label}</p>
                <p className="text-[9.5px] text-[var(--text-mute)] mt-0.5">{count} runs</p>
                {active && <p className="text-[9.5px] text-[var(--accent)] mt-1 flex items-center gap-0.5 font-medium"><Zap size={9} /> Selected</p>}
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="panel p-4 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center ${info.bg}`}>
                <info.icon size={20} className={info.color} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text)]">{info.label} Agent</h3>
                <p className="text-[10px] text-[var(--text-mute)] flex items-center gap-1 mt-0.5"><Network size={9} /> LangGraph node</p>
              </div>
            </div>
            <p className="text-[11.5px] text-[var(--text-dim)] leading-relaxed mb-4">{info.description}</p>
            <div>
              <p className="section-label mb-2">Capabilities</p>
              <div className="space-y-1.5">
                {info.capabilities.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${info.color.replace('text-', 'bg-')}`} />
                    <span className="text-[11.5px] text-[var(--text-dim)]">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12.5px] font-semibold text-[var(--text)]">{info.label} Run History</h3>
              <span className="text-[10.5px] text-[var(--text-mute)]">{agentRuns.length} runs</span>
            </div>
            {loading ? <LoadingSpinner /> : agentRuns.length === 0 ? (
              <p className="text-[11.5px] text-[var(--text-mute)] py-8 text-center">No runs yet for this agent.</p>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto thin-scroll">
                {agentRuns.map((r) => (
                  <div key={r.id} className="panel-2 p-2.5 panel-hover fade-in">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[11.5px] font-medium text-[var(--text)]">{r.action}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center gap-2 text-[9.5px] text-[var(--text-mute)]">
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      {r.duration_ms != null && <span>· {r.duration_ms}ms</span>}
                    </div>
                    {r.output && <p className="text-[10.5px] text-[var(--text-dim)] mt-2 line-clamp-3 leading-relaxed">{r.output}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

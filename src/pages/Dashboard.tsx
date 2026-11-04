import { useEffect, useState, useRef, useCallback } from 'react';
import {
  FolderGit2, Cpu, Code2, TestTube2, ShieldCheck, Gauge,
  Activity, CheckCircle2, AlertTriangle, Zap, ArrowRight, Bot, Terminal,
  Circle, Dot,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, StatusBadge, EmptyState, LoadingSpinner } from '../components/Layout';
import { useCountUp } from '../lib/hooks';
import type { Page } from '../App';
import type { Project, AgentRun, ExecutionLog } from '../lib/types';
import type { LucideIcon } from 'lucide-react';

const agentIcons: Record<string, LucideIcon> = {
  supervisor: Cpu, coder: Code2, tester: TestTube2, security: ShieldCheck, performance: Gauge,
};

const agentTint: Record<string, string> = {
  supervisor: 'text-[var(--sky)] bg-[var(--sky)]/10',
  coder: 'text-[var(--emerald)] bg-[var(--emerald)]/10',
  tester: 'text-[var(--amber)] bg-[var(--amber)]/10',
  security: 'text-[var(--rose)] bg-[var(--rose)]/10',
  performance: 'text-[var(--violet)] bg-[var(--violet)]/10',
};

const logLevelText: Record<string, string> = {
  info: 'text-[var(--sky)]', success: 'text-[var(--emerald)]', warning: 'text-[var(--amber)]', error: 'text-[var(--rose)]',
};
const logLevelDot: Record<string, string> = {
  info: 'bg-[var(--sky)]', success: 'bg-[var(--emerald)]', warning: 'bg-[var(--amber)]', error: 'bg-[var(--rose)]',
};

const STAGES = ['drafting', 'analyzing', 'generating', 'executing', 'healing', 'completed'] as const;

function stageIndex(status: string): number {
  return STAGES.indexOf(status as typeof STAGES[number]);
}

export function DashboardPage({ onNavigate }: { onNavigate: (p: Page, id?: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [recentLogs, setRecentLogs] = useState<ExecutionLog[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, inProgress: 0, selfHealed: 0, artifacts: 0 });
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(0);

  const fetchData = useCallback(async () => {
    const [{ data: projs }, { data: runs }, { data: logs }, { count: artifacts }, { count: healed }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(8),
      supabase.from('execution_logs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('code_artifacts').select('*', { count: 'exact', head: true }),
      supabase.from('bug_fixes').select('*', { count: 'exact', head: true }).eq('retry_status', 'fixed'),
    ]);
    const p = (projs || []) as Project[];
    setProjects(p);
    setRecentRuns((runs || []) as AgentRun[]);
    setRecentLogs((logs || []) as ExecutionLog[]);
    setStats({
      total: p.length,
      completed: p.filter((x) => x.status === 'completed').length,
      failed: p.filter((x) => x.status === 'failed').length,
      inProgress: p.filter((x) => ['analyzing', 'generating', 'executing', 'healing'].includes(x.status)).length,
      selfHealed: healed || 0,
      artifacts: artifacts || 0,
    });
    // Determine most active stage from in-progress projects
    const inProg = p.filter((x) => !['completed', 'failed'].includes(x.status));
    if (inProg.length > 0) {
      const maxStage = inProg.reduce((max, x) => Math.max(max, stageIndex(x.status)), 0);
      if (maxStage >= 0) setActiveStage(maxStage);
    } else if (p.length > 0) {
      setActiveStage(5); // completed
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Realtime: refresh on any table change
    const ch = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_runs' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_logs' }, fetchData)
      .subscribe();
    const interval = setInterval(fetchData, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [fetchData]);

  if (loading) return <><TopBar title="Dashboard" /><LoadingSpinner label="Loading..." /></>;
  if (projects.length === 0) {
    return (
      <>
        <TopBar title="Dashboard" subtitle="Agent activity overview" />
        <div className="p-6">
          <EmptyState icon={Bot} title="No projects yet" message="Create your first project from natural-language requirements to see Helix Agents in action." />
          <div className="flex justify-center mt-3">
            <button onClick={() => onNavigate('projects')} className="btn btn-primary">
              Create Project <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dashboard" subtitle="Agent activity and system health" />
      <div className="p-6 space-y-4 overflow-y-auto fade-in">
        {/* Stat row — animated counters */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
          <StatCard icon={FolderGit2} label="Projects" target={stats.total} tint="text-[var(--sky)] bg-[var(--sky)]/10" onClick={() => onNavigate('projects')} />
          <StatCard icon={CheckCircle2} label="Completed" target={stats.completed} tint="text-[var(--emerald)] bg-[var(--emerald)]/10" onClick={() => onNavigate('projects')} />
          <StatCard icon={Activity} label="In Progress" target={stats.inProgress} tint="text-[var(--amber)] bg-[var(--amber)]/10" onClick={() => onNavigate('projects')} />
          <StatCard icon={Zap} label="Self-Healed" target={stats.selfHealed} tint="text-[var(--violet)] bg-[var(--violet)]/10" onClick={() => onNavigate('projects')} />
          <StatCard icon={Code2} label="Artifacts" target={stats.artifacts} tint="text-[var(--emerald)] bg-[var(--emerald)]/10" onClick={() => onNavigate('projects')} />
          <StatCard icon={AlertTriangle} label="Failed" target={stats.failed} tint="text-[var(--rose)] bg-[var(--rose)]/10" onClick={() => onNavigate('projects')} />
        </div>

        {/* Pipeline stage visualization */}
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12.5px] font-semibold text-[var(--text)]">Pipeline Stages</h3>
            <span className="text-[10px] text-[var(--text-mute)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] pulse-dot" /> Live
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(['drafting', 'analyzing', 'generating', 'executing', 'healing', 'completed'] as const).map((stage, i) => {
              const reached = i <= activeStage;
              const isCurrent = i === activeStage;
              const isLast = i === STAGES.length - 1;
              const stageColor = ['var(--text-mute)', 'var(--accent)', 'var(--emerald)', 'var(--amber)', 'var(--violet)', 'var(--emerald)'][i];
              return (
                <div key={stage} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => onNavigate('projects')}
                    className="flex flex-col items-center gap-1.5 group flex-1"
                  >
                    <div
                      className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                        reached ? '' : 'bg-[var(--panel-3)]'
                      }`}
                      style={reached ? { background: `var(--stage-bg, ${stageColor}20)`, border: `1.5px solid ${stageColor}` } : { border: '1.5px solid var(--border)' }}
                    >
                      {isCurrent && (
                        <span
                          className="absolute inset-0 rounded-full opacity-30 pulse-dot"
                          style={{ background: stageColor }}
                        />
                      )}
                      {reached ? (
                        <Circle size={8} className="fill-current" style={{ color: stageColor }} />
                      ) : (
                        <Dot size={14} className="text-[var(--text-mute)]" />
                      )}
                    </div>
                    <span
                      className={`text-[9.5px] font-medium capitalize transition-colors ${reached ? 'text-[var(--text)]' : 'text-[var(--text-mute)]'} group-hover:text-[var(--accent)]`}
                    >
                      {stage}
                    </span>
                  </button>
                  {!isLast && (
                    <div className="h-0.5 w-full mx-0.5 rounded-full bg-[var(--panel-3)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${i < activeStage ? 'w-full' : 'w-0'}`}
                        style={{ background: reached && i < activeStage ? stageColor : 'transparent' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agent roster */}
          <div className="panel p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12.5px] font-semibold text-[var(--text)]">Agent Roster</h3>
              <button onClick={() => onNavigate('agents')} className="text-[11px] text-[var(--text-mute)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                View all <ArrowRight size={10} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['supervisor', 'coder', 'tester', 'security', 'performance'] as const).map((a) => {
                const Icon = agentIcons[a];
                const count = recentRuns.filter((r) => r.agent === a).length;
                const isRunning = recentRuns.some((r) => r.agent === a && r.status === 'running');
                return (
                  <button
                    key={a}
                    onClick={() => onNavigate('agents')}
                    className="panel-2 p-3 text-left panel-hover relative overflow-hidden"
                  >
                    <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center mb-2 ${agentTint[a]} transition-transform hover:scale-110`}>
                      <Icon size={15} />
                    </div>
                    <p className="text-[11.5px] font-medium text-[var(--text)] capitalize">{a}</p>
                    <p className="text-[9.5px] text-[var(--text-mute)] mt-0.5">{count} runs</p>
                    {isRunning && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent projects */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12.5px] font-semibold text-[var(--text)]">Recent Projects</h3>
              <button onClick={() => onNavigate('projects')} className="text-[11px] text-[var(--text-mute)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                All <ArrowRight size={10} />
              </button>
            </div>
            <div className="space-y-1.5">
              {projects.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onNavigate('project', p.id)}
                  className="w-full panel-2 p-2.5 text-left panel-hover group"
                >
                  <p className="text-[11.5px] font-medium text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors mb-1.5">{p.title}</p>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={p.status} />
                    <span className="text-[9.5px] text-[var(--text-mute)]">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live log feed — auto-updates */}
        <LiveActivityFeed logs={recentLogs} />
      </div>
    </>
  );
}

function LiveActivityFeed({ logs }: { logs: ExecutionLog[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[12.5px] font-semibold text-[var(--text)] flex items-center gap-2">
          <Terminal size={13} className="text-[var(--text-mute)]" /> Activity Feed
        </h3>
        <span className="text-[10px] text-[var(--text-mute)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] pulse-dot" /> Live
        </span>
      </div>
      {logs.length === 0 ? (
        <p className="text-[11.5px] text-[var(--text-mute)] py-3">No activity yet.</p>
      ) : (
        <div ref={scrollRef} className="space-y-0 mono text-[11px] max-h-56 overflow-y-auto thin-scroll">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 py-[5px] border-b border-[var(--border)]/30 last:border-0 fade-in">
              <span className="text-[var(--text-mute)] shrink-0 w-16 text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-[5px] ${logLevelDot[log.level]}`} />
              <span className={`shrink-0 font-semibold uppercase w-12 text-[9.5px] ${logLevelText[log.level]}`}>{log.level}</span>
              <span className="text-[var(--text-dim)] break-all">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, target, tint, onClick }: { icon: LucideIcon; label: string; target: number; tint: string; onClick?: () => void }) {
  const value = useCountUp(target);
  return (
    <button onClick={onClick} className="panel p-3 panel-hover text-left">
      <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center mb-2 ${tint}`}>
        <Icon size={14} />
      </div>
      <p className="text-[20px] font-bold text-[var(--text)] leading-none">{value}</p>
      <p className="text-[9.5px] text-[var(--text-mute)] mt-1.5 font-medium">{label}</p>
    </button>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Cpu, Code2, TestTube2, ShieldCheck, Gauge,
  FileCode2, Bug, ShieldAlert, Activity, Copy, Check, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, StatusBadge, LoadingSpinner, EmptyState } from '../components/Layout';
import type { Page } from '../App';
import type { Project, Task, AgentRun, CodeArtifact, ExecutionLog, BugFix } from '../lib/types';
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

type Tab = 'overview' | 'tasks' | 'code' | 'logs' | 'healing' | 'agents';

export function ProjectDetailPage({ projectId, onNavigate }: { projectId: string; onNavigate: (p: Page, id?: string) => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [artifacts, setArtifacts] = useState<CodeArtifact[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [bugFixes, setBugFixes] = useState<BugFix[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: t }, { data: r }, { data: a }, { data: l }, { data: b }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('tasks').select('*').eq('project_id', projectId).order('order_index', { ascending: true }),
      supabase.from('agent_runs').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('code_artifacts').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('execution_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('bug_fixes').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
    ]);
    setProject(p as Project);
    setTasks((t || []) as Task[]);
    setRuns((r || []) as AgentRun[]);
    setArtifacts((a || []) as CodeArtifact[]);
    setLogs((l || []) as ExecutionLog[]);
    setBugFixes((b || []) as BugFix[]);
    if (a && a.length > 0 && !selectedArtifact) setSelectedArtifact((a as CodeArtifact[])[0].id);
    setLoading(false);
  }, [projectId, selectedArtifact]);

  useEffect(() => {
    setLoading(true);
    load();
    const ch = supabase.channel(`project-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_runs', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_artifacts', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_logs', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bug_fixes', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    const interval = setInterval(load, 4000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) return <><TopBar title="Project" /><LoadingSpinner label="Loading..." /></>;
  if (!project) return <><TopBar title="Project" /><EmptyState icon={Code2} title="Project not found" message="This project may have been deleted." /></>;

  const tabs: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'tasks', label: 'Task Graph', icon: Cpu },
    { id: 'code', label: 'Artifacts', icon: FileCode2, count: artifacts.length },
    { id: 'logs', label: 'Logs', icon: Code2 },
    { id: 'healing', label: 'Self-Healing', icon: Bug, count: bugFixes.length },
    { id: 'agents', label: 'Agent Runs', icon: TestTube2 },
  ];

  function copyContent(filename: string, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 1500);
  }

  const activeArtifact = artifacts.find((a) => a.id === selectedArtifact) || artifacts[0];

  return (
    <>
      <TopBar
        title={project.title}
        subtitle={`${project.status} · ${tasks.filter(t => t.status === 'completed').length}/${tasks.length} tasks`}
        actions={<button onClick={() => onNavigate('projects')} className="btn btn-ghost"><ArrowLeft size={14} /> Back</button>}
      />
      <div className="flex border-b border-[var(--border)] px-6 gap-0.5 shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-medium border-b-2 transition-all ${
                tab === t.id ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--text-mute)] hover:text-[var(--text-dim)]'
              }`}
            >
              <Icon size={12} /> {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--panel-3)] text-[var(--text-dim)]">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 fade-in">
        {tab === 'overview' && <OverviewTab project={project} tasks={tasks} runs={runs} logs={logs} bugFixes={bugFixes} />}
        {tab === 'tasks' && <TasksTab tasks={tasks} />}
        {tab === 'code' && (
          artifacts.length === 0 ? <EmptyState icon={FileCode2} title="No artifacts yet" message="Generated code files will appear here once the Coder agent runs." /> :
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <p className="section-label mb-2">Files · {artifacts.length}</p>
              <div className="space-y-0.5">
                {artifacts.map((a) => {
                  const isActive = (activeArtifact?.id === a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedArtifact(a.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-left transition-all ${
                        isActive ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' : 'hover:bg-[var(--panel-2)] border border-transparent'
                      }`}
                    >
                      <FileCode2 size={13} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--emerald)]'} />
                      <div className="min-w-0">
                        <p className={`text-[11.5px] font-medium truncate ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{a.filename}</p>
                        <p className="text-[8.5px] text-[var(--text-mute)] uppercase mt-0.5">{a.artifact_type}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="lg:col-span-3">
              {activeArtifact && (
                <div className="panel overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 h-[40px] border-b border-[var(--border)] bg-[var(--panel-2)]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--rose)]/50" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--amber)]/50" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--emerald)]/50" />
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text)] ml-1.5 mono">{activeArtifact.filename}</span>
                    </div>
                    <button onClick={() => copyContent(activeArtifact.filename, activeArtifact.content)} className="text-[var(--text-mute)] hover:text-[var(--text)] transition-colors p-1 rounded hover:bg-[var(--panel-3)]">
                      {copiedFile === activeArtifact.filename ? <Check size={13} className="text-[var(--emerald)]" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto mono thin-scroll">
                    <pre className="text-[11.5px] leading-[1.65]">
                      {activeArtifact.content.split('\n').map((line, i) => (
                        <div key={i} className="flex hover:bg-[var(--panel-2)]/40">
                          <span className="text-[var(--text-mute)]/35 text-right pr-3.5 pl-3.5 select-none w-12 shrink-0 text-[10.5px] pt-px">{i + 1}</span>
                          <span className="text-[var(--text-dim)] whitespace-pre pr-5 flex-1">{line || ' '}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'logs' && (
          logs.length === 0 ? <EmptyState icon={Code2} title="No logs yet" message="Execution logs from sandbox runs will appear here." /> :
          <div className="panel p-3 text-[11px] space-y-0 max-h-[600px] overflow-y-auto mono thin-scroll">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-2.5 py-[7px] border-b border-[var(--border)]/25 last:border-0">
                <span className="text-[var(--text-mute)] shrink-0 w-20 text-[10px]">{new Date(l.created_at).toLocaleTimeString()}</span>
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-[5px] ${logLevelDot[l.level]}`} />
                <span className={`shrink-0 font-semibold uppercase w-12 text-[9.5px] ${logLevelText[l.level]}`}>{l.level}</span>
                <span className="text-[var(--text-dim)] break-all whitespace-pre-wrap flex-1">{l.message}</span>
                {l.exit_code !== null && <span className={`shrink-0 text-[9.5px] font-semibold ${l.exit_code === 0 ? 'text-[var(--emerald)]' : 'text-[var(--rose)]'}`}>exit {l.exit_code}</span>}
              </div>
            ))}
          </div>
        )}
        {tab === 'healing' && (
          bugFixes.length === 0 ? <EmptyState icon={Bug} title="No self-healing events" message="When Helix Agents detects a test failure, it will automatically diagnose, patch, and retry here." /> :
          <div className="space-y-2.5 max-w-3xl">
            {bugFixes.map((b) => (
              <div key={b.id} className="panel p-4 fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[6px] bg-[var(--violet)]/10 flex items-center justify-center">
                      <Bug size={15} className="text-[var(--violet)]" />
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--text)]">Self-Healing Attempt #{b.attempt_number}</span>
                  </div>
                  <StatusBadge status={b.retry_status} />
                </div>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--rose)] font-semibold mb-1">Detected Error</p>
                    <pre className="panel-2 p-2.5 text-[11px] text-[var(--rose)]/90 whitespace-pre-wrap overflow-x-auto mono">{b.error_message}</pre>
                  </div>
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--amber)] font-semibold mb-1">Diagnosis</p>
                    <p className="text-[11.5px] text-[var(--text-dim)] leading-relaxed">{b.diagnosis}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--emerald)] font-semibold mb-1">Fix Applied</p>
                    <p className="text-[11.5px] text-[var(--text-dim)] leading-relaxed">{b.fix_applied}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'agents' && (
          runs.length === 0 ? <EmptyState icon={Cpu} title="No agent runs yet" message="Agent execution history will appear here once the pipeline starts." /> :
          <div className="space-y-2 max-w-3xl">
            {runs.map((r) => {
              const Icon = agentIcons[r.agent];
              return (
                <div key={r.id} className="panel p-3.5 fade-in">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${agentTint[r.agent]}`}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <p className="text-[12.5px] font-semibold text-[var(--text)] capitalize">{r.agent} <span className="text-[var(--text-mute)] font-normal">·</span> {r.action}</p>
                        <p className="text-[9.5px] text-[var(--text-mute)] flex items-center gap-1.5 mt-0.5">
                          <Clock size={9} /> {new Date(r.created_at).toLocaleTimeString()}
                          {r.duration_ms != null && <><span>·</span> <span>{r.duration_ms}ms</span></>}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.output && <p className="text-[11px] text-[var(--text-dim)] mt-2.5 panel-2 p-2.5 leading-relaxed">{r.output}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function OverviewTab({ project, tasks, runs, logs, bugFixes }: { project: Project; tasks: Task[]; runs: AgentRun[]; logs: ExecutionLog[]; bugFixes: BugFix[] }) {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const errorLogs = logs.filter((l) => l.level === 'error').length;
  const healedCount = bugFixes.filter((b) => b.retry_status === 'fixed').length;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12.5px] font-semibold text-[var(--text)]">Pipeline Progress</h3>
          <StatusBadge status={project.status} />
        </div>
        <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border)]">
          <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-700 progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-[var(--text-mute)] mt-2">{completedTasks} of {tasks.length} tasks completed ({progress}%)</p>
      </div>

      <div className="panel p-4">
        <h3 className="text-[12.5px] font-semibold text-[var(--text)] mb-2.5">Original Requirements</h3>
        <p className="text-[12.5px] text-[var(--text-dim)] whitespace-pre-wrap leading-relaxed">{project.requirements}</p>
        {project.description && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="section-label mb-1">Description</p>
            <p className="text-[11.5px] text-[var(--text-dim)] leading-relaxed">{project.description}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <MiniStat label="Agent Runs" value={runs.length} color="text-[var(--sky)]" icon={Cpu} />
        <MiniStat label="Log Entries" value={logs.length} color="text-[var(--emerald)]" icon={Activity} />
        <MiniStat label="Errors" value={errorLogs} color="text-[var(--rose)]" icon={Bug} />
        <MiniStat label="Self-Healed" value={healedCount} color="text-[var(--violet)]" icon={ShieldAlert} />
      </div>

      {logs.length > 0 && (
        <div className="panel p-4">
          <h3 className="text-[12.5px] font-semibold text-[var(--text)] mb-2">Recent Activity</h3>
          <div className="text-[11px] space-y-0 max-h-48 overflow-y-auto mono thin-scroll">
            {logs.slice(-8).reverse().map((l) => (
              <div key={l.id} className="flex items-start gap-2.5 py-1.5">
                <span className="text-[var(--text-mute)] shrink-0 w-16 text-[10px]">{new Date(l.created_at).toLocaleTimeString()}</span>
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-[5px] ${logLevelDot[l.level]}`} />
                <span className={`shrink-0 font-semibold uppercase w-12 text-[9.5px] ${logLevelText[l.level]}`}>{l.level}</span>
                <span className="text-[var(--text-dim)] break-all">{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <EmptyState icon={Cpu} title="No tasks yet" message="The Supervisor agent will decompose requirements into a task graph here." />;
  return (
    <div className="space-y-1.5 max-w-3xl">
      {tasks.map((t) => {
        const Icon = agentIcons[t.agent];
        return (
          <div key={t.id} className="panel p-3.5 flex items-start gap-3 panel-hover fade-in">
            <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 ${agentTint[t.agent]}`}>
              <Icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[12.5px] font-semibold text-[var(--text)]">{t.title}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{t.description}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9.5px] text-[var(--text-mute)] uppercase tracking-[0.05em] font-medium">{t.type}</span>
                <span className="text-[var(--text-mute)]/30 text-[9.5px]">·</span>
                <span className="text-[9.5px] text-[var(--text-mute)] uppercase tracking-[0.05em] font-medium">{t.agent}</span>
                <span className="text-[var(--text-mute)]/30 text-[9.5px]">·</span>
                <span className="text-[9.5px] text-[var(--text-mute)] uppercase tracking-[0.05em] font-medium">step {t.order_index + 1}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: LucideIcon }) {
  return (
    <div className="panel p-3 panel-hover">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className={color} />
        <span className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--text-mute)] font-medium">{label}</span>
      </div>
      <p className="text-[18px] font-bold text-[var(--text)] leading-none">{value}</p>
    </div>
  );
}

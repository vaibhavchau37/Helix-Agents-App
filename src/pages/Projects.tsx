import { useEffect, useState, useCallback } from 'react';
import { Plus, FolderGit2, ArrowRight, X, Loader2, Sparkles, FileText, Trash2, MoreVertical, Copy, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TopBar, StatusBadge, EmptyState, LoadingSpinner } from '../components/Layout';
import { createProject, runProjectPipeline, deleteProject, deleteProjectArtifacts } from '../lib/agentEngine';
import { useToast } from '../lib/toast';
import { useAuth, canManage } from '../lib/auth';
import type { Page } from '../App';
import type { Project } from '../lib/types';

const SAMPLE_REQUIREMENTS = [
  'Build a FastAPI REST API for a task management app with CRUD endpoints, JWT auth, and SQLAlchemy models. Include a PostgreSQL database and Docker support.',
  'Create an Express.js backend for an e-commerce checkout with cart management, Stripe payment integration, and inventory tracking. Include unit tests.',
  'Build a real-time chat application using Node.js with WebSocket support, user presence, message history, and a React frontend.',
  'Create a Python data pipeline that ingests CSV files, validates schemas, transforms data, and loads into PostgreSQL. Include tests and Docker config.',
];

export function ProjectsPage({ onNavigate, forceCreateModal, onClearForceModal }: { onNavigate: (p: Page, id?: string) => void; forceCreateModal?: boolean; onClearForceModal?: () => void }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const canEdit = canManage(profile?.role ?? null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects((data || []) as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription + poll
  useEffect(() => {
    const ch = supabase.channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => load())
      .subscribe();
    const interval = setInterval(load, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [load]);

  // Open modal from command palette
  useEffect(() => {
    if (forceCreateModal) {
      setShowModal(true);
      onClearForceModal?.();
    }
  }, [forceCreateModal, onClearForceModal]);

  async function handleCreate(title: string, description: string, requirements: string) {
    const id = await createProject(title, description, requirements);
    setShowModal(false);
    setPipelineRunning(id);
    setPipelineLog([]);
    setProjects((prev) => [{ id, title: title || requirements.slice(0, 40), description, requirements, status: 'drafting', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
    const toastId = toast('Launching Helix Agents pipeline...', 'loading');
    try {
      await runProjectPipeline(id, (msg) => setPipelineLog((prev) => [...prev, msg]));
      await load();
      toast.update(toastId, 'Pipeline completed successfully!', 'success');
    } catch (e) {
      toast.update(toastId, 'Pipeline failed. Check logs for details.', 'error');
      console.error(e);
    }
    setPipelineRunning(null);
  }

  async function handleDelete(id: string, title: string) {
    setMenuOpen(null);
    await deleteProjectArtifacts(id);
    await deleteProject(id);
    await load();
    toast(`Deleted "${title}"`, 'success');
  }

  async function handleCopyReq(id: string, req: string) {
    setMenuOpen(null);
    navigator.clipboard.writeText(req);
    toast('Requirements copied to clipboard', 'info');
  }

  const filtered = search
    ? projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.requirements.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <>
      <TopBar
        title="Projects"
        subtitle="Generate software from natural language"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                className="input pl-3 pr-8 py-1.5 text-[11.5px] w-40"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-mute)] hover:text-[var(--text)]">
                  <X size={12} />
                </button>
              )}
            </div>
            canEdit ? (
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus size={14} /> New Project
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[10.5px] text-[var(--text-mute)] px-2">
                <Lock size={11} /> Read-only
              </span>
            )
          </div>
        }
      />
      <div className="p-6 overflow-y-auto fade-in">
        {loading ? <LoadingSpinner label="Loading..." /> :
          filtered.length === 0 ? (
            <EmptyState icon={FolderGit2} title={search ? "No matches found" : "No projects yet"} message={search ? "Try a different search term." : "Describe what you want to build and Helix Agents will design, code, test, and secure it automatically."} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="panel p-4 panel-hover group fade-in relative"
                >
                  <button
                    onClick={() => onNavigate('project', p.id)}
                    disabled={pipelineRunning === p.id}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <div className="w-8 h-8 rounded-[6px] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                        <FolderGit2 size={15} className="text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[12.5px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-snug">{p.title}</h3>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-dim)] line-clamp-2 mb-3 min-h-[2.25rem] leading-relaxed">{p.description || p.requirements.slice(0, 100)}</p>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={p.status} />
                      {pipelineRunning === p.id ? (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--accent)] font-medium">
                          <Loader2 size={11} className="spin-slow" /> Running
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-[var(--text-mute)]">{new Date(p.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </button>
                  {/* Context menu trigger */}
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-mute)] hover:text-[var(--text)] hover:bg-[var(--panel-3)]"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {menuOpen === p.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-7 panel glass z-20 py-1 min-w-[140px] fade-in-fast">
                          <button
                            onClick={() => { setMenuOpen(null); onNavigate('project', p.id); }}
                            className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-2)] flex items-center gap-2"
                          >
                            <ArrowRight size={12} /> Open
                          </button>
                          <button
                            onClick={() => handleCopyReq(p.id, p.requirements)}
                            className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-2)] flex items-center gap-2"
                          >
                            <Copy size={12} /> Copy requirements
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleDelete(p.id, p.title)}
                              className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--rose)] hover:bg-[var(--rose)]/10 flex items-center gap-2"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
        {pipelineRunning && <PipelineOverlay log={pipelineLog} />}
      </div>
      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </>
  );
}

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, desc: string, req: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    if (!requirements.trim()) return;
    setSubmitting(true);
    onCreate(title.trim(), description.trim(), requirements.trim());
  }

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto glass" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-[48px] border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <h2 className="text-[13px] font-semibold text-[var(--text)]">New Project</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-mute)] hover:text-[var(--text)] transition-colors w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--panel-3)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10.5px] font-medium text-[var(--text-dim)] mb-1.5 block">Title <span className="text-[var(--text-mute)]">(optional)</span></label>
            <input className="input" placeholder="e.g. Task Manager API" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-[var(--text-dim)] mb-1.5 block">Short Description <span className="text-[var(--text-mute)]">(optional)</span></label>
            <input className="input" placeholder="A brief summary" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-[var(--text-dim)] mb-1.5 block">Requirements <span className="text-[var(--rose)]">*</span></label>
            <textarea
              className="input min-h-[130px] resize-y"
              placeholder="Describe what you want to build in plain English. Helix Agents will break it into tasks, generate code, run tests, and self-heal failures..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
            <div className="mt-2.5">
              <p className="text-[10px] text-[var(--text-mute)] mb-1.5 flex items-center gap-1"><FileText size={10} /> Sample prompts:</p>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_REQUIREMENTS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setRequirements(s); setTitle(''); setDescription(''); }}
                    className="text-[10.5px] px-2.5 py-1 rounded-[5px] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all"
                  >
                    Sample {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 h-[52px] border-t border-[var(--border)]">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={!requirements.trim() || submitting} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={14} className="spin-slow" /> : <Sparkles size={14} />}
            Launch Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}

function PipelineOverlay({ log }: { log: string[] }) {
  return (
    <div className="fixed bottom-5 right-5 panel w-80 max-w-[calc(100vw-2.5rem)] z-40 glass slide-in-right">
      <div className="flex items-center gap-2 px-4 h-[40px] border-b border-[var(--border)]">
        <Loader2 size={13} className="spin-slow text-[var(--accent)]" />
        <h3 className="text-[12px] font-semibold text-[var(--text)]">Pipeline Running</h3>
      </div>
      <div className="p-3.5 max-h-64 overflow-y-auto space-y-1 mono thin-scroll">
        {log.length === 0 ? (
          <p className="text-[var(--text-mute)] text-[10.5px]">Initializing agents...</p>
        ) : (
          log.map((l, i) => (
            <div key={i} className="text-[10.5px] text-[var(--text-dim)] fade-in flex items-start gap-1.5 leading-relaxed">
              <ArrowRight size={10} className="text-[var(--accent)] mt-0.5 shrink-0" />
              <span>{l}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

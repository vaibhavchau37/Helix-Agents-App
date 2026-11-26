import { useEffect, useState, useRef } from 'react';
import {
  Cpu, Code2, TestTube2, ShieldCheck, Gauge,
  LayoutDashboard, FolderGit2, ScrollText, Brain,
  ShieldAlert, BarChart3, Bot, Users, Crown, UserCog,
  LogOut, ChevronDown, TrendingUp,
} from 'lucide-react';
import type { Page } from '../App';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, isOwner } from '../lib/auth';
import type { Role } from '../lib/auth';

const iconMap: Record<string, LucideIcon> = {
  Cpu, Code2, TestTube2, ShieldCheck, Gauge,
  LayoutDashboard, FolderGit2, ScrollText, Brain,
  ShieldAlert, BarChart3, Bot, TrendingUp,
};

const navItems: { page: Page; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { page: 'projects', label: 'Projects', icon: 'FolderGit2' },
  { page: 'agents', label: 'Agents', icon: 'Bot' },
  { page: 'market-pulse', label: 'Market Pulse', icon: 'TrendingUp' },
  { page: 'logs', label: 'Logs', icon: 'ScrollText' },
  { page: 'memory', label: 'Memory', icon: 'Brain' },
  { page: 'security', label: 'Security', icon: 'ShieldAlert' },
  { page: 'analytics', label: 'Analytics', icon: 'BarChart3' },
];

const roleConfig: Record<Role, { icon: LucideIcon; label: string; color: string }> = {
  owner: { icon: Crown, label: 'Owner', color: 'text-[var(--amber)]' },
  admin: { icon: UserCog, label: 'Admin', color: 'text-[var(--accent)]' },
  user: { icon: Bot, label: 'User', color: 'text-[var(--text-mute)]' },
};

export function Sidebar({ current, onNavigate }: { current: Page; onNavigate: (p: Page) => void }) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const role = profile?.role ?? 'user';
  const RoleIcon = roleConfig[role].icon;

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  return (
    <aside className="w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col h-full">
      {/* Logo / brand */}
      <div className="flex items-center gap-2 px-4 h-[52px] border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-[6px] bg-[var(--accent)] flex items-center justify-center">
          <Bot size={15} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[12.5px] font-semibold tracking-tight text-[var(--text)] leading-none">Helix Agents</span>
          <span className="text-[9px] text-[var(--text-mute)] mt-0.5 leading-none">Autonomous Engineer</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 mt-1.5 mb-1">Workspace</p>
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = current === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`w-full flex items-center gap-2.5 px-2 py-[7px] rounded-[5px] text-[12.5px] font-medium transition-all duration-100 ${
                active
                  ? 'bg-[var(--panel-3)] text-[var(--text)]'
                  : 'text-[var(--text-mute)] hover:text-[var(--text)] hover:bg-[var(--panel-2)]'
              }`}
            >
              <Icon size={15} className={active ? 'text-[var(--accent)]' : ''} />
              {item.label}
            </button>
          );
        })}

        {/* Admin section — only for owner */}
        {isOwner(role) && (
          <>
            <p className="section-label px-2 mt-3 mb-1">Administration</p>
            <button
              onClick={() => onNavigate('users')}
              className={`w-full flex items-center gap-2.5 px-2 py-[7px] rounded-[5px] text-[12.5px] font-medium transition-all duration-100 ${
                current === 'users'
                  ? 'bg-[var(--panel-3)] text-[var(--text)]'
                  : 'text-[var(--text-mute)] hover:text-[var(--text)] hover:bg-[var(--panel-2)]'
              }`}
            >
              <Users size={15} className={current === 'users' ? 'text-[var(--accent)]' : ''} />
              User Management
            </button>
          </>
        )}
      </nav>

      {/* User card + status footer */}
      <div className="px-2 pb-2 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-1 py-1 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] pulse-dot block shrink-0" />
          <span className="text-[11px] text-[var(--text-mute)]">All systems operational</span>
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[6px] hover:bg-[var(--panel-2)] transition-all"
          >
            <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 bg-[var(--panel-3)] ${roleConfig[role].color}`}>
              <RoleIcon size={13} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11.5px] font-medium text-[var(--text)] truncate leading-none">{profile?.display_name || 'User'}</p>
              <p className={`text-[9px] mt-0.5 leading-none ${roleConfig[role].color}`}>{roleConfig[role].label}</p>
            </div>
            <ChevronDown size={13} className={`text-[var(--text-mute)] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 panel glass p-1 fade-in-fast z-50">
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[11.5px] text-[var(--text-mute)] hover:text-[var(--rose)] hover:bg-[var(--rose)]/10 transition-all"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="h-[48px] border-b border-[var(--border)] bg-[var(--bg)] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[13.5px] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {subtitle && <span className="text-[11px] text-[var(--text-mute)]">{subtitle}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    drafting: 'bg-[var(--panel-3)] text-[var(--text-dim)]',
    analyzing: 'bg-[var(--accent)]/12 text-[var(--accent)]',
    generating: 'bg-[var(--emerald)]/12 text-[var(--emerald)]',
    executing: 'bg-[var(--amber)]/12 text-[var(--amber)]',
    healing: 'bg-[var(--violet)]/12 text-[var(--violet)]',
    completed: 'bg-[var(--emerald)]/12 text-[var(--emerald)]',
    failed: 'bg-[var(--rose)]/12 text-[var(--rose)]',
    pending: 'bg-[var(--panel-3)] text-[var(--text-dim)]',
    in_progress: 'bg-[var(--accent)]/12 text-[var(--accent)]',
    queued: 'bg-[var(--panel-3)] text-[var(--text-dim)]',
    running: 'bg-[var(--accent)]/12 text-[var(--accent)]',
    open: 'bg-[var(--rose)]/12 text-[var(--rose)]',
    mitigated: 'bg-[var(--emerald)]/12 text-[var(--emerald)]',
    ignored: 'bg-[var(--panel-3)] text-[var(--text-dim)]',
    fixed: 'bg-[var(--emerald)]/12 text-[var(--emerald)]',
  };
  const label = status.replace(/_/g, ' ');
  return <span className={`badge ${map[status] || 'bg-[var(--panel-3)] text-[var(--text-dim)]'}`}>{label}</span>;
}

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-2 text-[var(--text-mute)]">
        <div className="w-4 h-4 border-2 border-[var(--border-light)] border-t-[var(--accent)] rounded-full spin-slow" />
        {label && <span className="text-[12px]">{label}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
      <div className="w-12 h-12 rounded-[8px] bg-[var(--panel-2)] border border-[var(--border)] flex items-center justify-center mb-3.5">
        <Icon size={22} className="text-[var(--text-mute)]" />
      </div>
      <h3 className="text-[13px] font-semibold text-[var(--text)] mb-1.5">{title}</h3>
      <p className="text-[12px] text-[var(--text-mute)] max-w-sm leading-relaxed">{message}</p>
    </div>
  );
}

export function useRealtime(table: string, filter?: { column: string; value: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let ch = supabase.channel(`realtime-${table}-${tick}`);
    ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: filter ? `${filter.column}=eq.${filter.value}` : undefined }, () => setTick((t) => t + 1)).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value]);
  return tick;
}

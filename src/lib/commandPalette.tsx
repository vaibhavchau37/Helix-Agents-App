import { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, FolderGit2, Bot, ScrollText, Brain, ShieldAlert, BarChart3,
  Search, ArrowRight, CornerDownLeft,
} from 'lucide-react';
import type { Page } from './App';
import type { LucideIcon } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void;
}

const navCommands: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'projects', label: 'Projects', icon: FolderGit2 },
  { page: 'agents', label: 'Agents', icon: Bot },
  { page: 'logs', label: 'Logs', icon: ScrollText },
  { page: 'memory', label: 'Memory', icon: Brain },
  { page: 'security', label: 'Security', icon: ShieldAlert },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onCreateProject,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (p: Page) => void;
  onCreateProject: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    ...navCommands.map((c) => ({
      id: c.page,
      label: `Go to ${c.label}`,
      icon: c.icon,
      action: () => { onNavigate(c.page); onClose(); },
    })),
    {
      id: 'new-project',
      label: 'Create New Project',
      icon: FolderGit2,
      action: () => { onCreateProject(); onClose(); },
    },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selected]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm fade-in-fast" />
      <div
        className="relative panel w-full max-w-md glass overflow-hidden slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3.5 h-[44px] border-b border-[var(--border)]">
          <Search size={15} className="text-[var(--text-mute)] shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-[13px] text-[var(--text)] placeholder:text-[var(--text-mute)]"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[9px] text-[var(--text-mute)] bg-[var(--panel-3)] px-1.5 py-0.5 rounded border border-[var(--border)]">ESC</kbd>
        </div>
        <div className="p-1.5 max-h-[300px] overflow-y-auto thin-scroll">
          {filtered.length === 0 ? (
            <p className="text-[11.5px] text-[var(--text-mute)] py-4 text-center">No results</p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              const isActive = i === selected;
              return (
                <button
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[5px] text-[12px] transition-all ${
                    isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  {isActive && <CornerDownLeft size={12} className="text-[var(--text-mute)]" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/** Hook that listens for Ctrl+K and toggles the palette */
export function useCommandPaletteToggle(onOpen: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}

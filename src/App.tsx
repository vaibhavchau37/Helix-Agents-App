import { useState, useCallback } from 'react';
import { Sidebar } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { ProjectsPage } from './pages/Projects';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { AgentsPage } from './pages/Agents';
import { LogsPage } from './pages/Logs';
import { MemoryPage } from './pages/Memory';
import { SecurityPage } from './pages/Security';
import { AnalyticsPage } from './pages/Analytics';
import { MarketPulsePage } from './pages/MarketPulse';
import { UsersPage } from './pages/Users';
import { AuthPage } from './pages/Auth';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { CommandPalette, useCommandPaletteToggle } from './lib/commandPalette';

export type Page = 'dashboard' | 'projects' | 'project' | 'agents' | 'market-pulse' | 'logs' | 'memory' | 'security' | 'analytics' | 'users';

function AppShell() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  function navigate(p: Page, id?: string) {
    if (p === 'project' && id) setActiveProjectId(id);
    setPage(p);
  }

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteToggle(openPalette);

  if (loading) {
    return (
      <div className="h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-mute)]">
          <div className="w-5 h-5 border-2 border-[var(--border-light)] border-t-[var(--accent)] rounded-full spin-slow" />
          <span className="text-[13px]">Loading Helix Agents...</span>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthPage />;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar current={page} onNavigate={(p) => navigate(p)} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {page === 'projects' && <ProjectsPage onNavigate={navigate} forceCreateModal={showCreateModal} onClearForceModal={() => setShowCreateModal(false)} />}
          {page === 'project' && activeProjectId && <ProjectDetailPage projectId={activeProjectId} onNavigate={navigate} />}
          {page === 'agents' && <AgentsPage />}
          {page === 'market-pulse' && <MarketPulsePage />}
          {page === 'logs' && <LogsPage />}
          {page === 'memory' && <MemoryPage />}
          {page === 'security' && <SecurityPage />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'users' && <UsersPage />}
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
        onCreateProject={() => { setShowCreateModal(true); setPage('projects'); }}
      />
    </ToastProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

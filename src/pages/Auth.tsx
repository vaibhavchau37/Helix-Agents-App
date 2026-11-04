import { useState, useEffect } from 'react';
import { Bot, Lock, Mail, User, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setError(null); }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, displayName);
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--accent)]/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--violet)]/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[380px] fade-in">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-[10px] bg-[var(--accent)] flex items-center justify-center mb-3 shadow-lg shadow-[var(--accent)]/20">
            <Bot size={24} className="text-white" />
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-[var(--text)]">Helix Agents</h1>
          <p className="text-[11px] text-[var(--text-mute)] mt-1">Autonomous Engineering Platform</p>
        </div>

        <div className="panel p-6 glass">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-[var(--panel-2)] rounded-[7px] mb-5">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-1.5 rounded-[5px] text-[12px] font-medium transition-all ${mode === 'signin' ? 'bg-[var(--panel-3)] text-[var(--text)] shadow-sm' : 'text-[var(--text-mute)] hover:text-[var(--text-dim)]'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-1.5 rounded-[5px] text-[12px] font-medium transition-all ${mode === 'signup' ? 'bg-[var(--panel-3)] text-[var(--text)] shadow-sm' : 'text-[var(--text-mute)] hover:text-[var(--text-dim)]'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] font-medium text-[var(--text-mute)] uppercase tracking-[0.06em] mb-1.5 block">Display Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-mute)]" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input pl-9"
                    placeholder="Ada Lovelace"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-medium text-[var(--text-mute)] uppercase tracking-[0.06em] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-mute)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-[var(--text-mute)] uppercase tracking-[0.06em] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-mute)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-9"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-mute)] hover:text-[var(--text)] transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--rose)] bg-[var(--rose)]/10 border border-[var(--rose)]/20 rounded-[6px] px-3 py-2 fade-in">
                <AlertCircle size={13} className="shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary w-full justify-center group mt-1"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin-slow" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {mode === 'signup' && (
            <div className="flex items-center gap-1.5 mt-4 text-[10.5px] text-[var(--text-mute)] bg-[var(--panel-2)] border border-[var(--border)] rounded-[6px] px-3 py-2">
              <ShieldCheck size={12} className="text-[var(--accent)] shrink-0" />
              The first account created becomes the Owner with full control.
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-[var(--text-mute)] mt-5">
          Helix Agents · Autonomous Multi-Agent AI Engineering
        </p>
      </div>
    </div>
  );
}

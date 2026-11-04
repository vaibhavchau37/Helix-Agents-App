import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => string;
  dismiss: (id: string) => void;
  update: (id: string, message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const toastConfig: Record<ToastType, { icon: LucideIcon; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-[var(--emerald)]' },
  error: { icon: AlertTriangle, color: 'text-[var(--rose)]' },
  info: { icon: Info, color: 'text-[var(--accent)]' },
  loading: { icon: Loader2, color: 'text-[var(--accent)]' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info'): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type !== 'loading') {
      setTimeout(() => dismiss(id), 4000);
    }
    return id;
  }, [dismiss]);

  const update = useCallback((id: string, message: string, type: ToastType) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, message, type } : t));
    if (type !== 'loading') {
      setTimeout(() => dismiss(id), 4000);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, update }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2 items-start">
        {toasts.map((t) => {
          const cfg = toastConfig[t.type];
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              className="panel px-3.5 py-2.5 flex items-center gap-2.5 glass slide-in-right min-w-[260px] max-w-[400px]"
            >
              <Icon size={15} className={`${cfg.color} ${t.type === 'loading' ? 'spin-slow' : ''} shrink-0`} />
              <span className="text-[12px] text-[var(--text)] flex-1 leading-snug">{t.message}</span>
              {t.type !== 'loading' && (
                <button onClick={() => dismiss(t.id)} className="text-[var(--text-mute)] hover:text-[var(--text)] shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

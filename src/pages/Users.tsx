import { useEffect, useState, useCallback } from 'react';
import { Users, ShieldCheck, Trash2, Crown, UserCog, ArrowUp, ArrowDown, Mail, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, isOwner } from '../lib/auth';
import { TopBar, LoadingSpinner, EmptyState, StatusBadge } from '../components/Layout';
import type { Profile, Role } from '../lib/auth';

export function UsersPage() {
  const { profile, refreshProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    setUsers((data || []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function changeRole(targetId: string, newRole: Role) {
    setBusyId(targetId);
    setError(null);
    const { error: err } = await supabase.rpc('set_user_role', { target_user_id: targetId, new_role: newRole });
    if (err) setError(err.message);
    await load();
    await refreshProfile();
    setBusyId(null);
  }

  async function deleteUser(targetId: string) {
    if (!confirm('Delete this user account? This cannot be undone.')) return;
    setBusyId(targetId);
    setError(null);
    const { error: err } = await supabase.rpc('delete_user_account', { target_user_id: targetId });
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  }

  if (!isOwner(profile?.role ?? null)) {
    return (
      <>
        <TopBar title="User Management" />
        <EmptyState icon={ShieldCheck} title="Owner access required" message="Only the owner can manage user roles and accounts. Ask your owner to promote you if you need access." />
      </>
    );
  }

  const roleIcon: Record<Role, typeof Crown> = { owner: Crown, admin: UserCog, user: Users };
  const roleColor: Record<Role, string> = {
    owner: 'text-[var(--amber)] bg-[var(--amber)]/10',
    admin: 'text-[var(--accent)] bg-[var(--accent)]/10',
    user: 'text-[var(--text-mute)] bg-[var(--panel-3)]',
  };

  return (
    <>
      <TopBar title="User Management" subtitle={`${users.length} users · Owner controls`} />
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        {error && (
          <div className="mb-3 text-[11px] text-[var(--rose)] bg-[var(--rose)]/10 border border-[var(--rose)]/20 rounded-[6px] px-3 py-2 flex items-center gap-2">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {loading ? <LoadingSpinner label="Loading users..." /> : users.length === 0 ? (
          <EmptyState icon={Users} title="No users" message="Users will appear here after they sign up." />
        ) : (
          <div className="max-w-3xl space-y-1.5">
            {users.map((u) => {
              const Icon = roleIcon[u.role];
              const isMe = u.id === profile?.id;
              return (
                <div key={u.id} className="panel p-3.5 flex items-center gap-3 panel-hover fade-in">
                  <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 ${roleColor[u.role]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-[var(--text)] truncate">{u.display_name}</p>
                      {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium">You</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px] text-[var(--text-mute)]">
                      <span className="flex items-center gap-1"><Mail size={10} /> {u.email}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className={`badge ${u.role === 'owner' ? 'bg-[var(--amber)]/12 text-[var(--amber)]' : u.role === 'admin' ? 'bg-[var(--accent)]/12 text-[var(--accent)]' : 'bg-[var(--panel-3)] text-[var(--text-dim)]'}`}>
                      {u.role}
                    </span>
                  </div>
                  {!isMe && (
                    <div className="flex items-center gap-1 shrink-0">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => changeRole(u.id, 'admin')}
                          disabled={busyId === u.id}
                          title="Promote to Admin"
                          className="p-1.5 rounded-[5px] text-[var(--text-mute)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all disabled:opacity-40"
                        >
                          <ArrowUp size={14} />
                        </button>
                      )}
                      {u.role === 'admin' && (
                        <button
                          onClick={() => changeRole(u.id, 'user')}
                          disabled={busyId === u.id}
                          title="Demote to User"
                          className="p-1.5 rounded-[5px] text-[var(--text-mute)] hover:text-[var(--amber)] hover:bg-[var(--amber)]/10 transition-all disabled:opacity-40"
                        >
                          <ArrowDown size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(u.id)}
                        disabled={busyId === u.id}
                        title="Delete user"
                        className="p-1.5 rounded-[5px] text-[var(--text-mute)] hover:text-[var(--rose)] hover:bg-[var(--rose)]/10 transition-all disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

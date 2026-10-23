import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { cloudError, parseSharedBoard, teamnoteClient, teamnoteCloudEnabled, type SharedBoard } from './teamnoteCloud';
import { ScreenSkeleton } from '../components/ScreenLoading';
import { SharedLogin } from '../components/SharedLogin';

import { SharedIdeasContext } from './sharedIdeasContext';
const community = 'h-village';
export function SharedIdeasProvider({ children }: { children: ReactNode }) {
  if (!teamnoteCloudEnabled) return children;
  return <CloudProvider>{children}</CloudProvider>;
}
function CloudProvider({ children }: { children: ReactNode }) {
  const client = teamnoteClient!;
  const [status, setStatus] = useState<'loading' | 'login' | 'join' | 'ready' | 'error'>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [board, setBoard] = useState<SharedBoard | null>(null);
  const [error, setError] = useState(''); const [connected, setConnected] = useState(false);
  const currentUid = useRef<string | null>(null); const currentBoard = useRef<SharedBoard | null>(null); const alive = useRef(true);
  const accept = useCallback((raw: unknown, uid: string) => {
    const next = parseSharedBoard(raw);
    if (!alive.current || currentUid.current !== uid || next.userId !== uid) return;
    if (currentBoard.current && next.revision < currentBoard.current.revision) return;
    currentBoard.current = next; setBoard(next); setStatus('ready'); setError('');
  }, []);
  const refresh = useCallback(async () => {
    const uid = currentUid.current; if (!uid) return;
    const { data, error } = await client.rpc('tn_get_board', { p_community: community });
    if (!alive.current || currentUid.current !== uid) return;
    if (error) {
      setError(cloudError(error));
      if (error.code === '42501') { setError(''); currentBoard.current = null; setBoard(null); setStatus('join'); }
      else if (!currentBoard.current) setStatus('error');
      return;
    }
    try { accept(data, uid); } catch (err) { setError(cloudError(err)); if (!currentBoard.current) setStatus('error'); }
  }, [accept, client]);
  useEffect(() => {
    alive.current = true;
    const load = (s: Session | null) => {
      if (!alive.current) return;
      const uid = s?.user.id || null;
      if (uid !== currentUid.current) { currentBoard.current = null; setBoard(null); setError(''); }
      currentUid.current = uid; setSession(s);
      if (!s) setStatus('login'); else void refresh();
    };
    let changed = false; const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: listener } = client.auth.onAuthStateChange((_event, s) => {
      changed = true;
      // Auth callbacks must return before making another Auth-dependent request.
      const timer = setTimeout(() => { timers.delete(timer); load(s); }, 0); timers.add(timer);
    });
    void client.auth.getSession().then(({ data, error }) => { if (error) { setError(cloudError(error)); setStatus('login'); } else if (!changed) load(data.session); });
    return () => { alive.current = false; listener.subscription.unsubscribe(); timers.forEach(clearTimeout); };
  }, [client, refresh]);
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid || status !== 'ready') return;
    const channel = client.channel(`teamnote:${community}:${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tn_ideas', filter: `community_id=eq.${community}` }, () => { void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tn_members', filter: `community_id=eq.${community}` }, () => { void refresh(); })
      .subscribe(state => { setConnected(state === 'SUBSCRIBED'); if (state === 'SUBSCRIBED') void refresh(); });
    const visible = () => { if (!document.hidden) void refresh(); };
    const online = () => { void refresh(); };
    const offline = () => setConnected(false);
    // A missed WebSocket event is repaired on return and by a light periodic snapshot.
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', online); window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { void client.removeChannel(channel); clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', online); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [client, uid, status, refresh]);
  const write = async (rpc: string, args: Record<string, unknown>) => {
    const uid = currentUid.current; if (!uid) return false;
    try {
      const { data, error } = await client.rpc(rpc, args); if (error) throw error;
      if (currentUid.current !== uid) return false;
      accept(data, uid); return true;
    } catch (err) { if (currentUid.current === uid) setError(cloudError(err)); return false; }
  };
  const post = async (text: string) => {
    const key = `tn_pending_post:${currentUid.current}`;
    let pending: { id: string; text: string };
    try { const saved = JSON.parse(sessionStorage.getItem(key) || 'null'); pending = saved?.text === text && typeof saved.id === 'string' ? saved : { id: crypto.randomUUID(), text }; sessionStorage.setItem(key, JSON.stringify(pending)); }
    catch { setError('送信の準備ができませんでした。入力内容を残しています。'); return false; }
    const ok = await write('tn_post_idea', { p_community: community, p_id: pending.id, p_text: text });
    if (ok) { try { sessionStorage.removeItem(key); } catch { /* Accepted by the server; the id remains idempotent. */ } }
    return ok;
  };
  const logout = async () => { await client.auth.signOut({ scope: 'local' }); };
  if (status !== 'ready' || !board) return status === 'loading' ? <div className="shared-login-loading"><ScreenSkeleton variant="home" /></div> : <SharedLogin status={status === 'ready' ? 'error' : status} error={error} signedIn={!!session} onJoin={async (invite, profile) => write('tn_join_community', { p_invite: invite, p_profile: profile })} onRetry={refresh} onLogout={logout} />;
  const profile = board.members.find(m => m.id === board.userId)!;
  return <SharedIdeasContext.Provider value={{ enabled: true, board, profile, error, connected, post, like: (id, liked) => write('tn_set_like', { p_community: community, p_id: id, p_liked: liked }), remove: id => write('tn_delete_idea', { p_community: community, p_id: id }), updateProfile: profile => write('tn_update_profile', { p_community: community, p_profile: profile }), logout }}>{children}</SharedIdeasContext.Provider>;
}

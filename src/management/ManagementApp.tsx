import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { teamnoteClient, teamnoteReviewMode } from '../lib/teamnoteCloud';
import { managementContext } from './api';
import { managementError } from './data';
import { demoManager } from './demo';
import type { ManagerContext } from './types';
import { ManagementSkeleton } from './ManagementDashboard';
import { OperationsDashboard } from './OperationsDashboard';
import './management.css';

export default function ManagementApp() {
  const demo = teamnoteReviewMode;
  useEffect(() => { const previous = document.title; document.title = `チームノート｜管理画面${demo ? '（デモ）' : ''}`; return () => { document.title = previous; }; }, [demo]);
  const [status, setStatus] = useState<'loading' | 'login' | 'ready' | 'denied' | 'error'>(demo ? 'ready' : teamnoteClient ? 'loading' : 'error');
  const [manager, setManager] = useState<ManagerContext | null>(demo ? demoManager : null);
  const [message, setMessage] = useState(!demo && !teamnoteClient ? '管理画面の接続設定が未完了です。' : '');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    if (demo) return;
    const client = teamnoteClient;
    if (!client) return;
    let alive = true, changed = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const load = async (session: Session | null) => {
      const token = ++generation.current;
      setManager(null); setMessage('');
      if (!session) { setStatus('login'); return; }
      setStatus('loading');
      try {
        const context = await managementContext();
        if (!alive || token !== generation.current) return;
        if (context.userId !== session.user.id) throw new Error('invalid_management_user');
        setManager(context); setStatus('ready');
      } catch (error) {
        if (!alive || token !== generation.current) return;
        setMessage(managementError(error));
        setStatus((error as { code?: string }).code === '42501' ? 'denied' : 'error');
      }
    };
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      changed = true;
      const timer = setTimeout(() => { timers.delete(timer); if (alive) void load(session); }, 0);
      timers.add(timer);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (!alive || changed) return;
      if (error) { setStatus('login'); setMessage('ログイン状態を確認できませんでした。もう一度ログインしてください。'); }
      else void load(data.session);
    });
    return () => { alive = false; timers.forEach(clearTimeout); listener.subscription.unsubscribe(); };
  }, [demo, retry]);

  const loseAccess = useCallback(() => { setManager(null); setStatus('denied'); setMessage('管理画面の閲覧権限を確認できませんでした。'); }, []);
  const logout = async () => {
    if (!teamnoteClient) return;
    setBusy(true); setMessage('');
    const { error } = await teamnoteClient.auth.signOut({ scope: 'local' });
    if (error) {
      const { data } = await teamnoteClient.auth.getSession();
      if (data.session) setMessage('ログアウトできませんでした。もう一度お試しください。');
      else { setManager(null); setStatus('login'); }
    }
    setBusy(false);
  };
  if (status === 'loading') return <ManagementSkeleton />;
  if (status === 'ready' && manager) return <OperationsDashboard manager={manager} demo={demo} onLogout={logout} onAccessLost={loseAccess} logoutBusy={busy} logoutError={message} />;
  return <div className="management-app management-auth">
    <div className="management-atmosphere" aria-hidden="true"><i /><i /><i /></div>
    <section className="mg-glass mg-auth-card">
      <a className="mg-brand" href={location.pathname}><span className="mg-brand-icon"><Building2 size={23} /></span><span><strong>チームノート</strong><small>管理画面</small></span></a>
      <div className="mg-auth-heading"><span className="mg-access-icon"><ShieldCheck size={26} /></span><h1>{status === 'login' ? '管理アカウントでログイン' : status === 'denied' ? '管理者権限が必要です' : '接続を確認してください'}</h1></div>
      {message && <p role="alert" className="mg-alert">{message}</p>}
      {status === 'login' ? <form onSubmit={async e => {
        e.preventDefault(); if (busy || !teamnoteClient) return;
        setBusy(true); setMessage('');
        const { error } = await teamnoteClient.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMessage('メールアドレス・パスワードと、確認メールの認証を確認してください。');
        setBusy(false);
      }}>
        <label>メールアドレス<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>パスワード<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <button className="mg-primary" disabled={busy} type="submit">{busy ? 'ログイン中' : 'ログイン'}<ArrowRight size={17} /></button>
        <button className="mg-secondary" disabled={busy} type="button" onClick={async () => {
          if (!teamnoteClient) return;
          setBusy(true); setMessage('');
          const target = new URL(location.href); target.hash = '';
          const { error } = await teamnoteClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: target.href } });
          if (error) { setMessage('Googleログインを開始できませんでした。'); setBusy(false); }
        }}>Googleでログイン</button>
      </form> : <div className="mg-auth-actions">
        {teamnoteClient && <button className="mg-primary" onClick={() => setRetry(v => v + 1)}>再確認する</button>}
        {teamnoteClient && <button className="mg-secondary" disabled={busy} onClick={logout}>別のアカウントでログイン</button>}
      </div>}
      <p className="mg-auth-note">管理者として登録されたアカウントで利用できます。</p>
      <a className="mg-back-link" href={location.pathname}><ArrowLeft size={15} />寮生用アプリへ</a>
    </section>
  </div>;
}

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { cloudError, teamnoteClient } from '../lib/teamnoteCloud';
import { ProfileFields, type ProfileForm } from './ProfileFields';

const blankProfile: ProfileForm = { name: '', role: '一般寮生', building: 'rosemary', floor: 1, unit: '' };
const JOIN_KEY = 'tn_pending_join';

function readJoinFromHash() {
  try { return new URLSearchParams(location.hash.slice(1)).get('join') || sessionStorage.getItem(JOIN_KEY) || ''; }
  catch { return ''; }
}

export function SharedLogin({ status, error, signedIn, onJoin, onRetry, onLogout }: {
  status: 'login' | 'join' | 'error'; error: string; signedIn: boolean;
  onJoin: (invite: string, profile: ProfileForm) => Promise<boolean>; onRetry: () => Promise<void>; onLogout: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [invite, setInvite] = useState(() => readJoinFromHash());
  const [profile, setProfile] = useState<ProfileForm>(blankProfile); const [busy, setBusy] = useState(false); const [localError, setLocalError] = useState(''); const [notice, setNotice] = useState('');

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; setBusy(true); setLocalError(''); setNotice('');
    try {
      if (status === 'join') {
        if (await onJoin(invite.trim(), profile)) {
          try { sessionStorage.removeItem(JOIN_KEY); } catch { /* ignore */ }
          history.replaceState(null, '', location.pathname + location.search);
        }
      } else if (mode === 'signup') {
        const { data, error } = await teamnoteClient!.auth.signUp({ email: email.trim(), password, options: { data: { display_name: email.split('@')[0], role_label: 'チームノート利用者' } } });
        if (error) throw error;
        // Supabase returns a masked user (identities = []) when the email is already registered.
        if (Array.isArray(data.user?.identities) && data.user!.identities.length === 0) {
          setLocalError('このメールアドレスは既に登録されています。ログインするか、Googleで続けてください。');
          setMode('login');
          return;
        }
        if (!data.session) { setNotice('確認メールを開いた後、この画面でログインしてください。同じメールならGoogleでも入れます。'); setMode('login'); }
      } else { const { error } = await teamnoteClient!.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; }
    } catch (err) { setLocalError(cloudError(err)); }
    finally { setBusy(false); }
  };

  const signInWithGoogle = async () => {
    if (busy || !teamnoteClient) return;
    setBusy(true); setLocalError(''); setNotice('');
    try {
      if (invite.trim()) {
        try { sessionStorage.setItem(JOIN_KEY, invite.trim()); } catch { /* ignore */ }
      }
      const redirectTo = `${location.origin}${location.pathname}${location.search}`;
      const { error } = await teamnoteClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (err) { setLocalError(cloudError(err)); setBusy(false); }
  };

  return <main className="shared-login-page"><div className="glass-atmosphere" aria-hidden="true"><i /><i /><i /></div><section className="shared-login-card glass-panel">
    <div className="shared-login-brand"><Lightbulb size={24} /><div><strong>チームノート</strong><span>H-Village</span></div></div>
    <h1>{status === 'join' ? 'プロフィール登録' : status === 'error' ? '接続を確認' : mode === 'signup' ? 'アカウント作成' : 'ログイン'}</h1>
    {status === 'error' ? <div className="shared-login-actions"><button className="glass-primary" onClick={() => { void onRetry(); }}>もう一度接続する</button><button className="glass-secondary" onClick={() => { void onLogout(); }}>ログアウト</button></div> : <form onSubmit={submit}>
      {status === 'join' ? <><label>参加コード<input required autoComplete="off" value={invite} readOnly={busy} onChange={e => setInvite(e.target.value)} /></label><ProfileFields value={profile} onChange={setProfile} disabled={busy} /></> : <>
        <label>メールアドレス<input type="email" required autoComplete="username" maxLength={254} readOnly={busy} value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>パスワード<input type="password" required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} readOnly={busy} value={password} onChange={e => setPassword(e.target.value)} /></label></>}
      <button className="glass-primary" type="submit" disabled={busy}>{busy ? '確認中…' : status === 'join' ? '寮に参加する' : mode === 'signup' ? 'アカウントを作成' : 'ログイン'}</button>
      {status === 'login' && <>
        <div className="shared-login-divider" role="separator"><span>または</span></div>
        <button className="shared-login-google" type="button" disabled={busy} onClick={() => { void signInWithGoogle(); }}>
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="" width={18} height={18} />
          Googleで続ける
        </button>
      </>}
      {status === 'login' && <button className="shared-login-link" type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setLocalError(''); setNotice(''); }}>{mode === 'login' ? '初めての方はアカウントを作成' : 'ログインに戻る'}</button>}
      {status === 'join' && signedIn && <button className="shared-login-link" type="button" disabled={busy} onClick={() => { void onLogout(); }}>別のアカウントでログイン</button>}
    </form>}
    {(localError || (status !== 'join' && error)) && <p role="alert" className="shared-login-error">{localError || error}</p>}
    {status === 'join' && error && <p role="alert" className="shared-login-error">{error}</p>}
    {notice && <p role="status" className="shared-login-notice">{notice}</p>}
  </section></main>;
}

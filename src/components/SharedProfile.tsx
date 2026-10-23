import { useState } from 'react';
import type { CurrentUser, ProjectRecord } from '../lib/db';
import { useSharedIdeas } from '../lib/sharedIdeasContext';
import { getActivityHistory } from '../lib/activityHistory';
import { ProfileFields, type ProfileForm } from './ProfileFields';
export function SharedProfile({ resident, projects }: { resident: CurrentUser; projects: ProjectRecord[] }) {
  const shared = useSharedIdeas(); const own = resident.id === shared.profile?.id;
  const [editing, setEditing] = useState(false); const [profile, setProfile] = useState<ProfileForm>(resident); const [busy, setBusy] = useState(false);
  return <div className="shared-profile-page"><h2>プロフィール</h2><section className="glass-panel shared-profile-card"><h3>{resident.name}</h3><p>{resident.building} / {resident.floor}階 / {resident.unit}</p><p>{resident.role}</p>
    {own && !editing && <button className="glass-secondary" onClick={() => { setProfile(resident); setEditing(true); }}>プロフィールを編集</button>}
    {own && editing && <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); if (await shared.updateProfile({ ...resident, ...profile })) setEditing(false); setBusy(false); }}><ProfileFields value={profile} onChange={setProfile} disabled={busy} /><div className="shared-login-actions"><button type="submit" className="glass-primary" disabled={busy}>保存する</button><button type="button" className="glass-secondary" disabled={busy} onClick={() => setEditing(false)}>キャンセル</button></div></form>}
    {shared.error && <p role="alert" className="shared-login-error">{shared.error}</p>}
    </section><section className="glass-panel shared-profile-card"><h3>活動履歴</h3>{getActivityHistory(projects, resident.id).map(item => <article key={item.id}><strong>{item.projectTitle}</strong><p>{item.role} / {item.period}</p></article>)}{!getActivityHistory(projects, resident.id).length && <p>スタッフとして参加した企画はまだありません。</p>}</section>
    {own && <button className="glass-secondary" onClick={() => { void shared.logout(); }}>ログアウト</button>}
  </div>;
}

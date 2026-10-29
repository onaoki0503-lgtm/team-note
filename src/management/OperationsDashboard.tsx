import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ClipboardList, LogOut } from 'lucide-react';
import { ManagementDashboard } from './ManagementDashboard';
import { loadManagementReports } from './api';
import { createDemoReports } from './demo';
import { currentMonth, managementError, monthLabel } from './data';
import { operationModules, operationSection, type OperationSection } from './operations';
import type { ManagerContext } from './types';

type Props = { manager: ManagerContext; demo: boolean; onLogout: () => Promise<void>; onAccessLost: () => void; logoutBusy?: boolean; logoutError?: string };
export function OperationsDashboard(props: Props) {
  const { manager, demo, onLogout, onAccessLost, logoutBusy, logoutError } = props;
  const [section, setSection] = useState(() => operationSection(location.search));
  const [summary, setSummary] = useState<{ count: number; month: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0), mounted = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    const token = ++generation.current, month = currentMonth();
    setLoading(true); setError(''); setSummary(null);
    try {
      const rows = demo ? createDemoReports(month) : await loadManagementReports(month);
      if (!mounted.current || token !== generation.current) return;
      setSummary({ count: rows.length, month });
    } catch (e) {
      if (!mounted.current || token !== generation.current) return;
      if ((e as { code?: string }).code === '42501') { onAccessLost(); return; }
      setError(managementError(e));
    } finally { if (mounted.current && token === generation.current) setLoading(false); }
  }, [demo, onAccessLost]);
  const cancelLoad = useCallback(() => { mounted.current = false; ++generation.current; }, []);
  useEffect(() => {
    if (section === 'monthly') return;
    mounted.current = true;
    let canceled = false;
    queueMicrotask(() => { if (!canceled) void load(); });
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = demo ? undefined : setInterval(refresh, 60000);
    if (!demo) window.addEventListener('focus', refresh);
    return () => { canceled = true; cancelLoad(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [section, demo, load, cancelLoad]);
  useEffect(() => {
    const pop = () => setSection(operationSection(location.search));
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const navigate = (next: OperationSection) => {
    if (next === section) return;
    const url = new URL(location.href);
    if (next === 'overview') url.searchParams.delete('section'); else url.searchParams.set('section', next);
    history.pushState(null, '', url); setSection(next);
  };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [section]);
  if (section === 'monthly') return <ManagementDashboard {...props} onBack={() => navigate('overview')} />;
  const selected = operationModules.find(m => m.id === section);
  return <div className="management-app">
    <div className="management-atmosphere" aria-hidden="true"><i /><i /></div>
    <a className="mg-skip" href="#management-content">本文へ移動</a>
    <header className="mg-topbar mg-glass"><div className="mg-brand"><Building2 size={23}/><strong>チームノート</strong><span>寮運営</span>{demo && <span className="mg-demo">デモ</span>}</div><div className="mg-account"><span>{manager.name}</span>{!demo && <button aria-label="ログアウト" disabled={logoutBusy} onClick={onLogout}><LogOut size={18}/></button>}</div></header>
    <div className="ops-layout">
      <nav className="ops-nav mg-glass" aria-label="運営業務">
        <button aria-current={section === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}>運営ダッシュボード</button>
        {operationModules.map(m => <button key={m.id} aria-current={section === m.id ? 'page' : undefined} onClick={() => navigate(m.id)}><span>{m.name}</span>{!m.available && <small>準備中</small>}</button>)}
      </nav>
      <main id="management-content" className="ops-main">
        <p className="mg-community">{manager.communityName}</p>
        <h1 ref={heading} tabIndex={-1}>{selected?.name || '運営ダッシュボード'}</h1>
        {logoutError && <p role="alert" className="mg-alert">{logoutError}</p>}
        {error && <div role="alert" className="mg-alert">{error}<button className="mg-primary" onClick={() => void load()}>再読み込み</button></div>}
        {!selected ? <>
          <section className="ops-summary mg-glass" aria-label="現在の提出状況">
            <div><span>月次報告書</span><h2>{summary ? monthLabel(summary.month) : '今月の提出状況'}</h2></div>
            <div aria-live="polite" aria-busy={loading}>{loading ? <span className="ops-count-loading mg-shimmer">読み込み中</span> : summary ? <strong>提出済み {summary.count}件</strong> : <span>取得できませんでした</span>}</div>
            <button className="mg-primary" onClick={() => navigate('monthly')}>報告書を開く<ArrowRight size={17}/></button>
          </section>
          <h2 className="ops-section-title">運営業務</h2>
          <div className="ops-modules">{operationModules.map(m => <section key={m.id} className="ops-module mg-glass"><div className="ops-module-title"><ClipboardList size={21}/><h3>{m.name}</h3><span className={m.available ? 'ops-ready' : 'ops-planned'}>{m.available ? '利用可能' : '準備中'}</span></div><p>{m.description}</p><button className="mg-secondary" onClick={() => navigate(m.id)}>{m.available ? '報告書を開く' : '業務の流れを見る'}<ArrowRight size={16}/></button></section>)}</div>
          <p className="ops-note">準備中の業務は、今後の流れを確認できます。登録・承認・QR記録・通知はまだ利用できません。</p>
        </> : <section className="ops-detail mg-glass">
          <p className="ops-planned">準備中</p><h2>{selected.description}</h2>
          <p className="ops-note">業務の流れの確認用です。実データの登録・承認・通知は行いません。</p>
          <ol className="ops-steps">{selected.steps.map(step => <li key={step}><CheckCircle2 size={19}/>{step}</li>)}</ol>
          <div className="ops-detail-columns"><section><h3>蓄積したい情報</h3><ul>{selected.records.map(item => <li key={item}>{item}</li>)}</ul></section><section><h3>運用に合わせて決めること</h3><ul>{selected.decisions.map(item => <li key={item}>{item}</li>)}</ul></section></div>
          <button className="mg-secondary" onClick={() => navigate('overview')}><ArrowLeft size={16}/>運営業務へ戻る</button>
        </section>}
      </main>
    </div>
  </div>;
}

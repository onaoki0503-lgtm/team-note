import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, FileText, LogOut, X } from 'lucide-react';
import { currentMonth, jstTime, managementError, monthLabel, monthRange, moveMonth } from './data';
import { createDemoReports } from './demo';
import { loadManagementReports } from './api';
import { buildings, type ManagementReport, type ManagerContext } from './types';

export function ManagementSkeleton() {
  return <div className="management-app mg-loading" role="status" aria-label="月次報告書を読み込み中" aria-busy="true" data-testid="management-skeleton">
    <span className="sr-only">月次報告書を読み込み中</span>
    <div className="mg-container" aria-hidden="true"><div className="mg-skeleton-heading mg-shimmer" /><div className="mg-skeleton-month mg-shimmer" /><div className="mg-glass mg-skeleton-list">{[0, 1, 2, 3].map(i => <div key={i}><span className="mg-shimmer" /><span className="mg-shimmer" /><span className="mg-shimmer" /></div>)}</div></div>
  </div>;
}

export function ManagementDashboard({ manager, demo, onLogout, onAccessLost, logoutBusy = false, logoutError = '', onBack }: { manager: ManagerContext; demo: boolean; onLogout: () => Promise<void>; onAccessLost: () => void; logoutBusy?: boolean; logoutError?: string; onBack?: () => void }) {
  const [month, setMonth] = useState(currentMonth);
  const [reports, setReports] = useState<ManagementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ManagementReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const sequence = useRef(0), alive = useRef(true), opener = useRef<HTMLElement | null>(null), loadedMonth = useRef('');
  const load = useCallback(async (quiet = false) => {
    const token = ++sequence.current;
    if (!quiet) setLoading(true);
    setError('');
    if (loadedMonth.current !== month) { setReports([]); setLoaded(false); }
    try {
      const rows = demo ? createDemoReports(month) : await loadManagementReports(month);
      if (!alive.current || sequence.current !== token) return;
      loadedMonth.current = month; setReports(rows); setLoaded(true);
    } catch (e) {
      if (!alive.current || sequence.current !== token) return;
      if ((e as { code?: string }).code === '42501') { setReports([]); setSelected(null); onAccessLost(); return; }
      setError(managementError(e));
    } finally { if (alive.current && sequence.current === token) setLoading(false); }
  }, [month, demo, onAccessLost]);
  useEffect(() => {
    alive.current = true; let canceled = false;
    queueMicrotask(() => { if (!canceled) void load(); });
    return () => { canceled = true; alive.current = false; };
  }, [load]);
  useEffect(() => {
    if (demo) return;
    const refresh = () => { if (!document.hidden && !selected) void load(true); };
    const timer = setInterval(refresh, 60000); window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [demo, load, selected]);
  const close = useCallback(() => {
    setSelected(null);
    requestAnimationFrame(() => opener.current?.isConnected ? opener.current.focus() : document.getElementById('mg-title')?.focus());
  }, []);
  const changeMonth = (next: string) => { try { monthRange(next); setSelected(null); setMonth(next); } catch { /* Ignore incomplete native month input. */ } };
  if (loading) return <ManagementSkeleton />;
  return <div className="management-app">
    <div className="management-atmosphere" aria-hidden="true"><i /><i /></div>
    <a className="mg-skip" href="#management-content">本文へ移動</a>
    <header className="mg-topbar mg-glass"><div className="mg-brand"><Building2 size={23} /><strong>チームノート</strong><span>管理画面</span>{demo && <span className="mg-demo">デモ</span>}</div><div className="mg-account"><span>{manager.name}</span>{!demo && <button aria-label="ログアウト" disabled={logoutBusy} onClick={onLogout}><LogOut size={18} /></button>}</div></header>
    <main id="management-content" className="mg-container">
      {onBack && <button className="mg-secondary ops-monthly-back" onClick={onBack}><ArrowLeft size={16}/>運営業務へ戻る</button>}
      <div className="mg-heading"><div><p className="mg-community">{manager.communityName}</p><h1 id="mg-title" tabIndex={-1}>月次報告書</h1></div><div className="mg-month-control mg-glass"><button aria-label="前の月" disabled={month === '2000-01'} onClick={() => changeMonth(moveMonth(month, -1))}><ChevronLeft size={18} /></button><input aria-label="対象月" type="month" min="2000-01" max="2100-12" value={month} onChange={e => changeMonth(e.target.value)} /><button aria-label="次の月" disabled={month === '2100-12'} onClick={() => changeMonth(moveMonth(month, 1))}><ChevronRight size={18} /></button></div></div>
      {logoutError && <p role="alert" className="mg-alert">{logoutError}</p>}
      {error && <div role="alert" className="mg-alert">{error}<button className="mg-primary" onClick={() => void load()}>再読み込み</button></div>}
      {loaded && <section className="mg-glass mg-report-list" aria-label={`${monthLabel(month)}の提出報告書`}>
        {reports.length ? <><div className="mg-list-labels" aria-hidden="true"><span>提出者</span><span>棟・部屋</span><span>提出日時</span><span /></div><ul>{reports.map((report, i) => <li key={report.id} style={{ '--enter-delay': `${Math.min(i, 8) * 45}ms` } as CSSProperties}><button className="mg-report-row" aria-label={`${report.author.name}の月次報告書を開く`} onClick={e => { opener.current = e.currentTarget; setSelected(report); }}><span className="mg-person"><span className="mg-document-icon"><FileText size={21} /></span><span><strong>{report.author.name}</strong><small>{report.author.role}</small></span></span><span className="mg-room">{buildings[report.author.building] || report.author.building} <small>{report.author.unit}</small></span><time dateTime={report.submittedAt}>{jstTime(report.submittedAt)}</time><ChevronRight className="mg-row-arrow" size={19} /></button></li>)}</ul></> : <div className="mg-empty"><FileText size={30} /><p>{monthLabel(month)}の提出済み月次報告書はありません。</p></div>}
      </section>}
    </main>
    {selected && <ReportReader report={selected} close={close} />}
  </div>;
}

function ReportReader({ report, close }: { report: ManagementReport; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className="mg-dialog" aria-labelledby="mg-report-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
    <header><div><h2 id="mg-report-title">{monthLabel(report.month)}の月次報告書</h2><p>{report.author.name} · {report.author.role} · {buildings[report.author.building] || report.author.building} {report.author.unit}</p><time dateTime={report.submittedAt}>提出 {jstTime(report.submittedAt)}</time></div><button autoFocus aria-label="報告書を閉じる" onClick={close}><X size={21} /></button></header>
    <article className="mg-report-body">{report.body}</article>
  </dialog>;
}

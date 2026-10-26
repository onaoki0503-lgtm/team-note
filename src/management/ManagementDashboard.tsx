import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Building2, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clock3, FileCheck2, FileText, FolderOpen, LayoutDashboard, LogOut, MapPin, Paperclip, Printer, RefreshCw, Search, ShieldCheck, SlidersHorizontal, X, ChartNoAxesCombined } from 'lucide-react';
import { currentMonth, filterReports, jstTime, managementError, monthLabel, monthRange, moveMonth, reportsCsv, shortDate } from './data';
import { createDemoReports } from './demo';
import { loadManagementReports, managementAttachmentUrl, saveManagementReview } from './api';
import { buildings, categories, type ManagementReport, type ManagementSection, type ManagerContext } from './types';

const navigation: { key: ManagementSection; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'ダッシュボード', icon: LayoutDashboard },
  { key: 'reports', label: '提出報告書', icon: FileText },
  { key: 'pending', label: '未確認の報告書', icon: Clock3 },
  { key: 'summary', label: '月別集計', icon: ChartNoAxesCombined },
];

function Category({ value }: { value: string }) {
  return <span className={`mg-category mg-category-${Math.max(0, categories.indexOf(value))}`}>{value}</span>;
}
function ReviewStatus({ reviewed }: { reviewed: boolean }) {
  return <span className={`mg-status ${reviewed ? 'is-reviewed' : ''}`}>{reviewed ? <Check size={12} /> : <i />}{reviewed ? '確認済み' : '未確認'}</span>;
}
function downloadCsv(reports: ManagementReport[], month: string) {
  const url = URL.createObjectURL(new Blob([reportsCsv(reports)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Hヴィレッジ_報告書_${month}.csv`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ManagementSkeleton() {
  return <div className="management-app mg-loading" role="status" aria-label="管理画面を読み込み中" aria-busy="true" data-testid="management-skeleton">
    <span className="sr-only">管理画面を読み込み中</span>
    <div className="mg-skeleton-layout" aria-hidden="true"><aside className="mg-glass mg-skeleton-side"><span className="mg-shimmer wide" />{[0, 1, 2, 3].map(i => <span key={i} className="mg-shimmer" />)}</aside>
      <div className="mg-skeleton-main"><div className="mg-glass mg-skeleton-top"><span className="mg-shimmer wide" /><span className="mg-shimmer" /></div><div className="mg-skeleton-title mg-shimmer" /><div className="mg-metrics">{[0, 1, 2, 3].map(i => <div key={i} className="mg-glass mg-skeleton-metric"><span className="mg-shimmer" /><span className="mg-shimmer wide" /></div>)}</div>
        <div className="mg-glass mg-skeleton-table"><span className="mg-shimmer wide" />{[0, 1, 2, 3, 4, 5, 6].map(i => <div key={i}><span className="mg-shimmer" /><span className="mg-shimmer wide" /><span className="mg-shimmer" /></div>)}</div>
      </div></div>
  </div>;
}

export function ManagementDashboard({ manager, demo, onLogout, onAccessLost, logoutBusy = false, logoutError = '' }: { manager: ManagerContext; demo: boolean; onLogout: () => Promise<void>; onAccessLost: () => void; logoutBusy?: boolean; logoutError?: string }) {
  const [section, setSection] = useState<ManagementSection>('overview');
  const [month, setMonth] = useState(currentMonth);
  const [reports, setReports] = useState<ManagementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authorFilter, setAuthorFilter] = useState('');
  const [query, setQuery] = useState(''), [building, setBuilding] = useState(''), [category, setCategory] = useState(''), [status, setStatus] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ key: '', page: 1 });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const sequence = useRef(0), alive = useRef(true), opener = useRef<HTMLElement | null>(null);
  const loadedMonth = useRef('');
  const cache = useRef(new Map<string, ManagementReport[]>());
  const load = useCallback(async (quiet = false, preserveError = false) => {
    const token = ++sequence.current;
    if (!quiet) setLoading(true); else setRefreshing(true);
    if (!preserveError) setError('');
    if (loadedMonth.current !== month) { setReports([]); setUpdatedAt(null); }
    try {
      const rows = demo ? (cache.current.get(month) || createDemoReports(month)) : await loadManagementReports(month);
      if (!alive.current || sequence.current !== token) return;
      if (demo) cache.current.set(month, rows);
      loadedMonth.current = month;
      setReports(rows); setUpdatedAt(new Date().toISOString());
    } catch (e) {
      if (!alive.current || sequence.current !== token) return;
      if ((e as { code?: string }).code === '42501') { onAccessLost(); return; }
      setError(managementError(e));
    } finally { if (alive.current && sequence.current === token) { setLoading(false); setRefreshing(false); } }
  }, [month, demo, onAccessLost]);
  useEffect(() => {
    alive.current = true;
    let canceled = false;
    queueMicrotask(() => { if (!canceled) void load(); });
    return () => { canceled = true; alive.current = false; };
  }, [load]);
  useEffect(() => {
    if (demo) return;
    const refresh = () => { if (!document.hidden && !saving && !selectedId) void load(true); };
    const timer = setInterval(refresh, 60000); window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [demo, load, saving, selectedId]);
  const pending = reports.filter(r => !r.review.reviewed).length;
  const counts = categories.map(label => ({ label, count: reports.filter(r => r.category === label).length }));
  const filtered = useMemo(() => filterReports(reports, { query, building, category, authorId: authorFilter, status: section === 'pending' ? 'pending' : status }), [reports, query, building, category, status, section, authorFilter]);
  const authorGroups = [...new Map(reports.map(r => [r.author.id, r.author])).values()].map(author => ({ author, rows: reports.filter(r => r.author.id === author.id) }));
  const selected = reports.find(r => r.id === selectedId);
  const pageKey = JSON.stringify([query, building, category, status, section, month, authorFilter]);
  const page = pagination.key === pageKey ? pagination.page : 1;
  const setPage = (next: number) => setPagination({ key: pageKey, page: next });
  const maxPage = Math.max(1, Math.ceil(filtered.length / 8));
  const activePage = Math.min(page, maxPage);
  const pageRows = filtered.slice((activePage - 1) * 8, activePage * 8);
  const clearFilters = () => { setQuery(''); setBuilding(''); setCategory(''); setStatus(''); setAuthorFilter(''); };
  const openReport = (r: ManagementReport, element: HTMLElement) => { opener.current = element; setError(''); setNotice(''); setSelectedId(r.id); };
  const closeReport = () => { if (saving) return; setSelectedId(null); requestAnimationFrame(() => opener.current?.isConnected ? opener.current.focus() : document.getElementById('mg-title')?.focus()); };
  const review = async () => {
    if (!selected || saving) return;
    const token = ++sequence.current;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = demo ? { reviewed: !selected.review.reviewed, reviewedAt: selected.review.reviewed ? null : new Date().toISOString(), reviewerName: selected.review.reviewed ? '' : manager.name, version: selected.review.version + 1 } : await saveManagementReview(selected, !selected.review.reviewed);
      if (!alive.current || sequence.current !== token) return;
      setReports(current => { const next = current.map(r => r.id === selected.id ? { ...r, review: result } : r); if (demo) cache.current.set(month, next); return next; });
      setNotice(result.reviewed ? '確認済みにしました。' : '未確認に戻しました。');
    } catch (e) {
      if (!alive.current) return;
      if ((e as { code?: string }).code === '42501') { onAccessLost(); return; }
      setError(managementError(e));
      if ((e as { code?: string }).code === '40001') void load(true, true);
    } finally { if (alive.current) setSaving(false); }
  };
  if (loading) return <ManagementSkeleton />;
  if (error && !updatedAt) return <div className="management-app management-auth"><section className="mg-glass mg-auth-card"><h1>報告書を読み込めませんでした</h1><p role="alert" className="mg-alert">{error}</p><button className="mg-primary" onClick={() => void load()}>再読み込み</button></section></div>;
  const viewTitle = navigation.find(n => n.key === section)!.label;
  return <div className="management-app">
    <div className="management-atmosphere" aria-hidden="true"><i /><i /><i /></div>
    <a className="mg-skip" href="#management-content">本文へ移動</a>
    <div className="mg-layout">
      <aside className="mg-sidebar mg-glass">
        <a className="mg-brand" href={`?view=management${demo ? '&demo=1' : ''}`}><span className="mg-brand-icon"><Building2 size={24} /></span><span><strong>チームノート</strong><small>管理画面</small></span></a>
        <div className="mg-community"><span className="mg-community-icon"><Building2 size={19} /></span><span><strong>{manager.communityName}</strong><small>西松地所・寮運営</small></span><ChevronDown size={14} aria-hidden="true" /></div>
        <div className="mg-nav-label">ワークスペース</div>
        <nav aria-label="管理メニュー">{navigation.map(({ key, label, icon: Icon }) => <button key={key} className={`mg-nav-item ${section === key ? 'is-active' : ''}`} aria-label={label} aria-current={section === key ? 'page' : undefined} onClick={() => { setSection(key); clearFilters(); }}><Icon size={19} /><span>{label}</span>{key === 'pending' && <b>{pending}</b>}</button>)}</nav>
        <div className="mg-side-bottom"><div className="mg-access"><ShieldCheck size={15} /><span>管理者専用</span>{demo && <span className="mg-demo">デモ</span>}</div><a href={demo ? '?demo=1' : location.pathname}><ArrowLeft size={15} />寮生用アプリへ</a>{!demo && <button disabled={logoutBusy} onClick={onLogout}><LogOut size={15} />ログアウト</button>}</div>
      </aside>
      <div className="mg-main-column">
        <header className="mg-topbar mg-glass"><div className="mg-breadcrumb"><span>{manager.communityName}</span><ChevronRight size={13} /><strong>管理画面</strong></div><div className="mg-topbar-right">{demo && <span className="mg-demo">デモデータ</span>}<span className="mg-connection"><i />{demo ? 'プレビュー' : '共有データ'}</span><div className="mg-profile"><span>{manager.name.slice(0, 1)}</span><div><strong>{manager.name}</strong><small>{manager.organization || '管理担当'}</small></div></div></div></header>
        <main id="management-content" className="mg-main">
          <div className="mg-heading"><div><div className="mg-eyebrow">管理画面 <span>/</span> {monthLabel(month)}</div><h1 id="mg-title" tabIndex={-1}>{viewTitle}</h1></div><div className="mg-heading-actions"><span className="mg-updated">最終更新 {updatedAt ? new Date(updatedAt).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }) : '—'}</span><button className="mg-primary" onClick={() => void load(true)} disabled={refreshing || saving}><RefreshCw size={15} className={refreshing ? 'mg-spin' : ''} />{refreshing ? '更新中' : '更新'}</button></div></div>
          <div className="mg-period-row"><div className="mg-month-control mg-glass"><button disabled={month === '2000-01'} aria-label="前の月" onClick={() => { setSelectedId(null); setMonth(moveMonth(month, -1)); }}><ChevronLeft size={17} /></button><label><span className="sr-only">対象月</span><input type="month" value={month} min="2000-01" max="2100-12" onChange={e => { if (e.target.value) { try { monthRange(e.target.value); setSelectedId(null); setMonth(e.target.value); } catch { /* Keep the last valid month. */ } } }} /></label><button disabled={month === '2100-12'} aria-label="次の月" onClick={() => { setSelectedId(null); setMonth(moveMonth(month, 1)); }}><ChevronRight size={17} /></button></div><span className="mg-period-note">業務報告書 <span>{monthLabel(month)}</span></span></div>
          {(error || logoutError) && !selected && <div role="alert" className="mg-alert"><CircleAlert size={17} />{logoutError || error}<button onClick={() => void load()}>再読み込み</button></div>}
          <div className="mg-metrics">
            {[{ label: '提出された報告書', value: reports.length, unit: '件', icon: FileText, tone: 'blue' }, { label: '未確認', value: pending, unit: '件', icon: Clock3, tone: 'amber' }, { label: '確認済み', value: reports.length - pending, unit: '件', icon: FileCheck2, tone: 'green' }, { label: '提出者', value: new Set(reports.map(r => r.author.id)).size, unit: '人', icon: Building2, tone: 'violet' }].map((m, i) => <section key={m.label} className={`mg-metric mg-glass mg-tone-${m.tone}`} style={{ '--enter-delay': `${i * 45}ms` } as CSSProperties}><div><span>{m.label}</span><m.icon size={18} /></div><strong key={`${month}-${m.value}`}>{m.value}<small>{m.unit}</small></strong><footer>{monthLabel(month)}{m.label === '未確認' && pending > 0 && <button onClick={() => { setSection('pending'); clearFilters(); }}>一覧を見る<ArrowRight size={12} /></button>}</footer></section>)}
          </div>
          {section === 'summary' && <section className="mg-author-summary mg-glass"><div className="mg-panel-heading"><h2>提出者別の集計</h2><span className="mg-count-chip">{authorGroups.length}人</span></div><div className="mg-author-cards">{authorGroups.map(group => <article key={group.author.id}><div className="mg-author-cell"><span className={`mg-avatar mg-building-${group.author.building}`}>{group.author.name.slice(-1)}</span><div><strong>{group.author.name}</strong><small>{group.author.role} · {buildings[group.author.building] || '—'} {group.author.unit}</small></div></div><div className="mg-author-stat"><strong>{group.rows.length}<small>件</small></strong><span>未確認 {group.rows.filter(r => !r.review.reviewed).length}件</span></div><button className="mg-text-button" onClick={() => { clearFilters(); setAuthorFilter(group.author.id); setSection('reports'); }}>{group.author.name}の報告を見る<ArrowRight size={13} /></button></article>)}</div></section>}
          <div className={`mg-content-grid ${section === 'reports' || section === 'pending' ? 'mg-content-full' : ''}`}>
            <section className="mg-report-panel mg-glass">
              <div className="mg-panel-heading"><div><h2>{section === 'summary' ? '月内の報告書' : section === 'pending' ? '未確認の報告書' : '提出報告書'}</h2><span className="mg-count-chip">{filtered.length}件</span></div><button className="mg-secondary mg-csv-button" disabled={!filtered.length} onClick={() => downloadCsv(filtered, month)}><ArrowDownToLine size={15} />CSVを書き出す</button></div>
              <div className="mg-filters"><div className="mg-search"><Search size={17} /><input aria-label="報告書を検索" placeholder="件名・提出者・内容で検索" value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="検索をクリア" onClick={() => setQuery('')}><X size={14} /></button>}</div><label><span className="sr-only">棟で絞り込む</span><select value={building} onChange={e => setBuilding(e.target.value)}><option value="">すべての棟</option>{Object.entries(buildings).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label><span className="sr-only">業務区分で絞り込む</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="">すべての業務</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
              {authorFilter && <div className="mg-author-filter"><span>提出者: {reports.find(r => r.author.id === authorFilter)?.author.name}</span><button aria-label="提出者の絞り込みを解除" onClick={() => setAuthorFilter('')}><X size={12} /></button></div>}
              <div className="mg-list-toolbar"><div className="mg-tabs" aria-label="確認状況">{[{ key: '', label: 'すべて' }, { key: 'pending', label: '未確認' }, { key: 'reviewed', label: '確認済み' }].map(t => <button key={t.key} aria-pressed={(section === 'pending' ? 'pending' : status) === t.key} disabled={section === 'pending' && t.key !== 'pending'} onClick={() => setStatus(t.key)}>{t.label}{t.key === 'pending' && <span>{pending}</span>}</button>)}</div><span><SlidersHorizontal size={13} />報告日が新しい順</span></div>
              <div className="mg-table-scroll"><table className="mg-table"><thead><tr><th>報告書</th><th>提出者</th><th>報告日</th><th>確認状況</th><th><span className="sr-only">詳細</span></th></tr></thead><tbody>{pageRows.map((r, i) => <tr key={r.id} style={{ '--row-delay': `${i * 27}ms` } as CSSProperties}>
                <td><div className="mg-report-name"><span className={`mg-doc-icon ${r.category === 'トラブル対応' ? 'mg-doc-alert' : ''}`}>{r.category === 'トラブル対応' ? <CircleAlert size={17} /> : <FileText size={17} />}</span><div><button className="mg-title-button" onClick={e => openReport(r, e.currentTarget)}>{r.title}</button><div className="mg-report-meta"><Category value={r.category} />{r.attachments.length > 0 && <span><Paperclip size={10} />{r.attachments.length}</span>}</div></div></div></td>
                <td><div className="mg-author-cell"><span className={`mg-avatar mg-building-${r.author.building}`}>{r.author.name.slice(-1)}</span><div><strong>{r.author.name}</strong><small>{r.author.role} · {buildings[r.author.building] || '—'}</small></div></div></td><td className="mg-date-cell">{shortDate(r.reportDate)}<small>{new Date(r.submittedAt).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}</small></td><td><ReviewStatus reviewed={r.review.reviewed} /></td><td><button className="mg-row-open" aria-label={`${r.title}の詳細`} onClick={e => openReport(r, e.currentTarget)}><ChevronRight size={17} /></button></td>
              </tr>)}</tbody></table></div>
              {!filtered.length && <div className="mg-empty"><FolderOpen size={35} /><h3>{reports.length ? '該当する報告書はありません' : 'この月の報告書はありません'}</h3>{(query || building || category || status) && <button className="mg-secondary" onClick={clearFilters}>絞り込みを解除</button>}</div>}
              <div className="mg-pagination"><span>{filtered.length ? `${(activePage - 1) * 8 + 1}–${Math.min(activePage * 8, filtered.length)}` : '0'} / {filtered.length}件</span><div><button aria-label="前のページ" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}><ChevronLeft size={15} /></button><span>{activePage} / {maxPage}</span><button aria-label="次のページ" disabled={activePage >= maxPage} onClick={() => setPage(activePage + 1)}><ChevronRight size={15} /></button></div></div>
            </section>
            {(section === 'overview' || section === 'summary') && <aside className="mg-insights"><section className="mg-glass mg-category-panel"><div className="mg-panel-heading"><h2>業務別の報告</h2><ChartNoAxesCombined size={17} /></div><div className="mg-category-total"><strong>{reports.length}</strong><span>件の報告</span></div><div className="mg-category-bars">{counts.map((c, i) => <button key={c.label} aria-label={`${c.label} ${c.count}件に絞り込む`} onClick={() => { setSection('reports'); setCategory(c.label); setStatus(''); }}><span><i className={`mg-legend mg-legend-${i}`} />{c.label}<b>{c.count}<small>件</small></b></span><span className="mg-bar-track"><i className={`mg-bar-${i}`} style={{ width: `${reports.length ? c.count / reports.length * 100 : 0}%` }} /></span></button>)}</div></section>
              <section className="mg-attention-panel mg-glass"><div className="mg-panel-heading"><h2>確認が必要な報告</h2><Bell size={17} /></div>{reports.filter(r => !r.review.reviewed).slice(0, 3).map(r => <button key={r.id} className="mg-attention-row" onClick={e => openReport(r, e.currentTarget)}><span className={`mg-attention-dot ${r.category === 'トラブル対応' ? 'is-urgent' : ''}`} /><span><strong>{r.title}</strong><small>{r.author.name} · {shortDate(r.reportDate)}</small></span><ChevronRight size={14} /></button>)}{!pending && <div className="mg-all-reviewed"><CheckCheck size={22} /><span>未確認の報告はありません</span></div>}<button className="mg-text-button" onClick={() => { setSection('pending'); clearFilters(); }}>未確認の報告をすべて見る<ArrowRight size={14} /></button></section>
            </aside>}
          </div>
          <footer className="mg-footer"><span><ShieldCheck size={12} />{manager.communityName} 管理画面</span><span>{demo ? 'デモデータ · 変更はこの画面内のみ' : '提出された報告書を表示しています'}</span></footer>
        </main>
      </div>
    </div>
    {selected && <ReportDialog report={selected} demo={demo} saving={saving} error={error} notice={notice} onClose={closeReport} onReview={review} />}
  </div>;
}

function ReportDialog({ report, demo, saving, error, notice, onClose, onReview }: { report: ManagementReport; demo: boolean; saving: boolean; error: string; notice: string; onClose: () => void; onReview: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [fileError, setFileError] = useState(''), [opening, setOpening] = useState<string | null>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby="mg-report-title" className="mg-dialog" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mg-detail mg-glass"><header><div><span className="mg-eyebrow">報告書詳細</span><div><Category value={report.category} /><ReviewStatus reviewed={report.review.reviewed} /></div></div><button className="mg-icon-button" aria-label="報告書を閉じる" disabled={saving} onClick={onClose}><X size={20} /></button></header>
      <div className="mg-detail-body"><h2 id="mg-report-title">{report.title}</h2><dl className="mg-detail-meta"><div><dt>提出者</dt><dd>{report.author.name}<span>{report.author.role}</span></dd></div><div><dt>棟・部屋</dt><dd>{buildings[report.author.building] || '—'} {report.author.unit}</dd></div><div><dt>報告日</dt><dd>{report.reportDate.replaceAll('-', '/')}</dd></div><div><dt>提出日時</dt><dd>{jstTime(report.submittedAt)}</dd></div></dl>
        <section className="mg-report-body"><h3>報告内容</h3><p>{report.body || '記載なし'}</p></section>
        {report.locationLabel && <div className="mg-detail-location"><MapPin size={16} /><span>{report.locationLabel}</span></div>}
        {report.attachments.length > 0 && <section className="mg-attachments"><h3>添付ファイル<span>{report.attachments.length}</span></h3>{report.attachments.map((a, i) => <button key={i} disabled={!!opening || !a.path} onClick={async () => {
          setFileError('');
          if (demo) { setFileError('デモデータには添付ファイルの実体はありません。'); return; }
          if (!a.path) return;
          const target = window.open('about:blank', '_blank'); if (target) target.opener = null;
          setOpening(a.path);
          try { const url = await managementAttachmentUrl(a.path); if (target) target.location.replace(url); else setFileError('ファイルを開けませんでした。このサイトのポップアップを許可してもう一度お試しください。'); }
          catch { target?.close(); setFileError('添付を開けませんでした。接続と閲覧権限を確認してください。'); }
          finally { setOpening(null); }
        }}><span className="mg-file-icon"><FileText size={18} /></span><span>{a.label || '添付ファイル'}<small>{opening === a.path ? '準備中' : 'ファイルを開く'}</small></span><ArrowDownToLine size={16} /></button>)}</section>}
        {report.review.reviewed && <div className="mg-review-stamp"><ShieldCheck size={18} /><div><strong>{report.review.reviewerName} が確認済み</strong><span>{jstTime(report.review.reviewedAt)}</span></div></div>}
        {(error || fileError) && <p role="alert" className="mg-alert">{fileError || error}</p>}{notice && <p role="status" className="mg-success"><Check size={16} />{notice}</p>}
      </div><footer><button className="mg-secondary" onClick={() => window.print()} disabled={saving}><Printer size={16} />印刷</button><button className="mg-primary" onClick={() => void onReview()} disabled={saving}>{saving ? <RefreshCw size={16} className="mg-spin" /> : <CheckCheck size={17} />}{saving ? '保存中' : report.review.reviewed ? '未確認に戻す' : '確認済みにする'}</button></footer>
    </div>
  </dialog>;
}

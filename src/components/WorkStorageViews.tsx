import { localToday as todayStr, useCalendarDay } from '../lib/useCalendarDay';
import { VoiceWorkReport } from './VoiceWorkReport';
import { spokenReportDate } from '../lib/workReportVoice';
import { useScreenState } from '../lib/navigation';
import React, { useState } from 'react';
import { Send, Users, Package, Archive, ChevronRight, Calendar, Check, FileText, Printer, Copy, Mail, X, Lock } from 'lucide-react';
import type { CurrentUser } from '../lib/db';

export interface WorkReportItem {
  id: string;
  title: string;
  category?: string;
  activityType: 'inherent' | 'cooperation' | 'common' | 'trouble' | 'unit_entry'; // 役職固有業務 | 役職連携業務 | 役職共通業務 | トラブル対応 | ユニット立ち入り
  actionResult?: string; // 起こしたアクションと結果 / 報告内容
  content: string;
  author: string;
  date: string;
  entryUnit?: string; // 棟・ユニット番号 (ユニット立ち入り時)
  entryPurpose?: string; // 立ち入り目的 (ユニット立ち入り時)
}

interface WorkStorageViewsProps {
  mode: 'work' | 'warehouse';
  currentUser: CurrentUser;
  reports: WorkReportItem[];
  onSubmitReport: (
    title: string,
    content: string,
    date: string,
    activityType: 'inherent' | 'cooperation' | 'common' | 'trouble' | 'unit_entry',
    actionResult?: string,
    entryUnit?: string,
    entryPurpose?: string
  ) => Promise<void>;
  onOpenRoster: () => void;
  onOpenInventory: () => void;
  onOpenArchives: () => void;
}


export const WorkStorageViews: React.FC<WorkStorageViewsProps> = ({
  mode,
  currentUser,
  reports,
  onSubmitReport,
  onOpenRoster,
  onOpenInventory,
  onOpenArchives
}) => {
  // 今日の日付 (YYYY-MM-DD)
  const [reportDate, setReportDate] = useScreenState<string>(`work:${currentUser.id}:reportDate`, todayStr, false);
  const [reportTitle, setReportTitle] = useScreenState(`work:${currentUser.id}:reportTitle`, '', false);
  const [activityType, setActivityType] = useScreenState<'inherent' | 'cooperation' | 'common' | 'trouble' | 'unit_entry'>(`work:${currentUser.id}:activityType`, 'inherent', false);
  const [actionResult, setActionResult] = useScreenState(`work:${currentUser.id}:actionResult`, '', false);
  const [reportContent, setReportContent] = useScreenState(`work:${currentUser.id}:reportContent`, '', false);

  // ユニット立ち入り用フォームステート
  const [reportEntryUnit, setReportEntryUnit] = useScreenState(`work:${currentUser.id}:reportEntryUnit`, '', false);
  const [reportEntryPurpose, setReportEntryPurpose] = useScreenState(`work:${currentUser.id}:reportEntryPurpose`, '', false);

  const [voiceBusy, setVoiceBusy] = useState(false);
  const [dateNotice, setDateNotice] = useScreenState(`voice-report:${currentUser.id}:dateNotice`, '', false);
  const [reviewing, setReviewing] = useScreenState(`work:${currentUser.id}:reviewing`, false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const [titleEdited, setTitleEdited] = useScreenState(`voice-report:${currentUser.id}:titleEdited`, false, false);
  const updateReportBody = (value: string) => {
    setActionResult(value);
    setReportContent('');
    if (!titleEdited) setReportTitle(Array.from(value.trim().split(/[。\n]/)[0]).slice(0, 40).join(''));
    setSaveNotice('');
  };
  const requestReview = () => {
    if (voiceBusy || !reportTitle.trim() || !actionResult.trim()) {
      setSaveError('何をしたかと結果を入力し、報告書の内容を確認してください。'); return;
    }
    if (!reportDate || !spokenReportDate(reportDate, todayStr())) { setSaveError('実施日を選択してください。'); return; }
    if (dateNotice) { setSaveError('実施日を確認して、日付を選択してください。'); return; }
    if (activityType === 'unit_entry' && (!reportEntryUnit.trim() || !reportEntryPurpose.trim())) {
      setSaveError('立ち入り先と目的を入力してください。'); return;
    }
    setSaveError(''); setReviewing(true);
  };

  // 西松地所公式フォーマット用ステート
  const [showNishimatsuModal, setShowNishimatsuModal] = useScreenState('monthly-report-modal', false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [studentYear, setStudentYear] = useState('3年');
  const [studentId, setStudentId] = useState('H24-0892');
  const [absencePeriod, setAbsencePeriod] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  
  // 2. トラブル対応など報告 (公式書面での直接追記用)
  const [troubleDateTime, setTroubleDateTime] = useState('');
  const [troubleContent, setTroubleContent] = useState('');

  // 3. ユニット立ち入り記録 (公式書面での直接追記用)
  const [entryDateTime, setEntryDateTime] = useState('');
  const [entryUnit, setEntryUnit] = useState('');
  const [entryPurpose, setEntryPurpose] = useState('');

  // 4. 学生寮について気づいたこと・要望・意見など
  const [noticeFeedback, setNoticeFeedback] = useState('');

  const [filterPeriod, setFilterPeriod] = useState<'current_month' | 'all'>('current_month');

  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); requestReview(); };
  const confirmReport = async () => {
    if (saving || voiceBusy) return;
    if (!reportTitle.trim() || !actionResult.trim() || !reportDate || dateNotice ||
      (activityType === 'unit_entry' && (!reportEntryUnit.trim() || !reportEntryPurpose.trim()))) {
      setSaveError('報告内容を確認してください。空の報告書は保存できません。'); setReviewing(false); return;
    }
    setSaving(true); setSaveError('');
    try {
      await onSubmitReport(reportTitle.trim(), reportContent.trim() || actionResult.trim(), reportDate || todayStr(), activityType,
        actionResult.trim(), reportEntryUnit.trim(), reportEntryPurpose.trim());
      setReviewing(false); setReportTitle(''); setReportContent(''); setActionResult('');
      setReportEntryUnit(''); setReportEntryPurpose(''); setReportDate(todayStr()); setDateNotice('');
      setTitleEdited(false); setSaveNotice('報告書を保存しました。今月の報告ログと月次レポートに反映しています。');
    } catch { setSaveError('保存できませんでした。入力内容は残しています。もう一度お試しください。'); }
    finally { setSaving(false); }
  };

  // 今月の年月プレフィックス (例: 2026/10 または 2026-10)
  const now = useCalendarDay();
  const currentYearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearMonthDash = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthReports = reports.filter((r) => {
    if (!r.date) return false;
    return r.date.startsWith(currentYearMonth) || r.date.startsWith(currentYearMonthDash);
  });

  const displayedReports = filterPeriod === 'current_month' ? currentMonthReports : reports;

  // ============================================================
  // モード1: はたらく (S21, S22 業務報告 即時ログ蓄積)
  // ============================================================
  if (mode === 'work') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '12px 10px', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 業務報告ヘッダーと西松地所レポート作成ボタン */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '4px 2px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                業務報告
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  backgroundColor: "var(--glass-inset)",
                  color: "var(--glass-muted)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6
                }}
              >
                <Lock size={11} />
                <span>個人専用</span>
              </span>
            </div>

            <button className="glass-button"
              type="button"
              onClick={() => setShowNishimatsuModal(true)}
              disabled={voiceBusy}
              style={{
                backgroundColor: "var(--glass-primary)",
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(30, 41, 59, 0.15)',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <FileText size={15} />
              <span>西松地所レポート作成</span>
            </button>
          </div>

          <p style={{ fontSize: 13, color: "var(--glass-muted)", margin: 0, lineHeight: 1.5 }}>
            いつ・どこで・何をした・どうなった・申し送りを、話すか入力してください。
          </p>
        </div>

        {saveNotice && <p role="status" className="voice-saved">{saveNotice}</p>}
        {saveError && <p role="alert" className="voice-error">{saveError}</p>}
        {reviewing ? <section className="work-review" aria-labelledby="work-review-heading">
          <span className="voice-eyebrow">保存前の確認</span><h3 id="work-review-heading">報告書の内容</h3>
          <dl><div><dt>実施日</dt><dd>{reportDate}</dd></div><div><dt>業務名</dt><dd>{reportTitle}</dd></div>
          <div><dt>区分</dt><dd>{{ inherent: '役職固有業務', cooperation: '役職連携業務', common: '役職共通業務', trouble: 'トラブル対応', unit_entry: 'ユニット立ち入り' }[activityType]}</dd></div>
          {activityType === 'unit_entry' && <><div><dt>立ち入り先</dt><dd>{reportEntryUnit}</dd></div><div><dt>目的</dt><dd>{reportEntryPurpose}</dd></div></>}
          <div><dt>実施内容・結果</dt><dd className="work-review-body">{actionResult}</dd></div></dl>
          {saveError && <p role="alert" className="voice-error">{saveError}</p>}
          <button type="button" className="glass-button voice-primary" disabled={saving} onClick={confirmReport}>{saving ? '保存しています' : 'この内容で報告書を保存'}</button>
          <button type="button" className="glass-button voice-secondary" disabled={saving} onClick={() => setReviewing(false)}>内容を直す</button>
        </section> : <>
        {/* 業務報告入力フォーム */}
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 2px 8px rgba(23, 26, 33, 0.04)'
          }}
        >
          <h3 style={{ fontSize: 17 }}>報告書への反映内容</h3>
          <p style={{ fontSize: 12, color: "var(--glass-muted)" }}>音声も文字入力も同じ報告書に反映します。まだ保存されていません。</p>
          {dateNotice && <p className="voice-error" role="status">{dateNotice}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 1. 日付 */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
                <Calendar size={14} color="#ea580c" />
                <span>日付</span>
                <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <input
                type="date"
                value={reportDate}
                disabled={voiceBusy}
                onChange={(e) => { setReportDate(e.target.value); setDateNotice(''); }}
                aria-label="報告の実施日"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: "var(--glass-panel)",
                  color: "var(--glass-ink)",
                  outline: 'none'
                }}
              />
            </div>

            {/* 2. 業務名 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
                業務名 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <input
                type="text"
                value={reportTitle}
                disabled={voiceBusy}
                onChange={(e) => { setReportTitle(e.target.value); setTitleEdited(true); }}
                placeholder="業務名を入力"
                aria-label="報告の業務名"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            {/* 3. 区分 西松地所公式区分 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
                区分 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {[
                  { key: 'inherent', label: '役職固有業務' },
                  { key: 'cooperation', label: '役職連携業務' },
                  { key: 'common', label: '役職共通業務' },
                  { key: 'trouble', label: 'トラブル対応' },
                  { key: 'unit_entry', label: 'ユニット立ち入り' }
                ].map((item) => {
                  const isSelected = activityType === item.key;
                  return (
                    <button className="glass-button"
                      key={item.key}
                      type="button"
                      onClick={() => setActivityType(item.key as any)}
                      aria-pressed={isSelected}
                      disabled={voiceBusy}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 700,
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? "var(--glass-primary)" : "var(--glass-inset)",
                        color: isSelected ? '#FFFFFF' : "var(--glass-ink)",
                        border: isSelected ? '1px solid #171A21' : "1px solid var(--glass-border)",
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <span style={{ fontSize: 11, color: "var(--glass-muted)", display: 'block', marginTop: 6 }}>
                {activityType === 'inherent'
                  ? '固有: 自身の役職のメイン業務'
                  : activityType === 'cooperation'
                  ? '連携: 他役職へのサポートや協力業務'
                  : activityType === 'common'
                  ? '共通: 全体会議などの共通業務'
                  : activityType === 'trouble'
                  ? 'トラブル: 発生トラブルの経緯や一次対応'
                  : '立ち入り: 予備キー使用によるユニット立ち入り記録'}
              </span>
            </div>

            {/* ユニット立ち入り時の追加項目 */}
            {activityType === 'unit_entry' && (
              <div
                style={{
                  backgroundColor: "var(--glass-inset)",
                  border: '1px solid #BAE6FD',
                  borderRadius: 8,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: "var(--glass-accent)", marginBottom: 4 }}>
                    棟・ユニット番号 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
                  </label>
                  <input
                    type="text"
                    value={reportEntryUnit}
                    onChange={(e) => setReportEntryUnit(e.target.value)}
                    placeholder="例: ローズマリー棟 302"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #7DD3FC',
                      fontSize: 13,
                      backgroundColor: "var(--glass-panel)",
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: "var(--glass-accent)", marginBottom: 4 }}>
                    立ち入り目的 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
                  </label>
                  <input
                    type="text"
                    value={reportEntryPurpose}
                    onChange={(e) => setReportEntryPurpose(e.target.value)}
                    placeholder="例: 水漏れ確認・緊急立ち入り"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #7DD3FC',
                      fontSize: 13,
                      backgroundColor: "var(--glass-panel)",
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* 4. アクション内容 または 報告内容 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
                {activityType === 'trouble'
                  ? '報告内容'
                  : activityType === 'unit_entry'
                  ? '立ち入り詳細・結果'
                  : '起こしたアクションと結果'} <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <VoiceWorkReport value={actionResult} onChange={updateReportBody} onBusyChange={setVoiceBusy}
                placeholder={activityType === 'trouble' ? 'トラブルの経緯・対応・結果' : activityType === 'unit_entry' ? '立ち入り時の状況・対応・結果' : 'いつ・どこで・何をした・結果・申し送り'} />
            </div>

            {/* 提出ボタン */}
            <button className="glass-button"
              type="submit"
              disabled={voiceBusy || !reportTitle.trim() || !actionResult.trim()}
              style={{
                width: '100%',
                backgroundColor: reportTitle.trim() && actionResult.trim() ? "var(--glass-primary)" : '#D9DEE7',
                color: '#FFFFFF',
                padding: '13px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: reportTitle.trim() && actionResult.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: reportTitle.trim() && actionResult.trim() ? '0 4px 12px rgba(185, 47, 61, 0.25)' : 'none'
              }}
            >
              <Send size={16} />
              <span>報告書を確認する</span>
            </button>
          </form>
        </div>

        </>}

        {/* 報告書を提出するのすぐ下に、その月の報告書が簡単に溜まるセクション */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {/* ヘッダー＆切り替え */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--glass-ink)" }}>
                今月の報告ログ
              </span>
              <span
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#B92F3D',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10
                }}
              >
                {currentMonthReports.length}件
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button className="glass-button"
                type="button"
                onClick={() => setFilterPeriod('current_month')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: filterPeriod === 'current_month' ? "var(--glass-primary)" : "var(--glass-panel)",
                  color: filterPeriod === 'current_month' ? '#FFFFFF' : "var(--glass-muted)",
                  border: "1px solid var(--glass-border)",
                  cursor: 'pointer'
                }}
              >
                今月
              </button>
              <button className="glass-button"
                type="button"
                onClick={() => setFilterPeriod('all')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: filterPeriod === 'all' ? "var(--glass-primary)" : "var(--glass-panel)",
                  color: filterPeriod === 'all' ? '#FFFFFF' : "var(--glass-muted)",
                  border: "1px solid var(--glass-border)",
                  cursor: 'pointer'
                }}
              >
                全件
              </button>
            </div>
          </div>

          {/* 溜まっていく報告書カード一覧 */}
          {displayedReports.length === 0 ? (
            <div className="glass-panel"
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px dashed var(--glass-border)",
                padding: '30px 16px',
                textAlign: 'center',
                color: "var(--glass-muted)",
                fontSize: 13
              }}
            >
              今月の報告はまだありません。上のフォームから業務を即時記録できます
            </div>
          ) : (
            displayedReports.map((rep) => (
              <div className="glass-panel"
                key={rep.id}
                style={{
                  backgroundColor: "var(--glass-panel)",
                  borderRadius: 10,
                  border: "1px solid var(--glass-border)",
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  boxShadow: '0 1px 4px rgba(23, 26, 33, 0.03)'
                }}
              >
                {/* 日付と区分バッジと提出済みステータス */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        backgroundColor:
                          rep.activityType === 'trouble'
                            ? '#FEE2E2'
                            : rep.activityType === 'unit_entry'
                            ? "var(--glass-inset)"
                            : '#F1F3F7',
                        color:
                          rep.activityType === 'trouble'
                            ? '#DC2626'
                            : rep.activityType === 'unit_entry'
                            ? "var(--glass-accent)"
                            : "var(--glass-ink)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      {rep.activityType === 'inherent'
                        ? '役職固有業務'
                        : rep.activityType === 'cooperation'
                        ? '役職連携業務'
                        : rep.activityType === 'common'
                        ? '役職共通業務'
                        : rep.activityType === 'trouble'
                        ? 'トラブル対応'
                        : rep.activityType === 'unit_entry'
                        ? 'ユニット立ち入り'
                        : rep.category || '業務'}
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--glass-ink)" }}>{rep.title}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                    記録済み
                  </span>
                </div>

                {/* ユニット立ち入り時の棟・ユニット情報 */}
                {rep.activityType === 'unit_entry' && (rep.entryUnit || rep.entryPurpose) && (
                  <div style={{ fontSize: 11.5, color: "var(--glass-accent)", backgroundColor: "var(--glass-inset)", padding: '4px 8px', borderRadius: 4 }}>
                    {rep.entryUnit && <span>対象: {rep.entryUnit} </span>}
                    {rep.entryPurpose && <span>目的: {rep.entryPurpose}</span>}
                  </div>
                )}

                {/* 業務内容 */}
                <p style={{ fontSize: 12.5, color: "var(--glass-muted)", margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {rep.content}
                </p>

                {/* 日付と報告者 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: "var(--glass-muted)", paddingTop: 6, borderTop: '1px solid #F7F8FA' }}>
                  <span>報告者 {rep.author}</span>
                  <span>{rep.date}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 西松地所向け月次提出レポートモーダル */}
        {showNishimatsuModal && (
          <div role="dialog" aria-modal="true" className="app-modal"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              zIndex: 90
            }}
          >
            <div className="glass-panel"
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 16,
                maxWidth: 620,
                width: '100%',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* モーダルヘッダー */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: "var(--glass-primary)",
                  color: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color="#38BDF8" />
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                      西松地所 提出用業務報告レポート
                    </h3>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      対象月 {now.getFullYear()}年{now.getMonth() + 1}月度
                    </span>
                  </div>
                </div>
                <button className="glass-button"
                  type="button"
                  onClick={() => setShowNishimatsuModal(false)}
                  style={{
                    background: 'transparent',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* モーダル本文 レポートプレビュー */}
              <div
                id="nishimatsu-report-print-area"
                style={{
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  backgroundColor: "var(--glass-inset)"
                }}
              >
                {/* 公式報告書ペーパーデザイン */}
                <div
                  style={{
                    backgroundColor: "var(--glass-panel)",
                    border: '1px solid #94A3B8',
                    borderRadius: 8,
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                    color: "var(--glass-ink)",
                    fontFamily: 'sans-serif'
                  }}
                >
                  {/* 書面トップ: 提出期限アラートバッジ & タイトル */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 13, letterSpacing: 2, color: "var(--glass-muted)", display: 'block', marginBottom: 2 }}>
                        H ヴィレッジ
                      </span>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                        役職者活動報告書 {now.getFullYear()}年{now.getMonth() + 1}月分
                      </h2>
                    </div>

                    {/* 赤色 提出期限ボックス */}
                    <div
                      style={{
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: 10.5,
                        lineHeight: 1.3,
                        textAlign: 'center',
                        maxWidth: 180
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: 11, marginBottom: 2 }}>
                        提出期限 翌月5日
                      </strong>
                      <span>締切までにご提出がない場合、当月の手当は支給されません</span>
                    </div>
                  </div>

                  {/* ヘッダー基本情報テーブル */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #334155' }}>
                    <tbody>
                      <tr>
                        <th style={{ backgroundColor: "var(--glass-inset)", padding: '6px 8px', border: '1px solid #334155', width: '25%', textAlign: 'left', fontWeight: 700 }}>
                          役職 HL・OA/EA/IA・FL
                        </th>
                        <td style={{ padding: '6px 8px', border: '1px solid #334155', width: '25%', fontWeight: 700 }}>
                          {currentUser.role}
                        </td>
                        <th style={{ backgroundColor: "var(--glass-inset)", padding: '6px 8px', border: '1px solid #334155', width: '25%', textAlign: 'left', fontWeight: 700 }}>
                          FLのみ 担当フロア
                        </th>
                        <td style={{ padding: '6px 8px', border: '1px solid #334155', width: '25%' }}>
                          {currentUser.floor}F
                        </td>
                      </tr>
                      <tr>
                        <th style={{ backgroundColor: "var(--glass-inset)", padding: '6px 8px', border: '1px solid #334155', textAlign: 'left', fontWeight: 700 }}>
                          ハウス・部屋番号
                        </th>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                          {currentUser.building}棟 {currentUser.unit}号室
                        </td>
                      </tr>
                      <tr>
                        <th style={{ backgroundColor: "var(--glass-inset)", padding: '6px 8px', border: '1px solid #334155', textAlign: 'left', fontWeight: 700 }}>
                          学年・学籍番号・氏名
                        </th>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: "var(--glass-muted)" }}>学年:</span>
                              <input
                                type="text"
                                value={studentYear}
                                onChange={(e) => setStudentYear(e.target.value)}
                                style={{ width: 50, padding: '2px 4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 12 }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: "var(--glass-muted)" }}>学籍番号:</span>
                              <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                style={{ width: 90, padding: '2px 4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 12 }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: "var(--glass-muted)" }}>氏名:</span>
                              <strong style={{ fontSize: 13 }}>{currentUser.name}</strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th style={{ backgroundColor: "var(--glass-inset)", padding: '6px 8px', border: '1px solid #334155', textAlign: 'left', fontWeight: 700 }}>
                          当該月内での不在日・期間
                        </th>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={absencePeriod}
                              onChange={(e) => setAbsencePeriod(e.target.value)}
                              placeholder="例: 10月10日〜10月12日"
                              style={{ width: 170, padding: '2px 6px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 12 }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: "var(--glass-muted)" }}>理由:</span>
                              <input
                                type="text"
                                value={absenceReason}
                                onChange={(e) => setAbsenceReason(e.target.value)}
                                placeholder="帰省、合宿など"
                                style={{ width: 150, padding: '2px 6px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 12 }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 1. 活動報告 */}
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 2px 0' }}>
                        1. 活動報告　<span style={{ color: '#DC2626', fontSize: 11 }}>必須</span>
                      </h3>
                      <div style={{ fontSize: 10.5, color: "var(--glass-muted)", lineHeight: 1.4, backgroundColor: "var(--glass-inset)", padding: '6px 8px', borderRadius: 4, border: "1px solid var(--glass-border)" }}>
                        <span>注1 項目詳細: 【固有】メイン業務 / 【連携】他役職へのサポートや協力 / 【共通】緊急対応、会議などの共通業務</span>
                        <br />
                        <span>注2 特に問題がなかった場合でも現状維持のために実施したことや気づきを記入してください</span>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #334155' }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--glass-inset)", borderBottom: '1px solid #334155' }}>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '110px', textAlign: 'center' }}>項目</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '90px', textAlign: 'center' }}>日付</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', textAlign: 'left' }}>起こしたアクションと結果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 役職固有業務 */}
                        {(() => {
                          const inherentList = currentMonthReports.filter((r) => r.activityType === 'inherent' || (!r.activityType && r.category !== '緊急対応' && r.category !== '会議・協議'));
                          if (inherentList.length === 0) {
                            return (
                              <tr>
                                <th style={{ backgroundColor: "var(--glass-inset)", padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>
                                  役職固有業務
                                </th>
                                <td colSpan={2} style={{ padding: '8px', border: '1px solid #334155', color: '#94A3B8', textAlign: 'center' }}>
                                  該当なし
                                </td>
                              </tr>
                            );
                          }
                          return inherentList.map((item, idx) => (
                            <tr key={item.id}>
                              {idx === 0 && (
                                <th
                                  rowSpan={inherentList.length}
                                  style={{ backgroundColor: "var(--glass-inset)", padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}
                                >
                                  役職固有業務
                                </th>
                              )}
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {item.date}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: "var(--glass-ink)", display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                            </tr>
                          ));
                        })()}

                        {/* 役職連携業務 */}
                        {(() => {
                          const coopList = currentMonthReports.filter((r) => r.activityType === 'cooperation' || (!r.activityType && r.category === '会議・協議'));
                          if (coopList.length === 0) {
                            return (
                              <tr>
                                <th style={{ backgroundColor: "var(--glass-inset)", padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>
                                  役職連携業務
                                </th>
                                <td colSpan={2} style={{ padding: '8px', border: '1px solid #334155', color: '#94A3B8', textAlign: 'center' }}>
                                  該当なし
                                </td>
                              </tr>
                            );
                          }
                          return coopList.map((item, idx) => (
                            <tr key={item.id}>
                              {idx === 0 && (
                                <th
                                  rowSpan={coopList.length}
                                  style={{ backgroundColor: "var(--glass-inset)", padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}
                                >
                                  役職連携業務
                                </th>
                              )}
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {item.date}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: "var(--glass-ink)", display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                            </tr>
                          ));
                        })()}

                        {/* 役職共通業務 */}
                        {(() => {
                          const commonList = currentMonthReports.filter((r) => r.activityType === 'common' || (!r.activityType && r.category === '緊急対応'));
                          if (commonList.length === 0) {
                            return (
                              <tr>
                                <th style={{ backgroundColor: "var(--glass-inset)", padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>
                                  役職共通業務
                                </th>
                                <td colSpan={2} style={{ padding: '8px', border: '1px solid #334155', color: '#94A3B8', textAlign: 'center' }}>
                                  該当なし
                                </td>
                              </tr>
                            );
                          }
                          return commonList.map((item, idx) => (
                            <tr key={item.id}>
                              {idx === 0 && (
                                <th
                                  rowSpan={commonList.length}
                                  style={{ backgroundColor: "var(--glass-inset)", padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}
                                >
                                  役職共通業務
                                </th>
                              )}
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {item.date}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: "var(--glass-ink)", display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. トラブル対応など報告 */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 6px 0' }}>
                      2. トラブル対応など報告
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #334155' }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--glass-inset)" }}>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '120px', textAlign: 'left' }}>日時</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', textAlign: 'left' }}>報告内容</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 業務報告ログから自動抽出されたトラブル対応一覧 */}
                        {currentMonthReports
                          .filter((r) => r.activityType === 'trouble')
                          .map((item) => (
                            <tr key={item.id} style={{ backgroundColor: '#FFFDFD' }}>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                <strong>{item.date}</strong>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: '#DC2626', display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                            </tr>
                          ))}

                        {/* 手動追加・直接追記行 */}
                        <tr>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top' }}>
                            <input
                              type="text"
                              value={troubleDateTime}
                              onChange={(e) => setTroubleDateTime(e.target.value)}
                              placeholder="例: 10月3日"
                              style={{ width: '100%', padding: '4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 11.5 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                            <textarea
                              value={troubleContent}
                              onChange={(e) => setTroubleContent(e.target.value)}
                              placeholder="追加で報告するトラブルの経緯、一次対応、結果を記入"
                              rows={2}
                              style={{ width: '100%', padding: '4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 11.5, resize: 'vertical' }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 3. ユニット立ち入り記録 */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 2px 0' }}>
                      3. ユニット立ち入り記録
                    </h3>
                    <p style={{ fontSize: 10.5, color: '#DC2626', margin: '0 0 6px 0' }}>
                      予備キーを使用しユニットに業務上または緊急対応等で立ち入った場合はここに記入してください
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #334155' }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--glass-inset)" }}>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '110px', textAlign: 'left' }}>日時</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '130px', textAlign: 'left' }}>棟・ユニット</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', textAlign: 'left' }}>目的</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 業務報告ログから自動抽出されたユニット立ち入り記録一覧 */}
                        {currentMonthReports
                          .filter((r) => r.activityType === 'unit_entry')
                          .map((item) => (
                            <tr key={item.id} style={{ backgroundColor: "var(--glass-inset)" }}>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                <strong>{item.date}</strong>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top' }}>
                                <strong>{item.entryUnit || item.title}</strong>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: "var(--glass-accent)", display: 'block', marginBottom: 2 }}>{item.entryPurpose || item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                            </tr>
                          ))}

                        {/* 手動追加・直接追記行 */}
                        <tr>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top' }}>
                            <input
                              type="text"
                              value={entryDateTime}
                              onChange={(e) => setEntryDateTime(e.target.value)}
                              placeholder="例: 10月8日"
                              style={{ width: '100%', padding: '4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 11.5 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top' }}>
                            <input
                              type="text"
                              value={entryUnit}
                              onChange={(e) => setEntryUnit(e.target.value)}
                              placeholder="例: ローズマリー棟 302"
                              style={{ width: '100%', padding: '4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 11.5 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                            <textarea
                              value={entryPurpose}
                              onChange={(e) => setEntryPurpose(e.target.value)}
                              placeholder="追加で記録する立ち入り理由・立ち会いの有無など"
                              rows={2}
                              style={{ width: '100%', padding: '4px', border: "1px solid var(--glass-border)", borderRadius: 4, fontSize: 11.5, resize: 'vertical' }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. 学生寮について気づいたこと・要望・意見など */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 2px 0' }}>
                      4. 学生寮について気づいたこと・要望・意見など　<span style={{ color: '#DC2626', fontSize: 11 }}>必須</span>
                    </h3>
                    <p style={{ fontSize: 10.5, color: '#DC2626', margin: '0 0 6px 0' }}>
                      購入希望商品などは記入せず、役職者内の会議で議題に挙げてください
                    </p>
                    <textarea
                      value={noticeFeedback}
                      onChange={(e) => setNoticeFeedback(e.target.value)}
                      placeholder="共用部の利用状況、寮生の動向、施設面の改善要望などを入力してください"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid #334155',
                        fontSize: 12,
                        lineHeight: 1.5,
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* モーダルフッター 操作アクションボタン */}
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: "var(--glass-panel)",
                  borderTop: "1px solid var(--glass-border)",
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {copiedNotice && (
                    <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} />
                      <span>提出テキストをコピーしました</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* テキストコピーボタン */}
                  <button className="glass-button"
                    type="button"
                    onClick={() => {
                      const troubleReports = currentMonthReports.filter((r) => r.activityType === 'trouble');
                      const unitEntryReports = currentMonthReports.filter((r) => r.activityType === 'unit_entry');

                      const troubleLines = [
                        ...troubleReports.map((r, i) => `${i + 1}. 日時: ${r.date} | 内容: ${r.title} - ${r.actionResult || r.content}`),
                        troubleDateTime || troubleContent ? `追加記入. 日時: ${troubleDateTime} | 内容: ${troubleContent}` : ''
                      ].filter(Boolean);

                      const entryLines = [
                        ...unitEntryReports.map((r, i) => `${i + 1}. 日時: ${r.date} | 棟・ユニット: ${r.entryUnit || r.title} | 目的: ${r.entryPurpose || r.title} - ${r.actionResult || r.content}`),
                        entryDateTime || entryUnit || entryPurpose ? `追加記入. 日時: ${entryDateTime} | 棟・ユニット: ${entryUnit} | 目的: ${entryPurpose}` : ''
                      ].filter(Boolean);

                      const textLines = [
                        `西松地所株式会社 御中`,
                        `H ヴィレッジ 役職者活動報告書 ${now.getFullYear()}年${now.getMonth() + 1}月分`,
                        ``,
                        `【基本情報】`,
                        `役職: ${currentUser.role}`,
                        `担当フロア: ${currentUser.floor}F`,
                        `ハウス・部屋番号: ${currentUser.building}棟 ${currentUser.unit}号室`,
                        `学年: ${studentYear} | 学籍番号: ${studentId} | 氏名: ${currentUser.name}`,
                        `不在日・期間: ${absencePeriod || 'なし'} 理由: ${absenceReason || 'なし'}`,
                        ``,
                        `1. 活動報告:`,
                        `■ 役職固有業務:`,
                        ...currentMonthReports
                          .filter((r) => r.activityType === 'inherent')
                          .map((r, i) => `${i + 1}. 日時: ${r.date} | 業務: ${r.title}\n   アクションと結果: ${r.actionResult || r.content}`),
                        ``,
                        `■ 役職連携業務:`,
                        ...currentMonthReports
                          .filter((r) => r.activityType === 'cooperation')
                          .map((r, i) => `${i + 1}. 日時: ${r.date} | 業務: ${r.title}\n   アクションと結果: ${r.actionResult || r.content}`),
                        ``,
                        `■ 役職共通業務:`,
                        ...currentMonthReports
                          .filter((r) => r.activityType === 'common')
                          .map((r, i) => `${i + 1}. 日時: ${r.date} | 業務: ${r.title}\n   アクションと結果: ${r.actionResult || r.content}`),
                        ``,
                        `2. トラブル対応など報告:`,
                        troubleLines.length > 0 ? troubleLines.join('\n') : '該当なし',
                        ``,
                        `3. ユニット立ち入り記録:`,
                        entryLines.length > 0 ? entryLines.join('\n') : '該当なし',
                        ``,
                        `4. 学生寮について気づいたこと・要望・意見など:`,
                        noticeFeedback || '特になし'
                      ].join('\n');
                      navigator.clipboard.writeText(textLines);
                      setCopiedNotice(true);
                      setTimeout(() => setCopiedNotice(false), 3000);
                    }}
                    style={{
                      backgroundColor: "var(--glass-inset)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--glass-ink)",
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={14} />
                    <span>テキストコピー</span>
                  </button>

                  {/* PDF印刷保存 */}
                  <button className="glass-button"
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    style={{
                      backgroundColor: "var(--glass-primary)",
                      color: '#FFFFFF',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} />
                    <span>PDF保存 / 印刷</span>
                  </button>

                  {/* メールで西松地所に送信 */}
                  <a
                    href={`mailto:nishimatsu-info@example.com?subject=${encodeURIComponent(
                      `【Hヴィレッジ役職者活動報告書】${now.getFullYear()}年${now.getMonth() + 1}月分_${currentUser.name}`
                    )}&body=${encodeURIComponent(
                      (() => {
                        const troubleReports = currentMonthReports.filter((r) => r.activityType === 'trouble');
                        const unitEntryReports = currentMonthReports.filter((r) => r.activityType === 'unit_entry');

                        const troubleLines = [
                          ...troubleReports.map((r) => `・${r.date} ${r.title}: ${r.actionResult || r.content}`),
                          troubleDateTime || troubleContent ? `・${troubleDateTime} ${troubleContent}` : ''
                        ].filter(Boolean);

                        const entryLines = [
                          ...unitEntryReports.map((r) => `・${r.date} ${r.entryUnit || r.title}: ${r.entryPurpose || r.title} - ${r.actionResult || r.content}`),
                          entryDateTime || entryUnit || entryPurpose ? `・${entryDateTime} ${entryUnit}: ${entryPurpose}` : ''
                        ].filter(Boolean);

                        return `西松地所株式会社 ご担当者様\n\nHヴィレッジ ${currentUser.building}棟の${currentUser.name}です。\n${now.getFullYear()}年${now.getMonth() + 1}月分の役職者活動報告書を送付いたします。\n\n【役職】${currentUser.role} (担当フロア: ${currentUser.floor}F)\n【学年・学籍番号・氏名】${studentYear} / ${studentId} / ${currentUser.name}\n【不在期間】${absencePeriod || 'なし'} (理由: ${absenceReason || 'なし'})\n\n【1. 活動報告】\n${currentMonthReports
                          .filter((r) => r.activityType === 'inherent' || r.activityType === 'cooperation' || r.activityType === 'common')
                          .map((r) => `・[${r.activityType === 'inherent' ? '固有' : r.activityType === 'cooperation' ? '連携' : '共通'}] ${r.date} ${r.title}\n  アクションと結果: ${r.actionResult || r.content}`)
                          .join('\n\n')}\n\n【2. トラブル対応】\n${troubleLines.length > 0 ? troubleLines.join('\n') : '該当なし'}\n\n【3. ユニット立ち入り記録】\n${entryLines.length > 0 ? entryLines.join('\n') : '該当なし'}\n\n【4. 気づいたこと・要望・意見】\n${noticeFeedback || '特になし'}\n\nご確認のほどよろしくお願い申し上げます。`;
                      })()
                    )}`}
                    style={{
                      backgroundColor: "var(--glass-primary)",
                      color: '#FFFFFF',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Mail size={14} />
                    <span>メールで送信</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // モード2: 保管する (S23 保管ポータル)
  // ============================================================
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 10px',
        maxWidth: 540,
        margin: '0 auto',
        width: '100%',
        gap: 12
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 4px 0' }}>
          保管する
        </h1>

      </div>

      {/* 3つの大きなアクセスしやすい白カード (S23) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
        {/* 1. 寮生名簿 */}
        <div className="glass-panel"
          role="button"
          tabIndex={0}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenRoster(); } }}
          onClick={onOpenRoster}
          style={{
            backgroundColor: "var(--glass-panel)",
            border: '1.5px solid #12BDE8',
            borderRadius: 16,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(23, 26, 33, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="glass-panel"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "var(--glass-inset)",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#12BDE8'
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: "var(--glass-ink)", display: 'block' }}>
                寮生名簿
              </strong>
              <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>寮生の情報を管理</span>
            </div>
          </div>
          <ChevronRight size={20} color="#596273" />
        </div>

        {/* 2. 備品在庫 */}
        <div className="glass-panel"
          role="button"
          tabIndex={0}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenInventory(); } }}
          onClick={onOpenInventory}
          style={{
            backgroundColor: "var(--glass-panel)",
            border: '1.5px solid #F5BE32',
            borderRadius: 16,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(23, 26, 33, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="glass-panel"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "var(--glass-inset)",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F5BE32'
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: "var(--glass-ink)", display: 'block' }}>
                備品在庫
              </strong>
              <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>Excel・CSVから備品台帳を登録</span>
            </div>
          </div>
          <ChevronRight size={20} color="#596273" />
        </div>

        {/* 3. 年度別資料 */}
        <div className="glass-panel"
          role="button"
          tabIndex={0}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenArchives(); } }}
          onClick={onOpenArchives}
          style={{
            backgroundColor: "var(--glass-panel)",
            border: '1.5px solid #A876F5',
            borderRadius: 16,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(23, 26, 33, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="glass-panel"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "var(--glass-inset)",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A876F5'
              }}
            >
              <Archive size={22} />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: "var(--glass-ink)", display: 'block' }}>
                年度別資料
              </strong>
              <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>過去の資料を閲覧</span>
            </div>
          </div>
          <ChevronRight size={20} color="#596273" />
        </div>
      </div>
    </div>
  );
};

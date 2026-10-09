import React, { useState, useEffect } from 'react';
import {
  Send,
  Users,
  Package,
  Archive,
  Search,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Check,
  FileText,
  Printer,
  Copy,
  Mail,
  X,
  Lock,
  UserCheck
} from 'lucide-react';
import type { CurrentUser } from '../lib/db';

export interface WorkReportItem {
  id: string;
  title: string;
  category?: string;
  activityType: 'inherent' | 'cooperation' | 'common' | 'trouble' | 'unit_entry'; // 役職固有業務 | 役職連携業務 | 役職共通業務 | トラブル対応 | ユニット立ち入り
  actionResult?: string; // 起こしたアクションと結果 / 報告内容
  nextPlan?: string; // 次月の予定
  content: string;
  author: string;
  date: string;
  timeRange?: string; // 活動日時
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
    nextPlan?: string,
    timeRange?: string,
    entryUnit?: string,
    entryPurpose?: string
  ) => void;
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
  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [reportDate, setReportDate] = useState<string>(todayStr());
  const [reportTitle, setReportTitle] = useState('');
  const [activityType, setActivityType] = useState<'inherent' | 'cooperation' | 'common' | 'trouble' | 'unit_entry'>('inherent');
  const [timeRange, setTimeRange] = useState('');
  const [actionResult, setActionResult] = useState('');
  const [nextPlan, setNextPlan] = useState('');
  const [reportContent, setReportContent] = useState('');

  // ユニット立ち入り用フォームステート
  const [reportEntryUnit, setReportEntryUnit] = useState('');
  const [reportEntryPurpose, setReportEntryPurpose] = useState('');

  // 西松地所公式フォーマット用ステート
  const [showNishimatsuModal, setShowNishimatsuModal] = useState(false);
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

  // 送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim()) return;
    const dateToSubmit = reportDate || todayStr();
    const finalContent = reportContent.trim() || actionResult.trim() || reportTitle.trim();
    onSubmitReport(
      reportTitle.trim(),
      finalContent,
      dateToSubmit,
      activityType,
      actionResult.trim(),
      nextPlan.trim(),
      timeRange.trim(),
      reportEntryUnit.trim(),
      reportEntryPurpose.trim()
    );
    setReportTitle('');
    setReportContent('');
    setActionResult('');
    setNextPlan('');
    setTimeRange('');
    setReportEntryUnit('');
    setReportEntryPurpose('');
    setReportDate(todayStr());
  };

  // 今月の年月プレフィックス (例: 2026/10 または 2026-10)
  const now = new Date();
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
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#171A21', margin: 0 }}>
                  業務報告
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4
                  }}
                >
                  <Lock size={10} />
                  <span>個人専用</span>
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#596273', margin: 0 }}>
                日々の業務を即時記録。西松地所への提出レポートもワンタップで作成できます
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNishimatsuModal(true)}
              style={{
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(30, 41, 59, 0.2)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <FileText size={14} />
              <span>西松地所レポート作成</span>
            </button>
          </div>
        </div>

        {/* 業務報告入力フォーム */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 2px 8px rgba(23, 26, 33, 0.04)'
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 1. 日付 */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                <Calendar size={14} color="#ea580c" />
                <span>日付</span>
                <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: '#171A21',
                  outline: 'none'
                }}
              />
            </div>

            {/* 2. 業務名 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                業務名 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="業務名を入力"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            {/* 3. 区分 西松地所公式区分 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                区分 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() => setActivityType('inherent')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: activityType === 'inherent' ? '#171A21' : '#F7F8FA',
                    color: activityType === 'inherent' ? '#FFFFFF' : '#171A21',
                    border: activityType === 'inherent' ? '1px solid #171A21' : '1px solid #D9DEE7'
                  }}
                >
                  役職固有業務
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('cooperation')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: activityType === 'cooperation' ? '#171A21' : '#F7F8FA',
                    color: activityType === 'cooperation' ? '#FFFFFF' : '#171A21',
                    border: activityType === 'cooperation' ? '1px solid #171A21' : '1px solid #D9DEE7'
                  }}
                >
                  役職連携業務
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('common')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: activityType === 'common' ? '#171A21' : '#F7F8FA',
                    color: activityType === 'common' ? '#FFFFFF' : '#171A21',
                    border: activityType === 'common' ? '1px solid #171A21' : '1px solid #D9DEE7'
                  }}
                >
                  役職共通業務
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setActivityType('trouble')}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: activityType === 'trouble' ? '#DC2626' : '#FEF2F2',
                    color: activityType === 'trouble' ? '#FFFFFF' : '#DC2626',
                    border: activityType === 'trouble' ? '1px solid #DC2626' : '1px solid #FECACA'
                  }}
                >
                  トラブル対応
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('unit_entry')}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: activityType === 'unit_entry' ? '#0284C7' : '#F0F9FF',
                    color: activityType === 'unit_entry' ? '#FFFFFF' : '#0284C7',
                    border: activityType === 'unit_entry' ? '1px solid #0284C7' : '1px solid #BAE6FD'
                  }}
                >
                  ユニット立ち入り
                </button>
              </div>

              <span style={{ fontSize: 11, color: '#64748B', display: 'block', marginTop: 4 }}>
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

            {/* 活動日時 任意 */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                <Clock size={14} color="#64748B" />
                <span>活動時間帯</span>
                <span style={{ color: '#64748B', fontSize: 11 }}>任意</span>
              </label>
              <input
                type="text"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                placeholder="例: 14:00〜15:30"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>

            {/* ユニット立ち入り時の追加項目 */}
            {activityType === 'unit_entry' && (
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: 8,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0369A1', marginBottom: 4 }}>
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
                      backgroundColor: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0369A1', marginBottom: 4 }}>
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
                      backgroundColor: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* 4. アクション内容 または 報告内容 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                {activityType === 'trouble'
                  ? '報告内容'
                  : activityType === 'unit_entry'
                  ? '立ち入り詳細・結果'
                  : '起こしたアクションと結果'} <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <textarea
                value={actionResult}
                onChange={(e) => setActionResult(e.target.value)}
                placeholder={
                  activityType === 'trouble'
                    ? '発生したトラブルの経緯、一次対応、結果を具体的に入力'
                    : activityType === 'unit_entry'
                    ? '立ち入り時の状況、寮生立ち会いの有無、対応結果を入力'
                    : '実施したアクション、気づき、対応結果を具体的に入力'
                }
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  fontSize: 13,
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* 6. 次月の予定 任意 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                次月の予定 <span style={{ color: '#64748B', fontSize: 11 }}>任意</span>
              </label>
              <input
                type="text"
                value={nextPlan}
                onChange={(e) => setNextPlan(e.target.value)}
                placeholder="次月に継続して行う予定や改善アクション"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>

            {/* 提出ボタン */}
            <button
              type="submit"
              disabled={!reportTitle.trim() || !actionResult.trim()}
              style={{
                width: '100%',
                backgroundColor: reportTitle.trim() && actionResult.trim() ? '#B92F3D' : '#D9DEE7',
                color: '#FFFFFF',
                padding: '13px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 800,
                cursor: reportTitle.trim() && actionResult.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: reportTitle.trim() && actionResult.trim() ? '0 4px 12px rgba(185, 47, 61, 0.25)' : 'none'
              }}
            >
              <Send size={16} />
              <span>報告書を提出</span>
            </button>
          </form>
        </div>

        {/* 報告書を提出するのすぐ下に、その月の報告書が簡単に溜まるセクション */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {/* ヘッダー＆切り替え */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#171A21' }}>
                今月の報告ログ
              </span>
              <span
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#B92F3D',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10
                }}
              >
                {currentMonthReports.length}件
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setFilterPeriod('current_month')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: filterPeriod === 'current_month' ? '#171A21' : '#FFFFFF',
                  color: filterPeriod === 'current_month' ? '#FFFFFF' : '#596273',
                  border: '1px solid #D9DEE7',
                  cursor: 'pointer'
                }}
              >
                今月
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('all')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: filterPeriod === 'all' ? '#171A21' : '#FFFFFF',
                  color: filterPeriod === 'all' ? '#FFFFFF' : '#596273',
                  border: '1px solid #D9DEE7',
                  cursor: 'pointer'
                }}
              >
                全件
              </button>
            </div>
          </div>

          {/* 溜まっていく報告書カード一覧 */}
          {displayedReports.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px dashed #D9DEE7',
                padding: '30px 16px',
                textAlign: 'center',
                color: '#596273',
                fontSize: 13
              }}
            >
              今月の報告はまだありません。上のフォームから業務を即時記録できます
            </div>
          ) : (
            displayedReports.map((rep) => (
              <div
                key={rep.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid #D9DEE7',
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
                            ? '#E0F2FE'
                            : '#F1F3F7',
                        color:
                          rep.activityType === 'trouble'
                            ? '#DC2626'
                            : rep.activityType === 'unit_entry'
                            ? '#0284C7'
                            : '#171A21',
                        fontSize: 11,
                        fontWeight: 800,
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
                    <strong style={{ fontSize: 14, color: '#171A21' }}>{rep.title}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 800 }}>
                    記録済み
                  </span>
                </div>

                {/* ユニット立ち入り時の棟・ユニット情報 */}
                {rep.activityType === 'unit_entry' && (rep.entryUnit || rep.entryPurpose) && (
                  <div style={{ fontSize: 11.5, color: '#0369A1', backgroundColor: '#F0F9FF', padding: '4px 8px', borderRadius: 4 }}>
                    {rep.entryUnit && <span>対象: {rep.entryUnit} </span>}
                    {rep.entryPurpose && <span>目的: {rep.entryPurpose}</span>}
                  </div>
                )}

                {/* 業務内容 */}
                <p style={{ fontSize: 12.5, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  {rep.content}
                </p>

                {/* 日付と報告者 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#596273', paddingTop: 6, borderTop: '1px solid #F7F8FA' }}>
                  <span>報告者 {rep.author}</span>
                  <span>{rep.date}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 西松地所向け月次提出レポートモーダル */}
        {showNishimatsuModal && (
          <div
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
            <div
              style={{
                backgroundColor: '#FFFFFF',
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
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color="#38BDF8" />
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
                      西松地所 提出用業務報告レポート
                    </h3>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      対象月 {now.getFullYear()}年{now.getMonth() + 1}月度
                    </span>
                  </div>
                </div>
                <button
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
                  backgroundColor: '#F1F5F9'
                }}
              >
                {/* 公式報告書ペーパーデザイン */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #94A3B8',
                    borderRadius: 8,
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                    color: '#0F172A',
                    fontFamily: 'sans-serif'
                  }}
                >
                  {/* 書面トップ: 提出期限アラートバッジ & タイトル */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 13, letterSpacing: 2, color: '#475569', display: 'block', marginBottom: 2 }}>
                        H ヴィレッジ
                      </span>
                      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', margin: 0 }}>
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
                        <th style={{ backgroundColor: '#F8FAFC', padding: '6px 8px', border: '1px solid #334155', width: '25%', textAlign: 'left', fontWeight: 700 }}>
                          役職 HL・OA/EA/IA・FL
                        </th>
                        <td style={{ padding: '6px 8px', border: '1px solid #334155', width: '25%', fontWeight: 700 }}>
                          {currentUser.role}
                        </td>
                        <th style={{ backgroundColor: '#F8FAFC', padding: '6px 8px', border: '1px solid #334155', width: '25%', textAlign: 'left', fontWeight: 700 }}>
                          FLのみ 担当フロア
                        </th>
                        <td style={{ padding: '6px 8px', border: '1px solid #334155', width: '25%' }}>
                          {currentUser.floor}F
                        </td>
                      </tr>
                      <tr>
                        <th style={{ backgroundColor: '#F8FAFC', padding: '6px 8px', border: '1px solid #334155', textAlign: 'left', fontWeight: 700 }}>
                          ハウス・部屋番号
                        </th>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                          {currentUser.building}棟 {currentUser.unit}号室
                        </td>
                      </tr>
                      <tr>
                        <th style={{ backgroundColor: '#F8FAFC', padding: '6px 8px', border: '1px solid #334155', textAlign: 'left', fontWeight: 700 }}>
                          学年・学籍番号・氏名
                        </th>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#64748B' }}>学年:</span>
                              <input
                                type="text"
                                value={studentYear}
                                onChange={(e) => setStudentYear(e.target.value)}
                                style={{ width: 50, padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#64748B' }}>学籍番号:</span>
                              <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                style={{ width: 90, padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#64748B' }}>氏名:</span>
                              <strong style={{ fontSize: 13 }}>{currentUser.name}</strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th style={{ backgroundColor: '#F8FAFC', padding: '6px 8px', border: '1px solid #334155', textAlign: 'left', fontWeight: 700 }}>
                          当該月内での不在日・期間
                        </th>
                        <td colSpan={3} style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={absencePeriod}
                              onChange={(e) => setAbsencePeriod(e.target.value)}
                              placeholder="例: 10月10日〜10月12日"
                              style={{ width: 170, padding: '2px 6px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: '#64748B' }}>理由:</span>
                              <input
                                type="text"
                                value={absenceReason}
                                onChange={(e) => setAbsenceReason(e.target.value)}
                                placeholder="帰省、合宿など"
                                style={{ width: 150, padding: '2px 6px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }}
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
                      <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', margin: '0 0 2px 0' }}>
                        1. 活動報告　<span style={{ color: '#DC2626', fontSize: 11 }}>必須</span>
                      </h3>
                      <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.4, backgroundColor: '#F8FAFC', padding: '6px 8px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
                        <span>注1 項目詳細: 【固有】メイン業務 / 【連携】他役職へのサポートや協力 / 【共通】緊急対応、会議などの共通業務</span>
                        <br />
                        <span>注2 特に問題がなかった場合でも現状維持のために実施したことや気づきを記入してください</span>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #334155' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #334155' }}>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '100px', textAlign: 'center' }}>項目</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '90px', textAlign: 'center' }}>活動日時</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', textAlign: 'left' }}>起こしたアクションと結果</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '140px', textAlign: 'left' }}>次月の予定</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 役職固有業務 */}
                        {(() => {
                          const inherentList = currentMonthReports.filter((r) => r.activityType === 'inherent' || (!r.activityType && r.category !== '緊急対応' && r.category !== '会議・協議'));
                          if (inherentList.length === 0) {
                            return (
                              <tr>
                                <th style={{ backgroundColor: '#F8FAFC', padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>
                                  役職固有業務
                                </th>
                                <td colSpan={3} style={{ padding: '8px', border: '1px solid #334155', color: '#94A3B8', textAlign: 'center' }}>
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
                                  style={{ backgroundColor: '#F8FAFC', padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}
                                >
                                  役職固有業務
                                </th>
                              )}
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {item.date} {item.timeRange || ''}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', color: '#475569' }}>
                                {item.nextPlan || '特になし'}
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
                                <th style={{ backgroundColor: '#F8FAFC', padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>
                                  役職連携業務
                                </th>
                                <td colSpan={3} style={{ padding: '8px', border: '1px solid #334155', color: '#94A3B8', textAlign: 'center' }}>
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
                                  style={{ backgroundColor: '#F8FAFC', padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}
                                >
                                  役職連携業務
                                </th>
                              )}
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {item.date} {item.timeRange || ''}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', color: '#475569' }}>
                                {item.nextPlan || '特になし'}
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
                                <th style={{ backgroundColor: '#F8FAFC', padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>
                                  役職共通業務
                                </th>
                                <td colSpan={3} style={{ padding: '8px', border: '1px solid #334155', color: '#94A3B8', textAlign: 'center' }}>
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
                                  style={{ backgroundColor: '#F8FAFC', padding: '8px', border: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}
                                >
                                  役職共通業務
                                </th>
                              )}
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {item.date} {item.timeRange || ''}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: '#0F172A', display: 'block', marginBottom: 2 }}>{item.title}</strong>
                                <span>{item.actionResult || item.content}</span>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', color: '#475569' }}>
                                {item.nextPlan || '特になし'}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. トラブル対応など報告 */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0' }}>
                      2. トラブル対応など報告
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #334155' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F1F5F9' }}>
                          <th style={{ padding: '6px 8px', border: '1px solid #334155', width: '150px', textAlign: 'left' }}>日時</th>
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
                                <strong>{item.date}</strong> {item.timeRange || ''}
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
                              placeholder="例: 10月3日 21:00"
                              style={{ width: '100%', padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 11.5 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                            <textarea
                              value={troubleContent}
                              onChange={(e) => setTroubleContent(e.target.value)}
                              placeholder="追加で報告するトラブルの経緯、一次対応、結果を記入"
                              rows={2}
                              style={{ width: '100%', padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 11.5, resize: 'vertical' }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 3. ユニット立ち入り記録 */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', margin: '0 0 2px 0' }}>
                      3. ユニット立ち入り記録
                    </h3>
                    <p style={{ fontSize: 10.5, color: '#DC2626', margin: '0 0 6px 0' }}>
                      予備キーを使用しユニットに業務上または緊急対応等で立ち入った場合はここに記入してください
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, border: '1px solid #334155' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F1F5F9' }}>
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
                            <tr key={item.id} style={{ backgroundColor: '#F0F9FF' }}>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                <strong>{item.date}</strong> {item.timeRange || ''}
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top' }}>
                                <strong>{item.entryUnit || item.title}</strong>
                              </td>
                              <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                                <strong style={{ color: '#0369A1', display: 'block', marginBottom: 2 }}>{item.entryPurpose || item.title}</strong>
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
                              placeholder="例: 10月8日 14:00"
                              style={{ width: '100%', padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 11.5 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155', verticalAlign: 'top' }}>
                            <input
                              type="text"
                              value={entryUnit}
                              onChange={(e) => setEntryUnit(e.target.value)}
                              placeholder="例: ローズマリー棟 302"
                              style={{ width: '100%', padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 11.5 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #334155' }}>
                            <textarea
                              value={entryPurpose}
                              onChange={(e) => setEntryPurpose(e.target.value)}
                              placeholder="追加で記録する立ち入り理由・立ち会いの有無など"
                              rows={2}
                              style={{ width: '100%', padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 11.5, resize: 'vertical' }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. 学生寮について気づいたこと・要望・意見など */}
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', margin: '0 0 2px 0' }}>
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
                  backgroundColor: '#FFFFFF',
                  borderTop: '1px solid #E2E8F0',
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
                  <button
                    type="button"
                    onClick={() => {
                      const troubleReports = currentMonthReports.filter((r) => r.activityType === 'trouble');
                      const unitEntryReports = currentMonthReports.filter((r) => r.activityType === 'unit_entry');

                      const troubleLines = [
                        ...troubleReports.map((r, i) => `${i + 1}. 日時: ${r.date} ${r.timeRange || ''} | 内容: ${r.title} - ${r.actionResult || r.content}`),
                        troubleDateTime || troubleContent ? `追加記入. 日時: ${troubleDateTime} | 内容: ${troubleContent}` : ''
                      ].filter(Boolean);

                      const entryLines = [
                        ...unitEntryReports.map((r, i) => `${i + 1}. 日時: ${r.date} ${r.timeRange || ''} | 棟・ユニット: ${r.entryUnit || r.title} | 目的: ${r.entryPurpose || r.title} - ${r.actionResult || r.content}`),
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
                          .map((r, i) => `${i + 1}. 日時: ${r.date} ${r.timeRange || ''} | 業務: ${r.title}\n   アクションと結果: ${r.actionResult || r.content}\n   次月の予定: ${r.nextPlan || '特になし'}`),
                        ``,
                        `■ 役職連携業務:`,
                        ...currentMonthReports
                          .filter((r) => r.activityType === 'cooperation')
                          .map((r, i) => `${i + 1}. 日時: ${r.date} ${r.timeRange || ''} | 業務: ${r.title}\n   アクションと結果: ${r.actionResult || r.content}\n   次月の予定: ${r.nextPlan || '特になし'}`),
                        ``,
                        `■ 役職共通業務:`,
                        ...currentMonthReports
                          .filter((r) => r.activityType === 'common')
                          .map((r, i) => `${i + 1}. 日時: ${r.date} ${r.timeRange || ''} | 業務: ${r.title}\n   アクションと結果: ${r.actionResult || r.content}\n   次月の予定: ${r.nextPlan || '特になし'}`),
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
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      color: '#1E293B',
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
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    style={{
                      backgroundColor: '#0284C7',
                      color: '#FFFFFF',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 800,
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
                          ...troubleReports.map((r) => `・${r.date} ${r.timeRange || ''} ${r.title}: ${r.actionResult || r.content}`),
                          troubleDateTime || troubleContent ? `・${troubleDateTime} ${troubleContent}` : ''
                        ].filter(Boolean);

                        const entryLines = [
                          ...unitEntryReports.map((r) => `・${r.date} ${r.timeRange || ''} ${r.entryUnit || r.title}: ${r.entryPurpose || r.title} - ${r.actionResult || r.content}`),
                          entryDateTime || entryUnit || entryPurpose ? `・${entryDateTime} ${entryUnit}: ${entryPurpose}` : ''
                        ].filter(Boolean);

                        return `西松地所株式会社 ご担当者様\n\nHヴィレッジ ${currentUser.building}棟の${currentUser.name}です。\n${now.getFullYear()}年${now.getMonth() + 1}月分の役職者活動報告書を送付いたします。\n\n【役職】${currentUser.role} (担当フロア: ${currentUser.floor}F)\n【学年・学籍番号・氏名】${studentYear} / ${studentId} / ${currentUser.name}\n【不在期間】${absencePeriod || 'なし'} (理由: ${absenceReason || 'なし'})\n\n【1. 活動報告】\n${currentMonthReports
                          .filter((r) => r.activityType === 'inherent' || r.activityType === 'cooperation' || r.activityType === 'common')
                          .map((r) => `・[${r.activityType === 'inherent' ? '固有' : r.activityType === 'cooperation' ? '連携' : '共通'}] ${r.date} ${r.title}\n  アクションと結果: ${r.actionResult || r.content}\n  次月の予定: ${r.nextPlan || '特になし'}`)
                          .join('\n\n')}\n\n【2. トラブル対応】\n${troubleLines.length > 0 ? troubleLines.join('\n') : '該当なし'}\n\n【3. ユニット立ち入り記録】\n${entryLines.length > 0 ? entryLines.join('\n') : '該当なし'}\n\n【4. 気づいたこと・要望・意見】\n${noticeFeedback || '特になし'}\n\nご確認のほどよろしくお願い申し上げます。`;
                      })()
                    )}`}
                    style={{
                      backgroundColor: '#B92F3D',
                      color: '#FFFFFF',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 800,
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
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#171A21', margin: '0 0 4px 0' }}>
          保管する
        </h1>
        <p style={{ fontSize: 13, color: '#596273', margin: '0 0 10px 0' }}>
          名簿、備品、過去の資料を一元管理します
        </p>
      </div>

      {/* 3つの大きなアクセスしやすい白カード (S23) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
        {/* 1. 寮生名簿 */}
        <div
          onClick={onOpenRoster}
          style={{
            backgroundColor: '#FFFFFF',
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
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#F7F8FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#12BDE8'
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: '#171A21', display: 'block' }}>
                寮生名簿
              </strong>
              <span style={{ fontSize: 12, color: '#596273' }}>寮生の情報を管理</span>
            </div>
          </div>
          <ChevronRight size={20} color="#596273" />
        </div>

        {/* 2. 備品在庫 */}
        <div
          onClick={onOpenInventory}
          style={{
            backgroundColor: '#FFFFFF',
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
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#F7F8FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F5BE32'
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: '#171A21', display: 'block' }}>
                備品在庫
              </strong>
              <span style={{ fontSize: 12, color: '#596273' }}>備品の在庫を確認</span>
            </div>
          </div>
          <ChevronRight size={20} color="#596273" />
        </div>

        {/* 3. 年度別資料 */}
        <div
          onClick={onOpenArchives}
          style={{
            backgroundColor: '#FFFFFF',
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
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#F7F8FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A876F5'
              }}
            >
              <Archive size={22} />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: '#171A21', display: 'block' }}>
                年度別資料
              </strong>
              <span style={{ fontSize: 12, color: '#596273' }}>過去の資料を閲覧</span>
            </div>
          </div>
          <ChevronRight size={20} color="#596273" />
        </div>
      </div>
    </div>
  );
};

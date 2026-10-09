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
  category: string;
  content: string;
  author: string;
  date: string;
}

interface WorkStorageViewsProps {
  mode: 'work' | 'warehouse';
  currentUser: CurrentUser;
  reports: WorkReportItem[];
  onSubmitReport: (title: string, category: string, content: string, date: string) => void;
  onOpenRoster: () => void;
  onOpenInventory: () => void;
  onOpenArchives: () => void;
}

const DEFAULT_CATEGORIES = ['見回り', '清掃', '設備点検', 'イベント'];
const STORAGE_KEY_CUSTOM_CATEGORIES = 'tn_custom_work_categories';

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
  const [reportCategory, setReportCategory] = useState<string>('見回り');
  const [reportContent, setReportContent] = useState('');

  // 西松地所向けレポート作成モーダル
  const [showNishimatsuModal, setShowNishimatsuModal] = useState(false);
  const [reportMemo, setReportMemo] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // 分類リスト 個別追加可能
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_CATEGORIES;
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'current_month' | 'all'>('current_month');

  // 新規分類の追加ハンドラー
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_CATEGORIES, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setReportCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // 送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportContent.trim()) return;
    const dateToSubmit = reportDate || todayStr();
    onSubmitReport(reportTitle.trim(), reportCategory, reportContent.trim(), dateToSubmit);
    setReportTitle('');
    setReportContent('');
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

            {/* 3. 分類 個別で追加可能 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#171A21' }}>
                  分類 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
                </label>
                {!isAddingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    style={{
                      background: 'transparent',
                      color: '#ea580c',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} />
                    <span>分類を追加</span>
                  </button>
                )}
              </div>

              {/* 分類ボタン一覧 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map((cat) => {
                  const active = reportCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setReportCategory(cat)}
                      style={{
                        backgroundColor: active ? '#171A21' : '#F7F8FA',
                        color: active ? '#FFFFFF' : '#171A21',
                        border: active ? '1px solid #171A21' : '1px solid #D9DEE7',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* 個別の分類追加入力欄 */}
              {isAddingCategory && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="新しい分類名を入力"
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #ea580c',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    style={{
                      backgroundColor: newCategoryName.trim() ? '#ea580c' : '#D9DEE7',
                      color: '#FFFFFF',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                    style={{
                      backgroundColor: '#F7F8FA',
                      border: '1px solid #D9DEE7',
                      color: '#596273',
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>

            {/* 4. 業務内容 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#171A21', marginBottom: 6 }}>
                業務内容 <span style={{ color: '#B92F3D', fontSize: 11 }}>必須</span>
              </label>
              <textarea
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="業務の内容を入力"
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

            {/* 提出ボタン */}
            <button
              type="submit"
              disabled={!reportTitle.trim() || !reportContent.trim()}
              style={{
                width: '100%',
                backgroundColor: reportTitle.trim() && reportContent.trim() ? '#B92F3D' : '#D9DEE7',
                color: '#FFFFFF',
                padding: '13px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 800,
                cursor: reportTitle.trim() && reportContent.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: reportTitle.trim() && reportContent.trim() ? '0 4px 12px rgba(185, 47, 61, 0.25)' : 'none'
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
                {/* 日付と分類バッジと提出済みステータス */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        backgroundColor: '#F1F3F7',
                        color: '#171A21',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      {rep.category}
                    </span>
                    <strong style={{ fontSize: 14, color: '#171A21' }}>{rep.title}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 800 }}>
                    記録済み
                  </span>
                </div>

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
                  padding: '20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  backgroundColor: '#F8FAFC'
                }}
              >
                {/* 公式レポート用紙風デザイン */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* 書面タイトル */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #0F172A', paddingBottom: 12 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0' }}>
                      学生寮 H-Village 業務実績月次報告書
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginTop: 8 }}>
                      <span>提出先 西松地所株式会社 御中</span>
                      <span>提出日 {todayStr().replace(/-/g, '/')}</span>
                    </div>
                  </div>

                  {/* 報告者情報 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 8,
                      backgroundColor: '#F1F5F9',
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>報告者</span>
                      <strong style={{ color: '#0F172A', fontSize: 13 }}>{currentUser.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>所属棟 / 部屋</span>
                      <strong style={{ color: '#0F172A', fontSize: 13 }}>{currentUser.building}棟 {currentUser.unit}号室</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>役職</span>
                      <strong style={{ color: '#0F172A', fontSize: 13 }}>{currentUser.role}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>当月実績件数</span>
                      <strong style={{ color: '#0284C7', fontSize: 13 }}>{currentMonthReports.length} 件</strong>
                    </div>
                  </div>

                  {/* 分類別集計サマリー */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                      分類別業務集計
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {categories.map((cat) => {
                        const count = currentMonthReports.filter((r) => r.category === cat).length;
                        return (
                          <div
                            key={cat}
                            style={{
                              backgroundColor: count > 0 ? '#EFF6FF' : '#F8FAFC',
                              border: count > 0 ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '6px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12
                            }}
                          >
                            <span style={{ color: '#334155', fontWeight: 600 }}>{cat}</span>
                            <span style={{ fontWeight: 800, color: count > 0 ? '#1D4ED8' : '#94A3B8' }}>
                              {count}件
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 業務明細テーブル */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                      日別業務実績一覧
                    </h4>
                    {currentMonthReports.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
                        当月の業務実績データはありません
                      </p>
                    ) : (
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                              <th style={{ padding: '8px 10px', color: '#475569', width: '95px' }}>日付</th>
                              <th style={{ padding: '8px 10px', color: '#475569', width: '85px' }}>分類</th>
                              <th style={{ padding: '8px 10px', color: '#475569', width: '130px' }}>業務名</th>
                              <th style={{ padding: '8px 10px', color: '#475569' }}>業務内容</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentMonthReports.map((item, idx) => (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: idx === currentMonthReports.length - 1 ? 'none' : '1px solid #F1F5F9',
                                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                                }}
                              >
                                <td style={{ padding: '8px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                  {item.date}
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                                    {item.category}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F172A' }}>
                                  {item.title}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155', lineHeight: 1.4 }}>
                                  {item.content}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 管理会社 西松地所への特記事項 連絡事項 */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                      特記事項 連絡事項
                    </label>
                    <textarea
                      value={reportMemo}
                      onChange={(e) => setReportMemo(e.target.value)}
                      placeholder="管理会社への相談、修繕要望、共有事項などがあればご記入ください"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
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
                      <span>テキストをコピーしました</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* テキストコピーボタン */}
                  <button
                    type="button"
                    onClick={() => {
                      const textLines = [
                        `西松地所株式会社 御中`,
                        `学生寮 H-Village 業務実績月次報告書`,
                        `提出月: ${now.getFullYear()}年${now.getMonth() + 1}月度`,
                        `報告者: ${currentUser.name} (${currentUser.building}棟 ${currentUser.unit}号室 / ${currentUser.role})`,
                        `実績件数: ${currentMonthReports.length}件`,
                        ``,
                        `■ 業務明細一覧:`,
                        ...currentMonthReports.map(
                          (r, i) => `${i + 1}. 日付: ${r.date} | 分類: ${r.category} | 業務名: ${r.title}\n   内容: ${r.content}`
                        ),
                        ``,
                        reportMemo ? `■ 特記事項・連絡事項:\n${reportMemo}` : ''
                      ]
                        .filter(Boolean)
                        .join('\n');
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
                      `【H-Village月次業務報告】${now.getFullYear()}年${now.getMonth() + 1}月度_${currentUser.name}`
                    )}&body=${encodeURIComponent(
                      `西松地所株式会社 ご担当者様\n\nお疲れ様です。H-Village ${currentUser.building}棟の${currentUser.name}です。\n${now.getFullYear()}年${now.getMonth() + 1}月度の業務報告書を送付いたします。\n\n【報告者】${currentUser.name} (${currentUser.building}棟 ${currentUser.unit}号室 / ${currentUser.role})\n【実績件数】${currentMonthReports.length}件\n\n【実績一覧】\n${currentMonthReports
                        .map((r) => `・${r.date} [${r.category}] ${r.title}\n  ${r.content}`)
                        .join('\n\n')}\n\n【特記事項】\n${reportMemo || '特になし'}\n\nご確認のほどよろしくお願い申し上げます。`
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

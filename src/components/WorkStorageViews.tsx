import React, { useState, useEffect } from 'react';
import { Send, Users, Package, Archive, Search, ChevronRight, Plus, Calendar, Clock, Check } from 'lucide-react';
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
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#171A21', margin: '0 0 4px 0' }}>
              業務報告
            </h2>
            <p style={{ fontSize: 12, color: '#596273', margin: 0 }}>
              業務をしたらすぐに報告。その月のログとして下部に蓄積されます
            </p>
          </div>

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

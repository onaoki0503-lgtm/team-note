import React, { useState } from 'react';
import { Send, Users, Package, Archive, Search, ChevronRight } from 'lucide-react';
import type { CurrentUser } from '../lib/db';

export interface WorkReportItem {
  id: string;
  title: string;
  category: '見回り' | '清掃' | '設備点検' | 'イベント';
  content: string;
  author: string;
  date: string;
}

interface WorkStorageViewsProps {
  mode: 'work' | 'warehouse';
  currentUser: CurrentUser;
  reports: WorkReportItem[];
  onSubmitReport: (title: string, category: any, content: string) => void;
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
  // S21/S22 業務報告タブ: 'input' (報告する) | 'submitted' (提出済み)
  const [workTab, setWorkTab] = useState<'input' | 'submitted'>('input');
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState<'見回り' | '清掃' | '設備点検' | 'イベント'>('見回り');
  const [reportContent, setReportContent] = useState('');

  // ============================================================
  // モード1: はたらく (S21, S22)
  // ============================================================
  if (mode === 'work') {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* セグメント切り替え（報告する / 提出済み） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => setWorkTab('input')}
            style={{
              backgroundColor: workTab === 'input' ? '#171A21' : '#FFFFFF',
              color: workTab === 'input' ? '#FFFFFF' : '#171A21',
              border: workTab === 'input' ? '1px solid #171A21' : '1px solid #D9DEE7',
              borderRadius: 8,
              padding: '12px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            報告する
          </button>
          <button
            type="button"
            onClick={() => setWorkTab('submitted')}
            style={{
              backgroundColor: workTab === 'submitted' ? '#171A21' : '#FFFFFF',
              color: workTab === 'submitted' ? '#FFFFFF' : '#171A21',
              border: workTab === 'submitted' ? '1px solid #171A21' : '1px solid #D9DEE7',
              borderRadius: 8,
              padding: '12px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            提出済み
          </button>
        </div>

        {/* S21 業務報告入力 */}
        {workTab === 'input' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
              業務報告
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reportTitle.trim() || !reportContent.trim()) return;
                onSubmitReport(reportTitle.trim(), reportCategory, reportContent.trim());
                setReportTitle('');
                setReportContent('');
                setWorkTab('submitted');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  業務名 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="業務名を入力"
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  分類 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {(['見回り', '清掃', '設備点検', 'イベント'] as const).map((cat) => {
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
                          padding: '10px 4px',
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: 'center'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  報告内容 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="業務の内容を入力"
                  rows={4}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #D9DEE7', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ paddingTop: 8 }}>
                <button
                  type="submit"
                  disabled={!reportTitle.trim() || !reportContent.trim()}
                  style={{
                    width: '100%',
                    backgroundColor: reportTitle.trim() && reportContent.trim() ? '#B92F3D' : '#D9DEE7',
                    color: '#FFFFFF',
                    padding: '14px',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 800
                  }}
                >
                  報告書を提出
                </button>
              </div>
            </form>
          </div>
        )}

        {/* S22 提出済み報告一覧 */}
        {workTab === 'submitted' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #D9DEE7',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#596273'
                }}
              >
                まだ報告がありません
              </div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #D9DEE7',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ backgroundColor: '#F7F8FA', color: '#596273', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        {rep.category}
                      </span>
                      <strong style={{ fontSize: 15, color: '#171A21' }}>{rep.title}</strong>
                    </div>
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                      提出済み
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: '#596273', margin: 0, lineHeight: 1.6 }}>
                    {rep.content}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#596273', paddingTop: 6, borderTop: '1px solid #F7F8FA' }}>
                    <span>報告者 {rep.author}</span>
                    <span>{rep.date}</span>
                  </div>
                </div>
              ))
            )}
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
        position: 'relative',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        maxWidth: 640,
        margin: '0 auto',
        width: '100%'
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#171A21', marginBottom: 4 }}>
          保管する
        </h1>
        <p style={{ fontSize: 13, color: '#596273', marginBottom: 24 }}>
          名簿、備品、過去の資料を一元管理します
        </p>
      </div>

      {/* 3つの大きなアクセスしやすい白カード (S23) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, zIndex: 10 }}>
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

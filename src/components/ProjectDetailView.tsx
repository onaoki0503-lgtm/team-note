import React, { useState } from 'react';
import { Calendar, Users, FileText, CheckCircle2, ChevronRight, Plus, Download, Edit3, ArrowLeft, Lock } from 'lucide-react';
import type { ProjectRecord, CurrentUser } from '../lib/db';

interface ProjectDetailViewProps {
  project: ProjectRecord;
  currentUser: CurrentUser;
  onBack: () => void;
  onToggleJoin: () => void;
  onOpenStep: (stepId: string, stepTitle: string) => void;
  onOpenProposalEdit?: () => void;
  onAddStaff: (residentId: string, role: string) => void;
  onAddGroup: (name: string, leader: string, goal: string, deadline: string) => void;
  onOpenAddStep?: () => void;
  onUpdateProposal?: (proposal: any) => Promise<void>;
  onAddStepItem?: (name: string, dateRange: string) => Promise<void>;
  allResidents: any[];
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  currentUser,
  onBack,
  onToggleJoin,
  onOpenStep,
  onOpenProposalEdit,
  onAddStaff,
  onAddGroup,
  onOpenAddStep,
  onUpdateProposal,
  onAddStepItem,
  allResidents
}) => {
  // S06/S07 タブ: 'overview' (概要) | 'proposal' (企画書) | 'staff' (スタッフ)
  const [activeTab, setActiveTab] = useState<'overview' | 'proposal' | 'staff'>('overview');

  // スタッフ追加モーダル・フォーム
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedStaffRole, setSelectedStaffRole] = useState('スタッフ');

  // 班追加 (S12)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupLeader, setGroupLeader] = useState('');
  const [groupGoal, setGroupGoal] = useState('');
  const [groupDeadline, setGroupDeadline] = useState('');

  // S10 企画書編集モーダル (S10)
  const [showProposalEditModal, setShowProposalEditModal] = useState(false);
  const [propTitle, setPropTitle] = useState(project.proposalDoc?.title || `${project.title} 企画書`);
  const [propRecipient, setPropRecipient] = useState('西松地所様・寮母様');
  const [propDate, setPropDate] = useState('2026/10/15');
  const [propPurpose, setPropPurpose] = useState(project.proposalDoc?.purpose || project.description || '日常の中で気軽に交流できる場をつくり、寮生同士のつながりを深めたい。');
  const [propIssues, setPropIssues] = useState('夜間の時間帯に共有部で会話するきっかけが少ない');
  const [propProposal, setPropProposal] = useState(project.proposalDoc?.proposalOverview || '中庭にスクリーンを設置し、夕方から映画上映会を開催します。');
  const [propCost, setPropCost] = useState(project.proposalDoc?.totalBudget || '自治会費より約 4,800 円');
  const [propSummary, setPropSummary] = useState('安全管理と消灯時間を厳守して運営します');

  // S11 添付ファイルステート (S11)
  const [attachments, setAttachments] = useState([
    { id: 'att-1', name: '会場レイアウト.pdf', size: '1.2 MB', type: 'pdf' },
    { id: 'att-2', name: '参考資料.docx', size: '480 KB', type: 'docx' }
  ]);
  const [selectedPdfPreview, setSelectedPdfPreview] = useState(false);

  // S14 ステップ追加モーダル (S14)
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDate, setNewStepDate] = useState('');

  const isEvent = project.projectType !== 'operation';
  const isJoined = project.members && project.members.some((m) => m.residentId === currentUser.id);

  const bannerSrc = isEvent ? './courtyard_monochrome.png' : './commons_monochrome.png';
  const accentColor = isEvent ? '#FF6B68' : '#12BDE8';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 画面トップバナー 実際の寮のモノクロバナー ＋ 細い色線  */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 140,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#171A21'
        }}
      >
        <img
          src={bannerSrc}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(100%) contrast(110%) brightness(85%)'
          }}
        />
        {/* 細いアクセントライン */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: accentColor
          }}
        />

        {/* バナー上の戻るボタンとステータス */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              backgroundColor: 'rgba(23, 26, 33, 0.75)',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <ArrowLeft size={14} />
            <span>進行中一覧</span>
          </button>

          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#171A21',
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 800
            }}
          >
            {project.status === 'planning' ? '企画中' : project.status === 'testing' ? '試行中' : '進行中'}
          </span>
        </div>
      </div>

      {/* 企画タイトル ＆ 説明 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #D9DEE7',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#171A21', margin: '0 0 6px' }}>
              {project.title}
            </h1>
            <p style={{ fontSize: 13, color: '#596273', margin: 0, lineHeight: 1.6 }}>
              {project.description || '寮生同士のアイデアを形にするプロジェクトです'}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleJoin}
            style={{
              backgroundColor: isJoined ? '#F7F8FA' : '#B92F3D',
              color: isJoined ? '#171A21' : '#FFFFFF',
              border: isJoined ? '1px solid #D9DEE7' : 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {isJoined ? '参加中' : '参加する'}
          </button>
        </div>

        {/* タブナビゲーション 概要 / 企画書 / スタッフ  */}
        <div style={{ display: 'flex', borderBottom: '1px solid #D9DEE7', marginTop: 8 }}>
          {(['overview', 'proposal', 'staff'] as const).map((tab) => {
            const labels = { overview: '概要', proposal: '企画書', staff: 'スタッフ' };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #171A21' : '2px solid transparent',
                  color: active ? '#171A21' : '#596273',
                  fontSize: 14,
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer'
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. 概要タブ (S06 / S07) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 次にやることカード */}
          <div
            style={{
              backgroundColor: isEvent ? '#FF6B68' : '#12BDE8',
              color: '#FFFFFF',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(23, 26, 33, 0.06)'
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, display: 'block' }}>次にやること</span>
              <strong style={{ fontSize: 16, fontWeight: 800 }}>
                {project.nextAction || (isEvent ? '会場の確認をする' : '試行結果を記録')}
              </strong>
            </div>
            <ChevronRight size={20} />
          </div>

          {/* 縦型タイムライン 運営ステップ  */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171A21', margin: 0 }}>
                運営工程
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStepModal(true)}
                style={{
                  backgroundColor: '#F7F8FA',
                  border: '1px solid #D9DEE7',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#171A21'
                }}
              >
                ＋ ステップを追加
              </button>
            </div>

            {/* ステップ一覧 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 12 }}>
              {(project.workflowSteps && project.workflowSteps.length > 0
                ? project.workflowSteps
                : isEvent
                ? [
                    { id: 's1', step: '1', title: 'アイデア', date: 'やりたいことを考える', done: true },
                    { id: 's2', step: '2', title: '企画確認', date: '企画の内容を確認する', active: true },
                    { id: 's3', step: '3', title: '準備', date: '会場や必要なものを準備する' },
                    { id: 's4', step: '4', title: '当日', date: 'イベントを実施する' },
                    { id: 's5', step: '5', title: '振り返り', date: '良かったことをまとめる' }
                  ]
                : [
                    { id: 'op1', step: '1', title: '課題を調べる', date: '現状を知り、課題を整理する', done: true },
                    { id: 'op2', step: '2', title: '試す', date: '小さく試してみる', active: true },
                    { id: 'op3', step: '3', title: '運用を決める', date: 'みんなでルールをつくる' },
                    { id: 'op4', step: '4', title: '続ける', date: '継続して運用する' }
                  ]
              ).map((st: any) => (
                <div
                  key={st.id || st.step}
                  onClick={() => onOpenStep(st.id, st.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: st.done ? '#171A21' : st.active ? accentColor : '#FFFFFF',
                      border: `2px solid ${st.done ? '#171A21' : st.active ? accentColor : '#D9DEE7'}`,
                      color: st.done || st.active ? '#FFFFFF' : '#596273',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    {st.done ? '✓' : st.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, color: '#171A21' }}>{st.title}</strong>
                      {st.active && (
                        <span style={{ fontSize: 11, color: '#596273', backgroundColor: '#F7F8FA', padding: '2px 6px', borderRadius: 4 }}>
                          現在地
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#596273', display: 'block', marginTop: 2 }}>
                      {st.date}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#596273" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. 企画書タブ (S09 閲覧) */}
      {/* ============================================================ */}
      {activeTab === 'proposal' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ backgroundColor: '#F7F8FA', color: '#596273', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
              下書き
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D9DEE7',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Download size={14} />
                <span>PDF保存</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProposalEditModal(true)}
                style={{
                  backgroundColor: '#171A21',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Edit3 size={14} />
                <span>編集する</span>
              </button>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid #D9DEE7', paddingBottom: 14 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#171A21', margin: 0 }}>
              {project.proposalDoc?.title || `${project.title} 企画書`}
            </h2>
          </div>

          {/* 目次インデックス */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: '#596273' }}>
            <span>01 目的</span>
            <span>•</span>
            <span>02 課題</span>
            <span>•</span>
            <span>03 提案内容</span>
            <span>•</span>
            <span>04 費用</span>
          </div>

          {/* 企画書本文 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171A21', marginBottom: 4 }}>
                目的・背景
              </h4>
              <p style={{ fontSize: 14, color: '#171A21', lineHeight: 1.7, margin: 0 }}>
                {project.proposalDoc?.purpose || project.description || '日常の中で気軽に交流できる場をつくり、寮生同士のつながりを深めたい。'}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171A21', marginBottom: 4 }}>
                提案内容
              </h4>
              <p style={{ fontSize: 14, color: '#171A21', lineHeight: 1.7, margin: 0 }}>
                {project.proposalDoc?.proposalOverview || '中庭にスクリーンを設置し、夕方から映画上映会を開催します。'}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171A21', marginBottom: 4 }}>
                合計概算費用
              </h4>
              <p style={{ fontSize: 14, color: '#171A21', lineHeight: 1.7, margin: 0 }}>
                {project.proposalDoc?.totalBudget || '自治会費より約 4,800 円'}
              </p>
            </div>
          </div>

          {/* S11 添付資料 */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF0F5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171A21', margin: 0 }}>
                添付資料
              </h4>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt('資料名を入力してください: 例 会場図面.pdf');
                  if (name && name.trim()) {
                    setAttachments([...attachments, { id: `att-${Date.now()}`, name: name.trim(), size: '840 KB', type: name.endsWith('.docx') ? 'docx' : 'pdf' }]);
                  }
                }}
                style={{ backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}
              >
                ＋ 資料を追加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map((att) => (
                <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color="#596273" />
                    <strong style={{ fontSize: 13, color: '#171A21' }}>{att.name}</strong>
                    <span style={{ fontSize: 11, color: '#596273' }}>{att.size}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {att.type === 'pdf' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPdfPreview(!selectedPdfPreview)}
                        style={{ backgroundColor: '#FFFFFF', border: '1px solid #D9DEE7', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      >
                        {selectedPdfPreview ? 'プレビューを閉じる' : 'プレビュー'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => alert('ダウンロードを開始しました')}
                        style={{ backgroundColor: '#FFFFFF', border: '1px solid #D9DEE7', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      >
                        ダウンロードして開く
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {selectedPdfPreview && (
                <div style={{ padding: '16px', borderRadius: 8, backgroundColor: '#FFFFFF', border: '1px solid #D9DEE7', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#596273', display: 'block', marginBottom: 8 }}>プレビュー</span>
                  <div style={{ width: '100%', height: 160, backgroundColor: '#EEF0F5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#596273' }}>
                    会場レイアウト図面
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. スタッフタブ (S08 スタッフ・班) */}
      {/* ============================================================ */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* スタッフ追加バー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#596273' }}>
              企画全体および班ごとのメンバー一覧
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddGroupModal(true)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D9DEE7',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#171A21'
                }}
              >
                ＋ 班を追加
              </button>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(true)}
                style={{
                  backgroundColor: '#171A21',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                ＋ スタッフを追加
              </button>
            </div>
          </div>

          {/* 企画全体セクション */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              padding: '16px 20px'
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#596273', marginBottom: 12 }}>
              企画全体
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(project.members || []).map((m) => (
                <div
                  key={m.residentId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #F7F8FA'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#EEF0F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 12
                      }}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: '#171A21', display: 'block' }}>
                        {m.name}
                      </strong>
                      <span style={{ fontSize: 11, color: '#596273' }}>{m.building}棟</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#171A21' }}>
                    {m.eventRole || m.role || 'メンバー'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 班のブロック 広報班、会場班など  */}
          {(project.groups || [
            { id: 'g1', name: '広報班', glName: '寮生B', milestoneTitle: 'ポスター作成' },
            { id: 'g2', name: '会場班', glName: '寮生C', milestoneTitle: '会場レイアウト作成' }
          ]).map((grp) => (
            <div
              key={grp.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #D9DEE7',
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171A21', margin: 0 }}>
                  {grp.name}
                </h4>
                <span style={{ fontSize: 12, color: '#596273' }}>リーダー {grp.glName}</span>
              </div>
              {grp.milestoneTitle && (
                <span style={{ fontSize: 12, color: '#596273', display: 'block' }}>
                  目標 {grp.milestoneTitle}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* S12 班を追加モーダル */}
      {showAddGroupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(23, 26, 33, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 60
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171A21', margin: 0 }}>
              班を追加
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!groupName.trim()) return;
                onAddGroup(groupName.trim(), groupLeader, groupGoal, groupDeadline);
                setShowAddGroupModal(false);
                setGroupName('');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  班の名前 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="会場班"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  リーダー 任意
                </label>
                <input
                  type="text"
                  value={groupLeader}
                  onChange={(e) => setGroupLeader(e.target.value)}
                  placeholder="寮生B"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  目標 任意
                </label>
                <input
                  type="text"
                  value={groupGoal}
                  onChange={(e) => setGroupGoal(e.target.value)}
                  placeholder="会場レイアウトを決める"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  style={{ backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7', padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#B92F3D', color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                >
                  班を追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* スタッフ追加モーダル */}
      {showAddStaffModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(23, 26, 33, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 60
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171A21', margin: 0 }}>
              スタッフを追加
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedResidentId) return;
                onAddStaff(selectedResidentId, selectedStaffRole);
                setShowAddStaffModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  寮生を選択 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <select
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                >
                  <option value="">選択してください</option>
                  {allResidents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.building}棟 {r.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  役割
                </label>
                <input
                  type="text"
                  value={selectedStaffRole}
                  onChange={(e) => setSelectedStaffRole(e.target.value)}
                  placeholder="スタッフ"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7', padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!selectedResidentId}
                  style={{ backgroundColor: '#171A21', color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* S10 企画書編集モーダル */}
      {showProposalEditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(23, 26, 33, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 60
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              maxWidth: 540,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171A21', margin: 0 }}>
                企画書を編集
              </h3>
              <span style={{ fontSize: 11, color: '#FF6B68', fontWeight: 700 }}>未保存の変更</span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const doc = {
                  title: propTitle,
                  recipient: propRecipient,
                  submittedDate: propDate,
                  purpose: propPurpose,
                  issues: propIssues,
                  proposalOverview: propProposal,
                  totalBudget: propCost,
                  summary: propSummary
                };
                if (onUpdateProposal) {
                  await onUpdateProposal(doc);
                }
                setShowProposalEditModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>企画タイトル</label>
                <input
                  type="text"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>提出先</label>
                  <input
                    type="text"
                    value={propRecipient}
                    onChange={(e) => setPropRecipient(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>提出日</label>
                  <input
                    type="text"
                    value={propDate}
                    onChange={(e) => setPropDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>目的・背景</label>
                <textarea
                  value={propPurpose}
                  onChange={(e) => setPropPurpose(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>課題</label>
                <textarea
                  value={propIssues}
                  onChange={(e) => setPropIssues(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>提案内容</label>
                <textarea
                  value={propProposal}
                  onChange={(e) => setPropProposal(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>費用</label>
                <input
                  type="text"
                  value={propCost}
                  onChange={(e) => setPropCost(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>まとめ</label>
                <textarea
                  value={propSummary}
                  onChange={(e) => setPropSummary(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowProposalEditModal(false)}
                  style={{ backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7', padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#171A21', color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* S14 ステップ追加モーダル */}
      {showAddStepModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(23, 26, 33, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 60
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171A21', margin: 0 }}>
              ステップを追加
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newStepName.trim()) return;
                if (onAddStepItem) {
                  await onAddStepItem(newStepName.trim(), newStepDate.trim());
                }
                setShowAddStepModal(false);
                setNewStepName('');
                setNewStepDate('');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  ステップ名 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <input
                  type="text"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  placeholder="会場の下見"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
                <span style={{ fontSize: 11, color: '#596273', display: 'block', marginTop: 4 }}>
                  完了条件を明確にする名前がおすすめ
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  実施予定日・期間
                </label>
                <input
                  type="text"
                  value={newStepDate}
                  onChange={(e) => setNewStepDate(e.target.value)}
                  placeholder="2026/10/20〜2026/10/25"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStepModal(false)}
                  style={{ backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7', padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#171A21', color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                >
                  ステップを追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

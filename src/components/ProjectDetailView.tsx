import { useScreenState } from '../lib/navigation';
import React, { useState } from 'react';
import { FileText, ChevronRight, Download, Edit3 } from 'lucide-react';
import type { ProjectRecord, CurrentUser } from '../lib/db';

interface ProjectDetailViewProps {
  project: ProjectRecord;
  currentUser: CurrentUser;
  onToggleJoin: () => void;
  onOpenStep: (stepId: string, stepTitle: string) => void;
  onAddStaff: (residentId: string, role: string) => void;
  onAddGroup: (name: string, leader: string, goal: string, deadline: string) => void;
  onUpdateProposal?: (proposal: any) => Promise<void>;
  onAddStepItem?: (name: string, dateRange: string) => Promise<void>;
  allResidents: any[];
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  currentUser,
  onToggleJoin,
  onOpenStep,
  onAddStaff,
  onAddGroup,
  onUpdateProposal,
  onAddStepItem,
  allResidents
}) => {
  // S06/S07 タブ: 'overview' (概要) | 'proposal' (企画書) | 'staff' (スタッフ)
  const [activeTab, setActiveTab] = useScreenState<'overview' | 'proposal' | 'staff'>(`project:${project.id}:tab`, 'overview');

  // スタッフ追加モーダル・フォーム
  const [showAddStaffModal, setShowAddStaffModal] = useScreenState('staff-modal', false);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedStaffRole, setSelectedStaffRole] = useState('スタッフ');

  // 班追加 (S12)
  const [showAddGroupModal, setShowAddGroupModal] = useScreenState('group-modal', false);
  const [groupName, setGroupName] = useState('');
  const [groupLeader, setGroupLeader] = useState('');
  const [groupGoal, setGroupGoal] = useState('');
  const [groupDeadline] = useState('');

  // S10 企画書編集モーダル (S10)
  const [showProposalEditModal, setShowProposalEditModal] = useScreenState('proposal-modal', false);
  const [propTitle, setPropTitle] = useScreenState(`project:${project.id}:propTitle`, project.proposalDoc?.title || `${project.title} 企画書`, false);
  const [propRecipient, setPropRecipient] = useScreenState(`project:${project.id}:propRecipient`, project.proposalDoc?.recipient || '', false);
  const [propDate, setPropDate] = useScreenState(`project:${project.id}:propDate`, project.proposalDoc?.submissionDate || '', false);
  const [propPurpose, setPropPurpose] = useScreenState(`project:${project.id}:propPurpose`, project.proposalDoc?.purpose || project.description || '日常の中で気軽に交流できる場をつくり、寮生同士のつながりを深めたい。', false);
  const [propIssues, setPropIssues] = useScreenState(`project:${project.id}:propIssues`, project.proposalDoc?.problems?.join('\n') || '', false);
  const [propProposal, setPropProposal] = useScreenState(`project:${project.id}:propProposal`, project.proposalDoc?.proposalOverview || '中庭にスクリーンを設置し、夕方から映画上映会を開催します。', false);
  const [propCost, setPropCost] = useScreenState(`project:${project.id}:propCost`, project.proposalDoc?.totalBudget || '自治会費より約 4,800 円', false);
  const [propSummary, setPropSummary] = useScreenState(`project:${project.id}:propSummary`, project.proposalDoc?.summary || '', false);

  // S11 添付ファイルステート (S11)
  const [attachments, setAttachments] = useState([
    { id: 'att-1', name: '会場レイアウト.pdf', size: '1.2 MB', type: 'pdf' },
    { id: 'att-2', name: '参考資料.docx', size: '480 KB', type: 'docx' }
  ]);
  const [selectedPdfPreview, setSelectedPdfPreview] = useScreenState('pdf-preview', false);

  // S14 ステップ追加モーダル (S14)
  const [showAddStepModal, setShowAddStepModal] = useScreenState('step-modal', false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDate, setNewStepDate] = useState('');

  const isEvent = project.projectType !== 'operation';
  const isJoined = project.members && project.members.some((m) => m.residentId === currentUser.id);

  const bannerSrc = isEvent ? './courtyard_monochrome.png' : './commons_monochrome.png';
  const accentColor = isEvent ? '#FF6B68' : '#12BDE8';

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '12px 10px', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 画面トップバナー 実際の寮のモノクロバナー ＋ 細い色線  */}
      <div className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: 140,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: "var(--glass-primary)"
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

          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: "var(--glass-ink)",
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700
            }}
          >
            {project.status === 'planning' ? '企画中' : project.status === 'testing' ? '試行中' : '進行中'}
          </span>
        </div>
      </div>

      {/* 企画タイトル ＆ 説明 */}
      <div className="glass-panel"
        style={{
          backgroundColor: "var(--glass-panel)",
          borderRadius: 12,
          border: "1px solid var(--glass-border)",
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 6px' }}>
              {project.title}
            </h1>
            <p style={{ fontSize: 13, color: "var(--glass-muted)", margin: 0, lineHeight: 1.6 }}>
              {project.description || '寮生同士のアイデアを形にするプロジェクトです'}
            </p>
          </div>

          <button className="glass-button"
            type="button"
            onClick={onToggleJoin}
            style={{
              backgroundColor: isJoined ? "var(--glass-inset)" : "var(--glass-primary)",
              color: isJoined ? "var(--glass-ink)" : '#FFFFFF',
              border: isJoined ? "1px solid var(--glass-border)" : 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isJoined ? '参加中' : '参加する'}
          </button>
        </div>

        {/* タブナビゲーション 概要 / 企画書 / スタッフ  */}
        <div style={{ display: 'flex', borderBottom: "1px solid var(--glass-border)", marginTop: 8 }}>
          {(['overview', 'proposal', 'staff'] as const).map((tab) => {
            const labels = { overview: '概要', proposal: '企画書', staff: 'スタッフ' };
            const active = activeTab === tab;
            return (
              <button className="glass-button"
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #171A21' : '2px solid transparent',
                  color: active ? "var(--glass-ink)" : "var(--glass-muted)",
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
          <div className="glass-panel"
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
              <strong style={{ fontSize: 16, fontWeight: 700 }}>
                {project.nextAction || (isEvent ? '会場の確認をする' : '試行結果を記録')}
              </strong>
            </div>
            <ChevronRight size={20} />
          </div>

          {/* 縦型タイムライン 運営ステップ  */}
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                運営工程
              </h3>
              <button className="glass-button"
                type="button"
                onClick={() => setShowAddStepModal(true)}
                style={{
                  backgroundColor: "var(--glass-inset)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--glass-ink)"
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
                      backgroundColor: st.done ? "var(--glass-primary)" : st.active ? accentColor : "var(--glass-panel)",
                      border: `2px solid ${st.done ? '#171A21' : st.active ? accentColor : "var(--glass-border)"}`,
                      color: st.done || st.active ? '#FFFFFF' : "var(--glass-muted)",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {st.done ? '✓' : st.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, color: "var(--glass-ink)" }}>{st.title}</strong>
                      {st.active && (
                        <span style={{ fontSize: 11, color: "var(--glass-muted)", backgroundColor: "var(--glass-inset)", padding: '2px 6px', borderRadius: 4 }}>
                          現在地
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--glass-muted)", display: 'block', marginTop: 2 }}>
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
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ backgroundColor: "var(--glass-inset)", color: "var(--glass-muted)", fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
              下書き
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="glass-button"
                type="button"
                onClick={() => window.print()}
                style={{
                  backgroundColor: "var(--glass-panel)",
                  border: "1px solid var(--glass-border)",
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
              <button className="glass-button"
                type="button"
                onClick={() => setShowProposalEditModal(true)}
                style={{
                  backgroundColor: "var(--glass-primary)",
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

          <div style={{ borderBottom: "1.5px solid var(--glass-border)", paddingBottom: 14 }}>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  backgroundColor: "var(--glass-inset)",
                  color: "var(--glass-accent)",
                  border: '1px solid #BAE6FD',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 4
                }}
              >
                企画提案書
              </span>
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 6px 0', lineHeight: 1.4 }}>
              {project.proposalDoc?.title || `${project.title} 企画書`}
            </h2>
            {project.proposalDoc?.subtitle && (
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 12px 0' }}>
                {project.proposalDoc.subtitle}
              </h3>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: "var(--glass-muted)" }}>
              <span>提出先: {project.proposalDoc?.recipient || '西松地所株式会社 様 / 寮母・管理スタッフの皆様'}</span>
              <span>提出日: {project.proposalDoc?.submissionDate || '2026年10月'}</span>
            </div>
          </div>

          {project.proposalDoc && <dl className="proposal-saved-details">{[
            ['目的', project.proposalDoc.objective], ['実施日時', project.proposalDoc.implementationDate], ['場所', project.proposalDoc.location], ['対象・人数', project.proposalDoc.targetAudience], ['担当・役割', project.proposalDoc.responsible], ['安全・確認事項', project.proposalDoc.requirements?.join('\n')], ['成果・振り返り方法', project.proposalDoc.expectedImpact]
          ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}

          {/* 企画書本文 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 10, fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 8 }}>
                1. 企画の趣旨・背景
              </h4>
              <p style={{ fontSize: 13.5, color: "var(--glass-ink)", lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                {project.proposalDoc?.background || project.proposalDoc?.purpose || project.description || '日常の中で気軽に交流できる場をつくり、寮生同士のつながりを深めたい。'}
              </p>
            </div>

            {project.proposalDoc?.problems && project.proposalDoc.problems.length > 0 && (
              <div>
                <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 10, fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 10 }}>
                  2. 生じている課題 寮生側
                </h4>
                {project.proposalDoc.highlightQuote && (
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: 6,
                      padding: '10px 14px',
                      marginBottom: 10
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#991B1B', marginBottom: 3 }}>
                      前回の会議で最も多く出された意見
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7F1D1D' }}>
                      ・{project.proposalDoc.highlightQuote}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {project.proposalDoc.problems.map((prob, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--glass-ink)", display: 'flex', gap: 6 }}>
                      <span style={{ color: "var(--glass-accent)", fontWeight: 700 }}>・</span>
                      <span>{prob}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 10, fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 8 }}>
                3. 提案内容の概要
              </h4>
              <p style={{ fontSize: 13.5, color: "var(--glass-ink)", lineHeight: 1.7, margin: '0 0 12px 0' }}>
                {project.proposalDoc?.proposalOverview || '具体的な運用ルールおよび設備配置を導入します。'}
              </p>

              {project.proposalDoc?.conceptBoxes && project.proposalDoc.conceptBoxes.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {project.proposalDoc.conceptBoxes.map((box, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "var(--glass-inset)",
                        border: "1.5px solid var(--glass-border)",
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: box.tagColor || "var(--glass-primary)",
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {box.number}
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--glass-ink)" }}>{box.title}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--glass-muted)", margin: 0, lineHeight: 1.45 }}>{box.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {project.proposalDoc?.flowItems && project.proposalDoc.flowItems.length > 0 && (
                <div style={{ border: "1px solid var(--glass-border)", borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--glass-inset)", borderBottom: "1px solid var(--glass-border)" }}>
                        <th style={{ width: '30%', padding: '7px 10px', textAlign: 'left', fontWeight: 700 }}>対象</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700 }}>手順・内容</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.proposalDoc.flowItems.map((fl, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < project.proposalDoc!.flowItems!.length - 1 ? "1px solid var(--glass-border)" : 'none' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, backgroundColor: '#FAFAFA' }}>{fl.target}</td>
                          <td style={{ padding: '8px 10px', color: "var(--glass-ink)" }}>{fl.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {project.proposalDoc?.improvements && project.proposalDoc.improvements.length > 0 && (
              <div>
                <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 10, fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 10 }}>
                  4. 導入による改善点
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {project.proposalDoc.improvements.map((imp, idx) => (
                    <div key={idx} style={{ border: "1px solid var(--glass-border)", borderRadius: 8, overflow: 'hidden' }}>
                      <div
                        style={{
                          backgroundColor: idx === 0 ? "var(--glass-inset)" : idx === 1 ? "var(--glass-inset)" : "var(--glass-inset)",
                          padding: '6px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: idx === 0 ? '#1D4ED8' : idx === 1 ? '#15803D' : '#B45309'
                        }}
                      >
                        {imp.audience}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 4 }}>{imp.title}</div>
                        <p style={{ fontSize: 11, color: "var(--glass-muted)", margin: 0, lineHeight: 1.45 }}>{imp.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 10, fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 10 }}>
                5. 必要資材および費用概算
              </h4>
              {project.proposalDoc?.budgetItems && project.proposalDoc.budgetItems.length > 0 && (
                <div style={{ border: "1px solid var(--glass-border)", borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--glass-inset)", borderBottom: "1px solid var(--glass-border)" }}>
                        <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700 }}>品名</th>
                        <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700 }}>仕様</th>
                        <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700 }}>数量</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>概算費用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.proposalDoc.budgetItems.map((b, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: '7px 8px', fontWeight: 700 }}>{b.name}</td>
                          <td style={{ padding: '7px 8px', color: "var(--glass-muted)" }}>{b.spec}</td>
                          <td style={{ padding: '7px 8px', color: "var(--glass-muted)" }}>{b.quantity}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>{b.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--glass-accent)", margin: 0 }}>
                合計概算費用: {project.proposalDoc?.totalBudget || '自治会費より約 4,800 円'}
              </p>
            </div>

            {project.proposalDoc?.steps && project.proposalDoc.steps.length > 0 && (
              <div>
                <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 10, fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 8 }}>
                  6. 導入手順 案
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: "var(--glass-ink)" }}>
                  {project.proposalDoc.steps.map((st, idx) => (
                    <div key={idx}>{st}</div>
                  ))}
                </div>
              </div>
            )}

            {project.proposalDoc?.summary && (
              <div style={{ backgroundColor: "var(--glass-inset)", borderLeft: '4px solid #64748B', padding: '12px 14px', borderRadius: '0 6px 6px 0' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--glass-muted)", marginBottom: 4 }}>まとめ</div>
                <p style={{ fontSize: 12.5, color: "var(--glass-ink)", margin: 0, lineHeight: 1.6 }}>{project.proposalDoc.summary}</p>
              </div>
            )}
          </div>

          {/* S11 添付資料 */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEF0F5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                添付資料
              </h4>
              <button className="glass-button"
                type="button"
                onClick={() => {
                  const name = window.prompt('資料名を入力してください: 例 会場図面.pdf');
                  if (name && name.trim()) {
                    setAttachments([...attachments, { id: `att-${Date.now()}`, name: name.trim(), size: '840 KB', type: name.endsWith('.docx') ? 'docx' : 'pdf' }]);
                  }
                }}
                style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}
              >
                ＋ 資料を追加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map((att) => (
                <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color="#596273" />
                    <strong style={{ fontSize: 13, color: "var(--glass-ink)" }}>{att.name}</strong>
                    <span style={{ fontSize: 11, color: "var(--glass-muted)" }}>{att.size}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {att.type === 'pdf' ? (
                      <button className="glass-button"
                        type="button"
                        onClick={() => setSelectedPdfPreview(!selectedPdfPreview)}
                        style={{ backgroundColor: "var(--glass-panel)", border: "1px solid var(--glass-border)", borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      >
                        {selectedPdfPreview ? 'プレビューを閉じる' : 'プレビュー'}
                      </button>
                    ) : (
                      <button className="glass-button"
                        type="button"
                        onClick={() => alert('ダウンロードを開始しました')}
                        style={{ backgroundColor: "var(--glass-panel)", border: "1px solid var(--glass-border)", borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}
                      >
                        ダウンロードして開く
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {selectedPdfPreview && (
                <div style={{ padding: '16px', borderRadius: 8, backgroundColor: "var(--glass-panel)", border: "1px solid var(--glass-border)", textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: "var(--glass-muted)", display: 'block', marginBottom: 8 }}>プレビュー</span>
                  <div style={{ width: '100%', height: 160, backgroundColor: "var(--glass-inset)", borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: "var(--glass-muted)" }}>
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
            <span style={{ fontSize: 13, color: "var(--glass-muted)" }}>
              企画全体および班ごとのメンバー一覧
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="glass-button"
                type="button"
                onClick={() => setShowAddGroupModal(true)}
                style={{
                  backgroundColor: "var(--glass-panel)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--glass-ink)"
                }}
              >
                ＋ 班を追加
              </button>
              <button className="glass-button"
                type="button"
                onClick={() => setShowAddStaffModal(true)}
                style={{
                  backgroundColor: "var(--glass-primary)",
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
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              padding: '16px 20px'
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-muted)", marginBottom: 12 }}>
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
                        backgroundColor: "var(--glass-inset)",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 12
                      }}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: "var(--glass-ink)", display: 'block' }}>
                        {m.name}
                      </strong>
                      <span style={{ fontSize: 11, color: "var(--glass-muted)" }}>{m.building}棟</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-ink)" }}>
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
            <div className="glass-panel"
              key={grp.id}
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                  {grp.name}
                </h4>
                <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>リーダー {grp.glName}</span>
              </div>
              {grp.milestoneTitle && (
                <span style={{ fontSize: 12, color: "var(--glass-muted)", display: 'block' }}>
                  目標 {grp.milestoneTitle}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* S12 班を追加モーダル */}
      {showAddGroupModal && (
        <div role="dialog" aria-modal="true" className="app-modal"
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
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="glass-button"
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button className="glass-button"
                  type="submit"
                  style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
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
        <div role="dialog" aria-modal="true" className="app-modal"
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
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="glass-button"
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button className="glass-button"
                  type="submit"
                  disabled={!selectedResidentId}
                  style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
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
        <div role="dialog" aria-modal="true" className="app-modal"
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
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
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
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                企画書を編集
              </h3>
              <span style={{ fontSize: 11, color: '#FF6B68', fontWeight: 700 }}>未保存の変更</span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const doc = {
                  ...project.proposalDoc,
                  title: propTitle,
                  recipient: propRecipient,
                  submissionDate: propDate,
                  purpose: propPurpose,
                  problems: propIssues.split(/\r?\n/).filter(Boolean),
                  ...(project.proposalDoc?.objective ? { objective: propPurpose } : {}),
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
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
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>提出日</label>
                  <input
                    type="text"
                    value={propDate}
                    onChange={(e) => setPropDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>目的・背景</label>
                <textarea
                  value={propPurpose}
                  onChange={(e) => setPropPurpose(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>課題</label>
                <textarea
                  value={propIssues}
                  onChange={(e) => setPropIssues(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>提案内容</label>
                <textarea
                  value={propProposal}
                  onChange={(e) => setPropProposal(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>費用</label>
                <input
                  type="text"
                  value={propCost}
                  onChange={(e) => setPropCost(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>まとめ</label>
                <textarea
                  value={propSummary}
                  onChange={(e) => setPropSummary(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button className="glass-button"
                  type="button"
                  onClick={() => setShowProposalEditModal(false)}
                  style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button className="glass-button"
                  type="submit"
                  style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
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
        <div role="dialog" aria-modal="true" className="app-modal"
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
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
                <span style={{ fontSize: 11, color: "var(--glass-muted)", display: 'block', marginTop: 4 }}>
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button className="glass-button"
                  type="button"
                  onClick={() => setShowAddStepModal(false)}
                  style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button className="glass-button"
                  type="submit"
                  style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
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

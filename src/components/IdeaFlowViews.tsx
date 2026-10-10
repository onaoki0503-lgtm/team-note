import React, { useState, useEffect } from 'react';
import { Camera, FileSpreadsheet, Trash2, Sparkles, Plus, ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react';
import type { ExtractedTopic, ProposalDocument } from '../utils/geminiIdeaService';
import {
  analyzeMeetingNoteWithGemini,
  generateProposalFromTopicWithGemini,
  generateProposalDirectFromTextWithGemini
} from '../utils/geminiIdeaService';

export interface IdeaDraftData {
  projectType: 'event' | 'operation';
  title: string;
  content: string;
  attachedFile?: string;
  meetingNote?: string;
}

interface IdeaFlowViewsProps {
  currentUserId: string;
  initialText: string;
  onCancel: () => void;
  onCreateProject: (draft: IdeaDraftData, nodes: { id: string; label: string; category: string }[]) => Promise<void>;
}

// サンプル議事録テキスト
const SAMPLE_EVENT_MEETING_NOTE = `2026年10月 寮生ミーティング議事録
議題: 秋の中庭イベント企画について
・新入寮生や多学年の交流を深めるため、中庭で星空映画上映会を実施したい。
・大型プロジェクターと音響機材の動作テストが必要。
・夜間は冷え込むため、温かいお茶の用意や防寒シートの配布を行う。
・管理会社西松地所への共用部使用申請書を事前に提出する。
・参加費無料、みんなでゴミ拾いをして終了する。`;

export const IdeaFlowViews: React.FC<IdeaFlowViewsProps> = ({
  currentUserId,
  initialText,
  onCancel,
  onCreateProject
}) => {
  // フローの進行ステップ: 1 入力 -> 2 AI生成中 -> 3 企画書編集・確認
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialText ? 1 : 1);

  // ステップ1: 入力文章
  const [sourceText, setSourceText] = useState(initialText || '');
  const [detectedTopics, setDetectedTopics] = useState<ExtractedTopic[]>([]);
  const [isDetectingTopics, setIsDetectingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ExtractedTopic | null>(null);

  // ステップ3: 企画書データ 人の手で自由に編集可能
  const [proposal, setProposal] = useState<ProposalDocument>({
    title: '秋の中庭星空シネマ 寮生親睦上映会',
    projectType: 'event',
    location: 'Hヴィレッジ 中庭広場',
    targetAudience: '全棟の寮生および役職者メンバー',
    background: '新入寮生や異なる棟のメンバーが集まり、自然な形で会話が生まれる温かい交流の機会が求められています。',
    objective: '中庭の広場を活用して星空の下で映画を鑑賞し、リラックスした雰囲気で新しい友人関係を築くきっかけを作ります。',
    actionSteps: [
      'ステップ1 上映作品の希望アンケートをLINEで実施',
      'ステップ2 プロジェクターと音響機材の動作テスト',
      'ステップ3 管理会社西松地所への共用部使用申請書を提出',
      'ステップ4 当日の会場設営、受付案内、温かい飲み物の配布',
      'ステップ5 上映終了後のゴミ拾いと機材撤収'
    ],
    requirements: [
      '高輝度プロジェクター 1台',
      '屋外用大型自立式スクリーン 1台',
      'スピーカーおよび延長コード 2組',
      '防寒用ブランケット・シート 10枚',
      '紙コップ・温かいお茶ティーバッグ'
    ],
    expectedImpact: '約30名以上の参加による棟を越えた交友関係の深化とコミュニティ活性化を見込みます。'
  });

  // 新規ステップ・機材の入力用
  const [newStepInput, setNewStepInput] = useState('');
  const [newReqInput, setNewReqInput] = useState('');

  // ノードデータ アイデアマップ用
  const [nodes, setNodes] = useState<{ id: string; label: string; category: string }[]>([]);
  const [viewTab, setViewTab] = useState<'sheet' | 'map' | 'list'>('sheet');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 利用者別の一時保存キー
  const draftKey = `team_note_event_proposal_${currentUserId}`;

  // 文章が入力されたら、自動でトピックの検出を軽く行う
  useEffect(() => {
    if (!sourceText.trim()) {
      setDetectedTopics([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsDetectingTopics(true);
      try {
        const topics = await analyzeMeetingNoteWithGemini(sourceText);
        setDetectedTopics(topics);
      } finally {
        setIsDetectingTopics(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sourceText]);

  // AIによる企画書生成を実行
  const handleGenerateProposal = async () => {
    if (!sourceText.trim()) return;

    setCurrentStep(2); // 生成中画面へ

    try {
      let doc: ProposalDocument;
      if (selectedTopic) {
        doc = await generateProposalFromTopicWithGemini(selectedTopic, sourceText);
      } else {
        doc = await generateProposalDirectFromTextWithGemini(sourceText);
      }

      setProposal(doc);

      // アイデアマップ用ノードの生成
      const generatedNodes = [
        { id: 'core', label: doc.title, category: 'core' },
        { id: 'loc', label: `場所 ${doc.location}`, category: 'location' },
        { id: 'aud', label: `対象 ${doc.targetAudience}`, category: 'members' },
        ...doc.actionSteps.slice(0, 3).map((st, idx) => ({
          id: `step-${idx}`,
          label: st,
          category: 'step'
        }))
      ];
      setNodes(generatedNodes);

      // 生成完了後にステップ3（編集・仕上げ画面）へ
      setCurrentStep(3);
    } catch {
      setCurrentStep(1);
    }
  };

  // サンプル議事録の投入
  const handleInsertSample = () => {
    setSourceText(SAMPLE_EVENT_MEETING_NOTE);
    setSelectedTopic(null);
  };

  // ステップ項目の編集・追加・削除
  const handleAddStep = () => {
    if (!newStepInput.trim()) return;
    setProposal({
      ...proposal,
      actionSteps: [...proposal.actionSteps, newStepInput.trim()]
    });
    setNewStepInput('');
  };

  const handleDeleteStep = (index: number) => {
    setProposal({
      ...proposal,
      actionSteps: proposal.actionSteps.filter((_, idx) => idx !== index)
    });
  };

  const handleUpdateStep = (index: number, value: string) => {
    const updated = [...proposal.actionSteps];
    updated[index] = value;
    setProposal({ ...proposal, actionSteps: updated });
  };

  // 備品項目の編集・追加・削除
  const handleAddReq = () => {
    if (!newReqInput.trim()) return;
    setProposal({
      ...proposal,
      requirements: [...proposal.requirements, newReqInput.trim()]
    });
    setNewReqInput('');
  };

  const handleDeleteReq = (index: number) => {
    setProposal({
      ...proposal,
      requirements: proposal.requirements.filter((_, idx) => idx !== index)
    });
  };

  // 最終的なプロジェクト作成確定
  const handleConfirmProject = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const draft: IdeaDraftData = {
        projectType: proposal.projectType,
        title: proposal.title.trim() || '新規イベント企画',
        content: proposal.objective.trim() || proposal.background.trim(),
        meetingNote: sourceText.slice(0, 120)
      };
      await onCreateProject(draft, nodes);
      localStorage.removeItem(draftKey);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}
    >
      {/* ============================================================ */}
      {/* 画面上部: 初めての人でも一目でわかる3ステップ進行バー */}
      {/* ============================================================ */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #D9DEE7',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          boxShadow: '0 2px 8px rgba(23, 26, 33, 0.03)'
        }}
      >
        {/* ステップ1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: currentStep === 1 ? '#0284C7' : '#E2E8F0',
              color: currentStep === 1 ? '#FFFFFF' : '#64748B',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            1
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: currentStep === 1 ? 800 : 600,
              color: currentStep === 1 ? '#0284C7' : '#64748B'
            }}
          >
            文章・議事録の入力
          </span>
        </div>

        <ArrowRight size={14} color="#94A3B8" />

        {/* ステップ2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: currentStep === 2 ? '#0284C7' : '#E2E8F0',
              color: currentStep === 2 ? '#FFFFFF' : '#64748B',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            2
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: currentStep === 2 ? 800 : 600,
              color: currentStep === 2 ? '#0284C7' : '#64748B'
            }}
          >
            AIが読み取り企画書作成
          </span>
        </div>

        <ArrowRight size={14} color="#94A3B8" />

        {/* ステップ3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: currentStep === 3 ? '#0284C7' : '#E2E8F0',
              color: currentStep === 3 ? '#FFFFFF' : '#64748B',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            3
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: currentStep === 3 ? 800 : 600,
              color: currentStep === 3 ? '#0284C7' : '#64748B'
            }}
          >
            人の手で編集・仕上げ
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ステップ1: 文章や議事録を読み取らせる画面 */}
      {/* ============================================================ */}
      {currentStep === 1 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #D9DEE7',
            padding: '24px 20px',
            boxShadow: '0 6px 16px rgba(23, 26, 33, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          {/* 案内ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BAE6FD',
                    color: '#0284C7',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}
                >
                  Gemini 3.8 Flash Medium 搭載
                </span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                  イベント企画エンジン
                </span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: '#171A21', margin: 0 }}>
                イベントの文章や議事録を読み取る
              </h2>
              <p style={{ fontSize: 13, color: '#596273', marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
                メモや議事録を貼り付けると、AIが内容を理解して本格的なイベント企画書を作成します。
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              閉じる
            </button>
          </div>

          {/* 入力補助アクションバー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#171A21' }}>
              文章または議事録の本文
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleInsertSample}
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0284C7',
                  cursor: 'pointer'
                }}
              >
                ✨ サンプル議事録を入れて試す
              </button>
              {sourceText && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceText('');
                    setSelectedTopic(null);
                  }}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* 大きなテキストエリア */}
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="中庭で映画上映会をやりたい。プロジェクターや防寒対策が必要。寮生同士の交流を深めたい... など、思いつきの文章や会議の議事録をそのまま貼り付けてください。"
            rows={8}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1.5px solid #CBD5E1',
              fontSize: 14,
              lineHeight: 1.6,
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              color: '#171A21'
            }}
          />

          {/* 議事録内に複数トピックが検出された場合 ユーザーが選べるトピックカード */}
          {detectedTopics.length > 0 && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                AIが文章から検出した話のトピック
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {detectedTopics.map((top) => {
                  const isCurSelected = selectedTopic?.id === top.id;
                  return (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => setSelectedTopic(isCurSelected ? null : top)}
                      style={{
                        backgroundColor: isCurSelected ? '#0284C7' : '#FFFFFF',
                        color: isCurSelected ? '#FFFFFF' : '#1E293B',
                        border: isCurSelected ? '1px solid #0284C7' : '1px solid #CBD5E1',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isCurSelected && <Check size={12} />}
                      <span>{top.title}</span>
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: '#64748B' }}>
                選ばない場合は文章全体から最も適した企画書を自動構成します
              </span>
            </div>
          )}

          {/* 実行ボタン */}
          <div style={{ paddingTop: 6 }}>
            <button
              type="button"
              onClick={handleGenerateProposal}
              disabled={!sourceText.trim()}
              style={{
                width: '100%',
                backgroundColor: sourceText.trim() ? '#B92F3D' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '15px',
                fontSize: 15,
                fontWeight: 900,
                cursor: sourceText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: sourceText.trim() ? '0 4px 14px rgba(185, 47, 61, 0.25)' : 'none'
              }}
            >
              <Sparkles size={18} />
              <span>Gemini 3.8 Flash Medium でイベント企画書を作成する</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ステップ2: AI読み取り中アニメーション */}
      {/* ============================================================ */}
      {currentStep === 2 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #D9DEE7',
            padding: '60px 24px',
            boxShadow: '0 6px 16px rgba(23, 26, 33, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 2s linear infinite'
            }}
          >
            <RefreshCw size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#171A21', margin: '0 0 6px 0' }}>
              Gemini 3.8 Flash Medium が文章を読み取り中
            </h3>
            <p style={{ fontSize: 13, color: '#596273', margin: 0, lineHeight: 1.6 }}>
              議事録の内容から企画の目的、当日の進行ステップ、必要備品を抽出し、<br />
              人の手で編集できるイベント企画書を構成しています...
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ステップ3: 出力された企画書 人の手で自由に編集できるシート */}
      {/* ============================================================ */}
      {currentStep === 3 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #D9DEE7',
            padding: '24px 20px',
            boxShadow: '0 6px 16px rgba(23, 26, 33, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          {/* 企画書ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}
                >
                  AI読み取り完了 Gemini 3.8 Flash Medium
                </span>
                <span style={{ fontSize: 11, color: '#166534', fontWeight: 700, backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: 4 }}>
                  人の手で自由に編集可能
                </span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: '#171A21', margin: 0 }}>
                イベント企画書
              </h2>
              <p style={{ fontSize: 12, color: '#596273', margin: '4px 0 0 0' }}>
                AIが文章から組み立てた企画書です。各項目をタップして自由に書き換えたり追加したりできます。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ArrowLeft size={13} />
              <span>文章を入れ直す</span>
            </button>
          </div>

          {/* 表示切替タブ */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setViewTab('sheet')}
              style={{
                backgroundColor: viewTab === 'sheet' ? '#171A21' : '#F8FAFC',
                color: viewTab === 'sheet' ? '#FFFFFF' : '#475569',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              企画書シート
            </button>
            <button
              type="button"
              onClick={() => setViewTab('map')}
              style={{
                backgroundColor: viewTab === 'map' ? '#171A21' : '#F8FAFC',
                color: viewTab === 'map' ? '#FFFFFF' : '#475569',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              アイデアマップ
            </button>
          </div>

          {/* 企画書シートビュー 直接編集可能なフォーム */}
          {viewTab === 'sheet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 1. 企画タイトル */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                  企画名・タイトル
                </label>
                <input
                  type="text"
                  value={proposal.title}
                  onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#171A21',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* 2. 開催場所と対象者 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    開催場所
                  </label>
                  <input
                    type="text"
                    value={proposal.location}
                    onChange={(e) => setProposal({ ...proposal, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    対象者
                  </label>
                  <input
                    type="text"
                    value={proposal.targetAudience}
                    onChange={(e) => setProposal({ ...proposal, targetAudience: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* 3. 背景と課題 */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  背景と現状の課題
                </label>
                <textarea
                  value={proposal.background}
                  onChange={(e) => setProposal({ ...proposal, background: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* 4. 目的とゴール */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  目的と目指すゴール
                </label>
                <textarea
                  value={proposal.objective}
                  onChange={(e) => setProposal({ ...proposal, objective: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* 5. 具体的な実施ステップ */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  具体的な実施ステップと当日の流れ
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {proposal.actionSteps.map((stepText, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: '#E2E8F0',
                          color: '#475569',
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={stepText}
                        onChange={(e) => handleUpdateStep(idx, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(idx)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* ステップ追加 */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={newStepInput}
                    onChange={(e) => setNewStepInput(e.target.value)}
                    placeholder="新しいステップを追加..."
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 12,
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddStep}
                    disabled={!newStepInput.trim()}
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      padding: '0 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#334155',
                      cursor: newStepInput.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={14} />
                    <span>追加</span>
                  </button>
                </div>
              </div>

              {/* 6. 必要な機材・備品・準備 */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  必要な機材・備品・申請
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {proposal.requirements.map((req, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>✓ {req}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReq(idx)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                {/* 備品追加 */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={newReqInput}
                    onChange={(e) => setNewReqInput(e.target.value)}
                    placeholder="機材や準備項目を追加..."
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 12,
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddReq}
                    disabled={!newReqInput.trim()}
                    style={{
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      padding: '0 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#334155',
                      cursor: newReqInput.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={14} />
                    <span>追加</span>
                  </button>
                </div>
              </div>

              {/* 7. 期待される効果 */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  期待される成果
                </label>
                <input
                  type="text"
                  value={proposal.expectedImpact}
                  onChange={(e) => setProposal({ ...proposal, expectedImpact: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* アイデアマップビュー */}
          {viewTab === 'map' && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 24,
                minHeight: 220,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}
            >
              <div
                style={{
                  backgroundColor: '#171A21',
                  color: '#FFFFFF',
                  borderRadius: 20,
                  padding: '8px 18px',
                  fontSize: 14,
                  fontWeight: 800
                }}
              >
                {proposal.title}
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0284C7',
                  border: '1.5px solid #BAE6FD',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                場所 {proposal.location}
              </div>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#166534',
                  border: '1.5px solid #BBF7D0',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                対象 {proposal.targetAudience}
              </div>
              {proposal.actionSteps.slice(0, 3).map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#171A21',
                    border: '1px solid #CBD5E1',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {st}
                </div>
              ))}
            </div>
          )}

          {/* 確定アクションボタン */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10 }}>
            <button
              type="button"
              onClick={handleConfirmProject}
              disabled={isSubmitting}
              style={{
                width: '100%',
                backgroundColor: '#B92F3D',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 900,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(185, 47, 61, 0.25)'
              }}
            >
              {isSubmitting ? 'プロジェクト登録中...' : 'この企画書でプロジェクトを開始する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

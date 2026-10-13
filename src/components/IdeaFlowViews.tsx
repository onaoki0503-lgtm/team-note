import React, { useState, useEffect } from 'react';
import { Camera, FileSpreadsheet, Trash2, Sparkles, Plus, ArrowLeft, ArrowRight, Check, RefreshCw, Settings, Key, Printer, Edit3 } from 'lucide-react';
import type { ExtractedTopic, ProposalDocument, ProposalBudgetItem, ProposalConceptBox, ProposalOperationFlowItem, ProposalStakeholderImpact } from '../utils/geminiIdeaService';
import {
  analyzeMeetingNoteWithGemini,
  generateProposalFromTopicWithGemini,
  generateProposalDirectFromTextWithGemini,
  getGeminiApiKey,
  setGeminiApiKey
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

// サンプル議事録テキスト PDFのキッチン改善と親和性の高い実用テキスト
const SAMPLE_EVENT_MEETING_NOTE = `2026年10月 ローズマリーハウス全員会議 議事録
議題: 共用キッチンの布巾および衛生管理について
・一度使用された濡れた布巾がキッチンに置かれたまま再使用されており、汚いせいで洗った食器を拭けないという意見が出た。
・食器用と台拭きの区別が曖昧で衛生面で不安。各自でタオルを持ち込んでいる状態。
・回収用と補充用を分けた3ボックス方式を設置して、寮生が清潔な布巾を使えるようにしたい。
・寮母さんの回収補充作業も効率化したい。
・ストックボックスや分別ラベル、案内ポスターなどの費用見積もりと試験導入手順をまとめたい。`;

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

  // APIキー設定ステート
  const [apiKey, setApiKey] = useState<string>(() => getGeminiApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState<string>('');

  // ステップ3: 企画提案書データ PDF完全準拠
  const [proposal, setProposal] = useState<ProposalDocument>({
    docType: '企画提案書',
    title: '',
    subTitle: '',
    projectType: 'operation',
    submittedTo: '西松地所株式会社 様 / 寮母・管理スタッフの皆様',
    submittedDate: '2026年10月',
    location: '',
    targetAudience: '',
    background: '',
    highlightQuote: '',
    issues: [],
    proposalOverview: '',
    proposalConcept: '',
    conceptBoxes: [],
    operationFlow: [],
    stakeholderImpacts: [],
    budgetItems: [],
    totalCostEstimate: '',
    actionSteps: [],
    summaryText: '',
    objective: '',
    requirements: [],
    expectedImpact: ''
  });

  // 編集モードトグル
  const [isEditMode, setIsEditMode] = useState(false);

  // ノードデータ アイデアマップ用
  const [nodes, setNodes] = useState<{ id: string; label: string; category: string }[]>([]);
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

    setCurrentStep(2);

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
        { id: 'core', label: doc.title || doc.subTitle, category: 'core' },
        { id: 'loc', label: `場所 ${doc.location}`, category: 'location' },
        { id: 'aud', label: `対象 ${doc.targetAudience}`, category: 'members' },
        ...doc.actionSteps.slice(0, 3).map((st, idx) => ({
          id: `step-${idx}`,
          label: st,
          category: 'step'
        }))
      ];
      setNodes(generatedNodes);

      setCurrentStep(3);
    } catch {
      setCurrentStep(1);
    }
  };

  const handleOpenApiKeyModal = () => {
    setTempApiKeyInput(apiKey);
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(tempApiKeyInput);
    setApiKey(tempApiKeyInput.trim());
    setShowApiKeyModal(false);
  };

  // サンプル議事録の投入
  const handleInsertSample = () => {
    setSourceText(SAMPLE_EVENT_MEETING_NOTE);
    setSelectedTopic(null);
  };

  // 課題項目の追加・削除
  const handleAddIssue = () => {
    setProposal({
      ...proposal,
      issues: [...proposal.issues, '新規の課題事項を入力']
    });
  };

  const handleUpdateIssue = (idx: number, val: string) => {
    const updated = [...proposal.issues];
    updated[idx] = val;
    setProposal({ ...proposal, issues: updated });
  };

  const handleDeleteIssue = (idx: number) => {
    setProposal({
      ...proposal,
      issues: proposal.issues.filter((_, i) => i !== idx)
    });
  };

  // 運用フロー項目の更新
  const handleUpdateFlow = (idx: number, field: 'target' | 'content', val: string) => {
    const updated = [...proposal.operationFlow];
    updated[idx] = { ...updated[idx], [field]: val };
    setProposal({ ...proposal, operationFlow: updated });
  };

  // 3つの提案ボックス項目の更新
  const handleUpdateConceptBox = (idx: number, field: 'title' | 'description', val: string) => {
    const updated = [...proposal.conceptBoxes];
    updated[idx] = { ...updated[idx], [field]: val };
    setProposal({ ...proposal, conceptBoxes: updated });
  };

  // 改善点項目の更新
  const handleUpdateImpact = (idx: number, field: 'stakeholder' | 'title' | 'description', val: string) => {
    const updated = [...proposal.stakeholderImpacts];
    updated[idx] = { ...updated[idx], [field]: val };
    setProposal({ ...proposal, stakeholderImpacts: updated });
  };

  // 予算見積もり項目の更新
  const handleUpdateBudget = (idx: number, field: keyof ProposalBudgetItem, val: string) => {
    const updated = [...proposal.budgetItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setProposal({ ...proposal, budgetItems: updated });
  };

  const handleAddBudgetItem = () => {
    setProposal({
      ...proposal,
      budgetItems: [
        ...proposal.budgetItems,
        { name: '新規品目', spec: '仕様', quantity: '1個', cost: '約0円' }
      ]
    });
  };

  const handleDeleteBudgetItem = (idx: number) => {
    setProposal({
      ...proposal,
      budgetItems: proposal.budgetItems.filter((_, i) => i !== idx)
    });
  };

  // 導入手順の更新
  const handleUpdateStep = (idx: number, val: string) => {
    const updated = [...proposal.actionSteps];
    updated[idx] = val;
    setProposal({ ...proposal, actionSteps: updated });
  };

  // 最終的なプロジェクト作成確定
  const handleConfirmProject = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const draft: IdeaDraftData = {
        projectType: proposal.projectType,
        title: `${proposal.title} ${proposal.subTitle}`.trim() || '新規運営企画提案',
        content: proposal.background.slice(0, 300) || proposal.proposalOverview,
        meetingNote: sourceText.slice(0, 160)
      };
      await onCreateProject(draft, nodes);
      localStorage.removeItem(draftKey);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 印刷実行
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 780,
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}
    >
      {/* 画面上部: 3ステップ進行バー */}
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
            AIが要約・分析して企画書作成
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
            企画提案書の確認・編集
          </span>
        </div>
      </div>

      {/* ステップ1: 文章や議事録を読み取らせる画面 */}
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
                    backgroundColor: apiKey ? '#ECFDF5' : '#FFFBEB',
                    border: apiKey ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                    color: apiKey ? '#047857' : '#B45309',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}
                >
                  {apiKey ? 'Gemini 3.8 Flash Medium 稼働中' : 'Gemini API 未接続'}
                </span>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                  {apiKey ? 'クラウドAI要約分析エンジン' : '現在ローカル簡易モード'}
                </span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: '#171A21', margin: 0 }}>
                イベントや運営の議事録・概要を読み取る
              </h2>
              <p style={{ fontSize: 13, color: '#596273', marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
                議事録やメモを貼り付けると、AIが要約・要点分析を行い、提出できる美しい企画提案書を瞬時に作成します。
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={handleOpenApiKeyModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: apiKey ? '#ECFDF5' : '#FFFBEB',
                  border: apiKey ? '1px solid #A7F3D0' : '1px solid #FCD34D',
                  color: apiKey ? '#047857' : '#B45309',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Key size={13} />
                <span>{apiKey ? 'APIキー接続中' : 'API設定'}</span>
              </button>
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
          </div>

          {/* APIキー未接続時の案内バナー */}
          {!apiKey && (
            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="#D97706" />
                <span style={{ fontSize: 12, color: '#92400E', fontWeight: 700, lineHeight: 1.4 }}>
                  Gemini APIキーを設定すると、文章全体の文脈を深く理解した要約や要点分析、本格企画提案書が瞬時に生成されます
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenApiKeyModal}
                style={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                APIキーを設定する
              </button>
            </div>
          )}

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

          {/* テキストエリア */}
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="会議の議事録や企画のメモを貼り付けてください。布巾の衛生問題、中庭でのイベント、備品購入など、どんな内容でもAIが論理的な企画提案書に仕立て上げます。"
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

          {/* 検出されたトピック */}
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
                AIが文章から検出したトピック
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
              <span>Gemini 3.8 Flash Medium で企画提案書を作成する</span>
            </button>
          </div>
        </div>
      )}

      {/* ステップ2: AI読み取り中アニメーション */}
      {currentStep === 2 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #D9DEE7',
            padding: '48px 24px',
            boxShadow: '0 6px 16px rgba(23, 26, 33, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
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
              {apiKey ? 'Gemini 3.8 Flash Medium が文章を読み取り分析中' : 'テキストを読み取り企画書を構成中'}
            </h3>
            <p style={{ fontSize: 13, color: '#596273', margin: 0, lineHeight: 1.6 }}>
              議事録やイベント概要から要約と要点分析を行い、PDF形式の美しい企画提案書を作成しています
            </p>
          </div>

          <div
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: '#F8FAFC',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, color: '#0284C7' }}>
              <Check size={14} color="#0284C7" />
              <span>文章や議事録の文脈理解と要約</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, color: '#0284C7' }}>
              <Check size={14} color="#0284C7" />
              <span>目的や背景および生じている課題の抽出</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, color: '#0284C7' }}>
              <Check size={14} color="#0284C7" />
              <span>運用フロー・改善効果・資材見積もりの構造化</span>
            </div>
          </div>
        </div>
      )}

      {/* ステップ3: PDF完全準拠のプロ仕様 企画提案書ドキュメントビュー */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 上部操作アクションバー */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                style={{
                  backgroundColor: isEditMode ? '#1E293B' : '#F1F5F9',
                  color: isEditMode ? '#FFFFFF' : '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Edit3 size={13} />
                <span>{isEditMode ? 'プレビュー表示に戻す' : '直接編集モードにする'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Printer size={13} />
                <span>PDF印刷・保存</span>
              </button>
            </div>
          </div>

          {/* まさにPDFと同じ美しい用紙レイアウト */}
          <div
            id="printable-proposal-document"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 4,
              border: '1px solid #E2E8F0',
              padding: '40px 36px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
              color: '#1E293B',
              lineHeight: 1.6
            }}
          >
            {/* 文書ヘッダー */}
            <div>
              <div style={{ marginBottom: 10 }}>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 4
                  }}
                >
                  {proposal.docType || '企画提案書'}
                </span>
              </div>

              {isEditMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    value={proposal.title}
                    onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                    placeholder="企画メインタイトル"
                    style={{ fontSize: 18, fontWeight: 900, padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                  />
                  <input
                    type="text"
                    value={proposal.subTitle}
                    onChange={(e) => setProposal({ ...proposal, subTitle: e.target.value })}
                    placeholder="サブタイトル 導入のご提案"
                    style={{ fontSize: 16, fontWeight: 800, padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                  />
                </div>
              ) : (
                <div>
                  <h1 style={{ fontSize: 21, fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {proposal.title}
                  </h1>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', margin: '0 0 16px 0' }}>
                    {proposal.subTitle}
                  </h2>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#64748B',
                  borderBottom: '1.5px solid #E2E8F0',
                  paddingBottom: 10,
                  marginTop: 8
                }}
              >
                <div>
                  提出先: {proposal.submittedTo}
                </div>
                <div>
                  提出日: {proposal.submittedDate}
                </div>
              </div>
            </div>

            {/* 1. 企画の趣旨・背景 */}
            <div>
              <div
                style={{
                  borderLeft: '4px solid #0284C7',
                  paddingLeft: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  marginBottom: 10
                }}
              >
                1. 企画の趣旨・背景
              </div>
              {isEditMode ? (
                <textarea
                  value={proposal.background}
                  onChange={(e) => setProposal({ ...proposal, background: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6, boxSizing: 'border-box' }}
                />
              ) : (
                <p style={{ fontSize: 13.5, color: '#334155', margin: 0, whiteSpace: 'pre-line' }}>
                  {proposal.background}
                </p>
              )}
            </div>

            {/* 2. 生じている課題 */}
            <div>
              <div
                style={{
                  borderLeft: '4px solid #0284C7',
                  paddingLeft: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  marginBottom: 12
                }}
              >
                2. 生じている課題 寮生側
              </div>

              {/* 生の声 赤枠ハイライトボックス */}
              {proposal.highlightQuote && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #FCA5A5',
                    borderRadius: 6,
                    padding: '12px 16px',
                    marginBottom: 12
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#991B1B', marginBottom: 4 }}>
                    前回の会議で最も多く出された意見
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7F1D1D' }}>
                    ・{proposal.highlightQuote}
                  </div>
                </div>
              )}

              {/* 課題の箇条書きリスト */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposal.issues.map((iss, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#334155' }}>
                    <span style={{ color: '#0284C7', fontWeight: 900 }}>・</span>
                    {isEditMode ? (
                      <div style={{ display: 'flex', flex: 1, gap: 6 }}>
                        <input
                          type="text"
                          value={iss}
                          onChange={(e) => handleUpdateIssue(idx, e.target.value)}
                          style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteIssue(idx)}
                          style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span>{iss}</span>
                    )}
                  </div>
                ))}
              </div>

              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddIssue}
                  style={{
                    marginTop: 8,
                    backgroundColor: '#F1F5F9',
                    border: '1px dashed #94A3B8',
                    padding: '4px 10px',
                    fontSize: 11,
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  + 課題項目を追加
                </button>
              )}
            </div>

            {/* 3. 提案内容の概要 */}
            <div>
              <div
                style={{
                  borderLeft: '4px solid #0284C7',
                  paddingLeft: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  marginBottom: 10
                }}
              >
                3. 提案内容の概要
              </div>
              {isEditMode ? (
                <input
                  type="text"
                  value={proposal.proposalOverview}
                  onChange={(e) => setProposal({ ...proposal, proposalOverview: e.target.value, proposalConcept: e.target.value })}
                  style={{ width: '100%', fontSize: 13, padding: '6px 8px', marginBottom: 14, border: '1px solid #CBD5E1', borderRadius: 4, boxSizing: 'border-box' }}
                />
              ) : (
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px 0' }}>
                  {proposal.proposalOverview || proposal.proposalConcept}
                </p>
              )}

              {/* 3つのボックス・要素カード */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                {proposal.conceptBoxes.map((box, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: box.tagColor || '#0284C7',
                          color: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {box.number}
                      </span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={box.title}
                          onChange={(e) => handleUpdateConceptBox(idx, 'title', e.target.value)}
                          style={{ width: '100%', fontSize: 12, fontWeight: 800, padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
                          {box.title}
                        </span>
                      )}
                    </div>
                    {isEditMode ? (
                      <textarea
                        value={box.description}
                        onChange={(e) => handleUpdateConceptBox(idx, 'description', e.target.value)}
                        rows={3}
                        style={{ width: '100%', fontSize: 11.5, padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, boxSizing: 'border-box' }}
                      />
                    ) : (
                      <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        {box.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* 運用フロー表 */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                  運用フロー
                </div>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                        <th style={{ width: '28%', padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>
                          対象
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>
                          手順・内容
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.operationFlow.map((flow, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < proposal.operationFlow.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top', fontWeight: 700, color: '#1E293B', backgroundColor: '#FAFAFA' }}>
                            {isEditMode ? (
                              <input
                                type="text"
                                value={flow.target}
                                onChange={(e) => handleUpdateFlow(idx, 'target', e.target.value)}
                                style={{ width: '100%', fontSize: 12, padding: '2px 4px' }}
                              />
                            ) : (
                              flow.target
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155', lineHeight: 1.5 }}>
                            {isEditMode ? (
                              <textarea
                                value={flow.content}
                                onChange={(e) => handleUpdateFlow(idx, 'content', e.target.value)}
                                rows={2}
                                style={{ width: '100%', fontSize: 12, padding: '2px 4px' }}
                              />
                            ) : (
                              flow.content
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. 導入による改善点 */}
            <div>
              <div
                style={{
                  borderLeft: '4px solid #0284C7',
                  paddingLeft: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  marginBottom: 12
                }}
              >
                4. 導入による改善点
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {proposal.stakeholderImpacts.map((imp, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: idx === 0 ? '#EFF6FF' : idx === 1 ? '#F0FDF4' : '#FEF3C7',
                        padding: '8px 12px',
                        borderBottom: '1px solid #E2E8F0',
                        fontSize: 12,
                        fontWeight: 900,
                        color: idx === 0 ? '#1D4ED8' : idx === 1 ? '#15803D' : '#B45309'
                      }}
                    >
                      {isEditMode ? (
                        <input
                          type="text"
                          value={imp.stakeholder}
                          onChange={(e) => handleUpdateImpact(idx, 'stakeholder', e.target.value)}
                          style={{ width: '100%', fontSize: 12, fontWeight: 800, padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                        />
                      ) : (
                        imp.stakeholder
                      )}
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, backgroundColor: '#FFFFFF' }}>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={imp.title}
                          onChange={(e) => handleUpdateImpact(idx, 'title', e.target.value)}
                          style={{ width: '100%', fontSize: 12, fontWeight: 800, padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                        />
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                          {imp.title}
                        </div>
                      )}
                      {isEditMode ? (
                        <textarea
                          value={imp.description}
                          onChange={(e) => handleUpdateImpact(idx, 'description', e.target.value)}
                          rows={3}
                          style={{ width: '100%', fontSize: 11.5, padding: '4px', border: '1px solid #CBD5E1', borderRadius: 4, boxSizing: 'border-box' }}
                        />
                      ) : (
                        <p style={{ fontSize: 11.5, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                          {imp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. 必要資材および費用概算 */}
            <div>
              <div
                style={{
                  borderLeft: '4px solid #0284C7',
                  paddingLeft: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  marginBottom: 12
                }}
              >
                5. 必要資材および費用概算
              </div>

              <div style={{ border: '1px solid #CBD5E1', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1.5px solid #CBD5E1' }}>
                      <th style={{ width: '22%', padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>品名</th>
                      <th style={{ width: '40%', padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>仕様</th>
                      <th style={{ width: '18%', padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>数量</th>
                      <th style={{ width: '20%', padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>概算費用 税込</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.budgetItems.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F172A' }}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={b.name}
                              onChange={(e) => handleUpdateBudget(idx, 'name', e.target.value)}
                              style={{ width: '100%', fontSize: 12 }}
                            />
                          ) : (
                            b.name
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={b.spec}
                              onChange={(e) => handleUpdateBudget(idx, 'spec', e.target.value)}
                              style={{ width: '100%', fontSize: 12 }}
                            />
                          ) : (
                            b.spec
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={b.quantity}
                              onChange={(e) => handleUpdateBudget(idx, 'quantity', e.target.value)}
                              style={{ width: '100%', fontSize: 12 }}
                            />
                          ) : (
                            b.quantity
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                          {isEditMode ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                              <input
                                type="text"
                                value={b.cost}
                                onChange={(e) => handleUpdateBudget(idx, 'cost', e.target.value)}
                                style={{ width: '80px', fontSize: 12, textAlign: 'right' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteBudgetItem(idx)}
                                style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            b.cost
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* 合計行 */}
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <td colSpan={3} style={{ padding: '10px', fontWeight: 900, color: '#0F172A' }}>
                        合計概算費用
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#0284C7', fontSize: 14 }}>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={proposal.totalCostEstimate}
                            onChange={(e) => setProposal({ ...proposal, totalCostEstimate: e.target.value })}
                            style={{ width: '140px', fontSize: 13, fontWeight: 900, textAlign: 'right', padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                          />
                        ) : (
                          proposal.totalCostEstimate
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddBudgetItem}
                  style={{
                    marginTop: 8,
                    backgroundColor: '#F1F5F9',
                    border: '1px dashed #94A3B8',
                    padding: '4px 10px',
                    fontSize: 11,
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  + 品目を追加
                </button>
              )}
            </div>

            {/* 6. 導入手順 */}
            <div>
              <div
                style={{
                  borderLeft: '4px solid #0284C7',
                  paddingLeft: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#0F172A',
                  marginBottom: 10
                }}
              >
                6. 導入手順 案
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposal.actionSteps.map((step, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: '#334155' }}>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => handleUpdateStep(idx, e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: '4px 6px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                      />
                    ) : (
                      step
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* まとめ */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderLeft: '4px solid #64748B',
                padding: '14px 16px',
                borderRadius: '0 6px 6px 0'
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: '#475569', marginBottom: 4 }}>
                まとめ
              </div>
              {isEditMode ? (
                <textarea
                  value={proposal.summaryText}
                  onChange={(e) => setProposal({ ...proposal, summaryText: e.target.value })}
                  rows={3}
                  style={{ width: '100%', fontSize: 13, padding: '4px 6px', border: '1px solid #CBD5E1', borderRadius: 4 }}
                />
              ) : (
                <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6 }}>
                  {proposal.summaryText}
                </p>
              )}
            </div>
          </div>

          {/* 確定アクションボタン */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
            <button
              type="button"
              onClick={handleConfirmProject}
              disabled={isSubmitting}
              style={{
                width: '100%',
                backgroundColor: '#B92F3D',
                color: '#FFFFFF',
                border: 'none',
                padding: '16px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 900,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(185, 47, 61, 0.25)'
              }}
            >
              {isSubmitting ? 'プロジェクト登録中...' : 'この企画提案書でプロジェクトを開始する'}
            </button>
          </div>
        </div>
      )}

      {/* Gemini APIキー設定モーダル */}
      {showApiKeyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={20} color="#0284C7" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0F172A' }}>
                  Gemini API 設定
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#64748B',
                  cursor: 'pointer'
                }}
              >
                閉じる
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              Google AI Studioで無料発行したAPIキーを設定すると、クラウドのGeminiモデルへ直接接続して議事録の文脈要約や要点分析、本格企画提案書の作成が全自動で瞬時に実行されます。クレジットカード登録不要で数秒で取得可能です。
            </p>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#0284C7',
                textDecoration: 'none',
                backgroundColor: '#F0F9FF',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #BAE6FD',
                width: 'fit-content'
              }}
            >
              <span>Google AI Studioで無料APIキーを取得する 外部サイト</span>
            </a>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                APIキー
              </label>
              <input
                type="password"
                value={tempApiKeyInput}
                onChange={(e) => setTempApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
              {apiKey ? (
                <button
                  type="button"
                  onClick={() => {
                    setTempApiKeyInput('');
                    setGeminiApiKey('');
                    setApiKey('');
                    setShowApiKeyModal(false);
                  }}
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  キーを解除
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  style={{
                    backgroundColor: '#0284C7',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

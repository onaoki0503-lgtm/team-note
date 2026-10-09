import React, { useState, useEffect } from 'react';
import { Camera, FileSpreadsheet, Trash2, Sparkles, Check, ArrowRight, RefreshCw } from 'lucide-react';
import type { ExtractedTopic, ProposalDocument } from '../utils/geminiIdeaService';
import {
  analyzeMeetingNoteWithGemini,
  generateProposalFromTopicWithGemini
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
const SAMPLE_MEETING_NOTE = `2026年10月度 寮生役職者定例ミーティング議事録
日時: 2026年10月4日 20:00〜21:30
参加者: 岡本直樹、伊藤雄吉、佐藤健太、鈴木花子

議題1: 各階キッチンの衛生管理と布巾の生乾き臭について
・布巾の使い回しで衛生面の不安があるという声が複数ユニットから出ている。
・解決策として、布巾を廃止して使い捨てロールペーパーホルダーを各階に設置する案が出た。
・初期備品の購入費用や利用ルール掲示が必要。

議題2: 秋の中庭イベントについて
・新入寮生との親睦を深めるため、中庭の大型プロジェクターを使った星空映画上映会をやりたい。
・防寒対策や近隣への騒音配慮、管理会社西松地所への共用部使用申請が必要。

議題3: 深夜のエントランスオートロック解錠トラブル
・暗証番号忘れやカードキー不携帯による夜間トラブル対応が増加。
・予備キーの貸出ルールの電子化や注意喚起ポスターの改訂を検討する。`;

export const IdeaFlowViews: React.FC<IdeaFlowViewsProps> = ({
  currentUserId,
  initialText,
  onCancel,
  onCreateProject
}) => {
  // ステップ状態: 'input' S03 | 'proposal' S04
  const [step, setStep] = useState<'input' | 'proposal'>('input');

  // S03 入力データ
  const [projectType, setProjectType] = useState<'event' | 'operation'>('event');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialText || '');
  const [attachedFile, setAttachedFile] = useState<string | undefined>(undefined);
  const [meetingNote, setMeetingNote] = useState<string | undefined>(undefined);
  const [draftSaved, setDraftSaved] = useState(false);

  // 議事録挿入モーダルステート
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingInputText, setMeetingInputText] = useState('');
  const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
  const [extractedTopics, setExtractedTopics] = useState<ExtractedTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

  // S04 企画書データ
  const [proposalDoc, setProposalDoc] = useState<ProposalDocument>({
    title: '',
    projectType: 'event',
    background: '',
    objective: '',
    targetAudience: '',
    actionSteps: [],
    requirements: [],
    expectedImpact: ''
  });

  // 企画書の編集モード状態
  const [isEditingProposal, setIsEditingProposal] = useState(false);

  // S04 ノードデータ
  const [nodes, setNodes] = useState<{ id: string; label: string; category: string }[]>([]);
  const [newNodeText, setNewNodeText] = useState('');
  const [viewMode, setViewMode] = useState<'document' | 'map' | 'list'>('document');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 利用者別草稿保存
  const draftKey = `team_note_draft_form_${currentUserId}`;

  useEffect(() => {
    if (content || title) {
      const timer = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify({ projectType, title, content }));
        setDraftSaved(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [projectType, title, content, draftKey]);

  // Gemini 3.8 Flash Medium によるトピック分解の実行
  const handleAnalyzeTopicsWithGemini = async () => {
    if (!meetingInputText.trim()) return;
    setIsAnalyzingTopics(true);
    try {
      const topics = await analyzeMeetingNoteWithGemini(meetingInputText);
      setExtractedTopics(topics);
      if (topics.length > 0) {
        setSelectedTopicId(topics[0].id);
      }
    } finally {
      setIsAnalyzingTopics(false);
    }
  };

  // 選んだトピックから Gemini 3.8 Flash Medium で企画書を作成
  const handleCreateProposalFromSelectedTopic = async (topic: ExtractedTopic) => {
    setIsGeneratingProposal(true);
    try {
      const doc = await generateProposalFromTopicWithGemini(topic, meetingInputText);
      setProposalDoc(doc);
      setTitle(doc.title);
      setProjectType(doc.projectType);
      setContent(doc.objective);
      setMeetingNote(meetingInputText.slice(0, 100) + '...');

      // ノード群の生成
      const generatedNodes = [
        { id: 'core', label: doc.title, category: 'core' },
        { id: 'n1', label: doc.targetAudience, category: 'members' },
        ...doc.actionSteps.slice(0, 3).map((stepText, idx) => ({
          id: `step-${idx}`,
          label: stepText,
          category: 'step'
        }))
      ];
      setNodes(generatedNodes);

      setShowMeetingModal(false);
      setStep('proposal');
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  // 通常のS03からS04へのたたき台作成
  const handleMakeProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const baseTitle = title.trim() || (projectType === 'event' ? '新規イベント企画' : '新規日常改善プロジェクト');
    const doc: ProposalDocument = {
      title: baseTitle,
      projectType,
      background: '寮生活の課題解決と環境向上のための取り組みです。',
      objective: content.trim(),
      targetAudience: 'Hヴィレッジ寮生',
      actionSteps: [
        '実施担当メンバーの決定',
        '必要な準備・機材のリストアップ',
        '周知告知と当日の進行'
      ],
      requirements: ['必要機材', '案内掲示'],
      expectedImpact: '寮生の満足度向上と生活環境の改善を見込みます。'
    };
    setProposalDoc(doc);

    const newNodes = [
      { id: 'core', label: baseTitle, category: 'core' },
      { id: 'n1', label: projectType === 'event' ? '場所 中庭' : '場所 各階キッチン', category: 'location' },
      { id: 'n2', label: '仲間 寮生有志', category: 'members' },
      { id: 'n3', label: projectType === 'event' ? '準備 機材・申請' : '準備 ルール策定・備品手配', category: 'prep' }
    ];
    setNodes(newNodes);
    setStep('proposal');
  };

  // S04 ノード追加
  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeText.trim()) return;
    setNodes([...nodes, { id: Date.now().toString(), label: newNodeText.trim(), category: 'custom' }]);
    setNewNodeText('');
  };

  // S04 ノード削除
  const handleDeleteNode = (id: string) => {
    if (id === 'core') return;
    setNodes(nodes.filter((n) => n.id !== id));
  };

  // S04 -> プロジェクト作成確定
  const handleConfirmCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalTitle = proposalDoc.title.trim() || title.trim() || '新規企画プロジェクト';
      const draft: IdeaDraftData = {
        projectType: proposalDoc.projectType,
        title: finalTitle,
        content: proposalDoc.objective.trim() || content.trim(),
        attachedFile,
        meetingNote
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
      {/* S03: アイデア入力画面 */}
      {/* ============================================================ */}
      {step === 'input' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '24px 20px',
            boxShadow: '0 4px 12px rgba(23, 26, 33, 0.04)'
          }}
        >
          {/* 上部ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21' }}>
                アイデアを育てる
              </h2>
              <span style={{ fontSize: 13, color: '#596273' }}>
                {draftSaved ? '下書き保存済み' : '入力した内容は自動で一時保存されます'}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              style={{
                backgroundColor: 'transparent',
                color: '#596273',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              戻る
            </button>
          </div>

          {/* 議事録からAIトピック分解への誘導バナー */}
          <div
            style={{
              backgroundColor: '#F0F7FF',
              border: '1.5px solid #BAE6FD',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0369A1' }}>
                  議事録からトピック分解 ＆ 企画書作成
                </div>
                <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 600 }}>
                  AI解析モデル: Gemini 3.8 Flash Medium
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMeetingModal(true);
              }}
              style={{
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>議事録を挿入する</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <form onSubmit={handleMakeProposal} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 企画種別 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#171A21' }}>
                アイデアの種類 <span style={{ color: '#B92F3D' }}>必須</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setProjectType('event')}
                  style={{
                    backgroundColor: projectType === 'event' ? '#FFFFFF' : '#F7F8FA',
                    border: projectType === 'event' ? '2px solid #FF6B68' : '1px solid #D9DEE7',
                    borderRadius: 8,
                    padding: '12px',
                    color: projectType === 'event' ? '#171A21' : '#596273',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: '#FF6B68' }}>● イベント</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#596273' }}>班編成や当日の進行</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectType('operation')}
                  style={{
                    backgroundColor: projectType === 'operation' ? '#FFFFFF' : '#F7F8FA',
                    border: projectType === 'operation' ? '2px solid #12BDE8' : '1px solid #D9DEE7',
                    borderRadius: 8,
                    padding: '12px',
                    color: projectType === 'operation' ? '#171A21' : '#596273',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: '#12BDE8' }}>● 施設・日常</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#596273' }}>備品やルールの継続改善</span>
                </button>
              </div>
            </div>

            {/* タイトル */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label htmlFor="idea-title-input" style={{ fontSize: 13, fontWeight: 700, color: '#171A21' }}>
                  タイトル <span style={{ fontSize: 11, color: '#596273' }}>任意</span>
                </label>
                <span style={{ fontSize: 11, color: '#596273' }}>{title.length} / 60</span>
              </div>
              <input
                id="idea-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                placeholder={projectType === 'event' ? '中庭シネマ' : 'キッチン改善'}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* やりたいこと */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label htmlFor="idea-content-input" style={{ fontSize: 13, fontWeight: 700, color: '#171A21' }}>
                  やりたいこと <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <span style={{ fontSize: 11, color: '#596273' }}>{content.length} / 5000</span>
              </div>
              <textarea
                id="idea-content-input"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 5000))}
                placeholder="中庭で映画を上映して、みんなで集まって観たいです。"
                rows={5}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid #D9DEE7',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 資料を追加 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#171A21' }}>
                資料を追加 <span style={{ fontSize: 11, color: '#596273' }}>任意</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label
                  style={{
                    backgroundColor: '#F7F8FA',
                    border: '1px solid #D9DEE7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#596273'
                  }}
                >
                  <Camera size={16} />
                  <span>{attachedFile ? attachedFile : '写真・資料'}</span>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedFile(e.target.files[0].name);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowMeetingModal(true)}
                  style={{
                    backgroundColor: meetingNote ? '#EFF6FF' : '#F7F8FA',
                    border: meetingNote ? '1px solid #93C5FD' : '1px solid #D9DEE7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: meetingNote ? '#0284C7' : '#596273',
                    cursor: 'pointer'
                  }}
                >
                  <FileSpreadsheet size={16} />
                  <span>{meetingNote ? '議事録反映済み' : '議事録を挿入'}</span>
                </button>
              </div>
            </div>

            {/* 送信ボタン */}
            <div style={{ paddingTop: 10 }}>
              <button
                type="submit"
                disabled={!content.trim()}
                style={{
                  width: '100%',
                  backgroundColor: content.trim() ? '#B92F3D' : '#D9DEE7',
                  color: '#FFFFFF',
                  padding: '14px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: content.trim() ? 'pointer' : 'not-allowed',
                  border: 'none'
                }}
              >
                企画のたたき台を作る
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* 議事録挿入 ＆ AIトピック分解モーダル */}
      {/* ============================================================ */}
      {showMeetingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(23, 26, 33, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* モーダルヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Sparkles size={16} color="#0284C7" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0284C7' }}>
                    Gemini 3.8 Flash Medium
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171A21', margin: 0 }}>
                  議事録を挿入してトピックを分解
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 18,
                  color: '#596273',
                  cursor: 'pointer',
                  padding: '0 4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* 説明文 */}
            <div style={{ fontSize: 12, color: '#596273', lineHeight: 1.5 }}>
              文章やミーティング議事録を貼り付けると、AIが内容を分析して話のトピックを分けてくれます。トピックを選択すると、その内容に基づいた企画書を自動生成します。
            </div>

            {/* サンプル挿入ボタン */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMeetingInputText(SAMPLE_MEETING_NOTE)}
                style={{
                  backgroundColor: '#F0F7FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0284C7',
                  cursor: 'pointer'
                }}
              >
                サンプル議事録を入力
              </button>
            </div>

            {/* 議事録テキストエリア */}
            <textarea
              value={meetingInputText}
              onChange={(e) => setMeetingInputText(e.target.value)}
              placeholder="ここに会議の議事録やブレストの文章を貼り付けてください..."
              rows={7}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #D9DEE7',
                fontSize: 13,
                lineHeight: 1.6,
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />

            {/* トピック分解ボタン */}
            <button
              type="button"
              onClick={handleAnalyzeTopicsWithGemini}
              disabled={!meetingInputText.trim() || isAnalyzingTopics}
              style={{
                backgroundColor: meetingInputText.trim() ? '#0284C7' : '#D9DEE7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '12px',
                fontSize: 14,
                fontWeight: 800,
                cursor: meetingInputText.trim() && !isAnalyzingTopics ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {isAnalyzingTopics ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Gemini 3.8 Flash Medium がトピックを分解中...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>AIで話のトピックを分解する</span>
                </>
              )}
            </button>

            {/* 分解されたトピック一覧 */}
            {extractedTopics.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#171A21' }}>
                  分解されたトピック一覧
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {extractedTopics.map((topic) => {
                    const isSelected = selectedTopicId === topic.id;
                    return (
                      <div
                        key={topic.id}
                        onClick={() => setSelectedTopicId(topic.id)}
                        style={{
                          backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                          border: isSelected ? '2px solid #0284C7' : '1px solid #D9DEE7',
                          borderRadius: 10,
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: topic.projectType === 'event' ? '#FEE2E2' : '#E0F2FE',
                              color: topic.projectType === 'event' ? '#DC2626' : '#0284C7'
                            }}
                          >
                            {topic.projectType === 'event' ? 'イベント' : '施設・日常'}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Check size={14} /> 選択中
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 800, color: '#171A21' }}>
                          {topic.title}
                        </div>

                        <div style={{ fontSize: 12, color: '#596273', lineHeight: 1.4 }}>
                          {topic.summary}
                        </div>

                        {/* 主要ポイント */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                          {topic.keyPoints.map((pt, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 11,
                                color: '#475569',
                                backgroundColor: '#F1F5F9',
                                padding: '2px 6px',
                                borderRadius: 4
                              }}
                            >
                              ・{pt}
                            </span>
                          ))}
                        </div>

                        {/* このトピックの企画書作成ボタン */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateProposalFromSelectedTopic(topic);
                            }}
                            disabled={isGeneratingProposal}
                            style={{
                              backgroundColor: '#0284C7',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <span>このトピックの企画書を作成</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* S04: 企画書確認 ＆ 編集画面 */}
      {/* ============================================================ */}
      {step === 'proposal' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '24px 20px',
            boxShadow: '0 4px 12px rgba(23, 26, 33, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          {/* ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span
                  style={{
                    backgroundColor: proposalDoc.projectType === 'event' ? '#FF6B68' : '#12BDE8',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4
                  }}
                >
                  {proposalDoc.projectType === 'event' ? 'イベント' : '施設・日常'}
                </span>
                <span style={{ fontSize: 11, color: '#0284C7', fontWeight: 700 }}>
                  Gemini 3.8 Flash Medium 生成企画書
                </span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
                {proposalDoc.title || '企画書'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingProposal(!isEditingProposal)}
              style={{
                backgroundColor: isEditingProposal ? '#171A21' : '#F0F7FF',
                color: isEditingProposal ? '#FFFFFF' : '#0284C7',
                border: isEditingProposal ? 'none' : '1px solid #BAE6FD',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isEditingProposal ? '編集完了' : '企画書を編集'}
            </button>
          </div>

          {/* 表示切替 企画書本文 / アイデアマップ / ノード一覧 */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #D9DEE7', paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setViewMode('document')}
              style={{
                backgroundColor: viewMode === 'document' ? '#171A21' : '#F7F8FA',
                color: viewMode === 'document' ? '#FFFFFF' : '#596273',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              企画書詳細
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                backgroundColor: viewMode === 'map' ? '#171A21' : '#F7F8FA',
                color: viewMode === 'map' ? '#FFFFFF' : '#596273',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              アイデアマップ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                backgroundColor: viewMode === 'list' ? '#171A21' : '#F7F8FA',
                color: viewMode === 'list' ? '#FFFFFF' : '#596273',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              一覧
            </button>
          </div>

          {/* 1. 企画書詳細ビュー 編集可能 */}
          {viewMode === 'document' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isEditingProposal ? (
                /* 編集フォームモード */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#596273', marginBottom: 4 }}>
                      企画名
                    </label>
                    <input
                      type="text"
                      value={proposalDoc.title}
                      onChange={(e) => setProposalDoc({ ...proposalDoc, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #D9DEE7',
                        fontSize: 14,
                        fontWeight: 700,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#596273', marginBottom: 4 }}>
                      背景と課題
                    </label>
                    <textarea
                      value={proposalDoc.background}
                      onChange={(e) => setProposalDoc({ ...proposalDoc, background: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #D9DEE7',
                        fontSize: 13,
                        lineHeight: 1.5,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#596273', marginBottom: 4 }}>
                      目的とゴール
                    </label>
                    <textarea
                      value={proposalDoc.objective}
                      onChange={(e) => setProposalDoc({ ...proposalDoc, objective: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #D9DEE7',
                        fontSize: 13,
                        lineHeight: 1.5,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#596273', marginBottom: 4 }}>
                      対象者
                    </label>
                    <input
                      type="text"
                      value={proposalDoc.targetAudience}
                      onChange={(e) => setProposalDoc({ ...proposalDoc, targetAudience: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #D9DEE7',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#596273', marginBottom: 4 }}>
                      期待される効果
                    </label>
                    <input
                      type="text"
                      value={proposalDoc.expectedImpact}
                      onChange={(e) => setProposalDoc({ ...proposalDoc, expectedImpact: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #D9DEE7',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* 通常プレビューモード */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      背景と課題
                    </div>
                    <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                      {proposalDoc.background}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      目的と目指すゴール
                    </div>
                    <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                      {proposalDoc.objective}
                    </div>
                  </div>

                  {/* 実施ステップ */}
                  {proposalDoc.actionSteps.length > 0 && (
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                        具体的な実施ステップ
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {proposalDoc.actionSteps.map((stepItem, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#1E293B' }}>
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: '#E2E8F0',
                                color: '#475569',
                                fontSize: 11,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ lineHeight: 1.5 }}>{stepItem}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 必要な準備と備品 */}
                  {proposalDoc.requirements.length > 0 && (
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                        必要な準備と備品
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {proposalDoc.requirements.map((req, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 12,
                              color: '#334155',
                              fontWeight: 600
                            }}
                          >
                            ✓ {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                      期待される成果
                    </div>
                    <div style={{ fontSize: 13, color: '#14532D', lineHeight: 1.6, fontWeight: 600 }}>
                      {proposalDoc.expectedImpact}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. アイデアマップビュー */}
          {viewMode === 'map' && (
            <div
              style={{
                backgroundColor: '#F7F8FA',
                border: '1px solid #D9DEE7',
                borderRadius: 12,
                padding: 20,
                minHeight: 220,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}
            >
              {nodes.map((node) => {
                const isCore = node.id === 'core';
                return (
                  <div
                    key={node.id}
                    style={{
                      backgroundColor: isCore ? '#171A21' : '#FFFFFF',
                      color: isCore ? '#FFFFFF' : '#171A21',
                      border: isCore ? 'none' : '1px solid #D9DEE7',
                      borderRadius: 20,
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                  >
                    <span>{node.label}</span>
                    {!isCore && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNode(node.id)}
                        style={{
                          background: 'transparent',
                          color: '#596273',
                          padding: 2,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. 一覧ビュー */}
          {viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nodes.map((node) => (
                <div
                  key={node.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DEE7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#171A21' }}>
                    {node.label}
                  </span>
                  {node.id !== 'core' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(node.id)}
                      style={{ background: 'transparent', color: '#596273', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ノード追加フォーム */}
          <form onSubmit={handleAddNode} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              placeholder="新しいステップや要素を追加"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #D9DEE7',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit"
              disabled={!newNodeText.trim()}
              style={{
                backgroundColor: '#171A21',
                color: '#FFFFFF',
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: newNodeText.trim() ? 'pointer' : 'default'
              }}
            >
              追加
            </button>
          </form>

          {/* 操作アクションバー */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10 }}>
            <button
              type="button"
              onClick={() => setStep('input')}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#171A21',
                border: '1px solid #D9DEE7',
                padding: '12px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              入力画面に戻る
            </button>
            <button
              type="button"
              onClick={handleConfirmCreate}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#B92F3D',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? '作成中...' : 'プロジェクトを作成'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

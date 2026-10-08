import React, { useState } from 'react';
import { Camera, FileSpreadsheet, MapPin, Users, CheckCircle, List, Edit2, Plus, Trash2 } from 'lucide-react';

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

export const IdeaFlowViews: React.FC<IdeaFlowViewsProps> = ({
  currentUserId,
  initialText,
  onCancel,
  onCreateProject
}) => {
  // ステップ状態: 'input' (S03) | 'proposal' (S04)
  const [step, setStep] = useState<'input' | 'proposal'>('input');

  // S03 入力データ
  const [projectType, setProjectType] = useState<'event' | 'operation'>('event');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialText || '');
  const [attachedFile, setAttachedFile] = useState<string | undefined>(undefined);
  const [meetingNote, setMeetingNote] = useState<string | undefined>(undefined);
  const [draftSaved, setDraftSaved] = useState(false);

  // S04 たたき台データ
  const [nodes, setNodes] = useState<{ id: string; label: string; category: string }[]>([]);
  const [newNodeText, setNewNodeText] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 利用者別草稿保存
  const draftKey = `team_note_draft_form_${currentUserId}`;

  React.useEffect(() => {
    if (content || title) {
      const timer = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify({ projectType, title, content }));
        setDraftSaved(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [projectType, title, content, draftKey]);

  // S03 -> S04 企画のたたき台生成
  const handleMakeProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // 初期のたたき台ノードを生成
    const baseTitle = title.trim() || (projectType === 'event' ? '中庭シネマ' : 'キッチン改善');
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
      const draft: IdeaDraftData = {
        projectType,
        title: title.trim() || (projectType === 'event' ? '新規イベント企画' : '新規日常改善プロジェクト'),
        content: content.trim(),
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
        maxWidth: 640,
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
                fontWeight: 600
              }}
            >
              戻る
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
                    gap: 4
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
                    gap: 4
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
                  outline: 'none'
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
                  lineHeight: 1.6
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
                  onClick={() => {
                    setMeetingNote('2026-10-04 次郎さんMTG議事録');
                  }}
                  style={{
                    backgroundColor: '#F7F8FA',
                    border: '1px solid #D9DEE7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#596273'
                  }}
                >
                  <FileSpreadsheet size={16} />
                  <span>{meetingNote ? '議事録を反映済み' : '議事録'}</span>
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
                  cursor: content.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                企画のたたき台を作る
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* S04: 企画のたたき台画面 */}
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
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21' }}>
                企画のたたき台
              </h2>
              <span style={{ fontSize: 13, color: '#596273' }}>
                内容を確認し、よろしければプロジェクトを作成してください
              </span>
            </div>
            <span
              style={{
                backgroundColor: '#F5BE32',
                color: '#171A21',
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 8px',
                borderRadius: 4
              }}
            >
              要確認
            </span>
          </div>

          {/* 表示切替（アイデアマップ / 一覧） */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #D9DEE7', paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                backgroundColor: viewMode === 'map' ? '#171A21' : '#F7F8FA',
                color: viewMode === 'map' ? '#FFFFFF' : '#596273',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                minHeight: 36
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
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                minHeight: 36
              }}
            >
              一覧
            </button>
          </div>

          {/* マップまたは一覧のレンダリング */}
          {viewMode === 'map' ? (
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
                          minHeight: 'auto',
                          cursor: 'pointer'
                        }}
                        aria-label="ノードを削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
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
                      style={{ background: 'transparent', color: '#596273', minHeight: 'auto' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ノードの追加フォーム */}
          <form onSubmit={handleAddNode} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              placeholder="新しいノードを追加"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #D9DEE7',
                fontSize: 13,
                outline: 'none'
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
                minHeight: 40
              }}
            >
              追加
            </button>
          </form>

          {/* 企画の概要 */}
          <div
            style={{
              backgroundColor: '#F7F8FA',
              border: '1px solid #D9DEE7',
              borderRadius: 8,
              padding: 16
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#596273', marginBottom: 6 }}>
              目的
            </h4>
            <p style={{ fontSize: 14, color: '#171A21', lineHeight: 1.6, marginBottom: 14 }}>
              {content}
            </p>

            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#596273', marginBottom: 6 }}>
              次の一歩
            </h4>
            <p style={{ fontSize: 14, color: '#171A21', lineHeight: 1.6, margin: 0 }}>
              {projectType === 'event'
                ? '場所の利用可否を確認し、必要な機材をリストアップします。'
                : '現地の状況を確認し、運用ルールのたたき台を作成します。'}
            </p>
          </div>

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
                fontWeight: 700
              }}
            >
              内容を編集
            </button>
            <button
              type="button"
              onClick={handleConfirmCreate}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#B92F3D',
                color: '#FFFFFF',
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

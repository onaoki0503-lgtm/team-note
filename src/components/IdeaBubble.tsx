import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export interface IdeaItem {
  id: string;
  text: string;
  color: 'coral' | 'cyan' | 'yellow' | 'violet';
  projectId?: string;
}

interface IdeaBubbleProps {
  ideas: IdeaItem[];
  currentUserId: string;
  onOpenIdeaInputWithText: (text: string) => void;
  onSelectProject?: (projectId: string) => void;
  isPaused: boolean;
  onPauseChange: (paused: boolean) => void;
}

export const IdeaBubbleLayer: React.FC<IdeaBubbleProps> = ({
  ideas,
  currentUserId,
  onOpenIdeaInputWithText,
  onSelectProject,
  isPaused,
  onPauseChange
}) => {
  // 入力状態（S02）
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [activeIdeaIndex, setActiveIdeaIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 利用者別の下書き復元
  const draftKey = `team_note_draft_bubble_${currentUserId}`;

  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      setTypedText(saved);
    }
  }, [currentUserId]);

  // 500msの自動保存
  useEffect(() => {
    if (!typedText) {
      localStorage.removeItem(draftKey);
      setDraftSaved(false);
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, typedText);
      setDraftSaved(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [typedText, draftKey]);

  // 吹き出しのゆっくり交代（通常6〜10秒）
  useEffect(() => {
    if (isPaused || isTyping) return;
    const interval = setInterval(() => {
      setActiveIdeaIndex((prev) => (prev + 1) % Math.max(ideas.length, 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, isTyping, ideas.length]);

  const handleStartTyping = () => {
    setIsTyping(true);
    onPauseChange(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleFinishToIdea = () => {
    const trimmed = typedText.trim();
    if (!trimmed) return;
    localStorage.removeItem(draftKey);
    setIsTyping(false);
    onPauseChange(false);
    onOpenIdeaInputWithText(trimmed);
  };

  const handleCancelTyping = () => {
    setIsTyping(false);
    onPauseChange(false);
  };

  // 表示する吹き出し（PCは最大3件、スマホは1〜2件）
  const currentIdea = ideas[activeIdeaIndex] || {
    id: 'sample-1',
    text: '中庭で映画を観たい',
    color: 'coral'
  };

  const secondaryIdea = ideas[(activeIdeaIndex + 1) % Math.max(ideas.length, 1)] || {
    id: 'sample-2',
    text: 'みんなで料理したい',
    color: 'yellow'
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      {/* S02: 入力中の場合（背景は維持したまま、フォーカスされた大きな白い吹き出し） */}
      {isTyping ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            pointerEvents: 'auto',
            backgroundColor: 'rgba(247, 248, 250, 0.45)',
            backdropFilter: 'blur(3px)'
          }}
        >
          {/* 動きを停止中のインジケーター */}
          <div
            style={{
              backgroundColor: '#171A21',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 20,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>⏸ 動きを停止中</span>
          </div>

          {/* S02 吹き出し入力面本体 */}
          <div
            className="bubble-appear"
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              border: '1.5px solid #FF6B68',
              boxShadow: '0 12px 32px rgba(23, 26, 33, 0.12)',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label
                htmlFor="bubble-idea-textarea"
                style={{ fontSize: 13, fontWeight: 700, color: '#596273' }}
              >
                短いアイデアを入力
              </label>
              <span
                style={{
                  fontSize: 12,
                  color: typedText.length > 140 ? '#B92F3D' : '#596273',
                  fontWeight: 600
                }}
              >
                {typedText.length} / 140
              </span>
            </div>

            <textarea
              id="bubble-idea-textarea"
              ref={inputRef}
              value={typedText}
              onChange={(e) => setTypedText(e.target.value.slice(0, 140))}
              placeholder="中庭で映画を観たい"
              rows={3}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 16,
                fontWeight: 600,
                color: '#171A21',
                lineHeight: 1.5,
                background: 'transparent'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#596273' }}>
                {draftSaved ? '下書き保存済み' : 'まだ公開されません'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCancelTyping}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#596273',
                    border: '1px solid #D9DEE7',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    minHeight: 40
                  }}
                >
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={handleFinishToIdea}
                  disabled={!typedText.trim()}
                  style={{
                    backgroundColor: typedText.trim() ? '#B92F3D' : '#D9DEE7',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    minHeight: 40,
                    cursor: typedText.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  アイデアにする
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* S01: 通常時の吹き出し配置（中央ボタンの周囲） */
        <>
          {/* 左上の吹き出し 1 */}
          <div
            onClick={() => {
              if (currentIdea.projectId && onSelectProject) {
                onSelectProject(currentIdea.projectId);
              } else {
                setTypedText(currentIdea.text);
                handleStartTyping();
              }
            }}
            style={{
              position: 'absolute',
              top: '18%',
              left: '8%',
              backgroundColor: '#FFFFFF',
              border: `1.5px solid ${currentIdea.color === 'coral' ? '#FF6B68' : '#12BDE8'}`,
              borderRadius: '20px 20px 20px 4px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              color: '#171A21',
              boxShadow: '0 4px 14px rgba(23, 26, 33, 0.08)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              maxWidth: 220,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            className="bubble-appear"
          >
            {currentIdea.text}
          </div>

          {/* 右上の吹き出し 2 */}
          <div
            onClick={() => {
              if (secondaryIdea.projectId && onSelectProject) {
                onSelectProject(secondaryIdea.projectId);
              } else {
                setTypedText(secondaryIdea.text);
                handleStartTyping();
              }
            }}
            style={{
              position: 'absolute',
              top: '25%',
              right: '8%',
              backgroundColor: '#FFFFFF',
              border: `1.5px solid ${secondaryIdea.color === 'yellow' ? '#F5BE32' : '#A876F5'}`,
              borderRadius: '20px 20px 4px 20px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              color: '#171A21',
              boxShadow: '0 4px 14px rgba(23, 26, 33, 0.08)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              maxWidth: 220,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            className="bubble-appear"
          >
            {secondaryIdea.text}
          </div>

          {/* 下部の書き込める吹き出し（ここにアイデアを書く） */}
          <div
            onClick={handleStartTyping}
            style={{
              position: 'absolute',
              bottom: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '88%',
              maxWidth: 340,
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #A876F5',
              borderRadius: '20px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 6px 18px rgba(168, 118, 245, 0.15)',
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: 14, color: typedText ? '#171A21' : '#596273', fontWeight: 600 }}>
              {typedText || 'ここにアイデアを書く'}
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#F7F8FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A876F5'
              }}
            >
              <Send size={15} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

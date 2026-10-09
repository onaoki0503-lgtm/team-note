import React, { useState, useEffect } from 'react';
import { Send, Heart } from 'lucide-react';

export interface IdeaItem {
  id: string;
  text: string;
  color: 'coral' | 'cyan' | 'yellow' | 'violet';
  projectId?: string;
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
  likes: number;
  likedUserIds?: string[];
  createdAt?: string;
  isNew?: boolean;
}

interface IdeaBubbleProps {
  ideas: IdeaItem[];
  currentUserId: string;
  currentUserName?: string;
  onOpenIdeaInputWithText: (text: string) => void;
  onSelectProject?: (projectId: string) => void;
  isPaused: boolean;
  onPauseChange: (paused: boolean) => void;
  onAddNewIdea: (text: string) => void;
  onToggleLike: (ideaId: string) => void;
}

// 文字がタイピングのように出現するコンポーネント
interface TypingTextProps {
  text: string;
  isNew?: boolean;
}

const TypingBubbleText: React.FC<TypingTextProps> = ({ text, isNew }) => {
  const [displayedCount, setDisplayedCount] = useState(isNew ? 0 : text.length);

  useEffect(() => {
    if (!isNew) {
      setDisplayedCount(text.length);
      return;
    }

    // 吹き出しがぴょんっと出現した直後にタイピング開始
    setDisplayedCount(0);
    const startTimer = setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        count += 1;
        setDisplayedCount(count);
        if (count >= text.length) {
          clearInterval(interval);
        }
      }, 45);

      return () => clearInterval(interval);
    }, 320);

    return () => clearTimeout(startTimer);
  }, [text, isNew]);

  return (
    <span>
      {text.slice(0, displayedCount)}
      {isNew && displayedCount < text.length && (
        <span
          className="typing-cursor"
          style={{ marginLeft: 2, fontWeight: 300, color: '#A876F5' }}
        >
          |
        </span>
      )}
    </span>
  );
};

// 単一吹き出しカード
interface SingleBubbleProps {
  idea: IdeaItem;
  position: 'top-left' | 'top-right' | 'top-center';
  currentUserId: string;
  onLike: (id: string) => void;
  onClick: (idea: IdeaItem) => void;
}

const SingleBubble: React.FC<SingleBubbleProps> = ({
  idea,
  position,
  currentUserId,
  onLike,
  onClick
}) => {
  const [justLiked, setJustLiked] = useState(false);

  const isLikedByMe = idea.likedUserIds?.includes(currentUserId);
  const likesCount = idea.likes || 0;

  // 枠線の色設定
  const borderColor =
    idea.color === 'coral'
      ? '#FF6B68'
      : idea.color === 'cyan'
      ? '#12BDE8'
      : idea.color === 'yellow'
      ? '#F5BE32'
      : '#A876F5';

  // 位置ごとのスタイル
  let posStyle: React.CSSProperties = {};
  if (position === 'top-left') {
    posStyle = {
      top: '17%',
      left: '6%',
      borderRadius: '20px 20px 20px 4px'
    };
  } else if (position === 'top-right') {
    posStyle = {
      top: '24%',
      right: '6%',
      borderRadius: '20px 20px 4px 20px'
    };
  } else {
    posStyle = {
      top: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: '20px'
    };
  }

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setJustLiked(true);
    onLike(idea.id);
    setTimeout(() => setJustLiked(false), 400);
  };

  return (
    <div
      onClick={() => onClick(idea)}
      className={idea.isNew ? 'bubble-bounce-pop' : 'bubble-appear'}
      style={{
        position: 'absolute',
        ...posStyle,
        backgroundColor: '#FFFFFF',
        border: `1.5px solid ${borderColor}`,
        padding: '10px 14px 10px 16px',
        color: '#171A21',
        boxShadow: '0 4px 16px rgba(23, 26, 33, 0.09)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        maxWidth: 240,
        zIndex: idea.isNew ? 18 : 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}
    >
      {/* 吹き出しテキスト */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.45,
          color: '#171A21',
          wordBreak: 'break-word'
        }}
      >
        <TypingBubbleText text={idea.text} isNew={idea.isNew} />
      </div>

      {/* いいねボタンと投稿者情報行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 2
        }}
      >
        {idea.authorName ? (
          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>
            {idea.authorName}
          </span>
        ) : (
          <span />
        )}

        {/* いいねボタン */}
        <button
          type="button"
          onClick={handleLikeClick}
          className={justLiked ? 'heart-pop' : ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 14,
            backgroundColor: isLikedByMe ? '#FFF1F2' : '#F7F8FA',
            border: isLikedByMe ? '1px solid #FECDD3' : '1px solid #E5E7EB',
            color: isLikedByMe ? '#E11D48' : '#6B7280',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            minHeight: 'auto',
            transition: 'all 0.15s ease'
          }}
          title="いいね"
        >
          <Heart
            size={13}
            fill={isLikedByMe ? '#E11D48' : 'none'}
            color={isLikedByMe ? '#E11D48' : '#6B7280'}
          />
          <span>{likesCount}</span>
        </button>
      </div>
    </div>
  );
};

export const IdeaBubbleLayer: React.FC<IdeaBubbleProps> = ({
  ideas,
  currentUserId,
  onOpenIdeaInputWithText,
  onSelectProject,
  isPaused,
  onAddNewIdea,
  onToggleLike
}) => {
  // ホーム画面下のコメント入力ステート
  const [commentInput, setCommentInput] = useState('');
  const [activeCycleIndex, setActiveCycleIndex] = useState(0);

  // 吹き出しのゆっくり交代 通常8秒
  useEffect(() => {
    if (isPaused || ideas.length <= 2) return;
    const interval = setInterval(() => {
      setActiveCycleIndex((prev) => (prev + 1) % Math.max(ideas.length, 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, ideas.length]);

  // 送信ハンドラー
  const handleSendComment = () => {
    const trimmed = commentInput.trim();
    if (!trimmed) return;
    onAddNewIdea(trimmed);
    setCommentInput('');
  };

  // 表示する吹き出しの選定
  // 新規投稿されたアイデアがある場合はそれを最優先で表示
  const latestNewIdea = ideas.find((i) => i.isNew);

  let leftIdea: IdeaItem | undefined;
  let rightIdea: IdeaItem | undefined;

  if (latestNewIdea) {
    leftIdea = latestNewIdea;
    rightIdea = ideas.find((i) => i.id !== latestNewIdea.id) || ideas[0];
  } else {
    leftIdea = ideas[activeCycleIndex % Math.max(ideas.length, 1)];
    rightIdea = ideas[(activeCycleIndex + 1) % Math.max(ideas.length, 1)];
  }

  // 吹き出しタップ時のアクション
  const handleBubbleClick = (idea: IdeaItem) => {
    if (idea.projectId && onSelectProject) {
      onSelectProject(idea.projectId);
    } else {
      onOpenIdeaInputWithText(idea.text);
    }
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
      {/* 左上の吹き出し */}
      {leftIdea && (
        <SingleBubble
          key={leftIdea.id}
          idea={leftIdea}
          position="top-left"
          currentUserId={currentUserId}
          onLike={onToggleLike}
          onClick={handleBubbleClick}
        />
      )}

      {/* 右上の吹き出し */}
      {rightIdea && rightIdea.id !== leftIdea?.id && (
        <SingleBubble
          key={rightIdea.id}
          idea={rightIdea}
          position="top-right"
          currentUserId={currentUserId}
          onLike={onToggleLike}
          onClick={handleBubbleClick}
        />
      )}

      {/* 下部のコメント入力欄 ここにアイデアを書く */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '88%',
          maxWidth: 360,
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #A876F5',
          borderRadius: 24,
          padding: '6px 8px 6px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 6px 20px rgba(168, 118, 245, 0.16)',
          pointerEvents: 'auto',
          zIndex: 25
        }}
      >
        <input
          type="text"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendComment();
            }
          }}
          placeholder="ここにアイデアを書く"
          style={{
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 14,
            fontWeight: 600,
            color: '#171A21',
            width: '100%',
            padding: '4px 0'
          }}
        />
        <button
          type="button"
          onClick={handleSendComment}
          disabled={!commentInput.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: commentInput.trim() ? '#A876F5' : '#F7F8FA',
            color: commentInput.trim() ? '#FFFFFF' : '#A876F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: commentInput.trim() ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title="送信"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

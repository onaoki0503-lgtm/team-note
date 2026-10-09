import React, { useState, useEffect } from 'react';
import { Send, Heart, Trash2 } from 'lucide-react';

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
  onDeleteIdea: (ideaId: string) => void;
}

// 文章が成立しているかの判定関数
export const checkIdeaSentenceValidity = (text: string): { valid: boolean; reason?: string } => {
  const trimmed = text.trim();
  if (trimmed.length < 4) {
    return { valid: false, reason: '4文字以上の文章でつぶやいてください' };
  }
  if (/^(.)\1+$/.test(trimmed)) {
    return { valid: false, reason: '意味の通る文章でつぶやいてください' };
  }
  const meaningfulChars = trimmed.replace(/[\s.,!?;:・…~〜！？。、]/g, '');
  if (meaningfulChars.length < 3) {
    return { valid: false, reason: '文章として伝わるアイデアをつぶやいてください' };
  }
  return { valid: true };
};

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
      }, 40);

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

// 掲示板スロット配置の座標定義
interface SlotPosition {
  top: string;
  left?: string;
  right?: string;
  transform?: string;
  borderRadius: string;
  rotateDeg: number;
}

const BOARD_SLOTS: SlotPosition[] = [
  { top: '15%', left: '4%', borderRadius: '18px 18px 18px 4px', rotateDeg: -1.2 },
  { top: '16%', right: '4%', borderRadius: '18px 18px 4px 18px', rotateDeg: 1.5 },
  { top: '28%', left: '3%', borderRadius: '18px 18px 18px 4px', rotateDeg: 0.8 },
  { top: '29%', right: '3%', borderRadius: '18px 18px 4px 18px', rotateDeg: -1.0 },
  { top: '42%', left: '3%', borderRadius: '18px 18px 18px 4px', rotateDeg: -0.6 },
  { top: '43%', right: '3%', borderRadius: '18px 18px 4px 18px', rotateDeg: 1.2 },
  { top: '9%', left: '50%', transform: 'translateX(-50%)', borderRadius: '18px', rotateDeg: 0 },
  { top: '60%', left: '5%', borderRadius: '18px 18px 18px 4px', rotateDeg: 1.0 },
  { top: '61%', right: '5%', borderRadius: '18px 18px 4px 18px', rotateDeg: -0.8 }
];

// 件数に応じた動的スケール計算
const getScaleConfig = (count: number) => {
  if (count <= 2) {
    return {
      scale: 1,
      fontSize: 13,
      padding: '10px 14px',
      maxWidth: 220,
      heartSize: 13,
      likesFontSize: 12,
      authorFontSize: 11,
      gap: 5
    };
  }
  if (count <= 4) {
    return {
      scale: 0.92,
      fontSize: 12,
      padding: '8px 12px',
      maxWidth: 185,
      heartSize: 12,
      likesFontSize: 11,
      authorFontSize: 10,
      gap: 4
    };
  }
  if (count <= 6) {
    return {
      scale: 0.84,
      fontSize: 11,
      padding: '6px 10px',
      maxWidth: 155,
      heartSize: 11,
      likesFontSize: 10,
      authorFontSize: 9.5,
      gap: 3
    };
  }
  // 7件以上
  return {
    scale: 0.76,
    fontSize: 10,
    padding: '5px 8px',
    maxWidth: 138,
    heartSize: 10,
    likesFontSize: 9,
    authorFontSize: 9,
    gap: 3
  };
};

// 単一吹き出しカード
interface SingleBubbleProps {
  idea: IdeaItem;
  slot: SlotPosition;
  scaleConfig: ReturnType<typeof getScaleConfig>;
  currentUserId: string;
  currentUserName?: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (idea: IdeaItem) => void;
}

const SingleBubble: React.FC<SingleBubbleProps> = ({
  idea,
  slot,
  scaleConfig,
  currentUserId,
  currentUserName,
  onLike,
  onDelete,
  onClick
}) => {
  const [justLiked, setJustLiked] = useState(false);

  const isLikedByMe = idea.likedUserIds?.includes(currentUserId);
  const likesCount = idea.likes || 0;

  // 企画を打ち込んだ人のみ削除可能
  const isAuthor =
    Boolean(currentUserId && idea.authorId === currentUserId) ||
    Boolean(currentUserName && idea.authorName === currentUserName);

  // 枠線の色設定
  const borderColor =
    idea.color === 'coral'
      ? '#FF6B68'
      : idea.color === 'cyan'
      ? '#12BDE8'
      : idea.color === 'yellow'
      ? '#F5BE32'
      : '#A876F5';

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setJustLiked(true);
    onLike(idea.id);
    setTimeout(() => setJustLiked(false), 400);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(idea.id);
  };

  // transform合成
  const baseTransform = slot.transform ? `${slot.transform} ` : '';
  const rotateTransform = `rotate(${slot.rotateDeg}deg)`;
  const finalTransform = `${baseTransform}${rotateTransform}`;

  return (
    <div
      onClick={() => onClick(idea)}
      className={idea.isNew ? 'bubble-bounce-pop' : 'bubble-appear'}
      style={{
        position: 'absolute',
        top: slot.top,
        left: slot.left,
        right: slot.right,
        transform: finalTransform,
        borderRadius: slot.borderRadius,
        backgroundColor: '#FFFFFF',
        border: `1.5px solid ${borderColor}`,
        padding: scaleConfig.padding,
        color: '#171A21',
        boxShadow: '0 4px 14px rgba(23, 26, 33, 0.08)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        maxWidth: scaleConfig.maxWidth,
        zIndex: idea.isNew ? 20 : 10,
        display: 'flex',
        flexDirection: 'column',
        gap: scaleConfig.gap,
        transition: 'all 0.25s ease'
      }}
    >
      {/* 吹き出しテキスト */}
      <div
        style={{
          fontSize: scaleConfig.fontSize,
          fontWeight: 700,
          lineHeight: 1.4,
          color: '#171A21',
          wordBreak: 'break-word'
        }}
      >
        <TypingBubbleText text={idea.text} isNew={idea.isNew} />
      </div>

      {/* いいねボタンと投稿者情報・削除ボタン行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginTop: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
          {idea.authorName && (
            <span
              style={{
                fontSize: scaleConfig.authorFontSize,
                color: '#9CA3AF',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {idea.authorName}
            </span>
          )}
          {/* 投稿者本人のみ削除ボタンを表示 */}
          {isAuthor && (
            <button
              type="button"
              onClick={handleDeleteClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '1px',
                minHeight: 'auto',
                flexShrink: 0
              }}
              title="つぶやきを削除"
            >
              <Trash2 size={scaleConfig.heartSize} />
            </button>
          )}
        </div>

        {/* いいねボタン */}
        <button
          type="button"
          onClick={handleLikeClick}
          className={justLiked ? 'heart-pop' : ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            borderRadius: 12,
            backgroundColor: isLikedByMe ? '#FFF1F2' : '#F7F8FA',
            border: isLikedByMe ? '1px solid #FECDD3' : '1px solid #E5E7EB',
            color: isLikedByMe ? '#E11D48' : '#6B7280',
            fontSize: scaleConfig.likesFontSize,
            fontWeight: 700,
            cursor: 'pointer',
            minHeight: 'auto',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          title="いいね"
        >
          <Heart
            size={scaleConfig.heartSize}
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
  currentUserName,
  onOpenIdeaInputWithText,
  onSelectProject,
  isPaused,
  onAddNewIdea,
  onToggleLike,
  onDeleteIdea
}) => {
  // ホーム画面下のコメント入力ステート
  const [commentInput, setCommentInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeCycleOffset, setActiveCycleOffset] = useState(0);

  // 吹き出しのゆっくり交代 通常9秒
  useEffect(() => {
    if (isPaused || ideas.length <= BOARD_SLOTS.length) return;
    const interval = setInterval(() => {
      setActiveCycleOffset((prev) => (prev + 1) % Math.max(ideas.length, 1));
    }, 9000);
    return () => clearInterval(interval);
  }, [isPaused, ideas.length]);

  // 送信ハンドラー
  const handleSendComment = () => {
    const trimmed = commentInput.trim();
    if (!trimmed) return;

    // 文章になっていないもののチェック
    const check = checkIdeaSentenceValidity(trimmed);
    if (!check.valid) {
      setErrorMessage(check.reason || '文章として伝わるアイデアをつぶやいてください');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setErrorMessage('');
    onAddNewIdea(trimmed);
    setCommentInput('');
  };

  // 表示する吹き出しの選定 掲示板レイアウト
  // 最大スロット数まで同時に並べて表示
  const maxSlots = BOARD_SLOTS.length;
  const latestNewIdea = ideas.find((i) => i.isNew);

  let displayedIdeas: IdeaItem[] = [];

  if (ideas.length <= maxSlots) {
    displayedIdeas = ideas;
  } else {
    // スロット数を超える場合は新着優先＋サイクルで巡回
    if (latestNewIdea) {
      const restIdeas = ideas.filter((i) => i.id !== latestNewIdea.id);
      const sliced = restIdeas.slice(0, maxSlots - 1);
      displayedIdeas = [latestNewIdea, ...sliced];
    } else {
      const rotated = [...ideas.slice(activeCycleOffset), ...ideas.slice(0, activeCycleOffset)];
      displayedIdeas = rotated.slice(0, maxSlots);
    }
  }

  // 件数に応じたスケール構成を取得
  const scaleConfig = getScaleConfig(displayedIdeas.length);

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
      {/* 掲示板スロットに並ぶ複数の吹き出し */}
      {displayedIdeas.map((idea, index) => {
        const slot = BOARD_SLOTS[index % BOARD_SLOTS.length];
        return (
          <SingleBubble
            key={idea.id}
            idea={idea}
            slot={slot}
            scaleConfig={scaleConfig}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onLike={onToggleLike}
            onDelete={onDeleteIdea}
            onClick={handleBubbleClick}
          />
        );
      })}

      {/* 下部のコメント入力欄 アイデアをつぶやく */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '88%',
          maxWidth: 360,
          pointerEvents: 'auto',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6
        }}
      >
        {/* エラー案内メッセージ */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: '#B92F3D',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 14,
              boxShadow: '0 2px 8px rgba(185, 47, 61, 0.3)'
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #A876F5',
            borderRadius: 24,
            padding: '6px 8px 6px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 6px 20px rgba(168, 118, 245, 0.16)'
          }}
        >
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposing) {
                e.preventDefault();
                handleSendComment();
              }
            }}
            placeholder="アイデアをつぶやく"
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
    </div>
  );
};

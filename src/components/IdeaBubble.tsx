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

// アイデアIDから決定論的な不規則ジッターを生成する関数
// ランダム感を持たせつつリロードで同じ位置を保ち重なりを防ぐ
const getDeterministicJitter = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);

  const dX = (abs % 19) - 9;
  const dY = ((abs >> 3) % 17) - 8;
  const rot = (((abs >> 6) % 70) / 10) - 3.5;

  const radiusStyles = [
    '20px 20px 20px 4px',
    '20px 20px 4px 20px',
    '4px 20px 20px 20px',
    '20px 4px 20px 20px',
    '22px 16px 20px 18px',
    '16px 22px 18px 20px'
  ];
  const radius = radiusStyles[abs % radiusStyles.length];

  return { dX, dY, rot, radius };
};

// 掲示板スロットの安全座標定義 重なり合わないよう画面外周に分散配置
interface BoardSlotZone {
  top: string;
  left?: string;
  right?: string;
  transform?: string;
  baseRotate: number;
}

// 中央ボタンを避けた36箇所の安全座標スロット群
const BOARD_SLOTS: BoardSlotZone[] = [
  // 1〜10 上部と中段上と左右
  { top: '10%', left: '4%', baseRotate: -1.5 },
  { top: '11%', right: '5%', baseRotate: 1.8 },
  { top: '7%', left: '50%', transform: 'translateX(-50%)', baseRotate: -0.4 },
  { top: '18%', left: '2%', baseRotate: 1.2 },
  { top: '19%', right: '3%', baseRotate: -1.4 },
  { top: '17%', left: '52%', transform: 'translateX(-50%)', baseRotate: 0.8 },
  { top: '26%', left: '3%', baseRotate: -1.0 },
  { top: '27%', right: '4%', baseRotate: 1.5 },
  { top: '35%', left: '2%', baseRotate: 1.6 },
  { top: '36%', right: '3%', baseRotate: -1.8 },

  // 11〜20 中段下と左右と下部
  { top: '44%', left: '3%', baseRotate: -0.7 },
  { top: '45%', right: '2%', baseRotate: 1.1 },
  { top: '53%', left: '2%', baseRotate: 1.3 },
  { top: '54%', right: '4%', baseRotate: -1.5 },
  { top: '62%', left: '4%', baseRotate: -1.2 },
  { top: '63%', right: '3%', baseRotate: 1.4 },
  { top: '70%', left: '6%', baseRotate: 0.9 },
  { top: '71%', right: '5%', baseRotate: -1.1 },
  { top: '67%', left: '50%', transform: 'translateX(-50%)', baseRotate: -0.6 },
  { top: '74%', left: '48%', transform: 'translateX(-50%)', baseRotate: 0.7 },

  // 21〜30 斜めコーナーと隙間ポケット
  { top: '13%', left: '26%', baseRotate: -1.1 },
  { top: '14%', right: '25%', baseRotate: 1.3 },
  { top: '22%', left: '22%', baseRotate: 0.6 },
  { top: '23%', right: '22%', baseRotate: -0.9 },
  { top: '58%', left: '20%', baseRotate: -1.4 },
  { top: '59%', right: '21%', baseRotate: 1.2 },
  { top: '66%', left: '24%', baseRotate: 0.8 },
  { top: '67%', right: '25%', baseRotate: -0.7 },
  { top: '30%', left: '16%', baseRotate: -1.3 },
  { top: '31%', right: '15%', baseRotate: 1.0 },

  // 31〜36 さらなる分散ポケット
  { top: '49%', left: '17%', baseRotate: 0.9 },
  { top: '50%', right: '16%', baseRotate: -1.2 },
  { top: '9%', left: '15%', baseRotate: 1.4 },
  { top: '9%', right: '16%', baseRotate: -1.3 },
  { top: '75%', left: '18%', baseRotate: -0.8 },
  { top: '75%', right: '16%', baseRotate: 1.1 }
];

// 何個でも重ならずに配置するための動的スロット計算関数
const getBoardSlot = (index: number): BoardSlotZone => {
  const baseSlot = BOARD_SLOTS[index % BOARD_SLOTS.length];
  const round = Math.floor(index / BOARD_SLOTS.length);
  if (round === 0) {
    return baseSlot;
  }
  // スロット数を上回る件数の場合 周回ごとにオフセットを微細付与
  const jitterX = ((round * 7) % 15) - 7;
  const jitterY = ((round * 5) % 13) - 6;
  return {
    ...baseSlot,
    transform: baseSlot.transform
      ? `${baseSlot.transform} translate(${jitterX}px, ${jitterY}px)`
      : `translate(${jitterX}px, ${jitterY}px)`
  };
};

// 件数に応じた動的スケール計算 件数が増えるほど自動でコンパクトに縮小
const getScaleConfig = (count: number) => {
  if (count <= 2) {
    return {
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
      fontSize: 11,
      padding: '6px 10px',
      maxWidth: 155,
      heartSize: 11,
      likesFontSize: 10,
      authorFontSize: 9.5,
      gap: 3
    };
  }
  if (count <= 9) {
    return {
      fontSize: 10,
      padding: '5px 8px',
      maxWidth: 135,
      heartSize: 10,
      likesFontSize: 9,
      authorFontSize: 9,
      gap: 3
    };
  }
  if (count <= 14) {
    return {
      fontSize: 9.5,
      padding: '4px 7px',
      maxWidth: 118,
      heartSize: 9.5,
      likesFontSize: 8.5,
      authorFontSize: 8.5,
      gap: 2
    };
  }
  if (count <= 19) {
    return {
      fontSize: 8.5,
      padding: '3px 6px',
      maxWidth: 102,
      heartSize: 9,
      likesFontSize: 8,
      authorFontSize: 8,
      gap: 2
    };
  }
  // 20件以上
  return {
    fontSize: 8,
    padding: '3px 5px',
    maxWidth: 90,
    heartSize: 8,
    likesFontSize: 7.5,
    authorFontSize: 7.5,
    gap: 1.5
  };
};

// 単一吹き出しカード 不規則な傾きと位置ブレで掲示板らしさを表現
interface SingleBubbleProps {
  idea: IdeaItem;
  zone: BoardSlotZone;
  scaleConfig: ReturnType<typeof getScaleConfig>;
  currentUserId: string;
  currentUserName?: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (idea: IdeaItem) => void;
}

const SingleBubble: React.FC<SingleBubbleProps> = ({
  idea,
  zone,
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

  // 不規則ジッターの計算 重なり合わない安全範囲内でブレを付与
  const jitter = getDeterministicJitter(idea.id);
  const totalRotate = zone.baseRotate + jitter.rot;

  let computedTransform = '';
  if (zone.transform) {
    computedTransform = `${zone.transform} translate(${jitter.dX}px, ${jitter.dY}px) rotate(${totalRotate}deg)`;
  } else {
    computedTransform = `translate(${jitter.dX}px, ${jitter.dY}px) rotate(${totalRotate}deg)`;
  }

  return (
    <div
      onClick={() => onClick(idea)}
      className={idea.isNew ? 'bubble-bounce-pop' : 'bubble-appear'}
      style={{
        position: 'absolute',
        top: zone.top,
        left: zone.left,
        right: zone.right,
        transform: computedTransform,
        borderRadius: jitter.radius,
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

  // 全てのアイデアを切り捨てずに同時に表示 何個でも出現可能
  const displayedIdeas = ideas;

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
      {/* 掲示板ゾーンに不規則に散らばる吹き出し群 何個でも同時に表示 */}
      {displayedIdeas.map((idea, index) => {
        const zone = getBoardSlot(index);
        return (
          <SingleBubble
            key={idea.id}
            idea={idea}
            zone={zone}
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

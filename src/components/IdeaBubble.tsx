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
// ランダム感を持たせつつ微小なブレにとどめて重なりを完全に防止
const getDeterministicJitter = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);

  // 重なりを防ぐため微細なブレにとどめる
  const dX = (abs % 7) - 3;
  const dY = ((abs >> 2) % 7) - 3;
  const rot = (((abs >> 4) % 40) / 10) - 2.0;

  const radiusStyles = [
    '18px 18px 18px 4px',
    '18px 18px 4px 18px',
    '4px 18px 18px 18px',
    '18px 4px 18px 18px',
    '20px 14px 18px 16px',
    '14px 20px 16px 18px'
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

// 幾何学的に重なり合わない安全離隔スロット群
// 左右レーンはY座標を十分離し、横方向は両端に固定して文字被りを完全排除
const SAFE_BOARD_SLOTS: BoardSlotZone[] = [
  // 1〜4 四隅 左上 右上 左下 右下
  { top: '7%', left: '3%', baseRotate: -1.2 },
  { top: '7%', right: '3%', baseRotate: 1.4 },
  { top: '57%', left: '3%', baseRotate: 1.1 },
  { top: '57%', right: '3%', baseRotate: -1.3 },

  // 5〜8 中段左右
  { top: '27%', left: '3%', baseRotate: -0.9 },
  { top: '27%', right: '3%', baseRotate: 1.2 },
  { top: '47%', left: '3%', baseRotate: 1.3 },
  { top: '47%', right: '3%', baseRotate: -1.0 },

  // 9〜12 上段と下段の左右追加スロット
  { top: '17%', left: '3%', baseRotate: 0.8 },
  { top: '17%', right: '3%', baseRotate: -1.1 },
  { top: '67%', left: '3%', baseRotate: -1.4 },
  { top: '67%', right: '3%', baseRotate: 0.9 },

  // 13〜16 中間スロット 左中 右中 最下段左右
  { top: '37%', left: '3%', baseRotate: 1.0 },
  { top: '37%', right: '3%', baseRotate: -1.2 },
  { top: '75%', left: '3%', baseRotate: 0.7 },
  { top: '75%', right: '3%', baseRotate: -0.8 },

  // 17〜18 中央ボタンの上下ポケット
  { top: '12%', left: '50%', transform: 'translateX(-50%)', baseRotate: -0.5 },
  { top: '64%', left: '50%', transform: 'translateX(-50%)', baseRotate: 0.6 },

  // 19〜22 斜め内側ポケット 左右と干渉しないオフセット
  { top: '13%', left: '26%', baseRotate: -1.0 },
  { top: '13%', right: '26%', baseRotate: 1.1 },
  { top: '72%', left: '26%', baseRotate: 0.8 },
  { top: '72%', right: '26%', baseRotate: -0.7 }
];

// 重なりを防止しながら何個でも配置するための動的スロット計算関数
const getBoardSlot = (index: number, totalCount: number): BoardSlotZone => {
  if (totalCount <= SAFE_BOARD_SLOTS.length) {
    return SAFE_BOARD_SLOTS[index % SAFE_BOARD_SLOTS.length];
  }
  const slotCount = SAFE_BOARD_SLOTS.length;
  const baseSlot = SAFE_BOARD_SLOTS[index % slotCount];
  const round = Math.floor(index / slotCount);
  
  // 周回ごとに微小な安全オフセット
  const shiftY = ((round * 3) % 7) - 3;
  return {
    ...baseSlot,
    transform: baseSlot.transform
      ? `${baseSlot.transform} translateY(${shiftY}px)`
      : `translateY(${shiftY}px)`
  };
};

// 件数に応じた動的スケール計算 重なりを防ぐため最大幅を安全範囲内に設計
const getScaleConfig = (count: number) => {
  if (count <= 2) {
    return {
      fontSize: 12.5,
      padding: '8px 12px',
      maxWidth: 150,
      heartSize: 12,
      likesFontSize: 11,
      authorFontSize: 10,
      gap: 4
    };
  }
  if (count <= 4) {
    return {
      fontSize: 11.5,
      padding: '7px 10px',
      maxWidth: 135,
      heartSize: 11.5,
      likesFontSize: 10.5,
      authorFontSize: 9.5,
      gap: 3.5
    };
  }
  if (count <= 8) {
    return {
      fontSize: 10.5,
      padding: '6px 8px',
      maxWidth: 120,
      heartSize: 11,
      likesFontSize: 10,
      authorFontSize: 9,
      gap: 3
    };
  }
  if (count <= 12) {
    return {
      fontSize: 9.5,
      padding: '5px 7px',
      maxWidth: 108,
      heartSize: 10,
      likesFontSize: 9,
      authorFontSize: 8.5,
      gap: 2.5
    };
  }
  if (count <= 18) {
    return {
      fontSize: 8.5,
      padding: '4px 6px',
      maxWidth: 96,
      heartSize: 9,
      likesFontSize: 8,
      authorFontSize: 8,
      gap: 2
    };
  }
  // 19件以上
  return {
    fontSize: 8,
    padding: '3px 5px',
    maxWidth: 86,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 長押し検知用の参照値
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = React.useRef(false);
  const startPointerPosRef = React.useRef<{ x: number; y: number } | null>(null);

  const isLikedByMe = idea.likedUserIds?.includes(currentUserId);
  const likesCount = idea.likes || 0;

  // 企画を打ち込んだ人のみ削除可能
  const isAuthor =
    Boolean(currentUserId && idea.authorId === currentUserId) ||
    Boolean(currentUserName && idea.authorName === currentUserName);

  // 枠線の色設定 自分のつぶやきは薄青と調和するスカイブルー
  const borderColor = isAuthor
    ? '#93C5FD'
    : idea.color === 'coral'
    ? '#FF6B68'
    : idea.color === 'cyan'
    ? '#12BDE8'
    : idea.color === 'yellow'
    ? '#F5BE32'
    : '#A876F5';

  // 背景色設定 自分のつぶやきは薄い青色 他者は清潔な白色
  const bubbleBgColor = isAuthor ? '#EDF6FF' : '#FFFFFF';

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setJustLiked(true);
    onLike(idea.id);
    setTimeout(() => setJustLiked(false), 400);
  };

  // 長押し開始ハンドラー
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isAuthor) return;
    isLongPressTriggeredRef.current = false;
    startPointerPosRef.current = { x: e.clientX, y: e.clientY };

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setShowDeleteConfirm(true);
    }, 500);
  };

  // 長押し解除ハンドラー
  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 指が大きく動いた場合は長押しキャンセル
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPointerPosRef.current || !longPressTimerRef.current) return;
    const dx = Math.abs(e.clientX - startPointerPosRef.current.x);
    const dy = Math.abs(e.clientY - startPointerPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 右クリック時の削除確認表示
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isAuthor) return;
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  // カード全体のクリックハンドラー
  const handleCardClick = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.stopPropagation();
      isLongPressTriggeredRef.current = false;
      return;
    }
    if (showDeleteConfirm) {
      return;
    }
    onClick(idea);
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
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerMove={handlePointerMove}
      className={idea.isNew ? 'bubble-bounce-pop' : 'bubble-appear'}
      style={{
        position: 'absolute',
        top: zone.top,
        left: zone.left,
        right: zone.right,
        transform: computedTransform,
        borderRadius: jitter.radius,
        backgroundColor: bubbleBgColor,
        border: `1.5px solid ${borderColor}`,
        padding: scaleConfig.padding,
        color: '#171A21',
        boxShadow: isAuthor
          ? '0 4px 16px rgba(59, 130, 246, 0.16)'
          : '0 4px 14px rgba(23, 26, 33, 0.08)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        width: 'max-content',
        maxWidth: scaleConfig.maxWidth,
        boxSizing: 'border-box',
        zIndex: showDeleteConfirm ? 40 : idea.isNew ? 20 : 10,
        display: 'flex',
        flexDirection: 'column',
        gap: scaleConfig.gap,
        transition: 'all 0.25s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none'
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

      {/* いいねボタンのみを表示 名前と削除ボタンは表示しない */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 1
        }}
      >
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
            backgroundColor: isLikedByMe ? '#FFF1F2' : isAuthor ? '#FFFFFF' : '#F7F8FA',
            border: isLikedByMe ? '1px solid #FECDD3' : isAuthor ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
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

      {/* 長押しか右クリックで出現する削除確認カード */}
      {showDeleteConfirm && (
        <>
          {/* 枠外タップで閉じる透明オーバーレイ */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 45,
              cursor: 'default'
            }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #EF4444',
              borderRadius: 12,
              padding: '8px 12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              minWidth: 124,
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#171A21' }}>
              つぶやきを削除しますか？
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                  onDelete(idea.id);
                }}
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                削除
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </>
      )}
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
      {/* 掲示板ゾーンに不規則に散らばる吹き出し群 何個でも重ならずに同時表示 */}
      {displayedIdeas.map((idea, index) => {
        const zone = getBoardSlot(index, displayedIdeas.length);
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

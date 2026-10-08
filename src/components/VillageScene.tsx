import React from 'react';

interface VillageSceneProps {
  type?: 'courtyard' | 'commons';
  isPaused?: boolean;
  onTogglePause?: () => void;
  showPauseButton?: boolean;
}

export const VillageScene: React.FC<VillageSceneProps> = ({
  type = 'courtyard',
  isPaused = false,
  onTogglePause,
  showPauseButton = true
}) => {
  const imgSrc = type === 'courtyard' ? './courtyard_monochrome.png' : './commons_monochrome.png';

  return (
    <div
      className={`village-scene-bg ${isPaused ? 'animation-paused' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1
      }}
      aria-hidden="true"
    >
      {/* モノクロ背景写真（グレースケール） */}
      <img
        src={imgSrc}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 40%',
          filter: 'grayscale(100%) contrast(108%) brightness(96%)',
          display: 'block'
        }}
      />

      {/* 薄いオーバーレイ（視認性確保用） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 48%, rgba(247, 248, 250, 0.4) 0%, rgba(247, 248, 250, 0.72) 100%)'
        }}
      />

      {/* アイデアを表す4色の細い光線（SVGパス） */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="glow-coral" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. コーラル線（左側住棟の輪郭から中庭階段へ） */}
        <path
          d="M 50 200 L 220 280 L 320 460 Q 400 520 500 500"
          fill="none"
          stroke="#FF6B68"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="path-coral"
          filter="url(#glow-coral)"
        />
        {/* コーラルの光点 */}
        <circle cx="220" cy="280" r="4" fill="#FF6B68" />

        {/* 2. シアン線（右側住棟から中庭・中央ボタンへ） */}
        <path
          d="M 950 240 L 780 320 L 680 430 Q 580 480 500 500"
          fill="none"
          stroke="#12BDE8"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="path-cyan"
          filter="url(#glow-cyan)"
        />
        <circle cx="780" cy="320" r="4" fill="#12BDE8" />

        {/* 3. イエロー線（奥の連絡通路から階段へ） */}
        <path
          d="M 500 280 L 520 380 Q 500 440 450 490"
          fill="none"
          stroke="#F5BE32"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="path-yellow"
        />

        {/* 4. バイオレット線（中庭の下部から手前通路へ） */}
        <path
          d="M 500 500 Q 580 560 680 620 L 850 720"
          fill="none"
          stroke="#A876F5"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="path-violet"
        />
        <circle cx="680" cy="620" r="4" fill="#A876F5" />
      </svg>

      {/* 動きの停止ボタン（画面仕様：動きを止める操作を用意する） */}
      {showPauseButton && onTogglePause && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            pointerEvents: 'auto',
            zIndex: 10
          }}
        >
          <button
            type="button"
            onClick={onTogglePause}
            style={{
              backgroundColor: isPaused ? '#171A21' : 'rgba(255, 255, 255, 0.9)',
              color: isPaused ? '#FFFFFF' : '#596273',
              border: '1px solid #D9DEE7',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              minHeight: 34,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}
          >
            <span>{isPaused ? '▶ 動きを再開' : '⏸ 動きを停止'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

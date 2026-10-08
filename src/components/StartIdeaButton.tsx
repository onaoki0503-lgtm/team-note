import React from 'react';

interface StartIdeaButtonProps {
  onClick: () => void;
  size?: number;
}

export const StartIdeaButton: React.FC<StartIdeaButtonProps> = ({
  onClick,
  size = 176
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none'
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label="アイデア運営をスタート"
    >
      {/* 外周の細い多色リング (コーラル / シアン / イエロー / バイオレット) */}
      <div
        className="multicolor-ring"
        style={{
          position: 'absolute',
          inset: -6,
          borderRadius: '50%',
          padding: 3,
          background: 'conic-gradient(#FF6B68 0deg 90deg, #12BDE8 90deg 180deg, #F5BE32 180deg 270deg, #A876F5 270deg 360deg)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none'
        }}
      />

      {/* 外側の薄い光彩リング */}
      <div
        style={{
          position: 'absolute',
          inset: -12,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(18, 189, 232, 0.15) 0%, rgba(255, 107, 104, 0.15) 50%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* 中央の白い円形ボタン本体 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #D9DEE7',
          boxShadow: '0 8px 24px rgba(23, 26, 33, 0.08), 0 2px 6px rgba(23, 26, 33, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          textAlign: 'center',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(23, 26, 33, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(23, 26, 33, 0.08)';
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#171A21',
            lineHeight: 1.35,
            letterSpacing: -0.3
          }}
        >
          アイデア運営を<br />スタート
        </span>
      </div>
    </div>
  );
};

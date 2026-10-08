import React from 'react';
import { Lightbulb, PlayCircle, ClipboardCheck, Archive, ArrowLeft } from 'lucide-react';
import type { CurrentUser } from '../lib/db';

export type MainNavDestination = 'change' | 'progress' | 'work' | 'warehouse';

interface AppShellProps {
  activeTab: MainNavDestination;
  onTabChange: (tab: MainNavDestination) => void;
  currentUser: CurrentUser;
  onOpenUserMenu: () => void;
  onBack?: () => void;
  backTitle?: string;
  hideNav?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onOpenUserMenu,
  onBack,
  backTitle,
  hideNav = false,
  children
}) => {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#F7F8FA',
        color: '#171A21',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* 共通トップヘッダー（白背景・細い下線・4色グラデーション上辺） */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #D9DEE7',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* 上辺の細い多色グラデーションライン */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #12BDE8 0 25%, #FF6B68 25% 50%, #F5BE32 50% 75%, #A876F5 75% 100%)'
          }}
        />

        {/* 左側: 戻る操作 または ロゴ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 700,
                color: '#171A21',
                padding: '4px 8px',
                borderRadius: 8
              }}
              aria-label="前の画面に戻る"
            >
              <ArrowLeft size={18} />
              <span>{backTitle || '戻る'}</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#596273' }}>H-Village</span>
              <span style={{ color: '#D9DEE7' }}>|</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#171A21' }}>チームノート</span>
            </div>
          )}
        </div>

        {/* PC向けヘッダーナビゲーション (768px以上) */}
        <nav
          className="pc-header-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}
        >
          {/* 1. イータを変える */}
          <button
            type="button"
            onClick={() => onTabChange('change')}
            style={{
              background: 'transparent',
              fontSize: 14,
              fontWeight: activeTab === 'change' ? 800 : 600,
              color: activeTab === 'change' ? '#171A21' : '#596273',
              borderBottom: activeTab === 'change' ? '2px solid #171A21' : '2px solid transparent',
              padding: '6px 2px',
              minHeight: 'auto'
            }}
          >
            イータを変える
          </button>

          {/* 2. 進行中 */}
          <button
            type="button"
            onClick={() => onTabChange('progress')}
            style={{
              background: 'transparent',
              fontSize: 14,
              fontWeight: activeTab === 'progress' ? 800 : 600,
              color: activeTab === 'progress' ? '#171A21' : '#596273',
              borderBottom: activeTab === 'progress' ? '2px solid #171A21' : '2px solid transparent',
              padding: '6px 2px',
              minHeight: 'auto'
            }}
          >
            進行中
          </button>

          {/* 3. はたらく */}
          <button
            type="button"
            onClick={() => onTabChange('work')}
            style={{
              background: 'transparent',
              fontSize: 14,
              fontWeight: activeTab === 'work' ? 800 : 600,
              color: activeTab === 'work' ? '#171A21' : '#596273',
              borderBottom: activeTab === 'work' ? '2px solid #171A21' : '2px solid transparent',
              padding: '6px 2px',
              minHeight: 'auto'
            }}
          >
            はたらく
          </button>

          {/* 4. 保管する */}
          <button
            type="button"
            onClick={() => onTabChange('warehouse')}
            style={{
              background: 'transparent',
              fontSize: 14,
              fontWeight: activeTab === 'warehouse' ? 800 : 600,
              color: activeTab === 'warehouse' ? '#171A21' : '#596273',
              borderBottom: activeTab === 'warehouse' ? '2px solid #171A21' : '2px solid transparent',
              padding: '6px 2px',
              minHeight: 'auto'
            }}
          >
            保管する
          </button>
        </nav>

        {/* 右側: 利用者アイコン（デモ切替メニュー） */}
        <button
          type="button"
          onClick={onOpenUserMenu}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            padding: 4,
            borderRadius: 20
          }}
          aria-label="利用者を切り替える"
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#EEF0F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              color: '#171A21',
              border: '1px solid #D9DEE7'
            }}
          >
            {currentUser.name ? currentUser.name.charAt(0) : 'A'}
          </div>
        </button>
      </header>

      {/* メインコンテンツ領域（スマホ下部ナビのための余白を確保） */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: hideNav ? 0 : 72,
          position: 'relative'
        }}
      >
        {children}
      </main>

      {/* スマホ優先 固定ボトムナビゲーション (768px未満) */}
      {!hideNav && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #D9DEE7',
            padding: '8px 12px env(safe-area-inset-bottom, 8px)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 40
          }}
        >
          {/* 1. イータを変える */}
          <button
            type="button"
            onClick={() => onTabChange('change')}
            style={{
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'change' ? '#171A21' : '#596273',
              padding: '4px 8px',
              minHeight: 44
            }}
          >
            <Lightbulb size={20} strokeWidth={activeTab === 'change' ? 2.4 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: activeTab === 'change' ? 800 : 500 }}>
              イータを変える
            </span>
          </button>

          {/* 2. 進行中 */}
          <button
            type="button"
            onClick={() => onTabChange('progress')}
            style={{
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'progress' ? '#171A21' : '#596273',
              padding: '4px 8px',
              minHeight: 44
            }}
          >
            <PlayCircle size={20} strokeWidth={activeTab === 'progress' ? 2.4 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: activeTab === 'progress' ? 800 : 500 }}>
              進行中
            </span>
          </button>

          {/* 3. はたらく */}
          <button
            type="button"
            onClick={() => onTabChange('work')}
            style={{
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'work' ? '#171A21' : '#596273',
              padding: '4px 8px',
              minHeight: 44
            }}
          >
            <ClipboardCheck size={20} strokeWidth={activeTab === 'work' ? 2.4 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: activeTab === 'work' ? 800 : 500 }}>
              はたらく
            </span>
          </button>

          {/* 4. 保管する */}
          <button
            type="button"
            onClick={() => onTabChange('warehouse')}
            style={{
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'warehouse' ? '#171A21' : '#596273',
              padding: '4px 8px',
              minHeight: 44
            }}
          >
            <Archive size={20} strokeWidth={activeTab === 'warehouse' ? 2.4 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: activeTab === 'warehouse' ? 800 : 500 }}>
              保管する
            </span>
          </button>
        </nav>
      )}
    </div>
  );
};

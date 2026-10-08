import React from 'react';
import { Lightbulb, PlayCircle, Briefcase, Archive, ArrowLeft, User } from 'lucide-react';
import type { CurrentUser } from '../lib/db';

export type MainNavDestination = 'change' | 'progress' | 'work' | 'warehouse' | 'profile';

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
      {/* 共通トップヘッダー 白背景・細い下線・4色グラデーション上辺 */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #D9DEE7',
          padding: '10px 14px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                padding: '4px 6px',
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

        {/* 右側: 利用者アバターアイコン 名簿・ログインユーザーの写真と完全連動 */}
        <button
          type="button"
          onClick={onOpenUserMenu}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            padding: 2,
            borderRadius: '50%',
            cursor: 'pointer'
          }}
          aria-label="利用者のプロフィール・切り替え"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#EEF0F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid #D9DEE7',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.08)'
            }}
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 800, color: '#171A21' }}>
                {currentUser.name ? currentUser.name.charAt(0) : '岡'}
              </span>
            )}
          </div>
        </button>
      </header>

      {/* メインコンテンツ領域 */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: hideNav ? 16 : 88,
          position: 'relative'
        }}
      >
        {children}
      </main>

      {/* 2枚目写真仕様: すりガラス調フローティングカプセルナビゲーション */}
      {!hideNav && (
        <nav
          style={{
            position: 'fixed',
            bottom: 16,
            left: 12,
            right: 12,
            maxWidth: 440,
            margin: '0 auto',
            backgroundColor: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(220, 225, 235, 0.9)',
            borderRadius: 9999,
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04)',
            padding: '4px 6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 50
          }}
        >
          {/* 1. アイデア */}
          <button
            type="button"
            onClick={() => onTabChange('change')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'change' ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              borderRadius: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 2px',
              minHeight: 46,
              color: '#171A21',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Lightbulb size={22} strokeWidth={activeTab === 'change' ? 2.5 : 1.9} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: activeTab === 'change' ? 800 : 600,
                marginTop: 2,
                letterSpacing: -0.2
              }}
            >
              アイデア
            </span>
          </button>

          {/* 2. 進行中 */}
          <button
            type="button"
            onClick={() => onTabChange('progress')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'progress' ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              borderRadius: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 2px',
              minHeight: 46,
              color: '#171A21',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <PlayCircle size={22} strokeWidth={activeTab === 'progress' ? 2.5 : 1.9} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: activeTab === 'progress' ? 800 : 600,
                marginTop: 2,
                letterSpacing: -0.2
              }}
            >
              進行中
            </span>
          </button>

          {/* 3. はたらく */}
          <button
            type="button"
            onClick={() => onTabChange('work')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'work' ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              borderRadius: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 2px',
              minHeight: 46,
              color: '#171A21',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Briefcase size={22} strokeWidth={activeTab === 'work' ? 2.5 : 1.9} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: activeTab === 'work' ? 800 : 600,
                marginTop: 2,
                letterSpacing: -0.2
              }}
            >
              はたらく
            </span>
          </button>

          {/* 4. 保管する */}
          <button
            type="button"
            onClick={() => onTabChange('warehouse')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'warehouse' ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              borderRadius: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 2px',
              minHeight: 46,
              color: '#171A21',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Archive size={22} strokeWidth={activeTab === 'warehouse' ? 2.5 : 1.9} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: activeTab === 'warehouse' ? 800 : 600,
                marginTop: 2,
                letterSpacing: -0.2
              }}
            >
              保管する
            </span>
          </button>

          {/* 5. マイページ (2枚目写真仕様) */}
          <button
            type="button"
            onClick={() => onTabChange('profile')}
            style={{
              flex: 1,
              backgroundColor: activeTab === 'profile' ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              borderRadius: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 2px',
              minHeight: 46,
              color: '#171A21',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <User size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 1.9} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: activeTab === 'profile' ? 800 : 600,
                marginTop: 2,
                letterSpacing: -0.2
              }}
            >
              マイページ
            </span>
          </button>
        </nav>
      )}
    </div>
  );
};

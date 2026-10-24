import { useState, type ReactNode, type CSSProperties } from 'react';
import { community } from '../lib/community';
import { teamnoteReviewMode } from '../lib/teamnoteCloud';
import { Lightbulb, PlayCircle, Briefcase, Archive, ArrowLeft, Settings } from 'lucide-react';
import type { CurrentUser } from '../lib/db';
export type MainNavDestination = 'change' | 'progress' | 'work' | 'warehouse' | 'profile';
interface AppShellProps { activeTab: MainNavDestination; onTabChange: (tab: MainNavDestination) => void; currentUser: CurrentUser; onOpenUserMenu: () => void; onOpenSettings: () => void; onBack?: () => void; backTitle?: string; hideNav?: boolean; isMotionPaused: boolean; children: ReactNode; }
const destinations = [{ key: 'change', label: 'アイデア', icon: Lightbulb }, { key: 'progress', label: '進行中', icon: PlayCircle }, { key: 'work', label: 'はたらく', icon: Briefcase }, { key: 'warehouse', label: '保管する', icon: Archive }] as const;
export function AppShell({ activeTab, onTabChange, currentUser, onOpenUserMenu, onOpenSettings, onBack, backTitle, hideNav = false, isMotionPaused: motionPaused, children }: AppShellProps) {
  const [avatarFailed, setAvatarFailed] = useState('');
  const activeIndex = Math.max(0, destinations.findIndex(item => item.key === activeTab));
  return <div className={`app-shell ${motionPaused ? 'motion-reduce' : ''}`} data-motion-paused={motionPaused}>
    <div className="glass-atmosphere" aria-hidden="true"><i /><i /><i /></div>
    <header className="glass-toolbar glass-surface">
      <div className="toolbar-leading">
        {onBack && <button type="button" className="glass-icon-button" onClick={onBack} aria-label="前の画面に戻る"><ArrowLeft size={20} /><span className="toolbar-back-label">{backTitle || '戻る'}</span></button>}
        <div className="app-brand"><span className="brand-mark" aria-hidden="true"><Lightbulb size={21} strokeWidth={1.7} /></span><div><strong>チームノート</strong><span title={teamnoteReviewMode ? '操作デモ：入力はこの端末のみに保存されます' : undefined}>{community.name}{teamnoteReviewMode ? ' · 操作デモ' : ''}</span></div></div>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="glass-icon-button toolbar-settings" onClick={onOpenSettings} aria-label="設定">
          <Settings size={22} strokeWidth={1.7} />
        </button>
        <button type="button" className="glass-avatar" onClick={onOpenUserMenu} aria-label="利用者のプロフィール・切り替え">
          {currentUser.avatar && avatarFailed !== currentUser.avatar ? <img src={currentUser.avatar} alt="" onError={() => setAvatarFailed(currentUser.avatar || '')} /> : <span>{currentUser.name?.charAt(0) || '寮'}</span>}
        </button>
      </div>
    </header>
    <main className={`app-content ${hideNav ? 'without-nav' : ''}`}>{children}</main>
    {!hideNav && <nav className="glass-nav glass-surface" aria-label="メインメニュー" style={{ '--nav-index': activeIndex } as CSSProperties}>
      <div className="nav-lens" aria-hidden="true" />
      {destinations.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => onTabChange(key)} aria-current={activeTab === key ? 'page' : undefined} className={activeTab === key ? 'is-active' : ''}><Icon size={22} strokeWidth={activeTab === key ? 2.2 : 1.7} /><span>{label}</span></button>)}
    </nav>}
  </div>;
}

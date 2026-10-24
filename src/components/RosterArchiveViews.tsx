import { InventoryView } from './InventoryView';
import { useScreenState } from '../lib/navigation';
import React, { useState, useRef } from 'react';
import { Search, Plus, ChevronRight, Camera, Edit3 } from 'lucide-react';
import { parseUnitNumber, type ResidentRecord, type CurrentUser, type ResidentRoleKey, type ProjectRecord, type ResidentProfileUpdates, DORM_ROLES_CONFIG, getRoleBadgeInfo } from '../lib/db';
import { getActivityHistory } from '../lib/activityHistory';
import { addTeamnoteArchive, type ArchiveDocItem } from '../lib/teamnoteArchives';
import { signedTeamnoteUrl, uploadTeamnoteFile } from '../lib/teamnoteFiles';
import { useSharedIdeas } from '../lib/sharedIdeasContext';
import { processAndResizeImage, playBurnImpactSound } from '../utils/avatarEffect';

const DEMO_ARCHIVES: ArchiveDocItem[] = [
  { id: '1', title: '交流イベント企画書.pdf', category: '企画書', storagePath: '', sizeBytes: 0, updatedAt: '2026-01-01', year: '2026年度', desc: '交流イベントの実施内容や改善点をまとめた資料です。' },
  { id: '2', title: '中庭イベントの振り返り', category: '議事録', storagePath: '', sizeBytes: 0, updatedAt: '2026-01-01', year: '2026年度', desc: '中庭での映画上映イベントの実施内容や改善点をまとめた資料です。' },
];

interface RosterArchiveViewsProps {
  viewType: 'roster' | 'inventory' | 'archives' | 'profile' | 'switch_user' | 'register_user';
  currentUser: CurrentUser;
  allowAddResident?: boolean;
  residents: ResidentRecord[];
  projects: ProjectRecord[];
  archiveDocs?: ArchiveDocItem[];
  onArchivesChange?: (docs: ArchiveDocItem[]) => void;
  selectedResident: ResidentRecord | null;
  onSelectResident: (resident: ResidentRecord) => void;
  onAddResident: (data: any) => Promise<void>;
  onSwitchUser: (resident: ResidentRecord) => void;
  onRegisterUser: (name: string, building: any, unit: string) => void;
  onUpdateResident?: (residentId: string, updates: ResidentProfileUpdates) => Promise<void>;
}

export const RosterArchiveViews: React.FC<RosterArchiveViewsProps> = ({
  viewType,
  allowAddResident = true,
  currentUser,
  residents,
  projects,
  archiveDocs,
  onArchivesChange,
  selectedResident,
  onSelectResident,
  onAddResident,
  onSwitchUser,
  onRegisterUser,
  onUpdateResident
}) => {
  const shared = useSharedIdeas();
  const archiveFileInput = useRef<HTMLInputElement>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState('');
  // S25/S26 部屋割り・一覧切り替え
  const [rosterTab, setRosterTab] = useScreenState<'units' | 'list'>(`roster:${currentUser.id}:rosterTab`, 'units', false);
  const [selectedBuilding, setSelectedBuilding] = useScreenState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>(`roster:${currentUser.id}:selectedBuilding`, 'rosemary', false);
  const [selectedFloor, setSelectedFloor] = useScreenState<1 | 2 | 3 | 4>(`roster:${currentUser.id}:selectedFloor`, 3, false);
  const [searchRoster, setSearchRoster] = useScreenState(`roster:${currentUser.id}:searchRoster`, '', false);

  // S27 寮生登録フォーム
  const [isAddingResident, setIsAddingResident] = useScreenState('resident-modal', false);
  const [newResName, setNewResName] = useScreenState(`roster:${currentUser.id}:newResName`, '', false);
  const [newResBuilding, setNewResBuilding] = useScreenState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>(`roster:${currentUser.id}:newResBuilding`, 'rosemary', false);
  const [newResFloor, setNewResFloor] = useScreenState<1 | 2 | 3 | 4>(`roster:${currentUser.id}:newResFloor`, 3, false);
  const [newResUnit, setNewResUnit] = useScreenState(`roster:${currentUser.id}:newResUnit`, '301', false);
  const [newResRole, setNewResRole] = useScreenState(`roster:${currentUser.id}:newResRole`, '一般寮生', false);

  // S30 年度別資料ステート
  const [archiveYear, setArchiveYear] = useState('すべて');
  const [archiveSearch, setArchiveSearch] = useState('');

  // S31/S32 利用者登録ステート
  const [showRegisterUserModal, setShowRegisterUserModal] = useScreenState('register-modal', false);
  const [regName, setRegName] = useState('');
  const [regBuilding, setRegBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');
  const [regUnit, setRegUnit] = useState('105');

  // プロフィール編集ステート
  const [showEditProfileModal, setShowEditProfileModal] = useScreenState('profile-modal', false);
  const [editName, setEditName] = useState('');
  const [editBuilding, setEditBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');
  const [editUnit, setEditUnit] = useState('');
  const [editRole, setEditRole] = useState<ResidentRoleKey>('一般寮生');
  const [editBio, setEditBio] = useState('');

  // プロフィール編集モーダルを開く
  const openEditProfileModal = () => {
    if (!selectedResident) return;
    setEditName(selectedResident.name || '');
    setEditBuilding(selectedResident.building || 'rosemary');
    setEditUnit(selectedResident.unit || '');
    setEditRole((selectedResident.role as ResidentRoleKey) || '一般寮生');
    setEditBio(selectedResident.bio || '');
    setShowEditProfileModal(true);
  };

  // プロフィール保存ハンドラー
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident || !onUpdateResident) return;
    if (!editName.trim()) return;
    await onUpdateResident(selectedResident.id, {
      name: editName.trim(),
      building: editBuilding,
      unit: editUnit.trim() || selectedResident.unit,
      role: editRole,
      bio: editBio.trim()
    });
    setShowEditProfileModal(false);
  };

  // 📸 アバター変更演出ステート 画面背景維持・文字なし演出 
  const [animatingAvatar, setAnimatingAvatar] = useState<{
    active: boolean;
    url: string;
  } | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // 📸 写真ファイル選択＆インパクト演出ハンドラー
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedResident) return;
    try {
      const resizedBase64 = await processAndResizeImage(file);
      playBurnImpactSound();
      setAnimatingAvatar({
        active: true,
        url: resizedBase64
      });

      if (onUpdateResident) {
        await onUpdateResident(selectedResident.id, { avatar: resizedBase64 });
      }

      setTimeout(() => {
        setAnimatingAvatar(null);
      }, 2600);
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
    e.target.value = '';
  };

  // 🏅 役職変更ハンドラー
  const handleRoleChange = async (newRole: ResidentRoleKey) => {
    if (!selectedResident || !onUpdateResident) return;
    await onUpdateResident(selectedResident.id, { role: newRole });
  };

  // ============================================================
  // S24: 備品在庫
  // ============================================================
  if (viewType === 'inventory') return <InventoryView />;

  // ============================================================
  // S30: 年度別資料
  // ============================================================
  if (viewType === 'archives') {
    const docs = shared.enabled ? (archiveDocs ?? []) : (archiveDocs && archiveDocs.length > 0 ? archiveDocs : DEMO_ARCHIVES);
    const years = Array.from(new Set(docs.map((d) => d.year))).sort().reverse();
    const yearOptions = years.length ? years : ['2026年度', '2025年度'];
    const q = archiveSearch.trim().toLowerCase();
    const filtered = docs.filter((doc) => {
      const matchYear = !archiveYear || archiveYear === 'すべて' || doc.year === archiveYear;
      const matchQ = !q || `${doc.title} ${doc.category} ${doc.desc}`.toLowerCase().includes(q);
      return matchYear && matchQ;
    });
    const openArchive = async (doc: ArchiveDocItem) => {
      setArchiveNotice('');
      try {
        const url = await signedTeamnoteUrl(doc.storagePath);
        if (!url) {
          setArchiveNotice(doc.storagePath.startsWith('demo/')
            ? 'デモ資料のため実ファイルはありません。'
            : 'この資料はまだ開けません。');
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        setArchiveNotice('資料を開けませんでした。');
      }
    };
    const uploadArchive = async (file: File) => {
      if (!shared.enabled) { setArchiveNotice('共有ログイン中のみアップロードできます。'); return; }
      setArchiveBusy(true); setArchiveNotice('');
      try {
        const uploaded = await uploadTeamnoteFile(file, 'archives');
        const next = await addTeamnoteArchive({
          title: file.name.replace(/\.[^.]+$/, '') || file.name,
          category: '資料',
          path: uploaded.path,
          sizeBytes: uploaded.size,
        });
        onArchivesChange?.(next);
        setArchiveNotice('資料をアップロードしました。');
      } catch {
        setArchiveNotice('アップロードできませんでした。');
      } finally {
        setArchiveBusy(false);
      }
    };

    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '10px 8px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
            年度別資料
          </h2>
          {shared.enabled && (
            <>
              <button type="button" className="glass-button" disabled={archiveBusy} onClick={() => archiveFileInput.current?.click()}
                style={{ background: 'var(--glass-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700 }}>
                {archiveBusy ? '送信中…' : 'アップロード'}
              </button>
              <input ref={archiveFileInput} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadArchive(f); }} />
            </>
          )}
        </div>
        {archiveNotice && <p style={{ margin: 0, fontSize: 13, color: 'var(--glass-muted)' }}>{archiveNotice}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={archiveYear}
            onChange={(e) => setArchiveYear(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 8, border: "1px solid var(--glass-border)", backgroundColor: "var(--glass-panel)", fontWeight: 700 }}
          >
            <option value="すべて">すべて</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: "var(--glass-panel)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: '10px 14px' }}>
            <Search size={18} color="#596273" />
            <input
              type="text"
              placeholder="資料を検索"
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--glass-muted)', margin: 0 }}>該当する資料はまだありません。</p>
          )}
          {filtered.map((doc) => (
            <div className="glass-panel"
              key={doc.id}
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 15, color: "var(--glass-ink)" }}>{doc.title}</strong>
                <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>{doc.year} {doc.category}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--glass-muted)", margin: 0, lineHeight: 1.5 }}>
                {doc.desc}
              </p>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button className="glass-button"
                  type="button"
                  onClick={() => void openArchive(doc)}
                  style={{
                    backgroundColor: "var(--glass-inset)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  開く
                </button>
                <button className="glass-button"
                  type="button"
                  onClick={() => void openArchive(doc)}
                  style={{
                    backgroundColor: "var(--glass-primary)",
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  ダウンロード
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // S28: プロフィール画面
  // ============================================================
  if (viewType === 'profile' && selectedResident) {
    const isCurrentActiveUser =
      currentUser.id === selectedResident.id || currentUser.name === selectedResident.name;

    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '10px 8px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
            プロフィール
          </h2>
        </div>

        {/* ヘッダー情報 */}
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* 📸 アバター画像 ＆ 飛び出し着地インパクト演出 */}
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: animatingAvatar && animatingAvatar.active ? 80 : 2
              }}
            >
              {/* 虹色回転オーラ ＆ 衝撃波 ＆ スパークル */}
              {animatingAvatar && animatingAvatar.active && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: -12,
                      right: -12,
                      bottom: -12,
                      borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, #ff0055, #ff7700, #ffdd00, #00ff77, #00d4ff, #7a00ff, #ff00c8, #ff0055)',
                      animation: 'rainbowGlowSpin 1.2s linear infinite',
                      filter: 'blur(6px)',
                      zIndex: 1
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '50%',
                      border: '4px solid #ff00cc',
                      animation: 'rainbowShockwave 1s cubic-bezier(0.1, 0.9, 0.2, 1) forwards',
                      zIndex: 0,
                      pointerEvents: 'none'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: -18,
                      right: -18,
                      animation: 'rainbowSparkleBurst 1.2s ease-out forwards',
                      zIndex: 4,
                      fontSize: '32px',
                      pointerEvents: 'none'
                    }}
                  >
                    ✨
                  </div>
                </>
              )}

              {/* クリッカブルアバター本体 */}
              <div
                onClick={() => avatarFileInputRef.current?.click()}
                title="写真フォルダから変更"
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  zIndex: animatingAvatar && animatingAvatar.active ? 85 : 2,
                  transition: 'transform 0.15s ease'
                }}
              >
                <img
                  src={
                    animatingAvatar?.url ||
                    selectedResident.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedResident.name)}`
                  }
                  alt={selectedResident.name}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    border: animatingAvatar && animatingAvatar.active ? '3px solid #ffffff' : '2px solid #ea580c',
                    boxShadow: animatingAvatar && animatingAvatar.active ? '0 0 25px rgba(255, 0, 128, 0.95)' : '0 2px 6px rgba(0,0,0,0.12)',
                    animation: animatingAvatar && animatingAvatar.active ? 'avatarBurnImpact 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none'
                  }}
                />
                {/* カメラアイコン */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: '#ea580c',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 3
                  }}
                >
                  <Camera size={12} />
                </div>
              </div>

              {/* 隠しファイル入力 */}
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFileSelect}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                    {selectedResident.name}
                  </h3>
                  {/* 役職表示: 背景なく文字のみ */}
                  {(() => {
                    const badgeInfo = getRoleBadgeInfo(selectedResident.role);
                    const roleDisplay = badgeInfo.badge || selectedResident.role || '一般寮生';
                    return (
                      <span
                        style={{
                          color: badgeInfo.isLeadership ? '#ea580c' : "var(--glass-muted)",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: '0.02em'
                        }}
                      >
                        {roleDisplay}
                      </span>
                    );
                  })()}
                </div>
                <span style={{ fontSize: 12, color: "var(--glass-muted)", display: 'block', marginTop: 4 }}>
                  {selectedResident.building}棟 {selectedResident.unit}
                </span>
              </div>

              {/* プロフィール編集ボタン */}
              <button className="glass-button"
                type="button"
                onClick={openEditProfileModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: "var(--glass-inset)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--glass-ink)",
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={13} />
                <span>プロフィールを編集</span>
              </button>
            </div>
          </div>

          {/* 自己紹介 */}
          <div style={{ paddingTop: 12, borderTop: '1px solid #F0F2F6' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-muted)", display: 'block', marginBottom: 4 }}>
              自己紹介
            </span>
            {selectedResident.bio ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--glass-ink)", lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedResident.bio}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                自己紹介が未設定です。プロフィールを編集から設定できます。
              </p>
            )}
          </div>

          {/* 役職の変更セレクター */}
          <div style={{ paddingTop: 12, borderTop: '1px solid #F0F2F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-muted)" }}>
                役職の選択:
              </span>
              <select
                value={selectedResident.role || '一般寮生'}
                onChange={(e) => handleRoleChange(e.target.value as ResidentRoleKey)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: "1px solid var(--glass-border)",
                  backgroundColor: "var(--glass-panel)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--glass-ink)"
                }}
              >
                {DORM_ROLES_CONFIG.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>

            {/* アプリ利用者の切り替えボタン */}
            {isCurrentActiveUser ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                ✓ 現在の利用者
              </span>
            ) : (
              <button className="glass-button"
                type="button"
                onClick={() => onSwitchUser(selectedResident)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  backgroundColor: "var(--glass-primary)",
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                この寮生として利用する
              </button>
            )}
          </div>
        </div>

        <section className="glass-panel" aria-labelledby="activity-history-heading" style={{ padding: 20, borderRadius: 16 }}>
          <h4 id="activity-history-heading" style={{ fontSize: 14, marginBottom: 8 }}>活動履歴</h4>
          <p style={{ fontSize: 12, color: 'var(--glass-muted)', marginBottom: 14 }}>スタッフ加入・担当の記録から自動表示</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {getActivityHistory(projects, selectedResident.id).map(item => <article key={item.id} className="activity-history-item" style={{ padding: 14, borderRadius: 12, background: 'var(--glass-inset)' }}>
              <strong style={{ display: 'block', fontSize: 14 }}>{item.projectTitle}</strong>
              <p style={{ fontSize: 12, color: 'var(--glass-muted)', marginTop: 6 }}>{item.role}{item.groupName ? `・${item.groupName}` : ''}</p>
              <p style={{ fontSize: 12, color: 'var(--glass-muted)', marginTop: 4 }}>{item.period} ・ {item.status}</p>
            </article>)}
            {getActivityHistory(projects, selectedResident.id).length === 0 && <p style={{ fontSize: 13, color: 'var(--glass-muted)', padding: '12px 0' }}>スタッフとして参加した企画はまだありません。</p>}
          </div>
        </section>

        {/* 非公開メモ・関係者のみ */}
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-inset)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '16px 20px',
            fontSize: 13,
            color: "var(--glass-muted)"
          }}
        >
          関係者のみ閲覧できます
        </div>

        {/* プロフィール編集モーダル */}
        {showEditProfileModal && (
          <div role="dialog" aria-modal="true" className="app-modal"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(23, 26, 33, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 60
            }}
          >
            <div className="glass-panel"
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                maxWidth: 480,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                  プロフィールを編集
                </h3>
                <button className="glass-button"
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--glass-muted)",
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* アイコン画像 */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    アイコン画像
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={selectedResident.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedResident.name)}`}
                      alt="アバター"
                      style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: "1px solid var(--glass-border)" }}
                    />
                    <button className="glass-button"
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: "1px solid var(--glass-border)",
                        backgroundColor: "var(--glass-inset)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--glass-ink)",
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Camera size={14} />
                      <span>写真を変更</span>
                    </button>
                  </div>
                </div>

                {/* 名前 */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    名前 <span style={{ color: '#B92F3D' }}>必須</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="例: 岡本 直樹"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                  />
                </div>

                {/* 棟と部屋番号 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>棟</label>
                    <select
                      value={editBuilding}
                      onChange={(e) => setEditBuilding(e.target.value as any)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", backgroundColor: "var(--glass-panel)", fontSize: 14 }}
                    >
                      <option value="rosemary">rosemary棟</option>
                      <option value="basil">basil棟</option>
                      <option value="turmeric">turmeric棟</option>
                      <option value="paprika">paprika棟</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>部屋番号</label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="例: Unit 301 - A室"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                    />
                  </div>
                </div>

                {/* 役職 */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>役職</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as ResidentRoleKey)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", backgroundColor: "var(--glass-panel)", fontSize: 14 }}
                  >
                    {DORM_ROLES_CONFIG.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 自己紹介 */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>自己紹介</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={4}
                    placeholder="自身の専門分野、興味関心、寮生活で取り組みたいことなど"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button className="glass-button"
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    キャンセル
                  </button>
                  <button className="glass-button"
                    type="submit"
                    style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                  >
                    保存する
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ============================================================
  // S31: 利用者切替
  // ============================================================
  if (viewType === 'switch_user') {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '10px 8px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
              利用者を切り替える
            </h2>
            <span style={{ backgroundColor: '#FEE2E2', color: '#B92F3D', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
              デモモード
            </span>
          </div>
        </div>

        {/* 現在の利用者 */}
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: '1.5px solid #FF6B68',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: "var(--glass-inset)",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 16
            }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <strong style={{ fontSize: 16, color: "var(--glass-ink)", display: 'block' }}>
              {currentUser.name}
            </strong>
            <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>
              {currentUser.building}棟 {currentUser.unit}
            </span>
          </div>
        </div>

        {/* 寮生一覧から切替 */}
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-muted)", margin: 0 }}>
            別の寮生に切り替える
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {residents.map((r) => (
              <div
                key={r.id}
                onClick={() => onSwitchUser(r)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: r.id === currentUser.id ? '#FFF1F2' : "var(--glass-inset)",
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: "var(--glass-panel)",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {r.name.charAt(0)}
                  </div>
                  <strong style={{ fontSize: 14, color: "var(--glass-ink)" }}>{r.name}</strong>
                </div>
                <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>{r.building}棟 {r.unit}</span>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid #F7F8FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: "var(--glass-muted)" }}>
              本番では本人認証が必要です。
            </span>
            <button className="glass-button"
              type="button"
              onClick={() => setShowRegisterUserModal(true)}
              style={{
                backgroundColor: 'transparent',
                color: '#12BDE8',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              新しい寮生を登録
            </button>
          </div>
        </div>

        {/* S32: 利用者登録モーダル */}
        {showRegisterUserModal && (
          <div role="dialog" aria-modal="true" className="app-modal"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(23, 26, 33, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 60
            }}
          >
            <div className="glass-panel"
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                maxWidth: 480,
                width: '100%',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                  利用者を登録
                </h3>
                <span style={{ backgroundColor: '#FEE2E2', color: '#B92F3D', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                  デモモード
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!regName.trim()) return;
                  onRegisterUser(regName.trim(), regBuilding, regUnit.trim());
                  setShowRegisterUserModal(false);
                  setRegName('');
                  setRegUnit('105');
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    氏名 <span style={{ color: '#B92F3D' }}>必須</span>
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="寮生E"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>所属棟</label>
                    <select
                      value={regBuilding}
                      onChange={(e) => setRegBuilding(e.target.value as any)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", backgroundColor: "var(--glass-panel)", fontSize: 14 }}
                    >
                      <option value="rosemary">ローズマリー</option>
                      <option value="basil">バジル</option>
                      <option value="turmeric">ターメリック</option>
                      <option value="paprika">パプリカ</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>部屋番号</label>
                    <input
                      type="text"
                      value={regUnit}
                      onChange={(e) => setRegUnit(e.target.value)}
                      placeholder="105"
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", fontSize: 14 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>役職</label>
                  <input
                    type="text"
                    value="一般寮生"
                    disabled
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", backgroundColor: "var(--glass-inset)", color: "var(--glass-muted)", fontSize: 14 }}
                  />
                </div>

                <span style={{ fontSize: 11, color: "var(--glass-muted)", display: 'block' }}>
                  本番では認証と所属確認を行います
                </span>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button className="glass-button"
                    type="button"
                    onClick={() => setShowRegisterUserModal(false)}
                    style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                  >
                    キャンセル
                  </button>
                  <button className="glass-button"
                    type="submit"
                    style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                  >
                    登録してはじめる
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // S25/S26/S27: 寮生名簿 部屋割り ＆ 一覧 
  // ============================================================
  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '10px 8px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 上部ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
          寮生名簿
        </h2>
      </div>

      {/* タブ切り替え 部屋割り / 一覧  */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="glass-button"
          type="button"
          onClick={() => setRosterTab('units')}
          style={{
            backgroundColor: rosterTab === 'units' ? "var(--glass-primary)" : "var(--glass-panel)",
            color: rosterTab === 'units' ? '#FFFFFF' : "var(--glass-ink)",
            border: rosterTab === 'units' ? '1px solid #171A21' : "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: '10px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          部屋割り
        </button>
        <button className="glass-button"
          type="button"
          onClick={() => setRosterTab('list')}
          style={{
            backgroundColor: rosterTab === 'list' ? "var(--glass-primary)" : "var(--glass-panel)",
            color: rosterTab === 'list' ? '#FFFFFF' : "var(--glass-ink)",
            border: rosterTab === 'list' ? '1px solid #171A21' : "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: '10px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          一覧
        </button>
      </div>

      {/* 棟と階の選択 (S25) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value as any)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: "1px solid var(--glass-border)",
            backgroundColor: "var(--glass-panel)",
            fontSize: 14,
            fontWeight: 700
          }}
        >
          <option value="rosemary">ローズマリー</option>
          <option value="basil">バジル</option>
          <option value="turmeric">ターメリック</option>
          <option value="paprika">パプリカ</option>
        </select>

        {rosterTab === 'units' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {([1, 2, 3, 4] as const).map((fl) => {
              const active = selectedFloor === fl;
              return (
                <button className="glass-button"
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(fl)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: active ? "var(--glass-primary)" : "var(--glass-panel)",
                    color: active ? '#FFFFFF' : "var(--glass-ink)",
                    border: "1px solid var(--glass-border)",
                    minHeight: 38
                  }}
                >
                  {fl}F
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* S25: 部屋割りマップ 単一フロアの4ユニットカード表示  */}
      {rosterTab === 'units' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['1', '2', '3', '4'].map((idx) => {
            const unitNumber = `${selectedFloor}0${idx}`;
            const occupants = residents.filter(
              (r) => r.building === selectedBuilding && parseUnitNumber(r.unit) === unitNumber
            );
            const capacity = selectedFloor === 1 && (unitNumber === '103' || unitNumber === '104') ? 1 : 5;

            return (
              <div className="glass-panel"
                key={unitNumber}
                style={{
                  backgroundColor: "var(--glass-panel)",
                  borderRadius: 12,
                  border: "1px solid var(--glass-border)",
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 16, color: "var(--glass-ink)" }}>{unitNumber}</strong>
                  <span style={{ fontSize: 12, color: "var(--glass-muted)", fontWeight: 600 }}>
                    {occupants.length} / {capacity}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
                  {occupants.map((occ) => {
                    const occRole = getRoleBadgeInfo(occ.role);
                    return (
                      <div
                        key={occ.id}
                        onClick={() => onSelectResident(occ)}
                        style={{
                          padding: '5px 7px',
                          borderRadius: 6,
                          backgroundColor: "var(--glass-inset)",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--glass-ink)",
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                          {/* 各名前の左端にそれぞれのアイコン */}
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              backgroundColor: '#E2E8F0',
                              flexShrink: 0,
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: "1px solid var(--glass-border)"
                            }}
                          >
                            {occ.avatar ? (
                              <img
                                src={occ.avatar}
                                alt={occ.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--glass-muted)" }}>
                                {occ.name ? occ.name.charAt(0) : '寮'}
                              </span>
                            )}
                          </div>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {occ.name}
                          </span>
                        </div>
                        {/* 役職表示: 背景なく文字のみ */}
                        {occRole.isLeadership && (
                          <span
                            style={{
                              color: '#ea580c',
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              flexShrink: 0
                            }}
                          >
                            {occRole.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* S26: 寮生一覧 */}
      {rosterTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: "var(--glass-panel)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: '10px 14px' }}>
            <Search size={18} color="#596273" />
            <input
              type="text"
              placeholder="氏名・部屋で検索"
              value={searchRoster}
              onChange={(e) => setSearchRoster(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {residents
              .filter((r) => r.building === selectedBuilding)
              .map((r) => {
                const roleInfo = getRoleBadgeInfo(r.role);
                return (
                  <div className="glass-panel"
                    key={r.id}
                    onClick={() => onSelectResident(r)}
                    style={{
                      backgroundColor: "var(--glass-panel)",
                      borderRadius: 10,
                      border: "1px solid var(--glass-border)",
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {r.avatar ? (
                        <img
                          src={r.avatar}
                          alt={r.name}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: "var(--glass-inset)",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            color: "var(--glass-ink)"
                          }}
                        >
                          {r.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: 14, color: "var(--glass-ink)" }}>
                            {r.name}
                          </strong>
                          {/* 役職表示: 背景なく文字のみ */}
                          {roleInfo.isLeadership && (
                            <span
                              style={{
                                color: '#ea580c',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                flexShrink: 0
                              }}
                            >
                              {roleInfo.badge}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>
                          {r.building}棟 {r.unit}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="#596273" />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 寮生を追加するボタン (S27モーダル起動) */}
      <div style={{ paddingTop: 10 }}>
        <button className="glass-button"
          type="button"
          hidden={!allowAddResident}
          onClick={() => setIsAddingResident(true)}
          style={{
            width: '100%',
            backgroundColor: "var(--glass-primary)",
            color: '#FFFFFF',
            padding: '14px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            display: allowAddResident ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Plus size={16} />
          <span>寮生を追加</span>
        </button>
      </div>

      {/* S27: 寮生登録モーダル */}
      {isAddingResident && (
        <div role="dialog" aria-modal="true" className="app-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(23, 26, 33, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 60
          }}
        >
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              borderRadius: 12,
              border: "1px solid var(--glass-border)",
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
              寮生を追加
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newResName.trim()) return;
                await onAddResident({
                  name: newResName.trim(),
                  building: newResBuilding,
                  floor: newResFloor,
                  unit: newResUnit,
                  role: newResRole
                });
                setIsAddingResident(false);
                setNewResName('');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  氏名 <span style={{ color: '#B92F3D' }}>必須</span>
                </label>
                <input
                  type="text"
                  value={newResName}
                  onChange={(e) => setNewResName(e.target.value)}
                  placeholder="寮生D"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    所属棟
                  </label>
                  <select
                    value={newResBuilding}
                    onChange={(e) => setNewResBuilding(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  >
                    <option value="rosemary">ローズマリー</option>
                    <option value="basil">バジル</option>
                    <option value="turmeric">ターメリック</option>
                    <option value="paprika">パプリカ</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    階
                  </label>
                  <select
                    value={newResFloor}
                    onChange={(e) => setNewResFloor(Number(e.target.value) as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  >
                    <option value={1}>1F</option>
                    <option value={2}>2F</option>
                    <option value={3}>3F</option>
                    <option value={4}>4F</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  ユニット
                </label>
                <input
                  type="text"
                  value={newResUnit}
                  onChange={(e) => setNewResUnit(e.target.value)}
                  placeholder="301"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  役職
                </label>
                <select
                  value={newResRole}
                  onChange={(e) => setNewResRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", backgroundColor: "var(--glass-panel)", fontSize: 14 }}
                >
                  {DORM_ROLES_CONFIG.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="glass-button"
                  type="button"
                  onClick={() => setIsAddingResident(false)}
                  style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button className="glass-button"
                  type="submit"
                  style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                >
                  名簿に追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

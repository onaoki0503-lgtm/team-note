import React, { useState, useRef } from 'react';
import { Search, Plus, Users, UserPlus, ArrowLeft, ChevronRight, Download, Eye, Award, Camera } from 'lucide-react';
import {
  BUILDING_FLOORS_CONFIG,
  parseUnitNumber,
  getUnitCapacity,
  getUnitRoomType,
  type ResidentRecord,
  type CurrentUser,
  type ResidentRoleKey,
  DORM_ROLES_CONFIG,
  getRoleBadgeInfo
} from '../lib/db';
import { processAndResizeImage, playBurnImpactSound } from '../utils/avatarEffect';

interface RosterArchiveViewsProps {
  viewType: 'roster' | 'inventory' | 'archives' | 'profile' | 'switch_user' | 'register_user';
  currentUser: CurrentUser;
  residents: ResidentRecord[];
  selectedResident: ResidentRecord | null;
  onSelectResident: (resident: ResidentRecord) => void;
  onBackToPortal: () => void;
  onAddResident: (data: any) => Promise<void>;
  onSwitchUser: (resident: ResidentRecord) => void;
  onRegisterUser: (name: string, building: any, unit: string) => void;
  onUpdateResident?: (residentId: string, updates: Partial<ResidentRecord>) => Promise<void>;
}

export const RosterArchiveViews: React.FC<RosterArchiveViewsProps> = ({
  viewType,
  currentUser,
  residents,
  selectedResident,
  onSelectResident,
  onBackToPortal,
  onAddResident,
  onSwitchUser,
  onRegisterUser,
  onUpdateResident
}) => {
  // S25/S26 部屋割り・一覧切り替え
  const [rosterTab, setRosterTab] = useState<'units' | 'list'>('units');
  const [selectedBuilding, setSelectedBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');
  const [selectedFloor, setSelectedFloor] = useState<1 | 2 | 3 | 4>(3);
  const [searchRoster, setSearchRoster] = useState('');

  // S27 寮生登録フォーム
  const [isAddingResident, setIsAddingResident] = useState(false);
  const [newResName, setNewResName] = useState('');
  const [newResBuilding, setNewResBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');
  const [newResFloor, setNewResFloor] = useState<1 | 2 | 3 | 4>(3);
  const [newResUnit, setNewResUnit] = useState('301');
  const [newResRole, setNewResRole] = useState('一般寮生');

  // S24 備品在庫ステート
  const [invSearch, setInvSearch] = useState('');
  const [invFilter, setInvFilter] = useState<'all' | 'needs_check'>('all');

  // S30 年度別資料ステート
  const [archiveYear, setArchiveYear] = useState('2026年度');
  const [archiveSearch, setArchiveSearch] = useState('');

  // S31/S32 利用者登録ステート
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBuilding, setNewAccountBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');
  const [newAccountUnit, setNewAccountUnit] = useState('105');

  // 📸 アバター変更演出ステート（画面背景維持・文字なし演出）
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
  if (viewType === 'inventory') {
    const inventoryItems = [
      { id: '1', name: 'ペーパータオル', count: '24巻', location: '倉庫A', status: '十分', date: '2026/06/10 寮生A' },
      { id: '2', name: 'ヘッドホン', count: '30台', location: '倉庫A', status: '整備中', date: '2026/06/08 寮生A' }
    ];

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBackToPortal}
            style={{
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#171A21'
            }}
          >
            <ArrowLeft size={16} />
            <span>保管する</span>
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
            備品在庫
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', border: '1px solid #D9DEE7', borderRadius: 8, padding: '10px 14px' }}>
          <Search size={18} color="#596273" />
          <input
            type="text"
            placeholder="備品を検索"
            value={invSearch}
            onChange={(e) => setInvSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setInvFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: invFilter === 'all' ? 800 : 600,
              backgroundColor: invFilter === 'all' ? '#171A21' : '#FFFFFF',
              color: invFilter === 'all' ? '#FFFFFF' : '#596273',
              border: '1px solid #D9DEE7'
            }}
          >
            すべて
          </button>
          <button
            type="button"
            onClick={() => setInvFilter('needs_check')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: invFilter === 'needs_check' ? 800 : 600,
              backgroundColor: invFilter === 'needs_check' ? '#171A21' : '#FFFFFF',
              color: invFilter === 'needs_check' ? '#FFFFFF' : '#596273',
              border: '1px solid #D9DEE7'
            }}
          >
            要確認
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inventoryItems.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #D9DEE7',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 15, color: '#171A21' }}>{item.name}</strong>
                  <span style={{ backgroundColor: item.status === '十分' ? '#F7F8FA' : '#FFF7ED', color: '#171A21', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                    {item.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#596273', display: 'flex', gap: 12 }}>
                  <span>数量 {item.count}</span>
                  <span>保管場所 {item.location}</span>
                </div>
                <span style={{ fontSize: 11, color: '#596273', display: 'block', marginTop: 4 }}>
                  最終更新 {item.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // S30: 年度別資料
  // ============================================================
  if (viewType === 'archives') {
    const archiveDocs = [
      { id: '1', title: '交流イベント企画書.pdf', year: '2026年度', type: '企画書', desc: '交流イベントの実施内容や改善点をまとめた資料です。' },
      { id: '2', title: '中庭イベントの振り返り', year: '2026年度', type: '議事録', desc: '中庭での映画上映イベントの実施内容や改善点をまとめた資料です。' }
    ];

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBackToPortal}
            style={{
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#171A21'
            }}
          >
            <ArrowLeft size={16} />
            <span>保管する</span>
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
            年度別資料
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={archiveYear}
            onChange={(e) => setArchiveYear(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #D9DEE7', backgroundColor: '#FFFFFF', fontWeight: 700 }}
          >
            <option value="2026年度">2026年度</option>
            <option value="2025年度">2025年度</option>
          </select>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', border: '1px solid #D9DEE7', borderRadius: 8, padding: '10px 14px' }}>
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
          {archiveDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #D9DEE7',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 15, color: '#171A21' }}>{doc.title}</strong>
                <span style={{ fontSize: 12, color: '#596273' }}>{doc.year} {doc.type}</span>
              </div>
              <p style={{ fontSize: 13, color: '#596273', margin: 0, lineHeight: 1.5 }}>
                {doc.desc}
              </p>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: '#F7F8FA',
                    border: '1px solid #D9DEE7',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  開く
                </button>
                <button
                  type="button"
                  style={{
                    backgroundColor: '#B92F3D',
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
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBackToPortal}
            style={{
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#171A21'
            }}
          >
            <ArrowLeft size={16} />
            <span>名簿に戻る</span>
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
            プロフィール
          </h2>
        </div>

        {/* ヘッダー情報 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
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

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#171A21', margin: 0 }}>
                  {selectedResident.name}
                </h3>
                {/* 役職表示: 背景なく文字のみ */}
                {(() => {
                  const badgeInfo = getRoleBadgeInfo(selectedResident.role);
                  const roleDisplay = badgeInfo.badge || selectedResident.role || '一般寮生';
                  return (
                    <span
                      style={{
                        color: badgeInfo.isLeadership ? '#ea580c' : '#596273',
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: '0.02em'
                      }}
                    >
                      {roleDisplay}
                    </span>
                  );
                })()}
              </div>
              <span style={{ fontSize: 12, color: '#596273', display: 'block', marginTop: 4 }}>
                {selectedResident.building}棟 {selectedResident.unit}
              </span>
            </div>
          </div>

          {/* 役職の変更セレクター */}
          <div style={{ paddingTop: 14, borderTop: '1px solid #F0F2F6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#596273' }}>
              役職の選択:
            </span>
            <select
              value={selectedResident.role || '一般寮生'}
              onChange={(e) => handleRoleChange(e.target.value as ResidentRoleKey)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #D9DEE7',
                backgroundColor: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                color: '#171A21'
              }}
            >
              {DORM_ROLES_CONFIG.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 活動履歴セクション */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171A21', margin: 0 }}>
              活動履歴
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(selectedResident.projectHistory && selectedResident.projectHistory.length > 0
              ? selectedResident.projectHistory
              : [
                  { id: 'h1', projectTitle: '中庭シネマ', role: '企画・運営', period: '2026.10' },
                  { id: 'h2', projectTitle: 'ウェルカムパーティー', role: '運営', period: '2026.04' }
                ]
            ).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #F7F8FA'
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, color: '#171A21', display: 'block' }}>
                    {item.projectTitle}
                  </strong>
                  <span style={{ fontSize: 12, color: '#596273' }}>{item.role}</span>
                </div>
                <span style={{ fontSize: 12, color: '#596273' }}>{item.period}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 非公開メモ・関係者のみ */}
        <div
          style={{
            backgroundColor: '#F7F8FA',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '16px 20px',
            fontSize: 13,
            color: '#596273'
          }}
        >
          関係者のみ閲覧できます
        </div>
      </div>
    );
  }

  // ============================================================
  // S31: 利用者切替
  // ============================================================
  if (viewType === 'switch_user') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBackToPortal}
            style={{
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#171A21'
            }}
          >
            <ArrowLeft size={16} />
            <span>戻る</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
              利用者を切り替える
            </h2>
            <span style={{ backgroundColor: '#FEE2E2', color: '#B92F3D', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
              デモモード
            </span>
          </div>
        </div>

        {/* 現在の利用者 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
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
              backgroundColor: '#EEF0F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16
            }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <strong style={{ fontSize: 16, color: '#171A21', display: 'block' }}>
              {currentUser.name}
            </strong>
            <span style={{ fontSize: 12, color: '#596273' }}>
              {currentUser.building}棟 {currentUser.unit}
            </span>
          </div>
        </div>

        {/* 寮生一覧から切替 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #D9DEE7',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#596273', margin: 0 }}>
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
                  backgroundColor: r.id === currentUser.id ? '#FFF1F2' : '#F7F8FA',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800
                    }}
                  >
                    {r.name.charAt(0)}
                  </div>
                  <strong style={{ fontSize: 14, color: '#171A21' }}>{r.name}</strong>
                </div>
                <span style={{ fontSize: 12, color: '#596273' }}>{r.building}棟 {r.unit}</span>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid #F7F8FA' }}>
            <span style={{ fontSize: 11, color: '#596273' }}>
              本番では本人認証が必要です。
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // S25/S26/S27: 寮生名簿（部屋割り ＆ 一覧）
  // ============================================================
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 上部ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onBackToPortal}
          style={{
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 700,
            color: '#171A21'
          }}
        >
          <ArrowLeft size={16} />
          <span>保管する</span>
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171A21', margin: 0 }}>
          寮生名簿
        </h2>
      </div>

      {/* タブ切り替え（部屋割り / 一覧） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          type="button"
          onClick={() => setRosterTab('units')}
          style={{
            backgroundColor: rosterTab === 'units' ? '#171A21' : '#FFFFFF',
            color: rosterTab === 'units' ? '#FFFFFF' : '#171A21',
            border: rosterTab === 'units' ? '1px solid #171A21' : '1px solid #D9DEE7',
            borderRadius: 8,
            padding: '12px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          部屋割り
        </button>
        <button
          type="button"
          onClick={() => setRosterTab('list')}
          style={{
            backgroundColor: rosterTab === 'list' ? '#171A21' : '#FFFFFF',
            color: rosterTab === 'list' ? '#FFFFFF' : '#171A21',
            border: rosterTab === 'list' ? '1px solid #171A21' : '1px solid #D9DEE7',
            borderRadius: 8,
            padding: '12px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          一覧
        </button>
      </div>

      {/* 棟と階の選択 (S25) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value as any)}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #D9DEE7',
            backgroundColor: '#FFFFFF',
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
          <div style={{ display: 'flex', gap: 6 }}>
            {([1, 2, 3, 4] as const).map((fl) => {
              const active = selectedFloor === fl;
              return (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(fl)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: active ? '#171A21' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#171A21',
                    border: '1px solid #D9DEE7',
                    minHeight: 40
                  }}
                >
                  {fl}F
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* S25: 部屋割りマップ（単一フロアの4ユニットカード表示） */}
      {rosterTab === 'units' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {['1', '2', '3', '4'].map((idx) => {
            const unitNumber = `${selectedFloor}0${idx}`;
            const occupants = residents.filter(
              (r) => r.building === selectedBuilding && parseUnitNumber(r.unit) === unitNumber
            );
            const capacity = selectedFloor === 1 && (unitNumber === '103' || unitNumber === '104') ? 1 : 5;

            return (
              <div
                key={unitNumber}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #D9DEE7',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 16, color: '#171A21' }}>{unitNumber}</strong>
                  <span style={{ fontSize: 12, color: '#596273', fontWeight: 600 }}>
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
                          padding: '6px 8px',
                          borderRadius: 6,
                          backgroundColor: '#F7F8FA',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#171A21',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}
                      >
                        <span>{occ.name}</span>
                        {/* 役職表示: 背景なく文字のみ */}
                        {occRole.isLeadership && (
                          <span
                            style={{
                              color: '#ea580c',
                              fontSize: 11,
                              fontWeight: 800,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', border: '1px solid #D9DEE7', borderRadius: 8, padding: '10px 14px' }}>
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
                  <div
                    key={r.id}
                    onClick={() => onSelectResident(r)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 10,
                      border: '1px solid #D9DEE7',
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
                            backgroundColor: '#EEF0F5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                            color: '#171A21'
                          }}
                        >
                          {r.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: 14, color: '#171A21' }}>
                            {r.name}
                          </strong>
                          {/* 役職表示: 背景なく文字のみ */}
                          {roleInfo.isLeadership && (
                            <span
                              style={{
                                color: '#ea580c',
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: '0.02em',
                                flexShrink: 0
                              }}
                            >
                              {roleInfo.badge}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: '#596273' }}>
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
        <button
          type="button"
          onClick={() => setIsAddingResident(true)}
          style={{
            width: '100%',
            backgroundColor: '#B92F3D',
            color: '#FFFFFF',
            padding: '14px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
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
        <div
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
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #D9DEE7',
              maxWidth: 480,
              width: '100%',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171A21', margin: 0 }}>
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
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
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
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
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
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
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  役職
                </label>
                <select
                  value={newResRole}
                  onChange={(e) => setNewResRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D9DEE7', backgroundColor: '#FFFFFF', fontSize: 14 }}
                >
                  {DORM_ROLES_CONFIG.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddingResident(false)}
                  style={{ backgroundColor: '#F7F8FA', border: '1px solid #D9DEE7', padding: '10px 16px', borderRadius: 8 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#B92F3D', color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
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

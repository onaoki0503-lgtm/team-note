import { useState } from 'react';
import { ScanFace, Sparkles, Info, Trash2 } from 'lucide-react';
import { community } from '../lib/community';
import { teamnoteReviewMode, teamnoteCloudEnabled } from '../lib/teamnoteCloud';
import {
  faceDetectionSupported,
  readFaceEnrollment,
  setFaceLoginEnabled,
  writeFaceEnrollment,
  type FaceEnrollment,
} from '../lib/faceLogin';
import type { CurrentUser } from '../lib/db';
import { FaceCapture } from './FaceCapture';

interface SettingsViewProps {
  currentUser: CurrentUser;
  motionPaused: boolean;
  onMotionPausedChange: (paused: boolean) => void;
}

export function SettingsView({ currentUser, motionPaused, onMotionPausedChange }: SettingsViewProps) {
  const [enrollment, setEnrollment] = useState<FaceEnrollment | null>(() => readFaceEnrollment());
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const mine = enrollment?.userId === currentUser.id ? enrollment : null;
  const detectionOk = faceDetectionSupported();

  const saveEnrollment = async (descriptor: string) => {
    const next: FaceEnrollment = {
      version: 1,
      enabled: true,
      userId: currentUser.id,
      email: currentUser.email || '',
      displayName: currentUser.name,
      descriptor,
      enrolledAt: new Date().toISOString(),
    };
    writeFaceEnrollment(next);
    setEnrollment(next);
    setCapturing(false);
    setError('');
    setNotice('顔認証を登録しました。ログイン画面で使えます。');
  };

  const removeEnrollment = () => {
    writeFaceEnrollment(null);
    setEnrollment(null);
    setNotice('顔認証の登録を削除しました。');
    setError('');
  };

  const toggleEnabled = (enabled: boolean) => {
    if (!mine) return;
    const next = setFaceLoginEnabled(enabled);
    setEnrollment(next);
    setNotice(enabled ? '顔認証ログインをオンにしました。' : '顔認証ログインをオフにしました。');
  };

  return (
    <div className="settings-view screen-enter">
      <h1 className="settings-title">設定</h1>
      <p className="settings-lead">この端末の表示とログイン補助を管理します。</p>

      <section className="glass-panel settings-section" aria-labelledby="settings-face-heading">
        <div className="settings-section-head">
          <span className="settings-section-icon" aria-hidden="true"><ScanFace size={20} /></span>
          <div>
            <h2 id="settings-face-heading">ログイン用の顔認証</h2>
            <p>カメラで顔を登録し、ログイン時の本人確認に使います。パスワードの代わりにはなりません。</p>
          </div>
        </div>

        {!navigator.mediaDevices?.getUserMedia ? (
          <p className="settings-muted">このブラウザではカメラを使えません。</p>
        ) : (
          <>
            {!detectionOk && (
              <p className="settings-muted">このブラウザは顔検出API未対応のため、中央の枠で撮影した画像を照合します。</p>
            )}
            {mine ? (
              <div className="settings-face-status">
                <div className="settings-face-preview">
                  <img src={mine.descriptor} alt="" />
                  <div>
                    <strong>{mine.displayName}</strong>
                    <span>登録日 {new Date(mine.enrolledAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={mine.enabled}
                    onChange={event => toggleEnabled(event.target.checked)}
                  />
                  <span>顔認証でログインを使う</span>
                </label>
                <div className="settings-row-actions">
                  <button type="button" className="glass-secondary" onClick={() => { setCapturing(true); setNotice(''); setError(''); }}>
                    撮り直す
                  </button>
                  <button type="button" className="glass-secondary settings-danger" onClick={removeEnrollment}>
                    <Trash2 size={16} />
                    登録を削除
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="glass-primary settings-primary-action"
                onClick={() => { setCapturing(true); setNotice(''); setError(''); }}
              >
                <ScanFace size={18} />
                顔認証を追加
              </button>
            )}
            {enrollment && enrollment.userId !== currentUser.id && (
              <p className="settings-muted">別の利用者の顔がこの端末に残っています。削除するか、撮り直してください。</p>
            )}
          </>
        )}
      </section>

      <section className="glass-panel settings-section" aria-labelledby="settings-display-heading">
        <div className="settings-section-head">
          <span className="settings-section-icon" aria-hidden="true"><Sparkles size={20} /></span>
          <div>
            <h2 id="settings-display-heading">表示</h2>
            <p>背景や吹き出しの動きを止められます。OSの減動設定も引き続き尊重します。</p>
          </div>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={motionPaused}
            onChange={event => onMotionPausedChange(event.target.checked)}
          />
          <span>アニメーションを停止する</span>
        </label>
      </section>

      <section className="glass-panel settings-section" aria-labelledby="settings-info-heading">
        <div className="settings-section-head">
          <span className="settings-section-icon" aria-hidden="true"><Info size={20} /></span>
          <div>
            <h2 id="settings-info-heading">このアプリ</h2>
            <p>接続と端末の状態です。</p>
          </div>
        </div>
        <dl className="settings-meta">
          <div><dt>コミュニティ</dt><dd>{community.name}</dd></div>
          <div><dt>ログイン中</dt><dd>{currentUser.name}</dd></div>
          <div><dt>データ</dt><dd>{teamnoteReviewMode ? '操作デモ（この端末のみ）' : teamnoteCloudEnabled ? '共有クラウド' : 'この端末のみ'}</dd></div>
        </dl>
      </section>

      {notice && <p className="settings-notice" role="status">{notice}</p>}
      {error && <p className="settings-error" role="alert">{error}</p>}

      {capturing && (
        <FaceCapture
          title="顔を登録"
          confirmLabel="この顔で登録"
          onCancel={() => setCapturing(false)}
          onCapture={saveEnrollment}
        />
      )}
    </div>
  );
}

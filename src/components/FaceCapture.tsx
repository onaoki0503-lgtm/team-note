import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { captureFaceDescriptor, detectLargestFace, faceDetectionSupported } from '../lib/faceLogin';

interface FaceCaptureProps {
  title: string;
  confirmLabel: string;
  onCapture: (descriptor: string) => void | Promise<void>;
  onCancel: () => void;
}

export function FaceCapture({ title, confirmLabel, onCapture, onCancel }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [faceHint, setFaceHint] = useState(faceDetectionSupported() ? '枠に顔を合わせてください' : '正面をカメラに向けて撮影してください');

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) setError('カメラを開けませんでした。ブラウザの許可を確認してください。');
      }
    };
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !faceDetectionSupported()) return;
    let alive = true;
    const tick = async () => {
      const video = videoRef.current;
      if (!alive || !video || video.readyState < 2) return;
      try {
        const face = await detectLargestFace(video);
        if (!alive) return;
        setFaceHint(face ? '顔を検出しました' : '枠に顔を合わせてください');
      } catch {
        /* Keep last hint. */
      }
    };
    const timer = window.setInterval(() => { void tick(); }, 700);
    return () => { alive = false; clearInterval(timer); };
  }, [ready]);

  const confirm = async () => {
    if (busy || !videoRef.current) return;
    setBusy(true);
    setError('');
    try {
      const descriptor = await captureFaceDescriptor(videoRef.current);
      await onCapture(descriptor);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'face_not_found') setError('顔を検出できませんでした。位置を合わせてもう一度。');
      else if (code === 'face_too_small') setError('もう少しカメラに近づいてください。');
      else setError('撮影できませんでした。もう一度お試しください。');
      setBusy(false);
    }
  };

  return (
    <div className="face-capture" role="dialog" aria-modal="true" aria-labelledby="face-capture-title">
      <div className="face-capture-card glass-panel">
        <div className="face-capture-heading">
          <h2 id="face-capture-title">{title}</h2>
          <button type="button" className="glass-icon-button" aria-label="閉じる" onClick={onCancel} disabled={busy}>
            <X size={20} />
          </button>
        </div>
        <div className="face-capture-stage">
          <video ref={videoRef} playsInline muted autoPlay aria-label="カメラ映像" />
          <div className="face-capture-guide" aria-hidden="true" />
        </div>
        <p className="face-capture-hint" role="status">{faceHint}</p>
        {error && <p className="face-capture-error" role="alert">{error}</p>}
        <div className="face-capture-actions">
          <button type="button" className="glass-secondary" onClick={onCancel} disabled={busy}>キャンセル</button>
          <button type="button" className="glass-primary" onClick={() => { void confirm(); }} disabled={!ready || busy}>
            <Camera size={18} />
            {busy ? '確認中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

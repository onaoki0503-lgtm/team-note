import { useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { useSpeechInput } from '../lib/useSpeechInput';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  placeholder: string;
}
export function VoiceWorkReport({ value, onChange, onBusyChange, placeholder }: Props) {
  const speech = useSpeechInput();
  useEffect(() => { onBusyChange(speech.busy); return () => onBusyChange(false); }, [speech.busy, onBusyChange]);
  return <div className="report-body-input">
    <div className="report-voice-toolbar">
      <p>いつ・どこで・何をした・結果・申し送り</p>
      <button type="button" className={`glass-button report-dictate ${speech.busy ? 'is-recording' : ''}`}
        aria-label={speech.busy ? '音声入力を止める' : '報告内容を音声入力'} aria-pressed={speech.busy}
        disabled={!speech.supported || speech.status === 'stopping'}
        onClick={() => speech.busy ? speech.stop() : speech.start(value, onChange)}>
        {speech.busy ? <Square size={17} /> : <Mic size={18} />}
        {speech.status === 'starting' ? 'マイクの許可待ち' : speech.status === 'stopping' ? '反映中' : speech.busy ? '音声入力を止める' : '音声入力'}
      </button>
    </div>
    <textarea aria-label="報告の実施内容と結果" value={value} onChange={event => onChange(event.target.value)} disabled={speech.busy}
      placeholder={placeholder} rows={6} required style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--glass-border)', fontSize: 14, lineHeight: 1.7, resize: 'vertical' }} />
    <div role="status" aria-live="polite" className="report-dictation-status">{speech.interim || (speech.busy ? '聞いています。確定した文字を入力内容の続きに追加します。' : '')}</div>
    {speech.error && <p className="voice-error" role="alert">{speech.error}</p>}
    {!speech.supported && <p className="voice-fallback">このブラウザでは音声入力ボタンを使えません。文字入力かキーボードのマイクをお使いください。</p>}
    <p className="voice-privacy">音声はブラウザの音声認識サービスで処理される場合があります。原音は保存しません。</p>
  </div>;
}

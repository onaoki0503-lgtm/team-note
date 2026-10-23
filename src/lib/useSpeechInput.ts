import { useEffect, useRef, useState } from 'react';

interface SpeechResult { isFinal: boolean; 0: { transcript: string }; }
interface SpeechEvent { resultIndex: number; results: { length: number; [index: number]: SpeechResult }; }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const getEngine = () => { const browser = window as SpeechWindow; return browser.SpeechRecognition || browser.webkitSpeechRecognition; };

export function useSpeechInput() {
  const [supported] = useState(() => !!getEngine() && window.isSecureContext);
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const active = useRef<Recognition | null>(null);
  const busy = status !== 'idle';
  useEffect(() => {
    const release = () => {
      const engine = active.current;
      if (!engine) return;
      active.current = null;
      engine.onstart = engine.onend = engine.onresult = engine.onerror = null;
      engine.abort();
    };
    const hide = () => { if (document.hidden) { release(); setStatus('idle'); setInterim(''); } };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); release(); };
  }, []);
  const start = (existing: string, onText: (text: string) => void, onComplete?: (text: string) => void) => {
    if (active.current) return;
    const Engine = getEngine();
    if (!Engine || !supported) { setError('このブラウザでは音声入力を使えません。入力欄とキーボードのマイクをお使いください。'); return; }
    const engine = new Engine();
    active.current = engine;
    engine.lang = 'ja-JP'; engine.continuous = true; engine.interimResults = true;
    setError(''); setInterim(''); setStatus('starting');
    let heard = false;
    let latestText = existing;
    const valid = () => active.current === engine;
    engine.onstart = () => { if (valid()) setStatus('listening'); };
    engine.onresult = event => {
      if (!valid()) return;
      const finals: string[] = []; const pending: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        (result.isFinal ? finals : pending).push(result[0].transcript);
      }
      const committed = finals.join(' ').trim();
      if (committed) { heard = true; latestText = [existing.trim(), committed].filter(Boolean).join(' '); onText(latestText); }
      setInterim(pending.join(' '));
    };
    engine.onerror = event => {
      if (!valid()) return;
      const messages: Record<string, string> = {
        'not-allowed': 'マイクの利用が許可されていません。ブラウザのマイク設定を確認するか、下の欄へ入力してください。',
        'service-not-allowed': 'このブラウザでは音声認識サービスを利用できません。キーボードのマイクから入力できます。',
        'audio-capture': 'マイクが見つかりません。接続を確認してください。',
        network: '音声認識に接続できませんでした。聞き取れた内容は残しています。再度試すか、文字で続きを入力してください。',
        'no-speech': '声を聞き取れませんでした。マイクに近づいて、もう一度話してください。'
      };
      if (event.error !== 'aborted') setError(messages[event.error] || '音声入力が止まりました。聞き取れた内容を確認してください。');
      active.current = null; engine.onresult = null; engine.abort();
      setStatus('idle'); setInterim('');
    };
    engine.onend = () => {
      if (!valid()) return;
      active.current = null; setStatus('idle'); setInterim('');
      if (!heard) setError(previous => previous || 'まだ声を聞き取れていません。もう一度話すか、下の欄へ入力してください。');
      else onComplete?.(latestText);
    };
    try { engine.start(); } catch { active.current = null; setStatus('idle'); setError('音声入力を開始できませんでした。もう一度試すか、文字で入力してください。'); }
  };
  const stop = () => { if (active.current) { setStatus('stopping'); try { active.current.stop(); } catch { const engine = active.current; active.current = null; engine?.abort(); setStatus('idle'); setInterim(''); setError('音声入力を終了できませんでした。聞き取れた内容は残しています。'); } } };
  return { supported, busy, status, interim, error, start, stop };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { community } from './community';
import { type IdeaItem } from './ideaBoard';

const storageKey = community.ideas.storageKey;
function readIdeas(): IdeaItem[] | null {
  const saved = localStorage.getItem(storageKey);
  if (saved === null) return null;
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || typeof item.text !== 'string' || typeof item.likes !== 'number' || !Number.isFinite(item.likes) || (item.likedUserIds !== undefined && (!Array.isArray(item.likedUserIds) || item.likedUserIds.some((id: unknown) => typeof id !== 'string'))))) throw new Error('invalid idea board');
  return parsed.filter(item => item.text.trim().length >= 4 && !/^(.)\1+$/.test(item.text.trim()) && item.text.replace(/[\s.,!?;:・…~〜！？。、]/g, '').length >= 3).map(item => ({ ...item, isNew: false }));
}

// This transport synchronises tabs on the same origin only. It is not a shared cloud database.
export function useIdeaBoardSync(initialIdeas: IdeaItem[], enabled = true) {
  const [ideas, setIdeas] = useState<IdeaItem[]>(() => { if (!enabled) return []; try { return (readIdeas() ?? initialIdeas); } catch { return initialIdeas; } });
  const latest = useRef(ideas);
  const active = useRef(true);
  const [error, setError] = useState('');
  const show = useCallback((next: IdeaItem[]) => {
    if (!active.current) return;
    if (JSON.stringify(latest.current) !== JSON.stringify(next)) { latest.current = next; setIdeas(next); }
  }, []);
  const update = useCallback(async (change: (current: IdeaItem[]) => IdeaItem[]): Promise<boolean> => {
    if (!enabled) return false;
    const commit = () => {
      if (!active.current) return false;
      // Read inside the lock: another tab's post/like/delete must not be overwritten by an old React state.
      const current = readIdeas() ?? latest.current;
      const next = change(current);
      const saved = JSON.stringify(next.map(idea => ({ ...idea, isNew: false })));
      if (localStorage.getItem(storageKey) !== saved) localStorage.setItem(storageKey, saved);
      show(next); setError(''); return true;
    };
    try {
      return navigator.locks ? await navigator.locks.request(`teamnote:${community.id}:ideas`, commit) : commit();
    } catch {
      if (active.current) setError('アイデアを保存できませんでした。入力内容を残しています。もう一度お試しください。');
      return false;
    }
  }, [show, enabled]);
  useEffect(() => {
    if (!enabled) return;
    active.current = true;
    const refresh = () => {
      try {
        const saved = readIdeas();
        if (saved) show(saved);
      } catch { setError('アイデアの更新を読み込めませんでした。表示中の内容を保持しています。'); }
    };
    const storage = (event: StorageEvent) => { if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) refresh(); };
    const persistInitial = () => { void update(current => current); };
    const visible = () => { if (!document.hidden) { refresh(); } };
    const focus = () => { refresh(); };
    // The first save also takes the lock, so opening a tab cannot overwrite a concurrent post.
    persistInitial();
    window.addEventListener('storage', storage); window.addEventListener('focus', focus); window.addEventListener('online', focus); document.addEventListener('visibilitychange', visible);
    return () => { active.current = false; window.removeEventListener('storage', storage); window.removeEventListener('focus', focus); window.removeEventListener('online', focus); document.removeEventListener('visibilitychange', visible); };
  }, [show, update, enabled]);
  return { ideas, update, error };
}

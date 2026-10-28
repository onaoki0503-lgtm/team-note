import { checkIdeaSentenceValidity } from '../lib/ideaValidation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Heart, MoreHorizontal, Trash2, ArrowRight, ArrowDown, X } from 'lucide-react';
import { community } from '../lib/community';
import { displayedIdeas, type IdeaItem } from '../lib/ideaBoard';
export type { IdeaItem } from '../lib/ideaBoard';

interface IdeaBubbleProps {
  ideas: IdeaItem[]; syncError?: string; connectionLabel?: string; currentUserId: string; currentUserName?: string;
  onOpenIdeaInputWithText: (text: string) => void; onSelectProject?: (id: string) => void;
  isPaused: boolean; onPauseChange: (paused: boolean) => void; centerAction: ReactNode;
  onAddNewIdea: (text: string) => Promise<boolean>; onToggleLike: (id: string) => Promise<boolean>; onDeleteIdea: (id: string) => Promise<boolean>;
}
const dayLabel = (idea: IdeaItem) => {
  const date = new Date(idea.createdAt || idea.activityTrackedFrom || '');
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date) : '以前の投稿';
};
const timeLabel = (idea: IdeaItem) => {
  const date = new Date(idea.createdAt || idea.activityTrackedFrom || '');
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(date) : '';
};
function Message({ idea, own, onOpen }: { idea: IdeaItem; own: boolean; onOpen: (trigger: HTMLButtonElement) => void }) {
  return <article className={`idea-message ${own ? 'is-own' : ''}`} data-idea-id={idea.id}>
    {!own && <span className="idea-message-avatar" aria-hidden="true">{Array.from(idea.authorName || '寮生')[0]}</span>}
    <div className="idea-message-content">
      {!own && <span className="idea-message-author">{idea.authorName || '寮生'}</span>}
      <button type="button" className="idea-card idea-message-body" aria-label={idea.text} onClick={event => onOpen(event.currentTarget)}>{idea.text}</button>
      <div className="idea-message-meta"><time dateTime={idea.createdAt}>{timeLabel(idea)}</time>{idea.likes > 0 && <span><Heart size={11} />{idea.likes}</span>}</div>
    </div>
  </article>;
}
function IdeaPreview({ idea, userId, onClose, onOpen, onLike, onDelete }: { idea: IdeaItem; userId: string; onClose: () => void; onOpen: () => void; onLike: () => void; onDelete: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const finish = (action: () => void) => { ref.current?.close(); action(); };
  const liked = idea.likedUserIds?.includes(userId);
  return <dialog ref={ref} className="idea-preview glass-panel" aria-label="アイデアの詳細" onCancel={event => { event.preventDefault(); finish(onClose); }}>
    <div className="idea-preview-heading"><span className="idea-preview-author">{idea.authorName || 'アイデア'}</span><button type="button" className="glass-icon-button" aria-label="アイデアの詳細を閉じる" onClick={() => finish(onClose)} autoFocus><X size={20} /></button></div>
    <p className="idea-preview-text">{idea.text}</p>
    <div className="idea-preview-actions"><button type="button" className={`glass-button idea-heart ${liked ? 'is-liked' : ''}`} aria-label={`いいね ${idea.likes}件`} aria-pressed={!!liked} onClick={onLike}><Heart size={18} fill={liked ? 'currentColor' : 'none'} />{idea.likes}</button>
      {idea.authorId === userId && <button type="button" className="glass-icon-button" aria-label="アイデアのメニュー" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>}</div>
    <div className="idea-preview-cta"><p>このつぶやきをもとに企画書をつくります</p><button type="button" className="glass-primary idea-preview-make" onClick={() => finish(onOpen)}>企画にする<ArrowRight size={16} /></button></div>
    {menuOpen && <div className="idea-preview-delete"><span>このアイデアを削除しますか</span><button type="button" className="glass-secondary" onClick={() => finish(onDelete)}><Trash2 size={14} />削除する</button><button type="button" className="glass-secondary" onClick={() => setMenuOpen(false)}>閉じる</button></div>}
  </dialog>;
}
export function IdeaBubbleLayer({ ideas, syncError, connectionLabel, currentUserId, onOpenIdeaInputWithText, onSelectProject, isPaused: _isPaused, onPauseChange, centerAction, onAddNewIdea, onToggleLike, onDeleteIdea }: IdeaBubbleProps) {
  const draftKey = `tn_draft:${community.id}:${currentUserId}`;
  const [comment, setComment] = useState(() => { try { return localStorage.getItem(draftKey) || ''; } catch { return ''; } });
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const postTrigger = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const visibleIdeas = useMemo(() => displayedIdeas(ideas), [ideas]);
  const selectedIdea = visibleIdeas.find(idea => idea.id === selected);
  const previewOpen = !!selectedIdea;
  const timelineRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const previousIds = useRef(new Set<string>());
  const initialized = useRef(false);
  const pendingOwn = useRef(false);
  const [unread, setUnread] = useState(0);
  const toLatest = () => {
    const node = timelineRef.current;
    if (node) node.scrollTop = node.scrollHeight;
    pinned.current = true; setUnread(0);
  };
  useLayoutEffect(() => {
    const shell = layerRef.current?.closest<HTMLElement>('.app-shell');
    const viewport = visualViewport;
    const sync = () => shell?.style.setProperty('--home-height', `${viewport?.height || innerHeight}px`);
    sync(); viewport?.addEventListener('resize', sync);
    return () => { shell?.style.removeProperty('--home-height'); viewport?.removeEventListener('resize', sync); };
  }, []);
  useLayoutEffect(() => {
    const node = timelineRef.current;
    if (!node) return;
    const added = visibleIdeas.filter(idea => !previousIds.current.has(idea.id));
    const first = !initialized.current && visibleIdeas.length > 0;
    if (first || (added.length > 0 && (pinned.current || pendingOwn.current))) {
      node.scrollTop = node.scrollHeight; pinned.current = true; setUnread(0);
    } else if (added.length > 0 && initialized.current) setUnread(count => count + added.length);
    if (visibleIdeas.length > 0) initialized.current = true;
    previousIds.current = new Set(visibleIdeas.map(idea => idea.id));
    if (added.length) pendingOwn.current = false;
    const observer = new ResizeObserver(() => { if (pinned.current) node.scrollTop = node.scrollHeight; });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleIdeas]);
  useEffect(() => { const timer = setTimeout(() => { try { localStorage.setItem(draftKey, comment); } catch { /* Optional persistence. */ } }, 500); return () => clearTimeout(timer); }, [draftKey, comment]);
  useEffect(() => { onPauseChange(composeOpen || focused || previewOpen); return () => onPauseChange(false); }, [composeOpen, focused, previewOpen, onPauseChange]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const submit = async () => {
    if (sending) return;
    const text = comment.trim(); const validity = checkIdeaSentenceValidity(text);
    if (!validity.valid) { setNotice(validity.reason || '内容を確認してください'); return; }
    pendingOwn.current = true; setSending(true);
    const saved = await onAddNewIdea(text).catch(() => false);
    setSending(false);
    if (!saved) { pendingOwn.current = false; setNotice('保存できませんでした。入力内容は残っています。'); return; }
    setComposeOpen(false); setFocused(false); requestAnimationFrame(() => postTrigger.current?.focus({ preventScroll: true }));
    setComment(''); try { localStorage.removeItem(draftKey); } catch { /* Optional persistence. */ }
    toLatest(); setNotice('アイデアを投稿しました');
  };
  const length = Array.from(comment).length;
  return <div ref={layerRef} className="idea-layer idea-chat" data-count={visibleIdeas.length}>
    <div className="idea-home-heading"><h1>アイデア</h1>{connectionLabel && <span className="idea-connection" aria-live="polite">{connectionLabel}</span>}</div>
    <div className="idea-timeline-wrap">
      <div ref={timelineRef} className="idea-timeline" role="region" aria-label="アイデアの履歴" tabIndex={0} inert={composeOpen} onScroll={event => {
        const node = event.currentTarget; pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
        if (pinned.current) setUnread(0);
      }}>
        {visibleIdeas.length === 0 && <p className="idea-empty">まだアイデアはありません</p>}
        {visibleIdeas.map((idea, index) => <div className="idea-chat-entry" key={idea.id}>
          {(index === 0 || dayLabel(idea) !== dayLabel(visibleIdeas[index - 1])) && <div className="idea-date-divider"><span>{dayLabel(idea)}</span></div>}
          <Message idea={idea} own={idea.authorId === currentUserId} onOpen={trigger => { opener.current = trigger; setSelected(idea.id); }} />
        </div>)}
      </div>
      {unread > 0 && <button type="button" className="idea-new-messages" onClick={toLatest}><ArrowDown size={15} />新しい投稿 {unread}件</button>}
    </div>
    <div className="idea-composer">
      <button ref={postTrigger} type="button" className="idea-post-primary" onClick={() => { setNotice(''); setComposeOpen(true); }}>アイデアを投稿</button>
      {(syncError || notice) && !composeOpen && <p role={syncError ? 'alert' : 'status'} aria-live="polite" className="idea-notice">{syncError || notice}</p>}
    </div>
    {composeOpen && <IdeaComposer onClose={() => { if (sending) return; setComposeOpen(false); setFocused(false); requestAnimationFrame(() => postTrigger.current?.focus({ preventScroll: true })); }}>
      <form onSubmit={e => { e.preventDefault(); void submit(); }}>
        <textarea ref={inputRef} rows={4} autoFocus aria-label="アイデアをつぶやく" placeholder="アイデアを入力" readOnly={sending} value={comment} onChange={event => setComment(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        <div className="idea-composer-help"><span>140文字まで</span><span style={{ color: length > 140 ? '#B92F3D' : undefined }}>{length} / 140</span></div>
        {(syncError || notice) && <p role="alert" className="idea-compose-error">{syncError || notice}</p>}
        <button type="submit" className="idea-post-primary" disabled={sending || !comment.trim() || length > community.ideas.maxLength}>{sending ? '投稿中…' : '投稿する'}</button>
      </form>
      <div className="idea-compose-proposal" onClick={() => setComposeOpen(false)}>{centerAction}</div>
    </IdeaComposer>}
    {selectedIdea && <IdeaPreview key={selectedIdea.id} idea={selectedIdea} userId={currentUserId} onClose={() => { setSelected(null); opener.current?.focus({ preventScroll: true }); }} onLike={() => onToggleLike(selectedIdea.id)} onDelete={() => { void onDeleteIdea(selectedIdea.id); setSelected(null); }} onOpen={() => { setSelected(null); if (selectedIdea.projectId && onSelectProject) onSelectProject(selectedIdea.projectId); else onOpenIdeaInputWithText(selectedIdea.text); }} />}
  </div>;
}

function IdeaComposer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; node?.showModal(); node?.querySelector('textarea')?.focus(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className="idea-compose-dialog" aria-labelledby="idea-compose-title" onCancel={e => { e.preventDefault(); onClose(); }}><header><h2 id="idea-compose-title">アイデアを投稿</h2><button type="button" className="glass-icon-button" aria-label="投稿欄を閉じる" onClick={onClose}><X size={21} /></button></header>{children}</dialog>;
}

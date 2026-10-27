import { checkIdeaSentenceValidity } from '../lib/ideaValidation';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Heart, MoreHorizontal, Trash2, ArrowRight, X } from 'lucide-react';
import { community } from '../lib/community';
import { displayedIdeas, type IdeaItem } from '../lib/ideaBoard';
export type { IdeaItem } from '../lib/ideaBoard';

interface IdeaBubbleProps {
  ideas: IdeaItem[]; syncError?: string; connectionLabel?: string; currentUserId: string; currentUserName?: string;
  onOpenIdeaInputWithText: (text: string) => void; onSelectProject?: (id: string) => void;
  isPaused: boolean; onPauseChange: (paused: boolean) => void; centerAction: ReactNode;
  onAddNewIdea: (text: string) => Promise<boolean>; onToggleLike: (id: string) => Promise<boolean>; onDeleteIdea: (id: string) => Promise<boolean>;
}
const tones = ['coral', 'blue', 'gold', 'green', 'violet', 'cyan'] as const;
type BubbleTone = typeof tones[number];
function hashId(id: string) { return [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7); }
function toneOf(id: string): BubbleTone { return tones[hashId(id) % tones.length]; }
function variation(id: string): CSSProperties {
  const hash = hashId(id);
  return { '--drift': `${9 + hash % 5}s`, '--delay': `${-(hash % 110) / 10}s`, '--float-x-request': `${5 + hash % 3}`, '--float-y-request': `${6 + hash % 4}`, '--bubble-width': `${88 + hash % 4}%`, '--bubble-height': `${84 + (hash >> 4) % 6}%`, '--card-tilt': `${(hash % 5 - 2) * .6}deg` } as CSSProperties;
}
type Layout = 'portrait' | 'desktop' | 'wide';
function cardLayout(count: number, layout: Layout) {
  if (count <= 2) return { columns: 6, rows: 4, cells: [[1, 1, 2, 4], [3, 3, 2, 4]] };
  const columns = layout === 'wide' ? Math.min(6, count) : layout === 'desktop' && count > 6 ? 4 : count > 6 ? 3 : 2;
  return { columns, rows: Math.ceil(count / columns), cells: Array.from({ length: count }, (_, i) => [Math.floor(i / columns) + 1, i % columns + 1, 1, 1]) };
}
const currentLayout = (): Layout => innerHeight <= 520 && innerWidth > innerHeight ? 'wide' : innerWidth >= 900 ? 'desktop' : 'portrait';

function Bubble({ idea, popping, onPopEnd, onOpen }: { idea: IdeaItem; popping: boolean; onPopEnd: () => void; onOpen: (trigger: HTMLButtonElement) => void }) {
  const shape = hashId(idea.id) % 6;
  const tone = toneOf(idea.id);
  return <article className={`idea-card idea-card--shape-${shape} idea-card--tone-${tone} ${idea.isNew ? 'idea-card--new' : ''} ${popping ? 'is-popping' : ''}`} data-idea-id={idea.id} data-pop-active={popping} data-shape={shape} data-tone={tone} style={variation(idea.id)} onPointerEnter={() => { if (popping) onPopEnd(); }} onFocusCapture={() => { if (popping) onPopEnd(); }} onAnimationEnd={event => { if (event.animationName === 'bubble-pop') onPopEnd(); }}>
    <button type="button" className="glass-button idea-card-text" onClick={event => onOpen(event.currentTarget)} aria-label={idea.text} title={idea.text}><span className="idea-bubble-excerpt">{idea.text}</span><span className="idea-bubble-label" aria-hidden="true">アイデア{idea.likes > 0 && <span><Heart size={11} />{idea.likes}</span>}</span></button>
  </article>;
}
function IdeaPreview({ idea, userId, onClose, onOpen, onLike, onDelete }: { idea: IdeaItem; userId: string; onClose: () => void; onOpen: () => void; onLike: () => void; onDelete: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const tone = toneOf(idea.id);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const finish = (action: () => void) => { ref.current?.close(); action(); };
  const liked = idea.likedUserIds?.includes(userId);
  return <dialog ref={ref} className={`idea-preview glass-panel idea-preview--tone-${tone}`} aria-label="アイデアの詳細" onCancel={event => { event.preventDefault(); finish(onClose); }}>
    <div className="idea-preview-heading"><span className="idea-preview-author">{idea.authorName || 'アイデア'}</span><button type="button" className="glass-icon-button" aria-label="アイデアの詳細を閉じる" onClick={() => finish(onClose)} autoFocus><X size={20} /></button></div>
    <p className="idea-preview-text">{idea.text}</p>
    <div className="idea-preview-actions"><button type="button" className={`glass-button idea-heart ${liked ? 'is-liked' : ''}`} aria-label={`いいね ${idea.likes}件`} aria-pressed={!!liked} onClick={onLike}><Heart size={18} fill={liked ? 'currentColor' : 'none'} />{idea.likes}</button>
      {idea.authorId === userId && <button type="button" className="glass-icon-button" aria-label="アイデアのメニュー" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>}</div>
    <div className="idea-preview-cta"><p>このつぶやきをもとに企画書をつくります</p><button type="button" className="glass-primary idea-preview-make" onClick={() => finish(onOpen)}>企画にする<ArrowRight size={16} /></button></div>
    {menuOpen && <div className="idea-preview-delete"><span>このアイデアを削除しますか</span><button type="button" className="glass-secondary" onClick={() => finish(onDelete)}><Trash2 size={14} />削除する</button><button type="button" className="glass-secondary" onClick={() => setMenuOpen(false)}>閉じる</button></div>}
  </dialog>;
}
export function IdeaBubbleLayer({ ideas, syncError, connectionLabel, currentUserId, onOpenIdeaInputWithText, onSelectProject, isPaused, onPauseChange, centerAction, onAddNewIdea, onToggleLike, onDeleteIdea }: IdeaBubbleProps) {
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
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [layout, setLayout] = useState(currentLayout);
  const [keyboard, setKeyboard] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const visibleIdeas = displayedIdeas(ideas);
  const selectedIdea = visibleIdeas.find(idea => idea.id === selected);
  const previewOpen = !!selectedIdea;
  const composition = cardLayout(visibleIdeas.length, layout);
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const lastPopped = useRef<string | null>(null);
  const idsKey = visibleIdeas.map(idea => idea.id).join('|');
  const motionPaused = isPaused || composeOpen || focused || keyboard || previewOpen || pageHidden || reducedMotion;
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const board = layer?.querySelector<HTMLElement>('.idea-board');
    if (!board) return;
    const measure = () => {
      const grid = getComputedStyle(board);
      const gapX = parseFloat(grid.columnGap) || 0; const gapY = parseFloat(grid.rowGap) || 0;
      board.querySelectorAll<HTMLElement>('.idea-card').forEach(card => {
        const slot = card.parentElement!; const style = getComputedStyle(card);
        const width = card.offsetWidth; const height = card.offsetHeight;
        if (!width || !height) return;
        // Divide the slot's spare room between drift and the peak of the pop; never cross its safe boundary.
        const roomX = Math.max(0, (slot.clientWidth - width + gapX) / 2 - 1.5);
        const roomY = Math.max(0, (slot.clientHeight - height + gapY) / 2 - 1.5);
        const x = Math.min(parseFloat(style.getPropertyValue('--float-x-request')), Math.max(0, roomX - width * .04));
        const y = Math.min(parseFloat(style.getPropertyValue('--float-y-request')), Math.max(0, roomY - height * .04));
        const scale = Math.max(1, Math.min(1.1, 1 + 2 * (roomX - x) / width, 1 + 2 * (roomY - y) / height));
        card.style.setProperty('--float-x', `${x}px`); card.style.setProperty('--float-y', `${y}px`); card.style.setProperty('--pop-scale', String(scale));
      });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(board);
    return () => observer.disconnect();
  }, [idsKey, layout]);
  useEffect(() => {
    if (motionPaused || !idsKey) { const clear = window.setTimeout(() => setPoppingId(null), 0); return () => window.clearTimeout(clear); }
    const timer = window.setInterval(() => {
      const eligible = [...(layerRef.current?.querySelectorAll<HTMLElement>('.idea-card') || [])].filter(card => !card.matches(':hover,:focus-within'));
      const different = eligible.filter(card => card.dataset.ideaId !== lastPopped.current);
      const choices = different.length ? different : eligible;
      if (!choices.length) return;
      const id = choices[Math.floor(Math.random() * choices.length)].dataset.ideaId!;
      lastPopped.current = id; setPoppingId(id);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [motionPaused, idsKey]);
  useLayoutEffect(() => {
    const measure = () => { const input = inputRef.current; if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(76, Math.max(32, input.scrollHeight))}px`; } };
    measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure);
  }, [comment, composeOpen]);
  useLayoutEffect(() => {
    const shell = layerRef.current?.closest<HTMLElement>('.app-shell');
    const viewport = visualViewport;
    const sync = () => { shell?.style.setProperty('--home-height', `${viewport?.height || innerHeight}px`); setLayout(currentLayout()); setKeyboard(!!viewport && viewport.height < innerHeight * .75 && document.activeElement === inputRef.current); };
    sync(); window.addEventListener('resize', sync); viewport?.addEventListener('resize', sync);
    return () => { shell?.style.removeProperty('--home-height'); window.removeEventListener('resize', sync); viewport?.removeEventListener('resize', sync); };
  }, []);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)'); const reduce = () => setReducedMotion(motion.matches); const visibility = () => setPageHidden(document.hidden);
    motion.addEventListener('change', reduce); document.addEventListener('visibilitychange', visibility);
    return () => { motion.removeEventListener('change', reduce); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { const timer = setTimeout(() => { try { localStorage.setItem(draftKey, comment); } catch { /* Optional persistence. */ } }, 500); return () => clearTimeout(timer); }, [draftKey, comment]);
  useEffect(() => { onPauseChange(composeOpen || focused || previewOpen); return () => onPauseChange(false); }, [composeOpen, focused, previewOpen, onPauseChange]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const submit = async () => {
    if (sending) return;
    const text = comment.trim(); const validity = checkIdeaSentenceValidity(text);
    if (!validity.valid) { setNotice(validity.reason || '内容を確認してください'); return; }
    setSending(true);
    const saved = await onAddNewIdea(text).catch(() => false);
    setSending(false);
    if (!saved) { setNotice('保存できませんでした。入力内容は残っています。'); return; }
    setComposeOpen(false); setFocused(false); setKeyboard(false); requestAnimationFrame(() => postTrigger.current?.focus({ preventScroll: true }));
    setComment(''); try { localStorage.removeItem(draftKey); } catch { /* Optional persistence. */ }
    setNotice(visibleIdeas.length >= community.ideas.displayLimit ? '吹き出しを追加し、一番古い表示を外しました' : '吹き出しにアイデアを追加しました');
  };
  const length = Array.from(comment).length;
  return <div ref={layerRef} className="idea-layer" data-layout={layout} data-count={visibleIdeas.length} data-density={visibleIdeas.length <= 2 ? 'spacious' : visibleIdeas.length <= 6 ? 'medium' : 'compact'} data-keyboard={keyboard} data-rotation-paused="true" data-floating-paused={motionPaused}>
    <div className="idea-home-heading"><h1>アイデア</h1>{connectionLabel && <span className="idea-connection" aria-live="polite">{connectionLabel}</span>}</div>
    <div className="idea-board" aria-label="みんなのアイデア" style={{ gridTemplateColumns: `repeat(${composition.columns},minmax(0,1fr))`, gridTemplateRows: `repeat(${composition.rows},minmax(0,1fr))` }} inert={composeOpen}>
      {visibleIdeas.length === 0 && <p className="idea-empty">まだアイデアはありません</p>}
      {visibleIdeas.map((idea, index) => { const [row, col, rowSpan, colSpan] = composition.cells[index]; return <div className="idea-slot" style={{ gridRow: `${row} / span ${rowSpan}`, gridColumn: `${col} / span ${colSpan}` }} key={idea.id}><Bubble idea={idea} popping={!motionPaused && poppingId === idea.id} onPopEnd={() => setPoppingId(current => current === idea.id ? null : current)} onOpen={trigger => { opener.current = trigger; setSelected(idea.id); }} /></div>; })}
    </div>
    <div className="idea-composer">
      <button ref={postTrigger} type="button" className="idea-post-primary" onClick={() => { setNotice(''); setComposeOpen(true); }}>アイデアを投稿</button>
      {(syncError || notice) && !composeOpen && <p role={syncError ? 'alert' : 'status'} aria-live="polite" className="idea-notice">{syncError || notice}</p>}
    </div>
    {composeOpen && <IdeaComposer onClose={() => { if (sending) return; setComposeOpen(false); setFocused(false); setKeyboard(false); requestAnimationFrame(() => postTrigger.current?.focus({ preventScroll: true })); }}>
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

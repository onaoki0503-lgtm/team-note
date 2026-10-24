import { checkIdeaSentenceValidity } from '../lib/ideaValidation';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Heart, Send, MoreHorizontal, Trash2, ArrowRight, X } from 'lucide-react';
import { community } from '../lib/community';
import { displayedIdeas, type IdeaItem } from '../lib/ideaBoard';
export type { IdeaItem } from '../lib/ideaBoard';

interface IdeaBubbleProps {
  ideas: IdeaItem[]; syncError?: string; connectionLabel?: string; currentUserId: string; currentUserName?: string;
  onOpenIdeaInputWithText: (text: string) => void; onSelectProject?: (id: string) => void;
  isPaused: boolean; onPauseChange: (paused: boolean) => void; centerAction: ReactNode;
  onAddNewIdea: (text: string) => Promise<boolean>; onToggleLike: (id: string) => Promise<boolean>; onDeleteIdea: (id: string) => Promise<boolean>;
}
// Every outline stays inside its own cell, including the speech tail.
const outlines = [
  'M30 23C22 6 48 0 64 12C79-2 105 1 114 13C139 0 161 12 155 30C182 38 180 62 162 69C175 91 153 101 132 94C114 108 91 102 80 98L59 116L63 98C40 108 20 96 24 81C0 83-4 59 14 48C-1 32 13 18 30 23Z',
  'M89 3C137-3 178 18 176 53C180 85 143 105 103 102L76 117L78 102C31 105 2 84 4 53C1 20 42 1 89 3Z',
  'M23 8L149 3Q169 3 172 22L178 75Q179 94 157 98L116 101L91 117L95 101L24 106Q6 105 5 84L2 31Q0 10 23 8Z',
  'M17 28C21 3 48-2 71 12C95-3 128 1 137 18C165 13 184 34 171 55C186 76 167 96 142 93C127 109 96 104 83 98L65 117L60 99C34 108 9 95 16 75C-4 67-3 39 17 28Z',
  'M22 15Q32 0 56 6L151 10Q171 11 171 31L177 75Q178 96 151 99L133 99L143 117L115 100L28 105Q8 105 7 84L3 38Q1 19 22 15Z',
  'M43 5C83-7 160 2 173 39C186 78 149 106 110 100L87 118L88 101C49 112 6 92 4 65C-6 36 13 13 43 5Z'
];
const tones = ['coral', 'blue', 'gold', 'green', 'violet', 'cyan'] as const;
type BubbleTone = typeof tones[number];
function hashId(id: string) { return [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7); }
function toneOf(id: string): BubbleTone { return tones[hashId(id) % tones.length]; }
function variation(id: string): CSSProperties {
  const hash = hashId(id);
  return { '--drift': `${9 + hash % 5}s`, '--delay': `${-(hash % 110) / 10}s`, '--float-x-request': `${5 + hash % 3}`, '--float-y-request': `${6 + hash % 4}`, '--bubble-width': `${82 + hash % 10}%`, '--bubble-height': `${80 + (hash >> 4) % 10}%` } as CSSProperties;
}
type Layout = 'portrait' | 'desktop' | 'wide';
const layouts: Record<Layout, number[][]> = {
  portrait: [[1,1],[1,3],[3,1],[3,3],[5,1],[5,3],[1,2],[5,2],[2,1],[4,3],[2,3],[4,1]],
  desktop: [[1,1],[1,4],[4,1],[4,4],[1,2],[4,3],[2,1],[3,4],[1,3],[4,2],[3,1],[2,4]],
  wide: [[1,1],[1,6],[3,1],[3,6],[1,3],[3,4],[1,2],[3,5],[1,4],[3,3],[1,5],[3,2]]
};
const currentLayout = (): Layout => innerHeight <= 520 && innerWidth > innerHeight ? 'wide' : innerWidth >= 900 ? 'desktop' : 'portrait';

function Bubble({ idea, popping, onPopEnd, onOpen }: { idea: IdeaItem; popping: boolean; onPopEnd: () => void; onOpen: (trigger: HTMLButtonElement) => void }) {
  const shape = hashId(idea.id) % outlines.length;
  const tone = toneOf(idea.id);
  return <article className={`idea-card idea-card--shape-${shape} idea-card--tone-${tone} ${idea.isNew ? 'idea-card--new' : ''} ${popping ? 'is-popping' : ''}`} data-idea-id={idea.id} data-pop-active={popping} data-shape={shape} data-tone={tone} style={variation(idea.id)} onPointerEnter={() => { if (popping) onPopEnd(); }} onFocusCapture={() => { if (popping) onPopEnd(); }} onAnimationEnd={event => { if (event.animationName === 'bubble-pop') onPopEnd(); }}>
    <svg className="idea-bubble-outline" viewBox="0 0 180 120" preserveAspectRatio="none" aria-hidden="true"><path d={outlines[shape]} /></svg>
    <button type="button" className="glass-button idea-card-text" onClick={event => onOpen(event.currentTarget)} aria-label={idea.text} title={idea.text}><span className="idea-bubble-excerpt">{idea.text}</span><span className="idea-bubble-reactions" aria-hidden="true"><Heart size={10} />{idea.likes > 0 ? idea.likes : ''}</span></button>
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
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [layout, setLayout] = useState(currentLayout);
  const [keyboard, setKeyboard] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const visibleIdeas = displayedIdeas(ideas);
  const selectedIdea = visibleIdeas.find(idea => idea.id === selected);
  const previewOpen = !!selectedIdea;
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const lastPopped = useRef<string | null>(null);
  const idsKey = visibleIdeas.map(idea => idea.id).join('|');
  const motionPaused = isPaused || focused || keyboard || previewOpen || pageHidden || reducedMotion;
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
  }, [comment]);
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
  useEffect(() => { onPauseChange(focused || previewOpen); return () => onPauseChange(false); }, [focused, previewOpen, onPauseChange]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const submit = async () => {
    if (sending) return;
    const text = comment.trim(); const validity = checkIdeaSentenceValidity(text);
    if (!validity.valid) { setNotice(validity.reason || '内容を確認してください'); return; }
    setSending(true);
    const saved = await onAddNewIdea(text).catch(() => false);
    setSending(false);
    if (!saved) return;
    setComment(''); try { localStorage.removeItem(draftKey); } catch { /* Optional persistence. */ }
    setNotice(visibleIdeas.length >= community.ideas.displayLimit ? '吹き出しを追加し、一番古い表示を外しました' : '吹き出しにアイデアを追加しました');
  };
  const length = Array.from(comment).length;
  return <div ref={layerRef} className="idea-layer" data-layout={layout} data-keyboard={keyboard} data-rotation-paused="true" data-floating-paused={motionPaused}>
    <div className="idea-board" aria-label="みんなのアイデア" inert={keyboard && focused}>
      <div className="home-start">{centerAction}</div>
      {visibleIdeas.map((idea, index) => { const [row, col] = layouts[layout][index]; return <div className="idea-slot" style={{ gridRow: row, gridColumn: col }} key={idea.id}><Bubble idea={idea} popping={!motionPaused && poppingId === idea.id} onPopEnd={() => setPoppingId(current => current === idea.id ? null : current)} onOpen={trigger => { opener.current = trigger; setSelected(idea.id); }} /></div>; })}
    </div>
    <div className="idea-composer">
      <div className="idea-board-caption"><span>{visibleIdeas.length} / {community.ideas.displayLimit}件</span>{connectionLabel && <span aria-live="polite">{connectionLabel}</span>}</div>
      <div className={`idea-composer-field ${focused ? 'is-focused' : ''}`}><textarea ref={inputRef} rows={1} aria-label="アイデアをつぶやく" placeholder="アイデアを入力" readOnly={sending} value={comment} onChange={event => setComment(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setKeyboard(false); }} />
        <button type="button" className="glass-button idea-send" aria-label="アイデアを投稿" disabled={sending || !comment.trim() || length > community.ideas.maxLength} onClick={submit}><Send size={18} /></button></div>
      <div className="idea-composer-help"><span>7日間反応がないと表示終了</span><span style={{ color: length > 140 ? '#B92F3D' : undefined }}>{length} / 140</span></div>
      <p role={syncError ? 'alert' : 'status'} aria-live="polite" className="idea-notice">{syncError || notice}</p>
    </div>
    {selectedIdea && <IdeaPreview key={selectedIdea.id} idea={selectedIdea} userId={currentUserId} onClose={() => { setSelected(null); opener.current?.focus({ preventScroll: true }); }} onLike={() => onToggleLike(selectedIdea.id)} onDelete={() => { void onDeleteIdea(selectedIdea.id); setSelected(null); }} onOpen={() => { setSelected(null); if (selectedIdea.projectId && onSelectProject) onSelectProject(selectedIdea.projectId); else onOpenIdeaInputWithText(selectedIdea.text); }} />}
  </div>;
}

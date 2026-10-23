export interface IdeaItem {
  id: string;
  text: string;
  color: 'coral' | 'cyan' | 'yellow' | 'violet';
  projectId?: string;
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
  likes: number;
  likedUserIds?: string[];
  createdAt?: string;
  lastReactionAt?: string;
  activityTrackedFrom?: string;
  hiddenAt?: string;
  hiddenReason?: 'inactive' | 'capacity';
  isNew?: boolean;
}
const timestamp = (value?: string) => value ? Date.parse(value) : NaN;
const validTime = (value?: string) => Number.isFinite(timestamp(value));
export function ideaCreatedTime(idea: IdeaItem) {
  return validTime(idea.createdAt) ? timestamp(idea.createdAt) : timestamp(idea.activityTrackedFrom);
}
export function displayedIdeas(ideas: IdeaItem[]) {
  return ideas.filter(idea => !idea.hiddenAt).map((idea, index) => ({ idea, index }))
    .sort((a, b) => ideaCreatedTime(a.idea) - ideaCreatedTime(b.idea) || a.index - b.index).map(item => item.idea);
}
// Hide old bubbles without deleting the original posts. Hidden posts stay hidden after reload.
export function maintainIdeaBoard(ideas: IdeaItem[], now: number, limit: number, idleMs: number): IdeaItem[] {
  const iso = new Date(now).toISOString();
  let changed = false;
  const tracked = ideas.map(idea => {
    if (validTime(idea.activityTrackedFrom)) return idea;
    changed = true;
    // Older data did not record reaction times: start its observation period once, never on every visit.
    return { ...idea, activityTrackedFrom: iso };
  });
  const inactive = new Set(tracked.filter(idea => !idea.hiddenAt && now - Math.max(
    validTime(idea.createdAt) ? timestamp(idea.createdAt) : 0,
    validTime(idea.lastReactionAt) ? timestamp(idea.lastReactionAt) : 0,
    timestamp(idea.activityTrackedFrom)
  ) >= idleMs).map(idea => idea.id));
  const survivors = displayedIdeas(tracked).filter(idea => !inactive.has(idea.id));
  const overflow = new Set(survivors.slice(0, Math.max(0, survivors.length - limit)).map(idea => idea.id));
  const result = tracked.map(idea => {
    if (idea.hiddenAt || (!inactive.has(idea.id) && !overflow.has(idea.id))) return idea;
    changed = true;
    return { ...idea, hiddenAt: iso, hiddenReason: inactive.has(idea.id) ? 'inactive' as const : 'capacity' as const };
  });
  return changed ? result : ideas;
}

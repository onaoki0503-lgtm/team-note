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
// Full chronological history. Legacy capacity/expiry markers are display metadata,
// never a deletion marker. The API excludes explicit deletions before this point.
export function displayedIdeas(ideas: IdeaItem[]) {
  return ideas.map((idea, index) => ({ idea, index })).sort((a, b) => {
    const left = ideaCreatedTime(a.idea), right = ideaCreatedTime(b.idea);
    return (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0) || a.index - b.index;
  }).map(item => item.idea);
}

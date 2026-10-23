import { createClient } from '@supabase/supabase-js';
import type { CurrentUser } from './db';
import type { IdeaItem } from './ideaBoard';

const url = import.meta.env.VITE_TEAMNOTE_SUPABASE_URL || '';
const key = import.meta.env.VITE_TEAMNOTE_SUPABASE_PUBLISHABLE_KEY || '';
// Review mode uses the existing local demo only; it never creates a shared-data client.
export const teamnoteReviewMode = new URLSearchParams(location.search).get('demo') === '1';
export const teamnoteCloudEnabled = Boolean(url && key) && !teamnoteReviewMode;
// Separate configuration and Auth storage: the prototype dbService must never query restaurant tables.
export const teamnoteClient = teamnoteCloudEnabled ? createClient(url, key, {
  auth: { storageKey: 'tn_shared_auth:h-village', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) }) },
}) : null;
export interface SharedBoard { community: string; revision: number; userId: string; members: CurrentUser[]; ideas: IdeaItem[]; }
export function parseSharedBoard(value: unknown): SharedBoard {
  const b = value as SharedBoard;
  if (!b || b.community !== 'h-village' || !Number.isSafeInteger(b.revision) || typeof b.userId !== 'string' || !Array.isArray(b.members) || !Array.isArray(b.ideas) || !b.members.some(m => m.id === b.userId)
    || b.members.some(m => typeof m.id !== 'string' || typeof m.name !== 'string' || typeof m.unit !== 'string')
    || b.ideas.some(i => typeof i.id !== 'string' || typeof i.text !== 'string' || !Number.isInteger(i.likes) || !Array.isArray(i.likedUserIds))) throw new Error('teamnote_invalid_response');
  b.members = b.members.map(m => ({ ...m, avatar: '', email: '', roleType: 'member' }));
  return b;
}
export function cloudError(error: unknown) {
  const e = error as { message?: string; code?: string };
  const message = e?.message || '';
  if (message.includes('invalid_invite')) return '参加コードを確認してください。';
  if (message.includes('invalid_profile')) return '名前・役職・棟・階・部屋番号を確認してください。';
  if (message.includes('invalid_text')) return 'アイデアは4〜140文字で入力してください。';
  if (message.includes('unavailable')) return 'このアイデアは表示を終了しました。';
  if (message.includes('access_denied') || e?.code === '42501') return 'この寮への参加権限を確認してください。';
  if (message.includes('Invalid login credentials')) return 'メールアドレスかパスワードを確認してください。';
  if (message.includes('Email not confirmed')) return '確認メールを開いてからログインしてください。';
  return '通信できませんでした。入力内容を残しています。接続を確認して、もう一度お試しください。';
}

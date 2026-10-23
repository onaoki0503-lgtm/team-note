import test from 'node:test';
import assert from 'node:assert/strict';
import { maintainIdeaBoard, displayedIdeas, type IdeaItem } from '../src/lib/ideaBoard.ts';
const day = 86400000;
const now = Date.parse('2026-10-22T00:00:00Z');
const iso = (time: number) => new Date(time).toISOString();
const idea = (id: string, age: number, extra: Partial<IdeaItem> = {}): IdeaItem => ({ id, text: `本文 ${id}`, color: 'coral', likes: 0, createdAt: iso(now - age), activityTrackedFrom: iso(now - age), ...extra });
const maintain = (items: IdeaItem[], time = now) => maintainIdeaBoard(items, time, 12, 7 * day);
test('上限未満の追加では既存の本文・ID・表示順を保持', () => {
  const original = [idea('old', day), idea('new', 0)]; const result = maintain(original);
  assert.equal(result, original); assert.deepEqual(displayedIdeas(result).map(item => item.id), ['old', 'new']); assert.equal(result[0].text, '本文 old');
});
test('13件目では作成時刻の一番古い表示だけを外し、原文は保存', () => {
  const input = Array.from({ length: 13 }, (_, i) => idea(String(i), (13 - i) * 1000)).reverse(); const result = maintain(input);
  assert.deepEqual(displayedIdeas(result).map(item => item.id), Array.from({ length: 12 }, (_, i) => String(i + 1))); assert.equal(result.length, 13); assert.equal(result.find(item => item.id === '0')?.hiddenReason, 'capacity');
  assert.equal(maintain(result), result); assert.ok(!displayedIdeas(maintain(result.filter(item => item.id !== '12'))).some(item => item.id === '0'));
});
test('反応なし7日の境界で表示終了し、1ms前には残す', () => {
  const input = [idea('expiry', 7 * day)]; assert.equal(displayedIdeas(maintain(input, now - 1)).length, 1); const result = maintain(input); assert.equal(result[0].hiddenReason, 'inactive'); assert.equal(result[0].text, input[0].text);
});
test('過去のいいね件数では延命せず、最後の反応から7日を判定', () => {
  const stale = idea('stale', 30 * day, { likes: 99, lastReactionAt: iso(now - 8 * day) });
  const recent = idea('recent', 30 * day, { lastReactionAt: iso(now - day) }); const result = maintain([stale, recent]); assert.deepEqual(displayedIdeas(result).map(item => item.id), ['recent']);
  assert.equal(displayedIdeas(maintain(result, now + 6 * day)).length, 0);
});
test('反応時刻のない旧データは一度だけ観測開始し再訪で期限を延ばさない', () => {
  const input = [{ ...idea('legacy', 30 * day), activityTrackedFrom: undefined }]; const result = maintain(input); assert.equal(result[0].activityTrackedFrom, iso(now)); assert.equal(displayedIdeas(result).length, 1);
  assert.equal(maintain(result, now + day), result); assert.equal(displayedIdeas(maintain(result, now + 7 * day)).length, 0);
});
test('保存済みの表示終了を尊重し、日付不明の投稿も本文を壊さない', () => {
  const input = [idea('hidden', 0, { hiddenAt: iso(now), hiddenReason: 'capacity' }), idea('no-date', 0, { createdAt: undefined, activityTrackedFrom: undefined })]; const result = maintain(input); assert.deepEqual(displayedIdeas(result).map(item => item.id), ['no-date']); assert.equal(result[1].text, '本文 no-date');
});

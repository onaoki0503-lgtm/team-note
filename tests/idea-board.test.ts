import test from 'node:test';
import assert from 'node:assert/strict';
import { displayedIdeas, type IdeaItem } from '../src/lib/ideaBoard.ts';
const item = (id: string, date?: string, extra: Partial<IdeaItem> = {}): IdeaItem => ({ id, text: `保存したアイデア${id}`, color:'coral', likes:0, createdAt:date, ...extra });
test('13件以上も日時順の履歴に残す',()=>{
 const rows=Array.from({length:50},(_,i)=>item(String(i),new Date(2026,0,i+1).toISOString())).reverse();
 assert.deepEqual(displayedIdeas(rows).map(i=>i.id),Array.from({length:50},(_,i)=>String(i)));assert.equal(rows[0].id,'49');
});
test('旧12件上限・7日無反応のマーカーがある過去投稿も復元表示',()=>{
 const rows=[item('capacity','2025-01-01',{hiddenAt:'2025-01-02',hiddenReason:'capacity'}),item('inactive','2025-02-01',{hiddenAt:'2025-03-01',hiddenReason:'inactive'})];
 assert.equal(displayedIdeas(rows).length,2);assert.equal(rows[0].hiddenReason,'capacity');
});
test('日時不明・同時刻も安定順で本文を保持',()=>{
 const rows=[item('unknown'),item('second','2026-01-01'),item('third','2026-01-01')];
 assert.deepEqual(displayedIdeas(rows),rows);assert.equal(displayedIdeas([]).length,0);
});

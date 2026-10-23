import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { type Env } from '../worker/src/index.ts';
import { fixtureAi, fixtureProposal } from './worker-fixtures.ts';
import { isProposal, isTopics } from '../src/lib/aiContract.ts';
const origin = 'http://127.0.0.1:5174';
const baseEnv: Env = { AI: fixtureAi, AI_RATE_LIMITER: { async limit() { return { success: true }; } }, ALLOWED_ORIGINS: origin };
const request = (body: unknown = { task: 'proposal', text: '中庭で上映会を行いたい。' }, headers: Record<string, string> = {}) => new Request('http://worker/api/ai', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
test('議題抽出をWorker経由で実行し、検証済みJSONを返す', async () => { const res = await worker.fetch(request({ task: 'topics', text: '中庭の上映会' }), baseEnv); assert.equal(res.status, 200); assert.ok(isTopics((await res.json() as { data: unknown }).data)); });
test('企画書の全フィールドを検証し、キャッシュ・CORSを限定する', async () => { const res = await worker.fetch(request(), baseEnv); assert.equal(res.status, 200); assert.ok(isProposal((await res.json() as { data: unknown }).data)); assert.equal(res.headers.get('cache-control'), 'no-store'); assert.equal(res.headers.get('access-control-allow-origin'), origin); });
test('未許可のOriginでは推論を実行しない', async () => { let calls = 0; const env = { ...baseEnv, AI: { async run() { calls++; return {}; } } }; assert.equal((await worker.fetch(request(undefined, { Origin: 'https://untrusted.example' }), env)).status, 403); assert.equal(calls, 0); });
test('Originのない直接呼出しを拒否する', async () => { const req = request(); req.headers.delete('Origin'); assert.equal((await worker.fetch(req, baseEnv)).status, 403); });
test('不明なタスク、空入力、型の違い、上限超過を拒否する', async () => { for (const body of [{ task: 'system', text: '内容' }, { task: 'proposal', text: '' }, { task: 'proposal', text: 1 }, { task: 'proposal', text: 'あ'.repeat(12001) }]) assert.equal((await worker.fetch(request(body), baseEnv)).status, 400); });
test('不正JSON・異なるContent-Typeを拒否する', async () => { assert.equal((await worker.fetch(request('{'), baseEnv)).status, 400); assert.equal((await worker.fetch(request('{}', { 'Content-Type': 'text/plain' }), baseEnv)).status, 415); });
test('bodyの実バイト数でも上限を検証する', async () => { assert.equal((await worker.fetch(request('あ'.repeat(23000)), baseEnv)).status, 413); });
test('レート制限後にモデルを実行しない', async () => { let calls = 0; const env = { ...baseEnv, AI_RATE_LIMITER: { async limit() { return { success: false }; } }, AI: { async run() { calls++; return {}; } } }; assert.equal((await worker.fetch(request(), env)).status, 429); assert.equal(calls, 0); });
test('未設定・推論失敗ではローカルの偽生成に切り替えない', async () => { assert.equal((await worker.fetch(request(), { ...baseEnv, AI: undefined } as unknown as Env)).status, 503); assert.equal((await worker.fetch(request({ task: 'proposal', text: '接続失敗のテスト' }), baseEnv)).status, 503); });
test('モデルから不完全な文書が返ったら成功として返さない', async () => { assert.equal((await worker.fetch(request({ task: 'proposal', text: '不正応答のテスト' }), baseEnv)).status, 502); });
test('プリフライト・不明パス・未許可メソッドを処理する', async () => { const pre = await worker.fetch(new Request('http://worker/api/ai', { method: 'OPTIONS', headers: { Origin: origin } }), baseEnv); assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-methods'), 'POST, OPTIONS'); assert.equal((await worker.fetch(new Request('http://worker/unknown'), baseEnv)).status, 404); assert.equal((await worker.fetch(new Request('http://worker/api/ai', { headers: { Origin: origin } }), baseEnv)).status, 405); });
test('構造が異なるAI出力を両側の契約で拒否する', () => { assert.equal(isProposal({ ...fixtureProposal(), budgetItems: [{ cost: 1 }] }), false); assert.equal(isTopics([{ title: '題名' }]), false); assert.equal(isProposal({ ...fixtureProposal(), title: '' }), false); });
test('最大長の本文でも議題を別フィールドで指定できる', async () => { const res = await worker.fetch(request({ task: 'proposal', text: 'あ'.repeat(12000), topic: '中庭の上映会' }), baseEnv); assert.equal(res.status, 200); });
test('タスク・選択議題の異常な型を拒否する', async () => { for (const body of [{ task: { toString: 1 }, text: '本文' }, { task: 'proposal', text: '本文', topic: [] }, { task: 'proposal', text: '本文', topic: 'あ'.repeat(201) }]) assert.equal((await worker.fetch(request(body), baseEnv)).status, 400); });
test('短い分類タスクだけを900トークン上限で実行し原文の抜粋を返す', async () => {
  let tokens = 0; const text = '目的は寮生の交流。場所は中庭。'; const env = { ...baseEnv, AI: { async run(_model: string, input: Record<string, unknown>) { tokens = input.max_tokens as number; return { response: JSON.stringify({ assignments: [{ field: 'objective', quote: '寮生の交流' }, { field: 'location', quote: '中庭' }] }) }; } } };
  const response = await worker.fetch(request({ task: 'distribute', text }), env); assert.equal(response.status, 200); assert.equal(tokens, 900); const data = await response.json() as { data: unknown[] }; assert.equal(data.data.length, 2);
});
test('分類タスクの2400文字超過では推論しない', async () => { let calls = 0; const response = await worker.fetch(request({ task: 'distribute', text: 'あ'.repeat(2401) }), { ...baseEnv, AI: { async run() { calls++; return {}; } } }); assert.equal(response.status, 400); assert.equal(calls, 0); });
test('分類の捏造・未知項目・重複項目・長すぎる抜粋を拒否する', async () => {
  for (const assignments of [[{ field: 'title', quote: '入力にない文章' }], [{ field: 'unknown', quote: '本文' }], [{ field: 'title', quote: '本文' }, { field: 'title', quote: '本文' }], [{ field: 'title', quote: 'あ'.repeat(301) }]]) {
    const response = await worker.fetch(request({ task: 'distribute', text: `本文${'あ'.repeat(310)}` }), { ...baseEnv, AI: { async run() { return { response: JSON.stringify({ assignments }) }; } } }); assert.equal(response.status, 502);
  }
});

import { test, expect, type Page } from '@playwright/test';
const errors = new WeakMap<Page, string[]>();
const boot = async (page: Page) => { await page.goto('/'); await expect(page.getByRole('button', { name: 'アイデアを投稿', exact: true })).toBeVisible(); };
const nav = async (page: Page, name: string) => { await page.getByRole('navigation', { name: 'メインメニュー' }).getByRole('button', { name, exact: true }).click(); await expect(page.locator('.screen-body.is-preparing')).toHaveCount(0); };
const back = (page: Page) => page.getByRole('button', { name: '前の画面に戻る', exact: true }).click();
const openProject = async (page: Page) => { await nav(page, '進行中'); const title = (await page.locator('.project-card h3').first().innerText()).trim(); await page.locator('.project-card').first().click(); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible(); return title; };
test.beforeEach(async ({ page }) => {
  errors.set(page, []); page.on('pageerror', error => errors.get(page)?.push(error.message));
  await page.route('https://**', route => route.abort());
  await page.addInitScript(() => { (window as any).__skeletons = 0; new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node instanceof HTMLElement && (node.matches('[data-testid="screen-skeleton"]') || node.querySelector('[data-testid="screen-skeleton"]'))) (window as any).__skeletons++; }).observe(document, { childList: true, subtree: true }); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('白ベースのホーム・4タブ・不要なキャッチコピーなし', async ({ page }) => {
  await boot(page); await expect(page).toHaveTitle('H-Village チームノート');
  await expect(page.getByText('アイデアをカタチに。', { exact: true })).toHaveCount(0);
  await expect(page.getByText('小さな思いつきから、はじめよう', { exact: true })).toHaveCount(0);
  expect(await page.locator('.glass-nav').evaluate(el => getComputedStyle(el).backdropFilter)).toContain('blur');
  for (const name of ['進行中', 'はたらく', '保管する', 'アイデア']) { await nav(page, name); await expect(page.getByRole('navigation').getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page'); }
  expect(await page.evaluate(() => (window as any).__skeletons)).toBeGreaterThanOrEqual(4);
});
test('読み込みが遅い画面にも全画面スケルトンを表示', async ({ page }) => {
  await page.route('**/src/components/WorkStorageViews.tsx*', async route => { await new Promise(resolve => setTimeout(resolve, 1200)); await route.continue(); });
  await boot(page); await page.getByRole('navigation').getByRole('button', { name: 'はたらく', exact: true }).click();
  await expect(page.getByTestId('screen-skeleton').first()).toBeVisible(); await expect(page.getByRole('heading', { name: '業務報告', exact: true })).toBeVisible(); await expect(page.getByTestId('screen-skeleton')).toHaveCount(0);
});
test('検索条件・企画詳細・ブラウザの戻ると進む', async ({ page }) => {
  await boot(page); await nav(page, '進行中'); const search = page.getByPlaceholder('企画を検索'); await search.fill('キッチン'); await expect(page.locator('.project-card')).toHaveCount(1);
  await page.locator('.project-card').click(); await expect(page.getByRole('button', { name: '概要', exact: true })).toBeVisible(); await page.goBack(); await expect(search).toHaveValue('キッチン'); await page.goForward(); await expect(page.getByRole('button', { name: '概要', exact: true })).toBeVisible(); await back(page); await expect(search).toHaveValue('キッチン');
  await search.fill('存在しない企画'); await expect(page.getByText('一致する企画が見つかりませんでした。')).toBeVisible(); await page.getByRole('button', { name: '条件をクリア', exact: true }).click(); await expect(page.locator('.project-card')).toHaveCount(4);
});
const proposalValues: Record<string, string> = {
  '企画名': '中庭の上映会', '背景・課題': '寮生同士が交流する機会が少ない。', '目的': '寮生の交流を増やす', '実施内容': '中庭で映画上映会を行う。', '実施日時': '未定', '場所': '中庭', '対象・人数': '寮生20人を予定', '担当・役割': '責任者は未定。設営と片づけを分担する。', '準備・当日の手順': '利用条件を確認する\n設営する\n上映後に片づける', '安全・確認事項': '利用時間と音量を管理事務所へ確認する。', '予算・調達方法': '未確認。機材は借用を検討。', '成果・振り返り方法': '参加者へ感想を聞く', '提出先': '管理事務所', '提出日': '未定'
};
const startProposal = async (page: Page) => { await boot(page); await page.getByRole('button', { name: 'アイデアを投稿', exact: true }).click(); await page.getByRole('button', { name: '企画を作成', exact: true }).click(); await expect(page.getByRole('heading', { name: '企画書を作成', exact: true })).toBeVisible(); };
const fillProposal = async (page: Page) => { for (const [label, value] of Object.entries(proposalValues)) await page.getByLabel(`企画書の${label}`, { exact: true }).fill(value); };
const openDistribution = async (page: Page) => { return page.getByLabel('振り分け用の音声・メモ', { exact: true }); };
test('項目入力からAI呼出しなしで企画書を確認・修正・登録し再読込', async ({ page }) => {
  const calls: string[] = []; page.on('request', request => { if (request.url().includes('/api/ai')) calls.push(request.postData() || ''); }); await startProposal(page); await page.getByLabel('企画の種類').selectOption('event'); await fillProposal(page);
  await page.getByRole('button', { name: '企画書を確認', exact: true }).click(); const preview = page.getByRole('article', { name: '企画書プレビュー' }); for (const value of Object.values(proposalValues)) await expect(preview).toContainText(value);
  await page.getByRole('button', { name: '入力内容を直す', exact: true }).click(); await page.getByLabel('企画書の企画名', { exact: true }).fill('交流上映会の運用確認'); await page.getByRole('button', { name: '企画書を確認', exact: true }).click(); await page.getByRole('button', { name: 'この内容で企画を登録', exact: true }).click(); await expect(page.getByRole('heading', { name: '交流上映会の運用確認', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '企画書', exact: true }).click(); await expect(page.locator('.proposal-saved-details')).toContainText('寮生20人'); await expect(page.locator('.proposal-saved-details')).toContainText('利用時間と音量');
  await page.reload(); await nav(page, '進行中'); await page.getByPlaceholder('企画を検索').fill('交流上映会の運用確認'); await page.locator('.project-card').click(); await page.getByRole('button', { name: '企画書', exact: true }).click(); await expect(page.locator('.proposal-saved-details')).toContainText('参加者へ感想を聞く');
  await page.getByRole('button', { name: '編集する', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: '保存する', exact: true }).click(); await expect(page.locator('.proposal-saved-details')).toContainText('利用時間と音量');
  expect(await page.evaluate(() => { const doc = JSON.parse(localStorage.getItem('tn_db_projects')!).find((p: any) => p.title === '交流上映会の運用確認').proposalDoc; return [doc.implementationDate, doc.location, doc.responsible, doc.requirements.length, doc.expectedImpact]; })).toEqual(['未定', '中庭', proposalValues['担当・役割'], 1, proposalValues['成果・振り返り方法']]); expect(calls).toEqual([]);
});
test('文字の自動分配は項目名から行い、入力済み項目は確認して反映', async ({ page }) => {
  const calls: any[] = []; page.on('request', request => { if (request.url().includes('/api/ai')) calls.push(request.postDataJSON()); }); await startProposal(page); await page.getByLabel('企画書の目的', { exact: true }).fill('手入力した目的'); const memo = await openDistribution(page); await memo.fill('目的は寮生の交流。場所は中庭。'); expect(calls).toHaveLength(0); await page.getByRole('button', { name: '入力内容を自動分配', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '目的へ反映' })).not.toBeChecked(); await expect(page.getByRole('checkbox', { name: '場所へ反映' })).toBeChecked(); await page.getByRole('button', { name: '選択した項目に反映', exact: true }).click(); await expect(page.getByLabel('企画書の目的', { exact: true })).toHaveValue('手入力した目的'); await expect(page.getByLabel('企画書の場所', { exact: true })).toHaveValue('中庭'); expect(calls).toEqual([]);
});
test('分類失敗・捏造出力・中止でメモと入力項目を保持し再試行', async ({ page }) => {
  await startProposal(page); await page.getByLabel('企画書の企画名', { exact: true }).fill('入力済みの企画'); const memo = await openDistribution(page);
  for (const text of ['接続失敗のテスト', '不正応答のテスト', '捏造のテスト']) { await memo.fill(text); await page.getByRole('button', { name: '入力内容を自動分配', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible(); await expect(memo).toHaveValue(text); await expect(page.getByLabel('企画書の企画名', { exact: true })).toHaveValue('入力済みの企画'); }
  await memo.fill('応答待ちの中庭上映会'); await page.getByRole('button', { name: '入力内容を自動分配', exact: true }).click(); await page.getByRole('button', { name: '振り分けを中止', exact: true }).click(); await expect(memo).toHaveValue('応答待ちの中庭上映会'); await expect(page.getByRole('region', { name: '振り分け候補' })).toHaveCount(0);
  await memo.fill('中庭で上映会を行う'); await page.getByRole('button', { name: '入力内容を自動分配', exact: true }).click(); await expect(page.getByRole('region', { name: '振り分け候補' })).toContainText('中庭で上映会');
});
test('必須項目を確認し下書きを再開、旧APIキーを使わない', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('team_note_gemini_api_key', 'retired-test-key')); await startProposal(page); await page.getByRole('button', { name: '企画書を確認', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('企画名を入力'); await expect(page.getByRole('article', { name: '企画書プレビュー' })).toHaveCount(0);
  await fillProposal(page); await page.getByRole('button', { name: '下書きを保存', exact: true }).click(); await expect(page.getByRole('status')).toContainText('下書きを保存'); await page.reload(); await page.getByRole('button', { name: 'アイデアを投稿', exact: true }).click(); await page.getByRole('button', { name: '企画を作成', exact: true }).click(); await expect(page.getByLabel('企画書の担当・役割', { exact: true })).toHaveValue(proposalValues['担当・役割']); expect(await page.evaluate(() => localStorage.getItem('team_note_gemini_api_key'))).toBeNull();
});
test('音声非対応でも同じ入力欄から報告書を確認・保存・復元', async ({ page }) => {
  await page.addInitScript(() => { (window as any).SpeechRecognition = undefined; (window as any).webkitSpeechRecognition = undefined; }); await boot(page); await nav(page, 'はたらく'); await expect(page.getByText(/このブラウザでは音声入力ボタンを使えません/)).toBeVisible();
  await expect(page.getByRole('button', { name: '報告内容を音声入力' })).toBeDisabled();
  const body = '今日の夕方、共有キッチンの棚を整理しました。使いかけの物が分かるようになりました。洗剤の補充が必要です。';
  await page.getByLabel('報告の実施内容と結果').fill(body);
  await expect(page.locator('.voice-report')).toHaveCount(0);
  await page.getByRole('button', { name: '報告書を確認する', exact: true }).click(); await expect(page.locator('.work-review')).toContainText(body);
  await page.getByRole('button', { name: '内容を直す', exact: true }).click(); await page.getByLabel('報告の業務名').fill('棚の整理と補充依頼'); await page.getByRole('button', { name: '報告書を確認する', exact: true }).click(); await page.getByRole('button', { name: 'この内容で報告書を保存', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: '報告書を保存しました' })).toBeVisible();
  await page.reload(); await nav(page, 'はたらく'); await expect(page.getByText('棚の整理と補充依頼', { exact: true })).toBeVisible();
});
test('手入力→音声追記→手修正→音声追記で同じ本文を維持し保存', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__engines = []; (window as any).SpeechRecognition = class { onstart?: () => void; onend?: () => void; aborted = false; constructor() { (window as any).__engines.push(this); } start() { this.onstart?.(); } stop() { this.onend?.(); } abort() { this.aborted = true; this.onend?.(); } }; });
  await boot(page); await nav(page, 'はたらく'); const input = page.getByLabel('報告の実施内容と結果');
  await input.fill('今日、共有キッチンを清掃しました。'); await page.getByLabel('報告の業務名').fill('キッチン清掃');
  const mic = page.getByRole('button', { name: '報告内容を音声入力', exact: true });
  const emit = (text: string, final: boolean) => page.evaluate(({ text, final }) => (window as any).__engines.at(-1).onresult({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: text } }] }), { text, final });
  await mic.click(); await emit('異常はありません', false); await expect(input).toHaveValue('今日、共有キッチンを清掃しました。');
  await emit('異常はありません。', true); await page.getByRole('button', { name: '音声入力を止める', exact: true }).click(); await expect(input).toHaveValue('今日、共有キッチンを清掃しました。 異常はありません。');
  await input.fill('今日、共有キッチンの床を清掃しました。異常はありません。'); await mic.click(); await emit('洗剤の補充をお願いします。', true); await page.getByRole('button', { name: '音声入力を止める', exact: true }).click();
  await expect(input).toHaveValue('今日、共有キッチンの床を清掃しました。異常はありません。 洗剤の補充をお願いします。'); await expect(page.getByLabel('報告の業務名')).toHaveValue('キッチン清掃');
  await page.getByRole('button', { name: '報告書を確認する', exact: true }).click(); await expect(page.locator('.work-review')).toContainText('床を清掃しました'); await expect(page.locator('.work-review')).toContainText('洗剤の補充をお願いします');
  await page.getByRole('button', { name: 'この内容で報告書を保存', exact: true }).click(); await page.reload(); await nav(page, 'はたらく'); await expect(page.getByText('キッチン清掃', { exact: true })).toBeVisible();
});
test('マイク拒否・画面離脱でも同じ報告本文を保持', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__engines = []; (window as any).SpeechRecognition = class { onstart?: () => void; onend?: () => void; aborted = false; constructor() { (window as any).__engines.push(this); } start() { this.onstart?.(); } stop() { this.onend?.(); } abort() { this.aborted = true; this.onend?.(); } }; });
  await boot(page); await nav(page, 'はたらく'); await page.getByLabel('報告の実施内容と結果').fill('清掃を実施しました。'); await page.getByRole('button', { name: '報告内容を音声入力' }).click(); await page.evaluate(() => (window as any).__engines.at(-1).onerror({ error: 'not-allowed' })); await expect(page.getByRole('alert')).toContainText('マイクの利用が許可されていません'); await expect(page.getByLabel('報告の実施内容と結果')).toHaveValue('清掃を実施しました。');
  await page.getByRole('button', { name: '報告内容を音声入力' }).click(); await nav(page, '進行中'); expect(await page.evaluate(() => (window as any).__engines.at(-1).aborted)).toBe(true); await nav(page, 'はたらく'); await expect(page.getByLabel('報告の実施内容と結果')).toHaveValue('清掃を実施しました。');
});
test('報告の保存失敗時にも内容を保持して再試行', async ({ page }) => {
  await boot(page); await nav(page, 'はたらく'); await page.getByLabel('報告の業務名').fill('保存失敗時の確認'); await page.getByLabel('報告の実施内容と結果').fill('見回りを実施。異常はありません。'); await page.getByRole('button', { name: '報告書を確認する', exact: true }).click();
  await page.evaluate(() => { const original = Storage.prototype.setItem; (window as any).__restoreStorage = () => Storage.prototype.setItem = original; Storage.prototype.setItem = function(key, value) { if (key.includes('work_reports')) throw new Error('quota'); return original.call(this, key, value); }; });
  await page.getByRole('button', { name: 'この内容で報告書を保存', exact: true }).click(); await expect(page.getByRole('alert').first()).toContainText('保存できませんでした'); await expect(page.locator('.work-review')).toContainText('保存失敗時の確認'); await page.evaluate(() => (window as any).__restoreStorage()); await page.getByRole('button', { name: 'この内容で報告書を保存', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: '報告書を保存しました' })).toBeVisible();
});
test('名簿・備品・年度別資料と戻り先', async ({ page }) => {
  await boot(page); await nav(page, '保管する');
  for (const [name, heading] of [['備品在庫', '備品在庫'], ['年度別資料', '年度別資料'], ['寮生名簿', '寮生名簿']]) { await page.getByRole('button', { name: new RegExp('^' + name) }).click(); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible(); await back(page); await expect(page.getByRole('heading', { name: '保管する', exact: true })).toBeVisible(); }
});
test('プロフィールを開いて直前の画面へ戻る', async ({ page }) => {
  await boot(page); await nav(page, 'はたらく'); await page.getByLabel('報告の業務名').fill('プロフィール移動前の報告'); await page.getByRole('button', { name: '利用者のプロフィール・切り替え' }).click(); await expect(page.getByRole('heading', { name: 'プロフィール', exact: true })).toBeVisible(); await back(page); await expect(page.getByLabel('報告の業務名')).toHaveValue('プロフィール移動前の報告');
});
test('月次報告のダイアログを開き、Escapeで閉じる', async ({ page }) => {
  await boot(page); await nav(page, 'はたらく'); await page.getByRole('button', { name: '西松地所レポート作成', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('heading', { name: '業務報告', exact: true })).toBeVisible();
});
test('右上の動き操作を削除し、既存の停止設定とOSの減動を保持', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tn_motion_paused', 'true')); await boot(page); await expect(page.getByRole('button', { name: /アニメーションを停止|アニメーションを再開/ })).toHaveCount(0); await expect(page.locator('header').getByText('動き', { exact: true })).toHaveCount(0); await expect(page.locator('.app-shell')).toHaveAttribute('data-motion-paused', 'true'); await expect(page.locator('.idea-layer')).toHaveAttribute('data-rotation-paused', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.locator('.idea-card').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
test('320・390・768・1440pxで全タブと企画詳細が画面内に収まる', async ({ page }) => {
  await boot(page); for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); for (const name of ['アイデア', '進行中', 'はたらく', '保管する']) { await nav(page, name); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${width}px ${name}`).toBe(false); } }
});
test('タッチサイズ・キーボードでナビと企画を操作', async ({ page }) => {
  await boot(page); const buttons = page.getByRole('navigation').getByRole('button'); for (const button of await buttons.all()) { const box = await button.boundingBox(); expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44); }
  await buttons.nth(1).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('heading', { name: '進行中', exact: true })).toBeVisible(); await page.locator('.project-card').first().focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('button', { name: '概要', exact: true })).toBeVisible();
});

test('企画書・編集・資料プレビュー・班・工程・議事録・振り返り・運用ルール', async ({ page }) => {
  await boot(page); await openProject(page);
  await page.getByRole('button', { name: '企画書', exact: true }).click(); await page.getByRole('button', { name: '編集する', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'プレビュー', exact: true }).click(); await expect(page.getByText('会場レイアウト図面', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'プレビューを閉じる', exact: true }).click();
  await page.getByRole('button', { name: 'スタッフ', exact: true }).click(); await page.getByRole('button', { name: '＋ 班を追加', exact: true }).click(); await page.getByPlaceholder('会場班').fill('実証テスト班'); await page.getByRole('button', { name: '班を追加する', exact: true }).click(); await expect(page.getByText('実証テスト班', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '概要', exact: true }).click(); await page.getByRole('button', { name: '＋ ステップを追加', exact: true }).click(); await page.getByPlaceholder('会場の下見').fill('利用条件を確認する'); await page.getByRole('dialog').getByRole('button', { name: 'ステップを追加', exact: true }).click(); await expect(page.getByText('利用条件を確認する', { exact: true })).toBeVisible();
  await page.getByText('利用条件を確認する', { exact: true }).click(); await page.getByRole('button', { name: '議事録', exact: true }).click(); await page.getByRole('button', { name: '議事録を追加', exact: true }).click(); await expect(page.getByRole('heading', { name: '議事録を作る', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await page.getByRole('button', { name: '振り返り', exact: true }).click(); await page.getByRole('button', { name: '振り返りを記録', exact: true }).click(); await expect(page.getByPlaceholder('落ち着いて状況を整理し、丁寧に対応できるところ。')).toBeVisible(); await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await page.getByRole('button', { name: '運用ルール', exact: true }).click(); await expect(page.getByText('使い終わったら、シンクと作業台を清掃する。')).toBeVisible();
});

test('分類中にメモを変えたら古い候補を混入させない', async ({ page }) => {
  await startProposal(page); const memo = await openDistribution(page); await memo.fill('応答待ちの中庭の上映会'); await page.getByRole('button', { name: '入力内容を自動分配', exact: true }).click(); await memo.fill('キッチンの整理を行う'); await page.waitForTimeout(2100); await expect(page.getByRole('region', { name: '振り分け候補' })).toHaveCount(0); await expect(memo).toHaveValue('キッチンの整理を行う');
});

test('スタッフ加入・離脱・再加入の履歴を自動表示、編集導線なし', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('tn_db_projects')) localStorage.setItem('tn_db_projects', JSON.stringify([{ id: 'history-event', title: 'スタッフ履歴の確認イベント', category: '生活文化・交流', status: '進行中', progress: 10, owner: '担当者', ownerId: 'r2', nextAction: 'スタッフ募集', createdAt: '2026-10-19', members: [] }])); });
  await boot(page); await nav(page, '進行中'); await page.locator('.project-card').first().click(); await page.getByRole('button', { name: '参加する', exact: true }).click();
  const profile = async () => { await page.getByRole('button', { name: '利用者のプロフィール・切り替え' }).click(); return page.getByRole('region', { name: '活動履歴' }); };
  let history = await profile(); await expect(history).toContainText('スタッフ履歴の確認イベント'); await expect(history).toContainText('参加中'); await expect(history.getByRole('button')).toHaveCount(0); await expect(page.getByRole('button', { name: '履歴を追加', exact: true })).toHaveCount(0);
  await back(page); await page.getByRole('button', { name: '参加中', exact: true }).click(); history = await profile(); await expect(history).toContainText('参加終了'); await page.reload(); history = await profile(); await expect(history).toContainText('参加終了');
  await nav(page, '進行中'); await page.locator('.project-card').first().click(); await page.getByRole('button', { name: '参加する', exact: true }).click(); history = await profile(); await expect(history.locator('article')).toHaveCount(2); await expect(history).toContainText('参加中'); await expect(history).toContainText('参加終了');
});
test('担当・班・完了を加入元から表示し、プロフィール更新で経歴を改変できない', async ({ page }) => {
  await boot(page);
  await page.evaluate(async () => {
    const { dbService } = await import('/src/lib/db.ts' as string);
    const projects = await dbService.getProjects(); const project = projects[0]; const user = dbService.getCurrentUser();
    if (!project.members.some((m: any) => m.residentId === user.id)) await dbService.joinProject(project.id, user);
    await dbService.assignEventRole(project.id, user.id, 'GL', '運営班');
    await dbService.updateResident(user.id, { projectHistory: [{ id: 'fake', projectTitle: '架空の自己申告', role: 'PL' }], careers: [] });
    const current = await dbService.getProjects(); current[0].status = '完了'; localStorage.setItem('tn_db_projects', JSON.stringify(current));
  });
  await page.reload(); await page.getByRole('button', { name: '利用者のプロフィール・切り替え' }).click(); const history = page.getByRole('region', { name: '活動履歴' }); await expect(history).toContainText('GL・運営班'); await expect(history).toContainText('完了'); await expect(history).not.toContainText('架空の自己申告');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tn_db_residents')!).find((r: any) => r.id === 'r1').projectHistory?.some((h: any) => h.id === 'fake') || false)).toBe(false);
});

test('スタッフ直接追加も履歴へ反映し、重複追加・削除で記録を失わない', async ({ page }) => {
  await boot(page);
  const title = await page.evaluate(async () => {
    const { dbService } = await import('/src/lib/db.ts' as string); const user = dbService.getCurrentUser();
    const created = await dbService.addProject({ title: '直接追加の履歴テスト', category: '生活文化・交流', status: '進行中', progress: 0, owner: '担当者', nextAction: '準備', members: [] });
    const member = { residentId: user.id, name: user.name, avatar: user.avatar, building: user.building, role: 'スタッフ', eventRole: 'GL', groupName: '会場班', joinedAt: '2026-10-19' };
    await dbService.addStaffMemberToProject(created.id, member); await dbService.addStaffMemberToProject(created.id, member);
    return created.title;
  });
  await page.reload(); await page.getByRole('button', { name: '利用者のプロフィール・切り替え' }).click(); let history = page.getByRole('region', { name: '活動履歴' }); await expect(history.locator('article').filter({ hasText: title })).toHaveCount(1); await expect(history).toContainText('GL・会場班');
  await page.evaluate(async () => { const { dbService } = await import('/src/lib/db.ts' as string); const project = (await dbService.getProjects()).find((p: any) => p.title === '直接追加の履歴テスト'); await dbService.removeStaffMemberFromProject(project.id, dbService.getCurrentUser().id); });
  await page.reload(); await page.getByRole('button', { name: '利用者のプロフィール・切り替え' }).click(); history = page.getByRole('region', { name: '活動履歴' }); const item = history.locator('article').filter({ hasText: title }); await expect(item).toHaveCount(1); await expect(item).toContainText('参加終了'); await expect(item).toContainText('GL・会場班');
});

const openInventory = async (page: Page) => { await nav(page, '保管する'); await page.getByRole('button', { name: /^備品在庫/ }).click(); await expect(page.getByRole('heading', { name: '備品在庫', exact: true })).toBeVisible(); };
const uploadInventory = (page: Page, buffer: Buffer, name = '備品台帳.csv') => page.getByLabel('備品台帳のExcel・CSV').setInputFiles({ name, mimeType: name.endsWith('xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', buffer });
const importInventoryButton = (page: Page) => page.getByRole('button', { name: 'この内容を備品台帳に反映', exact: true });

test('Excelの複数シート・見出し行を選び、確認後に反映して保存', async ({ page }) => {
  const { inventoryXlsx } = await import('./inventory-fixtures'); await boot(page); await openInventory(page);
  await expect(page.getByText('備品はまだ登録されていません。', { exact: false })).toBeVisible();
  await uploadInventory(page, inventoryXlsx, '寮の備品.xlsx'); await expect(page.getByLabel('取り込むシート')).toBeVisible(); await page.getByLabel('取り込むシート').selectOption('1'); await expect(page.getByLabel('見出し行')).toHaveValue('2');
  await expect(page.locator('.inventory-summary')).toContainText('2件新規'); await expect(page.locator('.inventory-list article')).toHaveCount(0);
  for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); }
  await importInventoryButton(page).click(); await expect(page.getByRole('status')).toContainText('2件追加'); await expect(page.locator('.inventory-list article')).toHaveCount(2); const chair = page.locator('.inventory-item').filter({ hasText: 'パイプ椅子' }); await expect(chair).toContainText('12 脚'); await expect(chair).toContainText('管理番号 001');
  await page.getByRole('button', { name: '要確認', exact: true }).click(); await expect(page.locator('.inventory-item')).toHaveCount(1); await expect(page.locator('.inventory-item')).toContainText('延長コード'); await page.getByRole('button', { name: 'すべて', exact: true }).click(); await page.getByLabel('備品を検索').fill('コモンズ'); await expect(page.locator('.inventory-item')).toHaveCount(1);
  await page.reload(); await openInventory(page); await expect(page.locator('.inventory-item')).toHaveCount(2); await expect(page.locator('.inventory-item').filter({ hasText: '延長コード' })).toContainText('0 本');
});
test('CSVの列を手動対応し、引用符内の改行・カンマと数量未記録を保持', async ({ page }) => {
  await boot(page); await openInventory(page);
  await uploadInventory(page, Buffer.from('コード,アイテム,残数,置き場,注記\r\nA1,救急箱,,管理室,"包帯,テープ\n補充予定"\r\n'));
  await expect(page.getByLabel('備品名の列')).toBeVisible(); await expect(importInventoryButton(page)).toBeDisabled();
  for (const [label, column] of [['管理番号', '0'], ['備品名', '1'], ['数量', '2'], ['保管場所', '3'], ['備考', '4']]) await page.getByLabel(`${label}の列`, { exact: true }).selectOption(column);
  await importInventoryButton(page).click(); const item = page.locator('.inventory-item'); await expect(item).toContainText('救急箱'); await expect(item).toContainText('数量 未記録'); await expect(item).toContainText('包帯,テープ'); await expect(item).toContainText('補充予定');
});
test('再取り込みは重複・加算せず更新し、資料にない列と備品を残す', async ({ page }) => {
  const { inventoryXlsx } = await import('./inventory-fixtures'); await boot(page); await openInventory(page); await uploadInventory(page, inventoryXlsx, '台帳.xlsx'); await page.getByLabel('取り込むシート').selectOption('1'); await importInventoryButton(page).click();
  const update = Buffer.from('管理番号,備品名,数量\n001,パイプ椅子,8\n'); await uploadInventory(page, update); await expect(page.locator('.inventory-summary')).toContainText('1件更新'); await importInventoryButton(page).click();
  let chair = page.locator('.inventory-item').filter({ hasText: 'パイプ椅子' }); await expect(chair).toContainText('8 脚'); await expect(chair).toContainText('コモンズ'); await expect(chair).toContainText('折りたたみ'); await expect(page.locator('.inventory-item')).toHaveCount(2);
  await uploadInventory(page, update); await expect(page.locator('.inventory-summary')).toContainText('1件変更なし'); await importInventoryButton(page).click(); await expect(chair).toContainText('8 脚');
  await uploadInventory(page, Buffer.from('備品名,数量\nパイプ椅子,7\n')); await expect(page.locator('.inventory-summary')).toContainText('1件更新'); await importInventoryButton(page).click(); chair = page.locator('.inventory-item').filter({ hasText: 'パイプ椅子' }); await expect(chair).toContainText('7 脚'); await expect(chair).toContainText('コモンズ'); await expect(page.locator('.inventory-item')).toHaveCount(2);
});
test('不正な数量・備品名なし・重複を行番号付きで確認し、明示した行だけ保存', async ({ page }) => {
  await boot(page); await openInventory(page); await uploadInventory(page, Buffer.from('備品名,数量,保管場所\nマイク,2,倉庫\nケーブル,-1,倉庫\n,4,倉庫\nマイク,2,倉庫\n'));
  await expect(page.locator('.inventory-issues')).toContainText('3行に確認が必要'); await expect(page.locator('.inventory-issues')).toContainText('3行目'); await expect(page.locator('.inventory-issues')).toContainText('数量は合算しません'); await expect(importInventoryButton(page)).toBeDisabled(); await expect(page.locator('.inventory-item')).toHaveCount(0);
  await page.getByRole('checkbox', { name: '問題のない1件だけ取り込む' }).check(); await importInventoryButton(page).click(); await expect(page.locator('.inventory-item')).toHaveCount(1); await expect(page.getByRole('status')).toContainText('3行は反映せず'); await expect(page.locator('.inventory-item')).toContainText('数量 2');
});
test('形式不正・2MB超・空ファイル・取り消しで既存台帳を変更しない', async ({ page }) => {
  await boot(page); await openInventory(page); await uploadInventory(page, Buffer.from('備品名,数量\nほうき,2\n')); await expect(importInventoryButton(page)).toBeEnabled(); await page.getByRole('button', { name: '取り込みをキャンセル' }).click(); await expect(page.locator('.inventory-item')).toHaveCount(0);
  await uploadInventory(page, Buffer.from('not an excel file'), '壊れた.xlsx'); await expect(page.getByRole('alert')).toContainText('Excelを読み込めません'); await uploadInventory(page, Buffer.from('x'), '旧台帳.xls'); await expect(page.getByRole('alert')).toContainText('.xlsxかCSVへ変換'); await uploadInventory(page, Buffer.alloc(2 * 1024 * 1024 + 1), '大きい.csv'); await expect(page.getByRole('alert')).toContainText('2MBまで'); await uploadInventory(page, Buffer.from(''), '空.csv'); await expect(page.getByRole('alert')).toContainText('読み込める表がありません'); await expect(page.locator('.inventory-item')).toHaveCount(0);
});
test('Shift_JISのCSVと入力用CSVに対応', async ({ page }) => {
  const { inventoryShiftJisCsv } = await import('./inventory-fixtures'); await boot(page); await openInventory(page); const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '入力用CSV', exact: true }).click(); const download = await downloadEvent; expect(download.suggestedFilename()).toBe('備品台帳_入力用.csv');
  await uploadInventory(page, inventoryShiftJisCsv); await expect(page.locator('.inventory-summary')).toContainText('1件新規'); await importInventoryButton(page).click(); await expect(page.locator('.inventory-item')).toContainText('ほうき'); await expect(page.locator('.inventory-item')).toContainText('3 本'); await expect(page.locator('.inventory-item')).toContainText('清掃倉庫');
});
test('台帳の保存失敗でも取り込み内容を残し再試行できる', async ({ page }) => {
  await boot(page); await openInventory(page); await uploadInventory(page, Buffer.from('備品名,数量\n救急箱,2\n')); await expect(importInventoryButton(page)).toBeEnabled();
  await page.evaluate(() => { const original = Storage.prototype.setItem; (window as any).__restoreInventoryStorage = () => Storage.prototype.setItem = original; Storage.prototype.setItem = function(key, value) { if (key.startsWith('tn_inventory:')) throw new Error('quota'); return original.call(this, key, value); }; });
  await importInventoryButton(page).click(); await expect(page.getByRole('alert')).toContainText('現在の台帳は変更していません'); await expect(page.locator('.inventory-item')).toHaveCount(0); await expect(page.locator('.inventory-preview')).toContainText('救急箱'); await page.evaluate(() => (window as any).__restoreInventoryStorage()); await importInventoryButton(page).click(); await expect(page.locator('.inventory-item')).toHaveCount(1);
});
test('別の操作による台帳更新を検出して確認し直し、未読込データを上書きしない', async ({ page }) => {
  await boot(page); await openInventory(page); await uploadInventory(page, Buffer.from('備品名,数量\n救急箱,2\n')); await expect(importInventoryButton(page)).toBeEnabled();
  await page.evaluate(() => localStorage.setItem('tn_inventory:h-village:v1', JSON.stringify({ version: 1, items: [{ id: 'existing', name: '他の操作で登録した椅子', assetCode: 'existing', quantity: 1, unit: '脚', location: '倉庫', status: '良好', note: '', updatedAt: new Date().toISOString(), source: { file: '既存.csv', sheet: 'CSV', row: 2 } }] })));
  await importInventoryButton(page).click(); await expect(page.getByRole('alert')).toContainText('台帳が更新されました'); await expect(page.locator('.inventory-item')).toHaveCount(1); await importInventoryButton(page).click(); await expect(page.locator('.inventory-item')).toHaveCount(2);
});

test('数量の誤った桁区切りと上限を拒否し、小数の数量を丸めない', async ({ page }) => {
  await boot(page); await openInventory(page); await uploadInventory(page, Buffer.from('備品名,数量\n用具A,"1,2"\n用具B,1e21\n液体洗剤,0.0001\n'));
  await expect(page.locator('.inventory-issues')).toContainText('2行に確認が必要'); await expect(page.locator('.inventory-issues')).toContainText('桁区切り'); await expect(importInventoryButton(page)).toBeDisabled(); await page.getByRole('checkbox', { name: '問題のない1件だけ取り込む' }).check(); await importInventoryButton(page).click(); await expect(page.locator('.inventory-item')).toContainText('数量 0.0001');
});
test('保存済みの台帳が不正なときは読み込みを止め上書きしない', async ({ page }) => {
  const original = JSON.stringify({ version: 1, items: [{ id: 'bad', name: '不正な台帳' }] }); await page.addInitScript(value => localStorage.setItem('tn_inventory:h-village:v1', value), original); await boot(page); await openInventory(page); await expect(page.getByRole('alert')).toContainText('上書きせずに停止'); await expect(page.getByRole('button', { name: 'Excel・CSVを選択', exact: true })).toBeDisabled(); expect(await page.evaluate(() => localStorage.getItem('tn_inventory:h-village:v1'))).toBe(original);
});

test('入力用CSVの説明・記入例・入力欄が整い、記入例を登録せず再取込できる', async ({ page }) => {
  const { readFile } = await import('node:fs/promises'); const { parseCsv, guessHeader, guessColumns, planInventoryImport } = await import('../src/lib/inventoryImport'); const { inventoryCsv } = await import('../src/lib/inventoryTemplate');
  await boot(page); await openInventory(page); const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: '入力用CSV', exact: true }).click(); const download = await downloading; const file = await readFile((await download.path())!); expect([...file.subarray(0, 3)]).toEqual([239, 187, 191]);
  const rows = parseCsv(file.toString('utf8')); expect(rows).toHaveLength(27); const header = guessHeader(rows); expect(header).toBe(6); expect(rows[header]).toEqual(['管理番号', '備品名', '数量', '単位', '保管場所', '状態', '備考']); expect(rows[2].join()).toContain('備品名は必須'); expect(rows[4].join()).toContain('修理中'); expect(rows[5].join()).toContain('取り込み対象外'); expect(rows.slice(header + 1)).toHaveLength(20);
  const blankPlan = planInventoryImport({ name: 'CSV', rows }, header, guessColumns(rows[header]), [], download.suggestedFilename()); expect(blankPlan.entries).toHaveLength(0); expect(blankPlan.issues).toHaveLength(0);
  await uploadInventory(page, file, download.suggestedFilename()); await expect(page.getByLabel('見出し行')).toHaveValue('7'); await expect(importInventoryButton(page)).toBeDisabled(); await expect(page.locator('.inventory-summary')).toContainText('0件新規');
  rows[header + 1] = ['BI-0020', '救急用品箱', '2', 'セット', '管理室', '良好', '包帯,テープ\n点検済み'];
  await uploadInventory(page, Buffer.from(inventoryCsv(rows)), '入力済み備品台帳.csv'); await expect(page.getByLabel('見出し行')).toHaveValue('7'); await expect(page.locator('.inventory-summary')).toContainText('1件新規'); await importInventoryButton(page).click(); await expect(page.locator('.inventory-item')).toHaveCount(1); await expect(page.locator('.inventory-item')).toContainText('救急用品箱'); await expect(page.locator('.inventory-item')).toContainText('包帯,テープ'); await expect(page.locator('.inventory-item')).not.toContainText('パイプ椅子');
});
test('備品在庫の横に小さな操作ボタンを置き、大きな取り込みカードを外す', async ({ page }) => {
  await boot(page); await openInventory(page); await expect(page.locator('.inventory-import')).toHaveCount(0); await expect(page.getByText('資料から備品を登録', { exact: true })).toHaveCount(0); await expect(page.getByText('Excel（.xlsx）・CSVを読み込み、確認して反映します。', { exact: true })).toHaveCount(0); await expect(page.getByText('2MB・1シート5,000件まで。この端末に保存します。', { exact: true })).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); const title = await page.getByRole('heading', { name: '備品在庫', exact: true }).boundingBox();
    for (const name of ['Excel・CSVを選択', '入力用CSV']) { const box = await page.getByRole('button', { name, exact: true }).boundingBox(); expect(box!.x).toBeGreaterThan(title!.x + title!.width); expect(box!.y).toBeLessThan(title!.y + title!.height); expect(box!.y + box!.height).toBeGreaterThan(title!.y); expect(box!.height).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});


const mockProposalSpeech = async (page: Page) => {
  await page.addInitScript(() => { (window as any).__engines = []; (window as any).SpeechRecognition = class { onstart?: () => void; onend?: () => void; aborted = false; constructor() { (window as any).__engines.push(this); } start() { this.onstart?.(); } stop() { this.onend?.(); } abort() { this.aborted = true; this.onend?.(); } }; });
};
const emitProposalSpeech = (page: Page, text: string, final = true) => page.evaluate(({ text, final }) => (window as any).__engines.at(-1).onresult({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: text } }] }), { text, final });
test('音声ボタンは全体の1つだけで、終了後に項目へ自動分配', async ({ page }) => {
  await mockProposalSpeech(page); const calls: string[] = []; page.on('request', request => { if (request.url().includes('/api/ai')) calls.push(request.url()); }); await startProposal(page);
  const memo = await openDistribution(page); await expect(page.locator('.proposal-input-form .proposal-mic')).toHaveCount(0); await expect(page.getByRole('button', { name: '企画全体を音声入力', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click(); await emitProposalSpeech(page, '目的は寮生の交流', false); await expect(memo).toHaveValue('');
  await emitProposalSpeech(page, '企画名は中庭上映会。目的は寮生の交流。場所は中庭。'); await expect(page.getByRole('region', { name: '振り分け候補' })).toHaveCount(0);
  await page.getByRole('button', { name: '音声入力を止める', exact: true }).click(); await expect(page.getByRole('region', { name: '振り分け候補' })).toBeVisible(); await page.getByRole('button', { name: '選択した項目に反映', exact: true }).click();
  await expect(page.getByLabel('企画書の企画名', { exact: true })).toHaveValue('中庭上映会'); await expect(page.getByLabel('企画書の目的', { exact: true })).toHaveValue('寮生の交流'); await expect(page.getByLabel('企画書の場所', { exact: true })).toHaveValue('中庭'); expect(calls).toEqual([]);
  await memo.fill('場所は食堂。'); await page.getByRole('button', { name: '入力内容を自動分配', exact: true }).click(); await expect(page.getByRole('checkbox', { name: '場所へ反映' })).not.toBeChecked(); await page.getByRole('checkbox', { name: '場所へ反映' }).check(); await page.getByRole('button', { name: '選択した項目に反映', exact: true }).click(); await expect(page.getByLabel('企画書の場所', { exact: true })).toHaveValue('食堂');
});
test('自由な音声は終了時だけWorkersで自動分類し、重複終了でも1回', async ({ page }) => {
  await mockProposalSpeech(page); const calls: any[] = []; page.on('request', request => { if (request.url().includes('/api/ai')) calls.push(request.postDataJSON()); }); await startProposal(page); await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click();
  await emitProposalSpeech(page, '中庭で上映会を行う', false); await emitProposalSpeech(page, '中庭で上映会を行う。場所は中庭。'); await emitProposalSpeech(page, '中庭で上映会を行う。場所は中庭。'); expect(calls).toEqual([]);
  await page.evaluate(() => { const engine = (window as any).__engines.at(-1); engine.onend(); engine.onend(); }); await expect(page.getByRole('region', { name: '振り分け候補' })).toContainText('中庭で上映会を行う'); expect(calls).toEqual([{ task: 'distribute', text: '中庭で上映会を行う。場所は中庭。' }]);
});
test('音声認識の拒否・無音終了・画面離脱ではAIを呼ばない', async ({ page }) => {
  await mockProposalSpeech(page); const calls: string[] = []; page.on('request', request => { if (request.url().includes('/api/ai')) calls.push(request.url()); }); await startProposal(page);
  await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click(); await page.getByRole('button', { name: '音声入力を止める', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('まだ声を聞き取れていません');
  await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click(); await emitProposalSpeech(page, '中庭で上映会を行う。'); await page.evaluate(() => (window as any).__engines.at(-1).onerror({ error: 'not-allowed' })); await expect(page.getByRole('alert')).toContainText('マイクの利用が許可されていません'); await expect(page.getByLabel('振り分け用の音声・メモ', { exact: true })).toHaveValue('中庭で上映会を行う。');
  await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click(); await emitProposalSpeech(page, '停止失敗時の続き'); await page.evaluate(() => { (window as any).__engines.at(-1).stop = () => { throw new Error('stop failed'); }; }); await page.getByRole('button', { name: '音声入力を止める', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('終了できませんでした');
  await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click(); await emitProposalSpeech(page, '自由な音声の続き'); await back(page); expect(await page.evaluate(() => (window as any).__engines.at(-1).aborted)).toBe(true); expect(calls).toEqual([]);
});
test('企画の登録失敗で入力を残し、再試行で二重登録しない', async ({ page }) => {
  await startProposal(page); await fillProposal(page); await page.getByRole('button', { name: '企画書を確認', exact: true }).click();
  await page.evaluate(() => { const original = Storage.prototype.setItem; (window as any).__restoreProjectStorage = () => Storage.prototype.setItem = original; Storage.prototype.setItem = function(key, value) { if (key === 'tn_db_projects') throw new Error('quota'); return original.call(this, key, value); }; });
  await page.getByRole('button', { name: 'この内容で企画を登録', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('登録できませんでした'); await expect(page.getByRole('article', { name: '企画書プレビュー' })).toContainText('寮生20人'); await page.evaluate(() => (window as any).__restoreProjectStorage()); await page.getByRole('button', { name: 'この内容で企画を登録', exact: true }).click(); await expect(page.getByRole('heading', { name: '中庭の上映会', exact: true })).toBeVisible(); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tn_db_projects')!).filter((p: any) => p.title === '中庭の上映会').length)).toBe(1);
});
test('新しい企画入力とプレビューを4画面幅で操作、印刷に入力内容が残る', async ({ page }) => {
  await startProposal(page); await fillProposal(page); for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); } await page.getByRole('button', { name: '企画書を確認', exact: true }).click();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); } await page.emulateMedia({ media: 'print' }); await expect(page.getByRole('article', { name: '企画書プレビュー' })).toContainText('利用時間と音量'); await expect(page.getByRole('button', { name: 'この内容で企画を登録', exact: true })).toBeHidden();
});


test('全体の音声が上限を超えてもメモと保存済みフォームを保持しAIを呼ばない', async ({ page }) => {
  await mockProposalSpeech(page); const calls: string[] = []; page.on('request', request => { if (request.url().includes('/api/ai')) calls.push(request.url()); }); await startProposal(page); const title = page.getByLabel('企画書の企画名', { exact: true }); await title.fill('保存済みの企画'); await page.getByRole('button', { name: '下書きを保存', exact: true }).click(); await page.getByRole('button', { name: '企画全体を音声入力', exact: true }).click(); await emitProposalSpeech(page, 'あ'.repeat(2401)); await page.getByRole('button', { name: '音声入力を止める', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('2400文字以内'); await expect(page.getByLabel('振り分け用の音声・メモ', { exact: true })).toHaveValue('あ'.repeat(2401)); await expect(title).toHaveValue('保存済みの企画'); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tn_proposal_form:r1:v1')!).form.title)).toBe('保存済みの企画'); expect(calls).toEqual([]);
});

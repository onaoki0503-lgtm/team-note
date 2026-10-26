import { test, expect, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createDemoReports, demoManager } from '../src/management/demo';

const uid = '00000000-0000-4000-8000-000000000001';
class ManagementFixture {
  rows = createDemoReports('2026-10').map((r, i) => ({ ...r, id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`, attachments: r.attachments.map(a => ({ ...a, path: 'h-village/reports/sample.pdf' })) }));
  failLogout = false; allowed = true; failReports = false; failReview = false; conflict = false;
  reportCalls: Record<string, string>[] = []; reviewCalls = 0; fileCalls = 0; residentCalls = 0;
  hold?: Promise<void>;
  async install(context: BrowserContext) {
    await context.addInitScript(({ uid }) => {
      const exp = Math.floor(Date.now() / 1000) + 86400;
      const token = [btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), btoa(JSON.stringify({ sub: uid, role: 'authenticated', exp })), 'test'].join('.');
      localStorage.setItem('tn_shared_auth:h-village', JSON.stringify({ access_token: token, refresh_token: 'fixture-refresh', expires_at: exp, expires_in: 86400, token_type: 'bearer', user: { id: uid, aud: 'authenticated', email: 'manager@example.invalid', app_metadata: {}, user_metadata: { role: 'admin' } } }));
    }, { uid });
    await context.route(/^https:\/\//, async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.hostname !== 'teamnote-test.invalid') return route.abort();
      const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.endsWith('/auth/v1/logout') && this.failLogout) return reply({ message: 'offline' }, 503);
      if (url.pathname.includes('/auth/v1/')) return reply(req.method() === 'POST' && url.pathname.endsWith('logout') ? {} : { id: uid, aud: 'authenticated' });
      const rpc = url.pathname.split('/').at(-1), args = req.postDataJSON() || {};
      if (rpc === 'tn_get_board') { this.residentCalls++; return reply({ code: '42501', message: 'teamnote_access_denied' }, 403); }
      if (rpc === 'tn_management_context') {
        if (!this.allowed) return reply({ code: '42501', message: 'teamnote_management_access_denied' }, 403);
        return reply({ ...demoManager, userId: uid });
      }
      if (rpc === 'tn_management_reports') {
        this.reportCalls.push(args);
        if (this.hold) await this.hold;
        if (!this.allowed) return reply({ code: '42501', message: 'teamnote_management_access_denied' }, 403);
        if (this.failReports) return reply({ code: 'XX000', message: 'network unavailable' }, 503);
        return reply(this.rows.filter(r => r.reportDate >= args.p_from && r.reportDate < args.p_before));
      }
      if (rpc === 'tn_management_set_review') {
        this.reviewCalls++;
        if (this.failReview) return reply({ code: 'XX000', message: 'offline' }, 503);
        const row = this.rows.find(r => r.id === args.p_report_id)!;
        if (this.conflict) {
          this.conflict = false; row.review = { reviewed: true, version: row.review.version + 1, reviewerName: '別の管理者', reviewedAt: '2026-10-26T01:00:00Z' };
          return reply({ code: '40001', message: 'teamnote_review_conflict' }, 409);
        }
        if (row.review.version !== args.p_expected_version) return reply({ code: '40001', message: 'teamnote_review_conflict' }, 409);
        row.review = { reviewed: args.p_reviewed, version: args.p_expected_version + 1, reviewerName: args.p_reviewed ? '管理担当' : '', reviewedAt: args.p_reviewed ? '2026-10-26T01:00:00Z' : null };
        return reply(row.review);
      }
      if (url.pathname.includes('/storage/v1/object/sign/')) {
        this.fileCalls++;
        if (req.method() === 'POST') return reply({ signedURL: '/object/sign/tn-files/h-village/reports/sample.pdf?token=fixture' });
        return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
      }
      return reply({ message: 'Unexpected fixture request' }, 400);
    });
  }
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-10-26T03:00:00Z')); });

test('管理者は寮生登録なしで提出報告を一覧・絞り込み・詳細確認できる', async ({ page, context }) => {
  const fixture = new ManagementFixture(); await fixture.install(context);
  await page.goto('/?view=management');
  await expect(page.getByRole('heading', { name: 'ダッシュボード', exact: true })).toBeVisible();
  await expect(page.locator('.mg-table tbody tr')).toHaveCount(8);
  await expect(page.locator('.mg-pagination')).toContainText('24件');
  expect(fixture.residentCalls).toBe(0);
  expect(fixture.reportCalls[0]).toMatchObject({ p_community: 'h-village', p_from: '2026-10-01', p_before: '2026-11-01' });
  await page.getByLabel('報告書を検索').fill('照明');
  await expect(page.locator('.mg-table tbody tr')).toHaveCount(3);
  await page.getByLabel('棟で絞り込む').selectOption('basil');
  await expect(page.locator('.mg-table tbody tr')).toHaveCount(3);
  const button = page.getByRole('button', { name: '共用廊下の照明不具合', exact: true }).first();
  await button.click(); const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('交換対応の確認をお願いします。');
  await expect(dialog).toContainText('バジル');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(button).toBeFocused();
});

test('確認状態は保存成功後に反映され、未確認へ戻す操作もできる', async ({ page, context }) => {
  const fixture = new ManagementFixture(); await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '確認済みにする', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('確認済みにしました。');
  expect(fixture.rows[0].review.version).toBe(1);
  await dialog.getByRole('button', { name: '未確認に戻す', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('未確認に戻しました。');
  expect(fixture.rows[0].review.version).toBe(2);
  await dialog.getByLabel('報告書を閉じる').click();
  await page.getByRole('navigation', { name: '管理メニュー' }).getByRole('button', { name: '未確認の報告書', exact: true }).click();
  await expect(page.locator('.mg-pagination')).toContainText('8件');
});

test('保存失敗は確認済みにせず、再試行で保存できる', async ({ page, context }) => {
  const fixture = new ManagementFixture(); fixture.failReview = true; await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: '確認済みにする', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('失敗しました');
  expect(fixture.rows[0].review.reviewed).toBe(false);
  fixture.failReview = false; await dialog.getByRole('button', { name: '確認済みにする', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('確認済み');
});

test('同時更新の競合を知らせ、最新の確認者と版に読み直す', async ({ page, context }) => {
  const fixture = new ManagementFixture(); fixture.conflict = true; await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: '確認済みにする', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('ほかの管理者が更新しました');
  await expect(dialog).toContainText('別の管理者 が確認済み');
  await dialog.getByRole('button', { name: '未確認に戻す', exact: true }).click();
  expect(fixture.rows[0].review.version).toBe(2);
});

test('自称adminの一般アカウントは拒否され、報告の取得も行わない', async ({ page, context }) => {
  const fixture = new ManagementFixture(); fixture.allowed = false; await fixture.install(context); await page.goto('/?view=management');
  await expect(page.getByRole('heading', { name: '管理者権限が必要です' })).toBeVisible();
  await expect(page.locator('.mg-table')).toHaveCount(0); expect(fixture.reportCalls).toHaveLength(0);
});

test('権限が取り消された後の更新で表示中のデータを消す', async ({ page, context }) => {
  const fixture = new ManagementFixture(); await fixture.install(context); await page.goto('/?view=management');
  await expect(page.locator('.mg-table')).toBeVisible(); fixture.allowed = false;
  await page.getByRole('button', { name: '更新', exact: true }).click();
  await expect(page.getByRole('heading', { name: '管理者権限が必要です' })).toBeVisible();
  await expect(page.locator('.mg-table')).toHaveCount(0);
});

test('実データ待ちは全画面スケルトン、取得失敗は空の報告書と誤表示しない', async ({ page, context }) => {
  let release!: () => void;
  const fixture = new ManagementFixture(); fixture.hold = new Promise(r => { release = r; }); fixture.failReports = true;
  await fixture.install(context); await page.goto('/?view=management');
  const skeleton = page.getByTestId('management-skeleton'); await expect(skeleton).toBeVisible();
  await expect.poll(async () => (await skeleton.boundingBox())?.width || 0).toBeGreaterThan(1000);
  await expect.poll(async () => (await skeleton.boundingBox())?.height || 0).toBeGreaterThan(700);
  release(); await expect(page.getByRole('heading', { name: '報告書を読み込めませんでした' })).toBeVisible();
  await expect(page.locator('.mg-metrics')).toHaveCount(0);
  fixture.failReports = false; fixture.hold = undefined; await page.getByRole('button', { name: '再読み込み', exact: true }).click();
  await expect(page.locator('.mg-table')).toBeVisible();
});

test('対象月の変更で別月の報告を混ぜず、前の月へ戻せる', async ({ page, context }) => {
  const fixture = new ManagementFixture(); await fixture.install(context); await page.goto('/?view=management');
  await expect(page.locator('.mg-table tbody tr')).toHaveCount(8); await page.getByLabel('前の月', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'この月の報告書はありません' })).toBeVisible();
  expect(fixture.reportCalls.at(-1)).toMatchObject({ p_from: '2026-09-01', p_before: '2026-10-01' });
  await page.getByLabel('次の月', { exact: true }).click(); await expect(page.locator('.mg-table tbody tr')).toHaveCount(8);
});

test('CSVは表示ページに限らず絞り込み対象全件を安全に書き出す', async ({ page, context }) => {
  const fixture = new ManagementFixture(); fixture.rows[0].title = '=DANGEROUS()'; await fixture.install(context); await page.goto('/?view=management');
  await expect(page.locator('.mg-table')).toBeVisible();
  const promise = page.waitForEvent('download'); await page.getByRole('button', { name: 'CSVを書き出す' }).click();
  const file = await promise, csv = await readFile((await file.path())!, 'utf8');
  expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain('"\'=DANGEROUS()"'); expect(csv).toContain('2026-10-02');
  expect(file.suggestedFilename()).toContain('2026-10.csv');
});

test('管理デモは共有DBに接続せず、業務別集計から一覧へ移れる', async ({ page, context }) => {
  let cloudRequests = 0; await context.route(/^https:\/\//, route => { cloudRequests++; return route.abort(); });
  await page.goto('/?view=management&demo=1');
  await expect(page.getByText('デモデータ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'トラブル対応 6件に絞り込む', exact: true }).click();
  await expect(page.getByRole('heading', { name: '提出報告書', exact: true }).first()).toBeVisible();
  await expect(page.locator('.mg-table tbody tr')).toHaveCount(6);
  expect(cloudRequests).toBe(0);
});

test('スマホ・タブレット・デスクトップで画面外にはみ出さず詳細を操作できる', async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto('/?view=management&demo=1');
    await expect(page.locator('.mg-table')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const box = await page.getByRole('dialog').boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
  }
});

test('動きを減らす設定を尊重し、通常時は背景が動く', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/?view=management&demo=1');
  await expect(page.locator('.mg-table')).toBeVisible();
  expect(await page.locator('.management-atmosphere').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('.management-atmosphere').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(3);
  await page.setViewportSize({ width: 1600, height: 1050 });
  await page.screenshot({ path: '/private/tmp/teamnote-management-desktop.png', fullPage: true, animations: 'disabled' });
});

test('添付は短時間の署名URLを取得してから開く', async ({ page, context }) => {
  const fixture = new ManagementFixture(); await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('dialog').getByRole('button', { name: /作業記録.pdf/ }).click();
  const opened = await popup; await opened.waitForURL('**/storage/v1/object/sign/tn-files/**');
  expect(fixture.fileCalls).toBeGreaterThanOrEqual(1); await opened.close();
});
test('別の寮の添付パスをサーバーへ送信しない', async ({ page, context }) => {
  const fixture = new ManagementFixture(); fixture.rows[0].attachments[0].path = 'another-community/reports/private.pdf';
  await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /作業記録.pdf/ }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('添付を開けませんでした'); expect(fixture.fileCalls).toBe(0);
});
test('詳細の印刷ではナビゲーションを含めない', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__printCalled = false; window.print = () => { (window as any).__printCalled = true; }; });
  await page.goto('/?view=management&demo=1');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '印刷', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__printCalled)).toBe(true);
  await page.emulateMedia({ media: 'print' }); await expect(page.locator('.mg-layout')).toBeHidden();
  await expect(page.getByRole('dialog').getByRole('heading', { name: '共用キッチンの清掃・備品確認' })).toBeVisible();
});

test('月別集計から提出者をIDで絞り込み、解除できる', async ({ page }) => {
  await page.goto('/?view=management&demo=1');
  await page.getByRole('navigation', { name: '管理メニュー' }).getByRole('button', { name: '月別集計', exact: true }).click();
  await expect(page.getByRole('heading', { name: '提出者別の集計' })).toBeVisible();
  await page.getByRole('button', { name: '寮生Aの報告を見る', exact: true }).click();
  await expect(page.locator('.mg-pagination')).toContainText('6件');
  await page.getByLabel('提出者の絞り込みを解除').click();
  await expect(page.locator('.mg-pagination')).toContainText('24件');
});

test('終了要求の通信が失敗しても端末のセッションと管理データを消す', async ({ page, context }) => {
  const fixture = new ManagementFixture(); fixture.failLogout = true; await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
  await expect(page.getByRole('heading', { name: '管理アカウントでログイン' })).toBeVisible();
  await expect(page.locator('.mg-table')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('tn_shared_auth:h-village'))).toBeNull();
});

test('不正な添付メタデータでも画面を壊さず、報告内のHTMLを文字として扱う', async ({ page, context }) => {
  const fixture = new ManagementFixture();
  fixture.rows[0].attachments = [null, { kind: 'file', label: '情報なし', path: 42 }] as any;
  fixture.rows[0].body = '<img src=x onerror=alert(1)>';
  await fixture.install(context); await page.goto('/?view=management');
  await page.getByRole('button', { name: '共用キッチンの清掃・備品確認', exact: true }).first().click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText('<img src=x onerror=alert(1)>');
  await expect(dialog.locator('img')).toHaveCount(0); await expect(dialog.getByRole('button', { name: /情報なし/ })).toBeDisabled();
});

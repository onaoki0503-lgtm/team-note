import { test, expect, type BrowserContext } from '@playwright/test';
import { createDemoReports, demoManager } from '../src/management/demo';
const uid = '00000000-0000-4000-8000-000000000001';
class Fixture {
  submissionFailure = false; submitted: ReturnType<typeof createDemoReports> = [];
  rows = createDemoReports('2026-10'); allowed = true; fail = false; malformed = false;
  calls: Record<string,string>[] = []; otherCalls: string[] = []; hold?: Promise<void>;
  async install(context: BrowserContext) {
    await context.addInitScript(({ uid }) => {
      const exp = Math.floor(Date.now()/1000)+86400;
      const token = [btoa(JSON.stringify({alg:'HS256',typ:'JWT'})), btoa(JSON.stringify({sub:uid,role:'authenticated',exp})), 'test'].join('.');
      localStorage.setItem('tn_shared_auth:h-village',JSON.stringify({access_token:token,refresh_token:'test',expires_at:exp,expires_in:86400,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{role:'admin'}}}));
    },{uid});
    await context.route(/^https:\/\//,async route => {
      const req=route.request(),url=new URL(req.url());
      if(url.hostname!=='teamnote-test.invalid') return route.abort();
      const reply=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname.includes('/auth/v1/'))return reply({id:uid,aud:'authenticated'});
      const rpc=url.pathname.split('/').at(-1),args=req.postDataJSON()||{};
      if(rpc==='tn_get_board')return reply({community:'h-village',revision:1,userId:uid,members:[{id:uid,name:'提出者A',role:'HL',roleType:'member',building:'rosemary',floor:3,unit:'301-A'}],ideas:[]});
      if(['tn_list_projects','tn_list_reports','tn_list_archives'].includes(rpc||''))return reply([]);
      if(rpc==='tn_submit_monthly_report'){
        if(this.submissionFailure)return reply({code:'XX000'},503);
        const report={id:'submitted-1',month:args.p_month.slice(0,7),body:args.p_body,submittedAt:'2026-10-26T03:00:00Z',author:{id:uid,name:'提出者A',role:'HL',building:'rosemary',unit:'301-A'}};
        this.submitted=[report];this.rows=this.submitted;
        return reply({id:report.id,month:report.month,submittedAt:report.submittedAt});
      }
      if(rpc==='tn_management_context')return this.allowed?reply({...demoManager,userId:uid}):reply({code:'42501'},403);
      if(rpc==='tn_management_monthly_reports'){
        this.calls.push(args);if(this.hold)await this.hold;
        if(!this.allowed)return reply({code:'42501'},403);
        if(this.fail)return reply({code:'XX000'},503);
        return reply(this.malformed ? [{id:'bad'}] : this.rows.filter(r=>`${r.month}-01`===args.p_month));
      }
      this.otherCalls.push(rpc||'');return reply({message:'unexpected'},400);
    });
  }
}
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-10-26T03:00:00Z'));});
test('月次提出一覧と全文だけを表示し、詳細を閉じるとフォーカスが戻る',async({page,context})=>{
  const f=new Fixture();await f.install(context);await page.goto('/?view=management&section=monthly');
  await expect(page.getByRole('heading',{name:'月次報告書',exact:true})).toBeVisible();
  await expect(page.locator('.mg-report-row')).toHaveCount(4);
  expect(f.calls[0]).toEqual({p_community:'h-village',p_month:'2026-10-01'});
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByText(/確認済み|月別集計|CSV|未確認/)).toHaveCount(0);
  const open=page.getByRole('button',{name:'寮生Aの月次報告書を開く'});await open.click();
  const d=page.getByRole('dialog');await expect(d).toContainText(f.rows[0].body);await expect(d).toContainText('ローズマリー');
  await expect(d.getByRole('button')).toHaveCount(1);
  await page.keyboard.press('Escape');await expect(d).toHaveCount(0);await expect(open).toBeFocused();
  expect(f.otherCalls).toEqual([]);
});
test('前月・翌月・直接指定で対象月を切り替え、未提出の月は空で表示する',async({page,context})=>{
  const f=new Fixture();await f.install(context);await page.goto('/?view=management&section=monthly');
  await page.getByRole('button',{name:'前の月'}).click();await expect(page.getByText('2026年9月の提出済み月次報告書はありません。')).toBeVisible();
  await page.getByRole('button',{name:'次の月'}).click();await expect(page.locator('.mg-report-row')).toHaveCount(4);
  await page.getByLabel('対象月').fill('2025-12');await expect(page.getByText('2025年12月の提出済み月次報告書はありません。')).toBeVisible();
  expect(f.calls.at(-1)?.p_month).toBe('2025-12-01');
});
test('全画面スケルトン・失敗・再読込を確認し、通信失敗を未提出扱いにしない',async({page,context})=>{
  const f=new Fixture();let release!:()=>void;f.hold=new Promise<void>(r=>{release=r});f.fail=true;await f.install(context);await page.goto('/?view=management&section=monthly');
  await expect(page.getByTestId('management-skeleton')).toBeVisible();release();
  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText(/提出済み月次報告書はありません/)).toHaveCount(0);
  f.fail=false;await page.getByRole('button',{name:'再読み込み'}).click();await expect(page.locator('.mg-report-row')).toHaveCount(4);
  f.fail=true;await page.getByRole('button',{name:'前の月'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('.mg-report-row')).toHaveCount(0);
});
test('プロフィールのadminでは管理者になれない',async({page,context})=>{
  const f=new Fixture();f.allowed=false;await f.install(context);await page.goto('/?view=management&section=monthly');
  await expect(page.getByRole('heading',{name:'管理者権限が必要です'})).toBeVisible();expect(f.calls).toHaveLength(0);
});
test('閲覧権限が取り消されたら報告内容を消す',async({page,context})=>{
  const f=new Fixture();await f.install(context);await page.goto('/?view=management&section=monthly');await expect(page.locator('.mg-report-row')).toHaveCount(4);f.allowed=false;
  await page.getByRole('button',{name:'前の月'}).click();await expect(page.getByRole('heading',{name:'管理者権限が必要です'})).toBeVisible();await expect(page.locator('.mg-report-row')).toHaveCount(0);
});
test('壊れた応答はエラーとし、HTMLは文書の文字として安全に読む',async({page,context})=>{
  const f=new Fixture();f.malformed=true;await f.install(context);await page.goto('/?view=management&section=monthly');await expect(page.getByRole('alert')).toBeVisible();
  f.malformed=false;f.rows[0].body='<img src=x onerror=alert(1)>\n月次報告';await page.getByRole('button',{name:'再読み込み'}).click();await page.getByRole('button',{name:'寮生Aの月次報告書を開く'}).click();await expect(page.getByRole('dialog')).toContainText(f.rows[0].body);await expect(page.getByRole('dialog').locator('img')).toHaveCount(0);
});
for(const width of [375,768,1440])test(`画面幅${width}で一覧・長い全文がはみ出さない`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/?view=management&section=monthly&demo=1');await expect(page.locator('.mg-report-row')).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'寮生Aの月次報告書を開く'}).click();const d=page.getByRole('dialog');await expect(d).toBeVisible();
  expect(await d.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();await d.getByRole('button',{name:'報告書を閉じる'}).click();await expect(d).toHaveCount(0);
  if(width===1440)await page.screenshot({path:'/private/tmp/teamnote-management-desktop.png',fullPage:true,animations:'disabled'});
});
test('デモは外部接続や書き込みをせず、減動設定に対応する',async({page,context})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  let calls=0;await context.route(/^https:\/\//,route=>{calls++;return route.abort()});await page.goto('/?view=management&section=monthly&demo=1');await expect(page.locator('.mg-report-row')).toHaveCount(4);
  expect(await page.locator('.management-atmosphere i').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await page.getByRole('button',{name:'寮生Aの月次報告書を開く'}).click();expect(calls).toBe(0);
});

test('寮生が月次文書を提出・修正再提出すると管理側に一件だけ届く。失敗は成功表示しない',async({page,context})=>{
  const f=new Fixture();f.rows=[];await f.install(context);await page.goto('/');
  await expect(page.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'メインメニュー'}).getByRole('button',{name:'はたらく',exact:true}).click();
  await page.getByRole('button',{name:'西松地所レポート作成',exact:true}).click();
  const d=page.getByRole('dialog');const feedback=d.getByPlaceholder('共用部の利用状況、寮生の動向、施設面の改善要望などを入力してください');
  await feedback.fill('月次で清掃用品の補充を依頼します');f.submissionFailure=true;
  await d.getByRole('button',{name:'管理側に提出',exact:true}).click();
  await expect(d.getByRole('alert')).toContainText('提出できませんでした');expect(f.submitted).toHaveLength(0);
  await expect(d.getByRole('status')).toHaveCount(0);f.submissionFailure=false;
  await d.getByRole('button',{name:'管理側に提出',exact:true}).click();await expect(d.getByRole('status')).toContainText('管理側に提出しました');
  expect(f.submitted[0].body).toContain('月次で清掃用品の補充を依頼します');
  await feedback.fill('補充済みです');await d.getByRole('button',{name:'管理側に提出',exact:true}).click();
  await expect(d.getByRole('status')).toContainText('管理側に提出しました');expect(f.submitted).toHaveLength(1);
  const manager=await context.newPage();await manager.goto('/?view=management&section=monthly');await expect(manager.locator('.mg-report-row')).toHaveCount(1);
  await manager.getByRole('button',{name:'提出者Aの月次報告書を開く'}).click();await expect(manager.getByRole('dialog')).toContainText('補充済みです');await expect(manager.getByRole('dialog')).not.toContainText('月次で清掃用品の補充を依頼します');
});

test('運営業務の入口と月次報告の往復・履歴復元',async({page,context})=>{
  const f=new Fixture();await f.install(context);await page.goto('/?view=management');
  await expect(page.getByRole('heading',{name:'運営ダッシュボード',exact:true})).toBeVisible();
  await expect(page.getByText('提出済み 4件',{exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'運営業務'}).getByRole('button',{name:'月次報告書',exact:true}).click();
  await expect(page.locator('.mg-report-row')).toHaveCount(4);
  await page.goBack();await expect(page.getByRole('heading',{name:'運営ダッシュボード',exact:true})).toBeVisible();
  await page.goForward();await expect(page.getByRole('heading',{name:'月次報告書',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'運営業務へ戻る',exact:true}).click();await expect(page.getByRole('heading',{name:'運営ダッシュボード',exact:true})).toBeVisible();
});
test('準備中の業務は実績や操作成功を装わず、既存取得API以外を呼ばない',async({page,context})=>{
  const f=new Fixture();await f.install(context);await page.goto('/?view=management');
  for(const name of ['破損・設備対応','布団の入れ替え','研修・説明会']){
    await page.getByRole('navigation',{name:'運営業務'}).getByRole('button',{name:new RegExp(name)}).click();
    await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await expect(page.getByText('実データの登録・承認・通知は行いません。',{exact:false})).toBeVisible();
    await expect(page.getByRole('button',{name:/送信|承認する|QRを読み取る/})).toHaveCount(0);
    await page.reload();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  }
  expect(f.submitted).toHaveLength(0);expect(f.otherCalls).toEqual([]);
});
test('概要の取得失敗を0件とせず、権限取消後は概要も消す',async({page,context})=>{
  const f=new Fixture();f.fail=true;await f.install(context);await page.goto('/?view=management');
  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText(/提出済み \d+件/)).toHaveCount(0);
  f.fail=false;await page.getByRole('button',{name:'再読み込み',exact:true}).click();await expect(page.getByText('提出済み 4件',{exact:true})).toBeVisible();
  f.allowed=false;await page.getByRole('navigation',{name:'運営業務'}).getByRole('button',{name:/布団の入れ替え/}).click();
  await expect(page.getByRole('heading',{name:'管理者権限が必要です'})).toBeVisible();await expect(page.getByText('提出済み 4件',{exact:true})).toHaveCount(0);
});
for(const width of [320,768,1440])test(`運営業務の小画面・文字拡大・減動 ${width}`,async({page,context})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});let calls=0;await context.route(/^https:\/\//,route=>{calls++;return route.abort()});
  await page.goto('/?view=management&demo=1&section=unknown');
  await page.addStyleTag({content:'.management-app{font-size:22.4px}'});
  await expect(page.getByRole('heading',{name:'運営ダッシュボード',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'運営業務'}).getByRole('button',{name:/布団の入れ替え/}).click();
  await expect(page.getByRole('heading',{name:'布団の入れ替え',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(await page.locator('.management-atmosphere i').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  expect(calls).toBe(0);
});

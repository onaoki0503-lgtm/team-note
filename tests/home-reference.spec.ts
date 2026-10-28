import {test,expect,type Page} from '@playwright/test';
const rows=(n:number)=>Array.from({length:n},(_,i)=>({id:`history-${i}`,text:`寮の暮らしを良くするアイデア ${i}`,color:'cyan',authorId:i%3===0?'r1':'r2',authorName:i%3===0?'自分':'寮生',likes:0,likedUserIds:[],createdAt:new Date(Date.now()-(n-i)*86400000).toISOString(),...(i<2?{hiddenAt:'2026-01-01',hiddenReason:i===0?'capacity':'inactive'}:{})}));
const seed=async(p:Page,n:number)=>p.addInitScript(items=>{if(!localStorage.getItem('tn_db_bubble_ideas'))localStorage.setItem('tn_db_bubble_ideas',JSON.stringify(items))},rows(n));
const boot=async(p:Page)=>{await p.goto('/');await expect(p.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeVisible()};
const open=async(p:Page)=>{await p.getByRole('button',{name:'アイデアを投稿',exact:true}).click();await expect(p.getByRole('dialog',{name:'アイデアを投稿',exact:true})).toBeVisible()};
const post=async(p:Page,text:string)=>{await open(p);await p.getByLabel('アイデアをつぶやく').fill(text);await p.getByRole('button',{name:'投稿する',exact:true}).click();await expect(p.getByRole('dialog',{name:'アイデアを投稿',exact:true})).toHaveCount(0)};
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.route(/^https:\/\//,r=>r.abort())});
for(const [width,height]of [[320,568],[390,844],[430,932],[844,390],[768,900],[1440,900]])test(`履歴を${width}x${height}でスクロールでき、操作部が固定される`,async({page})=>{
 await page.setViewportSize({width,height});await seed(page,40);await boot(page);await expect(page.locator('.idea-bubble-slot')).toHaveCount(40);
 const timeline=page.getByRole('region',{name:'アイデアの履歴'});await expect(page.getByRole('button',{name:rows(40)[39].text,exact:true})).toBeInViewport();
 expect(await timeline.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
 await timeline.evaluate(e=>{e.scrollTop=0});await expect(page.getByRole('button',{name:rows(40)[0].text,exact:true})).toBeInViewport();
 const button=page.getByRole('button',{name:'アイデアを投稿',exact:true});
 await expect(button).toBeInViewport();const b=await button.boundingBox(),n=await page.locator('.glass-nav').boundingBox();expect(b!.y+b!.height).toBeLessThanOrEqual(n!.y);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
 await expect(button).toHaveCSS('background-color','rgb(24, 49, 129)');
});
test('名前・時刻・自分の色分けを出さず白い吹き出しで過去を復元',async({page})=>{
 await seed(page,6);await boot(page);await expect(page.locator('.is-own,.idea-date-divider,.idea-message-author,.idea-message-avatar,time')).toHaveCount(0);
 await expect(page.getByText('寮生',{exact:true})).toHaveCount(0);
 await expect(page.locator('.idea-card').first()).toHaveCSS('animation-name','none');
 await page.getByRole('region',{name:'アイデアの履歴'}).evaluate(e=>{e.scrollTop=0});
 await page.screenshot({path:'/private/tmp/teamnote-floating-history-web.png',animations:'disabled'});
 await expect(page.locator('.idea-history-bubble')).toHaveCount(6);
 await open(page);await expect(page.getByLabel('アイデアをつぶやく')).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeFocused();
});
test('投稿を追加しても過去を失わず、再訪・いいね・削除ができる',async({page})=>{
 await seed(page,40);await boot(page);const text='中庭で映画の上映会を実施したい';await post(page,text);await expect(page.locator('.idea-bubble-slot')).toHaveCount(41);
 const card=page.getByRole('button',{name:text,exact:true});await expect(card).toBeInViewport();await card.click();const d=page.getByRole('dialog',{name:'アイデアの詳細'});await d.getByRole('button',{name:'いいね 0件'}).click();await expect(d.getByRole('button',{name:'いいね 1件'})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Escape');await page.reload();await card.click();await d.getByRole('button',{name:'アイデアのメニュー'}).click();await d.getByRole('button',{name:'削除する',exact:true}).click();await expect(card).toHaveCount(0);await expect(page.locator('.idea-bubble-slot')).toHaveCount(40);
 await page.getByRole('region',{name:'アイデアの履歴'}).evaluate(e=>{e.scrollTop=0});await expect(page.getByRole('button',{name:rows(40)[0].text,exact:true})).toBeInViewport();
});
test('履歴を読んでいるときの新着は位置を変えず、ボタンで最新へ移動',async({page,context})=>{
 await seed(page,40);await boot(page);const timeline=page.getByRole('region',{name:'アイデアの履歴'});await timeline.evaluate(e=>{e.scrollTop=150});await page.waitForTimeout(100);const before=await timeline.evaluate(e=>e.scrollTop);
 const other=await context.newPage();await boot(other);const text='別の画面から投稿した映画会の相談';await post(other,text);
 await expect(page.getByRole('button',{name:'新しい投稿 1件'})).toBeVisible();expect(await timeline.evaluate(e=>e.scrollTop)).toBeCloseTo(before,0);
 await page.getByRole('button',{name:'新しい投稿 1件'}).click();await expect(page.getByRole('button',{name:text,exact:true})).toBeInViewport();
 await open(page);await page.getByLabel('アイデアをつぶやく').fill('編集中の下書きはそのまま残す');await post(other,'もう一つの共有スペースの提案');await expect(page.getByLabel('アイデアをつぶやく')).toHaveValue('編集中の下書きはそのまま残す');await other.close();
});
test('過去の投稿から企画化でき、時間経過でも消えない',async({page})=>{
 await seed(page,20);await boot(page);await page.getByRole('region',{name:'アイデアの履歴'}).evaluate(e=>{e.scrollTop=0});const first=page.getByRole('button',{name:rows(20)[0].text,exact:true});await first.click();await page.getByRole('button',{name:'企画にする',exact:true}).click();await expect(page.getByRole('heading',{name:'企画書を作成',exact:true})).toBeVisible();await expect(page.getByLabel('企画書の実施内容',{exact:true})).toHaveValue(rows(20)[0].text);
});
test('入力制限、閉じる・再訪での下書き保持、保存失敗・再試行で一件だけ保存',async({page})=>{
 await boot(page);await open(page);const input=page.getByLabel('アイデアをつぶやく');await input.fill('短い');await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('alert')).toContainText('4文字以上');await input.fill('あ'.repeat(141));await expect(page.getByRole('button',{name:'投稿する',exact:true})).toBeDisabled();
 const text='保存に失敗しても残しておく交流会の提案';await input.fill(text);await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('tn_draft')).map(k=>localStorage.getItem(k)).join())).toContain(text);await page.keyboard.press('Escape');await page.reload();await open(page);await expect(input).toHaveValue(text);
 await page.evaluate(()=>{const set=Storage.prototype.setItem;(window as any).restoreIdea=()=>Storage.prototype.setItem=set;Storage.prototype.setItem=function(k,v){if(k==='tn_db_bubble_ideas')throw new Error('full');return set.call(this,k,v)}});await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('alert')).toContainText('保存できませんでした');await expect(input).toHaveValue(text);
 await page.evaluate(()=>(window as any).restoreIdea());await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('dialog',{name:'アイデアを投稿',exact:true})).toHaveCount(0);expect(await page.evaluate(t=>JSON.parse(localStorage.getItem('tn_db_bubble_ideas')!).filter((r:any)=>r.text===t).length,text)).toBe(1);
});
test('高さの小さい画面でも投稿欄と送信操作が画面内に収まる',async({page})=>{
 await seed(page,2);await boot(page);
 for(const [width,height]of [[320,568],[390,400],[844,390]]){
  await page.setViewportSize({width,height});await open(page);
  const d=page.getByRole('dialog',{name:'アイデアを投稿',exact:true}),r=await d.boundingBox();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.y).toBeGreaterThanOrEqual(0);expect(r!.y+r!.height).toBeLessThanOrEqual(height);
  await page.getByLabel('アイデアをつぶやく').fill('小さい画面から投稿するアイデア');await d.getByRole('button',{name:'投稿する',exact:true}).scrollIntoViewIfNeeded();await expect(d.getByRole('button',{name:'投稿する',exact:true})).toBeInViewport();await page.keyboard.press('Escape');
 }
});

test('浮遊と4秒ごとの消失ポップを戻し、入力中と減動時には停止する',async({page})=>{
 await seed(page,12);await boot(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);
 await expect(page.locator('.idea-history-bubble').first()).toHaveCSS('animation-name','history-float');
 await expect.poll(()=>page.locator('[data-pop-active=true]').count(),{timeout:7000,intervals:[100]}).toBe(1);
 const phases=await page.locator('[data-pop-active=true]').evaluate(el=>{const a=el.getAnimations().find(a=>(a as CSSAnimation).animationName==='bubble-pop')!;a.pause();a.currentTime=128;const hidden=Number(getComputedStyle(el).opacity);a.currentTime=336;return{hidden,appeared:Number(getComputedStyle(el).opacity)}});expect(phases).toEqual({hidden:0,appeared:1});
 await open(page);await expect(page.locator('.idea-bubble-history')).toHaveAttribute('data-floating-paused','true');await expect(page.locator('[data-pop-active=true]')).toHaveCount(0);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.idea-history-bubble').first()).toHaveCSS('animation-name','none');
});

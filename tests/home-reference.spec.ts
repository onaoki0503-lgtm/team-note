import {test,expect,type Page} from '@playwright/test';
const rows=(n:number,now=Date.now())=>Array.from({length:n},(_,i)=>({id:`reference-${i}`,text:i===0?'共有キッチンを使いやすく':i===1?'映画上映会を開きたい':`寮の暮らしを良くするアイデア${i}`,color:'cyan',authorId:'r1',likes:0,likedUserIds:[],createdAt:new Date(now-(n-i)*60000).toISOString(),activityTrackedFrom:new Date(now-(n-i)*60000).toISOString()}));
const seed=async(p:Page,n:number,now=Date.now())=>p.addInitScript(items=>{if(!localStorage.getItem('tn_db_bubble_ideas'))localStorage.setItem('tn_db_bubble_ideas',JSON.stringify(items))},rows(n,now));
const boot=async(p:Page)=>{await p.goto('/');await expect(p.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeVisible()};
const open=async(p:Page)=>{await p.getByRole('button',{name:'アイデアを投稿',exact:true}).click();await expect(p.getByRole('dialog',{name:'アイデアを投稿',exact:true})).toBeVisible()};
const post=async(p:Page,text:string)=>{await open(p);await p.getByLabel('アイデアをつぶやく').fill(text);await p.getByRole('button',{name:'投稿する',exact:true}).click();await expect(p.getByRole('dialog',{name:'アイデアを投稿',exact:true})).toHaveCount(0)};
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.route(/^https:\/\//,r=>r.abort())});
for(const [width,height]of [[320,568],[390,844],[430,932],[844,390],[768,900],[1440,900]])test(`白いカード12件を${width}x${height}で重ねずスクロールなしに表示`,async({page})=>{
 await page.setViewportSize({width,height});await seed(page,12);await boot(page);await expect(page.locator('.idea-card')).toHaveCount(12);
 const boxes=await page.locator('.idea-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
 for(let i=0;i<boxes.length;i++){const a=boxes[i];expect(a.width).toBeGreaterThanOrEqual(44);expect(a.height).toBeGreaterThanOrEqual(44);expect(a.x).toBeGreaterThanOrEqual(0);expect(a.y).toBeGreaterThanOrEqual(0);expect(a.right).toBeLessThanOrEqual(width);expect(a.bottom).toBeLessThanOrEqual(height);for(let j=i+1;j<boxes.length;j++){const b=boxes[j];expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,`${i}/${j}`).toBeTruthy()}}
 expect(await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth,y:document.documentElement.scrollHeight>innerHeight+1}))).toEqual({x:false,y:false});
 const button=page.getByRole('button',{name:'アイデアを投稿',exact:true});await expect(button).toHaveCSS('background-color','rgb(24, 49, 129)');
});
test('2件では大きなカード、青い選択タブ・プロフィール・投稿欄を表示',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,2);await boot(page);await expect(page.locator('.idea-layer')).toHaveAttribute('data-density','spacious');
 await expect(page.locator('.glass-nav button.is-active')).toHaveCSS('color','rgb(255, 255, 255)');await expect(page.locator('.idea-board .start-idea')).toHaveCount(0);await expect(page.locator('.idea-bubble-outline')).toHaveCount(0);
 await page.screenshot({path:'/private/tmp/teamnote-reference-web.png',animations:'disabled'});
 await open(page);await expect(page.getByLabel('アイデアをつぶやく')).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'利用者のプロフィール・切り替え'}).click();await expect(page.getByRole('button',{name:'設定',exact:true})).toBeVisible();await expect(page.locator('.glass-nav .nav-lens')).toHaveCount(0);
});
test('投稿を追加し、全文・いいね・削除・再読み込みの保持を確認',async({page})=>{
 await seed(page,2);await boot(page);const text='中庭で映画の上映会を実施したい';await post(page,text);await expect(page.locator('.idea-card')).toHaveCount(3);await expect(page.getByRole('button',{name:rows(2)[0].text,exact:true})).toBeVisible();
 const card=page.getByRole('button',{name:text,exact:true});await card.click();const d=page.getByRole('dialog',{name:'アイデアの詳細'});await d.getByRole('button',{name:'いいね 0件'}).click();await expect(d.getByRole('button',{name:'いいね 1件'})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Escape');await expect(card).toBeFocused();await page.reload();await card.click();await d.getByRole('button',{name:'アイデアのメニュー'}).click();await d.getByRole('button',{name:'削除する',exact:true}).click();await expect(card).toHaveCount(0);await expect(page.locator('.idea-card')).toHaveCount(2);
});
test('入力制限、閉じる・再訪での下書き保持、保存失敗・再試行で一件だけ保存',async({page})=>{
 await boot(page);await open(page);const input=page.getByLabel('アイデアをつぶやく');await input.fill('短い');await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('alert')).toContainText('4文字以上');await input.fill('あ'.repeat(141));await expect(page.getByRole('button',{name:'投稿する',exact:true})).toBeDisabled();
 const text='保存に失敗しても残しておく交流会の提案';await input.fill(text);await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('tn_draft')).map(k=>localStorage.getItem(k)).join())).toContain(text);await page.keyboard.press('Escape');await page.reload();await open(page);await expect(input).toHaveValue(text);
 await page.evaluate(()=>{const set=Storage.prototype.setItem;(window as any).restoreIdea=()=>Storage.prototype.setItem=set;Storage.prototype.setItem=function(k,v){if(k==='tn_db_bubble_ideas')throw new Error('full');return set.call(this,k,v)}});await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('alert')).toContainText('保存できませんでした');await expect(input).toHaveValue(text);
 await page.evaluate(()=>(window as any).restoreIdea());await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('dialog',{name:'アイデアを投稿',exact:true})).toHaveCount(0);expect(await page.evaluate(t=>JSON.parse(localStorage.getItem('tn_db_bubble_ideas')!).filter((r:any)=>r.text===t).length,text)).toBe(1);
});
test('12件超過分は古い順に表示終了し元データを残す',async({page})=>{
 await seed(page,12);await boot(page);for(let i=0;i<3;i++)await post(page,`追加した新しい交流会のアイデア${i}`);await expect(page.locator('.idea-card')).toHaveCount(12);const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tn_db_bubble_ideas')!));expect(stored).toHaveLength(15);expect(stored.filter((r:any)=>r.hiddenReason==='capacity')).toHaveLength(3);await page.reload();await expect(page.locator('.idea-card')).toHaveCount(12);
});
test('7日無反応で表示終了し、いいねが期限を更新する',async({page})=>{
 const now=Date.now();await page.clock.setFixedTime(new Date(now));await seed(page,2,now);await boot(page);const first=page.getByRole('button',{name:rows(2)[0].text,exact:true});await first.click();await page.getByRole('button',{name:'いいね 0件'}).click();await page.keyboard.press('Escape');await page.clock.setFixedTime(new Date(now+6*86400000));await first.click();await page.getByRole('button',{name:'いいね 1件'}).click();await page.getByRole('button',{name:'いいね 0件'}).click();await page.keyboard.press('Escape');await page.clock.setFixedTime(new Date(now+7*86400000));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('.idea-card')).toHaveCount(1);await page.reload();await expect(first).toBeVisible();
});
test('全文から企画化できる',async({page})=>{
 await seed(page,1);await boot(page);await page.getByRole('button',{name:rows(1)[0].text,exact:true}).click();await page.getByRole('button',{name:'企画にする',exact:true}).click();await expect(page.getByRole('heading',{name:'企画書を作成',exact:true})).toBeVisible();await expect(page.getByLabel('企画書の実施内容',{exact:true})).toHaveValue(rows(1)[0].text);
});
test('別タブへの同期は編集中の下書きを壊さない',async({page,context})=>{
 await seed(page,2);await boot(page);const other=await context.newPage();await other.emulateMedia({reducedMotion:'reduce'});await boot(other);await open(other);await other.getByLabel('アイデアをつぶやく').fill('編集中の下書きはそのまま残す');const text='別の画面から投稿した映画会の相談';await post(page,text);await expect(other.locator('.idea-card').filter({hasText:text})).toHaveCount(1);await expect(other.getByLabel('アイデアをつぶやく')).toHaveValue('編集中の下書きはそのまま残す');await other.keyboard.press('Escape');await other.getByRole('button',{name:text,exact:true}).click();await other.getByRole('button',{name:'いいね 0件'}).click();await page.getByRole('button',{name:text,exact:true}).click();await expect(page.getByRole('button',{name:'いいね 1件'})).toHaveAttribute('aria-pressed','true');await other.close();
});
test('4秒ポップ・浮遊は投稿欄と詳細、減動設定で停止する',async({page})=>{
 await seed(page,4);await boot(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);await expect.poll(()=>page.locator('.idea-card[data-pop-active=true]').count(),{timeout:7000,intervals:[100]}).toBe(1);
 const phases=await page.locator('.idea-card[data-pop-active=true]').evaluate(el=>{const a=el.getAnimations().find(a=>(a as CSSAnimation).animationName==='bubble-pop')!;a.pause();a.currentTime=128;const hidden=Number(getComputedStyle(el).opacity);a.currentTime=336;return{hidden,appeared:Number(getComputedStyle(el).opacity)}});expect(phases).toEqual({hidden:0,appeared:1});
 await open(page);await expect(page.locator('.idea-layer')).toHaveAttribute('data-floating-paused','true');await expect(page.locator('.idea-card[data-pop-active=true]')).toHaveCount(0);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.idea-card').first()).toHaveCSS('animation-name','none');
});

test('12枚の浮遊とポップの最大位置でも重ならない',async({page})=>{
 await seed(page,12);await boot(page);
 for(const [width,height]of [[320,568],[844,390]]){
  await page.setViewportSize({width,height});await expect(page.locator('.idea-card')).toHaveCount(12);
  for(const sign of [-1,1]){
   const boxes=await page.locator('.idea-card').evaluateAll((cards,sign)=>cards.map(el=>{
    const e=el as HTMLElement,style=getComputedStyle(e);e.style.animation='none';e.style.transform=`translate(${sign*parseFloat(style.getPropertyValue('--float-x'))}px,${sign*parseFloat(style.getPropertyValue('--float-y'))}px)`;e.style.scale=style.getPropertyValue('--pop-scale');const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};
   }),sign);
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,`${width}: ${i}/${j}`).toBeTruthy()}
  }
 }
});

test('高さの小さい画面でも投稿欄と送信操作が画面内に収まる',async({page})=>{
 await seed(page,2);await boot(page);
 for(const [width,height]of [[320,568],[390,400],[844,390]]){
  await page.setViewportSize({width,height});await open(page);
  const d=page.getByRole('dialog',{name:'アイデアを投稿',exact:true}),r=await d.boundingBox();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.y).toBeGreaterThanOrEqual(0);expect(r!.y+r!.height).toBeLessThanOrEqual(height);
  await page.getByLabel('アイデアをつぶやく').fill('小さい画面から投稿するアイデア');await d.getByRole('button',{name:'投稿する',exact:true}).scrollIntoViewIfNeeded();await expect(d.getByRole('button',{name:'投稿する',exact:true})).toBeInViewport();await page.keyboard.press('Escape');
 }
});

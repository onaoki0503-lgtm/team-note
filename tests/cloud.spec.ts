import { test, expect, type BrowserContext, type WebSocketRoute, type Page } from '@playwright/test';
const uidA='00000000-0000-4000-8000-000000000001',uidB='00000000-0000-4000-8000-000000000002';
const member=(id:string)=>({id,name:id===uidA?'試験用A':'試験用B',role:'一般寮生',building:'rosemary',floor:1,unit:id===uidA?'101-A':'101-B',roleType:'member'});
class CloudFixture {
 revision=1; ideas:any[]=[]; joined=true; failNextPost=false; postIds:string[]=[]; sockets:{ws:WebSocketRoute,topic:string,join:string}[]=[]; getCalls=0;
 board(uid:string){return {community:'h-village',revision:this.revision,userId:uid,members:[member(uidA),member(uidB)],ideas:structuredClone(this.ideas)};}
 broadcast(){for(const s of this.sockets)s.ws.send(JSON.stringify([s.join,null,s.topic,'postgres_changes',{ids:['0'],data:{schema:'public',table:'tn_ideas',type:'UPDATE',commit_timestamp:new Date().toISOString(),columns:[],record:{},old_record:{},errors:null}}]));}
 async install(context:BrowserContext,uid:string){
  await context.routeWebSocket(/^wss:\/\/teamnote-test\.invalid\//,ws=>{ws.onMessage(raw=>{const m=JSON.parse(String(raw)); const [join,ref,topic,event,payload]=m;
   if(event==='phx_join'){this.sockets.push({ws,topic,join});ws.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:payload.config.postgres_changes.map((f:any,i:number)=>({...f,id:String(i)}))}}]));}
   if(event==='heartbeat'||event==='phx_leave')ws.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{}}]));
  });});
  await context.route(/^https:\/\//,async route=>{
   const req=route.request(), url=new URL(req.url());if(url.hostname!=='teamnote-test.invalid')return route.abort();
   const reply=(json:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(json)});
   if(url.pathname==='/auth/v1/token'){
    const exp=Math.floor(Date.now()/1000)+3600;const access_token=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',exp},'test-signature'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.');
    return reply({access_token,token_type:'bearer',expires_in:3600,expires_at:exp,refresh_token:'test-refresh',user:{id:uid,aud:'authenticated',email:'fixture@example.invalid',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}});
   }
   if(url.pathname==='/auth/v1/logout')return reply({});
   if(url.pathname==='/auth/v1/user')return reply({id:uid,aud:'authenticated',email:'fixture@example.invalid'});
   const rpc=url.pathname.split('/').at(-1),args=req.postDataJSON()||{};
   if(rpc==='tn_get_board'){this.getCalls++;return this.joined?reply(this.board(uid)):reply({code:'42501',message:'teamnote_access_denied'},403);}
   if(rpc==='tn_join_community'){if(args.p_invite!=='test-invite')return reply({code:'42501',message:'teamnote_invalid_invite'},403);this.joined=true;return reply(this.board(uid));}
   if(rpc==='tn_post_idea'){
    this.postIds.push(args.p_id);
    if(!this.ideas.some(i=>i.id===args.p_id)){const now=new Date().toISOString();this.ideas.push({id:args.p_id,text:args.p_text,authorId:uid,authorName:member(uid).name,color:'cyan',likes:0,likedUserIds:[],createdAt:now,lastReactionAt:now});this.revision++;this.broadcast();}
    if(this.failNextPost){this.failNextPost=false;return route.abort();}return reply(this.board(uid));
   }
   if(rpc==='tn_set_like'){const i=this.ideas.find(i=>i.id===args.p_id);i.likedUserIds=args.p_liked?[uid]:[];i.likes=i.likedUserIds.length;this.revision++;this.broadcast();return reply(this.board(uid));}
   if(rpc==='tn_delete_idea'){this.ideas=this.ideas.filter(i=>i.id!==args.p_id);this.revision++;this.broadcast();return reply(this.board(uid));}
   return reply({message:'unexpected test request '+url.pathname},400);
  });
 }
}
async function login(page:Page){await page.goto('/');await expect(page.getByRole('heading',{name:'ログイン',exact:true})).toBeVisible();await page.getByLabel('メールアドレス').fill('fixture@example.invalid');await page.getByLabel('パスワード').fill('fixture-password');await page.getByRole('button',{name:'ログイン',exact:true}).click();}
async function ready(page:Page){await expect(page.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeVisible();await expect(page.getByText('共有中',{exact:true})).toBeVisible();}
test('別々の端末領域で投稿・いいね・削除をWebSocket経由で反映する',async({browser})=>{
 const f=new CloudFixture();const ca=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}}),cb=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});await f.install(ca,uidA);await f.install(cb,uidB);const a=await ca.newPage(),b=await cb.newPage();await login(a);await ready(a);await login(b);await ready(b);
 const text='中庭で交流の上映会を行いたい';await a.getByRole('button',{name:'アイデアを投稿',exact:true}).click();await a.getByLabel('アイデアをつぶやく').fill(text);await a.getByRole('button',{name:'投稿する',exact:true}).click();await expect(b.getByRole('button',{name:text,exact:true})).toBeVisible();
 await b.getByRole('button',{name:text,exact:true}).click();const bd=b.getByRole('dialog',{name:'アイデアの詳細'});await expect(bd.getByRole('button',{name:'アイデアのメニュー'})).toHaveCount(0);await bd.getByRole('button',{name:'いいね 0件'}).click();await expect(bd.getByRole('button',{name:'いいね 1件'})).toHaveAttribute('aria-pressed','true');
 await a.getByRole('button',{name:text,exact:true}).click();const ad=a.getByRole('dialog',{name:'アイデアの詳細'});await expect(ad.getByRole('button',{name:'いいね 1件'})).toBeVisible();await ad.getByRole('button',{name:'アイデアのメニュー'}).click();await a.getByRole('button',{name:'削除する',exact:true}).click();await expect(b.getByRole('button',{name:text,exact:true})).toHaveCount(0);await ca.close();await cb.close();
});
test('未参加者はプロフィールへ誘導し、不正コードの入力を保持する',async({page,context})=>{
 const f=new CloudFixture();f.joined=false;await f.install(context,uidA);await login(page);await expect(page.getByRole('heading',{name:'プロフィール登録'})).toBeVisible();await page.getByLabel('参加コード').fill('wrong');await page.getByLabel('名前',{exact:true}).fill('試験用A');await page.getByLabel('部屋番号').fill('101-A');await page.getByRole('button',{name:'寮に参加する'}).click();await expect(page.getByRole('alert')).toHaveText('参加コードを確認してください。');await expect(page.getByLabel('名前',{exact:true})).toHaveValue('試験用A');await page.getByLabel('参加コード').fill('test-invite');await page.getByRole('button',{name:'寮に参加する'}).click();await ready(page);await page.reload();await ready(page);
});
test('サーバー保存後に応答が失われても本文を残し、再送は同じIDで重複させない',async({page,context})=>{
 const f=new CloudFixture();await f.install(context,uidA);await login(page);await ready(page);f.failNextPost=true;const text='通信復帰後にも一件だけ残すアイデア';await page.getByRole('button',{name:'アイデアを投稿',exact:true}).click();const input=page.getByLabel('アイデアをつぶやく');await input.fill(text);await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('alert')).toContainText('入力内容を残しています');await expect(input).toHaveValue(text);await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(f.postIds).toHaveLength(2);expect(f.postIds[0]).toBe(f.postIds[1]);expect(f.ideas).toHaveLength(1);await page.reload();await ready(page);await expect(page.getByRole('button',{name:text,exact:true})).toBeVisible();
});
test('操作デモは共有DBや認証へ接続せず、端末内で全4タブを操作できる',async({page,context})=>{
 let sharedRequests=0;await context.route(/^https:\/\//,route=>{if(new URL(route.request().url()).hostname==='teamnote-test.invalid')sharedRequests++;return route.abort();});
 await page.goto('/?demo=1');await expect(page.getByRole('button',{name:'アイデアを投稿',exact:true})).toBeVisible();await expect(page.getByText('操作デモ',{exact:true})).toBeVisible();
 for(const name of ['進行中','はたらく','保管する','アイデア'])await page.getByRole('navigation',{name:'メインメニュー'}).getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:'アイデアを投稿',exact:true}).click();await page.getByLabel('アイデアをつぶやく').fill('操作デモだけに保存される試験用の投稿');await page.getByRole('button',{name:'投稿する',exact:true}).click();await expect(page.getByRole('button',{name:'操作デモだけに保存される試験用の投稿',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'操作デモだけに保存される試験用の投稿',exact:true})).toBeVisible();expect(sharedRequests).toBe(0);
});

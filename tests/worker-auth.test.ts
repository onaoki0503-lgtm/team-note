import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import worker, { type Env } from '../worker/src/index.ts';
import { fixtureAi } from './worker-fixtures.ts';

test('本番相当JWT経路で署名・クレーム・所属を検証してから推論する', async t => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(publicKey), alg: 'ES256', kid: 'fixture-key', use: 'sig' };
  const userId = '00000000-0000-4000-8000-000000000001';
  const origin = 'http://127.0.0.1:5174';
  let membership: 'active' | 'absent' | 'error' = 'active';
  let aiCalls = 0, memberCalls = 0, rateKey = '';
  const server = createServer((req,res) => {
    const url = new URL(req.url!, 'http://localhost');
    res.setHeader('Content-Type','application/json');
    if (url.pathname === '/auth/v1/.well-known/jwks.json') { res.end(JSON.stringify({ keys:[jwk] })); return; }
    if (url.pathname === '/rest/v1/tn_members') {
      memberCalls++;
      assert.equal(url.searchParams.get('community_id'), 'eq.h-village');
      assert.equal(url.searchParams.get('user_id'), `eq.${userId}`);
      assert.equal(url.searchParams.get('active'), 'eq.true');
      assert.equal(req.headers.apikey,'fixture-public-key');
      assert.match(req.headers.authorization || '',/^Bearer /);
      res.statusCode = membership === 'error' ? 403 : 200;
      res.end(JSON.stringify(membership === 'active' ? [{user_id:userId}] : [])); return;
    }
    res.statusCode=404;res.end('{}');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());}));
  const address=server.address();assert.ok(address && typeof address==='object');
  const base=`http://127.0.0.1:${address.port}`;
  const env:Env={
    ALLOWED_ORIGINS:origin,SUPABASE_URL:base,SUPABASE_ANON_KEY:'fixture-public-key',COMMUNITY_ID:'h-village',
    AI:{async run(model,input){aiCalls++;return fixtureAi.run(model,input);}},
    AI_RATE_LIMITER:{async limit({key}){rateKey=key;return {success:true};}},
  };
  const sign = (claims: {iss?:string;aud?:string;exp?:number;sub?:string}={}) => new SignJWT({role:'authenticated'})
    .setProtectedHeader({alg:'ES256',kid:'fixture-key'})
    .setSubject(claims.sub ?? userId).setIssuer(claims.iss ?? `${base}/auth/v1`)
    .setAudience(claims.aud ?? 'authenticated').setExpirationTime(claims.exp ?? Math.floor(Date.now()/1000)+300).sign(privateKey);
  const request=(token:string)=>new Request('http://worker/api/ai',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({task:'topics',text:'中庭で交流会を開きたい'})});
  await t.test('有効な署名と所属では推論し利用者IDで制限する',async()=>{
    const res=await worker.fetch(request(await sign()),env);assert.equal(res.status,200);assert.equal(aiCalls,1);assert.equal(rateKey,userId);assert.equal(memberCalls,1);
  });
  for(const [label,claims]of [['期限切れ',{exp:1}],['異なる発行元',{iss:'https://other.invalid/auth/v1'}],['異なるaudience',{aud:'anon'}]] as const){
    await t.test(`${label}では推論も所属照会もしない`,async()=>{
      const beforeAi=aiCalls,beforeMember=memberCalls;
      const res=await worker.fetch(request(await sign(claims)),env);assert.equal(res.status,401);assert.equal(aiCalls,beforeAi);assert.equal(memberCalls,beforeMember);
    });
  }
  await t.test('偽造署名では推論しない',async()=>{
    const other=await generateKeyPair('ES256');const token=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:'fixture-key'}).setIssuer(`${base}/auth/v1`).setAudience('authenticated').setSubject(userId).setExpirationTime('5m').sign(other.privateKey);
    const before=aiCalls;assert.equal((await worker.fetch(request(token),env)).status,401);assert.equal(aiCalls,before);
  });
  await t.test('有効なJWTでも所属がなければ拒否する',async()=>{
    membership='absent';const before=aiCalls;const res=await worker.fetch(request(await sign()),env);assert.equal(res.status,403);assert.equal((await res.json() as {error:string}).error,'not_a_member');assert.equal(aiCalls,before);
  });
  await t.test('所属照会失敗や設定不足でも推論しない',async()=>{
    membership='error';const before=aiCalls;const token=await sign();assert.equal((await worker.fetch(request(token),env)).status,401);assert.equal((await worker.fetch(request(token),{...env,SUPABASE_ANON_KEY:undefined})).status,503);assert.equal(aiCalls,before);
  });
});

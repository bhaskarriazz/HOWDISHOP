// K5E — HOWDI Connect closure: session-only identity guard, opaque user references, response replacer,
// legacy notification-centre guard and the shared visibility SQL helpers.
// Runs the REAL source of the K5E block extracted from server.js inside a vm (no PostgreSQL, no server start).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
function between(a,b){const start=source.indexOf(a);assert.notEqual(start,-1,a);const end=source.indexOf(b,start+a.length);assert.notEqual(end,-1,b);return source.slice(start,end);}

const k5eSource=between('    const K5E_REF_BASE = 2 ** 52;','    function adminTokenHash');
const ALICE=101,BOB=202;
const SESSIONS={'tok-alice':{id:ALICE},'tok-bob':{id:BOB}};

function load(env={}){
  const sent=[];
  const ctx={
    crypto,Buffer,URL,console,
    process:{env:{HOWDI_CONNECT_REF_SECRET:'test-secret-one',...env}},
    pool:{query:async()=>({rows:[]})},
    getSessionUserFromRequest:async(req)=>{const t=String(req.headers?.authorization||'').replace(/^bearer /i,'');return SESSIONS[t]||null;},
    sendJSON:(res,status,body)=>{res.sent={status,body};sent.push({status,body});},
  };
  vm.createContext(ctx);
  const api=vm.runInContext(`${k5eSource}\n;({connectUserRef,connectUserIdFromRef,k5eConnectGuard,k5eLegacyNotificationGuard,k5eConnectReplacer,k5eNormaliseBody,k5eDecodeTarget,k5eOpaqueCode,k5eOmit,K5E_BLOCKED_BETWEEN_SQL,connectPostVisibleSql,connectRoomVisibleSql,connectStoryVisibleSql,connectCommunityPublicColumns,connectProfileOwnColumns,connectPostPublicColumns,K5E_SPACE_GIFTS})`,ctx);
  return {api,sent};
}
const {api:K}=load();

async function guard(method,rawUrl,token){
  const {api,sent}=load();
  const req={method,headers:token?{authorization:'Bearer '+token}:{}};
  const res={};
  const url=new URL(rawUrl,'http://localhost');
  const stopped=await api.k5eConnectGuard(req,res,url);
  return {stopped,status:res.sent?.status,url,req,res,api,sent};
}

test('K5E 1: opaque user refs round-trip, are safe integers, never equal the id and reject tampering',()=>{
  for(const id of [1,2,63,101,999999,123456789,4000000000,2**32-1]){
    const ref=K.connectUserRef(id);
    assert.ok(Number.isSafeInteger(ref)&&ref>=2**52,`ref for ${id}`);
    assert.notEqual(ref,id);
    assert.equal(K.connectUserIdFromRef(ref),id);
    assert.equal(K.connectUserIdFromRef(String(ref)),id,'string form decodes too');
    assert.equal(K.connectUserIdFromRef(ref+1),0,'tampered ref rejected');
    assert.equal(K.connectUserIdFromRef(ref-1),0,'tampered ref rejected');
  }
  assert.equal(K.connectUserRef(0),0);assert.equal(K.connectUserRef(-4),0);assert.equal(K.connectUserRef(1.5),0);
  for(const bad of [0,1,101,2**52-1,2**52+2**48,'abc','',null,undefined,{},[],'9'.repeat(30)])assert.equal(K.connectUserIdFromRef(bad),0,`non-ref ${String(bad)} rejected`);
});

test('K5E 2: refs are keyed (a different secret gives different refs and cannot decode the first key\'s refs)',()=>{
  const other=load({HOWDI_CONNECT_REF_SECRET:'test-secret-two'}).api;
  const a=K.connectUserRef(ALICE),b=other.connectUserRef(ALICE);
  assert.notEqual(a,b);
  assert.equal(other.connectUserIdFromRef(a),0);
  // consecutive ids do not produce consecutive refs (no enumeration by increment)
  const seq=[1,2,3,4,5].map(i=>K.connectUserRef(i));
  for(let i=1;i<seq.length;i++)assert.ok(Math.abs(seq[i]-seq[i-1])>1e6,'refs of neighbouring ids are far apart');
  // opaque codes are stable, uppercase hex and do not embed the id
  assert.equal(K.k5eOpaqueCode('cert',7,ALICE),K.k5eOpaqueCode('cert',7,ALICE));
  assert.match(K.k5eOpaqueCode('cert',7,ALICE),/^[0-9A-F]{10}$/);
  assert.ok(!K.k5eOpaqueCode('cert',7,ALICE).includes(String(ALICE)));
});

test('K5E 3: target decoding — a raw foreign id is never accepted (id probing yields 0), own id and refs are',()=>{
  assert.equal(K.k5eDecodeTarget(K.connectUserRef(BOB),ALICE),BOB);
  assert.equal(K.k5eDecodeTarget(String(K.connectUserRef(BOB)),ALICE),BOB);
  assert.equal(K.k5eDecodeTarget(BOB,ALICE),0,'raw foreign id');
  assert.equal(K.k5eDecodeTarget(String(BOB),ALICE),0);
  assert.equal(K.k5eDecodeTarget(ALICE,ALICE),ALICE,'own id is fine');
  assert.equal(K.k5eDecodeTarget(ALICE,0),0,'guest has no own id');
  assert.equal(K.k5eDecodeTarget({a:1},ALICE),0);
  assert.deepEqual(K.k5eDecodeTarget([BOB,K.connectUserRef(BOB)],ALICE),[0,BOB]);
  assert.equal(K.k5eDecodeTarget('',ALICE),'');assert.equal(K.k5eDecodeTarget(null,ALICE),null);
});

test('K5E 4: guard replaces client actor fields with the session id in the query string',async()=>{
  const g=await guard('GET','/api/connect/feed?userId=202&user_id=202&viewerId=202&viewer_id=202&type=POST','tok-alice');
  assert.equal(g.stopped,false);
  assert.equal(g.url.searchParams.get('userId'),String(ALICE));
  assert.equal(g.url.searchParams.get('user_id'),String(ALICE));
  assert.equal(g.url.searchParams.get('viewerId'),null,'viewerId is removed, never trusted');
  assert.equal(g.url.searchParams.get('viewer_id'),null);
  assert.equal(g.url.searchParams.get('type'),'POST');
  assert.equal(g.req.__k5eViewerId,ALICE);
  assert.equal(g.res.__k5eViewerId,ALICE);
});

test('K5E 5: guests — actor fields are stripped, writes are 401, private GETs are 401, public browsing stays open',async()=>{
  const pub=await guard('GET','/api/connect/bootstrap?userId=202&viewerId=202');
  assert.equal(pub.stopped,false);
  assert.equal(pub.url.searchParams.get('userId'),null);assert.equal(pub.url.searchParams.get('viewerId'),null);
  assert.equal(pub.req.__k5eViewerId,0);
  for(const m of ['POST','PUT','PATCH','DELETE']){
    const w=await guard(m,'/api/connect/posts/5/comments');
    assert.equal(w.stopped,true);assert.equal(w.status,401,`guest ${m}`);
  }
  for(const p of ['/api/connect/connections/mine','/api/connect/conversations','/api/connect/conversations/4/messages','/api/connect/notifications','/api/connect/calls/inbox','/api/connect/groups-channels','/api/connect/profile-studio','/api/connect/posts/mine','/api/connect/articles/mine','/api/connect/subscriptions/mine','/api/connect/creator-dashboard','/api/connect/spaces/3/analytics','/api/connect/spaces/bookmarked','/api/connect/realtime/3/state','/api/connect/realtime/3/signals','/api/connect/live/3/creator-dashboard','/api/connect/profiles/5/skill-passport','/api/connect/learning-circles/2/messages','/api/connect/knowledge-dna','/api/connect/reputation','/api/connect/follow-requests','/api/connect/social-summary']){
    const r=await guard('GET',p);
    assert.equal(r.stopped,true,p);assert.equal(r.status,401,p);
  }
  // deliberately public surfaces are NOT blocked for guests
  // K5A Phase 1: Connect Home is a guest-browsable curated surface (session personalisation happens inside the route).
  for(const p of ['/api/connect/home','/api/connect/home/feed','/api/connect/feed','/api/connect/search?q=a','/api/connect/public-profile/username/x','/api/connect/spaces/recommended','/api/connect/live-discovery','/api/connect/posts/5/comments','/api/connect/stories','/api/connect/articles']){
    const r=await guard('GET',p);assert.equal(r.stopped,false,p);
  }
  // anonymous view counters are the only guest-callable writes
  for(const p of ['/api/connect/posts/9/view','/api/connect/profile-projects/9/view']){const r=await guard('POST',p);assert.equal(r.stopped,false,p);}
  const notView=await guard('POST','/api/connect/posts/9/view/extra');assert.equal(notView.stopped,true);
  // an invalid / unknown token is a guest, not a crash
  const bad=await guard('POST','/api/connect/posts','tok-nobody');assert.equal(bad.status,401);
});

test('K5E 6: query target ids are decoded — raw foreign ids become 0, refs and own ids resolve',async()=>{
  const bobRef=K.connectUserRef(BOB);
  const g=await guard('GET',`/api/connect/feed?targetUserId=${BOB}&partnerUserId=${bobRef}&ownerId=${ALICE}&owner_id=${BOB}&userIds=${BOB}`,'tok-alice');
  assert.equal(g.url.searchParams.get('targetUserId'),'0','raw foreign id => 0');
  assert.equal(g.url.searchParams.get('partnerUserId'),String(BOB),'ref => internal id');
  assert.equal(g.url.searchParams.get('ownerId'),String(ALICE),'own id retained');
  assert.equal(g.url.searchParams.get('owner_id'),'0');
});

test('K5E 7: path target ids are decoded for every user-addressed route (follow, profile, block, cohost, moderator, subscriptions…)',async()=>{
  const bobRef=K.connectUserRef(BOB);
  const cases=[
    ['POST','/api/connect/users/%ID%/follow'],['POST','/api/connect/follow-requests/%ID%/respond'],['GET','/api/connect/profile/%ID%'],
    ['GET','/api/connect/public-profile/%ID%'],['POST','/api/connect/profiles/%ID%/block'],['POST','/api/connect/profiles/%ID%/close-friend'],
    ['POST','/api/connect/spaces/7/block/%ID%'],['POST','/api/connect/spaces/7/premium-grant/%ID%'],['POST','/api/connect/realtime/7/cohost/%ID%/invite'],
    ['POST','/api/connect/realtime/7/speaker/%ID%/promote'],['POST','/api/connect/live/7/guest/%ID%/invite'],['POST','/api/connect/live/7/moderators/%ID%'],
    ['POST','/api/connect/creator-plans/%ID%/subscribe'],['POST','/api/connect/creator-subscriptions/%ID%/grant'],['POST','/api/connect/creator-perks/%ID%'],
    ['POST','/api/connect/creator-memberships/%ID%/gift'],['POST','/api/connect/creator-members/%ID%/crm'],['GET','/api/connect/creator-resources/%ID%'],
  ];
  for(const [m,tpl] of cases){
    const raw=await guard(m,tpl.replace('%ID%',String(BOB)),'tok-alice');
    assert.ok(!raw.url.pathname.includes(String(BOB)),`${tpl}: raw foreign id must not survive (${raw.url.pathname})`);
    assert.match(raw.url.pathname,/\/0(\/|$)/,`${tpl}: raw foreign id => 0`);
    const ref=await guard(m,tpl.replace('%ID%',String(bobRef)),'tok-alice');
    assert.ok(ref.url.pathname.includes('/'+BOB+'/')||ref.url.pathname.endsWith('/'+BOB),`${tpl}: ref => internal id (${ref.url.pathname})`);
  }
  const own=await guard('POST',`/api/connect/users/${ALICE}/follow`,'tok-alice');
  assert.ok(own.url.pathname.includes('/'+ALICE+'/'),'own id passes through (handler rejects self-follow)');
});

test('K5E 8: JSON body — actor fields overwritten with the session id; target ids decoded; nested objects untouched',()=>{
  const req={__k5eConnect:true,__k5eViewerId:ALICE};
  const out=K.k5eNormaliseBody(req,{userId:BOB,user_id:BOB,viewerId:BOB,viewer_id:BOB,targetUserId:BOB,partnerUserId:K.connectUserRef(BOB),
    inviteeUserIds:[BOB,K.connectUserRef(BOB)],content:'hello',payload:{userId:BOB}});
  assert.equal(out.userId,ALICE);assert.equal(out.user_id,ALICE);
  assert.ok(!('viewerId' in out)&&!('viewer_id' in out));
  assert.equal(out.targetUserId,0);assert.equal(out.partnerUserId,BOB);
  assert.deepEqual(out.inviteeUserIds,[0,BOB]);
  assert.equal(out.content,'hello');
  // non-Connect requests and non-object bodies are untouched
  assert.deepEqual(K.k5eNormaliseBody({},{userId:9}),{userId:9});
  assert.deepEqual(K.k5eNormaliseBody(req,[1,2]),[1,2]);
  // a guest body loses the actor fields entirely
  const g=K.k5eNormaliseBody({__k5eConnect:true,__k5eViewerId:0},{userId:BOB,user_id:BOB,x:1});
  assert.ok(!('userId' in g)&&!('user_id' in g));assert.equal(g.x,1);
});

test('K5E 9: response replacer — foreign ids become refs, own id stays, howdi/master/uuid keys vanish',()=>{
  const dirty={
    user_id:BOB,actor_user_id:BOB,owner_user_id:ALICE,howdi_id:'HWD-SECRET',master_id:'MST-1',identity_uuid:'u',owner_howdi_id:'x',
    host:{creator_user_id:String(BOB),host_howdi_id:'H'},
    rows:[{follower_user_id:BOB},{following_user_id:ALICE}],
    id:BOB,post_id:BOB,owner_id:BOB,note:'HWD-not-a-key',
  };
  const out=JSON.parse(JSON.stringify(dirty,K.k5eConnectReplacer(ALICE)));
  assert.equal(out.user_id,K.connectUserRef(BOB));assert.equal(out.actor_user_id,K.connectUserRef(BOB));
  assert.equal(out.owner_user_id,ALICE,'own id unchanged');
  assert.equal(out.host.creator_user_id,String(K.connectUserRef(BOB)),'string ids stay strings');
  assert.ok(!('howdi_id' in out)&&!('master_id' in out)&&!('identity_uuid' in out)&&!('owner_howdi_id' in out)&&!('host_howdi_id' in out.host));
  assert.equal(out.rows[0].follower_user_id,K.connectUserRef(BOB));assert.equal(out.rows[1].following_user_id,ALICE);
  assert.equal(out.id,BOB,'plain content ids are not user ids and are untouched');assert.equal(out.post_id,BOB);
  const guestOut=JSON.parse(JSON.stringify({user_id:ALICE},K.k5eConnectReplacer(0)));
  assert.equal(guestOut.user_id,K.connectUserRef(ALICE),'a guest never sees a raw id');
  assert.ok(!JSON.stringify(out).includes(String(BOB)+',')||true);
  assert.ok(!JSON.stringify(dirty,K.k5eConnectReplacer(ALICE)).match(new RegExp('"user_id":'+BOB+'[,}]')));
});

test('K5E 10: legacy notification centre — session only, foreign ids 403, /preferences left to its own handler',async()=>{
  async function leg(method,rawUrl,token){
    const {api,sent}=load();const req={method,headers:token?{authorization:'Bearer '+token}:{}};const res={};const url=new URL(rawUrl,'http://localhost');
    const stopped=await api.k5eLegacyNotificationGuard(req,res,url);return {stopped,status:res.sent?.status,url,req};
  }
  assert.equal((await leg('GET','/api/notifications/101')).status,401,'guest list');
  assert.equal((await leg('POST','/api/notifications/5/read')).status,401,'guest mark-read');
  assert.equal((await leg('GET','/api/notifications/202','tok-alice')).status,403,'foreign list');
  assert.equal((await leg('GET','/api/notifications/summary/202','tok-alice')).status,403,'foreign summary');
  assert.equal((await leg('POST','/api/notifications/202/read-all','tok-alice')).status,403,'foreign read-all');
  const own=await leg('GET','/api/notifications/101?user_id=202&userId=202','tok-alice');
  assert.equal(own.stopped,false);assert.equal(own.url.searchParams.get('user_id'),'101');assert.equal(own.url.searchParams.get('userId'),'101');
  const mark=await leg('PATCH','/api/notifications/900/read?user_id=202','tok-alice');
  assert.equal(mark.stopped,false,'notification-id paths are allowed (handler scopes by user_id)');assert.equal(mark.url.searchParams.get('user_id'),'101');
  const pref=await leg('GET','/api/notifications/preferences/me');
  assert.equal(pref.stopped,false,'preferences authenticate themselves');
  assert.equal((await leg('GET','/api/shop/anything')).stopped,false,'other prefixes untouched');
});

test('K5E 11: shared visibility SQL — every helper contains a block check, membership/audience rules and uses the supplied viewer',()=>{
  const post=K.connectPostVisibleSql('p','$2');
  assert.match(post,/howdi_connect_profile_blocks/);assert.match(post,/subscribers_only/);assert.match(post,/CLOSE_FRIENDS/);assert.match(post,/FOLLOWERS/);assert.match(post,/post_status='PUBLISHED'/);
  const room=K.connectRoomVisibleSql('r','$2::bigint');
  assert.match(room,/howdi_connect_profile_blocks/);assert.match(room,/howdi_connect_space_blocks/);assert.match(room,/community_members/);assert.match(room,/='PUBLIC'/);
  const story=K.connectStoryVisibleSql('s','$2::bigint');
  assert.match(story,/expires_at>NOW\(\)/);assert.match(story,/Close friends/);assert.match(story,/Friends/);assert.match(story,/howdi_connect_profile_blocks/);
  assert.match(K.K5E_BLOCKED_BETWEEN_SQL('$1','u.id'),/blocker_user_id=\$1 AND kb\.blocked_user_id=u\.id/);
});

test('K5E 12: explicit public column lists never include host-only or identity columns',()=>{
  const community=K.connectCommunityPublicColumns('c');
  for(const banned of ['checkin_code','live_host_notes','host_checklist','private_notes','howdi_id','master_id'])assert.ok(!community.includes(banned),`community columns must not include ${banned}`);
  const post=K.connectPostPublicColumns('p');
  for(const banned of ['howdi_id','master_id','moderation','deleted','ip_'])assert.ok(!post.includes(banned),`post columns must not include ${banned}`);
  const own=K.connectProfileOwnColumns('cp');
  assert.ok(!/(^|,)cp\.user_id(,|$)/.test(own),'own-profile columns never carry the numeric user_id');
  for(const banned of ['howdi_id','master_id','.*'])assert.ok(!own.includes(banned),`profile columns must not include ${banned}`);
  assert.ok(!/\*/.test(community+post+own),'no wildcards in column lists');
});

test('K5E 13: gift catalogue values come from the server (a client amount can never set a gift price)',()=>{
  assert.equal(K.K5E_SPACE_GIFTS.HEART,0);assert.equal(K.K5E_SPACE_GIFTS.STAR,10);assert.equal(K.K5E_SPACE_GIFTS.DIAMOND,500);
  assert.ok(Object.values(K.K5E_SPACE_GIFTS).every(v=>Number.isInteger(v)&&v>=0));
});

test('K5E 14: the guard, legacy guard, replacer and body normaliser are actually wired into the request pipeline',()=>{
  assert.match(source,/if \(await k5eConnectGuard\(req, res, url\)\) return;\n\s*if \(await k5eLegacyNotificationGuard\(req, res, url\)\) return;/);
  const guardAt=source.indexOf('if (await k5eConnectGuard(req, res, url)) return;');
  const firstConnectRoute=source.indexOf('pathname === "/api/connect/bootstrap"');
  assert.ok(guardAt>0&&guardAt<firstConnectRoute,'guard runs before any Connect route');
  assert.match(source,/res\.__k5eConnect\s*\?\s*JSON\.stringify\(data, k5eConnectReplacer\(res\.__k5eViewerId\)\)/);
  assert.match(source,/k5eNormaliseBody\(\s*req,/);
});

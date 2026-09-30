// K5E — route-level regression tests for the closure fixes that have a dedicated handler:
//   /api/connect/bootstrap, /api/notifications/preferences/*, Vibe engagement notifications,
//   username-addressed collaborator / partner-goal / skill-endorsement targets.
// The REAL route source is extracted from server.js and executed in a vm against a query double that
// PROJECTS the selected columns of a deliberately "dirty" row (one that carries user_id, howdi_id, ...), so an
// explicit column list is proven by behaviour, not just by a source pin.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {Readable}=require('node:stream');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
function between(a,b){const start=source.indexOf(a);assert.notEqual(start,-1,a);const end=source.indexOf(b,start+a.length);assert.notEqual(end,-1,b);return source.slice(start,end);}

const helpers=between('    const CONNECT_NOTIFICATION_USER_ENTITIES','    function adminTokenHash');
const bootstrapRoute=between('            if (req.method === "GET" && pathname === "/api/connect/bootstrap") {','            // =====================================================\n            // HOWDI CONNECT V16.6K5A — HOME SHELL');
const prefRoutes=between('            const K5E_PREF_COLUMNS=','            if(req.method==="GET" && /^\\/api\\/notifications\\/summary\\/\\d+\\/?$/.test(pathname)){');
const vibeNotifRoute=between("            if(pathname==='/api/v1/vibes/engagement-notifications' && req.method==='GET'){","            if(pathname==='/api/v1/vibes/engagement-notifications/read-all'");
const partnerGoalRoute=between('            if(req.method==="POST"&&pathname==="/api/connect/partner-goals"){','            if(req.method==="POST"&&/^\\/api\\/connect\\/partner-goals\\/\\d+\\/checkin');
const endorsementRoute=between('            if(req.method==="POST"&&pathname==="/api/connect/skill-endorsement-request"){','            if(req.method==="PATCH"&&/^\\/api\\/connect\\/skill-endorsement-request\\/\\d+\\/respond');

const A=101,B=202,C=303;
const SESSIONS={'session-A':{id:A,full_name:'Alice Rao',howdi_id:'HOW-SECRET-A'},'session-B':{id:B,full_name:'Bob Singh',howdi_id:'HOW-SECRET-B'}};
const PROFILES={bob_singh:B,cara_devi:C};
const BLOCKED=[[A,C]]; // A <-> C are blocked

// Runs a route slice; returns {status,data(as the browser sees it: JSON through the real Connect replacer),calls}.
async function run(route_src,{method='GET',route,token='session-A',body={},viewer=null,extra={},query}={}){
  const calls=[];
  const q=query||(async(rawSql,params=[])=>{
    const sql=rawSql.replace(/\s+/g,' ').trim();calls.push({sql,params});
    if(sql.includes('FROM user_sessions s')){const u=SESSIONS[params[0]];return {rows:u?[u]:[]};}
    if(sql.startsWith('UPDATE user_sessions'))return {rows:[]};
    return extra.handler?extra.handler(sql,params):{rows:[]};
  });
  const pool={query:q,connect:async()=>({query:q,release(){}})};
  const url=new URL(route,'http://localhost');
  const req=Readable.from([JSON.stringify(body)]);req.method=method;req.headers=token?{authorization:'Bearer '+token}:{};
  // The real Connect pipeline: guard rewrites the request, the body normaliser runs inside getBody.
  const context={pool,req,res:{},url,pathname:url.pathname,URL,Buffer,crypto:require('node:crypto'),process:{env:{HOWDI_CONNECT_REF_SECRET:'route-test-secret'}},
    clean:x=>String(x??'').trim(),__last:null,sendJSON:(_r,status,data)=>(context.__last={status,data}),getVibeViewer:async()=>viewer,...(extra.context||{})};
  const prelude=`${helpers}
    const getBody=async(r)=>k5eNormaliseBody(r,JSON.parse(await new Promise(ok=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>ok(b||'{}'));})));
    const __guard=async()=>{ if(await k5eConnectGuard(req,res,url)) return true; return false; };
    globalThis.__replacer=k5eConnectReplacer; globalThis.__guard=__guard;`;
  const script=`${prelude}\n(async()=>{ if(await __guard()) return __last; const pathname=url.pathname; ${route_src} })()`;
  const response=await vm.runInNewContext(script,context);
  const viewerId=Number(context.req.__k5eViewerId||0);
  const wire=response?{status:response.status,data:JSON.parse(JSON.stringify(response.data,context.__replacer(viewerId)))}:{status:undefined,data:undefined};
  return {...wire,calls,viewerId,context};
}

// ------------------------------------------------------------------ bootstrap
function bootstrapHandler(sql,params){
  if(sql.startsWith('INSERT INTO howdi_connect_profiles(user_id)'))return {rows:[]};
  if(sql.includes('FROM users u LEFT JOIN howdi_connect_profiles cp ON cp.user_id=u.id LEFT JOIN user_profile_settings ps'))
    return {rows:[{public_username:'alice_rao',headline:'Teacher',private_profile:false,full_name:'Alice Rao',profile_image:'',post_count:2,follower_count:1,following_count:0,follow_request_count:0,profile_badges:[]}]};
  if(sql.startsWith('SELECT u.full_name,cp.public_username,COALESCE(ps.profile_image')&&sql.includes('LIMIT 12'))
    return {rows:[{full_name:'Bob Singh',public_username:'bob_singh',profile_image:'',following:false,verified:false,presence_status:'ONLINE'}]};
  if(sql.includes('FROM howdi_connect_communities c JOIN users u ON u.id=c.owner_user_id'))
    return {rows:[
      {id:5,owner_user_id:B,name:'Open Space',owner_name:'Bob Singh',owner_username:'bob_singh',community_type:'SPACE',privacy:'PUBLIC',audience_preview:[{public_username:'bob_singh',full_name:'Bob Singh',role:'HOST'}]},
      {id:6,owner_user_id:A,name:'My Room',owner_name:'Alice Rao',owner_username:'alice_rao',community_type:'LIVE',privacy:'PUBLIC',audience_preview:[]}]};
  if(sql.startsWith('SELECT post_id FROM howdi_connect_post_saves'))return {rows:[{post_id:11}]};
  if(sql.includes('FROM howdi_connect_notifications n WHERE n.user_id=$1 AND n.is_read=FALSE'))return {rows:[{n:3}]};
  if(sql.includes('FROM user_subscriptions us'))return {rows:[]};
  return {rows:[]};
}
const ID_KEY=/"(user_id|[a-z_]*_user_id|howdi_id|master_id|identity_uuid|viewer_id|viewerId|userId)"/;

test('K5E bootstrap 1: the viewer comes ONLY from the session — a spoofed ?userId / ?viewerId is never used',async()=>{
  const r=await run(bootstrapRoute,{route:'/api/connect/bootstrap?userId=202&user_id=202&viewerId=202',extra:{handler:bootstrapHandler}});
  assert.equal(r.status,200);
  assert.equal(r.data.profile.public_username,'alice_rao','the profile is the SESSION user\'s own');
  const own=r.calls.filter(c=>/howdi_connect_profiles\(user_id\)|LEFT JOIN howdi_connect_presence pr ON pr.user_id=u.id\s+WHERE u.id=\$1/.test(c.sql));
  assert.ok(own.length>=1);
  for(const c of r.calls.filter(c=>!c.sql.includes('user_sessions'))){
    assert.ok(!c.params.includes(B),`no query may be parameterised with the spoofed id: ${c.sql.slice(0,80)}`);
    assert.ok(c.params.length===0||c.params[0]===A,`first param is the session viewer: ${c.sql.slice(0,80)}`);
  }
  assert.ok(!/searchParams\.get\(["']userId["']\)|searchParams\.get\(["']viewerId["']\)/.test(bootstrapRoute),'the bootstrap handler never reads a client-supplied identity');
});

test('K5E bootstrap 2: no numeric user id and no howdi_id reaches the browser for OTHER members; people are @public_username only',async()=>{
  const r=await run(bootstrapRoute,{route:'/api/connect/bootstrap',extra:{handler:bootstrapHandler}});
  assert.equal(r.status,200);
  const wire=JSON.stringify(r.data);
  assert.ok(!/howdi_id|master_id|HOW-SECRET/.test(wire));
  assert.ok(!ID_KEY.test(JSON.stringify(r.data.people)),'people carry no id fields');
  assert.ok(!ID_KEY.test(JSON.stringify(r.data.profile)),'own profile carries no user_id');
  for(const p of r.data.people){assert.ok(p.public_username);assert.ok(!('id' in p));}
  // the foreign room owner id is an opaque reference, never 202; the caller's own room keeps its (own) id so the UI can detect ownership
  const open=r.data.communities.find(c=>c.name==='Open Space'),mine=r.data.communities.find(c=>c.name==='My Room');
  assert.notEqual(open.owner_user_id,B);assert.ok(open.owner_user_id>2**52);
  assert.equal(mine.owner_user_id,A);
  assert.equal(open.owner_username,'bob_singh');
  assert.ok(open.audience_preview.every(a=>a.public_username&&!('user_id' in a)));
  assert.deepEqual(Object.keys(r.data).sort(),['communities','membership','people','profile','saved_post_ids','status','unread_notifications']);
  assert.equal(r.data.unread_notifications,3);assert.deepEqual(r.data.saved_post_ids,['11']);
});

test('K5E bootstrap 3: guests get the public browsing shell (viewer 0, no own profile, no saved/unread) and still see safe public people',async()=>{
  const r=await run(bootstrapRoute,{route:'/api/connect/bootstrap?userId=101',token:null,extra:{handler:bootstrapHandler}});
  assert.equal(r.status,200);assert.equal(r.viewerId,0);
  assert.equal(r.data.profile,null);assert.deepEqual(r.data.saved_post_ids,[]);assert.equal(r.data.unread_notifications,0);assert.equal(r.data.membership,null);
  assert.ok(r.data.people.length>0&&r.data.communities.length>0,'public browsing preserved');
  assert.ok(!/howdi_id|master_id/.test(JSON.stringify(r.data)));
  assert.ok(!r.calls.some(c=>/INSERT INTO howdi_connect_profiles/.test(c.sql)),'a guest never creates a profile row');
  for(const c of r.calls.filter(c=>!c.sql.includes('user_sessions')))assert.ok(!c.params.includes(A)&&!c.params.includes(B),'guest queries never carry a spoofed id');
  const guestOwner=r.data.communities.find(c=>c.name==='My Room').owner_user_id;
  assert.notEqual(guestOwner,A,'a guest never sees a raw owner id either');
});

test('K5E bootstrap 4: people/room queries select an explicit public field list and filter blocked members both ways',async()=>{
  const r=await run(bootstrapRoute,{route:'/api/connect/bootstrap',extra:{handler:bootstrapHandler}});
  const people=r.calls.find(c=>c.sql.startsWith('SELECT u.full_name,cp.public_username')&&c.sql.includes('LIMIT 12')).sql;
  const list=people.slice(0,people.indexOf(' FROM users u'));
  assert.ok(!/(?:SELECT|,)\s*u\.id\s*(?:,|$)/.test(list),'people select list must not select u.id');
  for(const banned of ['u.*','cp.*','.*','howdi_id','master_id','email','phone'])assert.ok(!list.includes(banned),`people select list must not contain ${banned}`);
  assert.ok(!/(?:SELECT|,)\s*(?:cp\.)?user_id\s*(?:,|$)/.test(list),'people select list must not select a user_id column');
  assert.match(people,/public_username,''\)<>''/,'members without a public username are not listed');
  assert.match(people,/howdi_connect_profile_blocks/);
  const rooms=r.calls.find(c=>c.sql.includes('FROM howdi_connect_communities c JOIN users u ON u.id=c.owner_user_id')).sql;
  assert.ok(!/\bc\.\*/.test(rooms),'room list uses the explicit public column list');
  assert.ok(!rooms.includes('checkin_code')&&!rooms.includes('live_host_notes'));
  assert.match(rooms,/howdi_connect_space_blocks/);assert.match(rooms,/howdi_connect_profile_blocks/);
  const profile=r.calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_presence pr ON pr.user_id=u.id WHERE u.id=$1')).sql;
  assert.ok(!/\bcp\.\*/.test(profile)&&!/\bu\.\*/.test(profile),'own profile uses the explicit own-column list');
  assert.ok(!/(^|[ ,])(cp|u)\.(user_id|howdi_id|master_id)\b/.test(profile.slice(0,profile.indexOf(' FROM users u'))),'own-profile list omits user_id/howdi_id/master_id');
});

// ------------------------------------------------------------------ notification preferences
const PREF_ROW={user_id:A,orders_enabled:true,offers_enabled:false,wallet_enabled:true,rewards_enabled:true,messages_enabled:true,account_enabled:true,email_enabled:true,push_enabled:true,sms_enabled:false,quiet_hours_enabled:false,quiet_hours_start:'22:00',quiet_hours_end:'07:00',updated_at:'2026-09-19T00:00:00.000Z'};
function project(sql,row,verb){
  const m=verb==='RETURNING'?sql.match(/RETURNING (.+)$/):sql.match(/^SELECT (.+?) FROM user_notification_preferences/);
  if(!m)return row;
  if(m[1].trim()==='*')return {...row};
  const out={};for(const c of m[1].split(',').map(x=>x.trim())){out[c]=row[c];}return out;
}
function prefHandler(row=PREF_ROW){return (sql,params)=>{
  if(sql.startsWith('INSERT INTO user_notification_preferences'))return {rows:[]};
  if(/^SELECT .+ FROM user_notification_preferences WHERE user_id=\$1$/.test(sql))return {rows:[project(sql,row,'SELECT')]};
  if(sql.startsWith('UPDATE user_notification_preferences'))return {rows:[project(sql,{...row,orders_enabled:params[1],offers_enabled:params[2]},'RETURNING')]};
  return {rows:[]};
};}
const prefCall=(method,route,opts={})=>run(prefRoutes,{method,route,extra:{handler:prefHandler(),...(opts.extra||{})},...opts});

test('K5E preferences 1: GET /me and GET /<own id> return the session user\'s preferences WITHOUT the numeric user_id',async()=>{
  for(const route of ['/api/notifications/preferences/me',`/api/notifications/preferences/${A}`]){
    const r=await prefCall('GET',route);
    assert.equal(r.status,200,route);
    assert.equal(r.data.preferences.orders_enabled,true);
    assert.ok(!('user_id' in r.data.preferences),`${route}: user_id must be omitted`);
    assert.ok(!/user_id|howdi_id/.test(JSON.stringify(r.data)));
    const sel=r.calls.find(c=>/^SELECT .* FROM user_notification_preferences/.test(c.sql)).sql;
    assert.ok(!sel.includes('*')&&!/\buser_id\b/.test(sel.slice(0,sel.indexOf(' FROM'))),'explicit column list, no user_id, no wildcard');
    assert.equal(r.calls.find(c=>c.sql.startsWith('INSERT INTO user_notification_preferences')).params[0],A,'actor is the session user');
  }
});

test('K5E preferences 2: a foreign id is 403 for GET and PUT — identical for every id, and nothing is read or written',async()=>{
  for(const id of [B,C,1,999999]){
    for(const method of ['GET','PUT']){
      const r=await prefCall(method,`/api/notifications/preferences/${id}`,{body:{orders_enabled:false,user_id:id,userId:id}});
      assert.equal(r.status,403,`${method} ${id}`);
      assert.ok(!r.calls.some(c=>/user_notification_preferences/.test(c.sql)),'no preference query for a foreign id');
    }
  }
  const a=await prefCall('GET',`/api/notifications/preferences/${B}`),b=await prefCall('GET','/api/notifications/preferences/999999');
  assert.deepEqual(a.data,b.data,'existing and non-existing foreign ids are indistinguishable');
});

test('K5E preferences 3: guests and unknown sessions are 401',async()=>{
  for(const token of [null,'session-nobody']){
    for(const method of ['GET','PUT']){
      const r=await prefCall(method,'/api/notifications/preferences/me',{token});
      assert.equal(r.status,401,`${method} ${token}`);
      assert.ok(!r.calls.some(c=>/user_notification_preferences/.test(c.sql)));
    }
  }
});

test('K5E preferences 4: PUT is applied to the SESSION user, ignores body/query user ids, returns no user_id',async()=>{
  const r=await prefCall('PUT','/api/notifications/preferences/me?user_id=202',{body:{user_id:B,userId:B,orders_enabled:false,offers_enabled:true}});
  assert.equal(r.status,200);
  const upd=r.calls.find(c=>c.sql.startsWith('UPDATE user_notification_preferences'));
  assert.equal(upd.params[0],A,'UPDATE ... WHERE user_id=$1 is the session user');
  assert.ok(!upd.params.includes(B));
  assert.equal(r.data.preferences.orders_enabled,false);assert.equal(r.data.preferences.offers_enabled,true);
  assert.ok(!('user_id' in r.data.preferences));assert.ok(!/RETURNING \*/.test(upd.sql));
  assert.match(upd.sql,/RETURNING orders_enabled/);
});

// ------------------------------------------------------------------ Vibe engagement notifications
test('K5E vibe notifications: explicit safe fields (no n.*), actor by public identity, blocked actors hidden, scoped to the session viewer',async()=>{
  const r=await run(vibeNotifRoute,{route:'/api/v1/vibes/engagement-notifications',viewer:{id:A},extra:{handler:(sql)=>{
    if(sql.includes('FROM vibe_engagement_notifications n'))return {rows:[{id:1,notification_type:'LIKE',vibe_id:9,comment_id:null,message:'liked your vibe',is_read:false,created_at:'2026-09-19T00:00:00Z',actor_name:'Bob Singh',actor_username:'bob_singh',actor_avatar:null}]};
    return {rows:[]};
  }}});
  assert.equal(r.status,200);
  const q=r.calls.find(c=>c.sql.includes('FROM vibe_engagement_notifications n'));
  const list=q.sql.slice(q.sql.indexOf('SELECT')+6,q.sql.indexOf(' FROM vibe_engagement_notifications'));
  assert.ok(!/\bn\.\*/.test(q.sql)&&!list.includes('*'),'no wildcard');
  for(const banned of ['recipient_user_id','actor_user_id','n.user_id'])assert.ok(!list.includes(banned),`select list must not contain ${banned}`);
  assert.match(list,/n\.id,n\.notification_type,n\.vibe_id,n\.comment_id,n\.message,n\.is_read,n\.created_at/);
  assert.deepEqual(JSON.parse(JSON.stringify(q.params)),[String(A)],'scoped to the session viewer');
  assert.match(q.sql,/vibe_creator_blocks/);assert.match(q.sql,/howdi_connect_profile_blocks/,'blocked actors are hidden');
  const n=r.data.notifications[0];
  assert.deepEqual(n.actor,{name:'Bob Singh',username:'bob_singh',avatar:''});
  assert.ok(!/user_id/.test(JSON.stringify(r.data)),'no user id of any kind in the payload');
  assert.equal(r.data.unread,1);
  const guest=await run(vibeNotifRoute,{route:'/api/v1/vibes/engagement-notifications',viewer:null});
  assert.equal(guest.status,401);assert.equal(guest.calls.length,0);
});

// ------------------------------------------------------------------ username-addressed targets
const memberHandler=(extra)=>(sql,params)=>{
  if(sql.includes('FROM howdi_connect_profiles WHERE LOWER(public_username)=LOWER($1)')){const id=PROFILES[String(params[0]).toLowerCase()];return {rows:id?[{user_id:id}]:[]};}
  if(sql.startsWith('SELECT 1 FROM users u WHERE u.id=$1 AND NOT')){const [target,viewer]=params;const blocked=BLOCKED.some(([x,y])=>(x===viewer&&y===target)||(x===target&&y===viewer));return {rows:blocked?[]:[{'?column?':1}]};}
  return extra?extra(sql,params):{rows:[]};
};

test('K5E targets 1: partner goal is addressed by @username; spoofed body ids and raw foreign ids never select the partner',async()=>{
  const ok=await run(partnerGoalRoute,{method:'POST',route:'/api/connect/partner-goals',body:{userId:C,partnerUsername:'@Bob_Singh',title:'Study together'},extra:{handler:memberHandler((sql)=>sql.startsWith('INSERT INTO howdi_connect_partner_goals')?{rows:[{id:1,owner_user_id:A,partner_user_id:B,title:'Study together'}]}:{rows:[]})}});
  assert.equal(ok.status,201);
  const ins=ok.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_partner_goals'));
  assert.equal(ins.params[0],A,'owner is the session user, not the spoofed body userId');assert.equal(ins.params[1],B);
  assert.equal(ok.data.goal.owner_user_id,A);assert.ok(ok.data.goal.partner_user_id>2**52&&ok.data.goal.partner_user_id!==B,'response carries an opaque reference for the partner');
  for(const bad of [{partnerUsername:'nobody_here'},{partnerUserId:B},{partnerUserId:A},{partnerUsername:'@'+'x'.repeat(80)},{partnerUsername:"bob' OR '1'='1"}]){
    const r=await run(partnerGoalRoute,{method:'POST',route:'/api/connect/partner-goals',body:{title:'t',...bad},extra:{handler:memberHandler()}});
    assert.equal(r.status,400,JSON.stringify(bad));assert.ok(!r.calls.some(c=>c.sql.startsWith('INSERT INTO howdi_connect_partner_goals')));
  }
  const blocked=await run(partnerGoalRoute,{method:'POST',route:'/api/connect/partner-goals',body:{title:'t',partnerUsername:'cara_devi'},extra:{handler:memberHandler()}});
  assert.equal(blocked.status,404,'a blocked member is indistinguishable from an unknown one');
  const viaRef=await run(partnerGoalRoute,{method:'POST',route:'/api/connect/partner-goals',body:{title:'t',partnerUserId:ok.data.goal.partner_user_id},extra:{handler:memberHandler((sql)=>sql.startsWith('INSERT')?{rows:[{id:2}]}:{rows:[]})}});
  assert.equal(viaRef.status,201,'the opaque reference from a previous response is still a valid target');
  const guest=await run(partnerGoalRoute,{method:'POST',route:'/api/connect/partner-goals',token:null,body:{title:'t',partnerUsername:'bob_singh'}});
  assert.equal(guest.status,401,'guests are stopped by the pipeline guard before the handler runs');
  assert.ok(!guest.calls.some(c=>/partner_goals|howdi_connect_profiles/.test(c.sql)));
});

test('K5E targets 2: skill endorsement request — @username target, own-skill check, block check, no foreign id accepted',async()=>{
  const h=memberHandler((sql,params)=>{
    if(sql.startsWith('SELECT user_id FROM howdi_connect_skill_passport WHERE id=$1'))return {rows:[{user_id:params[0]===7?A:B}]};
    if(sql.startsWith('INSERT INTO howdi_connect_skill_endorsement_requests'))return {rows:[{id:5,skill_id:params[0],request_status:'PENDING',created_at:'2026-09-19'}]};
    return {rows:[]};
  });
  const ok=await run(endorsementRoute,{method:'POST',route:'/api/connect/skill-endorsement-request',body:{skillId:7,targetUsername:'bob_singh',message:'hi'},extra:{handler:h}});
  assert.equal(ok.status,201);
  const ins=ok.calls.find(c=>c.sql.startsWith('INSERT INTO howdi_connect_skill_endorsement_requests'));
  assert.deepEqual(JSON.parse(JSON.stringify(ins.params.slice(0,3))),[7,A,B]);
  assert.ok(!JSON.stringify(ok.data).includes('user_id'),'the created request does not echo any user id');
  const other=await run(endorsementRoute,{method:'POST',route:'/api/connect/skill-endorsement-request',body:{skillId:8,targetUsername:'bob_singh'},extra:{handler:h}});
  assert.equal(other.status,403,'cannot request endorsement for somebody else\'s skill');
  for(const bad of [{targetUsername:'ghost'},{targetUserId:B},{targetUsername:'cara_devi'}]){
    const r=await run(endorsementRoute,{method:'POST',route:'/api/connect/skill-endorsement-request',body:{skillId:7,...bad},extra:{handler:h}});
    assert.ok([400,404].includes(r.status),JSON.stringify(bad)+' => '+r.status);
    assert.ok(!r.calls.some(c=>c.sql.startsWith('INSERT INTO howdi_connect_skill_endorsement_requests')));
  }
});

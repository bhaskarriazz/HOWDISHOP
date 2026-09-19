// K5E — review-closure regression tests (hermetic). The behaviour of each fix is pinned end-to-end against real
// PostgreSQL in k5e-pg/07-review-closure.cjs; these tests pin the pure logic and the wiring, without a database.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
const app=fs.readFileSync(path.join(__dirname,'../../apps/customer/src/App.jsx'),'utf8').replace(/\r\n/g,'\n');
function between(a,b){const start=source.indexOf(a);assert.notEqual(start,-1,a);const end=source.indexOf(b,start+a.length);assert.notEqual(end,-1,b);return source.slice(start,end);}
const k5eSource=between('    const K5E_REF_BASE = 2 ** 52;','    function adminTokenHash');
function load(pool){
  const ctx={crypto,Buffer,URL,console,process:{env:{HOWDI_CONNECT_REF_SECRET:'closure'}},pool,getSessionUserFromRequest:async()=>null,sendJSON:()=>{}};
  vm.createContext(ctx);
  return vm.runInContext(`${k5eSource}\n;({k5eNormaliseBody,connectCanContact,connectPostVisibleSql,connectStoryVisibleSql,k5ePrivateProfileOkSql,k5eActiveRoomMember,connectRoomVisibleSql})`,ctx);
}
const NOPOOL={query:async()=>({rows:[]})};

test('K5E closure 1: a JSON null / primitive body on a Connect request is an empty object, never a crash',()=>{
  const K=load(NOPOOL);
  for(const raw of [null,7,'x',true,false,0,'']){
    const out=K.k5eNormaliseBody({__k5eConnect:true,__k5eViewerId:5},raw);
    assert.equal(typeof out,'object',String(raw));assert.notEqual(out,null);
    assert.equal(JSON.stringify(Object.keys(out)),'["userId","user_id"]',String(raw)); // only the session identity is present
  }
  assert.ok(Array.isArray(K.k5eNormaliseBody({__k5eConnect:true,__k5eViewerId:5},[])),'arrays pass through untouched');
  assert.equal(K.k5eNormaliseBody({__k5eConnect:false},null),null,'non-Connect requests are not rewritten');
  const o=K.k5eNormaliseBody({__k5eConnect:true,__k5eViewerId:5},{userId:99,user_id:98,x:1});
  assert.equal(o.userId,5);assert.equal(o.user_id,5);assert.equal(o.x,1);
});

function contactPool({mode,follows=[]}){
  const calls=[];
  return {calls,query:async(sql,params)=>{
    calls.push(sql);
    if(/contact_permission/.test(sql))return {rows:mode===undefined?[]:[{cp:mode}]};
    if(/howdi_connect_follows/.test(sql)){const [a,b]=params.map(Number);return {rows:follows.some(f=>f[0]===a&&f[1]===b)?[{}]:[]};}
    return {rows:[]};
  }};
}
test('K5E closure 2: connectCanContact honours EVERYONE / FOLLOWERS / FOLLOWING / NO_ONE (mirrors the profile canMessage flag)',async()=>{
  // viewer 1 -> target 2
  const can=async(mode,follows)=>load(contactPool({mode,follows})).connectCanContact(1,2);
  assert.equal(await can('EVERYONE',[]),true);
  assert.equal(await can(undefined,[]),true,'no profile row = default EVERYONE');
  assert.equal(await can('NO_ONE',[[1,2],[2,1]]),false,'NO_ONE beats every follow');
  assert.equal(await can('FOLLOWERS',[]),false);
  assert.equal(await can('FOLLOWERS',[[1,2]]),true,'the viewer follows the target');
  assert.equal(await can('FOLLOWERS',[[2,1]]),false,'the target following the viewer is not enough');
  assert.equal(await can('FOLLOWING',[]),false);
  assert.equal(await can('FOLLOWING',[[2,1]]),true,'the target follows the viewer');
  assert.equal(await can('FOLLOWING',[[1,2]]),false);
  assert.equal(await can('SOMETHING_ELSE',[[1,2],[2,1]]),false,'an unknown mode fails closed');
  const K=load(contactPool({mode:'NO_ONE'}));
  assert.equal(await K.connectCanContact(3,3),true,'yourself');
  assert.equal(await K.connectCanContact(0,2),false);assert.equal(await K.connectCanContact(1,0),false);assert.equal(await K.connectCanContact(undefined,2),false);
});

test('K5E closure 3: post and story visibility both carry the private-profile clause; the feed applies it too',()=>{
  const K=load(NOPOOL);
  const clause=K.k5ePrivateProfileOkSql('p.user_id','$1::bigint');
  assert.match(clause,/private_profile/);assert.match(clause,/p\.user_id=\$1::bigint/);assert.match(clause,/howdi_connect_follows/);
  assert.ok(K.connectPostVisibleSql('p','$2::bigint').includes(K.k5ePrivateProfileOkSql('p.user_id','$2::bigint')),'posts');
  assert.ok(K.connectStoryVisibleSql('s','$1::bigint').includes(K.k5ePrivateProfileOkSql('s.user_id','$1::bigint')),'stories');
  const feed=between('pathname === "/api/connect/feed"','return sendJSON(res, 200, {');
  assert.match(feed,/k5ePrivateProfileOkSql\("p\.user_id"/,'the feed has its own inline WHERE and must apply the clause itself');
});

test('K5E closure 4: room participation is "active row AND room still visible" (a later block ends it)',async()=>{
  const seen=[];
  const K=load({query:async(sql,params)=>{seen.push({sql,params});return {rows:[{}]};}});
  assert.equal(await K.k5eActiveRoomMember(7,5),true);
  const {sql,params}=seen[0];
  assert.match(sql,/left_at IS NULL/);assert.match(sql,/howdi_connect_profile_blocks/,'profile blocks');assert.match(sql,/howdi_connect_space_blocks/,'space blocks');
  assert.equal(JSON.stringify(params.map(Number)),'[7,5]');
  assert.equal(await K.k5eActiveRoomMember(0,5),false);assert.equal(await K.k5eActiveRoomMember(7,0),false);assert.equal(await K.k5eActiveRoomMember('x',5),false);
  const none=load({query:async()=>({rows:[]})});assert.equal(await none.k5eActiveRoomMember(7,5),false);
});

const handler=(method,re)=>{const at=source.indexOf(`if(req.method==="${method}"&&/^\\/api\\/connect\\/${re}`);assert.notEqual(at,-1,re);return source.slice(at,source.indexOf('\n            if(req.method===',at+40));};
test('K5E closure 5: the wiring — every entry point that opens contact or acts inside a room is gated',()=>{
  const start=between('async function startConnectConversationWith(','async function resolveConnectUsernameToId');
  assert.match(start,/connectCanContact\(userId,target\)/,'DM start');
  assert.match(handler('POST','conversations\\/\\d+\\/messages'),/connectCanContact\(userId,peerId\)/,'DM send');
  assert.match(between('if(req.method==="POST"&&pathname==="/api/connect/calls"){','if(req.method==="GET"&&pathname==="/api/connect/calls/inbox"'),/connectCanContact\(callerId,inv\)/,'call create');
  for(const [m,re] of [['POST','realtime\\/\\d+\\/reaction'],['POST','realtime\\/\\d+\\/chat\\/?\\$/'],['POST','realtime\\/\\d+\\/tip'],['POST','realtime\\/\\d+\\/questions\\/?\\$/'],['POST','realtime\\/\\d+\\/raise-hand']]){
    const h=handler(m,re.replace('\\$/','')) ;assert.match(h,/k5eActiveRoomMember\(/,re);
  }
  for(const [m,re] of [['POST','spaces\\/\\d+\\/rating'],['POST','spaces\\/\\d+\\/quest'],['POST','spaces\\/\\d+\\/feedback']])assert.match(handler(m,re),/connectRoomVisibleSql\(/,re);
  assert.match(handler('POST','realtime\\/\\d+\\/heartbeat'),/connectRoomVisibleSql\(/,'heartbeat');
  assert.match(handler('POST','realtime\\/\\d+\\/signal'),/K5E_BLOCKED_BETWEEN_SQL/,'room signal across a block');
  assert.match(handler('POST','calls\\/\\d+\\/signal'),/K5E_BLOCKED_BETWEEN_SQL/,'call signal across a block');
  const rep=handler('POST','live\\/\\d+\\/report');assert.match(rep,/connectRoomVisibleToViewer\(cid,uid\)/);assert.match(rep,/realtime_participants/,'the reported member must be in the room');
  assert.match(handler('POST','calls\\/\\d+\\/leave'),/RETURNING call_id/,'leave only touches the caller\'s own participant row');
  assert.match(handler('POST','calls\\/\\d+\\/leave'),/if\(!leftRow\)return sendJSON\(res,404/);
  const join=handler('POST','realtime\\/\\d+\\/join');assert.doesNotMatch(join,/room\.community_type==='SPACE'&&Number\(room\.owner_user_id\)!==userId\)\{\s*const accessRules/,'subscribers-only / premium apply to every room type');
  const state=handler('GET','calls\\/\\d+\\/state');assert.match(state,/ELSE NULL END token/,'call-state tokens are withheld from members who are no longer live');
});

test('K5E closure 6: network-graph and relationship-intelligence people carry user_id, not a raw id; App.jsx follows that contract',()=>{
  for(const p of ['/api/connect/network-graph','/api/connect/relationship-intelligence']){
    const h=between(`if(req.method==="GET"&&pathname==="${p}")`,'return sendJSON(res,200,');
    const sel=h.match(/const people=\(await pool\.query\(`SELECT ([^\n]*)/)[1];
    assert.match(sel,/^u\.id AS user_id,/,p);assert.doesNotMatch(sel,/(^|,)u\.id(,|$)/,p);
  }
  assert.doesNotMatch(app,/otherUserId:Number\(person\.id\|\|/);assert.match(app,/otherUserId:Number\(person\.user_id\|\|person\.other_user_id\|\|person\.id\)/);
  assert.match(app,/partnerUserId:Number\(person\.user_id\|\|person\.id\)/);assert.match(app,/toUserId:Number\(person\.user_id\|\|person\.id\)/);
  assert.doesNotMatch(app,/connectRelationshipIntel\.people\|\|\[\]\)\.slice\(0,40\)\.map\(p=><article key=\{p\.id\}>/);
});

test('K5E closure 7: the ref secret is documented and warned about when unset',()=>{
  assert.match(source,/HOWDI_CONNECT_REF_SECRET/);
  const env=fs.readFileSync(path.join(__dirname,'../.env.example'),'utf8');assert.match(env,/HOWDI_CONNECT_REF_SECRET=/);
});

// K5D — HOWDI Connect Notifications security & UX regression tests.
// Runs the REAL route/helper source extracted from server.js inside a vm against a stateful,
// in-memory database double (no live PostgreSQL, no server startup) — same approach as the K3 suite.
// The double intentionally returns "dirty" rows (user_id, actor_user_id, howdi_id, raw entity_id)
// so the no-leak assertions exercise the public allow-list rather than passing trivially.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {Readable}=require('node:stream');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
const app=fs.readFileSync(path.join(__dirname,'../../apps/customer/src/App.jsx'),'utf8').replace(/\r\n/g,'\n');
function between(a,b){const start=source.indexOf(a);assert.notEqual(start,-1,a);const end=source.indexOf(b,start+a.length);assert.notEqual(end,-1,b);return source.slice(start,end);}

const helpers=between('    const CONNECT_NOTIFICATION_USER_ENTITIES','    function adminTokenHash');
const notificationRoutes=between('            if(req.method==="GET"&&pathname==="/api/connect/notifications"){','            // HOWDI CONNECT STORIES — V16.6K2');
const reminderRoute=between('            if(req.method==="GET"&&pathname==="/api/connect/reminders/due"){','            if(req.method==="POST"&&/^\\/api\\/connect\\/spaces\\/\\d+\\/replay\\/?$/.test(pathname)){');
const bootstrapRoute=between('            if (req.method === "GET" && pathname === "/api/connect/bootstrap") {','            // =====================================================\n            // HOWDI CONNECT V16.6K5A — HOME SHELL');

const A=101,B=202,C=303;
const SESSIONS={'session-A':{id:A,full_name:'Alice Rao',howdi_id:'HOW-SECRET-A'},'session-B':{id:B,full_name:'Bob Singh',howdi_id:'HOW-SECRET-B'}};

function seed(){
  return {
    users:{
      [A]:{full_name:'Alice Rao',public_username:'alice_rao',avatar:'data:image/png;base64,QUFB',howdi_id:'HOW-SECRET-A'},
      [B]:{full_name:'Bob Singh',public_username:'bob_singh',avatar:'',howdi_id:'HOW-SECRET-B'},
      [C]:{full_name:'Cara Devi',public_username:'cara_devi',avatar:'',howdi_id:'HOW-SECRET-C'},
      404:{full_name:'No Profile',public_username:null,avatar:'',howdi_id:'HOW-SECRET-D'}
    },
    blocks:[],
    notifications:[
      // Alice's inbox (2 unread + 1 read)
      {id:9001,user_id:A,actor_user_id:B,notification_type:'FOLLOW',entity_type:'USER',entity_id:String(B),message:'Bob Singh followed you',is_read:false,created_at:'2026-09-19T05:00:00.000Z'},
      {id:9002,user_id:A,actor_user_id:C,notification_type:'POST_COLLAB_INVITE',entity_type:'POST',entity_id:'7001',message:'You were invited to collaborate on a HOWDI post',is_read:false,created_at:'2026-09-19T04:00:00.000Z'},
      {id:9003,user_id:A,actor_user_id:B,notification_type:'SPACE_LIVE',entity_type:'SPACE',entity_id:'7002',message:'A Space you follow is live',is_read:true,created_at:'2026-09-19T03:00:00.000Z'},
      // Bob's inbox (2 unread) — must never be visible to / changeable by Alice
      {id:9004,user_id:B,actor_user_id:A,notification_type:'FOLLOW',entity_type:'USER',entity_id:String(A),message:'Alice Rao followed you',is_read:false,created_at:'2026-09-19T05:30:00.000Z'},
      {id:9005,user_id:B,actor_user_id:C,notification_type:'STORY_REPLY',entity_type:'STORY',entity_id:'7003',message:'Replied to your story',is_read:false,created_at:'2026-09-19T05:10:00.000Z'}
    ],
    inserts:[]
  };
}

function blockedBetween(db,x,y){return db.blocks.some(b=>(b.blocker===x&&b.blocked===y)||(b.blocker===y&&b.blocked===x));}
function visible(db,n){return n.actor_user_id==null||!blockedBetween(db,n.user_id,n.actor_user_id);}

async function call(method,route,{token='session-A',body={},db=seed(),route_src=notificationRoutes,anonymous=false}={}){
  const calls=[];
  const query=async(rawSql,params=[])=>{
    const sql=rawSql.replace(/\s+/g,' ').trim();calls.push({sql,params});let rows=[];let rowCount;
    if(sql.includes('FROM user_sessions s')){const u=SESSIONS[params[0]];rows=u?[u]:[];}
    else if(sql.startsWith('UPDATE user_sessions'))rows=[];
    else if(sql.includes('LEFT JOIN howdi_connect_profiles tcp')){
      const [uid,limit,types,sinceHours]=params;
      rows=db.notifications
        .filter(n=>n.user_id===Number(uid)&&visible(db,n))
        .filter(n=>!types||types.includes(n.notification_type))
        .filter(n=>sinceHours==null||(Date.parse('2026-09-19T06:00:00.000Z')-Date.parse(n.created_at))<=sinceHours*3600000)
        .sort((x,y)=>Date.parse(y.created_at)-Date.parse(x.created_at)||y.id-x.id)
        .slice(0,limit)
        .map(n=>{
          const actor=db.users[n.actor_user_id]||{};const userTyped=['USER','CREATOR','PROFILE'].includes(String(n.entity_type).toUpperCase());
          const tgtId=userTyped&&/^\d{1,18}$/.test(n.entity_id)?Number(n.entity_id):null;
          const tgt=tgtId&&db.users[tgtId]&&!blockedBetween(db,n.user_id,tgtId)?db.users[tgtId]:null;
          return {
            ...n, // DIRTY on purpose: user_id, actor_user_id and raw entity_id are present in the DB row
            entity_ref:userTyped?null:n.entity_id,
            actor_name:actor.full_name||null,actor_public_username:actor.public_username||null,actor_avatar:actor.avatar||'',
            actor_howdi_id:actor.howdi_id,howdi_id:actor.howdi_id,
            target_public_username:tgt?tgt.public_username:null
          };
        });
    }
    else if(sql.startsWith('SELECT COUNT(*)::int n FROM howdi_connect_notifications')){
      rows=[{n:db.notifications.filter(n=>n.user_id===Number(params[0])&&!n.is_read&&visible(db,n)).length}];
    }
    else if(sql.startsWith('UPDATE howdi_connect_notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2')){
      const hit=db.notifications.find(n=>String(n.id)===String(params[0])&&n.user_id===Number(params[1]));
      if(hit){hit.is_read=true;rows=[{id:hit.id}];}
    }
    else if(sql.startsWith('UPDATE howdi_connect_notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE')){
      const hits=db.notifications.filter(n=>n.user_id===Number(params[0])&&!n.is_read);hits.forEach(n=>{n.is_read=true;});rowCount=hits.length;rows=[];
    }
    else if(sql.startsWith('INSERT INTO howdi_connect_notifications')){db.inserts.push({sql,params});rows=[];}
    return {rows,rowCount:rowCount??rows.length};
  };
  const pool={query,connect:async()=>({query,release(){}})};
  const req=Readable.from([JSON.stringify(body)]);req.method=method;req.headers=anonymous?{}:{authorization:'Bearer '+token};
  const context={pool,req,res:{},url:new URL(route,'http://localhost'),pathname:route.split('?')[0],URL,Buffer,crypto:require('node:crypto'),clean:x=>String(x??'').trim(),sendJSON:(_res,status,data)=>({status,data})};
  const response=await vm.runInNewContext(helpers+'\n(async()=>{'+route_src+'})()',context);
  return {response,calls,db};
}
// JSON round-trip = what a client actually receives, and it strips the vm realm's prototypes so deepStrictEqual works.
const wire=r=>({...r,status:r.response?.status,data:r.response?JSON.parse(JSON.stringify(r.response.data)):undefined});
const get=(route,opts)=>call('GET',route,opts).then(wire);
const send=(method,route,opts)=>call(method,route,opts).then(wire);
const notifSql=calls=>calls.filter(c=>/howdi_connect_notifications/.test(c.sql));
const FORBIDDEN_KEYS=/"(user_id|actor_user_id|actor_howdi_id|howdi_id|entity_id|sender_user_id|sender_id|recipient_user_id|recipient_id|master_id|identity_uuid)"/;

// ---------------------------------------------------------------- 1. missing session
test('every private notification route returns 401 without a valid session, and touches no notification data',async()=>{
  const cases=[
    ['GET','/api/connect/notifications'],['GET','/api/connect/notifications?userId=101'],
    ['GET','/api/connect/notifications/unread-count?userId=101'],
    ['PATCH','/api/connect/notifications/9001/read'],['POST','/api/connect/notifications/9001/read'],
    ['PATCH','/api/connect/notifications/read-all'],['POST','/api/connect/notifications/read-all']
  ];
  for(const [method,route] of cases){
    for(const opts of [{anonymous:true},{token:'not-a-real-session'}]){
      const r=await send(method,route,{...opts,body:{userId:A,user_id:A}});
      assert.equal(r.status,401,`${method} ${route} ${JSON.stringify(opts)}`);
      assert.deepEqual(r.data,{status:'error',message:'Login required'});
      assert.equal(notifSql(r.calls).length,0,`${method} ${route} must not query notifications without a session`);
    }
  }
  const rem=await get('/api/connect/reminders/due?userId=101',{anonymous:true,route_src:reminderRoute});
  assert.equal(rem.status,401);assert.equal(notifSql(rem.calls).length,0);
  assert.equal(rem.db.inserts.length,0,'anonymous reminders/due must not create notification rows');
});

// ---------------------------------------------------------------- 2. spoofed userId ignored
test('a spoofed userId (query or body) is ignored: the session user is always the acting user',async()=>{
  // Session A asks for B's inbox.
  const list=await get('/api/connect/notifications?userId=202&user_id=202&viewerId=202',{body:{userId:B}});
  assert.equal(list.status,200);
  assert.deepEqual(list.data.notifications.map(n=>n.id),['9001','9002','9003'],"only session A's notifications");
  assert.equal(list.data.unread_count,2);
  const listQuery=list.calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_profiles tcp'));
  assert.equal(listQuery.params[0],A,'list query is scoped to the session user id, not the spoofed one');
  assert.match(listQuery.sql,/WHERE n\.user_id=\$1/);

  const count=await get('/api/connect/notifications/unread-count?userId=202');
  assert.deepEqual(count.data,{status:'success',unread_count:2});

  // Spoofed body userId on read-all must only mark the session user's rows.
  const all=await send('POST','/api/connect/notifications/read-all?userId=202',{body:{userId:B,user_id:B}});
  assert.equal(all.status,200);assert.equal(all.data.marked,2);assert.equal(all.data.unread_count,0);
  assert.equal(all.db.notifications.filter(n=>n.user_id===B&&!n.is_read).length,2,"B's notifications remain unread");

  // reminders/due: rows are created for, and returned to, the session user only.
  const rem=await get('/api/connect/reminders/due?userId=202',{route_src:reminderRoute});
  assert.equal(rem.status,200);
  assert.equal(rem.db.inserts.length,1);assert.equal(rem.db.inserts[0].params[0],A,'reminder INSERT ... WHERE sr.user_id=$1 uses the session user');
  assert.deepEqual(rem.data.notifications.map(n=>n.id),['9003'],'only Alice’s SPACE_LIVE row within 24h');
  const remQuery=rem.calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_profiles tcp'));assert.equal(remQuery.params[0],A);

  // Static guarantee: none of the notification routes read a client-supplied user identity.
  for(const src of [notificationRoutes,reminderRoute]){
    assert.doesNotMatch(src,/searchParams\.get\(["'](userId|user_id|viewerId)["']\)/);
    assert.doesNotMatch(src,/body\.(userId|user_id|viewerId)/);
    assert.doesNotMatch(src,/getBody\(/,'notification routes never parse a request body for identity');
    assert.match(src,/getSessionUserFromRequest\(req\)/);
  }
});

// ---------------------------------------------------------------- 3. cross-user access denied
test('a user cannot read or change another user’s notifications; foreign and missing ids look identical',async()=>{
  const db=seed();
  const foreign=await send('PATCH','/api/connect/notifications/9004/read',{token:'session-A',db,body:{userId:B}});
  assert.equal(foreign.status,404);assert.deepEqual(foreign.data,{status:'error',message:'Notification not found'});
  assert.equal(db.notifications.find(n=>n.id===9004).is_read,false,"B's notification must stay unread");
  const update=foreign.calls.find(c=>c.sql.startsWith('UPDATE howdi_connect_notifications'));
  assert.match(update.sql,/WHERE id=\$1 AND user_id=\$2/,'ownership enforced in the UPDATE itself');
  assert.deepEqual([...update.params],['9004',A],'owner param is the session user id');

  const missing=await send('PATCH','/api/connect/notifications/999999/read',{token:'session-A',db});
  assert.equal(missing.status,404);assert.deepEqual(missing.data,foreign.data,'no existence oracle: same response for foreign and missing ids');

  // POST alias is guarded identically.
  const viaPost=await send('POST','/api/connect/notifications/9005/read',{token:'session-A',db});
  assert.equal(viaPost.status,404);assert.equal(db.notifications.find(n=>n.id===9005).is_read,false);

  // A's own list never contains B's rows and vice-versa.
  const a=await get('/api/connect/notifications',{token:'session-A',db});const b=await get('/api/connect/notifications',{token:'session-B',db});
  assert.deepEqual(a.data.notifications.map(n=>n.id).sort(),['9001','9002','9003']);
  assert.deepEqual(b.data.notifications.map(n=>n.id).sort(),['9004','9005']);

  // Owner can mark their own.
  const own=await send('PATCH','/api/connect/notifications/9004/read',{token:'session-B',db});
  assert.equal(own.status,200);assert.equal(db.notifications.find(n=>n.id===9004).is_read,true);
  // Non-numeric / oversized ids never reach the database.
  const bad=await send('PATCH','/api/connect/notifications/abc/read',{token:'session-A',db});assert.equal(bad.response,undefined);
  assert.equal(notifSql(bad.calls).length,0);
});

// ---------------------------------------------------------------- 4. no ID leaks
test('no notification response exposes user ids, HOWDI ids, sender/recipient/actor ids or raw user-typed entity ids',async()=>{
  const db=seed();
  db.notifications.push(
    {id:9010,user_id:A,actor_user_id:B,notification_type:'MEMBERSHIP_GIFT',entity_type:'CREATOR',entity_id:String(C),message:'You received a gifted creator membership',is_read:false,created_at:'2026-09-19T05:40:00.000Z'},
    {id:9011,user_id:A,actor_user_id:C,notification_type:'LEARNING_PARTNER',entity_type:'PROFILE',entity_id:String(C),message:'Someone invited you to learn together',is_read:false,created_at:'2026-09-19T05:41:00.000Z'}
  );
  const responses=[
    await get('/api/connect/notifications',{db}),
    await get('/api/connect/notifications/unread-count',{db}),
    await send('PATCH','/api/connect/notifications/9001/read',{db}),
    await send('PATCH','/api/connect/notifications/read-all',{db}),
    await get('/api/connect/reminders/due',{db:seed(),route_src:reminderRoute})
  ];
  for(const r of responses){
    const json=JSON.stringify(r.data);
    assert.doesNotMatch(json,FORBIDDEN_KEYS,json);
    assert.doesNotMatch(json,/HOW-SECRET/,'HOWDI ids never appear');
    assert.doesNotMatch(json,/[":]\s*"?(101|202|303|404)"?\s*[,}\]]/,'raw numeric user ids never appear as values: '+json);
  }
  // The list carries public identity instead.
  const list=responses[0].data.notifications;
  const follow=list.find(n=>n.id==='9001');
  assert.equal(follow.actor_public_username,'bob_singh');assert.equal(follow.actor_name,'Bob Singh');
  assert.deepEqual(follow.target,{kind:'PROFILE',username:'bob_singh'},'FOLLOW target is the actor’s @public_username, not their numeric id');
  const gift=list.find(n=>n.id==='9010');assert.deepEqual(gift.target,{kind:'PROFILE',username:'cara_devi'});
  assert.equal(list.find(n=>n.id==='9011').target.username,'cara_devi');
  // Allow-list: every item has exactly the public keys, nothing more.
  for(const n of list)assert.deepEqual(Object.keys(n).sort(),['actor_avatar','actor_name','actor_public_username','created_at','id','is_read','message','notification_type','target']);
  assert.equal(follow.actor_avatar,'', 'Bob has no avatar');
  assert.match(list.find(n=>n.id==='9002').actor_avatar,/^$/, 'Cara has no avatar');
  const bobInbox=(await get('/api/connect/notifications',{db,token:'session-B'})).data.notifications;
  assert.equal(bobInbox.find(n=>n.id==='9004').actor_avatar,'data:image/png;base64,QUFB','avatar is surfaced');
  assert.equal(bobInbox.find(n=>n.id==='9004').actor_public_username,'alice_rao');

  // SELECT list itself never names identity columns; entity_id only survives inside the user-type CASE guard.
  const sql=responses[0].calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_profiles tcp')).sql;
  const selectList=sql.slice(0,sql.indexOf(' FROM howdi_connect_notifications n'));
  assert.doesNotMatch(selectList,/howdi_id|n\.actor_user_id|n\.user_id|\bn\.\*|master_id|identity_uuid/);
  assert.equal((selectList.match(/entity_id/g)||[]).length,1);
  assert.match(selectList,/CASE WHEN UPPER\(COALESCE\(n\.entity_type,''\)\) IN\('USER','CREATOR','PROFILE'\) THEN NULL ELSE n\.entity_id END entity_ref/);
  // And the old blocker query shape is gone from the source.
  assert.doesNotMatch(source,/SELECT n\.\*,u\.full_name actor_name,u\.howdi_id actor_howdi_id/);
  assert.doesNotMatch(notificationRoutes+reminderRoute,/howdi_id|SELECT n\.\*/);
});

// ---------------------------------------------------------------- 5. navigation targets
test('valid Connect navigation targets are preserved for Vibes, Articles, Profiles, Groups/Channels and Calls',async()=>{
  const db=seed();db.notifications.length=0;
  const mk=(id,entity_type,entity_id,extra={})=>db.notifications.push({id,user_id:A,actor_user_id:B,notification_type:'X',entity_type,entity_id,message:'m',is_read:false,created_at:`2026-09-19T05:${String(id-8000).padStart(2,'0')}:00.000Z`,...extra});
  mk(8001,'VIBE','7101');mk(8002,'ARTICLE','7102');mk(8003,'USER',String(C));mk(8004,'PROFILE',String(B));mk(8005,'CREATOR',String(C));
  mk(8006,'GROUP','7103');mk(8007,'CHANNEL','7104');mk(8008,'SOCIAL_SPACE','7105');mk(8009,'CALL','7106');
  mk(8010,'SPACE','7107');mk(8011,'LIVE','7108');mk(8012,'POST','7109');mk(8013,'STORY','7110');
  const t=Object.fromEntries((await get('/api/connect/notifications',{db})).data.notifications.map(n=>[n.id,n.target]));
  assert.deepEqual(t['8001'],{kind:'VIBE',id:'7101'});
  assert.deepEqual(t['8002'],{kind:'ARTICLE',id:'7102'});
  assert.deepEqual(t['8003'],{kind:'PROFILE',username:'cara_devi'});
  assert.deepEqual(t['8004'],{kind:'PROFILE',username:'bob_singh'});
  assert.deepEqual(t['8005'],{kind:'PROFILE',username:'cara_devi'});
  assert.deepEqual(t['8006'],{kind:'GROUP',id:'7103'});
  assert.deepEqual(t['8007'],{kind:'CHANNEL',id:'7104'});
  assert.deepEqual(t['8008'],{kind:'GROUP_CHANNEL',id:'7105'});
  assert.deepEqual(t['8009'],{kind:'CALL',id:'7106'});
  assert.deepEqual(t['8010'],{kind:'SPACE',id:'7107'});
  assert.deepEqual(t['8011'],{kind:'LIVE',id:'7108'});
  assert.deepEqual(t['8012'],{kind:'POST',id:'7109'});
  assert.deepEqual(t['8013'],{kind:'STORY',id:'7110'});

  // Unsafe / unusable targets degrade to null instead of leaking or navigating somewhere wrong.
  const bad=seed();bad.notifications.length=0;
  const bmk=(id,entity_type,entity_id)=>bad.notifications.push({id,user_id:A,actor_user_id:B,notification_type:'X',entity_type,entity_id,message:'m',is_read:false,created_at:'2026-09-19T05:00:00.000Z'});
  bmk(8101,'ARTICLE','not-a-number');bmk(8102,'VIBE','1'.repeat(25));bmk(8103,'USER','404');bmk(8104,'USER','999999');bmk(8105,'MYSTERY','7111');bmk(8106,'USER','abc');bmk(8107,'CALL',null);
  const tb=Object.fromEntries((await get('/api/connect/notifications',{db:bad})).data.notifications.map(n=>[n.id,n.target]));
  for(const id of Object.keys(tb))assert.equal(tb[id],null,id);

  // A blocked profile is not offered as a navigation target (and its notifications are hidden entirely).
  const blocked=seed();blocked.blocks.push({blocker:A,blocked:C});blocked.notifications.push({id:9020,user_id:A,actor_user_id:B,notification_type:'MEMBERSHIP_GIFT',entity_type:'CREATOR',entity_id:String(C),message:'gift',is_read:false,created_at:'2026-09-19T05:50:00.000Z'});
  const r=await get('/api/connect/notifications',{db:blocked});
  assert.equal(r.data.notifications.find(n=>n.id==='9020').target,null,'target profile is blocked, so no navigation target');
  assert.equal(r.data.notifications.find(n=>n.id==='9002'),undefined,'notification from a blocked actor is hidden');

  // Frontend is wired to every kind and no longer sends a user id to the notification routes.
  for(const kind of ['PROFILE','SPACE','LIVE','ARTICLE','VIBE','POST','STORY','GROUP','CHANNEL','GROUP_CHANNEL','CALL'])assert.match(app,new RegExp(`t\\.kind===["']${kind}["']`),kind);
  assert.doesNotMatch(app,/connect\/notifications\?userId=/);assert.doesNotMatch(app,/reminders\/due\?userId=/);
  assert.match(app,/\/api\/connect\/notifications\/\$\{encodeURIComponent\(id\)\}\/read/);assert.match(app,/\/api\/connect\/notifications\/read-all/);
});

// ---------------------------------------------------------------- 6. count / read-state
test('unread count and read state stay consistent across list, unread-count, mark-one and mark-all',async()=>{
  const db=seed();
  db.blocks.push({blocker:B,blocked:C}); // Cara's notification to Alice is unaffected; Bob↔Cara block only hides rows on Bob's side
  let list=await get('/api/connect/notifications',{db});
  assert.equal(list.data.unread_count,2);
  assert.deepEqual(list.data.notifications.map(n=>[n.id,n.is_read]),[['9001',false],['9002',false],['9003',true]],'newest first, read flag preserved');
  assert.equal((await get('/api/connect/notifications/unread-count',{db})).data.unread_count,2);
  assert.equal((await get('/api/connect/notifications/unread-count',{db,token:'session-B'})).data.unread_count,1,"B's unread count excludes rows from actors B has blocked");

  const one=await send('PATCH','/api/connect/notifications/9001/read',{db});
  assert.equal(one.status,200);assert.equal(one.data.unread_count,1);
  const again=await send('PATCH','/api/connect/notifications/9001/read',{db});
  assert.equal(again.status,200);assert.equal(again.data.unread_count,1,'idempotent');
  list=await get('/api/connect/notifications',{db});
  assert.deepEqual(list.data.notifications.map(n=>n.is_read),[true,false,true]);assert.equal(list.data.unread_count,1);
  assert.equal(db.notifications.filter(n=>n.user_id===B&&!n.is_read).length,2,"B's rows unaffected by A's actions");

  const all=await send('PATCH','/api/connect/notifications/read-all',{db});
  assert.equal(all.data.marked,1);assert.equal(all.data.unread_count,0);
  const none=await send('POST','/api/connect/notifications/read-all',{db});assert.equal(none.data.marked,0);assert.equal(none.data.unread_count,0);
  list=await get('/api/connect/notifications',{db});assert.ok(list.data.notifications.every(n=>n.is_read));assert.equal(list.data.unread_count,0);
  assert.equal((await get('/api/connect/notifications/unread-count',{db,token:'session-B'})).data.unread_count,1,"B still has their own unread");

  // The double applies block semantics itself, so ALSO pin the real SQL: list and count must both carry the block filter,
  // and the profile-target join must refuse a blocked target.
  const listSql=list.calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_profiles tcp')).sql;
  const countSql=(await get('/api/connect/notifications/unread-count',{db})).calls.find(c=>c.sql.startsWith('SELECT COUNT(*)::int n FROM howdi_connect_notifications')).sql;
  const blockClause=/n\.actor_user_id IS NULL OR NOT EXISTS\( SELECT 1 FROM howdi_connect_profile_blocks b WHERE \(b\.blocker_user_id=n\.user_id AND b\.blocked_user_id=n\.actor_user_id\) OR \(b\.blocker_user_id=n\.actor_user_id AND b\.blocked_user_id=n\.user_id\)\)/;
  assert.match(listSql,blockClause,'list hides blocked actors');assert.match(countSql,blockClause,'count hides blocked actors (badge matches list)');
  assert.match(listSql,/NOT EXISTS\(SELECT 1 FROM howdi_connect_profile_blocks tb WHERE \(tb\.blocker_user_id=n\.user_id AND tb\.blocked_user_id=tcp\.user_id\) OR \(tb\.blocker_user_id=tcp\.user_id AND tb\.blocked_user_id=n\.user_id\)\)/,'blocked profile is never a target');
  assert.match(countSql,/WHERE n\.user_id=\$1 AND n\.is_read=FALSE/,'count is scoped to the owner');

  // limit query param is clamped to a sane range.
  const capped=await get('/api/connect/notifications?limit=1',{db:seed()});assert.equal(capped.data.notifications.length,1);
  const huge=await get('/api/connect/notifications?limit=100000',{db:seed()});
  assert.equal(huge.calls.find(c=>c.sql.includes('LEFT JOIN howdi_connect_profiles tcp')).params[1],100);
});

// ---------------------------------------------------------------- 7. bootstrap count guard
test('GET /api/connect/bootstrap only reveals the notification count to the authenticated owner',async()=>{
  const boot=(userId,opts)=>get(`/api/connect/bootstrap?userId=${userId}`,{...opts,route_src:bootstrapRoute});
  const own=await boot(A,{});assert.equal(own.status,200,JSON.stringify(own.data));assert.equal(own.data.unread_notifications,2);
  const spoof=await boot(A,{token:'session-B'});assert.equal(spoof.status,200);assert.equal(spoof.data.unread_notifications,0,"another user's count must not be revealed");
  const anon=await boot(A,{anonymous:true});assert.equal(anon.data.unread_notifications,0);
  const bad=await boot(A,{token:'not-a-real-session'});assert.equal(bad.data.unread_notifications,0);
  assert.equal(notifSql(spoof.calls).filter(c=>c.sql.startsWith('SELECT COUNT')).length,0,'count query is not even run for a non-owner');
});

// ---------------------------------------------------------------- 8. preserved behaviour
test('K3/K5A–K5C anchors are preserved and unrelated notification consumers are untouched',()=>{
  assert.ok(source.includes('            if(req.method==="GET"&&pathname==="/api/connect/notifications"){'),'K3 slice anchor line unchanged');
  // K5A Home recentActivity stays session-authoritative and username-based.
  const recent=between("await run('recentActivity'",'await run(\'dailyQuote\'');
  assert.match(recent,/actor_public_username/);assert.match(recent,/authedUid/);assert.doesNotMatch(recent,/howdi_id/);
  // Every notification INSERT site still writes user_id from a session-derived value (writers were not modified).
  assert.equal((source.match(/INSERT INTO howdi_connect_notifications/g)||[]).length,24,'writer sites unchanged from K5C');
  // Route order: exact list route, then unread-count, read-all, read-one.
  const order=['pathname==="/api/connect/notifications"','pathname==="/api/connect/notifications/unread-count"','/read-all','/\\d{1,18}\\/read'].map(s=>notificationRoutes.indexOf(s));
  assert.ok(order.every(i=>i>=0)&&order.every((v,i)=>i===0||v>order[i-1]),String(order));
});

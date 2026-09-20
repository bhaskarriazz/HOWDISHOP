// K5E — closure audit ratchets. These tests pin the AUDIT itself so a later change cannot silently re-open it:
//   * the Connect route inventory is enumerated from server.js and driven through the real identity guard
//     (every write is session-only, the guest-open surface is exactly the reviewed allow-list);
//   * source-level invariants (no n.*/cp.* wildcards, no client-identity reads in the fixed handlers, PG error
//     hygiene, group/invite routes covered);
//   * App.jsx keeps talking to the fixed contracts (session headers, /preferences/me, @username targets, no numeric-id inputs).
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
function guestGuard(){
  const ctx={crypto,Buffer,URL,console,process:{env:{HOWDI_CONNECT_REF_SECRET:'audit'}},pool:{query:async()=>({rows:[]})},
    getSessionUserFromRequest:async()=>null,sendJSON:(res,s)=>{res.s=s;}};
  vm.createContext(ctx);
  return vm.runInContext(`${k5eSource}\n;({k5eConnectGuard,k5eLegacyNotificationGuard})`,ctx);
}

// ---- Route inventory: every `if(req.method==="X"&&pathname==="/api/connect/..."` / regex-route in server.js
function inventory(){
  const re=/if\s*\(\s*req\.method\s*===?\s*["'](GET|POST|PUT|PATCH|DELETE)["']\s*&&\s*(pathname\s*===?\s*["'](\/api\/connect[^"']*)["']|\/\^(\\\/api\\\/connect[^\n]*?)\/[a-z]*\.test\(pathname\))/g;
  const out=new Map();let m;
  while((m=re.exec(source))){
    let p=m[3];
    if(!p){
      p=m[4].replace(/\$$/,'').replace(/\\\//g,'/').replace(/\\d\+/g,'7').replace(/\[\^\/\?\]\+/g,'x').replace(/\[\^\/\]\+/g,'x').replace(/\[A-Za-z0-9_-\]\+/g,'x')
        .replace(/\(\?:([^)|]*)(?:\|[^)]*)?\)\??/g,(a,b)=>a.endsWith('?')?'':b).replace(/\\\.?/g,'').replace(/\/\?$/,'').replace(/\?$/,'');
    }
    out.set(m[1]+' '+p,{method:m[1],path:p});
  }
  return [...out.values()];
}
const ROUTES=inventory();

// The reviewed, DELIBERATELY public (guest-callable) Connect surface. Adding to this list is an explicit audit decision.
const PUBLIC_GET=[
  '/api/connect/feed','/api/connect/posts/7/comments','/api/connect/bootstrap','/api/connect/profile/username/x/connections','/api/connect/public-profile/username/x',
  '/api/connect/search','/api/connect/spaces/7/preflight','/api/connect/spaces/recommended','/api/connect/creator-perks/7','/api/connect/space-series/7/episodes',
  '/api/connect/social-graph','/api/connect/public-profile/7','/api/connect/profile-categories','/api/connect/live-discovery','/api/connect/live-replays',
  '/api/connect/knowledge-hub','/api/connect/posts/7/related','/api/connect/discovery','/api/connect/knowledge-pulse','/api/connect/city-knowledge',
  '/api/connect/posts/7/fact-check-trail','/api/connect/institution-community','/api/connect/spaces/7/replay','/api/connect/stories','/api/connect/articles','/api/connect/articles/7',
];
const PUBLIC_WRITE=['/api/connect/profile-projects/7/view','/api/connect/posts/7/view'];

test('K5E audit 1: the Connect route inventory is enumerated (>=300 routes, all five verbs)',()=>{
  assert.ok(ROUTES.length>=300,'inventory size '+ROUTES.length);
  for(const v of ['GET','POST','PUT','PATCH','DELETE'])assert.ok(ROUTES.some(r=>r.method===v),v);
  assert.ok(ROUTES.every(r=>!/[\\()\[\]^$*+?|{}]/.test(r.path)),'every extracted path is concrete');
});

test('K5E audit 2: through the real guard EVERY Connect write is session-only for guests, except the two anonymous view counters',async()=>{
  const K=guestGuard();const open=[];
  for(const r of ROUTES.filter(r=>r.method!=='GET')){
    const res={};const stopped=await K.k5eConnectGuard({method:r.method,headers:{}},res,new URL(r.path,'http://x'));
    if(!stopped)open.push(r.path);else assert.equal(res.s,401,r.method+' '+r.path);
  }
  assert.deepEqual(open.sort(),[...PUBLIC_WRITE].sort(),'guest-callable writes');
});

test('K5E audit 3: the guest-open GET surface is exactly the reviewed public-browsing allow-list (everything else is 401 for guests)',async()=>{
  const K=guestGuard();const open=[];
  for(const r of ROUTES.filter(r=>r.method==='GET')){
    const res={};const stopped=await K.k5eConnectGuard({method:'GET',headers:{}},res,new URL(r.path,'http://x'));
    if(!stopped)open.push(r.path);
  }
  const missing=PUBLIC_GET.filter(p=>!open.includes(p)),extra=open.filter(p=>!PUBLIC_GET.includes(p));
  // `extra` are guest-open routes nobody reviewed; `missing` would mean a reviewed public route silently became private.
  assert.deepEqual(extra,[],'unreviewed guest-open GET routes: '+extra.join(', '));
  assert.deepEqual(missing,[],'reviewed public routes that became private: '+missing.join(', '));
});

test('K5E audit 4: every "mine" / dashboard / analytics / inbox / history / studio style GET is private',async()=>{
  const K=guestGuard();
  const privateish=/\/(mine|dashboard|analytics|inbox|history|bookmarked|studio|revenue-history|payouts|summary|unread-count)(\/|$)|-dashboard$|profile-studio|social-summary/;
  const hits=ROUTES.filter(r=>r.method==='GET'&&privateish.test(r.path));
  assert.ok(hits.length>=10,'found '+hits.length);
  for(const r of hits){
    const res={};const stopped=await K.k5eConnectGuard({method:'GET',headers:{}},res,new URL(r.path,'http://x'));
    assert.ok(stopped&&res.s===401,'guest must not read '+r.path);
  }
});

test('K5E audit 5: regex-matched Connect routes (groups/channels, invite-links, invites) are behind the same guard',async()=>{
  const K=guestGuard();
  for(const [m,p] of [['POST','/api/connect/groups-channels/5/join'],['POST','/api/connect/groups-channels/5/messages'],['POST','/api/connect/groups-channels/5/invite-links'],['DELETE','/api/connect/groups-channels/5/invite-links/9/revoke'],['POST','/api/connect/invite/AbC123/join'],['PATCH','/api/connect/groups-channels/5/members']]){
    const res={};assert.equal(await K.k5eConnectGuard({method:m,headers:{}},res,new URL(p,'http://x')),true,p);assert.equal(res.s,401,p);
  }
  for(const p of ['/api/connect/groups-channels','/api/connect/groups-channels/5/messages','/api/connect/groups-channels/5/members']){
    const res={};assert.equal(await K.k5eConnectGuard({method:'GET',headers:{}},res,new URL(p,'http://x')),true,'guest GET '+p);
  }
  assert.match(source,/const hcInviteMatch=pathname\.match/);
  // an invite PREVIEW is deliberately public by token (holder of the link), the join is not
  const res={};assert.equal(await K.k5eConnectGuard({method:'GET',headers:{}},res,new URL('/api/connect/invite/AbC123','http://x')),false);
});

test('K5E audit 6: no raw-row wildcards (n.*, cp.*) survive in any notification/Connect select; fixed handlers never read client identity',()=>{
  assert.ok(!/\bn\.\*/.test(source.replace(/\/\/[^\n]*/g,'').replace(/SELECT n\.\*,wo\.work_code/g,'')),'no n.* outside the (non-Connect) Works notification feed');
  const connect=source.slice(source.indexOf('if (req.method === "GET" && pathname === "/api/connect/bootstrap")'),source.indexOf('app.get("/api/connect/home-capabilities"'));
  assert.ok(!/\bcp\.\*/.test(connect),'no cp.* in Connect');
  assert.ok(!/\bu\.\*/.test(connect),'no u.* in Connect');
  const boot=between('if (req.method === "GET" && pathname === "/api/connect/bootstrap") {','K5A — HOME SHELL');
  assert.ok(!/searchParams/.test(boot),'bootstrap reads no query parameter at all');
  assert.ok(!/\bhowdi_id\b/.test(boot.replace(/\/\/[^\n]*/g,'')),'bootstrap never selects howdi_id (comments aside)');
  const prefs=between('const K5E_PREF_COLUMNS=','summary\\/\\d+');
  assert.ok(!/RETURNING \*|SELECT \*/.test(prefs),'preferences use an explicit column list');
  assert.ok(!/\buser_id\b/.test(prefs.match(/const K5E_PREF_COLUMNS="[^"]*"/)[0]),'user_id is not a preference column in the response');
});

test('K5E audit 7: PostgreSQL errors never reach Connect / notification clients as raw text',()=>{
  const catchBlock=between('// K5E: Connect / notification routes never return raw database errors','error.message ||');
  for(const code of ['23503','23505','23502','23514'])assert.ok(catchBlock.includes(code),code);
  assert.match(catchBlock,/\^22/);
  assert.match(catchBlock,/message: "Internal server error"/);
  assert.ok(!/error\.(message|detail|hint|constraint|table|column)/.test(catchBlock),'the Connect branch never touches error text');
  // no Connect route block returns e.message/error.message/detail/stack (blocks = from one top-level `if(req.method` to the next)
  const blocks=source.split(/\n(?=\s{12}(?:const \w+\s*=\s*pathname\.match|if\s*\(\s*req\.method))/).filter(b=>/\/api\\?\/connect/.test(b.slice(0,400)));
  assert.ok(blocks.length>=250,'connect route blocks: '+blocks.length);
  const leaks=[];
  for(const b of blocks)for(const l of b.split('\n'))if(/sendJSON\([^)]*\b(?:error|e|err)\.(?:message|detail|stack)/.test(l))leaks.push(l.trim().slice(0,100));
  assert.deepEqual(leaks,[],'no Connect route echoes exception text');
});

test('K5E audit 8: schema changes are additive and idempotent',()=>{
  assert.match(source,/CREATE TABLE IF NOT EXISTS howdi_connect_answer_helpful/);
  assert.match(source,/ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;/);
  const k5eSchema=[...source.matchAll(/K5E[^\n]*\n[^\n]*(CREATE|ALTER)[^\n]*/g)].map(m=>m[0]);
  for(const s of k5eSchema)assert.ok(!/DROP |TRUNCATE|DELETE FROM/i.test(s),'no destructive schema change: '+s.slice(0,80));
});

// ---------------------------------------------------------------- App.jsx contracts
test('K5E app 1: bootstrap and search are called without a client user id; people are keyed by @public_username',()=>{
  assert.match(app,/connectApi\(`\/api\/connect\/bootstrap`\)/);
  assert.ok(!/\/api\/connect\/bootstrap\?userId/.test(app));
  assert.ok(!/\/api\/connect\/search\?q=\$\{encodeURIComponent\(q\)\}&userId/.test(app));
  assert.match(app,/following\[String\(p\.public_username\)\]/);
  const follow=app.slice(app.indexOf('const toggleConnectFollow=async(person)'));
  assert.match(follow.slice(0,900),/profile\/username\/\$\{encodeURIComponent\(uname\)\}\/follow/,'follow by @username when a person carries one');
});

test('K5E app 2: every /api/notifications call from the customer app sends the session (legacy centre) and preferences use /me',()=>{
  const calls=[...app.matchAll(/fetch\(\s*[`"]http:\/\/localhost:5000\/api\/notifications[^]*?\)\s*[;,)]/g)].map(m=>m[0]);
  assert.ok(calls.length>=10,'found '+calls.length);
  // window after each URL is large enough to include the options object
  for(const m of app.matchAll(/http:\/\/localhost:5000\/api\/notifications[^\n]*/g)){
    const at=m.index;const win=app.slice(at,at+420);
    assert.match(win,/customerSessionHeaders\(\)/,'notification call without session headers near: '+m[0].slice(0,90));
  }
  assert.ok(!/api\/notifications\/preferences\/\$\{encodeURIComponent\(currentUser\.id\)\}/.test(app),'preferences never address a user id');
  assert.equal((app.match(/api\/notifications\/preferences\/me/g)||[]).length,2);
});

test('K5E app 3: Connect posting, reactions and comments carry the session and no client user id in the body',()=>{
  const feed=app.slice(app.indexOf('const params=new URLSearchParams();'),app.indexOf('const params=new URLSearchParams();')+700);
  assert.ok(!/params\.set\("userId"/.test(feed));assert.match(feed,/customerSessionHeaders\(\)/);
  const raw=[...app.matchAll(/fetch\(\s*`\$\{SHOP_API_BASE\}\/api\/connect\/posts[^`]*`/g)];
  assert.ok(raw.length>=4,'direct Connect post fetches: '+raw.length);
  for(const m of raw){
    const win=app.slice(m.index,m.index+520);
    assert.match(win,/customerSessionHeaders\(\)/,'missing session headers near '+m[0]);
    assert.ok(!/user_id:\s*currentUser\.id/.test(win),'no client user_id in body near '+m[0]);
  }
  assert.match(app,/\/api\/connect\/posts`,\{method:"POST",headers:\{"Content-Type":"application\/json",\.\.\.customerSessionHeaders\(\)\},body:JSON\.stringify\(\{content:content\|\|"HOWDI Vibe"/,'Vibe publish');
});

test('K5E app 4: no Connect screen asks the member to type a numeric user id — collaborators, partners and endorsements use @username',()=>{
  for(const banned of ['Collaborator user ID','placeholder="Partner user ID"','HOWDI user ID for endorsement request','Enter a HOWDI user ID'])assert.ok(!app.includes(banned),banned);
  assert.match(app,/Collaborator @username/);assert.match(app,/placeholder="Partner @username"/);assert.match(app,/Member @username for endorsement request/);
  assert.match(app,/collaborator_username:/);assert.match(app,/partnerUsername:/);assert.match(app,/targetUsername:target/);
  assert.ok(!/collaborator_user_id:Number\(connectCollaboratorUserId\)/.test(app));
});

test('K5E app 5: Space host follow + audience previews use public usernames, not owner/participant ids',()=>{
  assert.match(app,/public_username:room\.owner_username\|\|room\.owner_public_username/);
  assert.ok(!/connectFollowing\[String\(room\.owner_user_id\)\]/.test(app));
  assert.match(app,/room\.audience_preview\.slice\(0,4\)\.map\(\(person,index\)=><i key=\{`\$\{person\.public_username\|\|"member"\}-\$\{index\}`\}/);
});

// ---------------------------------------------------------------- server: username-addressed targets
test('K5E server: @username targets exist for collaborator, partner goal and endorsement (never a numeric id typed by a member)',()=>{
  assert.match(source,/async function k5eResolveUsername\(raw\)/);
  assert.match(source,/collaboratorUserId=await k5eResolveUsername\(collaboratorUsername\)/);
  assert.match(source,/body\.partnerUsername\?await k5eResolveUsername\(body\.partnerUsername\)/);
  assert.match(source,/body\.targetUsername\?await k5eResolveUsername\(body\.targetUsername\)/);
});

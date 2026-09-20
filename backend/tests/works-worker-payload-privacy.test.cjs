// Worker Portal public-payload privacy — hermetic regression test (no database, no network).
//
// Two Worker Portal payloads used to hand internal identity to the browser:
//   GET /api/worker/connect/feed           returned `workerId` (works_workers.id) for every post author
//   GET /api/worker/works/debug-lifecycle  returned raw rows incl. `customer_user_id` (a customer's DB user id)
//
// This test slices the REAL route blocks and the REAL serializer out of backend/server.js and executes them with a fake
// pool that returns hostile rows (every identity column an over-broad SELECT could ever return). It fails if:
//   * the SQL selects/groups a worker or customer id again,
//   * the response carries anything beyond the explicit allowlist,
//   * a raw `q.rows` reaches sendJSON,
//   * the session gate is removed / stops being the first thing the route does.
// The real-PostgreSQL counterpart is backend/tests/worker-pg/ (guarded by WORKER_PG_URL).
const assert=require('assert');
const fs=require('fs');
const path=require('path');
let passed=0;
async function test(name,fn){try{await fn();passed++;}catch(e){console.error('FAIL: '+name);throw e;}}

const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const between=(start,end)=>{
  const from=source.indexOf(start);
  assert.notStrictEqual(from,-1,`missing marker: ${start}`);
  assert.strictEqual(source.indexOf(start,from+start.length),-1,`marker is not unique: ${start}`);
  const to=source.indexOf(end,from+start.length);
  assert.notStrictEqual(to,-1,`missing end marker: ${end}`);
  return source.slice(from,to);
};
// body of `if (...) { BODY }` -> BODY
const ifBody=(block)=>block.slice(block.indexOf('{')+1,block.lastIndexOf('}'));

const FEED_HEAD='if (req.method === "GET" && pathname === "/api/worker/connect/feed") {';
const DEBUG_HEAD='if (req.method === "GET" && pathname === "/api/worker/works/debug-lifecycle") {';
const feedSrc=between(FEED_HEAD,'if (req.method === "POST" && pathname === "/api/worker/connect/posts")');
const debugSrc=between(DEBUG_HEAD,'if (req.method === "GET" && pathname === "/api/worker/works/history")');
const serializerSrc=between('function worksLifecycleDebugRow','async function requireActiveSessionWorker');
// executable pieces
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const worksLifecycleDebugRow=new Function(serializerSrc+'\nreturn worksLifecycleDebugRow;')();
const runFeed=new AsyncFunction('req','res','pool','sendJSON','requireActiveSessionWorker',ifBody(feedSrc));
const runDebug=new AsyncFunction('req','res','pool','sendJSON','requireActiveSessionWorker','worksLifecycleDebugRow',ifBody(debugSrc));

// identity-bearing keys that must never reach a Worker Portal browser payload
const FORBIDDEN_KEY=/^(id_?)?(user_?id|worker_?id|customer_?user_?id|customer_?id|master_?id|howdi_?id|identity_?uuid|uuid|email|phone|mobile|address|address_?line|customer_?name|customer_?phone|customer_?email|preferred_?worker_?id|password.*|session.*|token.*)$/i;
function scanKeys(value,where='$',hits=[]){
  if(Array.isArray(value))value.forEach((v,i)=>scanKeys(v,`${where}[${i}]`,hits));
  else if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(FORBIDDEN_KEY.test(k))hits.push(`${where}.${k}`);
      scanKeys(v,`${where}.${k}`,hits);
    }
  }
  return hits;
}
const stripComments=(s)=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'').replace(/\s\/\/ .*$/gm,'');

function harness(rows,{authed=true}={}){
  const calls=[];const sent=[];
  const pool={query:async(sql,params)=>{calls.push({sql:String(sql),params});return {rows};}};
  const sendJSON=(res,status,payload)=>{sent.push({status,payload});return payload;};
  const gate=async(req,res)=>{calls.push({gate:true});if(!authed){sendJSON(res,401,{status:'error',code:'WORKER_SESSION_REQUIRED'});return null;}return '7';};
  return {pool,sendJSON,gate,calls,sent};
}

(async()=>{
  // ---------- static: the SQL ----------
  await test('feed SQL no longer selects or groups a worker id',()=>{
    const code=stripComments(feedSrc);
    assert.doesNotMatch(code,/w\.id\s+AS\s+worker_id/i,'w.id AS worker_id must not come back');
    assert.doesNotMatch(code,/AS\s+worker_id/i);
    assert.doesNotMatch(code,/GROUP BY[^`]*\bw\.id\b/i,'GROUP BY must not need w.id');
    assert.doesNotMatch(code,/\bworkerId\s*:\s*String\(/,'the mapped post must not carry workerId');
    const mapper=code.slice(code.indexOf('q.rows.map'));
    assert.ok(mapper.length>20,'mapper not found');
    assert.doesNotMatch(mapper,/\br\.(worker_id|user_id|id_)\w*|\br\.(howdi_id|email|phone)/,'the mapper must not read a worker/user id column');
    // the viewer id is still used to compute reactedByViewer, but only as a bound parameter, never echoed
    assert.match(code,/vr\.worker_id=\$1/);
    assert.match(code,/\[workerId\]\)/);
  });
  await test('debug-lifecycle SQL no longer selects any customer/user/worker identity column',()=>{
    const code=stripComments(debugSrc);
    const select=code.slice(code.indexOf('SELECT'),code.indexOf('FROM works_work_offers'));
    assert.doesNotMatch(select,/customer_user_id/i);
    assert.doesNotMatch(select,/\bo\.worker_id\b|\brh\.worker_id\b|\bj\.worker_id\b|\buser_id\b|howdi_id|customer_(name|phone|email)|address_line|\bemail\b|\bphone\b/i);
    assert.doesNotMatch(code,/rows\s*:\s*q\.rows\s*[,}]/,'raw q.rows must not be returned');
    assert.match(code,/rows\s*:\s*q\.rows\.map\(worksLifecycleDebugRow\)/,'rows must go through the explicit serializer');
  });
  await test('the serializer is an explicit allowlist (no spread, no Object.assign, no delete-style filtering)',()=>{
    const code=stripComments(serializerSrc);
    assert.doesNotMatch(code,/\.\.\.\s*r\b|Object\.assign|Object\.entries|Object\.keys|delete\s/,'must not copy the whole row');
    const reads=[...code.matchAll(/\br\.([a-z_]+)/g)].map(m=>m[1]).sort();
    assert.deepStrictEqual(reads,['journey_id','journey_stage','offer_id','offer_status','rejected_at','rejection_id','rejection_reason','response_reason','responded_at','work_code','work_order_id','work_status'].sort());
  });

  // ---------- runtime: feed ----------
  const HOSTILE_POST={
    id:'41',content:'Available for AC repair',category:'WORK',created_at:'2026-01-02T03:04:05.000Z',
    worker_code:'WRK-0007',full_name:'Ravi Kumar',reaction_count:'3',reacted_by_viewer:true,
    // columns an over-broad SELECT could return — none may reach the payload
    worker_id:'99',user_id:'123',howdi_id:'HWD-SECRET-1',email:'ravi@example.test',phone:'9876543210',master_id:'MST-1',
  };
  await test('feed: unauthenticated request returns 401 before any query runs',async()=>{
    const h=harness([HOSTILE_POST],{authed:false});
    await runFeed({},{},h.pool,h.sendJSON,h.gate);
    assert.deepStrictEqual(h.calls,[{gate:true}],'the session gate must be the first and only thing that runs');
    assert.strictEqual(h.sent.length,1);assert.strictEqual(h.sent[0].status,401);
  });
  await test('feed: post keys are exactly the safe UI fields, no workerId',async()=>{
    const h=harness([HOSTILE_POST]);
    await runFeed({},{},h.pool,h.sendJSON,h.gate);
    assert.strictEqual(h.sent.length,1);assert.strictEqual(h.sent[0].status,200);
    const {payload}=h.sent[0];
    assert.strictEqual(payload.status,'success');
    assert.strictEqual(payload.posts.length,1);
    assert.deepStrictEqual(Object.keys(payload.posts[0]).sort(),['category','content','createdAt','id','reactedByViewer','reactionCount','workerCode','workerName']);
    assert.deepStrictEqual(payload.posts[0],{id:'41',content:'Available for AC repair',category:'WORK',createdAt:'2026-01-02T03:04:05.000Z',workerCode:'WRK-0007',workerName:'Ravi Kumar',reactionCount:3,reactedByViewer:true});
    assert.deepStrictEqual(scanKeys(payload),[],'no identity keys anywhere in the feed payload');
    const text=JSON.stringify(payload);
    for(const secret of ['"99"','HWD-SECRET-1','ravi@example.test','9876543210','MST-1','"123"'])assert.ok(!text.includes(secret),'leaked '+secret);
  });
  await test('feed: the viewer id is used only as a bound parameter (session-derived), and only one query runs',async()=>{
    const h=harness([HOSTILE_POST]);
    await runFeed({headers:{'x-howdi-worker-id':'555'},query:{workerId:'555'},body:{workerId:'555'}},{},h.pool,h.sendJSON,h.gate);
    const q=h.calls.filter(c=>c.sql);
    assert.strictEqual(q.length,1);
    assert.deepStrictEqual(q[0].params,['7'],'viewer id must be the session-derived worker id, never a browser-supplied one');
    assert.doesNotMatch(q[0].sql,/\bw\.id\s+AS\b/i);
  });
  await test('feed: empty feed still works and boolean flag is strict',async()=>{
    let h=harness([]);await runFeed({},{},h.pool,h.sendJSON,h.gate);
    assert.deepStrictEqual(h.sent[0].payload,{status:'success',posts:[]});
    h=harness([{...HOSTILE_POST,reacted_by_viewer:null,reaction_count:null}]);await runFeed({},{},h.pool,h.sendJSON,h.gate);
    assert.strictEqual(h.sent[0].payload.posts[0].reactedByViewer,false);assert.strictEqual(h.sent[0].payload.posts[0].reactionCount,0);
  });

  // ---------- runtime: debug-lifecycle ----------
  const HOSTILE_ROW={
    offer_id:'11',offer_status:'rejected',response_reason:'Too far',responded_at:'2026-02-01T10:00:00.000Z',
    work_order_id:'21',work_code:'WO-0021',work_status:'open',
    rejection_id:'31',rejection_reason:'Too far',rejected_at:'2026-02-01T10:00:00.000Z',
    journey_id:null,journey_stage:null,
    // hostile extras
    customer_user_id:'808',worker_id:'7',user_id:'909',howdi_id:'HWD-CUST-1',master_id:'MST-C',identity_uuid:'00000000-0000-0000-0000-000000000000',
    email:'cust@example.test',phone:'9000000000',address:'12 Hidden Street',address_line:'12 Hidden Street',customer_name:'Priya Customer',
    customer_phone:'9000000000',customer_email:'cust@example.test',preferred_worker_id:'7',job_pin:'123456',
  };
  await test('debug-lifecycle: unauthenticated request returns 401 before any query runs',async()=>{
    const h=harness([HOSTILE_ROW],{authed:false});
    await runDebug({},{},h.pool,h.sendJSON,h.gate,worksLifecycleDebugRow);
    assert.deepStrictEqual(h.calls,[{gate:true}]);assert.strictEqual(h.sent[0].status,401);
  });
  await test('debug-lifecycle: rows contain exactly the 12 lifecycle fields and none of the hostile extras',async()=>{
    const h=harness([HOSTILE_ROW,{...HOSTILE_ROW,journey_id:'51',journey_stage:'accepted',offer_status:'accepted',rejection_id:null,rejection_reason:null,rejected_at:null}]);
    await runDebug({},{},h.pool,h.sendJSON,h.gate,worksLifecycleDebugRow);
    assert.strictEqual(h.sent[0].status,200);
    const {payload}=h.sent[0];assert.strictEqual(payload.status,'success');assert.strictEqual(payload.rows.length,2);
    const ALLOWED=['journey_id','journey_stage','offer_id','offer_status','rejected_at','rejection_id','rejection_reason','responded_at','response_reason','work_code','work_order_id','work_status'];
    for(const row of payload.rows)assert.deepStrictEqual(Object.keys(row).sort(),ALLOWED);
    assert.deepStrictEqual(payload.rows[0],{offer_id:'11',offer_status:'rejected',response_reason:'Too far',responded_at:'2026-02-01T10:00:00.000Z',work_order_id:'21',work_code:'WO-0021',work_status:'open',rejection_id:'31',rejection_reason:'Too far',rejected_at:'2026-02-01T10:00:00.000Z',journey_id:null,journey_stage:null});
    assert.strictEqual(payload.rows[1].journey_id,'51');assert.strictEqual(payload.rows[1].journey_stage,'accepted');
    assert.deepStrictEqual(scanKeys(payload),[],'no identity keys anywhere in the lifecycle payload');
    const text=JSON.stringify(payload);
    for(const secret of ['808','909','HWD-CUST-1','MST-C','cust@example.test','9000000000','Hidden Street','Priya','123456','00000000-0000'])assert.ok(!text.includes(secret),'leaked '+secret);
  });
  await test('debug-lifecycle: missing optional values serialise as null (stable shape), viewer id only bound as $1',async()=>{
    const h=harness([{offer_id:'1',offer_status:'offered',work_order_id:'2',work_code:'WO-2',work_status:'offered'}]);
    await runDebug({},{},h.pool,h.sendJSON,h.gate,worksLifecycleDebugRow);
    const row=h.sent[0].payload.rows[0];
    assert.strictEqual(Object.keys(row).length,12);
    // undefined values are dropped by JSON, so assert the stable shape after a JSON round-trip of a null-filled row
    const wire=JSON.parse(JSON.stringify(worksLifecycleDebugRow({offer_id:'1',response_reason:null,responded_at:null,journey_id:null})));
    assert.ok('response_reason' in wire&&wire.response_reason===null);
    assert.deepStrictEqual(h.calls.filter(c=>c.sql).map(c=>c.params),[['7']]);
  });
  await test('serializer applied to arbitrary hostile input never yields a forbidden key',()=>{
    const evil={};for(const k of ['customer_user_id','user_id','worker_id','workerId','howdi_id','email','phone','address','address_line','customer_name','customer_phone','customer_email','master_id','uuid','password_hash','session_token','offer_id','work_code'])evil[k]='x';
    const out=worksLifecycleDebugRow(evil);
    assert.deepStrictEqual(scanKeys(out),[]);
    assert.strictEqual(out.offer_id,'x');assert.strictEqual(out.work_code,'x');
  });

  // ---------- neighbouring guarantees that must not regress ----------
  await test('both routes still start with the session-bound worker gate and never read browser-supplied identity',()=>{
    for(const [name,src] of [['feed',feedSrc],['debug-lifecycle',debugSrc]]){
      const body=stripComments(ifBody(src)).trim();
      assert.match(body,/^const\s+workerId\s*=\s*await\s+requireActiveSessionWorker\(req,res\);\s*if\(!workerId\)return;/,`${name}: the gate must be the first statement`);
      assert.doesNotMatch(body,/x-howdi-worker-id|req\.query|req\.body|body\.workerId|searchParams\.get\(["']workerId/,`${name}: browser-supplied identity must not be read`);
    }
  });
  await test('no other GET /api/worker/* route serialises a raw query result',()=>{
    // every `sendJSON(res,200,{...rows:q.rows...})` in the Worker Portal section must be a mapped/allowlisted result
    const start=source.indexOf('// HOWDI WORKER PORTAL — JOB OFFERS + ACTIVE JOURNEY');
    const end=source.indexOf('// HOWDI COMMUNITY — USER MENTION SEARCH');
    assert.ok(start>-1&&end>start);
    const portal=stripComments(source.slice(start,end));
    assert.doesNotMatch(portal,/\brows\s*:\s*q\.rows\s*[,}]/,'a Worker Portal route returns a raw q.rows');
    assert.doesNotMatch(portal,/\bworkerId\s*:\s*String\(r\./,'a Worker Portal route echoes a worker id');
  });

  console.log(`works-worker-payload-privacy: ${passed} tests passed`);
})().catch((e)=>{console.error(e);process.exit(1);});

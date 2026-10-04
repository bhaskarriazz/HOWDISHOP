// Worker Portal hardening — hermetic regression test (no database, no network).
//
//   1. Worker-facing post / offer / job / HPay responses never carry a numeric Worker id or any other internal identity.
//   2. Every /api/worker/* error response is a fixed, customer-safe message: no error.message, no `detail`, no SQL text.
//   3. works_work_orders is completed idempotently at boot for every column the Worker routes read (no test-time ALTERs needed).
//
// The real route blocks / serializers / schema function are sliced out of backend/server.js and executed with fakes.
// The real-PostgreSQL counterpart (empty database, every route, deliberate DB errors) is backend/tests/worker-pg/02-fresh-db-routes.cjs.
const assert=require('assert');
const fs=require('fs');
const path=require('path');
let passed=0;
async function test(name,fn){try{await fn();passed++;}catch(e){console.error('FAIL: '+name);throw e;}}

const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const lines=source.split('\n');
const stripComments=(s)=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'').replace(/\s\/\/ .*$/gm,'');
// remove console.*(...) statements: diagnostics that go to the SERVER log are allowed to mention error.message
const stripConsole=(s)=>s.replace(/console\.(error|warn|log)\([^;\n]*\);?/g,'');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;

// ---- source helpers
function functionSource(name){
  const m=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(m,`function ${name} not found`);
  assert.strictEqual(new RegExp(`function\\s+${name}\\s*\\(`,'g').exec(source.slice(m.index+m[0].length))?.index===undefined,true,`function ${name} is defined more than once`);
  let i=source.indexOf('{',m.index),depth=0,j=i;
  for(;j<source.length;j++){if(source[j]==='{')depth++;else if(source[j]==='}'){depth--;if(!depth)break;}}
  return source.slice(m.index,j+1);
}
const instantiate=(names,extra='')=>new Function(names.map(functionSource).join('\n')+extra+`\nreturn {${names.join(',')}};`)();

// every route block whose header mentions /api/worker/ (from its `if(req.method...` line to the next route header / banner)
function workerRouteBlocks(){
  const isHeader=(l)=>/^\s*if\s*\(\s*\(?\s*req\.method\s*===/.test(l)||/^\s*\/\/ ={10,}/.test(l);
  const blocks=[];
  for(let i=0;i<lines.length;i++){
    if(!(/^\s*if\s*\(\s*\(?\s*req\.method\s*===/.test(lines[i])&&/\/api\/worker\b|api\\\/worker/.test(lines[i])))continue;
    let j=i+1;while(j<lines.length&&!isHeader(lines[j]))j++;
    blocks.push({header:lines[i].trim(),code:lines.slice(i,j).join('\n'),line:i+1});
  }
  return blocks;
}
const blocks=workerRouteBlocks();
const blockOf=(needle)=>{const b=blocks.filter((x)=>x.header.includes(needle));assert.strictEqual(b.length,1,`expected exactly one route block for ${needle}, got ${b.length}`);return b[0];};

const IDENTITY_KEY=/^(user_?id|worker_?id|customer_?user_?id|master_?id|howdi_?id|identity_?uuid|uuid|preferred_?worker_?id|worker_?user_?id|hpay_?account_?id|owner_?reference|participant_?reference)$/i;
function identityKeys(value,where='$',hits=[]){
  if(Array.isArray(value))value.forEach((v,i)=>identityKeys(v,`${where}[${i}]`,hits));
  else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(IDENTITY_KEY.test(k))hits.push(`${where}.${k}`);identityKeys(v,`${where}.${k}`,hits);}}
  return hits;
}
const PINNED=['880021','620101','730417','HWD-SECRET','MST-SECRET','HPAY-WRK-00880021'];
const pinnedLeaks=(v)=>PINNED.filter((p)=>JSON.stringify(v).includes(p));

(async()=>{
  // ================= route inventory =================
  await test('the Worker route inventory is complete (every /api/worker/* handler is covered by the checks below)',()=>{
    const wanted=['"/api/worker/me"','"/api/worker/works/availability"','"/api/worker/works/notifications"','notifications/read-all','notifications\\/\\d+\\/read','"/api/worker/profile"','"/api/worker/connect/health"',
      '"/api/worker/connect/feed"','"/api/worker/connect/posts"','connect\\/posts\\/\\d+\\/reaction','"/api/worker/works/offers"','offers\\/\\d+\\/status','"/api/worker/works/debug-lifecycle"',
      '"/api/worker/works/history"','"/api/worker/works/jobs"','jobs\\/\\d+\\/location','jobs\\/\\d+\\/stage','"/api/worker/hpay/summary"','"/api/worker/applications"'];
    for(const w of wanted)assert.ok(blocks.some((b)=>b.header.includes(w.replace(/^"|"$/g,''))||b.header.includes(w)),`no route block found for ${w}`);
    assert.ok(blocks.length>=21,`expected at least 21 Worker route blocks, found ${blocks.length}`);
  });

  // ================= 1. no numeric worker id / identity in Worker-facing responses =================
  await test('no Worker route serialises a raw offer/journey row, a raw INSERT ... RETURNING * row or a worker id property',()=>{
    for(const b of blocks){
      const code=stripConsole(stripComments(b.code));
      assert.doesNotMatch(code,/\bworksOfferRow\(/,`${b.header}: use worksWorkerOfferRow`);
      assert.doesNotMatch(code,/\bworksJourneyRow\(/,`${b.header}: use worksWorkerJourneyRow`);
      assert.doesNotMatch(code,/\bworkerId\s*:\s*String\(|\bworker_id\s*:\s*[^,}\s]/,`${b.header}: must not emit a worker id property`);
      assert.doesNotMatch(code,/\b(post|rows|offer|journey|worker)\s*:\s*q\.rows(\[0\])?\s*[,}]/,`${b.header}: raw query row returned`);
      assert.doesNotMatch(code,/\bcustomer_user_id\s*:|customerUserId/,`${b.header}: must not emit a customer id`);
    }
  });
  await test('the Worker offer / journey serializers drop workerId and keep the base serializers untouched for customer/admin routes',()=>{
    const f=instantiate(['worksOfferRow','worksJourneyRow','worksWorkerOfferRow','worksWorkerJourneyRow']);
    const offerRow={id:'11',offer_code:'OFR-1',work_order_id:'21',worker_id:'880021',status:'offered',offered_at:'2026-01-01T00:00:00Z',responded_at:null,response_reason:null,user_id:'620101',customer_user_id:'730417'};
    assert.strictEqual(f.worksOfferRow(offerRow).workerId,'880021','customer/admin offer serializer is unchanged');
    const o=f.worksWorkerOfferRow(offerRow);
    assert.deepStrictEqual(Object.keys(o).sort(),['id','offerCode','offeredAt','respondedAt','responseReason','status','workId']);
    assert.deepStrictEqual(identityKeys(o),[]);assert.deepStrictEqual(pinnedLeaks(o),[]);
    const jr={id:'31',work_order_id:'21',worker_id:'880021',work_code:'HOWDI-WORK-1',worker_code:'WRK-A',worker_name:'Asha',worker_rating:'4.5',service_name:'Plumbing',title:'Fix tap',city:'BLR',pincode:'560001',stage:'accepted',pin_verified:false,job_pin:'4821',customer_user_id:'730417'};
    assert.strictEqual(f.worksJourneyRow(jr).workerId,'880021','customer/admin journey serializer is unchanged');
    const j=f.worksWorkerJourneyRow(jr);
    assert.ok(!('workerId' in j)&&j.workerCode==='WRK-A'&&j.workCode==='HOWDI-WORK-1'&&j.workId==='21'&&j.id==='31','safe display fields and lifecycle ids are kept');
    assert.deepStrictEqual(identityKeys(j),[]);assert.deepStrictEqual(pinnedLeaks(j),[]);
    assert.ok(!JSON.stringify(j).includes('4821'),'the job PIN never leaves through the Worker journey serializer');
  });
  await test('POST /api/worker/connect/posts returns the same safe shape as the feed (never RETURNING * with worker_id)',async()=>{
    const {code}=blockOf('"/api/worker/connect/posts"');
    assert.doesNotMatch(stripComments(code),/RETURNING \*/);
    const body=code.slice(code.indexOf('{')+1,code.lastIndexOf('}'));
    const run=new AsyncFunction('req','res','pool','sendJSON','requireActiveSessionWorker','getBody','clean',body);
    const calls=[];const sent=[];
    const pool={query:async(sql,params)=>{calls.push({sql:String(sql),params});
      if(/FROM works_workers/.test(sql))return {rows:[{worker_code:'WRK-A',full_name:'Asha Worker',id:'880021',user_id:'620101'}]};
      return {rows:[{id:'77',content:'Hello',category:'WORK',created_at:'2026-01-02T00:00:00Z',worker_id:'880021',updated_at:'x'}]};}};
    await run({},{},pool,(res,status,payload)=>{sent.push({status,payload});},async()=>'880021',async()=>({content:'Hello',category:'work'}),(v)=>String(v||'').trim());
    assert.strictEqual(sent[0].status,201);
    assert.deepStrictEqual(sent[0].payload.post,{id:'77',content:'Hello',category:'WORK',createdAt:'2026-01-02T00:00:00Z',workerCode:'WRK-A',workerName:'Asha Worker',reactionCount:0,reactedByViewer:false});
    assert.deepStrictEqual(identityKeys(sent[0].payload),[]);assert.deepStrictEqual(pinnedLeaks(sent[0].payload),[]);
    assert.doesNotMatch(calls.map((c)=>c.sql).join('\n'),/RETURNING \*/);
  });
  await test('the Worker HPay summary is an explicit allowlist: no howdi_id, no HPAY-WRK-<worker id>, no numeric ids, no provider reference',()=>{
    const {worksWorkerHpaySummaryRow}=instantiate(['worksWorkerHpaySummaryRow']);
    assert.strictEqual(worksWorkerHpaySummaryRow(null),null);
    const hostile={
      identity:{id:'5',hpay_account_id:'HPAY-WRK-00880021',display_name:'Asha',howdi_id:'WRK-A',program_id:'3',program_name:'Worker Services',owner_reference:'880021',user_id:'620101'},
      agreement:{id:'9',agreement_name:'Free plan',version:1,status:'ACCEPTED',settlement_cycle_days:7,rules:{feeType:'percentage',feeValue:0},accepted_at:'2026-01-01',hpay_account_id:'5'},
      totals:{gross:'2000',howdi_fee:'0',net:'2000',hold:'2000',eligible:'0',settled:'0',paid:'0',hpay_account_id:'5'},
      earnings:[{id:'41',earning_number:'HPAY-EARN-WRK-8',gross_amount:'2000',howdi_fee_amount:'0',net_payable_amount:'2000',status:'HOLD',occurred_at:'2026-01-01',
        source_snapshot:{paymentId:8,paymentCode:'PAY-8',workOrderId:504,workCode:'HOWDI-WORK-504',title:'Fix tap',serviceName:'Plumbing',providerReference:'PROVIDER-REF-8',customer_user_id:'730417'}}],
      settlements:[{id:'51',settlement_number:'HPAY-SET-1',gross_amount:'1',howdi_fee_amount:'0',net_payable_amount:'1',status:'PAID',approved_at:null,paid_at:null,payout_reference:'UTR123',created_at:'2026-01-01'}]
    };
    const out=worksWorkerHpaySummaryRow(hostile);
    assert.deepStrictEqual(Object.keys(out.identity).sort(),['display_name','program_name','worker_code']);
    assert.strictEqual(out.identity.worker_code,'WRK-A');
    assert.deepStrictEqual(Object.keys(out.earnings[0].source_snapshot).sort(),['serviceName','title','workCode']);
    assert.deepStrictEqual(identityKeys(out),[]);assert.deepStrictEqual(pinnedLeaks(out),[]);
    const text=JSON.stringify(out);
    for(const bad of ['PROVIDER-REF','paymentId','workOrderId','"id"','hpay_account_id','HPAY-WRK','"41"','"51"'])assert.ok(!text.includes(bad),'leaked '+bad);
    assert.strictEqual(out.settlements[0].payout_reference,'UTR123','the Worker still sees their own payout reference');
  });

  // ================= 2. fixed, customer-safe error responses =================
  await test('no Worker route block forwards error.message / err.message / detail / stack to the response',()=>{
    for(const b of blocks){
      const code=stripConsole(stripComments(b.code));
      assert.doesNotMatch(code,/\b(error|err|e|ex|exception)\s*\.\s*(message|detail|stack|hint|where|constraint)\b/,`${b.header}: raw error text in a Worker route`);
      assert.doesNotMatch(code,/\bdetail\s*:/,`${b.header}: a "detail" field in a Worker response`);
      assert.doesNotMatch(code,/\berror\s*:\s*(error|err|e)\b/,`${b.header}: raw error object in a Worker response`);
    }
  });
  await test('the central catch has a Worker block placed before the generic fallthrough that echoed error.message',()=>{
    const marker=source.indexOf('// WORKER_PORTAL_ERROR_SANITIZATION');
    assert.ok(marker>0);
    const generic=source.indexOf('error.message ||',marker);
    assert.ok(generic>marker,'generic fallthrough still exists for non-Worker routes');
    const end=source.indexOf('// HPAY_STAGE4B_ERROR_SANITIZATION',marker);
    assert.ok(end>marker&&end<generic,'the Worker block must run before the generic `message: error.message` fallthrough');
  });
  await test('central catch: hostile PostgreSQL-style errors on /api/worker/* become a fixed generic 500',()=>{
    const start=source.indexOf('if (pathname === "/api/worker" || pathname.startsWith("/api/worker/")) {');
    const end=source.indexOf('// K5E: Connect / notification routes never return raw database errors',start);
    assert.ok(start>0&&end>start);
    const raw=new Function('error','pathname','sendJSON','res',source.slice(start,end));
    const handler=(error,pathname,sendJSON)=>raw(error,pathname,sendJSON,{});
    const pgError=Object.assign(new Error('relation "works_connect_posts" does not exist'),{code:'42P01',detail:'Key (worker_id)=(880021) is not present in table "works_workers".',
      constraint:'works_connect_posts_worker_id_fkey',table:'works_connect_posts',column:'worker_id',hint:'Perhaps you meant works_workers',routine:'parserOpenTable',where:'SQL statement "SELECT * FROM works_workers"',
      stack:'Error: relation ... at Pool.query (/srv/backend/server.js:1:1)'});
    for(const bad of [pgError,new Error('duplicate key value violates unique constraint "works_workers_user_id_unique"'),new TypeError("Cannot read properties of undefined (reading 'rows')"),new Error(''),null,undefined,'boom',{message:'x'}]){
      const sent=[];
      const r=handler(bad,'/api/worker/works/offers',(res,status,payload)=>{sent.push({status,payload});return 'sent';});
      assert.strictEqual(r,'sent','the Worker block must terminate the request');
      assert.strictEqual(sent[0].status,500);
      assert.deepStrictEqual(sent[0].payload,{status:'error',code:'WORKER_REQUEST_FAILED',message:'Unable to complete the request right now'});
      const text=JSON.stringify(sent[0].payload);
      for(const leak of ['works_','relation','880021','violates','constraint','SELECT','server.js','Cannot read','duplicate'])assert.ok(!text.includes(leak),'leaked '+leak);
    }
    // request-shape errors have their own fixed, safe messages
    const bodyErr=[];handler(new Error('Invalid JSON'),'/api/worker/profile',(res,s,p)=>bodyErr.push([s,p]));
    assert.deepStrictEqual(bodyErr[0],[400,{status:'error',code:'INVALID_REQUEST_BODY',message:'The request body is not valid JSON'}]);
    const big=[];handler(new Error('Request too large'),'/api/worker/applications',(res,s,p)=>big.push([s,p]));
    assert.deepStrictEqual(big[0],[413,{status:'error',code:'REQUEST_TOO_LARGE',message:'The request is too large'}]);
    // scope: routes outside /api/worker/ are not handled by this block
    const other=[];assert.strictEqual(handler(new Error('x'),'/api/worker-like/x',(res,s,p)=>other.push(s)),undefined);assert.strictEqual(handler(new Error('x'),'/api/customer/x',()=>{}),undefined);assert.strictEqual(other.length,0);
    assert.strictEqual(handler(new Error('x'),'/api/worker',(res,s)=>s),500,'the bare /api/worker path is covered too');
  });
  await test('Worker HPay summary: a failure returns a fixed message with no detail field; the diagnostic goes to the server log',async()=>{
    const {code}=blockOf('"/api/worker/hpay/summary"');
    const body=code.slice(code.indexOf('{')+1,code.lastIndexOf('}'));
    const run=new AsyncFunction('req','res','pool','sendJSON','requireActiveSessionWorker','getWorkerHpaySummary','worksWorkerHpaySummaryRow','console',body);
    const sent=[],logged=[];
    await run({method:'GET'},{},null,(res,s,p)=>sent.push([s,p]),async()=>{return '7';},async()=>{throw Object.assign(new Error('relation "hpay_universal_accounts" does not exist'),{code:'42P01'});},(x)=>x,{error:(...a)=>logged.push(a),warn:()=>{},log:()=>{}});
    assert.deepStrictEqual(sent[0],[500,{status:'error',code:'WORKER_HPAY_UNAVAILABLE',message:'Unable to load Worker HPay right now'}]);
    assert.ok(logged.length===1&&/hpay_universal_accounts/.test(String(logged[0][1].message)),'the detailed error is logged server-side');
  });
  await test('Worker HPay summary success path goes through the allowlist serializer (hostile summary in, safe summary out)',async()=>{
    const {code}=blockOf('"/api/worker/hpay/summary"');
    assert.match(stripComments(code),/summary\s*:\s*worksWorkerHpaySummaryRow\(/,'the route must serialise through worksWorkerHpaySummaryRow');
    const body=code.slice(code.indexOf('{')+1,code.lastIndexOf('}'));
    const run=new AsyncFunction('req','res','pool','sendJSON','requireActiveSessionWorker','getWorkerHpaySummary','worksWorkerHpaySummaryRow','console',body);
    const {worksWorkerHpaySummaryRow}=instantiate(['worksWorkerHpaySummaryRow']);
    const sent=[];
    const hostile={identity:{id:'5',hpay_account_id:'HPAY-WRK-00880021',display_name:'Asha',howdi_id:'WRK-A',program_id:'3',program_name:'Worker Services'},agreement:null,
      totals:{gross:'0',howdi_fee:'0',net:'0',hold:'0',eligible:'0',settled:'0',paid:'0'},earnings:[],settlements:[]};
    await run({},{},null,(res,s,p)=>sent.push([s,p]),async()=>'880021',async()=>hostile,worksWorkerHpaySummaryRow,console);
    assert.strictEqual(sent[0][0],200);
    assert.deepStrictEqual(identityKeys(sent[0][1]),[]);assert.deepStrictEqual(pinnedLeaks(sent[0][1]),[]);
    assert.strictEqual(sent[0][1].summary.identity.worker_code,'WRK-A');
  });
  await test('Worker application upload errors: fixed message, detail only in the server log',async()=>{
    const {code}=blockOf('"/api/worker/applications"');
    const body=code.slice(code.indexOf('{')+1,code.lastIndexOf('}'));
    // The extracted body still needs the enclosing handler's pathname and onboarding helpers.
    const run=new AsyncFunction('req','res','pool','sendJSON','getBody','getSessionUserFromRequest','clean','number','savePrivateDataFile','workerApplicationRow','console','pathname','onboardingSubmissionError','removePrivateApplicationFiles',body);
    const clean=(v)=>String(v??'').trim();
    const onboardingSubmissionError=new Function('clean',functionSource('onboardingTextTooLong')+'\n'+functionSource('onboardingSubmissionError')+'\nreturn onboardingSubmissionError;')(clean);
    const sent=[],logged=[],removed=[];
    const tiny={dataUrl:'data:image/png;base64,AA=='};
    await run({},{},{query:async()=>({rows:[]})},(res,s,p)=>sent.push([s,p]),async()=>({fullName:'A',phone:'1',city:'C',claimedSkill:'S',gender:'m',age:30,consent:true,declaration:true,kycDocumentType:'x',kycIdLast4:'1234',profilePhoto:tiny,liveSelfie:tiny,kycDocument:tiny}),async()=>null,clean,(v,d)=>Number(v??d),
      ()=>{throw new Error("EACCES: permission denied, open '/srv/howdi/backend/private_uploads/worker_applications/HOWDI-WA-1-profile.png'");},(x)=>x,{error:()=>{},warn:(...a)=>logged.push(a),log:()=>{}},'/api/worker/applications',onboardingSubmissionError,(names)=>removed.push(names));
    assert.deepStrictEqual(sent,[[400,{status:'error',code:'APPLICATION_FILE_REJECTED',message:'One of the uploaded files could not be accepted. Files must be JPG, PNG, WEBP or PDF and under 3 MB.'}]]);
    assert.ok(!/EACCES|srv|private_uploads|howdi/i.test(sent[0][1].message));
    assert.deepStrictEqual(removed,[['','','','','']],'cleanup runs even when the first upload fails');
    assert.strictEqual(logged.length,1);
    assert.ok(/EACCES/.test(String(logged[0][1])),'the raw error is logged server-side');
  });

  await test('PUT /api/worker/works/availability: parameter $2 is cast to text in BOTH positions (PostgreSQL: "inconsistent types deduced for parameter $2")',()=>{
    const put=blocks.find((b)=>/req\.method === "PUT"/.test(b.header)&&b.header.includes('/api/worker/works/availability'));
    assert.ok(put,'availability PUT block');
    const sql=put.code.match(/UPDATE works_workers SET availability_status=[^`]*/)[0];
    assert.match(sql,/availability_status=\$2::text/);
    assert.match(sql,/<>\$2::text/);
    assert.doesNotMatch(sql,/\$2(?!::text)/,'every use of $2 must carry the ::text cast');
  });

  // ================= 3. works_work_orders is complete on a fresh database =================
  function fakePool(shapeRows){
    const q=[];
    return {q,pool:{query:async(sql)=>{q.push(String(sql).replace(/\s+/g,' ').trim());if(/information_schema\.columns/.test(sql))return {rows:shapeRows};return {rows:[],rowCount:0};}}};
  }
  const ensure=(pool)=>new Function('pool',functionSource('ensureWorksWorkOrdersFullSchema')+'\nreturn ensureWorksWorkOrdersFullSchema;')(pool);
  const FULL=[{column_name:'work_code',is_nullable:'NO',character_maximum_length:60},{column_name:'title',is_nullable:'NO',character_maximum_length:180},{column_name:'service_name',is_nullable:'NO',character_maximum_length:120},{column_name:'city',is_nullable:'NO',character_maximum_length:120},{column_name:'status',is_nullable:'YES',character_maximum_length:40}];
  const MINIMAL=[{column_name:'work_code',is_nullable:'YES',character_maximum_length:60},{column_name:'title',is_nullable:'YES',character_maximum_length:180},{column_name:'service_name',is_nullable:'YES',character_maximum_length:120},{column_name:'city',is_nullable:'YES',character_maximum_length:120},{column_name:'status',is_nullable:'NO',character_maximum_length:30}];
  await test('schema completion is wired into the works bootstrap right after the works_work_orders CREATE',()=>{
    const create=source.indexOf('CREATE TABLE IF NOT EXISTS works_work_orders (\n        id BIGSERIAL PRIMARY KEY,\n        work_code VARCHAR(60) UNIQUE NOT NULL');
    assert.ok(create>0);
    const call=source.indexOf('await ensureWorksWorkOrdersFullSchema();',create);
    const nextTable=source.indexOf('CREATE TABLE IF NOT EXISTS works_work_offers',create);
    assert.ok(call>create&&call<nextTable,'must run before anything that references works_work_orders columns or rows');
  });
  await test('every works_work_orders column the Worker routes read is added by the boot schema (no test-time ALTERs needed)',async()=>{
    const {q,pool}=fakePool(FULL);await ensure(pool)();
    const added=new Set(q.map((s)=>/ADD COLUMN IF NOT EXISTS (\w+)/.exec(s)).filter(Boolean).map((m)=>m[1]));
    const fixed=new Set(['id','worker_user_id']);   // created by the table itself
    const read=new Set();
    for(const b of blocks){for(const m of stripComments(b.code).matchAll(/\bwo\.(\w+)/g))read.add(m[1]);}
    for(const m of functionSource('worksOrderRow').matchAll(/\br\.(\w+)/g))read.add(m[1]);
    const missing=[...read].filter((c)=>!added.has(c)&&!fixed.has(c)&&!['updated_at','created_at','status'].includes(c));
    assert.deepStrictEqual(missing,[],`columns read by Worker/order serializers but not ensured at boot: ${missing}`);
    for(const c of ['work_code','title','service_name','city','schedule_time','urgency','customer_user_id','customer_name','customer_phone','customer_email','address_line','preferred_worker_id','booking_source'])assert.ok(added.has(c),`${c} not ensured`);
  });
  await test('schema completion is idempotent: every ALTER is IF NOT EXISTS, and a complete table costs no UPDATE / SET NOT NULL / TYPE change',async()=>{
    const {q,pool}=fakePool(FULL);await ensure(pool)();
    for(const s of q){
      if(/^ALTER TABLE works_work_orders ADD COLUMN/.test(s))assert.match(s,/ADD COLUMN IF NOT EXISTS/);
      if(/^CREATE (UNIQUE )?INDEX/.test(s))assert.match(s,/IF NOT EXISTS/);
    }
    assert.ok(!q.some((s)=>/^UPDATE works_work_orders/.test(s)||/SET NOT NULL/.test(s)||/ALTER COLUMN status TYPE/.test(s)),'a database that already has the full table must not be rewritten or locked on boot');
    assert.ok(q.some((s)=>/CREATE UNIQUE INDEX IF NOT EXISTS works_work_orders_work_code_key ON works_work_orders\(work_code\)/.test(s)));
  });
  await test('schema completion on a minimal-shape table back-fills NULLs BEFORE setting NOT NULL and aligns the status contract',async()=>{
    const {q,pool}=fakePool(MINIMAL);await ensure(pool)();
    for(const col of ['work_code','title','service_name','city']){
      const upd=q.findIndex((s)=>new RegExp(`^UPDATE works_work_orders SET ${col}=.* WHERE ${col} IS NULL$`).test(s));
      const nn=q.findIndex((s)=>new RegExp(`ALTER COLUMN ${col} SET NOT NULL`).test(s));
      assert.ok(upd>-1&&nn>upd,`${col}: back-fill must precede SET NOT NULL`);
    }
    assert.ok(q.some((s)=>/SET work_code='HOWDI-WORK-'\|\|id WHERE work_code IS NULL/.test(s)));
    assert.ok(q.some((s)=>/ALTER COLUMN status TYPE VARCHAR\(40\)/.test(s))&&q.some((s)=>/ALTER COLUMN status SET DEFAULT 'open'/.test(s)));
    assert.ok(q.findIndex((s)=>/CREATE UNIQUE INDEX/.test(s))>q.findIndex((s)=>/work_code SET NOT NULL/.test(s)),'unique index is created after the back-fill');
  });

  console.log(`works-worker-hardening: ${passed} tests passed`);
})().catch((e)=>{console.error(e);process.exit(1);});

// Worker Portal — fresh-database boot + full route exercise + error hygiene, real PostgreSQL, real backend/server.js.
//   WORKER_PG_URL=postgresql://user:pass@host:5432/EMPTY_disposable_db node backend/tests/worker-pg/02-fresh-db-routes.cjs
// The database MUST be empty: the server creates every table itself and nothing here ALTERs a table to make it fit.
//   A. schema  – works_work_orders is complete after a fresh boot, a second boot is a no-op, and a legacy minimal-shape table
//                (with data) is repaired/back-filled without losing rows.
//   B. routes  – every /api/worker/* route is exercised as a real, verified Worker session; no 5xx, and every response body passes a
//                recursive scan: no user_id / worker_id / customer_user_id / howdi_id / master id keys and none of the pinned internal
//                numeric identities (user, worker, customer) or HOWDI / master ids anywhere in any value.
//   C. errors  – deliberate database failures return a fixed generic 500 with no SQL text; the diagnostics stay in the server log.
const L=require('./lib.cjs');
const {pool,api,mkUser,mkWorker,mkWorkOrder,mkOffer,mkRejection,mkJourney,mkPost,react,mkNotification,mkPayment,mkCancellationCase,check}=L;

const UPLOAD_DIR=require('node:path').join(__dirname,'../../private_uploads/worker_applications');
const listUploads=()=>{try{return new Set(require('node:fs').readdirSync(UPLOAD_DIR));}catch{return new Set();}};
let uploadsBefore=new Set();
// the application endpoint stores uploads under backend/private_uploads/ (a rejected upload can leave the files that were already saved): remove exactly what this run created
const removeNewUploads=()=>{const fs=require('node:fs');for(const f of listUploads())if(!uploadsBefore.has(f))try{fs.unlinkSync(require('node:path').join(UPLOAD_DIR,f));}catch{}};
const has=(text,needle)=>String(text).includes(String(needle));
// identity keys that must never appear in ANY Worker response, at any depth (customer contact fields on accepted jobs are a product
// decision and are deliberately not in this list)
const IDENTITY_KEY=/^(user_?id|worker_?id|customer_?user_?id|master_?id|howdi_?id|identity_?uuid|uuid|preferred_?worker_?id|worker_?user_?id|hpay_?account_?id|owner_?reference|participant_?reference)$/i;
function identityKeys(value,where='$',hits=[]){
  if(Array.isArray(value))value.forEach((v,i)=>identityKeys(v,`${where}[${i}]`,hits));
  else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(IDENTITY_KEY.test(k))hits.push(`${where}.${k}`);identityKeys(v,`${where}.${k}`,hits);}}
  return hits;
}
const ERROR_LEAK_KEY=/^(detail|details|stack|sql|query|hint|where|constraint|table|column|schema|routine|position|severity|internalQuery|error)$/i;
function errorKeys(value,where='$',hits=[]){
  if(Array.isArray(value))value.forEach((v,i)=>errorKeys(v,`${where}[${i}]`,hits));
  else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(ERROR_LEAK_KEY.test(k))hits.push(`${where}.${k}`);errorKeys(v,`${where}.${k}`,hits);}}
  return hits;
}
const SQL_TEXT=/relation|does not exist|works_[a-z_]+|hpay_[a-z_]+|column|syntax error|violates|constraint|duplicate key|SELECT |INSERT |UPDATE |FROM |pg_|ECONN|postgres|42P01|42703|23\d{3}|at \S+ \(.+:\d+:\d+\)/i;

const cols=async(t)=>(await pool.query(`SELECT column_name,is_nullable,data_type,character_maximum_length,column_default FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 ORDER BY ordinal_position`,[t])).rows;
const WORK_ORDER_COLUMNS=['id','work_code','title','service_id','service_name','work_type','city','pincode','budget','schedule_date','schedule_time','description','skills','status','priority','urgency','active',
  'customer_user_id','customer_name','customer_phone','customer_email','address_line','preferred_worker_id','preferred_worker_name','booking_source','created_at','updated_at'];

(async()=>{
  // ================= A. SCHEMA =================
  check('A0 the scratch database is really empty (no users table yet)',Number((await pool.query(`SELECT COUNT(*)::int n FROM information_schema.tables WHERE table_schema=current_schema()`)).rows[0].n)===0);
  let up=await L.start();check('A1 boot 1: server starts on an EMPTY database',up,L.serverLog().slice(-800));
  if(!up)return L.finish('worker fresh db');
  let c=await cols('works_work_orders');const names=c.map((x)=>x.column_name);
  const missing=WORK_ORDER_COLUMNS.filter((n)=>!names.includes(n));
  check('A2 works_work_orders has every column the Worker (and customer/admin) routes read, straight after a fresh boot',missing.length===0,missing);
  const notNull=(n)=>(c.find((x)=>x.column_name===n)||{}).is_nullable==='NO';
  check('A3 work_code, title, service_name, city are NOT NULL as in the full table definition',['work_code','title','service_name','city'].every(notNull),c.filter((x)=>['work_code','title','service_name','city'].includes(x.column_name)));
  const st=c.find((x)=>x.column_name==='status');
  check("A3 status is VARCHAR(40) DEFAULT 'open'",st&&Number(st.character_maximum_length)===40&&/'open'/.test(st.column_default||''),st);
  check('A4 work_code is unique (index present)',Number((await pool.query(`SELECT COUNT(*)::int n FROM pg_indexes WHERE tablename='works_work_orders' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%(work_code)%'`)).rows[0].n)>=1);
  const schemaBefore=JSON.stringify(await cols('works_work_orders'));
  await L.stop();
  up=await L.start();check('A5 boot 2 on the same database (idempotent): server starts',up,L.serverLog().slice(-800));
  check('A5 …and works_work_orders is unchanged by the second boot',JSON.stringify(await cols('works_work_orders'))===schemaBefore);
  check('A5 …with no schema error in the boot log',!/column .* does not exist|relation .* does not exist|cannot alter type|violates not-null/i.test(L.serverLog()),L.serverLog().slice(-400));
  await L.stop();

  // legacy minimal-shape table that already holds a row: drop the four late columns and put status back to the bootstrap shape
  await pool.query(`INSERT INTO users(full_name,email,phone,password_hash,howdi_id,master_id) VALUES('Legacy Customer','legacy@example.test','9111111111','x','HWD-LEGACY-1','MST-LEGACY-1')`);
  const legacyUser=Number((await pool.query(`SELECT id FROM users WHERE howdi_id='HWD-LEGACY-1'`)).rows[0].id);
  await pool.query(`ALTER TABLE works_work_orders DROP COLUMN work_code CASCADE`);
  for(const col of ['title','service_name','city'])await pool.query(`ALTER TABLE works_work_orders DROP COLUMN ${col} CASCADE`);
  await pool.query(`ALTER TABLE works_work_orders ALTER COLUMN status TYPE VARCHAR(30)`);
  await pool.query(`ALTER TABLE works_work_orders ALTER COLUMN status SET DEFAULT 'pending'`);
  const legacyId=Number((await pool.query(`INSERT INTO works_work_orders(customer_user_id,status) VALUES($1,'pending') RETURNING id`,[legacyUser])).rows[0].id);
  up=await L.start();check('A6 boot 3 on a legacy minimal-shape works_work_orders that holds data: server starts',up,L.serverLog().slice(-800));
  const legacyRow=(await pool.query(`SELECT * FROM works_work_orders WHERE id=$1`,[legacyId])).rows[0]||{};
  check('A6 the existing row survived and was back-filled (work_code, title, service_name, city)',legacyRow.work_code==='HOWDI-WORK-'+legacyId&&legacyRow.title==='Work request '+legacyId&&legacyRow.service_name==='General service'&&legacyRow.city==='Not specified'&&Number(legacyRow.customer_user_id)===legacyUser&&legacyRow.status==='pending',legacyRow);
  c=await cols('works_work_orders');
  check('A6 NOT NULL constraints, VARCHAR(40) DEFAULT open and the unique work_code index were restored',['work_code','title','service_name','city'].every(notNull)&&Number(c.find((x)=>x.column_name==='status').character_maximum_length)===40&&/'open'/.test(c.find((x)=>x.column_name==='status').column_default||'')&&Number((await pool.query(`SELECT COUNT(*)::int n FROM pg_indexes WHERE tablename='works_work_orders' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%(work_code)%'`)).rows[0].n)>=1,c);
  await L.stop();
  up=await L.start();check('A7 boot 4 (repaired table): still starts, and the back-filled row is untouched',up&&(await pool.query(`SELECT work_code FROM works_work_orders WHERE id=$1`,[legacyId])).rows[0].work_code==='HOWDI-WORK-'+legacyId,L.serverLog().slice(-400));

  // ================= B. EVERY WORKER ROUTE, ON THE FRESH DATABASE =================
  const uA=await mkUser('Asha Worker',{id:620101}), uB=await mkUser('Bilal Worker',{id:620102}), uE=await mkUser('Esha NotAWorker',{id:620105});
  const cust=await mkUser('Priya Customer',{id:730417,phone:'9000012345',email:'priya.customer@example.test'});
  const wA=await mkWorker(uA,{id:880021,code:'WRK-A'}), wB=await mkWorker(uB,{id:880022,code:'WRK-B'});
  const SECRETS=[880021,880022,620101,620102,620105,730417,uA.howdi,uB.howdi,cust.howdi,uA.master,uB.master,cust.master,'HPAY-WRK-','00880021'];
  const leaks=(text)=>SECRETS.filter((s)=>has(text,s)).map(String);
  const tok=uA.token;
  const crawl=[];   // every Worker response, for the final blanket assertions
  const call=async(label,method,path,opts,expect)=>{
    const r=await api(method,path,{token:tok,...(opts||{})});crawl.push({label,...r});
    check(`B ${label}: ${method} ${path.split('?')[0]} -> ${[].concat(expect).join('/')}`,[].concat(expect).includes(r.status),{status:r.status,text:r.text.slice(0,300)});
    check(`B ${label}: no identity keys / pinned numeric ids / HOWDI ids in the response`,identityKeys(r.json).length===0&&leaks(r.text).length===0,{keys:identityKeys(r.json),leaks:leaks(r.text)});
    return r;
  };

  // seed through SQL: posts, offers (offered / rejected / accepted+journey), a cancellation, a notification, a successful payment
  const p1=await mkPost(wA,'Available for tap repairs'),p2=await mkPost(wB,'Rewiring done today');await react(p1,wB);await react(p2,wA);
  const woOffered=await mkWorkOrder({customer:cust,status:'offered',code:'HOWDI-WORK-501'});
  const woToReject=await mkWorkOrder({customer:cust,status:'offered',code:'HOWDI-WORK-502'});
  const woRejected=await mkWorkOrder({customer:cust,status:'open',code:'HOWDI-WORK-503'});
  const woJob=await mkWorkOrder({customer:cust,status:'assigned',code:'HOWDI-WORK-504'});
  const woCancelled=await mkWorkOrder({customer:cust,status:'cancelled',code:'HOWDI-WORK-505'});
  const oOffered=await mkOffer(woOffered,wA,{status:'offered'});
  const oToReject=await mkOffer(woToReject,wA,{status:'offered'});
  const oRejected=await mkOffer(woRejected,wA,{status:'rejected',reason:'Too far',responded:true});await mkRejection(woRejected,oRejected,wA,cust,'Too far');
  const oJob=await mkOffer(woJob,wA,{status:'accepted',responded:true});const jJob=await mkJourney(woJob,wA,oJob,'accepted');
  await mkCancellationCase(woCancelled,wA,cust);
  const nid=await mkNotification(wA,woOffered);
  await mkPayment(woJob,cust,{amount:2000});

  let r=await call('me','GET','/api/worker/me',{},200);
  check('B me: own profile comes back with worker code but no id',r.json.worker&&r.json.worker.workerCode==='WRK-A'&&!('id' in r.json.worker),r.json&&r.json.worker);
  await call('session','POST','/api/worker/session',{body:{}},200);
  r=await call('availability','GET','/api/worker/works/availability',{},200);
  check('B availability: reports the active job code, not ids',r.json.availability&&r.json.availability.onWork===true&&r.json.availability.activeWorkCode==='HOWDI-WORK-504',r.json&&r.json.availability);
  r=await call('availability locked','PUT','/api/worker/works/availability',{body:{status:'busy'}},409);
  // a Worker without an active job can change availability (this route failed with "inconsistent types deduced for parameter $2" before the ::text casts)
  r=await call('availability update (busy)','PUT','/api/worker/works/availability',{token:uB.token,body:{status:'busy',preferredRadiusKm:12}},200);
  check('B availability update: status busy, radius 12, no ids',r.json.availability&&r.json.availability.status==='busy'&&r.json.availability.preferredRadiusKm===12,r.json);
  r=await call('availability update (online)','PUT','/api/worker/works/availability',{token:uB.token,body:{status:'online'}},200);
  const ledger=(await pool.query(`SELECT status,ended_at FROM works_worker_availability_events WHERE worker_id=$1 ORDER BY id`,[wB.id])).rows;
  check('B availability update: the transparency ledger recorded busy then online (only the last one still open)',ledger.some((e)=>e.status==='busy'&&e.ended_at)&&ledger[ledger.length-1].status==='online'&&ledger[ledger.length-1].ended_at===null,ledger);
  r=await call('availability update (invalid)','PUT','/api/worker/works/availability',{token:uB.token,body:{status:'sleeping'}},400);
  r=await call('notifications','GET','/api/worker/works/notifications',{},200);
  check('B notifications: the seeded notification is listed with its work code',r.json.notifications.length===1&&r.json.notifications[0].workCode==='HOWDI-WORK-501'&&r.json.unreadCount===1,r.json);
  await call('notification read','PATCH','/api/worker/works/notifications/'+nid+'/read',{body:{}},200);
  await call('notification read (unknown id)','PATCH','/api/worker/works/notifications/99999/read',{body:{}},404);
  await call('notifications read-all','PATCH','/api/worker/works/notifications/read-all',{body:{}},200);
  await call('profile','GET','/api/worker/profile',{},200);
  await call('profile update','PUT','/api/worker/profile',{body:{fullName:'Asha Worker',email:'asha@example.test',city:'Warangal',pincode:'506001',serviceRadiusKm:15}},200);
  await call('connect health','GET','/api/worker/connect/health',{},200);
  await call('feed','GET','/api/worker/connect/feed',{},200);
  r=await call('post create','POST','/api/worker/connect/posts',{body:{content:'Fresh post',category:'work'}},201);
  check('B post create: returns the safe feed shape (no worker_id, no raw row)',r.json.post&&JSON.stringify(Object.keys(r.json.post).sort())===JSON.stringify(['category','content','createdAt','id','reactedByViewer','reactionCount','workerCode','workerName'])&&r.json.post.workerCode==='WRK-A'&&r.json.post.reactionCount===0&&r.json.post.reactedByViewer===false,r.json&&r.json.post);
  r=await call('reaction','POST','/api/worker/connect/posts/'+p2+'/reaction',{body:{}},200);
  await call('reaction (unknown post)','POST','/api/worker/connect/posts/99999/reaction',{body:{}},404);
  r=await call('offers','GET','/api/worker/works/offers',{},200);
  check('B offers: open offers carry offer id / work code, and NO workerId',r.json.offers.length===2&&r.json.offers.every((o)=>!('workerId' in o)&&o.offerCode&&o.workCode&&o.id),r.json&&r.json.offers);
  r=await call('offer accept','PUT','/api/worker/works/offers/'+oOffered+'/status',{body:{status:'accepted'}},[200,409]);
  r=await call('offer reject','PUT','/api/worker/works/offers/'+oToReject+'/status',{body:{status:'rejected',reason:'Not available'}},200);
  check('B offer reject: offer payload has no workerId and the history item is safe',r.json.offer&&!('workerId' in r.json.offer)&&r.json.historyItem&&r.json.historyItem.workCode==='HOWDI-WORK-502',r.json);
  await call('offer status (bad value)','PUT','/api/worker/works/offers/'+oToReject+'/status',{body:{status:'maybe'}},400);
  await call('offer status (not found)','PUT','/api/worker/works/offers/99999/status',{body:{status:'rejected'}},404);
  await call('debug-lifecycle','GET','/api/worker/works/debug-lifecycle',{},200);
  r=await call('history','GET','/api/worker/works/history',{},200);
  check('B history: rejected + cancelled entries are listed',r.json.history.some((h)=>h.type==='rejected')&&r.json.history.some((h)=>h.type==='cancelled'),r.json&&r.json.history&&r.json.history.map((h)=>h.type));
  r=await call('jobs','GET','/api/worker/works/jobs',{},200);
  check('B jobs: the active job is listed with workCode and NO workerId',r.json.jobs.length>=1&&r.json.jobs.every((j)=>!('workerId' in j)&&j.workCode&&j.workId),r.json&&r.json.jobs);
  r=await call('job location','POST','/api/worker/works/jobs/'+woJob.id+'/location',{body:{latitude:17.98,longitude:79.6,accuracyM:12,etaMinutes:9}},200);
  check('B job location: returns the journey without workerId',r.json.journey&&!('workerId' in r.json.journey)&&r.json.journey.workCode==='HOWDI-WORK-504',r.json&&r.json.journey);
  r=await call('job stage','PUT','/api/worker/works/jobs/'+woJob.id+'/stage',{body:{stage:'en_route'}},200);
  check('B job stage: journey without workerId, stage advanced',r.json.journey&&!('workerId' in r.json.journey)&&r.json.journey.stage==='en_route',r.json&&r.json.journey);
  await call('job stage (illegal jump)','PUT','/api/worker/works/jobs/'+woJob.id+'/stage',{body:{stage:'completed'}},409);
  r=await call('job location (someone else\'s job)','POST','/api/worker/works/jobs/'+woOffered.id+'/location',{body:{latitude:1,longitude:1}},403);
  r=await call('hpay summary','GET','/api/worker/hpay/summary',{},200);
  const s=r.json.summary||{};
  check('B hpay summary: identity has display name + worker code only (no howdi_id, no HPAY-WRK-<id> account number, no numeric ids)',s.identity&&JSON.stringify(Object.keys(s.identity).sort())===JSON.stringify(['display_name','program_name','worker_code'])&&s.identity.worker_code==='WRK-A',s.identity);
  check('B hpay summary: the earning is there (gross 2000) without payment/work-order ids or the provider reference',s.earnings&&s.earnings.length===1&&Number(s.earnings[0].gross_amount)===2000&&s.earnings[0].source_snapshot.workCode==='HOWDI-WORK-504'&&!/PROVIDER-REF|paymentId|workOrderId|"id"/.test(JSON.stringify(s.earnings[0])),s.earnings);
  check('B hpay summary: agreement + totals present, no ids',s.agreement&&s.agreement.agreement_name&&!('id' in s.agreement)&&s.totals&&!('id' in s.totals)&&(s.settlements||[]).every((x)=>!('id' in x)),s);
  // public application endpoint that lives under /api/worker/
  uploadsBefore=listUploads();
  r=await api('POST','/api/worker/applications',{body:{fullName:'X'}});crawl.push({label:'application (invalid)',...r});
  check('B application (invalid): 400 with a fixed validation message',r.status===400&&r.json&&r.json.message==='Name, phone, city and claimed skill are required',{status:r.status,text:r.text});
  const tiny='data:image/png;base64,iVBORw0KGgo=';
  const appBody={fullName:'Ravi',phone:'9876500000',city:'Warangal',claimedSkill:'Plumber',gender:'male',age:30,consent:true,declaration:true,kycDocumentType:'aadhaar',kycIdLast4:'1234',
    profilePhoto:{dataUrl:tiny},liveSelfie:{dataUrl:tiny},kycDocument:{dataUrl:'data:text/plain;base64,QUJD'}};
  r=await api('POST','/api/worker/applications',{body:appBody});crawl.push({label:'application (bad file)',...r});
  check('B application (bad file type): fixed 400 message, no raw error text, no file-system detail',r.status===400&&r.json.code==='APPLICATION_FILE_REJECTED'&&!/kycDocument|Invalid .* file|ENOENT|EACCES|private_uploads|\/|\\\\/.test(r.text)&&errorKeys(r.json).length===0,r.text);
  r=await api('POST','/api/worker/applications',{body:{...appBody,kycDocument:{dataUrl:tiny}}});crawl.push({label:'application (ok)',...r});
  check('B application (valid): 201',r.status===201&&r.json.status==='success',{status:r.status,text:r.text.slice(0,200)});
  removeNewUploads();
  // session gate on every route
  for(const [m,p] of [['GET','/api/worker/me'],['GET','/api/worker/works/offers'],['GET','/api/worker/works/jobs'],['GET','/api/worker/works/history'],['GET','/api/worker/hpay/summary'],['GET','/api/worker/connect/feed'],['POST','/api/worker/connect/posts'],['GET','/api/worker/works/debug-lifecycle'],['PUT','/api/worker/works/availability'],['GET','/api/worker/works/notifications']]){
    const a=await api(m,p,{body:m==='GET'?undefined:{}});
    const b=await api(m,p,{token:uE.token,body:m==='GET'?undefined:{}});
    check(`B gate: ${m} ${p} -> 401 without a session and 403 for a member with no Worker account`,a.status===401&&b.status===403&&!errorKeys(a.json).length&&!errorKeys(b.json).length,{a:a.status,b:b.status});
  }
  check('B overall: no Worker route answered 5xx during the crawl',crawl.every((x)=>x.status<500),crawl.filter((x)=>x.status>=500).map((x)=>x.label+':'+x.status));
  check('B overall: every crawled response is free of identity keys, pinned ids and HOWDI/master ids',crawl.every((x)=>identityKeys(x.json).length===0&&leaks(x.text).length===0),crawl.filter((x)=>identityKeys(x.json).length||leaks(x.text).length).map((x)=>x.label));

  // ================= C. DELIBERATE DATABASE ERRORS =================
  const breakIt=async(label,sqlBreak,sqlFix,method,path,{body,expectCode='WORKER_REQUEST_FAILED',token}={})=>{
    const logStart=L.serverLog().length;
    await pool.query(sqlBreak);
    let res;try{res=await api(method,path,{token:token||tok,body});}finally{await pool.query(sqlFix);}
    const logged=L.serverLog().slice(logStart);
    check(`C ${label}: HTTP 500 with the fixed generic body`,res.status===500&&res.json&&res.json.status==='error'&&res.json.code===expectCode&&typeof res.json.message==='string'&&Object.keys(res.json).sort().join()==='code,message,status',{status:res.status,text:res.text});
    check(`C ${label}: the response contains no SQL text, table/column names, pg codes or stack traces`,!SQL_TEXT.test(res.text.replace(/"code":"[A-Z_]+"/,''))&&errorKeys(res.json).length===0,res.text);
    check(`C ${label}: the detailed diagnostic IS in the server log (server-side only)`,/SERVER ROUTE ERROR|Worker HPay summary failed/.test(logged)&&/does not exist/.test(logged),logged.slice(0,300));
    return res;
  };
  await breakIt('feed (missing table)','ALTER TABLE works_connect_posts RENAME TO works_connect_posts_gone','ALTER TABLE works_connect_posts_gone RENAME TO works_connect_posts','GET','/api/worker/connect/feed');
  await breakIt('offers (missing column)','ALTER TABLE works_work_offers RENAME COLUMN status TO status_gone','ALTER TABLE works_work_offers RENAME COLUMN status_gone TO status','GET','/api/worker/works/offers');
  await breakIt('debug-lifecycle (missing table)','ALTER TABLE works_rejection_history RENAME TO works_rejection_history_gone','ALTER TABLE works_rejection_history_gone RENAME TO works_rejection_history','GET','/api/worker/works/debug-lifecycle');
  await breakIt('availability (missing column)','ALTER TABLE works_workers RENAME COLUMN availability_status TO availability_status_gone','ALTER TABLE works_workers RENAME COLUMN availability_status_gone TO availability_status','GET','/api/worker/works/availability');
  await breakIt('post create (missing table)','ALTER TABLE works_connect_posts RENAME TO works_connect_posts_gone','ALTER TABLE works_connect_posts_gone RENAME TO works_connect_posts','POST','/api/worker/connect/posts',{body:{content:'x'}});
  await breakIt('job stage (missing table)','ALTER TABLE works_job_journeys RENAME TO works_job_journeys_gone','ALTER TABLE works_job_journeys_gone RENAME TO works_job_journeys','PUT','/api/worker/works/jobs/'+woJob.id+'/stage',{body:{stage:'arrived'}});
  // transactional write path: BEGIN ... error ... ROLLBACK ... rethrow (Bilal has no active job, so the availability change reaches the ledger table)
  await breakIt('availability update (missing ledger table inside a transaction)','ALTER TABLE works_worker_availability_events RENAME TO works_worker_availability_events_gone','ALTER TABLE works_worker_availability_events_gone RENAME TO works_worker_availability_events','PUT','/api/worker/works/availability',{body:{status:'busy'},token:uB.token});
  check('C availability update: the failed transaction was rolled back (Bilal is still online)',(await pool.query(`SELECT availability_status FROM works_workers WHERE id=$1`,[wB.id])).rows[0].availability_status!=='busy');
  await breakIt('hpay summary (missing table)','ALTER TABLE hpay_universal_earnings RENAME TO hpay_universal_earnings_gone','ALTER TABLE hpay_universal_earnings_gone RENAME TO hpay_universal_earnings','GET','/api/worker/hpay/summary',{expectCode:'WORKER_HPAY_UNAVAILABLE'});
  // a constraint violation (value-level error) is just as generic
  await pool.query(`ALTER TABLE works_connect_posts ADD CONSTRAINT works_post_deliberate_check CHECK (char_length(content) < 5) NOT VALID`);
  const cv=await api('POST','/api/worker/connect/posts',{token:tok,body:{content:'this content is longer than five characters'}});
  await pool.query(`ALTER TABLE works_connect_posts DROP CONSTRAINT works_post_deliberate_check`);
  check('C constraint violation: generic 500, the constraint name / offending value are not in the response',cv.status===500&&cv.json.code==='WORKER_REQUEST_FAILED'&&!/works_post_deliberate_check|violates|check constraint|longer than five/i.test(cv.text)&&errorKeys(cv.json).length===0,cv.text);
  // malformed / oversized bodies: fixed, safe messages
  const bad=await fetch(L_base()+'/api/worker/connect/posts',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{not json'});
  const badText=await bad.text();
  check('C malformed JSON body: 400 with a fixed message',bad.status===400&&/"code":"INVALID_REQUEST_BODY"/.test(badText)&&!/Unexpected|position|JSON\.parse/.test(badText),{status:bad.status,badText});
  // after every induced failure the same session works again (the errors were request-scoped)
  r=await api('GET','/api/worker/connect/feed',{token:tok});
  check('C recovery: after the induced failures the feed works again and is still clean',r.status===200&&identityKeys(r.json).length===0&&leaks(r.text).length===0,r.status);
  // a non-Worker route keeps its own behaviour (the sanitiser is scoped to /api/worker/*)
  check('boot: no crash in the server log',!/UnhandledPromiseRejection|uncaughtException/i.test(L.serverLog()),L.serverLog().slice(-300));
  return L.finish('worker fresh-db routes + error hygiene (real PostgreSQL)');
})().catch(async(e)=>{console.error(e);try{await L.stop();}catch{}process.exit(1);});
function L_base(){return L.base();}

// Worker Portal public-payload privacy — real PostgreSQL, real backend/server.js over HTTP, real sessions.
//   WORKER_PG_URL=postgresql://user:pass@host:5432/disposable_db node backend/tests/worker-pg/01-payload-privacy.cjs
// Covers GET /api/worker/connect/feed and GET /api/worker/works/debug-lifecycle:
//   * no internal user / worker / customer identity (keys OR values) reaches the Worker browser,
//   * only the safe UI / lifecycle fields are returned,
//   * the session (never a browser-supplied id) decides whose data is returned and who the viewer is,
//   * the modified feed GROUP BY still executes on PostgreSQL and counts reactions correctly.
const L=require('./lib.cjs');
const {pool,api,mkUser,mkWorker,mkWorkOrder,mkOffer,mkRejection,mkJourney,mkPost,react,forbiddenKeys,check}=L;

const FEED_KEYS=['category','content','createdAt','id','reactedByViewer','reactionCount','workerCode','workerName'];
const DEBUG_KEYS=['journey_id','journey_stage','offer_id','offer_status','rejected_at','rejection_id','rejection_reason','responded_at','response_reason','work_code','work_order_id','work_status'];
const has=(text,needle)=>String(text).includes(String(needle));

(async()=>{
  const up=await L.start();check('boot: server starts against an empty database',up,L.serverLog().slice(-800));
  if(!up)return L.finish('worker payload privacy');
  await L.ensureWorkOrderColumns();

  // ---------- fixtures: ids are pinned to values that cannot occur by accident in a payload ----------
  const uA=await mkUser('Asha Worker',{id:620101}), uB=await mkUser('Bilal Worker',{id:620102}), uC=await mkUser('Chetan Pending',{id:620103});
  const uD=await mkUser('Dev Inactive',{id:620104}), uE=await mkUser('Esha NotAWorker',{id:620105});
  const cust=await mkUser('Priya Customer',{id:730417,phone:'9000012345',email:'priya.customer@example.test'});
  const wA=await mkWorker(uA,{id:880021,code:'WRK-A'}), wB=await mkWorker(uB,{id:880022,code:'WRK-B'});
  await mkWorker(uC,{id:880023,code:'WRK-C',kyc:'pending'});
  await mkWorker(uD,{id:880024,code:'WRK-D',active:false});
  const SECRETS=[880021,880022,880023,880024,620101,620102,620103,620104,620105,730417,
    uA.howdi,uB.howdi,cust.howdi,uA.master,uB.master,cust.master,uA.email,uB.email,uA.phone,uB.phone,
    cust.email,cust.phone,cust.name,'Priya','Hidden Lane','Sector 9'];
  const leaks=(text)=>SECRETS.filter((s)=>has(text,s)).map(String);

  // ================= FEED =================
  const p1=await mkPost(wA,'Available for tap repairs this week');
  const p2=await mkPost(wA,'Looking for a plumbing apprentice','GENERAL');
  const p3=await mkPost(wB,'Completed a 3-bedroom rewiring today');
  await react(p1,wA);await react(p1,wB);await react(p3,wA);
  let r=await api('GET','/api/worker/connect/feed',{token:uA.token});
  check('F1 feed -> 200 for an eligible Worker session',r.status===200&&r.json&&r.json.status==='success'&&Array.isArray(r.json.posts),{status:r.status,text:r.text.slice(0,300)});
  const posts=(r.json&&r.json.posts)||[];
  check('F1 GROUP BY without w.id still returns one row per post (3 posts, no duplicates from the reaction join)',posts.length===3&&new Set(posts.map((p)=>p.id)).size===3,posts.map((p)=>p.id));
  check('F2 every post has exactly the safe UI fields (no workerId)',posts.length>0&&posts.every((p)=>JSON.stringify(Object.keys(p).sort())===JSON.stringify(FEED_KEYS)),posts[0]&&Object.keys(posts[0]));
  check('F2 no worker/user/customer identity KEYS anywhere in the feed payload',forbiddenKeys(r.json).length===0,forbiddenKeys(r.json));
  check('F2 no internal worker id, user id, HOWDI id, master id, email or phone VALUES anywhere in the feed payload',leaks(r.text).length===0,leaks(r.text));
  check('F2 the response text has no "workerId"/"worker_id"/"user_id"/"customer_user_id" property at all',!/"(workerId|worker_id|userId|user_id|customer_user_id|customerUserId|howdiId|howdi_id)"/.test(r.text),r.text.slice(0,300));
  const byId=Object.fromEntries(posts.map((p)=>[p.id,p]));
  check('F3 content, category, author code/name are still rendered for the UI',
    byId[p1]&&byId[p1].workerCode==='WRK-A'&&byId[p1].workerName==='Asha Worker'&&byId[p1].content==='Available for tap repairs this week'&&byId[p1].category==='WORK'&&byId[p3]&&byId[p3].workerCode==='WRK-B'&&byId[p3].workerName==='Bilal Worker'&&byId[p2].category==='GENERAL',byId);
  check('F3 createdAt is present and parseable',posts.every((p)=>!Number.isNaN(Date.parse(p.createdAt))),posts.map((p)=>p.createdAt));
  check('F4 reactionCount and reactedByViewer are computed for the SESSION worker (Asha: p1 x2 reacted, p2 x0, p3 x1 reacted)',
    byId[p1].reactionCount===2&&byId[p1].reactedByViewer===true&&byId[p2].reactionCount===0&&byId[p2].reactedByViewer===false&&byId[p3].reactionCount===1&&byId[p3].reactedByViewer===true,byId);
  check('F4 newest post first',JSON.stringify(posts.map((p)=>p.id))===JSON.stringify([String(p3),String(p2),String(p1)]),posts.map((p)=>p.id));
  // a different viewer sees their own reaction state, proving the viewer is derived from the session
  const rB=await api('GET','/api/worker/connect/feed',{token:uB.token});
  const bById=Object.fromEntries(((rB.json&&rB.json.posts)||[]).map((p)=>[p.id,p]));
  check('F5 another Worker session gets its own reactedByViewer (Bilal: p1 reacted, p3 not)',rB.status===200&&bById[p1].reactedByViewer===true&&bById[p3].reactedByViewer===false&&bById[p3].reactionCount===1,bById);
  check('F5 the second viewer\'s payload is just as clean',forbiddenKeys(rB.json).length===0&&leaks(rB.text).length===0,leaks(rB.text));
  // browser-supplied identity is ignored
  const spoof=await api('GET','/api/worker/connect/feed?workerId=880022&worker_id=880022&userId=620102',{token:uA.token,headers:{'x-howdi-worker-id':'880022','x-howdi-user-id':'620102'}});
  check('F6 spoofed x-howdi-worker-id / ?workerId= change nothing (identity comes from the session)',spoof.status===200&&spoof.text===r.text,{status:spoof.status});
  // session gate unchanged
  r=await api('GET','/api/worker/connect/feed');check('F7 no session -> 401 WORKER_SESSION_REQUIRED',r.status===401&&r.json&&r.json.code==='WORKER_SESSION_REQUIRED',{status:r.status,text:r.text.slice(0,200)});
  r=await api('GET','/api/worker/connect/feed',{token:'not-a-real-token'});check('F7 unknown token -> 401',r.status===401,r.status);
  r=await api('GET','/api/worker/connect/feed',{token:uE.token});check('F7 member without a Worker account -> 403 WORKER_ACCOUNT_NOT_LINKED',r.status===403&&r.json.code==='WORKER_ACCOUNT_NOT_LINKED'&&!/posts/.test(r.text),{status:r.status,text:r.text.slice(0,200)});
  r=await api('GET','/api/worker/connect/feed',{token:uC.token});check('F7 Worker with pending KYC -> 403 WORKER_ACCOUNT_INELIGIBLE',r.status===403&&r.json.code==='WORKER_ACCOUNT_INELIGIBLE'&&!/posts/.test(r.text),{status:r.status,text:r.text.slice(0,200)});
  r=await api('GET','/api/worker/connect/feed',{token:uD.token});check('F7 inactive Worker -> 403 WORKER_ACCOUNT_INELIGIBLE',r.status===403&&r.json.code==='WORKER_ACCOUNT_INELIGIBLE',{status:r.status,text:r.text.slice(0,200)});
  // live writes go through the same serializer
  r=await api('POST','/api/worker/connect/posts',{token:uB.token,body:{content:'Fresh post from the API',category:'learning'}});
  check('F8 creating a post works (201)',r.status===201,{status:r.status,text:r.text.slice(0,200)});
  const newId=r.json&&r.json.post&&String(r.json.post.id);
  r=await api('POST','/api/worker/connect/posts/'+newId+'/reaction',{token:uA.token,body:{}});
  check('F8 reacting works and reports a count',r.status===200&&r.json.reacted===true&&r.json.reactionCount===1,{status:r.status,text:r.text.slice(0,200)});
  r=await api('GET','/api/worker/connect/feed',{token:uA.token});
  const fresh=((r.json&&r.json.posts)||[]).find((p)=>p.id===newId);
  check('F8 the new post appears first in the feed with only safe fields, author = Bilal, viewer reacted',
    fresh&&r.json.posts[0].id===newId&&JSON.stringify(Object.keys(fresh).sort())===JSON.stringify(FEED_KEYS)&&fresh.workerCode==='WRK-B'&&fresh.category==='LEARNING'&&fresh.reactionCount===1&&fresh.reactedByViewer===true,fresh);
  check('F8 …and the feed is still free of identity keys and values',forbiddenKeys(r.json).length===0&&leaks(r.text).length===0,leaks(r.text));

  // ================= DEBUG-LIFECYCLE =================
  const wo1=await mkWorkOrder({customer:cust,status:'offered',code:'HOWDI-WORK-D1'});
  const wo2=await mkWorkOrder({customer:cust,status:'open',code:'HOWDI-WORK-D2'});
  const wo3=await mkWorkOrder({customer:cust,status:'accepted',code:'HOWDI-WORK-D3'});
  const wo4=await mkWorkOrder({customer:cust,status:'offered',code:'HOWDI-WORK-D4'});   // only Bilal has an offer here
  const o1=await mkOffer(wo1,wA,{status:'offered'});
  const o2=await mkOffer(wo2,wA,{status:'rejected',reason:'Too far from my location',responded:true});
  const rej2=await mkRejection(wo2,o2,wA,cust,'Too far from my location');
  const o3=await mkOffer(wo3,wA,{status:'accepted',responded:true});
  const j3=await mkJourney(wo3,wA,o3,'en_route');
  const o4=await mkOffer(wo4,wB,{status:'offered'});
  const rejB=await mkRejection(wo4,o4,wB,cust,'Bilal-only rejection reason');

  r=await api('GET','/api/worker/works/debug-lifecycle',{token:uA.token});
  check('D1 debug-lifecycle -> 200 for an eligible Worker session',r.status===200&&r.json&&r.json.status==='success'&&Array.isArray(r.json.rows),{status:r.status,text:r.text.slice(0,300)});
  const rows=(r.json&&r.json.rows)||[];
  check('D1 only the session worker\'s offers are returned (3 rows; Bilal\'s offer/rejection are absent)',rows.length===3&&!rows.some((x)=>x.work_code==='HOWDI-WORK-D4')&&!has(r.text,'Bilal-only'),rows.map((x)=>x.work_code));
  check('D2 every row has exactly the 12 lifecycle fields',rows.length>0&&rows.every((x)=>JSON.stringify(Object.keys(x).sort())===JSON.stringify(DEBUG_KEYS)),rows[0]&&Object.keys(rows[0]));
  check('D2 no customer/user/worker identity KEYS anywhere in the debug payload (customer_user_id is gone)',forbiddenKeys(r.json).length===0&&!has(r.text,'customer_user_id'),forbiddenKeys(r.json));
  check('D2 no customer id, worker id, user id, HOWDI/master id, e-mail, phone, name or address VALUES anywhere in the debug payload',leaks(r.text).length===0,leaks(r.text));
  const byCode=Object.fromEntries(rows.map((x)=>[x.work_code,x]));
  const x1=byCode['HOWDI-WORK-D1'],x2=byCode['HOWDI-WORK-D2'],x3=byCode['HOWDI-WORK-D3'];
  check('D3 offered row: offer/work-order ids and statuses kept, no rejection, no journey',
    x1&&String(x1.offer_id)===String(o1)&&String(x1.work_order_id)===String(wo1.id)&&x1.offer_status==='offered'&&x1.work_status==='offered'&&x1.rejection_id===null&&x1.rejection_reason===null&&x1.rejected_at===null&&x1.journey_id===null&&x1.journey_stage===null&&x1.responded_at===null,x1);
  check('D3 rejected row: reason, rejection id and timestamps kept',
    x2&&String(x2.offer_id)===String(o2)&&x2.offer_status==='rejected'&&x2.response_reason==='Too far from my location'&&String(x2.rejection_id)===String(rej2)&&x2.rejection_reason==='Too far from my location'&&!Number.isNaN(Date.parse(x2.rejected_at))&&!Number.isNaN(Date.parse(x2.responded_at)),x2);
  check('D3 accepted row: journey id and stage kept',
    x3&&String(x3.offer_id)===String(o3)&&x3.offer_status==='accepted'&&x3.work_status==='accepted'&&String(x3.journey_id)===String(j3)&&x3.journey_stage==='en_route'&&x3.rejection_id===null,x3);
  check('D3 the job PIN is not part of the payload',!/job_pin|jobPin|4821/.test(r.text.replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g,'')),r.text.slice(0,300));
  const spoofD=await api('GET','/api/worker/works/debug-lifecycle?workerId=880022&worker_id=880022',{token:uA.token,headers:{'x-howdi-worker-id':'880022'}});
  check('D4 spoofed worker id changes nothing (still Asha\'s rows)',spoofD.status===200&&spoofD.text===r.text,{status:spoofD.status});
  const rDB=await api('GET','/api/worker/works/debug-lifecycle',{token:uB.token});
  check('D4 Bilal sees only his own single row, and it is just as clean',rDB.status===200&&rDB.json.rows.length===1&&rDB.json.rows[0].work_code==='HOWDI-WORK-D4'&&String(rDB.json.rows[0].rejection_id)===String(rejB)&&forbiddenKeys(rDB.json).length===0&&leaks(rDB.text).length===0,rDB.text.slice(0,300));
  r=await api('GET','/api/worker/works/debug-lifecycle');check('D5 no session -> 401 WORKER_SESSION_REQUIRED',r.status===401&&r.json.code==='WORKER_SESSION_REQUIRED'&&!/rows/.test(r.text),{status:r.status,text:r.text.slice(0,200)});
  r=await api('GET','/api/worker/works/debug-lifecycle',{token:uE.token});check('D5 member without a Worker account -> 403',r.status===403&&r.json.code==='WORKER_ACCOUNT_NOT_LINKED'&&!/rows/.test(r.text),{status:r.status,text:r.text.slice(0,200)});
  r=await api('GET','/api/worker/works/debug-lifecycle',{token:uC.token});check('D5 ineligible Worker -> 403',r.status===403&&r.json.code==='WORKER_ACCOUNT_INELIGIBLE'&&!/rows/.test(r.text),{status:r.status,text:r.text.slice(0,200)});
  // a customer session (the person the ids belong to) is not a Worker either
  r=await api('GET','/api/worker/works/debug-lifecycle',{token:cust.token});check('D5 a customer session cannot use the Worker route',r.status===403&&!/rows/.test(r.text),{status:r.status});

  // the server survived every request above without an unhandled error
  check('boot: server log shows no crash',!/UnhandledPromiseRejection|uncaughtException|TypeError: Cannot read/i.test(L.serverLog()),L.serverLog().slice(-400));
  return L.finish('worker payload privacy (real PostgreSQL)');
})().catch(async(e)=>{console.error(e);try{await L.stop();}catch{}process.exit(1);});

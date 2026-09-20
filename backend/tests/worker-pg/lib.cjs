// Shared helpers for the Worker Portal payload-privacy real-PostgreSQL suite (see ../worker-payload-privacy-pg.test.cjs).
const {Pool}=require('pg');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const net=require('node:net');
const path=require('node:path');
const PG=process.env.WORKER_PG_URL;
if(!PG){console.error('WORKER_PG_URL is required (disposable PostgreSQL database).');process.exit(2);}
const pool=new Pool({connectionString:PG});
const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
const freePort=()=>new Promise((ok,bad)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});s.on('error',bad);});

let srv=null,log='',base='';
async function start(){
  const port=await freePort();base='http://127.0.0.1:'+port;log='';
  srv=spawn(process.execPath,[path.join(__dirname,'../../server.js')],{cwd:path.join(__dirname,'../..'),
    env:{...process.env,DATABASE_URL:PG,PORT:String(port),HOST:'127.0.0.1',HOWDI_CONNECT_REF_SECRET:'worker-pg-suite'},stdio:['ignore','pipe','pipe']});
  srv.stdout.on('data',(d)=>{log+=d;});srv.stderr.on('data',(d)=>{log+=d;});
  for(let i=0;i<120;i++){
    await sleep(1000);
    if(srv.exitCode!==null)return false;
    try{if((await fetch(base+'/api/health')).ok){await sleep(3000);return srv.exitCode===null;}}catch{}
  }
  return false;
}
async function stop(){if(srv&&srv.exitCode===null){srv.kill();for(let i=0;i<50&&srv.exitCode===null;i++)await sleep(100);}}
const serverLog=()=>log;

async function api(method,p,{token,body,headers}={}){
  const h={'content-type':'application/json',...(headers||{})};if(token)h.authorization='Bearer '+token;
  const r=await fetch(base+p,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text};
}

// ---- fixtures
let seq=0;
// a HOWDI member with a live session; `id` pins the numeric users.id so tests can search payloads for it
async function mkUser(name,{id,phone,email}={}){
  const n=++seq,tag=crypto.randomBytes(3).toString('hex');
  const hid='HWD-'+Date.now().toString(36).toUpperCase()+tag.toUpperCase()+n;
  const cols=['full_name','email','phone','password_hash','howdi_id','master_id'];
  const vals=[name,email||('wk'+n+'-'+tag+'@example.test'),phone||('9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0')),'x',hid,'MST-'+hid+'-'+tag];
  if(id!==undefined){cols.unshift('id');vals.unshift(id);}
  const u=(await pool.query(`INSERT INTO users(${cols.join(',')}) VALUES(${vals.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING id,email,phone`,vals)).rows[0];
  const token='tok-'+tag+'-'+crypto.randomBytes(6).toString('hex');
  await pool.query(`INSERT INTO user_sessions(id,user_id,session_token,is_active,created_at,last_seen_at) VALUES(gen_random_uuid(),$1,$2,TRUE,NOW(),NOW())`,[u.id,token]);
  return {id:Number(u.id),howdi:hid,master:'MST-'+hid+'-'+tag,email:u.email,phone:u.phone,name,token};
}
// a Worker Portal account bound to a member; `id` pins works_workers.id
async function mkWorker(user,{id,code,kyc='verified',skill='verified',account='active',active=true}={}){
  const n=++seq;
  const cols=['worker_code','full_name','phone','user_id','email','kyc_status','skill_status','account_status','active'];
  const vals=[code||('WRK-T'+n),user.name,user.phone,user.id,user.email,kyc,skill,account,active];
  if(id!==undefined){cols.unshift('id');vals.unshift(id);}
  const w=(await pool.query(`INSERT INTO works_workers(${cols.join(',')}) VALUES(${vals.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING id,worker_code`,vals)).rows[0];
  return {id:Number(w.id),code:w.worker_code,user};
}
// Fresh databases get works_work_orders from an early minimal CREATE (id,customer_user_id,worker_user_id,status,timestamps)
// and the full CREATE later in boot is skipped (pre-existing ordering defect, out of scope for this patch).
// The suite tops the table up with the columns the Worker routes read.
async function ensureWorkOrderColumns(){
  const add=[['work_code',"VARCHAR(60)"],['title',"VARCHAR(180)"],['service_id','BIGINT'],['service_name',"VARCHAR(120)"],['work_type',"VARCHAR(40) DEFAULT 'one_time'"],
    ['city',"VARCHAR(120)"],['pincode',"VARCHAR(12)"],['budget','NUMERIC(12,2) DEFAULT 0'],['schedule_date','DATE'],['description',"TEXT DEFAULT ''"],['skills',"TEXT DEFAULT ''"],
    ['priority',"VARCHAR(30) DEFAULT 'normal'"],['active','BOOLEAN DEFAULT TRUE'],['customer_name','VARCHAR(160)'],['customer_phone','VARCHAR(30)'],['customer_email','VARCHAR(255)'],['address_line','TEXT']];
  for(const [c,t] of add)await pool.query(`ALTER TABLE works_work_orders ADD COLUMN IF NOT EXISTS ${c} ${t}`);
}
let woSeq=0;
async function mkWorkOrder({customer,status='offered',address='14 Hidden Lane, Sector 9',code}){
  const n=++woSeq;
  const r=await pool.query(`INSERT INTO works_work_orders(work_code,title,service_name,city,status,customer_user_id,customer_name,customer_phone,customer_email,address_line)
    VALUES($1,$2,'Plumbing','Bengaluru',$3,$4,$5,$6,$7,$8) RETURNING id,work_code`,
    [code||('HOWDI-WORK-T'+n),'Fix tap '+n,status,customer.id,customer.name,customer.phone,customer.email,address]);
  return {id:Number(r.rows[0].id),code:r.rows[0].work_code};
}
let offSeq=0;
async function mkOffer(wo,worker,{status='offered',reason=null,responded=false}={}){
  const n=++offSeq;
  const r=await pool.query(`INSERT INTO works_work_offers(offer_code,work_order_id,worker_id,status,response_reason,responded_at,offered_at)
    VALUES($1,$2,$3,$4,$5,${responded?'NOW()':'NULL'},NOW()-($6||' minutes')::interval) RETURNING id`,['OFR-T'+n+'-'+crypto.randomBytes(3).toString('hex'),wo.id,worker.id,status,reason,String(100-n)]);
  return Number(r.rows[0].id);
}
async function mkRejection(wo,offerId,worker,customer,reason){
  return Number((await pool.query(`INSERT INTO works_rejection_history(work_order_id,offer_id,worker_id,customer_user_id,reason) VALUES($1,$2,$3,$4,$5) RETURNING id`,[wo.id,offerId,worker.id,customer.id,reason])).rows[0].id);
}
async function mkJourney(wo,worker,offerId,stage='accepted'){
  return Number((await pool.query(`INSERT INTO works_job_journeys(work_order_id,worker_id,accepted_offer_id,stage,job_pin) VALUES($1,$2,$3,$4,'4821') RETURNING id`,[wo.id,worker.id,offerId,stage])).rows[0].id);
}
async function mkPost(worker,content,category='WORK'){
  return Number((await pool.query(`INSERT INTO works_connect_posts(worker_id,content,category) VALUES($1,$2,$3) RETURNING id`,[worker.id,content,category])).rows[0].id);
}
const react=(postId,worker)=>pool.query(`INSERT INTO works_connect_reactions(post_id,worker_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[postId,worker.id]);

// ---- deep scan for identity-bearing keys anywhere in a JSON payload
const FORBIDDEN_KEY=/^(user_?id|worker_?id|customer_?user_?id|customer_?id|master_?id|howdi_?id|identity_?uuid|uuid|email|phone|mobile|address|address_?line|customer_?name|customer_?phone|customer_?email|preferred_?worker_?id|worker_?user_?id|password.*|session.*|token.*)$/i;
function forbiddenKeys(value,where='$',hits=[]){
  if(Array.isArray(value))value.forEach((v,i)=>forbiddenKeys(v,`${where}[${i}]`,hits));
  else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(FORBIDDEN_KEY.test(k))hits.push(`${where}.${k}`);forbiddenKeys(v,`${where}.${k}`,hits);}}
  return hits;
}

const results={pass:0,fail:0};
function check(name,cond,detail){
  if(cond){results.pass++;}
  else{results.fail++;console.log('FAIL '+name+(detail===undefined?'':' :: '+(typeof detail==='string'?detail:JSON.stringify(detail)).slice(0,500)));}
}
async function finish(label){
  await stop();
  console.log(`${label}: ${results.pass} passed, ${results.fail} failed`);
  await pool.end();process.exit(results.fail?1:0);
}
module.exports={pool,start,stop,api,mkUser,mkWorker,ensureWorkOrderColumns,mkWorkOrder,mkOffer,mkRejection,mkJourney,mkPost,react,forbiddenKeys,check,finish,serverLog,sleep};

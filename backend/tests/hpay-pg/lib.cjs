// Shared helpers for the HPay public-handle real-PostgreSQL suite (see ../hpay-public-handle-pg.test.cjs).
const {Pool}=require('pg');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const net=require('node:net');
const path=require('node:path');
const PG=process.env.HPAY_PG_URL;
if(!PG){console.error('HPAY_PG_URL is required (disposable PostgreSQL database).');process.exit(2);}
const pool=new Pool({connectionString:PG});
const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
const freePort=()=>new Promise((ok,bad)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});s.on('error',bad);});

// ---- server control: the suite restarts the real backend/server.js against the scratch DB several times
let srv=null,log='',base='';
async function start(){
  const port=await freePort();base='http://127.0.0.1:'+port;log='';
  srv=spawn(process.execPath,[path.join(__dirname,'../../server.js')],{cwd:path.join(__dirname,'../..'),
    env:{...process.env,DATABASE_URL:PG,PORT:String(port),HOST:'127.0.0.1',HOWDI_CONNECT_REF_SECRET:'hpay-pg-suite'},stdio:['ignore','pipe','pipe']});
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
const serverExited=()=>srv&&srv.exitCode!==null;

async function api(method,p,{token,body}={}){
  const h={'content-type':'application/json'};if(token)h.authorization='Bearer '+token;
  const r=await fetch(base+p,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text};
}

// ---- fixtures
let seq=0;
// username===null -> the member has no Connect profile row at all
async function mkUser(name,username,{howdi}={}){
  const n=++seq,tag=crypto.randomBytes(3).toString('hex');
  const hid=howdi||('HWD-'+Date.now().toString(36).toUpperCase()+tag.toUpperCase()+n);
  const u=(await pool.query(`INSERT INTO users(full_name,email,phone,password_hash,howdi_id,master_id) VALUES($1,$2,$3,'x',$4,$5) RETURNING id`,
    [name,'hp'+n+'-'+tag+'@example.test','9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'),hid,'MST-'+hid+'-'+tag])).rows[0];
  if(username!==undefined){
    await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`,[u.id,username]);
  }
  const token='tok-'+tag+'-'+crypto.randomBytes(6).toString('hex');
  await pool.query(`INSERT INTO user_sessions(id,user_id,session_token,is_active,created_at,last_seen_at) VALUES(gen_random_uuid(),$1,$2,TRUE,NOW(),NOW())`,[u.id,token]);
  return {id:Number(u.id),howdi:hid,legacy:hid.toLowerCase().replace(/[^a-z0-9._-]/g,'')+'@hpay',username,token};
}
const legacyHandle=(u)=>u.legacy;
async function mkAccount(user,handle){
  return Number((await pool.query(`INSERT INTO hpay_accounts(user_id,hpay_id) VALUES($1,$2) RETURNING id`,[user.id,handle])).rows[0].id);
}
const acct=async(user)=>(await pool.query(`SELECT id,hpay_id FROM hpay_accounts WHERE user_id=$1`,[user.id])).rows[0]||null;

// ---- assertion collector
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
module.exports={pool,start,stop,api,mkUser,mkAccount,acct,legacyHandle,check,finish,serverLog,serverExited,sleep};

// Shared helpers for the Learn & Earn real-PostgreSQL / browser suites (see run.cjs).
const {Pool}=require('pg');
const crypto=require('node:crypto');
const pool=new Pool({connectionString:process.env.LEARN_PG_URL});
const BASE=process.env.LEARN_BASE_URL||'http://127.0.0.1:5088';
async function api(method,path,{token,body,headers}={}){
  const h={'content-type':'application/json',...(headers||{})};
  if(token)h.authorization='Bearer '+token;
  const r=await fetch(BASE+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text};
}
let seq=0;
async function mkUser(name,username){
  const n=++seq,tag=crypto.randomBytes(3).toString('hex'),hid='LRN-'+Date.now().toString(36)+n+tag;
  const u=(await pool.query(`INSERT INTO users(full_name,email,phone,password_hash,howdi_id,master_id) VALUES($1,$2,$3,'x',$4,$5) RETURNING id`,
    [name,username+'-'+tag+'@example.test','9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'),hid,'MST-'+hid])).rows[0];
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`,[u.id,username]);
  const token='tok-'+username+'-'+crypto.randomBytes(6).toString('hex');
  await pool.query(`INSERT INTO user_sessions(id,user_id,session_token,is_active,created_at,last_seen_at) VALUES(gen_random_uuid(),$1,$2,TRUE,NOW(),NOW())`,[u.id,token]);
  return {id:Number(u.id),username,token,name,howdi:hid};
}
// every key anywhere in a JSON value whose name identifies a person or account internally
const ID_KEYS=/^(user_id|userid|learner_id|howdi_id|master_id|identity_uuid|email|phone|password_hash|session_token)$/i;
function idKeyPaths(value,path='$',out=[]){
  if(Array.isArray(value))value.forEach((v,i)=>idKeyPaths(v,`${path}[${i}]`,out));
  else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(ID_KEYS.test(k))out.push(`${path}.${k}`);idKeyPaths(v,`${path}.${k}`,out);}
  return out;
}
const results={pass:0,fail:0};
function check(name,cond,detail){
  if(cond){results.pass++;}
  else{results.fail++;console.log('FAIL '+name+(detail===undefined?'':' :: '+(typeof detail==='string'?detail:JSON.stringify(detail)).slice(0,400)));}
}
function finish(label){
  console.log(`${label}: ${results.pass} passed, ${results.fail} failed`);
  return pool.end().then(()=>process.exit(results.fail?1:0));
}
module.exports={pool,api,mkUser,idKeyPaths,check,finish,BASE};

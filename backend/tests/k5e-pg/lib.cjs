// Shared helpers for the K5E real-PostgreSQL scenario suites (see README-K5E.md in this folder).
// K5E_PG_URL   PostgreSQL connection string of a DISPOSABLE database the server under test is also using.
// K5E_BASE_URL base URL of the running server (run.cjs starts one and sets this for you).
const {Pool}=require('pg');
const crypto=require('crypto');
const pool=new Pool({connectionString:process.env.K5E_PG_URL});
const BASE=process.env.K5E_BASE_URL||'http://127.0.0.1:5055';
async function api(method,path,{token,body,headers}={}){
  const h={'content-type':'application/json',...(headers||{})};
  if(token)h.authorization='Bearer '+token;
  const r=await fetch(BASE+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text};
}
// Creates a member + Connect profile + an active session directly in the database.
async function mkUser(name,username,hid){
  const email=username+'@example.test';
  const u=(await pool.query(`INSERT INTO users(full_name,email,phone,password_hash,howdi_id,master_id) VALUES($1,$2,$3,'x',$4,$5) ON CONFLICT DO NOTHING RETURNING id`,[name,email,'9'+String(Math.floor(Math.random()*1e9)).padStart(9,'0'),hid,'MST-'+hid])).rows[0]
    ||(await pool.query(`SELECT id FROM users WHERE email=$1`,[email])).rows[0];
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`,[u.id,username]);
  const token='tok-'+username+'-'+crypto.randomBytes(6).toString('hex');
  await pool.query(`INSERT INTO user_sessions(id,user_id,session_token,is_active,created_at,last_seen_at) VALUES(gen_random_uuid(),$1,$2,TRUE,NOW(),NOW())`,[u.id,token]);
  return {id:Number(u.id),username,token,howdi_id:hid};
}
module.exports={pool,api,mkUser,BASE};

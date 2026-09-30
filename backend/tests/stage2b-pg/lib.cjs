// Shared helpers for the Stage 2B real-PostgreSQL regression suites.
// STAGE2B_PG_URL PostgreSQL connection string of a DISPOSABLE database the server under test is also using.
// STAGE2B_BASE_URL base URL of the running server (run.cjs starts one and sets this for you).
const {Pool}=require('pg');
const crypto=require('crypto');
const pool=new Pool({connectionString:process.env.STAGE2B_PG_URL});
const BASE=process.env.STAGE2B_BASE_URL||'http://127.0.0.1:5099';

async function api(method,path,{token,body,headers}={}){
  const h={'content-type':'application/json',...(headers||{})};
  if(token)h.authorization='Bearer '+token;
  const r=await fetch(BASE+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text};
}

// Registers a real account through the public API (so password hashing, session issuance
// etc. all go through the real code path, not a hand-crafted DB row) and returns its id/token.
let seq=0;
async function mkAccount(namePrefix){
  seq+=1;
  const tag=Date.now().toString(36).slice(-6)+'-'+seq;
  const phone='9'+String(700000000+Math.floor(Math.random()*90000000)).padStart(9,'0').slice(-9);
  const email=`${namePrefix}.${tag}@example.test`.toLowerCase();
  const r=await api('POST','/api/auth/register',{body:{full_name:`${namePrefix} ${tag}`,email,phone,password:'Str0ng!Pass_'+tag}});
  if((r.status!==200&&r.status!==201)||!r.json||r.json.status!=='success')throw new Error('register failed for '+namePrefix+': '+r.text);
  const row=(await pool.query('SELECT id FROM users WHERE phone=$1',[phone])).rows[0];
  return {id:Number(row.id),phone,email,token:r.json.token};
}

module.exports={pool,api,mkAccount,BASE};

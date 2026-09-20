#!/usr/bin/env node
// K5E real-PostgreSQL regression runner.
//
//   K5E_PG_URL=postgresql://user:pass@localhost:5432/howdi_k5e_scratch node backend/tests/k5e-pg/run.cjs
//
// * K5E_PG_URL must point at a DISPOSABLE database (the suites create members, posts, rooms, sessions, ...).
// * The runner starts backend/server.js against that database on a free port (it creates the schema on boot),
//   runs every NN-*.cjs suite in order against real HTTP + real SQL, prints each suite's PASS/FAIL line and
//   exits non-zero if any suite fails. The server is stopped at the end.
// * Needs the backend's own dependencies (pg, dotenv) to be installed, exactly like running the server.
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs');
const net=require('node:net');
const path=require('node:path');

const PG=process.env.K5E_PG_URL;
if(!PG){console.error('K5E_PG_URL is required (disposable PostgreSQL database).');process.exit(2);}
const freePort=()=>new Promise((ok,bad)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});s.on('error',bad);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,[path.join(__dirname,'../../server.js')],{
    cwd:path.join(__dirname,'../..'),
    env:{...process.env,DATABASE_URL:PG,PORT:String(port),HOST:'127.0.0.1',HOWDI_CONNECT_REF_SECRET:process.env.HOWDI_CONNECT_REF_SECRET||'k5e-pg-e2e-secret'},
    stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
  let up=false;
  for(let i=0;i<120&&!up;i++){
    await sleep(1000);
    if(server.exitCode!==null)break;
    try{up=(await fetch(base+'/api/health')).ok;}catch{}
  }
  if(!up){console.error('server did not start:\n'+log.slice(-3000));server.kill();process.exit(2);}
  let failed=0;
  const suites=fs.readdirSync(__dirname).filter(f=>/^\d\d-.*\.cjs$/.test(f)).sort().filter(f=>!process.env.K5E_ONLY||f.startsWith(process.env.K5E_ONLY));
  for(const f of suites){
    const r=spawnSync(process.execPath,[path.join(__dirname,f)],{env:{...process.env,K5E_BASE_URL:base},encoding:'utf8',timeout:15*60*1000});
    const out=(r.stdout||'')+(r.stderr||'');
    const tail=out.trim().split('\n').slice(-3).join(' | ');
    console.log(`${r.status===0?'PASS':'FAIL'}  ${f}  ${tail}`);
    if(r.status!==0){failed++;console.log(out.split('\n').filter(l=>/FAIL|CRASH|5xx|LEAK/.test(l)).slice(0,30).join('\n'));}
  }
  server.kill();
  process.exit(failed?1:0);
})();

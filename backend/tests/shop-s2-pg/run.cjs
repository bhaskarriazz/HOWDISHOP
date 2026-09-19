#!/usr/bin/env node
// Shop S2 real-PostgreSQL regression runner.
//
//   SHOP_PG_URL=postgresql://user:pass@localhost:5432/howdi_shop_scratch node backend/tests/shop-s2-pg/run.cjs
//
// * SHOP_PG_URL must be a DISPOSABLE database: the suite creates members, vendors, products, sessions, wishlist rows...
// * The runner boots backend/server.js against it on a free port (the server creates the schema itself), runs every
//   NN-*.cjs suite in this folder over real HTTP + real SQL, prints PASS/FAIL per suite and exits non-zero on failure.
// * Needs the backend's own dependencies (pg, dotenv) exactly like running the server.
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs');
const net=require('node:net');
const path=require('node:path');

const PG=process.env.SHOP_PG_URL;
if(!PG){console.error('SHOP_PG_URL is required (disposable PostgreSQL database).');process.exit(2);}
const freePort=()=>new Promise((ok,bad)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});s.on('error',bad);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  const port=await freePort();
  const base=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,[process.env.SHOP_SERVER_FILE||path.join(__dirname,'../../server.js')],{
    cwd:path.join(__dirname,'../..'),
    env:{...process.env,DATABASE_URL:PG,PORT:String(port),HOST:'127.0.0.1'},
    stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
  let up=false;
  for(let i=0;i<120&&!up;i++){
    await sleep(1000);
    if(server.exitCode!==null)break;
    try{up=(await fetch(base+'/api/health')).ok;}catch{}
  }
  if(!up){console.error('server did not start:\n'+log.slice(-3000));server.kill();process.exit(2);}
  await sleep(4000); // let the async schema bootstraps (v16.2 packs, vendor tables) finish
  let failed=0;
  const suites=fs.readdirSync(__dirname).filter(f=>/^\d\d-.*\.cjs$/.test(f)).sort();
  for(const f of suites){
    const r=spawnSync(process.execPath,[path.join(__dirname,f)],{env:{...process.env,SHOP_BASE_URL:base},encoding:'utf8',timeout:10*60*1000});
    const out=(r.stdout||'')+(r.stderr||'');
    const tail=out.trim().split('\n').slice(-2).join(' | ');
    console.log(`${r.status===0?'PASS':'FAIL'}  ${f}  ${tail}`);
    if(r.status!==0){failed++;console.log(out.split('\n').filter(l=>/FAIL|CRASH|Error/.test(l)).slice(0,40).join('\n'));}
  }
  server.kill();
  process.exit(failed?1:0);
})();

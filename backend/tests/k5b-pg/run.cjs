#!/usr/bin/env node
// K5B Global Search Part 1 real-PostgreSQL runner.
//
//   K5B_PG_URL=postgresql://user:pass@host:5432/any_db node backend/tests/k5b-pg/run.cjs
//   + K5B_BROWSER=1 K5B_APP_DIR=<customer vite build> [K5B_PLAYWRIGHT=<playwright module path>] to include suite 05 (Chromium).
//
// K5B_PG_URL only supplies the server + credentials (the role needs CREATEDB). For each NN-*.cjs suite the runner creates a brand-new
// EMPTY scratch database, runs the suite against it (the suites boot the real backend/server.js, which creates every table itself),
// prints the result and drops the scratch database again. Nothing in the database named in K5B_PG_URL is touched.
const {Pool}=require('pg');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.K5B_PG_URL;
if(!base){console.error('K5B_PG_URL is required (a disposable PostgreSQL server; the role needs CREATEDB).');process.exit(2);}
const withDb=(name)=>{const u=new URL(base);u.pathname='/'+name;return u.toString();};
(async()=>{
  const admin=new Pool({connectionString:withDb('postgres')});
  const only=process.env.K5B_ONLY;
  const suites=fs.readdirSync(__dirname).filter((f)=>/^\d\d-.*\.cjs$/.test(f)).sort().filter((f)=>!only||f.startsWith(only));
  // 05 drives a real Chromium against a production customer build: it runs only when K5B_BROWSER=1 and K5B_APP_DIR is set.
  const browserOn=process.env.K5B_BROWSER==='1';
  for(const f of suites.filter((x)=>x.startsWith('05-')&&!browserOn))console.log(`SKIP  ${f}  (set K5B_BROWSER=1 and K5B_APP_DIR=<customer build> to run)`);
  const runList=suites.filter((x)=>browserOn||!x.startsWith('05-'));
  let failed=0;
  for(const f of runList){
    const db=`howdi_k5b_${f.slice(0,2)}_${process.pid}_${Date.now().toString(36)}`;
    await admin.query(`CREATE DATABASE "${db}"`);
    try{
      const child=spawn(process.execPath,[path.join(__dirname,f)],{env:{...process.env,K5B_PG_URL:withDb(db),WORKER_PG_URL:withDb(db)},stdio:['ignore','pipe','pipe']});
      let out='';child.stdout.on('data',(d)=>{out+=d;});child.stderr.on('data',(d)=>{out+=d;});
      const code=await new Promise((ok)=>child.on('close',ok));
      const summary=out.trim().split('\n').slice(-1)[0]||'(no output)';
      if(code!==0){failed++;console.log(`FAIL  ${f}\n${out.trim().split('\n').slice(-40).join('\n')}`);}
      else console.log(`PASS  ${f}  ${summary}`);
    }finally{
      await admin.query(`DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`).catch((e)=>console.log('could not drop '+db+': '+e.message));
    }
  }
  await admin.end();
  process.exit(failed?1:0);
})().catch((e)=>{console.error(e);process.exit(1);});

// Worker Portal payload privacy — real-PostgreSQL suite (GET /api/worker/connect/feed, GET /api/worker/works/debug-lifecycle).
// Skipped unless WORKER_PG_URL points at a DISPOSABLE PostgreSQL database — see backend/tests/worker-pg/01-payload-privacy.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const url=process.env.WORKER_PG_URL;
test('Worker Portal payload-privacy real-PostgreSQL suite (boots the server on the scratch DB)',{skip:url?false:'set WORKER_PG_URL to a disposable PostgreSQL database to run',timeout:15*60*1000},async()=>{
  // async spawn (not spawnSync) so this process stays responsive while the suite drives the real server
  const child=spawn(process.execPath,[path.join(__dirname,'worker-pg/01-payload-privacy.cjs')],{env:process.env,stdio:['ignore','pipe','pipe']});
  let out='';child.stdout.on('data',(d)=>{out+=d;});child.stderr.on('data',(d)=>{out+=d;});
  const code=await new Promise((ok)=>child.on('close',ok));
  process.stdout.write(out);
  assert.equal(code,0,'Worker payload-privacy PG suite failed:\n'+out);
});

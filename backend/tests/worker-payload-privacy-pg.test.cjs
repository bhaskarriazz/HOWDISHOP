// Worker Portal real-PostgreSQL suites (payload privacy, fresh-database boot + every Worker route, deliberate DB errors).
// Skipped unless WORKER_PG_URL points at a disposable PostgreSQL server (the role needs CREATEDB): the runner creates one EMPTY scratch
// database per suite, boots the real backend/server.js against it and drops it again — see backend/tests/worker-pg/run.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const url=process.env.WORKER_PG_URL;
test('Worker Portal real-PostgreSQL suites (empty scratch databases, real server, every /api/worker route)',{skip:url?false:'set WORKER_PG_URL to a disposable PostgreSQL server (role with CREATEDB) to run',timeout:20*60*1000},async()=>{
  // async spawn (not spawnSync) so this process stays responsive while the suites drive the real server
  const child=spawn(process.execPath,[path.join(__dirname,'worker-pg/run.cjs')],{env:process.env,stdio:['ignore','pipe','pipe']});
  let out='';child.stdout.on('data',(d)=>{out+=d;});child.stderr.on('data',(d)=>{out+=d;});
  const code=await new Promise((ok)=>child.on('close',ok));
  process.stdout.write(out);
  assert.equal(code,0,'Worker PG suites failed:\n'+out);
});

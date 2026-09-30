// Stage 2B — real-PostgreSQL regression suites (OTP enumeration/concurrency, notification
// cross-user isolation, legacy numeric route retirement, Connect ownership flags).
// Skipped unless STAGE2B_PG_URL points at a DISPOSABLE PostgreSQL database — see backend/tests/stage2b-pg/run.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=process.env.STAGE2B_PG_URL;
test('Stage 2B real-PostgreSQL suites (starts the server; four scenario suites)',{skip:url?false:'set STAGE2B_PG_URL to a disposable PostgreSQL database to run'},()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'stage2b-pg/run.cjs')],{env:process.env,encoding:'utf8',timeout:15*60*1000});
  process.stdout.write(r.stdout||'');
  assert.equal(r.status,0,'Stage 2B PG suites failed:\n'+(r.stdout||'')+(r.stderr||''));
});

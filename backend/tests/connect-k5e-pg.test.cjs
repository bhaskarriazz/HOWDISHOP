// K5E — real-PostgreSQL attack/regression suites (identity, privacy, membership, block, signalling, payouts, id probing, leak crawl).
// Skipped unless K5E_PG_URL points at a disposable PostgreSQL database — see backend/tests/k5e-pg/run.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=process.env.K5E_PG_URL;
test('K5E real-PostgreSQL suites (starts the server; six scenario/crawl suites)',{skip:url?false:'set K5E_PG_URL to a disposable PostgreSQL database to run'},()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'k5e-pg/run.cjs')],{env:process.env,encoding:'utf8',timeout:30*60*1000});
  process.stdout.write(r.stdout||'');
  assert.equal(r.status,0,'K5E PG suites failed:\n'+(r.stdout||'')+(r.stderr||''));
});

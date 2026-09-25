// K5A Connect Home Phase 1 — real-PostgreSQL suites (guest/visibility, session/spoof/blocks, leak crawl, feed cursor,
// errors/legacy, production cursor-key policy). Skipped unless K5A_PG_URL points at a DISPOSABLE PostgreSQL server —
// see backend/tests/k5a-pg/run.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=process.env.K5A_PG_URL;
test('K5A Connect Home real-PostgreSQL suites (starts the server; six scenario suites)',{skip:url?false:'set K5A_PG_URL to a disposable PostgreSQL server to run'},()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'k5a-pg/run.cjs')],{env:process.env,encoding:'utf8',timeout:20*60*1000});
  process.stdout.write(r.stdout||'');
  assert.equal(r.status,0,'K5A PG suites failed:\n'+(r.stdout||'')+(r.stderr||''));
});

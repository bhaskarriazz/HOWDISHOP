// K5B Global Search Part 1 — real-PostgreSQL suites (FOUND/DTO/private-value scan, visibility + blocks, params/injection/
// spoofing, public-code deep-link safety, and — with K5B_BROWSER=1 — the Chromium JSON/DOM/URL leak scan).
// Skipped unless K5B_PG_URL points at a DISPOSABLE PostgreSQL server — see backend/tests/k5b-pg/run.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=process.env.K5B_PG_URL;
test('K5B Global Search Part 1 real-PostgreSQL suites (starts the server; four scenario suites + optional browser scan)',{skip:url?false:'set K5B_PG_URL to a disposable PostgreSQL server to run'},()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'k5b-pg/run.cjs')],{env:process.env,encoding:'utf8',timeout:20*60*1000});
  process.stdout.write(r.stdout||'');
  assert.equal(r.status,0,'K5B PG suites failed:\n'+(r.stdout||'')+(r.stderr||''));
});

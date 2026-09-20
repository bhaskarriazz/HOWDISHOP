// Learn & Earn — real-PostgreSQL session-route suite, and (optionally) the strict real-browser smoke over the production build.
// Skipped unless LEARN_PG_URL points at a DISPOSABLE PostgreSQL database — see backend/tests/learn-e2e/run.cjs. Set LEARN_BROWSER=1 to add the browser part.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=process.env.LEARN_PG_URL;
test('Learn & Earn e2e (session routes over real PostgreSQL'+(process.env.LEARN_BROWSER?' + strict browser smoke of the production build':'')+')',{skip:url?false:'set LEARN_PG_URL to a disposable PostgreSQL database to run'},()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'learn-e2e/run.cjs')],{env:process.env,encoding:'utf8',timeout:20*60*1000});
  process.stdout.write(r.stdout||'');
  assert.equal(r.status,0,'Learn e2e failed:\n'+(r.stdout||'')+(r.stderr||''));
});

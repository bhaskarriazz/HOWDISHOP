// HPay public-handle fix — real-PostgreSQL suite (new accounts, migrated accounts, collision / no-public-username failure).
// Skipped unless HPAY_PG_URL points at a DISPOSABLE PostgreSQL database — see backend/tests/hpay-pg/01-public-handles.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=process.env.HPAY_PG_URL;
test('HPay public-handle real-PostgreSQL suite (boots the server several times on the scratch DB)',{skip:url?false:'set HPAY_PG_URL to a disposable PostgreSQL database to run'},()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'hpay-pg/01-public-handles.cjs')],{env:process.env,encoding:'utf8',timeout:15*60*1000});
  process.stdout.write(r.stdout||'');
  assert.equal(r.status,0,'HPay public-handle PG suite failed:\n'+(r.stdout||'')+(r.stderr||''));
});

// HPay public handle — hermetic tests of the REAL server.js source (no database needed).
// The runtime behaviour against real PostgreSQL is covered by hpay-pg/01-public-handles.cjs (see hpay-public-handle-pg.test.cjs).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{const i=source.indexOf(a);assert.ok(i>=0,'missing start marker: '+a);const j=source.indexOf(b,i);assert.ok(j>i,'missing end marker: '+b);return source.slice(i,j);};

const cleanSrc=between('    function clean(value, fallback = "") {','\n    }\n')+'\n    }\n';
const helperSrc=between('    function hpayHandleFromUsername(publicUsername) {','    // One-shot, all-or-nothing migration');
const migrationSrc=between('    const HPAY_HANDLE_META_TABLES =','    // =====================================================\n    // HPAY — POSTGRESQL FOUNDATION V1');

// A scripted fake pool: records every statement and answers the account SELECT with the rows the test provides.
function makePool(accountRows,{failOn}={}){
  const log=[];
  const client={
    async query(sql,params){
      const text=String(sql).replace(/\s+/g,' ').trim();
      log.push({text,params});
      if(failOn&&failOn.test(text))throw new Error('boom');
      if(/FROM hpay_accounts a JOIN users u/.test(text))return {rows:accountRows};
      return {rows:[]};
    },
    release(){log.push({text:'RELEASE'});}
  };
  return {pool:{connect:async()=>client},log};
}
function load(pool){
  const logs=[];
  const ctx={pool,console:{log:(...a)=>logs.push(a.join(' ')),error(){}} ,Object,Error,String,Number,Map,Set,Array,JSON,Boolean};
  vm.createContext(ctx);
  vm.runInContext(cleanSrc+helperSrc+migrationSrc+'\nthis.hpayHandleFromUsername=hpayHandleFromUsername;this.hpayLegacyInternalHandle=hpayLegacyInternalHandle;this.hpayHttpError=hpayHttpError;this.migrateHpayLegacyHandles=migrateHpayLegacyHandles;',ctx);
  return {ctx,logs};
}
const row=(id,userId,hpayId,howdi,username)=>({account_id:String(id),user_id:String(userId),hpay_id:hpayId,howdi_id:howdi,public_username:username});
const stmts=(log)=>log.map((x)=>x.text.split(' ').slice(0,2).join(' '));

test('handle helpers: public username -> lowercase safe handle; legacy shape reproduces the old internal-id handle',()=>{
  const {ctx}=load({connect:async()=>({})});
  assert.equal(ctx.hpayHandleFromUsername('Maya.K_1'),'maya.k_1@hpay');
  assert.equal(ctx.hpayHandleFromUsername('  asha-crochet '),'asha-crochet@hpay');
  assert.equal(ctx.hpayHandleFromUsername('a b!c'),'abc@hpay','characters outside [a-z0-9._-] are dropped');
  assert.equal(ctx.hpayHandleFromUsername(''),'');assert.equal(ctx.hpayHandleFromUsername(null),'');assert.equal(ctx.hpayHandleFromUsername('!!!'),'','nothing usable left -> no handle');
  assert.equal(ctx.hpayHandleFromUsername('x'.repeat(200)).length,70+'@hpay'.length);
  assert.equal(ctx.hpayLegacyInternalHandle(7,'HOWDI-AB12'),'howdi-ab12@hpay');
  assert.equal(ctx.hpayLegacyInternalHandle(7,null),'user7@hpay');
  const e=ctx.hpayHttpError(409,'X','msg');assert.equal(e.hpayHttp.status,409);assert.equal(e.hpayHttp.code,'X');assert.equal(e.message,'msg');
});

test('customer resolver: existing account is kept; a new handle comes ONLY from howdi_connect_profiles.public_username, never howdi_id',()=>{
  const i=source.indexOf('const ensureSessionHpayAccount=async(user)=>{');assert.ok(i>0);
  const fn=source.slice(i,source.indexOf('\n            };\n',i)).split('\n').filter(l=>!/^\s*\/\//.test(l)).join('\n'); // code only, comments dropped
  assert.match(fn,/UPDATE hpay_accounts SET updated_at=NOW\(\) WHERE user_id=\$1 RETURNING \*/,'an existing account is returned unchanged');
  assert.match(fn,/SELECT public_username FROM howdi_connect_profiles WHERE user_id=\$1/);
  assert.match(fn,/hpayHandleFromUsername\(profile\?\.public_username\)/);
  assert.doesNotMatch(fn,/howdi_id/,'the internal HOWDI id is not read here');
  assert.doesNotMatch(fn,/user\.public_username/,'users has no public_username column (it lives in howdi_connect_profiles)');
  assert.match(fn,/hpayHttpError\(409,"HPAY_USERNAME_REQUIRED"/);
  assert.match(fn,/error\.code==="23505"\) throw hpayHttpError\(409,"HPAY_ID_UNAVAILABLE"/);
  assert.doesNotMatch(source,/legacyBase/,'the old howdi_id fallback is gone');
});

test('HPay error handler: deliberate 409s pass through, everything else stays a generic 500',()=>{
  const i=source.indexOf('// HPAY_STAGE4B_ERROR_SANITIZATION');const blk=source.slice(i,source.indexOf('return sendJSON(\n              res,\n              500,',i));
  assert.match(blk,/if \(error && error\.hpayHttp\)/);
  assert.match(blk,/Unable to complete the HPay request right now/);
  assert.ok(blk.indexOf('error.hpayHttp')<blk.indexOf('Unable to complete'),'deliberate errors are answered before the generic 500');
});

test('migration runs at the end of ensureHPayTables and is one transaction',()=>{
  assert.match(source,/hpay_risk_status_idx ON hpay_risk_events\(status, severity\);\n      `\);\n      await migrateHpayLegacyHandles\(\);\n    }/);
  assert.match(migrationSrc,/await client\.query\("BEGIN"\)/);assert.match(migrationSrc,/await client\.query\("COMMIT"\)/);assert.match(migrationSrc,/ROLLBACK/);
  assert.match(migrationSrc,/pg_advisory_xact_lock/,'concurrent boots are serialised');
  assert.ok(migrationSrc.indexOf('problems.length')<migrationSrc.indexOf('UPDATE hpay_accounts a SET hpay_id'),'the plan is validated in full BEFORE any write');
});

test('migration: legacy handles become public-username handles, everything else untouched, all inside one transaction',async()=>{
  const {pool,log}=makePool([
    row(1,10,'howdi-aa1@hpay',  'HOWDI-AA1', 'maya_k'),      // legacy -> migrate
    row(2,11,'howdi-bb2@hpay',  'HOWDI-BB2', 'Yara.P'),      // legacy (mixed-case stored) -> migrate
    row(3,12,'custom@hpay',     'HOWDI-CC3', 'carol'),       // not a legacy handle -> untouched
    row(4,13,'asha@hpay',       'HOWDI-DD4', 'asha'),        // already public -> untouched
  ]);
  const {ctx,logs}=load(pool);
  await ctx.migrateHpayLegacyHandles();
  const t=stmts(log);assert.equal(t[0],'BEGIN');assert.equal(t[t.length-2],'COMMIT');assert.equal(t[t.length-1],'RELEASE');
  const upd=log.find((x)=>/^UPDATE hpay_accounts a SET hpay_id/.test(x.text));
  assert.deepEqual(Array.from(upd.params[0]),['1','2']);assert.deepEqual(Array.from(upd.params[1]),['maya_k@hpay','yara.p@hpay']);
  const meta=log.filter((x)=>/^UPDATE hpay_(audit_logs|transactions|status_history) t SET metadata/.test(x.text));
  assert.equal(meta.length,3*5,'3 tables x 5 handle keys');
  assert.ok(meta.every((x)=>Array.from(x.params[0]).join()==='howdi-aa1@hpay,howdi-bb2@hpay'&&Array.from(x.params[1]).join()==='maya_k@hpay,yara.p@hpay'));
  assert.deepEqual(meta.map((x)=>x.params[2]).slice(0,5),['payer_hpay_id','requester_hpay_id','sender_hpay_id','receiver_hpay_id','hpay_id']);
  const audit=log.find((x)=>/^INSERT INTO hpay_audit_logs/.test(x.text));assert.ok(audit,'the migration is audited');assert.doesNotMatch(JSON.stringify(audit),/howdi-aa1|howdi-bb2/i,'the audit row does not repeat the old internal-id handle');
  assert.ok(logs.some((l)=>/2 account\(s\) moved/.test(l)));
});

test('migration: an account without a public username stops startup and NOTHING is written',async()=>{
  for(const blank of [null,'','   ','!!!']){
    const {pool,log}=makePool([row(1,10,'howdi-aa1@hpay','HOWDI-AA1','maya_k'),row(2,11,'howdi-bb2@hpay','HOWDI-BB2',blank)]);
    const {ctx}=load(pool);
    await assert.rejects(()=>ctx.migrateHpayLegacyHandles(),(e)=>/requires operator resolution/.test(e.message)&&/account 2: NO_PUBLIC_USERNAME/.test(e.message)&&!/account 1:/.test(e.message)&&e.code==='23505');
    const t=stmts(log);assert.ok(t.includes('ROLLBACK'),'rolled back');assert.ok(!t.includes('COMMIT'));
    assert.ok(!log.some((x)=>/^(UPDATE|INSERT)/.test(x.text)),'no write of any kind was attempted, so the valid account is not partially migrated (blank='+JSON.stringify(blank)+')');
  }
});

test('migration: a handle collision (with another account, or between two migrated accounts) stops startup with no writes',async()=>{
  let {pool,log}=makePool([row(1,10,'howdi-aa1@hpay','HOWDI-AA1','maya_k'),row(2,11,'MAYA_K@hpay','HOWDI-BB2','other')]);
  let {ctx}=load(pool);
  await assert.rejects(()=>ctx.migrateHpayLegacyHandles(),(e)=>/account 1: HANDLE_COLLISION/.test(e.message)&&/nothing was changed/.test(e.message));
  assert.ok(!log.some((x)=>/^(UPDATE|INSERT)/.test(x.text)),'case-insensitive collision with an existing handle -> no writes');
  ({pool,log}=makePool([row(1,10,'howdi-aa1@hpay','HOWDI-AA1','a.b'),row(2,11,'howdi-bb2@hpay','HOWDI-BB2','a!.b')]));
  ({ctx}=load(pool));
  await assert.rejects(()=>ctx.migrateHpayLegacyHandles(),(e)=>/account 2: HANDLE_COLLISION/.test(e.message));
  assert.ok(!log.some((x)=>/^(UPDATE|INSERT)/.test(x.text)),'two accounts that would sanitise to the same new handle -> no writes');
});

test('migration: idempotent - nothing to do means no writes, and a database error rolls everything back',async()=>{
  let {pool,log}=makePool([row(1,10,'maya_k@hpay','HOWDI-AA1','maya_k'),row(2,11,'user11@hpay',null,'yara')]);
  let {ctx}=load(pool);
  // account 2 IS legacy-shaped (howdi_id null -> user11@hpay) so it migrates; account 1 is already public
  await ctx.migrateHpayLegacyHandles();
  assert.deepEqual(Array.from(log.find((x)=>/^UPDATE hpay_accounts a/.test(x.text)).params[0]),['2']);
  ({pool,log}=makePool([row(1,10,'maya_k@hpay','HOWDI-AA1','maya_k')]));({ctx}=load(pool));
  await ctx.migrateHpayLegacyHandles();
  assert.ok(!log.some((x)=>/^(UPDATE|INSERT)/.test(x.text)),'a second run changes nothing');
  ({pool,log}=makePool([row(1,10,'howdi-aa1@hpay','HOWDI-AA1','maya_k')],{failOn:/SET metadata/}));({ctx}=load(pool));
  await assert.rejects(()=>ctx.migrateHpayLegacyHandles(),/boom/);
  const t=stmts(log);assert.ok(t.includes('ROLLBACK')&&!t.includes('COMMIT'),'a failure part-way rolls the whole migration back');
});

test('a public username that already yields the legacy handle is left alone (no self-collision)',async()=>{
  const {pool,log}=makePool([row(1,10,'howdi-aa1@hpay','HOWDI-AA1','howdi-aa1')]);
  const {ctx}=load(pool);await ctx.migrateHpayLegacyHandles();
  assert.ok(!log.some((x)=>/^(UPDATE|INSERT)/.test(x.text)));
});

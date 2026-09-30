// HPay public-handle fix — real PostgreSQL, real backend/server.js over HTTP, restarted several times.
//   HPAY_PG_URL=postgresql://user:pass@host:5432/disposable_db node backend/tests/hpay-pg/01-public-handles.cjs
// Covers: new-account handles come from howdi_connect_profiles.public_username (never users.howdi_id); the fail-closed
// migration of legacy `<howdi_id>@hpay` accounts (success, no-public-username, collision), with no partial migration.
const L=require('./lib.cjs');
const {pool,api,mkUser,mkAccount,acct,check}=L;
const HPAY_TABLES=['hpay_accounts','hpay_payment_requests','hpay_audit_logs','hpay_transactions','hpay_status_history'];
// how many rows in the HPay tables mention this string anywhere (case-insensitive)?
async function mentions(needle){
  let n=0;
  for(const t of HPAY_TABLES){n+=Number((await pool.query(`SELECT COUNT(*)::int AS n FROM ${t} x WHERE to_jsonb(x)::text ILIKE $1`,['%'+needle+'%'])).rows[0].n);}
  return n;
}
const snapshot=async()=>{
  const o={};for(const t of HPAY_TABLES)o[t]=(await pool.query(`SELECT to_jsonb(x) AS r FROM ${t} x ORDER BY x.id`)).rows.map((r)=>r.r);
  return JSON.stringify(o);
};
const startsOk=async(label)=>{const up=await L.start();check(label,up,L.serverLog().slice(-800));return up;};

(async()=>{
  if(!await startsOk('boot 1: server starts against an empty database'))return L.finish('hpay public handles');

  // ================= 1. NEW ACCOUNTS =================
  const maya=await mkUser('Maya K','Maya_K');                 // mixed-case public username
  const ana=await mkUser('Ana D','Ana.Dev-1');                // dots / dashes survive
  const odd=await mkUser('Odd Name','Odd Name!#');            // characters outside [a-z0-9._-] are removed
  let r=await api('GET','/api/hpay/me',{token:maya.token});
  check('N1 new account: /me -> 200 and hpay_id is <lowercase public_username>@hpay',r.status===200&&r.json.account&&r.json.account.hpay_id==='maya_k@hpay',{status:r.status,acc:r.json&&r.json.account});
  check('N1 the payload never contains the internal HOWDI id, master id or user id',!new RegExp(maya.howdi,'i').test(r.text)&&!/MST-/.test(r.text)&&!/"user_id"|identity_uuid|master_id|howdi_id/.test(r.text),r.text.slice(0,300));
  check('N1 the stored row carries the same handle and no other account got it',(await acct(maya)).hpay_id==='maya_k@hpay'&&Number((await pool.query(`SELECT COUNT(*)::int n FROM hpay_accounts WHERE hpay_id='maya_k@hpay'`)).rows[0].n)===1);
  check('N1 the internal howdi_id appears in NO HPay table',await mentions(maya.howdi)===0,await mentions(maya.howdi));
  r=await api('POST','/api/hpay/accounts',{token:ana.token,body:{user_id:maya.id}});
  check('N2 POST /accounts (session actor; browser user_id ignored) -> 201 with the public handle',r.status===201&&r.json.account.hpay_id==='ana.dev-1@hpay',{status:r.status,text:r.text.slice(0,200)});
  check('N2 POST /accounts payload has no internal HOWDI id',!new RegExp(ana.howdi,'i').test(r.text),r.text.slice(0,200));
  r=await api('GET','/api/hpay/me',{token:odd.token});
  check('N3 characters outside [a-z0-9._-] are stripped from the handle',r.status===200&&r.json.account.hpay_id==='oddname@hpay',{status:r.status,acc:r.json&&r.json.account});
  r=await api('GET','/api/hpay/accounts/user/'+ana.id,{token:ana.token});
  check('N4 GET /accounts/user/:id (own) shows the public handle',r.status===200&&r.json.account.hpay_id==='ana.dev-1@hpay'&&!new RegExp(ana.howdi,'i').test(r.text),r.text.slice(0,200));
  r=await api('GET','/api/hpay/accounts/user/'+maya.id,{token:ana.token});
  check('N4 reading someone else\'s account is still 403',r.status===403,r.status);
  r=await api('GET','/api/hpay/me');check('N4 no session is still 401',r.status===401,r.status);

  // existing accounts keep their handle when the member later changes @username
  await pool.query(`UPDATE howdi_connect_profiles SET public_username='maya_renamed' WHERE user_id=$1`,[maya.id]);
  r=await api('GET','/api/hpay/me',{token:maya.token});
  check('N5 an existing account keeps its handle after a username change',r.status===200&&r.json.account.hpay_id==='maya_k@hpay',r.json&&r.json.account);

  // no public username -> clear 409, NO account row, NO fallback to the internal id
  const noProfile=await mkUser('No Profile',undefined);       // no Connect profile at all
  const blank=await mkUser('Blank Name','');                   // profile row with an empty username
  const junk=await mkUser('Junk Name','!!!');                  // username that sanitises to nothing
  for(const [label,u] of [['no profile row',noProfile],['empty public_username',blank],['username with no usable characters',junk]]){
    r=await api('GET','/api/hpay/me',{token:u.token});
    check(`U1 ${label}: /me -> 409 HPAY_USERNAME_REQUIRED`,r.status===409&&r.json&&r.json.code==='HPAY_USERNAME_REQUIRED'&&/@username/.test(r.json.message||''),{status:r.status,text:r.text.slice(0,200)});
    check(`U1 ${label}: the response leaks neither the internal id nor SQL`,!new RegExp(u.howdi,'i').test(r.text)&&!/relation|column|violates|hpay_accounts/i.test(r.text),r.text);
    check(`U1 ${label}: no HPay account row was created`,(await acct(u))===null);
    r=await api('POST','/api/hpay/accounts',{token:u.token,body:{}});
    check(`U1 ${label}: POST /accounts -> 409 as well, still no row`,r.status===409&&(await acct(u))===null,{status:r.status,text:r.text.slice(0,160)});
    check(`U1 ${label}: the internal howdi_id was never written to HPay`,await mentions(u.howdi)===0);
  }
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username) VALUES($1,'now_named') ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`,[noProfile.id]);
  r=await api('GET','/api/hpay/me',{token:noProfile.token});
  check('U2 after the member sets an @username the account activates with that handle',r.status===200&&r.json.account.hpay_id==='now_named@hpay',{status:r.status,text:r.text.slice(0,160)});
  r=await api('POST','/api/hpay/requests',{token:junk.token,body:{amount:10}});
  check('U3 creating a payment request without a public username -> 409 (no account, no internal-id fallback)',r.status===409&&r.json.code==='HPAY_USERNAME_REQUIRED'&&(await acct(junk))===null,{status:r.status,text:r.text.slice(0,160)});

  // handle already held by someone else -> clear 409, nothing created, no SQL text
  const holder=await mkUser('Holder','holder_user');
  await mkAccount(holder,'Taken.Handle@hpay');
  const wanter=await mkUser('Wanter','taken.handle');
  r=await api('GET','/api/hpay/me',{token:wanter.token});
  check('X1 handle held by another account (case-insensitively) -> 409 HPAY_ID_UNAVAILABLE',r.status===409&&r.json.code==='HPAY_ID_UNAVAILABLE',{status:r.status,text:r.text.slice(0,200)});
  check('X1 the 409 carries no SQL / constraint text and no internal id',!/duplicate|unique|constraint|violates|hpay_accounts/i.test(r.text)&&!new RegExp(wanter.howdi,'i').test(r.text),r.text);
  check('X1 no account row was created for the second member, the holder is untouched',(await acct(wanter))===null&&(await acct(holder)).hpay_id==='Taken.Handle@hpay');

  // existing HPay API security checks still hold
  r=await api('POST','/api/hpay/requests',{token:maya.token,body:{amount:-5}});check('S1 negative amount still -> 400',r.status===400,r.text.slice(0,120));
  r=await api('POST','/api/hpay/requests',{token:maya.token,body:{amount:20,payer_hpay_id:'maya_k@hpay'}});check('S1 requesting money from yourself still -> 400',r.status===400,r.text.slice(0,120));
  r=await api('POST','/api/hpay/requests',{token:maya.token,body:{amount:20,payer_hpay_id:'nobody@hpay'}});check('S1 unknown payer still -> 404 uniform',r.status===404&&/Unable to create a request/.test(r.text),r.text.slice(0,120));
  r=await api('POST','/api/hpay/requests',{token:maya.token,body:{amount:20,payer_hpay_id:'ANA.DEV-1@HPAY',requester_account_id:Number((await acct(ana)).id)}});
  check('S1 valid request (payer matched case-insensitively; browser requester id ignored) -> 201',r.status===201&&r.json.request.payer_hpay_id==='ana.dev-1@hpay',r.text.slice(0,200));
  const req1=(await pool.query(`SELECT requester_account_id FROM hpay_payment_requests WHERE request_id=$1`,[r.json.request.request_id])).rows[0];
  check('S1 the stored requester is the SESSION account',Number(req1.requester_account_id)===Number((await acct(maya)).id),req1);

  // ================= 2. MIGRATION: success =================
  await L.stop();
  const tag=Date.now().toString(36);
  const L1=await mkUser('Legacy One','Legacy_One'),L2=await mkUser('Legacy Two','legacy.two');
  const P=await mkUser('Pub User','pub_user'),Cu=await mkUser('Custom Pay','cust_user');
  const same=await mkUser('Same Name','same-'+tag,{howdi:'SAME-'+tag});      // public username already yields the legacy handle
  const a1=await mkAccount(L1,L1.legacy),a2=await mkAccount(L2,L2.legacy),aP=await mkAccount(P,'pub_user@hpay');
  const aC=await mkAccount(Cu,'custom.pay@hpay'),aS=await mkAccount(same,same.legacy);
  const old1=L1.legacy,old2=L2.legacy;
  check('M0 fixture: legacy handles are the pre-fix shape (lowercased internal id + @hpay)',old1===L1.howdi.toLowerCase()+'@hpay',old1);
  const rq=async(id,from,to,note)=>pool.query(`INSERT INTO hpay_payment_requests(request_id,requester_account_id,payer_account_id,amount,note) VALUES($1,$2,$3,50,$4)`,[id,from,to,note]);
  await rq('REQ-MIG-1',a1,aP,'from legacy one');await rq('REQ-MIG-2',aP,a2,'to legacy two');
  const tx=(await pool.query(`INSERT INTO hpay_transactions(transaction_id,transaction_type,sender_account_id,receiver_account_id,amount,metadata) VALUES('TX-MIG-1','TRANSFER',$1,$2,10,$3::jsonb) RETURNING id`,
    [a1,aP,JSON.stringify({payer_hpay_id:old1.toUpperCase(),requester_hpay_id:old2,sender_hpay_id:old1,receiver_hpay_id:'pub_user@hpay',keep:'unrelated',note:'plain text'})])).rows[0].id;
  await pool.query(`INSERT INTO hpay_status_history(transaction_id,new_status,metadata) VALUES($1,'COMPLETED',$2::jsonb)`,[tx,JSON.stringify({receiver_hpay_id:old1,hpay_id:old2})]);
  await pool.query(`INSERT INTO hpay_audit_logs(actor_type,action,entity_type,entity_id,metadata) VALUES
    ('CUSTOMER','HPAY_REQUEST_CREATED','HPAY_REQUEST','REQ-MIG-1',$1::jsonb),('CUSTOMER','HPAY_REQUEST_CREATED','HPAY_REQUEST','REQ-MIG-2',$2::jsonb),
    ('SYSTEM','SOMETHING_ELSE','X','1',$3::jsonb),('SYSTEM','NO_METADATA','X','2','null'::jsonb),('SYSTEM','ARRAY_METADATA','X','3','[1,2]'::jsonb)`,
    [JSON.stringify({amount:50,payer_hpay_id:'pub_user@hpay'}),JSON.stringify({amount:50,payer_hpay_id:old2}),JSON.stringify({payer_hpay_id:'custom.pay@hpay',n:1})]);
  check('M0 fixture: the old handles are stored in accounts, transactions, status history and audit rows',await mentions(old1)>=3&&await mentions(old2)>=3,{o1:await mentions(old1),o2:await mentions(old2)});
  const untouchedBefore=(await pool.query(`SELECT id,hpay_id FROM hpay_accounts WHERE id=ANY($1) ORDER BY id`,[[aP,aC,aS]])).rows;
  const holderRow=await acct(holder);
  if(!await startsOk('boot 2: the server starts and runs the migration'))return L.finish('hpay public handles');
  const now=async(id)=>(await pool.query(`SELECT hpay_id FROM hpay_accounts WHERE id=$1`,[id])).rows[0].hpay_id;
  check('M1 legacy account 1 -> legacy_one@hpay (lowercase public username)',await now(a1)==='legacy_one@hpay',await now(a1));
  check('M1 legacy account 2 -> legacy.two@hpay',await now(a2)==='legacy.two@hpay',await now(a2));
  check('M2 accounts that were not legacy-shaped are untouched (public handle, custom handle, already-equal handle)',
    JSON.stringify((await pool.query(`SELECT id,hpay_id FROM hpay_accounts WHERE id=ANY($1) ORDER BY id`,[[aP,aC,aS]])).rows)===JSON.stringify(untouchedBefore),untouchedBefore);
  check('M2 accounts created by the new-account tests are untouched',(await acct(maya)).hpay_id==='maya_k@hpay'&&(await acct(holder)).hpay_id===holderRow.hpay_id);
  check('M3 NO HPay table mentions either old internal-id handle any more',await mentions(old1)===0&&await mentions(old2)===0,{o1:await mentions(old1),o2:await mentions(old2)});
  check('M3 the internal howdi ids are absent from every HPay table',await mentions(L1.howdi)===0&&await mentions(L2.howdi)===0);
  const meta=(await pool.query(`SELECT metadata FROM hpay_transactions WHERE transaction_id='TX-MIG-1'`)).rows[0].metadata;
  check('M4 transaction display fields rewritten, everything else kept',meta.payer_hpay_id==='legacy_one@hpay'&&meta.requester_hpay_id==='legacy.two@hpay'&&meta.sender_hpay_id==='legacy_one@hpay'&&meta.receiver_hpay_id==='pub_user@hpay'&&meta.keep==='unrelated'&&meta.note==='plain text',meta);
  const sh=(await pool.query(`SELECT metadata FROM hpay_status_history WHERE transaction_id=$1`,[tx])).rows[0].metadata;
  check('M4 status-history display fields rewritten',sh.receiver_hpay_id==='legacy_one@hpay'&&sh.hpay_id==='legacy.two@hpay',sh);
  const au=(await pool.query(`SELECT entity_id,metadata FROM hpay_audit_logs WHERE action IN ('HPAY_REQUEST_CREATED','SOMETHING_ELSE') ORDER BY entity_id`)).rows;
  const au1=au.find((x)=>x.entity_id==='REQ-MIG-1'),au2=au.find((x)=>x.entity_id==='REQ-MIG-2'),au3=au.find((x)=>x.entity_id==='1');
  check('M4 audit metadata: old handle replaced, other handles and fields untouched',au1&&au1.metadata.payer_hpay_id==='pub_user@hpay'&&au2&&au2.metadata.payer_hpay_id==='legacy.two@hpay'&&au2.metadata.amount===50&&au3&&au3.metadata.payer_hpay_id==='custom.pay@hpay',au);
  check('M4 audit rows with scalar-null / array metadata survived the rewrite',Number((await pool.query(`SELECT COUNT(*)::int n FROM hpay_audit_logs WHERE action IN ('NO_METADATA','ARRAY_METADATA')`)).rows[0].n)===2);
  const mig=(await pool.query(`SELECT entity_id,metadata,actor_type FROM hpay_audit_logs WHERE action='HPAY_HANDLE_MIGRATED' ORDER BY entity_id`)).rows;
  check('M5 exactly one HPAY_HANDLE_MIGRATED audit row per migrated account, and none mention a handle',mig.length===2&&mig.map((x)=>x.entity_id).sort().join()===[String(a1),String(a2)].sort().join()&&mig.every((x)=>x.actor_type==='SYSTEM'&&JSON.stringify(x.metadata)==='{"reason":"public_username_handle"}'),mig);
  check('M5 the server log reports the migration',/HPay public-handle migration: 2 account\(s\)/.test(L.serverLog()),L.serverLog().slice(-400));
  r=await api('GET','/api/hpay/me',{token:L1.token});
  check('M6 migrated member: /me shows the new handle',r.status===200&&r.json.account.hpay_id==='legacy_one@hpay',r.text.slice(0,200));
  check('M6 migrated member: no old handle and no internal id anywhere in the payload',!new RegExp(old1,'i').test(r.text)&&!new RegExp(L1.howdi,'i').test(r.text)&&!/master_id|identity_uuid/.test(r.text),r.text.slice(0,300));
  const outgoing=(r.json.requests||[]).find((x)=>x.request_id==='REQ-MIG-1');
  check('M6 the migrated member\'s request shows the counterparty by public handle',outgoing&&outgoing.payer_hpay_id==='pub_user@hpay',outgoing);
  r=await api('GET','/api/hpay/me',{token:P.token});
  const asPayer=(r.json.requests||[]).find((x)=>x.request_id==='REQ-MIG-1'),asRequester=(r.json.requests||[]).find((x)=>x.request_id==='REQ-MIG-2');
  check('M6 the counterparty sees the migrated handle, never the old one',r.status===200&&!new RegExp(old1+'|'+old2,'i').test(r.text)&&JSON.stringify(r.json.requests||[]).includes('legacy_one@hpay')&&JSON.stringify(r.json.requests||[]).includes('legacy.two@hpay'),{asPayer,asRequester});
  r=await api('POST','/api/hpay/requests',{token:P.token,body:{amount:5,payer_hpay_id:old1}});
  check('M7 the OLD handle no longer resolves as a payer',r.status===404,{status:r.status,text:r.text.slice(0,120)});
  r=await api('POST','/api/hpay/requests',{token:P.token,body:{amount:5,payer_hpay_id:'LEGACY_ONE@hpay'}});
  check('M7 the NEW handle resolves (case-insensitively)',r.status===201&&r.json.request.payer_hpay_id==='legacy_one@hpay',r.text.slice(0,160));
  // idempotent restart
  await L.stop();
  const snap=await snapshot();
  if(!await startsOk('boot 3: restart with nothing left to migrate'))return L.finish('hpay public handles');
  check('M8 idempotent: a second boot changes nothing (no rows, no new audit entries)',await snapshot()===snap&&!/HPay public-handle migration:/.test(L.serverLog()));

  // ================= 3. MIGRATION: no public username -> fail closed, no partial migration =================
  await L.stop();
  const N3=await mkUser('No Username','pending_three'),N4=await mkUser('Has Username','legacy_four');
  await pool.query(`UPDATE howdi_connect_profiles SET public_username=NULL WHERE user_id=$1`,[N3.id]);   // legacy account whose owner has no public @username
  const a3=await mkAccount(N3,N3.legacy),a4=await mkAccount(N4,N4.legacy);
  const noProf=await mkUser('Never Connected',undefined);const a5=await mkAccount(noProf,noProf.legacy);   // legacy account with no Connect profile at all
  await pool.query(`INSERT INTO hpay_audit_logs(actor_type,action,entity_type,entity_id,metadata) VALUES('CUSTOMER','HPAY_REQUEST_CREATED','HPAY_REQUEST','REQ-NOUSER',$1::jsonb)`,[JSON.stringify({payer_hpay_id:N4.legacy})]);
  const before=await snapshot();
  const up=await L.start();
  check('F1 boot 4: the server does NOT start while an account has no public username',!up,'server reported healthy');
  check('F1 the server process exited (it is not left half-configured)',L.serverExited()===true);
  const log=L.serverLog();
  check('F1 the log names the problem, the accounts and the operator action',/requires operator resolution/.test(log)&&new RegExp(`account ${a3}: NO_PUBLIC_USERNAME`).test(log)&&new RegExp(`account ${a5}: NO_PUBLIC_USERNAME`).test(log)&&/nothing was changed/.test(log)&&/public @username/.test(log),log.slice(-900));
  check('F1 the log does not print any handle or internal id',!new RegExp(N3.howdi+'|'+N4.howdi,'i').test(log),log.slice(-900));
  await L.stop();
  check('F2 NO partial migration: every HPay table is byte-for-byte unchanged (the valid account was not renamed either)',await snapshot()===before);
  check('F2 the legacy account with a valid username is still on its old handle',await now(a4)===N4.legacy,await now(a4));
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username) VALUES($1,'named_five') ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`,[noProf.id]);
  await pool.query(`UPDATE howdi_connect_profiles SET public_username='named_three' WHERE user_id=$1`,[N3.id]);
  if(await startsOk('F3 after the operator gives every member an @username the server starts')){
    check('F3 all three accounts migrated together',await now(a3)==='named_three@hpay'&&await now(a4)==='legacy_four@hpay'&&await now(a5)==='named_five@hpay',[await now(a3),await now(a4),await now(a5)]);
    check('F3 the audit metadata copy of the old handle was rewritten with them',await mentions(N4.legacy)===0&&(await pool.query(`SELECT metadata FROM hpay_audit_logs WHERE entity_id='REQ-NOUSER'`)).rows[0].metadata.payer_hpay_id==='legacy_four@hpay');
  }

  // ================= 4. MIGRATION: handle collision -> fail closed =================
  await L.stop();
  const C1=await mkUser('Collide One','taken_five_x'),C2=await mkUser('Fine Two','fine_two_y'),Q=await mkUser('Owner Q','owner_q');
  const c1=await mkAccount(C1,C1.legacy),c2=await mkAccount(C2,C2.legacy),q=await mkAccount(Q,'Taken_Five_X@hpay');   // someone else already owns the target handle (different case)
  const before2=await snapshot();
  check('C0 fixture: the target handle is held by another account',(await pool.query(`SELECT COUNT(*)::int n FROM hpay_accounts WHERE lower(hpay_id)='taken_five_x@hpay'`)).rows[0].n===1);
  const up2=await L.start();
  check('C1 boot: the server does NOT start when a new handle would collide',!up2&&L.serverExited(),L.serverLog().slice(-500));
  check('C1 the log reports HANDLE_COLLISION for the account and says nothing was changed',new RegExp(`account ${c1}: HANDLE_COLLISION`).test(L.serverLog())&&/nothing was changed/.test(L.serverLog()),L.serverLog().slice(-700));
  await L.stop();
  check('C2 NO partial migration and NO silent rename: the colliding account, the owner AND the collision-free account are all unchanged',await snapshot()===before2&&await now(c1)===C1.legacy&&await now(c2)===C2.legacy&&await now(q)==='Taken_Five_X@hpay');
  await pool.query(`UPDATE hpay_accounts SET hpay_id='owner_q@hpay' WHERE id=$1`,[q]);         // operator resolves the collision
  if(await startsOk('C3 after the operator resolves the collision the server starts')){
    check('C3 both pending accounts migrated together',await now(c1)==='taken_five_x@hpay'&&await now(c2)==='fine_two_y@hpay',[await now(c1),await now(c2)]);
    check('C3 no account holds a case-insensitively duplicate handle',(await pool.query(`SELECT COUNT(*)::int n FROM (SELECT lower(hpay_id) FROM hpay_accounts GROUP BY 1 HAVING COUNT(*)>1) d`)).rows[0].n===0);
  }
  await L.finish('hpay public handles (real PostgreSQL)');
})().catch(async(e)=>{console.log('CRASH',e&&e.stack||e);await L.stop();process.exit(1);});

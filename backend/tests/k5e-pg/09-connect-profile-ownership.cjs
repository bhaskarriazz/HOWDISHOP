// K5E scenario suite: PUT /api/connect/profile/:id ownership enforcement (real HTTP + real PostgreSQL).
//
// This route writes exclusively to the caller's own row — a foreign :id can never corrupt another
// account's profile — but until this fix it silently IGNORED a foreign :id and answered 200 by
// quietly editing the caller's own profile instead of rejecting the mismatched request. That let a
// client bug (or a probe) get a 200 while believing it had edited someone else's profile, and made
// "PUT foreign profile 403" a real, provably wrong assertion (independent verification confirmed the
// exact same failure at the original, pre-fix commit). The fix: any numeric path id that resolves
// (through the existing k5eConnectGuard rewrite) to something other than the caller's own id is now
// rejected with 403 before any query runs. This suite pins that down permanently, at both the HTTP
// and the database level.
const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;const failures=[];
function ok(c,m){if(c)pass++;else{fail++;failures.push(m);console.log('  FAIL',m);}}
const S=(r)=>r.status;
(async()=>{
  const tag=Date.now().toString(36).slice(-5)+Math.floor(Math.random()*1000);
  const A=await mkUser('Owner Alice','profown_alice_'+tag,'HWD-PA'+tag);
  const B=await mkUser('Owner Bob','profown_bob_'+tag,'HWD-PB'+tag);
  const t=(u)=>({token:u.token});
  const headlineOf=async(userId)=>(await pool.query('SELECT headline FROM howdi_connect_profiles WHERE user_id=$1',[userId])).rows[0]?.headline;

  await pool.query('UPDATE howdi_connect_profiles SET headline=$2 WHERE user_id=$1',[A.id,'alice original']);
  await pool.query('UPDATE howdi_connect_profiles SET headline=$2 WHERE user_id=$1',[B.id,'bob original']);

  // ---- no session at all -> 401, no write
  let r=await api('PUT','/api/connect/profile/'+A.id,{body:{headline:'no session pwn'}});
  ok(S(r)===401,'PUT profile without a session -> 401 (got '+S(r)+')');
  ok(await headlineOf(A.id)==='alice original','no-session request made no data change to A');

  // ---- own profile, numeric path id -> 200, and the write actually persists
  r=await api('PUT','/api/connect/profile/'+A.id,{...t(A),body:{headline:'alice updated via own numeric id'}});
  ok(S(r)===200&&r.json.status==='success','PUT own profile (numeric id) -> 200 (got '+S(r)+')');
  ok(await headlineOf(A.id)==='alice updated via own numeric id','own-profile update via numeric id actually persisted');

  // ---- own profile, /me path -> 200, and the write actually persists
  r=await api('PUT','/api/connect/profile/me',{...t(A),body:{headline:'alice updated via me'}});
  ok(S(r)===200&&r.json.status==='success','PUT own profile (/me) -> 200 (got '+S(r)+')');
  ok(await headlineOf(A.id)==='alice updated via me','own-profile update via /me actually persisted');

  // ---- foreign profile: A targeting B's numeric id -> 403, and NEITHER row is touched
  const aBefore=await headlineOf(A.id), bBefore=await headlineOf(B.id);
  r=await api('PUT','/api/connect/profile/'+B.id,{...t(A),body:{headline:'pwned by alice'}});
  ok(S(r)===403,'PUT foreign profile (A -> B\'s numeric id) -> 403 (got '+S(r)+')');
  ok(await headlineOf(B.id)===bBefore,'foreign-id request left B\'s profile completely unchanged');
  ok(await headlineOf(A.id)===aBefore,'a rejected foreign-id request does NOT fall back to silently editing the caller\'s own profile');

  // ---- foreign profile the other direction (B -> A), same guarantees
  const aBefore2=await headlineOf(A.id), bBefore2=await headlineOf(B.id);
  r=await api('PUT','/api/connect/profile/'+A.id,{...t(B),body:{headline:'pwned by bob'}});
  ok(S(r)===403,'PUT foreign profile (B -> A\'s numeric id) -> 403 (got '+S(r)+')');
  ok(await headlineOf(A.id)===aBefore2,'foreign-id request left A\'s profile completely unchanged (reverse direction)');
  ok(await headlineOf(B.id)===bBefore2,'a rejected foreign-id request does NOT fall back to silently editing the caller\'s own profile (reverse direction)');

  // ---- a raw foreign id of an account that does not exist at all behaves the same (403, no crash)
  r=await api('PUT','/api/connect/profile/999999999',{...t(A),body:{headline:'ghost'}});
  ok(S(r)===403,'PUT profile with a nonexistent foreign numeric id -> 403, not a 500 (got '+S(r)+')');
  ok(await headlineOf(A.id)===aBefore2,'nonexistent-foreign-id request left A\'s own profile unchanged too');

  // ---- adversarial spellings of a foreign reference must all fail closed before a write.
  // URL.pathname intentionally keeps percent escapes, so exercise both the guard's canonical
  // numeric handling and the route's explicit non-canonical-reference rejection.
  const encodedForeignId=[...String(B.id)].map((digit)=>'%'+digit.charCodeAt(0).toString(16)).join('');
  const foreignCases=[
    {label:'URL-encoded foreign digits',path:'/api/connect/profile/'+encodedForeignId},
    {label:'leading-zero foreign id',path:'/api/connect/profile/00'+B.id},
    {label:'foreign id with trailing slash',path:'/api/connect/profile/'+B.id+'/'},
    {label:'foreign id with query string',path:'/api/connect/profile/'+B.id+'?source=profile-test'},
    {label:'foreign public username reference',path:'/api/connect/profile/@'+B.username},
  ];
  for(const probe of foreignCases){
    const ownBefore=await headlineOf(A.id), foreignBefore=await headlineOf(B.id);
    r=await api('PUT',probe.path,{...t(A),body:{headline:'probe '+probe.label}});
    ok(S(r)===403,'PUT profile with '+probe.label+' -> 403 (got '+S(r)+')');
    ok(await headlineOf(A.id)===ownBefore,probe.label+' did not fall back to change caller profile');
    ok(await headlineOf(B.id)===foreignBefore,probe.label+' left foreign profile unchanged');
  }

  // Actor fields in the body are never authorization inputs.  Supplying B's id cannot change
  // ownership: the K5E request normalizer derives the actor from A's session and this path remains
  // foreign, so it must reject before any write.
  const bodyOwnBefore=await headlineOf(A.id), bodyForeignBefore=await headlineOf(B.id);
  r=await api('PUT','/api/connect/profile/'+B.id,{...t(A),body:{headline:'body spoof',userId:B.id,user_id:B.id,ownerId:B.id}});
  ok(S(r)===403,'PUT foreign profile with spoofed body actor ids -> 403 (got '+S(r)+')');
  ok(await headlineOf(A.id)===bodyOwnBefore,'spoofed body actor ids did not change caller profile');
  ok(await headlineOf(B.id)===bodyForeignBefore,'spoofed body actor ids did not change foreign profile');

  // The same hostile body on the legitimate /me endpoint must still update only the session owner.
  r=await api('PUT','/api/connect/profile/me',{...t(A),body:{headline:'alice session-owned despite body spoof',userId:B.id,user_id:B.id,ownerId:B.id}});
  ok(S(r)===200,'PUT /me with spoofed body actor ids still succeeds for the session owner (got '+S(r)+')');
  ok(await headlineOf(A.id)==='alice session-owned despite body spoof','/me with spoofed body actor ids updates only A');
  ok(await headlineOf(B.id)===bodyForeignBefore,'/me with spoofed body actor ids never changes B');

  console.log(`PASS ${pass}  FAIL ${fail}`);
  await pool.end();
  process.exit(fail?1:0);
})().catch((e)=>{console.error('CRASH',e);process.exit(1);});

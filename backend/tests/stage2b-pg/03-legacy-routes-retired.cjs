// Stage 2B requirement #2: the three named legacy numeric own-account routes must not be
// reachable as a fallback in any form — they return a fixed deprecation response, never data,
// whether the caller asks for their own numeric id or someone else's.
const {mkAccount,api}=require('./lib.cjs');
let pass=0,fail=0;const failures=[];
function ok(c,m){if(c)pass++;else{fail++;failures.push(m);console.log('  FAIL',m);}}

(async()=>{
  const alice=await mkAccount('Alice');
  const bob=await mkAccount('Bob');

  const legacyRoutes=[
    {method:'GET',path:(id)=>`/api/preferences/${id}`,replacement:'/api/preferences/me'},
    {method:'GET',path:(id)=>`/api/wallet/${id}`,replacement:'/api/wallet/user/me'},
    {method:'GET',path:(id)=>`/api/referrals/profile/${id}`,replacement:'/api/referrals/profile/me'},
  ];

  for(const route of legacyRoutes){
    // Own numeric id, signed in: still retired, never returns data.
    const rOwn=await api(route.method,route.path(alice.id),{token:alice.token});
    ok(rOwn.status===410,`${route.path(':id')} with own id is 410, not 200 with data (got ${rOwn.status})`);
    ok(rOwn.json&&rOwn.json.code==='ENDPOINT_RETIRED','response carries the ENDPOINT_RETIRED code, not a data payload: '+rOwn.text);
    ok(rOwn.json&&rOwn.json.message&&rOwn.json.message.includes(route.replacement),'the retirement message points at '+route.replacement);
    ok(!('preferences' in (rOwn.json||{}))&&!('wallet' in (rOwn.json||{}))&&!('referral' in (rOwn.json||{})),'no data field leaks through the retired route');

    // Someone else's numeric id: still 410, and byte-identical to the own-id response — never a
    // different error that would itself distinguish "this id exists" from "it doesn't" (no id-probing oracle).
    const rOther=await api(route.method,route.path(bob.id),{token:alice.token});
    ok(rOther.status===410,`${route.path(':id')} with someone else's id is also 410 (got ${rOther.status})`);
    ok(rOther.text===rOwn.text,'the retirement response is byte-identical regardless of whose id was in the URL');

    // Signed out entirely: still 410 (retirement happens before any auth check), never a 401 that
    // would let a caller distinguish "retired" from "would have needed login".
    const rAnon=await api(route.method,route.path(alice.id));
    ok(rAnon.status===410,`${route.path(':id')} retirement applies even to a signed-out caller (got ${rAnon.status})`);
  }

  // --- And the replacements actually work end-to-end (the retirement isn't hiding a broken feature).
  const rMePrefs=await api('GET','/api/preferences/me',{token:alice.token});
  ok(rMePrefs.status===200&&rMePrefs.json.status==='success','/api/preferences/me works for a signed-in customer');
  const rMeWallet=await api('GET','/api/wallet/user/me',{token:alice.token});
  ok(rMeWallet.status===200&&rMeWallet.json.status==='success','/api/wallet/user/me works for a signed-in customer');
  const rMeReferrals=await api('GET','/api/referrals/profile/me',{token:alice.token});
  ok(rMeReferrals.status===200&&rMeReferrals.json.status==='success','/api/referrals/profile/me works for a signed-in customer');

  console.log(`legacy-routes-retired: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();

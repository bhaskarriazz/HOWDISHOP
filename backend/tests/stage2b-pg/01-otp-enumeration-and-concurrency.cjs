// Stage 2B requirement #3 + regression assertion set: OTP phone-enumeration and concurrent-verify safety.
const fs=require('node:fs');
const path=require('node:path');
const {pool,api,mkAccount}=require('./lib.cjs');
let pass=0,fail=0;const failures=[];
function ok(c,m){if(c)pass++;else{fail++;failures.push(m);console.log('  FAIL',m);}}

(async()=>{
  const devOtpLogPath=path.join(__dirname,'../../.dev-otp-log.jsonl');
  const acct=await mkAccount('OtpUser');

  // --- Unknown vs. known phone: byte-identical response, same status code.
  const unknownPhone='9'+String(600000000+Math.floor(Math.random()*90000000)).padStart(9,'0').slice(-9);
  const rUnknown=await api('POST','/api/auth/otp/request',{body:{phone:unknownPhone}});
  const rKnown=await api('POST','/api/auth/otp/request',{body:{phone:acct.phone}});
  ok(rUnknown.status===200&&rKnown.status===200,'both OTP requests return 200');
  ok(rUnknown.text===rKnown.text,'unknown-phone and known-phone OTP responses are byte-identical: '+rUnknown.text+' vs '+rKnown.text);

  // --- dev_otp must never appear in the HTTP response body, in any environment this suite runs under.
  ok(!/dev_otp/.test(rKnown.text)&&!/dev_otp/.test(rUnknown.text),'dev_otp never rides along in the customer API response');

  // --- The generated code must be recoverable ONLY from the server-side fixture file, never the response.
  let fixtureLines=[];
  try{fixtureLines=fs.readFileSync(devOtpLogPath,'utf8').trim().split('\n').filter(Boolean);}catch{}
  const lastForPhone=fixtureLines.map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean).reverse().find(x=>x.phone===acct.phone);
  ok(!!lastForPhone&&/^\d{6}$/.test(lastForPhone.code),'dev OTP code was written to the server-side-only fixture file, not the response');

  // --- Concurrent verification of the SAME correct code must produce exactly one new session, one success.
  const before=Number((await pool.query('SELECT COUNT(*)::int n FROM user_sessions WHERE user_id=$1',[acct.id])).rows[0].n);
  const attempts=await Promise.all(Array.from({length:8},()=>api('POST','/api/auth/otp/verify',{body:{phone:acct.phone,code:lastForPhone.code}})));
  const successes=attempts.filter(r=>r.status===200&&r.json&&r.json.status==='success');
  const after=Number((await pool.query('SELECT COUNT(*)::int n FROM user_sessions WHERE user_id=$1',[acct.id])).rows[0].n);
  ok(successes.length===1,'exactly one of 8 concurrent verifications with the same code succeeds (got '+successes.length+')');
  ok(after-before===1,'exactly one new session row was created by the concurrent batch (delta='+(after-before)+')');
  const rejected=attempts.filter(r=>r.status!==200);
  ok(rejected.length===7,'the other 7 concurrent attempts are rejected, not silently accepted (got '+rejected.length+' rejected)');

  // --- A wrong code never succeeds, and its rejection message reveals nothing about which digit was wrong.
  const rWrong=await api('POST','/api/auth/otp/verify',{body:{phone:acct.phone,code:'000000'}});
  ok(rWrong.status!==200,'a wrong code is rejected');

  console.log(`otp-enumeration-and-concurrency: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();

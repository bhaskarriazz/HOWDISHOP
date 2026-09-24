// Stage 2B requirement #1 (Task 120): is_mine/is_mentor ownership flags replace the client-side
// Number(x.foo_user_id)===Number(currentUser.id) comparison that broke once auth responses stopped
// returning a raw numeric id. Also checks the pre-existing k5eConnectReplacer guarantee these flags
// rely on: another member's *_user_id never appears raw in a Connect response.
const {mkAccount,api}=require('./lib.cjs');
let pass=0,fail=0;const failures=[];
function ok(c,m){if(c)pass++;else{fail++;failures.push(m);console.log('  FAIL',m);}}

(async()=>{
  const mentor=await mkAccount('Mentor');
  const learner=await mkAccount('Learner');
  const future=new Date(Date.now()+24*60*60*1000).toISOString();

  // --- Office hours: the mentor's own listing is is_mine=true with the raw id; everyone else's
  // is is_mine=false with an opaque reference, never the mentor's real numeric id.
  const rCreate=await api('POST','/api/connect/office-hours',{token:mentor.token,body:{knowledgeDomain:'EDUCATION',title:'Stage2B regression slot',startsAt:future,capacity:2,durationMinutes:30,locationType:'ONLINE'}});
  ok(rCreate.status===201&&rCreate.json.status==='success','mentor can publish office hours (201)');

  const rOwn=await api('GET','/api/connect/office-hours?domain=EDUCATION',{token:mentor.token});
  const ownSlot=(rOwn.json.officeHours||[]).find(o=>o.title==='Stage2B regression slot');
  ok(!!ownSlot&&ownSlot.is_mine===true,'mentor sees is_mine:true on her own office hours');
  ok(!!ownSlot&&Number(ownSlot.mentor_user_id)===mentor.id,"mentor's own listing carries her real id (self-view is allowed to)");

  const rOther=await api('GET','/api/connect/office-hours?domain=EDUCATION',{token:learner.token});
  const otherSlot=(rOther.json.officeHours||[]).find(o=>o.title==='Stage2B regression slot');
  ok(!!otherSlot&&otherSlot.is_mine===false,'a different member sees is_mine:false on someone else\'s office hours');
  ok(!!otherSlot&&Number(otherSlot.mentor_user_id)!==mentor.id,"a different member never sees the mentor's raw numeric id");
  ok(!!otherSlot&&Number(otherSlot.mentor_user_id)>2**50,"the obscured mentor_user_id is an opaque reference, not a small guessable integer");

  // --- Unauthenticated: office hours is a private-for-signed-in surface.
  const rAnon=await api('GET','/api/connect/office-hours?domain=EDUCATION');
  ok(rAnon.status===401,'GET /api/connect/office-hours without a session is 401 (got '+rAnon.status+')');

  // --- Learner books the slot using the opaque reference, never a raw id.
  const slotId=ownSlot.id;
  const rBook=await api('POST',`/api/connect/office-hours/${slotId}/book`,{token:learner.token,body:{question:'How do I begin?'}});
  ok(rBook.status===200&&rBook.json.booked===true,'learner can book using the real slot id (200)');

  // --- Mentor session: whichever side you are, is_mentor reflects YOUR role, never a raw-id compare.
  const rSession=await api('POST','/api/connect/mentor-session',{token:learner.token,body:{mentorUserId:otherSlot.mentor_user_id,learnerUserId:learner.id}});
  ok(rSession.status===201&&rSession.json.status==='success','learner can schedule a mentor session using the opaque mentor reference');
  const sessionId=rSession.json.session.id;

  const rMentorView=await api('GET','/api/connect/knowledge-economy/dashboard',{token:mentor.token});
  const mentorRow=(rMentorView.json.sessions||[]).find(s=>String(s.id)===String(sessionId));
  ok(!!mentorRow&&mentorRow.is_mentor===true,'the mentor sees is_mentor:true on the session');

  const rLearnerView=await api('GET','/api/connect/knowledge-economy/dashboard',{token:learner.token});
  const learnerRow=(rLearnerView.json.sessions||[]).find(s=>String(s.id)===String(sessionId));
  ok(!!learnerRow&&learnerRow.is_mentor===false,'the learner sees is_mentor:false on the same session');
  ok(!!learnerRow&&Number(learnerRow.mentor_user_id)!==mentor.id,"the learner's view never carries the mentor's raw numeric id");

  console.log(`connect-ownership-flags: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();

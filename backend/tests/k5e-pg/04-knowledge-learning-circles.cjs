const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;function ok(c,m){if(c)pass++;else{fail++;console.log('  FAIL',m);}}
const S=r=>r.status;const q=async(sql,p)=>(await pool.query(sql,p)).rows;
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const A=await mkUser('Alice Anand','alice_'+tag,'HWD-A'+tag),B=await mkUser('Bob Bhat','bob_'+tag,'HWD-B'+tag),C=await mkUser('Carol Das','carol_'+tag,'HWD-C'+tag),D=await mkUser('Dave Rao','dave_'+tag,'HWD-D'+tag);
  const t=u=>({token:u.token});
  for(const [u,n] of [[A,'a'],[B,'b'],[C,'c'],[D,'d']])await api('POST','/api/connect/posts',{...t(u),body:{content:n+' post '+tag}});
  const fA=(await api('GET','/api/connect/feed',t(A))).json.posts;const fD=(await api('GET','/api/connect/feed',t(D))).json.posts;
  const R=(f,n)=>Number(f.find(p=>p.content.startsWith(n+' post'))?.user_id);const aR=R(fD,'a'),bR=R(fD,'b'),cR=R(fD,'c'),dR=R(fA,'d');
  // topics
  let r=await api('POST','/api/connect/topics/follow',{...t(A),body:{label:'Quantum Basics',knowledgeDomain:'SCIENCE'}});ok(S(r)===200,'follow topic ('+S(r)+')');
  r=await api('POST','/api/connect/topics/follow',{...t(B),body:{label:'Quantum Basics',knowledgeDomain:'AI'}});
  ok((await q("SELECT knowledge_domain FROM howdi_connect_topics WHERE slug='quantum-basics'"))[0].knowledge_domain==='SCIENCE','topic domain not rewritten by second follower');
  // ask / answers / helpful / best
  r=await api('POST','/api/connect/ask',{...t(A),body:{question:'What is a qubit? '+tag,knowledgeDomain:'SCIENCE'}});ok(S(r)===201,'ask ('+S(r)+')');
  ok(!/routed_expert_user_id|"user_id"/.test(r.text),'ask response has no ids');const rid=r.json.request.id;
  r=await api('POST','/api/connect/ask/'+rid+'/answer',{...t(B),body:{answer:'A quantum bit.'}});ok(S(r)===201,'answer ('+S(r)+')');const aid=r.json.answer.id;
  r=await api('POST','/api/connect/answers/'+aid+'/helpful',{...t(D),body:{}});const c1=r.json&&r.json.helpful_count;r=await api('POST','/api/connect/answers/'+aid+'/helpful',{...t(D),body:{}});ok(r.json.helpful_count===c1,'helpful vote deduped ('+c1+' vs '+r.json.helpful_count+')');
  ok(S(await api('POST','/api/connect/answers/'+aid+'/helpful',{...t(B),body:{}}))===404,'cannot vote own answer');
  ok(S(await api('PATCH','/api/connect/ask/'+rid+'/best-answer',{...t(D),body:{answerId:aid}}))>=400,'non-asker cannot set best answer');
  r=await api('PATCH','/api/connect/ask/'+rid+'/best-answer',{...t(A),body:{answerId:aid}});ok(S(r)===200,'asker sets best answer ('+S(r)+')');
  // partner goals
  r=await api('POST','/api/connect/partner-goals',{...t(A),body:{partnerUserId:bR,title:'Study daily'}});ok(S(r)===201,'goal create ('+S(r)+')');const gid=r.json&&r.json.goal&&r.json.goal.id;
  ok(S(await api('POST','/api/connect/partner-goals',{...t(A),body:{partnerUserId:B.id,title:'x'}}))>=400,'goal with raw id rejected');
  if(gid){ok(S(await api('POST','/api/connect/partner-goals/'+gid+'/checkin',{...t(D),body:{status:'DONE'}}))===404,'outsider cannot check in');
    ok(S(await api('POST','/api/connect/partner-goals/'+gid+'/checkin',{...t(B),body:{status:'ON_TRACK',note:'ok'}}))===201,'partner checks in');}
  // shared collections
  r=await api('POST','/api/connect/shared-collections',{...t(A),body:{name:'Coll '+tag}});ok(S(r)===201,'collection ('+S(r)+')');const colId=r.json&&r.json.collection&&r.json.collection.id;
  if(colId){ok(S(await api('POST','/api/connect/shared-collections/'+colId+'/invite',{...t(D),body:{targetUserId:cR}}))===403,'non-owner cannot invite');
    ok(S(await api('POST','/api/connect/shared-collections/'+colId+'/invite',{...t(A),body:{targetUserId:bR}}))===201,'owner invites');
    ok(S(await api('POST','/api/connect/shared-collections/'+colId+'/invite',{...t(A),body:{targetUserId:B.id}}))===404,'invite by raw id 404');}
  // invite loop
  r=await api('POST','/api/connect/invite-loop',{...t(A),body:{context:'KNOWLEDGE'}});ok(S(r)===201,'invite loop ('+S(r)+')');const code=r.json.invite.invite_code;
  ok(!code.includes(String(A.id))||code.length>8,'invite code opaque');
  ok(S(await api('POST','/api/connect/invite-loop/accept',{...t(A),body:{inviteCode:code}}))===404,'cannot accept own invite');
  r=await api('POST','/api/connect/invite-loop/accept',{...t(B),body:{inviteCode:code}});ok(S(r)===200,'accept invite ('+S(r)+')');await api('POST','/api/connect/invite-loop/accept',{...t(B),body:{inviteCode:code}});
  const ev=(await q("SELECT count(*)::int n FROM howdi_connect_trust_events WHERE user_id=$1 AND event_type='SUCCESSFUL_INVITE'",[A.id]))[0].n;ok(ev===1,'invite points awarded once ('+ev+')');
  // learning referral / partner / gratitude
  ok(S(await api('POST','/api/connect/learning-referral',{...t(A),body:{referredUserId:bR,entityId:'1'}}))===201,'referral');
  ok(S(await api('POST','/api/connect/learning-referral',{...t(A),body:{referredUserId:B.id}}))===404,'referral raw id 404');
  ok(S(await api('POST','/api/connect/learning-partner',{...t(A),body:{partnerUserId:bR}}))===200,'learning partner request');
  for(let i=0;i<2;i++)r=await api('POST','/api/connect/gratitude',{...t(A),body:{toUserId:bR,creditCount:3}});ok(S(r)===429,'gratitude capped per day ('+S(r)+')');
  ok(S(await api('POST','/api/connect/gratitude',{...t(A),body:{toUserId:A.id,creditCount:1}}))===400,'no self gratitude');
  // mentor
  r=await api('POST','/api/connect/mentor-profile',{...t(B),body:{mentorEnabled:true,headline:'m',knowledgeDomain:'SCIENCE',domains:'SCIENCE',bio:'b'}});ok(S(r)<300,'mentor profile ('+S(r)+')');
  r=await api('POST','/api/connect/mentor-request',{...t(A),body:{mentorUserId:bR,knowledgeDomain:'SCIENCE',message:'help'}});ok(S(r)===201||S(r)===200,'mentor request ('+S(r)+') '+r.text.slice(0,100));
  // office hours
  r=await api('POST','/api/connect/office-hours',{...t(B),body:{startsAt:new Date(Date.now()+864e5).toISOString(),title:'OH',capacity:1}});ok(S(r)===201,'office hours create');const oh=r.json&&r.json.officeHour&&r.json.officeHour.id;
  if(oh){ok(S(await api('POST','/api/connect/office-hours/'+oh+'/book',{...t(A),body:{question:'q'}}))===200,'book');
    ok(S(await api('POST','/api/connect/office-hours/'+oh+'/book',{...t(D),body:{question:'q'}}))===409,'full slot 409');
    ok(S(await api('PATCH','/api/connect/office-hours/'+oh+'/booking-status',{...t(A),body:{learnerUserId:aR,status:'COMPLETED'}}))===403,'learner cannot set booking status');
    r=await api('PATCH','/api/connect/office-hours/'+oh+'/booking-status',{...t(B),body:{learnerUserId:aR,status:'COMPLETED'}});ok(S(r)===200,'mentor completes ('+S(r)+')');
    await api('POST','/api/connect/office-hours/'+oh+'/book',{...t(A),body:{question:'again'}});
    ok((await q("SELECT booking_status FROM howdi_connect_office_hour_bookings WHERE office_hour_id=$1",[oh]))[0].booking_status==='COMPLETED','completed booking cannot be revived by re-book');}
  // social space invite links
  r=await api('POST','/api/connect/groups-channels',{...t(A),body:{name:'Inv '+tag,spaceType:'GROUP',privacy:'INVITE_ONLY',description:'d'}});const gid2=r.json&&(r.json.space?.id||r.json.group?.id||r.json.id);
  if(gid2){r=await api('POST','/api/connect/groups-channels/'+gid2+'/invite-links',{...t(A),body:{label:'x',maxUses:1}});ok(S(r)===201||S(r)===200,'invite link create ('+S(r)+') '+r.text.slice(0,100));
    ok(S(await api('POST','/api/connect/groups-channels/'+gid2+'/invite-links',{...t(D),body:{label:'x'}}))>=400,'non-admin cannot create invite link');
    ok(S(await api('POST','/api/connect/groups-channels/'+gid2+'/join',{...t(D),body:{}}))===403,'invite-only join denied');
    const tok=r.json&&(r.json.token||r.json.link?.token||r.json.inviteLink?.token||r.json.invite?.token);
    if(tok){r=await api('POST','/api/connect/invite/'+tok+'/join',{...t(D),body:{}});ok(S(r)===200,'join by token ('+S(r)+')');r=await api('POST','/api/connect/invite/'+tok+'/join',{...t(C),body:{}});ok(S(r)>=400,'single-use link exhausted ('+S(r)+')');}
    else ok(false,'no token in invite-link response: '+JSON.stringify(r.json).slice(0,150));}
  // vibe notifications listing
  r=await api('GET','/api/v1/vibes/notifications',t(A));ok(S(r)<500,'vibe notifications ('+S(r)+')');
  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

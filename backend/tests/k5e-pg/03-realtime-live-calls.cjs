const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;function ok(c,m){if(c)pass++;else{fail++;console.log('  FAIL',m);}}
const S=r=>r.status;const q=async(sql,p)=>(await pool.query(sql,p)).rows;
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const A=await mkUser('Alice Anand','alice_'+tag,'HWD-A'+tag),B=await mkUser('Bob Bhat','bob_'+tag,'HWD-B'+tag),C=await mkUser('Carol Das','carol_'+tag,'HWD-C'+tag),D=await mkUser('Dave Rao','dave_'+tag,'HWD-D'+tag);
  const t=u=>({token:u.token});
  for(const [u,n] of [[A,'a'],[B,'b'],[C,'c'],[D,'d']])await api('POST','/api/connect/posts',{...t(u),body:{content:n+' post '+tag}});
  const feedD=(await api('GET','/api/connect/feed',t(D))).json.posts,feedA=(await api('GET','/api/connect/feed',t(A))).json.posts;const rf=(f,n)=>Number(f.find(p=>p.content.startsWith(n+' post'))?.user_id);
  const aR=rf(feedD,'a'),bR=rf(feedD,'b'),cR=rf(feedD,'c'),dR=rf(feedA,'d');
  let r=await api('POST','/api/connect/communities',{...t(A),body:{name:'S3 Space '+tag,communityType:'SPACE',privacy:'PUBLIC'}});const sp=r.json.community.id;
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/start',{...t(A),body:{}}))===200,'start');
  for(const u of [A,B,D])ok(S(await api('POST','/api/connect/realtime/'+sp+'/join',{...t(u),body:{}}))===200,'join');
  // chat + pin
  r=await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(B),body:{message:'hello room',messageText:'hello room',body:'hello room',text:'hello room'}});ok(S(r)===201||S(r)===200,'chat post ('+S(r)+') '+r.text.slice(0,100));
  const chat=(await q('SELECT id FROM howdi_connect_space_chat WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];ok(!!chat,'chat row exists');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/chat/'+chat.id+'/pin',{...t(B),body:{}}))===403,'non-host cannot pin');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/chat/'+chat.id+'/pin',{...t(A),body:{}}))===200,'host pins');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(C),body:{message:'outsider'}}))>=400,'non-participant cannot chat');
  // poll
  r=await api('POST','/api/connect/realtime/'+sp+'/poll',{...t(A),body:{question:'Best?',options:['a','b'],pollOptions:['a','b']}});ok(S(r)===201||S(r)===200,'poll create ('+S(r)+') '+r.text.slice(0,100));
  const poll=(await q('SELECT id FROM howdi_connect_space_polls WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];
  if(poll){ok(S(await api('POST','/api/connect/realtime/'+sp+'/poll/'+poll.id+'/vote',{...t(B),body:{optionIndex:0,option_index:0}}))===200,'poll vote');
    ok(S(await api('POST','/api/connect/realtime/'+sp+'/poll/'+poll.id+'/vote',{...t(C),body:{optionIndex:0}}))>=400,'non-participant cannot vote');
    ok(S(await api('POST','/api/connect/realtime/'+sp+'/poll/'+poll.id+'/vote',{...t(B),body:{optionIndex:99}}))>=400,'invalid option rejected');}
  // rating
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/rating',{...t(B),body:{rating:5,feedback:'great'}}))===200,'attendee rates');
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/rating',{...t(C),body:{rating:5}}))===403,'non-attendee cannot rate');
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/rating',{...t(A),body:{rating:5}}))===403,'host cannot rate own');
  // quest
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/quest',{...t(B),body:{questCode:'JOIN'}}))===200,'quest ok');
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/quest',{...t(C),body:{questCode:'JOIN'}}))===403,'quest outsider 403');
  // questions
  r=await api('POST','/api/connect/realtime/'+sp+'/questions',{...t(B),body:{question:'Why?'}});ok(S(r)===201||S(r)===200,'question ('+S(r)+')');
  const qu=(await q('SELECT id FROM howdi_connect_space_questions WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];
  if(qu){ok(S(await api('POST','/api/connect/realtime/'+sp+'/questions/'+qu.id+'/upvote',{...t(D),body:{}}))===200,'upvote');
    ok(S(await api('POST','/api/connect/realtime/'+sp+'/questions/'+qu.id+'/answer',{...t(B),body:{answer:'x'}}))===403,'non-host cannot answer question');
    ok(S(await api('POST','/api/connect/realtime/'+sp+'/questions/'+qu.id+'/answer',{...t(A),body:{answer:'yes'}}))===200,'host answers');}
  // cohost invite
  r=await api('POST','/api/connect/realtime/'+sp+'/cohost/'+bR+'/invite',{...t(A),body:{}});ok(S(r)===201,'cohost invite ('+S(r)+') '+r.text.slice(0,100));
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/cohost/'+B.id+'/invite',{...t(A),body:{}}))===404,'cohost invite by raw id 404');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/cohost/'+dR+'/invite',{...t(B),body:{}}))>=400,'non-host cannot invite cohost');
  const inv=(await q('SELECT id FROM howdi_connect_space_cohost_invites WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];
  if(inv){ok(S(await api('POST','/api/connect/realtime/'+sp+'/cohost-invites/'+inv.id+'/respond',{...t(D),body:{accept:true}}))>=400,'wrong user cannot accept invite');
    ok(S(await api('POST','/api/connect/realtime/'+sp+'/cohost-invites/'+inv.id+'/respond',{...t(B),body:{accept:true}}))===200,'invitee accepts');
    const role=(await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,B.id]))[0]?.participant_role;ok(role==='COHOST','bob is COHOST ('+role+')');}
  // host-only fields for cohost vs viewer
  r=await api('GET','/api/connect/realtime/'+sp+'/state',t(B));ok(S(r)===200&&/checkin_code/.test(r.text),'cohost sees host fields');
  r=await api('GET','/api/connect/realtime/'+sp+'/state',t(D));ok(S(r)===200&&!/checkin_code|live_host_notes/.test(r.text),'viewer does not see host fields');
  // speaker flow
  r=await api('POST','/api/connect/realtime/'+sp+'/raise-hand',{...t(D),body:{}});ok(S(r)===200||S(r)===201,'raise hand ('+S(r)+')');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/speaker/'+dR+'/approve',{...t(C),body:{}}))>=400,'outsider cannot approve speaker');
  r=await api('POST','/api/connect/realtime/'+sp+'/speaker/'+dR+'/approve',{...t(A),body:{}});ok(S(r)===200,'host approves speaker ('+S(r)+')');
  let role=(await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,D.id]))[0]?.participant_role;ok(role==='SPEAKER','dave SPEAKER ('+role+')');
  r=await api('POST','/api/connect/realtime/'+sp+'/speaker/'+aR+'/remove',{...t(A),body:{}});
  role=(await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,A.id]))[0]?.participant_role;ok(role==='HOST','host cannot be demoted via speaker/remove ('+role+')');
  r=await api('POST','/api/connect/realtime/'+sp+'/speaker/'+dR+'/remove',{...t(A),body:{}});ok(S(r)===200,'host removes speaker');
  role=(await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,D.id]))[0]?.participant_role;ok(role==='LISTENER'||role==='VIEWER','dave back to listener ('+role+')');
  r=await api('POST','/api/connect/realtime/'+sp+'/participant/'+dR+'/mute',{...t(A),body:{muted:true}});ok(S(r)===200,'host mutes ('+S(r)+')');
  // LIVE: guests & costream & spotlight
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'S3 Live '+tag,communityType:'LIVE',privacy:'PUBLIC'}});const lv=r.json.community.id;
  await api('POST','/api/connect/realtime/'+lv+'/start',{...t(A),body:{}});
  for(const u of [A,B,D])await api('POST','/api/connect/realtime/'+lv+'/join',{...t(u),body:{}});
  r=await api('POST','/api/connect/live/'+lv+'/guest-request',{...t(D),body:{note:'let me in'}});ok(S(r)===200||S(r)===201,'guest request ('+S(r)+')');
  ok(S(await api('POST','/api/connect/live/'+lv+'/guest/'+dR+'/respond',{...t(B),body:{accept:true}}))>=400,'non-host cannot respond to guest request');
  r=await api('POST','/api/connect/live/'+lv+'/guest/'+dR+'/respond',{...t(A),body:{accept:true,approve:true,action:'APPROVE'}});ok(S(r)===200,'host approves guest ('+S(r)+') '+r.text.slice(0,80));
  role=(await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[lv,D.id]))[0]?.participant_role;ok(role==='GUEST','dave GUEST ('+role+')');
  r=await api('POST','/api/connect/live/'+lv+'/guest/'+dR+'/mute',{...t(A),body:{muted:true}});ok(S(r)===200,'mute guest ('+S(r)+')');
  r=await api('PATCH','/api/connect/live/'+lv+'/spotlight',{...t(A),body:{spotlightUserId:dR,layout:'SPOTLIGHT'}});ok(S(r)===200,'spotlight ('+S(r)+') '+r.text.slice(0,80));
  ok(S(await api('PATCH','/api/connect/live/'+lv+'/spotlight',{...t(B),body:{spotlightUserId:dR}}))>=400,'non-host cannot spotlight');
  // Live analytics / creator dashboard are host-only (real-SQL regression: the peak-viewers query used to be a syntax error)
  r=await api('GET','/api/connect/live/'+lv+'/analytics',t(A));ok(S(r)===200&&r.json.summary&&Number.isInteger(r.json.summary.peak_viewers),'host live analytics ('+S(r)+') '+r.text.slice(0,120));
  ok(!/howdi_id|master_id|checkin_code|live_host_notes|host_checklist/.test(JSON.stringify(r.json.summary||{})),'live analytics summary carries no identity/host-only secrets');
  ok(S(await api('GET','/api/connect/live/'+lv+'/analytics',t(B)))===403,'non-host cannot read live analytics');
  ok(S(await api('GET','/api/connect/live/'+lv+'/analytics'))===401,'guest cannot read live analytics');
  ok(S(await api('GET','/api/connect/live/'+lv+'/creator-dashboard',t(B)))===403,'non-host cannot read the live creator dashboard');
  r=await api('POST','/api/connect/live/'+lv+'/guest/'+aR+'/remove',{...t(A),body:{}});
  role=(await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[lv,A.id]))[0]?.participant_role;ok(role==='HOST','host not demoted by guest/remove ('+role+')');
  r=await api('POST','/api/connect/live/'+lv+'/guest/'+dR+'/remove',{...t(A),body:{}});ok(S(r)===200,'remove guest ('+S(r)+')');
  r=await api('POST','/api/connect/live/'+lv+'/costream-invite',{...t(A),body:{invitedUserId:bR,inviteeUserId:bR,targetUserId:bR}});ok(S(r)===201||S(r)===200,'costream invite ('+S(r)+') '+r.text.slice(0,100));
  r=await api('GET','/api/connect/live/costream-invites/mine',t(B));const ci=(r.json.invites||[])[0];
  if(ci){ok(S(await api('PATCH','/api/connect/live/costream-invites/'+ci.id+'/respond',{...t(D),body:{accept:true}}))>=400,'wrong user cannot respond to costream');
    r=await api('PATCH','/api/connect/live/costream-invites/'+ci.id+'/respond',{...t(B),body:{accept:true}});ok(S(r)===200,'invitee accepts costream ('+S(r)+')');}
  else ok(false,'costream invite listed for bob: '+JSON.stringify(r.json).slice(0,120));
  // calls: accept path
  r=await api('POST','/api/connect/calls',{...t(A),body:{callType:'VOICE',inviteeUsernames:[B.username]}});const call=r.json.call;
  r=await api('PATCH','/api/connect/calls/'+call.id+'/respond',{...t(B),body:{accept:true}});ok(S(r)===200,'accept call ('+S(r)+')');
  ok((await q('SELECT status FROM howdi_connect_calls WHERE id=$1',[call.id]))[0].status==='ACTIVE','call ACTIVE after accept');
  // quotes
  const pid=(await q('SELECT id FROM howdi_community_posts WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[A.id]))[0].id;
  r=await api('POST','/api/connect/posts/'+pid+'/quote',{...t(B),body:{quoteText:'nice one'}});ok(S(r)===201&&!/user_id/.test(r.text),'quote ok, no user id ('+S(r)+')');
  // legacy prefs update
  r=await api('PUT','/api/notifications/preferences/me',{...t(A),body:{orders_enabled:false,offers_enabled:true,wallet_enabled:true,rewards_enabled:true}});ok(S(r)===200,'prefs update me ('+S(r)+') '+r.text.slice(0,100));
  r=await api('PUT','/api/notifications/preferences/'+B.id,{...t(A),body:{orders_enabled:false}});ok(S(r)===403,'prefs update foreign 403 ('+S(r)+')');
  // vibe notifications
  r=await api('GET','/api/notifications',t(A));ok(S(r)<500,'legacy notifications list ok ('+S(r)+')');
  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

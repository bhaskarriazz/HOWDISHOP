// K5E second-review closure: defects found by the SECOND independent review, each pinned end-to-end (real HTTP + real SQL).
const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;function ok(c,m){if(c)pass++;else{fail++;console.log('  FAIL',m);}}
const S=r=>r.status;const q=async(sql,p)=>(await pool.query(sql,p)).rows;
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const A=await mkUser('Alice Anand','alice_'+tag,'HWD-A'+tag),B=await mkUser('Bob Bhat','bob_'+tag,'HWD-B'+tag),C=await mkUser('Carol Das','carol_'+tag,'HWD-C'+tag),D=await mkUser('Dave Rao','dave_'+tag,'HWD-D'+tag),E=await mkUser('Eve Iyer','eve_'+tag,'HWD-E'+tag);
  const t=u=>({token:u.token});
  const follow=(a,b)=>pool.query('INSERT INTO howdi_connect_follows(follower_user_id,following_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[a.id,b.id]);
  for(const [u,n] of [[A,'a'],[B,'b'],[C,'c'],[D,'d'],[E,'e']])await api('POST','/api/connect/posts',{...t(u),body:{content:n+' post '+tag}});
  const feedE=(await api('GET','/api/connect/feed',t(E))).json.posts;const rf=n=>Number(feedE.find(p=>p.content===n+' post '+tag)?.user_id);
  const aR=rf('a'),bR=rf('b'),cR=rf('c'),dR=rf('d');
  let r;

  // ---- 1. free trials are the CREATOR's offer, never the subscriber's choice
  ok(S(await api('POST','/api/connect/creator-plans',{...t(A),body:{planName:'Gold',price:99,billingPeriod:'MONTHLY',benefits:'x'}}))===201,'creator plan without a trial');
  r=await api('POST','/api/connect/creator-plans/'+aR+'/subscribe',{...t(B),body:{trialDays:30}});ok(S(r)===200&&r.json.trial_days===0,'a subscriber-chosen 30-day trial is ignored when the plan offers none ('+r.text.slice(0,120)+')');
  ok((await q('SELECT status FROM howdi_connect_creator_subscriptions WHERE creator_user_id=$1 AND subscriber_user_id=$2',[A.id,B.id]))[0].status==='PENDING','…and the membership stays PENDING until paid');
  await api('POST','/api/connect/creator-plans',{...t(A),body:{planName:'Gold',price:99,billingPeriod:'MONTHLY',benefits:'x',trialDays:7}});
  r=await api('POST','/api/connect/creator-plans/'+aR+'/subscribe',{...t(C),body:{trialDays:30}});ok(S(r)===200&&r.json.trial_days===7,'when the creator offers 7 days, asking for 30 gets 7 ('+r.text.slice(0,120)+')');
  r=await api('POST','/api/connect/creator-plans/'+aR+'/subscribe',{...t(D),body:{}});ok(S(r)===200&&r.json.trial_days===0,'no trial unless the subscriber asks for the offered one');
  // blocked pair: no plan, no subscription, no resources
  await api('POST','/api/connect/profile/username/'+E.username+'/block',t(A));
  ok(S(await api('POST','/api/connect/creator-plans/'+aR+'/subscribe',{...t(E),body:{}}))===404,'a blocked member cannot subscribe to the blocker');
  ok((await q('SELECT 1 FROM howdi_connect_creator_subscriptions WHERE creator_user_id=$1 AND subscriber_user_id=$2',[A.id,E.id])).length===0,'…and no subscription row was created');
  r=await api('GET','/api/connect/creator-plans/'+aR,t(E));ok(S(r)===200&&r.json.plan===null,'the blocker\'s plan is not shown to the blocked member');
  await api('POST','/api/connect/creator-resources',{...t(A),body:{title:'Open resource',description:'d',resourceUrl:'https://example.test/x',subscribersOnly:false}});
  r=await api('GET','/api/connect/creator-resources/'+aR,t(D));ok(S(r)===200&&(r.json.resources||[]).length===1,'(control) an unblocked member sees the open resource');
  r=await api('GET','/api/connect/creator-resources/'+aR,t(E));ok(S(r)===200&&(r.json.resources||[]).length===0,'the blocker\'s resources are not shown to the blocked member');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1 OR blocked_user_id=$1',[A.id]);

  // ---- 2. home + public profile obey private profiles / subscribers-only / audience
  await api('POST','/api/connect/posts',{...t(A),body:{content:'HOME-SUBS-'+tag,subscribersOnly:true}});
  await api('POST','/api/connect/posts',{...t(A),body:{content:'HOME-PUBLIC-'+tag}});
  const artFollowers=await api('POST','/api/connect/posts',{...t(A),body:{content:'Article body for followers '+tag+' '.repeat(3)+'text text text text text text',postType:'ARTICLE',articleTitle:'FOLLOWERS-ART-'+tag,audienceScope:'FOLLOWERS'}});
  const artSubs=await api('POST','/api/connect/posts',{...t(A),body:{content:'Article body for subscribers '+tag+' text text text text text text',postType:'ARTICLE',articleTitle:'SUBS-ART-'+tag,subscribersOnly:true}});
  ok(S(artFollowers)===201&&S(artSubs)===201,'articles created ('+S(artFollowers)+','+S(artSubs)+')');
  const homeText=async u=>JSON.stringify((await api('GET','/api/connect/home',u?t(u):{})).json);
  let h=await homeText(D);
  ok(h.includes('HOME-PUBLIC-'+tag),'home shows a public post');
  ok(!h.includes('HOME-SUBS-'+tag)&&!h.includes('SUBS-ART-'+tag),'home never shows subscribers-only content');
  const prof=async u=>JSON.stringify((await api('GET','/api/connect/public-profile/username/'+A.username,u?t(u):{})).json);
  let pj=await prof(null);ok(!pj.includes('FOLLOWERS-ART-'+tag)&&!pj.includes('SUBS-ART-'+tag),'public profile hides FOLLOWERS-only and subscribers-only articles from guests');
  pj=await prof(D);ok(!pj.includes('FOLLOWERS-ART-'+tag)&&!pj.includes('SUBS-ART-'+tag),'…and from non-followers');
  await follow(D,A);pj=await prof(D);ok(pj.includes('FOLLOWERS-ART-'+tag)&&!pj.includes('SUBS-ART-'+tag),'a follower sees the FOLLOWERS article but still not the subscribers-only one');
  pj=await prof(A);ok(pj.includes('FOLLOWERS-ART-'+tag)&&pj.includes('SUBS-ART-'+tag),'the owner sees everything');
  await pool.query('DELETE FROM howdi_connect_follows WHERE follower_user_id=$1',[D.id]);
  await api('POST','/api/connect/stories',{...t(A),body:{content:'home story',audience:'Everyone'}});
  await api('POST','/api/connect/posts',{...t(A),body:{content:'HOME-PRIVATE-'+tag}});
  {const home0=JSON.parse(await homeText(D));ok(JSON.stringify(home0.sections?.stories||{}).includes(A.username),'(control) while public, the story ring shows alice');}
  await pool.query('UPDATE howdi_connect_profiles SET private_profile=TRUE WHERE user_id=$1',[A.id]);
  h=await homeText(D);ok(!h.includes('HOME-PRIVATE-'+tag)&&!h.includes('HOME-PUBLIC-'+tag),'home hides a private profile\'s posts from non-followers');
  {const home=JSON.parse(h);ok(!JSON.stringify(home.sections?.stories||home.stories||{}).includes(A.username)&&(home.sections?.stories||home.stories)!==undefined,'…and its stories');}
  h=await homeText(null);ok(!h.includes('HOME-PRIVATE-'+tag),'…and from guests');
  await follow(D,A);h=await homeText(D);ok(h.includes('HOME-PRIVATE-'+tag)||h.includes(A.username),'a follower does see it');
  await pool.query('DELETE FROM howdi_connect_follows WHERE follower_user_id=$1',[D.id]);

  // ---- 3. private-profile siblings: skill passport, trust trail, knowledge DNA, follower lists, questions
  await follow(E,A);// E follows A so E can read; D does not
  await api('POST','/api/connect/skill-passport',{...t(A),body:{skillName:'Welding',skillLevel:'EXPERT'}});
  for(const path of ['/skill-passport','/trust-trail','/public-knowledge-dna']){
    ok(S(await api('GET','/api/connect/profiles/'+aR+path,t(D)))===404,'private: non-follower gets 404 for '+path);
    ok([401,404].includes(S(await api('GET','/api/connect/profiles/'+aR+path))),'private: a guest gets no data for '+path);
    ok(S(await api('GET','/api/connect/profiles/'+aR+path,t(E)))===200,'private: follower can read '+path);
    ok(S(await api('GET','/api/connect/profiles/'+A.id+path,t(A)))===200,'private: owner can read own '+path);
  }
  r=await api('GET','/api/connect/profile/username/'+A.username+'/connections?type=followers',t(D));ok(S(r)===403,'private: follower list is not shown to a non-follower ('+S(r)+')');
  r=await api('GET','/api/connect/profile/username/'+A.username+'/connections?type=followers',t(E));ok(S(r)===200,'private: …but is to a follower');
  await api('POST','/api/connect/ask',{...t(A),body:{question:'PRIVATE-Q-'+tag+' how do I weld aluminium?',knowledgeDomain:'GENERAL'}});
  ok(!JSON.stringify((await api('GET','/api/connect/ask-feed',t(D))).json).includes('PRIVATE-Q-'+tag),'private: ask-feed hides the question from non-followers');
  ok(JSON.stringify((await api('GET','/api/connect/ask-feed',t(E))).json).includes('PRIVATE-Q-'+tag),'private: …and shows it to a follower');
  ok(!JSON.stringify((await api('GET','/api/connect/community-intelligence',t(D))).json).includes('PRIVATE-Q-'+tag),'private: community-intelligence hides it');
  await pool.query('UPDATE howdi_connect_profiles SET private_profile=FALSE WHERE user_id=$1',[A.id]);
  await pool.query('DELETE FROM howdi_connect_follows WHERE following_user_id=$1',[A.id]);
  // follower-list of a blocked viewer
  await api('POST','/api/connect/profile/username/'+D.username+'/block',t(A));
  ok(S(await api('GET','/api/connect/profile/username/'+A.username+'/connections?type=followers',t(D)))===404,'a blocked viewer cannot list the blocker\'s network');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[A.id]);
  // skill endorsement across a block
  const sk=(await q('SELECT id FROM howdi_connect_profile_skills WHERE user_id=$1 LIMIT 1',[A.id]))[0];
  if(sk){await api('POST','/api/connect/profile/username/'+D.username+'/block',t(A));ok(S(await api('POST','/api/connect/profile-skills/'+sk.id+'/endorse',{...t(D),body:{}}))===400,'a blocked member cannot endorse the blocker\'s skill');await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[A.id]);}

  // ---- 4. room block: poll vote / upvote / captions / co-host + co-stream accept, and a blocked member's speech is hidden from the blocker
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Rev2 Space '+tag,communityType:'SPACE',privacy:'PUBLIC'}});const sp=r.json.community.id;
  await api('POST','/api/connect/realtime/'+sp+'/start',{...t(A),body:{}});
  for(const u of [A,B,C,D])await api('POST','/api/connect/realtime/'+sp+'/join',{...t(u),body:{}});
  await api('POST','/api/connect/realtime/'+sp+'/poll',{...t(A),body:{question:'Best?',options:['a','b'],pollOptions:['a','b']}});
  const poll=(await q('SELECT id FROM howdi_connect_space_polls WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];
  await api('POST','/api/connect/realtime/'+sp+'/questions',{...t(C),body:{question:'Carol asks?'}});
  const qu=(await q('SELECT id FROM howdi_connect_space_questions WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];
  await api('POST','/api/connect/realtime/'+sp+'/cohost/'+bR+'/invite',{...t(A),body:{}});
  const inv=(await q('SELECT id FROM howdi_connect_space_cohost_invites WHERE community_id=$1 ORDER BY id DESC LIMIT 1',[sp]))[0];
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/poll/'+poll.id+'/vote',{...t(B),body:{optionIndex:0}}))===200,'before the block: poll vote works');
  await api('POST','/api/connect/profile/username/'+B.username+'/block',t(A));
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/poll/'+poll.id+'/vote',{...t(B),body:{optionIndex:1}}))>=400,'blocked member cannot vote in the poll');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/questions/'+qu.id+'/upvote',{...t(B),body:{}}))===404,'blocked member cannot upvote a question');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/cohost-invites/'+inv.id+'/respond',{...t(B),body:{accept:true}}))===404,'blocked member cannot accept a co-host invite');
  ok((await q('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,B.id]))[0].participant_role!=='COHOST','…and did not become COHOST');
  await pool.query("UPDATE howdi_connect_realtime_participants SET participant_role='SPEAKER' WHERE community_id=$1 AND user_id=$2",[sp,B.id]);
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/captions',{...t(B),body:{text:'blocked caption',isFinal:true}}))===403,'a blocked SPEAKER cannot post captions');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[A.id]);
  // co-stream invite
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Rev2 Live '+tag,communityType:'LIVE',privacy:'PUBLIC'}});const lv=r.json.community.id;
  await api('POST','/api/connect/realtime/'+lv+'/start',{...t(A),body:{}});await api('POST','/api/connect/realtime/'+lv+'/join',{...t(B),body:{}});
  await api('POST','/api/connect/live/'+lv+'/costream-invite',{...t(A),body:{invitedUserId:bR,inviteeUserId:bR,targetUserId:bR}});
  const ci=((await api('GET','/api/connect/live/costream-invites/mine',t(B))).json.invites||[])[0];
  await api('POST','/api/connect/profile/username/'+B.username+'/block',t(A));
  if(ci)ok(S(await api('PATCH','/api/connect/live/costream-invites/'+ci.id+'/respond',{...t(B),body:{accept:true}}))===404,'blocked member cannot accept a co-stream invite');
  else ok(false,'costream invite listed');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[A.id]);
  // a blocked member's chat/questions are hidden from the blocker's view of the state
  await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(D),body:{messageText:'DAVE-SAYS-'+tag}});
  await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(B),body:{messageText:'BOB-SAYS-'+tag}});
  let st=JSON.stringify((await api('GET','/api/connect/realtime/'+sp+'/state',t(C))).json);ok(st.includes('DAVE-SAYS-'+tag)&&st.includes('BOB-SAYS-'+tag),'before the block: carol sees both');
  await api('POST','/api/connect/profile/username/'+D.username+'/block',t(C));
  st=JSON.stringify((await api('GET','/api/connect/realtime/'+sp+'/state',t(C))).json);ok(!st.includes('DAVE-SAYS-'+tag)&&st.includes('BOB-SAYS-'+tag),'after carol blocks dave: dave\'s chat is gone from carol\'s view, bob\'s stays');
  ok(!(JSON.parse(st).participants||[]).some(p=>p.public_username===D.username)&&(JSON.parse(st).participants||[]).some(p=>p.public_username===B.username),'…and dave is not in carol\'s participant list (bob still is)');
  st=JSON.stringify((await api('GET','/api/connect/realtime/'+sp+'/state',t(D))).json);ok(!st.includes('Carol asks?'),'…and carol\'s question is gone from dave\'s view');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[C.id]);

  // group/channel messages: a blocked sender's messages are hidden from the blocker
  r=await api('POST','/api/connect/groups-channels',{...t(A),body:{name:'Rev2 Group '+tag,spaceType:'GROUP',privacy:'PUBLIC',description:'d'}});const gid=r.json.space?.id||r.json.group?.id||r.json.id;ok(!!gid,'group created ('+S(r)+')');
  for(const u of [B,C])await api('POST','/api/connect/groups-channels/'+gid+'/join',{...t(u),body:{}});
  await api('POST','/api/connect/groups-channels/'+gid+'/messages',{...t(B),body:{body:'BOB-GROUP-'+tag}});await api('POST','/api/connect/groups-channels/'+gid+'/messages',{...t(C),body:{body:'CAROL-GROUP-'+tag}});
  let gm=JSON.stringify((await api('GET','/api/connect/groups-channels/'+gid+'/messages',t(C))).json);ok(gm.includes('BOB-GROUP-'+tag)&&gm.includes('CAROL-GROUP-'+tag),'(control) carol sees the whole thread');
  await api('POST','/api/connect/profile/username/'+B.username+'/block',t(C));
  gm=JSON.stringify((await api('GET','/api/connect/groups-channels/'+gid+'/messages',t(C))).json);ok(!gm.includes('BOB-GROUP-'+tag)&&gm.includes('CAROL-GROUP-'+tag),'after carol blocks bob, bob\'s group messages are hidden from carol (her own stay)');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[C.id]);

  // ---- 5. calls: no shared-group loophole, block after the fact, ringing invitees cannot end a group call
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='NO_ONE' WHERE user_id=$1",[B.id]);
  r=await api('POST','/api/connect/communities',{...t(C),body:{name:'Shared '+tag,communityType:'SPACE',privacy:'PUBLIC'}});const shared=r.json.community.id;
  await pool.query("INSERT INTO howdi_connect_community_members(community_id,user_id,membership_status) VALUES($1,$2,'ACTIVE'),($1,$3,'ACTIVE') ON CONFLICT DO NOTHING",[shared,B.id,D.id]);
  ok(S(await api('POST','/api/connect/calls',{...t(D),body:{callType:'VOICE',inviteeUsernames:[B.username],groupSpaceId:shared}}))===403,'a shared public group does not bypass NO_ONE for calls');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='EVERYONE' WHERE user_id=$1",[B.id]);
  // block after the call was placed
  r=await api('POST','/api/connect/calls',{...t(D),body:{callType:'VOICE',inviteeUsernames:[B.username]}});const c1=r.json.call;
  await api('POST','/api/connect/profile/username/'+D.username+'/block',t(B));
  ok(((await api('GET','/api/connect/calls/inbox',t(B))).json.calls||[]).length===0,'a ringing call from someone you blocked is not in your inbox');
  ok(S(await api('PATCH','/api/connect/calls/'+c1.id+'/respond',{...t(B),body:{accept:true}}))===404,'…and cannot be accepted');
  ok(S(await api('PATCH','/api/connect/calls/'+c1.id+'/respond',{...t(B),body:{accept:false}}))===200,'…but can still be declined');
  await pool.query('DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1',[B.id]);
  // group call: a ringing invitee who leaves does not end it; the host leaving does
  r=await api('POST','/api/connect/calls',{...t(D),body:{callType:'VOICE',inviteeUsernames:[B.username,C.username]}});const c2=r.json.call;ok(S(r)===201,'group call created');
  ok(S(await api('POST','/api/connect/calls/'+c2.id+'/leave',{...t(B),body:{}}))===200,'ringing invitee leaves');
  ok((await q('SELECT status FROM howdi_connect_calls WHERE id=$1',[c2.id]))[0].status!=='ENDED','the group call is still up while someone else is being rung');
  ok(S(await api('POST','/api/connect/calls/'+c2.id+'/leave',{...t(D),body:{}}))===200,'host leaves');
  ok((await q('SELECT status FROM howdi_connect_calls WHERE id=$1',[c2.id]))[0].status==='ENDED','the host leaving ends the call');

  // ---- 6. follow-request spam + story reply contact permission
  await pool.query('UPDATE howdi_connect_profiles SET private_profile=TRUE WHERE user_id=$1',[C.id]);
  for(let i=0;i<3;i++)await api('POST','/api/connect/users/'+cR+'/follow',{...t(E),body:{}});
  const n=(await q("SELECT COUNT(*)::int n FROM howdi_connect_notifications WHERE user_id=$1 AND actor_user_id=$2 AND notification_type='FOLLOW_REQUEST'",[C.id,E.id]))[0].n;ok(n===1,'repeated follow requests notify the owner once ('+n+')');
  await pool.query('UPDATE howdi_connect_profiles SET private_profile=FALSE WHERE user_id=$1',[C.id]);
  await api('POST','/api/connect/stories',{...t(C),body:{content:'carol story',audience:'Everyone'}});
  const cs=(await q('SELECT id FROM howdi_connect_stories WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[C.id]))[0].id;
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='NO_ONE' WHERE user_id=$1",[C.id]);
  ok(S(await api('POST','/api/connect/stories/'+cs+'/reply',{...t(D),body:{reply:'hello'}}))===403,'story replies honour contact_permission');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='EVERYONE' WHERE user_id=$1",[C.id]);
  ok(S(await api('POST','/api/connect/stories/'+cs+'/reply',{...t(D),body:{reply:'hello'}}))===201,'…and work again when the inbox is open');

  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

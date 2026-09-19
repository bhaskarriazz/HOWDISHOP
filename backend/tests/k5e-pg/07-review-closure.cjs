// K5E closure suite: defects found by the independent review of the first K5E cut, each pinned end-to-end (real HTTP + real SQL).
const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;function ok(c,m){if(c)pass++;else{fail++;console.log('  FAIL',m);}}
const S=r=>r.status;const q=async(sql,p)=>(await pool.query(sql,p)).rows;
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const A=await mkUser('Alice Anand','alice_'+tag,'HWD-A'+tag),B=await mkUser('Bob Bhat','bob_'+tag,'HWD-B'+tag),C=await mkUser('Carol Das','carol_'+tag,'HWD-C'+tag),D=await mkUser('Dave Rao','dave_'+tag,'HWD-D'+tag),E=await mkUser('Eve Iyer','eve_'+tag,'HWD-E'+tag);
  const t=u=>({token:u.token});
  const follow=(a,b)=>pool.query('INSERT INTO howdi_connect_follows(follower_user_id,following_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[a.id,b.id]);
  for(const [u,n] of [[A,'a'],[B,'b'],[C,'c'],[D,'d'],[E,'e']])await api('POST','/api/connect/posts',{...t(u),body:{content:n+' post '+tag}});
  const feed=(await api('GET','/api/connect/feed',t(E))).json.posts;const rf=n=>Number(feed.find(p=>p.content===n+' post '+tag)?.user_id);
  const aR=rf('a'),bR=rf('b'),cR=rf('c'),dR=rf('d');
  const eR=Number(((await api('GET','/api/connect/feed',t(D))).json.posts.find(p=>p.content==='e post '+tag)||{}).user_id);
  ok(aR>0&&aR!==A.id&&bR!==B.id,'foreign members are opaque refs in the feed');

  // ---- 1. calls: a non-participant can no longer end (or probe) somebody else's call
  let r=await api('POST','/api/connect/calls',{...t(A),body:{callType:'VOICE',inviteeUsernames:[B.username,C.username]}});ok(S(r)===201,'call created ('+S(r)+')');
  const call=r.json.call;
  await api('PATCH','/api/connect/calls/'+call.id+'/respond',{...t(B),body:{accept:true}});
  ok(S(await api('POST','/api/connect/calls/'+call.id+'/leave',{...t(D),body:{}}))===404,'outsider cannot leave (end) a call they are not in');
  ok((await q('SELECT status FROM howdi_connect_calls WHERE id=$1',[call.id]))[0].status==='ACTIVE','the call is still ACTIVE after the outsider attempt');
  // call state tokens: a member who declined no longer learns the routing tokens of people still on the call
  ok(S(await api('PATCH','/api/connect/calls/'+call.id+'/respond',{...t(C),body:{accept:false}}))===200,'carol declines');
  r=await api('GET','/api/connect/calls/'+call.id+'/state',t(C));ok(S(r)===200,'declined member may still read the call state');
  const others=(r.json.participants||[]).filter(p=>!p.is_viewer);ok(others.length===2&&others.every(p=>p.token===null),'declined member gets no routing tokens for the others');
  ok((r.json.participants||[]).some(p=>p.is_viewer&&p.token),'…but keeps their own');
  r=await api('GET','/api/connect/calls/'+call.id+'/state',t(B));ok((r.json.participants||[]).filter(p=>!p.is_viewer&&p.invite_status==='JOINED').every(p=>p.token),'a live member still gets the live participants\' tokens');
  ok(S(await api('POST','/api/connect/calls/'+call.id+'/leave',{...t(B),body:{}}))===200,'participant can leave');

  // ---- 2. contact_permission for DM start / DM send / calls
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='NO_ONE' WHERE user_id=$1",[B.id]);
  ok(S(await api('POST','/api/connect/conversations/username/'+B.username+'/start',{...t(D),body:{}}))===403,'NO_ONE: cannot start a DM');
  ok(S(await api('POST','/api/connect/conversations',{...t(D),body:{targetUserId:bR}}))===403,'NO_ONE: cannot start a DM (numeric route)');
  ok(S(await api('POST','/api/connect/calls',{...t(D),body:{callType:'VOICE',inviteeUsernames:[B.username]}}))===403,'NO_ONE: cannot call');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='FOLLOWERS' WHERE user_id=$1",[C.id]);
  ok(S(await api('POST','/api/connect/conversations/username/'+C.username+'/start',{...t(D),body:{}}))===403,'FOLLOWERS: a non-follower cannot start a DM');
  ok(S(await api('POST','/api/connect/calls',{...t(D),body:{callType:'VOICE',inviteeUsernames:[C.username]}}))===403,'FOLLOWERS: a non-follower cannot call');
  await follow(D,C);
  ok(S(await api('POST','/api/connect/conversations/username/'+C.username+'/start',{...t(D),body:{}}))===200,'FOLLOWERS: a follower can start a DM');
  ok(S(await api('POST','/api/connect/calls',{...t(D),body:{callType:'VOICE',inviteeUsernames:[C.username]}}))===201,'FOLLOWERS: a follower can call');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='FOLLOWING' WHERE user_id=$1",[E.id]);
  ok(S(await api('POST','/api/connect/conversations/username/'+E.username+'/start',{...t(D),body:{}}))===403,'FOLLOWING: someone the target does not follow cannot start a DM');
  await follow(E,D);
  ok(S(await api('POST','/api/connect/conversations/username/'+E.username+'/start',{...t(D),body:{}}))===200,'FOLLOWING: someone the target follows can');
  // send-time: thread exists, then the target closes their inbox
  const cv=(await api('POST','/api/connect/conversations/username/'+A.username+'/start',{...t(D),body:{}})).json.conversation_id;ok(!!cv,'thread D–A');
  ok(S(await api('POST','/api/connect/conversations/'+cv+'/messages',{...t(D),body:{messageText:'first'}}))===201,'D writes while A is open');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='NO_ONE' WHERE user_id=$1",[A.id]);
  // D wrote first and A never replied, so D (the initiator) may not keep writing once A closed the inbox; A may answer D.
  ok(S(await api('POST','/api/connect/conversations/'+cv+'/messages',{...t(D),body:{messageText:'again'}}))===403,'NO_ONE set after D wrote: D cannot keep writing');
  const cv2=(await api('POST','/api/connect/conversations/username/'+D.username+'/start',{...t(A),body:{}})).json.conversation_id;
  ok(String(cv2)===String(cv),'same thread from A\'s side');
  ok(S(await api('POST','/api/connect/conversations/'+cv+'/messages',{...t(A),body:{messageText:'reply'}}))===201,'the closed-inbox member can still answer');
  ok(S(await api('POST','/api/connect/conversations/'+cv+'/messages',{...t(D),body:{messageText:'thanks'}}))===201,'and the peer who was answered can carry on');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='EVERYONE' WHERE user_id IN($1,$2,$3,$4)",[A.id,B.id,C.id,E.id]);
  // fresh NO_ONE thread: initiator writes first, then target closes -> initiator blocked
  const cvBE=(await api('POST','/api/connect/conversations/username/'+B.username+'/start',{...t(E),body:{}})).json.conversation_id;
  ok(S(await api('POST','/api/connect/conversations/'+cvBE+'/messages',{...t(E),body:{messageText:'hi bob'}}))===201,'E writes to open B');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='NO_ONE' WHERE user_id=$1",[B.id]);
  ok(S(await api('POST','/api/connect/conversations/'+cvBE+'/messages',{...t(E),body:{messageText:'hi again'}}))===403,'B closed the inbox before replying: E can no longer write');
  ok(S(await api('POST','/api/connect/conversations/'+cvBE+'/messages',{...t(B),body:{messageText:'ok hello'}}))===201,'B can still write to E');
  ok(S(await api('POST','/api/connect/conversations/'+cvBE+'/messages',{...t(E),body:{messageText:'thanks!'}}))===201,'…and once B has written, E can answer');
  await pool.query("UPDATE howdi_connect_profiles SET contact_permission='EVERYONE' WHERE user_id=$1",[B.id]);

  // ---- 3. private profiles: content only for the owner and accepted followers
  await api('POST','/api/connect/stories',{...t(A),body:{content:'private story',audience:'Everyone'}});
  const storyId=(await q("SELECT id FROM howdi_connect_stories WHERE user_id=$1 ORDER BY id DESC LIMIT 1",[A.id]))[0].id;
  const apost=(await q('SELECT id FROM howdi_community_posts WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[A.id]))[0].id;
  const seesPost=async u=>((await api('GET','/api/connect/feed',u?t(u):{})).json.posts||[]).some(p=>p.content==='a post '+tag);
  const seesStory=async u=>((await api('GET','/api/connect/stories',u?t(u):{})).json.stories||[]).some(s=>String(s.id)===String(storyId));
  ok(await seesPost(D)&&await seesStory(D),'public profile: everyone sees the post and story');
  await pool.query('UPDATE howdi_connect_profiles SET private_profile=TRUE WHERE user_id=$1',[A.id]);
  ok(!(await seesPost(D))&&!(await seesPost(null)),'private profile: the feed hides the post from non-followers and guests');
  ok(!(await seesStory(D))&&!(await seesStory(null)),'private profile: the story is hidden from non-followers and guests');
  ok(S(await api('POST','/api/connect/posts/'+apost+'/comments',{...t(D),body:{content:'hi',commentText:'hi'}}))===404,'private profile: cannot comment on a post');
  ok(S(await api('POST','/api/connect/stories/'+storyId+'/react',{...t(D),body:{reaction:'❤️'}}))===404,'private profile: cannot react to a story');
  {const cm=await api('GET','/api/connect/posts/'+apost+'/comments',t(D));ok(S(cm)===404||(S(cm)===200&&(cm.json.comments||[]).length===0),'private profile: cannot read comments ('+S(cm)+')');}
  ok(await seesPost(A)&&await seesStory(A),'the owner still sees their own content');
  await follow(B,A);
  ok(await seesPost(B)&&await seesStory(B),'an accepted follower sees the post and story');
  await pool.query('UPDATE howdi_connect_profiles SET private_profile=FALSE WHERE user_id=$1',[A.id]);

  // ---- 4. a block ends participation inside a room (chat / react / ask / tip / heartbeat / rate / quest / feedback / signal)
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Blk Space '+tag,communityType:'SPACE',privacy:'PUBLIC'}});const sp=r.json.community.id;
  await api('POST','/api/connect/realtime/'+sp+'/start',{...t(A),body:{}});
  for(const u of [A,B,C,D])ok(S(await api('POST','/api/connect/realtime/'+sp+'/join',{...t(u),body:{}}))===200,'join');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(B),body:{messageText:'before block'}}))===201,'chat works before the block');
  ok(S(await api('POST','/api/connect/profile/username/'+B.username+'/block',t(A)))===200,'host blocks bob');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(B),body:{messageText:'after block'}}))===403,'blocked member cannot chat');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/reaction',{...t(B),body:{emoji:'👏'}}))===403,'blocked member cannot react');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/questions',{...t(B),body:{question:'why?'}}))===403,'blocked member cannot ask');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/raise-hand',{...t(B),body:{}}))===403,'blocked member cannot raise a hand');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/tip',{...t(B),body:{amount:10}}))===403,'blocked member cannot tip');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/heartbeat',{...t(B),body:{}}))===403,'blocked member heartbeat is refused');
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/rating',{...t(B),body:{rating:5}}))===403,'blocked member cannot rate');
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/quest',{...t(B),body:{questCode:'JOIN'}}))===403,'blocked member cannot complete a quest');
  ok(S(await api('POST','/api/connect/spaces/'+sp+'/feedback',{...t(B),body:{npsScore:9}}))===403,'blocked member cannot leave feedback');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/chat',{...t(C),body:{messageText:'unblocked chat'}}))===201,'an unrelated member is unaffected');
  // member-to-member block: C blocks D, D can no longer signal C
  await api('POST','/api/connect/profile/username/'+D.username+'/block',t(C));
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/signal',{...t(D),body:{toUserId:cR,signalType:'OFFER',payload:{sdp:'x'}}}))===404,'no room signalling across a block');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/signal',{...t(D),body:{toUserId:aR,signalType:'OFFER',payload:{sdp:'x'}}}))===201,'…but signalling an unblocked member still works');

  // ---- 5. live report: hidden room / non-member target
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Priv Live '+tag,communityType:'LIVE',privacy:'PRIVATE'}});const pl=r.json.community.id;
  const before=Number((await q('SELECT COUNT(*)::int n FROM howdi_connect_live_moderation_queue WHERE community_id=$1',[pl]))[0].n);
  ok(S(await api('POST','/api/connect/live/'+pl+'/report',{...t(D),body:{reason:'SPAM',targetUserId:aR}}))===404,'report on a private room the reporter cannot see is a 404');
  ok(S(await api('POST','/api/connect/live/999999/report',{...t(D),body:{reason:'SPAM'}}))===404,'report on a missing room is the same 404');
  ok(Number((await q('SELECT COUNT(*)::int n FROM howdi_connect_live_moderation_queue WHERE community_id=$1',[pl]))[0].n)===before,'the moderation queue was not polluted');
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Pub Live '+tag,communityType:'LIVE',privacy:'PUBLIC'}});const lv=r.json.community.id;
  await api('POST','/api/connect/realtime/'+lv+'/start',{...t(A),body:{}});await api('POST','/api/connect/realtime/'+lv+'/join',{...t(D),body:{}});await api('POST','/api/connect/realtime/'+lv+'/join',{...t(E),body:{}});
  ok(S(await api('POST','/api/connect/live/'+lv+'/report',{...t(D),body:{reason:'SPAM',targetUserId:eR}}))===201,'a viewer can report someone who is in the room');
  ok(S(await api('POST','/api/connect/live/'+lv+'/report',{...t(D),body:{reason:'SPAM',targetUserId:cR}}))===400,'reporting a member who is not in the room is a 400');
  // LIVE premium/subscribers-only is enforced at join (not only for Spaces)
  ok(S(await api('PATCH','/api/connect/spaces/'+lv+'/subscriber-only',{...t(A),body:{enabled:true}}))===200,'host makes the live subscribers-only');
  ok(S(await api('POST','/api/connect/realtime/'+lv+'/join',{...t(C),body:{}}))===403,'a non-subscriber cannot join a subscribers-only live');
  ok(S(await api('POST','/api/connect/realtime/'+lv+'/join',{...t(A),body:{}}))===200,'the host still joins their own live');

  // ---- 6. JSON null / primitive bodies never crash a Connect route
  for(const [m,p] of [['POST','/api/connect/posts'],['POST','/api/connect/stories'],['POST','/api/connect/calls'],['PATCH','/api/connect/profile/settings'],['POST','/api/connect/conversations']]){
    for(const b of [null,7,'x',true,[]]){const x=await api(m,p,{...t(D),body:b});ok(x.status<500,m+' '+p+' with body '+JSON.stringify(b)+' -> '+x.status);}
  }
  // ---- 7. network graph / relationship intelligence: people carry an opaque user_id (never a raw `id`), and the follow-ups work with it
  await pool.query('UPDATE howdi_connect_profiles SET discoverable=TRUE');
  for(const path of ['/api/connect/network-graph','/api/connect/relationship-intelligence']){
    r=await api('GET',path,t(D));ok(S(r)===200,path+' ok');
    const people=r.json.people||[];ok(people.length>0,path+' lists members');
    ok(people.every(p=>!('id' in p)&&Number(p.user_id)>0),path+' people expose only an opaque user_id');
    const raw=new Set([A,B,C,D,E].map(u=>u.id));ok(people.every(p=>!raw.has(Number(p.user_id))||Number(p.user_id)===D.id),path+' user_id is never another member\'s raw id');
    const target=people.find(p=>p.public_username===A.username)||people[0];
    const g=await api('POST','/api/connect/gratitude',{...t(D),body:{toUserId:target.user_id,creditCount:1,message:'thanks'}});ok(S(g)<400,'gratitude to a listed member works ('+S(g)+' '+g.text.slice(0,80)+')');
    const lp=await api('POST','/api/connect/learning-partner',{...t(D),body:{partnerUserId:target.user_id,partnerType:'STUDY_BUDDY'}});ok(S(lp)<400,'learning-partner request to a listed member works ('+S(lp)+' '+lp.text.slice(0,80)+')');
    const rb=await api('POST','/api/connect/relationship/rebuild',{...t(D),body:{otherUserId:target.user_id}});ok(S(rb)<400,'relationship rebuild for a listed member works ('+S(rb)+' '+rb.text.slice(0,80)+')');
  }
  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

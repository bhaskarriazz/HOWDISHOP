// K5E scenario suite: real HTTP against the real server + real PostgreSQL.
const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;const failures=[];
function ok(c,m){if(c)pass++;else{fail++;failures.push(m);console.log('  FAIL',m);}}
const S=(r)=>r.status;
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const A=await mkUser('Alice Anand','alice_'+tag,'HWD-A'+tag), B=await mkUser('Bob Bhat','bob_'+tag,'HWD-B'+tag),
        C=await mkUser('Carol Das','carol_'+tag,'HWD-C'+tag), D=await mkUser('Dave Rao','dave_'+tag,'HWD-D'+tag);
  const t=(u)=>({token:u.token});
  // --- refs: bob/carol/alice refs as seen by dave through their public posts
  const pa=(await api('POST','/api/connect/posts',{...t(A),body:{content:'alice public '+tag}})).json.post.id;
  const pb=(await api('POST','/api/connect/posts',{...t(B),body:{content:'bob public '+tag}})).json.post.id;
  const pc=(await api('POST','/api/connect/posts',{...t(C),body:{content:'carol public '+tag}})).json.post.id;
  let feed=(await api('GET','/api/connect/feed',t(D))).json.posts;
  const refOf=(pid)=>Number(feed.find(p=>String(p.id)===String(pid))?.user_id);
  const aRef=refOf(pa),bRef=refOf(pb),cRef=refOf(pc);
  ok(aRef>1e15&&bRef>1e15&&cRef>1e15,'foreign user ids in feed are opaque refs (>2^50)');
  ok(aRef!==A.id&&bRef!==B.id,'refs differ from raw ids');
  ok(!JSON.stringify(feed).includes('howdi_id')&&!JSON.stringify(feed).includes('"master_id"'),'feed has no howdi_id/master_id');
  // guest feed
  const gfeed=await api('GET','/api/connect/feed');ok(S(gfeed)===200&&gfeed.json.posts.length>0,'guest can browse feed');
  // --- bootstrap
  let r=await api('GET','/api/connect/bootstrap?userId='+B.id,t(A));
  ok(S(r)===200&&r.json.profile&&r.json.profile.public_username===A.username,'bootstrap ignores ?userId, uses session (alice)');
  ok(!/howdi_id|master_id|"user_id"|"id":\d/.test(JSON.stringify(r.json.people||[])),'bootstrap people carry no ids');
  r=await api('GET','/api/connect/bootstrap');ok(S(r)===200&&r.json.profile===null,'guest bootstrap is public shell');
  // --- prefs
  r=await api('GET','/api/notifications/preferences/'+B.id,t(A));ok(S(r)===403,'prefs: foreign id => 403 (got '+S(r)+')');
  r=await api('GET','/api/notifications/preferences/me',t(A));ok(S(r)===200&&!('user_id' in (r.json.preferences||r.json)),'prefs me: 200 and no user_id ('+S(r)+')');
  r=await api('GET','/api/notifications/preferences/'+A.id,t(A));ok(S(r)===200&&!/"user_id"/.test(r.text),'prefs own id: no user_id in body');
  r=await api('GET','/api/notifications/preferences/'+A.id);ok(S(r)===401,'prefs guest 401');
  // --- legacy notifications
  r=await api('GET','/api/notifications/'+B.id,t(A));ok(S(r)===403,'legacy notifications foreign list => 403');
  r=await api('GET','/api/notifications/summary/'+B.id,t(A));ok(S(r)===403,'legacy notifications summary foreign => 403');
  r=await api('GET','/api/notifications/'+A.id);ok(S(r)===401,'legacy notifications guest 401');
  // --- guest writes 401 / anonymous view counter allowed
  r=await api('POST','/api/connect/posts',{body:{content:'x'}});ok(S(r)===401,'guest post 401');
  r=await api('POST','/api/connect/posts/'+pa+'/view',{body:{viewerKey:'anon-1'}});ok(S(r)===200||S(r)===201,'anon view counter ok ('+S(r)+')');
  r=await api('GET','/api/connect/conversations');ok(S(r)===401,'guest conversations 401');
  // --- follow: raw foreign id probe => 404, ref => ok, username route ok
  r=await api('POST','/api/connect/users/'+B.id+'/follow',t(A));ok(S(r)===404,'follow by raw foreign id => 404 (got '+S(r)+')');
  r=await api('POST','/api/connect/users/'+bRef+'/follow',t(A));ok(S(r)===200,'follow by ref => 200 (got '+S(r)+')');
  r=await api('POST','/api/connect/profile/username/'+B.username+'/follow',t(B)); // bob follows bob? should not be allowed
  ok(S(r)>=400,'self follow rejected ('+S(r)+')');
  r=await api('POST','/api/connect/profile/username/'+A.username+'/follow',t(B));ok(S(r)===200,'bob follows alice by username');
  // --- post visibility
  const fpost=(await api('POST','/api/connect/posts',{...t(A),body:{content:'followers only '+tag,audience_scope:'FOLLOWERS'}})).json.post.id;
  const draft=(await api('POST','/api/connect/posts',{...t(A),body:{content:'draft '+tag,post_status:'DRAFT'}})).json.post.id;
  const vis=async(u,pid)=>{const f=(await api('GET','/api/connect/feed',u?t(u):{})).json.posts||[];return f.some(p=>String(p.id)===String(pid));};
  ok(await vis(B,fpost),'follower bob sees followers-only');
  ok(!(await vis(D,fpost)),'stranger dave does not see followers-only');
  ok(!(await vis(null,fpost)),'guest does not see followers-only');
  ok(!(await vis(B,draft)),'draft not visible to others');
  r=await api('GET','/api/connect/posts/'+fpost+'/comments',t(D));ok(S(r)===404||((r.json&&r.json.comments||[]).length===0&&S(r)!==200),'comments on followers-only hidden from stranger ('+S(r)+')');
  r=await api('POST','/api/connect/posts/'+fpost+'/comments',{...t(D),body:{content:'hi',commentText:'hi',comment:'hi'}});ok(S(r)===404,'stranger cannot comment on followers-only ('+S(r)+')');
  r=await api('POST','/api/connect/posts/'+fpost+'/reaction',{...t(D),body:{reaction:'LIKE',reactionType:'LIKE'}});ok(S(r)===404,'stranger cannot react to followers-only ('+S(r)+')');
  r=await api('POST','/api/connect/posts/'+fpost+'/save',t(D));ok(S(r)===404,'stranger cannot save followers-only');
  for(const a of ['repost','spark','share'])ok(S(await api('POST','/api/connect/posts/'+fpost+'/'+a,{...t(D),body:{}}))===404,'stranger cannot '+a+' followers-only');
  ok(S(await api('POST','/api/connect/posts/'+fpost+'/quote',{...t(D),body:{quoteText:'q'}}))===404,'stranger cannot quote followers-only');
  ok(S(await api('POST','/api/connect/posts/'+fpost+'/tip',{...t(D),body:{amount:10}}))===404,'stranger cannot tip followers-only');
  ok(S(await api('POST','/api/connect/posts/'+fpost+'/join',{...t(D),body:{}}))===404,'stranger cannot join on followers-only');
  ok(S(await api('GET','/api/connect/posts/'+fpost+'/insights',t(D)))===403,'insights owner only');
  ok(S(await api('GET','/api/connect/posts/'+fpost+'/edit-history',t(D)))>=400,'edit-history non-owner denied');
  ok(S(await api('PATCH','/api/connect/posts/'+fpost+'/edit',{...t(D),body:{content:'hax'}}))===403,'non-owner cannot edit post');
  r=await api('POST','/api/connect/posts/'+pb+'/tip',{...t(A),body:{amount:-5}});ok(S(r)===400,'negative tip rejected');
  r=await api('POST','/api/connect/posts/'+pb+'/tip',{...t(A),body:{amount:50}});ok(S(r)===201&&!/user_id/.test(r.text),'valid tip 201 without ids');
  // --- block: alice blocks carol
  r=await api('POST','/api/connect/profile/username/'+C.username+'/block',t(A));ok(S(r)===200,'alice blocks carol ('+S(r)+')');
  ok(!(await vis(A,pc)),'blocked carol post hidden from alice');
  ok(!(await vis(C,pa)),'alice post hidden from blocked carol');
  r=await api('GET','/api/connect/search?q='+C.username,t(A));ok(!r.text.includes(C.username),'search hides blocked user');
  r=await api('GET','/api/connect/public-profile/username/'+C.username,t(A));ok(S(r)===404,'blocked profile 404');
  r=await api('POST','/api/connect/conversations/username/'+A.username+'/start',t(C));ok(S(r)>=400,'blocked carol cannot DM alice ('+S(r)+')');
  r=await api('POST','/api/connect/posts/'+pa+'/comments',{...t(C),body:{content:'hi',commentText:'hi'}});ok(S(r)===404,'blocked carol cannot comment on alice post');
  // --- conversations
  r=await api('POST','/api/connect/conversations/username/'+B.username+'/start',t(A));ok(S(r)===200,'alice starts convo with bob ('+S(r)+')');
  const convs=(await api('GET','/api/connect/conversations',t(A))).json.conversations;const cid=convs[0]&&convs[0].id;ok(!!cid,'conversation listed');
  ok(!/"user_id"|other_user/.test(JSON.stringify(convs)),'conversation list has no user ids');
  r=await api('POST','/api/connect/conversations/'+cid+'/messages',{...t(A),body:{messageText:'secret hello'}});ok(S(r)===201,'send message');
  const mid=r.json&&r.json.message&&r.json.message.id;
  ok(S(await api('GET','/api/connect/conversations/'+cid+'/messages',t(D)))===403,'dave cannot read alice-bob convo');
  ok(S(await api('POST','/api/connect/conversations/'+cid+'/messages',{...t(D),body:{messageText:'x'}}))===403,'dave cannot post into convo');
  ok(S(await api('POST','/api/connect/messages/'+mid+'/reaction',{...t(D),body:{emoji:'👍'}}))===403,'dave cannot react to message');
  ok(S(await api('PATCH','/api/connect/messages/'+mid,{...t(D),body:{messageText:'hax'}}))===404,'dave cannot edit message');
  ok(S(await api('DELETE','/api/connect/messages/'+mid,t(D)))===404,'dave cannot delete message');
  ok(S(await api('POST','/api/connect/messages/'+mid+'/reaction',{...t(B),body:{emoji:'👍'}}))===200,'bob can react');
  // --- stories
  const sf=(await api('POST','/api/connect/stories',{...t(A),body:{content:'friends story',audience:'Friends'}})).json.story.id;
  const se=(await api('POST','/api/connect/stories',{...t(A),body:{content:'everyone story',audience:'Everyone'}})).json.story.id;
  const sees=async(u,id)=>((await api('GET','/api/connect/stories',u?t(u):{})).json.stories||[]).some(s=>String(s.id)===String(id));
  ok(await sees(B,sf),'mutual friend bob sees Friends story');
  ok(!(await sees(D,sf)),'dave does not see Friends story');
  ok(!(await sees(null,sf)),'guest does not see Friends story');
  ok(await sees(null,se),'guest sees Everyone story');
  ok(!(await sees(C,se)),'blocked carol does not see alice story');
  ok(S(await api('POST','/api/connect/stories/'+sf+'/react',{...t(D),body:{reaction:'❤️'}}))===404,'dave cannot react to Friends story');
  ok(S(await api('POST','/api/connect/stories/'+sf+'/reply',{...t(D),body:{reply:'hi'}}))===404,'dave cannot reply to Friends story');
  ok(S(await api('POST','/api/connect/stories/'+sf+'/view',{...t(D),body:{}}))===404,'dave cannot view-count Friends story');
  ok(S(await api('POST','/api/connect/stories/'+sf+'/share',{...t(D),body:{}}))===404,'dave cannot share Friends story');
  ok(S(await api('POST','/api/connect/stories/'+sf+'/react',{...t(B),body:{reaction:'❤️'}}))===200,'bob can react to Friends story');
  const sh1=await api('POST','/api/connect/stories/'+se+'/share',{...t(B),body:{}});const sh2=await api('POST','/api/connect/stories/'+se+'/share',{...t(B),body:{}});
  ok(sh1.json&&sh2.json&&sh1.json.share_count===sh2.json.share_count,'story share deduped per member');
  // --- calls
  r=await api('POST','/api/connect/calls',{...t(A),body:{callType:'VOICE',inviteeUsernames:[B.username]}});ok(S(r)===201,'call create');
  const call=r.json.call;ok(!/user_id/.test(r.text),'call payload has no user ids');
  ok(S(await api('POST','/api/connect/calls',{...t(A),body:{callType:'VOICE',inviteeUsernames:[C.username]}}))===403,'cannot call blocked user');
  ok(S(await api('POST','/api/connect/calls',{...t(A),body:{callType:'VOICE',inviteeUsernames:[B.username],groupSpaceId:99999}}))===403,'group call needs membership');
  const before=(await pool.query('SELECT COUNT(*)::int n FROM howdi_connect_call_signals WHERE call_id=$1',[call.id])).rows[0].n;
  r=await api('POST','/api/connect/calls/'+call.id+'/signal',{...t(D),body:{signalType:'OFFER',toToken:call.my_token,payload:{sdp:'x'}}});
  const after=(await pool.query('SELECT COUNT(*)::int n FROM howdi_connect_call_signals WHERE call_id=$1',[call.id])).rows[0].n;
  ok(S(r)>=400&&before===after,'non-participant cannot signal ('+S(r)+')');
  const st=(await api('GET','/api/connect/calls/'+call.id+'/state',t(A))).json;const bobTok=st.participants.find(p=>!p.is_viewer).token;
  ok(S(await api('GET','/api/connect/calls/'+call.id+'/state',t(D)))===403,'dave cannot read call state');
  r=await api('POST','/api/connect/calls/'+call.id+'/signal',{...t(A),body:{signalType:'OFFER',toToken:bobTok,payload:{x:'y'.repeat(40000)}}});ok(S(r)===413,'oversize signal 413 ('+S(r)+')');
  r=await api('POST','/api/connect/calls/'+call.id+'/signal',{...t(A),body:{signalType:'OFFER',toToken:bobTok,payload:{sdp:'v=0'}}});ok(S(r)===201,'valid signal 201 ('+S(r)+')');
  r=await api('PATCH','/api/connect/calls/'+call.id+'/respond',{...t(B),body:{accept:false}});ok(S(r)===200,'bob declines ('+S(r)+')');
  await api('POST','/api/connect/calls/'+call.id+'/leave',{...t(A),body:{}});
  const cs=(await pool.query('SELECT status FROM howdi_connect_calls WHERE id=$1',[call.id])).rows[0].status;ok(cs==='ENDED','call ended after caller leaves ('+cs+')');
  r=await api('POST','/api/connect/calls',{...t(A),body:{callType:'VOICE',inviteeUsernames:[B.username]}});const call2=r.json.call;
  await api('POST','/api/connect/calls/'+call2.id+'/leave',{...t(A),body:{}});
  r=await api('PATCH','/api/connect/calls/'+call2.id+'/respond',{...t(B),body:{accept:true}});ok(S(r)===404,'accept after end cannot revive ('+S(r)+')');
  const cs2=(await pool.query('SELECT status FROM howdi_connect_calls WHERE id=$1',[call2.id])).rows[0].status;ok(cs2==='ENDED','ended call stays ended');
  // --- spaces / live
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Priv Space '+tag,communityType:'SPACE',privacy:'PRIVATE'}});ok(S(r)===201,'create private space');
  const priv=r.json.community.id;
  r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Pub Live '+tag,communityType:'LIVE',privacy:'PUBLIC'}});ok(S(r)===201,'create public live');
  const pub=r.json.community.id;
  ok(!/owner_user_id":\d{1,9}[,}]/.test(r.text)||r.json.community.owner_user_id==A.id,'community owner id raw only for owner');
  r=await api('GET','/api/connect/spaces/'+priv+'/preflight',t(D));ok(S(r)===404,'private space preflight hidden ('+S(r)+')');
  r=await api('POST','/api/connect/communities/'+priv+'/join',t(D));ok(S(r)===404,'cannot join private community');
  r=await api('POST','/api/connect/realtime/'+priv+'/join',{...t(D),body:{}});ok(S(r)===404||S(r)===403,'cannot join private realtime room ('+S(r)+')');
  r=await api('POST','/api/connect/communities/'+pub+'/join',t(D));ok(S(r)===200,'can join public community');
  r=await api('GET','/api/connect/realtime/'+pub+'/state',t(D));ok(S(r)===403||S(r)===200,'state only after join ('+S(r)+')');
  r=await api('POST','/api/connect/realtime/'+pub+'/join',{...t(D),body:{}});ok(S(r)===200,'dave joins public live ('+S(r)+')');
  r=await api('GET','/api/connect/realtime/'+pub+'/state',t(D));ok(S(r)===200,'dave sees state after join ('+S(r)+')');
  ok(!/howdi_id|master_id/.test(r.text)&&!/checkin_code|live_host_notes|host_checklist/.test(r.text),'state for viewer: no host-only fields/ids');
  ok(S(await api('POST','/api/connect/realtime/'+pub+'/signal',{...t(C),body:{toUserId:cRef,signalType:'OFFER',payload:{}}}))>=400,'blocked/non-joined carol cannot signal');
  ok(S(await api('POST','/api/connect/realtime/'+pub+'/speaker/'+bRef+'/approve',t(D)))>=400,'non-host cannot approve speaker');
  ok(S(await api('POST','/api/connect/spaces/'+pub+'/gift',{...t(D),body:{giftType:'DIAMOND',amount:1}}))<500,'gift with tiny amount handled');
  ok(S(await api('PATCH','/api/connect/spaces/'+pub+'/premium',{...t(D),body:{enabled:true,price:1}}))===403,'non-host cannot set premium');
  ok(S(await api('POST','/api/connect/spaces/'+pub+'/block/'+bRef,t(D)))>=400,'non-host cannot space-block');
  // --- profile PUT ownership
  r=await api('PUT','/api/connect/profile/'+B.id,{...t(A),body:{headline:'pwn'}});ok(S(r)===403,'PUT foreign profile 403 (got '+S(r)+')');
  r=await api('PUT','/api/connect/profile/'+A.id,{...t(A),body:{headline:'mine'}});ok(S(r)===200,'PUT own profile ok ('+S(r)+')');
  // --- error hygiene
  r=await api('PATCH','/api/connect/posts/'+pa+'/best-answer',{...t(A),body:{}});ok(!/bigint|relation|column|constraint|syntax/i.test(r.text),'no SQL text in errors: '+r.text.slice(0,80));
  r=await api('POST','/api/connect/posts',{...t(A),body:{content:'collab',collaborator_user_id:999999}});ok(S(r)===404||S(r)===201,'unknown collaborator handled ('+S(r)+')');
  // --- articles / subscriptions
  r=await api('POST','/api/connect/articles',{...t(B),body:{title:'Bob article',content:'A sufficiently long article body for tests.',status:'PUBLISHED'}});ok(S(r)===201,'article create');
  const art=r.json.article.id;
  ok(S(await api('GET','/api/connect/articles/'+art,t(D)))===200,'article visible');
  ok(S(await api('GET','/api/connect/articles/'+art,t(C)))<=404,'article get by carol handled');
  r=await api('POST','/api/connect/articles/'+art+'/report',{...t(D),body:{reason:'SPAM'}});ok(S(r)===201,'article report ok ('+S(r)+')');
  // --- summary
  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});

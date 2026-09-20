const {pool,api,mkUser}=require('./lib.cjs');
let pass=0,fail=0;function ok(c,m){if(c)pass++;else{fail++;console.log('  FAIL',m);}}
const S=r=>r.status;
(async()=>{
  const tag=Date.now().toString(36).slice(-5);
  const A=await mkUser('Alice Anand','alice_'+tag,'HWD-A'+tag),B=await mkUser('Bob Bhat','bob_'+tag,'HWD-B'+tag),C=await mkUser('Carol Das','carol_'+tag,'HWD-C'+tag),D=await mkUser('Dave Rao','dave_'+tag,'HWD-D'+tag);
  const t=u=>({token:u.token});
  // refs
  for(const [u,n] of [[A,'a'],[B,'b'],[C,'c']])await api('POST','/api/connect/posts',{...t(u),body:{content:n+' post '+tag}});
  const feed=(await api('GET','/api/connect/feed',t(D))).json.posts;const refFor=(name)=>Number(feed.find(p=>p.content.startsWith(name))?.user_id);
  const aRef=refFor('a post'),bRef=refFor('b post'),cRef=refFor('c post'),dRef=null;
  // space
  let r=await api('POST','/api/connect/communities',{...t(A),body:{name:'Space '+tag,communityType:'SPACE',privacy:'PUBLIC',replayEnabled:true}});const sp=r.json.community.id;
  r=await api('POST','/api/connect/realtime/'+sp+'/start',{...t(A),body:{}});ok(S(r)===200,'host starts space ('+S(r)+')');
  r=await api('POST','/api/connect/realtime/'+sp+'/join',{...t(B),body:{role:'HOST'}});ok(S(r)===200,'bob joins ('+S(r)+')');
  let role=(await pool.query('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,B.id])).rows[0]?.participant_role;ok(role!=='HOST'&&role!=='COHOST','client cannot self-assign HOST via join ('+role+')');
  r=await api('POST','/api/connect/realtime/'+sp+'/join',{...t(A),body:{role:'VIEWER'}});
  role=(await pool.query('SELECT participant_role FROM howdi_connect_realtime_participants WHERE community_id=$1 AND user_id=$2',[sp,A.id])).rows[0]?.participant_role;ok(role==='HOST','host rejoin with VIEWER does not demote ('+role+')');
  // gift
  r=await api('POST','/api/connect/spaces/'+sp+'/gift',{...t(B),body:{giftCode:'DIAMOND',giftValue:1,amount:1,value:1}});ok(S(r)===201,'gift 201 ('+S(r)+')');
  const gv=(await pool.query('SELECT gift_value FROM howdi_connect_space_gifts WHERE community_id=$1 AND from_user_id=$2',[sp,B.id])).rows[0]?.gift_value;ok(Number(gv)===500,'gift value comes from catalogue (500), got '+gv);
  r=await api('POST','/api/connect/spaces/'+sp+'/gift',{...t(B),body:{giftCode:'MINT',giftValue:1000000}});ok(S(r)===400,'unknown gift rejected');
  r=await api('POST','/api/connect/spaces/'+sp+'/gift',{...t(D),body:{giftCode:'STAR'}});ok(S(r)===403,'non-participant cannot gift ('+S(r)+')');
  r=await api('POST','/api/connect/spaces/'+sp+'/gift',{...t(A),body:{giftCode:'STAR'}});ok(S(r)===400,'host cannot gift own space');
  // host actions by non-host
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/participant/'+bRef+'/kick',t(D)))>=400,'non-host cannot kick');
  ok(S(await api('POST','/api/connect/realtime/'+sp+'/participant/'+bRef+'/mute',t(B)))>=400,'participant cannot mute others');
  // host kicks bob -> heartbeat cannot revive
  r=await api('POST','/api/connect/realtime/'+sp+'/participant/'+bRef+'/kick',{...t(A),body:{}});ok(S(r)===200,'host kicks bob ('+S(r)+')');
  r=await api('POST','/api/connect/realtime/'+sp+'/heartbeat',{...t(B),body:{}});ok(S(r)===403,'kicked bob heartbeat cannot revive ('+S(r)+')');
  // gift after kick
  r=await api('POST','/api/connect/spaces/'+sp+'/gift',{...t(B),body:{giftCode:'STAR'}});ok(S(r)>=400,'kicked bob cannot gift ('+S(r)+')');
  // participants signals GET
  r=await api('GET','/api/connect/realtime/'+sp+'/signals',t(C));ok(S(r)>=400||((r.json.signals||[]).length===0),'non-participant signals empty/denied ('+S(r)+')');
  // replay
  r=await api('GET','/api/connect/spaces/'+sp+'/replay',t(D));ok(S(r)===404,'no replay yet => 404');
  r=await api('POST','/api/connect/spaces/'+sp+'/replay',{...t(D),body:{mediaData:'data:audio/webm;base64,AAAA'}});ok(S(r)===403,'non-host cannot save replay ('+S(r)+')');
  r=await api('POST','/api/connect/spaces/'+sp+'/replay',{...t(A),body:{mediaData:'data:audio/webm;base64,AAAA',durationSeconds:5}});ok(S(r)===201,'host saves replay ('+S(r)+')');
  r=await api('GET','/api/connect/spaces/'+sp+'/replay',t(D));ok(S(r)===200&&!/howdi_id/.test(r.text),'replay visible for public space ('+S(r)+')');
  await api('PATCH','/api/connect/spaces/'+sp+'/premium',{...t(A),body:{enabled:true,price:99}});
  r=await api('GET','/api/connect/spaces/'+sp+'/replay',t(D));ok(S(r)===402,'premium space replay gated ('+S(r)+')');
  r=await api('GET','/api/connect/spaces/'+sp+'/replay',t(A));ok(S(r)===200,'owner still sees premium replay');
  // private profile & follow requests
  r=await api('PUT','/api/connect/profile/'+C.id,{...t(C),body:{privateProfile:true,private_profile:true,storyAudience:'Everyone',messageMode:'Keep'}});ok(S(r)===200,'carol goes private ('+S(r)+')');
  r=await api('POST','/api/connect/users/'+cRef+'/follow',t(D));ok(S(r)===200,'dave requests follow carol ('+S(r)+') '+(r.json&&r.json.status));
  r=await api('GET','/api/connect/follow-requests',t(C));const req=(r.json.requests||[])[0];ok(!!req,'carol sees pending request');
  ok(!/howdi_id|master_id/.test(r.text)&&Number(req&&req.requester_user_id)>1e15,'follow-request requester is an opaque ref');
  r=await api('PATCH','/api/connect/follow-requests/'+D.id+'/respond',{...t(C),body:{accept:true}});const rNone=await api('PATCH','/api/connect/follow-requests/987654/respond',{...t(C),body:{accept:true}});ok(S(r)===S(rNone)&&S(r)>=400,'respond by raw id indistinguishable from unknown id ('+S(r)+' vs '+S(rNone)+')');
  r=await api('PATCH','/api/connect/follow-requests/'+req.requester_user_id+'/respond',{...t(C),body:{accept:true}});ok(S(r)===200,'respond by ref works ('+S(r)+')');
  r=await api('PATCH','/api/connect/follow-requests/'+req.requester_user_id+'/respond',{...t(A),body:{accept:true}});ok(S(r)===404,'a third member (not the target) cannot respond to carol\'s request ('+S(r)+')');
  ok(((await pool.query('SELECT 1 FROM howdi_connect_follows WHERE follower_user_id=$1 AND following_user_id=$2',[D.id,A.id])).rows.length)===0,'no follow edge was created towards the third member');
  // public profile by ref/raw
  r=await api('GET','/api/connect/public-profile/'+B.id,t(A));ok(S(r)===404,'public-profile raw foreign id 404 ('+S(r)+')');
  r=await api('GET','/api/connect/public-profile/'+bRef,t(A));ok(S(r)===200&&!/howdi_id|master_id/.test(r.text),'public-profile by ref ok ('+S(r)+')');
  r=await api('GET','/api/connect/public-profile/username/'+B.username);ok(S(r)===200&&!/howdi_id|master_id/.test(r.text),'guest public-profile by username ok ('+S(r)+')');
  // profiles/:ref private surfaces
  r=await api('GET','/api/connect/profiles/'+bRef+'/skill-passport',t(A));ok(S(r)<500,'skill-passport by ref handled ('+S(r)+')');
  r=await api('GET','/api/connect/profiles/'+B.id+'/trust-trail',t(A));ok(S(r)===404||S(r)===403||((r.json.events||[]).length===0),'trust-trail raw id yields nothing ('+S(r)+')');
  // groups
  r=await api('POST','/api/connect/groups-channels',{...t(A),body:{name:'Grp '+tag,spaceType:'GROUP',privacy:'PUBLIC',description:'d'}});ok(S(r)===201||S(r)===200,'group create ('+S(r)+') '+r.text.slice(0,120));
  const gid=r.json&&(r.json.space?.id||r.json.group?.id||r.json.id);
  if(gid){
    r=await api('GET','/api/connect/groups-channels',t(D));ok(S(r)===200&&!/owner_user_id|howdi_id/.test(r.text.replace(/"owner_user_id":\d{16}/g,'')),'group list has no raw owner ids');
    r=await api('POST','/api/connect/groups-channels/'+gid+'/join',{...t(D),body:{}});ok(S(r)===200,'dave joins group ('+S(r)+')');
    r=await api('POST','/api/connect/groups-channels/'+gid+'/messages',{...t(D),body:{body:'hello group'}});ok(S(r)===201,'member posts ('+S(r)+')');
    r=await api('GET','/api/connect/groups-channels/'+gid+'/messages',t(C));ok(S(r)===200,'public group messages readable by signed-in non-member (deliberate preview)');
    r=await api('POST','/api/connect/groups-channels',{...t(A),body:{name:'Priv '+tag,spaceType:'GROUP',privacy:'PRIVATE',description:'d'}});const pg=r.json&&(r.json.space?.id||r.json.group?.id||r.json.id);
    if(pg){r=await api('GET','/api/connect/groups-channels/'+pg+'/messages',t(C));ok(S(r)===403,'private group messages denied to non-member ('+S(r)+')');r=await api('GET','/api/connect/groups-channels/'+pg+'/members',t(C));ok(S(r)===403,'private group members denied ('+S(r)+')');r=await api('POST','/api/connect/groups-channels/'+pg+'/messages',{...t(C),body:{body:'x'}});ok(S(r)===403,'non-member cannot post to private group');}
  }
  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

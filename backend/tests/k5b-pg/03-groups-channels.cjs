'use strict';
const L=require('./lib.cjs');
const res=(r)=>r.json?.results||[];
const slugs=(r)=>res(r).map(x=>x.public_key);
const ok=(r)=>r.status===200&&r.json?.status==='success';
const keys=(o)=>JSON.stringify(Object.keys(o||{}).sort());
const secrets=(...us)=>us.flatMap(u=>[u.id,u.email,u.phone,u.howdi,u.master]);
(async()=>{const started=await L.start();L.check('server starts on fresh database',started,L.serverLog().slice(-600));if(!started)return L.finish('k5b groups channels');
  L.reserveIds(3000);
  const A={isActive:true,accountStatus:'ACTIVE',discoverable:true,privateProfile:false};
  const viewer=await L.member('K5B Space Viewer',{...A,username:'k5bsp_viewer'});
  const owner=await L.member('K5B Space Owner',{...A,username:'k5bsp_owner'});
  const suspended=await L.member('K5B Space Suspended',{...A,username:'k5bsp_susp_owner',accountStatus:'SUSPENDED'});
  const inactive=await L.member('K5B Space Inactive',{...A,username:'k5bsp_inact_owner',isActive:false});
  const blocked=await L.member('K5B Space Blocked',{...A,username:'k5bsp_blocked_owner'});
  const blocker=await L.member('K5B Space Blocker',{...A,username:'k5bsp_blocker_owner'});
  await L.block(viewer,blocked);await L.block(blocker,viewer);
  const set=(s,sql,vals=[])=>L.pool.query(`UPDATE howdi_connect_social_spaces SET ${sql} WHERE id=$1`,[s.id,...vals]);
  const gPublic=await L.community(owner,'K5BSP Potters Guild','k5bsp-potters');await set(gPublic,'category=$2',['K5BSP Ceramics']);
  const cPublic=await L.community(owner,'K5BSP Kiln News','k5bsp-kiln-news',{type:'CHANNEL'});
  const gArchived=await L.community(owner,'K5BSP Archived Guild','k5bsp-archived');await set(gArchived,'is_archived=TRUE');
  const gPrivate=await L.community(owner,'K5BSP Private Guild','k5bsp-private',{privacy:'PRIVATE'});
  const gInvite=await L.community(owner,'K5BSP Invite Guild','k5bsp-invite',{privacy:'INVITE_ONLY'});
  const cPrivate=await L.community(owner,'K5BSP Private Channel','k5bsp-chan-private',{type:'CHANNEL',privacy:'PRIVATE'});
  await L.community(suspended,'K5BSP Suspended Guild','k5bsp-susp');
  await L.community(inactive,'K5BSP Inactive Guild','k5bsp-inactive');
  await L.community(blocked,'K5BSP Blocked Guild','k5bsp-blocked');
  await L.community(blocker,'K5BSP Blocker Guild','k5bsp-blocker');
  // ---------------- GROUPS
  let r=await L.search('groups','k5bsp');
  const g=res(r).find(x=>x.public_key==='k5bsp-potters');
  L.check('groups: public group returned',ok(r)&&!!g&&g.type==='group'&&g.name==='K5BSP Potters Guild'&&g.category==='K5BSP Ceramics'&&g.member_count===12&&g.route==='/groups/k5bsp-potters');
  L.check('groups: archived excluded',ok(r)&&!slugs(r).includes('k5bsp-archived'));
  L.check('groups: non-public (PRIVATE / INVITE_ONLY) excluded',!slugs(r).includes('k5bsp-private')&&!slugs(r).includes('k5bsp-invite'));
  L.check('groups: suspended / inactive owner excluded',!slugs(r).includes('k5bsp-susp')&&!slugs(r).includes('k5bsp-inactive'));
  L.check('groups: never return channels',res(r).every(x=>x.type==='group'&&x.route.startsWith('/groups/'))&&!slugs(r).includes('k5bsp-kiln-news')&&!slugs(r).includes('k5bsp-chan-private'));
  L.check('groups: guest still sees block-fixture owners (block rule is viewer-scoped)',slugs(r).includes('k5bsp-blocked')&&slugs(r).includes('k5bsp-blocker'));
  L.check('groups: DTO uses approved keys only',keys(g)===JSON.stringify(['category','member_count','name','public_key','route','type']));
  L.check('groups: no forbidden keys / private values',L.forbiddenKeys(res(r)).length===0&&L.leakedValues(r.text,[...secrets(owner,suspended,inactive,blocked,blocker),gPublic.id,gArchived.id,gPrivate.id,gInvite.id]).length===0&&!/"(PUBLIC|PRIVATE|INVITE_ONLY|GROUP|CHANNEL)"/.test(r.text));
  r=await L.search('groups','k5bsp',{token:viewer.token});
  L.check('groups: owner blocked by viewer excluded',ok(r)&&slugs(r).includes('k5bsp-potters')&&!slugs(r).includes('k5bsp-blocked'));
  L.check('groups: owner blocking viewer excluded',ok(r)&&!slugs(r).includes('k5bsp-blocker'));
  L.check('groups: category is searchable',slugs(await L.search('groups','ceramics')).includes('k5bsp-potters'));
  L.check('groups: exact slug ranks first',slugs(await L.search('groups','k5bsp-potters'))[0]==='k5bsp-potters');
  // ---------------- CHANNELS
  r=await L.search('channels','k5bsp');
  const c=res(r).find(x=>x.public_key==='k5bsp-kiln-news');
  L.check('channels: public channel returned',ok(r)&&!!c&&c.type==='channel'&&c.name==='K5BSP Kiln News'&&c.route==='/channels/k5bsp-kiln-news');
  L.check('channels: non-public channel excluded',!slugs(r).includes('k5bsp-chan-private'));
  L.check('channels: never return groups',res(r).length===1&&res(r).every(x=>x.type==='channel'&&x.route.startsWith('/channels/')));
  L.check('channels: DTO uses approved keys only',keys(c)===JSON.stringify(['category','member_count','name','public_key','route','type']));
  L.check('channels: no forbidden keys / private values',L.forbiddenKeys(res(r)).length===0&&L.leakedValues(r.text,[...secrets(owner),cPublic.id,cPrivate.id]).length===0);
  // ---------------- RANKING (exact raw > prefix escaped > contains escaped), with "_" in the name.
  // Member counts run against the expected order so a recency/popularity tiebreak cannot produce it by accident;
  // equality on the LIKE-escaped query would drop the exact name into the prefix bucket behind the 500-member group.
  const rExact=await L.community(owner,'K5B_Circle','k5b-circle-a');await set(rExact,'member_count=1');
  const rPrefix=await L.community(owner,'K5B_Circle Extra','k5b-circle-b');await set(rPrefix,'member_count=500');
  const rContains=await L.community(owner,'The K5B_Circle Club','k5b-circle-c');await set(rContains,'member_count=900');
  await L.community(owner,'K5BXCircle Decoy','k5b-circle-decoy');
  r=await L.search('groups','K5B_Circle');
  L.check('ranking: exact "_" name > prefix > contains; "_" is literal, not a wildcard',ok(r)&&JSON.stringify(slugs(r))===JSON.stringify(['k5b-circle-a','k5b-circle-b','k5b-circle-c']),slugs(r));
  // ---------------- TYPE ROUTING
  for(const t of ['people','creators','posts','articles','vibes','groups','channels']){r=await L.search(t,'k5b');L.check('routing: type='+t+' accepted',ok(r)&&r.json?.type===t);}
  for(const t of ['bogus','group','channel']){r=await L.search(t,'k5b');L.check('routing: unknown type '+t+' => INVALID_TYPE',r.status===400&&r.json?.code==='INVALID_TYPE');}
  await L.finish('k5b groups channels');
})().catch(async e=>{console.error('K5B PG runtime error:',e);console.error('Backend log:',L.serverLog().slice(-3000));L.check('postgres groups/channels runtime completed without transport/server error',false,e?.message||String(e));await L.finish('k5b groups channels');});

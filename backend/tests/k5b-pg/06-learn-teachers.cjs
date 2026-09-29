'use strict';
const L=require('./lib.cjs');
const res=(r)=>r.json?.results||[];
const names=(r)=>res(r).map(x=>x.display_name);
const ok=(r)=>r.status===200&&r.json?.status==='success';
const keys=(o)=>JSON.stringify(Object.keys(o||{}).sort());
const secrets=(...us)=>us.flatMap(u=>[u.id,u.email,u.phone,u.howdi,u.master]);
let seq=0;
const course=async(title,{active=true,status='PUBLISHED'}={})=>(await L.pool.query(
  `INSERT INTO learning_courses(title,description,category,level,duration_minutes,is_active,publish_status,thumbnail_url) VALUES($1,'K5BT private course description','Craft','BEGINNER',90,$2,$3,'https://cdn.example/course.jpg') RETURNING id,title`,
  [title,active,status])).rows[0];
const teacher=async(user,{code,name,headline='K5BT crochet mentor',application='APPROVED',courseRow,assignment='ACTIVE',city='Bengaluru',skills=['Crochet'],specializations=['Handmade']}={})=>{
  const row=(await L.pool.query(`INSERT INTO learning_teacher_profiles(user_id,teacher_code,display_name,headline,bio,languages,skills,specializations,experience_years,city,application_status,verification_status)
    VALUES($1,$2,$3,$4,'K5BT private teacher bio','["English"]'::jsonb,$5::jsonb,$6::jsonb,5,$7,$8,$9) RETURNING id,teacher_code`,
    [user.id,code,name||user.name,headline,JSON.stringify(skills),JSON.stringify(specializations),city,application,application==='APPROVED'?'VERIFIED':'PENDING'])).rows[0];
  if(courseRow&&assignment)await L.pool.query(`INSERT INTO learning_teacher_course_assignments(teacher_profile_id,course_id,assignment_role,status) VALUES($1,$2,'TEACHER',$3)`,[row.id,courseRow.id,assignment]);
  return row;
};
(async()=>{const started=await L.start();L.check('server starts on fresh database',started,L.serverLog().slice(-600));if(!started)return L.finish('k5b learn teacher search');
  L.reserveIds(10000);
  const A={isActive:true,accountStatus:'ACTIVE',discoverable:true,privateProfile:false};
  const viewer=await L.member('K5BT Viewer',{...A,username:'k5bt_viewer'});
  const uVisible=await L.member('K5BT Asha',{...A,username:'k5bt_asha'});
  const uBlocked=await L.member('K5BT Blocked',{...A,username:'k5bt_blocked'});
  const uBlocker=await L.member('K5BT Blocker',{...A,username:'k5bt_blocker'});
  const uSusp=await L.member('K5BT Suspended',{...A,username:'k5bt_suspended',accountStatus:'SUSPENDED'});
  const uInactive=await L.member('K5BT Inactive',{...A,username:'k5bt_inactive',isActive:false});
  const uPrivate=await L.member('K5BT Private',{...A,username:'k5bt_private',privateProfile:true});
  const uHidden=await L.member('K5BT Hidden',{...A,username:'k5bt_hidden',discoverable:false});
  const uPending=await L.member('K5BT Pending',{...A,username:'k5bt_pending'});
  const uNoCourse=await L.member('K5BT No Course',{...A,username:'k5bt_nocourse'});
  const uInactiveAssign=await L.member('K5BT Inactive Assign',{...A,username:'k5bt_inactive_assign'});
  const uDraftCourse=await L.member('K5BT Draft Course',{...A,username:'k5bt_draft_course'});
  const uInactiveCourse=await L.member('K5BT Inactive Course',{...A,username:'k5bt_inactive_course'});
  const uUuid=await L.member('K5BT UUID',{...A,username:'k5bt_uuid'});
  const uNumeric=await L.member('K5BT Numeric',{...A,username:'k5bt_numeric'});
  await L.block(viewer,uBlocked);await L.block(uBlocker,viewer);
  const published=await course('K5BT Public Crochet');
  const draft=await course('K5BT Draft Crochet',{status:'DRAFT'});
  const inactive=await course('K5BT Inactive Crochet',{active:false});
  const T={};
  T.visible=await teacher(uVisible,{code:'HOWDI-TCH-K5BT01',name:'K5BT Asha Crochet',courseRow:published,city:'K5BT Secret City',skills:['K5BT Loom'],specializations:['K5BT Fiber']});
  T.blocked=await teacher(uBlocked,{code:'HOWDI-TCH-K5BT02',name:'K5BT Blocked Teacher',courseRow:published});
  T.blocker=await teacher(uBlocker,{code:'HOWDI-TCH-K5BT03',name:'K5BT Blocker Teacher',courseRow:published});
  T.susp=await teacher(uSusp,{code:'HOWDI-TCH-K5BT04',name:'K5BT Suspended Teacher',courseRow:published});
  T.inactiveUser=await teacher(uInactive,{code:'HOWDI-TCH-K5BT05',name:'K5BT Inactive User Teacher',courseRow:published});
  T.private=await teacher(uPrivate,{code:'HOWDI-TCH-K5BT06',name:'K5BT Private Teacher',courseRow:published});
  T.hidden=await teacher(uHidden,{code:'HOWDI-TCH-K5BT07',name:'K5BT Hidden Teacher',courseRow:published});
  T.pending=await teacher(uPending,{code:'HOWDI-TCH-K5BT08',name:'K5BT Pending Teacher',courseRow:published,application:'UNDER_REVIEW'});
  T.noCourse=await teacher(uNoCourse,{code:'HOWDI-TCH-K5BT09',name:'K5BT No Course Teacher'});
  T.inactiveAssign=await teacher(uInactiveAssign,{code:'HOWDI-TCH-K5BT10',name:'K5BT Inactive Assign Teacher',courseRow:published,assignment:'INACTIVE'});
  T.draftCourse=await teacher(uDraftCourse,{code:'HOWDI-TCH-K5BT11',name:'K5BT Draft Course Teacher',courseRow:draft});
  T.inactiveCourse=await teacher(uInactiveCourse,{code:'HOWDI-TCH-K5BT12',name:'K5BT Inactive Course Teacher',courseRow:inactive});
  T.uuid=await teacher(uUuid,{code:'550e8400-e29b-41d4-a716-446655440000',name:'K5BT UUID Teacher',courseRow:published});
  T.numeric=await teacher(uNumeric,{code:'123456789',name:'K5BT Numeric Teacher',courseRow:published});

  let r=await L.search('teachers','k5bt',{limit:20});
  const item=res(r).find(x=>x.public_key==='HOWDI-TCH-K5BT01');
  L.check('teachers: approved public-profile teacher on an active published course returned',ok(r)&&!!item&&item.type==='teacher'&&item.public_username==='k5bt_asha'&&item.display_name==='K5BT Asha Crochet'&&item.headline==='K5BT crochet mentor'&&item.course_count===1);
  L.check('teachers: public teacher code is the entity key; route is the existing public @profile',!!item&&item.public_key==='HOWDI-TCH-K5BT01'&&item.route==='/@k5bt_asha');
  L.check('teachers: DTO allow-list only',!!item&&keys(item)===JSON.stringify(['avatar_url','course_count','display_name','headline','public_key','public_username','route','type']));
  L.check('teachers: private profile hidden from guest',!res(r).some(x=>x.public_key==='HOWDI-TCH-K5BT06'));
  L.check('teachers: undiscoverable profile hidden',!res(r).some(x=>x.public_key==='HOWDI-TCH-K5BT07'));
  for(const [k,label] of [['susp','suspended user'],['inactiveUser','inactive user'],['pending','unapproved teacher'],['noCourse','teacher with no public course'],['inactiveAssign','inactive course assignment'],['draftCourse','draft course only'],['inactiveCourse','inactive course only']])
    L.check('teachers: '+label+' excluded',!res(r).some(x=>x.public_key===T[k].teacher_code),res(r).map(x=>x.public_key));
  L.check('teachers: UUID-shaped teacher_code rejected by public-code gate',res(await L.search('teachers','550e8400')).length===0);
  L.check('teachers: numeric-only teacher_code rejected by public-code gate',res(await L.search('teachers','123456789')).length===0);
  const guestNames=names(r);
  L.check('teachers: guest can see otherwise public blocked-direction teachers',guestNames.includes('K5BT Blocked Teacher')&&guestNames.includes('K5BT Blocker Teacher'));

  r=await L.search('teachers','k5bt',{token:viewer.token,limit:20});
  L.check('teachers: viewer-blocked teacher excluded',ok(r)&&!res(r).some(x=>x.public_key==='HOWDI-TCH-K5BT02'));
  L.check('teachers: teacher blocking viewer excluded',ok(r)&&!res(r).some(x=>x.public_key==='HOWDI-TCH-K5BT03'));
  L.check('teachers: visible teacher remains after block filters',res(r).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: search by teacher code',res(await L.search('teachers','HOWDI-TCH-K5BT01')).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: search by public username',res(await L.search('teachers','k5bt_asha')).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: search by display name',res(await L.search('teachers','Asha Crochet')).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: search by headline',res(await L.search('teachers','crochet mentor')).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: search by public teacher skill',res(await L.search('teachers','K5BT Loom')).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: search by specialization',res(await L.search('teachers','K5BT Fiber')).some(x=>x.public_key==='HOWDI-TCH-K5BT01'));
  L.check('teachers: city can match but is never returned',res(await L.search('teachers','K5BT Secret City')).some(x=>x.public_key==='HOWDI-TCH-K5BT01')&&!JSON.stringify(item).includes('K5BT Secret City'));
  L.check('teachers: no internal/profile/course/user secrets leak',L.forbiddenKeys(res(r)).length===0&&L.leakedValues(r.text,[...secrets(viewer,uVisible,uBlocked,uBlocker,uSusp,uInactive,uPrivate,uHidden,uPending,uNoCourse,uInactiveAssign,uDraftCourse,uInactiveCourse,uUuid,uNumeric),...Object.values(T).map(x=>x.id),published.id,draft.id,inactive.id,'K5BT private teacher bio','K5BT private course description','K5BT Secret City']).length===0,r.text);

  const rankCourse=await course('K5BT Ranking Course');
  const rx=await L.member('Rank Exact',{...A,username:'k5bt_z_rank_exact'}),rp=await L.member('Rank Prefix',{...A,username:'k5bt_a_rank_prefix'}),rc=await L.member('Rank Contains',{...A,username:'k5bt_b_rank_contains'}),rd=await L.member('Rank Decoy',{...A,username:'k5bt_c_rank_decoy'});
  await teacher(rx,{code:'HOWDI-TCH-RANK01',name:'K5BT_Teacher',courseRow:rankCourse});
  await teacher(rp,{code:'HOWDI-TCH-RANK02',name:'K5BT_Teacher Extra',courseRow:rankCourse});
  await teacher(rc,{code:'HOWDI-TCH-RANK03',name:'Big K5BT_Teacher Set',courseRow:rankCourse});
  await teacher(rd,{code:'HOWDI-TCH-RANK04',name:'K5BTXTeacher Decoy',courseRow:rankCourse});
  r=await L.search('teachers','K5BT_Teacher');
  L.check('teachers ranking: exact special-character display name > prefix > contains; underscore is literal',ok(r)&&JSON.stringify(res(r).map(x=>x.display_name))===JSON.stringify(['K5BT_Teacher','K5BT_Teacher Extra','Big K5BT_Teacher Set']),res(r).map(x=>x.display_name));

  for(const type of ['people','creators','posts','articles','vibes','groups','channels','products','workers','teachers']){const x=await L.search(type,'k5b');L.check('routing: type='+type+' accepted',ok(x)&&x.json?.type===type);}
  for(const type of ['courses','course','services','storefronts','teacher','bogus']){const x=await L.search(type,'k5b');L.check('routing: '+type+' => INVALID_TYPE',x.status===400&&x.json?.code==='INVALID_TYPE');}
  await L.finish('k5b learn teacher search');
})().catch(async e=>{console.error('K5B PG runtime error:',e);console.error('Backend log:',L.serverLog().slice(-3000));L.check('postgres learn teacher search runtime completed without transport/server error',false,e?.message||String(e));await L.finish('k5b learn teacher search');});

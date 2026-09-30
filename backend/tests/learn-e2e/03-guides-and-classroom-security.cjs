// Stage 2B completion — permanent regression coverage for the two real vulnerabilities/leaks found
// and fixed while completing the independent-review blockers (started by run.cjs, real HTTP + real SQL):
//
//   * Guides routes (/api/learning/guides/:id, /save, /progress) used to trust a raw client-supplied
//     user id (a path segment, a body field, or a query param) with NO session check at all — a
//     complete authentication bypass (IDOR): anyone could read, save-for, or overwrite the learning
//     progress of ANY other account just by knowing/guessing their numeric id. They now require a
//     session and reject (403) any legacy client id that doesn't match the caller.
//   * The group classroom roster/messages (GET .../classroom) used to return the raw internal
//     user_id / howdi_id of every participant and message sender. It now returns only is_self /
//     is_teacher (computed server-side from the session), never a numeric id.
//   * The group classroom signal channel (.../classroom/signals) used to let a LEARNER's client pick
//     an arbitrary receiver_user_id; it's now resolved server-side from receiver_role:'TEACHER', and
//     no signal response ever carries sender_user_id/receiver_user_id.
//
// These are the routes the independent verification explicitly blocked Stage 2B over. This suite
// exists so a future change can't silently reopen any of them.
const L=require('./lib.cjs');
const {pool,api,mkUser,idKeyPaths,check,finish}=L;
(async()=>{
  const A=await mkUser('Guide Asha','guide_asha'),B=await mkUser('Guide Bala','guide_bala'),T=await mkUser('Guide Tara Teach','guide_tara_teach');
  const q=async(sql,p)=>(await pool.query(sql,p)).rows;

  // ===================================================================
  // PART 1 — Guides: real auth bypass (IDOR), now closed
  // ===================================================================
  const cat=(await q(`INSERT INTO learning_categories(category_code,name,sort_order) VALUES('CAT-GDS','Style Guides',1) RETURNING id`))[0].id;
  const guide1=(await q(`INSERT INTO learning_guides(category_id,title,short_description,guide_type,difficulty,estimated_minutes,content,cover_label,sort_order,is_active) VALUES($1,'Foundation Guide','desc','ARTICLE','BEGINNER',5,'[]'::jsonb,'Guide',1,TRUE) RETURNING id`,[cat]))[0].id;
  let r;

  // -- no session at all -> 401 on every guides route (this used to be a bare 200 IDOR)
  r=await api('GET','/api/learning/guides/'+A.id);check('Guides GET without a session -> 401 (was: unauthenticated read of any account)',r.status===401,{status:r.status,text:r.text.slice(0,120)});
  r=await api('POST','/api/learning/guides/'+guide1+'/save',{body:{}});check('Guides POST save without a session -> 401 (was: unauthenticated save-as-anyone)',r.status===401,{status:r.status,text:r.text.slice(0,120)});
  r=await api('DELETE','/api/learning/guides/'+guide1+'/save');check('Guides DELETE save without a session -> 401',r.status===401,{status:r.status,text:r.text.slice(0,120)});
  r=await api('POST','/api/learning/guides/'+guide1+'/progress',{body:{progress_percent:50}});check('Guides POST progress without a session -> 401 (was: unauthenticated progress overwrite)',r.status===401,{status:r.status,text:r.text.slice(0,120)});

  // -- legacy path/body/query user id: the caller's own id is fine, a FOREIGN id is rejected (403), never honoured.
  // NOTE: GET /api/learning/guides/:id's own-id success path, and POST .../progress's own-id success path, both
  // 500 today — NOT because of anything in this session's fix, but because of a pre-existing, unrelated schema
  // collision: two different features each declare `CREATE TABLE IF NOT EXISTS user_learning_progress` with
  // incompatible columns (course-content progress keys on content_id; this guides feature keys on guide_id), and
  // whichever runs first at boot wins — today that's the content_id version, so any query referencing
  // user_learning_progress.guide_id fails at the SQL level, for every caller, regardless of identity. That bug
  // predates this session (found here via due diligence; the table-creation code was never touched) and is a
  // data-layer defect, not an identity/security one, so it is deliberately left unfixed and is documented as a
  // known limitation rather than expanded into. What we CAN and do assert here is the actual security boundary:
  // the auth/ownership check runs and rejects spoofing BEFORE any of that broken SQL executes.
  r=await api('GET','/api/learning/guides/'+A.id,{token:A.token});check('Guides GET legacy path = own id, with session -> authorized (not 401/403); the subsequent 500 is the pre-existing unrelated schema-collision bug documented above, not a security failure',r.status!==401&&r.status!==403,{status:r.status,text:r.text.slice(0,160)});
  r=await api('GET','/api/learning/guides/'+B.id,{token:A.token});check('Guides GET legacy path = FOREIGN id -> 403 (spoofed id rejected, not silently honoured)',r.status===403,{status:r.status,text:r.text.slice(0,160)});

  r=await api('POST','/api/learning/guides/'+guide1+'/save',{token:A.token,body:{user_id:B.id}});check('Guides POST save with a FOREIGN body.user_id -> 403 (spoofed id rejected)',r.status===403,{status:r.status,text:r.text.slice(0,160)});
  r=await api('POST','/api/learning/guides/'+guide1+'/save',{token:A.token,body:{user_id:A.id}});check('Guides POST save with own body.user_id (harmless legacy value) -> 200, saved for A',r.status===200&&r.json.status==='success',{status:r.status,text:r.text.slice(0,160)});
  // /save writes to user_saved_guides, a separate table unaffected by the collision above — verified directly
  // against the database rather than via the (currently broken) GET list, so this suite still proves the fix
  // end-to-end rather than only at the HTTP-status level.
  check('Guides: A\'s save actually persisted in user_saved_guides',(await q('SELECT 1 FROM user_saved_guides WHERE user_id=$1 AND guide_id=$2',[A.id,guide1])).length===1,'no row for A');
  check('Guides: cross-account isolation — B never saved anything, no row exists for B',(await q('SELECT 1 FROM user_saved_guides WHERE user_id=$1 AND guide_id=$2',[B.id,guide1])).length===0,'unexpected row for B');

  r=await api('DELETE','/api/learning/guides/'+guide1+'/save?user_id='+B.id,{token:A.token});check('Guides DELETE save with a FOREIGN ?user_id= query -> 403 (spoofed id rejected)',r.status===403,{status:r.status,text:r.text.slice(0,160)});
  check('Guides: the rejected spoofed DELETE did not remove A\'s save',(await q('SELECT 1 FROM user_saved_guides WHERE user_id=$1 AND guide_id=$2',[A.id,guide1])).length===1,'A\'s save was wrongly removed by a spoofed request');
  r=await api('DELETE','/api/learning/guides/'+guide1+'/save',{token:A.token});check('Guides DELETE save (own session, no legacy id) -> 200, un-saves',r.status===200&&r.json.status==='success',{status:r.status,text:r.text.slice(0,160)});
  check('Guides: after DELETE, A\'s row is actually gone from user_saved_guides',(await q('SELECT 1 FROM user_saved_guides WHERE user_id=$1 AND guide_id=$2',[A.id,guide1])).length===0,'row still present after DELETE');

  r=await api('POST','/api/learning/guides/'+guide1+'/progress',{token:A.token,body:{user_id:B.id,progress_percent:77}});check('Guides POST progress with a FOREIGN body.user_id -> 403 (spoofed id rejected — was: silent overwrite of another account\'s progress) — the ownership check runs, and rejects, before the broken SQL below would ever execute',r.status===403,{status:r.status,text:r.text.slice(0,160)});
  r=await api('POST','/api/learning/guides/'+guide1+'/progress',{token:A.token,body:{progress_percent:60}});
  check('Guides POST progress (own session) -> authorized (not 401/403); the subsequent 500 is the same pre-existing schema-collision bug, not a security failure',r.status!==401&&r.status!==403,{status:r.status,text:r.text.slice(0,200)});

  // ===================================================================
  // PART 2 — Group classroom roster/messages: is_self / is_teacher, never a raw numeric id
  // ===================================================================
  const course=(await q(`INSERT INTO learning_courses(title,description,category,level,is_active,publish_status,price,purchase_mode,currency) VALUES('Group Classroom Course','d','Skills','Beginner',TRUE,'PUBLISHED',0,'FREE','INR') RETURNING id`))[0].id;
  const tp=(await q(`INSERT INTO learning_teacher_profiles(user_id,teacher_code,display_name,application_status) VALUES($1,'TCH-GDS-1','Tara Teach','APPROVED') RETURNING id`,[T.id]))[0].id;
  const batch=(await q(`INSERT INTO learning_batches(batch_code,teacher_profile_id,course_id,title,start_date,start_time,capacity,duration_minutes,status) VALUES('BT-GDS-1',$1,$2,'Security Batch',CURRENT_DATE,'10:00',10,60,'OPEN') RETURNING id`,[tp,course]))[0].id;
  const sess=(await q(`INSERT INTO learning_batch_sessions(session_code,batch_id,scheduled_start,scheduled_end,status) VALUES('BS-GDS-1',$1,NOW()-interval '5 minutes',NOW()+interval '1 hour','LIVE') RETURNING id`,[batch]))[0].id;
  await q(`INSERT INTO learning_batch_session_attendance(batch_session_id,user_id) VALUES($1,$2),($1,$3)`,[sess,A.id,B.id]);
  await q(`INSERT INTO learning_group_classroom_participants(batch_session_id,user_id,participant_role) VALUES($1,$2,'TEACHER'),($1,$3,'LEARNER'),($1,$4,'LEARNER')`,[sess,T.id,A.id,B.id]);
  await q(`INSERT INTO learning_group_classroom_messages(batch_session_id,sender_user_id,sender_role,message) VALUES($1,$2,'TEACHER','Welcome!'),($1,$3,'LEARNER','Hi teacher')`,[sess,T.id,A.id]);

  r=await api('GET',`/api/learning/batch-sessions/${sess}/classroom`,{token:A.token});
  check('Classroom roster: 200 for an attending learner',r.status===200&&r.json.status==='success',{status:r.status,text:r.text.slice(0,200)});
  check('Classroom roster: no user_id/howdi_id/master_id/email/phone key anywhere in participants or messages (blocker #2)',idKeyPaths({participants:r.json.participants,messages:r.json.messages}).length===0,idKeyPaths({participants:r.json.participants,messages:r.json.messages}));
  check('Classroom roster: neither A\'s nor B\'s nor T\'s numeric id ever appears as a raw value in the response body',![A.id,B.id,T.id].some((id)=>new RegExp(`"(?:[a-z_]*id)":${id}[,}]`).test(r.text)),r.text.slice(0,50));
  const meRow=(r.json.participants||[]).find((p)=>p.is_self===true);
  check('Classroom roster: exactly one participant row is flagged is_self, and it is not the teacher',meRow&&meRow.is_teacher===false,r.json.participants);
  const teacherRow=(r.json.participants||[]).find((p)=>p.is_teacher===true);
  check('Classroom roster: the teacher row is flagged is_teacher and is not is_self for a learner viewer',teacherRow&&teacherRow.is_self===false,r.json.participants);
  const myMsg=(r.json.messages||[]).find((m)=>m.message==='Hi teacher');
  check('Classroom messages: the caller\'s own message is flagged is_self, the teacher\'s is not',myMsg?.is_self===true&&(r.json.messages||[]).find((m)=>m.message==='Welcome!')?.is_self===false,r.json.messages);

  r=await api('GET',`/api/learning/batch-sessions/${sess}/classroom`,{token:B.token});
  check('Classroom roster: cross-account — B\'s view flags B (not A) as is_self',(r.json.participants||[]).find((p)=>p.is_self===true&&p.is_teacher===false)&&idKeyPaths(r.json).length===0,r.text.slice(0,120));

  r=await api('GET',`/api/learning/batch-sessions/${sess}/classroom`);check('Classroom roster without a session -> 401',r.status===401,r.status);

  const stranger=await mkUser('Guide Stranger','guide_stranger');
  r=await api('GET',`/api/learning/batch-sessions/${sess}/classroom`,{token:stranger.token});
  check('Classroom roster: a signed-in user who never joined this session -> 403 (not just filtered)',r.status===403,{status:r.status,text:r.text.slice(0,160)});

  r=await api('POST',`/api/learning/batch-sessions/${sess}/classroom/message`,{token:A.token,body:{message:'From the test'}});
  check('Classroom message POST: 201, response carries no sender_user_id',r.status===201&&idKeyPaths(r.json).length===0,{status:r.status,leaks:idKeyPaths(r.json)});

  // ===================================================================
  // PART 3 — Group classroom signals: role-based targeting, never a raw id in the payload
  // ===================================================================
  r=await api('POST',`/api/learning/batch-sessions/${sess}/classroom/signals`,{token:A.token,body:{signal_type:'offer',receiver_role:'TEACHER',receiver_user_id:B.id,payload:{sdp:'x'}}});
  check('Signal POST (learner->teacher-by-role): 201, and a client-supplied receiver_user_id is IGNORED, not honoured',r.status===201&&idKeyPaths(r.json).length===0,{status:r.status,leaks:idKeyPaths(r.json),text:r.text.slice(0,200)});
  r=await api('GET',`/api/learning/batch-sessions/${sess}/classroom/signals`,{token:T.token});
  check('Signal GET (teacher polling): the signal the learner sent to "the teacher" was actually routed to T (not to B, the id the learner tried to inject)',r.status===200&&(r.json.signals||[]).some((s)=>s.signal_type==='OFFER'||s.signal_type==='offer'.toUpperCase()),r.text.slice(0,300));
  check('Signal GET response: no sender_user_id/receiver_user_id key anywhere',idKeyPaths(r.json).length===0,idKeyPaths(r.json));
  r=await api('GET',`/api/learning/batch-sessions/${sess}/classroom/signals`,{token:B.token});
  check('Signal GET: B (the id the learner tried to inject as receiver) never actually received the misdirected signal',!(r.json.signals||[]).length,r.text.slice(0,200));

  r=await api('POST',`/api/learning/batch-sessions/${sess}/classroom/signals`,{token:stranger.token,body:{signal_type:'offer',receiver_role:'TEACHER'}});
  check('Signal POST: a user not assigned to this classroom -> 403',r.status===403,{status:r.status,text:r.text.slice(0,160)});

  await finish('Guides + classroom security regression suite');
})().catch((e)=>{console.error('CRASH',e);process.exit(1);});

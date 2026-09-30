// Learn & Earn — session-owned learner routes over real HTTP + real PostgreSQL (started by run.cjs).
// Covers: 401 without a session; the session-owned /api/learning/me/* routes; the legacy numeric-id routes (still session-authoritative,
// 403 for any other id, and id-free responses); enrolment / progress bound to the session user; public catalogue.
const L=require('./lib.cjs');
const {pool,api,mkUser,idKeyPaths,check}=L;
(async()=>{
  const A=await mkUser('Asha Learner','asha_learn'),B=await mkUser('Bala Learner','bala_learn'),T=await mkUser('Tara Teacher','tara_teach');
  const q=async(sql,p)=>(await pool.query(sql,p)).rows;
  // ---- fixtures: courses, teacher, direct booking, group batch + session, progress content
  const course=async(title,price,mode)=>(await q(`INSERT INTO learning_courses(title,description,category,level,is_active,publish_status,price,sale_price,purchase_mode,currency) VALUES($1,'Acceptance course','Skills','Beginner',TRUE,'PUBLISHED',$2,NULL,$3,'INR') RETURNING id`,[title,price,mode]))[0].id;
  const free=await course('Free Basket Weaving',0,'FREE'),paid=await course('Paid Loom Mastery',500,'PAID');
  const tp=(await q(`INSERT INTO learning_teacher_profiles(user_id,teacher_code,display_name,application_status) VALUES($1,'TCH-LRN-1','Tara T','APPROVED') RETURNING id`,[T.id]))[0].id;
  await q(`INSERT INTO learning_live_bookings(booking_code,user_id,teacher_profile_id,course_id,session_type,scheduled_start,scheduled_end,status) VALUES('LB-A-1',$1,$2,$3,'DEMO',NOW()+interval '1 day',NOW()+interval '1 day 1 hour','BOOKED'),('LB-B-1',$4,$2,$3,'DEMO',NOW()+interval '2 day',NOW()+interval '2 day 1 hour','BOOKED')`,[A.id,tp,free,B.id]);
  const batch=(await q(`INSERT INTO learning_batches(batch_code,teacher_profile_id,course_id,title,start_date,start_time,capacity,duration_minutes,status) VALUES('BT-LRN-1',$1,$2,'Weekend Weaving Batch',CURRENT_DATE,'10:00',10,60,'OPEN') RETURNING id`,[tp,free]))[0].id;
  await q(`INSERT INTO learning_batch_memberships(batch_id,user_id,membership_status) VALUES($1,$2,'ENROLLED')`,[batch,A.id]);
  const sess=(await q(`INSERT INTO learning_batch_sessions(session_code,batch_id,scheduled_start,scheduled_end,status) VALUES('BS-LRN-1',$1,NOW()+interval '3 day',NOW()+interval '3 day 1 hour','SCHEDULED') RETURNING id`,[batch]))[0].id;
  await q(`INSERT INTO learning_batch_session_attendance(batch_session_id,user_id) VALUES($1,$2)`,[sess,A.id]);
  const content=Number((await q(`INSERT INTO learning_content(content_code,title,category,is_published) VALUES('LC-LRN-1','Weaving 101','Craft',TRUE) RETURNING id`))[0].id);
  let r;
  // ---- A. no session -> 401 on every learner route (session-owned and legacy)
  const own=(u)=>[
    ['me/courses','/api/learning/me/courses','/api/learning/user/'+u.id],
    ['me/home','/api/learning/me/home','/api/learning/learner-home/'+u.id],
    ['me/live-bookings','/api/learning/me/live-bookings','/api/learning/live/bookings/'+u.id],
    ['me/batches','/api/learning/me/batches','/api/learning/batches/user/'+u.id],
    ['me/batch-sessions','/api/learning/me/batch-sessions','/api/learning/batch-sessions/user/'+u.id],
    ['me/progress','/api/learning/me/progress','/api/learning/progress/'+u.id]];
  for(const [name,me,legacy] of own(A)){
    r=await api('GET',me);check(`A ${name} without a session -> 401`,r.status===401,{status:r.status,text:r.text.slice(0,100)});
    r=await api('GET',legacy);check(`A legacy ${legacy.replace(/\d+$/,'<id>')} without a session -> 401`,r.status===401,{status:r.status,text:r.text.slice(0,100)});
    r=await api('GET',me,{token:'bogus-token'});check(`A ${name} with a bogus token -> 401`,r.status===401,r.status);
  }
  for(const [m,p,b] of [['GET','/api/learning/my-learning'],['POST','/api/learning/enroll',{course_id:free}],['POST','/api/learning/live/book',{user_id:A.id}],['POST','/api/learning/progress',{content_id:content,progress_percent:10}],['POST','/api/learning/live/bookings/00000000-0000-0000-0000-000000000000/cancel',{user_id:A.id}]]){
    r=await api(m,p,{body:b});check(`A ${m} ${p.replace(/[0-9a-f-]{36}/,'<uuid>')} without a session -> 401`,r.status===401,{status:r.status,text:r.text.slice(0,100)});
  }
  // ---- B. session-owned /me routes: 200, the session user's own rows, and NO identity keys anywhere in the body
  await api('POST','/api/learning/enroll',{token:A.token,body:{course_id:free}});
  await api('POST','/api/learning/progress',{token:A.token,body:{content_id:content,progress_percent:40}});
  const bodies={};
  for(const [name,me] of own(A)){
    r=await api('GET',me,{token:A.token});bodies[name]=r;
    check(`B ${name} with a session -> 200`,r.status===200&&r.json&&r.json.status==='success',{status:r.status,text:r.text.slice(0,160)});
    check(`B ${name}: no user_id / howdi_id / master_id / email / phone key anywhere in the response`,idKeyPaths(r.json).length===0,idKeyPaths(r.json));
    check(`B ${name}: the caller's numeric id and howdi id never appear as a value`,!new RegExp(`"(?:[a-z_]*id)":${A.id}[,}]`).test(r.text)&&!r.text.includes(A.howdi)&&!r.text.includes('MST-'),r.text.slice(0,200));
  }
  check('B me/courses lists the enrolled course',(bodies['me/courses'].json.courses||[]).some((c)=>/Free Basket/.test(c.title)),bodies['me/courses'].text.slice(0,200));
  check('B me/home: learner block is just the display name',JSON.stringify(Object.keys(bodies['me/home'].json.learner||{}))==='["full_name"]'&&bodies['me/home'].json.summary.enrolled_courses===1,bodies['me/home'].text.slice(0,240));
  check('B me/live-bookings: only the caller\'s booking (not the other learner\'s)',(bodies['me/live-bookings'].json.bookings||[]).length===1&&bodies['me/live-bookings'].json.bookings[0].booking_code==='LB-A-1',bodies['me/live-bookings'].text.slice(0,240));
  check('B me/batches: the caller\'s batch',(bodies['me/batches'].json.batches||[]).length===1&&/Weekend Weaving/.test(bodies['me/batches'].text),bodies['me/batches'].text.slice(0,200));
  check('B me/batch-sessions: the caller\'s group class',(bodies['me/batch-sessions'].json.sessions||[]).length===1,bodies['me/batch-sessions'].text.slice(0,200));
  check('B me/progress: the caller\'s progress row',(bodies['me/progress'].json.progress||[]).length===1&&Number(bodies['me/progress'].json.progress[0].progress_percent)===40,bodies['me/progress'].text.slice(0,200));
  r=await api('GET','/api/learning/me/courses',{token:B.token});check('B another member sees only their own (empty) courses via the same /me route',r.status===200&&r.json.courses.length===0,r.text.slice(0,120));
  r=await api('GET','/api/learning/me/live-bookings?user_id='+A.id,{token:B.token});check('B a foreign ?user_id query is ignored on /me routes (B still sees only B\'s booking)',r.status===200&&r.json.bookings.length===1&&r.json.bookings[0].booking_code==='LB-B-1',r.text.slice(0,200));
  // ---- C. legacy numeric-id routes: still session-authoritative and id-free
  for(const [name,me,legacy] of own(A)){
    r=await api('GET',legacy,{token:A.token});
    check(`C legacy ${legacy.replace(/\d+$/,'<own id>')} -> 200 with the same id-free body as ${name}`,r.status===200&&idKeyPaths(r.json).length===0&&JSON.stringify(Object.keys(r.json).sort())===JSON.stringify(Object.keys(bodies[name].json).sort()),{status:r.status,keys:idKeyPaths(r.json),text:r.text.slice(0,120)});
  }
  for(const [name,me,legacy] of own(B)){
    r=await api('GET',legacy,{token:A.token});
    check(`C legacy ${legacy.replace(/\d+$/,'<other id>')} as another member -> 403 and nothing of B's`,r.status===403&&!/LB-B-1|Bala/.test(r.text),{status:r.status,text:r.text.slice(0,120)});
  }
  // ---- D. writes are bound to the session user; POST responses carry no user_id
  r=await api('POST','/api/learning/enroll',{token:B.token,body:{course_id:free,user_id:A.id,userId:A.id}});
  check('D enrol with a foreign user_id in the body -> enrols the SESSION user',r.status>=200&&r.status<300,{status:r.status,text:r.text.slice(0,160)});
  check('D the enrolment belongs to B (and A still has exactly one)',(await q(`SELECT user_id FROM user_course_enrollments WHERE course_id=$1::uuid ORDER BY user_id`,[free])).map((x)=>Number(x.user_id)).join()===[A.id,B.id].sort((a,b)=>a-b).join());
  r=await api('POST','/api/learning/progress',{token:B.token,body:{content_id:content,progress_percent:70,user_id:A.id}});
  check('D progress save uses the session user and returns no user_id',r.status===200&&idKeyPaths(r.json).length===0&&(await q(`SELECT progress_percent FROM user_learning_progress WHERE user_id=$1`,[A.id]))[0].progress_percent===40,{status:r.status,keys:idKeyPaths(r.json),text:r.text.slice(0,160)});
  r=await api('POST','/api/learning/complete',{token:B.token,body:{content_id:content}});
  check('D complete returns no user_id',r.status===200&&idKeyPaths(r.json).length===0,{status:r.status,keys:idKeyPaths(r.json)});
  r=await api('POST','/api/learning/enroll',{token:A.token,body:{course_id:paid}});check('D paid course without entitlement -> 402',r.status===402,r.text.slice(0,120));
  r=await api('POST','/api/learning/enroll',{token:A.token,body:{course_id:'11111111-1111-1111-1111-111111111111'}});check('D unknown course -> 404',r.status===404,r.text.slice(0,120));
  r=await api('GET','/api/learning/my-learning?user_id='+B.id,{token:A.token});check('D my-learning ignores ?user_id and shows the session user\'s course',r.status===200&&r.json.courses.length===1&&idKeyPaths(r.json).length===0,r.text.slice(0,160));
  // ---- E. public catalogue + Learn reads
  r=await api('GET','/api/learning/catalog');check('E catalogue is public, lists both published courses, leaks no identity keys',r.status===200&&(r.json.courses||[]).length>=2&&idKeyPaths(r.json).length===0,{status:r.status,text:r.text.slice(0,120)});
  for(const p of ['/api/learning/live/availability','/api/learning/opportunities','/api/learning/skill-passport']){r=await api('GET',p,{token:A.token});check(`E GET ${p} with a session -> 200`,r.status===200,{status:r.status,text:r.text.slice(0,120)});}
  r=await api('GET','/api/learning/skill-passport');check('E skill-passport without a session -> 401',r.status===401,r.status);
  // CORS: the Learn page sends only an Authorization header; a credentialed request cannot be answered with a wildcard origin
  const pre=await fetch(L.BASE+'/api/learning/me/courses',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
  check('E CORS preflight allows the Authorization header (Bearer token) from the app origin',pre.status<300&&/authorization/i.test(pre.headers.get('access-control-allow-headers')||''),{status:pre.status});
  await L.finish('learn session routes');
})().catch((e)=>{console.log('CRASH',e&&e.stack||e);process.exit(1);});

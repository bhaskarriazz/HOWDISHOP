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
  let r=await api('POST','/api/connect/creator-plans',{...t(A),body:{planName:'Supporter',price:100,billingPeriod:'MONTHLY'}});ok(S(r)===201,'plan create ('+S(r)+')');
  // subscribe: payment must not be granted for free
  r=await api('POST','/api/connect/creator-plans/'+aR+'/subscribe',{...t(B),body:{}});ok(S(r)===200||S(r)===201,'subscribe ('+S(r)+') '+r.text.slice(0,120));
  const bst=(await q('SELECT status FROM howdi_connect_creator_subscriptions WHERE creator_user_id=$1 AND subscriber_user_id=$2',[A.id,B.id]))[0];console.log('   bob paid-plan subscription status =',bst&&bst.status);
  ok(S(await api('POST','/api/connect/creator-plans/'+A.id+'/subscribe',{...t(B),body:{}}))>=400,'subscribe by raw creator id rejected');
  ok(S(await api('POST','/api/connect/creator-plans/'+aR+'/subscribe',{...t(A),body:{}}))>=400,'creator cannot subscribe to self');
  // gift
  r=await api('POST','/api/connect/creator-memberships/'+aR+'/gift',{...t(C),body:{recipientUserId:dR}});ok(S(r)===200,'member gift ('+S(r)+') '+r.text.slice(0,100));
  ok((await q('SELECT status FROM howdi_connect_creator_subscriptions WHERE creator_user_id=$1 AND subscriber_user_id=$2',[A.id,D.id]))[0].status==='PENDING','non-creator gift is PENDING (not free ACTIVE)');
  r=await api('POST','/api/connect/creator-memberships/'+aR+'/gift',{...t(A),body:{recipientUsername:D.username}});ok(S(r)===200,'creator comp gift ('+S(r)+')');
  ok((await q('SELECT status FROM howdi_connect_creator_subscriptions WHERE creator_user_id=$1 AND subscriber_user_id=$2',[A.id,D.id]))[0].status==='ACTIVE','creator comp is ACTIVE');
  ok(S(await api('POST','/api/connect/creator-memberships/'+aR+'/gift',{...t(C),body:{recipientUserId:cR}}))===400,'cannot gift to self');
  // grant only by creator (actor is creator)
  ok(S(await api('POST','/api/connect/creator-subscriptions/'+cR+'/grant',{...t(B),body:{}}))>=400,'grant without plan rejected for non-creator');
  ok(S(await api('POST','/api/connect/creator-subscriptions/'+cR+'/grant',{...t(A),body:{}}))===200,'creator grants membership');
  // subscribers-only post
  r=await api('POST','/api/connect/posts',{...t(A),body:{content:'subs only '+tag,subscribers_only:true}});const sp=r.json.post.id;
  const vis=async(u)=>((await api('GET','/api/connect/feed',u?t(u):{})).json.posts||[]).some(p=>String(p.id)===String(sp));
  ok(await vis(D),'active member sees subscribers-only');
  ok(!(await vis(B))||bst?.status==='ACTIVE','non-active does not see subscribers-only');
  ok(!(await vis(null)),'guest does not see subscribers-only');
  // payouts
  await pool.query(`INSERT INTO howdi_connect_creator_revenue_ledger(creator_user_id,source_type,source_id,gross_amount,platform_fee,net_amount,status) VALUES($1,'GIFT','x',100,0,100,'COMPLETED')`,[A.id]);
  const res=await Promise.all([1,2,3].map(()=>api('POST','/api/connect/creator-payouts',{...t(A),body:{amount:60}})));
  const okc=res.filter(x=>S(x)===201||S(x)===200).length;ok(okc===1,'concurrent payouts: exactly one succeeds (got '+okc+': '+res.map(S).join(',')+')');
  ok(S(await api('POST','/api/connect/creator-payouts',{...t(B),body:{amount:5}}))===400,'no balance => 400');
  ok(S(await api('PATCH','/api/connect/creator-payouts/1/status',{...t(B),body:{status:'PAID'}}))>=400,'member cannot mark payout paid');
  // dashboards: private
  ok(S(await api('GET','/api/connect/creator-dashboard'))===401,'creator dashboard guest 401');
  r=await api('GET','/api/connect/creator-dashboard',t(A));ok(S(r)===200&&!/howdi_id|master_id/.test(r.text),'creator dashboard ok, no ids ('+S(r)+')');
  r=await api('GET','/api/connect/creator-plans/'+aR,t(D));ok(S(r)===200,'plans public read ('+S(r)+')');
  // cancel
  ok(S(await api('POST','/api/connect/creator-subscriptions/'+aR+'/cancel',{...t(D),body:{}}))===200,'subscriber cancels own');
  // creator challenges (membership-gated progress; real-SQL regression for the parameter typing of the upsert)
  r=await api('POST','/api/connect/creator-challenges',{...t(A),body:{title:'Ship a lesson',description:'d',targetCount:3}});ok(S(r)===201,'challenge create ('+S(r)+')');
  const cid=r.json&&r.json.challenge&&r.json.challenge.id;
  ok(S(await api('POST','/api/connect/creator-challenges/'+cid+'/progress',{...t(D),body:{increment:1}}))===403,'non-member (cancelled subscriber) cannot progress a challenge');
  ok(S(await api('POST','/api/connect/creator-challenges/'+cid+'/progress',{body:{increment:1}}))===401,'guest cannot progress a challenge');
  await pool.query(`UPDATE howdi_connect_creator_subscriptions SET status='ACTIVE' WHERE creator_user_id=$1 AND subscriber_user_id=$2`,[A.id,C.id])||0;
  await pool.query(`INSERT INTO howdi_connect_creator_subscriptions(creator_user_id,subscriber_user_id,status) SELECT $1,$2,'ACTIVE' WHERE NOT EXISTS(SELECT 1 FROM howdi_connect_creator_subscriptions WHERE creator_user_id=$1 AND subscriber_user_id=$2)`,[A.id,C.id]);
  r=await api('POST','/api/connect/creator-challenges/'+cid+'/progress',{...t(C),body:{userId:A.id,increment:1}});
  ok(S(r)===200&&r.json.progress.progress_count===1&&String(r.json.progress.member_user_id)===String(C.id),'member progress recorded for the SESSION user, not the spoofed body userId ('+S(r)+')');
  r=await api('POST','/api/connect/creator-challenges/'+cid+'/progress',{...t(C),body:{increment:9}});
  ok(S(r)===200&&r.json.progress.progress_count===3&&!!r.json.progress.completed_at,'progress is capped at the target and completes');
  console.log(`PASS ${pass}  FAIL ${fail}`);await pool.end();process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

// Stage 2B requirement #1/#4: authorized 2xx + safe body, unauthorized/cross-user 401/403/404,
// and no internal numeric user id anywhere in a notification response.
const {pool,api,mkAccount}=require('./lib.cjs');
let pass=0,fail=0;const failures=[];
function ok(c,m){if(c)pass++;else{fail++;failures.push(m);console.log('  FAIL',m);}}

(async()=>{
  const alice=await mkAccount('Alice');
  const bob=await mkAccount('Bob');

  // --- Unauthenticated access to a private "me" surface is 401, not a default/empty body.
  const rAnon=await api('GET','/api/notifications/me');
  ok(rAnon.status===401,'GET /api/notifications/me with no session is 401 (got '+rAnon.status+')');

  // --- A notification belonging to alice, seeded directly (as a webhook/cron job would insert one).
  const seeded=(await pool.query(
    `INSERT INTO customer_notifications(user_id,notification_type,title,message) VALUES($1,'GENERAL','Regression','hello') RETURNING id`,
    [alice.id]
  )).rows[0];
  const notifId=Number(seeded.id);

  // --- Owner can list it: 200, safe body (no user_id field, only fields the customer needs).
  const rList=await api('GET','/api/notifications/me',{token:alice.token});
  ok(rList.status===200&&rList.json.status==='success','owner notification list is 200 success');
  const item=(rList.json.notifications||[]).find(n=>Number(n.id)===notifId);
  ok(!!item,'the seeded notification appears in the owner listing');
  ok(item&&!('user_id' in item),'the notification body never carries a user_id field');
  ok(!/"user_id"/.test(rList.text),'no user_id key anywhere in the raw response body');

  // --- Cross-user: bob cannot mark it read, cannot delete it, cannot see it as his own.
  const rBobRead=await api('POST',`/api/notifications/${notifId}/read`,{token:bob.token,body:{}});
  ok(rBobRead.status===401||rBobRead.status===403||rBobRead.status===404,'cross-user mark-read is rejected (got '+rBobRead.status+')');
  const rBobDelete=await api('DELETE',`/api/notifications/${notifId}`,{token:bob.token});
  ok(rBobDelete.status===401||rBobDelete.status===403||rBobDelete.status===404,'cross-user delete is rejected (got '+rBobDelete.status+')');
  const stillThere=(await pool.query('SELECT is_read FROM customer_notifications WHERE id=$1',[notifId])).rows[0];
  ok(!!stillThere&&stillThere.is_read===false,"bob's attempts left alice's notification untouched (still unread, still exists)");

  // --- A caller who supplies someone else's numeric id as a body/query field is ignored, not honoured:
  // bob marks HIS OWN notification read while trying to smuggle alice's user id in the body.
  const bobNotif=(await pool.query(
    `INSERT INTO customer_notifications(user_id,notification_type,title,message) VALUES($1,'GENERAL','Bob','hi') RETURNING id`,
    [bob.id]
  )).rows[0];
  const rSmuggle=await api('POST',`/api/notifications/${bobNotif.id}/read`,{token:bob.token,body:{user_id:alice.id,userId:alice.id}});
  ok(rSmuggle.status===200,'bob can mark his own notification read even while a foreign user_id rides in the body');
  const aliceUnaffected=(await pool.query('SELECT is_read FROM customer_notifications WHERE id=$1',[notifId])).rows[0];
  ok(aliceUnaffected.is_read===false,"a foreign user_id in bob's request body never touches alice's row");

  // --- Owner deletes her own notification: 200, and it is actually gone.
  const rOwnerDelete=await api('DELETE',`/api/notifications/${notifId}`,{token:alice.token});
  ok(rOwnerDelete.status===200&&rOwnerDelete.json.status==='success','owner delete of her own notification is 200 success');
  const gone=(await pool.query('SELECT 1 FROM customer_notifications WHERE id=$1',[notifId])).rows[0];
  ok(!gone,'the notification row is actually gone after the owner deletes it');

  console.log(`notifications-cross-user-and-ids: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();

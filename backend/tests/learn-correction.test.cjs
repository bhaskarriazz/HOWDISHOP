// Learn & Earn correction — hermetic checks on the real source (no database, no browser).
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('backend/server.js'),app=read('apps/customer/src/App.jsx'),api=read('apps/customer/src/learnEarn/learnEarnApi.js'),vite=read('apps/customer/vite.config.js'),ui=read('apps/customer/src/learnEarn/LearnEarnExperience.jsx');
const strip=(s)=>s.replace(/\/\/.*$/gm,'');

test('Learn API client: identity is the Bearer token only — no cookie/credentialed requests',()=>{
  assert.doesNotMatch(strip(api),/credentials/,'credentials:"include" is what a wildcard-CORS backend rejects');
  assert.match(api,/Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(strip(api),/user_id|userId|currentUser/,'the client never sends a user id');
  assert.doesNotMatch(strip(ui),/credentials|user_id/);
});

test('Vite is a multi-page build: index.html and learn-earn.html are both inputs',()=>{
  assert.match(vite,/rollupOptions/);
  assert.match(vite,/main:\s*fileURLToPath\(new URL\("\.\/index\.html", import\.meta\.url\)\)/);
  assert.match(vite,/learn:\s*fileURLToPath\(new URL\("\.\/learn-earn\.html", import\.meta\.url\)\)/);
  assert.ok(fs.existsSync(path.join(root,'apps/customer/index.html'))&&fs.existsSync(path.join(root,'apps/customer/learn-earn.html')));
});

test('App.jsx: learner data comes from session-owned /me routes, never from a numeric id in the path',()=>{
  for(const p of ['live-bookings','batch-sessions','batches','home','courses','progress'])assert.ok(app.includes(`/api/learning/me/${p}"`),`App.jsx calls /api/learning/me/${p}`);
  const legacy=app.match(/\/api\/learning\/(?:user|learner-home|progress|batches\/user|batch-sessions\/user)\/\$\{[^}]*\}|\/api\/learning\/live\/bookings\/\$\{(?:encodeURIComponent\()?currentUser[^}]*\}/g);
  assert.equal(legacy,null,'no learner route with an interpolated user id remains in the client: '+(legacy||[]).join(', '));
});

const slice=(from,to)=>{const i=server.indexOf(from);assert.ok(i>0,'marker present: '+from);const j=server.indexOf(to,i);assert.ok(j>i,'end marker present: '+to);return server.slice(i,j);};
test('server: every /me route exists and legacy numeric routes stay session-authoritative (403 for any other id)',()=>{
  for(const name of ['live-bookings','batches','batch-sessions','home','courses','progress'])assert.ok(server.includes('\\/api\\/learning\\/me\\/'+name+'\\/?$/'),'server route /api/learning/me/'+name);
  assert.match(server,/You can only view your own bookings/);assert.match(server,/You can only view your own batches/);assert.match(server,/You can only view your own group classes/);
  assert.match(server,/You can only open your own learning home/);assert.match(server,/You can only view your own learning"/);assert.match(server,/You can only view your own learning progress/);
  // the /me variants take the id from the session, never from the request
  assert.match(server,/const userId=legacyBookingsId===undefined\?Number\(learner\.id\):Number\(legacyBookingsId\)/);
  assert.match(server,/learnerMyBatchesMatch\?Number\(learnerMyBatchesMatch\[1\]\):Number\(learner\.id\)/);
  assert.match(server,/learnerBatchSessionsMatch\?Number\(learnerBatchSessionsMatch\[1\]\):Number\(learner\.id\)/);
  assert.match(server,/requestedUserId=legacyHomeId===undefined\?userId:Number\(legacyHomeId\)/);
  assert.match(server,/requestedUserId=legacyUserId===undefined\?userId:Number\(legacyUserId\)/);
  assert.match(server,/userId=legacyProgressId===undefined\?Number\(learner\.id\):Number\(legacyProgressId\)/);
});

test('server: learner responses carry no user id, howdi_id, email or phone',()=>{
  const home=slice('/^\\/api\\/learning\\/me\\/home\\/?$/.test(pathname)','const courses=(await pool.query');
  assert.match(home,/SELECT id,full_name\s+FROM users WHERE id=\$1/);assert.doesNotMatch(home,/howdi_id|email|phone/);
  assert.match(server,/learner:\{full_name:learner\.full_name\}/);
  assert.match(server,/\.rows\.map\(\(\{user_id,\.\.\.booking\}\)=>booking\)/,'live bookings drop user_id');
  assert.equal((server.match(/const \{user_id:_ownerId,\.\.\.savedProgress\}=result\.rows\[0\]/g)||[]).length,2,'progress save + complete drop user_id');
});

test('server: no learner route reads a user id from the body or query any more (session identity only)',()=>{
  const learn=server.slice(server.indexOf('const learnerBookingCancelMatch'),server.indexOf('const learnerBookingCancelMatch')+60000);
  assert.doesNotMatch(learn,/Number\(body\.user_id\)/);assert.doesNotMatch(learn,/searchParams\.get\(['"]user_id['"]\)\)/);
});

test('server: progress upsert types its status parameter (it used to fail with "inconsistent types deduced for parameter $4")',()=>{
  assert.ok(server.includes("VALUES($1,$2,$3,$4::varchar,NOW(),CASE WHEN $4::varchar='COMPLETED' THEN NOW() ELSE NULL END)"));
});

const assert=require('assert');
const fs=require('fs');
const path=require('path');
let passed=0;
function test(name,fn){fn();passed++;}

const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const between=(start,end)=>{
  const from=source.indexOf(start);
  assert.notStrictEqual(from,-1,`missing route marker: ${start}`);
  const to=end?source.indexOf(end,from+start.length):source.length;
  assert.notStrictEqual(to,-1,`missing route end marker: ${end}`);
  return source.slice(from,to);
};
const protectedRoute=(start,end)=>{
  const route=between(start,end);
  assert.match(route,/requireActiveSessionWorker\(req,res\)/,`${start} must use the session-bound worker gate`);
  assert.doesNotMatch(route,/x-howdi-worker-id|req\.query\.workerId|req\.body\.workerId|body\.workerId|url\.searchParams\.get\(["']workerId/,`${start} must not trust browser-supplied worker identity`);
};

test('Worker identity is derived from an authenticated HOWDI session and eligible worker row',()=>{
  const helper=between('async function requireActiveSessionWorker','function worksOrderRow');
  assert.match(helper,/getSessionUserFromRequest\(req\)/);
  assert.match(helper,/FROM works_workers WHERE user_id=\$1 LIMIT 1/);
  for(const field of ['active','kyc_status','skill_status','account_status'])assert.match(helper,new RegExp(field));
  assert.match(helper,/WORKER_ACCOUNT_INELIGIBLE/);
});

test('Worker-to-user binding is durable and unique',()=>{
  assert.match(source,/ALTER TABLE works_workers ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users\(id\) ON DELETE SET NULL/);
  assert.match(source,/CREATE UNIQUE INDEX IF NOT EXISTS works_workers_user_id_unique ON works_workers\(user_id\) WHERE user_id IS NOT NULL/);
  assert.match(source,/INSERT INTO works_workers\(user_id,worker_code/);
});

test('Worker Portal routes reject spoofed identity sources in favour of the session gate',()=>{
  protectedRoute('pathname === "/api/worker/me"','pathname === "/api/worker/works/availability"');
  protectedRoute('pathname === "/api/worker/profile"','pathname === "/api/worker/connect/health"');
  protectedRoute('pathname === "/api/worker/connect/feed"','pathname === "/api/worker/connect/posts"');
  protectedRoute('pathname === "/api/worker/connect/posts"','pathname === "/api/worker/works/offers"');
  protectedRoute('pathname === "/api/worker/works/offers"','pathname === "/api/worker/works/debug-lifecycle"');
  protectedRoute('pathname === "/api/worker/works/jobs"','// =====================================================\n            // HOWDI COMMUNITY');
  const locationIndex=source.indexOf('Location sharing is only allowed during the active job journey');
  assert.notStrictEqual(locationIndex,-1,'missing worker location route');
  const locationRoute=source.slice(locationIndex-700,locationIndex+400);
  assert.match(locationRoute,/requireActiveSessionWorker\(req,res\)/);
  assert.doesNotMatch(locationRoute,/x-howdi-worker-id|body\.workerId|req\.query\.workerId/);
});

test('Legacy worker header remains CORS-compatible but is never used as identity',()=>{
  assert.match(source,/Access-Control-Allow-Headers[\s\S]{0,140}x-howdi-worker-id/);
  const workerPortal=source.slice(source.indexOf('// HOWDI WORKER PORTAL — JOB OFFERS + ACTIVE JOURNEY'),source.indexOf('// HOWDI COMMUNITY — USER MENTION SEARCH'));
  assert.doesNotMatch(workerPortal,/req\.headers\["x-howdi-worker-id"\]/);
});

test('Portal profile and bootstrap responses do not expose worker or user database identifiers',()=>{
  const serializer=between('function worksPortalWorkerRow','async function requireActiveSessionWorker');
  assert.match(serializer,/const \{id,user_id,\.\.\.worker\}=worksWorkerRow\(r\)/);
  const profile=between('pathname === "/api/worker/profile"','pathname === "/api/worker/connect/health"');
  assert.match(profile,/worksPortalWorkerRow/);
  assert.doesNotMatch(profile,/worker:worksWorkerRow/);
  const portalMe=between('pathname === "/api/worker/me"','pathname === "/api/worker/works/availability"');
  assert.match(portalMe,/worksPortalWorkerRow/);
});

console.log(`works-worker-identity: ${passed} tests passed`);

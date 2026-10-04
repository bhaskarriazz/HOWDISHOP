const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { normalizeHomePreferences } = require('../home-preferences.cjs');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const start = source.indexOf('if(req.method==="GET" && pathname==="/api/preferences/me"){');
const end = source.indexOf('// HOWDI CUSTOMER FEEDBACK & RATINGS CENTER — LIVE API', start);
assert.notEqual(start, -1, 'preferences GET route is present');
assert.notEqual(end, -1, 'preferences routes end at feedback API');
assert.match(source,/ALTER TABLE user_preferences\s+ADD COLUMN IF NOT EXISTS home_preferences JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
const routes = source.slice(start, end);
const userRows = new Map([[101, row(101)], [202, row(202)]]);
function row(id) { return { id, user_id:id, home_preferences:{}, marketing_email:true, order_email:true, promotional_notifications:true, sms_updates:false, push_notifications:true, preferred_categories:[], preferred_sizes:[], preferred_languages:['English'], personalized_recommendations:true, save_shopping_activity:true, share_analytics_data:false }; }

async function call({method='GET',sessionUser=101,body={}}={}) {
  const calls=[];let response;
  const pool={query:async(sql,params=[])=>{
    calls.push({sql,params});const uid=Number(params[0]);
    if(sql.includes('SELECT * FROM user_preferences WHERE user_id=$1')) return {rows:userRows.has(uid)?[{...userRows.get(uid)}]:[]};
    if(sql.includes('INSERT INTO user_preferences')){if(!userRows.has(uid))userRows.set(uid,row(uid));return{rows:[{...userRows.get(uid)}]};}
    if(sql.includes('UPDATE user_preferences')){const saved={...userRows.get(uid),home_preferences:JSON.parse(params[12])};userRows.set(uid,saved);return{rows:[{...saved}]};}
    throw new Error('Unexpected SQL in C2 preferences route test: '+sql.slice(0,100));
  }};
  const context={req:{method},res:{},pathname:'/api/preferences/me',pool,clean:x=>String(x??'').trim(),
    getBody:async()=>body,k5eRequireSelf:async()=>sessionUser===null?(response={status:401,json:{status:'error'}},null):sessionUser,
    k5eOmitUserId:value=>{const copy=JSON.parse(JSON.stringify(value));if(Array.isArray(copy))return copy.map(x=>{delete x.user_id;return x});delete copy.user_id;return copy;},
    sendJSON:(_res,status,json)=>(response={status,json}),normalizeHomePreferences,console:{error(){}}};
  vm.createContext(context);
  const script=`(async()=>{${routes}\nreturn undefined;})()`;
  await vm.runInContext(script,context);
  return {response,calls};
}

test('GET /api/preferences/me derives owner from session and returns that account dock',async()=>{
  userRows.get(101).home_preferences={dock:['learn','shop','spark','move','works','connect'],dockLabels:{works:'Alpha'}};
  userRows.get(202).home_preferences={dock:['connect','shop','spark','move','works','learn'],dockLabels:{works:'Beta'}};
  const a=await call({sessionUser:101});const b=await call({sessionUser:202});
  assert.equal(a.response.status,200);assert.equal(a.response.json.preferences.home_preferences.dockLabels.works,'Alpha');
  assert.equal(b.response.json.preferences.home_preferences.dockLabels.works,'Beta');
  assert.ok(!('user_id' in a.response.json.preferences));
});
test('PUT ignores spoofed user ids and writes only the authenticated session account',async()=>{
  userRows.get(101).home_preferences={dock:['learn','shop','spark','move','works','connect'],dockLabels:{works:'Alpha'}};
  userRows.get(202).home_preferences={dock:['connect','shop','spark','move','works','learn'],dockLabels:{works:'Beta'}};
  const beforeB=JSON.stringify(userRows.get(202).home_preferences);
  const r=await call({method:'PUT',sessionUser:101,body:{user_id:202,userId:202,home_preferences:{dock:['connect','connect','toString','shop','spark','learn'],dockLabels:{spark:'Renamed',connect:'Videos'}}}});
  assert.equal(r.response.status,200);assert.deepEqual(userRows.get(101).home_preferences.dock,['connect','shop','spark','learn','move','works']);
  assert.deepEqual(userRows.get(101).home_preferences.dockLabels,{connect:'Videos'});
  assert.equal(JSON.stringify(userRows.get(202).home_preferences),beforeB);
  const write=r.calls.find(x=>x.sql.includes('UPDATE user_preferences'));
  assert.equal(write.params[0],101);
});
test('unauthenticated GET and PUT are rejected before preference SQL',async()=>{
  for(const method of ['GET','PUT']){const r=await call({method,sessionUser:null,body:{home_preferences:{dock:['hpay']}}});assert.equal(r.response.status,401);assert.equal(r.calls.length,0);}
});

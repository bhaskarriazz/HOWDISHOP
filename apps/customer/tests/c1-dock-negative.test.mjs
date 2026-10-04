// C1 negative tests ported to the V8 account-owned preference implementation.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomePreferenceSession } from '../src/v8/homePreferenceSession.mjs';
import serverContract from '../../../backend/home-preferences.cjs';

const sourcePath = process.env.C1_V8_SOURCE || new URL('../src/v8/V8Personalization.jsx', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');
const pure = source.slice(source.indexOf('export const V8_DEFAULT_DOCK'), source.indexOf('function readSessionToken'))
  .replaceAll('export const', 'const');
const context = {};
vm.createContext(context);
vm.runInContext(pure + '\nglobalThis.clean=cleanV8HomePrefs;', context);
const clean = (value) => { context.input = value; return JSON.parse(JSON.stringify(vm.runInContext('clean(input)', context))); };
const defaults = ['connect','shop','spark','move','works','learn'];
const normalizeServer = serverContract.normalizeHomePreferences;

test('C1-05 aliases are presentation only; canonical Work destination survives',()=>{
  const p=clean({dock:defaults,dockLabels:{works:'Jobs'},route:'/admin',permission:'admin',analyticsKey:'jobs'});
  assert.equal(p.dock[4],'works');assert.equal(p.dockLabels.works,'Jobs');
  assert.equal(p.route,undefined);assert.equal(p.permission,undefined);assert.equal(p.analyticsKey,undefined);
});
test('C1-06 Videos label does not create or replace a canonical feature',()=>{
  const p=clean({dock:defaults,dockLabels:{connect:'Videos'}});
  assert.equal(p.dock[0],'connect');assert.deepEqual(p.dock,defaults);
});
test('C1-08 Spark cannot move away from centre after normalization',()=>{
  const p=clean({dock:['connect','spark','shop','move','works','learn']});
  assert.equal(p.dock[2],'spark');
});
test('C1-09 Spark cannot be removed by stored preference mutation',()=>{
  const p=clean({dock:['connect','shop','move','works','learn']});
  assert.equal(p.dock[2],'spark');assert.equal(p.dock.length,6);
});
test('C1-10 Spark label tampering is discarded in client and server normalizers',()=>{
  const hostile={dock:defaults,dockLabels:{spark:'Hacked'}};
  assert.equal(clean(hostile).dockLabels.spark,undefined);
  assert.equal(normalizeServer(hostile).dockLabels.spark,undefined);
});
test('C1-13 unknown, inherited and prototype keys cannot become targets',()=>{
  for(const key of ['admin','toString','constructor','__proto__']){
    const hostile={dock:[...defaults]};hostile.dock[0]=key;
    for(const dock of [clean(hostile).dock,normalizeServer(hostile).dock]){
      assert.equal(dock[2],'spark',key+' Spark stays centred');
      assert.equal(new Set(dock).size,6,key+' is rejected and replaced');
      assert.ok(dock.every((target)=>serverContract.APPROVED_DOCK_KEYS.has(target)),key+' only approved targets survive');
    }
  }
  const inheritedLabels=Object.create({connect:'Injected'});inheritedLabels.works='Jobs';
  const labels=clean({dock:defaults,dockLabels:inheritedLabels}).dockLabels;
  assert.deepEqual(labels,{works:'Jobs'});
});
test('C1-14 malformed values recover to approved default',()=>{
  for(const hostile of [null,{},'{broken',[],{dock:[null,1,{},'toString']},new Array(6).fill(null)]){
    for(const dock of [clean(hostile).dock,normalizeServer(hostile).dock]){
      assert.equal(dock[2],'spark');assert.equal(new Set(dock).size,6);
      assert.ok(dock.every((target)=>serverContract.APPROVED_DOCK_KEYS.has(target)));
    }
  }
});
test('C1-15 removed target recovers while preserving a six-slot dock',()=>{
  const hostile={dock:['deleted-feature','shop','spark','move','works','learn']};
  for(const dock of [clean(hostile).dock,normalizeServer(hostile).dock]){
    assert.equal(dock.length,6);assert.equal(dock[2],'spark');assert.equal(new Set(dock).size,6);
    assert.ok(dock.every((target)=>serverContract.APPROVED_DOCK_KEYS.has(target)));
  }
});
test('C1-16 reset restores exact approved default',()=>{
  assert.deepEqual(clean(null).dock,defaults);assert.deepEqual(normalizeServer(null).dock,defaults);
});
test('C1-17 duplicate canonical targets are removed and replaced deterministically',()=>{
  const hostile={dock:['connect','connect','spark','shop','shop','learn']};
  const first=clean(hostile).dock,second=clean(hostile).dock,serverFirst=normalizeServer(hostile).dock,serverSecond=normalizeServer(hostile).dock;
  for(const dock of [first,serverFirst]){assert.equal(new Set(dock).size,6);assert.equal(dock[2],'spark');assert.ok(dock.every((target)=>serverContract.APPROVED_DOCK_KEYS.has(target)));}
  assert.deepEqual(first,second);assert.deepEqual(serverFirst,serverSecond);
});

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject};}
const reply=(prefs,status=200)=>({ok:status>=200&&status<300,status,json:async()=>({status:'success',preferences:{home_preferences:prefs}})});
test('C1-01/C1-04 A/B session change loads only the new session-owned value',async()=>{
  const pending=deferred(),changesA=[],changesB=[];
  const a=createHomePreferenceSession({accountKey:'A',token:'token-a',apiBase:'https://howdi.invalid',fetchImpl:()=>pending.promise,normalize:clean,onChange:v=>changesA.push(v)});
  const loadA=a.load();a.cancel();
  const b=createHomePreferenceSession({accountKey:'B',token:'token-b',apiBase:'https://howdi.invalid',fetchImpl:async(url,o)=>{assert.equal(o.headers.Authorization,'Bearer token-b');return reply({dock:['learn','shop','spark','move','works','connect'],dockLabels:{learn:'Classes'}})},normalize:clean,onChange:v=>changesB.push(v)});
  await b.load();pending.resolve(reply({dock:defaults,dockLabels:{works:'A secret'}}));await loadA;
  assert.equal(b.prefs.dockLabels.works,undefined);assert.equal(b.prefs.dockLabels.learn,'Classes');
  assert.equal(changesA.length,0);assert.ok(changesB.every(v=>v.dockLabels.works!=='A secret'));
});
test('C1-02 stale A writes are cancelled and cannot save under B session',async()=>{
  const writes=[];const pending=deferred();
  const a=createHomePreferenceSession({accountKey:'A',token:'token-a',apiBase:'https://howdi.invalid',fetchImpl:(url,o)=>{writes.push({url,o});return pending.promise},normalize:clean});
  const saveA=a.save({dock:defaults,dockLabels:{works:'A Jobs'}});assert.equal(writes.length,1);
  a.cancel();assert.equal(writes[0].o.signal.aborted,true);
  const b=createHomePreferenceSession({accountKey:'B',token:'token-b',apiBase:'https://howdi.invalid',fetchImpl:async(url,o)=>{writes.push({url,o});return reply(null)},normalize:clean});
  await b.load();await a.save({dock:defaults,dockLabels:{works:'late A write'}});pending.resolve(reply(null));await saveA;
  assert.equal(writes.length,2);assert.equal(writes[1].o.headers.Authorization,'Bearer token-b');
  assert.equal(writes[1].o.method,undefined);assert.equal(b.prefs.dockLabels.works,undefined);
});
test('C1-03/C1-19 logout cancellation clears in-memory state and ignores late response',async()=>{
  const pending=deferred(),updates=[];let reads=0;
  const a=createHomePreferenceSession({accountKey:'A',token:'token-a',apiBase:'https://howdi.invalid',fetchImpl:()=>++reads===1?Promise.resolve(reply({dock:defaults,dockLabels:{works:'A secret'}})):pending.promise,normalize:clean,onChange:v=>updates.push(v)});
  await a.load();assert.equal(a.prefs.dockLabels.works,'A secret');
  const request=a.load();a.cancel();assert.equal(a.prefs.dockLabels.works,undefined);assert.deepEqual(a.prefs.dock,defaults);
  pending.resolve(reply({dock:defaults,dockLabels:{works:'late secret'}}));await request;
  assert.equal(a.prefs.dockLabels.works,undefined);
  const guest=createHomePreferenceSession({accountKey:'',token:'',apiBase:'https://howdi.invalid',fetchImpl:async()=>{throw new Error('guest must not fetch')},normalize:clean});
  assert.deepEqual(guest.prefs.dock,defaults);await guest.load();assert.deepEqual(guest.prefs.dock,defaults);
});

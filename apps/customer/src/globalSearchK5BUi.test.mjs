import test from "node:test";
import assert from "node:assert/strict";
import {createGlobalSearchRunner,globalSearchFamilyLabels,nextGlobalSearchIndex,resolveGlobalSearchPanelState} from "./globalSearchK5BUi.js";

function manualTimers(){const q=new Map();let n=0;return {setTimer:(fn,ms)=>{const id=++n;q.set(id,{fn,ms});return id;},clearTimer:id=>q.delete(id),pending:()=>[...q.values()],flush:async()=>{const jobs=[...q.entries()];q.clear();for(const [,job] of jobs)await job.fn();}};}
function okFetch(results={}){const calls=[];const fn=async(url,init)=>{calls.push({url,init});const type=new URL(url,"http://x").searchParams.get("type");return {ok:true,json:async()=>({status:"success",type,results:results[type]||[]})};};fn.calls=calls;return fn;}
const tick=()=>new Promise(r=>setTimeout(r,0));

test("keyboard index: ArrowDown/ArrowUp wrap through options and back to the input",()=>{
  assert.equal(nextGlobalSearchIndex("ArrowDown",-1,3),0);
  assert.equal(nextGlobalSearchIndex("ArrowDown",0,3),1);
  assert.equal(nextGlobalSearchIndex("ArrowDown",2,3),0);
  assert.equal(nextGlobalSearchIndex("ArrowUp",-1,3),2);
  assert.equal(nextGlobalSearchIndex("ArrowUp",1,3),0);
  assert.equal(nextGlobalSearchIndex("ArrowUp",0,3),-1);
  assert.equal(nextGlobalSearchIndex("Home",2,3),0);
  assert.equal(nextGlobalSearchIndex("End",0,3),2);
  assert.equal(nextGlobalSearchIndex("ArrowDown",-1,0),-1);
  assert.equal(nextGlobalSearchIndex("ArrowDown",5,2),0);
});

test("panel state covers idle, hint, loading, results, empty and all-failed",()=>{
  const base={query:"asha",loading:false,results:[],failedTypes:[],requestedTypes:["people"],settled:true};
  assert.equal(resolveGlobalSearchPanelState({...base,query:"  "}),"idle");
  assert.equal(resolveGlobalSearchPanelState({...base,query:"a"}),"hint");
  assert.equal(resolveGlobalSearchPanelState({...base,settled:false}),"loading");
  assert.equal(resolveGlobalSearchPanelState({...base,loading:true}),"loading");
  assert.equal(resolveGlobalSearchPanelState(base),"empty");
  assert.equal(resolveGlobalSearchPanelState({...base,failedTypes:["people"]}),"unavailable");
  // Partial failure keeps successful families visible.
  assert.equal(resolveGlobalSearchPanelState({...base,requestedTypes:["people","workers"],failedTypes:["workers"],results:[{key:"a"}]}),"results");
  assert.equal(resolveGlobalSearchPanelState({...base,requestedTypes:["people","workers"],failedTypes:["workers"]}),"empty");
  // Stale results stay rendered while the next query loads.
  assert.equal(resolveGlobalSearchPanelState({...base,loading:true,results:[{key:"a"}]}),"results");
});

test("failed families map to readable labels and never mention blocked types",()=>{
  assert.deepEqual(globalSearchFamilyLabels(["workers","products","workers","courses","services"]),["Workers","Products"]);
  assert.deepEqual(globalSearchFamilyLabels(null),[]);
});

test("runner debounces keystrokes into one scoped request with auth headers",async()=>{
  const t=manualTimers(),fetchImpl=okFetch({products:[{type:"product",title:"Asha Bag",price:1,route:"/shop/products/PRD-AAAAAAAAAAAA"}]});
  const seen=[];
  const r=createGlobalSearchRunner({fetchImpl,apiBase:"http://api.test",getHeaders:()=>({Authorization:"Bearer T"}),onResult:d=>seen.push(d),...t});
  r.schedule({query:"as",scope:"shop"});r.schedule({query:"ash",scope:"shop"});r.schedule({query:" asha  bag ",scope:"shop"});
  assert.equal(t.pending().length,1);
  assert.equal(t.pending()[0].ms,220);
  await t.flush();
  assert.equal(fetchImpl.calls.length,1);
  assert.match(fetchImpl.calls[0].url,/q=asha%20bag&type=products&limit=5$/);
  assert.equal(fetchImpl.calls[0].init.headers.Authorization,"Bearer T");
  assert.equal(seen.length,1);
  assert.equal(seen[0].scope,"shop");
  assert.deepEqual(seen[0].results.map(x=>x.title),["Asha Bag"]);
});

test("runner aborts in-flight requests and drops stale responses",async()=>{
  const t=manualTimers(),signals=[],resolvers=[];
  const fetchImpl=(url,init)=>{signals.push(init.signal);const type=new URL(url,"http://x").searchParams.get("type");const q=new URL(url,"http://x").searchParams.get("q");return new Promise(res=>resolvers.push(()=>res({ok:true,json:async()=>({status:"success",type,results:[{type:"person",display_name:q,public_username:"asha",route:"/@asha"}]})})));};
  const seen=[];
  const r=createGlobalSearchRunner({fetchImpl,getHeaders:()=>({}),onResult:d=>seen.push(d.query),...t});
  r.schedule({query:"old",scope:"learn"});const first=t.flush();await tick();
  assert.equal(signals.length,1);
  r.schedule({query:"new",scope:"learn"});
  assert.equal(signals[0].aborted,true);
  const second=t.flush();await tick();
  resolvers[0]();resolvers[1]();await Promise.all([first,second]);
  assert.deepEqual(seen,["new"]);
});

test("runner ignores invalid queries and cancel() prevents any request",async()=>{
  const t=manualTimers(),fetchImpl=okFetch();
  const r=createGlobalSearchRunner({fetchImpl,...t});
  assert.equal(r.schedule({query:"a"}),null);
  assert.equal(t.pending().length,0);
  r.schedule({query:"asha"});r.cancel();
  assert.equal(t.pending().length,0);
  await t.flush();
  assert.equal(fetchImpl.calls.length,0);
});

test("runner reports partial failures as data and total failures via onError",async()=>{
  const t=manualTimers();
  const partial=async url=>{const type=new URL(url,"http://x").searchParams.get("type");if(type==="channels")return {ok:false,json:async()=>({status:"error"})};return {ok:true,json:async()=>({status:"success",type,results:[{type:"group",name:"Asha Guild",member_count:3,route:"/groups/asha-guild"}]})};};
  const seen=[];
  createGlobalSearchRunner({fetchImpl:partial,onResult:d=>seen.push(d),...t}).schedule({query:"asha",scope:"communities"});
  await t.flush();
  assert.deepEqual(seen[0].failed_types,["channels"]);
  assert.deepEqual(seen[0].results.map(x=>x.title),["Asha Guild"]);
  // Every family failing still resolves (per-type errors are data), and the panel shows "unavailable".
  const all=[];
  createGlobalSearchRunner({fetchImpl:()=>{throw new Error("boom")},onResult:d=>all.push(d),onError:()=>assert.fail("per-type errors are not thrown"),...t}).schedule({query:"asha",scope:"works"});
  await t.flush();
  assert.deepEqual(all[0].failed_types,["workers"]);
  assert.equal(resolveGlobalSearchPanelState({query:"asha",loading:false,results:all[0].results,failedTypes:all[0].failed_types,requestedTypes:all[0].requested_types,settled:true}),"unavailable");
  // A thrown non-abort error from the adapter itself surfaces through onError.
  const errors=[];
  createGlobalSearchRunner({fetchImpl:"not-a-function",onResult:()=>assert.fail("should not resolve"),onError:e=>errors.push(e),...t}).schedule({query:"asha",scope:"works"});
  await t.flush();
  assert.equal(errors.length,1);
  assert.deepEqual(errors[0].types,["workers"]);
});

test("panel box stays inside the viewport for desktop, tablet and phone header slots",async()=>{
  const {globalSearchPanelBox}=await import("./globalSearchK5BUi.js");
  assert.deepEqual(globalSearchPanelBox(288,399,1280),{left:0,width:600});   // desktop: aligned with the form
  assert.deepEqual(globalSearchPanelBox(900,360,1280),{left:-232,width:600}); // right-side slot: shifted left
  assert.deepEqual(globalSearchPanelBox(16,736,768),{left:0,width:736});      // tablet full-row form
  assert.deepEqual(globalSearchPanelBox(12,186,375),{left:0,width:351});      // phone: wider than the narrow form
  assert.deepEqual(globalSearchPanelBox(100,186,375),{left:-88,width:351});
});

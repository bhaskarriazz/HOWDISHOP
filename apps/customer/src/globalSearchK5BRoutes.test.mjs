import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  GLOBAL_SEARCH_SCOPE_OPTIONS,
  buildGlobalSearchPageUrl,
  fetchGlobalSearchK5B,
  parseGlobalSearchDirectRoute,
  parseGlobalSearchPageUrl,
  safeGlobalSearchRoute,
  typesForGlobalSearchScope,
} from "./globalSearchK5B.js";
import {
  GLOBAL_SEARCH_PAGE_LIMIT,
  GLOBAL_SEARCH_PAGE_MAX_LIMIT,
  createGlobalSearchRunner,
  groupGlobalSearchResults,
  nextGlobalSearchPageLimit,
  resolveGlobalSearchPanelState,
} from "./globalSearchK5BUi.js";

const read=(p)=>fs.readFileSync(new URL(p,import.meta.url),"utf8").replace(/\r\n/g,"\n");
const app=read("./App.jsx");
const header=read("./components/GlobalSearchK5B.jsx");
const page=read("./components/GlobalSearchResultsK5B.jsx");

// 1. direct-load route parsing
test("direct-load parser recognises every K5B result route and nothing else",()=>{
  const cases={
    "/@asha.maker":{kind:"profile",key:"asha.maker",area:"connect"},
    "/posts/PST-AAAAAAAAAAAA":{kind:"post",key:"PST-AAAAAAAAAAAA",area:"connect"},
    "/articles/ART-123456789ABC":{kind:"article",key:"ART-123456789ABC",area:"connect"},
    "/vibes/VB-K5B_01":{kind:"vibe",key:"VB-K5B_01",area:"connect"},
    "/groups/asha-guild":{kind:"group",key:"asha-guild",area:"connect"},
    "/channels/k5b-news":{kind:"channel",key:"k5b-news",area:"connect"},
    "/shop/products/PRD-AAAAAAAAAAAA":{kind:"product",key:"PRD-AAAAAAAAAAAA",area:"shop"},
    "/works/workers/WRK-K5B_01":{kind:"worker",key:"WRK-K5B_01",area:"works"},
  };
  for(const [route,want] of Object.entries(cases)){
    assert.deepEqual(parseGlobalSearchDirectRoute(route),{...want,route},route);
    assert.deepEqual(parseGlobalSearchDirectRoute(route+"/"),{...want,route},route+"/ (reload with trailing slash)");
  }
  for(const route of ["/","/search","/shop","/works/find","/connect","/stories/STY-AAAAAAAAAAAA","/learn/courses/CRS-AAAAAAAAAAAA","/services/x","/storefronts/x","",null,undefined,"//@asha","/@asha/extra"])
    assert.equal(parseGlobalSearchDirectRoute(route),null,String(route));
});

// 2. username routes
test("username routes keep public @username addressing and reject numeric/internal ids",()=>{
  assert.equal(parseGlobalSearchDirectRoute("/@Asha_Maker").key,"Asha_Maker");
  for(const route of ["/@12","/@ab","/@"+"a".repeat(31),"/@asha maker","/@asha%2F..","/@asha?tab=1","/@asha#x","/users/42","/profile/42"])
    assert.equal(parseGlobalSearchDirectRoute(route),null,route);
});

// 3. product routes
test("product routes only accept K5A public PRD- codes, never internal numeric ids",()=>{
  assert.equal(parseGlobalSearchDirectRoute("/shop/products/PRD-0123456789AB").key,"PRD-0123456789AB");
  for(const route of ["/shop/products/6601","/shop/products/prd-0123456789ab","/shop/products/PRD-0123","/shop/products/550e8400-e29b-41d4-a716-446655440000","/shop/products/PRD-0123456789AB/reviews"])
    assert.equal(parseGlobalSearchDirectRoute(route),null,route);
  // App opens the existing catalogue product page with the code; the server resolves it (no local id lookup).
  assert.match(app,/target\.kind === "product"\) \{\n\s+openCatalogueProduct\(target\.key\);/);
});

// 4. Vibe routes
test("vibe routes use the public vibe code and focus the existing Vibe player on an exact match",()=>{
  assert.equal(parseGlobalSearchDirectRoute("/vibes/VB-K5B_01").kind,"vibe");
  for(const route of ["/vibes/12345","/vibes/550e8400-e29b-41d4-a716-446655440000","/vibes/a","/vibes/VB K5B"])
    assert.equal(parseGlobalSearchDirectRoute(route),null,route);
  assert.match(app,/setConnectVibeFocusCode\(target\.key\);\n\s+openNavigationOSArea\("connect", "vibe"\);/);
  assert.doesNotMatch(app,/toLowerCase\(\)===String\(focusVibeCode\)\.toLowerCase\(\)\)\|\|rows\[0\]/,"a direct Vibe link must never fall back to a different Vibe");
});

// 5. group/channel routes
test("group and channel routes resolve by slug through the existing spaces list and viewer",()=>{
  assert.equal(parseGlobalSearchDirectRoute("/groups/asha-guild").kind,"group");
  assert.equal(parseGlobalSearchDirectRoute("/channels/asha-guild").kind,"channel");
  for(const route of ["/groups/Bad_Slug","/groups/123","/groups/-x","/channels/a--b","/groups/asha-guild/members"])
    assert.equal(parseGlobalSearchDirectRoute(route),null,route);
  assert.match(app,/connectApi\(`\/api\/connect\/groups-channels\?type=\$\{spaceType\}`\)/);
  assert.match(app,/space\.slug === target\.key && String\(space\.space_type \|\| ""\)\.toUpperCase\(\) === spaceType/);
  assert.match(app,/if \(found\) openConnectGCSpace\(found\);/);
  assert.match(app,/requireConnectLogin\(async \(\) => \{/,"Groups & Channels keep the existing sign-in requirement");
});

// 6. worker routes
test("worker routes open the existing Works profile for the matching public worker code",()=>{
  assert.equal(parseGlobalSearchDirectRoute("/works/workers/WRK-K5B_01").kind,"worker");
  for(const route of ["/works/workers/123456789","/works/workers/550e8400-e29b-41d4-a716-446655440000","/works/workers/w"])
    assert.equal(parseGlobalSearchDirectRoute(route),null,route);
  assert.match(app,/fetch\(`\$\{WORKS_API_BASE\}\/api\/works\/workers`/);
  assert.match(app,/String\(w\.workerCode \|\| ""\) === code\);\n\s+if \(worker\) openWorksProfile\(worker\);/);
});

// 7. full-results scope mapping
test("full results page scopes map to the implemented K5B families and exclude blocked ones",async()=>{
  const calls=[];
  const fetchImpl=async(url)=>{const u=new URL(url,"http://x");calls.push(u.searchParams.get("type")+":"+u.searchParams.get("limit"));return {ok:true,json:async()=>({status:"success",type:u.searchParams.get("type"),results:[]})};};
  const timers={setTimer:(fn)=>{fn();return 1;},clearTimer(){}};
  for(const option of GLOBAL_SEARCH_SCOPE_OPTIONS){
    calls.length=0;
    const done=new Promise(resolve=>createGlobalSearchRunner({fetchImpl,limit:GLOBAL_SEARCH_PAGE_LIMIT,onResult:resolve,...timers}).schedule({query:"asha",scope:option.value,immediate:true}));
    const out=await done;
    assert.deepEqual(out.requested_types,typesForGlobalSearchScope(option.value),option.value);
    assert.deepEqual(calls,typesForGlobalSearchScope(option.value).map(t=>t+":"+GLOBAL_SEARCH_PAGE_LIMIT),option.value);
    for(const blocked of ["services","courses","storefronts"])assert.ok(!calls.some(c=>c.startsWith(blocked)),blocked);
  }
  assert.doesNotMatch(page,/services|courses|storefronts/i);
});

test("load more re-queries at the API per-type maximum once, only when a family may have more",()=>{
  assert.equal(nextGlobalSearchPageLimit({limit:10,has_more_types:["people"]}),GLOBAL_SEARCH_PAGE_MAX_LIMIT);
  assert.equal(nextGlobalSearchPageLimit({limit:10,has_more_types:[]}),null);
  assert.equal(nextGlobalSearchPageLimit({limit:20,has_more_types:["people"]}),null);
  assert.equal(nextGlobalSearchPageLimit(null),null);
});

test("adapter reports per-family counts so the page knows when more can exist",async()=>{
  const fetchImpl=async(url)=>{const type=new URL(url,"http://x").searchParams.get("type");const n=type==="people"?2:1;return {ok:true,json:async()=>({status:"success",type,results:Array.from({length:n},(_,i)=>({type:"person",public_username:"user"+type.slice(0,3)+i,display_name:"U"+i,route:"/@user"+type.slice(0,3)+i}))})};};
  const out=await fetchGlobalSearchK5B({fetchImpl,query:"asha",types:["people","creators"],limit:2});
  assert.deepEqual(out.family_counts,{people:2,creators:1});
  assert.deepEqual(out.has_more_types,["people"]);
  assert.equal(out.limit,2);
  assert.ok(out.results.every(r=>["people","creators"].includes(r.family)));
});

// 8. query URL state
test("full results URL state round-trips q and scope and drops everything else",()=>{
  assert.equal(buildGlobalSearchPageUrl({query:"  asha   bag ",scope:"shop"}),"/search?q=asha+bag&scope=shop");
  assert.equal(buildGlobalSearchPageUrl({query:"asha",scope:"all"}),"/search?q=asha");
  assert.equal(buildGlobalSearchPageUrl({query:"",scope:"bogus"}),"/search");
  assert.deepEqual(parseGlobalSearchPageUrl("/search","?q=asha+bag&scope=shop"),{query:"asha bag",scope:"shop"});
  assert.deepEqual(parseGlobalSearchPageUrl("/search/","?q=%E0%A4%86%E0%A4%B6%E0%A4%BE"),{query:"आशा",scope:"all"});
  assert.deepEqual(parseGlobalSearchPageUrl("/search","?q=asha&scope=courses&userId=42&type=services"),{query:"asha",scope:"all"});
  assert.equal(parseGlobalSearchPageUrl("/search","?q="+"x".repeat(200)).query.length,80);
  assert.equal(parseGlobalSearchPageUrl("/","?q=asha"),null);
  assert.equal(parseGlobalSearchPageUrl("/searching","?q=asha"),null);
  for(const option of GLOBAL_SEARCH_SCOPE_OPTIONS){
    const url=buildGlobalSearchPageUrl({query:"asha",scope:option.value});const u=new URL(url,"http://x");
    assert.deepEqual(parseGlobalSearchPageUrl(u.pathname,u.search),{query:"asha",scope:option.value});
    assert.deepEqual([...u.searchParams.keys()].filter(k=>k!=="q"&&k!=="scope"),[]);
  }
  // App restores the page from the URL on load and on Back/Forward.
  assert.match(app,/useState\(\(\) => \{\n\s+try \{ return parseGlobalSearchPageUrl\(window\.location\.pathname, window\.location\.search\); \}/);
  assert.match(app,/const page = parseGlobalSearchPageUrl\(window\.location\.pathname, window\.location\.search\);\n\s+if \(page\) \{ globalRouteRef\.current = null; setHomeSearch\(page\.query\); setGlobalSearchPage\(page\); return; \}/);
});

// 9. partial-family failure
test("partial family failures keep successful families rendered and name the failed ones",()=>{
  const results=[
    {key:"person:/@a",family:"people",title:"A"},{key:"product:/shop/products/PRD-AAAAAAAAAAAA",family:"products",title:"Bag"},
    {key:"person:/@b",family:"people",title:"B"},
  ];
  const groups=groupGlobalSearchResults(results,["people","workers","products"],["workers"]);
  assert.deepEqual(groups.map(g=>[g.family,g.label,g.items.map(i=>i.title)]),[["people","People",["A","B"]],["products","Products",["Bag"]]]);
  assert.equal(resolveGlobalSearchPanelState({query:"asha",loading:false,results,failedTypes:["workers"],requestedTypes:["people","workers","products"],settled:true}),"results");
  assert.equal(resolveGlobalSearchPanelState({query:"asha",loading:false,results:[],failedTypes:["people","workers"],requestedTypes:["people","workers"],settled:true}),"unavailable");
  assert.deepEqual(groupGlobalSearchResults([{family:"services",title:"x"}],["services","people"]),[]);
  assert.match(page,/failedLabels\.join\(", "\)\} \{failedLabels\.length===1\?"is":"are"\} temporarily unavailable\. Showing everything else\./);
});

// 10. navigation passes through safeGlobalSearchRoute()
test("every result navigation path goes through safeGlobalSearchRoute()",()=>{
  assert.match(app,/const navigateGlobalSearchResult = \(route\) => \{\n\s+const target = parseGlobalSearchDirectRoute\(safeGlobalSearchRoute\(route\)\);/);
  assert.match(header,/const route=safeGlobalSearchRoute\(item\?\.route\);\n\s+if\(!route\)return;/);
  assert.match(page,/const route=safeGlobalSearchRoute\(item\?\.route\);\n\s+if\(route\)onNavigate\?\.\(route,item\);/);
  assert.match(app,/onNavigate=\{navigateGlobalSearchResult\}[\s\S]*<GlobalSearchResultsK5B[\s\S]*onNavigate=\{navigateGlobalSearchResult\}/);
  assert.doesNotMatch(app,/window\.location\.assign\(safe\)/,"no full-page fallback bypassing the in-app viewers");
  for(const bad of ["javascript:alert(1)","https://evil.test/@asha","/@asha?next=https://evil.test","/shop/products/6601"])
    assert.equal(parseGlobalSearchDirectRoute(safeGlobalSearchRoute(bad)),null,bad);
});

test("the old local Search/Discovery result builder is gone",()=>{
  assert.doesNotMatch(app,/const discoveryResults = \(\(\) => \{/);
  assert.doesNotMatch(app,/activeSection === "search"/);
  assert.doesNotMatch(app,/runDiscoverySearch|discoveryCategories|setSearchType|setSearchSort/);
  assert.doesNotMatch(page,/products\.forEach|workers\.forEach|shopSearch/);
});

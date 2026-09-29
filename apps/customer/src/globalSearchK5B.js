const TYPES=Object.freeze(["people","creators","posts","articles","vibes","groups","channels","products","workers","teachers"]);
export const GLOBAL_SEARCH_TYPES=TYPES;
export const GLOBAL_SEARCH_SCOPE_OPTIONS=Object.freeze([
  {value:"all",label:"Everything",types:TYPES},
  {value:"people",label:"People",types:Object.freeze(["people","creators"])},
  {value:"content",label:"Posts & Vibes",types:Object.freeze(["posts","articles","vibes"])},
  {value:"communities",label:"Groups & Channels",types:Object.freeze(["groups","channels"])},
  {value:"shop",label:"Shop",types:Object.freeze(["products"])},
  {value:"works",label:"Works",types:Object.freeze(["workers"])},
  {value:"learn",label:"Learn",types:Object.freeze(["teachers"])},
]);
const META=Object.freeze({
  person:{label:"Person",icon:"👤"},creator:{label:"Creator",icon:"✨"},post:{label:"Post",icon:"💬"},article:{label:"Article",icon:"▤"},vibe:{label:"Vibe",icon:"▶"},
  group:{label:"Group",icon:"👥"},channel:{label:"Channel",icon:"◉"},product:{label:"Product",icon:"🧶"},worker:{label:"Worker",icon:"🛠"},teacher:{label:"Teacher",icon:"🎓"},
});
const SIMPLE_ROUTES=[
  /^\/@[a-z0-9._]{3,30}$/i,
  /^\/posts\/PST-[0-9A-F]{12}$/,
  /^\/articles\/ART-[0-9A-F]{12}$/,
  /^\/shop\/products\/PRD-[0-9A-F]{12}$/,
];
// Mirrors the backend isSlug(): lowercase words joined by single hyphens, <=80 chars, never all digits (id-like).
function isPublicSlug(value){const v=String(value||"");return v.length<=80&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&!/^[0-9]+$/.test(v.replace(/-/g,""));}
function isPublicCode(value){const v=String(value||"");return /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(v)&&!/^[0-9]+$/.test(v.replace(/[-_]/g,""))&&!/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i.test(v);}
export function normalizeGlobalSearchQuery(value){return String(value??"").normalize("NFKC").replace(/\s+/g," ").trim();}
export function isGlobalSearchQueryValid(value){const q=normalizeGlobalSearchQuery(value);return q.length>=2&&q.length<=80;}
export function typesForGlobalSearchScope(scope){const row=GLOBAL_SEARCH_SCOPE_OPTIONS.find(x=>x.value===scope);return row?[...row.types]:[...TYPES];}
export function safeGlobalSearchRoute(value){
  const route=String(value??"").trim();if(!route||route.length>180||route.includes("?")||route.includes("#"))return null;
  if(SIMPLE_ROUTES.some(re=>re.test(route)))return route;
  const space=route.match(/^\/(?:groups|channels)\/([^/]+)$/);if(space&&isPublicSlug(space[1]))return route;
  const vibe=route.match(/^\/vibes\/([^/]+)$/);if(vibe&&isPublicCode(vibe[1]))return route;
  const worker=route.match(/^\/works\/workers\/([^/]+)$/);if(worker&&isPublicCode(worker[1]))return route;
  return null;
}

// Direct-load / reload of a K5B result URL. Only routes that pass safeGlobalSearchRoute() are recognised,
// and every key is a public identifier (username, public code or slug) — never an internal numeric id.
// `area` is the HOWDI pillar that owns the destination.
const DIRECT_ROUTES=Object.freeze([
  {re:/^\/@([^/]+)$/,kind:"profile",area:"connect"},
  {re:/^\/posts\/([^/]+)$/,kind:"post",area:"connect"},
  {re:/^\/articles\/([^/]+)$/,kind:"article",area:"connect"},
  {re:/^\/vibes\/([^/]+)$/,kind:"vibe",area:"connect"},
  {re:/^\/groups\/([^/]+)$/,kind:"group",area:"connect"},
  {re:/^\/channels\/([^/]+)$/,kind:"channel",area:"connect"},
  {re:/^\/shop\/products\/([^/]+)$/,kind:"product",area:"shop"},
  {re:/^\/works\/workers\/([^/]+)$/,kind:"worker",area:"works"},
]);
export function parseGlobalSearchDirectRoute(pathname){
  let path=String(pathname??"").trim();
  if(path.length>1&&path.endsWith("/"))path=path.slice(0,-1);
  const route=safeGlobalSearchRoute(path);if(!route)return null;
  for(const {re,kind,area} of DIRECT_ROUTES){const m=route.match(re);if(m)return {kind,key:m[1],route,area};}
  return null;
}

// Shareable full-results page: /search?q=<query>&scope=<scope>. Only these two parameters are read or written.
export const GLOBAL_SEARCH_PAGE_PATH="/search";
export function normalizeGlobalSearchScope(scope){const v=String(scope??"").toLowerCase();return GLOBAL_SEARCH_SCOPE_OPTIONS.some(x=>x.value===v)?v:"all";}
export function buildGlobalSearchPageUrl({query,scope}={}){
  const q=normalizeGlobalSearchQuery(query).slice(0,80),sc=normalizeGlobalSearchScope(scope),params=new URLSearchParams();
  if(q)params.set("q",q);
  if(sc!=="all")params.set("scope",sc);
  const qs=params.toString();
  return GLOBAL_SEARCH_PAGE_PATH+(qs?"?"+qs:"");
}
export function parseGlobalSearchPageUrl(pathname,search=""){
  const path=String(pathname??"").replace(/\/+$/,"")||"/";
  if(path!==GLOBAL_SEARCH_PAGE_PATH)return null;
  let params;try{params=new URLSearchParams(String(search??""));}catch{params=new URLSearchParams();}
  return {query:normalizeGlobalSearchQuery(params.get("q")).slice(0,80),scope:normalizeGlobalSearchScope(params.get("scope"))};
}

function cleanText(value,max=160){const s=String(value??"").replace(/\s+/g," ").trim();return s?s.slice(0,max):"";}
function count(value){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>=0?n:0;}
function money(value,currency="INR"){const n=Number(value);if(!Number.isFinite(n)||n<0)return "";return String(currency||"INR").toUpperCase()==="INR"?"₹"+n.toLocaleString("en-IN",{maximumFractionDigits:2}):String(currency)+" "+n;}
export function normalizeGlobalSearchResult(item,sourceType){
  if(!item||typeof item!=="object")return null;
  const type=cleanText(item.type||String(sourceType||"").replace(/s$/,""),24).toLowerCase(),meta=META[type];if(!meta)return null;
  const route=safeGlobalSearchRoute(item.route);if(!route)return null;
  const publicUsername=cleanText(item.public_username,40)||null,publicKey=cleanText(item.public_key,80)||null;
  let title="",subtitle="",detail="",image="";
  if(type==="person"||type==="creator"){title=cleanText(item.display_name||publicUsername,80);subtitle=publicUsername?"@"+publicUsername:"";detail=cleanText(item.headline,120);image=cleanText(item.avatar_url,500);}
  else if(type==="teacher"){title=cleanText(item.display_name||publicUsername,80);subtitle=[publicUsername?"@"+publicUsername:"",cleanText(item.headline,100)].filter(Boolean).join(" · ");const c=count(item.course_count);detail=String(c)+" public course"+(c===1?"":"s");image=cleanText(item.avatar_url,500);}
  else if(type==="post"){title=cleanText(item.display_name||publicUsername||"HOWDI Post",80);subtitle=publicUsername?"@"+publicUsername:"";detail=cleanText(item.text_excerpt,180);}
  else if(type==="article"){title=cleanText(item.title||"HOWDI Article",120);subtitle=[cleanText(item.display_name,80),publicUsername?"@"+publicUsername:""].filter(Boolean).join(" · ");detail=cleanText(item.text_excerpt,180);image=cleanText(item.cover_url,500);}
  else if(type==="vibe"){title=cleanText(item.caption||"HOWDI Vibe",120);subtitle=[cleanText(item.display_name,80),publicUsername?"@"+publicUsername:""].filter(Boolean).join(" · ");image=cleanText(item.cover_url,500);}
  else if(type==="group"||type==="channel"){title=cleanText(item.name,100);subtitle=cleanText(item.category,80);const c=count(item.member_count);detail=String(c)+" member"+(c===1?"":"s");}
  else if(type==="product"){title=cleanText(item.title,120);subtitle=[cleanText(item.store?.name,80),cleanText(item.category,60)].filter(Boolean).join(" · ");detail=money(item.price,item.currency);image=cleanText(item.image_url,500);}
  else if(type==="worker"){title=cleanText(item.display_name,80);subtitle=[cleanText(item.skill,70),cleanText(item.service_area,70)].filter(Boolean).join(" · ");detail=[Number(item.rating)>0?"★ "+Number(item.rating).toFixed(1):"",String(count(item.completed_jobs))+" jobs"].filter(Boolean).join(" · ");}
  if(!title)return null;
  return {key:type+":"+route,type,type_label:meta.label,icon:meta.icon,title,subtitle:subtitle||null,meta:detail||null,image_url:image||null,route,public_key:publicKey,public_username:publicUsername};
}
export async function fetchGlobalSearchK5B({fetchImpl=globalThis.fetch,apiBase="",query,types=TYPES,limit=5,maxResults=50,headers={},signal}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("fetchImpl is required");
  const q=normalizeGlobalSearchQuery(query);if(!isGlobalSearchQueryValid(q))return {query:q,results:[],failed_types:[],requested_types:[]};
  const selected=[...new Set((Array.isArray(types)?types:[]).map(x=>String(x).toLowerCase()).filter(x=>TYPES.includes(x)))];
  const safeTypes=selected.length?selected:[...TYPES],safeLimit=Math.max(1,Math.min(20,Math.floor(Number(limit)||5))),cap=Math.max(1,Math.min(200,Math.floor(Number(maxResults)||50)));
  const base=String(apiBase||"").replace(/\/+$/,"");
  const rows=await Promise.all(safeTypes.map(async type=>{
    const url=base+"/api/search?q="+encodeURIComponent(q)+"&type="+encodeURIComponent(type)+"&limit="+safeLimit;
    try{
      const response=await fetchImpl(url,{headers,cache:"no-store",signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data?.status!=="success"||data?.type!==type)throw new Error(data?.message||"Search unavailable");
      return {type,ok:true,items:Array.isArray(data.results)?data.results:[],has_more:data.has_more===true};
    }catch(error){if(error?.name==="AbortError")throw error;return {type,ok:false,items:[]};}
  }));
  // Round-robin the type buckets so autocomplete cannot be monopolized by the first entity families.
  const seen=new Set(),results=[];
  outer:for(let i=0;i<safeLimit;i++)for(const row of rows){const item=row.items[i];if(!item)continue;const normalized=normalizeGlobalSearchResult(item,row.type);if(!normalized||seen.has(normalized.key))continue;seen.add(normalized.key);results.push({...normalized,family:row.type});if(results.length>=cap)break outer;}
  // family_counts/has_more_types let a full-results page decide whether a larger per-type limit can reveal more.
  const family_counts=Object.fromEntries(rows.map(x=>[x.type,x.items.length]));
  const has_more_types=rows.filter(x=>x.ok&&(x.has_more||x.items.length>=safeLimit)).map(x=>x.type);
  return {query:q,limit:safeLimit,results,failed_types:rows.filter(x=>!x.ok).map(x=>x.type),requested_types:safeTypes,family_counts,has_more_types};
}

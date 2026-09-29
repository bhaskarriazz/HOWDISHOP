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
  /^\/groups\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /^\/channels\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /^\/shop\/products\/PRD-[0-9A-F]{12}$/,
];
function isPublicCode(value){const v=String(value||"");return /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(v)&&!/^[0-9]+$/.test(v.replace(/[-_]/g,""))&&!/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i.test(v);}
export function normalizeGlobalSearchQuery(value){return String(value??"").normalize("NFKC").replace(/\s+/g," ").trim();}
export function isGlobalSearchQueryValid(value){const q=normalizeGlobalSearchQuery(value);return q.length>=2&&q.length<=80;}
export function typesForGlobalSearchScope(scope){const row=GLOBAL_SEARCH_SCOPE_OPTIONS.find(x=>x.value===scope);return row?[...row.types]:[...TYPES];}
export function safeGlobalSearchRoute(value){
  const route=String(value??"").trim();if(!route||route.length>180||route.includes("?")||route.includes("#"))return null;
  if(SIMPLE_ROUTES.some(re=>re.test(route)))return route;
  const vibe=route.match(/^\/vibes\/([^/]+)$/);if(vibe&&isPublicCode(vibe[1]))return route;
  const worker=route.match(/^\/works\/workers\/([^/]+)$/);if(worker&&isPublicCode(worker[1]))return route;
  return null;
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
  const safeTypes=selected.length?selected:[...TYPES],safeLimit=Math.max(1,Math.min(20,Math.floor(Number(limit)||5))),cap=Math.max(1,Math.min(100,Math.floor(Number(maxResults)||50)));
  const base=String(apiBase||"").replace(/\/+$/,"");
  const rows=await Promise.all(safeTypes.map(async type=>{
    const url=base+"/api/search?q="+encodeURIComponent(q)+"&type="+encodeURIComponent(type)+"&limit="+safeLimit;
    try{
      const response=await fetchImpl(url,{headers,cache:"no-store",signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data?.status!=="success"||data?.type!==type)throw new Error(data?.message||"Search unavailable");
      return {type,ok:true,items:Array.isArray(data.results)?data.results:[]};
    }catch(error){if(error?.name==="AbortError")throw error;return {type,ok:false,items:[]};}
  }));
  // Round-robin the type buckets so autocomplete cannot be monopolized by the first entity families.
  const seen=new Set(),results=[];
  outer:for(let i=0;i<safeLimit;i++)for(const row of rows){const item=row.items[i];if(!item)continue;const normalized=normalizeGlobalSearchResult(item,row.type);if(!normalized||seen.has(normalized.key))continue;seen.add(normalized.key);results.push(normalized);if(results.length>=cap)break outer;}
  return {query:q,results,failed_types:rows.filter(x=>!x.ok).map(x=>x.type),requested_types:safeTypes};
}

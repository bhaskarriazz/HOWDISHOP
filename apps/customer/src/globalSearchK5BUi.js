// Pure K5B header-search UI logic (no React/DOM) so keyboard, panel state and request
// sequencing can be tested with node:test and reused by GlobalSearchK5B.jsx.
import {fetchGlobalSearchK5B,isGlobalSearchQueryValid,normalizeGlobalSearchQuery,typesForGlobalSearchScope} from "./globalSearchK5B.js";

export const GLOBAL_SEARCH_DEBOUNCE_MS=220;

const FAMILY_LABELS=Object.freeze({
  people:"People",creators:"Creators",posts:"Posts",articles:"Articles",vibes:"Vibes",
  groups:"Groups",channels:"Channels",products:"Products",workers:"Workers",teachers:"Teachers",
});

export function globalSearchFamilyLabels(types){
  return [...new Set((Array.isArray(types)?types:[]).map(t=>FAMILY_LABELS[t]).filter(Boolean))];
}

// Arrow keys move through options; -1 means "focus stays on the input" (Enter then submits the full search).
export function nextGlobalSearchIndex(key,index,count){
  const n=Math.max(0,Math.floor(Number(count)||0)),i=Number.isInteger(index)?index:-1;
  if(!n)return -1;
  if(key==="ArrowDown")return i<0||i>=n-1?0:i+1;
  if(key==="ArrowUp")return i<=0?(i===0?-1:n-1):i-1;
  if(key==="Home")return 0;
  if(key==="End")return n-1;
  return Math.min(i,n-1);
}

// One source of truth for which body the dropdown renders.
export function resolveGlobalSearchPanelState({query,loading,results,failedTypes,requestedTypes,settled}){
  const q=normalizeGlobalSearchQuery(query);
  const rows=Array.isArray(results)?results:[];
  const failed=Array.isArray(failedTypes)?failedTypes:[];
  const requested=Array.isArray(requestedTypes)?requestedTypes:[];
  if(!q)return "idle";
  if(!isGlobalSearchQueryValid(q))return "hint";
  if(rows.length)return "results";
  if(loading||!settled)return "loading";
  if(requested.length&&failed.length>=requested.length)return "unavailable";
  return "empty";
}

const PANEL_GUTTER=12,PANEL_MAX_WIDTH=600;

// Panel box relative to the form: aligned with the form, never narrower than it (up to the viewport),
// and clamped inside the viewport gutters. The header row can make the form narrow on phones.
export function globalSearchPanelBox(formLeft,formWidth,viewportWidth){
  const width=Math.max(0,Math.min(Math.max(formWidth,PANEL_MAX_WIDTH),viewportWidth-PANEL_GUTTER*2));
  const overflowRight=formLeft+width-(viewportWidth-PANEL_GUTTER);
  const left=Math.max(PANEL_GUTTER-formLeft,Math.min(0,-overflowRight));
  return {left:Math.round(left),width:Math.round(width)};
}

// Debounced, abortable, latest-wins runner. Every schedule() cancels the pending timer and in-flight
// request of the previous one, and callbacks from superseded requests are dropped.
export function createGlobalSearchRunner({fetchImpl,apiBase="",delay=GLOBAL_SEARCH_DEBOUNCE_MS,limit=5,maxResults=30,getHeaders,onStart,onResult,onError,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let seq=0,timer=null,controller=null;
  const cancel=()=>{seq++;if(timer!==null){clearTimer(timer);timer=null;}controller?.abort();controller=null;};
  const schedule=({query,scope="all",limit:requestLimit=limit,immediate=false})=>{
    cancel();
    const q=normalizeGlobalSearchQuery(query);
    if(!isGlobalSearchQueryValid(q))return null;
    const id=seq,types=typesForGlobalSearchScope(scope);
    timer=setTimer(async()=>{
      timer=null;
      if(id!==seq)return;
      const ctl=new AbortController();controller=ctl;
      onStart?.({query:q,scope,types});
      try{
        const data=await fetchGlobalSearchK5B({fetchImpl,apiBase,query:q,types,limit:requestLimit,maxResults,headers:getHeaders?.()||{},signal:ctl.signal});
        if(id!==seq||ctl.signal.aborted)return;
        onResult?.({...data,scope});
      }catch(error){
        if(id!==seq||ctl.signal.aborted||error?.name==="AbortError")return;
        onError?.({query:q,scope,types,error});
      }finally{
        if(controller===ctl)controller=null;
      }
    },immediate?0:delay);
    return id;
  };
  return {schedule,cancel};
}

// Full-results page: the K5B API has no cursor (has_more is always false today), but it accepts up to 20
// results per type. The page starts at 10 per type and "Load more" re-queries at the API maximum once.
export const GLOBAL_SEARCH_PAGE_LIMIT=10;
export const GLOBAL_SEARCH_PAGE_MAX_LIMIT=20;
export function nextGlobalSearchPageLimit(response){
  const limit=Number(response?.limit)||0;
  const more=Array.isArray(response?.has_more_types)?response.has_more_types:[];
  return limit>0&&limit<GLOBAL_SEARCH_PAGE_MAX_LIMIT&&more.length?GLOBAL_SEARCH_PAGE_MAX_LIMIT:null;
}

// Groups normalized results into result families in the requested order; failed families are reported
// separately so successful ones always render.
export function groupGlobalSearchResults(results,requestedTypes,failedTypes=[]){
  const failed=new Set(Array.isArray(failedTypes)?failedTypes:[]);
  const order=(Array.isArray(requestedTypes)?requestedTypes:[]).filter(t=>FAMILY_LABELS[t]);
  const buckets=new Map(order.map(t=>[t,[]]));
  for(const item of Array.isArray(results)?results:[]){if(buckets.has(item?.family))buckets.get(item.family).push(item);}
  return order.filter(t=>!failed.has(t)&&buckets.get(t).length).map(t=>({family:t,label:FAMILY_LABELS[t],items:buckets.get(t)}));
}

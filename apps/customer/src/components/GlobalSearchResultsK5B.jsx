import { useEffect, useRef, useState } from "react";
import {
  GLOBAL_SEARCH_SCOPE_OPTIONS,
  isGlobalSearchQueryValid,
  normalizeGlobalSearchQuery,
  safeGlobalSearchRoute,
  typesForGlobalSearchScope,
} from "../globalSearchK5B";
import {
  GLOBAL_SEARCH_PAGE_LIMIT,
  createGlobalSearchRunner,
  globalSearchFamilyLabels,
  groupGlobalSearchResults,
  nextGlobalSearchPageLimit,
  resolveGlobalSearchPanelState,
} from "../globalSearchK5BUi";
import "./GlobalSearchK5B.css";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"http://localhost:5000").replace(/\/+$/,"");
const EMPTY=Object.freeze({query:"",scope:"all",limit:0,results:[],failed_types:[],requested_types:[],has_more_types:[]});

// K5B full results ("See all results"). Server-backed only: every row comes from fetchGlobalSearchK5B via the
// shared runner; there is no local product/worker/shop fallback. Query and scope are owned by the caller,
// which mirrors them into /search?q=&scope= so the page is shareable and survives reloads.
export default function GlobalSearchResultsK5B({
  query="",
  scope="all",
  onSearch,
  onNavigate,
  onClose,
  getHeaders,
  apiBase=API_BASE,
}){
  const q=normalizeGlobalSearchQuery(query);
  const valid=isGlobalSearchQueryValid(q);
  const getHeadersRef=useRef(getHeaders);
  getHeadersRef.current=getHeaders;
  const runnerRef=useRef(null);
  const headingRef=useRef(null);
  const [draft,setDraft]=useState(q);
  const [limit,setLimit]=useState(GLOBAL_SEARCH_PAGE_LIMIT);
  const [loading,setLoading]=useState(false);
  const [settled,setSettled]=useState(false);
  const [response,setResponse]=useState(EMPTY);

  if(!runnerRef.current){
    runnerRef.current=createGlobalSearchRunner({
      apiBase,
      limit:GLOBAL_SEARCH_PAGE_LIMIT,
      maxResults:200,
      getHeaders:()=>getHeadersRef.current?.()||{},
      onStart:()=>setLoading(true),
      onResult:(data)=>{setResponse(data);setLoading(false);setSettled(true);},
      onError:({query:failedQuery,scope:failedScope,types})=>{
        setResponse({...EMPTY,query:failedQuery,scope:failedScope,failed_types:types,requested_types:types});
        setLoading(false);setSettled(true);
      },
    });
  }

  const run=(nextLimit)=>{
    setSettled(false);
    runnerRef.current.schedule({query:q,scope,limit:nextLimit,immediate:true});
  };

  useEffect(()=>{setDraft(q);setLimit(GLOBAL_SEARCH_PAGE_LIMIT);},[q,scope]);

  useEffect(()=>{
    if(!valid){runnerRef.current.cancel();setLoading(false);setResponse(EMPTY);setSettled(false);return;}
    run(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[q,scope,limit,valid]);

  useEffect(()=>()=>runnerRef.current?.cancel(),[]);
  useEffect(()=>{headingRef.current?.focus({preventScroll:true});},[]);

  const current=response.query===q&&response.scope===scope;
  const requested=current?response.requested_types:typesForGlobalSearchScope(scope);
  const failed=current?response.failed_types:[];
  const results=current?response.results:[];
  const state=resolveGlobalSearchPanelState({query:q,loading:loading||!current,results,failedTypes:failed,requestedTypes:requested,settled:settled&&current});
  const groups=state==="results"?groupGlobalSearchResults(results,requested,failed):[];
  const failedLabels=settled&&current&&state!=="unavailable"?globalSearchFamilyLabels(failed):[];
  const moreLimit=settled&&current&&!loading?nextGlobalSearchPageLimit(response):null;

  const submit=(event)=>{
    event.preventDefault();
    onSearch?.({query:draft,scope});
  };

  const open=(item)=>{
    const route=safeGlobalSearchRoute(item?.route);
    if(route)onNavigate?.(route,item);
  };

  return <section className="k5b-results-page" aria-labelledby="k5b-results-title">
    <div className="k5b-results-inner">
      <header className="k5b-results-head">
        <div>
          <small>HOWDI GLOBAL SEARCH</small>
          <h2 id="k5b-results-title" ref={headingRef} tabIndex={-1}>{valid?<>Results for “{q}”</>:"Search HOWDI"}</h2>
        </div>
        {onClose&&<button type="button" className="k5b-results-close" onClick={onClose} aria-label="Close search results">×</button>}
      </header>

      <form className="k5b-results-form" role="search" onSubmit={submit}>
        <input
          type="search"
          enterKeyHint="search"
          aria-label="Search HOWDI"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(e)=>setDraft(e.target.value)}
          placeholder="Search people, posts, products, workers, teachers…"
        />
        <button type="submit">Search</button>
      </form>

      <div className="k5b-results-scopes" role="group" aria-label="Search category">
        {GLOBAL_SEARCH_SCOPE_OPTIONS.map(option=><button
          type="button"
          key={option.value}
          aria-pressed={scope===option.value}
          className={scope===option.value?"active":""}
          onClick={()=>onSearch?.({query:q,scope:option.value})}
        >{option.label}</button>)}
      </div>

      <div className="k5b-results-body" aria-live="polite" aria-busy={loading||!current}>
        {(state==="idle"||state==="hint")&&<div className="k5b-results-state"><strong>Type at least 2 characters</strong><span>Search people, creators, posts, articles, vibes, groups, channels, products, workers and teachers.</span></div>}
        {state==="loading"&&<div className="k5b-results-state"><span className="k5b-search-spinner" aria-hidden="true"/><strong>Searching HOWDI…</strong></div>}
        {state==="empty"&&<div className="k5b-results-state"><strong>No public HOWDI results for “{q}”</strong><span>Try another keyword or category.</span></div>}
        {state==="unavailable"&&<div className="k5b-results-state is-error" role="alert">
          <strong>Search is temporarily unavailable</strong>
          <button type="button" onClick={()=>run(limit)}>Try again</button>
        </div>}

        {!!failedLabels.length&&<div className="k5b-results-partial" role="status">
          {failedLabels.join(", ")} {failedLabels.length===1?"is":"are"} temporarily unavailable. Showing everything else.
          <button type="button" onClick={()=>run(limit)}>Retry</button>
        </div>}

        {groups.map(group=><section key={group.family} className="k5b-results-family" aria-label={group.label}>
          <h3>{group.label}<span>{group.items.length}</span></h3>
          <div className="k5b-results-grid">
            {group.items.map(item=><button type="button" key={item.key} className="k5b-results-card" onClick={()=>open(item)}>
              <span className="k5b-search-icon">{item.image_url?<img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"/>:item.icon}</span>
              <span className="k5b-search-copy">
                <small className="k5b-results-type">{item.type_label}</small>
                <strong>{item.title}</strong>
                {item.subtitle&&<small>{item.subtitle}</small>}
                {item.meta&&<em>{item.meta}</em>}
              </span>
            </button>)}
          </div>
        </section>)}

        {(moreLimit||(loading&&limit>GLOBAL_SEARCH_PAGE_LIMIT))&&<div className="k5b-results-more">
          <button type="button" disabled={loading} onClick={()=>setLimit(moreLimit)}>{loading?"Loading more…":"Load more results"}</button>
        </div>}
      </div>
    </div>
  </section>;
}

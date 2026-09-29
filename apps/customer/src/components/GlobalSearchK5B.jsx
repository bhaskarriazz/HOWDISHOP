import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  GLOBAL_SEARCH_SCOPE_OPTIONS,
  isGlobalSearchQueryValid,
  normalizeGlobalSearchQuery,
  safeGlobalSearchRoute,
  typesForGlobalSearchScope,
} from "../globalSearchK5B";
import {
  createGlobalSearchRunner,
  globalSearchPanelBox,
  globalSearchFamilyLabels,
  nextGlobalSearchIndex,
  resolveGlobalSearchPanelState,
} from "../globalSearchK5BUi";
import "./GlobalSearchK5B.css";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"http://localhost:5000").replace(/\/+$/,"");
const EMPTY_RESPONSE=Object.freeze({query:"",scope:"all",results:[],failed_types:[],requested_types:[]});

// Drop-in for the approved header search form: the root element *is* the existing
// `.howdi-ai-header-search` form, so every header layout rule in App.css still applies.
// The autocomplete panel is positioned inside the form.
export default function GlobalSearchK5B({
  value="",
  onChange,
  onSubmit,
  onNavigate,
  getHeaders,
  inputRef,
  apiBase=API_BASE,
  ariaLabel="Search HOWDI",
  placeholder="Search HOWDI…",
}){
  const baseId=useId().replace(/[^A-Za-z0-9_-]/g,"");
  const listId=`k5b-search-list-${baseId}`;
  const getHeadersRef=useRef(getHeaders);
  getHeadersRef.current=getHeaders;
  const runnerRef=useRef(null);
  const formRef=useRef(null);
  const [panelBox,setPanelBox]=useState(null);
  const [open,setOpen]=useState(false);
  const [scope,setScope]=useState("all");
  const [loading,setLoading]=useState(false);
  const [settled,setSettled]=useState(false);
  const [response,setResponse]=useState(EMPTY_RESPONSE);
  const [activeIndex,setActiveIndex]=useState(-1);
  const q=normalizeGlobalSearchQuery(value);
  const valid=isGlobalSearchQueryValid(q);

  if(!runnerRef.current){
    runnerRef.current=createGlobalSearchRunner({
      apiBase,
      getHeaders:()=>getHeadersRef.current?.()||{},
      onStart:()=>setLoading(true),
      onResult:(data)=>{setResponse(data);setLoading(false);setSettled(true);},
      onError:({query,scope:failedScope,types})=>{
        setResponse({query,scope:failedScope,results:[],failed_types:types,requested_types:types});
        setLoading(false);setSettled(true);
      },
    });
  }

  const runSearch=()=>{
    setSettled(false);
    runnerRef.current.schedule({query:q,scope});
  };

  useEffect(()=>{
    setActiveIndex(-1);
    if(!open||!valid){
      runnerRef.current.cancel();
      setLoading(false);
      if(!valid){setResponse(EMPTY_RESPONSE);setSettled(false);}
      return;
    }
    // Reopening the panel on the same query/scope reuses the settled response instead of refetching.
    if(settled&&response.query===q&&response.scope===scope)return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[q,scope,open,valid]);

  useEffect(()=>()=>runnerRef.current?.cancel(),[]);

  // Previous results stay visible (dimmed) while the next query loads, so typing does not flicker.
  const current=response.query===q&&response.scope===scope;
  const results=valid?response.results:[];
  const panelState=resolveGlobalSearchPanelState({
    query:q,
    loading:loading||!current,
    results,
    failedTypes:current?response.failed_types:[],
    requestedTypes:current?response.requested_types:typesForGlobalSearchScope(scope),
    settled:settled&&current,
  });
  const showPanel=open&&q.length>0;
  const showList=showPanel&&panelState==="results";
  const stale=showList&&(loading||!current);
  // Dimmed results from the previous query can still be clicked, but not keyboard-selected.
  const selectable=showList&&!stale;
  const failedLabels=settled&&current&&panelState!=="unavailable"?globalSearchFamilyLabels(response.failed_types):[];

  // A new response can reorder options, so the highlight never carries across responses.
  useEffect(()=>{setActiveIndex(-1);},[response]);

  useEffect(()=>{
    if(activeIndex<0)return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView?.({block:"nearest"});
  },[activeIndex,listId]);

  useLayoutEffect(()=>{
    if(!showPanel)return;
    const place=()=>{
      const rect=formRef.current?.getBoundingClientRect();
      if(rect)setPanelBox(globalSearchPanelBox(rect.left,rect.width,document.documentElement.clientWidth||window.innerWidth));
    };
    place();
    window.addEventListener("resize",place);
    const observer=typeof ResizeObserver==="function"?new ResizeObserver(place):null;
    if(observer&&formRef.current)observer.observe(formRef.current);
    return()=>{window.removeEventListener("resize",place);observer?.disconnect();};
  },[showPanel]);

  const close=()=>{setOpen(false);setActiveIndex(-1);};

  const go=(item)=>{
    const route=safeGlobalSearchRoute(item?.route);
    if(!route)return;
    close();
    if(onNavigate)onNavigate(route,item);
    else window.location.assign(route);
  };

  const submitAll=(event)=>{
    close();
    onSubmit?.(event,{query:q,scope});
  };

  const submit=(event)=>{
    event.preventDefault();
    if(selectable&&activeIndex>=0&&results[activeIndex]){go(results[activeIndex]);return;}
    submitAll(event);
  };

  const onKeyDown=(event)=>{
    const {key}=event;
    if(key==="ArrowDown"||key==="ArrowUp"){
      event.preventDefault();
      if(!showPanel){setOpen(true);return;}
      setActiveIndex(i=>nextGlobalSearchIndex(key,i,selectable?results.length:0));
    }else if((key==="Home"||key==="End")&&selectable&&activeIndex>=0){
      event.preventDefault();
      setActiveIndex(i=>nextGlobalSearchIndex(key,i,results.length));
    }else if(key==="Escape"){
      if(showPanel){event.preventDefault();close();}
      else if(value){event.preventDefault();onChange?.("");}
    }else if(key==="Tab"){
      close();
    }
  };

  return <form
    ref={formRef}
    className="howdi-ai-header-search k5b-global-search"
    role="search"
    onSubmit={submit}
    onBlur={(e)=>{if(!e.currentTarget.contains(e.relatedTarget))close();}}
  >
    <span className="howdi-ai-spark" aria-hidden="true">✦</span>
    <input
      ref={inputRef}
      type="search"
      enterKeyHint="search"
      role="combobox"
      aria-label={ariaLabel}
      aria-autocomplete="list"
      aria-expanded={showList}
      aria-controls={showList?listId:undefined}
      aria-activedescendant={selectable&&activeIndex>=0?`${listId}-${activeIndex}`:undefined}
      autoComplete="off"
      spellCheck={false}
      value={value}
      onFocus={()=>setOpen(true)}
      onChange={(event)=>{onChange?.(event.target.value);setOpen(true);}}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
    />
    <button type="submit" className="k5b-search-submit" aria-label="Search HOWDI" title="Search HOWDI">↗</button>

    {showPanel&&<div className="k5b-search-panel" style={panelBox||undefined} aria-label="HOWDI search suggestions">
      <div className="k5b-search-scopes" role="group" aria-label="Search category">
        {GLOBAL_SEARCH_SCOPE_OPTIONS.map(option=><button
          type="button"
          key={option.value}
          aria-pressed={scope===option.value}
          className={scope===option.value?"active":""}
          onMouseDown={(e)=>e.preventDefault()}
          onClick={()=>{setScope(option.value);setActiveIndex(-1);}}
        >{option.label}</button>)}
      </div>

      <div className="k5b-search-body" aria-live="polite" aria-busy={loading||!current}>
        {panelState==="hint"&&<div className="k5b-search-state">Type at least 2 characters.</div>}
        {panelState==="loading"&&<div className="k5b-search-state k5b-search-loading"><span className="k5b-search-spinner" aria-hidden="true"/>Searching HOWDI…</div>}
        {panelState==="empty"&&<div className="k5b-search-state">No public HOWDI results for “{q}”.</div>}
        {panelState==="unavailable"&&<div className="k5b-search-state">
          Search is temporarily unavailable.
          <button type="button" className="k5b-search-retry" onMouseDown={(e)=>e.preventDefault()} onClick={runSearch}>Try again</button>
        </div>}
        {showList&&<div id={listId} role="listbox" aria-label="Search results" className={stale?"k5b-search-results is-stale":"k5b-search-results"}>
          {results.map((item,index)=><div
            id={`${listId}-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={selectable&&index===activeIndex}
            key={item.key}
            className={selectable&&index===activeIndex?"k5b-search-option active":"k5b-search-option"}
            onMouseEnter={()=>{if(selectable)setActiveIndex(index);}}
            onMouseDown={(e)=>e.preventDefault()}
            onClick={()=>go(item)}
          >
            <span className="k5b-search-icon">{item.image_url?<img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer"/>:item.icon}</span>
            <span className="k5b-search-copy">
              <strong>{item.title}</strong>
              {item.subtitle&&<small>{item.subtitle}</small>}
            </span>
            <span className="k5b-search-meta"><small>{item.type_label}</small>{item.meta&&<b>{item.meta}</b>}</span>
          </div>)}
        </div>}
      </div>

      {!!failedLabels.length&&<div className="k5b-search-partial" role="status">
        {failedLabels.join(", ")} {failedLabels.length===1?"is":"are"} temporarily unavailable. Showing everything else.
      </div>}
      {valid&&<button type="button" className="k5b-search-all" onMouseDown={(e)=>e.preventDefault()} onClick={submitAll}>
        See all results for “{q}” →
      </button>}
    </div>}
  </form>;
}

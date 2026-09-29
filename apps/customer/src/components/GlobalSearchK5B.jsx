import { useEffect, useId, useRef, useState } from "react";
import {
  GLOBAL_SEARCH_SCOPE_OPTIONS,
  fetchGlobalSearchK5B,
  isGlobalSearchQueryValid,
  normalizeGlobalSearchQuery,
  safeGlobalSearchRoute,
  typesForGlobalSearchScope,
} from "../globalSearchK5B";
import "./GlobalSearchK5B.css";

const API_BASE=(import.meta.env.VITE_API_BASE_URL||"http://localhost:5000").replace(/\/+$/,"");

export default function GlobalSearchK5B({
  value="",
  onChange,
  onSubmit,
  headers={},
  inputRef,
  placeholder="Search HOWDI…",
}){
  const listId=useId();
  const requestRef=useRef(null);
  const [open,setOpen]=useState(false);
  const [scope,setScope]=useState("all");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState([]);
  const [failedTypes,setFailedTypes]=useState([]);
  const [activeIndex,setActiveIndex]=useState(-1);
  const q=normalizeGlobalSearchQuery(value);

  useEffect(()=>{
    requestRef.current?.abort();
    setActiveIndex(-1);
    if(!open||!isGlobalSearchQueryValid(q)){
      setResults([]);
      setFailedTypes([]);
      setLoading(false);
      return;
    }
    const controller=new AbortController();
    requestRef.current=controller;
    const timer=setTimeout(async()=>{
      setLoading(true);
      try{
        const data=await fetchGlobalSearchK5B({
          apiBase:API_BASE,
          query:q,
          types:typesForGlobalSearchScope(scope),
          limit:5,
          maxResults:30,
          headers,
          signal:controller.signal,
        });
        setResults(data.results);
        setFailedTypes(data.failed_types);
      }catch(error){
        if(error?.name!=="AbortError"){
          setResults([]);
          setFailedTypes(typesForGlobalSearchScope(scope));
        }
      }finally{
        if(!controller.signal.aborted)setLoading(false);
      }
    },220);
    return()=>{clearTimeout(timer);controller.abort();};
  },[q,scope,open]);

  const go=(item)=>{
    const route=safeGlobalSearchRoute(item?.route);
    if(!route)return;
    setOpen(false);
    window.location.assign(route);
  };

  const submit=(event)=>{
    event.preventDefault();
    if(activeIndex>=0&&results[activeIndex]){go(results[activeIndex]);return;}
    setOpen(false);
    onSubmit?.(event);
  };

  const onKeyDown=(event)=>{
    if(event.key==="ArrowDown"){
      event.preventDefault();
      setOpen(true);
      setActiveIndex(i=>results.length?Math.min(i+1,results.length-1):-1);
    }else if(event.key==="ArrowUp"){
      event.preventDefault();
      setActiveIndex(i=>results.length?Math.max(i-1,0):-1);
    }else if(event.key==="Escape"){
      setOpen(false);
      setActiveIndex(-1);
    }else if(event.key==="Enter"&&open&&activeIndex>=0&&results[activeIndex]){
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  return <div className="k5b-global-search" onBlur={(e)=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
    <form className="howdi-ai-header-search k5b-global-search-form" onSubmit={submit}>
      <span className="howdi-ai-spark" aria-hidden="true">✦</span>
      <input
        ref={inputRef}
        role="combobox"
        aria-label="Search HOWDI"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeIndex>=0?`${listId}-${activeIndex}`:undefined}
        autoComplete="off"
        value={value}
        onFocus={()=>setOpen(true)}
        onChange={(event)=>{onChange?.(event.target.value);setOpen(true)}}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      <button type="submit" aria-label="Search HOWDI" title="Search HOWDI">↗</button>
    </form>

    {open&&q.length>0&&<div className="k5b-search-panel" aria-label="HOWDI search suggestions">
      <div className="k5b-search-scopes" role="tablist" aria-label="Search category">
        {GLOBAL_SEARCH_SCOPE_OPTIONS.map(option=><button
          type="button"
          key={option.value}
          role="tab"
          aria-selected={scope===option.value}
          className={scope===option.value?"active":""}
          onMouseDown={(e)=>e.preventDefault()}
          onClick={()=>setScope(option.value)}
        >{option.label}</button>)}
      </div>

      {!isGlobalSearchQueryValid(q)
        ?<div className="k5b-search-state">Type at least 2 characters.</div>
        :loading
          ?<div className="k5b-search-state" aria-live="polite">Searching HOWDI…</div>
          :results.length
            ?<div id={listId} role="listbox" className="k5b-search-results">
              {results.map((item,index)=><button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index===activeIndex}
                key={item.key}
                className={index===activeIndex?"active":""}
                onMouseEnter={()=>setActiveIndex(index)}
                onMouseDown={(e)=>e.preventDefault()}
                onClick={()=>go(item)}
              >
                <span className="k5b-search-icon">{item.image_url?<img src={item.image_url} alt="" loading="lazy"/>:item.icon}</span>
                <span className="k5b-search-copy">
                  <strong>{item.title}</strong>
                  {item.subtitle&&<small>{item.subtitle}</small>}
                </span>
                <span className="k5b-search-meta"><small>{item.type_label}</small>{item.meta&&<b>{item.meta}</b>}</span>
              </button>)}
            </div>
            :<div className="k5b-search-state">No public HOWDI results found.</div>
      }

      {!!failedTypes.length&&<div className="k5b-search-partial" role="status">Some result types are temporarily unavailable. Showing everything else.</div>}
      <button type="button" className="k5b-search-all" onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{setOpen(false);onSubmit?.(e)}}>
        See all results for “{q}” →
      </button>
    </div>}
  </div>;
}

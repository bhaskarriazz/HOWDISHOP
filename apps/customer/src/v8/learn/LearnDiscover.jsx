// HOWDI V8 — Learn Discovery (P8 / LRN-DISC-001..003). Replaces the old catalogue grid on /learn/courses.
// Real filters (Goal, Language, Level, Price + More filters), search across course/skill/project/teacher, sort, paging,
// selected-filter chips, result count, Clear all, recovery empty states, shareable URL, mobile filter drawer.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { V8Icon } from "../V8Shell";
import { Skel } from "../connect/common";
import { inr } from "../connect/HPayUtilities";
import {
  FILTERS, FILTER_KEYS, MORE_FILTERS, PAGE_SIZE, PRIMARY_FILTERS, SKILLS, SORTS, activeCount, cardFacts, clearAll,
  discoveryApiQuery, discoveryChips, discoverySearch, effectiveSort, mediaSrc, parseDiscoveryParams,
  reconcileApplied, recoverySuggestions, removeChip, toggleValue,
} from "./learnDiscovery";
import "./learn-discover.css";

const SKILL_ICON = { "Crochet & Handmade": "sparkles", "Tailoring & Textiles": "tag", Cooking: "fire", "Digital skills": "grid", "Business & Selling": "store", Languages: "globe", Wellness: "smile" };
const COURSES_PATH = "/learn/courses";

function readUrlState() {
  if (typeof window === "undefined") return parseDiscoveryParams("");
  return parseDiscoveryParams(window.location.search);
}

export default function LearnDiscover({ api, apiBase, user, nav, onRequireLogin, onFindPath }) {
  const [state, setState] = useState(readUrlState);
  const [draft, setDraft] = useState(state.q);
  const [data, setData] = useState({ status: "loading", items: [], total: 0, facets: null, hasMore: false, nextOffset: null });
  const [more, setMore] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState(null);
  const reqRef = useRef(0);

  // URL ← state (replace: filter tweaks are one history entry; Back leaves the page with its filters intact)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname.replace(/\/+$/, "");
    if (path !== COURSES_PATH && path !== "/learn") return;
    const next = `${COURSES_PATH}${discoverySearch(state)}`;
    if (window.location.pathname + window.location.search !== next) {
      try { window.history.replaceState({ ...(window.history.state || {}), howdiV8: next }, "", next); } catch { /* ignore */ }
    }
  }, [state]);

  // state ← URL on Back/Forward into this page
  useEffect(() => {
    const onPop = () => { if (window.location.pathname.replace(/\/+$/, "") === COURSES_PATH) { const s = readUrlState(); setState(s); setDraft(s.q); } };
    window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop);
  }, []);

  // search box: commit after a short pause
  useEffect(() => {
    const t = window.setTimeout(() => setState((s) => (s.q === draft.trim().slice(0, 60) ? s : { ...s, q: draft.trim().slice(0, 60), sort: s.sort === "relevance" && !draft.trim() ? "" : s.sort })), 300);
    return () => window.clearTimeout(t);
  }, [draft]);

  const load = useCallback(async (offset = 0) => {
    const id = ++reqRef.current;
    if (offset) setMore(true); else setData((d) => ({ ...d, status: d.items.length ? "refreshing" : "loading" }));
    const r = await api("GET", `/api/v8/learn/courses?${discoveryApiQuery(state, offset, PAGE_SIZE)}`);
    if (id !== reqRef.current) return;
    setMore(false);
    if (!r.ok) { setData((d) => ({ ...d, status: offset ? "ready" : "error", error: r.json?.message || "Courses couldn’t load.", moreError: offset ? (r.json?.message || "Couldn’t load more.") : null })); return; }
    const j = r.json;
    setData((d) => {
      const base = offset ? d.items : [];
      const seen = new Set(base.map((x) => x.public_key));
      return { status: "ready", items: [...base, ...(j.items || []).filter((x) => !seen.has(x.public_key))], total: Number(j.total) || 0, facets: j.facets || d.facets, hasMore: Boolean(j.has_more), nextOffset: j.next_offset ?? null, moreError: null };
    });
    const reconciled = reconcileApplied(state, j.applied);
    if (FILTER_KEYS.some((k) => reconciled[k].length !== state[k].length)) setState(reconciled);
  }, [api, state]);

  useEffect(() => { load(0); }, [load]);

  // quick-filter popovers close on outside click
  useEffect(() => {
    if (!pop) return undefined;
    const onDown = (e) => { if (!e.target.closest?.(".lx-pill-wrap")) setPop(null); };
    document.addEventListener("mousedown", onDown); return () => document.removeEventListener("mousedown", onDown);
  }, [pop]);

  const toggleSave = async (course) => {
    if (!user) { onRequireLogin?.(); return; }
    const want = !course.saved;
    setData((d) => ({ ...d, items: d.items.map((x) => (x.public_key === course.public_key ? { ...x, saved: want } : x)) }));
    const r = await api("POST", `/api/v8/learn/courses/${course.public_key}/save`, { saved: want });
    if (!r.ok) setData((d) => ({ ...d, items: d.items.map((x) => (x.public_key === course.public_key ? { ...x, saved: !want } : x)) }));
  };

  const set = (next) => { setPop(null); setState(next); if (next.q !== draft) setDraft(next.q); };
  const chips = discoveryChips(state);
  const nFilters = activeCount(state);
  const langOptions = useMemo(() => {
    const live = (data.facets?.languages || []).map((l) => [l.value, `${l.value}`, l.count]);
    for (const v of state.lang) if (!live.some(([x]) => x === v)) live.push([v, v, 0]);
    return live;
  }, [data.facets, state.lang]);
  const optionsFor = (key) => (key === "lang" ? langOptions : key === "skill" ? SKILLS.map((s) => [s, s, data.facets?.skills?.find((x) => x.value === s)?.count]) : FILTERS[key].options);
  const sortValue = effectiveSort(state);
  const busy = data.status === "loading" || data.status === "refreshing";

  const group = (key, variant) => (
    <fieldset key={key} className={`lx-group ${variant || ""}`}>
      <legend>{FILTERS[key].label}</legend>
      <div className="lx-opts">
        {optionsFor(key).map(([value, label, count]) => {
          const on = state[key].includes(value);
          return <button key={value} type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => set(toggleValue(state, key, value))}>
            {on ? <V8Icon name="check" size={14} /> : null}<span>{label}</span>{typeof count === "number" && key !== "skill" ? <small>{count}</small> : null}
          </button>;
        })}
        {key === "lang" && !langOptions.length ? <small className="lx-none">No languages yet</small> : null}
      </div>
    </fieldset>
  );

  return (
    <section className="lx" aria-label="Discover courses">
      <header className="lx-hero">
        <div className="lx-hero-copy">
          <small className="lx-kicker"><V8Icon name="learn" size={16} /> Learn & Earn</small>
          <h1>Learn a skill. Make something real.</h1>
          <p>Practical courses from verified HOWDI teachers. Filter by what you want to make, your language and your time.</p>
        </div>
        <form className="lx-search" role="search" onSubmit={(e) => { e.preventDefault(); set({ ...state, q: draft.trim().slice(0, 60) }); }}>
          <V8Icon name="search" size={20} />
          <input type="search" value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} placeholder="Search a course, skill, project or teacher" aria-label="Search courses" enterKeyHint="search" />
          {draft ? <button type="button" className="lx-clear-q" aria-label="Clear search" onClick={() => { setDraft(""); set({ ...state, q: "", sort: state.sort === "relevance" ? "" : state.sort }); }}><V8Icon name="x" size={16} /></button> : null}
        </form>
        {onFindPath ? <button type="button" className="lx-path-cta" onClick={onFindPath}><V8Icon name="sparkles" size={18} /><span><b>Find my learning path</b><small>3 quick questions</small></span><V8Icon name="chevr" size={16} /></button> : null}
      </header>

      <nav className="lx-skills" aria-label="Skills">
        <button type="button" className={!state.skill.length ? "on" : ""} aria-pressed={!state.skill.length} onClick={() => set({ ...state, skill: [] })}><V8Icon name="grid" size={16} />All skills</button>
        {SKILLS.map((s) => <button key={s} type="button" className={state.skill.includes(s) ? "on" : ""} aria-pressed={state.skill.includes(s)} onClick={() => set({ ...state, skill: state.skill.length === 1 && state.skill[0] === s ? [] : [s] })}><V8Icon name={SKILL_ICON[s] || "learn"} size={16} />{s}</button>)}
      </nav>

      <div className="lx-body">
        <aside className="lx-panel" aria-label="Filters">
          <div className="lx-panel-head"><b>Filters</b>{nFilters ? <button type="button" className="v8-link" onClick={() => set(clearAll(state))}>Clear all</button> : null}</div>
          {PRIMARY_FILTERS.map((k) => group(k))}
          <details className="lx-more" open={MORE_FILTERS.some((k) => state[k].length) || undefined}>
            <summary>More filters{activeCount(state, MORE_FILTERS) ? <em>{activeCount(state, MORE_FILTERS)}</em> : null}</summary>
            {MORE_FILTERS.filter((k) => k !== "skill").map((k) => group(k))}
          </details>
        </aside>

        <div className="lx-results">
          <div className="lx-toolbar">
            <button type="button" className="lx-filter-btn" onClick={() => setDrawer(true)} aria-haspopup="dialog"><V8Icon name="sliders" size={18} />Filters{nFilters ? <em>{nFilters}</em> : null}</button>
            <div className="lx-pills" role="group" aria-label="Quick filters">
              {PRIMARY_FILTERS.map((k) => <div key={k} className="lx-pill-wrap">
                <button type="button" className={`lx-pill ${state[k].length ? "on" : ""}`} aria-expanded={pop === k} onClick={() => setPop(pop === k ? null : k)}>
                  {FILTERS[k].label}{state[k].length ? <em>{state[k].length}</em> : null}<V8Icon name="chev" size={14} /></button>
                {pop === k ? <div className="lx-pop" role="dialog" aria-label={FILTERS[k].label} onKeyDown={(e) => { if (e.key === "Escape") setPop(null); }}>{group(k, "in-pop")}<button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => setPop(null)}>Done</button></div> : null}
              </div>)}
              <button type="button" className={`lx-pill ${activeCount(state, MORE_FILTERS) ? "on" : ""}`} onClick={() => setDrawer(true)}>More filters{activeCount(state, MORE_FILTERS) ? <em>{activeCount(state, MORE_FILTERS)}</em> : null}</button>
            </div>
            <p className="lx-count" aria-live="polite">{data.status === "loading" ? "Finding courses…" : data.status === "error" ? "" : <><b>{data.total}</b> course{data.total === 1 ? "" : "s"}</>}</p>
            <label className="lx-sort"><span>Sort</span>
              <select value={sortValue} onChange={(e) => set({ ...state, sort: e.target.value === (state.q ? "relevance" : "newest") ? "" : e.target.value })}>
                {SORTS.filter(([v]) => v !== "relevance" || state.q).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </div>

          {chips.length ? <div className="lx-chips" aria-label="Selected filters">
            {chips.map((c) => <button key={`${c.key}:${c.value}`} type="button" onClick={() => set(removeChip(state, c))} aria-label={`Remove ${c.label}`}>{c.label}<V8Icon name="x" size={14} /></button>)}
            <button type="button" className="lx-clearall" onClick={() => set(clearAll(state))}>Clear all</button>
          </div> : null}

          {data.status === "loading" ? <div className="lx-grid" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="lx-card lx-skel"><Skel h={150} r={16} /><Skel h={16} w="70%" /><Skel h={12} w="50%" /></div>)}</div>
            : data.status === "error" ? <div className="lx-state" role="alert"><V8Icon name="alert" size={28} /><b>Courses couldn’t load</b><p>{data.error}</p><button type="button" className="v8-btn v8-btn-primary" onClick={() => load(0)}>Try again</button></div>
              : !data.items.length ? <Empty state={state} set={set} nav={nav} />
                : <>
                  <div className={`lx-grid ${busy ? "is-busy" : ""}`}>{data.items.map((c) => <CourseCard key={c.public_key} c={c} apiBase={apiBase} nav={nav} onSave={toggleSave} />)}</div>
                  <div className="lx-more-row">
                    <small>Showing {data.items.length} of {data.total}</small>
                    {data.hasMore ? <button type="button" className="v8-btn" disabled={more} onClick={() => load(data.nextOffset || data.items.length)}>{more ? "Loading…" : "Load more courses"}</button> : null}
                    {data.moreError ? <small className="v8c-err" role="alert">{data.moreError}</small> : null}
                  </div>
                </>}
        </div>
      </div>

      {drawer && typeof document !== "undefined" ? createPortal(<div className="lx-drawer-back" onMouseDown={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
        <div className="lx-drawer" role="dialog" aria-modal="true" aria-label="All filters" onKeyDown={(e) => { if (e.key === "Escape") setDrawer(false); }}>
          <header><b>Filters</b><button type="button" className="v8-icon-btn" aria-label="Close filters" onClick={() => setDrawer(false)}><V8Icon name="x" size={20} /></button></header>
          <div className="lx-drawer-body">{FILTER_KEYS.map((k) => group(k, "in-drawer"))}</div>
          <footer><button type="button" className="v8-btn" disabled={!nFilters} onClick={() => set(clearAll(state))}>Clear all</button>
            <button type="button" className="v8-btn v8-btn-primary" onClick={() => setDrawer(false)}>{busy ? "Updating…" : `Show ${data.total} course${data.total === 1 ? "" : "s"}`}</button></footer>
        </div>
      </div>, document.body) : null}
    </section>
  );
}

function Empty({ state, set, nav }) {
  const filtered = Boolean(state.q || activeCount(state));
  if (!filtered) return <div className="lx-state"><V8Icon name="learn" size={30} /><b>No courses yet</b><p>Teachers are adding courses. You can also teach what you know.</p><button type="button" className="v8-btn" onClick={() => nav("teach")}>Teach on HOWDI</button></div>;
  const tips = recoverySuggestions(state);
  return (
    <div className="lx-state">
      <V8Icon name="search" size={30} />
      <b>No courses match {state.q ? `“${state.q}” with ` : ""}these filters</b>
      <p>Try one of these, or clear everything to see all courses.</p>
      <div className="lx-recover">{tips.map((t) => <button key={t.label} type="button" className="v8-btn" onClick={() => set(t.next)}>{t.label}</button>)}
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => set(clearAll(state))}>Clear all filters</button></div>
    </div>
  );
}

export function CourseCard({ c, apiBase, nav, onSave, compact }) {
  const f = cardFacts(c); const img = mediaSrc(apiBase, c.image);
  return (
    <article className={`lx-card ${compact ? "compact" : ""}`}>
      <div className="lx-cover">
        {img ? <img src={img} alt="" loading="lazy" /> : <span className="lx-cover-ph"><V8Icon name="learn" size={34} /><small>{c.category}</small></span>}
        <em className="lx-price">{c.free ? "Free" : inr(c.price)}</em>
        {onSave ? <button type="button" className={`lx-save ${c.saved ? "on" : ""}`} aria-pressed={Boolean(c.saved)} aria-label={c.saved ? `Remove ${c.title} from saved` : `Save ${c.title}`} onClick={() => onSave(c)}><V8Icon name="heart" size={18} fill={Boolean(c.saved)} /></button> : null}
        {f.formats.length ? <span className="lx-formats">{f.formats.map((x) => <i key={x}>{x}</i>)}</span> : null}
      </div>
      <div className="lx-card-body">
        <span className="lx-tags">{[c.category, f.level, c.language].filter(Boolean).map((t) => <i key={t}>{t}</i>)}</span>
        <h3><button type="button" className="lx-title" onClick={() => nav(`courses/${c.public_key}`)}>{c.title}</button></h3>
        {c.outcome ? <p className="lx-outcome"><V8Icon name="star" size={14} /><span><b>You’ll make:</b> {c.outcome}</span></p> : c.tagline ? <p className="lx-outcome plain">{c.tagline}</p> : null}
        <p className="lx-teacher">{c.by_howdi ? "HOWDI Learn" : c.teacher ? <>@{c.teacher.public_username}{c.teacher.verified ? <V8Icon name="check" size={12} /> : null}</> : null}</p>
        <ul className="lx-facts">
          {f.duration ? <li><V8Icon name="clock" size={14} />{f.duration} · {c.lessons} lesson{c.lessons === 1 ? "" : "s"}</li> : null}
          {f.support.length ? <li><V8Icon name="shield" size={14} />{f.support.join(" · ")}</li> : null}
          <li><V8Icon name="box" size={14} />{f.materials}</li>
        </ul>
        {c.enrolled ? <span className="lx-prog"><span className="v8l-bar"><i style={{ width: `${c.progress}%` }} /></span><small>{c.progress}%</small></span> : null}
        <div className="lx-card-actions">
          <button type="button" className="v8-btn v8-btn-primary" onClick={() => nav(`courses/${c.public_key}`)}>{c.enrolled ? "Continue" : "View course"}</button>
          {c.preview_lesson && !c.enrolled ? <button type="button" className="v8-btn" onClick={() => nav(`lessons/${c.preview_lesson}`)}><V8Icon name="play" size={14} />Preview</button> : null}
          {c.learners ? <small className="lx-learners">{c.learners} learner{c.learners === 1 ? "" : "s"}</small> : null}
        </div>
      </div>
    </article>
  );
}


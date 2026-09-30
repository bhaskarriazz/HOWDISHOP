// HOWDI V8 Discover — Explore (V8__07 desktop Explore + mobile 1 Explore + 6 Empty state, PRIOR__10 panel 1), Hype and
// Tips feeds (PRIOR__15 panels 1, 3, 6 and V8__07 mobile 3–4), Creators, and Ask HOWDI (V8__07 mobile 2: microphone
// permission, transcription, safe answer steps, source article, 👍/👎, ask another). Ask HOWDI is Preview/Test: no AI
// provider is connected — answers are retrieved from public HOWDI Tips and Articles and always cite them.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, useV8Ui } from "../V8System";
import { Ava, Skel, Tabs, fmt, safeImg } from "./common";
import { PostCard } from "./Post";

const DISCOVER_TABS = [["explore", "Explore"], ["hype", "Hype"], ["tips", "Tips"], ["creators", "Creators"], ["communities", "Communities"]];
export function DiscoverNav({ value, onNav }) {
  return <nav className="v8d-nav" aria-label="Discover"><Tabs tabs={DISCOVER_TABS.map(([v, l]) => ({ value: v, label: l }))} value={value} onChange={(v) => onNav(v)} label="Discover" /></nav>;
}

// ------------------------------------------------------------------ Explore
const TYPES = [["all", "All"], ["people", "People"], ["communities", "Communities"], ["vibes", "Vibes"], ["products", "Products"], ["workers", "Workers"], ["courses", "Crochet Courses"]];
export function Explore({ api, user, onNav, onRequireLogin, onOpenProfile, onRoute, query }) {
  const ui = useV8Ui();
  const [q, setQ] = useState(query.get("q") || ""); const [type, setType] = useState(query.get("type") || "all"); const [sort, setSort] = useState("relevance");
  const [d, setD] = useState({ status: "idle" }); const [rev, setRev] = useState(0); const [trends, setTrends] = useState([]); const [hype, setHype] = useState([]); const [tips, setTips] = useState([]);
  const [follow, setFollow] = useState({});
  useEffect(() => { api("GET", "/api/v8/explore/trends").then((r) => r.ok && setTrends(r.json.trends)); api("GET", "/api/v8/hype?limit=4").then((r) => r.ok && setHype(r.json.items)); api("GET", "/api/v8/tips?limit=4").then((r) => r.ok && setTips(r.json.items)); }, [api]);
  useEffect(() => {
    const term = q.trim(); if (term.length < 2) { setD({ status: "idle" }); return undefined; }
    const ctl = new AbortController(); const t = setTimeout(async () => {
      setD({ status: "loading" });
      const [s, c, v] = await Promise.all([
        api("GET", `/api/search?q=${encodeURIComponent(term)}&types=person,product,worker,course&limit=10`, undefined, { signal: ctl.signal }),
        api("GET", `/api/v8/communities?q=${encodeURIComponent(term)}`, undefined, { signal: ctl.signal }),
        api("GET", `/api/v8/vibes?tab=explore&limit=10&q=${encodeURIComponent(term)}`, undefined, { signal: ctl.signal }),
      ]);
      if (s.aborted) return;
      if (!s.ok && !c.ok && !v.ok) { setD({ status: "error" }); return; }
      const res = s.ok ? s.json.results || [] : [];
      setD({ status: "ready", people: res.filter((x) => x.type === "person"), products: res.filter((x) => x.type === "product"), workers: res.filter((x) => x.type === "worker"), courses: res.filter((x) => x.type === "course"),
        communities: c.ok ? (c.json.items || []) : [], vibes: v.ok ? (v.json.items || []) : [] });
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, rev, api]); // eslint-disable-line react-hooks/exhaustive-deps
  const doFollow = async (handle) => {
    if (!user) { onRequireLogin(); return; }
    const on = Boolean(follow[handle]); setFollow((f) => ({ ...f, [handle]: !on }));
    const r = await api(on ? "DELETE" : "POST", `/api/v8/creators/${handle}/follow`);
    if (!r.ok) { setFollow((f) => ({ ...f, [handle]: on })); ui?.toast({ kind: "error", title: "Couldn’t update", message: r.json.message }); }
  };
  const total = d.status === "ready" ? ["people", "communities", "vibes", "products", "workers", "courses"].reduce((a, k) => a + d[k].length, 0) : 0;
  const cols = type === "all" ? ["people", "communities", "vibes", "products", "workers", "courses"] : [type];
  const Person = ({ x }) => { const h = String(x.route).replace(/^\/@/, ""); const on = follow[h] ?? (x.badges || []).includes("following"); return (
    <div className="v8d-row"><button type="button" className="v8d-row-open" onClick={() => onOpenProfile(h)}><Ava src={x.image} name={x.title} size={44} /><span><b>@{h}</b><small>{x.title}</small>{x.subtitle ? <small>{x.subtitle}</small> : null}</span></button>
      <button type="button" className={`v8-btn ${on ? "" : "v8-btn-soft"}`} aria-pressed={on} onClick={() => doFollow(h)}>{on ? "Following" : "Follow"}</button></div>); };
  const Item = ({ x, icon }) => (<button type="button" className="v8d-row v8d-row-open" onClick={() => onRoute(x.route)}>{safeImg(x.image) ? <img src={x.image} alt="" /> : <span className="ph"><V8Icon name={icon} size={20} /></span>}<span><b>{x.title}</b>{x.subtitle ? <small>{x.subtitle}</small> : null}{(x.badges || []).includes("verified") ? <small className="v8d-ok"><V8Icon name="check" size={12} />Verified</small> : null}</span></button>);
  const col = (k) => {
    const list = d[k] || []; const label = TYPES.find((t) => t[0] === k)[1];
    return (
      <section key={k} className="v8d-col" aria-label={label}><header className="v8c-sec-head"><h2>{label}</h2>{type === "all" && list.length > 3 ? <button type="button" className="v8-link" onClick={() => setType(k)}>See all</button> : null}</header>
        {!list.length ? <p className="v8c-muted small">No {label.toLowerCase()} match.</p> : list.slice(0, type === "all" ? 3 : 20).map((x, i) => (
          k === "people" ? <Person key={i} x={x} />
            : k === "communities" ? <button key={x.public_key} type="button" className="v8d-row v8d-row-open" onClick={() => onNav(`communities/${x.public_key}`)}>{safeImg(x.image_url) ? <img src={x.image_url} alt="" /> : <span className="ph"><V8Icon name="users" size={20} /></span>}<span><b>{x.name}</b><small>{fmt(x.member_count)} {x.kind === "channel" ? "subscribers" : "members"}</small>{x.description ? <small className="clamp1">{x.description}</small> : null}</span></button>
              : k === "vibes" ? <button key={x.public_key} type="button" className="v8d-row v8d-row-open" onClick={() => onNav(`vibe/${x.public_key}`)}><img src={safeImg(x.cover_url) || ""} alt="" /><span><b className="clamp1">{x.caption}</b><small>@{x.author.public_username} · {fmt(x.counts.plays || x.counts.likes)} views</small></span></button>
                : <Item key={i} x={x} icon={{ products: "shop", workers: "works", courses: "learn" }[k]} />))}
      </section>
    );
  };
  return (
    <div className="v8d">
      <DiscoverNav value="explore" onNav={onNav} />
      <header className="v8d-head"><h1>Explore</h1><p>Find people, communities, Vibes, products, workers and crochet courses on HOWDI.</p></header>
      <div className="v8d-search"><V8Icon name="search" size={20} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, communities, Vibes, products, workers, courses…" aria-label="Search HOWDI" autoFocus />
        {q ? <button type="button" className="v8-icon-btn" aria-label="Clear search" onClick={() => setQ("")}><V8Icon name="x" size={18} /></button> : null}
        <button type="button" className="v8-btn v8-btn-soft v8d-ask" onClick={() => onNav("ask")}><V8Icon name="mic" size={18} />Ask HOWDI</button></div>
      {d.status !== "idle" ? (
        <div className="v8d-types"><div className="v8d-chips" role="tablist" aria-label="Result type">{TYPES.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={type === v} className={`v8c-chip ${type === v ? "on" : ""}`} onClick={() => setType(v)}>{l}</button>)}</div>
          <label className="v8d-sort"><span className="v8-sr">Sort</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="relevance">Relevance</option></select></label></div>
      ) : null}
      {d.status === "idle" ? (
        <div className="v8d-idle">
          <section className="v8-card"><h2><V8Icon name="trend" size={18} /> Trending on HOWDI</h2><div className="v8d-trends">{trends.length ? trends.map((t) => <button key={t.tag} type="button" className="v8c-chip" onClick={() => setQ(t.tag)}>#{t.tag}<small>{t.count}</small></button>) : <p className="v8c-muted">Trends appear as people post.</p>}</div></section>
          <section className="v8-card"><header className="v8c-sec-head"><h2><V8Icon name="fire" size={18} /> Trending on Hype</h2><button type="button" className="v8-link" onClick={() => onNav("hype")}>See all</button></header><MiniGrid items={hype} onOpen={(x) => onNav(x.route.replace(/^\/connect\//, ""))} /></section>
          <section className="v8-card"><header className="v8c-sec-head"><h2><V8Icon name="bulb" size={18} /> Popular Tips</h2><button type="button" className="v8-link" onClick={() => onNav("tips")}>See all</button></header><MiniGrid items={tips} onOpen={(x) => onNav(x.route.replace(/^\/connect\//, ""))} /></section>
        </div>
      ) : d.status === "loading" ? <div className="v8d-cols">{[0, 1, 2].map((i) => <div key={i} className="v8d-col"><Skel h={16} w="40%" /><Skel h={52} /><Skel h={52} /></div>)}</div>
        : d.status === "error" ? <div className="v8-card"><V8State kind="error" title="Search didn’t load" message="Check your connection and try again." actionLabel="Retry" onAction={() => setRev((x) => x + 1)} /></div>
          : !total ? (
            <div className="v8-card v8d-empty"><V8State icon="search" title="Nothing found yet" message="Try different keywords or check your spelling." actionLabel="Retry" onAction={() => setRev((x) => x + 1)} /><button type="button" className="v8-btn v8-btn-block" onClick={() => setQ("")}>Go back</button></div>
          ) : <div className={`v8d-cols ${type === "all" ? "" : "one"}`}>{cols.map(col)}</div>}
    </div>
  );
}
function MiniGrid({ items, onOpen }) {
  if (!items.length) return <p className="v8c-muted">Nothing yet — be the first to share.</p>;
  return <div className="v8d-mini">{items.map((x) => { const img = x.media && x.media[0] && x.media[0].type !== "video" ? x.media[0].url : null; return (
    <button key={x.public_key} type="button" onClick={() => onOpen(x)}>{safeImg(img) ? <img src={img} alt={x.media[0].alt || ""} /> : <span className="ph"><V8Icon name={x.kind === "tip" ? "bulb" : "fire"} size={22} /></span>}
      <span className="by">@{x.author.public_username}</span><b>{x.kind === "tip" ? x.title : x.text}</b><small><V8Icon name={x.kind === "hype" ? "fire" : "heart"} size={13} />{fmt(x.counts.likes)} · <V8Icon name="comment" size={13} />{fmt(x.counts.comments)}</small></button>); })}</div>;
}

// ------------------------------------------------------------------ Hype / Tips feeds
const HYPE_CHIPS = [["trending", "Trending"], ["creator", "Creators"], ["community", "Communities"], ["live", "Live"], ["vibe", "Vibe"]];
const TIP_CHIPS = [["", "All"], ["crochet", "Crochet"], ["tools", "Tools & Materials"], ["patterns", "Patterns"], ["business", "Business"]];
export function KindFeed({ kind, api, user, onNav, onRequireLogin, onOpenProfile, onRoute, query }) {
  const [chip, setChip] = useState(query.get(kind === "hype" ? "chip" : "category") || (kind === "hype" ? "trending" : ""));
  const [tab, setTab] = useState("for-you"); const [d, setD] = useState({ status: "loading", items: [], next: null }); const [rev, setRev] = useState(0);
  const qs = kind === "hype" ? `chip=${chip}` : `category=${chip}&tab=${tab}`;
  useEffect(() => { const ctl = new AbortController(); setD({ status: "loading", items: [], next: null }); api("GET", `/api/v8/${kind === "hype" ? "hype" : "tips"}?limit=12&${qs}`, undefined, { signal: ctl.signal }).then((r) => { if (!r.aborted) setD(r.ok ? { status: "ready", items: r.json.items, next: r.json.next_cursor } : { status: "error", items: [] }); }); return () => ctl.abort(); }, [api, kind, qs, rev]);
  useEffect(() => { const on = () => setRev((x) => x + 1); window.addEventListener("howdi:v8-membership", on); return () => window.removeEventListener("howdi:v8-membership", on); }, []);
  const more = async () => { const r = await api("GET", `/api/v8/${kind === "hype" ? "hype" : "tips"}?limit=12&${qs}&cursor=${encodeURIComponent(d.next)}`); if (r.ok) setD((x) => ({ status: "ready", items: [...x.items, ...r.json.items], next: r.json.next_cursor })); };
  const chips = kind === "hype" ? HYPE_CHIPS : TIP_CHIPS; const signedIn = Boolean(user);
  return (
    <div className="v8d">
      <DiscoverNav value={kind === "hype" ? "hype" : "tips"} onNav={onNav} />
      <header className="v8d-head row"><div><h1>{kind === "hype" ? "Hype" : "Tips"}</h1><p>{kind === "hype" ? "Trending creator, community, Live and Vibe moments." : "Short, useful crochet and HOWDI tips — with steps and links to courses, products and workers."}</p></div>
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => (signedIn ? onNav(`create?kind=${kind === "hype" ? "hype" : "tip"}`) : onRequireLogin())}><V8Icon name="plus" size={16} />{kind === "hype" ? "Add a Hype" : "Publish a Tip"}</button></header>
      {kind === "tip" ? <Tabs compact tabs={[{ value: "for-you", label: "For you" }, { value: "following", label: "Following" }]} value={tab} onChange={(v) => (v === "following" && !signedIn ? onRequireLogin() : setTab(v))} label="Tips feed" /> : null}
      <div className="v8d-chips" role="tablist" aria-label="Filter">{chips.map(([v, l]) => <button key={v || "all"} type="button" role="tab" aria-selected={chip === v} className={`v8c-chip ${chip === v ? "on" : ""}`} onClick={() => setChip(v)}>{l}</button>)}</div>
      <div className={`v8d-feed ${kind}`} aria-busy={d.status === "loading"}>
        {d.status === "loading" ? [0, 1, 2].map((i) => <div key={i} className="v8-card v8c-post"><Skel h={40} w="50%" /><Skel h={200} r={14} /></div>) : null}
        {d.status === "error" ? <V8State kind="error" title={`${kind === "hype" ? "Hype" : "Tips"} didn’t load`} actionLabel="Try again" onAction={() => setRev((x) => x + 1)} /> : null}
        {d.status === "ready" && !d.items.length ? <div className="v8-card"><V8State icon={kind === "hype" ? "fire" : "bulb"} title={kind === "hype" ? "No Hype here yet" : tab === "following" ? "No Tips from people you follow" : "No Tips in this category yet"} message="Be the first to share one." actionLabel={kind === "hype" ? "Add a Hype" : "Publish a Tip"} onAction={() => (signedIn ? onNav(`create?kind=${kind === "hype" ? "hype" : "tip"}`) : onRequireLogin())} /></div> : null}
        {d.items.map((p) => <PostCard key={p.public_key} post={p} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} onRoute={onRoute} onOpen={(x) => onNav(x.route.replace(/^\/connect\//, ""))}
          onRemoved={(key, k) => setD((x) => ({ ...x, items: x.items.filter((y) => (k === "author" ? y.author.public_username !== key : y.public_key !== key)) }))} />)}
      </div>
      {d.next ? <button type="button" className="v8-btn v8-btn-block" onClick={more}>Load more</button> : null}
    </div>
  );
}

// ------------------------------------------------------------------ Creators
export function Creators({ api, user, onNav, onRequireLogin, onOpenProfile }) {
  const ui = useV8Ui();
  const [d, setD] = useState({ status: "loading", items: [] });
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/explore/creators"); setD(r.ok ? { status: "ready", items: r.json.items } : { status: "error", items: [] }); }, [api]);
  useEffect(() => { load(); }, [load]);
  const follow = async (c) => {
    if (!user) { onRequireLogin(); return; }
    setD((x) => ({ ...x, items: x.items.map((y) => (y === c ? { ...y, following: !c.following } : y)) }));
    const r = await api(c.following ? "DELETE" : "POST", `/api/v8/creators/${c.author.public_username}/follow`);
    if (!r.ok) { ui?.toast({ kind: "error", title: "Couldn’t update", message: r.json.message }); load(); }
  };
  return (
    <div className="v8d">
      <DiscoverNav value="creators" onNav={onNav} />
      <header className="v8d-head"><h1>Creators</h1><p>Makers, teachers and creators sharing on HOWDI.</p></header>
      {d.status === "loading" ? <div className="v8d-creators">{[0, 1, 2, 3].map((i) => <div key={i} className="v8-card"><Skel h={120} /></div>)}</div> : d.status === "error" ? <V8State kind="error" title="Creators didn’t load" actionLabel="Try again" onAction={load} /> : !d.items.length ? <V8State icon="users" title="No creators yet" /> : (
        <div className="v8d-creators">{d.items.map((c) => (
          <article key={c.author.public_username} className="v8-card v8d-creator"><button type="button" onClick={() => onOpenProfile(c.author.public_username)}><Ava src={c.author.avatar_url} name={c.author.display_name} size={72} /><b>{c.author.display_name}</b><span className="v8c-who-line">@{c.author.public_username}<V8Badges verified={c.author.verified} premium={c.author.premium} size="sm" /></span>{c.headline ? <small>{c.headline}</small> : null}<small>{fmt(c.followers)} followers</small></button>
            <button type="button" className={`v8-btn ${c.following ? "" : "v8-btn-primary"} v8-btn-block`} aria-pressed={c.following} onClick={() => follow(c)}>{c.following ? "Following" : "Follow"}</button></article>))}</div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Ask HOWDI
export function AskHowdi({ api, onNav, onRoute }) {
  const [perm, setPerm] = useState("ask"); // ask · denied · listening · idle
  const [q, setQ] = useState(""); const [heard, setHeard] = useState(""); const [d, setD] = useState({ status: "idle" }); const [fb, setFb] = useState(null);
  const recRef = useRef(null);
  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const ask = useCallback(async (question) => {
    const text = String(question || "").trim(); if (text.length < 4) return;
    setD({ status: "loading", question: text }); setFb(null);
    const r = await api("POST", "/api/v8/ask", { question: text });
    setD(r.ok ? { ...r.json, status: "ready" } : { status: r.status === 0 ? "offline" : "error", question: text, message: r.json.message });
  }, [api]);
  const allowMic = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop());
      if (!SR) { setPerm("nospeech"); return; }
      setPerm("listening"); setHeard("");
      const rec = new SR(); recRef.current = rec; rec.lang = "en-IN"; rec.interimResults = true;
      rec.onresult = (e) => { const t = [...e.results].map((x) => x[0].transcript).join(" "); setHeard(t); if (e.results[e.results.length - 1].isFinal) { setQ(t); ask(t); } };
      rec.onerror = () => setPerm("idle"); rec.onend = () => setPerm((p) => (p === "listening" ? "idle" : p));
      rec.start();
    } catch (e) { setPerm(e && e.name === "NotAllowedError" ? "denied" : "nospeech"); }
  };
  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ignore */ } }, []);
  const feedback = async (helpful) => { setFb(helpful ? "up" : "down"); await api("POST", "/api/v8/ask/feedback", { question: d.question, helpful }); };
  return (
    <div className="v8d v8ask">
      <header className="v8c-page-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={() => onNav("explore")}><V8Icon name="back" size={22} /></button><div><h1>Ask HOWDI</h1><p>Ask by voice or text. Answers come from HOWDI Tips and Articles, with the source.</p></div><span className="v8-pill-test">Preview / Test</span></header>
      {d.status === "idle" && perm === "ask" ? (
        <section className="v8-card v8ask-perm"><span className="v8ask-mic"><V8Icon name="mic" size={40} /></span><h2>Allow microphone access?</h2><p>To search with your voice, allow HOWDI to use your microphone. Audio is turned into text on your device and isn’t stored.</p>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={allowMic}>Allow microphone</button><button type="button" className="v8-btn v8-btn-block" onClick={() => setPerm("idle")}>Not now — type instead</button></section>
      ) : null}
      {perm === "denied" ? <div className="v8-banner-error" role="alert"><V8Icon name="mic" size={20} /><span><b>Microphone is blocked.</b> Allow it in your browser’s site settings, or type your question below.</span></div> : null}
      {perm === "nospeech" ? <div className="v8-card v8c-muted" role="status"><V8Icon name="info" size={16} /> Voice search isn’t available in this browser. Type your question below.</div> : null}
      {perm === "listening" ? <section className="v8-card v8ask-listen" aria-live="polite"><span className="v8ask-wave"><i /><i /><i /><i /></span><b>Listening…</b><p>{heard || "Ask something like “How do I start crocheting a granny square?”"}</p><button type="button" className="v8-btn" onClick={() => { try { recRef.current?.stop(); } catch { /* ignore */ } setPerm("idle"); }}>Stop</button></section> : null}
      {perm !== "ask" || d.status !== "idle" ? (
        <form className="v8ask-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <input value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} placeholder="How do I start crocheting a granny square?" aria-label="Your question" />
          {SR ? <button type="button" className="v8-icon-btn" aria-label="Ask by voice" onClick={allowMic}><V8Icon name="mic" size={20} /></button> : null}
          <button type="submit" className="v8-btn v8-btn-primary" disabled={q.trim().length < 4 || d.status === "loading"}>Ask</button>
        </form>
      ) : null}
      {d.status === "loading" ? <section className="v8-card"><p className="v8ask-q"><V8Icon name="mic" size={16} />{d.question}</p><Skel h={16} w="70%" /><Skel h={14} /><Skel h={14} w="80%" /></section> : null}
      {d.status === "error" || d.status === "offline" ? <section className="v8-card"><V8State kind="error" title={d.status === "offline" ? "You’re offline" : "HOWDI couldn’t answer right now"} message={d.message || "Please try again."} actionLabel="Retry" onAction={() => ask(d.question)} /></section> : null}
      {d.status === "ready" ? (
        <section className="v8-card v8ask-answer" aria-live="polite">
          <p className="v8ask-q"><V8Icon name="mic" size={16} />{d.question}</p>
          {d.kind === "answer" ? (<>
            <h2><span className="v8ask-logo">HOWDI</span></h2>
            <p>{d.answer.intro}</p>
            <ol className="v8c-steps compact">{d.answer.steps.map((s, i) => <li key={i}><span className="n">{i + 1}</span><div><p>{s}</p></div></li>)}</ol>
            {d.sources[0] ? <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => onRoute(d.sources[0].route)}>View step-by-step {d.sources[0].kind === "tip" ? "Tip" : "article"}</button> : null}
            {d.sources.length > 1 ? <div className="v8ask-sources"><small>More from HOWDI</small>{d.sources.slice(1).map((s) => <button key={s.route} type="button" className="v8-link" onClick={() => onRoute(s.route)}>{s.title} · @{s.author.public_username}</button>)}</div> : null}
            <div className="v8ask-fb"><span>Was this helpful?</span><button type="button" className={`v8-icon-btn ${fb === "up" ? "on" : ""}`} aria-label="Helpful" aria-pressed={fb === "up"} onClick={() => feedback(true)}><V8Icon name="thumbup" size={20} /></button><button type="button" className={`v8-icon-btn ${fb === "down" ? "on" : ""}`} aria-label="Not helpful" aria-pressed={fb === "down"} onClick={() => feedback(false)}><V8Icon name="thumbdown" size={20} /></button>{fb ? <small>Thanks for the feedback.</small> : null}</div>
          </>) : d.kind === "refusal" ? <V8State icon="shield" title="I can’t help with that" message={d.answer.intro} /> : (
            <V8State icon="search" title="No HOWDI guide for that yet" message="Try different words, or search Explore for people and courses." actionLabel="Search Explore" onAction={() => onNav(`explore?q=${encodeURIComponent((d.suggestions || []).join(" ") || d.question)}`)} />
          )}
          <button type="button" className="v8-btn v8-btn-block" onClick={() => { setD({ status: "idle" }); setQ(""); setPerm("idle"); }}><V8Icon name="refresh" size={16} />Ask another question</button>
        </section>
      ) : null}
    </div>
  );
}

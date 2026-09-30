// HOWDI V8 Articles — PRIOR-07 panel 5 (For You / Trending / Following + reader with AA, like, comment, share, save),
// board 07 mobile panel 5 (reader with author @handle, linked items, save/share/report) and the V8 hub Articles rail.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, ShareSheet, Skel, Tabs, fmt, since, safeImg, readFileAsDataUrl, SignInCard } from "./common";

const CATS = ["Handmade", "Crochet", "Learning", "Business", "Wellness", "Craft", "General"];
const SIZES = [16, 18, 21];

function ArticleCard({ a, onOpen, onSave }) {
  return (
    <article className="v8-card v8a2-card">
      <button type="button" className="v8a2-card-open" onClick={onOpen}>
        {safeImg(a.cover_url) ? <img src={a.cover_url} alt="" loading="lazy" /> : <span className="v8a2-ph"><V8Icon name="article" size={28} /></span>}
        <span className="v8a2-card-text">
          {a.category ? <small className="v8a2-cat">{a.category}</small> : null}
          <b>{a.title}</b>
          {a.excerpt ? <span className="v8a2-ex">{a.excerpt}</span> : null}
          <span className="v8c-who-line"><Ava src={a.author.avatar_url} name={a.author.display_name} size={22} /><small>@{a.author.public_username}</small><V8Badges verified={a.author.verified} premium={a.author.premium} size="sm" /><small>· {a.read_minutes} min read</small></span>
        </span>
      </button>
      <button type="button" className={`v8-icon-btn ${a.viewer.saved ? "on" : ""}`} aria-label={a.viewer.saved ? "Remove from saved" : "Save article"} aria-pressed={a.viewer.saved} onClick={onSave}><V8Icon name="bookmark" size={20} fill={a.viewer.saved} /></button>
    </article>
  );
}

function Writer({ api, onDone, onCancel }) {
  const ui = useV8Ui();
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [cat, setCat] = useState("Handmade"); const [cover, setCover] = useState(null); const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const ref = useRef(null);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const save = async (status) => {
    setBusy(status); setErr("");
    const r = await api("POST", "/api/v8/articles", { title, body, category: cat, coverData: cover || undefined, status });
    setBusy("");
    if (!r.ok) { setErr(r.json.message || "Couldn’t save. Please try again."); return; }
    ui?.toast({ title: status === "draft" ? "Draft saved" : "Article published", message: status === "draft" ? "Only you can see drafts." : "It’s live on Connect." });
    onDone(r.json.article.public_key);
  };
  return (
    <div className="v8a2-write">
      <header className="v8vc-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onCancel}><V8Icon name="back" size={22} /></button><h1>Write an article</h1><span style={{ width: 40 }} /></header>
      <div className="v8-card v8a2-write-card">
        <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (f.size > 4 * 1024 * 1024) { setErr("Cover images can be up to 4 MB."); return; } setCover(await readFileAsDataUrl(f)); }} data-testid="article-cover" />
        {cover ? <div className="v8a2-cover-edit"><img src={cover} alt="Cover" /><button type="button" className="v8-btn" onClick={() => setCover(null)}>Remove cover</button></div>
          : <button type="button" className="v8vc-drop v8a2-cover-drop" onClick={() => ref.current?.click()}><span><V8Icon name="image" size={26} /></span><b>Add a cover image</b><small>JPG, PNG or WebP · up to 4 MB</small></button>}
        <label className="v8c-field"><span>Title</span><input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="A clear, helpful title" /></label>
        <label className="v8c-field"><span>Category</span><select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="v8c-field"><span>Article</span><textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your article. Leave a blank line between paragraphs." /><small className="v8vc-count">{words} words · {Math.max(1, Math.round(words / 200))} min read</small></label>
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" disabled={Boolean(busy)} onClick={() => save("draft")}>{busy === "draft" ? "Saving…" : "Save draft"}</button><button type="button" className="v8-btn v8-btn-primary" disabled={Boolean(busy)} onClick={() => save("published")}>{busy === "published" ? "Publishing…" : "Publish"}</button></div>
      </div>
    </div>
  );
}

function Reader({ api, code, user, onBack, onOpen, onRequireLogin, onOpenProfile }) {
  const ui = useV8Ui(); const signedIn = Boolean(user);
  const [d, setD] = useState({ status: "loading" }); const [size, setSize] = useState(1); const [sheet, setSheet] = useState("");
  const [comments, setComments] = useState(null); const [ctext, setCtext] = useState(""); const [cbusy, setCbusy] = useState(false);
  const load = useCallback(async () => {
    setD({ status: "loading" });
    const r = await api("GET", `/api/v8/articles/${code}`);
    setD(r.ok ? { status: "ready", a: r.json.article, related: r.json.related } : { status: r.status === 404 ? "gone" : "error" });
    const c = await api("GET", `/api/v8/articles/${code}/comments`); setComments(c.ok ? c.json : "error");
  }, [api, code]);
  useEffect(() => { load(); }, [load]);
  if (d.status === "loading") return <div className="v8a2-reader"><Skel h={32} w="70%" /><Skel h={280} r={16} /><Skel h={14} /><Skel h={14} /></div>;
  if (d.status === "gone") return <V8State icon="article" title="This article isn’t available" message="It may have been removed or made private." actionLabel="Back to Articles" onAction={onBack} />;
  if (d.status === "error") return <V8State kind="error" title="Couldn’t open this article" actionLabel="Try again" onAction={load} />;
  const a = d.a;
  const need = () => { if (!signedIn) { onRequireLogin(); return true; } return false; };
  const toggle = async (kind) => {
    if (need()) return;
    const key = kind === "like" ? "liked" : "saved"; const on = a.viewer[key];
    const r = await api(on ? "DELETE" : "POST", `/api/v8/articles/${code}/${kind}`);
    if (!r.ok) { ui?.toast({ kind: "error", title: "Couldn’t update" }); return; }
    setD((x) => ({ ...x, a: { ...x.a, viewer: { ...x.a.viewer, [key]: !on }, counts: { ...x.a.counts, [kind === "like" ? "likes" : "saves"]: r.json.count } } }));
    if (kind === "save") ui?.toast({ title: on ? "Removed from Saved" : "Saved for later" });
  };
  const follow = async () => { if (need()) return; const on = a.viewer.following; const r = await api(on ? "DELETE" : "POST", `/api/v8/creators/${a.author.public_username}/follow`); if (r.ok) setD((x) => ({ ...x, a: { ...x.a, viewer: { ...x.a.viewer, following: !on } } })); };
  const comment = async () => {
    if (need() || !ctext.trim()) return; setCbusy(true);
    const r = await api("POST", `/api/v8/articles/${code}/comments`, { text: ctext }); setCbusy(false);
    if (!r.ok) { ui?.toast({ kind: "error", title: "Comment not posted", message: r.json.message }); return; }
    setComments((c) => ({ ...c, comments: [...(c.comments || []), r.json.comment] })); setCtext(""); setD((x) => ({ ...x, a: { ...x.a, counts: { ...x.a.counts, comments: x.a.counts.comments + 1 } } }));
  };
  return (
    <div className="v8a2-reader-wrap">
      <article className="v8a2-reader" style={{ "--v8a2-size": `${SIZES[size]}px` }}>
        <header className="v8a2-reader-bar">
          <button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={22} /></button>
          <span className="v8-spacer" />
          <button type="button" className="v8-icon-btn v8a2-aa" aria-label={`Text size ${["small", "medium", "large"][size]} — change`} onClick={() => setSize((s) => (s + 1) % SIZES.length)}>A<span>A</span></button>
          <button type="button" className="v8-icon-btn" aria-label="More" onClick={() => setSheet("more")}><V8Icon name="more" size={22} /></button>
        </header>
        {a.category ? <small className="v8a2-cat">{a.category}</small> : null}
        <h1>{a.title}</h1>
        <div className="v8a2-byline">
          <button type="button" className="v8c-who-ava" onClick={() => onOpenProfile(a.author.public_username)}><Ava src={a.author.avatar_url} name={a.author.display_name} size={42} /></button>
          <span><span className="v8c-who-line"><button type="button" className="v8c-handle" onClick={() => onOpenProfile(a.author.public_username)}>@{a.author.public_username}</button><V8Badges verified={a.author.verified} premium={a.author.premium} size="sm" /></span><small>{a.read_minutes} min read · {since(a.published_at)}</small></span>
          {!a.viewer.mine ? <button type="button" className={`v8-btn ${a.viewer.following ? "" : "v8-btn-soft"}`} onClick={follow}>{a.viewer.following ? "Following" : "Follow"}</button> : null}
        </div>
        {safeImg(a.cover_url) ? <img className="v8a2-cover" src={a.cover_url} alt="" /> : null}
        <div className="v8a2-body">{String(a.body || "").split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
        <footer className="v8c-post-actions v8a2-actions">
          <button type="button" className={a.viewer.liked ? "on like" : ""} aria-pressed={a.viewer.liked} onClick={() => toggle("like")}><V8Icon name="heart" size={20} fill={a.viewer.liked} />{fmt(a.counts.likes)}</button>
          <button type="button" onClick={() => document.getElementById("v8a2-comments")?.scrollIntoView({ behavior: "smooth" })}><V8Icon name="comment" size={20} />{fmt(a.counts.comments)}</button>
          <button type="button" onClick={() => setSheet("share")}><V8Icon name="share" size={20} />Share</button>
          <button type="button" className={a.viewer.saved ? "on" : ""} aria-pressed={a.viewer.saved} onClick={() => toggle("save")}><V8Icon name="bookmark" size={20} fill={a.viewer.saved} />{a.viewer.saved ? "Saved" : "Save"}</button>
        </footer>
        <section id="v8a2-comments" className="v8a2-comments">
          <h2>Comments</h2>
          {comments === null ? <Skel h={40} /> : comments === "error" ? <p className="v8c-err">Comments didn’t load.</p> : (<>
            {comments.comments.length ? comments.comments.map((c) => <div key={c.public_key} className="v8c-comment"><Ava src={c.author.avatar_url} name={c.author.display_name} size={34} /><div><span className="v8c-who-line"><b>@{c.author.public_username}</b>{c.by_creator ? <span className="v8c-chip-mini">Author</span> : null}<small>{since(c.created_at)}</small></span><p>{c.text}</p></div></div>) : <p className="v8c-muted">No comments yet.</p>}
            {comments.allow_comments ? <div className="v8c-comment-box"><input value={ctext} maxLength={1000} onChange={(e) => setCtext(e.target.value)} onFocus={() => need()} onKeyDown={(e) => { if (e.key === "Enter") comment(); }} placeholder={signedIn ? "Add a comment…" : "Sign in to comment"} aria-label="Add a comment" /><button type="button" className="v8-btn v8-btn-primary" disabled={cbusy || !ctext.trim()} onClick={comment}>Post</button></div> : <p className="v8c-muted">Comments are off.</p>}
          </>)}
        </section>
      </article>
      {d.related.length ? <aside className="v8a2-related"><h2>More to read</h2>{d.related.map((r) => <button key={r.public_key} type="button" className="v8c-rail-item" onClick={() => onOpen(r.public_key)}>{safeImg(r.cover_url) ? <img className="v8c-rail-img" src={r.cover_url} alt="" /> : <span className="v8c-rail-img ph"><V8Icon name="article" size={20} /></span>}<span className="v8c-rail-text"><b>{r.title}</b><small>@{r.author.public_username} · {r.read_minutes} min</small></span></button>)}</aside> : null}
      <ShareSheet open={sheet === "share"} title={a.title} link={a.route} onClose={() => setSheet("")} onShared={(channel) => api("POST", `/api/v8/articles/${code}/share`, { channel })} />
      <Sheet open={sheet === "more"} title="Article options" onClose={() => setSheet("")}>
        <button type="button" className="v8c-row" onClick={() => setSheet("share")}><span className="v8c-row-ico"><V8Icon name="share" size={20} /></span><span className="v8c-row-text"><b>Share</b></span></button>
        {!a.viewer.mine ? <button type="button" className="v8c-row" onClick={() => (signedIn ? setSheet("report") : onRequireLogin())}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report article</b></span></button> : null}
      </Sheet>
      <ReportSheet open={sheet === "report"} what="article" onClose={() => setSheet("")} onSubmit={(reason, details) => api("POST", `/api/v8/articles/${code}/report`, { reason, details })} />
    </div>
  );
}

export default function ArticlesScreen({ api, user, focus, onNav, onRequireLogin, onOpenProfile }) {
  const ui = useV8Ui(); const signedIn = Boolean(user);
  const [tab, setTab] = useState("for-you"); const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [list, setList] = useState({ status: "loading", items: [] });
  const load = useCallback(async () => {
    setList((l) => ({ ...l, status: "loading" }));
    const qs = new URLSearchParams({ tab }); if (q.trim()) qs.set("q", q.trim()); if (cat) qs.set("category", cat);
    const r = await api("GET", `/api/v8/articles?${qs}`);
    setList(r.ok ? { status: r.json.needs_sign_in ? "signin" : "ready", items: r.json.items } : { status: "error", items: [] });
  }, [api, tab, q, cat]);
  useEffect(() => { if (!focus) { const t = window.setTimeout(load, q ? 300 : 0); return () => window.clearTimeout(t); } return undefined; }, [load, focus, q]);
  if (focus === "write") return signedIn ? <Writer api={api} onDone={(k) => onNav(`articles/${k}`)} onCancel={() => onNav("articles")} /> : <SignInCard title="Sign in to write" onSignIn={onRequireLogin} />;
  if (/^ART-[0-9A-F]{12}$/.test(focus || "")) return <Reader api={api} code={focus} user={user} onBack={() => onNav("articles")} onOpen={(k) => onNav(`articles/${k}`)} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} />;
  const save = async (a) => {
    if (!signedIn) { onRequireLogin(); return; }
    const on = a.viewer.saved; const r = await api(on ? "DELETE" : "POST", `/api/v8/articles/${a.public_key}/save`);
    if (r.ok) { setList((l) => ({ ...l, items: l.items.map((x) => (x.public_key === a.public_key ? { ...x, viewer: { ...x.viewer, saved: !on } } : x)) })); ui?.toast({ title: on ? "Removed from Saved" : "Saved for later" }); }
  };
  return (
    <div className="v8a2">
      <header className="v8l-top"><div><h1>Articles</h1><p className="v8c-muted">Guides, stories and ideas from the HOWDI community.</p></div>
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => (signedIn ? onNav("articles/write") : onRequireLogin())}><V8Icon name="edit" size={18} />Write</button></header>
      <Tabs tabs={[{ value: "for-you", label: "For You" }, { value: "trending", label: "Trending" }, { value: "following", label: "Following" }]} value={tab} onChange={setTab} label="Articles" />
      <div className="v8a2-filters">
        <label className="v8a2-search"><V8Icon name="search" size={18} /><span className="v8-sr">Search articles</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" /></label>
        <div className="v8c-chips">{["", ...CATS].map((c) => <button key={c || "all"} type="button" className={`v8c-chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c || "All"}</button>)}</div>
      </div>
      {list.status === "loading" ? <div className="v8a2-list">{[0, 1, 2].map((i) => <div key={i} className="v8-card v8a2-card"><Skel h={96} w={130} r={12} /><Skel h={14} /></div>)}</div> : null}
      {list.status === "error" ? <V8State kind="error" title="Articles didn’t load" actionLabel="Try again" onAction={load} /> : null}
      {list.status === "signin" ? <SignInCard title="See articles from people you follow" onSignIn={onRequireLogin} /> : null}
      {list.status === "ready" && !list.items.length ? <V8State icon="article" title={q || cat ? "Nothing found yet" : tab === "following" ? "No articles from people you follow" : "No articles yet"} message={q || cat ? "Try different keywords or categories." : "Write the first one."} actionLabel={q || cat ? "Clear filters" : "Write an article"} onAction={() => (q || cat ? (setQ(""), setCat("")) : signedIn ? onNav("articles/write") : onRequireLogin())} /> : null}
      {list.status === "ready" && list.items.length ? <div className="v8a2-list">{list.items.map((a) => <ArticleCard key={a.public_key} a={a} onOpen={() => onNav(`articles/${a.public_key}`)} onSave={() => save(a)} />)}</div> : null}
    </div>
  );
}

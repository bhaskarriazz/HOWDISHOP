// HOWDI V8 posts — the shared post card (Post · Hype · Tip · members-only lock), threaded comments with replies and
// @mentions, and the post detail screen (/connect/posts|hype|tips/{PST}). Boards: 06 post card + actions, 07 panels 3–4
// (Hype and Tips detail), PRIOR__15 panels 2 (Hype detail: trending conversation, "Keep it kind — Report") and 4 (Tip
// detail with steps and related learning), PRIOR__14 panel 4 (subscriber-only content locked for non-members).
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Who, Sheet, ReportSheet, ShareSheet, Skel, fmt, since, safeImg, safeVideo } from "./common";
import { LockedCard, MembershipOffer } from "./Membership";

const AUD_LABEL = { everyone: "Everyone", friends: "Friends", close_friends: "Close friends", followers: "Followers", only_me: "Only me" };
const HYPE_LABEL = { creator: "Creator moment", community: "Community", live: "Live", vibe: "Vibe", trending: "Trending" };
const CAT_LABEL = { crochet: "Crochet", tools: "Tools & Materials", patterns: "Patterns", business: "Business", care: "Care", other: "Tips" };
const DISC_LABEL = { sponsored: "Sponsored", affiliate: "Affiliate link", gifted: "Gifted" };
const REL_ICON = { product: "shop", course: "learn", worker: "works", community: "users", profile: "user" };

// @mentions and #tags rendered as plain styled text (never HTML)
export function RichText({ text, onOpenProfile, className }) {
  const parts = String(text || "").split(/(@[a-z0-9._]{3,30}|#[\p{L}\p{N}_]{2,30})/giu);
  return <p className={className}>{parts.map((x, i) => (/^@[a-z0-9._]{3,30}$/i.test(x) ? <button key={i} type="button" className="v8c-mention" onClick={() => onOpenProfile?.(x.slice(1).toLowerCase())}>{x}</button> : /^#/.test(x) ? <span key={i} className="v8c-tag">{x}</span> : x))}</p>;
}

export function PostCard({ post, api, signedIn, onRequireLogin, onOpenProfile, onChanged, onRemoved, onOpen, onRoute, preview, detail }) {
  const ui = useV8Ui();
  const [p, setP] = useState(post); const [menu, setMenu] = useState(false); const [report, setReport] = useState(false); const [share, setShare] = useState(false);
  const [cOpen, setCOpen] = useState(false); const [block, setBlock] = useState(false); const [del, setDel] = useState(false); const [join, setJoin] = useState(false);
  useEffect(() => setP(post), [post]);
  const need = () => { if (preview) return true; if (!signedIn) { onRequireLogin(); return true; } return false; };
  const toggle = async (kind) => {
    if (need()) return;
    const on = kind === "like" ? p.viewer.liked : p.viewer.saved;
    setP({ ...p, viewer: { ...p.viewer, [kind === "like" ? "liked" : "saved"]: !on }, counts: kind === "like" ? { ...p.counts, likes: p.counts.likes + (on ? -1 : 1) } : p.counts });
    const r = await api(on ? "DELETE" : "POST", `/api/v8/posts/${p.public_key}/${kind}`);
    if (!r.ok) { setP(p); ui?.toast({ kind: "error", title: "Couldn’t update", message: r.json.message || "Please try again." }); }
    else { if (kind === "like") setP((x) => ({ ...x, counts: { ...x.counts, likes: r.json.count } })); if (kind === "save") ui?.toast({ title: on ? "Removed from Saved" : "Saved" }); onChanged?.(); }
  };
  const media = p.media || [];
  const isHype = p.kind === "hype"; const isTip = p.kind === "tip";
  const open = () => { if (!preview && !detail && onOpen) onOpen(p); };
  return (
    <article className={`v8-card v8c-post kind-${p.kind || "post"} ${p.locked ? "locked" : ""}`} aria-label={`${isTip ? "Tip" : isHype ? "Hype" : "Post"} by @${p.author.public_username}`}>
      <header className="v8c-post-head">
        <Who author={p.author} sub={`${since(p.published_at)} · ${AUD_LABEL[p.audience] || "Everyone"}`} onOpen={onOpenProfile} />
        <span className="v8c-post-tags">
          {isHype ? <span className="v8c-kind hype"><V8Icon name="fire" size={13} />Hype · {HYPE_LABEL[p.hype_type] || "Moment"}</span> : null}
          {isTip ? <span className="v8c-kind tip"><V8Icon name="bulb" size={13} />{CAT_LABEL[p.category] || "Tip"}</span> : null}
          {p.members_only ? <span className="v8c-kind members"><V8Icon name="crown" size={12} fill />Members</span> : null}
          {p.scheduled ? <span className="v8c-kind sched"><V8Icon name="clock" size={12} />Scheduled</span> : null}
          {p.disclosure && DISC_LABEL[p.disclosure] ? <span className="v8c-kind disc">{DISC_LABEL[p.disclosure]}</span> : null}
        </span>
        {!preview ? <button type="button" className="v8-icon-btn" aria-label="More options" onClick={() => setMenu(true)}><V8Icon name="more" size={22} /></button> : null}
      </header>
      {p.locked ? <LockedCard post={p} onJoin={() => (signedIn ? setJoin(true) : onRequireLogin())} /> : (<>
        {isTip && p.title ? <h3 className="v8c-tip-title" onClick={open}>{p.title}</h3> : null}
        {p.text ? (onOpen && !detail && !preview ? <button type="button" className="v8c-post-open" onClick={open}><RichText className="v8c-post-text" text={p.text} onOpenProfile={onOpenProfile} /></button> : <RichText className="v8c-post-text" text={p.text} onOpenProfile={onOpenProfile} />) : null}
        {media.length ? (
          <div className={`v8c-post-media n${media.length}`}>
            {media.map((m, i) => (m.type === "video" && safeVideo(m.url) ? <video key={i} src={m.url} controls playsInline preload="metadata" aria-label={m.alt || "Video"} /> : safeImg(m.url) ? <img key={i} src={m.url} alt={m.alt || ""} loading="lazy" /> : null))}
          </div>
        ) : null}
        {isTip && (p.steps || []).length ? (detail ? (
          <ol className="v8c-steps">{p.steps.map((s) => <li key={s.n}><span className="n">{s.n}</span><div><p>{s.text}</p>{safeImg(s.image) ? <img src={s.image} alt={`Step ${s.n}`} /> : null}</div></li>)}</ol>
        ) : <button type="button" className="v8c-steps-peek" onClick={open}><V8Icon name="list" size={16} />{p.steps.length} step{p.steps.length === 1 ? "" : "s"} · Read the Tip</button>) : null}
        {(p.tags || []).length && detail ? <p className="v8c-tagrow">{p.tags.map((t) => <span key={t} className="v8c-tag">#{t}</span>)}</p> : null}
      </>)}
      <footer className="v8c-post-actions">
        <button type="button" className={p.viewer.liked ? `on ${isHype ? "hype" : "like"}` : ""} aria-pressed={p.viewer.liked} aria-label={isHype ? "Hype" : "Like"} onClick={() => toggle("like")}><V8Icon name={isHype ? "fire" : "heart"} size={20} fill={p.viewer.liked} />{fmt(p.counts.likes)}</button>
        <button type="button" aria-label="Comments" onClick={() => (detail || preview ? null : p.locked ? setJoin(true) : setCOpen(true))}><V8Icon name="comment" size={20} />{fmt(p.counts.comments)}</button>
        <button type="button" className={p.viewer.saved ? "on" : ""} aria-pressed={p.viewer.saved} onClick={() => toggle("save")}><V8Icon name="bookmark" size={20} fill={p.viewer.saved} />{p.viewer.saved ? "Saved" : "Save"}</button>
        <button type="button" onClick={() => (preview ? null : setShare(true))}><V8Icon name="share" size={20} />Share</button>
      </footer>
      {!p.locked && (p.related || []).length && !detail ? <div className="v8c-rel-peek">{p.related.slice(0, 1).map((r) => <button key={r.route} type="button" onClick={() => onRoute?.(r.route)}><V8Icon name={REL_ICON[r.kind] || "link"} size={16} /><span><small>{r.kind}</small><b>{r.title}</b></span><V8Icon name="chevr" size={16} /></button>)}</div> : null}
      {!preview ? (<>
        <Sheet open={menu} title={isTip ? "Tip options" : isHype ? "Hype options" : "Post options"} onClose={() => setMenu(false)}>
          {onOpen && !detail ? <button type="button" className="v8c-row" onClick={() => { setMenu(false); onOpen(p); }}><span className="v8c-row-ico"><V8Icon name="article" size={20} /></span><span className="v8c-row-text"><b>Open</b></span></button> : null}
          {p.viewer.mine ? (
            <button type="button" className="v8c-row danger" onClick={() => { setMenu(false); setDel(true); }}><span className="v8c-row-ico"><V8Icon name="trash" size={20} /></span><span className="v8c-row-text"><b>Delete</b></span></button>
          ) : (<>
            <button type="button" className="v8c-row" onClick={() => { setMenu(false); if (!need()) setReport(true); }}><span className="v8c-row-ico"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report</b><small>Private — the author isn’t told who reported</small></span></button>
            <button type="button" className="v8c-row danger" onClick={() => { setMenu(false); if (!need()) setBlock(true); }}><span className="v8c-row-ico"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{p.author.public_username}</b><small>They won’t see your content or contact you</small></span></button>
          </>)}
        </Sheet>
        <ReportSheet open={report} what={isTip ? "Tip" : isHype ? "Hype" : "post"} onClose={() => setReport(false)} onSubmit={(reason, details) => api("POST", `/api/v8/posts/${p.public_key}/report`, { reason, details })} />
        <ShareSheet open={share} title="HOWDI" link={p.route} onClose={() => setShare(false)} onShared={(channel) => api("POST", `/api/v8/posts/${p.public_key}/share`, { channel })} />
        <V8Confirm open={block} danger title={`Block @${p.author.public_username}?`} body="They won’t be able to see your posts, stories or Vibes, message you or find your profile. You can unblock them from Privacy & safety." confirmLabel="Block" onCancel={() => setBlock(false)}
          onConfirm={async () => { const r = await api("POST", `/api/v8/creators/${p.author.public_username}/block`); setBlock(false); if (r.ok) { ui?.toast({ title: `@${p.author.public_username} is blocked` }); onRemoved?.(p.author.public_username, "author"); } else ui?.toast({ kind: "error", title: "Couldn’t block", message: r.json.message }); }} />
        <V8Confirm open={del} danger title="Delete this?" body="It will be removed from Connect for everyone. This can’t be undone." confirmLabel="Delete" onCancel={() => setDel(false)}
          onConfirm={async () => { const r = await api("DELETE", `/api/v8/posts/${p.public_key}`); setDel(false); if (r.ok) { ui?.toast({ title: "Deleted" }); onRemoved?.(p.public_key, "post"); } else ui?.toast({ kind: "error", title: "Couldn’t delete", message: r.json.message }); }} />
        <Sheet open={cOpen} title={`Comments${p.counts.comments ? ` (${p.counts.comments})` : ""}`} onClose={() => setCOpen(false)}>
          {cOpen ? <Comments post={p} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} onCount={(n) => setP((x) => ({ ...x, counts: { ...x.counts, comments: n } }))} /> : null}
        </Sheet>
        <Sheet open={join} title={`Join @${p.author.public_username}’s membership`} onClose={() => setJoin(false)}>
          {join ? <MembershipOffer api={api} handle={p.author.public_username} signedIn={signedIn} onRequireLogin={onRequireLogin} compact onNav={() => {}} /> : null}
          <button type="button" className="v8-btn v8-btn-block" onClick={() => { setJoin(false); onChanged?.("reload"); }}>Done</button>
        </Sheet>
      </>) : null}
    </article>
  );
}

// Threaded comments (one level of replies), @mentions, held-for-review notice, "Top"/"Newest" sort.
export function Comments({ post, api, signedIn, onRequireLogin, onOpenProfile, onCount, sortable, kindWord }) {
  const ui = useV8Ui();
  const [list, setList] = useState(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [reply, setReply] = useState(null); const [sort, setSort] = useState("top");
  const load = useCallback(async () => { setList(null); const r = await api("GET", `/api/v8/posts/${post.public_key}/comments`); setList(r.ok ? r.json.comments : r.status === 403 ? "locked" : "error"); }, [api, post.public_key]);
  useEffect(() => { load(); }, [load]);
  const send = async () => {
    if (!signedIn) { onRequireLogin(); return; } if (!text.trim()) return;
    setBusy(true);
    const r = await api("POST", `/api/v8/posts/${post.public_key}/comments`, { text, replyTo: reply ? reply.public_key : undefined });
    setBusy(false);
    if (!r.ok) { ui?.toast({ kind: "error", title: "Comment not posted", message: r.json.message || "Please try again." }); return; }
    if (r.json.held) ui?.toast({ title: "Comment held for review", message: "The creator reviews comments that match their filters." });
    setList((c) => [...(Array.isArray(c) ? c : []), r.json.comment]); setText(""); setReply(null); onCount?.((post.counts.comments || 0) + (r.json.held ? 0 : 1));
  };
  if (list === null) return <div className="v8c-comments"><Skel h={40} /><Skel h={40} /></div>;
  if (list === "locked") return <p className="v8c-muted">Join the membership to see the conversation.</p>;
  if (list === "error") return <V8State kind="error" title="Couldn’t load comments" actionLabel="Try again" onAction={load} />;
  const roots = list.filter((c) => !c.reply_to || !list.some((x) => x.public_key === c.reply_to));
  const kids = (k) => list.filter((c) => c.reply_to === k);
  const ordered = sort === "newest" ? [...roots].reverse() : [...roots].sort((a, b) => kids(b.public_key).length - kids(a.public_key).length);
  const One = ({ c, child }) => (
    <div className={`v8c-comment ${child ? "reply" : ""} ${c.held ? "held" : ""}`}><Ava src={c.author.avatar_url} name={c.author.display_name} size={child ? 28 : 34} />
      <div><span className="v8c-who-line"><button type="button" className="v8c-handle" onClick={() => onOpenProfile(c.author.public_username)}>@{c.author.public_username}</button><V8Badges verified={c.author.verified} premium={c.author.premium} size="sm" />{c.by_creator ? <span className="v8c-chip-mini">{kindWord || "Author"}</span> : null}<small>{since(c.created_at)}</small></span>
        <RichText text={c.text} onOpenProfile={onOpenProfile} />
        {c.held ? <small className="v8c-held"><V8Icon name="eyeoff" size={12} />Held for review — only you and the creator can see this</small> : null}
        {!child ? <button type="button" className="v8-link small" onClick={() => { if (!signedIn) { onRequireLogin(); return; } setReply(c); setText(`@${c.author.public_username} `); }}>Reply</button> : null}</div></div>
  );
  return (
    <>
      {sortable ? <div className="v8c-sort"><span>Trending conversation</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort comments"><option value="top">Top</option><option value="newest">Newest</option></select></div> : null}
      <div className="v8c-comments">
        {ordered.length ? ordered.map((c) => <div key={c.public_key}><One c={c} />{kids(c.public_key).map((k) => <One key={k.public_key} c={k} child />)}</div>) : <p className="v8c-muted">No comments yet. Start the conversation.</p>}
      </div>
      {post.allow_comments ? (
        <div className="v8c-comment-box">
          {reply ? <span className="v8c-replying">Replying to @{reply.author.public_username}<button type="button" aria-label="Cancel reply" onClick={() => { setReply(null); setText(""); }}><V8Icon name="x" size={12} /></button></span> : null}
          <input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={signedIn ? "Add a comment… use @ to mention" : "Sign in to comment"} onFocus={() => { if (!signedIn) onRequireLogin(); }} onKeyDown={(e) => { if (e.key === "Enter") send(); }} aria-label="Add a comment" />
          <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !text.trim()} onClick={send}>{busy ? "…" : "Post"}</button>
        </div>
      ) : <p className="v8c-muted">Comments are turned off.</p>}
    </>
  );
}

// Post / Hype / Tip detail screen.
export function PostDetail({ api, code, user, onNav, onRequireLogin, onOpenProfile, onRoute, kind }) {
  const [d, setD] = useState({ status: "loading" }); const [rev, setRev] = useState(0); const [report, setReport] = useState(false);
  useEffect(() => { const ctl = new AbortController(); setD({ status: "loading" }); api("GET", `/api/v8/posts/${code}`, undefined, { signal: ctl.signal }).then((r) => { if (!r.aborted) setD(r.ok ? { status: "ready", post: r.json.post } : { status: r.status === 404 ? "missing" : "error" }); }); return () => ctl.abort(); }, [api, code, rev]);
  useEffect(() => { const on = () => setRev((x) => x + 1); window.addEventListener("howdi:v8-membership", on); return () => window.removeEventListener("howdi:v8-membership", on); }, []);
  const back = () => onNav(kind === "tip" ? "tips" : kind === "hype" ? "hype" : "");
  if (d.status === "loading") return <div className="v8c-detail"><div className="v8-card"><Skel h={40} w="50%" /><Skel h={260} r={14} /></div></div>;
  if (d.status === "missing") return <div className="v8-card"><V8State icon="empty" title="This isn’t available" message="It may have been deleted, or it’s only visible to certain people." actionLabel="Back" onAction={back} /></div>;
  if (d.status === "error") return <div className="v8-card"><V8State kind="error" title="Couldn’t load this" actionLabel="Try again" onAction={() => setRev((x) => x + 1)} /></div>;
  const p = d.post; const signedIn = Boolean(user);
  return (
    <div className={`v8c-detail kind-${p.kind}`}>
      <header className="v8c-page-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={back}><V8Icon name="back" size={22} /></button><div><h1>{p.kind === "tip" ? "Tip" : p.kind === "hype" ? "Hype" : "Post"}</h1></div></header>
      <div className="v8c-detail-grid">
        <div className="v8c-detail-main">
          {p.review ? <div className={p.review === "blocked" ? "v8c-err-box" : "v8c-warn-box"} role="status"><V8Icon name="shield" size={18} /><span><b>{p.review === "blocked" ? "Not published — rights check didn’t pass" : "Waiting for a rights check"}</b>{p.review === "blocked" ? "Only you can see this. You can appeal from Creator workspace → Safety." : "Only you can see this until HOWDI clears it. We’ll notify you."}</span></div> : null}
          <PostCard post={p} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} onRoute={onRoute} detail onChanged={(x) => { if (x === "reload") setRev((v) => v + 1); }} onRemoved={back} />
          {!p.locked ? <section className="v8-card v8c-detail-comments"><Comments post={p} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} sortable={p.kind === "hype"} kindWord={p.kind === "post" ? "Author" : "Creator"} /></section> : null}
          {p.kind === "hype" && !p.viewer.mine ? <div className="v8-card v8c-kind-card"><V8Icon name="smile" size={22} /><span><b>Keep it kind</b><small>See something inappropriate?</small></span><button type="button" className="v8-btn v8-btn-soft" onClick={() => (signedIn ? setReport(true) : onRequireLogin())}>Report</button></div> : null}
        </div>
        {(p.related || []).length && !p.locked ? (
          <aside className="v8-card v8c-related"><h2>Related learning and more</h2>
            {p.related.map((r) => <button key={r.route} type="button" className="v8c-rel" onClick={() => onRoute(r.route)}><span className={`ph k-${r.kind}`}>{safeImg(r.image) ? <img src={r.image} alt="" /> : <V8Icon name={REL_ICON[r.kind] || "link"} size={20} />}</span><span><small className={`k-${r.kind}`}>{r.kind}</small><b>{r.title}</b><small>{r.sub}</small></span><V8Icon name="chevr" size={16} /></button>)}
          </aside>
        ) : null}
      </div>
      <ReportSheet open={report} what={p.kind === "hype" ? "Hype" : "post"} onClose={() => setReport(false)} onSubmit={(reason, details) => api("POST", `/api/v8/posts/${p.public_key}/report`, { reason, details })} />
    </div>
  );
}

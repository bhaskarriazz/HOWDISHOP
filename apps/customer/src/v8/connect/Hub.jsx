// HOWDI V8 Connect Home — CON-001.. (board 06 desktop + mobile panel 1, board 17 hub, PRIOR-07 entries).
// Fixed shell stays; this page is the Connect feature hub: stories rail, composer, feature entries (Vibe, Live,
// Spaces, Articles, Communities), the feed, and right-hand rails for Communities / Groups / Channels / Live / Spaces.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Who, Sheet, ReportSheet, ShareSheet, Skel, fmt, since, when, safeImg, safeVideo, readFileAsDataUrl, SignInCard } from "./common";

const FEATURES = [
  { key: "vibe", label: "Vibe", sub: "Short videos", icon: "play", tone: "coral" },
  { key: "live", label: "Live", sub: "Watch & join", icon: "live", tone: "rose" },
  { key: "spaces", label: "Spaces", sub: "Audio rooms", icon: "mic", tone: "violet" },
  { key: "articles", label: "Articles", sub: "Read & write", icon: "article", tone: "blue" },
  { key: "communities", label: "Communities", sub: "Groups & channels", icon: "users", tone: "teal" },
];
const AUDIENCES = [
  { value: "everyone", label: "Everyone", sub: "Anyone on HOWDI can see this.", icon: "globe" },
  { value: "friends", label: "Friends", sub: "People you follow who follow you back.", icon: "users" },
  { value: "close_friends", label: "Close Friends", sub: "Only your close friends list.", icon: "star" },
  { value: "only_me", label: "Only Me", sub: "Only you can see this.", icon: "lock" },
];

export function StoriesRail({ stories, loading, signedIn, onOpen, onCreate }) {
  return (
    <section className="v8-card v8c-stories" aria-label="Stories">
      <header className="v8c-sec-head"><h2>Stories</h2><button type="button" className="v8-link" onClick={() => stories[0] && onOpen(0)} disabled={!stories.length}>View all</button></header>
      <div className="v8c-stories-row">
        <button type="button" className="v8c-story add" onClick={onCreate}>
          <span className="v8c-story-ring add"><V8Icon name="plus" size={26} /></span><b>{signedIn ? "Add story" : "Add story"}</b><small>{signedIn ? "Share a moment" : "Sign in"}</small>
        </button>
        {loading ? [0, 1, 2, 3, 4].map((i) => <span key={i} className="v8c-story"><Skel h={72} w={72} r={40} /><Skel h={10} w={56} /></span>) : null}
        {!loading && stories.map((g, i) => (
          <button type="button" key={g.author.public_username} className={`v8c-story ${g.seen_all ? "seen" : ""}`} onClick={() => onOpen(i)} aria-label={`Story by @${g.author.public_username}${g.seen_all ? ", seen" : ", new"}`}>
            <span className={`v8c-story-ring ${g.seen_all ? "seen" : ""}`}><Ava src={g.author.avatar_url} name={g.author.display_name} size={66} /></span>
            <b>{g.mine ? "Your story" : `@${g.author.public_username}`}</b><small>{since(g.latest_at)}</small>
          </button>
        ))}
        {!loading && !stories.length ? <p className="v8c-muted v8c-stories-empty">No stories right now. Stories disappear after 24 hours.</p> : null}
      </div>
    </section>
  );
}

function Composer({ user, api, onPosted, onRequireLogin, onOpenCreate }) {
  const ui = useV8Ui();
  const [text, setText] = useState(""); const [aud, setAud] = useState("everyone"); const [media, setMedia] = useState([]);
  const [audOpen, setAudOpen] = useState(false); const [state, setState] = useState("idle"); const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const signedIn = Boolean(user);
  const pick = async (files) => {
    setErr("");
    const list = [...(files || [])].slice(0, 4 - media.length);
    for (const f of list) {
      if (!/^image\/(jpeg|png|webp)$|^video\/(mp4|webm)$/.test(f.type)) { setErr("Use JPG, PNG, WebP, MP4 or WebM."); continue; }
      if (f.size > (f.type.startsWith("video") ? 20 : 5) * 1024 * 1024) { setErr(f.type.startsWith("video") ? "Videos can be up to 20 MB." : "Photos can be up to 5 MB."); continue; }
      const data = await readFileAsDataUrl(f); setMedia((m) => [...m, { data, type: f.type.startsWith("video") ? "video" : "image", name: f.name }]);
    }
  };
  const post = async () => {
    if (!signedIn) { onRequireLogin(); return; }
    setState("posting"); setErr("");
    const r = await api("POST", "/api/v8/posts", { text, audience: aud, media: media.map((m) => m.data) });
    if (!r.ok) { setState("idle"); setErr(r.json.message || "Couldn’t post. Please try again."); return; }
    setText(""); setMedia([]); setState("idle");
    ui?.toast({ title: "Your post is live!", message: `It’s now visible to ${AUDIENCES.find((a) => a.value === aud)?.label || "Everyone"}.` });
    onPosted(r.json.post);
  };
  const a = AUDIENCES.find((x) => x.value === aud);
  return (
    <section className="v8-card v8c-composer" aria-label="Create a post">
      <div className="v8c-composer-top">
        <Ava src={user?.avatar} name={user?.full_name || "H"} size={40} />
        <label className="v8c-composer-input">
          <span className="v8-sr">What’s on your mind?</span>
          <textarea rows={text ? 3 : 1} maxLength={5000} value={text} onFocus={() => { if (!signedIn) onRequireLogin(); }} onChange={(e) => setText(e.target.value)}
            placeholder={signedIn && user?.public_username ? `What’s on your mind, @${user.public_username}?` : "What’s on your mind?"} />
        </label>
        <button type="button" className="v8c-aud-btn" onClick={() => setAudOpen(true)} aria-label={`Audience: ${a.label}`}><V8Icon name={a.icon} size={16} />{a.label}<V8Icon name="chev" size={14} /></button>
      </div>
      {media.length ? (
        <div className="v8c-composer-media">
          {media.map((m, i) => (
            <span key={i} className="v8c-thumb">{m.type === "video" ? <video src={m.data} muted /> : <img src={m.data} alt="" />}
              <button type="button" aria-label="Remove" onClick={() => setMedia((x) => x.filter((_, j) => j !== i))}><V8Icon name="x" size={14} /></button></span>
          ))}
        </div>
      ) : null}
      {state === "posting" ? <div className="v8c-upload"><span>Posting{media.length ? ` ${media.length} item${media.length > 1 ? "s" : ""}` : ""}…</span><div className="v8c-progress"><i /></div></div> : null}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <div className="v8c-composer-actions">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        <button type="button" onClick={() => (signedIn ? fileRef.current?.click() : onRequireLogin())}><V8Icon name="image" size={18} /><span>Photo / Video</span></button>
        <button type="button" onClick={() => onOpenCreate("live")}><V8Icon name="live" size={18} /><span>Live</span></button>
        <button type="button" onClick={() => onOpenCreate("vibe/create")}><V8Icon name="play" size={18} /><span>Vibe</span></button>
        <button type="button" className="v8-btn v8-btn-primary" disabled={state === "posting" || (!text.trim() && !media.length)} onClick={post}>Post</button>
      </div>
      <Sheet open={audOpen} title="Choose audience" onClose={() => setAudOpen(false)}>
        <div className="v8c-reasons" role="radiogroup" aria-label="Audience">
          {AUDIENCES.map((x) => (
            <label key={x.value} className={`v8c-aud ${aud === x.value ? "on" : ""}`}>
              <input type="radio" name="v8c-aud" checked={aud === x.value} onChange={() => { setAud(x.value); setAudOpen(false); }} />
              <V8Icon name={x.icon} size={20} /><span><b>{x.label}</b><small>{x.sub}</small></span>
            </label>
          ))}
        </div>
      </Sheet>
    </section>
  );
}

export function PostCard({ post, api, signedIn, onRequireLogin, onOpenProfile, onChanged, onRemoved }) {
  const ui = useV8Ui();
  const [p, setP] = useState(post); const [menu, setMenu] = useState(false); const [report, setReport] = useState(false); const [share, setShare] = useState(false);
  const [comments, setComments] = useState(null); const [cOpen, setCOpen] = useState(false); const [ctext, setCtext] = useState(""); const [cbusy, setCbusy] = useState(false); const [block, setBlock] = useState(false); const [del, setDel] = useState(false);
  useEffect(() => setP(post), [post]);
  const need = () => { if (!signedIn) { onRequireLogin(); return true; } return false; };
  const toggle = async (kind) => {
    if (need()) return;
    const on = kind === "like" ? p.viewer.liked : p.viewer.saved;
    const next = { ...p, viewer: { ...p.viewer, [kind === "like" ? "liked" : "saved"]: !on }, counts: kind === "like" ? { ...p.counts, likes: p.counts.likes + (on ? -1 : 1) } : p.counts };
    setP(next);
    const r = await api(on ? "DELETE" : "POST", `/api/v8/posts/${p.public_key}/${kind}`);
    if (!r.ok) { setP(p); ui?.toast({ kind: "error", title: "Couldn’t update", message: r.json.message || "Please try again." }); }
    else { if (kind === "like") setP((x) => ({ ...x, counts: { ...x.counts, likes: r.json.count } })); if (kind === "save") ui?.toast({ title: on ? "Removed from Saved" : "Saved" }); onChanged?.(); }
  };
  const openComments = async () => {
    setCOpen(true); setComments(null);
    const r = await api("GET", `/api/v8/posts/${p.public_key}/comments`);
    setComments(r.ok ? r.json.comments : "error");
  };
  const addComment = async () => {
    if (need() || !ctext.trim()) return;
    setCbusy(true);
    const r = await api("POST", `/api/v8/posts/${p.public_key}/comments`, { text: ctext });
    setCbusy(false);
    if (!r.ok) { ui?.toast({ kind: "error", title: "Comment not posted", message: r.json.message || "Please try again." }); return; }
    setComments((c) => [...(Array.isArray(c) ? c : []), r.json.comment]); setCtext(""); setP((x) => ({ ...x, counts: { ...x.counts, comments: x.counts.comments + 1 } }));
  };
  const media = p.media || [];
  return (
    <article className="v8-card v8c-post" aria-label={`Post by @${p.author.public_username}`}>
      <header className="v8c-post-head">
        <Who author={p.author} sub={`${since(p.published_at)} · ${{ everyone: "Everyone", friends: "Friends", close_friends: "Close friends", followers: "Followers", only_me: "Only me" }[p.audience] || "Everyone"}`} onOpen={onOpenProfile} />
        <button type="button" className="v8-icon-btn" aria-label="More options" onClick={() => setMenu(true)}><V8Icon name="more" size={22} /></button>
      </header>
      {p.text ? <p className="v8c-post-text">{p.text}</p> : null}
      {media.length ? (
        <div className={`v8c-post-media n${media.length}`}>
          {media.map((m, i) => (m.type === "video" && safeVideo(m.url) ? <video key={i} src={m.url} controls playsInline preload="metadata" /> : safeImg(m.url) ? <img key={i} src={m.url} alt="" loading="lazy" /> : null))}
        </div>
      ) : null}
      <footer className="v8c-post-actions">
        <button type="button" className={p.viewer.liked ? "on like" : ""} aria-pressed={p.viewer.liked} onClick={() => toggle("like")}><V8Icon name="heart" size={20} fill={p.viewer.liked} />{fmt(p.counts.likes)}</button>
        <button type="button" onClick={openComments}><V8Icon name="comment" size={20} />{fmt(p.counts.comments)}</button>
        <button type="button" className={p.viewer.saved ? "on" : ""} aria-pressed={p.viewer.saved} onClick={() => toggle("save")}><V8Icon name="bookmark" size={20} fill={p.viewer.saved} />{p.viewer.saved ? "Saved" : "Save"}</button>
        <button type="button" onClick={() => setShare(true)}><V8Icon name="share" size={20} />Share</button>
      </footer>
      <Sheet open={menu} title="Post options" onClose={() => setMenu(false)}>
        {p.viewer.mine ? (
          <button type="button" className="v8c-row danger" onClick={() => { setMenu(false); setDel(true); }}><span className="v8c-row-ico"><V8Icon name="trash" size={20} /></span><span className="v8c-row-text"><b>Delete post</b></span></button>
        ) : (<>
          <button type="button" className="v8c-row" onClick={() => { setMenu(false); if (!need()) setReport(true); }}><span className="v8c-row-ico"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report post</b><small>Private — the author isn’t told who reported</small></span></button>
          <button type="button" className="v8c-row danger" onClick={() => { setMenu(false); if (!need()) setBlock(true); }}><span className="v8c-row-ico"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{p.author.public_username}</b><small>They won’t see your content or contact you</small></span></button>
        </>)}
      </Sheet>
      <ReportSheet open={report} what="post" onClose={() => setReport(false)} onSubmit={(reason, details) => api("POST", `/api/v8/posts/${p.public_key}/report`, { reason, details })} />
      <ShareSheet open={share} title="HOWDI post" link={p.route} onClose={() => setShare(false)} onShared={(channel) => api("POST", `/api/v8/posts/${p.public_key}/share`, { channel })} />
      <V8Confirm open={block} danger title={`Block @${p.author.public_username}?`} body="They won’t be able to see your posts, stories or Vibes, message you or find your profile. You can unblock them from Privacy & safety." confirmLabel="Block" onCancel={() => setBlock(false)}
        onConfirm={async () => { const r = await api("POST", `/api/v8/creators/${p.author.public_username}/block`); setBlock(false); if (r.ok) { ui?.toast({ title: `@${p.author.public_username} is blocked` }); onRemoved?.(p.author.public_username, "author"); } else ui?.toast({ kind: "error", title: "Couldn’t block", message: r.json.message }); }} />
      <V8Confirm open={del} danger title="Delete this post?" body="It will be removed from Connect for everyone. This can’t be undone." confirmLabel="Delete" onCancel={() => setDel(false)}
        onConfirm={async () => { const r = await api("DELETE", `/api/v8/posts/${p.public_key}`); setDel(false); if (r.ok) { ui?.toast({ title: "Post deleted" }); onRemoved?.(p.public_key, "post"); } else ui?.toast({ kind: "error", title: "Couldn’t delete", message: r.json.message }); }} />
      <Sheet open={cOpen} title={`Comments${p.counts.comments ? ` (${p.counts.comments})` : ""}`} onClose={() => setCOpen(false)}>
        <div className="v8c-comments">
          {comments === null ? <><Skel h={40} /><Skel h={40} /></> : comments === "error" ? <V8State kind="error" title="Couldn’t load comments" actionLabel="Try again" onAction={openComments} />
            : comments.length ? comments.map((c) => (
              <div key={c.public_key} className="v8c-comment"><Ava src={c.author.avatar_url} name={c.author.display_name} size={34} />
                <div><span className="v8c-who-line"><b>@{c.author.public_username}</b><V8Badges verified={c.author.verified} premium={c.author.premium} size="sm" />{c.by_creator ? <span className="v8c-chip-mini">Author</span> : null}<small>{since(c.created_at)}</small></span><p>{c.text}</p></div></div>
            )) : <p className="v8c-muted">No comments yet. Start the conversation.</p>}
        </div>
        {p.allow_comments ? (
          <div className="v8c-comment-box">
            <input value={ctext} maxLength={1000} onChange={(e) => setCtext(e.target.value)} placeholder={signedIn ? "Add a comment…" : "Sign in to comment"} onFocus={() => need()} onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} aria-label="Add a comment" />
            <button type="button" className="v8-btn v8-btn-primary" disabled={cbusy || !ctext.trim()} onClick={addComment}>{cbusy ? "…" : "Post"}</button>
          </div>
        ) : <p className="v8c-muted">Comments are turned off for this post.</p>}
      </Sheet>
    </article>
  );
}

function RailCard({ title, onViewAll, children, empty }) {
  return (
    <section className="v8-card v8c-rail">
      <header className="v8c-sec-head"><h2>{title}</h2><button type="button" className="v8-link" onClick={onViewAll}>View all</button></header>
      {children}
      {empty ? <p className="v8c-muted">{empty}</p> : null}
    </section>
  );
}

export default function ConnectHub({ api, user, onNav, onRequireLogin, onOpenProfile, onOpenStory, onCreateStory }) {
  const [hub, setHub] = useState({ status: "loading" });
  const [feed, setFeed] = useState({ status: "loading", items: [], next: null });
  const [reload, setReload] = useState(0);
  const signedIn = Boolean(user);
  useEffect(() => {
    const ctl = new AbortController();
    setHub({ status: "loading" });
    api("GET", "/api/v8/connect/hub", undefined, { signal: ctl.signal }).then((r) => { if (!r.aborted) setHub(r.ok ? { ...r.json, status: "ready" } : { status: "error", message: r.json.message }); });
    setFeed({ status: "loading", items: [], next: null });
    api("GET", "/api/v8/connect/feed?limit=8", undefined, { signal: ctl.signal }).then((r) => { if (!r.aborted) setFeed(r.ok ? { status: "ready", items: r.json.items, next: r.json.next_cursor } : { status: "error", items: [], next: null }); });
    return () => ctl.abort();
  }, [api, reload, signedIn]);
  const more = async () => {
    if (!feed.next) return;
    setFeed((f) => ({ ...f, status: "more" }));
    const r = await api("GET", `/api/v8/connect/feed?limit=8&cursor=${encodeURIComponent(feed.next)}`);
    setFeed((f) => (r.ok ? { status: "ready", items: [...f.items, ...r.json.items], next: r.json.next_cursor } : { ...f, status: "ready", moreError: true }));
  };
  const join = async (g) => {
    if (!signedIn) { onRequireLogin(); return; }
    onNav(`communities/${g.public_key}`);
  };
  const rails = hub.rails || {};
  const liveNow = (rails.live || []).filter((x) => x.state === "live").length;
  const counts = { vibe: (hub.vibes || []).length ? "New" : "", live: liveNow ? `${liveNow} live` : "", spaces: (rails.spaces || []).filter((x) => x.state === "live").length ? "On air" : "", articles: "", communities: "" };
  return (
    <div className="v8c-hub">
      <div className="v8c-hub-main">
        <div className="v8c-hub-title"><h1>Connect</h1><p>Real people, real conversations. Stories, Vibes, Live, Spaces, Articles and Communities.</p></div>
        {hub.status === "error" ? <div className="v8-banner-error" role="alert"><V8Icon name="alert" size={20} /><span><b>Connect didn’t load.</b> {hub.message || "Check your connection and try again."}</span><button type="button" className="v8-btn v8-btn-soft" onClick={() => setReload((x) => x + 1)}>Retry</button></div> : null}
        <StoriesRail stories={hub.stories || []} loading={hub.status === "loading"} signedIn={signedIn} onOpen={(i) => onOpenStory(hub.stories, i)} onCreate={() => (signedIn ? onCreateStory() : onRequireLogin())} />
        <nav className="v8c-features" aria-label="Connect features">
          {FEATURES.map((f) => (
            <button key={f.key} type="button" className={`v8c-feature tone-${f.tone}`} onClick={() => onNav(f.key)}>
              <span className="v8c-feature-ico"><V8Icon name={f.icon} size={22} /></span>
              <span className="v8c-feature-text"><b>{f.label}</b><small>{f.sub}</small></span>
              {counts[f.key] ? <span className="v8c-feature-badge">{counts[f.key]}</span> : null}
            </button>
          ))}
        </nav>
        <Composer user={user} api={api} onRequireLogin={onRequireLogin} onOpenCreate={(k) => onNav(k)} onPosted={(post) => { if (post) setFeed((f) => ({ ...f, items: [post, ...f.items] })); }} />
        {(hub.vibes || []).length ? (
          <section className="v8-card v8c-vibe-rail" aria-label="Vibes for you">
            <header className="v8c-sec-head"><h2><V8Icon name="play" size={18} /> Vibes for you</h2><button type="button" className="v8-link" onClick={() => onNav("vibe")}>Open Vibe</button></header>
            <div className="v8c-vibe-strip">
              {hub.vibes.map((v) => (
                <button key={v.public_key} type="button" className="v8c-vibe-tile" onClick={() => onNav(`vibe/${v.public_key}`)} aria-label={`Vibe by @${v.author.public_username}: ${v.caption.slice(0, 60)}`}>
                  <img src={safeImg(v.cover_url) || safeImg(v.media[0]?.poster) || ""} alt="" loading="lazy" />
                  <span className="v8c-vibe-tile-meta"><V8Icon name="play" size={14} fill />{fmt(v.counts.plays || v.counts.likes)}</span>
                  <span className="v8c-vibe-tile-by">@{v.author.public_username}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <div className="v8c-feed" aria-label="Connect feed" aria-busy={feed.status === "loading"}>
          {feed.status === "loading" ? [0, 1].map((i) => <div key={i} className="v8-card v8c-post"><Skel h={40} w="50%" /><Skel h={14} /><Skel h={220} r={14} /></div>) : null}
          {feed.status === "error" ? <V8State kind="error" title="Posts didn’t load" message="Check your connection and try again." actionLabel="Try again" onAction={() => setReload((x) => x + 1)} /> : null}
          {feed.status !== "loading" && feed.status !== "error" && !feed.items.length ? <V8State icon="comment" title="No posts yet" message="Follow people and join communities to fill your feed — or share the first post." actionLabel={signedIn ? "Explore communities" : "Sign in"} onAction={() => (signedIn ? onNav("communities") : onRequireLogin())} /> : null}
          {feed.items.map((p) => <PostCard key={p.public_key} post={p} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile}
            onRemoved={(key, kind) => setFeed((f) => ({ ...f, items: f.items.filter((x) => (kind === "author" ? x.author.public_username !== key : x.public_key !== key)) }))} />)}
          {feed.next ? <button type="button" className="v8-btn v8-btn-block" disabled={feed.status === "more"} onClick={more}>{feed.status === "more" ? "Loading…" : "Load more posts"}</button> : null}
          {feed.moreError ? <p className="v8c-err" role="alert">Couldn’t load more. <button type="button" className="v8-link" onClick={more}>Retry</button></p> : null}
        </div>
      </div>
      <aside className="v8c-hub-side" aria-label="Communities, Live and Spaces">
        {hub.status === "loading" ? [0, 1, 2].map((i) => <div key={i} className="v8-card v8c-rail"><Skel h={16} w="40%" /><Skel h={56} /></div>) : null}
        {hub.status === "ready" ? (<>
          <RailCard title="Communities" onViewAll={() => onNav("communities")} empty={!(rails.communities || []).length ? "No communities yet." : ""}>
            {(rails.communities || []).slice(0, 2).map((g) => <CommunityItem key={g.public_key} g={g} onOpen={() => onNav(`communities/${g.public_key}`)} onJoin={() => join(g)} />)}
          </RailCard>
          <RailCard title="Groups" onViewAll={() => onNav("communities?type=groups")} empty={!(rails.groups || []).length ? "No groups yet." : ""}>
            {(rails.groups || []).slice(0, 2).map((g) => <CommunityItem key={g.public_key} g={g} onOpen={() => onNav(`communities/${g.public_key}`)} onJoin={() => join(g)} />)}
          </RailCard>
          <RailCard title="Channels" onViewAll={() => onNav("communities?type=channels")} empty={!(rails.channels || []).length ? "No channels yet." : ""}>
            {(rails.channels || []).slice(0, 2).map((g) => <CommunityItem key={g.public_key} g={g} onOpen={() => onNav(`communities/${g.public_key}`)} onJoin={() => join(g)} />)}
          </RailCard>
          <RailCard title="Live" onViewAll={() => onNav("live")} empty={!(rails.live || []).length ? "Nobody is live right now." : ""}>
            {(rails.live || []).slice(0, 2).map((r) => <RoomItem key={r.public_key} r={r} onOpen={() => onNav(`live/${r.public_key}`)} />)}
          </RailCard>
          <RailCard title="Spaces" onViewAll={() => onNav("spaces")} empty={!(rails.spaces || []).length ? "No Spaces scheduled." : ""}>
            {(rails.spaces || []).slice(0, 2).map((r) => <RoomItem key={r.public_key} r={r} space onOpen={() => onNav(`spaces/${r.public_key}`)} />)}
          </RailCard>
          {(hub.articles || []).length ? (
            <RailCard title="Articles" onViewAll={() => onNav("articles")}>
              {hub.articles.slice(0, 3).map((a) => (
                <button key={a.public_key} type="button" className="v8c-rail-item" onClick={() => onNav(`articles/${a.public_key}`)}>
                  {safeImg(a.cover_url) ? <img className="v8c-rail-img" src={a.cover_url} alt="" /> : <span className="v8c-rail-img ph"><V8Icon name="article" size={20} /></span>}
                  <span className="v8c-rail-text"><b>{a.title}</b><small>@{a.author.public_username}{a.read_minutes ? ` · ${a.read_minutes} min read` : ""}</small></span>
                </button>
              ))}
            </RailCard>
          ) : null}
        </>) : null}
        {!signedIn ? <div className="v8-card v8c-rail"><SignInCard title="Join the conversation" message="Sign in to post, follow creators and join communities." onSignIn={onRequireLogin} /></div> : null}
      </aside>
    </div>
  );
}

function CommunityItem({ g, onOpen, onJoin }) {
  const label = g.membership === "member" ? "Open" : g.membership === "pending" ? "Requested" : g.kind === "channel" ? "Subscribe" : g.privacy === "private" ? "Request" : "Join";
  return (
    <div className="v8c-rail-item">
      <button type="button" className="v8c-rail-open" onClick={onOpen}>
        {safeImg(g.image_url) ? <img className="v8c-rail-img" src={g.image_url} alt="" /> : <span className="v8c-rail-img ph"><V8Icon name={g.kind === "channel" ? "live" : "users"} size={20} /></span>}
        <span className="v8c-rail-text"><b>{g.name}{g.verified ? <V8Badges verified size="sm" /> : null}</b><small>{fmt(g.member_count)} {g.kind === "channel" ? "subscribers" : "members"} · {g.privacy === "private" ? "Private" : "Public"}</small>{g.description ? <small className="clamp1">{g.description}</small> : null}</span>
      </button>
      <button type="button" className={`v8-btn ${g.membership === "none" ? "v8-btn-soft" : ""} v8c-rail-cta`} disabled={g.membership === "pending"} onClick={g.membership === "member" ? onOpen : onJoin}>{label}</button>
    </div>
  );
}

function RoomItem({ r, onOpen, space }) {
  return (
    <div className="v8c-rail-item">
      <button type="button" className="v8c-rail-open" onClick={onOpen}>
        {safeImg(r.image_url) ? <span className="v8c-rail-img live"><img src={r.image_url} alt="" />{r.state === "live" ? <i className="v8c-live-tag">LIVE</i> : null}</span>
          : <span className={`v8c-rail-img ph ${space ? "space" : ""}`}><V8Icon name={space ? "mic" : "live"} size={20} />{r.state === "live" ? <i className="v8c-live-tag">LIVE</i> : null}</span>}
        <span className="v8c-rail-text"><b>{r.title}</b><small>{r.state === "live" ? "Live now" : when(r.starts_at)}</small><small>@{r.host.public_username}</small></span>
      </button>
      <button type="button" className="v8-btn v8-btn-soft v8c-rail-cta" onClick={onOpen}>{r.state === "live" ? (space ? "Join" : "Watch") : "View"}</button>
    </div>
  );
}

// HOWDI V8 Vibe — VIB-001..013 (board 32 desktop companion + mobile panels 3/4/6, SUP-03 panels 1–6, PRIOR-07 panels 1–2).
// Discovery tabs (For You / Following / Explore / Learn) + categories, vertical viewer with like / comment / save / share /
// remix, creator follow, linked product·community·profile, comments with replies, report / block / not interested,
// content preferences, and loading / empty / error / sign-in / unavailable states. Create lives in VibeCreate.jsx.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, ShareSheet, Skel, Tabs, fmt, since, safeImg, safeVideo, SignInCard } from "./common";

const TABS = [{ value: "for-you", label: "For You" }, { value: "following", label: "Following" }, { value: "explore", label: "Explore" }, { value: "learn", label: "Learn" }];
const PREF_KEY = "howdi.v8.vibePrefs";
const loadPrefs = () => { try { return { blurSensitive: true, autoplayMuted: true, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; } catch { return { blurSensitive: true, autoplayMuted: true }; } };
const savePrefs = (p) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* private mode */ } };
const LINK_ICON = { product: "shop", course: "learn", community: "users", profile: "user", service: "works" };

function Player({ vibe, active, muted, onToggleMute, prefs, onPrefsChange, onDouble }) {
  const ref = useRef(null); const [paused, setPaused] = useState(false); const [progress, setProgress] = useState(0); const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState("loading"); const [menu, setMenu] = useState(false); const [pip, setPip] = useState(false); const [speed, setSpeed] = useState(1);
  const m = vibe.media[0] || {};
  const isVideo = m.type === "video" && safeVideo(m.url);
  // The current API returns one direct URL. These optional fields deliberately remain
  // absent until a playback manifest supplies real renditions/tracks.
  const renditions = (Array.isArray(m.renditions) ? m.renditions : []).filter((x) => x && safeVideo(x.url));
  const captions = (Array.isArray(m.caption_tracks) ? m.caption_tracks : []).filter((x) => x && /^(https?:\/\/|\/)/.test(String(x.url || "")));
  const sources = [{ url: m.url, label: "Auto" }, ...renditions];
  const [source, setSource] = useState(m.url);
  const canPip = isVideo && typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled && ref.current?.requestPictureInPicture);
  useEffect(() => {
    const el = ref.current; if (!el || !isVideo) return;
    if (active && !paused) { el.play().catch(() => setPaused(true)); } else el.pause();
  }, [active, paused, isVideo]);
  useEffect(() => { if (!active) { setPaused(false); } }, [active]);
  useEffect(() => { const el = ref.current; if (el) el.playbackRate = speed; }, [speed, isVideo]);
  const blurred = vibe.sensitive && prefs.blurSensitive && !revealed;
  const retry = () => { const el = ref.current; if (!el) return; setPhase("loading"); el.load(); if (active) el.play().catch(() => setPaused(true)); };
  const openPip = async () => {
    const el = ref.current; if (!el || !canPip) return;
    try { await el.requestPictureInPicture(); } catch { /* browser declined or changed capability */ }
  };
  const dataSaverAvailable = renditions.some((x) => x.data_saver === true);
  return (
    <div className="v8v-player" onDoubleClick={onDouble}>
      {isVideo ? (
        <video ref={ref} src={source} poster={safeImg(m.poster) || safeImg(vibe.cover_url) || undefined} muted={muted} loop playsInline preload="metadata" className={blurred ? "blur" : ""}
          onLoadStart={() => setPhase("loading")} onWaiting={() => setPhase("buffering")} onCanPlay={() => setPhase("ready")} onPlaying={() => setPhase("ready")}
          onError={() => setPhase("error")} onEnterPictureInPicture={() => setPip(true)} onLeavePictureInPicture={() => setPip(false)}
          onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }} onClick={() => setPaused((p) => !p)} aria-label={vibe.caption.slice(0, 80) || "Vibe video"}>
          {captions.map((track, i) => <track key={`${track.url}-${i}`} kind={track.kind || "subtitles"} src={track.url} srcLang={track.language || "en"} label={track.label || track.language || "Captions"} default={track.default === true} />)}
        </video>
      ) : <img src={safeImg(m.url) || safeImg(vibe.cover_url)} alt={vibe.caption.slice(0, 80)} className={blurred ? "blur" : ""} />}
      {blurred ? <div className="v8v-sensitive"><V8Icon name="eyeoff" size={26} /><b>Sensitive content</b><p>This Vibe may not be suitable for everyone.</p><button type="button" className="v8-btn v8-btn-soft" onClick={() => setRevealed(true)}>View Vibe</button></div> : null}
      {isVideo && paused && !blurred ? <button type="button" className="v8v-bigplay" aria-label="Play" onClick={() => setPaused(false)}><V8Icon name="play" size={34} fill /></button> : null}
      {isVideo && ["loading", "buffering"].includes(phase) && !blurred ? <span className="v8v-player-state" role="status">{phase === "buffering" ? "Buffering…" : "Loading…"}</span> : null}
      {isVideo && phase === "error" && !blurred ? <div className="v8v-player-error" role="alert"><b>Video unavailable</b><button type="button" onClick={retry}>Retry</button></div> : null}
      {isVideo ? <div className="v8v-progress" aria-hidden="true"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div> : null}
      {isVideo ? <button type="button" className="v8v-mute" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"}><V8Icon name={muted ? "mute" : "volume"} size={18} /></button> : null}
      {isVideo ? <button type="button" className="v8v-player-menu" aria-label="Video controls" aria-expanded={menu} onClick={() => setMenu((x) => !x)}><V8Icon name="sliders" size={18} /></button> : null}
      {menu && isVideo ? <div className="v8v-player-controls" role="group" aria-label="Video settings">
        <label>Playback speed<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => <option key={x} value={x}>{x}×</option>)}</select></label>
        {renditions.length ? <label>Quality<select aria-label="Video quality" value={source} onChange={(e) => setSource(e.target.value)}>{sources.map((x, i) => <option key={x.url} value={x.url}>{x.label || (x.height ? `${x.height}p` : `Source ${i + 1}`)}</option>)}</select></label> : <p>Quality options are unavailable for this video.</p>}
        {captions.length ? <p><V8Icon name="cc" size={15} /> Captions are available in the player.</p> : <p>Caption tracks are unavailable for this video.</p>}
        <label className="v8v-player-switch"><span>Data saver{dataSaverAvailable ? "" : " unavailable"}</span><input type="checkbox" role="switch" checked={Boolean(prefs.dataSaver)} disabled={!dataSaverAvailable} onChange={(e) => { onPrefsChange({ dataSaver: e.target.checked }); const saver = renditions.find((x) => x.data_saver === true); if (e.target.checked && saver) setSource(saver.url); }} /></label>
        {canPip ? <button type="button" onClick={openPip}>{pip ? "Picture in Picture active" : "Picture in Picture"}</button> : <p>Picture in Picture is not available in this browser.</p>}
        <p>Background playback follows your browser or device controls.</p>
      </div> : null}
    </div>
  );
}

function LinkChip({ link, onOpen }) {
  if (!link) return null;
  return (
    <button type="button" className="v8v-link" onClick={() => onOpen(link.route)}>
      <span className="v8v-link-ico"><V8Icon name={LINK_ICON[link.kind] || "link"} size={18} /></span>
      <span><small>{link.kind === "product" ? "Product" : link.kind === "course" ? "Course" : link.kind === "community" ? "Community" : link.kind === "service" ? "Service" : "Profile"}</small><b>{link.label}</b>{link.sub ? <small>{link.sub}</small> : null}</span>
      <V8Icon name="chevr" size={16} />
    </button>
  );
}

export function VibeCard({ vibe, active, api, signedIn, onRequireLogin, onOpenProfile, onRoute, muted, onToggleMute, prefs, onChange, onHide, onComments, onShare, onMore, onRemix }) {
  const ui = useV8Ui();
  const [burst, setBurst] = useState(false);
  const need = () => { if (!signedIn) { onRequireLogin(); return true; } return false; };
  const toggle = async (kind) => {
    if (need()) return;
    const key = kind === "like" ? "liked" : "saved"; const cnt = kind === "like" ? "likes" : "saves"; const on = vibe.viewer[key];
    onChange({ ...vibe, viewer: { ...vibe.viewer, [key]: !on }, counts: { ...vibe.counts, [cnt]: Math.max(0, vibe.counts[cnt] + (on ? -1 : 1)) } });
    const r = await api(on ? "DELETE" : "POST", `/api/v8/vibes/${vibe.public_key}/${kind}`);
    if (!r.ok) { onChange(vibe); ui?.toast({ kind: "error", title: "Couldn’t update", message: r.json.message || "Please try again." }); return; }
    onChange({ ...vibe, viewer: { ...vibe.viewer, [key]: !on }, counts: { ...vibe.counts, [cnt]: r.json.count } });
    if (kind === "save") ui?.toast({ title: on ? "Removed from Saved" : "Saved to your collection" });
  };
  const follow = async () => {
    if (need()) return;
    const on = vibe.viewer.following;
    onChange({ ...vibe, viewer: { ...vibe.viewer, following: !on } });
    const r = await api(on ? "DELETE" : "POST", `/api/v8/creators/${vibe.author.public_username}/follow`);
    if (!r.ok) { onChange(vibe); ui?.toast({ kind: "error", title: "Couldn’t update follow" }); return; }
    ui?.toast({ title: on ? `Unfollowed @${vibe.author.public_username}` : `Following @${vibe.author.public_username}` });
  };
  const dbl = () => { if (!vibe.viewer.liked) toggle("like"); setBurst(true); window.setTimeout(() => setBurst(false), 700); };
  return (
    <article className={`v8v-card ${active ? "active" : ""}`} aria-label={`Vibe by @${vibe.author.public_username}`} data-key={vibe.public_key}>
      <Player vibe={vibe} active={active} muted={muted} onToggleMute={onToggleMute} prefs={prefs} onDouble={dbl} />
      {burst ? <span className="v8v-burst" aria-hidden="true"><V8Icon name="heart" size={90} fill /></span> : null}
      <div className="v8v-actions" role="group" aria-label="Vibe actions">
        <button type="button" className="v8v-creator" onClick={() => onOpenProfile(vibe.author.public_username)} aria-label={`Open @${vibe.author.public_username}`}><Ava src={vibe.author.avatar_url} name={vibe.author.display_name} size={46} />
          {!vibe.viewer.following && !vibe.viewer.mine ? <span className="v8v-plus" onClick={(e) => { e.stopPropagation(); follow(); }} role="button" aria-label={`Follow @${vibe.author.public_username}`} tabIndex={0}><V8Icon name="plus" size={12} stroke={3} /></span> : null}</button>
        <button type="button" className={vibe.viewer.liked ? "on like" : ""} aria-pressed={vibe.viewer.liked} aria-label={`Like, ${vibe.counts.likes}`} onClick={() => toggle("like")}><V8Icon name="heart" size={30} fill /><span>{fmt(vibe.counts.likes)}</span></button>
        <button type="button" aria-label={`Comments, ${vibe.counts.comments}`} onClick={() => onComments(vibe)}><V8Icon name="comment" size={28} fill /><span>{fmt(vibe.counts.comments)}</span></button>
        <button type="button" className={vibe.viewer.saved ? "on" : ""} aria-pressed={vibe.viewer.saved} aria-label="Save" onClick={() => toggle("save")}><V8Icon name="bookmark" size={28} fill /><span>{vibe.viewer.saved ? "Saved" : fmt(vibe.counts.saves)}</span></button>
        <button type="button" aria-label="Share" onClick={() => onShare(vibe)} disabled={!vibe.allow.share}><V8Icon name="share" size={28} /><span>{fmt(vibe.counts.shares)}</span></button>
        {vibe.allow.remix ? <button type="button" aria-label="Remix" onClick={() => (need() ? null : onRemix(vibe))}><V8Icon name="remix" size={28} /><span>Remix</span></button> : null}
        <button type="button" aria-label="More options" onClick={() => onMore(vibe)}><V8Icon name="more" size={28} /></button>
      </div>
      <div className="v8v-info">
        <div className="v8v-byline">
          <button type="button" className="v8v-handle" onClick={() => onOpenProfile(vibe.author.public_username)}>@{vibe.author.public_username}</button>
          <V8Badges verified={vibe.author.verified} premium={vibe.author.premium} size="sm" />
          {!vibe.viewer.mine ? <button type="button" className={`v8v-follow ${vibe.viewer.following ? "on" : ""}`} onClick={follow}>{vibe.viewer.following ? "Following" : "Follow"}</button> : null}
        </div>
        <p className="v8v-caption">{vibe.caption}</p>
        {vibe.linked ? <LinkChip link={vibe.linked} onOpen={onRoute} /> : null}
      </div>
      {vibe.learning ? <span className="v8v-learn-tag"><V8Icon name="learn" size={14} /> Learn</span> : null}
      <span className="v8-sr">{onHide ? "" : ""}</span>
    </article>
  );
}

function Comments({ vibe, api, signedIn, onRequireLogin, onClose, onCount }) {
  const ui = useV8Ui();
  const [list, setList] = useState(null); const [text, setText] = useState(""); const [reply, setReply] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const load = useCallback(async () => { setList(null); const r = await api("GET", `/api/v8/vibes/${vibe.public_key}/comments`); setList(r.ok ? r.json : "error"); }, [api, vibe.public_key]);
  useEffect(() => { load(); }, [load]);
  const send = async () => {
    if (!signedIn) { onRequireLogin(); return; }
    if (!text.trim()) return;
    setBusy(true); setErr("");
    const r = await api("POST", `/api/v8/vibes/${vibe.public_key}/comments`, { text, replyTo: reply?.public_key });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Comment not posted. Please try again."); return; }
    setList((l) => ({ ...l, comments: [...(l.comments || []), r.json.comment] })); setText(""); setReply(null); onCount(1);
    ui?.announce?.("Comment posted");
  };
  const comments = list && list !== "error" ? list.comments : [];
  const byKey = new Map(comments.map((c) => [c.public_key, c]));
  return (
    <Sheet open title={`Comments${vibe.counts.comments ? ` (${fmt(vibe.counts.comments)})` : ""}`} onClose={onClose}>
      <div className="v8v-comment-vibe"><img src={safeImg(vibe.cover_url) || ""} alt="" /><span><b>@{vibe.author.public_username}</b><small>{vibe.caption.slice(0, 90)}</small></span></div>
      <div className="v8c-comments" aria-live="polite">
        {list === null ? <><Skel h={42} /><Skel h={42} /><Skel h={42} /></> : null}
        {list === "error" ? <V8State kind="error" title="Comments didn’t load" actionLabel="Try again" onAction={load} /> : null}
        {list && list !== "error" && !comments.length ? <p className="v8c-muted">No comments yet. Be the first to say something kind.</p> : null}
        {comments.map((c) => (
          <div key={c.public_key} className={`v8c-comment ${c.reply_to ? "reply" : ""}`}>
            <Ava src={c.author.avatar_url} name={c.author.display_name} size={34} />
            <div>
              <span className="v8c-who-line"><b>@{c.author.public_username}</b><V8Badges verified={c.author.verified} premium={c.author.premium} size="sm" />{c.by_creator ? <span className="v8c-chip-mini">Creator</span> : null}<small>{since(c.created_at)}</small></span>
              {c.reply_to && byKey.get(c.reply_to) ? <small className="v8c-muted">Replying to @{byKey.get(c.reply_to).author.public_username}</small> : null}
              <p>{c.text}</p>
              <button type="button" className="v8-link" onClick={() => { if (!signedIn) { onRequireLogin(); return; } setReply(c); }}>Reply</button>
            </div>
          </div>
        ))}
      </div>
      {list && list !== "error" && list.allow_comments === false ? <p className="v8c-muted">The creator turned off comments for this Vibe.</p> : (
        <>
          {reply ? <div className="v8c-replying">Replying to @{reply.author.public_username}<button type="button" className="v8-link" onClick={() => setReply(null)}>Cancel</button></div> : null}
          {err ? <p className="v8c-err" role="alert">{err}</p> : null}
          <div className="v8c-comment-box">
            <input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={signedIn ? "Add a comment…" : "Sign in to comment"} onFocus={() => { if (!signedIn) onRequireLogin(); }} onKeyDown={(e) => { if (e.key === "Enter") send(); }} aria-label="Add a comment" />
            <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !text.trim()} onClick={send}>{busy ? "…" : "Post"}</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function DetailPanel({ vibe, onOpenProfile, onRoute, onComments, onFollow, onPrefs }) {
  if (!vibe) return <aside className="v8v-panel"><Skel h={60} /><Skel h={120} /></aside>;
  return (
    <aside className="v8v-panel" aria-label="About this Vibe">
      <div className="v8-card v8v-panel-card">
        <div className="v8v-panel-creator">
          <button type="button" onClick={() => onOpenProfile(vibe.author.public_username)} className="v8v-panel-ava"><Ava src={vibe.author.avatar_url} name={vibe.author.display_name} size={52} /></button>
          <span><b>{vibe.author.display_name}</b><span className="v8c-who-line"><small>@{vibe.author.public_username} · Public</small><V8Badges verified={vibe.author.verified} premium={vibe.author.premium} size="sm" /></span></span>
          {!vibe.viewer.mine ? <button type="button" className={`v8-btn ${vibe.viewer.following ? "" : "v8-btn-primary"}`} onClick={onFollow}>{vibe.viewer.following ? "Following" : "Follow"}</button> : null}
        </div>
        <p className="v8v-panel-caption">{vibe.caption}</p>
        {vibe.categories.length || vibe.tags.length ? <div className="v8c-chips">{vibe.categories.map((c) => <span key={c.slug} className="v8c-chip">{c.name}</span>)}{vibe.tags.map((t) => <span key={t} className="v8c-chip">#{t}</span>)}</div> : null}
        <div className="v8v-stats"><span><b>{fmt(vibe.counts.plays)}</b> views</span><span><b>{fmt(vibe.counts.likes)}</b> likes</span><span><b>{fmt(vibe.counts.saves)}</b> saves</span><span>{since(vibe.published_at)}</span></div>
      </div>
      {vibe.linked ? <div className="v8-card v8v-panel-card"><h3>Linked to</h3><LinkChip link={vibe.linked} onOpen={onRoute} /></div> : null}
      <div className="v8-card v8v-panel-card">
        <h3>Comments</h3>
        <button type="button" className="v8-btn v8-btn-block" onClick={() => onComments(vibe)}><V8Icon name="comment" size={18} />{vibe.counts.comments ? `View ${fmt(vibe.counts.comments)} comments` : "Be the first to comment"}</button>
      </div>
      <div className="v8-card v8v-panel-card">
        <h3>Your controls</h3>
        <button type="button" className="v8c-row" onClick={onPrefs}><span className="v8c-row-ico"><V8Icon name="sliders" size={20} /></span><span className="v8c-row-text"><b>Content preferences</b><small>Sensitive content blur · autoplay muted</small></span><V8Icon name="chevr" size={18} /></button>
      </div>
    </aside>
  );
}

export default function VibeScreen({ api, user, focus, onNav, onRequireLogin, onOpenProfile, onRoute }) {
  const ui = useV8Ui();
  const signedIn = Boolean(user);
  const [tab, setTab] = useState(focus ? "for-you" : "for-you");
  const [cat, setCat] = useState("");
  const [cats, setCats] = useState([]);
  const [feed, setFeed] = useState({ status: "loading", items: [], next: null });
  const [single, setSingle] = useState(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [sheet, setSheet] = useState(null); // {kind:'comments'|'share'|'more'|'report'|'block'|'prefs'|'history'|'download', vibe}
  const [reload, setReload] = useState(0);
  const listRef = useRef(null);

  useEffect(() => { api("GET", "/api/v8/vibes/categories").then((r) => { if (r.ok) setCats(r.json.categories || []); }); }, [api]);
  // a deep link (/connect/vibe/VIB-…) opens that Vibe first
  useEffect(() => {
    if (!focus) { setSingle(null); return; }
    setSingle({ status: "loading" });
    api("GET", `/api/v8/vibes/${focus}`).then((r) => setSingle(r.ok ? { status: "ready", vibe: r.json.vibe } : { status: r.status === 404 ? "gone" : "error" }));
  }, [api, focus, reload]);
  useEffect(() => {
    const ctl = new AbortController();
    setFeed({ status: "loading", items: [], next: null }); setActive(0);
    const qs = new URLSearchParams({ tab, limit: "8" }); if (cat) qs.set("category", cat);
    api("GET", `/api/v8/vibes?${qs}`, undefined, { signal: ctl.signal }).then((r) => {
      if (r.aborted) return;
      if (!r.ok) { setFeed({ status: "error", items: [], next: null, message: r.json.message }); return; }
      setFeed({ status: r.json.needs_sign_in ? "signin" : "ready", items: r.json.items, next: r.json.next_cursor });
    });
    listRef.current?.scrollTo({ top: 0 });
    return () => ctl.abort();
  }, [api, tab, cat, reload, signedIn]);

  const items = (() => {
    const base = feed.items;
    if (single && single.status === "ready" && single.vibe) return [single.vibe, ...base.filter((v) => v.public_key !== single.vibe.public_key)];
    return base;
  })();
  const current = items[active] || null;

  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    const i = Math.round(el.scrollTop / Math.max(1, el.clientHeight));
    if (i !== active) setActive(Math.max(0, Math.min(items.length - 1, i)));
    if (feed.next && i >= items.length - 3 && feed.status === "ready") loadMore();
  };
  const loadMore = async () => {
    if (!feed.next) return;
    setFeed((f) => ({ ...f, status: "more" }));
    const qs = new URLSearchParams({ tab, limit: "8", cursor: feed.next }); if (cat) qs.set("category", cat);
    const r = await api("GET", `/api/v8/vibes?${qs}`);
    setFeed((f) => (r.ok ? { status: "ready", items: [...f.items, ...r.json.items.filter((x) => !f.items.some((y) => y.public_key === x.public_key))], next: r.json.next_cursor } : { ...f, status: "ready", next: null }));
  };
  const step = (d) => { const el = listRef.current; if (!el) return; el.scrollTo({ top: Math.max(0, (active + d)) * el.clientHeight, behavior: prefs.reducedMotion ? "auto" : "smooth" }); };
  useEffect(() => {
    const onKey = (e) => { if (sheet) return; if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return; if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); step(1); } if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); step(-1); } if (e.key === "m") setMuted((x) => !x); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  const change = (v) => {
    setFeed((f) => ({ ...f, items: f.items.map((x) => (x.public_key === v.public_key ? v : x)) }));
    setSingle((s) => (s && s.vibe && s.vibe.public_key === v.public_key ? { ...s, vibe: v } : s));
  };
  const hide = (key, why) => {
    setFeed((f) => ({ ...f, items: f.items.filter((x) => (why === "author" ? x.author.public_username !== key : x.public_key !== key)) }));
    setSingle((s) => (s && s.vibe && (why === "author" ? s.vibe.author.public_username === key : s.vibe.public_key === key) ? null : s));
  };
  const followCurrent = async () => {
    if (!current) return; if (!signedIn) { onRequireLogin(); return; }
    const on = current.viewer.following; change({ ...current, viewer: { ...current.viewer, following: !on } });
    const r = await api(on ? "DELETE" : "POST", `/api/v8/creators/${current.author.public_username}/follow`);
    if (!r.ok) change(current); else ui?.toast({ title: on ? `Unfollowed @${current.author.public_username}` : `Following @${current.author.public_username}` });
  };
  const s = sheet;
  return (
    <div className="v8v">
      <header className="v8v-top">
        <div className="v8v-title">{focus ? <button type="button" className="v8-back" onClick={() => onNav("vibe")}><V8Icon name="back" size={18} />Back</button> : null}<h1>Vibe</h1><p>Short videos. Real people. Useful ideas.</p></div>
        <Tabs tabs={TABS} value={tab} onChange={(v) => { setTab(v); onNav("vibe"); }} label="Vibe feeds" />
        <div className="v8v-top-actions">
          <label className="v8v-cat"><span className="v8-sr">Category</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          <button type="button" className="v8-btn v8-btn-primary v8v-create-btn" aria-label="Create Vibe" onClick={() => (signedIn ? onNav("vibe/create") : onRequireLogin())}><V8Icon name="plus" size={18} /><span>Create Vibe</span></button>
        </div>
      </header>
      <div className="v8v-chips-mobile">{cats.slice(0, 10).map((c) => <button key={c.slug} type="button" className={`v8c-chip ${cat === c.slug ? "on" : ""}`} onClick={() => setCat(cat === c.slug ? "" : c.slug)}>{c.name}</button>)}</div>
      <div className="v8v-body">
        <div className="v8v-stage">
          {single && single.status === "gone" ? <div className="v8v-notice"><V8Icon name="alert" size={18} />That Vibe isn’t available any more. Here’s what’s new.</div> : null}
          {feed.status === "loading" && !(single && single.status === "ready") ? <div className="v8v-card skeleton" aria-busy="true" aria-label="Loading Vibes"><Skel h="100%" r={22} /></div> : null}
          {feed.status === "error" ? <div className="v8v-card empty"><V8State kind="error" title="Vibes didn’t load" message={feed.message || "Check your connection and try again."} actionLabel="Refresh" onAction={() => setReload((x) => x + 1)} /></div> : null}
          {feed.status === "signin" && !items.length ? <div className="v8v-card empty"><SignInCard title="See Vibes from people you follow" message="Sign in to see your Following feed." onSignIn={onRequireLogin} /></div> : null}
          {["ready", "more"].includes(feed.status) && !items.length ? (
            <div className="v8v-card empty"><V8State icon="users" title={tab === "following" ? "No Vibes from people you follow yet" : "No Vibes yet"} message={tab === "following" ? "Follow creators to see their latest Vibes here." : "Be the first to share your creativity, skills or story with the HOWDI community."} actionLabel={tab === "following" ? "Explore creators" : "Create your first Vibe"} onAction={() => (tab === "following" ? setTab("explore") : signedIn ? onNav("vibe/create") : onRequireLogin())} /></div>
          ) : null}
          {items.length ? (
            <div className="v8v-list" ref={listRef} onScroll={onScroll} tabIndex={-1} aria-label="Vibes — use arrow keys to move">
              {items.map((v, i) => (
                <VibeCard key={v.public_key} vibe={v} active={i === active} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} onRoute={onRoute}
                  muted={muted} onToggleMute={() => setMuted((m) => !m)} prefs={prefs} onPrefsChange={(patch) => { const p = { ...prefs, ...patch }; setPrefs(p); savePrefs(p); }} onChange={change}
                  onComments={(x) => setSheet({ kind: "comments", vibe: x })} onShare={(x) => setSheet({ kind: "share", vibe: x })} onMore={(x) => setSheet({ kind: "more", vibe: x })}
                  onRemix={(x) => onNav(`vibe/create?remix=${x.public_key}`)} />
              ))}
              {feed.status === "more" ? <div className="v8v-card empty"><Skel h="100%" r={22} /></div> : null}
            </div>
          ) : null}
          {items.length > 1 ? <div className="v8v-nav"><button type="button" className="v8-icon-btn" aria-label="Previous Vibe" disabled={active === 0} onClick={() => step(-1)}><V8Icon name="chev" size={22} className="up" /></button><button type="button" className="v8-icon-btn" aria-label="Next Vibe" disabled={active >= items.length - 1} onClick={() => step(1)}><V8Icon name="chev" size={22} /></button></div> : null}
        </div>
        <DetailPanel vibe={current} onOpenProfile={onOpenProfile} onRoute={onRoute} onComments={(x) => setSheet({ kind: "comments", vibe: x })} onFollow={followCurrent} onPrefs={() => setSheet({ kind: "prefs" })} />
      </div>

      {s && s.kind === "comments" ? <Comments vibe={s.vibe} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onClose={() => setSheet(null)} onCount={(d) => change({ ...s.vibe, counts: { ...s.vibe.counts, comments: s.vibe.counts.comments + d } })} /> : null}
      <ShareSheet open={Boolean(s && s.kind === "share")} title="HOWDI Vibe" link={s && s.vibe ? s.vibe.route : ""} onClose={() => setSheet(null)}
        onShared={async (channel) => { const v = s.vibe; const r = await api("POST", `/api/v8/vibes/${v.public_key}/share`, { channel }); if (r.ok) change({ ...v, counts: { ...v.counts, shares: v.counts.shares + 1 } }); }} />
      <Sheet open={Boolean(s && s.kind === "more")} title={s && s.vibe ? `@${s.vibe.author.public_username}` : ""} onClose={() => setSheet(null)}>
        {s && s.vibe && !s.vibe.viewer.mine ? (<>
          <button type="button" className="v8c-row" onClick={() => (signedIn ? setSheet({ kind: "report", vibe: s.vibe }) : onRequireLogin())}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report this Vibe</b><small>Private — the creator isn’t told who reported</small></span><V8Icon name="chevr" size={18} /></button>
          <button type="button" className="v8c-row" onClick={() => (signedIn ? setSheet({ kind: "block", vibe: s.vibe }) : onRequireLogin())}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{s.vibe.author.public_username}</b><small>Hide their Vibes, posts and stories</small></span><V8Icon name="chevr" size={18} /></button>
          <button type="button" className="v8c-row" onClick={async () => { if (!signedIn) { onRequireLogin(); return; } const v = s.vibe; setSheet(null); const r = await api("POST", `/api/v8/vibes/${v.public_key}/not-interested`); if (r.ok) { hide(v.public_key); ui?.toast({ title: "Got it — you’ll see fewer Vibes like this" }); } else ui?.toast({ kind: "error", title: "Couldn’t update" }); }}><span className="v8c-row-ico"><V8Icon name="eyeoff" size={20} /></span><span className="v8c-row-text"><b>Not interested</b><small>See fewer Vibes like this</small></span><V8Icon name="chevr" size={18} /></button>
        </>) : null}
        <button type="button" className="v8c-row" onClick={() => setSheet({ kind: "prefs" })}><span className="v8c-row-ico"><V8Icon name="sliders" size={20} /></span><span className="v8c-row-text"><b>Manage content preferences</b></span><V8Icon name="chevr" size={18} /></button>
        <button type="button" className="v8c-row" onClick={() => setSheet({ kind: "history" })}><span className="v8c-row-ico"><V8Icon name="video" size={20} /></span><span className="v8c-row-text"><b>Watch history</b><small>History is server-controlled</small></span><V8Icon name="chevr" size={18} /></button>
        {s && s.vibe ? <button type="button" className="v8c-row" onClick={() => setSheet({ kind: "download", vibe: s.vibe })}><span className="v8c-row-ico"><V8Icon name="box" size={20} /></span><span className="v8c-row-text"><b>Download</b><small>Available only when HOWDI authorizes it</small></span><V8Icon name="chevr" size={18} /></button> : null}
        {s && s.vibe && s.vibe.allow.remix ? <button type="button" className="v8c-row" onClick={() => { const v = s.vibe; setSheet(null); if (!signedIn) { onRequireLogin(); return; } onNav(`vibe/create?remix=${v.public_key}`); }}><span className="v8c-row-ico"><V8Icon name="remix" size={20} /></span><span className="v8c-row-text"><b>Remix this Vibe</b></span><V8Icon name="chevr" size={18} /></button> : null}
      </Sheet>
      <Sheet open={Boolean(s && s.kind === "history")} title="Watch history" onClose={() => setSheet(null)}>
        <V8State icon="video" title="Watch history is unavailable" message="This V8 player is not connected to a server history, resume or clear endpoint. HOWDI will not present local playback as account history." />
        <p className="v8c-muted">When the server contract is available, this screen will show only your eligible Vibes and provide server-confirmed clear controls.</p>
      </Sheet>
      <Sheet open={Boolean(s && s.kind === "download")} title="Download" onClose={() => setSheet(null)}>
        <V8State icon="lock" title="Download is not authorized" message="HOWDI has not returned a download authorization for this Vibe, so the media is not available for download." />
        <p className="v8c-muted">Uploader settings alone do not grant access. A server permission check is required for allowed, denied, revoked and expired states.</p>
      </Sheet>
      <ReportSheet open={Boolean(s && s.kind === "report")} what="Vibe" onClose={() => setSheet(null)} onSubmit={(reason, details) => api("POST", `/api/v8/vibes/${s.vibe.public_key}/report`, { reason, details })} />
      <V8Confirm open={Boolean(s && s.kind === "block")} danger title={s && s.vibe ? `Block @${s.vibe.author.public_username}?` : ""} body="They won’t be able to see your content, message you or find your profile, and you won’t see theirs. You can unblock from Privacy & safety." confirmLabel="Block"
        onCancel={() => setSheet(null)} onConfirm={async () => { const v = s.vibe; const r = await api("POST", `/api/v8/creators/${v.author.public_username}/block`); setSheet(null); if (r.ok) { hide(v.author.public_username, "author"); ui?.toast({ title: `@${v.author.public_username} is blocked` }); } else ui?.toast({ kind: "error", title: "Couldn’t block", message: r.json.message }); }} />
      <Sheet open={Boolean(s && s.kind === "prefs")} title="Content preferences" onClose={() => setSheet(null)}>
        {[["blurSensitive", "Sensitive content (blur)", "Blur Vibes marked sensitive until you choose to view"], ["autoplayMuted", "Autoplay videos (muted)", "Vibes start playing without sound"]].map(([k, l, d]) => (
          <label key={k} className="v8c-switch-row"><span><b>{l}</b><small>{d}</small></span>
            <input type="checkbox" role="switch" checked={prefs[k]} onChange={(e) => { const p = { ...prefs, [k]: e.target.checked }; setPrefs(p); savePrefs(p); if (k === "autoplayMuted") setMuted(e.target.checked); }} /></label>
        ))}
        <p className="v8c-muted">“Not interested” choices and blocks are saved to your account.</p>
      </Sheet>
    </div>
  );
}

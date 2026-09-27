// HOWDI V8 public profile — ID-001 ordinary, ID-002 Verified, ID-003 Premium (board 12), with loading / private /
// not-found / error states (SYS-001..003). Data: GET /api/connect/public-profile/username/:handle (public @handle only;
// the response never carries the owner's user id). Follow: POST /api/connect/profile/username/:handle/follow.
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "./V8Shell";
import { V8Badges, V8BadgeExplainer, useSingleFlight, useV8Ui } from "./V8System";
import { useApi } from "./connect/common";
import { MembershipOffer } from "./connect/Membership";
const openConnect = (view) => window.dispatchEvent(new CustomEvent("howdi:v8-open", { detail: { area: "connect", view: `p:${view}` } }));

const HANDLE_RE = /^[a-z0-9._]{3,30}$/i;
const safeImg = (u) => (typeof u === "string" && /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(u) ? u : "");
const compact = (n) => { const v = Number(n) || 0; return v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K` : String(v); };
const since = (iso) => { const t = Date.parse(iso || ""); if (!Number.isFinite(t)) return ""; const d = Math.round((Date.now() - t) / 86400000); return d <= 0 ? "today" : d === 1 ? "1d ago" : d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const money = (n) => { try { return Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }); } catch { return `₹${n}`; } };

export default function V8Profile({ apiBase, handle, getAuthHeaders, signedIn, isMe, onRequireLogin, onMessage, onBack, onEdit }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const ui = useV8Ui();
  const [state, setState] = useState({ status: "loading", data: null });
  const [tab, setTab] = useState("posts");
  const [reload, setReload] = useState(0);
  const [busy, run] = useSingleFlight();
  const api = useApi(apiBase, getAuthHeaders);
  const valid = HANDLE_RE.test(String(handle || ""));

  useEffect(() => {
    if (!valid) { setState({ status: "notfound", data: null }); return undefined; }
    const ctl = new AbortController();
    setState({ status: "loading", data: null });
    let headers = { Accept: "application/json" };
    try { headers = { ...headers, ...(signedIn && getAuthHeaders ? getAuthHeaders() : {}) }; } catch { /* guest */ }
    fetch(`${base}/api/connect/public-profile/username/${encodeURIComponent(handle)}`, { signal: ctl.signal, headers, cache: "no-store" })
      .then(async (r) => { const b = await r.json().catch(() => null); if (r.status === 404) return { status: "notfound" }; if (!r.ok || !b || b.status !== "success") throw new Error("profile"); return { status: b.private ? "private" : "ready", data: b }; })
      .then((x) => setState({ status: x.status, data: x.data || null }))
      .catch((e) => { if (e.name !== "AbortError") setState({ status: "error", data: null }); });
    return () => ctl.abort();
  }, [base, handle, signedIn, reload, valid]); // eslint-disable-line react-hooks/exhaustive-deps

  const follow = useCallback(() => run(async () => {
    if (!signedIn) { onRequireLogin?.(); return; }
    const p = state.data?.profile; if (!p) return;
    const was = Boolean(p.viewer_following);
    setState((s) => ({ ...s, data: { ...s.data, profile: { ...p, viewer_following: !was, follower_count: Number(p.follower_count || 0) + (was ? -1 : 1) } } }));
    try {
      const r = await fetch(`${base}/api/connect/profile/username/${encodeURIComponent(handle)}/follow`, { method: "POST", headers: { "Content-Type": "application/json", ...(getAuthHeaders ? getAuthHeaders() : {}) }, body: "{}" });
      const b = await r.json().catch(() => null);
      if (!r.ok || !b || b.status !== "success") throw new Error(b?.message || "follow");
      const following = typeof b.following === "boolean" ? b.following : !was;
      setState((s) => ({ ...s, data: { ...s.data, profile: { ...s.data.profile, viewer_following: following, follower_count: Number(p.follower_count || 0) + (following && !was ? 1 : !following && was ? -1 : 0) } } }));
      ui?.toast({ title: b.requested ? `Follow request sent to @${handle}` : following ? `Following @${handle}` : `Unfollowed @${handle}` });
    } catch {
      setState((s) => ({ ...s, data: { ...s.data, profile: { ...p } } }));
      ui?.toast({ kind: "error", title: "Couldn’t update follow", message: "Please try again." });
    }
  }), [run, signedIn, state.data, base, handle, getAuthHeaders, ui, onRequireLogin]);

  const d = state.data || {};
  const p = d.profile || {};
  const premium = d.premium || null;
  const verified = Boolean(p.identity_verified);
  const avatar = safeImg(p.avatar_data || p.profile_image);
  const cover = safeImg(p.cover_data);

  return (
    <div className="v8-page" data-v8-page="profile">
      <div className="v8-page-inner v8-profile-page">
        <button type="button" className="v8-back" onClick={onBack}><V8Icon name="back" size={18} />Back</button>
        {state.status === "loading" ? (
          <div className="v8-card v8-profile-skel" role="status" aria-busy="true"><span className="v8-sr">Loading profile…</span>
            <div className="v8-skel" style={{ height: 180, borderRadius: 16 }} />
            <div style={{ display: "flex", gap: 16, marginTop: -40, padding: "0 20px" }}><div className="v8-skel" style={{ width: 110, height: 110, borderRadius: "50%" }} /><div style={{ flex: 1, paddingTop: 50, display: "grid", gap: 10 }}><div className="v8-skel" style={{ height: 18, width: "40%" }} /><div className="v8-skel" style={{ height: 12, width: "60%" }} /></div></div>
          </div>
        ) : null}
        {state.status === "notfound" ? <div className="v8-card"><V8State icon="user" title="Profile not found" message={`There’s no public profile at @${String(handle || "").slice(0, 30)}. Check the handle and try again.`} actionLabel="Go back" onAction={onBack} /></div> : null}
        {state.status === "error" ? <div className="v8-card"><V8State kind="error" title="Something went wrong" message="We couldn’t load this profile. Please check your connection and try again." actionLabel="Retry" onAction={() => setReload((n) => n + 1)} /></div> : null}
        {state.status === "private" ? (
          <div className="v8-card"><V8State icon="lock" title={`@${handle} is private`} message="Only approved followers can see this profile’s posts, Vibes and articles." actionLabel={signedIn ? "Request to follow" : "Sign in"} onAction={signedIn ? follow : onRequireLogin} /></div>
        ) : null}

        {state.status === "ready" ? (
          <div className="v8-profile-grid">
            <div>
              <section className="v8-card v8-profile-head">
                <div className="v8-profile-cover" style={cover ? { backgroundImage: `url("${cover.replace(/["\\]/g, "")}")` } : undefined} />
                <div className="v8-profile-id">
                  <span className="v8-profile-ava">{avatar ? <img src={avatar} alt="" /> : String(p.full_name || handle).charAt(0).toUpperCase()}</span>
                  <div className="v8-profile-names">
                    <h1>@{p.public_username}<V8Badges verified={verified} premium={Boolean(premium)} /></h1>
                    <p className="v8-profile-real">{p.full_name}</p>
                    {p.headline || p.profession_title ? <p className="v8-muted">{p.headline || p.profession_title}</p> : null}
                    {p.about ? <p className="v8-profile-bio">{String(p.about).slice(0, 280)}</p> : null}
                  </div>
                  <div className="v8-profile-side">
                    <div className="v8-profile-counts">
                      <span><b>{d.canSeeFollowerList === false ? "—" : compact(p.follower_count)}</b> followers</span>
                      <span><b>{d.canSeeFollowerList === false ? "—" : compact(p.following_count)}</b> following</span>
                    </div>
                    {isMe ? (
                      <div className="v8-profile-actions"><button type="button" className="v8-btn v8-btn-primary" onClick={onEdit}>Edit profile</button></div>
                    ) : (
                      <div className="v8-profile-actions">
                        <button type="button" className={`v8-btn ${p.viewer_following ? "" : "v8-btn-primary"}`} onClick={follow} disabled={busy} aria-pressed={Boolean(p.viewer_following)}>{busy ? "Saving…" : p.viewer_following ? "Following" : "Follow"}</button>
                        <button type="button" className="v8-btn" onClick={() => (signedIn ? onMessage?.(handle) : onRequireLogin?.())} disabled={signedIn && d.canMessage === false} title={signedIn && d.canMessage === false ? "This person only accepts messages from people they follow" : undefined}>Message</button>
                      </div>
                    )}
                    {isMe ? <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => openConnect("creator")}><V8Icon name="crown" size={16} />Creator workspace</button> : null}
                  </div>
                </div>
                <div className="v8-profile-offer"><MembershipOffer api={api} handle={handle} signedIn={signedIn} onRequireLogin={onRequireLogin} compact onNav={(v) => openConnect(v)} /></div>
                <nav className="v8-tabs" aria-label="Profile content">
                  {[["posts", "Posts", (d.recent_posts || []).length], ["vibes", "Vibes", (d.vibes || []).length], ["articles", "Articles", (d.articles || []).length]].map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
                  ))}
                </nav>
              </section>

              <section className="v8-profile-content" aria-live="polite">
                {tab === "posts" ? ((d.recent_posts || []).length ? (
                  <ul className="v8-profile-list">{d.recent_posts.map((x, i) => (
                    <li key={`p${i}`} className="v8-card v8-profile-item">
                      {safeImg(x.media_data) && String(x.media_type || "").startsWith("image") ? <img src={x.media_data} alt="" /> : null}
                      <div><p>{String(x.content || "").slice(0, 220)}</p><small className="v8-muted">{since(x.created_at)}</small></div>
                    </li>))}</ul>
                ) : <div className="v8-card"><V8State icon="empty" title="No posts yet" message={`When @${handle} shares something, it will appear here.`} /></div>) : null}
                {tab === "vibes" ? ((d.vibes || []).length ? (
                  <ul className="v8-vibe-grid">{d.vibes.map((v) => (
                    <li key={v.vibe_code} className="v8-card"><div className="v8-vibe-cover">{safeImg(v.cover_url) ? <img src={v.cover_url} alt="" /> : <V8Icon name="play" size={28} fill />}</div><small>{String(v.caption || "").slice(0, 70)}</small></li>))}</ul>
                ) : <div className="v8-card"><V8State icon="play" title="No Vibes yet" message="Short videos from this profile will appear here." /></div>) : null}
                {tab === "articles" ? ((d.articles || []).length ? (
                  <ul className="v8-profile-list">{d.articles.map((a, i) => (
                    <li key={`a${i}`} className="v8-card v8-profile-item">
                      {safeImg(a.article_cover_url) ? <img src={a.article_cover_url} alt="" /> : null}
                      <div><b>{a.article_title}</b><p>{a.article_excerpt}</p><small className="v8-muted">{a.article_read_minutes ? `${a.article_read_minutes} min read · ` : ""}{since(a.created_at)}</small></div>
                    </li>))}</ul>
                ) : <div className="v8-card"><V8State icon="text" title="No articles yet" message="Long-form writing from this profile will appear here." /></div>) : null}
              </section>
            </div>
            <aside className="v8-profile-aside"><V8BadgeExplainer /></aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

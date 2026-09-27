// HOWDI V8 Communities, Groups & Channels — board 17 (browser with type tiles, filters, featured cards, empty state,
// group / channel pages, Request sent, member roles, report queue and moderation actions), board 06 panel 4 and
// PRIOR-07 panel 6 (Groups · Channels · Live · Spaces tabs with clear badges). Live / Spaces tabs reuse those screens.
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, ShareSheet, Skel, Tabs, fmt, since, when, safeImg, readFileAsDataUrl, SignInCard } from "./common";
import { RoomList } from "./Live";

const TYPE_TILES = [
  { v: "all", l: "All Communities", s: "Discover everything", i: "users" },
  { v: "groups", l: "Groups", s: "People with shared interests", i: "users" },
  { v: "channels", l: "Channels", s: "Creators and focused content", i: "live" },
  { v: "spaces", l: "Spaces", s: "Live audio, video and events", i: "mic" },
];

function joinLabel(c) {
  if (c.membership === "member") return c.kind === "channel" ? "Subscribed" : "Joined";
  if (c.membership === "pending") return "Requested";
  if (c.kind === "channel") return "Subscribe";
  return c.privacy === "private" ? "Request to Join" : "Join";
}

function CommunityCard({ c, onOpen, onJoin }) {
  return (
    <article className="v8-card v8m-card">
      <button type="button" className="v8m-card-media" onClick={onOpen}>
        {safeImg(c.cover_url) ? <img src={c.cover_url} alt="" /> : <span className="v8m-ph"><V8Icon name={c.kind === "channel" ? "live" : "users"} size={30} /></span>}
        <span className={`v8m-type ${c.kind}`}>{c.kind === "channel" ? "Channel" : "Group"}</span>
      </button>
      <div className="v8m-card-body">
        <b className="v8m-name">{c.name}{c.verified ? <V8Badges verified size="sm" /> : null}</b>
        <small>{fmt(c.member_count)} {c.kind === "channel" ? "subscribers" : "members"} · {c.privacy === "private" ? "Private" : "Public"}</small>
        {c.description ? <p>{c.description}</p> : null}
        {c.category ? <div className="v8c-chips"><span className="v8c-chip">{c.category}</span></div> : null}
        <button type="button" className={`v8-btn v8-btn-block ${c.membership === "none" ? "v8-btn-primary" : ""}`} disabled={c.membership === "pending"} onClick={c.membership === "member" ? onOpen : onJoin}>{joinLabel(c)}</button>
      </div>
    </article>
  );
}

function CreateCommunity({ api, onDone, onCancel }) {
  const ui = useV8Ui();
  const [f, setF] = useState({ kind: "group", name: "", description: "", category: "Crafts", privacy: "public", rules: "Be respectful and kind\nNo spam or self-promotion\nReport harmful content" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const create = async () => {
    setBusy(true); setErr("");
    const r = await api("POST", "/api/v8/communities", { ...f, rules: f.rules.split("\n").map((x) => x.trim()).filter(Boolean) });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Couldn’t create. Please try again."); return; }
    ui?.toast({ title: `${f.kind === "channel" ? "Channel" : "Group"} created`, message: "You’re the owner. Invite people to join." }); onDone(r.json.community.public_key);
  };
  return (
    <div className="v8a2-write">
      <header className="v8vc-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onCancel}><V8Icon name="back" size={22} /></button><h1>Create a community</h1><span style={{ width: 40 }} /></header>
      <div className="v8-card v8a2-write-card">
        <div className="v8c-seg" role="tablist" aria-label="Type">{[["group", "Group", "users"], ["channel", "Channel", "live"]].map(([v, l, i]) => <button key={v} type="button" role="tab" aria-selected={f.kind === v} className={f.kind === v ? "on" : ""} onClick={() => setF((x) => ({ ...x, kind: v }))}><V8Icon name={i} size={18} />{l}</button>)}</div>
        <p className="v8c-muted">{f.kind === "channel" ? "Channels are one-to-many: only you and your admins post; subscribers react and read." : "Groups are for conversation: members post, comment and meet at events."}</p>
        <label className="v8c-field"><span>Name</span><input value={f.name} maxLength={80} onChange={set("name")} placeholder="e.g. Hyderabad Crochet Club" /></label>
        <label className="v8c-field"><span>What is it about?</span><textarea rows={3} maxLength={600} value={f.description} onChange={set("description")} /></label>
        <label className="v8c-field"><span>Topic</span><select value={f.category} onChange={set("category")}>{["Crafts", "Business", "Learning", "Textiles", "Lifestyle", "Local"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <div className="v8c-field"><span>Privacy</span>
          {[["public", "Public", "Anyone can find it and join."], ["private", "Private", "Anyone can find it; moderators approve who joins and only members see posts."]].map(([v, l, s]) => <label key={v} className={`v8c-aud ${f.privacy === v ? "on" : ""}`}><input type="radio" name="v8m-priv" checked={f.privacy === v} onChange={() => setF((x) => ({ ...x, privacy: v }))} /><V8Icon name={v === "public" ? "globe" : "lock"} size={20} /><span><b>{l}</b><small>{s}</small></span></label>)}</div>
        <label className="v8c-field"><span>Community rules (one per line)</span><textarea rows={4} value={f.rules} onChange={set("rules")} /></label>
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onCancel}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create"}</button></div>
      </div>
    </div>
  );
}

function Detail({ api, slug, user, onBack, onRequireLogin, onOpenProfile, initialTab }) {
  const ui = useV8Ui(); const signedIn = Boolean(user);
  const [c, setC] = useState({ status: "loading" }); const [tab, setTab] = useState(initialTab || "feed");
  const [feed, setFeed] = useState(null); const [mem, setMem] = useState(null); const [events, setEvents] = useState(null); const [admin, setAdmin] = useState(null);
  const [post, setPost] = useState(""); const [busy, setBusy] = useState(false); const [sheet, setSheet] = useState(""); const [target, setTarget] = useState(null); const [leave, setLeave] = useState(false);
  const [ev, setEv] = useState({ title: "", startsAt: "", place: "Online" });
  const load = useCallback(async () => {
    const r = await api("GET", `/api/v8/communities/${slug}`);
    setC(r.ok ? { status: "ready", ...r.json.community } : { status: r.status === 404 ? "gone" : "error" });
  }, [api, slug]);
  const loadTab = useCallback(async (t) => {
    if (t === "feed") { const r = await api("GET", `/api/v8/communities/${slug}/feed`); setFeed(r.ok ? r.json : "error"); }
    if (t === "members") { const r = await api("GET", `/api/v8/communities/${slug}/members`); setMem(r.ok ? r.json : "error"); }
    if (t === "events") { const r = await api("GET", `/api/v8/communities/${slug}/events`); setEvents(r.ok ? r.json : "error"); }
    if (t === "admin") { const r = await api("GET", `/api/v8/communities/${slug}/moderation`); setAdmin(r.ok ? r.json : "error"); }
  }, [api, slug]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (c.status === "ready") loadTab(tab); }, [c.status, tab, loadTab]);
  if (c.status === "loading") return <div className="v8m-detail"><Skel h={200} r={18} /><Skel h={24} w="50%" /></div>;
  if (c.status === "gone") return <V8State icon="users" title="This community isn’t available" message="It may be private, archived or removed." actionLabel="Back to Communities" onAction={onBack} />;
  if (c.status === "error") return <V8State kind="error" title="Couldn’t open this community" actionLabel="Try again" onAction={load} />;
  const need = () => { if (!signedIn) { onRequireLogin(); return true; } return false; };
  const call = async (method, path, body, okMsg) => {
    if (need()) return null;
    const r = await api(method, `/api/v8/communities/${slug}${path}`, body);
    if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message || "Couldn’t do that." }); return null; }
    if (okMsg) ui?.toast({ title: typeof okMsg === "function" ? okMsg(r.json) : okMsg }); return r.json;
  };
  const join = async () => { const j = await call("POST", "/join", {}, (x) => x.message || "Done"); if (j) load(); };
  const doPost = async () => { if (!post.trim()) return; setBusy(true); const j = await call("POST", "/feed", { text: post }, "Posted"); setBusy(false); if (j) { setPost(""); loadTab("feed"); } };
  const tabs = [{ value: "feed", label: c.kind === "channel" ? "Posts" : "Feed" }, { value: "about", label: "About" }, { value: "members", label: "Members" }, { value: "events", label: "Events", count: c.upcoming_events || 0 }];
  if (c.is_mod) tabs.push({ value: "admin", label: "Admin", count: c.pending_requests || 0 });
  return (
    <div className="v8m-detail">
      <header className="v8l-room-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={22} /></button><span className="v8m-crumb">{c.kind === "channel" ? "Channel" : "Group"}</span><span className="v8-spacer" />
        <button type="button" className="v8-icon-btn" aria-label="Share" onClick={() => setSheet("share")}><V8Icon name="share" size={20} /></button>
        <button type="button" className="v8-icon-btn" aria-label="More" onClick={() => setSheet("more")}><V8Icon name="more" size={20} /></button></header>
      <section className="v8-card v8m-hero">
        <div className="v8m-cover">{safeImg(c.cover_url) ? <img src={c.cover_url} alt="" /> : null}</div>
        <div className="v8m-hero-body">
          <span className="v8m-hero-ava">{safeImg(c.image_url) ? <img src={c.image_url} alt="" /> : <V8Icon name={c.kind === "channel" ? "live" : "users"} size={30} />}</span>
          <div className="v8m-hero-text"><h1>{c.name}{c.verified ? <V8Badges verified size="sm" /> : null}</h1>
            <small>{fmt(c.member_count)} {c.kind === "channel" ? "subscribers" : "members"} · {c.privacy === "private" ? "Private" : "Public"} {c.kind === "channel" ? "channel" : "group"}{c.role ? ` · You’re ${c.role === "member" ? "a member" : `the ${c.role}`}` : ""}</small></div>
          <div className="v8m-hero-cta">
            {c.membership === "member" ? (c.role === "owner" ? <button type="button" className="v8-btn" onClick={() => setSheet("share")}><V8Icon name="plus" size={16} />Invite</button> : <button type="button" className="v8-btn" onClick={() => setLeave(true)}>{c.kind === "channel" ? "Subscribed ✓" : "Joined ✓"}</button>)
              : c.membership === "pending" ? <button type="button" className="v8-btn" onClick={() => setLeave(true)}>Requested · Cancel</button>
              : <button type="button" className="v8-btn v8-btn-primary" onClick={join}>{joinLabel(c)}</button>}
            {c.membership === "member" && c.role !== "owner" ? <button type="button" className="v8-btn" onClick={() => setSheet("share")}>Invite</button> : null}
          </div>
        </div>
        {c.membership === "pending" ? <div className="v8m-pending"><V8Icon name="bell" size={18} /><span><b>Request sent</b> — your request is pending approval. We’ll notify you when a moderator decides.</span></div> : null}
      </section>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Community sections" />
      {tab === "about" ? (
        <section className="v8-card v8m-panel">
          <h2>About this community</h2>{c.description ? <p>{c.description}</p> : null}
          {c.category ? <div className="v8c-chips"><span className="v8c-chip">{c.category}</span></div> : null}
          {c.owner ? <p className="v8c-muted">Created by <button type="button" className="v8-link" onClick={() => onOpenProfile(c.owner.public_username)}>@{c.owner.public_username}</button> · {since(c.created_at)}</p> : null}
          <h2>Community rules</h2>
          {c.rules.length ? <ol className="v8m-rules">{c.rules.map((r, i) => <li key={i}>{r}</li>)}</ol> : <p className="v8c-muted">Follow the HOWDI Community Guidelines.</p>}
          <button type="button" className="v8-btn v8m-report" onClick={() => (need() ? null : setSheet("report"))}><V8Icon name="flag" size={16} />Report community</button>
        </section>
      ) : null}
      {tab === "feed" ? (
        <section className="v8m-feed">
          {c.can_post ? <div className="v8-card v8c-composer"><div className="v8c-composer-top"><Ava src={null} name={user?.full_name} size={36} /><label className="v8c-composer-input"><span className="v8-sr">Write a post</span><textarea rows={post ? 3 : 1} maxLength={4000} value={post} onChange={(e) => setPost(e.target.value)} placeholder={`Share with ${c.name}…`} /></label></div><div className="v8c-composer-actions"><button type="button" className="v8-btn v8-btn-primary" disabled={busy || !post.trim()} onClick={doPost}>Post</button></div></div>
            : c.membership === "member" && c.kind === "channel" ? <p className="v8c-muted v8m-note">Only channel admins post here. You’ll get their updates.</p>
            : c.membership !== "member" ? <div className="v8-card v8m-note"><V8Icon name="lock" size={18} /><span>{c.privacy === "private" ? "Posts are visible to members only." : "Join to post and comment."}</span>{c.membership === "none" ? <button type="button" className="v8-btn v8-btn-primary" onClick={join}>{joinLabel(c)}</button> : null}</div> : null}
          {feed === null ? <Skel h={120} r={16} /> : feed === "error" ? <V8State kind="error" title="Posts didn’t load" actionLabel="Try again" onAction={() => loadTab("feed")} />
            : feed.locked ? <V8State icon="lock" title="Private community" message="Request to join to see posts, members and events." />
            : !feed.items.length ? <V8State icon="comment" title="No posts yet" message={c.can_post ? "Start the conversation." : "Posts will appear here."} />
            : feed.items.map((p) => (
              <article key={p.public_key} className="v8-card v8c-post">
                <header className="v8c-post-head"><span className="v8c-who"><Ava src={p.author.avatar_url} name={p.author.display_name} size={40} /><span className="v8c-who-text"><span className="v8c-who-line"><button type="button" className="v8c-handle" onClick={() => onOpenProfile(p.author.public_username)}>@{p.author.public_username}</button><V8Badges verified={p.author.verified} premium={p.author.premium} size="sm" />{p.author_role && p.author_role !== "member" ? <span className="v8c-chip-mini">{p.author_role}</span> : null}</span><small>{since(p.created_at)}{p.pinned ? " · 📌 Pinned" : ""}</small></span></span>
                  <button type="button" className="v8-icon-btn" aria-label="Post options" onClick={() => { setTarget({ post: p }); setSheet("post"); }}><V8Icon name="more" size={20} /></button></header>
                <p className="v8c-post-text">{p.text}</p>{safeImg(p.media_url) ? <div className="v8c-post-media n1"><img src={p.media_url} alt="" /></div> : null}
              </article>
            ))}
        </section>
      ) : null}
      {tab === "members" ? (
        <section className="v8-card v8m-panel">
          {mem === null ? <Skel h={80} /> : mem === "error" ? <p className="v8c-err">Members didn’t load.</p> : mem.locked ? <V8State icon="lock" title="Members are private" message="Join to see who’s here." /> : (<>
            {mem.pending && mem.pending.length ? (<><h2>Requests to join ({mem.pending.length})</h2>
              {mem.pending.map((m) => <div key={m.person.public_username} className="v8c-rail-item"><Ava src={m.person.avatar_url} name={m.person.display_name} size={40} /><span className="v8c-rail-text"><b>{m.person.display_name}</b><small>@{m.person.public_username} · asked {since(m.since)}</small></span>
                <button type="button" className="v8-btn v8c-rail-cta" onClick={async () => { if (await call("POST", `/requests/${m.person.public_username}/decline`, {}, "Request declined — they’ll be notified")) { loadTab("members"); load(); } }}>Decline</button>
                <button type="button" className="v8-btn v8-btn-primary v8c-rail-cta" onClick={async () => { if (await call("POST", `/requests/${m.person.public_username}/approve`, {}, "Approved — they’ll be notified")) { loadTab("members"); load(); } }}>Approve</button></div>)}</>) : null}
            <h2>Members ({mem.items.length})</h2>
            {mem.items.map((m) => <div key={m.person.public_username} className="v8c-rail-item"><button type="button" className="v8c-rail-open" onClick={() => onOpenProfile(m.person.public_username)}><Ava src={m.person.avatar_url} name={m.person.display_name} size={40} /><span className="v8c-rail-text"><b>{m.person.display_name}{m.me ? " (you)" : ""}</b><small>@{m.person.public_username}{m.muted ? " · muted" : ""}</small></span></button>
              <span className={`v8m-role ${m.role}`}>{m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : m.role === "moderator" ? "Moderator" : "Member"}</span>
              {c.is_mod && !m.me && m.role !== "owner" ? <button type="button" className="v8-icon-btn" aria-label={`Manage @${m.person.public_username}`} onClick={() => { setTarget({ member: m }); setSheet("member"); }}><V8Icon name="more" size={18} /></button> : null}</div>)}
          </>)}
        </section>
      ) : null}
      {tab === "events" ? (
        <section className="v8-card v8m-panel">
          {events === null ? <Skel h={80} /> : events === "error" ? <p className="v8c-err">Events didn’t load.</p> : events.locked ? <V8State icon="lock" title="Events are for members" /> : (<>
            {events.items.length ? events.items.map((e) => <div key={e.public_key} className="v8m-event"><span className="v8m-event-date"><b>{new Date(e.starts_at).getDate()}</b><small>{new Date(e.starts_at).toLocaleDateString("en-IN", { month: "short" })}</small></span>
              <span className="v8c-rail-text"><b>{e.title}</b><small>{when(e.starts_at)} · {e.place || "Online"}</small>{e.details ? <small>{e.details}</small> : null}<small>{e.going} going</small></span>
              <button type="button" className={`v8-btn ${e.rsvp ? "" : "v8-btn-primary"} v8c-rail-cta`} onClick={async () => { if (await call("POST", `/events/${e.public_key}/rsvp`, {}, (x) => (x.rsvp ? "You’re going" : "RSVP removed"))) loadTab("events"); }}>{e.rsvp ? "Going ✓" : "RSVP"}</button></div>)
              : <V8State icon="bell" title="No upcoming events" message={events.can_create ? "Plan a meetup or a live session." : "Events will appear here."} />}
            {events.can_create ? (<div className="v8m-event-form"><h2>Create an event</h2>
              <label className="v8c-field"><span>Title</span><input value={ev.title} onChange={(e) => setEv((x) => ({ ...x, title: e.target.value }))} /></label>
              <label className="v8c-field"><span>Date and time</span><input type="datetime-local" value={ev.startsAt} onChange={(e) => setEv((x) => ({ ...x, startsAt: e.target.value }))} /></label>
              <label className="v8c-field"><span>Place</span><input value={ev.place} onChange={(e) => setEv((x) => ({ ...x, place: e.target.value }))} /></label>
              <button type="button" className="v8-btn v8-btn-primary" onClick={async () => { if (await call("POST", "/events", { ...ev, startsAt: ev.startsAt ? new Date(ev.startsAt).toISOString() : "" }, "Event created")) { setEv({ title: "", startsAt: "", place: "Online" }); loadTab("events"); load(); } }}>Create event</button></div>) : null}
          </>)}
        </section>
      ) : null}
      {tab === "admin" ? (
        <section className="v8m-admin">
          {admin === null ? <Skel h={120} /> : admin === "error" ? <p className="v8c-err">Admin tools didn’t load.</p> : (<>
            <div className="v8m-stats">{[["Members", admin.counts.members, "users"], ["Pending requests", admin.counts.pending, "bell"], ["Reports", admin.counts.reports, "flag"], ["Active mods", admin.counts.mods, "shield"]].map(([l, n, i]) => <div key={l} className="v8-card"><V8Icon name={i} size={20} /><b>{fmt(n)}</b><small>{l}</small></div>)}</div>
            {admin.counts.pending ? <button type="button" className="v8-btn v8-btn-block" onClick={() => setTab("members")}>Review {admin.counts.pending} join request{admin.counts.pending > 1 ? "s" : ""}</button> : null}
            <div className="v8-card v8m-panel"><h2>Report queue</h2>
              {admin.reports.length ? admin.reports.map((r) => <div key={r.public_key} className="v8m-report-item"><span className="v8c-row-ico danger"><V8Icon name="flag" size={18} /></span>
                <span className="v8c-rail-text"><b>{r.reason.replace("-", " ")}</b><small>Reported {since(r.created_at)}{r.post_author ? ` · post by @${r.post_author.public_username}` : ""}</small>{r.post_text ? <small className="v8m-quote">“{r.post_text}”</small> : null}{r.details ? <small>Note: {r.details}</small> : null}</span>
                <div className="v8m-mod-actions">{[["remove", "Remove post", true], ["mute", "Mute 24 h"], ["warn", "Warn"], ["keep", "Keep"]].map(([a, l, d]) => <button key={a} type="button" className={`v8-btn ${d ? "v8-btn-danger" : ""}`} onClick={async () => { if (await call("POST", `/reports/${r.public_key}/resolve`, { action: a }, "Report resolved — reporter notified")) { loadTab("admin"); load(); } }}>{l}</button>)}</div></div>)
                : <V8State icon="shield" title="No open reports" message="Nice and calm." />}
            </div>
          </>)}
        </section>
      ) : null}
      <ShareSheet open={sheet === "share"} title={c.name} link={c.route} onClose={() => setSheet("")} />
      <Sheet open={sheet === "more"} title={c.name} onClose={() => setSheet("")}>
        <button type="button" className="v8c-row" onClick={() => setSheet("share")}><span className="v8c-row-ico"><V8Icon name="share" size={20} /></span><span className="v8c-row-text"><b>Share / invite</b></span></button>
        <button type="button" className="v8c-row" onClick={() => (need() ? null : setSheet("report"))}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report community</b></span></button>
        {c.membership !== "none" && c.role !== "owner" ? <button type="button" className="v8c-row danger" onClick={() => { setSheet(""); setLeave(true); }}><span className="v8c-row-ico danger"><V8Icon name="x" size={20} /></span><span className="v8c-row-text"><b>{c.membership === "pending" ? "Cancel request" : c.kind === "channel" ? "Unsubscribe" : "Leave group"}</b></span></button> : null}
      </Sheet>
      <ReportSheet open={sheet === "report"} what="community" onClose={() => setSheet("")} onSubmit={(reason, details) => api("POST", `/api/v8/communities/${slug}/report`, { reason, details })} />
      <ReportSheet open={sheet === "reportpost"} what="post" onClose={() => setSheet("")} onSubmit={(reason, details) => api("POST", `/api/v8/communities/${slug}/feed/${target.post.public_key}/report`, { reason, details })} />
      <Sheet open={sheet === "post"} title="Post options" onClose={() => setSheet("")}>
        {target && target.post ? (<>
          {!target.post.mine ? <button type="button" className="v8c-row" onClick={() => (need() ? null : setSheet("reportpost"))}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report to moderators</b></span></button> : null}
          {c.is_mod ? <button type="button" className="v8c-row" onClick={async () => { setSheet(""); if (await call("POST", `/feed/${target.post.public_key}/pin`, {}, target.post.pinned ? "Unpinned" : "Pinned")) loadTab("feed"); }}><span className="v8c-row-ico"><V8Icon name="bookmark" size={20} /></span><span className="v8c-row-text"><b>{target.post.pinned ? "Unpin" : "Pin to top"}</b></span></button> : null}
          {c.is_mod || target.post.mine ? <button type="button" className="v8c-row danger" onClick={async () => { setSheet(""); if (await call("POST", `/feed/${target.post.public_key}/delete`, {}, "Post deleted")) loadTab("feed"); }}><span className="v8c-row-ico danger"><V8Icon name="trash" size={20} /></span><span className="v8c-row-text"><b>Delete post</b></span></button> : null}
        </>) : null}
      </Sheet>
      <Sheet open={sheet === "member"} title={target && target.member ? `@${target.member.person.public_username}` : ""} onClose={() => setSheet("")}>
        {target && target.member ? (<>
          {["owner", "admin"].includes(c.role) ? (target.member.role === "moderator"
            ? <button type="button" className="v8c-row" onClick={async () => { setSheet(""); if (await call("POST", `/members/${target.member.person.public_username}/role`, { role: "member" }, "Now a member")) loadTab("members"); }}><span className="v8c-row-ico"><V8Icon name="user" size={20} /></span><span className="v8c-row-text"><b>Make member</b></span></button>
            : <button type="button" className="v8c-row" onClick={async () => { setSheet(""); if (await call("POST", `/members/${target.member.person.public_username}/role`, { role: "moderator" }, "Now a moderator")) loadTab("members"); }}><span className="v8c-row-ico"><V8Icon name="shield" size={20} /></span><span className="v8c-row-text"><b>Make moderator</b><small>Can review requests and reports</small></span></button>) : null}
          <button type="button" className="v8c-row" onClick={async () => { setSheet(""); if (await call("POST", `/members/${target.member.person.public_username}/mute`, { hours: 24 }, "Muted for 24 h — they’ll be notified")) loadTab("members"); }}><span className="v8c-row-ico"><V8Icon name="mute" size={20} /></span><span className="v8c-row-text"><b>Mute for 24 hours</b></span></button>
          <button type="button" className="v8c-row danger" onClick={async () => { setSheet(""); if (await call("POST", `/members/${target.member.person.public_username}/remove`, {}, "Removed — they’ll be notified")) { loadTab("members"); load(); } }}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Remove from community</b></span></button>
        </>) : null}
      </Sheet>
      <V8Confirm open={leave} danger title={c.membership === "pending" ? "Cancel your request?" : c.kind === "channel" ? `Unsubscribe from ${c.name}?` : `Leave ${c.name}?`} body={c.privacy === "private" && c.membership === "member" ? "You’ll need approval to join again." : "You can join again any time."} confirmLabel={c.membership === "pending" ? "Cancel request" : c.kind === "channel" ? "Unsubscribe" : "Leave"}
        onCancel={() => setLeave(false)} onConfirm={async () => { setLeave(false); if (await call("DELETE", "/join", undefined, "Done")) load(); }} />
    </div>
  );
}

export default function CommunitiesScreen({ api, user, focus, type, onNav, onRequireLogin, onOpenProfile }) {
  const signedIn = Boolean(user);
  const [tab, setTab] = useState(type === "groups" || type === "channels" || type === "spaces" || type === "mine" ? type : "all");
  const [q, setQ] = useState(""); const [topic, setTopic] = useState(""); const [list, setList] = useState({ status: "loading", items: [], topics: [] });
  const ui = useV8Ui();
  const load = useCallback(async () => {
    if (tab === "spaces" || tab === "live") return;
    setList((l) => ({ ...l, status: "loading" }));
    const qs = new URLSearchParams({ type: tab }); if (q.trim()) qs.set("q", q.trim()); if (topic) qs.set("topic", topic);
    const r = await api("GET", `/api/v8/communities?${qs}`);
    setList(r.ok ? { status: r.json.needs_sign_in ? "signin" : "ready", items: r.json.items, topics: r.json.topics || [] } : { status: "error", items: [], topics: [] });
  }, [api, tab, q, topic]);
  useEffect(() => { if (!focus) { const t = window.setTimeout(load, q ? 300 : 0); return () => window.clearTimeout(t); } return undefined; }, [load, focus, q]);
  if (focus === "new") return signedIn ? <CreateCommunity api={api} onDone={(s) => onNav(`communities/${s}`)} onCancel={() => onNav("communities")} /> : <SignInCard title="Sign in to create a community" onSignIn={onRequireLogin} />;
  if (focus) return <Detail api={api} slug={focus} user={user} onBack={() => onNav("communities")} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} initialTab={typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") || "feed" : "feed"} />;
  const join = async (c) => {
    if (!signedIn) { onRequireLogin(); return; }
    const r = await api("POST", `/api/v8/communities/${c.public_key}/join`);
    if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message || "Couldn’t join." }); return; }
    ui?.toast({ title: r.json.message || "Done" });
    setList((l) => ({ ...l, items: l.items.map((x) => (x.public_key === c.public_key ? { ...x, membership: r.json.membership, member_count: x.member_count + (r.json.membership === "member" ? 1 : 0) } : x)) }));
  };
  return (
    <div className="v8m">
      <header className="v8l-top"><div><h1>Communities</h1><p className="v8c-muted">Communities, Groups, Channels and Live Spaces. Find your people. Share, learn and grow together.</p></div>
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => (signedIn ? onNav("communities/new") : onRequireLogin())}><V8Icon name="plus" size={18} />Create</button></header>
      <Tabs tabs={[{ value: "all", label: "All" }, { value: "groups", label: "Groups" }, { value: "channels", label: "Channels" }, { value: "live", label: "Live" }, { value: "spaces", label: "Spaces" }, { value: "mine", label: "My Communities" }]} value={tab} onChange={setTab} label="Community types" />
      {tab === "live" ? <RoomList api={api} kind="live" title="Live in communities" sub="" signedIn={signedIn} onRequireLogin={onRequireLogin} tabs={[{ value: "now", label: "Live Now" }, { value: "upcoming", label: "Upcoming" }, { value: "past", label: "Replays" }]} onOpen={(k) => onNav(`live/${k}`)} />
        : tab === "spaces" ? <RoomList api={api} kind="space" title="Spaces" sub="" signedIn={signedIn} onRequireLogin={onRequireLogin} tabs={[{ value: "for-you", label: "For You" }, { value: "upcoming", label: "Upcoming" }, { value: "mine", label: "My Spaces" }]} onOpen={(k) => onNav(`spaces/${k}`)} />
        : (<>
          <div className="v8m-types">{TYPE_TILES.map((t) => <button key={t.v} type="button" className={`v8m-type-tile ${tab === t.v ? "on" : ""}`} onClick={() => setTab(t.v)}><V8Icon name={t.i} size={20} /><span><b>{t.l}</b><small>{t.s}</small></span></button>)}</div>
          <div className="v8a2-filters">
            <label className="v8a2-search"><V8Icon name="search" size={18} /><span className="v8-sr">Search communities</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups, channels or spaces…" /></label>
            <label className="v8m-topic"><span className="v8-sr">Topic</span><select value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">All topics</option>{list.topics.map((t) => <option key={t}>{t}</option>)}</select></label>
          </div>
          {list.status === "loading" ? <div className="v8m-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="v8-card v8m-card"><Skel h={130} r={14} /><Skel h={16} w="60%" /><Skel h={40} /></div>)}</div> : null}
          {list.status === "error" ? <V8State kind="error" title="Communities didn’t load" actionLabel="Try again" onAction={load} /> : null}
          {list.status === "signin" ? <SignInCard title="Sign in to see your communities" onSignIn={onRequireLogin} /> : null}
          {list.status === "ready" && !list.items.length ? <div className="v8-card v8m-empty"><V8Icon name="search" size={28} /><div><b>No communities found</b><p className="v8c-muted">Try different keywords or filters. You can also create a new community.</p></div><button type="button" className="v8-btn" onClick={() => (signedIn ? onNav("communities/new") : onRequireLogin())}>Create a Community</button></div> : null}
          {list.status === "ready" && list.items.length ? (<><h2 className="v8m-h">{tab === "mine" ? "Your communities" : "Featured communities"}</h2><div className="v8m-grid">{list.items.map((c) => <CommunityCard key={c.public_key} c={c} onOpen={() => onNav(`communities/${c.public_key}`)} onJoin={() => join(c)} />)}</div></>) : null}
        </>)}
    </div>
  );
}

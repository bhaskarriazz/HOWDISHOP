// HOWDI V8 Creator workspace — V8__27 (desktop header + tabs Overview/Content/Community/Memberships/Insights/Earnings,
// Quick actions, Shop product link, Content calendar, Memberships, Community & Live, Creator safeguards; mobile panels
// 1 Creator home · 3 Memberships · 4 Community and Live · 5 Content reach · 6 Safety and earnings; system strip).
// Everything is scoped to the signed-in creator by the session — no creator id is ever sent.
import { useCallback, useEffect, useMemo, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, Skel, Tabs, fmt, since, when, safeImg, ShareSheet } from "./common";
import { inr } from "./Membership";

const TABS = [["overview", "Overview"], ["content", "Content"], ["community", "Community"], ["memberships", "Memberships"], ["insights", "Insights"], ["earnings", "Earnings"], ["safety", "Safety"]];
const KIND = { vibe: ["Vibe", "play", "coral"], article: ["Article", "article", "violet"], hype: ["Hype", "fire", "rose"], tip: ["Tip", "bulb", "amber"], post: ["Post", "comment", "blue"], story: ["Story", "camera", "teal"] };
const day = (iso) => { const t = Date.parse(iso || ""); return Number.isFinite(t) ? new Date(t) : null; };
const newKey = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function KindPill({ kind }) { const k = KIND[kind] || KIND.post; return <span className={`v8cr-kind tone-${k[2]}`}><V8Icon name={k[1]} size={13} />{k[0]}</span>; }
function Stat({ icon, value, label, tone }) { return <div className={`v8cr-stat tone-${tone}`}><span><V8Icon name={icon} size={18} /></span><b>{value}</b><small>{label}</small></div>; }

export default function CreatorWorkspace({ api, user, onNav, onRequireLogin, onOpenProfile, tab: tabIn }) {
  const ui = useV8Ui();
  const [tab, setTab] = useState(TABS.some((t) => t[0] === tabIn) ? tabIn : "overview");
  const [ws, setWs] = useState({ status: "loading" }); const [reload, setReload] = useState(0);
  useEffect(() => { if (tabIn && TABS.some((t) => t[0] === tabIn)) setTab(tabIn); }, [tabIn]);
  useEffect(() => {
    if (!user) return undefined; const ctl = new AbortController();
    setWs((x) => ({ ...x, status: x.status === "ready" ? "refresh" : "loading" }));
    api("GET", "/api/v8/creator/workspace", undefined, { signal: ctl.signal }).then((r) => { if (!r.aborted) setWs(r.ok ? { ...r.json, status: "ready" } : { status: "error", message: r.json.message }); });
    return () => ctl.abort();
  }, [api, user, reload]);
  const go = (t) => { setTab(t); onNav(`creator${t === "overview" ? "" : `?tab=${t}`}`); };
  if (!user) return <div className="v8-card"><V8State icon="lock" title="Sign in to open your creator workspace" actionLabel="Sign in" onAction={onRequireLogin} /></div>;
  const me = ws.creator?.author; const st = ws.stats || {};
  return (
    <div className="v8cr">
      <section className="v8-card v8cr-head">
        {ws.status === "loading" ? <><Skel h={96} w={96} r={60} /><div style={{ flex: 1, display: "grid", gap: 8 }}><Skel h={24} w="40%" /><Skel h={14} w="60%" /></div></> : ws.status === "error" ? (
          <V8State kind="error" title="Your workspace didn’t load" message={ws.message || "Check your connection and try again."} actionLabel="Retry" onAction={() => setReload((x) => x + 1)} />
        ) : (<>
          <Ava src={me?.avatar_url} name={me?.display_name} size={96} />
          <div className="v8cr-id">
            <h1>{me?.display_name} <span>— Creator workspace</span></h1>
            <p className="v8cr-handle"><button type="button" className="v8c-handle" onClick={() => onOpenProfile(me?.public_username)}>@{me?.public_username}</button><V8Badges verified={me?.verified} premium={me?.premium} /></p>
            {ws.creator?.headline ? <p className="v8c-muted">{ws.creator.headline}</p> : null}{ws.creator?.about ? <p className="v8cr-about">{ws.creator.about}</p> : null}
          </div>
          <div className="v8cr-stats">
            <Stat icon="users" value={fmt(st.followers)} label="Followers" tone="blue" />
            <Stat icon="crown" value={fmt(st.members)} label="Members" tone="violet" />
            <Stat icon="rupee" value={inr(st.ready_to_settle)} label="Ready to settle" tone="teal" />
            <Stat icon="edit" value={fmt(st.drafts)} label="Drafts" tone="blue" />
          </div>
        </>)}
        <nav className="v8cr-tabs" aria-label="Workspace sections"><Tabs tabs={TABS.map(([value, label]) => ({ value, label }))} value={tab} onChange={go} label="Workspace sections" /></nav>
      </section>
      {ws.status === "ready" || ws.status === "refresh" ? (
        tab === "overview" ? <Overview ws={ws} onNav={onNav} go={go} api={api} ui={ui} reload={() => setReload((x) => x + 1)} />
          : tab === "content" ? <Content api={api} onNav={onNav} />
            : tab === "community" ? <CommunityTab ws={ws} onNav={onNav} />
              : tab === "memberships" ? <Memberships api={api} ui={ui} me={me} onOpenProfile={onOpenProfile} reload={() => setReload((x) => x + 1)} />
                : tab === "insights" ? <Insights api={api} onNav={onNav} />
                  : tab === "earnings" ? <Earnings api={api} ui={ui} reload={() => setReload((x) => x + 1)} />
                    : <Safety api={api} ui={ui} onOpenProfile={onOpenProfile} />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Overview
function Overview({ ws, onNav, go, api, ui, reload }) {
  const [pick, setPick] = useState(false);
  return (
    <div className="v8cr-grid">
      <div className="v8cr-col">
        <section className="v8-card v8cr-quick"><h2>Quick actions</h2>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => onNav("create")}><V8Icon name="plus" size={18} />Create</button>
          <button type="button" className="v8-btn v8-btn-block" onClick={() => onNav("create?view=drafts")}><V8Icon name="edit" size={18} />View drafts ({ws.stats.drafts})</button>
        </section>
        <section className="v8-card v8cr-shop"><h2>Shop product link</h2>
          {ws.shop_link ? (
            <div className="v8cr-shopcard">{safeImg(ws.shop_link.image) ? <img src={ws.shop_link.image} alt="" /> : <span className="ph"><V8Icon name="shop" size={22} /></span>}
              <span><b>{ws.shop_link.title}</b><small>{ws.shop_link.subtitle}</small><span className="v8cr-price">{inr(ws.shop_link.price)} · <button type="button" className="v8-link" onClick={() => window.dispatchEvent(new CustomEvent("howdi:v8-open", { detail: { area: "shop", view: "crochet" } }))}>opens canonical Shop ↗</button></span></span></div>
          ) : <p className="v8c-muted">Pin one Shop product to your profile and content.</p>}
          {ws.shop_link ? <p className="v8cr-disclosure"><V8Icon name="tag" size={14} />{ws.shop_link.disclosure}</p> : null}
          <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => setPick(true)}>{ws.shop_link ? "Change product" : "Add a Shop product"}</button>
        </section>
      </div>
      <section className="v8-card v8cr-cal"><header className="v8c-sec-head"><h2>Content calendar</h2><button type="button" className="v8-link" onClick={() => go("content")}>View all</button></header>
        {!ws.calendar.length ? <V8State icon="calendar" title="Nothing planned yet" message="Schedule posts, Hype and Tips, or save drafts — they show up here." actionLabel="Create" onAction={() => onNav("create")} /> : (
          <ul className="v8cr-cal-list">{ws.calendar.map((c, i) => { const d = day(c.at); return (
            <li key={i}><span className="v8cr-date"><b>{d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</b><small>{d ? d.toLocaleDateString("en-IN", { weekday: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""}</small></span>
              {safeImg(c.cover) ? <img src={c.cover} alt="" /> : <span className="ph"><V8Icon name={(KIND[c.kind] || KIND.post)[1]} size={20} /></span>}
              <KindPill kind={c.kind} /><span className="v8cr-cal-text"><b>{c.title}</b>{c.sub ? <small>{c.sub}</small> : null}</span>
              <span className={`v8cr-state ${c.state}`}><V8Icon name={c.state === "scheduled" ? "clock" : c.state === "ready" ? "check" : "edit"} size={13} />{{ scheduled: "Scheduled", ready: "Ready", draft: "Draft" }[c.state]}</span>
              {c.draft ? <button type="button" className="v8-icon-btn" aria-label="Open draft" onClick={() => onNav(`create?draft=${c.draft}`)}><V8Icon name="more" size={20} /></button> : <span />}
            </li>); })}</ul>
        )}
      </section>
      <div className="v8cr-col">
        <section className="v8-card"><header className="v8c-sec-head"><h2>Memberships</h2><button type="button" className="v8-link" onClick={() => go("memberships")}>Manage →</button></header>
          <div className="v8cr-tier free"><span className="ico"><V8Icon name="users" size={20} /></span><span><b>Free</b><small>Open to everyone</small></span><small>{fmt(ws.stats.followers)} followers</small></div>
          {ws.tiers.map((t) => <div key={t.key} className="v8cr-tier"><span className="ico crown"><V8Icon name="crown" size={20} fill /></span><span><b>{t.name}</b><small>{inr(t.monthly)}/month{t.state === "paused" ? " · Paused" : ""}</small></span><small>{t.members} members</small></div>)}
          {!ws.tiers.length ? <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => go("memberships")}>Create a paid tier</button> : null}
        </section>
        <section className="v8-card"><header className="v8c-sec-head"><h2>Community & Live</h2><button type="button" className="v8-link" onClick={() => go("community")}>Go to community →</button></header>
          {ws.next_live ? (
            <div className="v8cr-live">{safeImg(ws.next_live.cover) ? <img src={ws.next_live.cover} alt="" /> : <span className="ph"><V8Icon name="live" size={22} /></span>}
              <span><small>{ws.next_live.state === "live" ? "Live now" : "Next Live"}</small><b>{ws.next_live.title}</b><small>{ws.next_live.state === "live" ? ws.next_live.topic : when(ws.next_live.starts_at)}</small></span>
              <button type="button" className="v8-btn v8-btn-primary" onClick={() => onNav(ws.next_live.route.replace(/^\/connect\//, ""))}>View details</button></div>
          ) : <V8State icon="live" title="No Live scheduled" message="Schedule a workshop or Q&A for your members." actionLabel="Go Live" onAction={() => onNav("live")} />}
        </section>
        <section className="v8-card"><header className="v8c-sec-head"><h2>Creator safeguards</h2><button type="button" className="v8-link" onClick={() => go("safety")}>View all →</button></header>
          <div className="v8cr-guards">
            <button type="button" onClick={() => go("safety")}><span className="t-amber"><V8Icon name="comment" size={18} /></span><b>{ws.safeguards.comments_held}</b><small>Comments held</small></button>
            <button type="button" onClick={() => go("safety")}><span className="t-blue"><V8Icon name="article" size={18} /></span><b>{ws.safeguards.copyright_review}</b><small>Under copyright review</small></button>
            <button type="button" onClick={() => go("safety")}><span className="t-teal"><V8Icon name="shield" size={18} /></span><b>{ws.safeguards.active_strikes}</b><small>Active strikes</small></button>
          </div>
        </section>
      </div>
      <ProductPicker open={pick} api={api} onClose={() => setPick(false)} onPicked={(card) => { setPick(false); ui?.toast({ title: "Shop link updated", message: card.title }); reload(); }} />
    </div>
  );
}

function ProductPicker({ open, api, onClose, onPicked }) {
  const [q, setQ] = useState("crochet"); const [res, setRes] = useState(null); const [err, setErr] = useState("");
  useEffect(() => {
    if (!open) return undefined; const t = setTimeout(async () => {
      if (q.trim().length < 2) { setRes([]); return; }
      const r = await api("GET", `/api/search?q=${encodeURIComponent(q.trim())}&types=product&limit=8`); setRes(r.ok ? (r.json.results || []) : "error");
    }, 250); return () => clearTimeout(t);
  }, [open, q, api]);
  const choose = async (it) => { setErr(""); const code = String(it.route || "").split("/").pop(); const r = await api("PUT", "/api/v8/creator/shop-link", { product: code }); if (r.ok) onPicked(r.json.link); else setErr(r.json.message || "Couldn’t link that product."); };
  return (
    <Sheet open={open} title="Link a Shop product" onClose={onClose}>
      <label className="v8c-field"><span>Search Shop</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" /></label>
      {res === null ? <Skel h={50} /> : res === "error" ? <p className="v8c-err">Search didn’t load.</p> : !res.length ? <p className="v8c-muted">No products found.</p> : (
        <div className="v8cr-pick">{res.map((it) => <button type="button" key={it.route} className="v8c-rail-item" onClick={() => choose(it)}>{safeImg(it.image) ? <img className="v8c-rail-img" src={it.image} alt="" /> : <span className="v8c-rail-img ph"><V8Icon name="shop" size={18} /></span>}<span className="v8c-rail-text"><b>{it.title}</b><small>{it.subtitle}</small></span></button>)}</div>
      )}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <p className="v8c-muted small">Shoppers always open the canonical Shop product. HOWDI shows “I may earn a small commission” next to your link.</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ Content (reach per item)
function Content({ api, onNav }) {
  const [kind, setKind] = useState("all"); const [d, setD] = useState({ status: "loading", items: [] });
  useEffect(() => { const ctl = new AbortController(); setD({ status: "loading", items: [] }); api("GET", `/api/v8/creator/content?kind=${kind}`, undefined, { signal: ctl.signal }).then((r) => { if (!r.aborted) setD(r.ok ? { status: "ready", items: r.json.items } : { status: "error", items: [] }); }); return () => ctl.abort(); }, [api, kind]);
  return (
    <section className="v8-card v8cr-content"><header className="v8c-sec-head"><h2>Content performance</h2><button type="button" className="v8-btn v8-btn-primary" onClick={() => onNav("create")}><V8Icon name="plus" size={16} />Create</button></header>
      <Tabs compact tabs={[["all", "All"], ["vibe", "Vibe"], ["article", "Article"], ["post", "Posts"], ["hype", "Hype"], ["tip", "Tips"]].map(([value, label]) => ({ value, label }))} value={kind} onChange={setKind} label="Content type" />
      {d.status === "loading" ? <Skel h={120} /> : d.status === "error" ? <V8State kind="error" title="Content didn’t load" actionLabel="Try again" onAction={() => setKind((k) => k)} /> : !d.items.length ? <V8State icon="empty" title="Nothing here yet" message="Publish your first piece — its reach shows up here." actionLabel="Create" onAction={() => onNav("create")} /> : (
        <ul className="v8cr-items">{d.items.map((x) => (
          <li key={x.key}><button type="button" onClick={() => onNav(x.route.replace(/^\/connect\//, ""))}>
            {safeImg(x.cover) ? <img src={x.cover} alt="" /> : <span className="ph"><V8Icon name={(KIND[x.kind] || KIND.post)[1]} size={22} /></span>}
            <span className="v8cr-item-text"><span><KindPill kind={x.kind} />{x.members_only ? <span className="v8cr-mo"><V8Icon name="crown" size={12} fill />Members</span> : null}{x.state === "scheduled" ? <span className="v8cr-state scheduled"><V8Icon name="clock" size={12} />Scheduled</span> : null}</span><b>{x.title}</b><small>{since(x.at)}</small></span>
            <span className="v8cr-metrics" aria-label="Reach"><span><V8Icon name="heart" size={15} />{fmt(x.metrics.likes)}</span><span><V8Icon name="comment" size={15} />{fmt(x.metrics.comments)}</span><span><V8Icon name="bookmark" size={15} />{fmt(x.metrics.saves)}</span><span><V8Icon name="share" size={15} />{fmt(x.metrics.shares)}</span>{x.kind === "vibe" ? <span><V8Icon name="remix" size={15} />{fmt(x.metrics.remixes)}</span> : null}</span>
          </button></li>))}</ul>
      )}
      <div className="v8cr-rights"><V8Icon name="shield" size={18} /><span><b>Creator rights & attribution</b><small>Original content is protected under HOWDI creator terms. Remixes always credit you.</small></span></div>
    </section>
  );
}

// ------------------------------------------------------------------ Community & Live
function CommunityTab({ ws, onNav }) {
  return (
    <div className="v8cr-two">
      <section className="v8-card"><h2>Share with your community</h2>
        <p className="v8c-muted">Post to followers, or to members only. Members-only posts show a locked preview to everyone else.</p>
        <div className="v8cr-actions">
          <button type="button" className="v8-btn" onClick={() => onNav("create?kind=post")}><V8Icon name="image" size={18} />Photo post</button>
          <button type="button" className="v8-btn" onClick={() => onNav("create?kind=post&members=1")}><V8Icon name="crown" size={18} />Members-only post</button>
          <button type="button" className="v8-btn" onClick={() => onNav("live")}><V8Icon name="live" size={18} />Live</button>
          <button type="button" className="v8-btn" onClick={() => onNav("communities")}><V8Icon name="users" size={18} />My groups & channels</button>
        </div>
      </section>
      <section className="v8-card"><h2>Live workshop</h2>
        {ws.next_live ? (<div className="v8cr-live big">{safeImg(ws.next_live.cover) ? <img src={ws.next_live.cover} alt="" /> : <span className="ph"><V8Icon name="live" size={28} /></span>}
          <span><b>{ws.next_live.title}</b><small>{ws.next_live.state === "live" ? "Live now" : when(ws.next_live.starts_at)}</small><small>Live demo · Live chat Q&A · Replay available</small></span>
          <button type="button" className="v8-btn v8-btn-primary" onClick={() => onNav(ws.next_live.route.replace(/^\/connect\//, ""))}>{ws.next_live.state === "live" ? "Open room" : "View details"}</button></div>)
          : <V8State icon="live" title="No Live scheduled" message="Host a stitch-along or Q&A. Members get a reminder." actionLabel="Go to Live" onAction={() => onNav("live")} />}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Memberships (tiers + subscribers)
function Memberships({ api, ui, me, onOpenProfile, reload }) {
  const [d, setD] = useState({ status: "loading" }); const [subs, setSubs] = useState(null); const [edit, setEdit] = useState(null); const [share, setShare] = useState(false);
  const load = useCallback(async () => {
    const [t, s] = await Promise.all([api("GET", "/api/v8/creator/tiers"), api("GET", "/api/v8/creator/subscribers")]);
    setD(t.ok ? { ...t.json, status: "ready" } : { status: "error" }); setSubs(s.ok ? s.json.items : []);
  }, [api]);
  useEffect(() => { load(); }, [load]);
  if (d.status === "loading") return <div className="v8-card"><Skel h={160} /></div>;
  if (d.status === "error") return <V8State kind="error" title="Memberships didn’t load" actionLabel="Try again" onAction={load} />;
  const pause = async (t) => { const r = await api("PATCH", `/api/v8/creator/tiers/${t.key}`, { paused: t.state !== "paused" }); if (r.ok) { ui?.toast({ title: t.state === "paused" ? "Tier re-opened" : "Tier paused", message: t.state === "paused" ? "New members can join again." : "Existing members keep access; nobody new can join." }); load(); reload(); } };
  return (
    <div className="v8cr-two">
      <section className="v8-card"><header className="v8c-sec-head"><h2>Memberships</h2>{d.tiers.length < 3 ? <button type="button" className="v8-btn v8-btn-soft" onClick={() => setEdit({})}><V8Icon name="plus" size={16} />New tier</button> : null}</header>
        <div className="v8cr-tier-card"><span className="ico"><V8Icon name="users" size={20} /></span><span><b>Free</b><small>Open to everyone</small><small>{fmt(d.free.members)} followers</small></span><span className="v8m-state ok"><i />Active</span>
          <ul className="v8m-benefits"><li><V8Icon name="check" size={15} />Community access</li><li><V8Icon name="check" size={15} />Public posts</li><li><V8Icon name="check" size={15} />Occasional live sessions</li></ul></div>
        {d.tiers.map((t) => (
          <div key={t.key} className="v8cr-tier-card paid"><span className="ico crown"><V8Icon name="crown" size={20} fill /></span>
            <span><b>{t.name}</b><small>{inr(t.monthly)}/month · {inr(t.yearly)}/year</small><small>{t.members} members</small></span>
            <span className={`v8m-state ${t.state === "paused" ? "warn" : "ok"}`}><i />{t.state === "paused" ? "Paused" : "Active"}</span>
            <ul className="v8m-benefits">{t.benefits.map((b) => <li key={b}><V8Icon name="check" size={15} />{b}</li>)}</ul>
            <div className="v8cr-actions"><button type="button" className="v8-btn v8-btn-soft" onClick={() => setEdit(t)}>Manage tier</button><button type="button" className="v8-btn" onClick={() => pause(t)}>{t.state === "paused" ? "Re-open" : "Pause new joins"}</button></div>
          </div>
        ))}
        {!d.tiers.length ? <V8State icon="crown" title="No paid tier yet" message="Offer exclusive patterns, tutorials and live workshops. HOWDI keeps a 10% fee." actionLabel="Create a tier" onAction={() => setEdit({})} /> : null}
        <div className="v8cr-hpay"><span className="v8m-hpay">HPay</span><span><b>HPay linked for payouts</b><small>Preview/Test sandbox wallet</small></span><V8Icon name="check" size={18} /></div>
      </section>
      <section className="v8-card"><header className="v8c-sec-head"><h2>Subscribers {subs ? `(${subs.length})` : ""}</h2></header>
        {subs === null ? <Skel h={80} /> : !subs.length ? (
          <div className="v8cr-empty-subs"><V8State icon="users" title="No subscribers yet" message="Invite your community to join your membership." actionLabel="Invite now" onAction={() => setShare(true)} /></div>
        ) : (<ul className="v8cr-subs">{subs.map((s) => (
          <li key={s.member.public_username}><button type="button" className="v8c-rail-open" onClick={() => onOpenProfile(s.member.public_username)}><Ava src={s.member.avatar_url} name={s.member.display_name} size={40} /><span className="v8c-rail-text"><b>@{s.member.public_username}</b><small>{s.tier} · {s.cycle} · since {since(s.since)}</small></span></button>
            <span className={`v8m-state ${s.state === "active" ? "ok" : s.state === "payment_failed" ? "bad" : "warn"}`}><i />{{ active: "Active", cancelling: "Cancelling", payment_failed: "Payment failed" }[s.state]}</span></li>))}</ul>)}
        <p className="v8c-muted small">You see @handles only — never members’ phone numbers or e-mail.</p>
      </section>
      <TierEditor open={Boolean(edit)} tier={edit} api={api} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); reload(); }} />
      <ShareSheet open={share} title="Join my membership on HOWDI" link={`/@${me?.public_username || ""}`} onClose={() => setShare(false)} />
    </div>
  );
}

function TierEditor({ open, tier, api, onClose, onSaved }) {
  const ui = useV8Ui();
  const [f, setF] = useState({ name: "", monthly: "", yearly: "", description: "", benefits: [""] }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setErr(""); setF(tier && tier.key ? { name: tier.name, monthly: String(tier.monthly), yearly: String(tier.yearly), description: tier.description || "", benefits: [...tier.benefits, ""] } : { name: "Maker Circle", monthly: "149", yearly: "1499", description: "", benefits: ["Exclusive patterns & tutorials", "Monthly live workshops", ""] }); } }, [open, tier]);
  const save = async () => {
    setBusy(true); setErr("");
    const body = { name: f.name, monthly: Number(f.monthly), yearly: f.yearly === "" ? undefined : Number(f.yearly), description: f.description, benefits: f.benefits.filter((b) => b.trim()) };
    const r = tier && tier.key ? await api("PATCH", `/api/v8/creator/tiers/${tier.key}`, body) : await api("POST", "/api/v8/creator/tiers", body);
    setBusy(false);
    if (r.ok) { ui?.toast({ title: tier && tier.key ? "Tier updated" : "Tier created", message: tier && tier.key ? "Price changes apply to new members only." : "Members can now join from your profile." }); onSaved(); } else setErr(r.json.message || "Couldn’t save the tier.");
  };
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const net = Number(f.monthly || 0) * 0.9;
  return (
    <Sheet open={open} title={tier && tier.key ? "Manage tier" : "New paid tier"} onClose={onClose}>
      <label className="v8c-field"><span>Tier name</span><input value={f.name} maxLength={60} onChange={set("name")} /></label>
      <div className="v8cr-row2"><label className="v8c-field"><span>Monthly price (₹)</span><input inputMode="decimal" value={f.monthly} onChange={set("monthly")} /></label><label className="v8c-field"><span>Yearly price (₹)</span><input inputMode="decimal" value={f.yearly} onChange={set("yearly")} /></label></div>
      <p className="v8c-muted small">You receive about {inr(net)} per monthly member after the 10% HOWDI fee.</p>
      <label className="v8c-field"><span>Short description</span><input value={f.description} maxLength={200} onChange={set("description")} placeholder="Exclusive patterns, live workshops & more" /></label>
      <fieldset className="v8c-field"><legend>Benefits</legend>
        {f.benefits.map((b, i) => <input key={i} value={b} maxLength={80} placeholder="Add a benefit" onChange={(e) => setF((x) => { const n = [...x.benefits]; n[i] = e.target.value; if (i === n.length - 1 && e.target.value && n.length < 8) n.push(""); return { ...x, benefits: n }; })} />)}
      </fieldset>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save tier"}</button>
    </Sheet>
  );
}

// ------------------------------------------------------------------ Insights (aggregates only)
function Insights({ api, onNav }) {
  const [d, setD] = useState({ status: "loading" });
  useEffect(() => { api("GET", "/api/v8/creator/insights").then((r) => setD(r.ok ? { ...r.json, status: "ready" } : { status: "error" })); }, [api]);
  if (d.status === "loading") return <div className="v8-card"><Skel h={140} /></div>;
  if (d.status === "error") return <V8State kind="error" title="Insights didn’t load" />;
  const t = d.totals;
  return (
    <div className="v8cr-two">
      <section className="v8-card"><h2>Reach across your content</h2>
        <div className="v8cr-kpis">{[["heart", t.likes, "Likes"], ["comment", t.comments, "Comments"], ["bookmark", t.saves, "Saves"], ["share", t.shares, "Shares"], ["remix", t.remixes, "Remixes"], ["play", t.views, "Vibe views"]].map(([i, v, l]) => <div key={l}><V8Icon name={i} size={18} /><b>{fmt(v)}</b><small>{l}</small></div>)}</div>
        <div className="v8cr-kpis two"><div><V8Icon name="users" size={18} /><b>{fmt(d.followers.total)}</b><small>Followers</small></div><div><V8Icon name="trend" size={18} /><b>+{fmt(d.followers.new_30d)}</b><small>New in 30 days</small></div></div>
        <p className="v8c-muted small"><V8Icon name="shield" size={14} /> {d.note}</p>
      </section>
      <section className="v8-card"><h2>Top content</h2>
        {!d.top.length ? <p className="v8c-muted">Publish content to see what performs best.</p> : <ul className="v8cr-items">{d.top.map((x) => (
          <li key={x.key}><button type="button" onClick={() => onNav(x.route.replace(/^\/connect\//, ""))}>{safeImg(x.cover) ? <img src={x.cover} alt="" /> : <span className="ph"><V8Icon name={(KIND[x.kind] || KIND.post)[1]} size={20} /></span>}
            <span className="v8cr-item-text"><KindPill kind={x.kind} /><b>{x.title}</b></span><span className="v8cr-metrics"><span><V8Icon name="heart" size={15} />{fmt(x.metrics.likes)}</span><span><V8Icon name="bookmark" size={15} />{fmt(x.metrics.saves)}</span></span></button></li>))}</ul>}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Earnings (ledger, ready to settle, payouts)
function Earnings({ api, ui, reload }) {
  const [d, setD] = useState({ status: "loading" }); const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false);
  const key = useMemo(() => newKey(), [ask]);
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/creator/earnings"); setD(r.ok ? { ...r.json, status: "ready" } : { status: "error" }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (d.status === "loading") return <div className="v8-card"><Skel h={160} /></div>;
  if (d.status === "error") return <V8State kind="error" title="Earnings didn’t load" actionLabel="Try again" onAction={load} />;
  const s = d.summary;
  const request = async () => { setBusy(true); const r = await api("POST", "/api/v8/creator/payouts", { idempotency_key: key }); setBusy(false); setAsk(false);
    if (r.ok) { ui?.toast({ title: "Payout requested", message: `${inr(r.json.payout.amount)} · ${r.json.payout.reference}` }); load(); reload(); } else ui?.toast({ kind: "error", title: "Payout not requested", message: r.json.message }); };
  return (
    <div className="v8cr-two">
      <section className="v8-card v8cr-earn"><h2>Earnings</h2>
        <div className="v8cr-settle"><small>Ready to settle</small><b>{inr(s.ready_to_settle)}</b>
          <button type="button" className="v8-btn v8-btn-primary" disabled={s.ready_to_settle < s.min_payout} onClick={() => setAsk(true)}>Request payout</button>
          {s.ready_to_settle < s.min_payout ? <small>Minimum payout is {inr(s.min_payout)}.</small> : null}</div>
        <dl className="v8cr-dl"><div><dt>Memberships (after fee)</dt><dd>{inr(s.lifetime_memberships)}</dd></div><div><dt>HOWDI fee (10%)</dt><dd>{inr(s.platform_fee)}</dd></div><div><dt>Payout pending</dt><dd>{inr(s.payout_pending)}</dd></div><div><dt>Paid out to HPay</dt><dd>{inr(s.paid_out)}</dd></div><div><dt>Live tips (paid to HPay instantly)</dt><dd>{inr(s.tips_to_hpay)}</dd></div></dl>
        <div className="v8cr-hpay"><span className="v8m-hpay">HPay</span><span><b>{d.hpay.linked ? "HPay linked for payouts" : "Link HPay to get paid"}</b><small>{d.hpay.linked ? `Balance ${inr(d.hpay.balance)} · Preview/Test sandbox` : "Payouts need a linked, verified HPay wallet."}</small></span></div>
        <h3 className="v8m-h">Payouts</h3>
        {!d.payouts.length ? <p className="v8c-muted">No payouts yet.</p> : <ul className="v8cr-ledger">{d.payouts.map((p) => (
          <li key={p.reference}><span><b>{inr(p.amount)}</b><small>{p.reference} · {since(p.requested_at)}</small>{p.note ? <small>{p.note}</small> : null}</span><span className={`v8m-state ${p.status === "paid" ? "ok" : p.status === "requested" ? "warn" : "bad"}`}><i />{{ requested: "Pending review", paid: "Paid", failed: "Failed — back in balance", rejected: "Rejected — back in balance" }[p.status]}</span></li>))}</ul>}
      </section>
      <section className="v8-card"><h2>Ledger</h2>
        {!d.ledger.length ? <V8State icon="rupee" title="No earnings yet" message="Membership payments and Live tips will appear here." /> : <ul className="v8cr-ledger">{d.ledger.map((x, i) => (
          <li key={i}><span className={`ico ${x.type}`}><V8Icon name={x.type === "tip" ? "live" : "crown"} size={16} /></span><span><b>{x.type === "tip" ? "Live tip" : x.type === "renewal" ? `${x.label} renewal` : `${x.label} membership`}</b><small>{x.reference} · {since(x.at)}</small></span>
            <span className="amt"><b>+{inr(x.net)}</b>{x.fee ? <small>{inr(x.gross)} − {inr(x.fee)} fee</small> : <small>to HPay</small>}</span></li>))}</ul>}
        <p className="v8c-muted small">Statements download arrives with the production payment provider. Questions? Help & Support in My HOWDI.</p>
      </section>
      <V8Confirm open={ask} title={`Request a payout of ${inr(s.ready_to_settle)}?`} body="HOWDI finance reviews payouts within 2 working days. The money arrives in your HPay wallet (Preview/Test sandbox here). If a payout fails, the amount returns to Ready to settle." confirmLabel={busy ? "Requesting…" : "Request payout"} busy={busy} onCancel={() => setAsk(false)} onConfirm={request} />
    </div>
  );
}

// ------------------------------------------------------------------ Safety (muted words, held comments, reports, strikes, appeals, audit)
function Safety({ api, ui, onOpenProfile }) {
  const [s, setS] = useState(null); const [held, setHeld] = useState(null); const [mod, setMod] = useState(null); const [edit, setEdit] = useState(null); const [appeal, setAppeal] = useState(false);
  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([api("GET", "/api/v8/creator/safety"), api("GET", "/api/v8/creator/held-comments"), api("GET", "/api/v8/creator/moderation")]);
    setS(a.ok ? a.json.safety : "error"); setHeld(b.ok ? b.json.items : []); setMod(c.ok ? c.json : null);
  }, [api]);
  useEffect(() => { load(); }, [load]);
  if (s === null) return <div className="v8-card"><Skel h={160} /></div>;
  if (s === "error") return <V8State kind="error" title="Safety settings didn’t load" actionLabel="Try again" onAction={load} />;
  const save = async (next) => { const r = await api("PUT", "/api/v8/creator/safety", next); if (r.ok) { setS(r.json.safety); ui?.toast({ title: "Safety settings saved" }); } else ui?.toast({ kind: "error", title: "Couldn’t save", message: r.json.message }); };
  const decide = async (h, act) => { const r = await api("POST", `/api/v8/creator/held-comments/${h.key}/${act}`); if (r.ok) { ui?.toast({ title: act === "approve" ? "Comment approved" : "Comment removed" }); load(); } };
  const c = mod?.counts || {};
  return (
    <div className="v8cr-two">
      <section className="v8-card"><h2>Safety</h2>
        <button type="button" className="v8cr-srow" onClick={() => setEdit("muted_words")}><V8Icon name="mute" size={18} /><span>Muted words / hashtags</span><b>{s.muted_words.length}</b><V8Icon name="chevr" size={16} /></button>
        <button type="button" className="v8cr-srow" onClick={() => setEdit("blocked_phrases")}><V8Icon name="ban" size={18} /><span>Blocked phrases</span><b>{s.blocked_phrases.length}</b><V8Icon name="chevr" size={16} /></button>
        <div className="v8cr-srow static"><V8Icon name="comment" size={18} /><span>Held comments</span><b>{held ? held.length : "…"}</b></div>
        <label className="v8cr-srow"><V8Icon name="users" size={18} /><span>Mentions, replies & remix</span>
          <select value={s.mentions} onChange={(e) => save({ ...s, mentions: e.target.value })} aria-label="Who can mention you"><option value="everyone">Everyone</option><option value="following">People I follow</option><option value="members">My members</option><option value="nobody">Nobody</option></select></label>
        <label className="v8cr-srow"><V8Icon name="eyeoff" size={18} /><span>Sensitive content (18+) blurred by default</span><input type="checkbox" checked={s.sensitive_default} onChange={(e) => save({ ...s, sensitive_default: e.target.checked })} /></label>
        <h3 className="v8m-h">Held comments</h3>
        {!held || !held.length ? <p className="v8c-muted">No comments are waiting. Comments containing your blocked phrases or muted words are held here — only you and the commenter can see them.</p> : (
          <ul className="v8cr-held">{held.map((h) => (
            <li key={h.key}>{h.author ? <button type="button" className="v8c-handle" onClick={() => onOpenProfile(h.author.public_username)}>@{h.author.public_username}</button> : null}<small>on your {h.on} · matched “{h.matched}” · {since(h.at)}</small><p>{h.text}</p>
              <div className="v8cr-actions"><button type="button" className="v8-btn v8-btn-soft" onClick={() => decide(h, "approve")}>Approve</button><button type="button" className="v8-btn v8-btn-danger" onClick={() => decide(h, "remove")}>Remove</button></div></li>))}</ul>
        )}
      </section>
      <section className="v8-card"><h2>Reports & moderation</h2>
        {[["flag", "Reported content", c.reported, "bad"], ["alert", "Under review", c.under_review, "warn"], ["article", "Copyright claims", c.copyright, "bad"], ["list", "Manual review queue", c.manual_review, ""], ["shield", "Active strikes", c.active_strikes, c.active_strikes ? "bad" : ""]].map(([i, l, n, tone]) => (
          <div key={l} className="v8cr-srow static"><V8Icon name={i} size={18} /><span>{l}</span><b className={n ? tone : ""}>{n || 0}</b></div>
        ))}
        {mod?.strikes?.length ? <ul className="v8cr-ledger">{mod.strikes.map((st) => <li key={st.index}><span><b>Strike {st.index}: {st.reason}</b><small>{st.details || ""} · expires {since(st.expires_at).replace(" ago", "")}</small></span></li>)}</ul> : null}
        <button type="button" className="v8-btn v8-btn-block" onClick={() => setAppeal(true)}>Appeal a decision</button>
        {mod?.appeals?.length ? <><h3 className="v8m-h">Appeals</h3><ul className="v8cr-ledger">{mod.appeals.map((a, i) => <li key={i}><span><b>{a.subject}</b><small>{since(a.at)}{a.note ? ` · ${a.note}` : ""}</small></span><span className={`v8m-state ${a.status === "overturned" ? "ok" : a.status === "open" ? "warn" : ""}`}><i />{{ open: "Under review", upheld: "Upheld", overturned: "Accepted" }[a.status]}</span></li>)}</ul></> : null}
        <h3 className="v8m-h">Moderation audit</h3>
        {!mod?.audit?.length ? <p className="v8c-muted">No moderation actions yet.</p> : <ul className="v8cr-audit">{mod.audit.map((a, i) => <li key={i}><b>{a.action.replace(/_/g, " ")}</b><small>{a.detail} · {since(a.at)}</small></li>)}</ul>}
      </section>
      <WordsEditor open={Boolean(edit)} field={edit} safety={s} onClose={() => setEdit(null)} onSave={(next) => { setEdit(null); save(next); }} />
      <AppealSheet open={appeal} api={api} strikes={mod?.strikes || []} onClose={() => setAppeal(false)} onSent={() => { setAppeal(false); load(); }} />
    </div>
  );
}

function WordsEditor({ open, field, safety, onClose, onSave }) {
  const [list, setList] = useState([]); const [w, setW] = useState("");
  useEffect(() => { if (open && field) { setList(safety[field] || []); setW(""); } }, [open, field, safety]);
  if (!open) return null;
  const add = () => { const v = w.trim().toLowerCase(); if (v.length >= 2 && !list.includes(v)) setList((x) => [...x, v]); setW(""); };
  return (
    <Sheet open={open} title={field === "muted_words" ? "Muted words / hashtags" : "Blocked phrases"} onClose={onClose}>
      <p className="v8c-muted">{field === "muted_words" ? "Comments containing these words or #hashtags are held for your review." : "Comments containing these phrases are held and never shown publicly unless you approve them."}</p>
      <div className="v8cr-row2"><input value={w} maxLength={40} onChange={(e) => setW(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Add a word or phrase" aria-label="Add" /><button type="button" className="v8-btn v8-btn-soft" onClick={add}>Add</button></div>
      <div className="v8cr-chips">{list.map((x) => <span key={x} className="v8c-chip on">{x}<button type="button" aria-label={`Remove ${x}`} onClick={() => setList((l) => l.filter((y) => y !== x))}><V8Icon name="x" size={12} /></button></span>)}{!list.length ? <p className="v8c-muted">Nothing added yet.</p> : null}</div>
      <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => onSave({ ...safety, [field]: list })}>Save</button>
    </Sheet>
  );
}

function AppealSheet({ open, api, strikes, onClose, onSent }) {
  const ui = useV8Ui();
  const [f, setF] = useState({ subject: "", details: "", strike: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ subject: "", details: "", strike: "" }); setErr(""); } }, [open]);
  const send = async () => { setBusy(true); const r = await api("POST", "/api/v8/creator/appeals", { subject: f.subject, details: f.details, strike_index: f.strike ? Number(f.strike) : undefined }); setBusy(false);
    if (r.ok) { ui?.toast({ title: "Appeal sent", message: r.json.message }); onSent(); } else setErr(r.json.message || "Couldn’t send the appeal."); };
  return (
    <Sheet open={open} title="Appeal a decision" onClose={onClose}>
      {strikes.length ? <label className="v8c-field"><span>Which strike? (optional)</span><select value={f.strike} onChange={(e) => setF((x) => ({ ...x, strike: e.target.value }))}><option value="">Not about a strike</option>{strikes.map((s) => <option key={s.index} value={s.index}>Strike {s.index}: {s.reason}</option>)}</select></label> : null}
      <label className="v8c-field"><span>Subject</span><input value={f.subject} maxLength={120} onChange={(e) => setF((x) => ({ ...x, subject: e.target.value }))} placeholder="e.g. My Vibe was removed by mistake" /></label>
      <label className="v8c-field"><span>What happened?</span><textarea rows={4} maxLength={1000} value={f.details} onChange={(e) => setF((x) => ({ ...x, details: e.target.value }))} /></label>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send appeal"}</button>
      <p className="v8c-muted small">The HOWDI safety team replies within 3 working days. You’ll get a notification with the decision.</p>
    </Sheet>
  );
}

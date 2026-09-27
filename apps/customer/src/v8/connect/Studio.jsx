// HOWDI V8 Create content — V8__27 panel 2 (type Vibe/Story/Article/Hype/Tip, photos, caption counter, categories,
// hashtags, audience, permissions, save draft / preview / publish, "Draft saved …", upload %) + PRIOR__15 panel 5
// (Add a Hype / Publish a Tip with type chips, audience and disclosure) + the V8__27 system strip (Uploading · Keep draft,
// Connection error · Retry). Drafts are kept on the server (text + settings); media is attached when you publish.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { Sheet, Skel, Tabs, since, safeImg, readFileAsDataUrl } from "./common";
import { PostCard } from "./Post";

const TYPES = [["vibe", "Vibe", "play"], ["story", "Story", "camera"], ["article", "Article", "article"], ["hype", "Hype", "fire"], ["tip", "Tip", "bulb"], ["post", "Post", "comment"]];
const HYPE_TYPES = [["creator", "Creator moment"], ["community", "Community"], ["live", "Live"], ["vibe", "Vibe"], ["trending", "Trending topic"]];
const TIP_CATS = [["crochet", "Crochet"], ["tools", "Tools & Materials"], ["patterns", "Patterns"], ["business", "Business"], ["care", "Care"], ["other", "Other"]];
const DISCLOSURES = [["none", "No disclosure needed"], ["sponsored", "Sponsored / paid partnership"], ["affiliate", "Affiliate link"], ["gifted", "Gifted product"]];
const AUD = [["everyone", "Public"], ["followers", "Followers"], ["friends", "Friends"], ["close_friends", "Close Friends"], ["only_me", "Only me"]];
const LOCAL_KEY = "howdi.v8.studio.offline";
const empty = (kind, members) => ({ kind, text: "", title: "", hype_type: "creator", disclosure: "none", category: "crochet", steps: [{ text: "", image: "" }], related: [], audience: "everyone", members_only: Boolean(members), teaser: "", allow_comments: true, schedule_at: "", tags: [] });
const newKey = () => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// publish with upload progress (XHR); resolves {ok,status,json}
function xhrJson(url, body, headers, onProgress) {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest(); x.open("POST", url); Object.entries({ Accept: "application/json", "Content-Type": "application/json", ...headers }).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch { j = { message: "Unexpected response." }; } resolve({ ok: x.status >= 200 && x.status < 300 && j.status !== "error", status: x.status, json: j }); };
    x.onerror = () => resolve({ ok: false, status: 0, json: { message: "Connection lost. Your draft is safe — retry when you’re back online." } });
    x.send(JSON.stringify(body));
  });
}

export default function Studio({ api, user, onNav, onRequireLogin, onCreateStory, query, apiBase, getAuthHeaders }) {
  const ui = useV8Ui();
  const view = query.get("view") || ""; const draftKey = query.get("draft") || ""; const kindQ = query.get("kind") || "";
  const [kind, setKind] = useState(["hype", "tip", "post"].includes(kindQ) ? kindQ : "");
  const [f, setF] = useState(() => empty(kindQ || "post", query.get("members") === "1"));
  const [media, setMedia] = useState([]); // {data,type,alt}
  const [draft, setDraft] = useState({ key: "", saved_at: null, state: "idle" });
  const [state, setState] = useState("edit"); const [pct, setPct] = useState(0); const [err, setErr] = useState(""); const [preview, setPreview] = useState(false); const [linkOpen, setLinkOpen] = useState(false);
  const [tick, setTick] = useState(0); const dirty = useRef(false); const fileRef = useRef(null); const stepFile = useRef(null); const stepIdx = useRef(0);
  const pubKey = useMemo(() => newKey(), [kind]);
  const [tiers, setTiers] = useState(null);
  useEffect(() => { if (user) api("GET", "/api/v8/creator/tiers").then((r) => setTiers(r.ok ? r.json.tiers : [])); }, [api, user]);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 30000); return () => clearInterval(id); }, []);
  // open an existing draft
  useEffect(() => {
    if (!draftKey || !user) return;
    api("GET", `/api/v8/creator/drafts/${draftKey}`).then((r) => {
      if (!r.ok) { setErr("That draft isn’t available."); return; }
      const d = r.json.draft; if (["vibe", "story", "article"].includes(d.kind)) { setKind(d.kind); return; }
      setKind(d.kind); setF({ ...empty(d.kind), ...d.payload, kind: d.kind }); setDraft({ key: d.key, saved_at: d.saved_at, state: "saved" });
    });
  }, [draftKey, user, api]);
  const set = (k, v) => { dirty.current = true; setF((x) => ({ ...x, [k]: v })); };
  const saveDraft = useCallback(async (manual) => {
    if (!user || !kind || !["hype", "tip", "post"].includes(kind)) return;
    const payload = { ...f, kind }; const title = kind === "tip" ? f.title : f.text.slice(0, 80);
    setDraft((d) => ({ ...d, state: "saving" }));
    const r = draft.key ? await api("PUT", `/api/v8/creator/drafts/${draft.key}`, { kind, title, payload, planned_for: f.schedule_at || null, ready: false })
      : await api("POST", "/api/v8/creator/drafts", { kind, title, payload, planned_for: f.schedule_at || null });
    if (r.ok) { dirty.current = false; setDraft({ key: r.json.draft.key, saved_at: r.json.draft.saved_at, state: "saved" }); try { localStorage.removeItem(LOCAL_KEY); } catch { /* storage blocked */ } if (manual) ui?.toast({ title: "Draft saved", message: "Photos are attached when you publish." }); }
    else { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)); } catch { /* storage blocked */ } setDraft((d) => ({ ...d, state: r.status === 0 ? "offline" : "error" })); }
  }, [api, draft.key, f, kind, ui, user]);
  // autosave 4 s after the last change
  useEffect(() => { if (!dirty.current) return undefined; const t = setTimeout(() => saveDraft(false), 4000); return () => clearTimeout(t); }, [f, saveDraft]);
  // recover an offline draft once
  useEffect(() => { try { const raw = localStorage.getItem(LOCAL_KEY); if (raw && !draftKey) { const p = JSON.parse(raw); if (p && p.kind) { setKind(p.kind); setF({ ...empty(p.kind), ...p }); ui?.toast({ title: "Recovered your unsaved draft" }); } } } catch { /* ignore */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <div className="v8-card"><V8State icon="lock" title="Sign in to create" actionLabel="Sign in" onAction={onRequireLogin} /></div>;
  if (view === "drafts") return <Drafts api={api} onNav={onNav} />;

  const choose = (k) => {
    if (k === "vibe") return onNav("vibe/create");
    if (k === "story") return onCreateStory();
    if (k === "article") return onNav("articles?mode=write");
    setKind(k); setF((x) => ({ ...empty(k, x.members_only), text: x.text, audience: x.audience, members_only: x.members_only })); onNav(`create?kind=${k}`);
  };
  const pick = async (files) => {
    setErr("");
    for (const file of [...(files || [])].slice(0, 4 - media.length)) {
      if (!/^image\/(jpeg|png|webp)$|^video\/(mp4|webm)$/.test(file.type)) { setErr("Use JPG, PNG, WebP, MP4 or WebM."); continue; }
      if (file.size > (file.type.startsWith("video") ? 20 : 5) * 1024 * 1024) { setErr(file.type.startsWith("video") ? "Videos can be up to 20 MB." : "Photos can be up to 5 MB."); continue; }
      const data = await readFileAsDataUrl(file); setMedia((m) => [...m, { data, type: file.type.startsWith("video") ? "video" : "image", alt: "" }]); dirty.current = true;
    }
  };
  const stepPick = async (file) => { if (!file) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setErr("Step photos: JPG, PNG or WebP up to 5 MB."); return; } const data = await readFileAsDataUrl(file); setF((x) => ({ ...x, steps: x.steps.map((s, i) => (i === stepIdx.current ? { ...s, image: data } : s)) })); };
  const body = () => ({ kind, text: f.text, title: f.title, hype_type: f.hype_type, disclosure: f.disclosure, category: f.category, steps: f.steps.filter((s) => s.text.trim()),
    related: f.related.map((r) => ({ kind: r.kind, code: r.code })), audience: f.audience, members_only: f.members_only, teaser: f.teaser, allow_comments: f.allow_comments,
    schedule_at: f.schedule_at ? new Date(f.schedule_at).toISOString() : undefined, tags: f.tags, media: media.map((m) => ({ data: m.data, alt: m.alt })), draft: draft.key || undefined, idempotency_key: pubKey });
  const validate = () => {
    if (kind === "tip" && f.title.trim().length < 4) return "Give your Tip a short title.";
    if (kind === "tip" && !f.steps.some((s) => s.text.trim())) return "Add at least one step.";
    if (!f.text.trim() && !media.length) return "Write something or add a photo.";
    if (f.members_only && tiers && !tiers.length) return "Create a paid membership tier before posting members-only content.";
    return "";
  };
  const publish = async () => {
    const v = validate(); if (v) { setErr(v); return; }
    setErr(""); setState("uploading"); setPct(0);
    let headers = {}; try { headers = getAuthHeaders ? getAuthHeaders() : {}; } catch { headers = {}; }
    const r = await xhrJson(`${String(apiBase || "").replace(/\/+$/, "")}/api/v8/posts`, body(), headers, setPct);
    if (!r.ok) { setState("failed"); setErr(r.json.message || "Couldn’t publish. Your draft is safe."); if (dirty.current) saveDraft(false); return; }
    setState("done"); try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
    ui?.toast({ title: f.schedule_at ? "Scheduled" : kind === "hype" ? "Your Hype is live" : kind === "tip" ? "Your Tip is published" : "Your post is live", message: f.schedule_at ? `Publishes ${new Date(f.schedule_at).toLocaleString("en-IN")}` : "" });
    const route = r.json.post?.route || "";
    onNav(f.schedule_at ? "creator" : route.replace(/^\/connect\//, "") || "");
  };
  const cap = kind === "hype" ? 500 : 2000;
  const preview_post = { public_key: "PREVIEW", kind, author: { public_username: user.public_username || "you", display_name: user.full_name || "You", avatar_url: user.avatar || null, verified: false, premium: false },
    text: f.text, title: f.title, category: f.category, steps: f.steps.filter((s) => s.text).map((s, i) => ({ n: i + 1, text: s.text, image: s.image })), related: f.related, hype_type: f.hype_type, disclosure: f.disclosure,
    media: media.map((m) => ({ type: m.type, url: m.data, alt: m.alt })), audience: f.audience, counts: { likes: 0, comments: 0, shares: 0 }, viewer: { liked: false, saved: false, mine: true, member: true }, published_at: new Date().toISOString(), allow_comments: f.allow_comments, members_only: f.members_only, locked: false, tags: f.tags };
  const complete = Math.round((([f.text || media.length, kind !== "tip" || f.title, kind !== "tip" || f.steps.some((s) => s.text), f.audience].filter(Boolean).length) / 4) * 100);
  void tick;
  return (
    <div className="v8st">
      <header className="v8c-page-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={() => onNav("creator")}><V8Icon name="back" size={22} /></button><div><h1>Create content</h1><p>Choose what you’re making. Drafts save automatically.</p></div>
        <button type="button" className="v8-link" onClick={() => onNav("create?view=drafts")}>Drafts</button></header>
      <div className="v8st-types" role="tablist" aria-label="Content type">{TYPES.map(([k, l, i]) => <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => choose(k)}><span><V8Icon name={i} size={22} /></span>{l}</button>)}</div>
      {!kind ? <div className="v8-card"><V8State icon="sparkles" title="What would you like to create?" message="Vibes are short videos, Stories last 24 hours, Articles are long reads, Hype shares a moment, Tips teach something in steps." /></div> : (
        <div className="v8st-grid">
          <section className="v8-card v8st-form" aria-label={`Create a ${kind}`}>
            {kind === "hype" ? <div className="v8st-mode"><Tabs compact tabs={[{ value: "hype", label: "Add a Hype" }, { value: "tip", label: "Publish a Tip" }]} value={kind} onChange={choose} label="Mode" /></div> : null}
            <div className="v8st-media">
              {media.map((m, i) => (
                <div key={i} className="v8st-thumb">{m.type === "video" ? <video src={m.data} muted /> : <img src={m.data} alt={m.alt} />}
                  <button type="button" aria-label="Remove" onClick={() => setMedia((x) => x.filter((_, j) => j !== i))}><V8Icon name="x" size={14} /></button>
                  <input value={m.alt} maxLength={200} placeholder="Alt text (describe the image)" aria-label={`Alt text for item ${i + 1}`} onChange={(e) => setMedia((x) => x.map((y, j) => (j === i ? { ...y, alt: e.target.value } : y)))} /></div>
              ))}
              {media.length < 4 ? <button type="button" className="v8st-add" onClick={() => fileRef.current?.click()}><V8Icon name="plus" size={22} /><span>Add photos or videos (max 4)</span></button> : null}
              <input ref={fileRef} data-testid="studio-file" type="file" hidden multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
            </div>
            {kind === "tip" ? <label className="v8c-field"><span>Tip title</span><input value={f.title} maxLength={140} onChange={(e) => set("title", e.target.value)} placeholder="Tip: Invisible join for a cleaner finish" /></label> : null}
            <label className="v8c-field"><span>{kind === "tip" ? "Short intro" : "Caption"}</span><textarea rows={4} maxLength={cap} value={f.text} onChange={(e) => set("text", e.target.value)} placeholder={kind === "hype" ? "Just finished my first sunflower bag! 🌻" : "Write a caption… use #hashtags and @mentions"} /><small className="v8st-count">{f.text.length}/{cap}</small></label>
            {kind === "hype" ? (<fieldset className="v8c-field"><legend>Hype type</legend><div className="v8st-chips">{HYPE_TYPES.map(([v, l]) => <button key={v} type="button" className={`v8c-chip ${f.hype_type === v ? "on" : ""}`} aria-pressed={f.hype_type === v} onClick={() => set("hype_type", v)}>{l}</button>)}</div></fieldset>) : null}
            {kind === "tip" ? (<>
              <fieldset className="v8c-field"><legend>Category</legend><div className="v8st-chips">{TIP_CATS.map(([v, l]) => <button key={v} type="button" className={`v8c-chip ${f.category === v ? "on" : ""}`} aria-pressed={f.category === v} onClick={() => set("category", v)}>{l}</button>)}</div></fieldset>
              <fieldset className="v8c-field v8st-steps"><legend>Steps</legend>
                {f.steps.map((s, i) => (
                  <div key={i} className="v8st-step"><span className="n">{i + 1}</span><textarea rows={2} maxLength={400} value={s.text} placeholder={`Step ${i + 1}`} aria-label={`Step ${i + 1}`} onChange={(e) => set("steps", f.steps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                    {safeImg(s.image) ? <img src={s.image} alt="" /> : <button type="button" className="v8-icon-btn" aria-label={`Add a photo to step ${i + 1}`} onClick={() => { stepIdx.current = i; stepFile.current?.click(); }}><V8Icon name="image" size={18} /></button>}
                    {f.steps.length > 1 ? <button type="button" className="v8-icon-btn" aria-label={`Remove step ${i + 1}`} onClick={() => set("steps", f.steps.filter((_, j) => j !== i))}><V8Icon name="x" size={16} /></button> : null}</div>
                ))}
                {f.steps.length < 12 ? <button type="button" className="v8-btn v8-btn-soft" onClick={() => set("steps", [...f.steps, { text: "", image: "" }])}><V8Icon name="plus" size={16} />Add step</button> : null}
                <input ref={stepFile} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { stepPick(e.target.files[0]); e.target.value = ""; }} />
              </fieldset>
            </>) : null}
            {kind !== "post" ? (<div className="v8c-field"><span className="v8st-label">Related learning and more</span>
              <div className="v8st-related">{f.related.map((r, i) => <span key={i} className="v8st-rel"><b>{r.kind}</b>{r.title}<button type="button" aria-label="Remove link" onClick={() => set("related", f.related.filter((_, j) => j !== i))}><V8Icon name="x" size={12} /></button></span>)}
                {f.related.length < 4 ? <button type="button" className="v8-btn v8-btn-soft" onClick={() => setLinkOpen(true)}><V8Icon name="link" size={16} />Link a course, product, worker or community</button> : null}</div></div>) : null}
            <div className="v8st-row">
              <label className="v8c-field"><span>Audience</span><select value={f.audience} onChange={(e) => set("audience", e.target.value)}>{AUD.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              {kind === "hype" ? <label className="v8c-field"><span>Disclosure</span><select value={f.disclosure} onChange={(e) => set("disclosure", e.target.value)}>{DISCLOSURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label> : null}
              <label className="v8c-field"><span>Schedule (optional)</span><input type="datetime-local" value={f.schedule_at} onChange={(e) => set("schedule_at", e.target.value)} /></label>
            </div>
            <label className="v8st-toggle"><input type="checkbox" checked={f.members_only} onChange={(e) => set("members_only", e.target.checked)} /><span><b>Members only</b><small>{tiers && !tiers.length ? "Create a paid tier first (Creator workspace → Memberships)." : "Everyone else sees a locked preview with a Subscribe button."}</small></span></label>
            {f.members_only ? <label className="v8c-field"><span>Preview text everyone can see</span><input value={f.teaser} maxLength={200} onChange={(e) => set("teaser", e.target.value)} placeholder="Live stitch-along replay: crochet tote bag" /></label> : null}
            <label className="v8st-toggle"><input type="checkbox" checked={f.allow_comments} onChange={(e) => set("allow_comments", e.target.checked)} /><span><b>Allow comments</b><small>Comments with your blocked phrases are held for review.</small></span></label>
            {err ? <p className="v8c-err" role="alert">{err}</p> : null}
            <div className="v8st-actions">
              <button type="button" className="v8-btn" onClick={() => saveDraft(true)}>Save draft</button>
              <button type="button" className="v8-btn v8-btn-soft" onClick={() => setPreview(true)}>Preview</button>
              <button type="button" className="v8-btn v8-btn-primary" disabled={state === "uploading"} onClick={publish}>{f.schedule_at ? "Schedule" : kind === "hype" ? "Post Hype" : kind === "tip" ? "Publish Tip" : "Publish"}</button>
            </div>
            <p className="v8st-status" aria-live="polite"><V8Icon name={draft.state === "offline" || draft.state === "error" ? "alert" : "check"} size={14} />
              {draft.state === "saving" ? "Saving draft…" : draft.state === "offline" ? "You’re offline — draft kept on this device" : draft.state === "error" ? "Draft not saved — kept on this device" : draft.saved_at ? `Draft saved ${since(draft.saved_at).toLowerCase()}` : "Not saved yet"}
              <span className="v8st-complete">{complete}% complete</span></p>
          </section>
          <aside className="v8-card v8st-side"><h2>Tips for great {kind === "tip" ? "Tips" : kind === "hype" ? "Hype" : "posts"}</h2>
            <ul className="v8m-benefits">{(kind === "tip" ? ["Start with the result", "One action per step", "Add a photo to tricky steps", "Link the course or yarn you used"] : kind === "hype" ? ["Share a real moment", "Tag the community or Live", "Disclose sponsorships", "Keep it kind"] : ["Add alt text to photos", "Use members-only for exclusive patterns", "Schedule for when your audience is online"]).map((t) => <li key={t}><V8Icon name="check" size={15} />{t}</li>)}</ul>
          </aside>
        </div>
      )}
      {state === "uploading" || state === "failed" ? (
        <div className={`v8st-strip ${state}`} role="status"><V8Icon name={state === "failed" ? "alert" : "upload"} size={18} />
          <span>{state === "failed" ? <><b>Connection error.</b> We kept your work safe.</> : <>Uploading… {pct}%</>}</span>
          {state === "uploading" ? <div className="v8c-progress"><i style={{ width: `${pct}%`, animation: "none" }} /></div> : null}
          {state === "failed" ? <button type="button" className="v8-btn v8-btn-soft" onClick={publish}>Retry</button> : <button type="button" className="v8-btn v8-btn-soft" onClick={() => saveDraft(true)}>Keep draft</button>}
        </div>
      ) : null}
      <Sheet open={preview} title="Preview" onClose={() => setPreview(false)} wide>
        <div className="v8st-preview"><PostCard post={preview_post} api={async () => ({ ok: false, json: {} })} signedIn preview onRequireLogin={() => {}} onOpenProfile={() => {}} /></div>
      </Sheet>
      <LinkPicker open={linkOpen} api={api} onClose={() => setLinkOpen(false)} onPick={(r) => { setLinkOpen(false); set("related", [...f.related, r]); }} />
    </div>
  );
}

function LinkPicker({ open, api, onClose, onPick }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState([]); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return undefined; const t = setTimeout(async () => {
      if (q.trim().length < 2) { setRes([]); return; } setBusy(true);
      const [s, c] = await Promise.all([api("GET", `/api/search?q=${encodeURIComponent(q.trim())}&types=product,course,worker&limit=5`), api("GET", `/api/v8/communities?q=${encodeURIComponent(q.trim())}`)]);
      const out = [];
      for (const it of (s.ok ? s.json.results || [] : [])) { const code = decodeURIComponent(String(it.route).split("/").pop()); out.push({ kind: it.type, code, title: it.title, sub: it.subtitle }); }
      for (const g of (c.ok ? c.json.items || [] : []).slice(0, 5)) out.push({ kind: "community", code: g.public_key, title: g.name, sub: g.kind === "channel" ? "Channel" : "Group" });
      setRes(out); setBusy(false);
    }, 250); return () => clearTimeout(t);
  }, [open, q, api]);
  return (
    <Sheet open={open} title="Link related learning and more" onClose={onClose}>
      <label className="v8c-field"><span>Search courses, products, workers and communities</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. amigurumi, cotton yarn" autoFocus /></label>
      {busy ? <Skel h={40} /> : null}
      <div className="v8cr-pick">{res.map((r) => <button key={r.kind + r.code} type="button" className="v8c-rail-item" onClick={() => onPick(r)}><span className="v8c-rail-img ph"><V8Icon name={{ product: "shop", course: "learn", worker: "works", community: "users" }[r.kind] || "link"} size={18} /></span><span className="v8c-rail-text"><b>{r.title}</b><small>{r.kind} · {r.sub}</small></span></button>)}</div>
      {!busy && q.trim().length >= 2 && !res.length ? <p className="v8c-muted">Nothing found. Try another word.</p> : null}
    </Sheet>
  );
}

function Drafts({ api, onNav }) {
  const ui = useV8Ui();
  const [d, setD] = useState({ status: "loading", items: [] });
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/creator/drafts"); setD(r.ok ? { status: "ready", items: r.json.items } : { status: "error", items: [] }); }, [api]);
  useEffect(() => { load(); }, [load]);
  const del = async (k) => { const r = await api("DELETE", `/api/v8/creator/drafts/${k}`); if (r.ok) { ui?.toast({ title: "Draft deleted" }); load(); } };
  return (
    <div className="v8st">
      <header className="v8c-page-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={() => onNav("create")}><V8Icon name="back" size={22} /></button><div><h1>Drafts</h1><p>Pick up where you left off.</p></div></header>
      <section className="v8-card">
        {d.status === "loading" ? <Skel h={80} /> : d.status === "error" ? <V8State kind="error" title="Drafts didn’t load" actionLabel="Try again" onAction={load} /> : !d.items.length ? <V8State icon="edit" title="No drafts" message="Drafts save automatically while you create." actionLabel="Create" onAction={() => onNav("create")} /> : (
          <ul className="v8cr-ledger">{d.items.map((x) => <li key={x.key}><span><b>{x.title}</b><small>{x.kind} · saved {since(x.saved_at).toLowerCase()}{x.planned_for ? ` · planned ${new Date(x.planned_for).toLocaleDateString("en-IN")}` : ""}</small></span>
            <span className="v8cr-actions"><button type="button" className="v8-btn v8-btn-soft" onClick={() => onNav(`create?draft=${x.key}&kind=${x.kind}`)}>Open</button><button type="button" className="v8-btn" onClick={() => del(x.key)}>Delete</button></span></li>)}</ul>
        )}
      </section>
    </div>
  );
}

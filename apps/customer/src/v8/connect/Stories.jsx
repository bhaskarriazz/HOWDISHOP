// HOWDI V8 Stories — viewer + create (board 32 top-left desktop + mobile panels 1–2, SUP-01, board 06 stories rail).
// Viewer: progress bars, pause, prev/next, reply (private), reactions, report / block, owner privacy summary.
// Create: image or video, text, filter, audience (Everyone / Friends / Close Friends / Only Me), preview, share.
// Slice 2: mute is saved on the server (private, with Undo), the owner sees who viewed + reactions and can keep a
// story in a named highlight (same audience as the story); highlights open in this viewer in "highlight" mode.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { V8Icon } from "../V8Shell";
import { V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, since, safeImg, safeVideo, readFileAsDataUrl, Skel } from "./common";

const DURATION = 6000;
const REACTIONS = ["❤️", "👏", "🔥", "✨", "😂"];
const AUD = [["everyone", "Everyone", "globe"], ["friends", "Friends", "users"], ["close_friends", "Close Friends", "star"], ["only_me", "Only Me", "lock"]];
const FILTERS = [["none", "Original", "none"], ["warm", "Warm", "sepia(.25) saturate(1.2)"], ["cool", "Cool", "hue-rotate(-12deg) saturate(1.1)"], ["mono", "Mono", "grayscale(1)"]];

export function StoryViewer({ groups, start, api, signedIn, onRequireLogin, onClose, onOpenProfile, mode = "story", onRemoved }) {
  const ui = useV8Ui();
  const hl = mode === "highlight";
  const [viewers, setViewers] = useState(null); const [hlSheet, setHlSheet] = useState(false); const [removeAsk, setRemoveAsk] = useState(false);
  const [manage, setManage] = useState(null); // null | "menu" | "rename" | "delete"
  const [newName, setNewName] = useState(""); const [manageErr, setManageErr] = useState("");
  const [gi, setGi] = useState(start || 0); const [ii, setIi] = useState(0); const [paused, setPaused] = useState(false); const [t, setT] = useState(0);
  const [reply, setReply] = useState(""); const [menu, setMenu] = useState(false); const [report, setReport] = useState(false); const [block, setBlock] = useState(false); const [hidden, setHidden] = useState(new Set());
  const list = groups.filter((g) => !hidden.has(g.author.public_username));
  const g = list[gi]; const item = g ? g.items[ii] : null;
  const vref = useRef(null);
  useEffect(() => { if (!g) onClose(); }, [g, onClose]);
  useEffect(() => { if (item && !hl) api("POST", `/api/v8/stories/${item.public_key}/view`); setT(0); }, [item?.public_key]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheetOpen = menu || report || block || Boolean(viewers) || hlSheet || removeAsk || Boolean(manage);
  useEffect(() => {
    if (!item || paused || sheetOpen) return undefined;
    const id = window.setInterval(() => setT((x) => x + 100), 100);
    return () => window.clearInterval(id);
  }, [item, paused, sheetOpen]);
  useEffect(() => { if (t >= DURATION) next(); }, [t]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  function next() { if (!g) return; if (ii < g.items.length - 1) setIi(ii + 1); else if (gi < list.length - 1) { setGi(gi + 1); setIi(0); } else onClose(); }
  function prev() { if (ii > 0) setIi(ii - 1); else if (gi > 0) { setGi(gi - 1); setIi(0); } }
  const sendReply = async () => {
    if (!signedIn) { onRequireLogin(); return; }
    if (!reply.trim()) return;
    const r = await api("POST", `/api/v8/stories/${item.public_key}/reply`, { text: reply });
    if (r.ok) { setReply(""); ui?.toast({ title: "Reply sent", message: `Only @${g.author.public_username} can see it.` }); } else ui?.toast({ kind: "error", title: "Reply not sent", message: r.json.message });
  };
  const react = async (e) => {
    if (!signedIn) { onRequireLogin(); return; }
    const r = await api("POST", `/api/v8/stories/${item.public_key}/react`, { reaction: e });
    if (r.ok) ui?.toast({ title: `You reacted ${e}` });
  };
  const mute = async () => {
    setMenu(false); if (!signedIn) { onRequireLogin(); return; }
    const who = g.author.public_username;
    const r = await api("POST", `/api/v8/creators/${who}/story-mute`);
    if (!r.ok) { ui?.toast({ kind: "error", title: "Couldn’t mute", message: r.json.message }); return; }
    setHidden((h) => new Set([...h, who]));
    ui?.toast({ title: `Stories from @${who} muted`, message: "They aren’t told. Unmute any time from Stories." });
  };
  const openViewers = async () => {
    setViewers({ status: "loading", items: [] });
    const r = await api("GET", `/api/v8/stories/${item.public_key}/viewers`);
    setViewers(r.ok ? { status: "ready", items: r.json.viewers || [], note: r.json.note } : { status: "error", items: [], message: r.json.message });
  };
  if (!g || !item) return null;
  const filter = (FILTERS.find((f) => f[0] === item.filter) || FILTERS[0])[2];
  // portalled to <body>: the page container is its own stacking context (z-index 800) and would sit under the shell bars
  return createPortal(
    <div className="v8s-viewer" role="dialog" aria-modal="true" aria-label={hl ? `Highlight ${g.title} by @${g.author.public_username}` : `Story by @${g.author.public_username}`}>
      <div className="v8s-frame">
        <div className="v8s-bars">{g.items.map((x, i) => <span key={x.public_key}><i style={{ width: i < ii ? "100%" : i === ii ? `${Math.min(100, (t / DURATION) * 100)}%` : "0%" }} /></span>)}</div>
        <header className="v8s-head">
          <button type="button" className="v8s-author" onClick={() => { onClose(); onOpenProfile(g.author.public_username); }}><Ava src={g.author.avatar_url} name={g.author.display_name} size={36} /><b>{hl ? g.title : g.mine ? "Your story" : g.author.display_name}</b><small>{hl ? `@${g.author.public_username} · highlight` : since(item.created_at)}</small></button>
          <button type="button" className="v8s-ico" aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}><V8Icon name={paused ? "play" : "pause"} size={20} /></button>
          {!g.mine && !hl ? <button type="button" className="v8s-ico" aria-label="More" onClick={() => setMenu(true)}><V8Icon name="more" size={20} /></button> : null}
          <button type="button" className="v8s-ico" aria-label="Close stories" onClick={onClose}><V8Icon name="x" size={22} /></button>
        </header>
        <div className="v8s-media" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)}>
          {item.media_type === "video" && safeVideo(item.media_url) ? <video ref={vref} src={item.media_url} autoPlay muted playsInline style={{ filter }} />
            : item.media_type === "image" && safeImg(item.media_url) ? <img src={item.media_url} alt={item.text || "Story"} style={{ filter }} />
            : <div className="v8s-textonly">{item.text}</div>}
          {item.text && item.media_type !== "text" ? <p className="v8s-caption">{item.text}</p> : null}
          <button type="button" className="v8s-tap prev" aria-label="Previous" onClick={prev} />
          <button type="button" className="v8s-tap next" aria-label="Next" onClick={next} />
        </div>
        {hl ? (
          <footer className="v8s-owner">
            <V8Icon name="star" size={18} /><span>{g.title} · {ii + 1} of {g.items.length}{item.audience ? ` · ${item.audience}` : ""}</span>
            {g.mine ? <button type="button" className="v8s-pill" onClick={() => { setManageErr(""); setManage("menu"); }}><V8Icon name="edit" size={16} />Manage</button> : null}
          </footer>
        ) : g.mine ? (
          <footer className="v8s-owner">
            <button type="button" className="v8s-pill" onClick={openViewers} aria-label={`${item.view_count || 0} viewers, ${item.reaction_count || 0} reactions, ${item.reply_count || 0} replies. Open viewer list`}><V8Icon name="eye" size={16} />{item.view_count || 0}<span aria-hidden="true"> · ❤️ {item.reaction_count || 0} · 💬 {item.reply_count || 0}</span></button>
            <button type="button" className="v8s-pill" onClick={() => setHlSheet(true)}><V8Icon name="star" size={16} />Add to highlight</button>
            <span className="v8c-muted">{item.audience || "Everyone"} · ends 24 h after posting</span>
          </footer>
        ) : (
          <footer className="v8s-foot">
            <input value={reply} onChange={(e) => setReply(e.target.value)} onFocus={() => { setPaused(true); if (!signedIn) onRequireLogin(); }} onBlur={() => setPaused(false)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} placeholder={`Reply to @${g.author.public_username}…`} aria-label="Reply privately" />
            {REACTIONS.slice(0, 3).map((e) => <button key={e} type="button" className="v8s-react" onClick={() => react(e)} aria-label={`React ${e}`}>{e}</button>)}
            <button type="button" className="v8s-ico" aria-label="Send reply" onClick={sendReply}><V8Icon name="send" size={20} /></button>
          </footer>
        )}
      </div>
      <Sheet open={menu} title={`@${g.author.public_username}`} onClose={() => setMenu(false)}>
        <button type="button" className="v8c-row" onClick={mute}><span className="v8c-row-ico"><V8Icon name="mute" size={20} /></span><span className="v8c-row-text"><b>Mute @{g.author.public_username}’s stories</b><small>Their stories stop appearing for you. They aren’t told.</small></span></button>
        <button type="button" className="v8c-row" onClick={() => { setMenu(false); if (!signedIn) { onRequireLogin(); return; } setReport(true); }}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report story</b></span></button>
        <button type="button" className="v8c-row danger" onClick={() => { setMenu(false); if (!signedIn) { onRequireLogin(); return; } setBlock(true); }}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{g.author.public_username}</b></span></button>
      </Sheet>
      <Sheet open={Boolean(viewers)} title="Story viewers" onClose={() => setViewers(null)}>
        {viewers && viewers.status === "loading" ? <div className="v8s-viewers">{[0, 1, 2].map((i) => <Skel key={i} h={44} />)}</div> : null}
        {viewers && viewers.status === "error" ? <p className="v8c-err" role="alert">{viewers.message || "Couldn’t load viewers."}</p> : null}
        {viewers && viewers.status === "ready" ? (viewers.items.length ? (
          <ul className="v8s-viewers" aria-label="People who viewed">{viewers.items.map((x) => (
            <li key={x.person.public_username}><button type="button" className="v8s-viewer-row" onClick={() => { setViewers(null); onClose(); onOpenProfile(x.person.public_username); }}>
              <Ava src={x.person.avatar_url} name={x.person.display_name} size={40} /><span><b>{x.person.display_name}</b><small>@{x.person.public_username} · {since(x.viewed_at)}</small></span>{x.reaction ? <em aria-label={`Reacted ${x.reaction}`}>{x.reaction}</em> : null}</button></li>))}</ul>
        ) : <p className="v8c-muted">No one has viewed this story yet.</p>) : null}
        {viewers && viewers.note ? <p className="v8c-muted v8s-note"><V8Icon name="info" size={14} /> {viewers.note}</p> : null}
      </Sheet>
      {hlSheet ? <HighlightPicker api={api} handle={g.author.public_username} story={item} onClose={() => setHlSheet(false)} /> : null}
      <Sheet open={manage === "menu"} title={`Manage “${g.title || "highlight"}”`} onClose={() => setManage(null)}>
        <button type="button" className="v8c-row" disabled={item.media_type !== "image"} onClick={async () => { const r = await api("POST", `/api/v8/highlights/${item.public_key}/cover`); setManage(null); if (r.ok) { ui?.toast({ title: "Cover updated" }); onRemoved?.(); } else ui?.toast({ kind: "error", title: "Cover not changed", message: r.json.message }); }}>
          <span className="v8c-row-ico"><V8Icon name="image" size={20} /></span><span className="v8c-row-text"><b>Use this as the cover</b><small>{item.media_type === "image" ? "Shown in the circle on your profile" : "Covers must be a photo"}</small></span></button>
        <button type="button" className="v8c-row" onClick={() => { setNewName(g.title || ""); setManage("rename"); }}><span className="v8c-row-ico"><V8Icon name="edit" size={20} /></span><span className="v8c-row-text"><b>Rename highlight</b></span></button>
        <button type="button" className="v8c-row" onClick={() => { setManage(null); setRemoveAsk(true); }}><span className="v8c-row-ico"><V8Icon name="x" size={20} /></span><span className="v8c-row-text"><b>Remove this item</b><small>The rest of the highlight stays</small></span></button>
        <button type="button" className="v8c-row danger" onClick={() => setManage("delete")}><span className="v8c-row-ico danger"><V8Icon name="trash" size={20} /></span><span className="v8c-row-text"><b>Delete highlight</b><small>{g.items.length === 1 ? "Removes its 1 item from your profile" : `Removes all ${g.items.length} items from your profile`}</small></span></button>
      </Sheet>
      <Sheet open={manage === "rename"} title="Rename highlight" onClose={() => setManage(null)}>
        <label className="v8c-field"><span>Name</span><input value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} autoFocus /></label>
        {manageErr ? <p className="v8c-err" role="alert">{manageErr}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setManage(null)}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={newName.trim().length < 2} onClick={async () => { const r = await api("POST", "/api/v8/highlights/rename", { title: g.title, to: newName }); if (r.ok) { setManage(null); ui?.toast({ title: `Renamed to “${r.json.title}”` }); onRemoved?.(); onClose(); } else setManageErr(r.json.message || "Couldn’t rename."); }}>Save</button></div>
      </Sheet>
      <V8Confirm open={manage === "delete"} danger title={`Delete “${g.title || "highlight"}”?`} body="All its items disappear from your profile. Your original stories aren’t affected." confirmLabel="Delete" onCancel={() => setManage(null)}
        onConfirm={async () => { const r = await api("DELETE", `/api/v8/highlights?title=${encodeURIComponent(g.title || "")}`); setManage(null); if (r.ok) { ui?.toast({ title: "Highlight deleted" }); onRemoved?.(); onClose(); } else ui?.toast({ kind: "error", title: "Couldn’t delete", message: r.json.message }); }} />
      <V8Confirm open={removeAsk} danger title={`Remove from “${g.title || "highlight"}”?`} body="It disappears from your profile. The original story isn’t affected." confirmLabel="Remove" onCancel={() => setRemoveAsk(false)}
        onConfirm={async () => { const r = await api("DELETE", `/api/v8/highlights/${item.public_key}`); setRemoveAsk(false); if (r.ok) { ui?.toast({ title: "Removed from highlight" }); onRemoved?.(); onClose(); } else ui?.toast({ kind: "error", title: "Couldn’t remove", message: r.json.message }); }} />
      <ReportSheet open={report} what="story" onClose={() => setReport(false)} onSubmit={(reason, details) => api("POST", `/api/v8/stories/${item.public_key}/report`, { reason, details })} />
      <V8Confirm open={block} danger title={`Block @${g.author.public_username}?`} body="They won’t see your stories, posts or Vibes and can’t message you." confirmLabel="Block" onCancel={() => setBlock(false)}
        onConfirm={async () => { const r = await api("POST", `/api/v8/creators/${g.author.public_username}/block`); setBlock(false); if (r.ok) { setHidden((h) => new Set([...h, g.author.public_username])); ui?.toast({ title: `@${g.author.public_username} is blocked` }); } }} />
    </div>, document.body);
}

export function StoryCreate({ api, onClose, onPosted }) {
  const ui = useV8Ui();
  const [media, setMedia] = useState(null); const [text, setText] = useState(""); const [aud, setAud] = useState("everyone"); const [filter, setFilter] = useState("none");
  const [step, setStep] = useState("edit"); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const pick = async (f) => {
    if (!f) return; setErr("");
    const video = /^video\/(mp4|webm)$/.test(f.type); const image = /^image\/(jpeg|png|webp)$/.test(f.type);
    if (!video && !image) { setErr("This file is unsupported. Use JPG, PNG, WebP, MP4 or WebM."); return; }
    if (f.size > (video ? 20 : 5) * 1024 * 1024) { setErr("This file is too large. Images up to 5 MB · videos up to 20 MB."); return; }
    setMedia({ data: await readFileAsDataUrl(f), type: video ? "video" : "image" });
  };
  const share = async () => {
    setBusy(true); setErr("");
    const r = await api("POST", "/api/v8/stories", { text, audience: aud, mediaData: media ? media.data : undefined, filterName: filter });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Your story wasn’t shared. Please try again."); setStep("edit"); return; }
    ui?.toast({ title: "Story shared", message: `Visible to ${AUD.find((a) => a[0] === aud)[1]} for 24 hours.` }); onPosted();
  };
  const css = (FILTERS.find((f) => f[0] === filter) || FILTERS[0])[2];
  return (
    <Sheet open title={step === "preview" ? "Preview story" : "Create story"} onClose={onClose} wide>
      <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(e) => { pick(e.target.files[0]); e.target.value = ""; }} data-testid="story-file" />
      <div className="v8s-create">
        <div className="v8s-create-media">
          {media ? (media.type === "video" ? <video src={media.data} muted autoPlay loop playsInline style={{ filter: css }} /> : <img src={media.data} alt="Story preview" style={{ filter: css }} />)
            : <button type="button" className="v8vc-drop" onClick={() => ref.current?.click()}><span><V8Icon name="camera" size={30} /></span><b>Add a photo or video</b><small>Images up to 5 MB · video up to 20 MB</small></button>}
          {text && media ? <p className="v8s-caption">{text}</p> : null}
          {media ? <button type="button" className="v8-btn v8s-edit" onClick={() => ref.current?.click()}><V8Icon name="edit" size={16} />Change</button> : null}
        </div>
        {step === "edit" ? (
          <div className="v8s-create-form">
            <label className="v8c-field"><span>Text</span><input value={text} maxLength={280} onChange={(e) => setText(e.target.value)} placeholder="Add text to your story" /></label>
            <div className="v8c-field"><span>Filter</span><div className="v8c-chips">{FILTERS.map(([k, l]) => <button key={k} type="button" className={`v8c-chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
            <div className="v8c-field"><span>Story privacy</span>
              <div className="v8s-aud">{AUD.map(([v, l, ic]) => <button key={v} type="button" className={aud === v ? "on" : ""} aria-pressed={aud === v} onClick={() => setAud(v)}><V8Icon name={ic} size={18} />{l}</button>)}</div></div>
            {err ? <p className="v8c-err" role="alert">{err}</p> : null}
            <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={!media && !text.trim()} onClick={() => setStep("preview")}>Preview</button></div>
          </div>
        ) : (
          <div className="v8s-create-form">
            <p className="v8c-muted">Visible to <b>{AUD.find((a) => a[0] === aud)[1]}</b> for 24 hours. You can’t edit a story after sharing.</p>
            {err ? <p className="v8c-err" role="alert">{err}</p> : null}
            <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setStep("edit")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={share}>{busy ? "Sharing…" : "Share story"}</button></div>
          </div>
        )}
      </div>
    </Sheet>
  );
}


// Add a story to an existing highlight or a new one. The highlight keeps the story's audience.
function HighlightPicker({ api, handle, story, onClose }) {
  const ui = useV8Ui();
  const [list, setList] = useState(null); const [title, setTitle] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { let on = true; api("GET", `/api/v8/creators/${handle}/highlights`).then((r) => { if (on) setList(r.ok ? r.json.highlights || [] : []); }); return () => { on = false; }; }, [api, handle]);
  const save = async (t) => {
    const name = String(t || "").trim(); if (name.length < 2) { setErr("Name the highlight (2–40 characters)."); return; }
    setBusy(true); setErr("");
    const r = await api("POST", `/api/v8/stories/${story.public_key}/highlight`, { title: name });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Couldn’t add it. Please try again."); return; }
    ui?.toast({ title: `Added to “${r.json.title}”`, message: `Visible to ${r.json.audience} on your profile.` }); onClose();
  };
  return (
    <Sheet open title="Add to highlight" onClose={onClose}>
      <p className="v8c-muted">Highlights stay on your profile after the story ends. People see it only if they could see the story ({story.audience || "Everyone"}).</p>
      {list === null ? <Skel h={56} /> : list.length ? (
        <div className="v8s-hl-pick" role="list">{list.map((h) => (
          <button key={h.title} type="button" role="listitem" disabled={busy} onClick={() => save(h.title)}>
            <span className="v8s-hl-ring">{safeImg(h.cover_url) ? <img src={h.cover_url} alt="" /> : <V8Icon name="star" size={20} />}</span><b>{h.title}</b><small>{h.count} {h.count === 1 ? "item" : "items"}</small>
          </button>))}</div>
      ) : null}
      <label className="v8c-field"><span>New highlight</span><input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New drops, Behind the scenes" onKeyDown={(e) => { if (e.key === "Enter") save(title); }} /></label>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy || title.trim().length < 2} onClick={() => save(title)}>{busy ? "Adding…" : "Create & add"}</button></div>
    </Sheet>
  );
}

// Profile highlights row (board 12 profile header). Opens the story viewer in highlight mode.
export function HighlightsRow({ api, handle, signedIn, onRequireLogin, onOpenProfile }) {
  const [data, setData] = useState(null); const [open, setOpen] = useState(null); const [reload, setReload] = useState(0);
  useEffect(() => { let on = true; api("GET", `/api/v8/creators/${handle}/highlights`).then((r) => { if (on) setData(r.ok ? r.json : { highlights: [] }); }); return () => { on = false; }; }, [api, handle, reload]);
  if (!data || !data.highlights || !data.highlights.length || !data.author) return null;
  const groups = data.highlights.map((h) => ({ ...h, author: data.author, mine: data.mine }));
  return (
    <section className="v8s-hl-row" aria-label="Highlights">
      {groups.map((h, i) => (
        <button key={h.title} type="button" className="v8s-hl" onClick={() => setOpen(i)} aria-label={`Open highlight ${h.title}, ${h.count} items`}>
          <span className="v8s-hl-ring">{safeImg(h.cover_url) ? <img src={h.cover_url} alt="" /> : <V8Icon name="star" size={22} />}</span><small>{h.title}</small>
        </button>))}
      {open !== null ? <StoryViewer mode="highlight" groups={groups} start={open} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} onRemoved={() => setReload((n) => n + 1)} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

// /connect/stories — every story ring you can see, plus the members whose stories you muted (Unmute).
export function StoriesPage({ api, user, onRequireLogin, onOpenProfile, onOpenStory, onCreateStory, onNav }) {
  const ui = useV8Ui();
  const [st, setSt] = useState({ status: "loading", items: [] }); const [muted, setMuted] = useState([]); const [reload, setReload] = useState(0);
  useEffect(() => {
    let on = true; setSt((x) => ({ ...x, status: "loading" }));
    api("GET", "/api/v8/connect/stories").then((r) => { if (on) setSt(r.ok ? { status: "ready", items: r.json.stories || [] } : { status: "error", items: [], message: r.json.message }); });
    if (user) api("GET", "/api/v8/stories/muted").then((r) => { if (on) setMuted(r.ok ? r.json.muted || [] : []); });
    return () => { on = false; };
  }, [api, user, reload]);
  const unmute = async (h) => { const r = await api("DELETE", `/api/v8/creators/${h}/story-mute`); if (r.ok) { ui?.toast({ title: `@${h} unmuted`, message: "Their stories appear again." }); setReload((n) => n + 1); } };
  return (
    <div className="v8s-page">
      <header className="v8vc-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={() => onNav("")}><V8Icon name="back" size={22} /></button><h1>Stories</h1>
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => (user ? onCreateStory() : onRequireLogin())}><V8Icon name="plus" size={18} />Add story</button></header>
      <section className="v8-card v8s-page-card">
        <h2>Watching now</h2><p className="v8c-muted">Stories disappear 24 hours after they’re shared. Tap a ring to watch.</p>
        {st.status === "loading" ? <div className="v8s-grid">{[0, 1, 2, 3].map((i) => <Skel key={i} h={120} r={16} />)}</div> : null}
        {st.status === "error" ? <p className="v8c-err" role="alert">{st.message || "Couldn’t load stories."} <button type="button" className="v8-link" onClick={() => setReload((n) => n + 1)}>Retry</button></p> : null}
        {st.status === "ready" && !st.items.length ? <p className="v8c-muted">No stories right now.</p> : null}
        {st.status === "ready" && st.items.length ? (
          <div className="v8s-grid">{st.items.map((g, i) => (
            <button key={g.author.public_username} type="button" className={`v8s-tile ${g.seen_all ? "seen" : ""}`} onClick={() => onOpenStory(st.items, i)}>
              <span className="v8s-tile-ring"><Ava src={g.author.avatar_url} name={g.author.display_name} size={64} /></span>
              <b>{g.mine ? "Your story" : `@${g.author.public_username}`}</b><small>{g.items.length} {g.items.length === 1 ? "story" : "stories"} · {since(g.latest_at)}</small>
              {g.mine && g.items[0] ? <small className="v8s-tile-views"><V8Icon name="eye" size={14} />{g.items.reduce((a, x) => a + (x.view_count || 0), 0)} views</small> : null}
            </button>))}</div>
        ) : null}
      </section>
      {user ? (
        <section className="v8-card v8s-page-card">
          <h2>Muted stories</h2><p className="v8c-muted">You won’t see stories from these people. They aren’t told you muted them.</p>
          {muted.length ? <ul className="v8s-viewers">{muted.map((x) => (
            <li key={x.person.public_username} className="v8s-viewer-row static"><Ava src={x.person.avatar_url} name={x.person.display_name} size={40} /><span><b>{x.person.display_name}</b><small>@{x.person.public_username} · muted {since(x.since)}</small></span>
              <button type="button" className="v8-btn v8-btn-soft" onClick={() => unmute(x.person.public_username)}>Unmute</button></li>))}</ul>
            : <p className="v8c-muted">You haven’t muted anyone’s stories.</p>}
        </section>
      ) : null}
    </div>
  );
}

// HOWDI V8 Create Vibe — VIB create/upload (board 32 panel 5 "Create Vibe", SUP-03 panel 4, PRIOR-07 panel 2, board 14).
// Video / Photo, media pick + preview + cover, caption (2,200), hashtags as categories, audience, optional linked item
// (Product · Course · Community · Profile), captions switch, remix of an existing Vibe, save draft (text only, this device),
// upload progress, too-large / unsupported / failed-upload retry, published → open the new Vibe.
// Slice 2: record in the app and trim (VibeCapture), rights declaration — held for a rights check when needed.
import { useEffect, useRef, useState } from "react";
import { V8Icon } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { Sheet, readFileAsDataUrl, safeImg, RightsField } from "./common";
import { RecordSheet, TrimSheet } from "./VibeCapture";

const DRAFT_KEY = "howdi.v8.vibeDraft";
const AUD = [{ v: "public", l: "Public", s: "Anyone on HOWDI" }, { v: "followers", l: "Followers", s: "Only people who follow you" }, { v: "private", l: "Only me", s: "Private — only you" }];
const LIMITS = { video: 20 * 1024 * 1024, image: 5 * 1024 * 1024 };

export default function VibeCreate({ api, apiBase, getAuthHeaders, user, remixOf, onDone, onCancel, onNav }) {
  const ui = useV8Ui();
  const [kind, setKind] = useState("video");
  const [file, setFile] = useState(null); // {data, type, name, size}
  const [cover, setCover] = useState(null);
  const [caption, setCaption] = useState("");
  const [cats, setCats] = useState([]); const [picked, setPicked] = useState([]);
  const [aud, setAud] = useState("public");
  const [captions, setCaptions] = useState(true);
  const [link, setLink] = useState(null);
  const [rights, setRights] = useState({ rights: "original", rights_note: "" });
  const [sheet, setSheet] = useState("");
  const [state, setState] = useState({ phase: "edit", progress: 0, error: "" });
  const [remix, setRemix] = useState(null);
  const [q, setQ] = useState(""); const [results, setResults] = useState([]); const [groups, setGroups] = useState([]);
  const fileRef = useRef(null); const coverRef = useRef(null);

  useEffect(() => { api("GET", "/api/v8/vibes/categories").then((r) => r.ok && setCats(r.json.categories || [])); }, [api]);
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); if (d && !remixOf) { setCaption(d.caption || ""); setPicked(d.picked || []); setAud(d.aud || "public"); setCaptions(d.captions !== false); } } catch { /* none */ } }, [remixOf]);
  useEffect(() => { if (!remixOf) { setRemix(null); return; } api("GET", `/api/v8/vibes/${remixOf}`).then((r) => setRemix(r.ok ? r.json.vibe : "gone")); }, [api, remixOf]);

  const choose = async (f) => {
    if (!f) return;
    const isVideo = /^video\/(mp4|webm|quicktime)$/.test(f.type); const isImage = /^image\/(jpeg|png|webp)$/.test(f.type);
    if (!isVideo && !isImage) { setState({ phase: "edit", progress: 0, error: "That file type isn’t supported. Use MP4, WebM or MOV video, or a JPG, PNG or WebP photo." }); return; }
    if (f.size > (isVideo ? LIMITS.video : LIMITS.image)) { setState({ phase: "edit", progress: 0, error: isVideo ? "This video is too large. Videos can be up to 20 MB." : "This photo is too large. Photos can be up to 5 MB." }); return; }
    const data = await readFileAsDataUrl(f);
    setFile({ data, type: isVideo ? "video" : "image", name: f.name, size: f.size }); setKind(isVideo ? "video" : "image"); setState({ phase: "edit", progress: 0, error: "" });
  };
  const searchLinks = async (term) => {
    setQ(term);
    if (term.trim().length < 2) { setResults([]); return; }
    const r = await api("GET", `/api/search?q=${encodeURIComponent(term.trim())}`);
    const list = r.ok ? (r.json.results || []).filter((x) => x.type === "product" || x.type === "course").map((x) => ({ kind: x.type, code: (String(x.route).match(/(PRD|CRS)-[0-9A-F]{12}/) || [])[0], label: x.title, sub: x.subtitle })) : [];
    setResults(list.filter((x) => x.code));
  };
  useEffect(() => { if (sheet === "link") api("GET", "/api/v8/connect/hub").then((r) => r.ok && setGroups([...(r.json.rails.groups || []), ...(r.json.rails.channels || [])])); }, [api, sheet]);

  const saveDraft = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ caption, picked, aud, captions })); ui?.toast({ title: "Draft saved on this device", message: "Your caption and settings are saved. Add the video again when you’re ready." }); } catch { ui?.toast({ kind: "error", title: "Couldn’t save draft" }); } };
  const post = () => {
    if (!file) { setState({ phase: "edit", progress: 0, error: "Add a video or photo first." }); return; }
    if (rights.rights === "licensed" && rights.rights_note.trim().length < 6) { setState({ phase: "edit", progress: 0, error: "Say where the licence or permission comes from." }); return; }
    setState({ phase: "uploading", progress: 0, error: "" });
    const body = JSON.stringify({ caption, audience: aud, mediaData: file.data, coverData: cover ? cover.data : undefined, categories: picked, captions, link: link || undefined, remixOf: remix && remix !== "gone" ? remix.public_key : undefined, rights: rights.rights, rights_note: rights.rights_note });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${String(apiBase || "").replace(/\/+$/, "")}/api/v8/vibes`);
    xhr.setRequestHeader("Content-Type", "application/json"); xhr.setRequestHeader("Accept", "application/json");
    try { const h = getAuthHeaders ? getAuthHeaders() : {}; Object.entries(h).forEach(([k, v]) => xhr.setRequestHeader(k, v)); } catch { /* guest */ }
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setState((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) })); };
    xhr.onerror = () => setState({ phase: "failed", progress: 0, error: "Upload failed. Check your connection — nothing was posted." });
    xhr.onload = () => {
      let json = {}; try { json = JSON.parse(xhr.responseText || "{}"); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && json.vibe) {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        if (json.rights_review) { setState({ phase: "held", progress: 100, error: "", message: json.rights_review.message }); return; }
        setState({ phase: "done", progress: 100, error: "" });
        ui?.toast({ title: "Your Vibe is live!", message: aud === "public" ? "Everyone on HOWDI can see it." : aud === "followers" ? "Your followers can see it." : "Only you can see it." });
        window.setTimeout(() => onDone(json.vibe.public_key), 600);
      } else setState({ phase: "failed", progress: 0, error: json.message || "We couldn’t process your upload. Please try again." });
    };
    xhr.send(body);
  };
  const count = caption.length;
  return (
    <div className="v8vc">
      <header className="v8vc-head">
        <button type="button" className="v8-icon-btn" aria-label="Back" onClick={onCancel}><V8Icon name="back" size={22} /></button>
        <h1>{remix && remix !== "gone" ? "Remix Vibe" : "Create a Vibe"}</h1>
        <button type="button" className="v8-icon-btn" aria-label="Close" onClick={onCancel}><V8Icon name="x" size={22} /></button>
      </header>
      {remix && remix !== "gone" ? <div className="v8vc-remix"><img src={safeImg(remix.cover_url) || ""} alt="" /><span><small>Remixing</small><b>@{remix.author.public_username}</b><small>{remix.caption.slice(0, 70)}</small></span></div> : null}
      {remix === "gone" ? <p className="v8c-err" role="alert">The original Vibe is no longer available to remix. You can still post your own Vibe.</p> : null}
      <div className="v8vc-grid">
        <section className="v8vc-media">
          <div className="v8c-seg" role="tablist" aria-label="Type">
            <button type="button" role="tab" aria-selected={kind === "video"} className={kind === "video" ? "on" : ""} onClick={() => setKind("video")}><V8Icon name="video" size={18} />Video</button>
            <button type="button" role="tab" aria-selected={kind === "image"} className={kind === "image" ? "on" : ""} onClick={() => setKind("image")}><V8Icon name="image" size={18} />Photo</button>
          </div>
          <input ref={fileRef} type="file" hidden accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"} onChange={(e) => { choose(e.target.files[0]); e.target.value = ""; }} data-testid="vibe-file" />
          <input ref={coverRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (f.size > 4 * 1024 * 1024) { setState((s) => ({ ...s, error: "Cover images can be up to 4 MB." })); return; } setCover({ data: await readFileAsDataUrl(f) }); }} data-testid="vibe-cover" />
          {file ? (
            <div className="v8vc-preview">
              {file.type === "video" ? <video src={file.data} poster={cover ? cover.data : undefined} controls playsInline muted /> : <img src={file.data} alt="Selected photo" />}
              <div className="v8vc-preview-actions">
                {file.type === "video" ? <button type="button" className="v8-btn" onClick={() => coverRef.current?.click()}><V8Icon name="image" size={16} />{cover ? "Change cover" : "Edit cover"}</button> : null}
                {file.type === "video" ? <button type="button" className="v8-btn" onClick={() => setSheet("trim")}><V8Icon name="sliders" size={16} />{file.trimmed ? "Trim again" : "Trim"}</button> : null}
                <button type="button" className="v8-btn" onClick={() => fileRef.current?.click()}><V8Icon name="refresh" size={16} />Replace</button>
                <button type="button" className="v8-btn" onClick={() => { setFile(null); setCover(null); }}><V8Icon name="trash" size={16} />Remove</button>
              </div>
              <small className="v8c-muted">{file.name} · {(file.size / 1048576).toFixed(1)} MB</small>
            </div>
          ) : (
            <div className="v8vc-start">
              <button type="button" className="v8vc-drop" onClick={() => fileRef.current?.click()}>
                <span><V8Icon name={kind === "video" ? "video" : "image"} size={34} /></span>
                <b>{kind === "video" ? "Upload a video" : "Upload a photo"}</b>
                <small>{kind === "video" ? "MP4, WebM or MOV · up to 20 MB · vertical 9:16 works best" : "JPG, PNG or WebP · up to 5 MB"}</small>
              </button>
              {kind === "video" ? <button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => setSheet("record")}><V8Icon name="camera" size={18} />Record in HOWDI</button> : null}
            </div>
          )}
        </section>
        <section className="v8vc-form">
          <label className="v8c-field"><span>Caption</span>
            <textarea rows={4} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something about your Vibe… add #hashtags" />
            <small className={`v8vc-count ${count > 2100 ? "warn" : ""}`}>{count}/2,200</small></label>
          <div className="v8c-field"><span>Topics</span>
            <div className="v8c-chips">{cats.map((c) => { const on = picked.includes(c.slug); return <button key={c.slug} type="button" className={`v8c-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.slug) : p.length < 3 ? [...p, c.slug] : p))}>{on ? <V8Icon name="check" size={14} /> : null}{c.name}</button>; })}</div>
            <small className="v8c-muted">Choose up to 3.</small></div>
          <button type="button" className="v8c-row" onClick={() => setSheet("aud")}><span className="v8c-row-ico"><V8Icon name="globe" size={20} /></span><span className="v8c-row-text"><b>Audience</b><small>{AUD.find((a) => a.v === aud).l}</small></span><V8Icon name="chevr" size={18} /></button>
          <button type="button" className="v8c-row" onClick={() => setSheet("link")}><span className="v8c-row-ico"><V8Icon name="link" size={20} /></span><span className="v8c-row-text"><b>Add linked item (optional)</b><small>{link ? `${link.kindLabel}: ${link.label}` : "Product, course, community or profile"}</small></span>{link ? <button type="button" className="v8-link" onClick={(e) => { e.stopPropagation(); setLink(null); }}>Remove</button> : <V8Icon name="chevr" size={18} />}</button>
          <label className="v8c-switch-row"><span><b>Add captions</b><small>Show captions to viewers when available</small></span><input type="checkbox" role="switch" checked={captions} onChange={(e) => setCaptions(e.target.checked)} /></label>
          <RightsField value={rights.rights} note={rights.rights_note} onChange={(k, v) => setRights((x) => ({ ...x, [k]: v }))} />
          {state.error ? <div className="v8c-err-box" role="alert"><V8Icon name="alert" size={18} /><span>{state.error}</span>{state.phase === "failed" ? <button type="button" className="v8-btn v8-btn-soft" onClick={post}>Retry</button> : null}</div> : null}
          {state.phase === "uploading" ? <div className="v8c-upload" role="status"><span>Uploading… {state.progress}%</span><div className="v8c-progress"><i style={{ width: `${state.progress}%` }} /></div></div> : null}
          {state.phase === "done" ? <div className="v8c-ok-box" role="status"><V8Icon name="check" size={18} />Posted! Opening your Vibe…</div> : null}
          {state.phase === "held" ? <div className="v8c-warn-box" role="status"><V8Icon name="shield" size={18} /><span><b>Waiting for a rights check</b>{state.message}</span>{onNav ? <button type="button" className="v8-btn" onClick={() => onNav("creator?tab=safety")}>View status</button> : null}</div> : null}
          <div className="v8vc-actions">
            <button type="button" className="v8-btn" onClick={saveDraft} disabled={state.phase === "uploading"}>Save draft</button>
            <button type="button" className="v8-btn v8-btn-primary" onClick={post} disabled={state.phase === "uploading" || state.phase === "done" || state.phase === "held" || !file}>Post Vibe</button>
          </div>
        </section>
      </div>
      <RecordSheet open={sheet === "record"} onClose={() => setSheet("")} onUse={(f) => { setFile(f); setKind("video"); setState({ phase: "edit", progress: 0, error: "" }); }} />
      <TrimSheet open={sheet === "trim"} file={file} onClose={() => setSheet("")} onTrimmed={(f) => { setFile(f); ui?.toast({ title: "Video trimmed", message: f.name.replace(/\.webm$/, "") }); }} />
      <Sheet open={sheet === "aud"} title="Audience" onClose={() => setSheet("")}>
        {AUD.map((a) => <label key={a.v} className={`v8c-aud ${aud === a.v ? "on" : ""}`}><input type="radio" name="v8vc-aud" checked={aud === a.v} onChange={() => { setAud(a.v); setSheet(""); }} /><V8Icon name={a.v === "public" ? "globe" : a.v === "followers" ? "users" : "lock"} size={20} /><span><b>{a.l}</b><small>{a.s}</small></span></label>)}
      </Sheet>
      <Sheet open={sheet === "link"} title="Add linked item" onClose={() => setSheet("")}>
        <label className="v8c-field"><span>Search your products and courses</span><input value={q} onChange={(e) => searchLinks(e.target.value)} placeholder="e.g. clutch, crochet basics" /></label>
        {results.map((x) => <button key={x.code} type="button" className="v8c-row" onClick={() => { setLink({ kind: x.kind, code: x.code, label: x.label, kindLabel: x.kind === "product" ? "Product" : "Course" }); setSheet(""); }}><span className="v8c-row-ico"><V8Icon name={x.kind === "product" ? "shop" : "learn"} size={20} /></span><span className="v8c-row-text"><b>{x.label}</b><small>{x.kind === "product" ? "Product" : "Course"}{x.sub ? ` · ${x.sub}` : ""}</small></span><V8Icon name="plus" size={18} /></button>)}
        {q.trim().length >= 2 && !results.length ? <p className="v8c-muted">No products or courses match “{q}”.</p> : null}
        <h3 className="v8c-sheet-h">Communities</h3>
        {groups.map((g) => <button key={g.public_key} type="button" className="v8c-row" onClick={() => { setLink({ kind: "community", slug: g.public_key, label: g.name, kindLabel: "Community" }); setSheet(""); }}><span className="v8c-row-ico"><V8Icon name="users" size={20} /></span><span className="v8c-row-text"><b>{g.name}</b><small>{g.kind === "channel" ? "Channel" : "Group"}</small></span><V8Icon name="plus" size={18} /></button>)}
        {user?.public_username ? <><h3 className="v8c-sheet-h">Profile</h3><button type="button" className="v8c-row" onClick={() => { setLink({ kind: "profile", handle: user.public_username, label: `@${user.public_username}`, kindLabel: "Profile" }); setSheet(""); }}><span className="v8c-row-ico"><V8Icon name="user" size={20} /></span><span className="v8c-row-text"><b>@{user.public_username}</b><small>Your profile</small></span><V8Icon name="plus" size={18} /></button></> : null}
      </Sheet>
    </div>
  );
}

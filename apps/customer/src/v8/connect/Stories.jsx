// HOWDI V8 Stories — viewer + create (board 32 top-left desktop + mobile panels 1–2, SUP-01, board 06 stories rail).
// Viewer: progress bars, pause, prev/next, reply (private), reactions, report / block, owner privacy summary.
// Create: image or video, text, filter, audience (Everyone / Friends / Close Friends / Only Me), preview, share.
import { useEffect, useRef, useState } from "react";
import { V8Icon } from "../V8Shell";
import { V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, since, safeImg, safeVideo, readFileAsDataUrl } from "./common";

const DURATION = 6000;
const REACTIONS = ["❤️", "👏", "🔥", "✨", "😂"];
const AUD = [["everyone", "Everyone", "globe"], ["friends", "Friends", "users"], ["close_friends", "Close Friends", "star"], ["only_me", "Only Me", "lock"]];
const FILTERS = [["none", "Original", "none"], ["warm", "Warm", "sepia(.25) saturate(1.2)"], ["cool", "Cool", "hue-rotate(-12deg) saturate(1.1)"], ["mono", "Mono", "grayscale(1)"]];

export function StoryViewer({ groups, start, api, signedIn, onRequireLogin, onClose, onOpenProfile }) {
  const ui = useV8Ui();
  const [gi, setGi] = useState(start || 0); const [ii, setIi] = useState(0); const [paused, setPaused] = useState(false); const [t, setT] = useState(0);
  const [reply, setReply] = useState(""); const [menu, setMenu] = useState(false); const [report, setReport] = useState(false); const [block, setBlock] = useState(false); const [hidden, setHidden] = useState(new Set());
  const list = groups.filter((g) => !hidden.has(g.author.public_username));
  const g = list[gi]; const item = g ? g.items[ii] : null;
  const vref = useRef(null);
  useEffect(() => { if (!g) onClose(); }, [g, onClose]);
  useEffect(() => { if (item) api("POST", `/api/v8/stories/${item.public_key}/view`); setT(0); }, [item?.public_key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!item || paused || menu || report || block) return undefined;
    const id = window.setInterval(() => setT((x) => x + 100), 100);
    return () => window.clearInterval(id);
  }, [item, paused, menu, report, block]);
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
  if (!g || !item) return null;
  const filter = (FILTERS.find((f) => f[0] === item.filter) || FILTERS[0])[2];
  return (
    <div className="v8s-viewer" role="dialog" aria-modal="true" aria-label={`Story by @${g.author.public_username}`}>
      <div className="v8s-frame">
        <div className="v8s-bars">{g.items.map((x, i) => <span key={x.public_key}><i style={{ width: i < ii ? "100%" : i === ii ? `${Math.min(100, (t / DURATION) * 100)}%` : "0%" }} /></span>)}</div>
        <header className="v8s-head">
          <button type="button" className="v8s-author" onClick={() => { onClose(); onOpenProfile(g.author.public_username); }}><Ava src={g.author.avatar_url} name={g.author.display_name} size={36} /><b>{g.mine ? "Your story" : g.author.display_name}</b><small>{since(item.created_at)}</small></button>
          <button type="button" className="v8s-ico" aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}><V8Icon name={paused ? "play" : "pause"} size={20} /></button>
          {!g.mine ? <button type="button" className="v8s-ico" aria-label="More" onClick={() => setMenu(true)}><V8Icon name="more" size={20} /></button> : null}
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
        {g.mine ? (
          <footer className="v8s-owner"><V8Icon name="eye" size={18} /><span>Seen by your audience · {item.audience || "Everyone"}</span><span className="v8c-muted">Expires 24 h after posting</span></footer>
        ) : (
          <footer className="v8s-foot">
            <input value={reply} onChange={(e) => setReply(e.target.value)} onFocus={() => { setPaused(true); if (!signedIn) onRequireLogin(); }} onBlur={() => setPaused(false)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} placeholder={`Reply to @${g.author.public_username}…`} aria-label="Reply privately" />
            {REACTIONS.slice(0, 3).map((e) => <button key={e} type="button" className="v8s-react" onClick={() => react(e)} aria-label={`React ${e}`}>{e}</button>)}
            <button type="button" className="v8s-ico" aria-label="Send reply" onClick={sendReply}><V8Icon name="send" size={20} /></button>
          </footer>
        )}
      </div>
      <Sheet open={menu} title={`@${g.author.public_username}`} onClose={() => setMenu(false)}>
        <button type="button" className="v8c-row" onClick={() => { setMenu(false); if (!signedIn) { onRequireLogin(); return; } setHidden((h) => new Set([...h, g.author.public_username])); ui?.toast({ title: `Stories from @${g.author.public_username} hidden for now` }); }}><span className="v8c-row-ico"><V8Icon name="mute" size={20} /></span><span className="v8c-row-text"><b>Mute @{g.author.public_username}</b><small>Skip their stories</small></span></button>
        <button type="button" className="v8c-row" onClick={() => { setMenu(false); if (!signedIn) { onRequireLogin(); return; } setReport(true); }}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report story</b></span></button>
        <button type="button" className="v8c-row danger" onClick={() => { setMenu(false); if (!signedIn) { onRequireLogin(); return; } setBlock(true); }}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{g.author.public_username}</b></span></button>
      </Sheet>
      <ReportSheet open={report} what="story" onClose={() => setReport(false)} onSubmit={(reason, details) => api("POST", `/api/v8/stories/${item.public_key}/report`, { reason, details })} />
      <V8Confirm open={block} danger title={`Block @${g.author.public_username}?`} body="They won’t see your stories, posts or Vibes and can’t message you." confirmLabel="Block" onCancel={() => setBlock(false)}
        onConfirm={async () => { const r = await api("POST", `/api/v8/creators/${g.author.public_username}/block`); setBlock(false); if (r.ok) { setHidden((h) => new Set([...h, g.author.public_username])); ui?.toast({ title: `@${g.author.public_username} is blocked` }); } }} />
    </div>
  );
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

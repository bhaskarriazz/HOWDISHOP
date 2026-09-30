// HOWDI V8 Messages extras — MSG-001 attachment drawer, MSG-004/005/006 product · group · worker cards, MSG-007 view-once
// photo / video. Cards are sent as public refs and rendered from what the server resolves for THIS viewer (a product taken
// down or a private group shows as unavailable). View-once media is fetched once, shown full screen, and gone when closed.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { V8Icon } from "../V8Shell";
import { Ava, Sheet, Skel, safeImg, readFileAsDataUrl } from "./common";
import { inr } from "./HPayUtilities";

// MSG-001 — the "+" drawer
export function AttachDrawer({ open, canPay, onPick, onClose }) {
  const T = ({ k, icon, label, sub }) => <button type="button" className="v8x-tile" onClick={() => onPick(k)}><span className="v8x-tile-ico"><V8Icon name={icon} size={22} /></span><b>{label}</b>{sub ? <small>{sub}</small> : null}</button>;
  return (
    <Sheet open={open} title="Share in chat" onClose={onClose}>
      <h3 className="v8c-sheet-h">Media</h3>
      <div className="v8x-tiles"><T k="photo" icon="image" label="Photo" /><T k="viewonce" icon="eye" label="View once" sub="Photo or video" /></div>
      <h3 className="v8c-sheet-h">From HOWDI</h3>
      <div className="v8x-tiles"><T k="card:product" icon="shop" label="Product" sub="From Shop" /><T k="card:community" icon="users" label="Group" sub="Invite to join" /><T k="card:worker" icon="works" label="Worker" sub="From Works" /></div>
      {canPay ? (<>
        <h3 className="v8c-sheet-h">HPay <small className="v8-pill-test">Preview / Test</small></h3>
        <div className="v8x-tiles">
          <T k="pay:send" icon="wallet" label="Send money" /><T k="pay:request" icon="rupee" label="Request" />
          <T k="util:recharge" icon="phone" label="Recharge" sub="Yours or ask them" /><T k="util:bill" icon="bolt" label="Bills" />
          <T k="util:ticket" icon="ticket" label="Tickets" /><T k="util:giftcard" icon="gift" label="Gift card" />
          <T k="qr" icon="qr" label="QR pay" /><T k="history" icon="list" label="HPay activity" />
        </div>
      </>) : <p className="v8c-muted">HPay is available in one-to-one chats once you can message each other.</p>}
    </Sheet>
  );
}

// Search + pick something to share as a card
const LABEL = { product: "Share a product", community: "Invite to a group", worker: "Share a worker" };
export function CardPicker({ api, type, onSend, onClose }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState({ status: "idle", items: [] }); const [pick, setPick] = useState(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => {
    const term = q.trim(); if (type !== "community" && term.length < 2) { setRes({ status: "idle", items: [] }); return undefined; }
    const t = window.setTimeout(async () => {
      setRes((x) => ({ ...x, status: "loading" }));
      if (type === "community") {
        const r = await api("GET", `/api/v8/communities?type=${term ? "all" : "mine"}${term ? `&q=${encodeURIComponent(term)}` : ""}`);
        setRes({ status: r.ok ? "ready" : "error", items: r.ok ? (r.json.items || []).map((c) => ({ ref: c.public_key, title: c.name, sub: `${c.kind === "channel" ? "Channel" : "Group"} · ${c.privacy === "public" ? "Public" : c.privacy === "private" ? "Private" : "Invite only"} · ${c.member_count} members`, image: c.image_url })) : [] });
      } else {
        const r = await api("GET", `/api/search?q=${encodeURIComponent(term)}&types=${type}&limit=8`);
        setRes({ status: r.ok ? "ready" : "error", items: r.ok ? (r.json.results || []).filter((x) => x.type === type).map((x) => ({ ref: decodeURIComponent(String(x.route).split("/").pop()), title: x.title, sub: x.subtitle, image: x.image })) : [] });
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [api, q, type]);
  const send = async () => { setBusy(true); setErr(""); const e = await onSend({ type, ref: pick.ref }, text); setBusy(false); if (e) setErr(e); };
  return (
    <Sheet open title={LABEL[type]} onClose={onClose}>
      {!pick ? (<>
        <label className="v8c-field"><span>{type === "product" ? "Search Shop" : type === "worker" ? "Search Works" : "Search groups and channels"}</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={type === "product" ? "e.g. crochet scarf" : type === "worker" ? "e.g. tailor, electrician" : "Your groups show first"} autoFocus /></label>
        {res.status === "loading" ? <Skel h={56} /> : null}
        {res.status === "error" ? <p className="v8c-err" role="alert">Search didn’t work. Try again.</p> : null}
        {res.status === "ready" && !res.items.length ? <p className="v8c-muted">{q ? `Nothing found for “${q}”.` : "You haven’t joined any groups yet. Search to find one."}</p> : null}
        {res.items.map((x) => <button key={x.ref} type="button" className="v8c-row" onClick={() => setPick(x)}>{safeImg(x.image) ? <img className="v8x-thumb" src={x.image} alt="" /> : <span className="v8c-row-ico"><V8Icon name={type === "product" ? "shop" : type === "worker" ? "works" : "users"} size={20} /></span>}<span className="v8c-row-text"><b>{x.title}</b><small>{x.sub}</small></span><V8Icon name="chevr" size={18} /></button>)}
      </>) : (<>
        <div className="v8c-row static">{safeImg(pick.image) ? <img className="v8x-thumb" src={pick.image} alt="" /> : <span className="v8c-row-ico"><V8Icon name={type === "product" ? "shop" : type === "worker" ? "works" : "users"} size={20} /></span>}<span className="v8c-row-text"><b>{pick.title}</b><small>{pick.sub}</small></span><button type="button" className="v8-link" onClick={() => setPick(null)}>Change</button></div>
        <label className="v8c-field"><span>Add a message (optional)</span><input maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={type === "product" ? "What do you think of this?" : type === "worker" ? "They did great work for me" : "Join us!"} /></label>
        {type === "worker" ? <p className="v8c-muted">Only their public Works profile is shared — never a phone number or address.</p> : null}
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send"}</button></div>
      </>)}
    </Sheet>
  );
}

// The card in the thread
export function CardBubble({ card, onAct }) {
  if (!card) return null;
  if (card.unavailable) return <div className="v8x-card unavailable"><V8Icon name="ban" size={18} /><span><b>{card.type === "product" ? "Product" : card.type === "worker" ? "Worker" : "Group"} unavailable</b><small>It was removed, made private, or isn’t visible to you.</small></span></div>;
  return (
    <div className={`v8x-card ${card.type}`}>
      {card.type === "product" ? <div className="v8x-card-img">{safeImg(card.image_url) ? <img src={card.image_url} alt="" /> : <V8Icon name="shop" size={28} />}</div> : null}
      {card.type === "community" ? <div className="v8x-card-img wide">{safeImg(card.image_url) ? <img src={card.image_url} alt="" /> : <V8Icon name="users" size={28} />}</div> : null}
      <div className="v8x-card-body">
        <small className="v8x-card-kind">{card.type === "product" ? "HOWDI Shop" : card.type === "worker" ? "HOWDI Works · Verified" : card.kind === "channel" ? "Channel" : "Group"}</small>
        <b>{card.title}</b>
        {card.type === "product" ? <span className="v8x-price">{inr(card.price)}{card.mrp ? <s>{inr(card.mrp)}</s> : null}{!card.in_stock ? <em>Out of stock</em> : null}</span> : null}
        {card.type === "worker" && card.rating ? <span className="v8x-price">★ {card.rating.toFixed(1)}{card.jobs ? <small> · {card.jobs} jobs</small> : null}</span> : null}
        <small>{card.subtitle}</small>
        <div className="v8x-card-actions">
          {card.type === "product" ? (<><button type="button" className="v8-btn" onClick={() => onAct("view", card)}>View</button>{card.actions.includes("buy") ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => onAct("buy", card)}>Buy now</button> : null}</>) : null}
          {card.type === "worker" ? (<><button type="button" className="v8-btn" onClick={() => onAct("view", card)}>View in Works</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => onAct("book", card)}>Book</button></>) : null}
          {card.type === "community" ? (card.membership === "member" ? <button type="button" className="v8-btn" onClick={() => onAct("open", card)}>Open</button>
            : card.membership === "pending" ? <span className="v8m-state warn"><i />Request pending</span>
              : <button type="button" className="v8-btn v8-btn-primary" onClick={() => onAct("join", card)}>{card.privacy === "private" ? "Ask to join" : "Join"}</button>) : null}
        </div>
      </div>
    </div>
  );
}

// MSG-007 — pick media to send as view-once
export function ViewOnceSend({ onSend, onClose }) {
  const [file, setFile] = useState(null); const [data, setData] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const choose = async (f) => {
    if (!f) return; setErr("");
    const video = /^video\/(mp4|webm|quicktime)$/.test(f.type); const img = /^image\/(jpeg|png|webp)$/.test(f.type);
    if (!video && !img) { setErr("Choose a JPG, PNG or WebP photo, or an MP4 / WebM video."); return; }
    if (f.size > (video ? 8 : 5) * 1024 * 1024) { setErr(video ? "View-once videos can be up to 8 MB." : "Photos can be up to 5 MB."); return; }
    setFile(f); setData(await readFileAsDataUrl(f));
  };
  const send = async () => { setBusy(true); setErr(""); const e = await onSend(data); setBusy(false); if (e) setErr(e); };
  return (
    <Sheet open title="Send view once" onClose={onClose}>
      <p className="v8c-muted"><V8Icon name="eye" size={14} /> They can open it once. It can’t be opened again, and HOWDI deletes the file after everyone has opened it. People can still take a screenshot or photo of their screen.</p>
      {!data ? <label className="v8-btn v8-btn-block"><V8Icon name="image" size={16} />Choose photo or video<input type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => { choose(e.target.files[0]); e.target.value = ""; }} data-testid="vo-file" /></label>
        : <div className="v8x-vo-preview">{file.type.startsWith("video/") ? <video src={data} muted playsInline /> : <img src={data} alt="Selected" />}<span><V8Icon name="eye" size={18} /> View once</span></div>}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={!data || busy} onClick={send}>{busy ? "Sending…" : "Send view once"}</button></div>
    </Sheet>
  );
}

// The view-once bubble (both sides) and the one-time viewer
export function ViewOnceBubble({ m, onOpen }) {
  const vo = m.view_once; const kind = vo.media === "video" ? "video" : "photo";
  if (m.mine) return <div className="v8x-vo mine"><V8Icon name={vo.opened ? "eyeoff" : "eye"} size={18} /><span><b>View-once {kind}</b><small>{vo.opened ? "Opened" : "Not opened yet"}</small></span></div>;
  if (vo.opened) return <div className="v8x-vo opened"><V8Icon name="eyeoff" size={18} /><span><b>Opened</b><small>View-once {kind}</small></span></div>;
  return <button type="button" className="v8x-vo" onClick={() => onOpen(m)}><V8Icon name="eye" size={18} /><span><b>Tap to view {kind}</b><small>View once</small></span></button>;
}
export function ViewOnceViewer({ media, author, onClose }) {
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return createPortal(
    <div className="v8x-voview" role="dialog" aria-modal="true" aria-label="View-once media" onContextMenu={(e) => e.preventDefault()}>
      <header><Ava src={author?.avatar_url} name={author?.display_name} size={32} /><span><b>@{author?.public_username}</b><small>View once · closes for good</small></span><button type="button" className="v8-icon-btn" aria-label="Close" onClick={onClose}><V8Icon name="x" size={22} /></button></header>
      {media.type === "video" ? <video src={media.data} autoPlay playsInline controls={false} onEnded={onClose} /> : <img src={media.data} alt="View-once from the sender" draggable={false} />}
    </div>, document.body);
}

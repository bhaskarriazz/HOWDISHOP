// HOWDI V8 Messages with in-chat HPay — board V8__18 "Messages · Inbox & Safety" (register CON-009..012, MSG-002/003/009/011/015).
// Inbox (All / Requests, unread, search) · new message with eligibility · message requests (accept / decline / block) ·
// chat (text, photo, delivered / read, edit within 15 min, delete, report / block, mute) · groups (create, add, remove,
// admins, rename, leave) · HPay in chat: send money and payment requests with review → PIN → processing → receipt, and
// the request card on both sides (Pay / Decline · Remind / Cancel · paid, declined, cancelled, expired).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, Skel, Tabs, since, safeImg, readFileAsDataUrl, SignInCard } from "./common";

const newKey = () => (globalThis.crypto?.randomUUID?.() || `k${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const clock = (iso) => { const t = Date.parse(iso || ""); return Number.isFinite(t) ? new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""; };

export default function MessagesScreen({ api, user, focus, to, onNav, onRequireLogin, onOpenProfile }) {
  if (!user) return <SignInCard title="Sign in to use Messages" message="Chat, send money and request payments with people you know." onSignIn={onRequireLogin} />;
  return <Messages api={api} user={user} focus={/^CNV-[0-9A-F]{12}$/.test(focus || "") ? focus : ""} to={/^[a-z0-9._]{3,30}$/i.test(to || "") ? to : ""} onNav={onNav} onOpenProfile={onOpenProfile} />;
}

function Messages({ api, user, focus, to, onNav, onOpenProfile }) {
  const [tab, setTab] = useState("all"); const [q, setQ] = useState(""); const [list, setList] = useState({ status: "loading", items: [], requests: 0 });
  const [sheet, setSheet] = useState(to ? "new" : ""); const [rev, setRev] = useState(0);
  const load = useCallback(async () => {
    const r = await api("GET", `/api/v8/conversations?tab=${tab}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`);
    setList(r.ok ? { status: "ready", items: r.json.items || [], requests: r.json.requests || 0 } : { status: "error", items: [], requests: 0, message: r.json.message });
  }, [api, tab, q]);
  useEffect(() => { const t = window.setTimeout(load, q ? 250 : 0); return () => window.clearTimeout(t); }, [load, q, rev]);
  useEffect(() => { const id = window.setInterval(load, 8000); return () => window.clearInterval(id); }, [load]);
  return (
    <div className={`v8msg ${focus ? "has-chat" : ""}`}>
      <aside className="v8-card v8msg-inbox" aria-label="Conversations">
        <header className="v8msg-inbox-head"><h1>Messages</h1>
          <button type="button" className="v8-icon-btn" aria-label="New group" onClick={() => setSheet("group")}><V8Icon name="users" size={20} /></button>
          <button type="button" className="v8-btn v8-btn-primary" onClick={() => setSheet("new")}><V8Icon name="plus" size={16} />New</button></header>
        <label className="v8msg-search"><V8Icon name="search" size={18} /><span className="v8-sr">Search messages</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people or messages" /></label>
        <Tabs compact tabs={[{ value: "all", label: "All" }, { value: "requests", label: "Message requests", count: list.requests }]} value={tab} onChange={setTab} label="Inbox" />
        <p className="v8msg-safe"><V8Icon name="lock" size={14} /> Encrypted in transit</p>
        {list.status === "loading" ? [0, 1, 2, 3].map((i) => <Skel key={i} h={60} r={12} />) : null}
        {list.status === "error" ? <V8State kind="error" title="Messages didn’t load" message={list.message} actionLabel="Retry" onAction={load} /> : null}
        {list.status === "ready" && !list.items.length ? <div className="v8msg-empty"><V8Icon name={tab === "requests" ? "mail" : "send"} size={28} /><b>{tab === "requests" ? "No message requests" : q ? "No matches" : "No messages yet"}</b><p className="v8c-muted">{tab === "requests" ? "When someone you don’t follow messages you, it appears here first." : "Start a chat with someone on HOWDI."}</p>{tab === "all" && !q ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => setSheet("new")}>New message</button> : null}</div> : null}
        <ul className="v8msg-list">{list.items.map((c) => (
          <li key={c.public_key}><button type="button" className={`v8msg-row ${focus === c.public_key ? "on" : ""} ${c.unread ? "unread" : ""}`} onClick={() => onNav(`messages/${c.public_key}`)} aria-label={`${c.title}${c.unread ? `, ${c.unread} unread` : ""}`}>
            {c.kind === "group" ? <span className="v8msg-group-ava"><V8Icon name="users" size={20} /></span> : <Ava src={c.members.find((m) => !m.me)?.avatar_url} name={c.title} size={48} />}
            <span className="v8msg-row-text"><b>{c.title}{c.kind === "group" ? <small> · {c.member_count}</small> : null}</b><small>{c.request === "sent" ? "Request sent · " : c.request === "received" ? "Wants to message you · " : ""}{c.preview}</small></span>
            <span className="v8msg-row-meta"><small>{since(c.last_at)}</small>{c.muted ? <V8Icon name="mute" size={14} /> : c.unread ? <i className="v8msg-badge">{c.unread}</i> : null}</span>
          </button></li>))}</ul>
      </aside>
      <section className="v8msg-main">
        {focus ? <Chat key={focus} api={api} user={user} code={focus} onBack={() => onNav("messages")} onChanged={() => setRev((n) => n + 1)} onOpenProfile={onOpenProfile} />
          : <div className="v8-card v8msg-placeholder"><V8Icon name="send" size={36} /><h2>Your messages</h2><p className="v8c-muted">Chat, share photos, send money or request a payment with HPay. Messages are encrypted in transit.</p><button type="button" className="v8-btn v8-btn-primary" onClick={() => setSheet("new")}>New message</button></div>}
      </section>
      {sheet === "new" ? <NewMessage api={api} to={to} onClose={() => setSheet("")} onOpen={(k) => { setSheet(""); setRev((n) => n + 1); onNav(`messages/${k}`); }} /> : null}
      {sheet === "group" ? <NewGroup api={api} onClose={() => setSheet("")} onOpen={(k) => { setSheet(""); setRev((n) => n + 1); onNav(`messages/${k}`); }} /> : null}
    </div>
  );
}

// CON-011 — recipient search with eligibility before the first message
function PeoplePicker({ api, onPick, exclude = [] }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState({ status: "idle", items: [] });
  useEffect(() => {
    const term = q.trim().replace(/^@/, ""); if (term.length < 2) { setRes({ status: "idle", items: [] }); return undefined; }
    const t = window.setTimeout(async () => {
      setRes({ status: "loading", items: [] });
      const r = await api("GET", `/api/search?q=${encodeURIComponent(term)}&types=person&limit=8`);
      const items = r.ok ? (r.json.results || []).filter((x) => x.type === "person").map((x) => ({ handle: String(x.route || "").replace(/^\/@/, ""), name: x.title, sub: x.subtitle, image: x.image })).filter((x) => x.handle && !exclude.includes(x.handle)) : [];
      setRes({ status: r.ok ? "ready" : "error", items });
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, api]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="v8msg-picker">
      <label className="v8c-field"><span>To</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @handle" autoFocus /></label>
      {res.status === "loading" ? <Skel h={48} /> : null}
      {res.status === "error" ? <p className="v8c-err" role="alert">Search didn’t work. Try again.</p> : null}
      {res.status === "ready" && !res.items.length ? <p className="v8c-muted">No one found for “{q}”. Check the @handle.</p> : null}
      {res.items.map((p) => <button key={p.handle} type="button" className="v8c-row" onClick={() => onPick(p)}><Ava src={p.image} name={p.name} size={40} /><span className="v8c-row-text"><b>{p.name}</b><small>{p.sub}</small></span><V8Icon name="chevr" size={18} /></button>)}
    </div>
  );
}

function NewMessage({ api, to, onClose, onOpen }) {
  const [who, setWho] = useState(null); const [el, setEl] = useState(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const pick = async (p) => { setWho(p); setEl(null); setErr(""); const r = await api("GET", `/api/v8/messages/eligibility/${p.handle}`); setEl(r.ok ? r.json : { can: "no", reason: r.json.message }); };
  // opened from a profile's Message button (?to=@handle): start with that person
  useEffect(() => { if (to) pick({ handle: to.replace(/^@/, "").toLowerCase(), name: `@${to.replace(/^@/, "")}`, sub: "", image: null }); }, [to]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    if (el.existing && !text.trim()) { onOpen(el.existing); return; }
    setBusy(true); setErr("");
    const r = await api("POST", "/api/v8/conversations", { handle: who.handle, text });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Couldn’t send."); return; }
    onOpen(r.json.conversation.public_key);
  };
  return (
    <Sheet open title="New message" onClose={onClose}>
      {!who ? <PeoplePicker api={api} onPick={pick} /> : (
        <div className="v8msg-new">
          <div className="v8msg-new-who"><Ava src={who.image} name={who.name} size={48} /><span><b>{who.name}</b><small>@{who.handle}</small></span><button type="button" className="v8-link" onClick={() => setWho(null)}>Change</button></div>
          {!el ? <Skel h={40} /> : (
            <div className={`v8msg-elig ${el.can}`} role="status"><V8Icon name={el.can === "direct" ? "check" : el.can === "request" ? "mail" : "ban"} size={18} /><span><b>{el.can === "direct" ? "You can message them" : el.can === "request" ? "Your message will be a request" : "You can’t message them"}</b><small>{el.reason}</small></span></div>
          )}
          {el && el.can !== "no" ? (<>
            <label className="v8c-field"><span>{el.existing ? "Message (optional — opens your chat)" : "Message"}</span><textarea rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Say hi to @${who.handle}`} /></label>
            {err ? <p className="v8c-err" role="alert">{err}</p> : null}
            <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy || (!el.existing && !text.trim())} onClick={send}>{busy ? "Sending…" : el.existing && !text.trim() ? "Open chat" : el.can === "request" ? "Send request" : "Send"}</button></div>
          </>) : null}
        </div>
      )}
    </Sheet>
  );
}

// CON-012 — create a group
function NewGroup({ api, onClose, onOpen }) {
  const [title, setTitle] = useState(""); const [people, setPeople] = useState([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const create = async () => {
    setBusy(true); setErr("");
    const r = await api("POST", "/api/v8/conversations", { group: { title, handles: people.map((p) => p.handle) } });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Couldn’t create the group."); return; }
    onOpen(r.json.conversation.public_key);
  };
  return (
    <Sheet open title="New group" onClose={onClose}>
      <label className="v8c-field"><span>Group name</span><input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Saturday stitch-along" /></label>
      {people.length ? <div className="v8c-chips">{people.map((p) => <button key={p.handle} type="button" className="v8c-chip on" onClick={() => setPeople((x) => x.filter((y) => y.handle !== p.handle))} aria-label={`Remove @${p.handle}`}>@{p.handle} <V8Icon name="x" size={12} /></button>)}</div> : null}
      <PeoplePicker api={api} exclude={people.map((p) => p.handle)} onPick={(p) => setPeople((x) => [...x, p])} />
      <p className="v8c-muted">You can add people who accept messages from you. You’ll be the group owner.</p>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy || title.trim().length < 2 || !people.length} onClick={create}>{busy ? "Creating…" : `Create group (${people.length + 1})`}</button></div>
    </Sheet>
  );
}

function Chat({ api, user, code, onBack, onChanged, onOpenProfile }) {
  const ui = useV8Ui();
  const [conv, setConv] = useState({ status: "loading" }); const [msgs, setMsgs] = useState([]); const [more, setMore] = useState(false);
  const [text, setText] = useState(""); const [img, setImg] = useState(null); const [sending, setSending] = useState(false); const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(""); const [edit, setEdit] = useState(null); const [target, setTarget] = useState(null); const [pay, setPay] = useState(null);
  const endRef = useRef(null); const fileRef = useRef(null); const sendKey = useRef(newKey());
  const loadConv = useCallback(async () => { const r = await api("GET", `/api/v8/conversations/${code}`); setConv(r.ok ? { status: "ready", ...r.json.conversation, hpay: r.json.hpay } : { status: r.status === 404 ? "gone" : "error", message: r.json.message }); }, [api, code]);
  const loadMsgs = useCallback(async (scroll) => {
    const r = await api("GET", `/api/v8/conversations/${code}/messages`);
    if (r.ok) { setMsgs(r.json.items || []); setMore(Boolean(r.json.has_more)); api("POST", `/api/v8/conversations/${code}/read`); if (scroll) window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 30); }
  }, [api, code]);
  useEffect(() => { loadConv(); loadMsgs(true); }, [loadConv, loadMsgs]);
  useEffect(() => { const id = window.setInterval(() => loadMsgs(false), 4000); return () => window.clearInterval(id); }, [loadMsgs]);
  const earlier = async () => { const r = await api("GET", `/api/v8/conversations/${code}/messages?before=${msgs[0]?.public_key || ""}`); if (r.ok) { setMsgs((m) => [...(r.json.items || []), ...m]); setMore(Boolean(r.json.has_more)); } };
  if (conv.status === "loading") return <div className="v8-card v8msg-chat"><Skel h={48} /><Skel h={300} /></div>;
  if (conv.status === "gone") return <div className="v8-card"><V8State icon="send" title="This conversation isn’t available" message="You may have left it or been removed." actionLabel="Back to Messages" onAction={onBack} /></div>;
  if (conv.status === "error") return <div className="v8-card"><V8State kind="error" title="Couldn’t open this chat" message={conv.message} actionLabel="Retry" onAction={loadConv} /></div>;
  const c = conv; const other = c.members.find((m) => !m.me);
  const send = async () => {
    if (!text.trim() && !img) return;
    setSending(true); setErr("");
    const r = await api("POST", `/api/v8/conversations/${code}/messages`, { text, imageData: img || undefined, idempotency_key: sendKey.current });
    setSending(false);
    if (!r.ok) { setErr(r.json.message || "Message not sent."); return; } // key kept: Retry can't duplicate
    sendKey.current = newKey(); setText(""); setImg(null); await loadMsgs(true); onChanged();
  };
  const pickImg = async (f) => { if (!f) return; if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5 * 1024 * 1024) { setErr("Photos: JPG, PNG or WebP up to 5 MB."); return; } setImg(await readFileAsDataUrl(f)); };
  const answer = async (a) => { const r = await api("POST", `/api/v8/conversations/${code}/request/${a}`); if (r.ok) { ui?.toast({ title: r.json.message }); onChanged(); if (a === "accept") loadConv(); else onBack(); } else ui?.toast({ kind: "error", title: r.json.message }); };
  const act = async (method, path, body, msg) => { const r = await api(method, path, body); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message || "Couldn’t do that." }); return null; } if (msg) ui?.toast({ title: typeof msg === "function" ? msg(r.json) : msg }); loadMsgs(false); loadConv(); onChanged(); return r.json; };
  return (
    <div className="v8-card v8msg-chat">
      <header className="v8msg-chat-head">
        <button type="button" className="v8-icon-btn v8msg-back" aria-label="Back to inbox" onClick={onBack}><V8Icon name="back" size={22} /></button>
        <button type="button" className="v8msg-who" onClick={() => (c.kind === "group" ? setSheet("info") : onOpenProfile(other?.public_username))}>
          {c.kind === "group" ? <span className="v8msg-group-ava"><V8Icon name="users" size={20} /></span> : <Ava src={other?.avatar_url} name={c.title} size={40} />}
          <span><b>{c.title}{other && c.kind !== "group" ? <V8Badges verified={other.verified} premium={other.premium} size="sm" /> : null}</b><small>{c.kind === "group" ? `${c.member_count} members` : `@${other?.public_username}`}{c.muted ? " · muted" : ""}</small></span>
        </button>
        <button type="button" className="v8-icon-btn" aria-label="Chat options" onClick={() => setSheet("menu")}><V8Icon name="more" size={20} /></button>
      </header>
      <div className="v8msg-notice"><V8Icon name="lock" size={14} /> {c.safety.encryption}. {c.kind === "group" ? "Only members see this group." : "HOWDI shows your @handle, never your phone number or ID."} <button type="button" className="v8-link" onClick={() => setSheet("safety")}>Learn more</button></div>
      {c.request === "received" ? (
        <div className="v8msg-request" role="region" aria-label="Message request">
          <b>@{other?.public_username} wants to message you</b><p className="v8c-muted">They can’t see if you’ve read this until you accept. Declining is private.</p>
          <div className="v8msg-request-actions"><button type="button" className="v8-btn v8-btn-primary" onClick={() => answer("accept")}>Accept</button><button type="button" className="v8-btn" onClick={() => answer("decline")}>Decline</button><button type="button" className="v8-btn v8-btn-danger" onClick={() => answer("block")}>Block</button></div>
        </div>
      ) : null}
      {c.request === "sent" ? <p className="v8msg-pending"><V8Icon name="mail" size={16} /> Request sent. You can send up to 3 messages until @{other?.public_username} accepts.</p> : null}
      {c.request === "declined" ? <p className="v8msg-pending"><V8Icon name="ban" size={16} /> You declined this request.</p> : null}
      <div className="v8msg-thread" role="log" aria-live="polite" aria-label="Messages">
        {more ? <button type="button" className="v8-link v8msg-earlier" onClick={earlier}>Load earlier messages</button> : null}
        {msgs.map((m) => m.kind === "system" ? <p key={m.public_key} className="v8msg-sys">{m.text}</p>
          // paying a request: the request card above updates to "Paid"; the payment itself shows as one receipt line
          : m.kind === "payment" && m.payment && m.payment.kind === "request" ? <p key={m.public_key} className="v8msg-sys ok"><V8Icon name="check" size={14} /> {m.mine ? "You" : `@${m.author?.public_username}`} paid {inr(m.payment.amount)}{m.payment.reference ? ` · Ref ${m.payment.reference}` : ""} · {clock(m.created_at)}</p> : (
          <div key={m.public_key} className={`v8msg-b ${m.mine ? "mine" : ""} ${m.payment ? "pay" : ""}`}>
            {!m.mine && c.kind === "group" ? <small className="v8msg-b-author">@{m.author?.public_username}</small> : null}
            {m.payment ? <PayCard p={m.payment} c={c} onAct={(a) => (a === "pay" ? setPay({ mode: "pay", request: m.payment }) : act("POST", `/api/v8/payments/${m.payment.public_key}/${a}`, {}, (j) => j.message || (a === "decline" ? "Request declined" : a === "cancel" ? "Request cancelled" : "Done")))} />
              : m.kind === "deleted" ? <p className="v8msg-deleted">Message deleted</p> : (<>
                {m.image_url ? <img src={m.image_url} alt="Shared photo" className="v8msg-img" /> : null}
                {m.text ? <p>{m.text}</p> : null}
              </>)}
            <span className="v8msg-b-meta">{clock(m.created_at)}{m.edited ? " · Edited" : ""}{m.mine && m.status ? <span className={`v8msg-tick ${m.status}`} aria-label={m.status === "read" ? "Read" : "Delivered"}>{m.status === "read" ? "✓✓" : "✓"}</span> : null}
              {m.kind === "text" || m.kind === "image" ? <button type="button" className="v8msg-b-more" aria-label="Message options" onClick={() => { setTarget(m); setSheet("msg"); }}><V8Icon name="more" size={14} /></button> : null}</span>
          </div>))}
        <div ref={endRef} />
      </div>
      {c.can_send ? (
        <div className="v8msg-composer">
          {img ? <div className="v8msg-attach"><img src={img} alt="Photo to send" /><button type="button" className="v8-icon-btn" aria-label="Remove photo" onClick={() => setImg(null)}><V8Icon name="x" size={16} /></button></div> : null}
          {c.can_pay ? <div className="v8msg-hpay"><button type="button" className="v8msg-pill" onClick={() => setPay({ mode: "send" })}><V8Icon name="wallet" size={16} />HPay payment</button><button type="button" className="v8msg-pill" onClick={() => setPay({ mode: "request" })}><V8Icon name="rupee" size={16} />HPay request</button></div> : null}
          <div className="v8msg-compose-row">
            <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { pickImg(e.target.files[0]); e.target.value = ""; }} data-testid="chat-photo" />
            <button type="button" className="v8-icon-btn" aria-label="Add photo" onClick={() => fileRef.current?.click()}><V8Icon name="image" size={20} /></button>
            <label className="v8msg-input"><span className="v8-sr">Message</span><textarea rows={1} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={c.request === "sent" ? "Add to your request…" : "Message…"} /></label>
            <button type="button" className="v8-btn v8-btn-primary v8msg-send" disabled={sending || (!text.trim() && !img)} onClick={send} aria-label="Send"><V8Icon name="send" size={18} /></button>
          </div>
          {err ? <p className="v8c-err" role="alert">{err} <button type="button" className="v8-link" onClick={send}>Retry</button></p> : null}
        </div>
      ) : c.request !== "received" ? <p className="v8msg-closed">{c.blocked ? "You can’t message this person." : "You can’t send messages in this chat."}</p> : null}

      <Sheet open={sheet === "menu"} title={c.title} onClose={() => setSheet("")}>
        <button type="button" className="v8c-row" onClick={() => { setSheet(""); act("POST", `/api/v8/conversations/${code}/mute`, { on: !c.muted }, c.muted ? "Notifications on" : "Chat muted"); }}><span className="v8c-row-ico"><V8Icon name={c.muted ? "bell" : "mute"} size={20} /></span><span className="v8c-row-text"><b>{c.muted ? "Unmute" : "Mute notifications"}</b></span></button>
        {c.kind === "group" ? <button type="button" className="v8c-row" onClick={() => setSheet("info")}><span className="v8c-row-ico"><V8Icon name="users" size={20} /></span><span className="v8c-row-text"><b>Group info</b><small>{c.member_count} members</small></span></button> : null}
        <button type="button" className="v8c-row" onClick={() => setSheet("report")}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report {c.kind === "group" ? "group" : "chat"}</b><small>HOWDI sees the reported messages, including earlier versions of edited ones</small></span></button>
        {c.kind !== "group" && !c.blocked ? <button type="button" className="v8c-row danger" onClick={() => setSheet("block")}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{other?.public_username}</b></span></button> : null}
        {c.kind === "group" ? <button type="button" className="v8c-row danger" onClick={() => setSheet("leave")}><span className="v8c-row-ico danger"><V8Icon name="x" size={20} /></span><span className="v8c-row-text"><b>Leave group</b></span></button> : null}
      </Sheet>
      <Sheet open={sheet === "safety"} title="Privacy & safety" onClose={() => setSheet("")}>
        <p><b>{c.safety.encryption}.</b> Messages are protected while they travel between your device and HOWDI.</p>
        <p className="v8c-muted">{c.safety.retention}</p>
        <p className="v8c-muted">{c.kind === "group" ? "You’re here because a group admin added you. You can leave at any time." : c.request ? "This is a message request: it stays separate until it’s accepted." : "You can message each other because of your privacy settings. Change who can message you in Settings → Privacy."}</p>
        <button type="button" className="v8-btn v8-btn-block" onClick={() => setSheet("report")}>Report or block</button>
      </Sheet>
      <Sheet open={sheet === "msg"} title="Message" onClose={() => setSheet("")}>
        {target && target.can_edit ? <button type="button" className="v8c-row" onClick={() => { setEdit({ m: target, text: target.text || "" }); setSheet(""); }}><span className="v8c-row-ico"><V8Icon name="edit" size={20} /></span><span className="v8c-row-text"><b>Edit</b><small>Available for 15 minutes after sending</small></span></button> : null}
        {target && target.mine ? <button type="button" className="v8c-row danger" onClick={() => setSheet("delete")}><span className="v8c-row-ico danger"><V8Icon name="trash" size={20} /></span><span className="v8c-row-text"><b>Delete for everyone</b></span></button> : null}
        {target && !target.mine ? <button type="button" className="v8c-row" onClick={() => setSheet("report")}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report message</b></span></button> : null}
        {target && target.mine && !target.can_edit && target.kind === "text" ? <p className="v8c-muted">Editing closes 15 minutes after sending.</p> : null}
      </Sheet>
      <Sheet open={Boolean(edit)} title="Edit message" onClose={() => setEdit(null)}>
        {edit ? (<><label className="v8c-field"><span>Message</span><textarea rows={3} maxLength={2000} value={edit.text} onChange={(e) => setEdit((x) => ({ ...x, text: e.target.value }))} autoFocus /></label>
          <p className="v8c-muted">People will see “Edited”. If this chat is reported, HOWDI’s safety team can see the original.</p>
          <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setEdit(null)}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={!edit.text.trim()} onClick={async () => { const j = await act("PATCH", `/api/v8/chat-messages/${edit.m.public_key}`, { text: edit.text }, "Message edited"); if (j) setEdit(null); }}>Save</button></div></>) : null}
      </Sheet>
      <V8Confirm open={sheet === "delete"} danger title="Delete this message?" body="It’s removed for everyone in the chat." confirmLabel="Delete" onCancel={() => setSheet("")} onConfirm={async () => { setSheet(""); await act("DELETE", `/api/v8/chat-messages/${target.public_key}`, undefined, "Message deleted"); }} />
      <V8Confirm open={sheet === "block"} danger title={`Block @${other?.public_username}?`} body="They can’t message you or see your profile. You can unblock them later." confirmLabel="Block" onCancel={() => setSheet("")} onConfirm={async () => { setSheet(""); const r = await api("POST", `/api/v8/creators/${other.public_username}/block`); if (r.ok) { ui?.toast({ title: `@${other.public_username} is blocked` }); onChanged(); onBack(); } }} />
      <V8Confirm open={sheet === "leave"} danger title={`Leave “${c.title}”?`} body="You won’t get new messages from this group." confirmLabel="Leave" onCancel={() => setSheet("")} onConfirm={async () => { setSheet(""); const r = await api("DELETE", `/api/v8/conversations/${code}/members/${user.public_username}`); if (r.ok) { ui?.toast({ title: "You left the group" }); onChanged(); onBack(); } }} />
      <ReportSheet open={sheet === "report"} what={c.kind === "group" ? "group" : "chat"} onClose={() => setSheet("")} onSubmit={(reason, details) => api("POST", `/api/v8/conversations/${code}/report`, { reason, details, message: target && !target.mine ? target.public_key : undefined })} />
      {sheet === "info" ? <GroupInfo api={api} c={c} code={code} user={user} onClose={() => setSheet("")} onChanged={() => { loadConv(); loadMsgs(false); onChanged(); }} onOpenProfile={onOpenProfile} /> : null}
      {pay ? <PaySheet api={api} c={c} code={code} other={other} mode={pay.mode} request={pay.request} onClose={() => setPay(null)} onDone={() => { loadMsgs(true); loadConv(); onChanged(); }} /> : null}
    </div>
  );
}

// MSG-002 / MSG-003 — the payment card in the thread, on both sides
function PayCard({ p, onAct }) {
  const send = p.kind === "send";
  const label = send ? (p.role === "payer" ? `You sent ${inr(p.amount)}` : `@${p.payer?.public_username} sent you ${inr(p.amount)}`)
    : p.role === "payee" ? `You requested ${inr(p.amount)}` : `@${p.payee?.public_username} requested ${inr(p.amount)}`;
  const st = { completed: ["ok", "Sent"], paid: ["ok", "Paid"], pending: ["warn", "Pending"], declined: ["bad", "Declined"], cancelled: ["muted", "Cancelled"], expired: ["muted", "Expired"], failed: ["bad", "Failed"] }[p.status] || ["muted", p.status];
  return (
    <div className={`v8msg-paycard ${p.kind}`}>
      <div className="v8msg-paycard-top"><span className="v8msg-paycard-ico"><V8Icon name={send ? "wallet" : "rupee"} size={20} /></span><span><small>HPay {send ? "payment" : "request"}</small><b>{inr(p.amount)}</b></span><span className={`v8m-state ${st[0]}`}><i />{st[1]}</span></div>
      <p>{label}{p.note ? ` · ${p.note}` : ""}</p>
      {p.reference ? <small className="v8c-muted">Ref {p.reference}</small> : null}
      {p.status === "pending" && p.expires_at ? <small className="v8c-muted">Expires {since(p.expires_at).replace(" ago", "") === "Just now" ? "soon" : new Date(p.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{p.reminded_at ? " · Reminder sent" : ""}</small> : null}
      {p.actions.length ? <div className="v8msg-paycard-actions">
        {p.actions.includes("pay") ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => onAct("pay")}>Pay {inr(p.amount)}</button> : null}
        {p.actions.includes("decline") ? <button type="button" className="v8-btn" onClick={() => onAct("decline")}>Decline</button> : null}
        {p.actions.includes("remind") ? <button type="button" className="v8-btn" onClick={() => onAct("remind")}>Remind</button> : null}
        {p.actions.includes("cancel") ? <button type="button" className="v8-btn" onClick={() => onAct("cancel")}>Cancel request</button> : null}
      </div> : null}
      <small className="v8-pill-test">Preview / Test</small>
    </div>
  );
}

// MSG-002 / MSG-003 / MSG-015 — amount → review → PIN → processing → receipt, with failure + retry (same key: no double charge)
function PaySheet({ api, c, code, other, mode, request, onClose, onDone }) {
  const [step, setStep] = useState(mode === "pay" ? "review" : "amount");
  const [amount, setAmount] = useState(request ? String(request.amount) : ""); const [note, setNote] = useState(request?.note || "");
  const [rev, setRev] = useState(null); const [pin, setPin] = useState(""); const [pinSet, setPinSet] = useState(c.hpay?.pin_set); const [newPin, setNewPin] = useState("");
  const [err, setErr] = useState(null); const [result, setResult] = useState(null);
  const key = useMemo(() => newKey(), []); // one key for this attempt: Retry and double taps reuse it
  const kind = mode === "request" ? "request" : "send";
  useEffect(() => { if (mode === "pay") api("GET", "/api/v8/hpay/pin").then((r) => r.ok && setPinSet(r.json.set)); }, [api, mode]);
  const review = async () => {
    setErr(null);
    if (mode === "pay") { setStep(pinSet ? "pin" : "setpin"); return; }
    const r = await api("POST", `/api/v8/conversations/${code}/payments/quote`, { kind, amount: Number(amount), note });
    if (!r.ok) { setErr({ message: r.json.message }); return; }
    setRev(r.json.review); setStep("review");
  };
  const confirm = async () => {
    setErr(null); setStep("processing");
    const r = mode === "pay" ? await api("POST", `/api/v8/payments/${request.public_key}/pay`, { pin, idempotency_key: key })
      : await api("POST", `/api/v8/conversations/${code}/payments`, { kind, amount: Number(amount), note, pin: kind === "send" ? pin : undefined, idempotency_key: key });
    if (!r.ok) { setErr({ code: r.json.code, message: r.json.message || "Payment didn’t go through. Nothing was charged." }); setStep(["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code) ? "pin" : "failed"); setPin(""); return; }
    setResult(r.json); setStep("done"); onDone();
  };
  const savePin = async () => { const r = await api("POST", "/api/v8/hpay/pin", { pin: newPin }); if (!r.ok) { setErr({ message: r.json.message }); return; } setPinSet(true); setErr(null); setStep("pin"); };
  const title = step === "done" ? (kind === "request" && mode !== "pay" ? "Request sent" : "Payment sent") : mode === "pay" ? `Pay @${request.payee?.public_username}` : kind === "request" ? `Request from @${other?.public_username}` : `Pay @${other?.public_username}`;
  const amt = mode === "pay" ? request.amount : Number(amount);
  return (
    <Sheet open title={title} onClose={onClose}>
      <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>HPay sandbox — no real money moves.</span></div>
      {step === "amount" ? (<>
        <label className="v8c-field v8msg-amount"><span>Amount (₹)</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))} placeholder="0" autoFocus /></label>
        <div className="v8c-amounts">{[50, 100, 250, 500].map((a) => <button key={a} type="button" className={Number(amount) === a ? "on" : ""} onClick={() => setAmount(String(a))}>₹{a}</button>)}</div>
        <label className="v8c-field"><span>Note (optional)</span><input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder={kind === "request" ? "What is it for?" : "Add a note"} /></label>
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!(Number(amount) > 0)} onClick={review}>Review</button>
      </>) : null}
      {step === "review" ? (<>
        <div className="v8c-receipt">
          <span>{mode === "pay" || kind === "send" ? "To" : "From"}</span><b>@{mode === "pay" ? request.payee?.public_username : other?.public_username}</b>
          <span>Amount</span><b>{inr(amt)}</b><span>Fee</span><b>{inr(0)}</b><span>Total</span><b>{inr(amt)}</b>
          {note ? <><span>Note</span><b>{note}</b></> : null}
          {rev && rev.balance != null && kind === "send" ? <><span>HPay balance</span><b>{inr(rev.balance)}</b></> : null}
        </div>
        <p className="v8msg-warn"><V8Icon name="info" size={16} /> {mode === "pay" ? "Please review. No payment has been sent yet." : rev?.warning}</p>
        {rev && !rev.provider_ready ? <p className="v8c-err">HPay isn’t connected in this environment.</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={mode === "pay" ? onClose : () => setStep("amount")}>{mode === "pay" ? "Cancel" : "Back"}</button>
          <button type="button" className="v8-btn v8-btn-primary" disabled={rev && !rev.provider_ready} onClick={() => (kind === "request" && mode !== "pay" ? confirm() : pinSet ? setStep("pin") : setStep("setpin"))}>{kind === "request" && mode !== "pay" ? "Send request" : "Confirm"}</button></div>
      </>) : null}
      {step === "setpin" ? (<>
        <p>Set a 4–6 digit HPay PIN. You’ll enter it to confirm every payment.</p>
        <label className="v8c-field"><span>New HPay PIN</span><input type="password" inputMode="numeric" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={newPin.length < 4} onClick={savePin}>Set PIN</button>
      </>) : null}
      {step === "pin" ? (<>
        <p>Enter your HPay PIN to pay <b>{inr(amt)}</b> to @{mode === "pay" ? request.payee?.public_username : other?.public_username}.</p>
        <label className="v8c-field"><span>HPay PIN</span><input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus onKeyDown={(e) => { if (e.key === "Enter" && pin.length >= 4) confirm(); }} /></label>
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={pin.length < 4 || err?.code === "PIN_LOCKED"} onClick={confirm}>Pay {inr(amt)}</button></div>
      </>) : null}
      {step === "processing" ? <div className="v8c-done" role="status"><span className="v8c-spin" aria-hidden="true" /><p>Processing… don’t close this screen.</p></div> : null}
      {step === "failed" ? (
        <div className="v8-banner-error" role="alert"><V8Icon name="alert" size={20} /><span><b>{err?.code === "INSUFFICIENT_BALANCE" ? "Not enough HPay balance" : err?.code === "DAILY_LIMIT" ? "Daily limit reached" : "Payment didn’t go through"}</b> {err?.message} Nothing was charged.</span>
          <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Close</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => setStep(kind === "request" && mode !== "pay" ? "review" : "pin")}>Try again</button></div></div>
      ) : null}
      {step === "done" && result ? (
        <div className="v8c-done"><span className="v8c-done-ico ok"><V8Icon name="check" size={26} /></span>
          <p><b>{kind === "request" && mode !== "pay" ? `You requested ${inr(amt)} from @${other?.public_username}` : `${inr(amt)} sent to @${mode === "pay" ? request.payee?.public_username : other?.public_username}`}</b></p>
          <div className="v8c-receipt">{result.payment?.reference ? <><span>Reference</span><b>{result.payment.reference}</b></> : null}<span>Status</span><b>{result.payment?.status === "pending" ? "Waiting for them to pay" : "Completed"}</b>{result.balance != null ? <><span>New balance</span><b>{inr(result.balance)}</b></> : null}</div>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onClose}>Done</button></div>
      ) : null}
    </Sheet>
  );
}

// CON-012 — members, admins, add, remove, rename
function GroupInfo({ api, c, code, user, onClose, onChanged, onOpenProfile }) {
  const ui = useV8Ui();
  const [adding, setAdding] = useState(false); const [title, setTitle] = useState(c.title); const [who, setWho] = useState(null);
  const admin = c.my_role === "owner" || c.my_role === "admin";
  const call = async (method, path, body, msg) => { const r = await api(method, path, body); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return false; } if (msg) ui?.toast({ title: msg }); onChanged(); return true; };
  return (
    <Sheet open title="Group info" onClose={onClose}>
      {admin ? <div className="v8msg-rename"><label className="v8c-field"><span>Group name</span><input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label><button type="button" className="v8-btn" disabled={title.trim() === c.title || title.trim().length < 2} onClick={() => call("PATCH", `/api/v8/conversations/${code}`, { title }, "Group renamed")}>Save</button></div> : <h3>{c.title}</h3>}
      <h3 className="v8c-sheet-h">{c.member_count} members</h3>
      {c.members.map((m) => (
        <div key={m.public_username} className="v8c-row static"><Ava src={m.avatar_url} name={m.display_name} size={40} /><span className="v8c-row-text"><b>{m.me ? "You" : m.display_name}</b><small>@{m.public_username}{m.role !== "member" ? ` · ${m.role === "owner" ? "Owner" : "Admin"}` : ""}</small></span>
          {!m.me && (admin || c.my_role === "owner") ? <button type="button" className="v8-icon-btn" aria-label={`Manage @${m.public_username}`} onClick={() => setWho(m)}><V8Icon name="more" size={18} /></button> : null}</div>))}
      {admin ? (adding ? <PeoplePicker api={api} exclude={c.members.map((m) => m.public_username)} onPick={async (p) => { if (await call("POST", `/api/v8/conversations/${code}/members`, { handles: [p.handle] }, `@${p.handle} added`)) setAdding(false); }} />
        : <button type="button" className="v8-btn v8-btn-block" onClick={() => setAdding(true)}><V8Icon name="plus" size={16} />Add people</button>) : null}
      <Sheet open={Boolean(who)} title={who ? `@${who.public_username}` : ""} onClose={() => setWho(null)}>
        {who ? (<>
          <button type="button" className="v8c-row" onClick={() => { setWho(null); onClose(); onOpenProfile(who.public_username); }}><span className="v8c-row-ico"><V8Icon name="user" size={20} /></span><span className="v8c-row-text"><b>View profile</b></span></button>
          {c.my_role === "owner" ? <button type="button" className="v8c-row" onClick={async () => { await call("POST", `/api/v8/conversations/${code}/members/${who.public_username}/admin`, {}, who.role === "admin" ? "Admin removed" : "Made admin"); setWho(null); }}><span className="v8c-row-ico"><V8Icon name="shield" size={20} /></span><span className="v8c-row-text"><b>{who.role === "admin" ? "Remove as admin" : "Make admin"}</b></span></button> : null}
          {admin && who.role !== "owner" ? <button type="button" className="v8c-row danger" onClick={async () => { await call("DELETE", `/api/v8/conversations/${code}/members/${who.public_username}`, undefined, `@${who.public_username} removed`); setWho(null); }}><span className="v8c-row-ico danger"><V8Icon name="x" size={20} /></span><span className="v8c-row-text"><b>Remove from group</b></span></button> : null}
        </>) : null}
      </Sheet>
      <p className="v8c-muted">{user ? "Only members see messages in this group." : ""}</p>
    </Sheet>
  );
}

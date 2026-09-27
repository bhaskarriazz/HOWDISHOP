// HOWDI V8 Live — board 06 panel 5 "Live Event", board 17 "Live Programmes & Spaces" + mobile "Live & Replays",
// PRIOR-07 panel 3. Live Now / Upcoming / Past · room with stage, chat, reactions, tips (HPay Preview/Test), share,
// report, leave · scheduled (remind me) · ended / replay · connection lost · host controls (go live, end, pin, mute, remove).
// Slice 2 (CRT-005): members-only rooms — the host restricts a Live or Space to paying members; everyone else sees a
// locked room with the membership offer, and the room opens as soon as they join.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, ShareSheet, Skel, Tabs, fmt, when, since, safeImg, SignInCard } from "./common";
import { MembershipOffer } from "./Membership";

export function useRoom(api, code, { poll = 3000 } = {}) {
  const [room, setRoom] = useState({ status: "loading" });
  const [events, setEvents] = useState([]); const [people, setPeople] = useState([]); const [lost, setLost] = useState(false);
  const seq = useRef(0);
  const load = useCallback(async () => {
    const r = await api("GET", `/api/v8/rooms/${code}`);
    if (!r.ok) { setRoom({ status: r.status === 404 ? "gone" : "error", message: r.json.message }); return; }
    setRoom({ status: "ready", ...r.json.room, wallet_sandbox: r.json.wallet_sandbox }); setPeople(r.json.participants || []);
  }, [api, code]);
  useEffect(() => { seq.current = 0; setEvents([]); load(); }, [load]);
  // joining the host's membership elsewhere on the page unlocks a members-only room
  useEffect(() => { const on = () => load(); window.addEventListener("howdi:v8-membership", on); return () => window.removeEventListener("howdi:v8-membership", on); }, [load]);
  const tick = useCallback(async () => {
    const r = await api("GET", `/api/v8/rooms/${code}/events?after=${seq.current}`);
    if (!r.ok) { setLost(true); return; }
    setLost(false);
    if (r.json.events.length) { seq.current = r.json.events[r.json.events.length - 1].seq; setEvents((e) => [...e, ...r.json.events].slice(-200)); }
    setPeople(r.json.participants || []);
    setRoom((x) => (x.status === "ready" ? { ...x, state: r.json.state, counts: r.json.counts, viewer: r.json.viewer } : x));
  }, [api, code]);
  useEffect(() => {
    if (room.status !== "ready" || room.locked) return undefined;
    tick(); const id = window.setInterval(tick, poll);
    return () => window.clearInterval(id);
  }, [room.status, room.locked, tick, poll]);
  return { room, setRoom, events, people, lost, reload: load, tick };
}

// Non-members of a members-only room: what it is, who it's for, and the host's membership offer.
export function MembersOnlyGate({ r, api, signedIn, onRequireLogin }) {
  return (
    <div className="v8l-gate">
      <div className="v8l-gate-head"><span className="v8l-gate-ico"><V8Icon name="lock" size={22} /></span>
        <div><b>Members-only {r.kind === "space" ? "Space" : "live"}</b><p className="v8c-muted">@{r.host.public_username} made this {r.kind === "space" ? "Space" : "live"} for members. Join the membership to watch, chat and take part{r.state === "replay" ? ", including the replay" : ""}.</p></div></div>
      <MembershipOffer api={api} handle={r.host.public_username} signedIn={signedIn} onRequireLogin={onRequireLogin} compact />
    </div>
  );
}
// Host switch (before or during the session). Needs a paid membership tier.
export function MembersOnlyRow({ r, act, onDone }) {
  if (!["scheduled", "live"].includes(r.state)) return null;
  return (
    <button type="button" className="v8c-row" role="switch" aria-checked={Boolean(r.members_only)} onClick={async () => { const j = await act("host/members-only", { on: !r.members_only }, (x) => x.message); if (j) onDone(); }}>
      <span className="v8c-row-ico"><V8Icon name="crown" size={20} /></span>
      <span className="v8c-row-text"><b>Members only</b><small>{r.members_only ? "On — only your paying members can join" : "Off — anyone can join"}</small></span>
      <span className={`v8c-switch ${r.members_only ? "on" : ""}`} aria-hidden="true"><i /></span>
    </button>
  );
}

export function TipSheet({ open, api, host, code, onClose, onTipped }) {
  const [w, setW] = useState(null); const [amount, setAmount] = useState(0); const [step, setStep] = useState("pick"); const [err, setErr] = useState(""); const [receipt, setReceipt] = useState(null);
  useEffect(() => { if (!open) return; setStep("pick"); setAmount(0); setErr(""); setReceipt(null); api("GET", "/api/v8/wallet").then((r) => setW(r.ok ? r.json : { error: r.json.message })); }, [open, api]);
  const send = async () => {
    setStep("sending"); setErr("");
    const r = await api("POST", `/api/v8/rooms/${code}/tip`, { amount });
    if (!r.ok) { setStep("confirm"); setErr(r.json.message || "Tip not sent. You weren’t charged."); return; }
    setReceipt(r.json.receipt); setStep("done"); onTipped?.(r.json.receipt);
  };
  return (
    <Sheet open={open} title={step === "done" ? "Tip sent" : `Tip @${host?.public_username || ""}`} onClose={onClose}>
      {w && w.wallet && w.wallet.sandbox ? <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>HPay sandbox balance — no real money moves.</span></div> : null}
      {!w ? <Skel h={80} /> : w.error ? <p className="v8c-err" role="alert">{w.error}</p> : !w.wallet ? <p className="v8c-muted">Tips need HPay, which isn’t connected here yet.</p> : step === "done" ? (
        <div className="v8c-done"><span className="v8c-done-ico"><V8Icon name="check" size={26} /></span>
          <p><b>₹{receipt.amount}</b> sent to @{host.public_username}</p>
          <div className="v8c-receipt"><span>Reference</span><b>{receipt.code}</b><span>New balance</span><b>₹{Number(receipt.balance).toLocaleString("en-IN")}</b></div>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onClose}>Done</button></div>
      ) : step === "pick" ? (<>
        <p className="v8c-muted">HPay balance: <b>₹{Number(w.wallet.balance).toLocaleString("en-IN")}</b></p>
        <div className="v8c-amounts">{(w.tip_amounts || []).map((a) => <button key={a} type="button" className={amount === a ? "on" : ""} aria-pressed={amount === a} onClick={() => setAmount(a)} disabled={a > w.wallet.balance}>₹{a}</button>)}</div>
        {amount > w.wallet.balance ? <p className="v8c-err">Not enough balance.</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!amount} onClick={() => setStep("confirm")}>Continue</button>
      </>) : (
        <div className="v8c-confirm-pay">
          <div className="v8c-receipt"><span>To</span><b>@{host.public_username}</b><span>Amount</span><b>₹{amount}</b><span>From</span><b>HPay balance</b></div>
          <p className="v8c-muted">Tips are final and go straight to the creator.</p>
          {err ? <p className="v8c-err" role="alert">{err}</p> : null}
          <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setStep("pick")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={step === "sending"} onClick={send}>{step === "sending" ? "Sending…" : `Send ₹${amount}`}</button></div>
        </div>
      )}
    </Sheet>
  );
}

export function RoomChat({ api, code, events, room, signedIn, onRequireLogin, onPin }) {
  const ui = useV8Ui();
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const listRef = useRef(null);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [events.length]);
  const send = async () => {
    if (!signedIn) { onRequireLogin(); return; }
    if (!text.trim()) return;
    setBusy(true); setErr("");
    const r = await api("POST", `/api/v8/rooms/${code}/chat`, { text });
    setBusy(false);
    if (!r.ok) { setErr(r.json.message || "Message not sent."); return; }
    setText(""); ui?.announce?.("Message sent");
  };
  const chat = events.filter((e) => e.kind !== "reaction");
  const pinned = [...chat].reverse().find((e) => e.pinned);
  const blocked = room.viewer.muted ? "The host muted you in this chat." : room.chat_mode === "off" && room.viewer.role !== "host" ? "Chat is off for this live." : "";
  return (
    <div className="v8l-chat" aria-label="Live chat">
      {pinned ? <div className="v8l-pinned"><V8Icon name="bookmark" size={14} fill /><b>@{pinned.author?.public_username}</b> {pinned.text}</div> : null}
      <div className="v8l-chat-list" ref={listRef} aria-live="polite">
        {!chat.length ? <p className="v8c-muted">No messages yet. Say hello 👋</p> : null}
        {chat.map((e) => (
          <div key={e.seq} className={`v8l-msg ${e.kind}`}>
            {e.author ? <Ava src={e.author.avatar_url} name={e.author.display_name} size={26} /> : null}
            <span><b>@{e.author?.public_username || "HOWDI"}</b>{e.kind === "tip" ? <span className="v8l-tip-tag">₹{e.amount} tip</span> : null} {e.kind === "system" ? <i>{e.text}</i> : e.kind === "tip" ? null : e.text}</span>
            {onPin && e.kind === "chat" ? <button type="button" className="v8-link" onClick={() => onPin(e)}>{e.pinned ? "Pinned" : "Pin"}</button> : null}
          </div>
        ))}
      </div>
      {blocked ? <p className="v8c-muted v8l-chat-off">{blocked}</p> : (
        <div className="v8c-comment-box">
          <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onFocus={() => { if (!signedIn) onRequireLogin(); }} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder={signedIn ? "Say something…" : "Sign in to chat"} aria-label="Chat message" />
          <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !text.trim()} onClick={send} aria-label="Send"><V8Icon name="send" size={18} /></button>
        </div>
      )}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
    </div>
  );
}

function RoomCard({ r, onOpen, onRemind }) {
  return (
    <article className="v8-card v8l-card">
      <button type="button" className="v8l-card-media" onClick={onOpen} aria-label={`Open ${r.title}`}>
        {safeImg(r.image_url) ? <img src={r.image_url} alt="" /> : <span className="v8l-card-ph"><V8Icon name="live" size={30} /></span>}
        {r.state === "live" ? <span className="v8l-badge live">LIVE</span> : r.state === "replay" ? <span className="v8l-badge replay">REPLAY</span> : <span className="v8l-badge soon">{when(r.starts_at)}</span>}
        {r.members_only ? <span className="v8l-badge members"><V8Icon name="crown" size={12} />Members</span> : null}
        {r.state === "live" ? <span className="v8l-viewers"><V8Icon name="eye" size={14} />{fmt(r.counts.online)}</span> : null}
      </button>
      <div className="v8l-card-body">
        <b>{r.title}</b>
        <span className="v8c-who-line"><small>@{r.host.public_username}</small><V8Badges verified={r.host.verified} premium={r.host.premium} size="sm" /></span>
        {r.state === "scheduled" ? <small className="v8c-muted">{fmt(r.counts.reminders)} going</small> : null}
        {r.state === "live" ? <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onOpen}>Join Live</button>
          : r.state === "scheduled" ? <button type="button" className={`v8-btn v8-btn-block ${r.viewer.reminded ? "" : "v8-btn-soft"}`} onClick={onRemind}>{r.viewer.reminded ? <><V8Icon name="check" size={16} />Reminder set</> : <><V8Icon name="bell" size={16} />Remind me</>}</button>
          : r.replay ? <button type="button" className="v8-btn v8-btn-block" onClick={onOpen}><V8Icon name="play" size={16} />Watch replay</button>
          : <small className="v8c-muted">Replay not available</small>}
      </div>
    </article>
  );
}

export function RoomList({ api, kind, tabs, onOpen, signedIn, onRequireLogin, title, sub }) {
  const ui = useV8Ui();
  const [tab, setTab] = useState(tabs[0].value); const [list, setList] = useState({ status: "loading", items: [] });
  const load = useCallback(async () => {
    setList({ status: "loading", items: [] });
    const r = await api("GET", `/api/v8/${kind === "space" ? "spaces" : "live"}?tab=${tab}`);
    setList(r.ok ? { status: r.json.needs_sign_in ? "signin" : "ready", items: r.json.items } : { status: "error", items: [], message: r.json.message });
  }, [api, kind, tab]);
  useEffect(() => { load(); }, [load]);
  const remind = async (r) => {
    if (!signedIn) { onRequireLogin(); return; }
    const x = await api("POST", `/api/v8/rooms/${r.public_key}/remind`);
    if (x.ok) { ui?.toast({ title: x.json.reminded ? "Reminder set" : "Reminder removed", message: x.json.message }); setList((l) => ({ ...l, items: l.items.map((i) => (i.public_key === r.public_key ? { ...i, viewer: { ...i.viewer, reminded: x.json.reminded }, counts: { ...i.counts, reminders: i.counts.reminders + (x.json.reminded ? 1 : -1) } } : i)) })); }
    else ui?.toast({ kind: "error", title: "Couldn’t update reminder" });
  };
  return (
    <div className="v8l">
      <header className="v8l-top"><div><h1>{title}</h1><p className="v8c-muted">{sub}</p></div></header>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label={title} />
      {list.status === "loading" ? <div className="v8l-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="v8-card v8l-card"><Skel h={160} r={14} /><Skel h={14} w="70%" /><Skel h={40} /></div>)}</div> : null}
      {list.status === "error" ? <V8State kind="error" title="Couldn’t load" message={list.message || "Check your connection and try again."} actionLabel="Try again" onAction={load} /> : null}
      {list.status === "signin" ? <SignInCard title="Sign in to see your Spaces" onSignIn={onRequireLogin} /> : null}
      {list.status === "ready" && !list.items.length ? <V8State icon={kind === "space" ? "mic" : "live"} title={tab === "now" ? "Nobody is live right now" : tab === "past" ? "No replays yet" : tab === "mine" ? "No Spaces yet" : "Nothing scheduled"} message={tab === "now" ? "Check Upcoming and set a reminder." : "New sessions appear here."} actionLabel={tab === "now" ? "See upcoming" : undefined} onAction={tab === "now" ? () => setTab("upcoming") : undefined} /> : null}
      {list.status === "ready" && list.items.length ? <div className="v8l-grid">{list.items.map((r) => <RoomCard key={r.public_key} r={r} onOpen={() => onOpen(r.public_key)} onRemind={() => remind(r)} />)}</div> : null}
    </div>
  );
}

function MembersOnlyStage({ r }) {
  return <div className="v8l-stage-over"><V8Icon name="lock" size={28} /><b>For @{r.host.public_username}’s members</b><span>{r.state === "live" ? "Live now — members are watching" : r.state === "scheduled" ? `Starts ${when(r.starts_at)}` : r.state === "replay" ? "Replay for members" : "This session has ended"}</span></div>;
}

function LiveRoom({ api, code, user, onBack, onRequireLogin, onOpenProfile }) {
  const ui = useV8Ui();
  const signedIn = Boolean(user);
  const { room, setRoom, events, people, lost, reload, tick } = useRoom(api, code);
  const [sheet, setSheet] = useState(""); const [hearts, setHearts] = useState([]); const [confirmEnd, setConfirmEnd] = useState(false); const [person, setPerson] = useState(null);
  useEffect(() => {
    if (room.status !== "ready" || room.state !== "live" || !signedIn || room.locked) return undefined;
    api("POST", `/api/v8/rooms/${code}/join`).then((r) => { if (!r.ok && r.json.code === "REMOVED") ui?.toast({ kind: "error", title: "You were removed from this live" }); });
    return () => { api("POST", `/api/v8/rooms/${code}/leave`); };
  }, [room.status, room.state, room.locked, signedIn, code, api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const rs = events.filter((e) => e.kind === "reaction").slice(-6); if (rs.length) setHearts(rs.map((e) => ({ k: e.seq, e: e.text }))); }, [events]);
  if (room.status === "loading") return <div className="v8l-room"><Skel h={360} r={18} /><Skel h={200} r={18} /></div>;
  if (room.status === "gone") return <V8State icon="alert" title="This live isn’t available" message="It may have been removed or made private." actionLabel="Back to Live" onAction={onBack} />;
  if (room.status === "error") return <V8State kind="error" title="Couldn’t open this live" message={room.message} actionLabel="Try again" onAction={reload} />;
  const r = room; const isHost = r.viewer.role === "host";
  const act = async (path, body, okMsg) => {
    if (!signedIn) { onRequireLogin(); return null; }
    const x = await api("POST", `/api/v8/rooms/${code}/${path}`, body);
    if (!x.ok) { ui?.toast({ kind: "error", title: x.json.message || "Couldn’t do that." }); return null; }
    if (okMsg) ui?.toast({ title: typeof okMsg === "function" ? okMsg(x.json) : okMsg });
    tick(); return x.json;
  };
  const followHost = async () => { if (!signedIn) { onRequireLogin(); return; } const on = r.viewer.following_host; const x = await api(on ? "DELETE" : "POST", `/api/v8/creators/${r.host.public_username}/follow`); if (x.ok) { setRoom((s) => ({ ...s, viewer: { ...s.viewer, following_host: !on } })); ui?.toast({ title: on ? `Unfollowed @${r.host.public_username}` : `Following @${r.host.public_username}` }); } };
  return (
    <div className="v8l-room">
      <header className="v8l-room-head">
        <button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={22} /></button>
        <div className="v8l-room-title"><h1>{r.title}</h1>{r.topic ? <p className="v8c-muted">{r.topic}</p> : null}</div>
        <button type="button" className="v8-icon-btn" aria-label="Share" onClick={() => setSheet("share")}><V8Icon name="share" size={20} /></button>
        <button type="button" className="v8-icon-btn" aria-label="More" onClick={() => setSheet("more")}><V8Icon name="more" size={20} /></button>
      </header>
      {lost ? <div className="v8l-lost" role="status"><V8Icon name="refresh" size={16} /> Connection lost · Reconnecting…</div> : null}
      <div className="v8l-room-grid">
        <section className="v8l-stage-wrap">
          <div className="v8l-stage">
            {r.locked ? <MembersOnlyStage r={r} /> : null}
            {r.state === "replay" && r.replay && r.replay.url ? <video src={r.replay.url} controls playsInline poster={safeImg(r.image_url) || undefined} />
              : safeImg(r.image_url) ? <img src={r.image_url} alt="" /> : <span className="v8l-card-ph big"><V8Icon name="live" size={48} /></span>}
            {r.members_only ? <span className="v8l-badge members top"><V8Icon name="crown" size={12} />Members only</span> : null}
            {r.state === "live" && !r.locked ? <><span className="v8l-badge live">LIVE</span><span className="v8l-viewers top"><V8Icon name="eye" size={14} />{fmt(r.counts.online)}</span>
              <span className="v8c-sandbox stage"><b>PREVIEW / TEST</b><span>Live video isn’t connected in this preview — chat, reactions and tips are real.</span></span></> : null}
            {r.state === "scheduled" && !r.locked ? <div className="v8l-stage-over"><V8Icon name="bell" size={28} /><b>Starts {when(r.starts_at)}</b><span>{fmt(r.counts.reminders)} people going</span>
              {isHost ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => act("host/start", {}, "You’re live!").then(() => reload())}>Go live now</button>
                : <button type="button" className={`v8-btn ${r.viewer.reminded ? "" : "v8-btn-primary"}`} onClick={() => act("remind", {}, (j) => j.message).then((j) => j && setRoom((s) => ({ ...s, viewer: { ...s.viewer, reminded: j.reminded } })))}>{r.viewer.reminded ? "Reminder set ✓" : "Set reminder"}</button>}</div> : null}
            {r.state === "ended" || r.state === "cancelled" ? <div className="v8l-stage-over"><V8Icon name="live" size={28} /><b>{r.state === "cancelled" ? "This live was cancelled" : "This live has ended"}</b><span>Replay isn’t available for this session.</span></div> : null}
            <div className="v8l-hearts" aria-hidden="true">{hearts.map((h) => <i key={h.k}>{h.e}</i>)}</div>
          </div>
          <div className="v8l-host">
            <button type="button" className="v8l-host-who" onClick={() => onOpenProfile(r.host.public_username)}><Ava src={r.host.avatar_url} name={r.host.display_name} size={44} />
              <span><b>{r.host.display_name}</b><span className="v8c-who-line"><small>@{r.host.public_username} · Host</small><V8Badges verified={r.host.verified} premium={r.host.premium} size="sm" /></span></span></button>
            {!isHost ? <button type="button" className={`v8-btn ${r.viewer.following_host ? "" : "v8-btn-primary"}`} onClick={followHost}>{r.viewer.following_host ? "Following" : "Follow"}</button> : null}
          </div>
          {r.locked ? <MembersOnlyGate r={r} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} /> : null}
          {r.state === "live" && !r.locked ? (
            <div className="v8l-actions">
              {["❤️", "👏", "🔥"].map((e) => <button key={e} type="button" className="v8l-react" aria-label={`React ${e}`} onClick={() => act("react", { reaction: e })}>{e}</button>)}
              {!isHost ? <button type="button" className="v8-btn v8-btn-soft" onClick={() => (signedIn ? setSheet("tip") : onRequireLogin())}><V8Icon name="heart" size={16} />Send a tip</button> : null}
              {isHost ? <button type="button" className="v8-btn v8-btn-danger" onClick={() => setConfirmEnd(true)}>End live</button> : <button type="button" className="v8-btn v8-btn-danger" onClick={onBack}>Leave</button>}
            </div>
          ) : null}
          {isHost && r.state === "live" ? (
            <div className="v8-card v8l-host-tools">
              <h3>Host controls</h3>
              <p className="v8c-muted">Tap a viewer to mute them in chat or remove them. Pin a chat message to keep it on top.</p>
              <div className="v8l-people">{people.filter((p) => !p.me).map((p) => <button key={p.person.public_username} type="button" className="v8l-person" onClick={() => setPerson(p)}><Ava src={p.person.avatar_url} name={p.person.display_name} size={34} /><small>@{p.person.public_username}</small>{p.muted ? <em>Muted</em> : null}</button>)}
                {people.filter((p) => !p.me).length === 0 ? <p className="v8c-muted">No viewers yet.</p> : null}</div>
            </div>
          ) : null}
        </section>
        <aside className="v8-card v8l-side">
          <h3>Live chat</h3>
          {r.locked ? <p className="v8c-muted"><V8Icon name="lock" size={14} /> Chat is for members of @{r.host.public_username}.</p>
            : r.state === "live" ? <RoomChat api={api} code={code} events={events} room={r} signedIn={signedIn} onRequireLogin={onRequireLogin} onPin={isHost ? (e) => act("host/pin", { seq: e.seq }, "Message pinned") : null} /> : <p className="v8c-muted">{r.state === "scheduled" ? "Chat opens when the live starts." : "Chat is closed."}</p>}
        </aside>
      </div>
      <TipSheet open={sheet === "tip"} api={api} host={r.host} code={code} onClose={() => setSheet("")} onTipped={() => tick()} />
      <ShareSheet open={sheet === "share"} title={r.title} link={r.route} onClose={() => setSheet("")} />
      <Sheet open={sheet === "more"} title={r.title} onClose={() => setSheet("")}>
        {isHost ? <MembersOnlyRow r={r} act={act} onDone={() => { setSheet(""); reload(); }} /> : null}
        {!isHost ? <button type="button" className="v8c-row" onClick={() => (signedIn ? setSheet("report") : onRequireLogin())}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report this live</b></span></button> : null}
        <button type="button" className="v8c-row" onClick={() => { setSheet(""); onOpenProfile(r.host.public_username); }}><span className="v8c-row-ico"><V8Icon name="user" size={20} /></span><span className="v8c-row-text"><b>View @{r.host.public_username}</b></span></button>
        {r.rules ? <div className="v8l-rules"><b>Room rules</b><p>{r.rules}</p></div> : null}
      </Sheet>
      <ReportSheet open={sheet === "report"} what="live" onClose={() => setSheet("")} onSubmit={(reason, details) => api("POST", `/api/v8/rooms/${code}/report`, { reason, details })} />
      <V8Confirm open={confirmEnd} danger title="End this live?" body="Everyone watching will leave and chat will close." confirmLabel="End live" onCancel={() => setConfirmEnd(false)} onConfirm={async () => { setConfirmEnd(false); await act("host/end", {}, "Live ended"); reload(); }} />
      <Sheet open={Boolean(person)} title={person ? `@${person.person.public_username}` : ""} onClose={() => setPerson(null)}>
        {person ? (<>
          <button type="button" className="v8c-row" onClick={async () => { await act("host/mute", { handle: person.person.public_username }, (j) => (j.muted ? "Muted in chat" : "Unmuted")); setPerson(null); }}><span className="v8c-row-ico"><V8Icon name="mute" size={20} /></span><span className="v8c-row-text"><b>{person.muted ? "Unmute in chat" : "Mute in chat"}</b></span></button>
          <button type="button" className="v8c-row danger" onClick={async () => { await act("host/remove", { handle: person.person.public_username }, "Removed from this live"); setPerson(null); }}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Remove from live</b><small>Their chat messages are hidden</small></span></button>
        </>) : null}
      </Sheet>
      <span className="v8-sr">{since(r.started_at)}</span>
    </div>
  );
}

export default function LiveScreen({ api, user, focus, onNav, onRequireLogin, onOpenProfile }) {
  if (/^LIV-[0-9A-F]{12}$/.test(focus || "")) return <LiveRoom api={api} code={focus} user={user} onBack={() => onNav("live")} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} />;
  return <RoomList api={api} kind="live" title="Live" sub="Watch creators live, ask questions and catch the replays." signedIn={Boolean(user)} onRequireLogin={onRequireLogin}
    tabs={[{ value: "now", label: "Live Now" }, { value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past & Replays" }]} onOpen={(k) => onNav(`live/${k}`)} />;
}

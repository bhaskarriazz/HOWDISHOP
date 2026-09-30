// HOWDI V8 Spaces — PRIOR-07 panel 4 (For You / Upcoming / My Spaces + audio room), board 17 "Live Space" mobile
// (Host / Speaker grid, Raise hand, Chat, React, More, microphone denied, Leave) and board 06 Spaces rail.
import { useEffect, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, ReportSheet, ShareSheet, Skel, fmt, when } from "./common";
import { RoomList, RoomChat, TipSheet, useRoom, MembersOnlyGate, MembersOnlyRow } from "./Live";

function SpaceRoom({ api, code, user, onBack, onRequireLogin, onOpenProfile }) {
  const ui = useV8Ui(); const signedIn = Boolean(user);
  const { room, setRoom, events, people, lost, reload, tick } = useRoom(api, code, { poll: 2500 });
  const [sheet, setSheet] = useState(""); const [mic, setMic] = useState("off"); const [confirmEnd, setConfirmEnd] = useState(false); const [person, setPerson] = useState(null);
  useEffect(() => {
    if (room.status !== "ready" || room.state !== "live" || !signedIn || room.locked) return undefined;
    api("POST", `/api/v8/rooms/${code}/join`);
    return () => { api("POST", `/api/v8/rooms/${code}/leave`); };
  }, [room.status, room.state, room.locked, signedIn, code, api]);
  if (room.status === "loading") return <div className="v8sp-room"><Skel h={260} r={18} /></div>;
  if (room.status === "gone") return <V8State icon="alert" title="This Space isn’t available" actionLabel="Back to Spaces" onAction={onBack} />;
  if (room.status === "error") return <V8State kind="error" title="Couldn’t open this Space" message={room.message} actionLabel="Try again" onAction={reload} />;
  const r = room; const role = r.viewer.role; const isHost = role === "host";
  const act = async (path, body, msg) => {
    if (!signedIn) { onRequireLogin(); return null; }
    const x = await api("POST", `/api/v8/rooms/${code}/${path}`, body);
    if (!x.ok) { ui?.toast({ kind: "error", title: x.json.message || "Couldn’t do that." }); return null; }
    if (msg) ui?.toast({ title: typeof msg === "function" ? msg(x.json) : msg }); tick(); return x.json;
  };
  const turnOnMic = async () => {
    setMic("asking");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); setMic("on");
    } catch (e) { setMic(e && e.name === "NotAllowedError" ? "denied" : "unsupported"); }
  };
  const stage = people.filter((p) => p.role === "host" || p.role === "speaker");
  const audience = people.filter((p) => p.role !== "host" && p.role !== "speaker");
  const hands = audience.filter((p) => p.hand_raised);
  return (
    <div className="v8sp-room">
      <header className="v8l-room-head">
        <button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={22} /></button>
        <div className="v8l-room-title"><span className="v8sp-kicker">{r.state === "live" ? <><i className="v8sp-dot" />Live now · {fmt(r.counts.online)} listening</> : r.state === "scheduled" ? `Starts ${when(r.starts_at)}` : "Ended"}</span><h1>{r.title}</h1></div>
        <button type="button" className="v8-icon-btn" aria-label="Share" onClick={() => setSheet("share")}><V8Icon name="share" size={20} /></button>
        <button type="button" className="v8-icon-btn" aria-label="More" onClick={() => setSheet("more")}><V8Icon name="more" size={20} /></button>
      </header>
      {lost ? <div className="v8l-lost" role="status"><V8Icon name="refresh" size={16} /> Connection lost · Reconnecting…</div> : null}
      <div className="v8l-room-grid">
        <section className="v8-card v8sp-stage">
          {r.topic ? <p className="v8c-muted">{r.topic}</p> : null}
          {r.category || r.members_only ? <div className="v8c-chips">{r.category ? <span className="v8c-chip">{r.category}</span> : null}{r.members_only ? <span className="v8c-chip v8c-chip-premium"><V8Icon name="crown" size={14} />Members only</span> : null}</div> : null}
          {r.locked ? <MembersOnlyGate r={r} api={api} signedIn={signedIn} onRequireLogin={onRequireLogin} /> : r.state === "live" ? (<>
            <span className="v8c-sandbox"><b>PREVIEW / TEST</b><span>Audio isn’t connected in this preview — speaking roles, hands, chat and tips are real.</span></span>
            <div className="v8sp-speakers">
              {stage.length ? stage.map((p) => (
                <button key={p.person.public_username} type="button" className="v8sp-speaker" onClick={() => (isHost && !p.me ? setPerson(p) : onOpenProfile(p.person.public_username))}>
                  <span className={`v8sp-ring ${p.role}`}><Ava src={p.person.avatar_url} name={p.person.display_name} size={64} /></span>
                  <b>{p.person.display_name.split(" ")[0]}{p.person.verified ? <V8Badges verified size="sm" /> : null}</b><small>{p.role === "host" ? "Host" : "Speaker"}{p.muted ? " · muted" : ""}</small>
                </button>
              )) : <p className="v8c-muted">The host hasn’t joined the stage yet.</p>}
            </div>
            <h3 className="v8sp-h">Audience ({audience.length})</h3>
            <div className="v8sp-audience">{audience.slice(0, 24).map((p) => <span key={p.person.public_username} title={`@${p.person.public_username}`} className={p.hand_raised ? "hand" : ""}><Ava src={p.person.avatar_url} name={p.person.display_name} size={40} />{p.hand_raised ? <i>✋</i> : null}</span>)}
              {!audience.length ? <p className="v8c-muted">No listeners yet.</p> : null}</div>
            {role === "speaker" || isHost ? (
              <div className="v8sp-mic">
                {mic === "on" ? <span className="v8c-ok-box"><V8Icon name="mic" size={18} />Microphone ready</span>
                  : mic === "denied" ? <div className="v8c-err-box"><V8Icon name="mic" size={18} /><span><b>Microphone access denied.</b> Allow microphone access in your browser settings to speak.</span><button type="button" className="v8-btn v8-btn-soft" onClick={turnOnMic}>Try again</button></div>
                  : mic === "unsupported" ? <p className="v8c-err">This browser can’t use a microphone here. You can keep listening.</p>
                  : <button type="button" className="v8-btn v8-btn-primary" onClick={turnOnMic} disabled={mic === "asking"}><V8Icon name="mic" size={18} />{mic === "asking" ? "Waiting for permission…" : "Turn on microphone"}</button>}
              </div>
            ) : null}
            <div className="v8l-actions">
              {!isHost ? <button type="button" className={`v8-btn ${r.viewer.hand_raised ? "v8-btn-soft" : ""}`} onClick={() => act("hand", {}, (j) => j.message).then((j) => j && setRoom((s) => ({ ...s, viewer: { ...s.viewer, hand_raised: j.hand_raised } })))}>✋ {r.viewer.hand_raised ? "Request sent" : "Request to speak"}</button> : null}
              {["👏", "❤️", "💡"].map((e) => <button key={e} type="button" className="v8l-react" aria-label={`React ${e}`} onClick={() => act("react", { reaction: e })}>{e}</button>)}
              {!isHost ? <button type="button" className="v8-btn v8-btn-soft" onClick={() => (signedIn ? setSheet("tip") : onRequireLogin())}>Tip host</button> : null}
              {isHost ? <button type="button" className="v8-btn v8-btn-danger" onClick={() => setConfirmEnd(true)}>End Space</button> : <button type="button" className="v8-btn v8-btn-danger" onClick={onBack}>Leave quietly</button>}
            </div>
            {isHost && hands.length ? (
              <div className="v8sp-requests"><h3 className="v8sp-h">Requests to speak ({hands.length})</h3>
                {hands.map((p) => <div key={p.person.public_username} className="v8c-rail-item"><Ava src={p.person.avatar_url} name={p.person.display_name} size={36} /><span className="v8c-rail-text"><b>@{p.person.public_username}</b><small>wants to speak</small></span>
                  <button type="button" className="v8-btn v8-btn-primary v8c-rail-cta" onClick={() => act("host/approve-speaker", { handle: p.person.public_username }, "Invited to speak")}>Invite</button></div>)}
              </div>
            ) : null}
          </>) : r.state === "scheduled" ? (
            <div className="v8l-stage-over static"><V8Icon name="bell" size={28} /><b>Starts {when(r.starts_at)}</b><span>{fmt(r.counts.reminders)} people going</span>
              {isHost ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => act("host/start", {}, "Your Space is live").then(() => reload())}>Start Space</button>
                : <button type="button" className={`v8-btn ${r.viewer.reminded ? "" : "v8-btn-primary"}`} onClick={() => act("remind", {}, (j) => j.message).then((j) => j && setRoom((s) => ({ ...s, viewer: { ...s.viewer, reminded: j.reminded } })))}>{r.viewer.reminded ? "Reminder set ✓" : "Remind me"}</button>}</div>
          ) : <div className="v8l-stage-over static"><b>This Space has ended</b><span>Thanks for listening.</span></div>}
          <div className="v8l-host">
            <button type="button" className="v8l-host-who" onClick={() => onOpenProfile(r.host.public_username)}><Ava src={r.host.avatar_url} name={r.host.display_name} size={40} /><span><b>Hosted by {r.host.display_name}</b><small>@{r.host.public_username}</small></span></button>
          </div>
        </section>
        <aside className="v8-card v8l-side"><h3>Space chat</h3>
          {r.locked ? <p className="v8c-muted"><V8Icon name="lock" size={14} /> Chat is for members of @{r.host.public_username}.</p>
            : r.state === "live" ? <RoomChat api={api} code={code} events={events} room={r} signedIn={signedIn} onRequireLogin={onRequireLogin} onPin={isHost ? (e) => act("host/pin", { seq: e.seq }, "Pinned") : null} /> : <p className="v8c-muted">Chat opens when the Space starts.</p>}
        </aside>
      </div>
      <TipSheet open={sheet === "tip"} api={api} host={r.host} code={code} onClose={() => setSheet("")} onTipped={() => tick()} />
      <ShareSheet open={sheet === "share"} title={r.title} link={r.route} onClose={() => setSheet("")} />
      <Sheet open={sheet === "more"} title={r.title} onClose={() => setSheet("")}>
        {isHost ? <MembersOnlyRow r={r} act={act} onDone={() => { setSheet(""); reload(); }} /> : null}
        {!isHost ? <button type="button" className="v8c-row" onClick={() => (signedIn ? setSheet("report") : onRequireLogin())}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report this Space</b></span></button> : null}
        {r.rules ? <div className="v8l-rules"><b>Space rules</b><p>{r.rules}</p></div> : <p className="v8c-muted">Be kind. Hosts can remove anyone who breaks the Community Guidelines.</p>}
      </Sheet>
      <ReportSheet open={sheet === "report"} what="Space" onClose={() => setSheet("")} onSubmit={(reason, details) => api("POST", `/api/v8/rooms/${code}/report`, { reason, details })} />
      <V8Confirm open={confirmEnd} danger title="End this Space?" body="Everyone will be disconnected and the chat will close." confirmLabel="End Space" onCancel={() => setConfirmEnd(false)} onConfirm={async () => { setConfirmEnd(false); await act("host/end", {}, "Space ended"); reload(); }} />
      <Sheet open={Boolean(person)} title={person ? `@${person.person.public_username}` : ""} onClose={() => setPerson(null)}>
        {person ? (<>
          <button type="button" className="v8c-row" onClick={async () => { await act("host/approve-speaker", { handle: person.person.public_username }, (j) => (j.role === "speaker" ? "Now a speaker" : "Moved to audience")); setPerson(null); }}><span className="v8c-row-ico"><V8Icon name="mic" size={20} /></span><span className="v8c-row-text"><b>{person.role === "speaker" ? "Move to audience" : "Invite to speak"}</b></span></button>
          <button type="button" className="v8c-row" onClick={async () => { await act("host/mute", { handle: person.person.public_username }, (j) => (j.muted ? "Muted" : "Unmuted")); setPerson(null); }}><span className="v8c-row-ico"><V8Icon name="mute" size={20} /></span><span className="v8c-row-text"><b>{person.muted ? "Unmute" : "Mute"}</b></span></button>
          <button type="button" className="v8c-row danger" onClick={async () => { await act("host/remove", { handle: person.person.public_username }, "Removed from Space"); setPerson(null); }}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Remove from Space</b></span></button>
        </>) : null}
      </Sheet>
    </div>
  );
}

export default function SpacesScreen({ api, user, focus, onNav, onRequireLogin, onOpenProfile }) {
  if (/^SPC-[0-9A-F]{12}$/.test(focus || "")) return <SpaceRoom api={api} code={focus} user={user} onBack={() => onNav("spaces")} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} />;
  return <RoomList api={api} kind="space" title="Spaces" sub="Live audio conversations. Listen in, raise your hand, join the talk." signedIn={Boolean(user)} onRequireLogin={onRequireLogin}
    tabs={[{ value: "for-you", label: "For You" }, { value: "upcoming", label: "Upcoming" }, { value: "mine", label: "My Spaces" }]} onOpen={(k) => onNav(`spaces/${k}`)} />;
}

// HOWDI V8 voice & video calls from Messages (register CON-010 "call/video entry"). Uses the existing session-bound call API
// (/api/connect/calls — caller from the session, opaque per-call participant tokens, block + contact-permission checks,
// ring rate-limit) with WebRTC in the browser. States: calling · ringing (incoming) · connecting · in call (timer, mute,
// camera, flip) · declined · no answer · ended · permission denied · failed. When a call ends, the caller asks Messages to
// log it (outcome read from the call record on the server). Preview/Test: peers connect directly (STUN only, no TURN relay).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { V8Icon } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { useApi, Ava } from "./common";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }];
const RING_MS = 45000;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Mounted once in the shell for signed-in members: incoming calls ring on any page; outgoing calls start from a
// window event { handle, name, type: "VOICE"|"VIDEO", conversation }.
export default function V8CallCenter({ apiBase, getAuthHeaders, user }) {
  const api = useApi(apiBase, getAuthHeaders);
  const [call, setCall] = useState(null); // { dir, id, type, peer:{handle,name,avatar}, conversation }
  const [incoming, setIncoming] = useState(null);
  const busy = useRef(false); busy.current = Boolean(call);
  useEffect(() => {
    if (!user) return undefined;
    const tick = async () => {
      if (busy.current) return;
      const r = await api("GET", "/api/connect/calls/inbox");
      const c = r.ok && (r.json.calls || [])[0];
      setIncoming((cur) => (c ? { id: c.id, type: c.call_type, peer: { handle: c.public_username, name: c.full_name, avatar: c.profile_image }, group: Number(c.participant_count) > 2 } : cur && cur.answered ? cur : null));
    };
    tick(); const id = window.setInterval(tick, 3000);
    return () => window.clearInterval(id);
  }, [api, user]);
  useEffect(() => {
    const on = (e) => { const d = e.detail || {}; if (!busy.current && d.handle) setCall({ dir: "out", type: d.type === "VIDEO" ? "VIDEO" : "VOICE", peer: { handle: d.handle, name: d.name || `@${d.handle}`, avatar: d.avatar || null }, conversation: d.conversation || "" }); };
    window.addEventListener("howdi:v8-call", on); return () => window.removeEventListener("howdi:v8-call", on);
  }, []);
  if (!user) return null;
  return createPortal(<>
    {incoming && !call ? <Incoming c={incoming} onAccept={() => { setCall({ dir: "in", ...incoming }); setIncoming(null); }} onDecline={async () => { await api("PATCH", `/api/connect/calls/${incoming.id}/respond`, { accept: false }); setIncoming(null); }} /> : null}
    {call ? <CallScreen api={api} call={call} onClose={() => setCall(null)} /> : null}
  </>, document.body);
}

function Incoming({ c, onAccept, onDecline }) {
  return (
    <div className="v8call-ring" role="alertdialog" aria-label={`Incoming ${c.type === "VIDEO" ? "video" : "voice"} call from @${c.peer.handle}`}>
      <Ava src={c.peer.avatar} name={c.peer.name} size={56} />
      <span><b>{c.peer.name}</b><small>Incoming {c.type === "VIDEO" ? "video" : "voice"} call{c.group ? " (group)" : ""} · @{c.peer.handle}</small></span>
      <button type="button" className="v8call-btn decline" onClick={onDecline} aria-label="Decline call"><V8Icon name="call" size={22} /></button>
      <button type="button" className="v8call-btn accept" onClick={onAccept} aria-label="Accept call"><V8Icon name={c.type === "VIDEO" ? "video" : "call"} size={22} /></button>
    </div>
  );
}

function CallScreen({ api, call, onClose }) {
  const ui = useV8Ui();
  const [phase, setPhase] = useState(call.dir === "out" ? "calling" : "connecting"); // calling · connecting · live · declined · noanswer · ended · denied · failed
  const [secs, setSecs] = useState(0); const [muted, setMuted] = useState(false); const [camOff, setCamOff] = useState(false); const [msg, setMsg] = useState("");
  const video = call.type === "VIDEO";
  const local = useRef(null); const remote = useRef(null); const pc = useRef(null); const stream = useRef(null);
  const ids = useRef({ id: call.id || null, me: null, peer: null, after: 0, offered: false, t0: 0, done: false });
  const cleanup = useCallback(() => { try { pc.current?.close(); } catch { /* closed */ } pc.current = null; stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);
  const finish = useCallback(async (p, text) => {
    if (ids.current.done) return; ids.current.done = true;
    setPhase(p); if (text) setMsg(text); cleanup();
    if (ids.current.id) await api("POST", `/api/connect/calls/${ids.current.id}/leave`, {});
    // the caller records the call in the chat; the server reads the outcome from the call record
    if (call.dir === "out" && call.conversation && ids.current.id) window.setTimeout(() => api("POST", `/api/v8/conversations/${call.conversation}/call-log`, { call: ids.current.id }).then(() => window.dispatchEvent(new Event("howdi:v8-chat-refresh"))), 600);
  }, [api, call, cleanup]);
  const signal = useCallback((type, payload) => api("POST", `/api/connect/calls/${ids.current.id}/signal`, { signalType: type, toToken: ids.current.peer, payload }), [api]);
  const makePc = useCallback(() => {
    const p = new RTCPeerConnection({ iceServers: ICE }); pc.current = p;
    stream.current?.getTracks().forEach((t) => p.addTrack(t, stream.current));
    p.onicecandidate = (e) => { if (e.candidate) signal("ICE", { candidate: e.candidate.toJSON() }); };
    p.ontrack = (e) => { if (remote.current && e.streams[0]) remote.current.srcObject = e.streams[0]; };
    p.onconnectionstatechange = () => { if (p.connectionState === "connected") { setPhase("live"); if (!ids.current.t0) ids.current.t0 = Date.now(); } if (p.connectionState === "failed") finish("failed", "The connection dropped. Calls in this preview connect directly between devices; some networks need a relay server."); };
    return p;
  }, [signal, finish]);
  useEffect(() => {
    let stop = false;
    (async () => {
      try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user" } : false }); if (local.current) local.current.srcObject = stream.current; }
      catch (e) { if (call.dir === "in") await api("PATCH", `/api/connect/calls/${call.id}/respond`, { accept: false }); setPhase("denied"); setMsg(e && e.name === "NotAllowedError" ? `Allow microphone${video ? " and camera" : ""} access in your browser settings to call.` : "No microphone or camera found."); return; }
      if (call.dir === "out") {
        const r = await api("POST", "/api/connect/calls", { callType: call.type, inviteeUsernames: [call.peer.handle] });
        if (!r.ok) { cleanup(); setPhase("failed"); setMsg(r.json.message || "Couldn’t start the call."); return; }
        ids.current.id = r.json.call.id; ids.current.me = r.json.call.my_token;
      } else {
        const r = await api("PATCH", `/api/connect/calls/${call.id}/respond`, { accept: true });
        if (!r.ok) { cleanup(); setPhase("ended"); setMsg("This call has ended."); return; }
      }
      const started = Date.now();
      while (!stop && !ids.current.done) {
        const st = await api("GET", `/api/connect/calls/${ids.current.id}/state`);
        if (st.ok) {
          const parts = st.json.participants || []; const peer = parts.find((x) => !x.is_viewer);
          if (peer && peer.token) ids.current.peer = peer.token;
          if (st.json.call.status === "ENDED") { finish("ended", "Call ended."); break; }
          if (call.dir === "out" && peer) {
            if (peer.invite_status === "DECLINED") { finish("declined", `@${call.peer.handle} declined the call.`); break; }
            if (peer.invite_status === "JOINED" && !ids.current.offered) { ids.current.offered = true; setPhase("connecting"); const p = makePc(); const o = await p.createOffer(); await p.setLocalDescription(o); await signal("OFFER", { sdp: o }); }
            if (peer.invite_status === "RINGING" && Date.now() - started > RING_MS) { finish("noanswer", `@${call.peer.handle} didn’t answer.`); break; }
          }
          if (peer && peer.invite_status === "LEFT" && ids.current.t0) { finish("ended", "Call ended."); break; }
        }
        const sg = await api("GET", `/api/connect/calls/${ids.current.id}/signals?after=${ids.current.after}`);
        for (const s of (sg.ok ? sg.json.signals || [] : [])) {
          ids.current.after = Math.max(ids.current.after, Number(s.id) || 0);
          if (s.from_token) ids.current.peer = s.from_token;
          try {
            if (s.signal_type === "OFFER" && call.dir === "in") { const p = pc.current || makePc(); await p.setRemoteDescription(s.payload.sdp); const a = await p.createAnswer(); await p.setLocalDescription(a); await signal("ANSWER", { sdp: a }); }
            else if (s.signal_type === "ANSWER" && pc.current) await pc.current.setRemoteDescription(s.payload.sdp);
            else if (s.signal_type === "ICE" && pc.current && s.payload.candidate) await pc.current.addIceCandidate(s.payload.candidate);
          } catch { /* a late or duplicate candidate is harmless */ }
        }
        await new Promise((ok) => window.setTimeout(ok, 1200));
      }
    })();
    return () => { stop = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase !== "live") return undefined; const id = window.setInterval(() => setSecs((Date.now() - ids.current.t0) / 1000), 500); return () => window.clearInterval(id); }, [phase]);
  useEffect(() => () => { if (!ids.current.done) { ids.current.done = true; cleanup(); if (ids.current.id) api("POST", `/api/connect/calls/${ids.current.id}/leave`, {}); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleMute = () => { const on = !muted; stream.current?.getAudioTracks().forEach((t) => { t.enabled = !on; }); setMuted(on); ui?.announce(on ? "Microphone off" : "Microphone on"); };
  const toggleCam = () => { const off = !camOff; stream.current?.getVideoTracks().forEach((t) => { t.enabled = !off; }); setCamOff(off); };
  const over = ["declined", "noanswer", "ended", "denied", "failed"].includes(phase);
  const label = { calling: "Calling…", connecting: "Connecting…", live: mmss(secs), declined: "Declined", noanswer: "No answer", ended: "Call ended", denied: "Permission needed", failed: "Call failed" }[phase];
  return (
    <div className={`v8call ${video ? "video" : "voice"}`} role="dialog" aria-modal="true" aria-label={`${video ? "Video" : "Voice"} call with @${call.peer.handle}`}>
      {video ? <video ref={remote} className="v8call-remote" autoPlay playsInline /> : <audio ref={remote} autoPlay />}
      {video ? <video ref={local} className={`v8call-local ${camOff ? "off" : ""}`} autoPlay playsInline muted /> : null}
      <div className="v8call-info">
        {!video || phase !== "live" ? <Ava src={call.peer.avatar} name={call.peer.name} size={96} /> : null}
        <b>{call.peer.name}</b><span role="status" aria-live="polite">{label}</span>
        {msg ? <small>{msg}</small> : null}
        <small className="v8call-note">Preview / Test · {video ? "video" : "voice"} call · encrypted in transit</small>
      </div>
      <div className="v8call-bar">
        {over ? <button type="button" className="v8-btn v8-btn-primary" onClick={onClose}>Close</button> : (<>
          <button type="button" className={`v8call-btn ${muted ? "on" : ""}`} aria-pressed={muted} aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute}><V8Icon name={muted ? "mute" : "mic"} size={22} /></button>
          {video ? <button type="button" className={`v8call-btn ${camOff ? "on" : ""}`} aria-pressed={camOff} aria-label={camOff ? "Turn camera on" : "Turn camera off"} onClick={toggleCam}><V8Icon name={camOff ? "eyeoff" : "video"} size={22} /></button> : null}
          <button type="button" className="v8call-btn decline" aria-label="End call" onClick={() => finish(phase === "live" ? "ended" : call.dir === "out" ? "ended" : "ended", phase === "live" ? `Call ended · ${mmss(secs)}` : "Call cancelled.")}><V8Icon name="call" size={22} /></button>
        </>)}
      </div>
    </div>
  );
}

// HOWDI V8 Create Vibe — in-app recording and trimming (VIB-006, board 32 panel 5 "Record or upload · trim").
// Record: camera + microphone permission (allow / deny / unsupported), 9:16 preview, front/back camera, up to 60 s,
// review → use or retake. Trim: choose start and end on the video, preview the cut, then HOWDI re-records that part in
// the browser (no upload until you post). Output is WebM so the server's type check accepts it.
import { useEffect, useRef, useState } from "react";
import { V8Icon } from "../V8Shell";
import { Sheet } from "./common";

export const MAX_RECORD_S = 60;
const blobToDataUrl = (blob) => new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result || "")); fr.onerror = () => bad(new Error("read")); fr.readAsDataURL(blob); });
const pickMime = () => {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return "";
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
// the stored type must be plain "video/webm" (no codecs parameter) so the data URL matches the server's pattern
async function finish(chunks) { const blob = new Blob(chunks, { type: "video/webm" }); return { data: await blobToDataUrl(blob), size: blob.size }; }

export function RecordSheet({ open, onClose, onUse }) {
  const video = useRef(null); const stream = useRef(null); const rec = useRef(null); const chunks = useRef([]); const timer = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | asking | ready | recording | review | denied | unsupported | error
  const [facing, setFacing] = useState("user"); const [secs, setSecs] = useState(0); const [clip, setClip] = useState(null);
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const start = async (face = facing) => {
    stop(); setClip(null); setSecs(0);
    if (!navigator.mediaDevices?.getUserMedia || !pickMime()) { setPhase("unsupported"); return; }
    setPhase("asking");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face, width: { ideal: 720 }, height: { ideal: 1280 }, aspectRatio: { ideal: 9 / 16 } }, audio: true });
      if (video.current) { video.current.srcObject = stream.current; video.current.muted = true; await video.current.play().catch(() => {}); }
      setPhase("ready");
    } catch (e) { setPhase(e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "error"); }
  };
  useEffect(() => { if (open) start(); return () => { window.clearInterval(timer.current); if (rec.current && rec.current.state !== "inactive") rec.current.stop(); stop(); }; }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const record = () => {
    if (!stream.current) return;
    chunks.current = []; const r = new MediaRecorder(stream.current, { mimeType: pickMime(), videoBitsPerSecond: 1500000 });
    r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.current.push(e.data); };
    r.onstop = async () => { window.clearInterval(timer.current); const out = await finish(chunks.current); setClip({ ...out, url: URL.createObjectURL(new Blob(chunks.current, { type: "video/webm" })) }); setPhase("review"); stop(); };
    rec.current = r; r.start(250); setPhase("recording"); setSecs(0);
    const t0 = Date.now();
    timer.current = window.setInterval(() => { const s = (Date.now() - t0) / 1000; setSecs(s); if (s >= MAX_RECORD_S && r.state === "recording") r.stop(); }, 200);
  };
  const close = () => { if (rec.current && rec.current.state === "recording") rec.current.stop(); stop(); setPhase("idle"); onClose(); };
  return (
    <Sheet open={open} title="Record a Vibe" onClose={close} wide>
      <div className="v8vr">
        <div className="v8vr-stage">
          {phase === "review" && clip ? <video src={clip.url} controls playsInline autoPlay loop aria-label="Your recording" />
            : <video ref={video} playsInline muted aria-label="Camera preview" className={facing === "user" ? "mirror" : ""} />}
          {phase === "recording" ? <span className="v8vr-rec" role="status"><i />REC {mmss(secs)} / {mmss(MAX_RECORD_S)}</span> : null}
          {phase === "asking" ? <div className="v8vr-over"><V8Icon name="camera" size={30} /><b>Allow camera and microphone</b><span>Your browser will ask for permission.</span></div> : null}
          {phase === "denied" ? <div className="v8vr-over"><V8Icon name="lock" size={30} /><b>Camera access is blocked</b><span>Click the lock next to the address, allow Camera and Microphone, then try again. You can still upload a video instead.</span><button type="button" className="v8-btn v8-btn-primary" onClick={() => start()}>Try again</button></div> : null}
          {phase === "unsupported" ? <div className="v8vr-over"><V8Icon name="alert" size={30} /><b>Recording isn’t available here</b><span>This browser can’t record video. Upload a video instead.</span></div> : null}
          {phase === "error" ? <div className="v8vr-over"><V8Icon name="alert" size={30} /><b>No camera found</b><span>Connect a camera or upload a video instead.</span><button type="button" className="v8-btn" onClick={() => start()}>Retry</button></div> : null}
        </div>
        <div className="v8vr-bar">
          {phase === "ready" ? <>
            <button type="button" className="v8-btn" onClick={() => { const f = facing === "user" ? "environment" : "user"; setFacing(f); start(f); }}><V8Icon name="refresh" size={16} />Flip camera</button>
            <button type="button" className="v8vr-shutter" aria-label="Start recording" onClick={record}><i /></button>
            <small className="v8c-muted">Up to {MAX_RECORD_S} seconds</small>
          </> : null}
          {phase === "recording" ? <button type="button" className="v8vr-shutter on" aria-label="Stop recording" onClick={() => rec.current?.stop()}><i /></button> : null}
          {phase === "review" && clip ? <>
            <button type="button" className="v8-btn" onClick={() => start()}><V8Icon name="refresh" size={16} />Retake</button>
            <small className="v8c-muted">{mmss(secs)} · {(clip.size / 1048576).toFixed(1)} MB</small>
            <button type="button" className="v8-btn v8-btn-primary" disabled={clip.size > 20 * 1024 * 1024} onClick={() => { onUse({ data: clip.data, type: "video", name: "Recorded in HOWDI.webm", size: clip.size, duration: secs }); close(); }}>{clip.size > 20 * 1024 * 1024 ? "Too large (20 MB max)" : "Use this video"}</button>
          </> : null}
        </div>
      </div>
    </Sheet>
  );
}

export function TrimSheet({ open, file, onClose, onTrimmed }) {
  const video = useRef(null);
  const [dur, setDur] = useState(0); const [a, setA] = useState(0); const [b, setB] = useState(0);
  const [phase, setPhase] = useState("edit"); const [pct, setPct] = useState(0); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setPhase("edit"); setErr(""); setPct(0); } }, [open]);
  const setLength = (d) => { setDur(d); setA(0); setB(Math.min(d, MAX_RECORD_S)); };
  // Browser-recorded WebM has no duration in its header (reported as Infinity): use the known recording length, or
  // seek far past the end once so the browser scans the file and reports the real duration.
  const loaded = () => {
    const v = video.current; if (!v) return;
    if (Number.isFinite(v.duration) && v.duration > 0) { setLength(v.duration); return; }
    if (file && Number(file.duration) > 0) setLength(Number(file.duration));
    const fix = () => { if (Number.isFinite(v.duration) && v.duration > 0) { v.removeEventListener("durationchange", fix); setLength(v.duration); v.currentTime = 0; } };
    v.addEventListener("durationchange", fix); try { v.currentTime = 1e7; } catch { /* ignore */ }
  };
  const loop = () => { const v = video.current; if (v && phase === "edit" && v.currentTime >= b) { v.currentTime = a; } };
  const canCapture = typeof HTMLMediaElement !== "undefined" && (HTMLMediaElement.prototype.captureStream || HTMLMediaElement.prototype.mozCaptureStream) && pickMime();
  const apply = async () => {
    const v = video.current; if (!v) return;
    if (!canCapture) { setErr("This browser can’t trim videos. Trim it on your device, then upload it."); return; }
    setPhase("working"); setErr("");
    try {
      v.pause(); if (Math.abs(v.currentTime - a) > 0.05) { const seeked = new Promise((ok) => { v.onseeked = () => ok(); }); v.currentTime = a; await seeked; }
      const cs = (v.captureStream || v.mozCaptureStream).call(v);
      const chunks = []; const r = new MediaRecorder(cs, { mimeType: pickMime(), videoBitsPerSecond: 1500000 });
      r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const done = new Promise((ok) => { r.onstop = ok; });
      v.muted = false; v.volume = 0; r.start(250); await v.play();
      await new Promise((ok) => { const t = window.setInterval(() => { setPct(Math.min(100, Math.round(((v.currentTime - a) / Math.max(0.1, b - a)) * 100))); if (v.currentTime >= b || v.ended) { window.clearInterval(t); ok(); } }, 100); });
      v.pause(); r.stop(); await done;
      const out = await finish(chunks);
      if (out.size > 20 * 1024 * 1024) { setPhase("edit"); setErr("The trimmed video is still over 20 MB. Choose a shorter part."); return; }
      onTrimmed({ data: out.data, type: "video", name: `Trimmed ${mmss(a)}–${mmss(b)}.webm`, size: out.size, trimmed: [a, b], duration: b - a }); onClose();
    } catch { setPhase("edit"); setErr("Trimming didn’t work on this video. Try another video or upload a shorter one."); }
  };
  const len = Math.max(0, b - a);
  return (
    <Sheet open={open} title="Trim video" onClose={phase === "working" ? () => {} : onClose} wide>
      <div className="v8vt">
        {file ? <video ref={video} src={file.data} playsInline muted controls={phase === "edit"} onLoadedMetadata={loaded} onTimeUpdate={loop} aria-label="Video to trim" /> : null}
        {dur ? (<>
          <div className="v8vt-track" aria-hidden="true"><i style={{ left: `${(a / dur) * 100}%`, width: `${(len / dur) * 100}%` }} /></div>
          <div className="v8vt-ranges">
            <label>Start <b>{mmss(a)}</b><input type="range" min={0} max={dur} step={0.1} value={a} disabled={phase !== "edit"} onChange={(e) => { const x = Math.min(Number(e.target.value), b - 1); setA(Math.max(0, x)); if (video.current) video.current.currentTime = Math.max(0, x); }} /></label>
            <label>End <b>{mmss(b)}</b><input type="range" min={0} max={dur} step={0.1} value={b} disabled={phase !== "edit"} onChange={(e) => { const x = Math.max(Number(e.target.value), a + 1); setB(Math.min(dur, x, a + MAX_RECORD_S)); }} /></label>
          </div>
          <p className="v8c-muted">Keeping <b>{mmss(len)}</b> of {mmss(dur)}. Vibes can be up to {MAX_RECORD_S} seconds.</p>
        </>) : <p className="v8c-muted">Loading video…</p>}
        {phase === "working" ? <div className="v8c-upload" role="status"><span>Trimming… {pct}% (plays through the part you kept)</span><div className="v8c-progress"><i style={{ width: `${pct}%` }} /></div></div> : null}
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" disabled={phase === "working"} onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={phase === "working" || !dur || len < 1} onClick={apply}>{phase === "working" ? "Trimming…" : "Apply trim"}</button></div>
      </div>
    </Sheet>
  );
}

// HOWDI V8 settings pages opened from the profile hub (never from the rail):
//   · Appearance & accessibility — MY-011 + ACC-002 (board 30 "Accessibility controls" / board 12 dark)
//   · Privacy & permissions      — TRU-003 permission denied / recovery (board 12 #6, board 30 #4)
//   · Identity & badges          — ID-001..003 settings + public preview (board 12 #4)
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "./V8Shell";
import { V8Badges, V8BadgeExplainer, V8Confirm, applyV8Prefs, saveV8Prefs, useSingleFlight, useV8Ui } from "./V8System";

function Switch({ checked, onChange, label, hint, icon }) {
  return (
    <label className="v8-setting">
      <span className="v8-setting-ico"><V8Icon name={icon} size={20} /></span>
      <span className="v8-setting-text"><b>{label}</b>{hint ? <small>{hint}</small> : null}</span>
      <input type="checkbox" role="switch" className="v8-switch" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} aria-checked={Boolean(checked)} />
    </label>
  );
}

function PageFrame({ title, onBack, children, intro }) {
  return (
    <div className="v8-page" data-v8-page="settings">
      <div className="v8-page-inner v8-settings-page">
        <button type="button" className="v8-back" onClick={onBack}><V8Icon name="back" size={18} />Back</button>
        <h1 className="v8-page-title">{title}</h1>
        {intro ? <p className="v8-page-intro">{intro}</p> : null}
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- MY-011 / ACC-002 */
export function V8Appearance({ prefs, setPrefs, onBack }) {
  const ui = useV8Ui();
  const update = (patch, msg) => {
    const next = { ...prefs, ...patch };
    setPrefs(next); saveV8Prefs(next); applyV8Prefs(next);
    if (msg) ui?.announce(msg);
  };
  const step = (d) => update({ textScale: Math.min(150, Math.max(88, (Number(prefs.textScale) || 100) + d)) }, `Text size ${Math.round(16 * (Math.min(150, Math.max(88, (Number(prefs.textScale) || 100) + d)) / 100))} pixels`);
  const px = Math.round(16 * ((Number(prefs.textScale) || 100) / 100));
  return (
    <PageFrame title="Appearance & accessibility" onBack={onBack} intro="These settings are saved on this device.">
      <div className="v8-settings-grid">
        <section className="v8-card v8-settings-card" aria-labelledby="v8-theme-h">
          <h2 id="v8-theme-h">Theme</h2>
          <div className="v8-segment" role="radiogroup" aria-label="Theme">
            {[["light", "Light", "sun"], ["dark", "Dark", "moon"], ["system", "System", "contrast"]].map(([v, l, ic]) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.theme === v} onClick={() => update({ theme: v }, `${l} theme`)}><V8Icon name={ic} size={18} />{l}</button>
            ))}
          </div>
          <p className="v8-muted" style={{ marginTop: 10 }}>Dark mode uses deep navy and slate with the same cobalt actions.</p>
        </section>

        <section className="v8-card v8-settings-card" aria-labelledby="v8-a11y-h">
          <h2 id="v8-a11y-h">Accessibility controls</h2>
          <div className="v8-setting">
            <span className="v8-setting-ico"><V8Icon name="text" size={20} /></span>
            <span className="v8-setting-text"><b>Text size</b><small>Applies to HOWDI pages</small></span>
            <span className="v8-stepper">
              <button type="button" onClick={() => step(-6)} aria-label="Smaller text" disabled={prefs.textScale <= 88}>−</button>
              <output aria-live="polite">{px}px</output>
              <button type="button" onClick={() => step(6)} aria-label="Larger text" disabled={prefs.textScale >= 150}>+</button>
            </span>
          </div>
          <Switch icon="motion" label="Reduced motion" hint="Minimise animations" checked={prefs.reducedMotion} onChange={(v) => update({ reducedMotion: v }, v ? "Reduced motion on" : "Reduced motion off")} />
          <Switch icon="cc" label="Captions" hint="Show captions when available" checked={prefs.captions} onChange={(v) => update({ captions: v }, v ? "Captions on" : "Captions off")} />
          <Switch icon="contrast" label="High contrast" hint="Increase colour contrast" checked={prefs.highContrast} onChange={(v) => update({ highContrast: v }, v ? "High contrast on" : "High contrast off")} />
          <label className="v8-setting">
            <span className="v8-setting-ico"><V8Icon name="globe" size={20} /></span>
            <span className="v8-setting-text"><b>Language</b><small>More languages are being prepared</small></span>
            <select value={prefs.language} onChange={(e) => update({ language: e.target.value })} className="v8-select">
              <option value="en">English (India)</option>
            </select>
          </label>
        </section>

        <section className="v8-card v8-settings-card v8-preview-card" aria-labelledby="v8-prev-h">
          <h2 id="v8-prev-h">Preview</h2>
          <p className="v8-preview-text">This is how your text will look. A clean, readable and inclusive experience for everyone.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="button" className="v8-btn v8-btn-primary">Primary action</button><button type="button" className="v8-btn">Secondary</button></div>
        </section>
      </div>
    </PageFrame>
  );
}

/* ---------------------------------------------------------------- TRU-003 device permissions */
const PERMS = [
  { key: "camera", label: "Camera", hint: "Used to take and share photos and videos", icon: "camera" },
  { key: "microphone", label: "Microphone", hint: "Used for voice messages, Live and Ask HOWDI", icon: "mic" },
  { key: "geolocation", label: "Location", hint: "Used to suggest nearby workers, events and delivery areas", icon: "pin" },
  { key: "notifications", label: "Notifications", hint: "Replies, bookings, orders and class reminders", icon: "bell2" },
];
async function queryPerm(key) {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const r = await navigator.permissions.query({ name: key });
    return r.state; // granted | denied | prompt
  } catch { return "unknown"; }
}
async function requestPerm(key) {
  try {
    if (key === "camera" || key === "microphone") {
      const s = await navigator.mediaDevices.getUserMedia(key === "camera" ? { video: true } : { audio: true });
      s.getTracks().forEach((t) => t.stop());
    } else if (key === "geolocation") {
      await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { timeout: 8000, maximumAge: 600000 }));
    } else if (key === "notifications" && "Notification" in window) {
      await Notification.requestPermission();
    }
  } catch { /* denied or unavailable — the refreshed state tells the person */ }
}
export function V8Permissions({ onBack, onOpenPrivacy }) {
  const [states, setStates] = useState({});
  const [helpFor, setHelpFor] = useState(null);
  const refresh = useCallback(async () => {
    const out = {};
    for (const p of PERMS) out[p.key] = await queryPerm(p.key);
    setStates(out);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const label = (s) => (s === "granted" ? "Allowed" : s === "denied" ? "Denied" : s === "prompt" ? "Ask every time" : "Not available");
  return (
    <PageFrame title="Privacy & permissions" onBack={onBack} intro="Control who can see your content and what this device lets HOWDI use.">
      <div className="v8-settings-grid">
        <section className="v8-card v8-settings-card" aria-labelledby="v8-who-h">
          <h2 id="v8-who-h">Who can see my content</h2>
          <button type="button" className="v8-setting v8-setting-link" onClick={onOpenPrivacy}>
            <span className="v8-setting-ico"><V8Icon name="globe" size={20} /></span>
            <span className="v8-setting-text"><b>Profile visibility and audience</b><small>Public or private profile, default audience, who can message, mention and tag you</small></span>
            <V8Icon name="chevr" size={18} />
          </button>
          <button type="button" className="v8-setting v8-setting-link" onClick={onOpenPrivacy}>
            <span className="v8-setting-ico"><V8Icon name="shield" size={20} /></span>
            <span className="v8-setting-text"><b>Blocked users</b><small>People you blocked can’t see you, message you or find you</small></span>
            <V8Icon name="chevr" size={18} />
          </button>
        </section>
        <section className="v8-card v8-settings-card" aria-labelledby="v8-dev-h">
          <h2 id="v8-dev-h">Device permissions</h2>
          {PERMS.map((p) => {
            const s = states[p.key];
            return (
              <div key={p.key} className="v8-perm">
                <span className="v8-setting-ico"><V8Icon name={p.icon} size={20} /></span>
                <span className="v8-setting-text"><b>{p.label} <em className={`v8-perm-state ${s || "unknown"}`}>{s ? label(s) : "Checking…"}</em></b><small>{p.hint}</small></span>
                <span className="v8-perm-actions">
                  {s === "denied" ? <><button type="button" className="v8-btn v8-btn-primary" onClick={() => setHelpFor(p)}>Open settings</button><button type="button" className="v8-link" onClick={() => setHelpFor(null)}>Continue without</button></> : null}
                  {s === "prompt" ? <button type="button" className="v8-btn v8-btn-soft" onClick={async () => { await requestPerm(p.key); refresh(); }}>Allow</button> : null}
                </span>
              </div>
            );
          })}
          <button type="button" className="v8-link" onClick={refresh} style={{ marginTop: 8 }}>Retry permissions</button>
        </section>
      </div>
      <V8Confirm open={Boolean(helpFor)} icon="lock" title={helpFor ? `Turn on ${helpFor.label.toLowerCase()} access` : ""}
        body={helpFor ? `Your browser blocked ${helpFor.label.toLowerCase()} for HOWDI. Click the lock icon next to the address, choose “Site settings”, set ${helpFor.label} to Allow, then come back and tap Retry. You can keep using HOWDI without it.` : ""}
        confirmLabel="Retry" cancelLabel="Continue without" onConfirm={() => { setHelpFor(null); refresh(); }} onCancel={() => setHelpFor(null)} />
    </PageFrame>
  );
}

/* ---------------------------------------------------------------- ID-002 / ID-003 settings */
export function V8IdentityBadges({ apiBase, getAuthHeaders, handle, onBack, onViewProfile }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const ui = useV8Ui();
  const [s, setS] = useState({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, run] = useSingleFlight();
  useEffect(() => {
    if (!handle) { setS({ status: "nohandle" }); return; }
    setS({ status: "loading" });
    fetch(`${base}/api/connect/public-profile/username/${encodeURIComponent(handle)}`, { headers: { Accept: "application/json", ...(getAuthHeaders ? getAuthHeaders() : {}) }, cache: "no-store" })
      .then(async (r) => { const b = await r.json().catch(() => null); if (!r.ok || !b || b.status !== "success") throw new Error("x"); setS({ status: "ready", data: b }); })
      .catch(() => setS({ status: "error" }));
  }, [base, handle, reload]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = s.data || {}; const p = d.profile || {};
  const v = d.verification; const verified = Boolean(p.identity_verified);
  const vStatus = verified ? "VERIFIED" : String(v?.status || "NONE").toUpperCase();
  const apply = () => run(async () => {
    const r = await fetch(`${base}/api/connect/profile-verification`, { method: "POST", headers: { "Content-Type": "application/json", ...(getAuthHeaders ? getAuthHeaders() : {}) }, body: JSON.stringify({ verificationType: "CREATOR" }) });
    const b = await r.json().catch(() => null);
    setConfirm(false);
    if (!r.ok || !b || b.status !== "success") { ui?.toast({ kind: "error", title: "Application not sent", message: (b && b.message) || "Please try again." }); return; }
    ui?.toast({ title: "Application sent", message: "We’re reviewing your application. This usually takes 1–3 days." });
    setReload((n) => n + 1);
  });
  return (
    <PageFrame title="Identity & badges" onBack={onBack} intro="Your public identity is your @handle. Badges are optional and never reveal private IDs.">
      {s.status === "loading" ? <div className="v8-card"><div className="v8-skel" style={{ height: 120 }} /></div> : null}
      {s.status === "error" ? <div className="v8-card"><V8State kind="error" title="Something went wrong" message="Please check your connection and try again." actionLabel="Retry" onAction={() => setReload((n) => n + 1)} /></div> : null}
      {s.status === "nohandle" ? <div className="v8-card"><V8State icon="user" title="Choose your public @handle first" message="Your @handle is how people find you. Set it in Edit profile." /></div> : null}
      {s.status === "ready" ? (
        <div className="v8-settings-grid">
          <section className="v8-card v8-settings-card" aria-labelledby="v8-vb-h">
            <h2 id="v8-vb-h"><span className="v8-badge-dot v"><V8Icon name="check" size={14} stroke={3} /></span>Verified badge</h2>
            <p className="v8-muted">For notable public figures, creators and businesses.</p>
            {vStatus === "VERIFIED" ? <div className="v8-status-box ok"><V8Icon name="check" size={18} /><span><b>Verified</b><small>Your identity is confirmed. The badge shows on your profile.</small></span></div> : null}
            {vStatus === "PENDING" ? <div className="v8-status-box"><V8Icon name="refresh" size={18} /><span><b>Application pending</b><small>We’re reviewing your application. This usually takes 1–3 days.</small></span></div> : null}
            {vStatus === "REJECTED" ? <div className="v8-status-box warn"><V8Icon name="alert" size={18} /><span><b>Not approved</b><small>You can apply again with more details.</small></span><button type="button" className="v8-btn v8-btn-soft" onClick={() => setConfirm(true)}>Apply again</button></div> : null}
            {vStatus === "NONE" ? <div className="v8-status-box"><span><b>Not applied</b><small>Verification is reviewed by HOWDI. Private ID documents are never shown publicly.</small></span><button type="button" className="v8-btn v8-btn-primary" onClick={() => setConfirm(true)}>Apply now</button></div> : null}
          </section>
          <section className="v8-card v8-settings-card" aria-labelledby="v8-pb-h">
            <h2 id="v8-pb-h"><span className="v8-badge-dot p"><V8Icon name="crown" size={14} fill /></span>Premium creator badge</h2>
            <p className="v8-muted">Open to eligible creators who offer a paid subscription.</p>
            {d.premium ? <div className="v8-status-box ok"><V8Icon name="crown" size={18} fill /><span><b>Premium active</b><small>{d.premium.plan_name}</small></span></div>
              : <div className="v8-status-box"><span><b>Not active</b><small>Premium turns on when you publish a paid subscription plan in your Creator workspace.</small></span></div>}
          </section>
          <section className="v8-card v8-settings-card" aria-labelledby="v8-pp-h">
            <h2 id="v8-pp-h">Public preview</h2>
            <div className="v8-public-preview"><b>@{p.public_username}</b><V8Badges verified={verified} premium={Boolean(d.premium)} size="sm" /></div>
            <p className="v8-muted">This is how your badges appear publicly.</p>
            <button type="button" className="v8-btn" onClick={onViewProfile}>View my public profile</button>
          </section>
          <V8BadgeExplainer />
        </div>
      ) : null}
      <V8Confirm open={confirm} icon="shield" title="Apply for the Verified badge?" busy={busy}
        body="HOWDI reviews your public profile and activity. You may be asked for proof of identity in a later step; it is never shown publicly."
        confirmLabel="Send application" onConfirm={apply} onCancel={() => setConfirm(false)} />
    </PageFrame>
  );
}

export function V8NotFoundPage({ onBack }) {
  return <div className="v8-page"><div className="v8-page-inner"><div className="v8-card"><V8State icon="empty" title="Page not found" message="This link doesn’t match a HOWDI page." actionLabel="Go to Home" onAction={onBack} /></div></div></div>;
}

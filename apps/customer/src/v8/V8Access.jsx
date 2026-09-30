// HOWDI V8 Access — board 05. Flow Register AUTH-001 … AUTH-011.
//   AUTH-001 welcome / sign-in choice (desktop split panel + mobile full screen)
//   AUTH-002 mobile OTP entry · AUTH-003 OTP result states (wrong / expired / too many / resend timer / edit number)
//   AUTH-004 Google handoff (provider not connected yet → Preview/Test notice, safe fallback)
//   AUTH-005 passkey (relying-party domain not configured yet → Preview/Test notice, unavailable-device fallback)
//   AUTH-006 HOWDI e-mail / password (show-hide, invalid credentials, rate-limit)
//   AUTH-007 forgot / reset password (request, sent, new password, done, expired / used link)
//   AUTH-008 new-user onboarding (name, public @handle with live availability, optional photo, interests, consent)
//   AUTH-009 existing-user continuation (back to the requested screen) — handled by the caller via onAuthenticated
// External providers are not connected in the preview: SMS and e-mail go to a clearly labelled Preview/Test inbox.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { V8Icon } from "./V8Shell";
import { useSingleFlight, useV8Ui } from "./V8System";

export const V8_INTERESTS = ["Crochet", "Handmade", "Home decor", "Fashion", "Travel", "Food", "Music", "Movies", "Art", "Learning", "Local services", "Small business"];
const HANDLE_RE = /^[a-z0-9._]{3,30}$/;

async function api(base, path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res; let json = null;
  try { res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" }); }
  catch { return { ok: false, status: 0, json: { message: "You’re offline or the server can’t be reached. Please try again." } }; }
  try { json = await res.json(); } catch { json = null; }
  return { ok: res.ok && json && json.status !== "error", status: res.status, json: json || {} };
}

function Sandbox({ children }) {
  return <div className="v8a-sandbox" role="note"><b>Preview / Test</b><span>{children}</span></div>;
}

function Brand({ compact }) {
  return (
    <div className={`v8a-brand ${compact ? "compact" : ""}`}>
      <b>HOWDI</b>
      <p>A kinder, safer space<br />to meet new people.</p>
    </div>
  );
}

function Hills() {
  return (
    <svg className="v8a-hills" viewBox="0 0 400 180" aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <path d="M0 120 Q80 70 160 110 T320 95 T400 100 V180 H0Z" fill="#c9d8f5" />
      <path d="M0 145 Q100 105 200 140 T400 130 V180 H0Z" fill="#aac2ee" />
      {[[60, 132], [84, 140], [300, 124], [322, 132]].map(([x, y], i) => <g key={i}><rect x={x - 2} y={y} width="4" height="16" fill="#7d97c9" /><ellipse cx={x} cy={y} rx="9" ry="16" fill="#7d97c9" /></g>)}
    </svg>
  );
}

function OtpBoxes({ value, onChange, invalid, disabled }) {
  const refs = useRef([]);
  const digits = (value + "      ").slice(0, 6).split("");
  const set = (i, ch) => {
    const arr = (value || "").split("");
    arr[i] = ch; const next = arr.join("").replace(/\s/g, "").slice(0, 6);
    onChange(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <div className="v8a-otp" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={i === 0 ? 6 : 1} disabled={disabled}
          aria-label={`Digit ${i + 1}`} aria-invalid={invalid || undefined} value={d.trim()}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length > 1) { onChange(v.slice(0, 6)); refs.current[Math.min(5, v.length)]?.focus(); } else set(i, v); }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => { const v = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6); if (v) { e.preventDefault(); onChange(v); refs.current[Math.min(5, v.length - 1)]?.focus(); } }} />
      ))}
    </div>
  );
}

function Msg({ kind = "error", children }) {
  if (!children) return null;
  return <div className={`v8a-msg ${kind}`} role={kind === "error" ? "alert" : "status"}><V8Icon name={kind === "ok" ? "check" : "alert"} size={18} /><span>{children}</span></div>;
}

function TestInbox({ base, to, label }) {
  const [state, setState] = useState({ status: "idle", messages: [] });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    const r = await api(base, `/api/preview/outbox?to=${encodeURIComponent(to || "")}`);
    if (r.status === 404) { setState({ status: "off", messages: [] }); return; }
    setState({ status: r.ok ? "ready" : "error", messages: (r.json && r.json.messages) || [] });
  }, [base, to]);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);
  const m = state.messages[0];
  return (
    <div className="v8a-inbox" aria-live="polite">
      <div className="v8a-inbox-head"><b>Preview / Test {label} inbox</b><button type="button" className="v8-link" onClick={load}>Refresh</button></div>
      {state.status === "off" ? <small>Sandbox inbox is off in this environment.</small>
        : m ? <p><small>{new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · to {m.recipient}</small>{m.subject ? <b>{m.subject}</b> : null}<span>{m.body}</span></p>
          : <small>No message yet. Nothing is sent to a real {label === "SMS" ? "phone" : "inbox"} in the preview.</small>}
    </div>
  );
}

export default function V8Access({ open, apiBase, initialMode = "welcome", resetToken = "", onClose, onAuthenticated, onboardingOnly, currentUserName, sessionToken, onOnboarded }) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  const ui = useV8Ui();
  const [mode, setMode] = useState(onboardingOnly ? "onboarding" : initialMode);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [busy, run] = useSingleFlight();
  // mobile / OTP
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  // e-mail
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // create account
  const [name, setName] = useState("");
  // reset
  const [token] = useState(resetToken);
  const [newPw, setNewPw] = useState("");
  // onboarding
  const [obName, setObName] = useState(currentUserName || "");
  const [handle, setHandle] = useState("");
  const [handleState, setHandleState] = useState({ status: "idle", reason: "" });
  const [interests, setInterests] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [agree, setAgree] = useState(false);
  const [obErrors, setObErrors] = useState({});
  const panelRef = useRef(null);

  useEffect(() => { if (open) { setMode(onboardingOnly ? "onboarding" : initialMode); setHistory([]); setMsg({ kind: "", text: "" }); } }, [open, initialMode, onboardingOnly]);
  useEffect(() => { if (!resendIn) return undefined; const t = setTimeout(() => setResendIn((n) => Math.max(0, n - 1)), 1000); return () => clearTimeout(t); }, [resendIn]);
  useEffect(() => { if (!open) return undefined; const t = setTimeout(() => { const pnl = panelRef.current; if (!pnl) return; const a = document.activeElement; if (a && pnl.contains(a) && a.matches("input, textarea, select")) return; /* never steal focus from a field the person is already typing in */ pnl.querySelector("[data-autofocus], input, button.v8a-primary")?.focus(); }, 30); return () => clearTimeout(t); }, [open, mode]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !onboardingOnly && !busy) onClose?.(); };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, [open, onboardingOnly, busy, onClose]);

  const go = (next) => { setHistory((h) => [...h, mode]); setMode(next); setMsg({ kind: "", text: "" }); };
  const back = () => { setHistory((h) => { const prev = h[h.length - 1]; setMode(prev || "welcome"); return h.slice(0, -1); }); setMsg({ kind: "", text: "" }); };
  const phoneDigits = phone.replace(/\D/g, "").slice(-10);
  const maskedPhone = phoneDigits ? `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}` : "";

  const finish = (data, isNew) => {
    setMode("success");
    window.setTimeout(() => onAuthenticated?.(data, isNew), 650);
  };

  const requestOtp = () => run(async () => {
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) { setMsg({ kind: "error", text: "Enter a valid 10-digit Indian mobile number." }); return; }
    const r = await api(base, "/api/auth/otp/request", { method: "POST", body: { phone: phoneDigits } });
    if (r.status === 429) { setMsg({ kind: "warn", text: r.json.message || "Too many codes requested. Please wait a few minutes." }); return; }
    if (!r.ok) { setMsg({ kind: "error", text: r.json.message || "We couldn’t send a code. Please try again." }); return; }
    setCode(""); setResendIn(30);
    if (mode !== "otp") go("otp"); else setMsg({ kind: "ok", text: "A new code is on its way." });
  });
  const verifyOtp = () => run(async () => {
    if (!/^\d{6}$/.test(code)) { setMsg({ kind: "error", text: "Enter the 6-digit code we sent you." }); return; }
    const r = await api(base, "/api/auth/otp/verify", { method: "POST", body: { phone: phoneDigits, code } });
    if (r.ok && r.json.token) { finish(r.json, false); return; }
    const m = String(r.json.message || "");
    if (r.status === 429) setMsg({ kind: "warn", text: "Too many incorrect attempts. Request a new code." });
    else if (/expired/i.test(m)) setMsg({ kind: "warn", text: "This code has expired. Please request a new code." });
    else if (r.status === 404 || /account/i.test(m)) setMsg({ kind: "error", text: m || "No HOWDI account uses this number. Create one instead." });
    else setMsg({ kind: "error", text: "That code isn’t correct. Please try again." });
  });
  const emailLogin = () => run(async () => {
    if (!email.trim() || !password) { setMsg({ kind: "error", text: "Enter your e-mail and password." }); return; }
    const r = await api(base, "/api/auth/login", { method: "POST", body: { email: email.trim(), password } });
    if (r.ok && r.json.token) { finish(r.json, false); return; }
    if (r.status === 429) setMsg({ kind: "warn", text: r.json.message || "Too many sign-in attempts. Please wait a few minutes or reset your password." });
    else if (r.status === 403) setMsg({ kind: "error", text: r.json.message || "This account is currently unavailable." });
    else setMsg({ kind: "error", text: "These credentials aren’t correct. Please try again." });
  });
  const createAccount = () => run(async () => {
    if (name.trim().length < 2) { setMsg({ kind: "error", text: "Enter your name." }); return; }
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) { setMsg({ kind: "error", text: "Enter a valid 10-digit Indian mobile number." }); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setMsg({ kind: "error", text: "Enter a valid e-mail address or leave it empty." }); return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setMsg({ kind: "error", text: "Use at least 8 characters with letters and numbers." }); return; }
    const r = await api(base, "/api/auth/register", { method: "POST", body: { full_name: name.trim(), email: email.trim() || `${phoneDigits}@howdi.local`, phone: phoneDigits, password, role: "customer" } });
    if (r.ok && r.json.token) { setObName(name.trim()); finish(r.json, true); return; }
    setMsg({ kind: "error", text: r.json.message || "We couldn’t create your account. Please try again." });
  });
  const forgot = () => run(async () => {
    const r = await api(base, "/api/auth/password/forgot", { method: "POST", body: { email: email.trim() } });
    if (r.status === 429) { setMsg({ kind: "warn", text: r.json.message }); return; }
    if (!r.ok) { setMsg({ kind: "error", text: r.json.message || "Enter a valid e-mail address." }); return; }
    go("forgot-sent");
  });
  const reset = () => run(async () => {
    const r = await api(base, "/api/auth/password/reset", { method: "POST", body: { token, password: newPw } });
    if (r.ok) { setMode("reset-done"); try { window.history.replaceState(null, "", "/"); } catch { /* ignore */ } return; }
    const c = r.json.code;
    setMsg({ kind: c === "RESET_LINK_EXPIRED" ? "warn" : "error", text: r.json.message || "This reset link is not valid." });
  });

  // onboarding: live @handle availability
  useEffect(() => {
    if (mode !== "onboarding") return undefined;
    const h = handle.trim().replace(/^@/, "").toLowerCase();
    if (!h) { setHandleState({ status: "idle", reason: "" }); return undefined; }
    if (!HANDLE_RE.test(h)) { setHandleState({ status: "bad", reason: "Use 3–30 characters: letters, numbers, dot or underscore." }); return undefined; }
    setHandleState({ status: "checking", reason: "" });
    const t = setTimeout(async () => {
      const r = await api(base, `/api/v8/handle-available?handle=${encodeURIComponent(h)}`, { token: sessionToken });
      if (!r.ok) { setHandleState({ status: "error", reason: "Couldn’t check right now." }); return; }
      setHandleState(r.json.available ? { status: "ok", reason: "" } : { status: "bad", reason: r.json.reason || "Not available." });
    }, 350);
    return () => clearTimeout(t);
  }, [handle, mode, base, sessionToken]);
  const pickPhoto = (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size > 1000000) { setObErrors((e) => ({ ...e, avatarData: "Use a PNG, JPG or WebP photo under 1 MB." })); return; }
    const fr = new FileReader(); fr.onload = () => { setAvatar(String(fr.result || "")); setObErrors((e) => ({ ...e, avatarData: "" })); }; fr.readAsDataURL(file);
  };
  const saveProfile = () => run(async () => {
    const errs = {};
    if (obName.trim().length < 2) errs.displayName = "Enter your name (2–60 characters).";
    if (handleState.status !== "ok") errs.publicUsername = handleState.reason || "Choose an available @handle.";
    if (!agree) errs.acceptTerms = "Please agree to the Community Guidelines and Privacy Policy to continue.";
    setObErrors(errs);
    if (Object.keys(errs).length) { ui?.announce("Please fix the highlighted fields", true); return; }
    setMode("ob-saving");
    const r = await api(base, "/api/v8/onboarding/profile", { method: "POST", token: sessionToken, body: { displayName: obName.trim(), publicUsername: handle.trim().replace(/^@/, "").toLowerCase(), avatarData: avatar || undefined, interests, acceptTerms: true } });
    if (r.ok) { try { localStorage.setItem("howdiInterestPref", interests[0] || ""); } catch { /* ignore */ } setMode("ob-done"); window.setTimeout(() => onOnboarded?.(r.json.profile), 900); return; }
    setMode("onboarding"); setObErrors(r.json.errors || {}); setMsg({ kind: "error", text: r.json.errors ? "" : (r.json.message || "We couldn’t save your profile. Please try again.") });
  });

  const titleId = "v8a-title";
  if (!open || typeof document === "undefined") return null;

  const Back = () => (history.length ? <button type="button" className="v8a-back" onClick={back} aria-label="Back"><V8Icon name="back" size={20} /></button> : null);
  const Close = () => (!onboardingOnly ? <button type="button" className="v8a-close" onClick={onClose} aria-label="Close"><V8Icon name="x" size={20} /></button> : null);

  let content = null;
  if (mode === "welcome") content = (
    <>
      <h1 id={titleId}>Welcome to HOWDI</h1>
      <p className="v8a-sub">Choose a sign-in method to continue.</p>
      <div className="v8a-choices">
        <button type="button" className="v8a-primary" onClick={() => go("mobile")} data-autofocus><V8Icon name="phone" size={20} />Continue with mobile</button>
        <button type="button" className="v8a-choice" onClick={() => go("google")}><span className="v8a-g" aria-hidden="true">G</span>Continue with Google</button>
        <button type="button" className="v8a-choice" onClick={() => go("passkey")}><V8Icon name="key" size={20} />Use a passkey</button>
        <button type="button" className="v8a-choice" onClick={() => go("email")}><V8Icon name="mail" size={20} />Sign in with email</button>
      </div>
      <div className="v8a-secure"><V8Icon name="shield" size={20} /><span><b>Continue securely</b><small>HOWDI never asks for your Gmail password. Your information is protected.</small></span></div>
      <p className="v8a-foot">New to HOWDI? <button type="button" className="v8-link" onClick={() => go("create")}>Create an account</button></p>
    </>
  );
  if (mode === "mobile") content = (
    <>
      <h1 id={titleId}>Continue with mobile</h1>
      <p className="v8a-sub">We’ll send a 6-digit code to your phone.</p>
      <label className="v8a-field"><span>Mobile number</span>
        <span className="v8a-phone"><span className="v8a-cc" aria-label="Country code India">🇮🇳 +91</span>
          <input inputMode="numeric" autoComplete="tel-national" value={phone} maxLength={14} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))} placeholder="98765 43210" data-autofocus aria-invalid={msg.kind === "error" || undefined} onKeyDown={(e) => { if (e.key === "Enter") requestOtp(); }} /></span>
      </label>
      <Msg kind={msg.kind === "ok" ? "ok" : msg.kind === "warn" ? "warn" : "error"}>{msg.text}</Msg>
      <button type="button" className="v8a-primary" onClick={requestOtp} disabled={busy}>{busy ? <><span className="v8-spinner" />Sending…</> : "Send code"}</button>
      <Sandbox>No SMS provider is connected yet, so the code is delivered to the Preview/Test SMS inbox on the next screen.</Sandbox>
    </>
  );
  if (mode === "otp") content = (
    <>
      <h1 id={titleId}>Enter the code</h1>
      <p className="v8a-sub">We sent a 6-digit code to<br /><b>{maskedPhone}</b> <button type="button" className="v8-link" onClick={back}>Edit</button></p>
      <OtpBoxes value={code} onChange={(v) => { setCode(v); if (msg.kind === "error") setMsg({ kind: "", text: "" }); }} invalid={msg.kind === "error"} disabled={busy} />
      <p className="v8a-resend">{resendIn > 0 ? <>Resend code in {resendIn}s</> : <button type="button" className="v8-link" onClick={requestOtp} disabled={busy}>Resend code</button>}</p>
      <button type="button" className="v8a-primary" onClick={verifyOtp} disabled={busy || code.length !== 6}>{busy ? <><span className="v8-spinner" />Checking…</> : "Continue"}</button>
      <Msg kind={msg.kind === "ok" ? "ok" : msg.kind === "warn" ? "warn" : "error"}>{msg.text}</Msg>
      <TestInbox base={base} to={phoneDigits} label="SMS" />
    </>
  );
  if (mode === "google") content = (
    <>
      <div className="v8a-hero-ico"><span className="v8a-g big" aria-hidden="true">G</span></div>
      <h1 id={titleId} className="center">Continue with Google</h1>
      <p className="v8a-sub center">You’ll be sent to Google to sign in securely and then return to HOWDI.</p>
      <div className="v8a-note"><V8Icon name="shield" size={20} /><span><b>HOWDI never asks for your Gmail password.</b><small>You’ll sign in on Google’s secure page.</small></span></div>
      <button type="button" className="v8a-primary" disabled aria-describedby="v8a-g-sb"><span className="v8a-g" aria-hidden="true">G</span>Continue with Google</button>
      <ul className="v8a-ticks"><li><V8Icon name="check" size={16} />You control your Google account</li><li><V8Icon name="check" size={16} />Only basic profile info is shared</li><li><V8Icon name="check" size={16} />You’ll return to HOWDI after sign in</li></ul>
      <div id="v8a-g-sb"><Sandbox>Google Sign-In isn’t connected in this preview (it needs HOWDI’s Google OAuth client ID). Use mobile or e-mail for now.</Sandbox></div>
      <button type="button" className="v8a-choice" onClick={() => { setHistory([]); setMode("mobile"); }}><V8Icon name="phone" size={20} />Continue with mobile instead</button>
    </>
  );
  if (mode === "passkey") content = (
    <>
      <div className="v8a-hero-ico"><V8Icon name="fingerprint" size={40} /></div>
      <h1 id={titleId} className="center">Use your passkey</h1>
      <p className="v8a-sub center">Sign in with your device’s biometric, PIN or security key.</p>
      <div className="v8a-note col"><V8Icon name="scan" size={26} /><b>Use Face ID to sign in?</b><small>Sign in to HOWDI with your saved passkey.</small></div>
      <button type="button" className="v8a-primary" onClick={async () => {
        const supported = typeof window !== "undefined" && window.PublicKeyCredential && (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false));
        setMsg({ kind: "warn", text: supported ? "Passkeys aren’t switched on for HOWDI yet. Try another way below." : "This device doesn’t support passkeys. Try another way below." });
      }}>Continue</button>
      <Msg kind="warn">{msg.text}</Msg>
      <Sandbox>Passkey sign-in needs HOWDI’s relying-party domain to be configured. The screens are shown; sign-in uses mobile or e-mail in this preview.</Sandbox>
      <p className="v8a-or"><span>or</span></p>
      <button type="button" className="v8a-choice" onClick={() => { setHistory(["welcome"]); setMode("mobile"); }}><V8Icon name="phone" size={20} />Continue with mobile</button>
      <button type="button" className="v8a-choice" onClick={() => { setHistory(["welcome"]); setMode("email"); }}><V8Icon name="mail" size={20} />Sign in with email</button>
    </>
  );
  if (mode === "email") content = (
    <>
      <h1 id={titleId}>Sign in with email</h1>
      <label className="v8a-field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-autofocus /></label>
      <label className="v8a-field"><span>Password</span>
        <span className="v8a-pw"><input type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") emailLogin(); }} aria-invalid={msg.kind === "error" || undefined} />
          <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}><V8Icon name="eye" size={20} /></button></span>
      </label>
      <p className="v8a-right"><button type="button" className="v8-link" onClick={() => go("forgot")}>Forgot password?</button></p>
      <button type="button" className="v8a-primary" onClick={emailLogin} disabled={busy}>{busy ? <><span className="v8-spinner" />Signing in…</> : "Sign in"}</button>
      <Msg kind={msg.kind === "warn" ? "warn" : "error"}>{msg.text}</Msg>
      <p className="v8a-foot small">Preview accounts also accept the mobile number (e.g. 9100000001) in the e-mail field.</p>
    </>
  );
  if (mode === "forgot") content = (
    <>
      <h1 id={titleId}>Reset your password</h1>
      <p className="v8a-sub">Enter the e-mail on your account. We’ll send a link to choose a new password.</p>
      <label className="v8a-field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-autofocus onKeyDown={(e) => { if (e.key === "Enter") forgot(); }} /></label>
      <Msg kind={msg.kind === "warn" ? "warn" : "error"}>{msg.text}</Msg>
      <button type="button" className="v8a-primary" onClick={forgot} disabled={busy}>{busy ? <><span className="v8-spinner" />Sending…</> : "Send reset link"}</button>
    </>
  );
  if (mode === "forgot-sent") content = (
    <>
      <div className="v8a-hero-ico ok"><V8Icon name="mail" size={34} /></div>
      <h1 id={titleId} className="center">Check your e-mail</h1>
      <p className="v8a-sub center">If an account uses <b>{email.trim()}</b>, we’ve sent a link to reset the password. The link works for 30 minutes.</p>
      <TestInbox base={base} to={email.trim().toLowerCase()} label="e-mail" />
      <button type="button" className="v8a-choice" onClick={() => { setHistory([]); setMode("email"); }}>Back to sign in</button>
    </>
  );
  if (mode === "reset") content = (
    <>
      <h1 id={titleId}>Choose a new password</h1>
      <p className="v8a-sub">Use at least 8 characters with letters and numbers.</p>
      <label className="v8a-field"><span>New password</span>
        <span className="v8a-pw"><input type={showPw ? "text" : "password"} autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-autofocus />
          <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}><V8Icon name="eye" size={20} /></button></span>
      </label>
      <Msg kind={msg.kind === "warn" ? "warn" : "error"}>{msg.text}</Msg>
      <button type="button" className="v8a-primary" onClick={reset} disabled={busy || newPw.length < 8}>{busy ? <><span className="v8-spinner" />Saving…</> : "Save new password"}</button>
      {msg.text ? <button type="button" className="v8a-choice" onClick={() => { setMode("forgot"); setMsg({ kind: "", text: "" }); }}>Request a new link</button> : null}
    </>
  );
  if (mode === "reset-done") content = (
    <>
      <div className="v8a-hero-ico ok"><V8Icon name="check" size={34} stroke={2.6} /></div>
      <h1 id={titleId} className="center">Password changed</h1>
      <p className="v8a-sub center">For your safety you’ve been signed out on every device. Sign in with your new password.</p>
      <button type="button" className="v8a-primary" onClick={() => { setHistory(["welcome"]); setMode("email"); }}>Sign in</button>
    </>
  );
  if (mode === "create") content = (
    <>
      <h1 id={titleId}>Create your HOWDI account</h1>
      <p className="v8a-sub">You’ll set up your public profile next.</p>
      <label className="v8a-field"><span>Your name</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} data-autofocus /></label>
      <label className="v8a-field"><span>Mobile number</span><span className="v8a-phone"><span className="v8a-cc">🇮🇳 +91</span><input inputMode="numeric" autoComplete="tel-national" value={phone} maxLength={14} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))} /></span></label>
      <label className="v8a-field"><span>Email <em>(optional)</em></span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="v8a-field"><span>Password</span><span className="v8a-pw"><input type={showPw ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}><V8Icon name="eye" size={20} /></button></span><small>At least 8 characters with letters and numbers.</small></label>
      <Msg kind="error">{msg.text}</Msg>
      <button type="button" className="v8a-primary" onClick={createAccount} disabled={busy}>{busy ? <><span className="v8-spinner" />Creating…</> : "Create account"}</button>
      <p className="v8a-foot">Already on HOWDI? <button type="button" className="v8-link" onClick={() => { setHistory([]); setMode("welcome"); }}>Sign in</button></p>
    </>
  );
  if (mode === "onboarding") content = (
    <>
      <h1 id={titleId}>Create your HOWDI profile</h1>
      <p className="v8a-sub">Tell us a little about yourself. You can always edit this later.</p>
      <div className="v8a-photo">
        <label className="v8a-photo-pick" aria-label="Add a profile photo (optional)">
          {avatar ? <img src={avatar} alt="" /> : <V8Icon name="user" size={40} />}
          <span className="v8a-photo-cam"><V8Icon name="camera" size={16} /></span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickPhoto(e.target.files && e.target.files[0])} />
        </label>
        <small>Photo (optional)</small>
        {obErrors.avatarData ? <small className="v8-field-err">{obErrors.avatarData}</small> : null}
      </div>
      <label className="v8a-field"><span>Your name</span><input value={obName} onChange={(e) => setObName(e.target.value)} aria-invalid={Boolean(obErrors.displayName) || undefined} data-autofocus />{obErrors.displayName ? <small className="v8-field-err">{obErrors.displayName}</small> : null}</label>
      <label className="v8a-field"><span>Your public @handle</span>
        <span className={`v8a-handle ${handleState.status}`}><span>@</span><input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, "").toLowerCase().slice(0, 30))} autoCapitalize="none" autoComplete="off" aria-invalid={handleState.status === "bad" || Boolean(obErrors.publicUsername) || undefined} aria-describedby="v8a-handle-hint" />
          {handleState.status === "ok" ? <V8Icon name="check" size={18} stroke={2.6} /> : handleState.status === "checking" ? <span className="v8-spinner" /> : null}</span>
        <small id="v8a-handle-hint" className={handleState.status === "bad" || obErrors.publicUsername ? "v8-field-err" : ""}>{handleState.reason || obErrors.publicUsername || "This is how others will see you on HOWDI. IDs always stay private."}</small>
      </label>
      <fieldset className="v8a-interests"><legend>Interests <em>(select a few)</em></legend>
        {V8_INTERESTS.map((it) => { const on = interests.includes(it); return <button key={it} type="button" aria-pressed={on} onClick={() => setInterests((x) => (on ? x.filter((y) => y !== it) : x.length < 8 ? [...x, it] : x))}>{on ? "✓" : "+"} {it}</button>; })}
      </fieldset>
      <label className="v8a-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={Boolean(obErrors.acceptTerms) || undefined} /><span>I agree to the HOWDI <b>Community Guidelines</b> and <b>Privacy Policy</b>.</span></label>
      {obErrors.acceptTerms ? <small className="v8-field-err">{obErrors.acceptTerms}</small> : null}
      <Msg kind="error">{msg.text}</Msg>
      <button type="button" className="v8a-primary" onClick={saveProfile} disabled={busy}>Create profile</button>
    </>
  );
  if (mode === "ob-saving" || mode === "success") content = (
    <div className="v8a-state" role="status" aria-live="polite"><span className="v8a-loader" aria-hidden="true" /><b>{mode === "success" ? "Signing you in…" : "Setting up your account…"}</b><small>This will just take a moment.</small></div>
  );
  if (mode === "ob-done") content = (
    <div className="v8a-state" role="status" aria-live="polite"><span className="v8a-done"><V8Icon name="check" size={30} stroke={2.6} /></span><b>All set!</b><small>Welcome to HOWDI.</small></div>
  );

  return createPortal(
    <div className="v8a-scrim" role="dialog" aria-modal="true" aria-labelledby={titleId} data-v8-access={mode}>
      <div className="v8a-shell" ref={panelRef}>
        <aside className="v8a-art" aria-hidden="true"><Brand /><Hills /></aside>
        <section className="v8a-panel">
          <div className="v8a-top"><Back /><span className="v8a-top-brand">HOWDI</span><Close /></div>
          <div className="v8a-body">{content}</div>
        </section>
      </div>
    </div>, document.body);
}

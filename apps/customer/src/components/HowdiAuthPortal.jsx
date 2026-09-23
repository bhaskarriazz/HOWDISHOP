import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Stage 2 — dedicated full-bleed sign-in / create-account page (rendered via
// createPortal to document.body so it is never a modal layered over Home —
// Home is not visible or interactive behind it), plus the one-time "What
// brings you to HOWDI today?" onboarding step shown right after a fresh
// signup. Visual language matches the approved reference mockups (premium
// split-screen auth, warm illustration, centered onboarding card) while
// every navigation/session call below targets the app's real Connect/Shop/
// Works/Learn & Earn pillars — this file has no opinion on pillar naming.
export default function HowdiAuthPortal({
  open, onClose, authMode, setAuthMode,
  loginName, setLoginName,
  loginPhone, setLoginPhone,
  loginPassword, setLoginPassword,
  loginLoading, loginMessage, onLogin, onRegister,
  onOtpSuccess,
  onboardingPending, onCloseOnboarding,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [onbSelected, setOnbSelected] = useState("shopping");

  // Real phone+OTP sign-in flow (Stage 2). Separate from the password form's
  // own loading/message state so switching methods never mixes the two.
  const [otpMode, setOtpMode] = useState(false);
  const [otpStage, setOtpStage] = useState("phone"); // "phone" | "code"
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpNotice, setOtpNotice] = useState("");
  const [otpDevCode, setOtpDevCode] = useState("");

  useEffect(() => {
    if (open) {
      setNotice("");
      setShowPassword(false);
      setOtpMode(false);
      setOtpStage("phone");
      setOtpPhone("");
      setOtpCode("");
      setOtpNotice("");
      setOtpDevCode("");
    }
  }, [open, authMode]);

  if (!open) return null;
  const signup = authMode === "signup";
  const message = loginMessage || notice;

  const method = (name) => {
    if (name === "mobile") {
      setOtpMode(true);
      setOtpStage("phone");
      setOtpPhone(loginPhone || "");
      setOtpNotice("");
    } else {
      setNotice("Google sign-in is the next authentication connection to activate.");
    }
  };

  const requestOtp = async (e) => {
    e?.preventDefault();
    const phone = otpPhone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) {
      setOtpNotice("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setOtpBusy(true);
      setOtpNotice("");
      const response = await fetch("http://localhost:5000/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpNotice(data.message || "Could not send a code. Please try again.");
        return;
      }
      setOtpPhone(phone);
      setOtpStage("code");
      setOtpDevCode(data.dev_otp || "");
      setOtpNotice(data.message || "A 6-digit code was sent to your mobile number.");
    } catch {
      setOtpNotice("Cannot connect to HOWDI server.");
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    const code = otpCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setOtpNotice("Enter the 6-digit code we sent you.");
      return;
    }
    try {
      setOtpBusy(true);
      setOtpNotice("");
      const response = await fetch("http://localhost:5000/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpNotice(data.message || "That code is incorrect.");
        return;
      }
      setOtpNotice("Signed in! 🎉");
      onOtpSuccess && onOtpSuccess(data);
    } catch {
      setOtpNotice("Cannot connect to HOWDI server.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleCloseClick = () => {
    if (loginLoading) return;
    if (onboardingPending) { onCloseOnboarding && onCloseOnboarding(); return; }
    onClose && onClose();
  };

  // "What brings you to HOWDI today?" onboarding step (Step 1 of 3). Rendered
  // as a dimmed-backdrop centered card ONLY — the real signed-in app shell
  // (header + nav) stays mounted and visible behind it, matching the
  // reference, since by this point the account is real and signed in.
  const ONBOARDING_CHOICES = [
    { key: "shopping", icon: "🛍️", label: "Shopping", desc: "Discover and support handmade, local and unique products" },
    { key: "local_help", icon: "👥", label: "Finding local help", desc: "Connect with people for trusted, local services" },
    { key: "learning", icon: "🎓", label: "Learning a skill", desc: "Find and join workshops and learn from real people" },
    { key: "connecting", icon: "♥", label: "Connecting", desc: "Meet like-minded people in your community" },
  ];

  if (onboardingPending) {
    return createPortal(
      <>
        <style>{`
          .howdi-onb-root{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:20px;background:rgba(17,32,26,.5);backdrop-filter:blur(4px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
          .howdi-onb-root *{box-sizing:border-box}
          .howdi-onb-card{width:min(560px,100%);max-height:92vh;overflow-y:auto;border-radius:22px;background:#fff;box-shadow:0 30px 80px rgba(15,30,22,.32);padding:30px 32px 26px}
          .howdi-onb-progress{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px}
          .howdi-onb-dot{width:9px;height:9px;border-radius:50%;background:#dbe4dd}.howdi-onb-dot.active{background:#183d31;width:22px;border-radius:5px}
          .howdi-onb-step{display:block;text-align:center;color:#8a948f;font-size:11px;font-weight:800;letter-spacing:.06em;margin-bottom:4px}
          .howdi-onb-root h2{margin:2px 0 6px;text-align:center;font-size:24px;line-height:30px;font-weight:800;color:#1b2b25}
          .howdi-onb-root>div>p.howdi-onb-sub{margin:0 0 22px;text-align:center;color:#6b7a74;font-size:14px;line-height:1.5}
          .howdi-onb-chips{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .howdi-onb-chip{position:relative;text-align:left;padding:16px 14px;border-radius:16px;border:1.5px solid #e1e6e2;background:#fff;cursor:pointer;display:grid;gap:8px;transition:border-color .15s ease,background .15s ease}
          .howdi-onb-chip.selected{border-color:#183d31;background:#f3f7f4}
          .howdi-onb-chip-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#f4f5f2;font-size:18px}
          .howdi-onb-chip b{font-size:14px;color:#1b2b25;font-weight:800}
          .howdi-onb-chip span{font-size:11.5px;line-height:1.4;color:#748078}
          .howdi-onb-check{position:absolute;top:12px;right:12px;width:20px;height:20px;border-radius:50%;background:#1f7a3f;color:#fff;display:grid;place-items:center;font-size:11px}
          .howdi-onb-continue{width:100%;min-height:52px;margin-top:20px;border:0;border-radius:14px;background:#183d31;color:#fff;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
          .howdi-onb-tag{display:block;margin-top:14px;text-align:center;color:#5c6b65;font-size:12px;font-style:italic}
          @media(max-width:520px){.howdi-onb-chips{grid-template-columns:1fr}.howdi-onb-card{padding:24px 18px 20px}}
        `}</style>
        <div className="howdi-onb-root" role="dialog" aria-modal="true" aria-label="What brings you to HOWDI today">
          <div className="howdi-onb-card">
            <small className="howdi-onb-step">Step 1 of 3</small>
            <div className="howdi-onb-progress">
              <span className="howdi-onb-dot active" /><span className="howdi-onb-dot" /><span className="howdi-onb-dot" />
            </div>
            <h2>What brings you to HOWDI today?</h2>
            <p className="howdi-onb-sub">Choose what interests you most. You can always explore more later.</p>
            <div className="howdi-onb-chips">
              {ONBOARDING_CHOICES.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  className={`howdi-onb-chip${onbSelected === choice.key ? " selected" : ""}`}
                  onClick={() => setOnbSelected(choice.key)}
                  aria-pressed={onbSelected === choice.key}
                >
                  {onbSelected === choice.key && <span className="howdi-onb-check" aria-hidden="true">✓</span>}
                  <span className="howdi-onb-chip-icon" aria-hidden="true">{choice.icon}</span>
                  <b>{choice.label}</b>
                  <span>{choice.desc}</span>
                </button>
              ))}
            </div>
            <button type="button" className="howdi-onb-continue" onClick={() => onCloseOnboarding && onCloseOnboarding(onbSelected)}>
              Continue <span aria-hidden="true">→</span>
            </button>
            <small className="howdi-onb-tag">Same people. A kinder tomorrow. 🌿</small>
          </div>
        </div>
      </>,
      document.body
    );
  }

  return createPortal(
    <>
      <style>{`
        .howdi-auth-root,.howdi-auth-root *{box-sizing:border-box}
        .howdi-auth-root{
          position:fixed;inset:0;z-index:2147483600;overflow:auto;color:#24343b;
          font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
          background:#f7f3e9;display:flex;flex-direction:column;
        }
        .howdi-auth-topbar{flex:0 0 auto;min-height:52px;padding:0 26px;display:flex;align-items:center;justify-content:space-between;background:#173e31;color:#fff}
        .howdi-auth-topbar b{font-family:Georgia,serif;font-size:17px;letter-spacing:.08em}
        .howdi-auth-topbar span{font-size:12.5px;color:rgba(255,255,255,.82)}
        .howdi-auth-body{flex:1;display:grid;grid-template-columns:1.05fr 1fr;min-height:0}
        .howdi-auth-photo{position:relative;overflow:hidden;color:#fff;background:
          radial-gradient(circle at 30% 20%,rgba(220,168,98,.35),transparent 45%),
          linear-gradient(165deg,#2a1b12,#4a2f1c 45%,#6b4423 100%);
          display:flex;flex-direction:column;justify-content:flex-end;padding:44px}
        .howdi-auth-photo:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,12,7,.05),rgba(15,9,5,.72));z-index:0}
        .howdi-auth-photo-inner{position:relative;z-index:1}
        .howdi-auth-photo h1{margin:0 0 10px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(38px,4.6vw,58px);line-height:1.05;letter-spacing:-.02em;font-weight:500}
        .howdi-auth-photo p{margin:0 0 26px;max-width:420px;color:rgba(255,255,255,.85);font-size:15px;line-height:1.55}
        .howdi-auth-photo-tag{color:rgba(255,255,255,.68);font-size:11px;letter-spacing:.22em;font-weight:700}
        .howdi-auth-panel{display:flex;align-items:center;justify-content:center;padding:36px;background:#f7f3e9;overflow-y:auto}
        .howdi-auth-card{width:100%;max-width:400px}
        .howdi-auth-card h2{margin:0 0 6px;font-size:26px;line-height:31px;font-weight:800;color:#1b2b25}
        .howdi-auth-card>p.howdi-auth-sub{margin:0 0 24px;color:#6b7a74;font-size:14.5px;line-height:1.5}
        .howdi-form{display:grid;gap:11px}
        .howdi-field{display:flex;align-items:center;gap:11px;min-height:52px;padding:0 15px;border-radius:13px;background:#fff;border:1px solid #dfe3de;transition:border-color .15s ease}
        .howdi-field:focus-within{border-color:#183d31}
        .howdi-field span{width:20px;text-align:center;opacity:.75;font-size:15px}
        .howdi-field input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#1f2e28;font-size:14px;font-weight:600}
        .howdi-eye{border:0;background:transparent;cursor:pointer;color:#66736e;font-size:16px}
        .howdi-phone-field{gap:9px}
        .howdi-phone-field .howdi-cc{width:auto;flex:0 0 auto;padding-right:9px;border-right:1px solid #dfe3de;color:#1f2e28;font-size:14px;font-weight:700;display:flex;align-items:center;gap:5px}
        .howdi-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12.5px;color:#66736e}
        .howdi-row label{display:inline-flex;align-items:center;gap:7px}.howdi-row input{accent-color:#183d31}
        .howdi-link{border:0;padding:0;background:transparent;color:#183d31;font-size:12.5px;font-weight:700;cursor:pointer}
        .howdi-submit{min-height:52px;margin-top:5px;border:0;border-radius:13px;color:#fff;background:#183d31;font-size:14.5px;font-weight:700;cursor:pointer}
        .howdi-submit:disabled{opacity:.6;cursor:not-allowed}
        .howdi-notice{margin:2px 0 0;padding:10px 12px;border-radius:12px;text-align:center;background:rgba(24,61,49,.08);color:#183d31;font-size:12px;line-height:1.4;font-weight:700}
        .howdi-notice.dev-otp{background:rgba(217,164,31,.14);color:#7a5b0c;font-weight:800}
        .howdi-divider{display:flex;align-items:center;gap:12px;margin:18px 0 13px;color:#8a948f;font-size:11px;text-transform:none;white-space:nowrap}
        .howdi-divider:before,.howdi-divider:after{content:"";height:1px;flex:1;background:#e5e8e2}
        .howdi-methods{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .howdi-method{min-height:46px;border-radius:11px;border:1.5px solid #dfe3de;background:#fff;cursor:pointer;color:#26433a;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12.5px;font-weight:700}
        .howdi-method:hover{border-color:#183d31}
        .howdi-method strong{font-size:14px;line-height:1;font-weight:800}
        .howdi-back-link{margin:2px 0 10px;text-align:left}
        .howdi-back-link button{border:0;padding:0;background:transparent;color:#5c6b65;font-size:12.5px;font-weight:700;cursor:pointer}
        .howdi-toggle-line{margin:18px 0 0;text-align:center;color:#6b7a74;font-size:13px}
        .howdi-toggle-line button{border:0;background:transparent;color:#183d31;font-weight:800;cursor:pointer;font-size:13px;text-decoration:underline;text-underline-offset:2px}
        .howdi-legal{margin:18px 0 0;text-align:center;color:#9aa3a0;font-size:11px;line-height:1.5}
        .howdi-legal button{border:0;padding:0;background:transparent;color:#6b7a74;font-size:11px;text-decoration:underline;cursor:pointer}
        .howdi-close{position:fixed;top:14px;right:18px;width:34px;height:34px;border:1px solid rgba(255,255,255,.3);border-radius:11px;background:rgba(0,0,0,.15);color:#fff;cursor:pointer;font-size:19px;z-index:2}
        @media(max-width:900px){.howdi-auth-body{grid-template-columns:1fr}.howdi-auth-photo{display:none}.howdi-auth-panel{padding:22px 18px}}

        /* "Made by hand." scene - a potter's wheel + shaping hands, drawn from CSS shapes in the
           same flat-illustration language already used for the Works/Home hero silhouettes
           (rounded blocks + a monogram circle), since no photo asset is available here. */
        .howdi-auth-scene{position:absolute;right:6%;bottom:18%;z-index:0;width:230px;height:230px;pointer-events:none}
        .howdi-auth-wheel{position:absolute;left:50%;bottom:14px;width:210px;height:64px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at 50% 35%,rgba(226,176,112,.5),rgba(120,74,34,.55) 70%,rgba(70,42,20,.6));box-shadow:0 0 0 1px rgba(255,224,176,.12),0 18px 30px rgba(10,6,3,.4)}
        .howdi-auth-wheel:before{content:"";position:absolute;inset:10px 26px;border-radius:50%;border:1px dashed rgba(255,229,186,.35)}
        .howdi-auth-pot{position:absolute;left:50%;bottom:52px;width:78px;height:104px;transform:translateX(-50%);border-radius:38px 38px 16px 16px/46px 46px 14px 14px;background:linear-gradient(160deg,#c9853f,#8a5423 70%);box-shadow:inset 0 -10px 18px rgba(0,0,0,.22),0 10px 16px rgba(10,6,3,.3)}
        .howdi-auth-pot:before{content:"";position:absolute;left:50%;top:-9px;width:52px;height:18px;transform:translateX(-50%);border-radius:50%;background:#d79b56;box-shadow:inset 0 3px 6px rgba(0,0,0,.25)}
        .howdi-auth-hand{position:absolute;bottom:66px;width:46px;height:70px;border-radius:26px 26px 30px 30px;background:linear-gradient(160deg,#e3ad78,#b97a45)}
        .howdi-auth-hand.left{left:calc(50% - 58px);transform:rotate(18deg)}
        .howdi-auth-hand.right{left:calc(50% + 14px);transform:rotate(-16deg)}
        .howdi-auth-dust{position:absolute;left:50%;bottom:118px;width:5px;height:5px;border-radius:50%;background:rgba(255,224,176,.55)}
        .howdi-auth-dust:nth-child(5){transform:translate(-38px,-6px);opacity:.4}
        .howdi-auth-dust:nth-child(6){transform:translate(30px,-14px);opacity:.55}
        .howdi-auth-dust:nth-child(7){transform:translate(6px,-26px);opacity:.35}
      `}</style>

      <div className="howdi-auth-root" role="dialog" aria-modal="true" aria-label="HOWDI sign in">
        <div className="howdi-auth-topbar">
          <b>HOWDI</b>
          <span>A kinder, closer community</span>
        </div>
        <button type="button" className="howdi-close" onClick={handleCloseClick} disabled={loginLoading} aria-label="Close">×</button>

        <div className="howdi-auth-body">
          <section className="howdi-auth-photo">
            <div className="howdi-auth-scene" aria-hidden="true">
              <div className="howdi-auth-dust" /><div className="howdi-auth-dust" /><div className="howdi-auth-dust" />
              <div className="howdi-auth-wheel" />
              <div className="howdi-auth-hand left" />
              <div className="howdi-auth-hand right" />
              <div className="howdi-auth-pot" />
            </div>
            <div className="howdi-auth-photo-inner">
              <h1>Made by hand.<br/>Made with heart.</h1>
              <p>Real people. Real skills. A kinder, closer community.</p>
              <div className="howdi-auth-photo-tag">PEOPLE&nbsp;&nbsp;·&nbsp;&nbsp;SKILLS&nbsp;&nbsp;·&nbsp;&nbsp;OPPORTUNITIES</div>
            </div>
          </section>

          <section className="howdi-auth-panel">
            <div className="howdi-auth-card">
              {otpMode ? (
                <>
                  <h2>Sign in with a code</h2>
                  <p className="howdi-auth-sub">{otpStage === "phone" ? "We'll text a 6-digit code to your mobile number." : `Enter the code sent to +91 ${otpPhone}.`}</p>

                  <div className="howdi-back-link">
                    <button type="button" onClick={() => { setOtpMode(false); setOtpStage("phone"); setOtpNotice(""); }}>← Back to password sign in</button>
                  </div>

                  {otpStage === "phone" ? (
                    <form className="howdi-form" onSubmit={requestOtp}>
                      <label className="howdi-field howdi-phone-field">
                        <span className="howdi-cc">🇮🇳 +91</span>
                        <input className="howdi-auth-phone" value={otpPhone} onChange={e=>setOtpPhone(e.target.value)} placeholder="Enter your phone number" inputMode="numeric" autoComplete="tel" maxLength={10}/>
                      </label>
                      <button className="howdi-submit" type="submit" disabled={otpBusy}>{otpBusy ? "Sending…" : "Send code"}</button>
                      {otpNotice && <div className="howdi-notice">{otpNotice}</div>}
                    </form>
                  ) : (
                    <form className="howdi-form" onSubmit={verifyOtp}>
                      <label className="howdi-field">
                        <span>🔢</span>
                        <input value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}/>
                      </label>
                      <button className="howdi-submit" type="submit" disabled={otpBusy}>{otpBusy ? "Verifying…" : "Verify & sign in"}</button>
                      {otpNotice && <div className="howdi-notice">{otpNotice}</div>}
                      {otpDevCode && <div className="howdi-notice dev-otp">Dev mode (no SMS gateway configured here): your code is {otpDevCode}</div>}
                      <div className="howdi-row"><span/><button type="button" className="howdi-link" onClick={requestOtp} disabled={otpBusy}>Resend code</button></div>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <h2>Welcome to HOWDI</h2>
                  <p className="howdi-auth-sub">{signup ? "Create your account to get started." : "Sign in to your account or create a new one"}</p>

                  <form className="howdi-form" onSubmit={signup ? onRegister : onLogin}>
                    {signup && <label className="howdi-field"><span>👤</span><input value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="Full name" autoComplete="name"/></label>}
                    <label className="howdi-field howdi-phone-field">
                      <span className="howdi-cc">🇮🇳 +91</span>
                      <input className="howdi-auth-phone" value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} placeholder="Enter your phone number" inputMode="numeric" autoComplete="tel" maxLength={10}/>
                    </label>
                    <label className="howdi-field">
                      <span>🔒</span>
                      <input value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Enter your password" type={showPassword ? "text":"password"} autoComplete={signup ? "new-password":"current-password"}/>
                      <button type="button" className="howdi-eye" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword?"◉":"◌"}</button>
                    </label>
                    {!signup && <div className="howdi-row">
                      <label><input type="checkbox" defaultChecked/> Keep me signed in</label>
                      <button type="button" className="howdi-link" onClick={()=>setNotice("Password recovery will be connected to the secure HOWDI account flow next.")}>Forgot password?</button>
                    </div>}
                    <button className="howdi-submit" type="submit" disabled={loginLoading}>{loginLoading ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
                    {message && <div className="howdi-notice">{message}</div>}
                  </form>

                  {!signup && <>
                    <div className="howdi-divider">or continue with</div>
                    <div className="howdi-methods">
                      <button type="button" className="howdi-method" onClick={()=>method("google")}><strong>G</strong><span>Continue with Google</span></button>
                      <button type="button" className="howdi-method" onClick={()=>method("mobile")}><strong>📲</strong><span>Continue with Mobile OTP</span></button>
                    </div>
                  </>}

                  <p className="howdi-toggle-line">
                    {signup ? "Already have an account? " : "Don't have an account? "}
                    <button type="button" onClick={() => {setAuthMode(signup ? "login" : "signup");setNotice("");}}>{signup ? "Sign in" : "Create account"}</button>
                  </p>

                  <p className="howdi-legal">
                    By continuing, you agree to our{" "}
                    <button type="button" onClick={()=>setNotice("Terms of Service will open in a dedicated page.")}>Terms of Service</button>
                    {" "}and{" "}
                    <button type="button" onClick={()=>setNotice("Privacy Policy will open in a dedicated page.")}>Privacy Policy.</button>
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </>,
    document.body
  );
}

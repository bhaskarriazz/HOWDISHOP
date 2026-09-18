import React, { useEffect, useState } from "react";

export default function HowdiAuthPortal({
  open, onClose, authMode, setAuthMode,
  loginName, setLoginName,
  loginPhone, setLoginPhone,
  loginPassword, setLoginPassword,
  loginLoading, loginMessage, onLogin, onRegister,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (open) {
      setNotice("");
      setShowPassword(false);
    }
  }, [open, authMode]);

  if (!open) return null;
  const signup = authMode === "signup";
  const message = loginMessage || notice;

  const method = (name) => {
    if (name === "mobile") {
      setNotice("Enter your mobile number and password to continue securely.");
      setTimeout(() => document.querySelector(".howdi-auth-phone")?.focus(), 0);
    } else if (name === "google") {
      setNotice("Google sign-in is the next authentication connection to activate.");
    } else {
      setNotice("Passkey sign-in will be available on supported devices.");
    }
  };

  return (
    <>
      <style>{`
        .howdi-auth-root,.howdi-auth-root *{box-sizing:border-box}
        .howdi-auth-root{
          --green:#183d31;--green2:#285746;--ink:#24343b;--gold:#dfb25d;
          position:fixed;inset:0;z-index:2147483600;overflow:auto;color:var(--ink);
          font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
          background:radial-gradient(circle at 6% 10%,rgba(229,190,94,.26),transparent 21%),
          radial-gradient(circle at 94% 8%,rgba(255,237,186,.62),transparent 22%),
          linear-gradient(115deg,#eef1e8,#f8f2e4 50%,#e5eee7);
        }
        .howdi-auth-root:before,.howdi-auth-root:after{content:"";position:fixed;border-radius:50%;pointer-events:none}
        .howdi-auth-root:before{width:720px;height:720px;left:-300px;bottom:-430px;background:radial-gradient(circle,rgba(70,122,83,.65),rgba(70,122,83,.08) 58%,transparent 72%)}
        .howdi-auth-root:after{width:620px;height:620px;right:-220px;bottom:-290px;background:radial-gradient(circle,rgba(104,151,92,.48),rgba(104,151,92,.08) 58%,transparent 72%)}
        .howdi-auth-wrap{position:relative;width:min(1440px,calc(100% - 56px));min-height:100vh;margin:auto;padding:28px 0;display:grid;grid-template-columns:minmax(270px,1fr) minmax(470px,620px) minmax(280px,.95fr);gap:34px;align-items:center}
        .howdi-auth-left{min-height:620px;padding:34px 30px;border-radius:34px;position:relative;overflow:hidden;color:#fff;background:radial-gradient(circle at 80% 8%,rgba(107,156,112,.2),transparent 27%),linear-gradient(145deg,#173e31,#244d3d 60%,#335e4a);box-shadow:0 28px 90px rgba(23,61,49,.2)}
        .howdi-auth-left:before{content:"";position:absolute;width:370px;height:370px;border-radius:50%;border:1px solid rgba(255,255,255,.08);right:-130px;top:-140px}
        .howdi-auth-left:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;background:rgba(226,185,89,.12);left:-130px;bottom:-140px}
        .howdi-auth-left-inner{height:100%;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between}
        .howdi-brand{display:flex;align-items:center;gap:12px}.howdi-logo{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(145deg,#214f40,#16382d);border:1px solid rgba(255,255,255,.14);color:#f0bd59;font-family:Georgia,serif;font-size:30px;font-weight:800}
        .howdi-brand strong{font-size:14px;letter-spacing:.13em}.howdi-brand small{display:block;margin-top:4px;color:rgba(255,255,255,.58);font-size:10px}
        .howdi-eyebrow{margin-top:52px;color:#efc56e;font-size:10px;letter-spacing:.24em;font-weight:800}
        .howdi-auth-left h1{margin:17px 0 18px;max-width:540px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(46px,4.7vw,78px);line-height:.98;letter-spacing:-.055em;font-weight:500}
        .howdi-auth-left p{margin:0;max-width:470px;color:rgba(255,255,255,.75);font-size:16px;line-height:1.72;font-weight:500}
        .howdi-features{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:36px}.howdi-feature{min-height:54px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:15px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.06);color:rgba(255,255,255,.88);font-size:13px;font-weight:700}
        .howdi-trust{margin-top:32px;display:flex;gap:18px;flex-wrap:wrap;color:rgba(255,255,255,.6);font-size:11px;font-weight:700}
        .howdi-auth-panel{width:100%;border-radius:34px;padding:30px;position:relative;overflow:hidden;background:radial-gradient(circle at 100% 0%,rgba(235,190,85,.25),transparent 26%),linear-gradient(145deg,rgba(255,255,255,.97),rgba(247,244,236,.97));border:1px solid rgba(255,255,255,.82);box-shadow:0 30px 80px rgba(45,62,54,.2)}
        .howdi-close{position:absolute;top:18px;right:18px;width:38px;height:38px;border:1px solid rgba(30,57,48,.13);border-radius:13px;background:rgba(255,255,255,.76);color:#52615d;cursor:pointer;font-size:22px}
        .howdi-auth-top{text-align:center;padding-top:18px}.howdi-auth-logo{width:64px;height:64px;margin:0 auto 14px;display:grid;place-items:center;border-radius:19px;color:#f3c15d;background:linear-gradient(145deg,#295946,#1a3f32);box-shadow:0 12px 24px rgba(27,65,51,.17);font-family:Georgia,serif;font-size:35px;font-weight:800}
        .howdi-auth-top h2{margin:0;font-size:clamp(25px,2.3vw,34px);letter-spacing:-.035em}.howdi-auth-top p{margin:7px 0 22px;color:#68747a;font-size:14px}
        .howdi-tabs{display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:16px;background:rgba(28,63,50,.07);margin-bottom:18px}.howdi-tabs button{min-height:44px;border:0;border-radius:12px;background:transparent;color:#718078;font-weight:800;cursor:pointer;font-size:14px}.howdi-tabs button.active{color:#fff;background:linear-gradient(135deg,#214f3e,#295b47);box-shadow:0 7px 16px rgba(24,61,48,.18)}
        .howdi-form{display:grid;gap:11px}.howdi-field{display:flex;align-items:center;gap:11px;min-height:54px;padding:0 15px;border-radius:16px;background:rgba(255,255,255,.76);border:1px solid rgba(42,70,60,.16)}.howdi-field span{width:22px;text-align:center;opacity:.72;font-size:17px}.howdi-field input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#26343a;font-size:14px}.howdi-eye{border:0;background:transparent;cursor:pointer;color:#66736e;font-size:17px}
        .howdi-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;color:#66736e}.howdi-row label{display:inline-flex;align-items:center;gap:7px}.howdi-row input{accent-color:#295b47}.howdi-link{border:0;padding:0;background:transparent;color:#295b47;font-size:12px;font-weight:800;cursor:pointer}
        .howdi-submit{min-height:55px;margin-top:5px;border:0;border-radius:17px;color:#fff;background:linear-gradient(135deg,#214f3e,#2f674f);box-shadow:0 15px 25px rgba(31,76,58,.2);font-size:15px;font-weight:800;cursor:pointer}.howdi-submit:disabled{opacity:.62;cursor:not-allowed}
        .howdi-notice{margin:2px 0 0;padding:10px 12px;border-radius:12px;text-align:center;background:rgba(40,89,69,.08);color:#285540;font-size:12px;line-height:1.4;font-weight:700}
        .howdi-divider{display:flex;align-items:center;gap:12px;margin:17px 0 13px;color:#8a948f;font-size:10px;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap}.howdi-divider:before,.howdi-divider:after{content:"";height:1px;flex:1;background:rgba(42,70,60,.13)}
        .howdi-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.howdi-method{min-height:64px;border-radius:15px;border:1px solid rgba(42,70,60,.15);background:rgba(255,255,255,.68);cursor:pointer;color:#33423f;display:grid;place-items:center;align-content:center;gap:4px;font-size:10px;font-weight:800}.howdi-method strong{font-size:20px;line-height:1}
        .howdi-security{margin:18px 0 0;text-align:center;color:#84908b;font-size:10px;letter-spacing:.04em}
        .howdi-auth-right{display:grid;gap:16px}.howdi-side{min-height:102px;display:grid;grid-template-columns:90px 1fr auto;align-items:center;gap:15px;padding:13px 18px 13px 13px;border-radius:24px;background:rgba(255,255,255,.66);border:1px solid rgba(255,255,255,.85);box-shadow:0 18px 40px rgba(43,63,53,.1)}.howdi-side-icon{height:76px;display:grid;place-items:center;border-radius:19px;font-size:43px;background:linear-gradient(145deg,#f8f1df,#e8efe5)}.howdi-side strong{display:block;margin-bottom:6px;font-size:16px;color:#2c3940}.howdi-side span{color:#6e797d;font-size:12px;line-height:1.45}.howdi-arrow{font-size:22px;color:#334a42}.howdi-right-note{text-align:center;color:#4e6359;font-size:12px;font-style:italic}
        @media(max-width:1120px) and (min-width:761px){.howdi-auth-wrap{width:min(980px,calc(100% - 40px));grid-template-columns:minmax(260px,.85fr) minmax(430px,1.15fr);gap:24px}.howdi-auth-right{display:none}.howdi-auth-left h1{font-size:54px}}
        @media(max-width:760px){.howdi-auth-root{background:radial-gradient(circle at 50% 0%,rgba(255,242,196,.95),transparent 27%),linear-gradient(180deg,#f8f1df,#edf3e8 58%,#e2ecdc)}.howdi-auth-wrap{width:100%;min-height:100svh;padding:0;display:block}.howdi-auth-left,.howdi-auth-right{display:none}.howdi-auth-panel{min-height:100svh;border-radius:0;border:0;box-shadow:none;padding:22px 18px 26px;background:radial-gradient(circle at 100% 12%,rgba(231,195,99,.26),transparent 25%),linear-gradient(180deg,rgba(255,255,255,.89),rgba(247,241,226,.9))}.howdi-close{top:14px;right:14px}.howdi-auth-top{padding-top:14px}.howdi-auth-top:before{content:"Choose Your Door";display:block;position:absolute;top:18px;left:18px;color:#26433a;font-size:12px;font-weight:900}.howdi-auth-logo{width:58px;height:58px;border-radius:17px;margin-bottom:8px;font-size:31px}.howdi-auth-top h2{font-family:Georgia,serif;font-size:27px}.howdi-auth-top p{margin-bottom:14px;font-size:12px}.howdi-tabs{margin-bottom:14px}.howdi-form{gap:9px}.howdi-field{min-height:50px}.howdi-methods{gap:8px}.howdi-method{min-height:82px;border-radius:18px}.howdi-method strong{font-size:24px}.howdi-security{margin-top:14px}}
      `}</style>

      <div className="howdi-auth-root" role="dialog" aria-modal="true" aria-label="HOWDI sign in">
        <div className="howdi-auth-wrap">

          <section className="howdi-auth-left">
            <div className="howdi-auth-left-inner">
              <div>
                <div className="howdi-brand">
                  <div className="howdi-logo">H</div>
                  <div><strong>HOWDI</strong><small>Kaam bhi, Samaan bhi.</small></div>
                </div>
                <div className="howdi-eyebrow">MADE BY HAND. MADE WITH HEART.</div>
                <h1>Your<br/>Neighbourhood,<br/>Connected.</h1>
                <p>Start your HOWDI journey with handmade crochet today, and grow with creators, learning, earning and community tomorrow.</p>
                <div className="howdi-features">
                  <div className="howdi-feature">🧶 Crochet First</div><div className="howdi-feature">✨ Real Creators</div>
                  <div className="howdi-feature">🎓 Learn &amp; Earn</div><div className="howdi-feature">🤝 Community</div>
                </div>
              </div>
              <div className="howdi-trust"><span>✓ Secure</span><span>✓ Local</span><span>✓ One HOWDI</span></div>
            </div>
          </section>

          <section className="howdi-auth-panel">
            <button type="button" className="howdi-close" onClick={onClose} disabled={loginLoading}>×</button>
            <div className="howdi-auth-top">
              <div className="howdi-auth-logo">H</div>
              <h2>Welcome to HOWDI 👋</h2>
              <p>{signup ? "Create your account and join your neighbourhood journey." : "Sign in and continue your neighbourhood journey."}</p>
            </div>

            <div className="howdi-tabs">
              <button type="button" className={!signup ? "active" : ""} onClick={() => {setAuthMode("login");setNotice("");}}>Sign In</button>
              <button type="button" className={signup ? "active" : ""} onClick={() => {setAuthMode("signup");setNotice("");}}>Create Account</button>
            </div>

            <form className="howdi-form" onSubmit={signup ? onRegister : onLogin}>
              {signup && <label className="howdi-field"><span>👤</span><input value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="Full name" autoComplete="name"/></label>}
              <label className="howdi-field"><span>📱</span><input className="howdi-auth-phone" value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} placeholder="Mobile number" inputMode="numeric" autoComplete="tel"/></label>
              <label className="howdi-field"><span>🔒</span><input value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Password" type={showPassword ? "text":"password"} autoComplete={signup ? "new-password":"current-password"}/><button type="button" className="howdi-eye" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"◉":"◌"}</button></label>
              {!signup && <div className="howdi-row"><label><input type="checkbox" defaultChecked/> Remember me</label><button type="button" className="howdi-link" onClick={()=>setNotice("Password recovery will be connected to the secure HOWDI account flow next.")}>Forgot password?</button></div>}
              <button className="howdi-submit" type="submit" disabled={loginLoading}>{loginLoading ? "Please wait..." : signup ? "Create my HOWDI account →" : "Sign in to HOWDI →"}</button>
              {message && <div className="howdi-notice">{message}</div>}
            </form>

            {!signup && <>
              <div className="howdi-divider">or continue with</div>
              <div className="howdi-methods">
                <button type="button" className="howdi-method" onClick={()=>method("google")}><strong>G</strong><span>Google</span></button>
                <button type="button" className="howdi-method" onClick={()=>method("mobile")}><strong>📲</strong><span>Mobile OTP</span></button>
                <button type="button" className="howdi-method" onClick={()=>method("passkey")}><strong>🔑</strong><span>Passkey</span></button>
              </div>
              <p className="howdi-security">🔒 Secure access for your HOWDI account</p>
            </>}
          </section>

          <aside className="howdi-auth-right">
            {[["🧶","Shop Handmade Crochet","Unique. Local. Handmade."],["👷","Find Trusted Workers","Skilled. Verified. Nearby."],["👩‍💻","Learn & Earn","Build skills for a brighter tomorrow."],["🏪","Sell as a Vendor","Grow your local business."],["💬","Connect & Share","Your local community."]].map(([icon,title,text]) =>
              <div className="howdi-side" key={title}><div className="howdi-side-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><div className="howdi-arrow">→</div></div>
            )}
            <div className="howdi-right-note">“Support local. Grow together.” ♡</div>
          </aside>

        </div>
      </div>
    </>
  );
}
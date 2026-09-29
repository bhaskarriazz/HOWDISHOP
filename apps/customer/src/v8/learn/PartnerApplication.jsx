import { useEffect, useRef, useState } from "react";
import { V8Icon } from "../V8Shell";
import "./partner-application.css";

// Presentation of the existing application contract. No extra fields or role grants.
const LAYOUTS = {
  institute: {
    label: "Institutes & Colleges", icon: "learn", title: "Register your institute",
    intro: "Add your organisation details, then review and submit.",
    steps: ["Organisation", "Details", "Review"],
    groups: [["org_name", "org_type", "city", "pin_code"], ["contact_role", "registration_last4", "seats", "about"]],
    headings: ["Your organisation", "Contact & registration"],
    descriptions: ["Tell us where your learning community is based.", "Share your role and the details HOWDI can use for its review."],
    note: "Enter only the last 4 characters of the registration number. Keep the full number private.",
    next: ["Add organisation details", "Check your application", "Send to HOWDI for review"],
  },
  startup: {
    label: "Startups & Small Businesses", icon: "works", title: "Register your startup",
    intro: "Introduce your business. Save a draft or submit it for review.",
    steps: ["Business", "Goals", "Review"],
    groups: [["startup_name", "stage", "sector", "city"], ["website", "looking_for", "about"]],
    headings: ["Your business", "Your goals & story"],
    descriptions: ["A few details to help HOWDI understand your business.", "Tell us what you need and where we can learn more."],
    note: "Add a secure https:// website if you have one. Your application is reviewed before the role is activated.",
    next: ["Introduce your business", "Share what you need", "Send to HOWDI for review"],
  },
};

export default function PartnerApplication({ role, fields, values, renderInput, application, status, editable, declaration, onDeclaration, error, onSave, onSubmit, onBack, formatDate }) {
  const layout = LAYOUTS[role];
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const title = useRef(null);
  const current = editable ? step : 2;
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [current]);
  const perform = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const move = (next) => { setStep(next); title.current?.closest(".v8-page")?.scrollTo({ top: 0 }); };
  const renderedStatus = status || ["muted", "Not submitted"];
  return (
    <div className={`v8pa v8pa-${role}`}>
      <nav className="v8pa-top" aria-label="Application navigation"><button type="button" className="v8-link" onClick={onBack}>← My roles</button><span><V8Icon name="shield" size={15} />HOWDI registration</span></nav>
      <header className="v8pa-header">
        <span className="v8pa-mark" aria-hidden="true"><V8Icon name={layout.icon} size={30} /></span>
        <div><span className="v8pa-eyebrow">{layout.label}</span><h1>{layout.title}</h1><p>{layout.intro}</p></div>
        <span className={`v8m-state ${renderedStatus[0]}`}><i />{renderedStatus[1]}</span>
      </header>
      <div className="v8pa-layout">
        <section className="v8l-apply v8pa-form" aria-label={`${layout.label} application`}>
          <ol className="v8pa-steps" aria-label="Application steps">{layout.steps.map((label, i) => <li key={label} className={i === current ? "current" : i < current ? "visited" : ""}>
            <button type="button" onClick={() => move(i)} disabled={busy || !editable} aria-current={i === current ? "step" : undefined}><span>{i + 1}</span><b>{label}</b></button>
          </li>)}</ol>
          {application?.note ? <div className="v8pa-notice" role="status"><V8Icon name="alert" size={20} /><div><b>Feedback from HOWDI</b><p>{application.note}</p></div></div> : null}
          {application?.status === "approved" ? <div className="v8pa-notice v8pa-success"><V8Icon name="check" size={22} /><div><b>You’re approved as {application.label}.</b><p>This role is now active on your HOWDI account.</p></div></div> : null}
          {application?.status === "submitted" ? <div className="v8pa-notice"><V8Icon name="timer" size={22} /><div><b>Your application is with HOWDI</b><p>Submitted {formatDate(application.submitted_at)}. You’ll get a notification when there’s an update.</p></div></div> : null}
          <div className="v8pa-section">
            <div className="v8pa-section-heading"><span className="v8pa-eyebrow">{current === 2 ? "APPLICATION SUMMARY" : `STEP ${current + 1} OF 3`}</span><h2 ref={title} tabIndex={-1}>{current === 2 ? "Review your details" : layout.headings[current]}</h2><p>{current === 2 ? "Review the details in your application." : layout.descriptions[current]}</p></div>
            {current < 2 ? <div className="v8pa-fields">{fields.filter(([key]) => layout.groups[current].includes(key)).map(renderInput)}</div>
              : <div className="v8pa-review">{layout.groups.map((keys, index) => <section key={index}><header><h3>{layout.headings[index]}</h3>{editable ? <button type="button" className="v8-link" disabled={busy} onClick={() => move(index)}>Edit<span className="v8-sr"> {layout.headings[index]}</span></button> : null}</header><dl>{fields.filter(([key]) => keys.includes(key)).map(([key, label, , kind]) => <div key={key}><dt>{label}</dt><dd>{(kind === "org" ? String(values[key] || "").replaceAll("_", " ") : String(values[key] || "")) || "Not provided"}</dd></div>)}</dl></section>)}</div>}
            {current === 1 ? <p className="v8pa-privacy"><V8Icon name="shield" size={18} />{layout.note}</p> : null}
            {current === 2 ? <label className="v8pa-declaration"><input type="checkbox" checked={declaration} disabled={!editable || busy} onChange={e => onDeclaration(e.target.checked)} /><span>I confirm these details are true and I may be asked for proof.</span></label> : null}
          </div>
          {error ? <p className="v8c-err v8pa-error" role="alert">{error}</p> : null}
          {editable ? <footer className="v8pa-actions">
            <button type="button" className="v8-btn" disabled={busy} onClick={() => perform(onSave)}>{busy ? "Please wait…" : "Save draft"}</button>
            <div>{current > 0 ? <button type="button" className="v8-btn v8pa-back" disabled={busy} onClick={() => move(current - 1)}>Back</button> : null}
              {current < 2 ? <button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => move(current + 1)}>Continue <span aria-hidden="true">→</span></button> : <button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => perform(onSubmit)}>{application?.status === "info_requested" ? "Resubmit" : "Submit for review"}</button>}</div>
          </footer> : null}
          {application?.history?.length ? <details className="v8pa-history"><summary>Application history</summary><ol>{application.history.map((h, i) => <li key={i}><b>{h.action.replaceAll("_", " ")}</b><small>{h.actor} · {formatDate(h.at)}</small>{h.reason ? <p>{h.reason}</p> : null}</li>)}</ol></details> : null}
        </section>
        <aside className="v8pa-guide" aria-label="About registration">
          <span className="v8pa-guide-icon"><V8Icon name={layout.icon} size={28} /></span>
          <h2>{role === "institute" ? "A place for your learning community" : "Make your next business move"}</h2>
          <p>One HOWDI account. Your existing profile stays with you.</p>
          <ol>{layout.next.map((item, i) => <li key={item}><span>{i + 1}</span>{item}</li>)}</ol>
          <div className="v8pa-guide-note"><V8Icon name="shield" size={20} /><p>Registration is an application. Organisation permissions are available only after approval.</p></div>
        </aside>
      </div>
    </div>
  );
}

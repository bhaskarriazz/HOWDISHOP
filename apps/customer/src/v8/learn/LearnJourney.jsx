// HOWDI V8 — Learn Experience (P8): Today's Next Step + Project Journey, Materials Checklist → Shop, Show My Work +
// teacher feedback/retry, Ready to Sell (Shop draft only), Find My Learning Path. Server data only; nothing is invented.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { Sheet, Skel } from "../connect/common";
import { inr } from "../connect/HPayUtilities";
import CourseCard from "./CourseCard";
import { discoveryApiQuery } from "./learnDiscovery";
import { PATH_GOALS, PATH_TIMES, STEP_ICON, checkWorkFile, costing, explainPath, isConfirmedDraft, pathQueries } from "./learnJourneyModel";
import "./learn-journey.css";

// ------------------------------------------------------------ authorised media (evidence is never a public URL)
export function useAuthedMedia(apiBase, getAuthHeaders, route) {
  const [src, setSrc] = useState(null); const hdr = useRef(getAuthHeaders); hdr.current = getAuthHeaders;
  useEffect(() => {
    if (!route) return undefined; let live = true;
    (async () => {
      try {
        const r = await fetch(`${String(apiBase || "").replace(/\/+$/, "")}${route}`, { headers: { Accept: "application/json", ...(hdr.current ? hdr.current() : {}) }, cache: "no-store" });
        const data = r.ok ? (await r.json())?.media?.data : null;
        // only an image/video data URL from the authorised read is ever rendered
        if (live) setSrc(typeof data === "string" && /^data:(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime));base64,/.test(data) ? data : "");
      } catch { if (live) setSrc(""); }
    })();
    return () => { live = false; };
  }, [apiBase, route]);
  return src;
}
function WorkMedia({ apiBase, getAuthHeaders, item }) {
  const src = useAuthedMedia(apiBase, getAuthHeaders, item.media_route);
  if (src === null) return <Skel h={150} r={14} />;
  if (!src) return <span className="lj-media-missing"><V8Icon name="eyeoff" size={20} />Can’t show this file</span>;
  return item.media_type === "video" ? <video className="lj-media" src={src} controls playsInline /> : <img className="lj-media" src={src} alt={`Attempt ${item.attempt}`} />;
}

// ------------------------------------------------------------ Project Journey
export function JourneyTrack({ milestones }) {
  return (
    <ol className="lj-track" aria-label="Project journey">
      {milestones.map((m, i) => <li key={m.key} className={m.done ? "done" : milestones.findIndex((x) => !x.done) === i ? "now" : ""}>
        <i aria-hidden="true">{m.done ? <V8Icon name="check" size={14} /> : i + 1}</i>
        <span><b>{m.label}</b>{m.detail ? <small>{m.detail}</small> : null}</span>
        <span className="v8-sr">{m.done ? "done" : "not yet"}</span>
      </li>)}
    </ol>
  );
}

// ------------------------------------------------------------ Today's Next Step (My learning)
export function NextStep({ api, apiBase, nav }) {
  const [d, setD] = useState(null);
  useEffect(() => { api("GET", "/api/v8/learn/next-step").then((r) => setD(r.ok ? r.json : { error: r.json.message })); }, [api]);
  if (!d) return <Skel h={180} r={22} />;
  if (d.error) return <p className="v8c-err">{d.error}</p>;
  if (!d.focus) return (
    <section className="lj-next empty"><div><small className="lj-kicker"><V8Icon name="sparkles" size={16} />Today’s next step</small><h2>Start your first course</h2><p>Pick a course and your next step will appear here every day.</p></div>
      <button type="button" className="v8-btn v8-btn-primary" onClick={() => nav("courses")}>Find a course</button></section>);
  const { course: c, step, milestones, progress } = d.focus;
  const go = () => {
    if (step.kind === "lesson" && step.lesson) nav(`lessons/${step.lesson}`);
    else nav(`courses/${c.public_key}`);
  };
  const cta = { lesson: "Start lesson", materials: "Open checklist", share: "Share my work", revise: "See feedback", wait: "View course", certificate: "Continue", done: c.certificate_available ? "View course" : "View course" }[step.kind] || "Continue";
  return (
    <section className="lj-next" aria-label="Today’s next step">
      <div className="lj-next-main">
        <small className="lj-kicker"><V8Icon name="sparkles" size={16} />Today’s next step</small>
        <div className="lj-next-step"><span className="lj-step-ico"><V8Icon name={STEP_ICON[step.kind] || "play"} size={22} /></span>
          <div><h2>{step.title}</h2><p>{c.title}{step.detail ? ` · ${step.detail}` : ""}</p></div></div>
        <div className="lj-next-prog"><span className="v8l-bar"><i style={{ width: `${progress}%` }} /></span><small>{progress}% of lessons</small></div>
        <button type="button" className="v8-btn v8-btn-primary lj-next-cta" onClick={go}>{cta}</button>
      </div>
      <div className="lj-next-journey"><b>Project journey</b><JourneyTrack milestones={milestones} /></div>
      {d.others?.length ? <div className="lj-others"><b>Also in progress</b><div className="lj-others-row">{d.others.map((o) => <button key={o.course.public_key} type="button" onClick={() => nav(`courses/${o.course.public_key}`)}>
        <span>{o.course.title}</span><small>{o.step?.title || ""}</small><span className="v8l-bar"><i style={{ width: `${o.progress}%` }} /></span></button>)}</div></div> : null}
    </section>
  );
}

// ------------------------------------------------------------ Materials Checklist → Shop (safe context: the item name only)
export function MaterialsChecklist({ api, code, user, onRequireLogin, onShop }) {
  const [d, setD] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!user) return; api("GET", `/api/v8/learn/courses/${code}/materials`).then((r) => setD(r.ok ? r.json : { error: r.json.message })); }, [api, code, user]);
  if (!user) return <section className="v8-card lj-block"><h3><V8Icon name="box" size={18} />Materials checklist</h3><p className="v8c-muted">Sign in to tick off the supplies you already have.</p><button type="button" className="v8-btn" onClick={onRequireLogin}>Sign in</button></section>;
  if (!d) return <Skel h={120} r={18} />;
  if (d.error) return <p className="v8c-err">{d.error}</p>;
  if (!d.items.length) return <section className="v8-card lj-block"><h3><V8Icon name="box" size={18} />Materials</h3><p className="v8c-muted">This course doesn’t list any materials.</p></section>;
  const toggle = async (name) => {
    const owned = d.items.filter((x) => (x.name === name ? !x.owned : x.owned)).map((x) => x.name);
    setD((x) => ({ ...x, items: x.items.map((i) => (i.name === name ? { ...i, owned: !i.owned } : i)) })); setBusy(true);
    const r = await api("PUT", `/api/v8/learn/courses/${code}/materials`, { owned }); setBusy(false);
    if (r.ok) setD(r.json);
  };
  const have = d.items.filter((x) => x.owned).length;
  return (
    <section className="v8-card lj-block" aria-label="Materials checklist">
      <header className="lj-block-head"><h3><V8Icon name="box" size={18} />Materials checklist</h3><small>{have} of {d.items.length} ready{busy ? " · saving…" : ""}</small></header>
      {d.estimate ? <p className="lj-note">Teacher’s estimate: about {inr(d.estimate)} for all materials — not included in the course price. Shop shows the actual price.</p> : null}
      <ul className="lj-mats">{d.items.map((i) => <li key={i.name} className={i.owned ? "on" : ""}>
        <label><input type="checkbox" checked={i.owned} onChange={() => toggle(i.name)} /><span>{i.name}</span></label>
        {!i.owned ? <button type="button" className="v8-btn lj-shop" onClick={() => onShop(i.name)}><V8Icon name="shop" size={16} />Find in Shop</button> : <small className="lj-have">I have this</small>}
      </li>)}</ul>
      <p className="v8c-muted lj-fine">Buying anything is optional. Shop availability and prices are decided in Shop.</p>
    </section>
  );
}

// ------------------------------------------------------------ Show My Work + teacher feedback + retry
export function ShowMyWork({ api, apiBase, getAuthHeaders, code, onChange }) {
  const ui = useV8Ui(); const [d, setD] = useState(null); const [file, setFile] = useState(null); const [note, setNote] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/learn/courses/${code}/work`); setD(r.ok ? r.json : { error: r.json.message, code: r.json.code }); }, [api, code]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={140} r={18} />;
  if (d.code === "NO_PROJECT") return null;
  if (d.error) return <p className="v8c-err">{d.error}</p>;
  const pick = (f) => { const c = checkWorkFile(f); setErr(c.ok ? "" : c.message); setFile(c.ok ? f : null); };
  const submit = async () => {
    if (!file) { setErr("Choose a photo or a short clip."); return; }
    setBusy(true); setErr("");
    const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); }).catch(() => null);
    const r = data ? await api("POST", `/api/v8/learn/courses/${code}/work`, { mediaData: data, note }) : { ok: false, json: { message: "Couldn’t read that file." } };
    setBusy(false);
    if (!r.ok) { setErr(r.json.message); return; }
    setFile(null); setNote(""); ui?.toast({ title: "Shared with your teacher" }); await load(); onChange?.();
  };
  const latest = d.items[0];
  return (
    <section className="v8-card lj-block" aria-label="Show my work">
      <header className="lj-block-head"><h3><V8Icon name="camera" size={18} />Show my work</h3><small>{d.accepted ? "Accepted" : `${d.attempts_left} of ${d.max_attempts} shares left`}</small></header>
      <p className="v8c-muted">Share a photo or a short clip of your project. Only you and this course’s teacher can see it.</p>
      {latest ? <div className={`lj-status ${latest.status}`}><V8Icon name={latest.status === "accepted" ? "check" : latest.status === "revision" ? "refresh" : "clock"} size={18} />
        <div><b>{latest.status === "accepted" ? "Accepted by your teacher" : latest.status === "revision" ? "Your teacher asked for a revision" : "Waiting for your teacher"}</b>
          {latest.feedback ? <p>“{latest.feedback}”</p> : null}</div></div> : null}
      {d.can_submit ? <div className="lj-upload">
        <label className="lj-drop"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => pick(e.target.files?.[0] || null)} />
          <V8Icon name="upload" size={22} /><span>{file ? file.name : latest?.status === "revision" ? "Choose your improved photo or clip" : "Choose a photo or clip"}</span><small>Photo up to 5 MB · clip up to 20 MB</small></label>
        <label className="v8c-field"><span>Note for your teacher (optional)</span><input value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} /></label>
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !file} onClick={submit}>{busy ? "Sharing…" : latest ? "Share again" : "Share with teacher"}</button>
      </div> : null}
      {d.items.length ? <div className="lj-attempts">{d.items.map((w) => <figure key={w.public_key} className={`lj-attempt ${w.status}`}>
        <WorkMedia apiBase={apiBase} getAuthHeaders={getAuthHeaders} item={w} />
        <figcaption><b>Share {w.attempt}</b><small>{w.status === "accepted" ? "Accepted" : w.status === "revision" ? "Revision asked" : "Waiting for review"}</small>{w.note ? <small>“{w.note}”</small> : null}</figcaption></figure>)}</div> : null}
    </section>
  );
}

// ------------------------------------------------------------ Ready to Sell → Shop draft only (never published here)
export function ReadyToSell({ api, course, nav }) {
  const ui = useV8Ui();
  const [f, setF] = useState({ name: course.outcome ? course.outcome.replace(/^(make|crochet|stitch|bake|build|design|finish|join|embroider|draft)\s+(a|an|the)?\s*/i, "").replace(/^./, (x) => x.toUpperCase()).slice(0, 120) : "", materials: course.materials_cost || "", extras: "", hours: "", rate: "", margin: "", description: "", credit: true });
  const [state, setState] = useState({ busy: false, err: "", code: "", product: null });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const num = (v) => String(v).replace(/[^\d.]/g, "").slice(0, 8);
  const c = costing(f);
  const create = async () => {
    setState({ busy: true, err: "", code: "", product: null });
    const description = [f.description.trim(), f.credit ? `Made after finishing the HOWDI Learn course “${course.title}”.` : ""].filter(Boolean).join(" ").slice(0, 600);
    const r = await api("POST", "/api/v8/vendor/products", { name: f.name.trim(), price: c.price, mrp: c.price, stock: 1, description });
    if (!r.ok) { setState({ busy: false, err: r.json.message, code: r.json.code || "", product: null }); return; }
    // Fail closed: success is shown only when Shop explicitly confirms the listing is a draft.
    if (!isConfirmedDraft(r.json)) { setState({ busy: false, err: "HOWDI Shop didn’t confirm this listing is a private draft, so it isn’t shown as saved. Check your store before sharing it.", code: "DRAFT_NOT_CONFIRMED", product: null }); return; }
    setState({ busy: false, err: "", code: "", product: r.json.product }); ui?.toast({ title: "Draft saved in your store — not visible to buyers yet" });
  };
  return (
    <section className="v8-card lj-block lj-sell" aria-label="Ready to sell">
      <header className="lj-block-head"><h3><V8Icon name="store" size={18} />Ready to sell?</h3><small>Creates a private Shop draft</small></header>
      <p className="v8c-muted">Your teacher accepted your work. If you want to sell something like it, work out a fair price and save a draft listing. Nothing goes live until you add photos and publish it yourself in your store.</p>
      {state.product ? <div className="lj-status accepted"><V8Icon name="check" size={18} /><div><b>Draft “{state.product.name}” saved at {inr(state.product.price)}</b><p>It is not public. Add photos, check the details and publish from your store when you’re ready.</p></div>
        <button type="button" className="v8-btn v8-btn-primary" onClick={() => nav("/me/vendor/store")}>Open my store</button></div> : <>
        <label className="v8c-field"><span>What would you sell?</span><input value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Crochet daisy coaster set" /></label>
        <div className="lj-cost">
          <label className="v8c-field"><span>Materials, ₹</span><input inputMode="decimal" value={f.materials} onChange={(e) => set("materials", num(e.target.value))} /></label>
          <label className="v8c-field"><span>Packaging & other costs, ₹</span><input inputMode="decimal" value={f.extras} onChange={(e) => set("extras", num(e.target.value))} /></label>
          <label className="v8c-field"><span>Hours to make one</span><input inputMode="decimal" value={f.hours} onChange={(e) => set("hours", num(e.target.value))} /></label>
          <label className="v8c-field"><span>Your hourly rate, ₹</span><input inputMode="decimal" value={f.rate} onChange={(e) => set("rate", num(e.target.value))} /></label>
          <label className="v8c-field"><span>Extra margin, %</span><input inputMode="decimal" value={f.margin} onChange={(e) => set("margin", num(e.target.value))} /></label>
        </div>
        <dl className="lj-sum"><div><dt>Materials + other costs</dt><dd>{inr(c.materials + c.extras)}</dd></div><div><dt>Your time</dt><dd>{inr(c.labour)}</dd></div><div><dt>Cost to make</dt><dd>{inr(c.cost)}</dd></div><div className="total"><dt>Your price</dt><dd>{inr(c.price)}</dd></div></dl>
        <p className="lj-fine">This is a calculator using your own numbers. It doesn’t predict sales or income.</p>
        <label className="v8c-field"><span>Short description (optional)</span><textarea rows={2} maxLength={400} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label className="lj-check"><input type="checkbox" checked={f.credit} onChange={(e) => set("credit", e.target.checked)} />Mention that I made it after this HOWDI Learn course</label>
        {state.err ? <div className="v8c-err" role="alert">{state.err}{state.code === "NOT_A_VENDOR" ? <> <button type="button" className="v8-link" onClick={() => nav("/me/vendor")}>Apply to sell on HOWDI</button></> : null}</div> : null}
        <button type="button" className="v8-btn v8-btn-primary" disabled={state.busy || f.name.trim().length < 3 || c.price < 1} onClick={create}>{state.busy ? "Saving draft…" : `Save draft at ${inr(c.price)}`}</button>
      </>}
    </section>
  );
}

// ------------------------------------------------------------ Find My Learning Path (three questions, explainable)
export function PathFinder({ api, apiBase, open, onClose, onApply, nav }) {
  const [step, setStep] = useState(0); const [a, setA] = useState({ goal: "", lang: "", time: "" }); const [langs, setLangs] = useState(null); const [res, setRes] = useState(null);
  useEffect(() => { if (!open) return; api("GET", "/api/v8/learn/courses?limit=1").then((r) => setLangs(r.ok ? (r.json.facets?.languages || []).map((l) => l.value) : [])); }, [api, open]);
  const run = useCallback(async (ans) => {
    setRes({ loading: true });
    for (const cand of pathQueries(ans)) {
      const r = await api("GET", `/api/v8/learn/courses?${discoveryApiQuery(cand.state, 0, 3)}`);
      if (!r.ok) { setRes({ error: r.json.message }); return; }
      if (r.json.items?.length) { setRes({ items: r.json.items, total: r.json.total, state: cand.state, ...explainPath(ans, cand.relaxed) }); return; }
    }
    setRes({ items: [], total: 0 });
  }, [api]);
  const choose = (k, v) => { const next = { ...a, [k]: v }; setA(next); if (step < 2) setStep(step + 1); else { setStep(3); run(next); } };
  const reset = () => { setStep(0); setA({ goal: "", lang: "", time: "" }); setRes(null); };
  if (!open) return null;
  const Q = ({ title, opts, k }) => <div className="lj-q"><h3>{title}</h3><div className="lj-q-opts">{opts.map(([v, l]) => <button key={v} type="button" className={a[k] === v ? "on" : ""} onClick={() => choose(k, v)}>{l}</button>)}</div></div>;
  return (
    <Sheet open title="Find my learning path" onClose={() => { onClose(); reset(); }} wide>
      <div className="lj-path">
        <ol className="lj-path-steps" aria-label="Progress">{["Goal", "Language", "Time"].map((s, i) => <li key={s} className={step > i ? "done" : step === i ? "now" : ""}>{s}</li>)}</ol>
        {step === 0 ? <Q k="goal" title="What would you like to do?" opts={PATH_GOALS} /> : null}
        {step === 1 ? (langs === null ? <Skel h={80} /> : <Q k="lang" title="Which language do you learn best in?" opts={[...langs.map((l) => [l, l]), ["any", "Any language"]]} />) : null}
        {step === 2 ? <Q k="time" title="How much time can you give a course in total?" opts={PATH_TIMES} /> : null}
        {step === 3 ? (!res || res.loading ? <Skel h={200} r={16} /> : res.error ? <p className="v8c-err">{res.error}</p> : !res.items.length ? (
          <div className="lx-state"><V8Icon name="learn" size={28} /><b>No courses to suggest yet</b><p>There are no published courses right now. Browse Learn later, or teach what you know.</p>
            <div className="lx-recover"><button type="button" className="v8-btn" onClick={reset}>Change answers</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => { onClose(); reset(); nav("courses"); }}>Browse Learn</button></div></div>
        ) : (<>
          <div className="lj-why"><b>Why these courses</b>
            <p>{res.matched.length ? <>Matched: {res.matched.map((m) => <span key={m} className="lj-tag ok">{m}</span>)}</> : null}</p>
            {res.loosened.length ? <p>Widened so you have options: {res.loosened.map((m) => <span key={m} className="lj-tag">{m}</span>)}</p> : null}
            <small>Suggestions come from courses published on HOWDI right now. They are a starting point, not a promise of results.</small></div>
          <div className="lj-path-results">{res.items.map((c) => <CourseCard key={c.public_key} c={c} apiBase={apiBase} nav={(p) => { onClose(); nav(p); }} compact />)}</div>
          <div className="lx-recover"><button type="button" className="v8-btn" onClick={reset}>Change answers</button>
            <button type="button" className="v8-btn v8-btn-primary" onClick={() => { onApply(res.state); onClose(); reset(); }}>See all {res.total} matching course{res.total === 1 ? "" : "s"}</button></div>
        </>)) : null}
        {step > 0 && step < 3 ? <button type="button" className="v8-link" onClick={() => setStep(step - 1)}>← Back</button> : null}
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------ Teacher: review shared work
export function WorkReviews({ api, apiBase, getAuthHeaders, code }) {
  const ui = useV8Ui(); const [d, setD] = useState(null); const [fb, setFb] = useState({}); const [busy, setBusy] = useState("");
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/learn/teach/courses/${code}/work`); setD(r.ok ? r.json : { error: r.json.message }); }, [api, code]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={140} r={18} />;
  if (d.error) return <p className="v8c-err">{d.error}</p>;
  const decide = async (w, decision) => {
    setBusy(w.public_key); const r = await api("POST", `/api/v8/learn/teach/work/${w.public_key}/review`, { decision, feedback: fb[w.public_key] || "" }); setBusy("");
    if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; }
    ui?.toast({ title: decision === "accept" ? "Accepted — the learner has been notified" : "Revision requested" }); load();
  };
  return (
    <section className="v8-card lj-block" aria-label="Shared work">
      <header className="lj-block-head"><h3><V8Icon name="camera" size={18} />Shared work</h3><small>{d.items.filter((x) => x.status === "submitted").length} waiting</small></header>
      {!d.items.length ? <p className="v8c-muted">When learners share photos or clips of their project, they appear here for your feedback.</p>
        : <div className="lj-attempts teacher">{d.items.map((w) => <figure key={w.public_key} className={`lj-attempt ${w.status}`}>
          <WorkMedia apiBase={apiBase} getAuthHeaders={getAuthHeaders} item={w} />
          <figcaption><b>@{w.learner?.public_username || "learner"} · share {w.attempt}</b>{w.note ? <small>“{w.note}”</small> : null}
            {w.status === "submitted" ? <>
              <label className="v8c-field"><span>Feedback</span><textarea rows={2} maxLength={1000} value={fb[w.public_key] || ""} onChange={(e) => setFb((x) => ({ ...x, [w.public_key]: e.target.value }))} placeholder="What’s good, and what to improve" /></label>
              <div className="lj-review-actions"><button type="button" className="v8-btn" disabled={busy === w.public_key} onClick={() => decide(w, "revise")}>Ask for a revision</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy === w.public_key} onClick={() => decide(w, "accept")}>Accept</button></div>
            </> : <small className={`lj-pill ${w.status}`}>{w.status === "accepted" ? "Accepted" : "Revision asked"}{w.feedback ? ` · “${w.feedback}”` : ""}</small>}
          </figcaption></figure>)}</div>}
    </section>
  );
}

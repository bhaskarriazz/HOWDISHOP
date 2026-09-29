// HOWDI V8 — Learn course card (P8 / LRN-DISC-003): only metadata the API returned; no popularity claims.
import { V8Icon } from "../V8Shell";
import { inr } from "../connect/HPayUtilities";
import { cardFacts, mediaSrc } from "./learnDiscovery";
import "./learn-discover.css";

export default function CourseCard({ c, apiBase, nav, onSave, compact }) {
  const f = cardFacts(c); const img = mediaSrc(apiBase, c.image);
  return (
    <article className={`lx-card ${compact ? "compact" : ""}`}>
      <div className="lx-cover">
        {img ? <img src={img} alt="" loading="lazy" /> : <span className="lx-cover-ph"><V8Icon name="learn" size={34} /><small>{c.category}</small></span>}
        <em className="lx-price">{c.free ? "Free" : inr(c.price)}</em>
        {onSave ? <button type="button" className={`lx-save ${c.saved ? "on" : ""}`} aria-pressed={Boolean(c.saved)} aria-label={c.saved ? `Remove ${c.title} from saved` : `Save ${c.title}`} onClick={() => onSave(c)}><V8Icon name="heart" size={18} fill={Boolean(c.saved)} /></button> : null}
        {f.formats.length ? <span className="lx-formats">{f.formats.map((x) => <i key={x}>{x}</i>)}</span> : null}
      </div>
      <div className="lx-card-body">
        <span className="lx-tags">{[c.category, f.level, c.language].filter(Boolean).map((t) => <i key={t}>{t}</i>)}</span>
        <h3><button type="button" className="lx-title" onClick={() => nav(`courses/${c.public_key}`)}>{c.title}</button></h3>
        {c.outcome ? <p className="lx-outcome"><V8Icon name="star" size={14} /><span><b>You’ll make:</b> {c.outcome}</span></p> : c.tagline ? <p className="lx-outcome plain">{c.tagline}</p> : null}
        <p className="lx-teacher">{c.by_howdi ? "HOWDI Learn" : c.teacher ? <>@{c.teacher.public_username}{c.teacher.verified ? <V8Icon name="check" size={12} /> : null}</> : null}</p>
        <ul className="lx-facts">
          {f.duration ? <li><V8Icon name="clock" size={14} />{f.duration} · {c.lessons} lesson{c.lessons === 1 ? "" : "s"}</li> : null}
          {f.support.length ? <li><V8Icon name="shield" size={14} />{f.support.join(" · ")}</li> : null}
          <li><V8Icon name="box" size={14} />{f.materials}</li>
        </ul>
        {c.enrolled ? <span className="lx-prog"><span className="v8l-bar"><i style={{ width: `${c.progress}%` }} /></span><small>{c.progress}%</small></span> : null}
        <div className="lx-card-actions">
          <button type="button" className="v8-btn v8-btn-primary" onClick={() => nav(`courses/${c.public_key}`)}>{c.enrolled ? "Continue" : "View course"}</button>
          {c.preview_lesson && !c.enrolled ? <button type="button" className="v8-btn" onClick={() => nav(`lessons/${c.preview_lesson}`)}><V8Icon name="play" size={14} />Preview</button> : null}
          {c.learners ? <small className="lx-learners">{c.learners} learner{c.learners === 1 ? "" : "s"}</small> : null}
        </div>
      </div>
    </article>
  );
}


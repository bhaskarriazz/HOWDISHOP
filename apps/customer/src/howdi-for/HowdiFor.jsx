import { SEGMENTS, SEGMENT_SLUGS, getSegment } from './segments.js';
import { hrefFor, segmentHref, shouldIntercept } from './routes.js';
import './HowdiFor.css';

/**
 * MP-56 HOWDI FOR — landing pages. Router-agnostic: pass `onNavigate(href, target)` to use the app's router
 * (client-side, incl. the existing login-continuation for gated destinations, R11). Without it, plain links work.
 */
export function NavLink({ href, onNavigate, target, className, children }) {
  if (!href) return null;
  const onClick = (e) => {
    if (onNavigate && shouldIntercept(e)) { e.preventDefault(); onNavigate(href, target); }
  };
  return <a className={className} href={href} onClick={onClick}>{children}</a>;
}

export function HowdiForSegment({ slug, onNavigate }) {
  const seg = getSegment(slug);
  if (!seg) return <HowdiForNotFound onNavigate={onNavigate} />;
  const headingId = `hf-${seg.slug}-title`;
  return (
    <article className="hf-page" aria-labelledby={headingId}>
      <nav className="hf-crumbs" aria-label="Breadcrumb">
        <NavLink href="/for" onNavigate={onNavigate}>HOWDI for</NavLink>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{seg.title.replace('HOWDI for ', '')}</span>
      </nav>

      <header className="hf-hero">
        <h1 id={headingId} className="hf-title">{seg.title}</h1>
        <p className="hf-tagline">{seg.tagline}</p>
        <p className="hf-intro">{seg.intro}</p>
      </header>

      <section aria-labelledby={`${headingId}-how`} className="hf-section">
        <h2 id={`${headingId}-how`} className="hf-h2">How it works</h2>
        <ol className="hf-steps">
          {seg.journey.map((step) => <li key={step} className="hf-step">{step}</li>)}
        </ol>
      </section>

      <section aria-labelledby={`${headingId}-go`} className="hf-section">
        <h2 id={`${headingId}-go`} className="hf-h2">Get started</h2>
        <ul className="hf-actions">
          {seg.actions.filter((a) => hrefFor(a.target, seg.slug)).map((a) => (
            <li key={a.id}>
              <NavLink className="hf-action" href={hrefFor(a.target, seg.slug)} target={a.target} onNavigate={onNavigate}>
                <span className="hf-action-label">{a.label}</span>
                <span className="hf-action-hint">{a.hint}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </section>

      <aside className="hf-others" aria-label="Other HOWDI audiences">
        <h2 className="hf-h2">Looking for something else?</h2>
        <ul className="hf-chips">
          {SEGMENT_SLUGS.filter((s) => s !== seg.slug).map((s) => (
            <li key={s}><NavLink className="hf-chip" href={segmentHref(s)} onNavigate={onNavigate}>{SEGMENTS[s].title}</NavLink></li>
          ))}
        </ul>
      </aside>
    </article>
  );
}

export function HowdiForIndex({ onNavigate }) {
  return (
    <article className="hf-page" aria-labelledby="hf-index-title">
      <header className="hf-hero">
        <h1 id="hf-index-title" className="hf-title">HOWDI for you</h1>
        <p className="hf-tagline">Pick the path that fits you. It is all the same HOWDI account.</p>
      </header>
      <ul className="hf-actions">
        {SEGMENT_SLUGS.map((s) => (
          <li key={s}>
            <NavLink className="hf-action" href={segmentHref(s)} onNavigate={onNavigate}>
              <span className="hf-action-label">{SEGMENTS[s].title}</span>
              <span className="hf-action-hint">{SEGMENTS[s].tagline}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Unknown /for/<x>: friendly page. The requested text is deliberately NOT echoed back. */
export function HowdiForNotFound({ onNavigate }) {
  return (
    <article className="hf-page" aria-labelledby="hf-nf-title">
      <header className="hf-hero">
        <h1 id="hf-nf-title" className="hf-title">We couldn't find that page</h1>
        <p className="hf-tagline">Try one of these instead.</p>
      </header>
      <ul className="hf-actions">
        {SEGMENT_SLUGS.map((s) => (
          <li key={s}><NavLink className="hf-action" href={segmentHref(s)} onNavigate={onNavigate}><span className="hf-action-label">{SEGMENTS[s].title}</span></NavLink></li>
        ))}
      </ul>
    </article>
  );
}

/** Convenience: give it the parsed path result from parseForPath(). */
export default function HowdiFor({ route, onNavigate }) {
  if (!route) return null;
  if (route.kind === 'segment') return <HowdiForSegment slug={route.slug} onNavigate={onNavigate} />;
  if (route.kind === 'index') return <HowdiForIndex onNavigate={onNavigate} />;
  return <HowdiForNotFound onNavigate={onNavigate} />;
}

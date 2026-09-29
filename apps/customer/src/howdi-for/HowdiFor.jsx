import { useEffect, useRef, useState } from 'react';
import { SEGMENTS, SEGMENT_SLUGS, getSegment } from './segments.js';
import { cleanTopic, hrefFor, segmentHref, shouldIntercept } from './routes.js';
import './HowdiFor.css';
import { V8Icon } from '../v8/V8Shell';

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

// Presentation only: action targets and navigation stay in the existing segment data.
const LOOKS = {
  students: { label: 'Students', headline: 'Learn it. Make it. Show it.', copy: 'Explore a skill, build your proof and find your next opportunity.', icon: 'learn', rail: 'Where will your skills take you?', featured: ['skill-journey', 'skill-passport', 'opportunities'], visual: ['Learn a skill', 'Build your proof', 'Explore opportunities'], icons: ['learn', 'shield', 'spark'], footer: 'Your next chapter starts here' },
  institutes: { label: 'Institutes & Colleges', headline: 'Build a place for learning.', copy: 'Bring programmes, practical skills and your learning community together.', icon: 'users', rail: 'Connect your campus', featured: ['programmes', 'live-classes', 'campus-services'], visual: ['Programmes & cohorts', 'Teaching & practice', 'Community & growth'], icons: ['learn', 'play', 'users'], footer: 'From your campus to HOWDI' },
  startups: { label: 'Startups & Small Businesses', headline: 'Your next business move.', copy: 'Find skilled help, source what you need and grow your team’s skills.', icon: 'works', rail: 'Get to work on your next goal', featured: ['source-products', 'team-training', 'partnerships'], visual: ['Find skilled help', 'Source products', 'Connect & collaborate'], icons: ['works', 'shop', 'connect'], footer: 'Practical tools. One HOWDI.' },
};
const DESTINATIONS = { learn: 'Learn', works: 'Work', shop: 'Shop', connect: 'Connect' };
const STEP_ICONS = { students: ['learn', 'bulb', 'shield', 'star', 'store', 'trend'], institutes: ['learn', 'play', 'shield', 'check'], startups: ['works', 'store', 'connect'] };
const ACTION_ICONS = { 'skill-journey': 'learn', 'skill-passport': 'shield', opportunities: 'spark', programmes: 'learn', 'live-classes': 'play', 'campus-services': 'works' };

export function HowdiForSegment({ slug, onNavigate }) {
  const [topic, setTopic] = useState(() => typeof window === 'undefined' ? '' : cleanTopic(new URLSearchParams(window.location.search).get('q')));
  const seg = getSegment(slug);
  if (!seg) return <HowdiForNotFound onNavigate={onNavigate} />;
  const look = LOOKS[slug];
  const headingId = `hf-${seg.slug}-title`;
  const primary = seg.actions[0];
  const featured = look.featured.map(id => seg.actions.find(a => a.id === id));
  const more = seg.actions.filter(a => a !== primary && !look.featured.includes(a.id));
  const action = (a, className = 'hf-goal') => (
    <NavLink className={`hf-action ${className}`} href={hrefFor(a.target, seg.slug, { q: topic })} target={a.target} onNavigate={onNavigate}>
      <span className={`hf-action-icon hf-icon-${a.target.pillar}`} aria-hidden="true"><V8Icon name={ACTION_ICONS[a.id] || a.target.pillar} size={24} /></span>
      <span className="hf-action-copy"><span className="hf-action-category">{DESTINATIONS[a.target.pillar]}</span><span className="hf-action-label">{a.label}</span><span className="hf-action-hint">{a.hint}</span></span>
      <span className="hf-action-arrow" aria-hidden="true">↗</span>
    </NavLink>
  );
  return (
    <article className={`hf-page hf-audience hf-${slug}`} aria-labelledby={headingId}>
      <nav className="hf-crumbs" aria-label="Breadcrumb">
        <NavLink href="/for" onNavigate={onNavigate}>HOWDI for</NavLink><span aria-hidden="true"> / </span><span aria-current="page">{look.label}</span>
      </nav>
      <header className="hf-hero">
        <div className="hf-hero-copy">
          <span className="hf-eyebrow"><V8Icon name={look.icon} size={18} />{seg.title}</span>
          <h1 id={headingId} className="hf-title">{look.headline}</h1>
          <p className="hf-intro">{look.copy}</p>
          <NavLink className="hf-action hf-primary" href={hrefFor(primary.target, seg.slug, { q: topic })} target={primary.target} onNavigate={onNavigate}>
            <span>{primary.label}</span><span aria-hidden="true">→</span>
          </NavLink>
        </div>
        <div className="hf-hero-visual" aria-hidden="true">
          <span className="hf-visual-orbit"><V8Icon name={look.icon} size={56} /></span>
          <div className="hf-visual-cards">{look.visual.map((label, i) => <div className="hf-visual-card" key={label}><V8Icon name={look.icons[i]} size={22} /><span>{label}</span></div>)}</div>
          <span className="hf-visual-caption">{look.footer}</span>
        </div>
      </header>

      <section className="hf-journey" aria-labelledby={`${headingId}-how`}>
        <h2 id={`${headingId}-how`} className="hf-h2">How it works</h2>
        <ol className="hf-steps" tabIndex={0} aria-label="Journey steps; scroll for more">
          {seg.journey.map((step, i) => <li key={step} className="hf-step"><span className="hf-step-icon"><V8Icon name={STEP_ICONS[slug][i]} size={20} /></span><span>{step}</span></li>)}
        </ol>
      </section>

      <section className="hf-context" aria-label="Explore your interests">
        <label htmlFor="hf-topic">What would you like to explore?</label>
        <div className="hf-search-field"><V8Icon name="search" size={20} /><input id="hf-topic" type="search" maxLength={80} value={topic} placeholder="A skill, topic, product or service" aria-describedby="hf-topic-help" onChange={(event) => {
          const value = event.target.value;
          setTopic(value);
          const qs = new URLSearchParams();
          if (cleanTopic(value)) qs.set('q', cleanTopic(value));
          window.history.replaceState(window.history.state, '', `${segmentHref(slug)}${qs.size ? `?${qs}` : ''}`);
        }} /></div>
        <p id="hf-topic-help">Your topic follows you into destination searches.</p>
      </section>

      <section className="hf-goals" aria-labelledby={`${headingId}-go`}>
        <div className="hf-section-heading"><h2 id={`${headingId}-go`} className="hf-h2">{look.rail}</h2><span className="hf-swipe-hint" aria-hidden="true">Explore →</span></div>
        <ul className="hf-actions hf-goal-rail" tabIndex={0} aria-label="Explore goals; scroll for more">{featured.map(a => <li key={a.id}>{action(a)}</li>)}</ul>
      </section>

      <details className="hf-more">
        <summary><span><b>More for {look.label.toLowerCase()}</b><small>Explore {more.length} more ways to use HOWDI</small></span><V8Icon name="chev" size={20} /></summary>
        <ul className="hf-more-actions">{more.map(a => <li key={a.id}>{action(a, 'hf-secondary')}</li>)}</ul>
        <p className="hf-access-note">Browse freely. Organisation access, teaching and selling remain subject to their existing approval steps. Work opportunities have their own eligibility requirements.</p>
      </details>
      <aside className="hf-others" aria-label="Other HOWDI audiences">
        <h2 className="hf-h2">Looking for a different path?</h2>
        <ul className="hf-chips">{SEGMENT_SLUGS.filter(s => s !== slug).map(s => <li key={s}><NavLink className="hf-chip" href={segmentHref(s)} onNavigate={onNavigate}>{LOOKS[s].label}<span aria-hidden="true"> →</span></NavLink></li>)}</ul>
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
  const page = useRef(null);
  useEffect(() => {
    const heading = page.current?.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    page.current?.closest('.hf-app-overlay')?.scrollTo({ top: 0 });
  }, [route?.kind, route?.slug]);
  if (!route) return null;
  return <div ref={page}>{route.kind === 'segment'
    ? <HowdiForSegment key={route.slug} slug={route.slug} onNavigate={onNavigate} />
    : route.kind === 'index' ? <HowdiForIndex onNavigate={onNavigate} /> : <HowdiForNotFound onNavigate={onNavigate} />}</div>;
}

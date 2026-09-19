import { NavLink } from './HowdiFor.jsx';
import { SEGMENTS, SEGMENT_SLUGS } from './segments.js';
import { FOR_BASE, segmentHref } from './routes.js';
import './HowdiFor.css';

// MP-56 contextual entry points. None of these is a nav item or a tab (R01, R12): they live inside existing surfaces.

/** 1) Permanent anchor: a row for the My HOWDI menu / account settings list. */
export function HowdiForMenuRow({ onNavigate }) {
  return (
    <NavLink className="hf-menu-row" href={FOR_BASE} onNavigate={onNavigate}>
      <span className="hf-action-label">HOWDI for You</span>
      <span className="hf-action-hint">Students, Institutes and Startups</span>
    </NavLink>
  );
}

/** 2) One card for the Connect feed. Host decides placement (see insertFeedCard) and any dismissal behaviour. */
export function HowdiForFeedCard({ onNavigate, onDismiss }) {
  return (
    <aside className="hf-feed-card" aria-labelledby="hf-feed-title">
      <h2 id="hf-feed-title" className="hf-h2">Find your path on HOWDI</h2>
      <p className="hf-feed-text">Learn, work, sell and grow with one account. Pick what fits you.</p>
      <ul className="hf-chips">
        {SEGMENT_SLUGS.map((s) => (
          <li key={s}><NavLink className="hf-chip" href={segmentHref(s)} onNavigate={onNavigate}>{SEGMENTS[s].title.replace('HOWDI for ', '')}</NavLink></li>
        ))}
      </ul>
      {onDismiss && <button type="button" className="hf-dismiss" onClick={onDismiss}>Not now</button>}
    </aside>
  );
}

const EMPTY_TARGETS = { learn: { slug: 'students', text: 'See how HOWDI works for Students' }, works: { slug: 'startups', text: 'See how HOWDI works for Startups' } };

/** 3) Subtle link for Learn / Works empty states (host renders it only when the user has no enrolments / bookings). */
export function HowdiForEmptyStateLink({ context, onNavigate }) {
  const t = Object.prototype.hasOwnProperty.call(EMPTY_TARGETS, context) ? EMPTY_TARGETS[context] : null;
  return (
    <p className="hf-empty-link">
      <NavLink className="hf-empty-anchor" href={t ? segmentHref(t.slug) : FOR_BASE} onNavigate={onNavigate}>
        {t ? t.text : 'See how HOWDI works for you'}
      </NavLink>
    </p>
  );
}

/**
 * Pure helper: insert the card once, after the Nth feed item. Returns a NEW array; never mutates.
 * Short feeds (fewer than `after` items) are left untouched so the card never leads or trails a near-empty feed.
 */
export function insertFeedCard(items, card, { after = 4, marker = '__howdi_for_card__' } = {}) {
  if (!Array.isArray(items) || items.length < after || after < 1) return Array.isArray(items) ? [...items] : [];
  if (items.some((i) => i && i[marker])) return [...items];
  return [...items.slice(0, after), { [marker]: true, card }, ...items.slice(after)];
}

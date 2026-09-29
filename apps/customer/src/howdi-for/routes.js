// MP-56 route helpers. ASSUMPTION TABLE: adjust ROUTE_MAP to HOWDI's real routes; nothing else needs to change.
import { SEGMENT_SLUGS, PILLARS } from './segments.js';

export const FOR_BASE = '/for';

export const ROUTE_MAP = Object.freeze({
  // K5E uses one React shell rather than a URL router. These are the canonical
  // deep-link paths translated by App.jsx into the existing pillar/view state.
  'learn.discover': '/learn/courses',
  'learn.skill-journey': '/learn/journey',
  'learn.passport': '/learn/passport',
  'learn.opportunities': '/learn/opportunities',
  'learn.live': '/learn/live',
  'learn.teach': '/learn/teach',
  'learn.community': '/learn/community',
  'learn.institute': '/me/apply/institute',
  'learn.startup': '/me/apply/startup',
  'works.discover': '/works',
  'works.become': '/works/become',
  'shop.vendor': '/me/vendor',
  'shop.catalogue': '/shop',
  'connect.create': '/connect/create',
  'connect.communities': '/connect/communities',
});

/** Allow-listed origin markers, so ?from= can never carry arbitrary text. */
const FROM_VALUES = new Set(SEGMENT_SLUGS.map((s) => `for-${s}`));

/** Destination URL for an action target, tagged with where the user came from (for Back/breadcrumb context). */
export function hrefFor(target, segmentSlug, context = {}) {
  if (!target || !PILLARS.includes(target.pillar)) return null;          // never route outside the four pillars
  const path = ROUTE_MAP[`${target.pillar}.${target.view}`];
  if (!path) return null;
  const from = `for-${segmentSlug}`;
  const qs = new URLSearchParams();
  if (FROM_VALUES.has(from)) qs.set('from', from);
  const q = cleanTopic(context.q);
  if (q && SEARCH_PATHS.has(path)) qs.set('q', q);
  return qs.size ? `${path}?${qs}` : path;
}

// Only context consumed by existing destination searches is carried. Audience
// selection is never a role, membership, entitlement or acting-user parameter.
const SEARCH_PATHS = new Set(['/learn/courses', '/works', '/shop', '/connect/communities']);
const PROTECTED_PATHS = new Set(['/learn/teach', '/learn/journey', '/learn/passport', '/learn/opportunities', '/works/become', '/me/vendor', '/me/apply/institute', '/me/apply/startup', '/connect/create']);
export const cleanTopic = (value) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) : '';

export function resolveForDestination(href, origin = 'https://howdi.invalid') {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || !Object.values(ROUTE_MAP).includes(url.pathname)) return null;
    const segment = parseFrom(url.search);
    if (!segment) return null;
    const q = SEARCH_PATHS.has(url.pathname) ? cleanTopic(url.searchParams.get('q')) : '';
    const qs = new URLSearchParams({ from: `for-${segment}` });
    if (q) qs.set('q', q);
    return { pathname: url.pathname, search: `?${qs}`, href: `${url.pathname}?${qs}`, segment, q, needsLogin: PROTECTED_PATHS.has(url.pathname) };
  } catch { return null; }
}

export function initialForSearch() {
  if (typeof window === 'undefined') return '';
  return resolveForDestination(window.location.href, window.location.origin)?.q || '';
}

/** Read and validate the ?from= marker on a destination page. Returns a segment slug or null. */
export function parseFrom(search) {
  const v = new URLSearchParams(search || '').get('from');
  return v && FROM_VALUES.has(v) ? v.slice(4) : null;
}

/** '/for' -> {kind:'index'}; '/for/students' -> {kind:'segment', slug}; '/for/whatever' -> {kind:'unknown'}; else null. */
export function parseForPath(pathname) {
  if (typeof pathname !== 'string') return null;
  const parts = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== FOR_BASE.slice(1)) return null;
  if (parts.length === 1) return { kind: 'index' };
  if (parts.length === 2 && SEGMENT_SLUGS.includes(parts[1])) return { kind: 'segment', slug: parts[1] };
  return { kind: 'unknown' };
}

export const segmentHref = (slug) => `${FOR_BASE}/${slug}`;

/** Only hijack plain left-clicks so ctrl/cmd/middle-click "open in new tab" keeps working. */
export function shouldIntercept(e) {
  return !!e && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { SEGMENTS, SEGMENT_SLUGS, PILLARS, getSegment } from './segments.js';
import { ROUTE_MAP, hrefFor, parseFrom, parseForPath, shouldIntercept, segmentHref } from './routes.js';
import HowdiFor, { HowdiForSegment, HowdiForIndex, HowdiForNotFound } from './HowdiFor.jsx';

const render = (el) => renderToStaticMarkup(el);

// ---- R01: not a fifth pillar ----
test('exactly the three required segments exist; none is a pillar', () => {
  assert.deepEqual([...SEGMENT_SLUGS].sort(), ['institutes', 'startups', 'students']);
  assert.deepEqual([...PILLARS], ['connect', 'shop', 'works', 'learn']);
  for (const s of SEGMENT_SLUGS) assert.ok(!PILLARS.includes(s));
});

test('every action routes INTO one of the four pillars and resolves to a real route key', () => {
  for (const seg of Object.values(SEGMENTS)) {
    assert.ok(seg.actions.length >= 3, `${seg.slug} has actions`);
    for (const a of seg.actions) {
      assert.ok(PILLARS.includes(a.target.pillar), `${seg.slug}/${a.id} pillar`);
      assert.ok(ROUTE_MAP[`${a.target.pillar}.${a.target.view}`], `${seg.slug}/${a.id} has route`);
      assert.ok(hrefFor(a.target, seg.slug), `${seg.slug}/${a.id} href`);
    }
  }
});

test('ROUTE_MAP never introduces a /for-prefixed destination or a fifth pillar', () => {
  for (const [k, path] of Object.entries(ROUTE_MAP)) {
    assert.ok(PILLARS.includes(k.split('.')[0]), k);
    assert.ok(!path.startsWith('/for'), path);
  }
});

// ---- TG-UX-16: deep links carry the right pillar context ----
test('hrefFor: Students -> Learn / Passport context with allow-listed origin', () => {
  const seg = SEGMENTS.students;
  const passport = seg.actions.find((a) => a.id === 'skill-passport');
  assert.equal(hrefFor(passport.target, 'students'), `${ROUTE_MAP['learn.passport']}?from=for-students`);
  const opp = seg.actions.find((a) => a.id === 'opportunities');
  assert.equal(hrefFor(opp.target, 'students'), `${ROUTE_MAP['learn.opportunities']}?from=for-students`);
});

test('hrefFor: Startups -> Works and Shop (Vendor stays inside Shop, R01)', () => {
  const a = Object.fromEntries(SEGMENTS.startups.actions.map((x) => [x.id, x]));
  assert.equal(hrefFor(a['find-workers'].target, 'startups'), `${ROUTE_MAP['works.discover']}?from=for-startups`);
  assert.equal(hrefFor(a['open-storefront'].target, 'startups'), `${ROUTE_MAP['shop.vendor']}?from=for-startups`);
});

test('hrefFor rejects foreign pillars / unknown views / bad input', () => {
  assert.equal(hrefFor({ pillar: 'for', view: 'students' }, 'students'), null);
  assert.equal(hrefFor({ pillar: 'learn', view: 'nope' }, 'students'), null);
  assert.equal(hrefFor(null, 'students'), null);
  assert.equal(hrefFor({ pillar: 'learn', view: 'discover' }, '<script>'), ROUTE_MAP['learn.discover']); // bad slug -> no from marker
});

test('parseFrom only accepts allow-listed markers', () => {
  assert.equal(parseFrom('?from=for-students'), 'students');
  assert.equal(parseFrom('?from=for-startups&x=1'), 'startups');
  assert.equal(parseFrom('?from=for-admin'), null);
  assert.equal(parseFrom('?from=<img src=x>'), null);
  assert.equal(parseFrom(''), null);
  assert.equal(parseFrom(undefined), null);
});

test('parseForPath', () => {
  assert.deepEqual(parseForPath('/for'), { kind: 'index' });
  assert.deepEqual(parseForPath('/for/'), { kind: 'index' });
  assert.deepEqual(parseForPath('/for/students'), { kind: 'segment', slug: 'students' });
  assert.deepEqual(parseForPath('/for/institutes/?utm=1#x'), { kind: 'segment', slug: 'institutes' });
  assert.deepEqual(parseForPath('/for/teachers'), { kind: 'unknown' });
  assert.deepEqual(parseForPath('/for/students/extra'), { kind: 'unknown' });
  assert.deepEqual(parseForPath('/for/__proto__'), { kind: 'unknown' });
  assert.equal(parseForPath('/learn'), null);
  assert.equal(parseForPath(null), null);
});

test('getSegment is prototype-safe', () => {
  for (const bad of ['__proto__', 'constructor', 'toString', '', null, undefined, 5]) assert.equal(getSegment(bad), null);
  assert.equal(getSegment('students').slug, 'students');
});

test('shouldIntercept only for plain left click', () => {
  assert.equal(shouldIntercept({ button: 0 }), true);
  assert.equal(shouldIntercept({ button: 1 }), false);
  assert.equal(shouldIntercept({ button: 0, ctrlKey: true }), false);
  assert.equal(shouldIntercept({ button: 0, metaKey: true }), false);
  assert.equal(shouldIntercept({ button: 0, defaultPrevented: true }), false);
});

// ---- rendering ----
test('segment page: one h1, breadcrumb, steps, action links with hrefs, other segments', () => {
  const html = render(h(HowdiForSegment, { slug: 'students' }));
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /HOWDI for Students/);
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.ok(html.includes(`href="${ROUTE_MAP['learn.passport']}?from=for-students"`));
  assert.match(html, /href="\/for\/institutes"/);
  assert.match(html, /href="\/for\/startups"/);
  assert.ok(!html.includes('href="/for/students"'), 'does not link to itself in "other" list');
  for (const step of SEGMENTS.students.journey) assert.ok(html.includes(step));
});

test('all three segment pages render without errors', () => {
  for (const s of SEGMENT_SLUGS) assert.match(render(h(HowdiForSegment, { slug: s })), new RegExp(SEGMENTS[s].title.replaceAll("&", "&amp;")));
});

test('index lists all three segments', () => {
  const html = render(h(HowdiForIndex, {}));
  for (const s of SEGMENT_SLUGS) assert.ok(html.includes(`href="${segmentHref(s)}"`));
});

test('unknown slug renders not-found and does not echo the input', () => {
  const html = render(h(HowdiForSegment, { slug: '<img src=x onerror=alert(1)>' }));
  assert.match(html, /couldn&#x27;t find that page|couldn't find that page/);
  assert.ok(!html.includes('onerror') && !html.includes('<img'));
});

test('router-level component handles index / segment / unknown / null', () => {
  assert.match(render(h(HowdiFor, { route: parseForPath('/for') })), /HOWDI for you/);
  assert.match(render(h(HowdiFor, { route: parseForPath('/for/startups') })), /HOWDI for Startups/);
  assert.match(render(h(HowdiFor, { route: parseForPath('/for/zzz') })), /find that page/);
  assert.equal(render(h(HowdiFor, { route: null })), '');
});

test('no internal identifiers appear in any landing page (R04)', () => {
  const all = [...SEGMENT_SLUGS.map((s) => render(h(HowdiForSegment, { slug: s }))), render(h(HowdiForIndex, {}))].join('');
  for (const banned of ['howdi_id', 'master_id', 'identity_uuid', 'user_id', 'userId']) assert.ok(!all.includes(banned));
});

test('copy contains no fifth-pillar language', () => {
  const text = JSON.stringify(SEGMENTS).toLowerCase();
  assert.ok(!text.includes('fifth pillar') && !text.includes('new pillar'));
});

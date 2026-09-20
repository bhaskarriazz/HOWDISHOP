import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { HowdiForMenuRow, HowdiForFeedCard, HowdiForEmptyStateLink, insertFeedCard } from './HowdiForEntryPoints.jsx';

const r = (el) => renderToStaticMarkup(el);

test('menu row links to /for and is not a pillar/tab', () => {
  const html = r(h(HowdiForMenuRow, {}));
  assert.match(html, /href="\/for"/);
  assert.match(html, /HOWDI for You/);
  assert.ok(!/role="tab"/.test(html));
});

test('feed card: labelled aside, three segment links, dismiss only when handler provided', () => {
  const html = r(h(HowdiForFeedCard, {}));
  assert.match(html, /<aside[^>]*aria-labelledby="hf-feed-title"/);
  for (const s of ['students', 'institutes', 'startups']) assert.ok(html.includes(`href="/for/${s}"`));
  assert.match(html, /Find your path on HOWDI/);
  assert.ok(!html.includes('Not now'));
  assert.match(r(h(HowdiForFeedCard, { onDismiss() {} })), /Not now/);
});

test('empty-state link: Learn -> Students, Works -> Startups, unknown -> /for', () => {
  assert.match(r(h(HowdiForEmptyStateLink, { context: 'learn' })), /href="\/for\/students"[^>]*>See how HOWDI works for Students/);
  assert.match(r(h(HowdiForEmptyStateLink, { context: 'works' })), /href="\/for\/startups"[^>]*>See how HOWDI works for Startups/);
  for (const c of ['shop', '__proto__', undefined, '<x>']) assert.match(r(h(HowdiForEmptyStateLink, { context: c })), /href="\/for"/);
});

test('insertFeedCard: after 4th item, once, immutable, short feeds untouched', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];
  const out = insertFeedCard(items, 'CARD');
  assert.equal(out.length, 7);
  assert.equal(out[4].card, 'CARD');
  assert.deepEqual(items, ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.equal(insertFeedCard(out, 'CARD').length, 7);            // no duplicate
  assert.deepEqual(insertFeedCard(['a', 'b'], 'CARD'), ['a', 'b']); // too short
  assert.equal(insertFeedCard(items, 'C', { after: 2 })[2].card, 'C');
  assert.deepEqual(insertFeedCard(null, 'C'), []);
  assert.deepEqual(insertFeedCard(items, 'C', { after: 0 }), items);
});

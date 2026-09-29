import test from 'node:test';
import assert from 'node:assert/strict';
import { SEGMENTS } from './segments.js';
import { hrefFor, resolveForDestination, cleanTopic } from './routes.js';
const origin = 'http://localhost:5173';
test('P7 every audience has supported Learn, Work, Shop and Connect handoffs', () => {
  for (const segment of Object.values(SEGMENTS)) {
    assert.deepEqual([...new Set(segment.actions.map(a => a.target.pillar))].sort(), ['connect', 'learn', 'shop', 'works']);
    for (const action of segment.actions) {
      const route = resolveForDestination(hrefFor(action.target, segment.slug, { q: 'crochet & design' }), origin);
      assert.ok(route, `${segment.slug}/${action.id}`);
      assert.equal(route.segment, segment.slug);
      assert.equal(resolveForDestination(route.href, origin).href, route.href);
    }
  }
});
test('P7 passes topic only to supported destination searches', () => {
  for (const target of [{ pillar: 'learn', view: 'discover' }, { pillar: 'shop', view: 'catalogue' }, { pillar: 'works', view: 'discover' }, { pillar: 'connect', view: 'communities' }]) {
    assert.equal(resolveForDestination(hrefFor(target, 'students', { q: 'crochet & design' }), origin).q, 'crochet & design');
  }
  const passport = resolveForDestination(hrefFor({ pillar: 'learn', view: 'passport' }, 'students', { q: 'crochet' }), origin);
  assert.equal(passport.q, ''); assert.equal(passport.needsLogin, true);
});
test('P7 never forwards role, identity, membership or redirect parameters', () => {
  assert.equal(resolveForDestination('/me/apply/institute?from=for-institutes&role=admin&user_id=42&membership=owner&next=https://evil.example', origin).href, '/me/apply/institute?from=for-institutes');
  for (const href of ['https://evil.example/shop?from=for-startups', '//evil.example/shop?from=for-startups', '/admin?from=for-students', '/me/delete?from=for-students', '/shop?from=for-admin', 'javascript:alert(1)', '/shop']) assert.equal(resolveForDestination(href, origin), null, href);
});
test('P7 public browsing and protected actions use canonical routes', () => {
  for (const path of ['/learn/courses', '/learn/live', '/learn/community', '/works', '/shop', '/connect/communities']) assert.equal(resolveForDestination(`${path}?from=for-students`, origin).needsLogin, false);
  for (const path of ['/me/vendor', '/me/apply/startup', '/me/apply/institute', '/learn/teach', '/works/become', '/connect/create']) assert.equal(resolveForDestination(`${path}?from=for-startups`, origin).needsLogin, true);
});
test('P7 topic is bounded and URL-encoded without interpreting markup', () => {
  assert.equal(cleanTopic(' x\n\u0000y '), 'xy'); assert.equal(cleanTopic('x'.repeat(100)).length, 80);
  const href = hrefFor({ pillar: 'shop', view: 'catalogue' }, 'startups', { q: '<script>&#test' });
  assert.ok(!href.includes('<script>')); assert.equal(resolveForDestination(href, origin).q, '<script>&#test');
});

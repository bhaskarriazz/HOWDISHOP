// K5A Phase 1 — guest curated Home without a 401, visibility floor for every section, references only for visible records.
const L = require('./lib.cjs');
const { check, finish, pool } = L;

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish('k5a 01 guest curated visibility');

  const asha = await L.member('Asha Clay', { username: 'asha_clay', creator: true });
  const bina = await L.member('Bina Weaves', { username: 'bina_weaves' });
  const priv = await L.member('Priya Private', { username: 'priya_private', privateProfile: true, creator: true });
  const hidden = await L.member('Hari Hidden', { username: 'hari_hidden', discoverable: false, creator: true });
  const susp = await L.member('Suri Suspended', { username: 'suri_suspended', accountStatus: 'SUSPENDED', creator: true });
  const gone = await L.member('Dora Deleted', { username: 'dora_deleted', accountStatus: 'DELETED', isActive: false, creator: true });
  const numeric = await L.member('Numeric Handle', { username: '4455667', creator: true });
  const noname = await L.member('No Username');

  const pPublic = await L.post(asha, 'GUEST-PUBLIC clay bowl firing day');
  const aPublic = await L.post(asha, 'Glaze long read body', { type: 'ARTICLE', title: 'GUEST-ARTICLE glazing guide', excerpt: 'All about glaze' });
  const hiddenPosts = {
    draft: await L.post(asha, 'HIDE-DRAFT', { status: 'DRAFT' }),
    futureScheduled: await L.post(asha, 'HIDE-FUTURE', { status: 'SCHEDULED', scheduledFor: new Date(Date.now() + 864e5).toISOString() }),
    followers: await L.post(asha, 'HIDE-FOLLOWERS', { audience: 'FOLLOWERS' }),
    closeFriends: await L.post(asha, 'HIDE-CLOSE', { audience: 'CLOSE_FRIENDS' }),
    subs: await L.post(asha, 'HIDE-SUBS', { subscribersOnly: true }),
    subsLegacy: await L.post(asha, 'HIDE-SUBS-LEGACY', { subscriberOnly: true }),
    privAuthor: await L.post(priv, 'HIDE-PRIVATE-AUTHOR'),
    hiddenAuthor: await L.post(hidden, 'HIDE-NONDISCOVERABLE-AUTHOR'),
    suspAuthor: await L.post(susp, 'HIDE-SUSPENDED-AUTHOR'),
    goneAuthor: await L.post(gone, 'HIDE-DELETED-AUTHOR'),
    numericAuthor: await L.post(numeric, 'HIDE-NUMERIC-HANDLE'),
    nonameAuthor: await L.post(noname, 'HIDE-NO-USERNAME'),
    draftArticle: await L.post(asha, 'x', { type: 'ARTICLE', status: 'DRAFT', title: 'HIDE-DRAFT-ARTICLE' }),
  };
  const sPublic = await L.story(asha, 'GUEST-STORY');
  const hiddenStories = { friends: await L.story(asha, 'HIDE-FRIENDS-STORY', { audience: 'Friends' }), close: await L.story(asha, 'HIDE-CLOSE-STORY', { audience: 'Close friends' }),
    expired: await L.story(asha, 'HIDE-EXPIRED', { expired: true }), priv: await L.story(priv, 'HIDE-PRIV-STORY'), susp: await L.story(susp, 'HIDE-SUSP-STORY') };

  const vA = await L.vendor(asha);
  const prOk = await L.product(vA, 'GUEST-PRODUCT mug');
  const vPaused = await L.vendor(bina, { status: 'suspended', business: 'Paused' });
  const vSusp = await L.vendor(susp, { business: 'Suspended owner' });
  const hiddenProducts = { draft: await L.product(vA, 'HIDE-P-DRAFT', { status: 'draft' }), archived: await L.product(vA, 'HIDE-P-ARCH', { archived: true }),
    future: await L.product(vA, 'HIDE-P-FUTURE', { future: true }), rejected: await L.product(vA, 'HIDE-P-REJECTED', { moderation: 'REJECTED' }),
    noStock: await L.product(vA, 'HIDE-P-NOSTOCK', { stock: 0 }), paused: await L.product(vPaused, 'HIDE-P-PAUSED'), suspOwner: await L.product(vSusp, 'HIDE-P-SUSP') };
  const wOk = await L.worker(await L.member('Ravi Worker'), { code: 'HOWDI-WRK-K5A00001' });
  const wPending = await L.worker(await L.member('Kiran Pending'), { code: 'HOWDI-WRK-K5A00002', kyc: 'pending' });
  const wHiddenSvc = await L.worker(await L.member('Hema Hidden'), { code: 'HOWDI-WRK-K5A00003', visibleService: false });
  const cOk = await L.course('GUEST-COURSE intro to clay');
  const hiddenCourses = { draft: await L.course('HIDE-C-DRAFT', { publish: 'DRAFT' }), review: await L.course('HIDE-C-REVIEW', { publish: 'REVIEW' }), inactive: await L.course('HIDE-C-INACTIVE', { active: false }) };
  await L.community(asha, 'GUEST-GROUP clay circle', 'clay-circle');
  await L.community(asha, 'HIDE-PRIVATE-GROUP', 'secret-circle', { privacy: 'PRIVATE' });
  await L.community(susp, 'HIDE-SUSP-OWNER-GROUP', 'susp-circle');
  await L.special('GUEST-SPECIAL festival week', '/shop/catalogue');
  await L.hero('GUEST-HERO kiln day', 'javascript:alert(1)');
  await L.quote('Every stitch carries a memory.', 'HOWDI');

  // ---------------- guest manifest: no 401, curated, personal sections hidden
  const m = await L.home();
  check('guest GET /api/connect/home → 200 (no 401)', m.status === 200 && m.json?.status === 'success', m.text.slice(0, 200));
  check('guest manifest: viewer=guest, home_variant=curated', m.json?.viewer === 'guest' && m.json?.home_variant === 'curated', m.json);
  check('manifest lists all 16 frozen sections in order', JSON.stringify(m.json?.order) === JSON.stringify(L.ALL.split(',')) && JSON.stringify(Object.keys(m.json?.sections || {})) === JSON.stringify(L.ALL.split(',')), m.json?.order);
  check('above-fold sections are loaded, the rest deferred', ['special', 'hero', 'stories', 'forYou', 'vibes'].every((k) => ['ready', 'empty'].includes(m.json.sections[k].state))
    && ['recommendedCreators', 'communities', 'dailyQuote'].every((k) => m.json.sections[k].state === 'deferred'), Object.fromEntries(Object.entries(m.json?.sections || {}).map(([k, v]) => [k, v.state])));
  check('guest personal sections are hidden (Continue Watching, Recent Activity, Continue Journey)', ['continueWatching', 'recentActivity', 'continueYourJourney'].every((k) => m.json.sections[k].state === 'hidden' && !('items' in m.json.sections[k])), m.json?.sections?.recentActivity);

  const all = await L.homeAll();
  const S = all.json?.sections || {};
  const txt = all.text;
  check('all-section guest request succeeds', all.status === 200 && Object.values(S).every((s) => s.state !== 'error'), Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.state])));
  check('guests still never receive personal sections even when requested', ['continueWatching', 'recentActivity', 'continueYourJourney'].every((k) => S[k].state === 'hidden'), '');
  const feedTexts = (S.forYou?.items || []).map((i) => i.content.text_excerpt + ' ' + (i.content.title || ''));
  check('For You shows the public post and the public article', feedTexts.some((t) => t.includes('GUEST-PUBLIC')) && feedTexts.some((t) => t.includes('GUEST-ARTICLE')), feedTexts);
  check('For You excludes every hidden post variant', !/HIDE-/.test(JSON.stringify(S.forYou)) && !/HIDE-/.test(JSON.stringify(S.hero)) && !/HIDE-/.test(JSON.stringify(S.trendingArticles)), feedTexts);
  check('trending articles contain only the public article', (S.trendingArticles?.items || []).length === 1 && S.trendingArticles.items[0].content.title.includes('GUEST-ARTICLE'), S.trendingArticles);
  check('stories: only the public, unexpired story of a public author', (S.stories?.items || []).length === 1 && S.stories.items[0].author.public_username === 'asha_clay' && S.stories.items[0].viewed === false, S.stories);
  const people = [...(S.recommendedCreators?.items || []), ...(S.suggestedPeople?.items || [])].map((p) => p.public_username);
  check('creators/people exclude private, non-discoverable, suspended, deleted, numeric-handle and nameless members', people.includes('asha_clay') && !people.some((u) => ['priya_private', 'hari_hidden', 'suri_suspended', 'dora_deleted', '4455667'].includes(u)), people);
  check('shop: only the published, in-stock product of an active vendor', (S.shopRecommendations?.items || []).length === 1 && S.shopRecommendations.items[0].title.includes('GUEST-PRODUCT'), (S.shopRecommendations?.items || []).map((x) => x.title));
  check('works: only the verified worker with a visible service, by public worker code', (S.worksRecommendations?.items || []).map((w) => w.public_key).join() === 'HOWDI-WRK-K5A00001', S.worksRecommendations);
  check('works card shows coarse area only (no pincode/phone)', S.worksRecommendations?.items?.[0]?.service_area === 'Warangal' && !txt.includes('506002'), S.worksRecommendations?.items?.[0]);
  check('learn: only published active courses', (S.learnRecommendations?.items || []).some((c) => c.title.includes('GUEST-COURSE')) && !/HIDE-C-/.test(JSON.stringify(S.learnRecommendations)), (S.learnRecommendations?.items || []).map((c) => c.title));
  check('communities: public group only, private group and suspended owner excluded', (S.communities?.items || []).map((c) => c.public_key).join() === 'clay-circle' && S.communities.items[0].route === '/groups/clay-circle', S.communities);
  const quotes = (await pool.query(`SELECT quote_text FROM howdi_connect_daily_quotes`)).rows.map((r) => r.quote_text);
  check('daily quote renders an admin quote with attribution', quotes.includes(S.dailyQuote?.item?.text) && typeof S.dailyQuote.item.attribution === 'string' && !('id' in S.dailyQuote.item), S.dailyQuote);
  check('Special CTA keeps an allow-listed in-app route', JSON.stringify(S.special?.item?.cta) === JSON.stringify({ label: 'Explore', route: '/shop/catalogue', external: false }), S.special);
  check('Hero CTA with javascript: is dropped', S.hero?.source === 'admin' && S.hero.item.cta === null && !txt.includes('javascript:'), S.hero);

  // ---------------- public references: distinct prefixes, issued only for visible records
  const codes = L.codesIn(all.json);
  check('public codes use distinct prefixes PST/ART/STY/PRD/CRS', ['PST', 'ART', 'STY', 'PRD', 'CRS'].every((p) => codes.some((c) => c.startsWith(p + '-'))), codes);
  const byType = Object.fromEntries((S.forYou.items || []).map((i) => [i.type, i]));
  check('post and article routes use their own prefixes', /^\/posts\/PST-[0-9A-F]{12}$/.test(byType.post?.route || '') && /^\/articles\/ART-[0-9A-F]{12}$/.test(byType.article?.route || ''), byType);
  check('story, product, course routes', /^\/stories\/STY-/.test(S.stories.items[0].route) && /^\/shop\/products\/PRD-/.test(S.shopRecommendations.items[0].route)
    && S.learnRecommendations.items.every((c) => /^\/learn\/courses\/CRS-/.test(c.route)), '');
  check('Shop/Works/Learn cards carry a safe pillar landing for Phase 1', S.shopRecommendations.items[0].landing?.area === 'shop' && S.worksRecommendations.items[0].landing?.area === 'works' && S.learnRecommendations.items[0].landing?.area === 'learn', '');
  const refCount = async (type, ids) => Number((await pool.query(`SELECT COUNT(*) FROM howdi_public_refs WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, ids.map((x) => String(x.id))])).rows[0].count);
  check('no reference was ever issued for a hidden post/article', (await refCount('POST', Object.values(hiddenPosts))) === 0 && (await refCount('ARTICLE', Object.values(hiddenPosts))) === 0, '');
  check('no reference was ever issued for a hidden story', (await refCount('STORY', Object.values(hiddenStories))) === 0, '');
  check('no reference was ever issued for a hidden product', (await refCount('PRODUCT', Object.values(hiddenProducts))) === 0, '');
  check('no reference was ever issued for a hidden course', (await refCount('COURSE', Object.values(hiddenCourses))) === 0, '');
  check('visible records got exactly one stable reference each', (await L.refFor('POST', pPublic.id)) === byType.post.public_key && (await L.refFor('ARTICLE', aPublic.id)) === byType.article.public_key
    && (await L.refFor('STORY', sPublic.id)) === S.stories.items[0].public_key && (await L.refFor('PRODUCT', prOk.id)) === S.shopRecommendations.items[0].public_key, '');
  const again = await L.homeAll();
  check('references are stable across requests', JSON.stringify(L.codesIn(again.json).sort()) === JSON.stringify(codes.sort()), '');

  // ---------------- by-code reads: visible opens; hidden / unknown / malformed are the same 404
  const pr = await L.api('GET', '/api/connect/posts/by-code/' + byType.post.public_key);
  check('post opens by its public code', pr.status === 200 && pr.json.item.public_key === byType.post.public_key && pr.json.item.content.text.includes('GUEST-PUBLIC'), pr.text.slice(0, 300));
  const ar = await L.api('GET', '/api/connect/posts/by-code/' + byType.article.public_key);
  check('article opens by its public code', ar.status === 200 && ar.json.item.type === 'article', ar.text.slice(0, 200));
  const sr = await L.api('GET', '/api/connect/stories/by-code/' + S.stories.items[0].public_key);
  check('story opens by its public code', sr.status === 200 && sr.json.item.text === 'GUEST-STORY', sr.text.slice(0, 200));
  const nf = [await L.api('GET', '/api/connect/posts/by-code/PST-000000000000'), await L.api('GET', '/api/connect/posts/by-code/' + String(pPublic.id)), await L.api('GET', '/api/connect/stories/by-code/' + byType.post.public_key), await L.api('GET', '/api/connect/posts/by-code/' + S.stories.items[0].public_key)];
  check('unknown, numeric-id, and wrong-kind codes → identical 404', nf.every((r) => r.status === 404 && r.text === nf[0].text), nf.map((r) => r.status + ' ' + r.text));
  await pool.query(`UPDATE howdi_community_posts SET post_status='DRAFT' WHERE id=$1`, [pPublic.id]);
  const nowHidden = await L.api('GET', '/api/connect/posts/by-code/' + byType.post.public_key);
  check('a record hidden after its reference was issued answers exactly like a missing one', nowHidden.status === 404 && nowHidden.text === nf[0].text, nowHidden.text);
  const afterHide = await L.homeAll();
  check('…and disappears from Home', !JSON.stringify(afterHide.json).includes(byType.post.public_key), '');

  // ---------------- guest suitability: no cookies/identity echoed, private caching
  const raw = await fetch(L.base() + '/api/connect/home');
  check('Home responses are private, no-store and nosniff', raw.headers.get('cache-control') === 'private, no-store' && raw.headers.get('x-content-type-options') === 'nosniff', Object.fromEntries(raw.headers));

  check('no uncaught server error occurred', !/UnhandledPromiseRejection|uncaughtException|\[K5A home\] (section|request)/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish('k5a 01 guest curated visibility');
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish('k5a 01 guest curated visibility'); });

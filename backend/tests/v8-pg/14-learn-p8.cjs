// V8 P8 Learn: Discovery (filters/search/sort/paging/saved) + learner journey (next step, project journey, materials checklist,
// Show My Work + teacher feedback/retry, private evidence) + Ready to Sell (Shop draft only) on a real PostgreSQL + real server.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 14 learn p8 (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|uuid|course_id|lesson_id|module_id|media_file)"\s*:/;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const T = await K.member('Tara Teacher', { username: 'tara_p8' }); const L = await K.member('Lina Learner', { username: 'lina_p8' });
  const X = await K.member('Xavi Outsider', { username: 'xavi_p8' }); const V = await K.member('Vani Vendor', { username: 'vani_p8' });
  const P = await K.member('Pia Private', { username: 'pia_p8', privateProfile: true });
  const roleId = (await pool.query(`SELECT id FROM roles WHERE code='TEACHER'`)).rows[0].id;
  for (const t of [T, P]) await pool.query(`INSERT INTO user_roles(user_id,role_id,role_status) VALUES($1,$2,'ACTIVE')`, [t.id, roleId]);
  const v = await K.vendor(V, { business: 'Vani Crafts' }); await pool.query(`UPDATE vendor_profiles SET kyc_status='verified', store_status='online' WHERE id=$1`, [v.id]);

  const mk = async (who, body) => (await api('POST', '/api/v8/learn/teach/courses', { token: who.token, body: { level: 'beginner', price: 0, lessons: [{ title: 'Welcome', body: 'Hello', minutes: 20 }, { title: 'Practice', body: 'Do it', minutes: 20, practice: 'Make a coaster' }], publish: true, ...body } })).json.course?.public_key;
  const A = await mk(T, { title: 'P8 Daisy Coaster', category: 'Crochet & Handmade', language: 'Telugu', outcomes: ['Make a daisy coaster'], materials: ['Cotton yarn', '4 mm hook'], materials_cost: 250 });
  const B = await mk(T, { title: 'P8 Pricing Basics', category: 'Business & Selling', language: 'English', price: 600 });
  const Cc = await mk(T, { title: 'P8 Quick Hem', category: 'Tailoring & Textiles', language: 'Hindi', level: 'advanced' });
  const D = await mk(P, { title: 'P8 Secret Teacher Course', category: 'Cooking', language: 'English' });
  await api('POST', '/api/v8/learn/teach/courses', { token: T.token, body: { title: 'P8 Hidden Draft', category: 'Cooking', level: 'beginner', price: 0, lessons: [{ title: 'x', body: 'y', minutes: 5 }], publish: false } });
  for (let i = 0; i < 14; i++) await mk(T, { title: `P8 Filler ${String(i).padStart(2, '0')}`, category: 'Wellness', language: 'English' });
  check('courses created', [A, B, Cc, D].every((x) => /^CRS-/.test(x || '')));

  // ---- Discovery
  const list = async (qs, who) => api('GET', `/api/v8/learn/courses?${qs}`, who ? { token: who.token } : {});
  let r = await list('limit=12');
  check('paging: total beyond first page, has_more + next_offset', r.json.total === 18 && r.json.items.length === 12 && r.json.has_more === true && r.json.next_offset === 12, { total: r.json.total, n: r.json.items?.length });
  r = await list('limit=12&offset=12'); check('paging: second page is the rest', r.json.items.length === 6 && r.json.has_more === false);
  check('draft never listed', !(await list('q=Hidden%20Draft')).json.total);
  check('card has no internal ids', !FORBIDDEN.test((await list('limit=48')).text));
  r = await list('lang=Telugu&level=beginner'); check('language + level filter', r.json.total === 1 && r.json.items[0].title === 'P8 Daisy Coaster');
  r = await list('price=500to2000'); check('price band filter', r.json.items.map((x) => x.title).join() === 'P8 Pricing Basics');
  r = await list('goal=sell'); check('goal=sell maps to the selling skill', r.json.items.map((x) => x.title).join() === 'P8 Pricing Basics');
  r = await list('materials=list'); check('materials filter', r.json.items.map((x) => x.title).join() === 'P8 Daisy Coaster');
  r = await list('level=advanced&lang=Klingon'); check('unknown language dropped, valid filter kept', r.json.total === 1 && !r.json.applied.lang);
  r = await list('q=tara_p8'); check('search by teacher @handle (her 17 published courses)', r.json.total === 17, r.json.total);
  r = await list('q=Pia%20Private'); check('private teacher real name is not searchable', r.json.total === 0);
  r = await list('q=pia_p8'); check('…but the public @handle is', r.json.total === 1 && r.json.items[0].title === 'P8 Secret Teacher Course');
  r = await list('q=coaster'); check('search by project/outcome text', r.json.items.some((x) => x.title === 'P8 Daisy Coaster'));
  r = await list('sort=price_high&limit=1'); check('sort by price', r.json.items[0].title === 'P8 Pricing Basics');
  r = await list('q=%25'); check('LIKE wildcard is literal', r.json.total === 0);
  const card = (await list('q=Daisy')).json.items[0];
  check('card: real metadata (outcome, materials cost separately, preview lesson, formats)', card.outcome === 'Make a daisy coaster' && card.materials_count === 2 && card.materials_cost === 250 && /^LSN-/.test(card.preview_lesson) && card.formats.includes('reading') && card.free === true);
  check('no popularity labels in the API', !/bestseller|popular|trending/i.test((await list('limit=48')).text));

  // ---- Save (private)
  check('save needs sign-in', (await api('POST', `/api/v8/learn/courses/${A}/save`, { body: { saved: true } })).status === 401);
  await api('POST', `/api/v8/learn/courses/${A}/save`, { token: L.token, body: { saved: true } });
  check('saved shows for the saver only', (await list('q=Daisy', L)).json.items[0].saved === true && (await list('q=Daisy', X)).json.items[0].saved === false && (await list('q=Daisy')).json.items[0].saved === false);
  check('My learning lists saved courses', ((await api('GET', '/api/v8/learn/me', { token: L.token })).json.saved || []).some((x) => x.public_key === A));

  // ---- Journey: next step + materials + lessons
  check('next step: empty before joining', (await api('GET', '/api/v8/learn/next-step', { token: L.token })).json.focus === null);
  await api('POST', `/api/v8/learn/courses/${A}/enroll`, { token: L.token, body: { idem_key: 'p8-a' } });
  r = await api('GET', '/api/v8/learn/next-step', { token: L.token });
  check('next step after joining: materials first (course lists materials)', r.json.focus?.step?.kind === 'materials' && r.json.focus.course.public_key === A && !FORBIDDEN.test(r.text), r.json.focus?.step);
  r = await api('PUT', `/api/v8/learn/courses/${A}/materials`, { token: L.token, body: { owned: ['Cotton yarn', '4 mm hook', 'Diamonds'] } });
  check('materials: only course items stored; ready', r.json.ready === true && r.json.items.length === 2 && r.json.estimate === 250);
  check('materials: other learners have their own list', (await api('GET', `/api/v8/learn/courses/${A}/materials`, { token: X.token })).json.items.every((i) => !i.owned));
  r = await api('GET', '/api/v8/learn/next-step', { token: L.token }); check('next step moves to the first lesson', r.json.focus?.step?.kind === 'lesson' && /^LSN-/.test(r.json.focus.step.lesson));
  const lessons = (await api('GET', `/api/v8/learn/courses/${A}`, { token: L.token })).json.course.modules.flatMap((m) => m.lessons.map((l) => l.public_key));
  for (const l of lessons) await api('POST', `/api/v8/learn/lessons/${l}/complete`, { token: L.token });
  r = await api('GET', '/api/v8/learn/next-step', { token: L.token }); check('after lessons: share your work', r.json.focus?.step?.kind === 'share');
  check('journey needs enrolment', (await api('GET', `/api/v8/learn/courses/${A}/journey`, { token: X.token })).status === 403);

  // ---- Show My Work + review + retry
  check('share refused when not enrolled', (await api('POST', `/api/v8/learn/courses/${A}/work`, { token: X.token, body: { mediaData: PNG } })).status === 403);
  check('share refused for mismatched content', (await api('POST', `/api/v8/learn/courses/${A}/work`, { token: L.token, body: { mediaData: 'data:image/png;base64,' + Buffer.from('not a png').toString('base64') } })).status === 400);
  const w1 = (await api('POST', `/api/v8/learn/courses/${A}/work`, { token: L.token, body: { mediaData: PNG, note: 'first try' } })).json.item;
  check('share accepted as EVD code, waiting', /^EVD-/.test(w1?.public_key || '') && w1.status === 'submitted');
  check('only one pending share', (await api('POST', `/api/v8/learn/courses/${A}/work`, { token: L.token, body: { mediaData: PNG } })).json.code === 'AWAITING_REVIEW');
  check('teacher notified', ((await api('GET', '/api/v8/notifications', { token: T.token })).json.items || []).some((n) => /shared work/.test(n.title)));
  const media = async (who, code) => api('GET', `/api/v8/learn/work/${code}/media`, who ? { token: who.token } : {});
  check('media: guest refused', (await media(null, w1.public_key)).status === 401);
  check('media: outsider sees not found', (await media(X, w1.public_key)).status === 404);
  check('media: other teacher sees not found', (await media(P, w1.public_key)).status === 404);
  r = await media(L, w1.public_key); check('media: owner reads it privately', r.status === 200 && /^data:image\/png;base64,/.test(r.json.media?.data || ''));
  check('media: course teacher reads it', (await media(T, w1.public_key)).status === 200);
  check('review: other teacher cannot', (await api('POST', `/api/v8/learn/teach/work/${w1.public_key}/review`, { token: P.token, body: { decision: 'accept' } })).status === 404);
  check('review: revision needs feedback', (await api('POST', `/api/v8/learn/teach/work/${w1.public_key}/review`, { token: T.token, body: { decision: 'revise' } })).json.code === 'FEEDBACK_REQUIRED');
  await api('POST', `/api/v8/learn/teach/work/${w1.public_key}/review`, { token: T.token, body: { decision: 'revise', feedback: 'Tighter last round' } });
  r = await api('GET', '/api/v8/learn/next-step', { token: L.token }); check('learner is told to revise', r.json.focus?.step?.kind === 'revise');
  const w2 = (await api('POST', `/api/v8/learn/courses/${A}/work`, { token: L.token, body: { mediaData: PNG, note: 'second try' } })).json.item;
  check('retry allowed after revision', w2?.attempt === 2);
  await api('POST', `/api/v8/learn/teach/work/${w2.public_key}/review`, { token: T.token, body: { decision: 'accept', feedback: 'Great' } });
  check('double review refused', (await api('POST', `/api/v8/learn/teach/work/${w2.public_key}/review`, { token: T.token, body: { decision: 'revise', feedback: 'x' } })).status === 409);
  r = await api('GET', `/api/v8/learn/courses/${A}/journey`, { token: L.token });
  check('journey: accepted + certificate from verified records', r.json.milestones.find((m) => m.key === 'feedback').done && r.json.milestones.find((m) => m.key === 'certificate').done);
  check('no more shares after acceptance', (await api('POST', `/api/v8/learn/courses/${A}/work`, { token: L.token, body: { mediaData: PNG } })).json.code === 'ALREADY_ACCEPTED');
  check('learner notified of acceptance', ((await api('GET', '/api/v8/notifications', { token: L.token })).json.items || []).some((n) => /accepted/.test(n.title)));
  r = await api('GET', `/api/v8/learn/teach/courses/${A}/work`, { token: T.token });
  check('teacher list: @handles only', r.json.items.length === 2 && r.json.items.every((x) => x.learner?.public_username === 'lina_p8') && !FORBIDDEN.test(r.text));

  // ---- P8 correction 2: a project needs affirmative evidence (explicit TRUE or a real practice task), never a default/missing flag
  const plain = async (title, practice) => (await api('POST', '/api/v8/learn/teach/courses', { token: T.token, body: { title, category: 'Cooking', level: 'beginner', price: 0, publish: true,
    lessons: [{ title: 'Only lesson', body: 'Read this', minutes: 10, ...(practice ? { practice } : {}) }] } })).json.course?.public_key;
  const E = await plain('P8 NoProject Notes'); const F = await plain('P8 Practice Only', 'Cook one dosa');
  await pool.query(`UPDATE learning_courses SET project_required=FALSE WHERE title IN ('P8 NoProject Notes','P8 Practice Only')`);
  const cardOf = async (t) => (await list(`q=${encodeURIComponent(t)}`)).json.items.find((x) => x.title === t);
  check('no flag + no practice task → card is not project-positive', (await cardOf('P8 NoProject Notes'))?.project === false);
  check('practice task is affirmative project evidence', (await cardOf('P8 Practice Only'))?.project === true);
  r = await list('goal=project&limit=48'); const gp = r.json.items.map((x) => x.title);
  check('goal=project excludes the course without evidence, keeps the practice course', !gp.includes('P8 NoProject Notes') && gp.includes('P8 Practice Only'));
  await api('POST', `/api/v8/learn/courses/${E}/enroll`, { token: X.token, body: { idem_key: 'p8-e' } });
  r = await api('GET', `/api/v8/learn/courses/${E}/journey`, { token: X.token });
  check('journey without project evidence has no project milestones', r.status === 200 && !r.json.milestones.some((m) => ['shared', 'feedback'].includes(m.key)), r.json.milestones?.map((m) => m.key));
  check('Show My Work refused without project evidence', (await api('GET', `/api/v8/learn/courses/${E}/work`, { token: X.token })).json.code === 'NO_PROJECT');
  await api('POST', `/api/v8/learn/courses/${F}/enroll`, { token: X.token, body: { idem_key: 'p8-f' } });
  check('Show My Work available when a practice task exists', (await api('GET', `/api/v8/learn/courses/${F}/work`, { token: X.token })).status === 200);
  check('journey with practice evidence includes project milestones', (await api('GET', `/api/v8/learn/courses/${F}/journey`, { token: X.token })).json.milestones.some((m) => m.key === 'shared'));

  // ---- Ready to Sell: Shop decides; drafts only
  check('non-vendor cannot create a Shop listing', (await api('POST', '/api/v8/vendor/products', { token: L.token, body: { name: 'Daisy coaster', price: 520, mrp: 520, stock: 1 } })).json.code === 'NOT_A_VENDOR');
  r = await api('POST', '/api/v8/vendor/products', { token: V.token, body: { name: 'Daisy coaster', price: 520, mrp: 520, stock: 1, description: 'Made after finishing a HOWDI Learn course.' } });
  check('vendor: draft only', r.status === 201 && r.json.product.status === 'draft');
  check('draft is not in Shop', !((await api('GET', '/api/shop/catalogue/products?q=Daisy%20coaster')).json.products || []).length);
  finish(LABEL);
})().catch((e) => { console.error(e); check('suite completed', false, e.message); finish(LABEL); });

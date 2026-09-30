// V8 Slice 1 — creator memberships (HPay sandbox), members-only lock, creator workspace, earnings + admin payouts,
// creator safety (held comments), mentions, Hype / Tips, drafts, scheduling, Ask HOWDI. Real PostgreSQL.
const L = require('../worker-pg/lib.cjs');
const { pool, check, finish, api } = L;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 03 creator (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const ADMIN = { 'x-howdi-admin-token': 'v8-test-admin-token-0123456789abcdef' };
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|uuid|plan_id|subscription_id)"\s*:/;
const noKeys = (label, r) => check(`${label}: no internal id keys`, !FORBIDDEN.test(r.text || ''), (r.text.match(FORBIDDEN) || [])[0]);
const key = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

async function member(name, handle) {
  const u = await L.mkUser(name);
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode) VALUES($1,$2,TRUE,FALSE,FALSE) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`, [u.id, handle]);
  return { ...u, handle };
}
const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);

(async () => {
  const started = await L.start(); check('server starts', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const C = await member('Cara Creator', 'cara_creator'); const S = await member('Sam Subscriber', 'sam_sub'); const O = await member('Omi Outsider', 'omi_out'); const Z = await member('Zed Private', 'zed_private');

  // ---- tiers
  check('tier needs a benefit', (await api('POST', '/api/v8/creator/tiers', { token: C.token, body: { name: 'Circle', monthly: 149 } })).status === 400);
  check('tier price bounds', (await api('POST', '/api/v8/creator/tiers', { token: C.token, body: { name: 'Circle', monthly: 5, benefits: ['x'] } })).status === 400);
  const t = await api('POST', '/api/v8/creator/tiers', { token: C.token, body: { name: 'Crochet Circle', monthly: 149, yearly: 1499, benefits: ['Patterns', 'Live workshops'], creatorId: S.id } });
  check('creator creates a tier (session user, creatorId ignored)', t.status === 201 && /^TIR-[0-9A-F]{12}$/.test(t.json.tier?.key || ''), t.text.slice(0, 200));
  noKeys('tier', t);
  const TK = t.json.tier.key;
  check('guest sees public tiers', (await api('GET', '/api/v8/creators/@cara_creator/memberships')).json.tiers?.[0]?.key === TK);
  check('guest cannot subscribe', (await api('POST', `/api/v8/memberships/${TK}/subscribe`, { body: { consent: true, idempotency_key: key() } })).status === 401);
  check('creator cannot join own tier', (await api('POST', `/api/v8/memberships/${TK}/quote`, { token: C.token })).status === 400);
  const q = await api('POST', `/api/v8/memberships/${TK}/quote`, { token: S.token, body: { cycle: 'yearly' } });
  check('quote shows yearly price + consent lines, charges nothing', q.status === 200 && q.json.amount === 1499 && q.json.consent.length === 3, q.text.slice(0, 200));

  // ---- members-only content: locked teaser for non-members
  const mo = await api('POST', '/api/v8/posts', { token: C.token, body: { text: 'SECRET PATTERN ROWS 1-40', members_only: true, teaser: 'Full chevron pattern', media: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='] } });
  check('creator posts members-only content', mo.status === 201 && mo.json.post?.members_only === true, mo.text.slice(0, 200));
  const PK = mo.json.post.public_key;
  const asO = await api('GET', `/api/v8/posts/${PK}`, { token: O.token });
  check('non-member sees a locked teaser only', asO.json.post?.locked === true && asO.json.post.text === '' && asO.json.post.media.length === 0 && asO.json.post.teaser === 'Full chevron pattern', asO.text.slice(0, 300));
  check('locked post never leaks the body', !asO.text.includes('SECRET PATTERN'));
  check('guest sees locked teaser too', (await api('GET', `/api/v8/posts/${PK}`)).json.post?.locked === true);
  check('non-member cannot read comments', (await api('GET', `/api/v8/posts/${PK}/comments`, { token: O.token })).status === 403);
  check('non-member cannot comment', (await api('POST', `/api/v8/posts/${PK}/comments`, { token: O.token, body: { text: 'hi' } })).status === 403);
  check('members-only needs a tier', (await api('POST', '/api/v8/posts', { token: O.token, body: { text: 'x', members_only: true } })).status === 400);

  // ---- subscribe
  if (!SANDBOX) {
    const r = await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: S.token, body: { consent: true, idempotency_key: key() } });
    check('without the Preview/Test sandbox: 503, nothing activated', r.status === 503 && r.json.code === 'PAYMENT_PROVIDER_REQUIRED', r.text);
    check('still locked after refused payment', (await api('GET', `/api/v8/posts/${PK}`, { token: S.token })).json.post?.locked === true);
  } else {
    check('consent is required', (await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: S.token, body: { idempotency_key: key() } })).json.code === 'CONSENT_REQUIRED');
    check('idempotency key is required', (await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: S.token, body: { consent: true } })).status === 400);
    await pool.query(`INSERT INTO howdi_v8_wallets(user_id,balance,sandbox) VALUES($1,50,TRUE) ON CONFLICT(user_id) DO UPDATE SET balance=50`, [O.id]);
    const poor = await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: O.token, body: { consent: true, idempotency_key: key() } });
    check('insufficient HPay balance → 402, nothing charged', poor.status === 402 && Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [O.id])).rows[0].balance) === 50, poor.text);
    const k1 = key();
    const sub = await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: S.token, body: { consent: true, idempotency_key: k1, cycle: 'monthly', userId: O.id } });
    check('subscribe charges HPay sandbox and activates', sub.status === 201 && sub.json.membership?.state === 'active' && /^HPY-/.test(sub.json.receipt?.reference || ''), sub.text.slice(0, 300));
    noKeys('subscribe', sub);
    const bal = Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [S.id])).rows[0].balance);
    check('exactly ₹149 debited (2000 → 1851)', bal === 1851, bal);
    const again = await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: S.token, body: { consent: true, idempotency_key: k1 } });
    check('same key replays the receipt, no double charge', again.json.replayed === true && Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [S.id])).rows[0].balance) === 1851);
    check('second membership with a new key → 409', (await api('POST', `/api/v8/memberships/${TK}/subscribe`, { token: S.token, body: { consent: true, idempotency_key: key() } })).status === 409);
    const unlocked = await api('GET', `/api/v8/posts/${PK}`, { token: S.token });
    check('member sees the full post', unlocked.json.post?.locked === false && unlocked.json.post.text.includes('SECRET PATTERN'), unlocked.text.slice(0, 200));
    check('creator notified of new member', (await notes(C)).some((n) => n.title.includes('@sam_sub joined')));
    const ws = await api('GET', '/api/v8/creator/workspace', { token: C.token });
    check('workspace shows 1 member and ₹134.10 ready to settle', ws.json.stats?.members === 1 && ws.json.stats.ready_to_settle === 134.1, JSON.stringify(ws.json.stats));
    noKeys('workspace', ws);
    const subs = await api('GET', '/api/v8/creator/subscribers', { token: C.token });
    check('subscriber list shows @handle only', subs.json.items?.[0]?.member?.public_username === 'sam_sub' && !subs.text.includes(S.email || '@@') && !subs.text.includes(String(S.phone || '@@')), subs.text.slice(0, 200));
    check('subscriber list is creator-scoped', ((await api('GET', '/api/v8/creator/subscribers', { token: O.token })).json.items || []).length === 0);
    // manage
    const mine = await api('GET', '/api/v8/me/memberships', { token: S.token }); const SK = mine.json.items?.[0]?.key;
    check('my memberships lists it', /^SUB-[0-9A-F]{12}$/.test(SK || ''), mine.text.slice(0, 200));
    check('another user cannot cancel it', (await api('POST', `/api/v8/subscriptions/${SK}/cancel`, { token: O.token })).status === 404);
    const can = await api('POST', `/api/v8/subscriptions/${SK}/cancel`, { token: S.token });
    check('cancel → access until period end', can.json.membership?.state === 'cancelling', can.text.slice(0, 200));
    check('still unlocked while cancelling', (await api('GET', `/api/v8/posts/${PK}`, { token: S.token })).json.post?.locked === false);
    check('creator notified of cancellation', (await notes(C)).some((n) => n.title.includes('cancelled')));
    check('resume', (await api('POST', `/api/v8/subscriptions/${SK}/resume`, { token: S.token })).json.membership?.state === 'active');
    // renewal failure → PAST_DUE → retry
    await pool.query(`UPDATE howdi_connect_subscriptions SET current_period_end=NOW()-interval '1 minute' WHERE subscriber_user_id=$1`, [S.id]);
    await pool.query(`UPDATE howdi_v8_wallets SET balance=10 WHERE user_id=$1`, [S.id]);
    const pd = await api('GET', '/api/v8/me/memberships', { token: S.token });
    check('failed renewal → payment_failed, access paused', pd.json.items?.[0]?.state === 'payment_failed' && (await api('GET', `/api/v8/posts/${PK}`, { token: S.token })).json.post?.locked === true, pd.text.slice(0, 200));
    check('subscriber told about failed payment', (await notes(S)).some((n) => n.title.includes('Renewal payment failed')));
    check('retry with no balance → 402', (await api('POST', `/api/v8/subscriptions/${SK}/retry`, { token: S.token })).status === 402);
    await pool.query(`UPDATE howdi_v8_wallets SET balance=500 WHERE user_id=$1`, [S.id]);
    check('retry succeeds and restores access', (await api('POST', `/api/v8/subscriptions/${SK}/retry`, { token: S.token })).json.membership?.state === 'active' && (await api('GET', `/api/v8/posts/${PK}`, { token: S.token })).json.post?.locked === false);
    // earnings + payouts
    const e = await api('GET', '/api/v8/creator/earnings', { token: C.token });
    check('earnings: two membership payments, ₹268.20 ready', e.json.summary?.ready_to_settle === 268.2 && e.json.ledger.filter((x) => x.type !== 'tip').length === 2, JSON.stringify(e.json.summary));
    noKeys('earnings', e);
    check('payout over balance refused', (await api('POST', '/api/v8/creator/payouts', { token: C.token, body: { amount: 999, idempotency_key: key() } })).json.code === 'OVER_BALANCE');
    const pk1 = key(); const po = await api('POST', '/api/v8/creator/payouts', { token: C.token, body: { idempotency_key: pk1 } });
    check('payout requested for the full amount', po.status === 201 && po.json.payout.amount === 268.2, po.text);
    check('payout request replays (no double payout)', (await api('POST', '/api/v8/creator/payouts', { token: C.token, body: { idempotency_key: pk1 } })).json.replayed === true && Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_creator_payouts WHERE creator_user_id=$1`, [C.id])).rows[0].n) === 1);
    check('nothing left to settle', (await api('GET', '/api/v8/creator/earnings', { token: C.token })).json.summary.ready_to_settle === 0);
    check('admin payouts need an admin session', (await api('GET', '/api/admin/v8/payouts', { token: C.token })).status === 401);
    const list = await api('GET', '/api/admin/v8/payouts', { headers: ADMIN }); const PY = list.json.items?.[0]?.key;
    check('admin sees the request', /^PAY-[0-9A-F]{12}$/.test(PY || '') && list.json.items[0].creator.public_username === 'cara_creator', list.text.slice(0, 200));
    noKeys('admin payouts', list);
    check('failing needs a reason', (await api('POST', `/api/admin/v8/payouts/${PY}/decide`, { headers: ADMIN, body: { decision: 'failed' } })).status === 400);
    const before = Number((await pool.query(`SELECT COALESCE(SUM(balance),0) b FROM howdi_v8_wallets WHERE user_id=$1`, [C.id])).rows[0].b);
    check('admin marks paid', (await api('POST', `/api/admin/v8/payouts/${PY}/decide`, { headers: ADMIN, body: { decision: 'paid' } })).json.decided === 'paid');
    const after = Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [C.id])).rows[0].balance);
    check('paid payout credited to creator HPay', Math.round((after - (before || 2000)) * 100) === 26820, [before, after]);
    check('decided twice → 409', (await api('POST', `/api/admin/v8/payouts/${PY}/decide`, { headers: ADMIN, body: { decision: 'paid' } })).status === 409);
    check('creator notified of payout', (await notes(C)).some((n) => n.title.includes('sent to HPay')));
    check('decision audited', Number((await pool.query(`SELECT COUNT(*) n FROM howdi_admin_security_audit WHERE action='V8_CREATOR_PAYOUT_PAID'`)).rows[0].n) >= 1);
  }
  // legacy route can no longer activate a paid tier without payment
  const legacyPlan = (await pool.query(`SELECT id FROM howdi_connect_subscription_plans WHERE creator_user_id=$1 LIMIT 1`, [C.id])).rows[0].id;
  const leg = await api('POST', `/api/connect/subscription-plans/${legacyPlan}/subscribe`, { token: O.token, body: { userId: O.id, billingCycle: 'MONTHLY' } });
  check('legacy subscribe to a paid plan → 402/401, no ACTIVE row', [401, 402, 404].includes(leg.status) && Number((await pool.query(`SELECT COUNT(*) n FROM howdi_connect_subscriptions WHERE subscriber_user_id=$1 AND status='ACTIVE'`, [O.id])).rows[0].n) === 0, leg.status + ' ' + leg.text.slice(0, 120));

  // ---- creator safety: held comments
  await api('PUT', '/api/v8/creator/safety', { token: C.token, body: { blocked_phrases: ['cheap copy'], muted_words: ['#spam'], mentions: 'following' } });
  const hp = await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'hype', hype_type: 'creator', text: 'Finished my daisy cushion! #crochet' } });
  check('hype published', hp.status === 201 && hp.json.post.kind === 'hype' && hp.json.post.tags.includes('crochet'), hp.text.slice(0, 200));
  const HK = hp.json.post.public_key;
  const bad = await api('POST', `/api/v8/posts/${HK}/comments`, { token: O.token, body: { text: 'looks like a CHEAP COPY' } });
  check('blocked phrase → comment held', bad.status === 201 && bad.json.held === true, bad.text.slice(0, 200));
  const vis = async (m) => ((await api('GET', `/api/v8/posts/${HK}/comments`, { token: m.token })).json.comments || []).some((c) => c.text.includes('CHEAP COPY'));
  check('held comment visible to its author', await vis(O));
  check('held comment visible to the creator', await vis(C));
  check('held comment hidden from everyone else', !(await vis(Z)));
  check('creator not notified for held comment', !(await notes(C)).some((n) => n.body && n.body.includes('CHEAP COPY')));
  const held = await api('GET', '/api/v8/creator/held-comments', { token: C.token });
  check('held queue lists it', held.json.items?.[0]?.matched === 'cheap copy' && held.json.items[0].author.public_username === 'omi_out', held.text.slice(0, 200));
  noKeys('held', held);
  check('another creator cannot approve', (await api('POST', `/api/v8/creator/held-comments/${held.json.items[0].key}/approve`, { token: Z.token })).status === 404);
  check('creator approves', (await api('POST', `/api/v8/creator/held-comments/${held.json.items[0].key}/approve`, { token: C.token })).json.decided === 'approve');
  check('approved comment visible to all', await vis(Z));
  // replies + mentions (Cara's mention setting = following: only people she follows can mention her)
  const cm = (await api('GET', `/api/v8/posts/${HK}/comments`, { token: Z.token })).json.comments[0];
  const rp = await api('POST', `/api/v8/posts/${HK}/comments`, { token: Z.token, body: { text: '@cara_creator @omi_out lovely', replyTo: cm.public_key } });
  check('reply threads under the parent', rp.json.comment?.reply_to === cm.public_key, rp.text.slice(0, 200));
  check('mention notifies Omi', (await notes(O)).some((n) => n.kind === 'MENTION'));
  check('mention setting "following" blocks strangers', !(await notes(C)).some((n) => n.kind === 'MENTION'));
  check('reply notifies the parent author', (await notes(O)).some((n) => n.kind === 'COMMENT_REPLY'));

  // ---- Tips + validation + related links resolved server-side
  check('tip needs a title', (await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'tip', text: 'x', category: 'crochet', steps: [{ text: 'a' }] } })).status === 400);
  check('tip needs steps', (await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'tip', title: 'Tip: joins', text: 'x', category: 'crochet' } })).status === 400);
  check('unknown related link refused', (await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'tip', title: 'Tip: joins', text: 'x', category: 'crochet', steps: [{ text: 'a' }], related: [{ kind: 'community', code: 'does-not-exist' }] } })).json.code === 'LINK_INVALID');
  check('hype needs a type', (await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'hype', text: 'x' } })).status === 400);
  const tip = await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'tip', title: 'Tip: Invisible join', text: 'Seamless rounds for hats and bags.', category: 'crochet', steps: [{ text: 'Do not pull tight.' }, { text: 'Thread the tail under both loops.' }], related: [{ kind: 'profile', code: 'sam_sub' }], idempotency_key: 'tipkey-12345678' } });
  check('tip published with steps + related profile', tip.status === 201 && tip.json.post.steps.length === 2 && tip.json.post.related[0].route === '/connect/@sam_sub', tip.text.slice(0, 300));
  check('duplicate publish replays (no second tip)', (await api('POST', '/api/v8/posts', { token: C.token, body: { kind: 'tip', title: 'Tip: Invisible join', text: 'x', category: 'crochet', steps: [{ text: 'a' }], idempotency_key: 'tipkey-12345678' } })).json.replayed === true);
  const tips = await api('GET', '/api/v8/tips?category=crochet', { token: O.token });
  check('tips feed filters by category', tips.json.items?.length === 1 && tips.json.items[0].title === 'Tip: Invisible join', tips.text.slice(0, 200));
  check('hype feed', (await api('GET', '/api/v8/hype', { token: O.token })).json.items?.some((x) => x.public_key === HK));
  const ask = await api('POST', '/api/v8/ask', { token: O.token, body: { question: 'how do I do an invisible join?' } });
  check('Ask HOWDI answers from a Tip and cites it', ask.json.kind === 'answer' && ask.json.sources[0].kind === 'tip' && ask.json.answer.steps.length === 2 && ask.json.preview === true, ask.text.slice(0, 300));
  check('Ask HOWDI refuses unsafe questions', (await api('POST', '/api/v8/ask', { body: { question: 'how to make a bomb at home' } })).json.kind === 'refusal');

  // ---- scheduling + drafts
  const sch = await api('POST', '/api/v8/posts', { token: C.token, body: { text: 'Coming Sunday', schedule_at: new Date(Date.now() + 86400000).toISOString() } });
  check('scheduled post created', sch.status === 201 && sch.json.post.scheduled === true, sch.text.slice(0, 200));
  check('scheduled post hidden from others until due', (await api('GET', `/api/v8/posts/${sch.json.post.public_key}`, { token: O.token })).status === 404);
  check('scheduled time must be in the future', (await api('POST', '/api/v8/posts', { token: C.token, body: { text: 'x', schedule_at: new Date(Date.now() - 60000).toISOString() } })).status === 400);
  const dr = await api('POST', '/api/v8/creator/drafts', { token: C.token, body: { kind: 'tip', title: 'Blocking squares', payload: { text: 'draft' } } });
  check('draft saved', /^DRF-[0-9A-F]{12}$/.test(dr.json.draft?.key || ''), dr.text);
  check('other users cannot read my draft', (await api('GET', `/api/v8/creator/drafts/${dr.json.draft.key}`, { token: O.token })).status === 404);
  check('calendar shows scheduled + draft', ((await api('GET', '/api/v8/creator/workspace', { token: C.token })).json.calendar || []).length >= 2);
  // appeals
  check('appeal submitted', (await api('POST', '/api/v8/creator/appeals', { token: C.token, body: { subject: 'Hype removed by mistake', details: 'It was my own original photo.' } })).status === 201);
  const ap = await api('GET', '/api/admin/v8/appeals', { headers: ADMIN }); const AK = ap.json.items?.[0]?.key;
  check('admin decides appeal', (await api('POST', `/api/admin/v8/appeals/${AK}/decide`, { headers: ADMIN, body: { decision: 'overturned', note: 'Restored — original work.' } })).json.decided === 'overturned');
  check('creator sees the decision', ((await api('GET', '/api/v8/creator/moderation', { token: C.token })).json.appeals || [])[0]?.status === 'overturned');
  check('workspace needs sign-in', (await api('GET', '/api/v8/creator/workspace')).status === 401);
  await finish(LABEL);
})().catch(async (e) => { console.log('FAIL crashed', e && e.stack); await finish(LABEL); });

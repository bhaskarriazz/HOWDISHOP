// V8 My HOWDI: profile, size profile shared with the seller at checkout, rewards (earn on delivery, seller-funded, reverse on
// return, redeem into HPay), review helpful + report → admin hide, family, addresses, account deletion, data export.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 13 my howdi (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const ADMIN = { 'x-howdi-admin-token': process.env.HOWDI_ADMIN_TOKEN || '' };
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|uuid|order_id|product_id|family_id|phone)"\s*:/;
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const B = await K.member('Nila Buyer', { username: 'nila_b' }); const S = await K.member('Guru Seller', { username: 'guru_s' }); const F = await K.member('Family One', { username: 'fam_one' }); const R = await K.member('Reporter', { username: 'rep_r' });
  const V = await K.vendor(S, { business: 'Guru Weaves' }); await pool.query(`UPDATE vendor_profiles SET kyc_status='verified', status='active', store_status='online' WHERE id=$1`, [V.id]);
  const P = await K.product(V, 'Silk kurta', { stock: 10 }); await pool.query(`UPDATE vendor_products SET price=5000, mrp=5500 WHERE id=$1`, [P.id]);
  const C = ((await api('GET', '/api/search?q=Silk%20kurta&types=product', { token: B.token })).json.results || [])[0]?.route?.split('/').pop();
  const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
  const bal = async (m) => (await api('GET', '/api/v8/hpay/history', { token: m.token })).json.balance;
  // profile
  check('name too short refused', (await api('PATCH', '/api/v8/me/profile', { token: B.token, body: { name: 'N' } })).json.code === 'NAME');
  const pf = await api('PATCH', '/api/v8/me/profile', { token: B.token, body: { name: 'Nila Rao', headline: 'Handloom lover', about: 'Khammam' } });
  check('profile updated, @handle only', pf.json.profile?.name === 'Nila Rao' && pf.json.profile.headline === 'Handloom lover' && pf.json.profile.me.public_username === 'nila_b' && !FORBIDDEN.test(pf.text), pf.text.slice(0, 200));
  // size
  check('size needs consent', (await api('PUT', '/api/v8/me/size', { token: B.token, body: { chest_cm: 90 } })).json.code === 'CONSENT');
  check('size range checked', (await api('PUT', '/api/v8/me/size', { token: B.token, body: { chest_cm: 900, consent: true } })).json.code === 'SIZE_RANGE');
  const sz = await api('PUT', '/api/v8/me/size', { token: B.token, body: { height_cm: 162, width_cm: 38, length_cm: 104, chest_cm: 88, hand_cm: 56, waist_cm: 74, fit: 'regular', consent: true } });
  check('size saved', sz.json.size?.chest_cm === 88 && sz.json.size.hand_cm === 56, sz.text.slice(0, 200));
  // seller funds rewards
  check('only sellers set funding', (await api('PUT', '/api/v8/me/rewards/seller-setting', { token: B.token, body: { funded_by: 'seller' } })).json.code === 'NOT_A_VENDOR');
  check('seller chooses seller-funded', (await api('PUT', '/api/v8/me/rewards/seller-setting', { token: S.token, body: { funded_by: 'seller' } })).json.funded_by === 'seller');
  // order with size shared
  if (SANDBOX) { await api('POST', '/api/v8/hpay/pin', { token: B.token, body: { pin: '4826' } }); await bal(B); await bal(S); await pool.query(`UPDATE howdi_v8_wallets SET balance=20000 WHERE user_id=$1`, [B.id]); }
  await api('POST', '/api/v8/shop/cart', { token: B.token, body: { product: C, qty: 2 } });
  const ad = await api('POST', '/api/v8/shop/addresses', { token: B.token, body: { name: 'Nila', phone: '9876500002', line1: '4-5 Temple St', city: 'Khammam', state: 'Telangana', pin_code: '507001' } });
  const co = await api('POST', '/api/v8/shop/checkout', { token: B.token, body: { address: ad.json.saved.key, method: SANDBOX ? 'hpay' : 'cod', pin: '4826', share_size: true, idempotency_key: 'mh' + Date.now() } });
  const O = co.json.orders?.[0]?.public_key; check('order placed', /^ORD-/.test(O || ''), co.text.slice(0, 200));
  check('deletion blocked while an order is on the way', (await api('GET', '/api/v8/me/deletion', { token: B.token })).json.blockers?.length === 1 && (await api('POST', '/api/v8/me/deletion', { token: B.token, body: { confirm: 'nila_b' } })).json.code === 'BLOCKED');
  const vn = await api('GET', '/api/v8/vendor/orders?tab=new', { token: S.token }); const vo = vn.json.items.find((x) => x.public_key === O);
  check('vendor: size hidden before accepting', vo?.size?.hidden === true && !vn.text.includes('"chest_cm"'), vn.text.slice(0, 300));
  const ac = await api('POST', `/api/v8/vendor/orders/${O}/accept`, { token: S.token });
  check('vendor sees the size after accepting', ac.json.order?.size?.chest_cm === 88 && ac.json.order.size.hand_cm === 56, ac.text.slice(0, 300));
  await api('POST', `/api/v8/vendor/orders/${O}/pack`, { token: S.token }); await api('POST', `/api/v8/vendor/orders/${O}/ship`, { token: S.token, body: { courier: 'DTDC', tracking: 'D7654321' } });
  const s0 = SANDBOX ? await bal(S) : 0;
  await api('POST', `/api/v8/vendor/orders/${O}/deliver`, { token: S.token });
  const rw = await api('GET', '/api/v8/me/rewards', { token: B.token });
  check('₹10,000 delivered → 100 points pending for the return window, notified', rw.json.summary?.pending === 100 && rw.json.summary.available === 0 && rw.json.items[0].funded_by === 'seller' && rw.json.items[0].expires_at && (await notes(B)).some((n) => /earned 100/.test(n.title)), rw.text.slice(0, 300));
  if (SANDBOX) check('seller-funded: seller paid net minus ₹100', (await bal(S)) === s0 + 9200 - 100, `${s0} ${await bal(S)}`);
  check('pending points cannot be redeemed', (await api('POST', '/api/v8/me/rewards/redeem', { token: B.token, body: { points: 100, idem_key: 'r0x' } })).json.code === (SANDBOX ? 'NOT_ENOUGH_POINTS' : 'PAYMENT_PROVIDER_REQUIRED'));
  // review helpful + report → admin hide
  await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: B.token, body: { rating: 2, body: 'Call me on 98xxxxxx for a discount' } });
  check('cannot vote on own review', (await api('POST', `/api/v8/shop/products/${C}/reviews/nila_b/helpful`, { token: B.token })).json.code === 'OWN_REVIEW');
  const hv = await api('POST', `/api/v8/shop/products/${C}/reviews/nila_b/helpful`, { token: R.token }); await api('POST', `/api/v8/shop/products/${C}/reviews/nila_b/helpful`, { token: R.token });
  check('helpful counted once', hv.json.helpful === 1 && (await api('GET', `/api/v8/shop/products/${C}/reviews`, { token: R.token })).json.items[0].helpful === 1);
  check('report needs a reason', (await api('POST', `/api/v8/shop/products/${C}/reviews/nila_b/report`, { token: R.token, body: {} })).json.code === 'REASON_REQUIRED');
  await api('POST', `/api/v8/shop/products/${C}/reviews/nila_b/report`, { token: R.token, body: { reason: 'personal_info', details: 'Phone number in the review' } });
  const q = await api('GET', '/api/admin/v8/reviews/reports', { headers: ADMIN }); const RP = q.json.items?.[0]?.public_key;
  check('admin queue lists the report (@handles only)', /^RPT-/.test(RP || '') && q.json.items[0].reviewer.public_username === 'nila_b' && !FORBIDDEN.test(q.text), q.text.slice(0, 300));
  check('admin API refuses a member', (await api('GET', '/api/admin/v8/reviews/reports', { token: R.token })).status === 401);
  await api('POST', `/api/admin/v8/reviews/reports/${RP}/decide`, { headers: ADMIN, body: { decision: 'hide', note: 'Please don’t share phone numbers.' } });
  check('hidden from others, still visible to the author, author notified', (await api('GET', `/api/v8/shop/products/${C}/reviews`, { token: R.token })).json.summary.count === 0 && (await api('GET', `/api/v8/shop/products/${C}/reviews`, { token: B.token })).json.items.length === 1 && (await notes(B)).some((n) => /was hidden/.test(n.title)));
  // return → points reversed
  const rt = await api('POST', `/api/v8/shop/orders/${O}/return`, { token: B.token, body: { reason: 'size', details: 'Too tight at the chest' } });
  const RT = rt.json.order?.return?.public_key;
  if (RT) { await api('POST', `/api/v8/vendor/returns/${RT}/approve`, { token: S.token }); await api('POST', `/api/v8/vendor/returns/${RT}/received`, { token: S.token }); }
  const rw2 = await api('GET', '/api/v8/me/rewards', { token: B.token });
  check('return reverses the points', rw2.json.items.some((x) => x.type === 'reverse' && x.points === 100), rw2.text.slice(0, 300) + rt.text.slice(0, 200));
  check('pending points gone after the return; seller refunded the points', (await api('GET', '/api/v8/me/rewards', { token: B.token })).json.summary.pending === 0);
  await pool.query(`INSERT INTO howdi_v8_rewards(user_id,kind,points,reference,funded_by,expires_at,available_at,note) VALUES($1,'EARN',150,'ORD-TESTMATURED','howdi',NOW()+interval '300 days',NOW()-interval '1 day','matured')`, [B.id]);
  if (SANDBOX) {
    const b0 = await bal(B);
    check('min redeem 100', (await api('POST', '/api/v8/me/rewards/redeem', { token: B.token, body: { points: 50, idem_key: 'r0' } })).json.code === 'MIN_REDEEM');
    const r1 = await api('POST', '/api/v8/me/rewards/redeem', { token: B.token, body: { points: 100, idem_key: 'r1' } }); const r2 = await api('POST', '/api/v8/me/rewards/redeem', { token: B.token, body: { points: 100, idem_key: 'r1' } });
    check('matured points redeemed once into HPay (₹100)', r1.json.amount === 100 && (await bal(B)) === b0 + 100 && r2.json.summary.available === 50, r1.text + r2.text);
    check('cannot redeem more than available', (await api('POST', '/api/v8/me/rewards/redeem', { token: B.token, body: { points: 100, idem_key: 'r2' } })).json.code === 'NOT_ENOUGH_POINTS');
  } else check('redeem needs HPay', (await api('POST', '/api/v8/me/rewards/redeem', { token: B.token, body: { points: 100, idem_key: 'r1' } })).json.code === 'PAYMENT_PROVIDER_REQUIRED');
  // family
  check('invite needs a family first', (await api('POST', '/api/v8/me/family/invite', { token: B.token, body: { handle: 'fam_one', relation: 'sibling' } })).json.code === 'OWNER_ONLY');
  await api('POST', '/api/v8/me/family', { token: B.token, body: { name: 'Rao family' } });
  check('relation required', (await api('POST', '/api/v8/me/family/invite', { token: B.token, body: { handle: 'fam_one', relation: 'x' } })).json.code === 'RELATION');
  await api('POST', '/api/v8/me/family/invite', { token: B.token, body: { handle: 'fam_one', relation: 'sibling' } });
  const fi = await api('GET', '/api/v8/me/family', { token: F.token });
  check('invitee sees the invitation + notified', fi.json.invitations?.[0]?.from?.public_username === 'nila_b' && (await notes(F)).some((n) => /invited you to their family/.test(n.title)) && !FORBIDDEN.test(fi.text), fi.text.slice(0, 300));
  await api('POST', '/api/v8/me/family/respond', { token: F.token, body: { from: 'nila_b', accept: true } });
  const fo = await api('GET', '/api/v8/me/family', { token: B.token });
  check('both are members; owner notified', fo.json.family?.members?.length === 2 && fo.json.family.members.every((x) => x.status === 'active') && (await notes(B)).some((n) => /joined/.test(n.title)));
  check('owner cannot leave (must close)', (await api('POST', '/api/v8/me/family/leave', { token: B.token })).json.code === 'OWNER');
  await api('POST', '/api/v8/me/family/leave', { token: F.token });
  check('member left', (await api('GET', '/api/v8/me/family', { token: B.token })).json.family.members.length === 1);
  // addresses
  const a2 = await api('POST', '/api/v8/shop/addresses', { token: B.token, body: { name: 'Nila Office', phone: '9876500003', line1: '9 Market Rd', city: 'Khammam', state: 'Telangana', pin_code: '507002' } });
  const dk = await api('POST', `/api/v8/shop/addresses/${a2.json.saved.key}/default`, { token: B.token });
  check('set default address', dk.json.items?.[0]?.key === a2.json.saved.key && dk.json.items[0].is_default === true, dk.text.slice(0, 300));
  check('delete address', (await api('DELETE', `/api/v8/shop/addresses/${a2.json.saved.key}`, { token: B.token })).json.items?.length === 1);
  // export + deletion
  const ex = await api('GET', '/api/v8/me/export', { token: B.token });
  check('data export has orders, rewards, size — no internal ids', ex.json.export?.orders?.length === 1 && ex.json.export.rewards.length >= 2 && ex.json.export.size_profile && !FORBIDDEN.test(ex.text), ex.text.slice(0, 200));
  check('deletion needs exact @username', (await api('POST', '/api/v8/me/deletion', { token: B.token, body: { confirm: 'wrong' } })).json.code === 'CONFIRM');
  const dl = await api('POST', '/api/v8/me/deletion', { token: B.token, body: { confirm: '@nila_b', reason: 'Testing' } });
  check('deletion scheduled 30 days out + notified', dl.json.deletion?.status === 'pending' && new Date(dl.json.deletion.scheduled_for) - Date.now() > 29 * 864e5 && (await notes(B)).some((n) => /deletion scheduled/.test(n.title)));
  check('deletion cancelled', (await api('DELETE', '/api/v8/me/deletion', { token: B.token })).json.deletion?.status === 'none');
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });

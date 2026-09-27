// V8 Messages Part B — real PostgreSQL, both sides: MSG-004/005/006 cards (visibility for each viewer), MSG-007 view-once (once per
// recipient, never a public URL), MSG-008 per-chat auto-erase (both sides told, expired messages gone), MSG-012..014 utilities
// (recharge for self and by request, bills, tickets, gift cards, provider failure / pending / refund, idempotency, limits),
// MSG-016 QR pay (signed code, tamper, self, block), HPay history. No internal ids anywhere.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 06 messages B (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|mobile|uuid|conversation_id|payment_id|uid|secret)"\s*:/;
const noKeys = (label, r) => check(`${label}: no internal id keys`, !FORBIDDEN.test(r.text || ''), (r.text.match(FORBIDDEN) || [])[0]);
const key = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function mem(name, handle, contact = 'EVERYONE') {
  const u = await K.mkUser(name, { id: K.bigId() });
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode,contact_permission) VALUES($1,$2,TRUE,FALSE,FALSE,$3) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username, contact_permission=EXCLUDED.contact_permission`, [u.id, handle, contact]);
  return { ...u, handle };
}
const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
const thread = async (m, c) => ((await api('GET', `/api/v8/conversations/${c}/messages`, { token: m.token })).json.items || []);
const send = (m, c, body) => api('POST', `/api/v8/conversations/${c}/messages`, { token: m.token, body: { idempotency_key: key(), ...body } });

(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await mem('Asha Buyer', 'asha_b'); const B = await mem('Bala Peer', 'bala_p'); const X = await mem('Xavi Outsider', 'xavi_o');
  const secrets = [A, B, X].flatMap((m) => [String(m.id), m.howdi, m.email, m.phone]);
  const noLeak = (label, r) => { noKeys(label, r); const t = r.text || ''; const hit = secrets.filter((x) => x && String(x).length > 3 && t.includes(`"${x}"`)); check(`${label}: no internal id values`, hit.length === 0, hit); };
  const CV = (await api('POST', '/api/v8/conversations', { token: A.token, body: { handle: 'bala_p', text: 'Hi Bala' } })).json.conversation.public_key;
  check('chat ready', /^CNV-/.test(CV));

  // ---------------- MSG-004 product card
  const V = await K.vendor(X, { business: 'Xavi Looms' }); const P1 = await K.product(V, 'Ikat cotton stole'); await K.product(V, 'Ikat silk saree', { stock: 0 });
  const s1 = await api('GET', '/api/search?q=ikat&types=product&limit=5', { token: A.token });
  const prd = (s1.json.results || []).find((x) => x.title === 'Ikat cotton stole'); const PRD = prd ? prd.route.split('/').pop() : null;
  check('product has a public PRD code', /^PRD-[0-9A-F]{12}$/.test(PRD || ''), s1.text.slice(0, 200));
  const pc = await send(A, CV, { text: 'This one?', card: { type: 'product', ref: PRD } });
  check('product card sent', pc.status === 201 && pc.json.message.card?.title === 'Ikat cotton stole' && pc.json.message.card.price === 450, pc.text.slice(0, 300));
  noLeak('product card', pc);
  check('bogus product ref refused', (await send(A, CV, { card: { type: 'product', ref: 'PRD-000000000000' } })).status === 404);
  check('unknown card type refused', (await send(A, CV, { card: { type: 'wallet', ref: 'x' } })).status === 400);
  { const t = await thread(B, CV); const c = t.find((m) => m.kind === 'card'); check('B sees the product card with Buy', c && c.card.actions.includes('buy') && c.card.route === `/shop/products/${PRD}`); }
  await pool.query(`UPDATE vendor_products SET status='draft' WHERE id=$1`, [P1.id]);
  { const c = (await thread(B, CV)).find((m) => m.kind === 'card'); check('unpublished product → card shows unavailable (no stale data)', c && c.card.unavailable === true && !c.card.title); }
  await pool.query(`UPDATE vendor_products SET status='published' WHERE id=$1`, [P1.id]);
  await K.block(B, X);
  { const c = (await thread(B, CV)).find((m) => m.kind === 'card'); check('product of a blocked vendor is unavailable to B', c && c.card.unavailable === true); }
  await pool.query(`DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1`, [B.id]);

  // ---------------- MSG-006 worker card
  const W = await K.worker(X, { code: 'WRK-LOOM-01' });
  const wc = await send(A, CV, { card: { type: 'worker', ref: 'WRK-LOOM-01' } });
  check('worker card: verified, service, rating, no phone', wc.status === 201 && wc.json.message.card?.verified === true && wc.json.message.card.rating === 4.7 && !/"phone"|9\d{9}/.test(wc.text), wc.text.slice(0, 300));
  await pool.query(`UPDATE works_workers SET kyc_status='pending' WHERE id=$1`, [W.id]);
  { const c = (await thread(B, CV)).filter((m) => m.kind === 'card').pop(); check('worker no longer verified → unavailable', c && c.card.unavailable === true); }

  // ---------------- MSG-005 community card (public, private, invite-only)
  const G1 = await K.community(X, 'Loom Lovers', 'loom-lovers'); const G2 = await K.community(X, 'Secret Weavers', 'secret-weavers', { privacy: 'INVITE_ONLY' });
  await pool.query(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status) VALUES($1,$2,'OWNER','ACTIVE'),($3,$2,'OWNER','ACTIVE'),($3,$4,'MEMBER','ACTIVE')`, [G1.id, X.id, G2.id, A.id]);
  await pool.query(`INSERT INTO howdi_v8_community_meta(space_id,invite_code) VALUES($1,'INVITE0001') ON CONFLICT(space_id) DO UPDATE SET invite_code='INVITE0001'`, [G2.id]);
  const gc = await send(A, CV, { card: { type: 'community', ref: 'loom-lovers' } });
  check('public group card with Join', gc.status === 201 && gc.json.message.card?.privacy === 'public', gc.text.slice(0, 300));
  { const c = (await thread(B, CV)).filter((m) => m.kind === 'card').pop(); check('B sees Join on the group card', c && c.card.actions.includes('join') && c.card.membership === 'none'); }
  const ic = await send(A, CV, { card: { type: 'community', ref: 'secret-weavers' } });
  check('member (not mod) shares invite-only group → it stays hidden from B', ic.status === 201);
  { const c = (await thread(B, CV)).filter((m) => m.kind === 'card').pop(); check('B cannot see an invite-only group without its invite link', c && c.card.unavailable === true); }

  // ---------------- MSG-007 view-once
  const vo = await send(A, CV, { imageData: PNG, viewOnce: true });
  check('view-once sent, no media URL in the payload', vo.status === 201 && vo.json.message.kind === 'viewonce' && vo.json.message.image_url === null && !/\/api\/v8\/media\//.test(vo.text), vo.text.slice(0, 300));
  const VO = vo.json.message.public_key;
  { const t = await thread(B, CV); const m = t.find((x) => x.public_key === VO); check('B sees an unopened view-once photo', m && m.view_once.opened === false && m.view_once.media === 'photo' && !m.image_url); }
  check('sender cannot open their own view-once', (await api('POST', `/api/v8/chat-messages/${VO}/open`, { token: A.token })).status === 403);
  check('outsider cannot open it', (await api('POST', `/api/v8/chat-messages/${VO}/open`, { token: X.token })).status === 404);
  const op = await api('POST', `/api/v8/chat-messages/${VO}/open`, { token: B.token });
  check('B opens it once (inline data)', op.status === 200 && /^data:image\/png;base64,/.test(op.json.media?.data || ''), op.text.slice(0, 200));
  check('second open refused (410)', (await api('POST', `/api/v8/chat-messages/${VO}/open`, { token: B.token })).json.code === 'ALREADY_OPENED');
  { const m = (await thread(A, CV)).find((x) => x.public_key === VO); check('sender sees Opened', m && m.view_once.opened === true); }
  check('view-once needs media', (await send(A, CV, { viewOnce: true })).status === 400);

  // ---------------- MSG-008 auto-erase
  const ae = await api('POST', `/api/v8/conversations/${CV}/auto-erase`, { token: B.token, body: { hours: 24 } });
  check('B turns on 24h auto-erase', ae.json.auto_erase?.hours === 24, ae.text);
  { const c = (await api('GET', `/api/v8/conversations/${CV}`, { token: A.token })).json.conversation; check('A sees auto-erase on, set by @bala_p', c.auto_erase?.hours === 24 && c.auto_erase.set_by === 'bala_p' && /Auto-erase is on/.test(c.safety.retention)); }
  check('A notified about auto-erase', (await notes(A)).some((n) => /auto-erase/i.test(n.title)));
  check('system line in the thread', (await thread(A, CV)).some((m) => m.kind === 'system' && /turned on auto-erase/.test(m.text)));
  const ep = await send(A, CV, { text: 'this disappears' });
  check('new message carries expires_at', Boolean(ep.json.message.expires_at));
  await pool.query(`UPDATE howdi_connect_messages SET expires_at=NOW()-interval '1 minute' WHERE message_text='this disappears'`);
  check('expired message gone for both sides', !(await thread(A, CV)).some((m) => m.text === 'this disappears') && !(await thread(B, CV)).some((m) => m.text === 'this disappears'));
  check('older messages are not affected', (await thread(A, CV)).some((m) => m.text === 'Hi Bala'));
  check('auto-erase off', (await api('POST', `/api/v8/conversations/${CV}/auto-erase`, { token: A.token, body: { hours: 0 } })).json.auto_erase === null);
  check('outsider cannot toggle', (await api('POST', `/api/v8/conversations/${CV}/auto-erase`, { token: X.token, body: { hours: 24 } })).status === 404);

  // ---------------- catalogue, bills, QR (read-only, both modes)
  const cat = await api('GET', '/api/v8/hpay/utilities/catalog', { token: A.token });
  check('catalogue has keys (no ids)', cat.json.operators?.[0]?.key === 'jio' && cat.json.plans?.jio?.[0]?.key && cat.json.billers?.[0]?.key && !/"re"/.test(cat.text), cat.text.slice(0, 200));
  check('guest cannot read HPay', (await api('GET', '/api/v8/hpay/utilities/catalog')).status === 401);
  const bill = await api('POST', '/api/v8/hpay/bills/fetch', { token: A.token, body: { biller: 'tgspdcl', consumer: '112233445566' } });
  check('bill fetched, account masked', bill.json.bill?.amount > 0 && bill.json.bill.account === '•••• 5566' && !bill.text.includes('112233445566'), bill.text);
  check('bad account refused', (await api('POST', '/api/v8/hpay/bills/fetch', { token: A.token, body: { biller: 'tgspdcl', consumer: '12' } })).status === 400);
  check('no bill due → 404', (await api('POST', '/api/v8/hpay/bills/fetch', { token: A.token, body: { biller: 'actfiber', consumer: '12340000' } })).json.code === 'NO_BILL');
  const qr = await api('GET', '/api/v8/hpay/qr?amount=120', { token: B.token });
  check('B’s QR is signed and carries only @handle + amount', /^HOWDIPAY:1:bala_p:120:[0-9a-f]{16}$/.test(qr.json.payload || ''), qr.text);
  const rs = await api('POST', '/api/v8/hpay/qr/resolve', { token: A.token, body: { code: qr.json.payload } });
  check('A resolves B’s QR: payee + fixed amount', rs.json.payee?.public_username === 'bala_p' && rs.json.amount === 120, rs.text);
  noLeak('qr resolve', rs);
  check('tampered amount refused', (await api('POST', '/api/v8/hpay/qr/resolve', { token: A.token, body: { code: qr.json.payload.replace(':120:', ':12:') } })).json.code === 'QR_INVALID');
  check('tampered handle refused', (await api('POST', '/api/v8/hpay/qr/resolve', { token: A.token, body: { code: qr.json.payload.replace('bala_p', 'asha_b') } })).json.code === 'QR_INVALID');
  check('own QR refused', (await api('POST', '/api/v8/hpay/qr/resolve', { token: B.token, body: { code: qr.json.payload } })).json.code === 'SELF');

  if (SANDBOX) {
    check('A sets PIN', (await api('POST', '/api/v8/hpay/pin', { token: A.token, body: { pin: '4826' } })).status === 200);
    await api('POST', '/api/v8/hpay/pin', { token: B.token, body: { pin: '7391' } });
    const bal = async (m) => (await api('GET', '/api/v8/hpay/history', { token: m.token })).json.balance;
    await bal(A); await pool.query(`UPDATE howdi_v8_wallets SET balance=15000 WHERE user_id=$1`, [A.id]);
    const a0 = await bal(A);
    // ---- recharge for self from chat, shared as a receipt card
    const rq = await api('POST', '/api/v8/hpay/utilities/quote', { token: A.token, body: { type: 'recharge', mobile: '9876512345', operator: 'jio', circle: 'Telangana', plan: 'jio-299' } });
    check('recharge review: ₹299, number masked', rq.json.review?.amount === 299 && rq.json.review.details.number === '•••• 2345' && !rq.text.includes('9876512345'), rq.text);
    const k1 = key();
    const r1 = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'recharge', mobile: '9876512345', operator: 'jio', circle: 'Telangana', plan: 'jio-299', pin: '4826', idempotency_key: k1, conversation: CV } });
    check('recharge succeeds', r1.status === 201 && r1.json.order?.status === 'success' && /^HPU-/.test(r1.json.order.reference || ''), r1.text.slice(0, 300));
    noLeak('recharge order', r1);
    const r1b = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'recharge', mobile: '9876512345', operator: 'jio', circle: 'Telangana', plan: 'jio-299', pin: '4826', idempotency_key: k1, conversation: CV } });
    check('same key replays, not charged twice', r1b.json.replayed === true && (await bal(A)) === a0 - 299);
    { const m = (await thread(B, CV)).find((x) => x.kind === 'utility'); check('B sees the recharge receipt card (masked number)', m && m.utility.type === 'recharge' && m.utility.lines.some((l) => l.value === '•••• 2345') && m.utility.role === 'viewer'); }
    check('wrong PIN refused', (await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'recharge', mobile: '9876512345', operator: 'jio', circle: 'Telangana', plan: 'jio-299', pin: '1111', idempotency_key: key() } })).json.code === 'PIN_WRONG');
    // provider failure → nothing charged, retry with same key allowed
    const a1 = await bal(A); const kf = key();
    const f1 = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'recharge', mobile: '9876500000', operator: 'airtel', circle: 'Telangana', plan: 'airtel-199', pin: '4826', idempotency_key: kf } });
    check('provider failure → 502, nothing charged', f1.json.code === 'PROVIDER_FAILED' && (await bal(A)) === a1, f1.text);
    check('failed attempt appears in history', ((await api('GET', '/api/v8/hpay/utilities/orders', { token: A.token })).json.items || []).some((o) => o.status === 'failed'));
    // pending → success, pending → refund
    const pnd = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'bill', biller: 'tgspdcl', consumer: '9988775555', pin: '4826', idempotency_key: key() } });
    check('bill ending 5555 goes pending', pnd.json.order?.status === 'pending', pnd.text.slice(0, 200));
    const rf = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'bill', biller: 'tgspdcl', consumer: '9988774444', pin: '4826', idempotency_key: key() } });
    check('bill ending 4444 goes pending', rf.json.order?.status === 'pending', rf.text.slice(0, 300));
    const aPend = await bal(A);
    await pool.query(`UPDATE howdi_v8_utility_orders SET settle_at=NOW()-interval '1 second' WHERE status='PENDING'`);
    check('pending settles to success on status check', (await api('GET', `/api/v8/hpay/utilities/orders/${pnd.json.order.public_key}`, { token: A.token })).json.order.status === 'success');
    const rfs = await api('GET', `/api/v8/hpay/utilities/orders/${rf.json.order.public_key}`, { token: A.token });
    check('pending-refund settles to refunded and money returns', rfs.json.order.status === 'refunded' && (await bal(A)) === aPend + Number(rf.json.order.amount), rfs.text.slice(0, 200));
    check('A notified of the refund', (await notes(A)).some((n) => /refunded/i.test(n.title)));
    // ---- recharge request: B asks A
    const rr = await api('POST', '/api/v8/hpay/utilities/requests', { token: B.token, body: { conversation: CV, mobile: '9123456789', operator: 'vi', circle: 'Telangana', plan: 'vi-179' } });
    check('B asks A for a recharge', rr.status === 201 && rr.json.order.status === 'requested' && rr.json.order.actions.includes('cancel'), rr.text.slice(0, 300));
    const RQ = rr.json.order.public_key;
    { const m = (await thread(A, CV)).find((x) => x.utility && x.utility.public_key === RQ); check('A sees Recharge now / Decline, number masked', m && m.utility.actions.join() === 'pay,decline' && m.utility.lines.some((l) => l.value === '•••• 6789')); }
    check('A notified of the request', (await notes(A)).some((n) => /asked you for a ₹179 recharge/.test(n.title)));
    check('the full number never reaches A', !(await api('GET', `/api/v8/conversations/${CV}/messages`, { token: A.token })).text.includes('9123456789'));
    check('requester cannot pay own request', (await api('POST', `/api/v8/hpay/utilities/orders/${RQ}/pay`, { token: B.token, body: { pin: '7391', idempotency_key: key() } })).status === 403);
    const pay = await api('POST', `/api/v8/hpay/utilities/orders/${RQ}/pay`, { token: A.token, body: { pin: '4826', idempotency_key: key() } });
    check('A pays the request', pay.json.order?.status === 'success', pay.text.slice(0, 200));
    check('double pay is a replay', (await api('POST', `/api/v8/hpay/utilities/orders/${RQ}/pay`, { token: A.token, body: { pin: '4826', idempotency_key: key() } })).json.replayed === true);
    check('B told the recharge is done', (await notes(B)).some((n) => /recharged your number/.test(n.title)));
    const rr2 = await api('POST', '/api/v8/hpay/utilities/requests', { token: B.token, body: { conversation: CV, mobile: '9123456789', operator: 'vi', circle: 'Telangana', plan: 'vi-299' } });
    check('A declines a second request', (await api('POST', `/api/v8/hpay/utilities/orders/${rr2.json.order.public_key}/decline`, { token: A.token })).json.order.status === 'declined');
    check('B told it was declined', (await notes(B)).some((n) => /declined your recharge request/.test(n.title)));
    check('outsider cannot see the order', (await api('GET', `/api/v8/hpay/utilities/orders/${RQ}`, { token: X.token })).status === 404);
    // ---- tickets for them + gift card
    const tk = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'ticket', event: 'crafts-fair', date: '2026-10-10', tier: 'workshop', qty: 2, for: 'them', pin: '4826', idempotency_key: key(), conversation: CV } });
    check('2 workshop tickets for B (₹900)', tk.json.order?.amount === 900 && tk.json.order.recipient?.public_username === 'bala_p' && !tk.json.order.tickets, tk.text.slice(0, 300));
    { const m = (await thread(B, CV)).find((x) => x.utility && x.utility.type === 'ticket'); check('B holds 2 ticket codes', m && m.utility.tickets?.length === 2 && /^TKT-/.test(m.utility.tickets[0])); }
    check('B notified of the tickets', (await notes(B)).some((n) => /got you 2 tickets/.test(n.title)));
    const gc2 = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'giftcard', card: 'howdi-hpay', amount: 250, message: 'Happy Bathukamma!', pin: '4826', idempotency_key: key(), conversation: CV } });
    check('gift card to B; buyer never sees the code', gc2.json.order?.status === 'success' && !gc2.json.order.code, gc2.text.slice(0, 300));
    const G = gc2.json.order.public_key;
    { const m = (await thread(B, CV)).find((x) => x.utility && x.utility.public_key === G); check('B sees the code and Redeem', m && /^HGC-/.test(m.utility.code || '') && m.utility.actions.includes('redeem')); }
    const b0 = await bal(B);
    check('A cannot redeem', (await api('POST', `/api/v8/hpay/utilities/orders/${G}/redeem`, { token: A.token })).status === 409);
    const rd = await api('POST', `/api/v8/hpay/utilities/orders/${G}/redeem`, { token: B.token });
    check('B redeems to HPay (+₹250)', rd.json.order?.status === 'redeemed' && rd.json.balance === b0 + 250, rd.text.slice(0, 200));
    check('second redeem does not credit again', (await api('POST', `/api/v8/hpay/utilities/orders/${G}/redeem`, { token: B.token })).json.replayed === true && (await bal(B)) === b0 + 250);
    check('A told it was redeemed', (await notes(A)).some((n) => /redeemed your gift card/.test(n.title)));
    check('gift card needs a chat or “for me”', (await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'giftcard', card: 'howdi-shop', amount: 500, pin: '4826', idempotency_key: key() } })).status === 400);
    // ---- QR pay
    const kq = key(); const aq = await bal(A); const bq = await bal(B);
    const qp = await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr.json.payload, amount: 999, pin: '4826', idempotency_key: kq } });
    check('QR pay uses the QR’s fixed amount (₹120, not 999)', qp.status === 201 && qp.json.payment.amount === 120 && (await bal(A)) === aq - 120 && (await bal(B)) === bq + 120, qp.text.slice(0, 300));
    check('QR retry with same key is a replay', (await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr.json.payload, pin: '4826', idempotency_key: kq } })).json.replayed === true && (await bal(A)) === aq - 120);
    check('QR payment shows in the existing chat', (await thread(B, CV)).some((m) => m.payment && m.payment.amount === 120 && m.text === undefined || (m.payment && m.payment.amount === 120)));
    check('B notified of QR payment', (await notes(B)).some((n) => /paid you ₹120 by QR/.test(n.title)));
    const open = await api('GET', '/api/v8/hpay/qr', { token: B.token });
    check('open-amount QR needs an amount', (await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: open.json.payload, pin: '4826', idempotency_key: key() } })).status === 400);
    await K.block(B, A);
    check('blocked → cannot pay by QR', (await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: open.json.payload, amount: 10, pin: '4826', idempotency_key: key() } })).status === 403);
    await pool.query(`DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1`, [B.id]);
    // ---- history + limits
    const h = await api('GET', '/api/v8/hpay/history', { token: A.token });
    check('history lists utilities, QR and refund with references', ['Utilities', 'QR payment', 'Refund'].every((l) => (h.json.items || []).some((i) => i.label === l && /^HP[A-Z]-/.test(i.reference))), h.text.slice(0, 300));
    noLeak('history', h);
    await pool.query(`UPDATE howdi_v8_wallets SET balance=5 WHERE user_id=$1`, [A.id]);
    check('insufficient balance → nothing charged', (await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'recharge', mobile: '9876512345', operator: 'jio', circle: 'Telangana', plan: 'jio-199', pin: '4826', idempotency_key: key() } })).json.code === 'INSUFFICIENT_BALANCE');
  } else {
    await api('POST', '/api/v8/hpay/pin', { token: A.token, body: { pin: '4826' } });
    const np = await api('POST', '/api/v8/hpay/utilities/orders', { token: A.token, body: { type: 'recharge', mobile: '9876512345', operator: 'jio', circle: 'Telangana', plan: 'jio-299', pin: '4826', idempotency_key: key() } });
    check('without the sandbox no utility is charged (503)', np.json.code === 'PAYMENT_PROVIDER_REQUIRED', np.text.slice(0, 200));
    check('without the sandbox QR pay refused', (await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr.json.payload, pin: '4826', idempotency_key: key() } })).json.code === 'PAYMENT_PROVIDER_REQUIRED');
  }
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });

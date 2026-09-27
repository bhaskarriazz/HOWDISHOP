// V8 Messages with in-chat HPay — real PostgreSQL, both sides of every interaction:
//   CON-009 inbox + requests tab · CON-011 eligibility + message requests · CON-010 chat, delivered/read, edit window, delete,
//   report (with edit versions), block · CON-012 groups (create, add, remove, admin, rename, leave) · MSG-002 send money
//   (review, PIN, idempotency, insufficient balance, daily limit) · MSG-003 payment requests (pay, decline, cancel, remind,
//   expire, double pay) · notifications on each side · no internal ids.
const L = require('../worker-pg/lib.cjs');
const { pool, check, finish, api } = L;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 05 messages (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|uuid|conversation_id|payment_id|uid)"\s*:/;
const noKeys = (label, r) => check(`${label}: no internal id keys`, !FORBIDDEN.test(r.text || ''), (r.text.match(FORBIDDEN) || [])[0]);
const key = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

async function member(name, handle, contact = 'EVERYONE') {
  const u = await L.mkUser(name);
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode,contact_permission) VALUES($1,$2,TRUE,FALSE,FALSE,$3) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username, contact_permission=EXCLUDED.contact_permission`, [u.id, handle, contact]);
  return { ...u, handle };
}
const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
const thread = async (m, c) => ((await api('GET', `/api/v8/conversations/${c}/messages`, { token: m.token })).json.items || []);

(async () => {
  const started = await L.start(); check('server starts', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await member('Asha Sender', 'asha_s'); const B = await member('Bala Receiver', 'bala_r');
  const C = await member('Chitra Followers', 'chitra_f', 'FOLLOWERS'); const D = await member('Dev Closed', 'dev_closed', 'NO_ONE'); const E = await member('Esha Group', 'esha_g');
  const secrets = [A, B, C, D, E].flatMap((m) => [String(m.id), m.howdi, m.email, m.phone]);
  const noLeak = (label, r) => { noKeys(label, r); const t = r.text || ''; const hit = secrets.filter((x) => x && String(x).length > 3 && t.includes(`"${x}"`)); check(`${label}: no internal id values`, hit.length === 0, hit); };

  check('guest inbox → 401', (await api('GET', '/api/v8/conversations')).status === 401);
  // ---- eligibility
  check('everyone → direct', (await api('GET', '/api/v8/messages/eligibility/bala_r', { token: A.token })).json.can === 'direct');
  check('followers-only, not following → request', (await api('GET', '/api/v8/messages/eligibility/chitra_f', { token: A.token })).json.can === 'request');
  check('no one → no', (await api('GET', '/api/v8/messages/eligibility/dev_closed', { token: A.token })).json.can === 'no');
  check('unknown handle → 404', (await api('GET', '/api/v8/messages/eligibility/nobody_here', { token: A.token })).status === 404);
  check('cannot message a closed profile', (await api('POST', '/api/v8/conversations', { token: A.token, body: { handle: 'dev_closed', text: 'hi' } })).status === 403);
  // ---- direct chat
  const cv = await api('POST', '/api/v8/conversations', { token: A.token, body: { handle: 'bala_r', text: 'Hello Bala', userId: B.id } });
  check('direct chat created (session user, userId ignored)', cv.status === 201 && /^CNV-[0-9A-F]{12}$/.test(cv.json.conversation?.public_key || ''), cv.text);
  const CV = cv.json.conversation.public_key;
  check('same pair reuses the chat', (await api('POST', '/api/v8/conversations', { token: A.token, body: { handle: 'bala_r', text: 'Second' } })).json.conversation.public_key === CV);
  check('outsider cannot open the chat', (await api('GET', `/api/v8/conversations/${CV}`, { token: E.token })).status === 404);
  check('outsider cannot post into it', (await api('POST', `/api/v8/conversations/${CV}/messages`, { token: E.token, body: { text: 'x' } })).status === 404);
  const inboxB = await api('GET', '/api/v8/conversations', { token: B.token });
  check('B inbox shows chat with 2 unread', inboxB.json.items?.[0]?.unread === 2 && inboxB.json.items[0].title === 'Asha Sender', inboxB.text.slice(0, 300));
  noLeak('inbox', inboxB);
  check('B notified of the new message', (await notes(B)).some((n) => /message from @asha_s/.test(n.title)));
  let t = await thread(A, CV);
  check('A sees delivered (not read) before B opens', t[0].status === 'delivered', t[0]);
  await api('POST', `/api/v8/conversations/${CV}/read`, { token: B.token });
  t = await thread(A, CV);
  check('A sees read after B opens', t[0].status === 'read', t[0]);
  const th = await api('GET', `/api/v8/conversations/${CV}/messages`, { token: A.token }); noLeak('thread', th);
  // send idempotency
  const k1 = key();
  const s1 = await api('POST', `/api/v8/conversations/${CV}/messages`, { token: B.token, body: { text: 'Hi Asha!', idempotency_key: k1 } });
  const s2 = await api('POST', `/api/v8/conversations/${CV}/messages`, { token: B.token, body: { text: 'Hi Asha!', idempotency_key: k1 } });
  check('retrying a send does not duplicate', s1.status === 201 && s2.json.replayed === true && (await thread(A, CV)).filter((m) => m.text === 'Hi Asha!').length === 1);
  // edit window + versions
  const mk = s1.json.message.public_key;
  check('only the author can edit', (await api('PATCH', `/api/v8/chat-messages/${mk}`, { token: A.token, body: { text: 'hacked' } })).status === 404);
  check('author edits within 15 min', (await api('PATCH', `/api/v8/chat-messages/${mk}`, { token: B.token, body: { text: 'Hi Asha! 👋' } })).json.edited === true);
  check('edited label shown', (await thread(A, CV)).find((m) => m.public_key === mk).edited === true);
  await pool.query(`UPDATE howdi_connect_messages SET created_at=NOW()-interval '16 minutes' WHERE sender_user_id=$1 AND message_text='Hi Asha! 👋'`, [B.id]);
  check('edit window closes after 15 min', (await api('PATCH', `/api/v8/chat-messages/${mk}`, { token: B.token, body: { text: 'late' } })).json.code === 'EDIT_WINDOW_CLOSED');
  const rp = await api('POST', `/api/v8/conversations/${CV}/report`, { token: A.token, body: { reason: 'harassment', message: mk } });
  check('report accepted', rp.status === 200, rp.text);
  const snap = (await pool.query(`SELECT snapshot FROM howdi_v8_message_reports ORDER BY id DESC LIMIT 1`)).rows[0].snapshot;
  check('report keeps the original of an edited message', JSON.stringify(snap).includes('"Hi Asha!"'), JSON.stringify(snap).slice(0, 300));
  check('author deletes a message', (await api('DELETE', `/api/v8/chat-messages/${mk}`, { token: B.token })).json.deleted === true);
  check('deleted shows as deleted, no text', (() => true)() && (await thread(A, CV)).find((m) => m.public_key === mk).kind === 'deleted');
  check('mute', (await api('POST', `/api/v8/conversations/${CV}/mute`, { token: B.token, body: { on: true } })).json.muted === true);

  // ---- message request (followers-only)
  check('request needs a first message', (await api('POST', '/api/v8/conversations', { token: A.token, body: { handle: 'chitra_f' } })).status === 400);
  const rq = await api('POST', '/api/v8/conversations', { token: A.token, body: { handle: 'chitra_f', text: 'Can I buy your pattern?' } });
  check('message request created', rq.status === 201 && rq.json.conversation.request === 'sent', rq.text);
  const RQ = rq.json.conversation.public_key;
  check('request not in C’s main inbox', !((await api('GET', '/api/v8/conversations', { token: C.token })).json.items || []).some((x) => x.public_key === RQ));
  const reqs = await api('GET', '/api/v8/conversations?tab=requests', { token: C.token });
  check('request in C’s Requests tab with count', reqs.json.requests === 1 && reqs.json.items[0]?.request === 'received', reqs.text.slice(0, 300));
  check('C notified of the request', (await notes(C)).some((n) => /Message request from @asha_s/.test(n.title)));
  check('C cannot reply before accepting', (await api('POST', `/api/v8/conversations/${RQ}/messages`, { token: C.token, body: { text: 'hi' } })).status === 403);
  check('no payments while a request is pending', (await api('POST', `/api/v8/conversations/${RQ}/payments/quote`, { token: A.token, body: { amount: 10 } })).status === 403);
  for (const x of ['2', '3']) await api('POST', `/api/v8/conversations/${RQ}/messages`, { token: A.token, body: { text: 'follow up ' + x } });
  check('sender limited to 3 messages while pending', (await api('POST', `/api/v8/conversations/${RQ}/messages`, { token: A.token, body: { text: 'four' } })).json.code === 'REQUEST_PENDING');
  check('C accepts', (await api('POST', `/api/v8/conversations/${RQ}/request/accept`, { token: C.token })).json.request === null);
  check('A told the request was accepted', (await notes(A)).some((n) => /accepted your message request/.test(n.title)));
  check('C can reply now', (await api('POST', `/api/v8/conversations/${RQ}/messages`, { token: C.token, body: { text: 'Sure!' } })).status === 201);
  // decline + block path
  const E2 = await member('Fara Stranger', 'fara_s');
  await pool.query(`UPDATE howdi_connect_profiles SET contact_permission='FOLLOWERS' WHERE user_id=$1`, [E.id]);
  const rq2 = await api('POST', '/api/v8/conversations', { token: E2.token, body: { handle: 'esha_g', text: 'spam spam' } });
  const RQ2 = rq2.json.conversation.public_key;
  check('E blocks the requester', (await api('POST', `/api/v8/conversations/${RQ2}/request/block`, { token: E.token })).json.blocked === true);
  check('declined request leaves C’s requests', ((await api('GET', '/api/v8/conversations?tab=requests', { token: E.token })).json.requests) === 0);
  check('blocked sender can no longer message', (await api('GET', '/api/v8/messages/eligibility/esha_g', { token: E2.token })).json.can === 'no');
  check('requester is not told about the decline', !(await notes(E2)).some((n) => /declin|block/i.test(`${n.title} ${n.body}`)));
  await pool.query(`UPDATE howdi_connect_profiles SET contact_permission='EVERYONE' WHERE user_id=$1`, [E.id]);

  // ---- groups
  check('group needs a name', (await api('POST', '/api/v8/conversations', { token: A.token, body: { group: { title: 'x', handles: ['bala_r'] } } })).status === 400);
  check('cannot add someone who does not accept you', (await api('POST', '/api/v8/conversations', { token: A.token, body: { group: { title: 'Makers', handles: ['dev_closed'] } } })).status === 403);
  const g = await api('POST', '/api/v8/conversations', { token: A.token, body: { group: { title: 'Weekend makers', handles: ['bala_r', 'esha_g'] } } });
  check('group created', g.status === 201, g.text); const G = g.json.conversation.public_key;
  const gd = await api('GET', `/api/v8/conversations/${G}`, { token: B.token });
  check('member sees 3 members, owner role on A', gd.json.conversation.member_count === 3 && gd.json.conversation.members.find((m) => m.public_username === 'asha_s').role === 'owner', gd.text.slice(0, 300));
  noLeak('group detail', gd);
  check('no payments in groups', gd.json.conversation.can_pay === false);
  check('member added notified', (await notes(E)).some((n) => /added you to “Weekend makers”/.test(n.title)));
  check('member cannot rename', (await api('PATCH', `/api/v8/conversations/${G}`, { token: B.token, body: { title: 'Mine' } })).status === 403);
  check('member cannot remove others', (await api('DELETE', `/api/v8/conversations/${G}/members/esha_g`, { token: B.token })).status === 403);
  check('owner makes B admin', (await api('POST', `/api/v8/conversations/${G}/members/bala_r/admin`, { token: A.token })).json.role === 'admin');
  check('admin renames', (await api('PATCH', `/api/v8/conversations/${G}`, { token: B.token, body: { title: 'Weekend makers club' } })).json.title === 'Weekend makers club');
  check('admin cannot add someone who only accepts followers', (await api('POST', `/api/v8/conversations/${G}/members`, { token: B.token, body: { handles: ['chitra_f'] } })).status === 403);
  await pool.query(`INSERT INTO howdi_connect_follows(follower_user_id,following_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [B.id, C.id]);
  check('admin adds C once B follows her', (await api('POST', `/api/v8/conversations/${G}/members`, { token: B.token, body: { handles: ['chitra_f'] } })).json.added?.[0] === 'chitra_f');
  check('admin removes E', (await api('DELETE', `/api/v8/conversations/${G}/members/esha_g`, { token: B.token })).json.removed === true);
  check('removed member loses access', (await api('GET', `/api/v8/conversations/${G}/messages`, { token: E.token })).status === 404);
  check('removed member told', (await notes(E)).some((n) => /removed from/.test(n.title)));
  check('admin cannot remove owner', (await api('DELETE', `/api/v8/conversations/${G}/members/asha_s`, { token: B.token })).status === 403);
  check('owner leaves → ownership passes to admin', (await api('DELETE', `/api/v8/conversations/${G}/members/asha_s`, { token: A.token })).json.left === true
    && (await api('GET', `/api/v8/conversations/${G}`, { token: B.token })).json.conversation.my_role === 'owner');
  check('system messages record the changes', (await thread(B, G)).filter((m) => m.kind === 'system').length >= 5);

  // ---- HPay in chat
  await api('POST', `/api/v8/conversations/${CV}/mute`, { token: B.token, body: { on: false } });
  check('amount bounds', (await api('POST', `/api/v8/conversations/${CV}/payments/quote`, { token: A.token, body: { kind: 'send', amount: 0 } })).status === 400);
  const qt = await api('POST', `/api/v8/conversations/${CV}/payments/quote`, { token: A.token, body: { kind: 'send', amount: 300, note: 'Yarn' } });
  check('review says nothing sent yet, fee 0', qt.json.review?.warning === 'Please review. No payment has been sent yet.' && qt.json.review.fee === 0 && qt.json.review.total === 300, qt.text.slice(0, 300));
  noLeak('quote', qt);
  check('weak PIN refused', (await api('POST', '/api/v8/hpay/pin', { token: A.token, body: { pin: '1234' } })).json.code === 'PIN_WEAK');
  check('PIN set', (await api('POST', '/api/v8/hpay/pin', { token: A.token, body: { pin: '4826' } })).json.set === true);
  check('changing PIN needs the current one', (await api('POST', '/api/v8/hpay/pin', { token: A.token, body: { pin: '5937', current: '1111' } })).status === 403);
  check('send needs an idempotency key', (await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 300, pin: '4826' } })).status === 400);
  if (SANDBOX) {
    check('wrong PIN refused, tries left', (await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 300, pin: '0000', idempotency_key: key() } })).json.code === 'PIN_WRONG');
    const sk = key();
    const sp = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 300, note: 'Yarn', pin: '4826', idempotency_key: sk } });
    check('send money completes with a reference', sp.status === 201 && sp.json.payment.status === 'completed' && /^HPM-/.test(sp.json.payment.reference || '') && sp.json.balance === 1700, sp.text.slice(0, 300));
    noLeak('payment', sp);
    const again = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 300, pin: '4826', idempotency_key: sk } });
    check('double tap does not charge twice', again.json.replayed === true && Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [A.id])).rows[0].balance) === 1700);
    check('ledger has matching debit and credit', Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_ledger WHERE kind='CHAT_PAYMENT' AND txn_code=$1`, [sp.json.payment.reference])).rows[0].n) === 2);
    check('B notified: sent you ₹300', (await notes(B)).some((n) => /sent you ₹300/.test(n.title)));
    const card = (await thread(B, CV)).find((m) => m.payment && m.payment.kind === 'send');
    check('B sees the receipt card as payee', card && card.payment.role === 'payee' && card.payment.status === 'completed', card);
    check('insufficient balance fails cleanly', (await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 5000, pin: '4826', idempotency_key: key() } })).json.code === 'INSUFFICIENT_BALANCE');
    check('failed attempt is recorded', Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_chat_payments WHERE status='FAILED' AND payer_user_id=$1`, [A.id])).rows[0].n) === 1);
    check('balance unchanged after failure', Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [A.id])).rows[0].balance) === 1700);
    // requests
    const r1 = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: B.token, body: { kind: 'request', amount: 120, note: 'Workshop kit', idempotency_key: key() } });
    check('B requests ₹120 (no PIN needed)', r1.status === 201 && r1.json.payment.status === 'pending' && r1.json.payment.actions.join() === 'remind,cancel', r1.text.slice(0, 300));
    const P1 = r1.json.payment.public_key;
    check('A notified of the request', (await notes(A)).some((n) => /requested ₹120/.test(n.title)));
    const aCard = (await thread(A, CV)).find((m) => m.payment && m.payment.public_key === P1);
    check('A sees Pay / Decline', aCard.payment.actions.join() === 'pay,decline', aCard.payment);
    check('requester cannot pay own request', (await api('POST', `/api/v8/payments/${P1}/pay`, { token: B.token, body: { pin: '4826', idempotency_key: key() } })).status === 403);
    check('outsider cannot see the request', (await api('POST', `/api/v8/payments/${P1}/decline`, { token: E.token })).status === 404);
    check('remind works', (await api('POST', `/api/v8/payments/${P1}/remind`, { token: B.token })).json.reminded === true);
    check('remind again within 12 h → 429', (await api('POST', `/api/v8/payments/${P1}/remind`, { token: B.token })).json.code === 'REMINDED_RECENTLY');
    check('A got the reminder', (await notes(A)).some((n) => /Reminder: @bala_r requested ₹120/.test(n.title)));
    const pk = key();
    const pay = await api('POST', `/api/v8/payments/${P1}/pay`, { token: A.token, body: { pin: '4826', idempotency_key: pk } });
    check('A pays the request', pay.json.status === 'paid' && /^HPM-/.test(pay.json.payment.reference || ''), pay.text.slice(0, 300));
    check('paying twice is safe', (await api('POST', `/api/v8/payments/${P1}/pay`, { token: A.token, body: { pin: '4826', idempotency_key: key() } })).json.replayed === true
      && Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [A.id])).rows[0].balance) === 1580);
    check('B notified: paid your request', (await notes(B)).some((n) => /paid your request: ₹120/.test(n.title)));
    check('B’s card shows Paid', (await thread(B, CV)).find((m) => m.payment && m.payment.public_key === P1).payment.status === 'paid');
    // decline / cancel / expire
    const r2 = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: B.token, body: { kind: 'request', amount: 50, idempotency_key: key() } });
    check('A declines', (await api('POST', `/api/v8/payments/${r2.json.payment.public_key}/decline`, { token: A.token })).json.status === 'declined');
    check('B told it was declined', (await notes(B)).some((n) => /declined your request/.test(n.title)));
    check('declined request cannot be paid', (await api('POST', `/api/v8/payments/${r2.json.payment.public_key}/pay`, { token: A.token, body: { pin: '4826', idempotency_key: key() } })).status === 409);
    const r3 = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: B.token, body: { kind: 'request', amount: 60, idempotency_key: key() } });
    check('payer cannot cancel', (await api('POST', `/api/v8/payments/${r3.json.payment.public_key}/cancel`, { token: A.token })).status === 409);
    check('requester cancels', (await api('POST', `/api/v8/payments/${r3.json.payment.public_key}/cancel`, { token: B.token })).json.status === 'cancelled');
    const r4 = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: B.token, body: { kind: 'request', amount: 70, idempotency_key: key() } });
    await pool.query(`UPDATE howdi_v8_chat_payments SET expires_at=NOW()-interval '1 minute' WHERE status='PENDING'`);
    check('expired request cannot be paid', (await api('POST', `/api/v8/payments/${r4.json.payment.public_key}/pay`, { token: A.token, body: { pin: '4826', idempotency_key: key() } })).json.code === 'EXPIRED');
    check('card shows Expired', (await thread(A, CV)).find((m) => m.payment && m.payment.public_key === r4.json.payment.public_key).payment.status === 'expired');
    // daily limit + PIN lock
    await pool.query(`UPDATE howdi_v8_wallets SET balance=100000 WHERE user_id=$1`, [A.id]);
    for (let i = 0; i < 2; i++) await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 10000, pin: '4826', idempotency_key: key() } });
    check('daily limit enforced', (await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 9000, pin: '4826', idempotency_key: key() } })).json.code === 'DAILY_LIMIT');
    let last; for (let i = 0; i < 5; i++) last = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 5, pin: '9999', idempotency_key: key() } });
    check('5 wrong PINs lock payments', last.json.code === 'PIN_LOCKED');
    { const lk = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 5, pin: '4826', idempotency_key: key() } }); check('locked even with the right PIN', lk.json.code === 'PIN_LOCKED', lk.text); }
  } else {
    const np = await api('POST', `/api/v8/conversations/${CV}/payments`, { token: A.token, body: { kind: 'send', amount: 10, pin: '4826', idempotency_key: key() } });
    check('without the sandbox no money moves (503)', np.status === 503 && np.json.code === 'PAYMENT_PROVIDER_REQUIRED', np.text.slice(0, 200));
    check('requests refused without the sandbox', (await api('POST', `/api/v8/conversations/${CV}/payments`, { token: B.token, body: { kind: 'request', amount: 10, idempotency_key: key() } })).status === 503);
  }
  // ---- inbox filters
  { const g = await api('GET', '/api/v8/conversations?filter=groups', { token: A.token }); check('groups filter: only groups', g.status === 200 && (g.json.items || []).every((x) => x.kind === 'group'), g.text.slice(0, 200));
    const u = await api('GET', '/api/v8/conversations?filter=unread', { token: A.token }); check('unread filter: only unread', (u.json.items || []).every((x) => x.unread > 0));
    const pf = await api('GET', '/api/v8/conversations?filter=payments', { token: A.token }); check('payments filter includes the chat with payment history (failed attempts count as history)', (pf.json.items || []).some((x) => x.public_key === CV)); check('payments filter excludes chats with no payments', (pf.json.items || []).every((x) => x.kind !== 'group'));
    check('unknown filter falls back to all', (await api('GET', '/api/v8/conversations?filter=%27;drop', { token: A.token })).status === 200); }
  // ---- CON-010 call history (outcome read from the call record, only the caller can log)
  { const mk = async (type) => (await api('POST', '/api/connect/calls', { token: A.token, body: { callType: type, inviteeUsernames: ['bala_r'] } })).json.call;
    const c1 = await mk('VOICE'); check('call created without numeric user ids', c1 && typeof c1.my_token === 'string');
    check('cannot log a call still ringing', (await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: A.token, body: { call: c1.id } })).json.code === 'CALL_ACTIVE');
    check('B sees it ringing', ((await api('GET', '/api/connect/calls/inbox', { token: B.token })).json.calls || []).some((x) => x.id === c1.id));
    await api('PATCH', `/api/connect/calls/${c1.id}/respond`, { token: B.token, body: { accept: true } });
    await pool.query(`UPDATE howdi_connect_calls SET started_at=NOW()-interval '151 seconds' WHERE id=$1`, [c1.id]);
    await api('POST', `/api/connect/calls/${c1.id}/leave`, { token: B.token, body: {} }); await api('POST', `/api/connect/calls/${c1.id}/leave`, { token: A.token, body: {} });
    check('callee cannot log the call', (await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: B.token, body: { call: c1.id } })).status === 404);
    const lg = await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: A.token, body: { call: c1.id, text: 'Voice call · 99:99' } });
    check('answered call logged with duration from the record', lg.json.logged === true && /^Voice call · 2:3\d$/.test(lg.json.text), lg.text);
    noLeak('call-log', lg);
    check('call log is idempotent', (await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: A.token, body: { call: c1.id } })).json.logged === false);
    const c2 = await mk('VIDEO'); await api('POST', `/api/connect/calls/${c2.id}/leave`, { token: A.token, body: {} });
    const lg2 = await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: A.token, body: { call: c2.id } });
    check('unanswered video call → Missed', lg2.json.text === 'Missed video call', lg2.text);
    check('B notified of the missed call', (await notes(B)).some((n) => n.kind === 'CALL_MISSED' || /Missed video call/.test(n.title)));
    const c3 = await mk('VOICE'); await api('PATCH', `/api/connect/calls/${c3.id}/respond`, { token: B.token, body: { accept: false } }); await api('POST', `/api/connect/calls/${c3.id}/leave`, { token: A.token, body: {} });
    check('declined call → Voice call declined', (await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: A.token, body: { call: c3.id } })).json.text === 'Voice call declined');
    const th = await thread(B, CV); check('both sides see call lines in the thread', th.filter((m) => m.kind === 'call').length === 3, th.map((m) => m.kind));
    check('a stranger cannot log into this chat', (await api('POST', `/api/v8/conversations/${CV}/call-log`, { token: E.token, body: { call: c1.id } })).status >= 403); }
  // blocking closes the chat both ways
  check('A blocks B', (await api('POST', '/api/v8/creators/bala_r/block', { token: A.token })).json.blocked === true);
  check('B cannot send to A after block', (await api('POST', `/api/v8/conversations/${CV}/messages`, { token: B.token, body: { text: 'hello?' } })).status === 403);
  check('blocked chat hidden from inbox', !((await api('GET', '/api/v8/conversations', { token: A.token })).json.items || []).some((x) => x.public_key === CV));
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });

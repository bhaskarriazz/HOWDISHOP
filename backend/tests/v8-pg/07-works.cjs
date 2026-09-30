// V8 Works booking journey — real PostgreSQL, both sides: find → profile → slots → quote → book (HPay hold, or pay after the
// job without the sandbox) → worker sees NO private data → accept → consent per field (release logged) → en route → arrived →
// customer sees the PIN, worker enters it (lockout) → complete → confirm (payment released) → review + response → earnings,
// payout. Also decline, request expiry, consent expiry, consent withdrawal, cancel, issue, chat gating, save, report, block,
// hours → slots, double-booking of a slot, outsiders, and no internal ids anywhere.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 07 works (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|mobile|uuid|work_order_id|worker_id|wid|wuid|uid)"\s*:/;
const noKeys = (label, r) => check(`${label}: no internal id keys`, !FORBIDDEN.test(r.text || ''), (r.text.match(FORBIDDEN) || [])[0]);
const key = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const ADDRESS = 'Flat 4B, Sai Residency, 2nd Lane'; const PHONE = '9876501234';

(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const C = await K.member('Chitra Customer', { username: 'chitra_c' }); const X = await K.member('Xen Other', { username: 'xen_o' });
  const WU = await K.member('Ravi Worker', { username: 'ravi_w' });
  const W = await K.worker(WU, { code: 'WRK-RAVI-T1' });
  await pool.query(`UPDATE works_workers SET starting_price=500, availability_status='online', user_id=$2 WHERE id=$1`, [W.id, WU.id]);
  // every day 00:00–24:00 so a slot always exists whatever time the suite runs
  const secrets = [C, X, WU].flatMap((m) => [String(m.id), m.howdi, m.email, m.phone]).concat([String(W.id)]);
  const noLeak = (label, r) => { noKeys(label, r); const t = r.text || ''; const hit = secrets.filter((x) => x && String(x).length > 3 && t.includes(`"${x}"`)); check(`${label}: no internal id values`, hit.length === 0, hit); };
  const svcCode = (await pool.query(`SELECT s.service_code FROM works_worker_services x JOIN works_services s ON s.id=x.service_id WHERE x.worker_id=$1`, [W.id])).rows[0].service_code;
  const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
  const bal = async (m) => (await api('GET', '/api/v8/hpay/history', { token: m.token })).json.balance;

  // ---------------- worker sets hours (all week, all day) → slots
  const hrs = await api('PUT', '/api/v8/works/worker/hours', { token: WU.token, body: { hours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, start_min: 0, end_min: 1440 })) } });
  check('worker saves hours', hrs.status === 200 && hrs.json.hours.length === 7, hrs.text.slice(0, 200));
  check('non-worker cannot use worker API', (await api('GET', '/api/v8/works/worker/jobs', { token: C.token })).json.code === 'NOT_A_WORKER');

  // ---------------- discovery
  const list = await api('GET', `/api/v8/works/workers?service=${svcCode}`, { token: C.token });
  const card = (list.json.items || []).find((x) => x.ref === 'WRK-RAVI-T1');
  check('worker listed with @handle, service, price', card && card.person.public_username === 'ravi_w' && card.price_from === 500 && card.verified, list.text.slice(0, 300));
  noLeak('worker list', list);
  const prof = await api('GET', '/api/v8/works/workers/@ravi_w', { token: C.token });
  check('profile by @handle', prof.json.worker?.ref === 'WRK-RAVI-T1' && Array.isArray(prof.json.worker.histogram), prof.text.slice(0, 200));
  const sl = await api('GET', '/api/v8/works/workers/WRK-RAVI-T1/slots?days=3', { token: C.token });
  const open = sl.json.days.flatMap((d) => d.slots).filter((s) => s.state === 'available');
  check('slots available (IST)', open.length > 5 && /IST/.test(sl.json.timezone));
  const S1 = open[0].starts_at, S2 = open[2].starts_at, S3 = open[4].starts_at, S4 = open[6].starts_at, S5 = open[8].starts_at, S6 = open[10].starts_at;
  const base = { worker: 'WRK-RAVI-T1', service: svcCode, area: 'Wyra Road, Khammam', summary: 'Kitchen tap leaking, needs a washer', private: { name: 'Chitra', address: ADDRESS, landmark: 'Opp. temple', pincode: '507001', phone: PHONE, notes: 'Gate code 1234' } };
  const method = SANDBOX ? 'hpay' : 'after_job';
  if (SANDBOX) await api('POST', '/api/v8/hpay/pin', { token: C.token, body: { pin: '4826' } });
  await api('POST', '/api/v8/hpay/pin', { token: WU.token, body: { pin: '7391' } });
  const book = (starts, extra = {}) => api('POST', '/api/v8/works/bookings', { token: C.token, body: { ...base, starts_at: starts, method, pin: '4826', idempotency_key: key(), ...extra } });

  const q = await api('POST', '/api/v8/works/bookings/quote', { token: C.token, body: { ...base, starts_at: S1, method } });
  check('quote lists what is shared before acceptance vs private', q.json.review?.amount === 500 && q.json.review.private_until_consent.includes('Exact address'), q.text.slice(0, 300));
  check('phone number in the public summary refused', (await book(S1, { summary: 'call me 9876501234' })).json.code === 'PRIVATE_IN_PUBLIC');
  check('address required', (await book(S1, { private: { address: '' } })).status === 400);
  if (!SANDBOX) check('HPay without sandbox → 503', (await book(S1, { method: 'hpay' })).json.code === 'PAYMENT_PROVIDER_REQUIRED');
  const c0 = SANDBOX ? await bal(C) : null;
  const k1 = key();
  const b1 = await api('POST', '/api/v8/works/bookings', { token: C.token, body: { ...base, starts_at: S1, method, pin: '4826', idempotency_key: k1 } });
  check('booking requested', b1.status === 201 && b1.json.booking.state === 'requested' && /^BKG-[0-9A-F]{12}$/.test(b1.json.booking.public_key), b1.text.slice(0, 300));
  noLeak('booking create', b1);
  const B1 = b1.json.booking.public_key;
  check('same key replays (no second booking or charge)', (await api('POST', '/api/v8/works/bookings', { token: C.token, body: { ...base, starts_at: S1, method, pin: '4826', idempotency_key: k1 } })).json.replayed === true);
  if (SANDBOX) check('HPay held ₹500', (await bal(C)) === c0 - 500 && b1.json.booking.payment.state === 'held');
  check('slot now taken for others', (await api('POST', '/api/v8/works/bookings', { token: X.token, body: { ...base, starts_at: S1, method: 'after_job', idempotency_key: key() } })).json.code === 'SLOT_TAKEN');
  check('worker notified of the job', (await notes(WU)).some((n) => /New job request/.test(n.title)));

  // ---------------- worker sees nothing private before consent
  const offers = await api('GET', '/api/v8/works/worker/jobs?tab=offers', { token: WU.token });
  check('offer in worker inbox', (offers.json.items || []).some((x) => x.public_key === B1));
  const wv = await api('GET', `/api/v8/works/bookings/${B1}`, { token: WU.token });
  check('before acceptance: no address, phone, name or notes', wv.json.booking.private.hidden === true && !wv.text.includes(ADDRESS) && !wv.text.includes(PHONE) && !wv.text.includes('Gate code') && !wv.text.includes('chitra_c') && wv.json.booking.area === 'Wyra Road, Khammam', wv.text.slice(0, 400));
  noLeak('worker view', wv);
  check('outsider cannot see the booking', (await api('GET', `/api/v8/works/bookings/${B1}`, { token: X.token })).status === 404);
  check('customer cannot accept', (await api('POST', `/api/v8/works/bookings/${B1}/accept`, { token: C.token })).status === 403);
  const acc = await api('POST', `/api/v8/works/bookings/${B1}/accept`, { token: WU.token });
  check('worker accepts → awaiting consent', acc.json.booking?.state === 'accepted' && acc.json.booking.private.hidden === true && !acc.text.includes(ADDRESS), acc.text.slice(0, 200));
  check('customer told to consent', (await notes(C)).some((n) => /accepted your request/.test(n.title)));
  check('chat closed before consent', (await api('GET', `/api/v8/works/bookings/${B1}/messages`, { token: C.token })).json.code === 'CHAT_CLOSED');
  check('consent without address refused', (await api('POST', `/api/v8/works/bookings/${B1}/consent`, { token: C.token, body: { fields: ['phone'] } })).json.code === 'ADDRESS_REQUIRED');
  const cs = await api('POST', `/api/v8/works/bookings/${B1}/consent`, { token: C.token, body: { fields: ['address', 'phone'] } });
  check('customer consents to address + phone → confirmed', cs.json.booking?.state === 'confirmed' && cs.json.booking.consent.status === 'given', cs.text.slice(0, 200));
  const wv2 = await api('GET', `/api/v8/works/bookings/${B1}`, { token: WU.token });
  check('worker now sees address + phone only (not name, notes)', wv2.text.includes('Sai Residency') && wv2.json.booking.private.contact_number === PHONE && !wv2.text.includes('Gate code') && wv2.json.booking.customer.label === 'HOWDI customer', wv2.text.slice(0, 400));
  check('release is logged', Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_works_release_log`)).rows[0].n) >= 1);
  check('worker notified of confirmation', (await notes(WU)).some((n) => /Booking confirmed/.test(n.title)));
  // chat
  check('customer messages worker', (await api('POST', `/api/v8/works/bookings/${B1}/messages`, { token: C.token, body: { text: 'Please bring a spanner' } })).status === 201);
  check('worker sees the message', ((await api('GET', `/api/v8/works/bookings/${B1}/messages`, { token: WU.token })).json.items || []).some((x) => x.text === 'Please bring a spanner' && x.from === 'customer'));
  // journey + PIN
  check('no PIN before arrival', !(await api('GET', `/api/v8/works/bookings/${B1}`, { token: C.token })).json.booking.job_pin);
  check('cannot jump to arrived', (await api('POST', `/api/v8/works/bookings/${B1}/stage`, { token: WU.token, body: { stage: 'arrived' } })).json.code === 'INVALID_STATE');
  check('en route', (await api('POST', `/api/v8/works/bookings/${B1}/stage`, { token: WU.token, body: { stage: 'en_route' } })).json.booking?.state === 'en_route');
  check('arrived', (await api('POST', `/api/v8/works/bookings/${B1}/stage`, { token: WU.token, body: { stage: 'arrived' } })).json.booking?.state === 'arrived');
  const cv = await api('GET', `/api/v8/works/bookings/${B1}`, { token: C.token }); const PIN = cv.json.booking.job_pin?.pin;
  check('customer sees 4-digit PIN after arrival', /^\d{4}$/.test(PIN || ''), cv.text.slice(0, 200));
  check('worker never receives the PIN', !(await api('GET', `/api/v8/works/bookings/${B1}`, { token: WU.token })).text.includes(`"${PIN}"`));
  check('customer cannot enter the PIN', (await api('POST', `/api/v8/works/bookings/${B1}/pin`, { token: C.token, body: { pin: PIN } })).status === 403);
  const wrong = await api('POST', `/api/v8/works/bookings/${B1}/pin`, { token: WU.token, body: { pin: PIN === '0000' ? '1111' : '0000' } });
  check('wrong PIN counted', wrong.json.code === 'PIN_WRONG' && /4 tries left/.test(wrong.json.message), wrong.text);
  check('right PIN starts the job', (await api('POST', `/api/v8/works/bookings/${B1}/pin`, { token: WU.token, body: { pin: PIN } })).json.booking?.state === 'in_progress');
  check('PIN no longer shown once used', (await api('GET', `/api/v8/works/bookings/${B1}`, { token: C.token })).json.booking.job_pin?.pin === null);
  check('worker completes', (await api('POST', `/api/v8/works/bookings/${B1}/complete`, { token: WU.token })).json.booking?.state === 'completed');
  check('customer asked to confirm', (await notes(C)).some((n) => /please confirm/.test(n.title)));
  const w0 = SANDBOX ? (await api('GET', '/api/v8/works/worker/earnings', { token: WU.token })).json.summary.available : 0;
  const cf = await api('POST', `/api/v8/works/bookings/${B1}/confirm`, { token: C.token });
  check('customer confirms → closed', cf.json.booking?.state === 'closed' && cf.json.booking.payment.state === (SANDBOX ? 'released' : 'offline'), cf.text.slice(0, 200));
  const earn = await api('GET', '/api/v8/works/worker/earnings', { token: WU.token });
  if (SANDBOX) check('worker gets ₹450 (after 10% fee)', earn.json.summary.available === w0 + 450 && earn.json.entries.some((e) => e.kind === 'earning' && e.booking === B1), earn.text.slice(0, 300));
  else check('pay-after-job recorded as paid directly', earn.json.summary.paid_directly === 500, earn.text.slice(0, 200));
  noLeak('earnings', earn);
    const rv = await api('POST', `/api/v8/works/bookings/${B1}/review`, { token: C.token, body: { rating: 5, text: 'Quick and tidy' } });
  check('customer reviews', rv.json.booking?.review?.rating === 5, rv.text.slice(0, 200));
  check('only one review', (await api('POST', `/api/v8/works/bookings/${B1}/review`, { token: C.token, body: { rating: 1 } })).json.code === 'ALREADY_REVIEWED');
  check('worker responds', (await api('POST', `/api/v8/works/bookings/${B1}/review/respond`, { token: WU.token, body: { text: 'Thank you!' } })).json.booking?.review?.response === 'Thank you!');
  { const pr = await api('GET', '/api/v8/works/workers/WRK-RAVI-T1', { token: X.token }); check('review + response on the public profile', pr.json.worker.review_list.some((r) => r.text === 'Quick and tidy' && r.response === 'Thank you!') && pr.json.worker.rating === 5); }
  check('booking appears under Completed', ((await api('GET', '/api/v8/works/bookings?tab=completed', { token: C.token })).json.items || []).some((x) => x.public_key === B1));

  // ---------------- decline (refund) and expiries
  const b2 = await book(S2); const B2 = b2.json.booking.public_key; const c2 = SANDBOX ? await bal(C) : 0;
  const dc = await api('POST', `/api/v8/works/bookings/${B2}/decline`, { token: WU.token, body: { reason: 'Out of town that day' } });
  check('worker declines → refunded', dc.json.booking?.state === 'declined' && (!SANDBOX || (await bal(C)) === c2 + 500), dc.text.slice(0, 200));
  check('customer told of the decline', (await notes(C)).some((n) => /can’t take this job/.test(n.title)));
  const b3 = await book(S3); const B3 = b3.json.booking.public_key;
  await pool.query(`UPDATE howdi_v8_works_bookings SET requested_at=NOW()-interval '31 minutes' WHERE state='REQUESTED'`);
  check('unanswered request expires on read', (await api('GET', `/api/v8/works/bookings/${B3}`, { token: C.token })).json.booking.state === 'expired');
  const b4 = await book(S4); const B4 = b4.json.booking.public_key; await api('POST', `/api/v8/works/bookings/${B4}/accept`, { token: WU.token });
  await pool.query(`UPDATE howdi_v8_works_bookings SET consent_due=NOW()-interval '1 minute' WHERE state='ACCEPTED'`);
  check('consent not given in time → expired', (await api('GET', `/api/v8/works/bookings/${B4}`, { token: WU.token })).json.booking.state === 'expired');
  // withdraw after confirm → details gone for the worker
  const b5 = await book(S5); const B5 = b5.json.booking.public_key; await api('POST', `/api/v8/works/bookings/${B5}/accept`, { token: WU.token });
  await api('POST', `/api/v8/works/bookings/${B5}/consent`, { token: C.token, body: { fields: ['address', 'name'] } });
  check('with name consent the worker sees the name + @handle', (await api('GET', `/api/v8/works/bookings/${B5}`, { token: WU.token })).json.booking.customer.handle === 'chitra_c');
  const wd = await api('POST', `/api/v8/works/bookings/${B5}/consent/withdraw`, { token: C.token });
  check('consent withdrawn → cancelled', wd.json.booking?.state === 'cancelled' && wd.json.booking.consent.status === 'withdrawn', wd.text.slice(0, 200));
  check('worker can no longer read the address', !(await api('GET', `/api/v8/works/bookings/${B5}`, { token: WU.token })).text.includes('Sai Residency'));
  // PIN lockout + issue
  const b6 = await book(S6); const B6 = b6.json.booking.public_key; await api('POST', `/api/v8/works/bookings/${B6}/accept`, { token: WU.token });
  await api('POST', `/api/v8/works/bookings/${B6}/consent`, { token: C.token, body: { fields: ['address'] } });
  await api('POST', `/api/v8/works/bookings/${B6}/stage`, { token: WU.token, body: { stage: 'en_route' } }); await api('POST', `/api/v8/works/bookings/${B6}/stage`, { token: WU.token, body: { stage: 'arrived' } });
  const P6 = (await api('GET', `/api/v8/works/bookings/${B6}`, { token: C.token })).json.booking.job_pin.pin; const bad = P6 === '9999' ? '8888' : '9999';
  let lk; for (let i = 0; i < 5; i++) lk = await api('POST', `/api/v8/works/bookings/${B6}/pin`, { token: WU.token, body: { pin: bad } });
  check('5 wrong PINs lock the job', lk.json.code === 'PIN_LOCKED');
  check('even the right PIN is refused while locked', (await api('POST', `/api/v8/works/bookings/${B6}/pin`, { token: WU.token, body: { pin: P6 } })).json.code === 'PIN_LOCKED');
  check('customer told about the lock', (await notes(C)).some((n) => /PIN locked/.test(n.title)));
  const is = await api('POST', `/api/v8/works/bookings/${B6}/issue`, { token: C.token, body: { reason: 'safety', details: 'Did not recognise the person' } });
  check('customer reports an issue → disputed, payment on hold', is.json.booking?.state === 'disputed' && (!SANDBOX || is.json.booking.payment.state === 'held'), is.text.slice(0, 200));

  // ---------------- saved, report, block
  check('save worker', (await api('POST', '/api/v8/works/workers/WRK-RAVI-T1/save', { token: X.token })).json.saved === true);
  check('saved list', ((await api('GET', '/api/v8/works/saved', { token: X.token })).json.items || []).some((w) => w.ref === 'WRK-RAVI-T1'));
  check('cannot save yourself', (await api('POST', '/api/v8/works/workers/WRK-RAVI-T1/save', { token: WU.token })).json.code === 'SELF');
  check('report worker', (await api('POST', '/api/v8/works/workers/WRK-RAVI-T1/report', { token: X.token, body: { reason: 'overcharging', details: 'Asked for extra cash' } })).json.reported === true);
  check('block worker', (await api('POST', '/api/v8/works/workers/WRK-RAVI-T1/block', { token: X.token })).json.blocked === true);
  check('blocked worker hidden from results and profile', !((await api('GET', '/api/v8/works/workers', { token: X.token })).json.items || []).some((w) => w.ref === 'WRK-RAVI-T1') && (await api('GET', '/api/v8/works/workers/WRK-RAVI-T1', { token: X.token })).status === 404);
  check('blocked → cannot book', (await api('POST', '/api/v8/works/bookings', { token: X.token, body: { ...base, starts_at: open[12].starts_at, method: 'after_job', idempotency_key: key() } })).status === 404);

  // ---------------- hours → slots, status, payouts
  check('worker goes offline', (await api('POST', '/api/v8/works/worker/status', { token: WU.token, body: { status: 'offline' } })).json.status === 'offline');
  await api('PUT', '/api/v8/works/worker/hours', { token: WU.token, body: { hours: [] } });
  check('no hours → no bookable slots', (await api('GET', '/api/v8/works/workers/WRK-RAVI-T1/slots', { token: C.token })).json.days.every((d) => !d.slots.some((s) => s.state === 'available')));
  if (SANDBOX) {
    check('payout above available refused', (await api('POST', '/api/v8/works/worker/payouts', { token: WU.token, body: { amount: 999999, pin: '7391', idempotency_key: key() } })).json.code === 'INSUFFICIENT_BALANCE');
    const kp = key(); const po = await api('POST', '/api/v8/works/worker/payouts', { token: WU.token, body: { amount: 400, pin: '7391', idempotency_key: kp } });
    check('payout starts (processing)', po.status === 201 && po.json.payout.status === 'processing', po.text.slice(0, 200));
    check('payout replay', (await api('POST', '/api/v8/works/worker/payouts', { token: WU.token, body: { amount: 400, pin: '7391', idempotency_key: kp } })).json.replayed === true);
    await pool.query(`UPDATE howdi_v8_works_payouts SET settle_at=NOW()-interval '1 second'`);
    check('payout settles to paid', (await api('GET', '/api/v8/works/worker/earnings', { token: WU.token })).json.payouts[0].status === 'paid');
  }
  const me = await api('GET', '/api/v8/works/worker/me', { token: WU.token });
  check('worker dashboard summary', me.json.worker?.live === true && me.json.worker.person.public_username === 'ravi_w', me.text.slice(0, 200));
  noLeak('worker me', me);
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });

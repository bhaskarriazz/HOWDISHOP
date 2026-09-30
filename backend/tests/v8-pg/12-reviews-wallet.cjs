// V8 product reviews (verified buyers, rating + comment, seller reply), wishlist, HPay add-money (Preview/Test) + history, profile picture.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 12 reviews + wallet (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|uuid|order_id|product_id|phone)"\s*:/;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const B = await K.member('Rani Buyer', { username: 'rani_buys' }); const S = await K.member('Sita Seller', { username: 'sita_sells' }); const X = await K.member('Other', { username: 'other_x' });
  const V = await K.vendor(S, { business: 'Sita Crafts' }); await pool.query(`UPDATE vendor_profiles SET kyc_status='verified', status='active', store_status='online' WHERE id=$1`, [V.id]);
  const P = await K.product(V, 'Macrame wall hanging', { stock: 5 }); await pool.query(`UPDATE vendor_products SET price=400, mrp=450 WHERE id=$1`, [P.id]);
  const C = ((await api('GET', '/api/search?q=Macrame&types=product', { token: B.token })).json.results || [])[0]?.route?.split('/').pop();
  const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
  // wishlist
  check('wishlist needs sign-in', (await api('POST', '/api/v8/shop/wishlist', { body: { product: C } })).status === 401);
  await api('POST', '/api/v8/shop/wishlist', { token: B.token, body: { product: C } }); await api('POST', '/api/v8/shop/wishlist', { token: B.token, body: { product: C } });
  const wl = await api('GET', '/api/v8/shop/wishlist', { token: B.token });
  check('saved once, listed with code, no ids', wl.json.items?.length === 1 && wl.json.items[0].public_key === C && !FORBIDDEN.test(wl.text), wl.text.slice(0, 200));
  check('product shows saved=true', (await api('GET', `/api/v8/shop/products/${C}`, { token: B.token })).json.saved === true);
  await api('DELETE', '/api/v8/shop/wishlist', { token: B.token, body: { product: C } });
  check('removed', (await api('GET', '/api/v8/shop/wishlist', { token: B.token })).json.items.length === 0);
  // reviews
  check('non-buyer cannot review', (await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: X.token, body: { rating: 5 } })).json.code === 'VERIFIED_BUYER_ONLY');
  check('seller cannot review own product', (await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: S.token, body: { rating: 5 } })).json.code === 'OWN_PRODUCT');
  await api('POST', '/api/v8/shop/cart', { token: B.token, body: { product: C, qty: 1 } });
  const ad = await api('POST', '/api/v8/shop/addresses', { token: B.token, body: { name: 'Rani', phone: '9876500001', line1: '1-2 Main Rd', city: 'Khammam', state: 'Telangana', pin_code: '507001' } });
  const co = await api('POST', '/api/v8/shop/checkout', { token: B.token, body: { address: ad.json.saved.key, method: 'cod', idempotency_key: 'rv' + Date.now() } }); const O = co.json.orders?.[0]?.public_key;
  check('order placed', /^ORD-/.test(O || ''), co.text.slice(0, 200));
  check('cannot review before delivery', (await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: B.token, body: { rating: 4 } })).json.code === 'VERIFIED_BUYER_ONLY');
  for (const a of ['accept', 'pack']) await api('POST', `/api/v8/vendor/orders/${O}/${a}`, { token: S.token });
  await api('POST', `/api/v8/vendor/orders/${O}/ship`, { token: S.token, body: { courier: 'DTDC', tracking: 'D1234567' } }); await api('POST', `/api/v8/vendor/orders/${O}/deliver`, { token: S.token });
  { const r9 = await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: B.token, body: { rating: 9 } }); const od = await api('GET', `/api/v8/shop/orders/${O}`, { token: B.token }); check('rating required 1–5', r9.json.code === 'RATING_REQUIRED', r9.text + ' state=' + od.json.order?.state); }
  const rv = await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: B.token, body: { rating: 4, body: 'Lovely knots, a little smaller than I expected.' } });
  check('verified buyer reviews; seller notified', rv.json.saved === true && (await notes(S)).some((n) => /New 4★ review/.test(n.title)));
  await api('POST', `/api/v8/shop/products/${C}/reviews`, { token: B.token, body: { rating: 5, body: 'Lovely knots! Size is as listed.' } });
  const list = await api('GET', `/api/v8/shop/products/${C}/reviews`);
  check('edit keeps one review; summary 5.0 from 1; @handle only', list.json.summary?.count === 1 && list.json.summary.average === 5 && list.json.items[0].author.public_username === 'rani_buys' && list.json.items[0].edited === true && !FORBIDDEN.test(list.text), list.text.slice(0, 300));
  check('product page carries the rating', (await api('GET', `/api/v8/shop/products/${C}`)).json.product.rating.average === 5);
  check('only the seller can reply', (await api('POST', `/api/v8/shop/products/${C}/reviews/rani_buys/reply`, { token: X.token, body: { body: 'hi' } })).json.code === 'SELLER_ONLY');
  await api('POST', `/api/v8/shop/products/${C}/reviews/rani_buys/reply`, { token: S.token, body: { body: 'Thank you, Rani! Hang it away from direct sun.' } });
  const l2 = await api('GET', `/api/v8/shop/products/${C}/reviews`, { token: S.token });
  check('reply shown under the review; buyer notified', l2.json.items[0].reply?.store === 'Sita Crafts' && l2.json.is_seller === true && (await notes(B)).some((n) => /replied to your review/.test(n.title)));
  await api('DELETE', `/api/v8/shop/products/${C}/reviews`, { token: B.token });
  check('buyer can delete own review', (await api('GET', `/api/v8/shop/products/${C}/reviews`)).json.summary.count === 0);
  // wallet
  if (SANDBOX) {
    const b0 = (await api('GET', '/api/v8/hpay/history', { token: B.token })).json.balance;
    check('add-money limits', (await api('POST', '/api/v8/hpay/add-money', { token: B.token, body: { amount: 50, idem_key: 'a0' } })).json.code === 'AMOUNT');
    const t1 = await api('POST', '/api/v8/hpay/add-money', { token: B.token, body: { amount: 500, idem_key: 'a1' } });
    const t2 = await api('POST', '/api/v8/hpay/add-money', { token: B.token, body: { amount: 500, idem_key: 'a1' } });
    check('added once (idempotent)', t1.json.balance === b0 + 500 && t2.json.replayed === true && t2.json.balance === b0 + 500, t1.text + t2.text);
    const h = await api('GET', '/api/v8/hpay/history', { token: B.token });
    check('history labels the top-up', h.json.items?.[0]?.label === 'Added money' && h.json.sandbox === true);
  } else check('add-money refused without sandbox', (await api('POST', '/api/v8/hpay/add-money', { token: B.token, body: { amount: 500, idem_key: 'a1' } })).json.code === 'PAYMENT_PROVIDER_REQUIRED');
  // profile picture
  check('avatar: bad data refused', (await api('POST', '/api/v8/me/avatar', { token: B.token, body: { imageData: 'data:text/plain;base64,aGk=' } })).status === 400);
  const av = await api('POST', '/api/v8/me/avatar', { token: B.token, body: { imageData: PNG } });
  check('avatar uploaded → shown on my identity', /^\/api\/v8\/media\//.test(av.json.avatar_url || '') && (await api('GET', '/api/v8/me/avatar', { token: B.token })).json.me?.avatar_url === av.json.avatar_url, av.text.slice(0, 200));
  const dl = await api('DELETE', '/api/v8/me/avatar', { token: B.token }); check('avatar delete ok', dl.status === 200, dl.status + dl.text);
  { const ar = await api('GET', '/api/v8/me/avatar', { token: B.token }); check('avatar removed', ar.json.me?.avatar_url === null, ar.text); }
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });

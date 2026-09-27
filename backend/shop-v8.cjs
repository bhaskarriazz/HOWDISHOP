'use strict';
// =====================================================================================
// HOWDI V8 — SHOP purchase journey, both sides (register SHP product → cart → checkout → order, VND order handling, returns).
// Built on the existing commerce tables (orders / order_items with vendor_profile_id + fulfillment_status / order_returns)
// plus a V8 cart + saved addresses. One order per vendor (a cart with two stores becomes two orders).
//   Buyer:  GET /api/v8/shop/products/{PRD} · GET|POST|PATCH|DELETE /api/v8/shop/cart · GET|POST /api/v8/shop/addresses
//           POST /api/v8/shop/checkout/quote · POST /api/v8/shop/checkout {address, method: hpay|cod, pin, idempotency_key}
//           GET /api/v8/shop/orders?tab= · GET /api/v8/shop/orders/{ORD} · POST …/{ORD}/cancel · POST …/{ORD}/return
//   Vendor: GET /api/v8/vendor/orders?tab=new|active|done|returns · POST /api/v8/vendor/orders/{ORD}/accept|reject|pack|ship|deliver
//           POST /api/v8/vendor/returns/{RTN}/approve|reject|received
// Money (Preview/Test HPay): paid at checkout and held; released to the vendor minus 8% commission on delivery; refunded on
// cancel / vendor reject / completed return. COD records payment on delivery. Stock is reserved atomically at checkout and
// restored on cancel / reject / return. Idempotent checkout. The buyer's address and phone reach the vendor only after the
// vendor accepts the order. Session-only actor; public codes (PRD / ORD / RTN) only.
// =====================================================================================
const crypto = require('node:crypto');
const COMMISSION = 0.08, FREE_SHIP = 499, SHIP_FEE = 49, RETURN_DAYS = 7;
const CANCEL_REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery is too slow', 'Other'];
const RETURN_REASONS = { damaged: 'Arrived damaged', wrong: 'Wrong item sent', not_as_described: 'Not as described', size: 'Size or fit issue', other: 'Other' };

function createShopV8(deps) {
  const { pool, getBody, notify, wallet, sandboxEnabled, issuePublicRefs, resolvePublicRef } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { viewer, limited, ok, fail, blockedSql } = H;
  const { issue, resolve, checkPin, line, text, iso, money } = M;

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_cart(user_id BIGINT NOT NULL, product_id BIGINT NOT NULL, qty INT NOT NULL CHECK (qty BETWEEN 1 AND 20), added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, product_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_addresses(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, name VARCHAR(80) NOT NULL, phone VARCHAR(10) NOT NULL, line1 VARCHAR(200) NOT NULL, line2 VARCHAR(200), landmark VARCHAR(120), city VARCHAR(60) NOT NULL, state VARCHAR(60) NOT NULL, pincode VARCHAR(6) NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_shop_orders(order_id UUID PRIMARY KEY, vendor_profile_id BIGINT NOT NULL, buyer_user_id BIGINT NOT NULL, state VARCHAR(12) NOT NULL, method VARCHAR(4) NOT NULL,
      pay_state VARCHAR(10) NOT NULL, amount NUMERIC(12,2) NOT NULL, commission NUMERIC(12,2) NOT NULL, hold_txn VARCHAR(24), release_txn VARCHAR(24), refund_txn VARCHAR(24), courier VARCHAR(60), tracking VARCHAR(60),
      reason VARCHAR(300), group_key VARCHAR(64), idem_key VARCHAR(64), placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_at TIMESTAMPTZ, packed_at TIMESTAMPTZ, shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, closed_at TIMESTAMPTZ)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_shop_orders_vendor ON howdi_v8_shop_orders(vendor_profile_id, placed_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_shop_orders_buyer ON howdi_v8_shop_orders(buyer_user_id, placed_at DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_shop_events(id BIGSERIAL PRIMARY KEY, order_id UUID NOT NULL, actor VARCHAR(8) NOT NULL, event VARCHAR(24) NOT NULL, note VARCHAR(300), at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_checkout_idem(user_id BIGINT NOT NULL, idem_key VARCHAR(64) NOT NULL, group_key VARCHAR(64), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, idem_key))`);
  }
  const PUB = `p.status='published' AND p.archived_at IS NULL AND (p.published_at IS NULL OR p.published_at<=NOW()) AND COALESCE(v.status,'active')='active' AND LOWER(COALESCE(v.kyc_status,''))='verified'`;
  const prdCode = async (id) => (await issuePublicRefs('PRODUCT', [String(id)])).get(String(id));
  const ordCode = async (id) => (await issue('SORD', [id])).get(String(id));
  const resolveKey = async (code, type, prefix) => { if (!new RegExp(`^${prefix}-[0-9A-F]{12}$`).test(String(code || ''))) return null; const r = (await pool.query(`SELECT entity_key FROM howdi_v8_refs2 WHERE public_code=$1 AND entity_type=$2`, [code, type])).rows[0]; return r ? String(r.entity_key) : null; };
  const rtnCode = async (id) => (await issue('SRET', [id])).get(String(id));
  const img = (p) => { let a = p.image_urls; if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = []; } } return (Array.isArray(a) ? a : []).find((u) => /^(\/api\/v8\/media\/|https:\/\/)/.test(String(u))) || null; };
  const ev = (oid, actor, e, note) => pool.query(`INSERT INTO howdi_v8_shop_events(order_id,actor,event,note) VALUES($1,$2,$3,$4)`, [oid, actor, e, note ? line(note, 300) : null]);
  async function productByCode(code, vid) {
    const ref = await resolvePublicRef(String(code || ''), ['PRODUCT']); if (!ref) return null;
    return (await pool.query(`SELECT p.*, v.business_name store, v.user_id vendor_uid, v.city store_city FROM vendor_products p JOIN vendor_profiles v ON v.id=p.vendor_profile_id WHERE p.id::text=$1 AND ${PUB} AND NOT (${blockedSql('$2::bigint', 'v.user_id')})`, [String(ref.entity_key), vid || 0])).rows[0] || null;
  }
  async function productDto(p) { return { public_key: await prdCode(p.id), name: p.name, category: p.category, description: p.short_description || null, price: money(p.price), mrp: money(p.mrp), stock: Number(p.stock) || 0, in_stock: Number(p.stock) > 0, image_url: img(p), store: { name: p.store, city: p.store_city }, returns: `${RETURN_DAYS}-day returns`, delivery: `Free delivery over ₹${FREE_SHIP}` }; }
  async function cartOf(vid) {
    const rows = (await pool.query(`SELECT c.qty, p.*, v.business_name store, v.id vid2 FROM howdi_v8_cart c JOIN vendor_products p ON p.id=c.product_id JOIN vendor_profiles v ON v.id=p.vendor_profile_id WHERE c.user_id=$1 ORDER BY c.added_at`, [vid])).rows;
    const items = []; for (const r of rows) { const live = r.status === 'published' && !r.archived_at; items.push({ product: await prdCode(r.id), name: r.name, image_url: img(r), price: money(r.price), qty: r.qty, stock: Number(r.stock) || 0, store: r.store, store_key: String(r.vid2), available: live && Number(r.stock) >= r.qty, line_total: money(r.price * r.qty) }); }
    const groups = {}; for (const i of items.filter((x) => x.available)) (groups[i.store_key] = groups[i.store_key] || []).push(i);
    const subtotal = money(items.filter((x) => x.available).reduce((s, x) => s + x.line_total, 0));
    const shipping = Object.values(groups).reduce((s, g) => s + (g.reduce((a, x) => a + x.line_total, 0) >= FREE_SHIP ? 0 : SHIP_FEE), 0);
    return { items: items.map(({ store_key, ...x }) => x), subtotal, shipping, total: money(subtotal + shipping), stores: Object.keys(groups).length, groups };
  }
  const addrDto = (a) => ({ key: `ADR${a.id}`.length && crypto.createHash('sha256').update(`adr:${a.id}:${a.user_id}`).digest('hex').slice(0, 12), name: a.name, contact: `•••••• ${String(a.phone).slice(-4)}`, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pin_code: a.pincode, is_default: a.is_default });
  async function addrByKey(vid, key) { const rows = (await pool.query(`SELECT * FROM howdi_v8_addresses WHERE user_id=$1`, [vid])).rows; return rows.find((a) => addrDto(a).key === key) || null; }

  // --- order DTO (buyer or vendor view)
  const LABEL = { placed: 'Order placed', accepted: 'Accepted by the seller', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', rejected: 'Declined by the seller', returned: 'Returned & refunded' };
  async function orderDto(o, role) {
    const so = (await pool.query(`SELECT * FROM howdi_v8_shop_orders WHERE order_id=$1`, [o.id])).rows[0];
    const items = (await pool.query(`SELECT product_id, product_name, image_url, quantity, unit_price, line_total FROM order_items WHERE order_id=$1 ORDER BY id`, [o.id])).rows;
    const v = (await pool.query(`SELECT business_name, city FROM vendor_profiles WHERE id=$1`, [so.vendor_profile_id])).rows[0];
    const rt = (await pool.query(`SELECT * FROM order_returns WHERE order_id=$1 ORDER BY id DESC LIMIT 1`, [o.id])).rows[0];
    const out = {
      public_key: await ordCode(o.id), state: so.state, label: LABEL[so.state] || so.state, placed_at: iso(so.placed_at), store: { name: v?.business_name, city: v?.city },
      items: await Promise.all(items.map(async (i) => ({ product: i.product_id ? await prdCode(i.product_id) : null, name: i.product_name, image_url: i.image_url, qty: i.quantity, price: money(i.unit_price), line_total: money(i.line_total) }))),
      subtotal: money(o.subtotal), shipping: money(o.shipping_total), total: money(o.grand_total), payment: { method: so.method === 'COD' ? 'cod' : 'hpay', state: so.pay_state.toLowerCase(), sandbox: so.method === 'HPAY' },
      courier: so.courier, tracking: so.tracking, reason: so.reason,
      steps: ['placed', 'accepted', 'packed', 'shipped', 'delivered'].map((k) => ({ key: k, done: ['placed', 'accepted', 'packed', 'shipped', 'delivered'].indexOf(k) <= ['placed', 'accepted', 'packed', 'shipped', 'delivered'].indexOf(so.state) })),
      timeline: (await pool.query(`SELECT actor, event, note, at FROM howdi_v8_shop_events WHERE order_id=$1 ORDER BY id`, [o.id])).rows.map((e) => ({ actor: e.actor, event: e.event, note: e.note, at: iso(e.at) })),
      return: rt ? { public_key: await rtnCode(rt.id), status: rt.status, reason: RETURN_REASONS[rt.reason_code] || rt.reason_code, details: rt.reason_text, refund: rt.refund_status } : null,
    };
    // delivery details: the buyer always; the vendor only after accepting (and never after a cancel / reject)
    const showAddr = role === 'buyer' || (['accepted', 'packed', 'shipped', 'delivered', 'returned'].includes(so.state));
    out.delivery = showAddr ? { name: o.delivery_name, line: [o.delivery_address_line1, o.delivery_address_line2, o.delivery_landmark].filter(Boolean).join(', '), city: o.delivery_city, state: o.delivery_state, pin_code: o.delivery_pincode, contact: role === 'vendor' ? o.delivery_phone : `•••••• ${String(o.delivery_phone || '').slice(-4)}` } : { hidden: true, city: o.delivery_city };
    const within = so.delivered_at && Date.now() - new Date(so.delivered_at).getTime() < RETURN_DAYS * 86400e3;
    if (role === 'buyer') out.actions = ['placed', 'accepted', 'packed'].includes(so.state) ? ['cancel'] : so.state === 'delivered' && within && !rt ? ['return'] : [];
    else { out.net = money(Number(so.amount) - Number(so.commission)); out.commission = money(so.commission); out.actions = so.state === 'placed' ? ['accept', 'reject'] : so.state === 'accepted' ? ['pack'] : so.state === 'packed' ? ['ship'] : so.state === 'shipped' ? ['deliver'] : []; if (rt) out.return.actions = rt.status === 'requested' ? ['approve', 'reject'] : rt.status === 'approved' ? ['received'] : []; }
    if (role === 'buyer' && rt) out.return.pickup = rt.status === 'approved' ? 'Pickup scheduled (Preview/Test courier). Keep the item packed with its tags.' : null;
    return out;
  }
  async function credit(client, uid, amount, kind, ref, note) { await wallet(uid, client); await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [uid, amount]); const txn = 'HPS-' + crypto.randomBytes(5).toString('hex').toUpperCase(); await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,$4,$5,$6)`, [txn, uid, amount, kind, ref, line(note, 190)]); return txn; }
  async function restock(client, oid) { await client.query(`UPDATE vendor_products p SET stock=p.stock+i.quantity, updated_at=NOW() FROM order_items i WHERE i.order_id=$1 AND p.id::text=i.product_id`, [oid]); }
  async function refundOrder(client, so, why) { if (so.method !== 'HPAY' || so.pay_state !== 'HELD') return null; const t = await credit(client, Number(so.buyer_user_id), money(so.amount), 'SHOP_REFUND', await ordCode(so.order_id), `Refund · ${why}`); await client.query(`UPDATE howdi_v8_shop_orders SET pay_state='REFUNDED', refund_txn=$2 WHERE order_id=$1`, [so.order_id, t]); await client.query(`UPDATE orders SET payment_status='refunded' WHERE id=$1`, [so.order_id]); return t; }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    const vendorPath = p.startsWith('/api/v8/vendor/orders') || p.startsWith('/api/v8/vendor/returns');
    if (!p.startsWith('/api/v8/shop/') && !vendorPath) return false;
    const v = await viewer(req); const vid = v ? v.id : 0; let m;

    if ((m = p.match(/^\/api\/v8\/shop\/products\/(PRD-[0-9A-F]{12})$/)) && req.method === 'GET') {
      const pr = await productByCode(m[1], vid); if (!pr) { fail(res, 404, 'NOT_FOUND', 'This product isn’t available.'); return true; }
      ok(res, { product: await productDto(pr), mine: Number(pr.vendor_uid) === vid }); return true;
    }
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }

    if (p === '/api/v8/shop/cart') {
      if (req.method === 'GET') { ok(res, { cart: await cartOf(vid) }); return true; }
      const b = (await getBody(req)) || {};
      const pr = await productByCode(b.product, vid);
      if (req.method === 'DELETE') { if (pr) await pool.query(`DELETE FROM howdi_v8_cart WHERE user_id=$1 AND product_id=$2`, [vid, pr.id]); ok(res, { cart: await cartOf(vid) }); return true; }
      if (!pr) { fail(res, 404, 'NOT_FOUND', 'This product isn’t available.'); return true; }
      if (Number(pr.vendor_uid) === vid) { fail(res, 400, 'OWN_PRODUCT', 'You can’t buy from your own store.'); return true; }
      const qty = Math.floor(Number(b.qty) || 1); if (!(qty >= 1 && qty <= 20)) { fail(res, 400, 'VALIDATION', 'Quantity must be 1 to 20.'); return true; }
      if (qty > Number(pr.stock)) { fail(res, 409, 'OUT_OF_STOCK', Number(pr.stock) ? `Only ${pr.stock} left.` : 'Out of stock.'); return true; }
      if (req.method === 'POST') await pool.query(`INSERT INTO howdi_v8_cart(user_id,product_id,qty) VALUES($1,$2,$3) ON CONFLICT(user_id,product_id) DO UPDATE SET qty=LEAST(20, howdi_v8_cart.qty+EXCLUDED.qty)`, [vid, pr.id, qty]);
      else await pool.query(`UPDATE howdi_v8_cart SET qty=$3 WHERE user_id=$1 AND product_id=$2`, [vid, pr.id, qty]);
      ok(res, { cart: await cartOf(vid) }); return true;
    }
    if (p === '/api/v8/shop/addresses') {
      if (req.method === 'GET') { ok(res, { items: (await pool.query(`SELECT * FROM howdi_v8_addresses WHERE user_id=$1 ORDER BY is_default DESC, id DESC`, [vid])).rows.map(addrDto) }); return true; }
      if (req.method === 'POST') {
        const b = (await getBody(req)) || {}; const phone = String(b.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
        const a = { name: line(b.name, 80), line1: line(b.line1, 200), line2: line(b.line2, 200) || null, landmark: line(b.landmark, 120) || null, city: line(b.city, 60), state: line(b.state, 60), pincode: String(b.pin_code || b.pincode || '') };
        if (a.name.length < 2 || a.line1.length < 5 || a.city.length < 2 || a.state.length < 2) { fail(res, 400, 'VALIDATION', 'Fill in name, address, city and state.'); return true; }
        if (!/^[6-9]\d{9}$/.test(phone)) { fail(res, 400, 'VALIDATION', 'Enter a 10-digit mobile number for the courier.'); return true; }
        if (!/^\d{6}$/.test(a.pincode)) { fail(res, 400, 'VALIDATION', 'Enter a 6-digit PIN code.'); return true; }
        const first = !(await pool.query(`SELECT 1 FROM howdi_v8_addresses WHERE user_id=$1`, [vid])).rowCount;
        const r = (await pool.query(`INSERT INTO howdi_v8_addresses(user_id,name,phone,line1,line2,landmark,city,state,pincode,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [vid, a.name, phone, a.line1, a.line2, a.landmark, a.city, a.state, a.pincode, first || b.is_default === true])).rows[0];
        ok(res, { saved: addrDto(r) }, 201); return true;
      }
    }
    if ((p === '/api/v8/shop/checkout/quote' || p === '/api/v8/shop/checkout') && req.method === 'POST') {
      const b = (await getBody(req)) || {}; const method = b.method === 'cod' ? 'COD' : 'HPAY';
      const idem = /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null;
      if (p.endsWith('/checkout') && idem) {
        const prior = (await pool.query(`SELECT group_key FROM howdi_v8_checkout_idem WHERE user_id=$1 AND idem_key=$2`, [vid, idem])).rows[0];
        if (prior?.group_key) { const os = (await pool.query(`SELECT o.* FROM orders o JOIN howdi_v8_shop_orders s ON s.order_id=o.id WHERE s.group_key=$1 ORDER BY o.id`, [prior.group_key])).rows; ok(res, { orders: await Promise.all(os.map((o) => orderDto(o, 'buyer'))), replayed: true }); return true; }
      }
      const cart = await cartOf(vid); if (!cart.items.length) { fail(res, 400, 'EMPTY_CART', 'Your bag is empty.'); return true; }
      if (cart.items.some((i) => !i.available)) { fail(res, 409, 'CART_CHANGED', 'Some items are no longer available in that quantity. Review your bag.'); return true; }
      const addr = await addrByKey(vid, b.address); if (!addr) { fail(res, 400, 'ADDRESS_REQUIRED', 'Choose a delivery address.'); return true; }
      const w = method === 'HPAY' ? await wallet(vid) : null;
      if (p.endsWith('/quote')) { ok(res, { review: { items: cart.items, subtotal: cart.subtotal, shipping: cart.shipping, total: cart.total, stores: cart.stores, ship_to: addrDto(addr), method: method === 'COD' ? 'cod' : 'hpay', balance: w ? money(w.balance) : null, provider_ready: method === 'COD' || Boolean(w), note: cart.stores > 1 ? `Your bag has items from ${cart.stores} stores — you’ll get ${cart.stores} orders, each tracked separately.` : null } }); return true; }
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing checkout key. Please try again.'); return true; }
      if (limited(res, `v8-checkout:${vid}`, 10, 600000)) return true;
      if (method === 'HPAY') { if (!w) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected here. Choose cash on delivery.'); return true; } const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; } }
      const group = 'G' + crypto.randomBytes(8).toString('hex'); const client = await pool.connect(); const created = [];
      try {
        await client.query('BEGIN');
        const claimed = await client.query(`INSERT INTO howdi_v8_checkout_idem(user_id,idem_key,group_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING user_id`, [vid, idem, group]);
        if (!claimed.rowCount) { await client.query('ROLLBACK'); fail(res, 409, 'IN_PROGRESS', 'This order is already being placed.'); return true; }
        let total = 0;
        for (const [vpid, items] of Object.entries(cart.groups)) {
          const sub = items.reduce((s, x) => s + x.line_total, 0); const ship = sub >= FREE_SHIP ? 0 : SHIP_FEE; const grand = money(sub + ship); total += grand;
          const o = (await client.query(`INSERT INTO orders(order_number,user_id,status,payment_status,payment_method,subtotal,discount_total,shipping_total,tax_total,grand_total,currency,delivery_name,delivery_phone,delivery_address_line1,delivery_address_line2,delivery_landmark,delivery_city,delivery_state,delivery_pincode,delivery_country,order_kind)
            VALUES($1,$2,'placed',$3,$4,$5,0,$6,0,$7,'INR',$8,$9,$10,$11,$12,$13,$14,$15,'IN','V8') RETURNING *`,
          ['HWV8-' + crypto.randomBytes(5).toString('hex').toUpperCase(), vid, method === 'HPAY' ? 'paid' : 'cod_pending', method === 'HPAY' ? 'hpay' : 'cod', money(sub), ship, grand, addr.name, addr.phone, addr.line1, addr.line2, addr.landmark, addr.city, addr.state, addr.pincode])).rows[0];
          for (const it of items) {
            const pid = (await resolvePublicRef(it.product, ['PRODUCT'])).entity_key;
            const st = await client.query(`UPDATE vendor_products SET stock=stock-$2, updated_at=NOW() WHERE id=$1 AND stock>=$2 AND status='published' RETURNING id`, [pid, it.qty]);
            if (!st.rowCount) { await client.query('ROLLBACK'); fail(res, 409, 'OUT_OF_STOCK', `“${it.name}” just sold out. Nothing was charged.`); return true; }
            await client.query(`INSERT INTO order_items(order_id,product_id,product_name,image_url,quantity,unit_price,line_total,vendor_profile_id,fulfillment_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'placed')`, [o.id, String(pid), it.name, it.image_url, it.qty, it.price, it.line_total, vpid]);
          }
          await client.query(`INSERT INTO howdi_v8_shop_orders(order_id,vendor_profile_id,buyer_user_id,state,method,pay_state,amount,commission,group_key,idem_key) VALUES($1,$2,$3,'placed',$4,$5,$6,$7,$8,$9)`, [o.id, vpid, vid, method, method === 'HPAY' ? 'HELD' : 'COD', grand, money(sub * COMMISSION), group, idem]);
          created.push(o);
        }
        if (method === 'HPAY') {
          const up = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [vid, money(total)]);
          if (!up.rows[0]) { await client.query('ROLLBACK'); fail(res, 402, 'INSUFFICIENT_BALANCE', 'Not enough HPay balance. Nothing was charged.'); return true; }
          for (const o of created) { const t = 'HPS-' + crypto.randomBytes(5).toString('hex').toUpperCase(); await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'DEBIT',$3,'SHOP_PAYMENT',$4,'HOWDI Shop order — held until delivery')`, [t, vid, money(o.grand_total), await ordCode(o.id)]); await client.query(`UPDATE howdi_v8_shop_orders SET hold_txn=$2 WHERE order_id=$1`, [o.id, t]); }
        }
        await client.query(`DELETE FROM howdi_v8_cart WHERE user_id=$1`, [vid]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      for (const o of created) {
        await ev(o.id, 'buyer', 'placed', method === 'HPAY' ? 'Paid with HPay (held until delivery)' : 'Cash on delivery');
        const so = (await pool.query(`SELECT v.user_id, v.business_name FROM howdi_v8_shop_orders s JOIN vendor_profiles v ON v.id=s.vendor_profile_id WHERE s.order_id=$1`, [o.id])).rows[0];
        await notify(Number(so.user_id), 'SHOP_NEW_ORDER', `New order: ₹${money(o.grand_total)}`, `Accept it in My store → Orders.`, `/me/vendor/store`, null);
      }
      ok(res, { orders: await Promise.all(created.map((o) => orderDto(o, 'buyer'))) }, 201); return true;
    }
    if (p === '/api/v8/shop/orders' && req.method === 'GET') {
      const tab = ['active', 'past'].includes(url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'active';
      const rows = (await pool.query(`SELECT o.* FROM orders o JOIN howdi_v8_shop_orders s ON s.order_id=o.id WHERE s.buyer_user_id=$1 AND ${tab === 'active' ? `s.state IN ('placed','accepted','packed','shipped')` : `s.state NOT IN ('placed','accepted','packed','shipped')`} ORDER BY o.id DESC LIMIT 50`, [vid])).rows;
      ok(res, { tab, items: await Promise.all(rows.map((o) => orderDto(o, 'buyer'))) }); return true;
    }
    const loadOrder = async (code, role) => {
      const id = await resolveKey(code, 'SORD', 'ORD'); if (!id) return null;
      const row = (await pool.query(`SELECT o.*, s.vendor_profile_id vp, s.buyer_user_id bu FROM orders o JOIN howdi_v8_shop_orders s ON s.order_id=o.id WHERE o.id=$1`, [id])).rows[0]; if (!row) return null;
      if (role === 'buyer' && Number(row.bu) !== vid) return null;
      if (role === 'vendor') { const vp = (await pool.query(`SELECT id FROM vendor_profiles WHERE user_id=$1 AND LOWER(kyc_status)='verified'`, [vid])).rows.map((x) => String(x.id)); if (!vp.includes(String(row.vp))) return null; }
      return row;
    };
    const tx = async (oid, expect, fn) => { const client = await pool.connect(); try { await client.query('BEGIN'); const so = (await client.query(`SELECT * FROM howdi_v8_shop_orders WHERE order_id=$1 FOR UPDATE`, [oid])).rows[0]; if (!expect.includes(so.state)) { await client.query('ROLLBACK'); return so; } await fn(client, so); await client.query('COMMIT'); return null; } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); } };
    if ((m = p.match(/^\/api\/v8\/shop\/orders\/(ORD-[0-9A-F]{12})(?:\/(cancel|return))?$/))) {
      const o = await loadOrder(m[1], 'buyer'); if (!o) { fail(res, 404, 'NOT_FOUND', 'Order not found.'); return true; }
      if (!m[2] && req.method === 'GET') { ok(res, { order: await orderDto(o, 'buyer') }); return true; }
      const b = (await getBody(req)) || {}; const vend = (await pool.query(`SELECT user_id FROM vendor_profiles WHERE id=$1`, [o.vp])).rows[0];
      if (m[2] === 'cancel') {
        const reason = CANCEL_REASONS.includes(b.reason) ? b.reason : 'Other';
        const bad = await tx(o.id, ['placed', 'accepted', 'packed'], async (c, so) => { await c.query(`UPDATE howdi_v8_shop_orders SET state='cancelled', reason=$2, closed_at=NOW() WHERE order_id=$1`, [o.id, reason]); await c.query(`UPDATE orders SET status='cancelled', cancel_reason=$2, cancelled_at=NOW() WHERE id=$1`, [o.id, reason]); await c.query(`UPDATE order_items SET fulfillment_status='cancelled', cancelled_at=NOW() WHERE order_id=$1`, [o.id]); await restock(c, o.id); await refundOrder(c, so, 'order cancelled'); });
        if (bad) { fail(res, 409, 'INVALID_STATE', bad.state === 'shipped' ? 'It’s already shipped — you can return it after delivery.' : `This order is ${bad.state}.`); return true; }
        await ev(o.id, 'buyer', 'cancelled', reason); await notify(Number(vend.user_id), 'SHOP_ORDER_CANCELLED', 'An order was cancelled by the buyer', reason, '/me/vendor/store', vid);
        ok(res, { order: await orderDto(o, 'buyer'), message: 'Order cancelled. Any HPay payment was refunded.' }); return true;
      }
      if (m[2] === 'return') {
        const so = (await pool.query(`SELECT * FROM howdi_v8_shop_orders WHERE order_id=$1`, [o.id])).rows[0];
        if (so.state !== 'delivered' || !so.delivered_at || Date.now() - new Date(so.delivered_at).getTime() > RETURN_DAYS * 86400e3) { fail(res, 409, 'NOT_RETURNABLE', `Returns are open for ${RETURN_DAYS} days after delivery.`); return true; }
        if ((await pool.query(`SELECT 1 FROM order_returns WHERE order_id=$1`, [o.id])).rowCount) { fail(res, 409, 'ALREADY_REQUESTED', 'A return is already open for this order.'); return true; }
        if (!RETURN_REASONS[b.reason]) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
        await pool.query(`INSERT INTO order_returns(order_id,vendor_profile_id,return_type,reason_code,reason_text,status,refund_status) VALUES($1,$2,'refund',$3,$4,'requested','pending')`, [o.id, o.vp, b.reason, text(b.details, 600) || null]);
        await ev(o.id, 'buyer', 'return_requested', RETURN_REASONS[b.reason]); await notify(Number(vend.user_id), 'SHOP_RETURN_REQUESTED', 'Return requested', RETURN_REASONS[b.reason], '/me/vendor/store', vid);
        ok(res, { order: await orderDto(o, 'buyer') }); return true;
      }
    }

    // ---- vendor side
    if (vendorPath) {
      const vps = (await pool.query(`SELECT id FROM vendor_profiles WHERE user_id=$1 AND LOWER(kyc_status)='verified' AND status='active'`, [vid])).rows.map((x) => Number(x.id));
      if (!vps.length) { fail(res, 403, 'NOT_A_VENDOR', 'Your vendor account isn’t approved yet.'); return true; }
      if (p === '/api/v8/vendor/orders' && req.method === 'GET') {
        const tab = ['new', 'active', 'done', 'returns'].includes(url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'new';
        const cond = tab === 'new' ? `s.state='placed'` : tab === 'active' ? `s.state IN ('accepted','packed','shipped')` : tab === 'returns' ? `EXISTS(SELECT 1 FROM order_returns r WHERE r.order_id=o.id AND r.status IN ('requested','approved'))` : `s.state IN ('delivered','cancelled','rejected','returned')`;
        const rows = (await pool.query(`SELECT o.* FROM orders o JOIN howdi_v8_shop_orders s ON s.order_id=o.id WHERE s.vendor_profile_id=ANY($1::bigint[]) AND ${cond} ORDER BY o.id DESC LIMIT 50`, [vps])).rows;
        const counts = (await pool.query(`SELECT COUNT(*) FILTER (WHERE s.state='placed') n, COUNT(*) FILTER (WHERE s.state IN ('accepted','packed','shipped')) a FROM howdi_v8_shop_orders s WHERE s.vendor_profile_id=ANY($1::bigint[])`, [vps])).rows[0];
        const rets = Number((await pool.query(`SELECT COUNT(*) n FROM order_returns r JOIN howdi_v8_shop_orders s ON s.order_id=r.order_id WHERE s.vendor_profile_id=ANY($1::bigint[]) AND r.status IN ('requested','approved')`, [vps])).rows[0].n);
        ok(res, { tab, counts: { new: Number(counts.n), active: Number(counts.a), returns: rets }, items: await Promise.all(rows.map((o) => orderDto(o, 'vendor'))) }); return true;
      }
      if ((m = p.match(/^\/api\/v8\/vendor\/orders\/(ORD-[0-9A-F]{12})(?:\/(accept|reject|pack|ship|deliver))?$/))) {
        const o = await loadOrder(m[1], 'vendor'); if (!o) { fail(res, 404, 'NOT_FOUND', 'Order not found.'); return true; }
        if (!m[2] && req.method === 'GET') { ok(res, { order: await orderDto(o, 'vendor') }); return true; }
        const b = (await getBody(req)) || {}; const act = m[2]; const route = `/shop/orders/${m[1]}`; const bu = Number(o.bu);
        const FROM = { accept: ['placed'], reject: ['placed'], pack: ['accepted'], ship: ['packed'], deliver: ['shipped'] }[act];
        if (act === 'reject' && line(b.reason, 300).length < 4) { fail(res, 400, 'REASON_REQUIRED', 'Tell the buyer why.'); return true; }
        if (act === 'ship' && (line(b.courier, 60).length < 2 || line(b.tracking, 60).length < 4)) { fail(res, 400, 'VALIDATION', 'Add the courier and tracking number.'); return true; }
        let relTxn = null;
        const bad = await tx(o.id, FROM, async (c, so) => {
          if (act === 'accept') { await c.query(`UPDATE howdi_v8_shop_orders SET state='accepted', accepted_at=NOW() WHERE order_id=$1`, [o.id]); await c.query(`UPDATE order_items SET fulfillment_status='accepted', accepted_at=NOW() WHERE order_id=$1`, [o.id]); }
          if (act === 'reject') { await c.query(`UPDATE howdi_v8_shop_orders SET state='rejected', reason=$2, closed_at=NOW() WHERE order_id=$1`, [o.id, line(b.reason, 300)]); await c.query(`UPDATE orders SET status='cancelled', cancel_reason=$2, cancelled_at=NOW() WHERE id=$1`, [o.id, line(b.reason, 300)]); await c.query(`UPDATE order_items SET fulfillment_status='cancelled', cancelled_at=NOW() WHERE order_id=$1`, [o.id]); await restock(c, o.id); await refundOrder(c, so, 'seller declined'); }
          if (act === 'pack') { await c.query(`UPDATE howdi_v8_shop_orders SET state='packed', packed_at=NOW() WHERE order_id=$1`, [o.id]); await c.query(`UPDATE order_items SET fulfillment_status='packed', packed_at=NOW() WHERE order_id=$1`, [o.id]); }
          if (act === 'ship') { await c.query(`UPDATE howdi_v8_shop_orders SET state='shipped', shipped_at=NOW(), courier=$2, tracking=$3 WHERE order_id=$1`, [o.id, line(b.courier, 60), line(b.tracking, 60)]); await c.query(`UPDATE order_items SET fulfillment_status='shipped', shipped_at=NOW() WHERE order_id=$1`, [o.id]); await c.query(`UPDATE orders SET status='shipped' WHERE id=$1`, [o.id]); }
          if (act === 'deliver') {
            await c.query(`UPDATE howdi_v8_shop_orders SET state='delivered', delivered_at=NOW() WHERE order_id=$1`, [o.id]); await c.query(`UPDATE order_items SET fulfillment_status='delivered', delivered_at=NOW() WHERE order_id=$1`, [o.id]); await c.query(`UPDATE orders SET status='delivered', delivered_at=NOW(), payment_status=CASE WHEN payment_status='cod_pending' THEN 'paid' ELSE payment_status END WHERE id=$1`, [o.id]);
            const net = money(Number(so.amount) - Number(so.commission));
            if (so.method === 'HPAY' && so.pay_state === 'HELD') { relTxn = await credit(c, vid, net, 'SHOP_EARNING', m[1], 'HOWDI Shop order (after 8% commission)'); await c.query(`UPDATE howdi_v8_shop_orders SET pay_state='RELEASED', release_txn=$2 WHERE order_id=$1`, [o.id, relTxn]); }
            else await c.query(`UPDATE howdi_v8_shop_orders SET pay_state='COLLECTED' WHERE order_id=$1`, [o.id]);
          }
        });
        if (bad) { fail(res, 409, 'INVALID_STATE', `This order is ${bad.state}.`); return true; }
        const msg = { accept: ['SHOP_ACCEPTED', 'The seller accepted your order', 'They’re preparing it now.'], reject: ['SHOP_REJECTED', 'The seller couldn’t take your order', `${line(b.reason, 200)}. Any HPay payment was refunded.`], pack: ['SHOP_PACKED', 'Your order is packed', 'It ships soon.'], ship: ['SHOP_SHIPPED', 'Your order has shipped', `${line(b.courier, 60)} · ${line(b.tracking, 60)}`], deliver: ['SHOP_DELIVERED', 'Delivered — enjoy!', `Returns are open for ${RETURN_DAYS} days.`] }[act];
        await ev(o.id, 'vendor', act === 'deliver' ? 'delivered' : act === 'ship' ? 'shipped' : act === 'pack' ? 'packed' : act === 'accept' ? 'accepted' : 'rejected', act === 'reject' ? b.reason : act === 'ship' ? `${b.courier} ${b.tracking}` : null);
        await notify(bu, msg[0], msg[1], msg[2], route, vid);
        ok(res, { order: await orderDto(o, 'vendor') }); return true;
      }
      if ((m = p.match(/^\/api\/v8\/vendor\/returns\/(RTN-[0-9A-F]{12})\/(approve|reject|received)$/)) && req.method === 'POST') {
        const rid = await resolveKey(m[1], 'SRET', 'RTN'); const rt = rid ? (await pool.query(`SELECT r.*, s.buyer_user_id bu FROM order_returns r JOIN howdi_v8_shop_orders s ON s.order_id=r.order_id WHERE r.id=$1 AND s.vendor_profile_id=ANY($2::bigint[])`, [rid, vps])).rows[0] : null;
        if (!rt) { fail(res, 404, 'NOT_FOUND', 'Return not found.'); return true; }
        const b = (await getBody(req)) || {}; const act = m[2]; const oc = await ordCode(rt.order_id); const route = `/shop/orders/${oc}`;
        const need = { approve: 'requested', reject: 'requested', received: 'approved' }[act];
        if (rt.status !== need) { fail(res, 409, 'INVALID_STATE', `This return is ${rt.status}.`); return true; }
        if (act === 'reject' && line(b.reason, 300).length < 4) { fail(res, 400, 'REASON_REQUIRED', 'Tell the buyer why.'); return true; }
        if (act === 'received') {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const lock = (await client.query(`SELECT status FROM order_returns WHERE id=$1 FOR UPDATE`, [rid])).rows[0]; if (lock.status !== 'approved') { await client.query('ROLLBACK'); fail(res, 409, 'INVALID_STATE', 'Already processed.'); return true; }
            const so = (await client.query(`SELECT * FROM howdi_v8_shop_orders WHERE order_id=$1 FOR UPDATE`, [rt.order_id])).rows[0];
            await client.query(`UPDATE order_returns SET status='refunded', refund_status='refunded', received_at=NOW(), qc_status='passed', updated_at=NOW() WHERE id=$1`, [rid]);
            await restock(client, rt.order_id);
            // refund the buyer the full amount; the vendor gives back what they were paid (HPay orders)
            await credit(client, Number(so.buyer_user_id), money(so.amount), 'SHOP_REFUND', oc, 'Return refund');
            if (so.pay_state === 'RELEASED') { const net = money(Number(so.amount) - Number(so.commission)); await wallet(vid, client); await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2 WHERE user_id=$1`, [vid, net]); await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'DEBIT',$3,'SHOP_RETURN',$4,'Return refunded to buyer')`, ['HPS-' + crypto.randomBytes(5).toString('hex').toUpperCase(), vid, net, oc]); }
            await client.query(`UPDATE howdi_v8_shop_orders SET state='returned', pay_state='REFUNDED', closed_at=NOW() WHERE order_id=$1`, [rt.order_id]);
            await client.query(`UPDATE orders SET status='returned', payment_status='refunded' WHERE id=$1`, [rt.order_id]);
            await client.query('COMMIT');
          } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
          await ev(rt.order_id, 'vendor', 'return_received', 'Refund issued'); await notify(Number(rt.bu), 'SHOP_REFUNDED', 'Your refund is done', 'The seller received the item. The money is back in HPay (Preview/Test).', route, vid);
        } else {
          await pool.query(`UPDATE order_returns SET status=$2::varchar, qc_status=$3, updated_at=NOW(), pickup_scheduled_at=CASE WHEN $2::varchar='approved' THEN NOW() ELSE NULL END, reason_text=CASE WHEN $2::varchar='rejected' THEN COALESCE(reason_text,'')||' | Seller: '||$4::text ELSE reason_text END WHERE id=$1`, [rid, act === 'approve' ? 'approved' : 'rejected', act === 'approve' ? 'pending' : 'rejected', line(b.reason, 300)]);
          await ev(rt.order_id, 'vendor', act === 'approve' ? 'return_approved' : 'return_rejected', act === 'reject' ? b.reason : 'Pickup scheduled');
          await notify(Number(rt.bu), act === 'approve' ? 'SHOP_RETURN_APPROVED' : 'SHOP_RETURN_REJECTED', act === 'approve' ? 'Return approved — pickup scheduled' : 'Return not accepted', act === 'approve' ? 'Keep the item packed. You’re refunded once the seller receives it.' : `${line(b.reason, 200)}. You can contact HOWDI support.`, route, vid);
        }
        const o = (await pool.query(`SELECT * FROM orders WHERE id=$1`, [rt.order_id])).rows[0];
        ok(res, { order: await orderDto(o, 'vendor') }); return true;
      }
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }
  return { ensureSchema, handle };
}
module.exports = { createShopV8, RETURN_REASONS, CANCEL_REASONS };

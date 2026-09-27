'use strict';
// =====================================================================================
// HOWDI V8 — My roles (one HOWDI ID, many approved roles) + Vendor application → HOWDI Admin verification → vendor workspace
// (register ROL-001 role chooser, ROL-002 vendor onboarding / go live, MY roles hub). Both sides:
//   member:  GET /api/v8/me/roles — CUSTOMER (permanent) + CREATOR / VENDOR / WORKER / LEARNER / TEACHER with status, reason, entry
//            GET|PUT /api/v8/vendor/application · POST …/document {imageData} (private ID proof) · POST …/submit
//            GET /api/v8/vendor/store · GET|POST /api/v8/vendor/products · PATCH /api/v8/vendor/products/{PRD} · POST …/{PRD}/publish|unpublish
//   admin:   GET /api/admin/v8/vendors/applications?status= · GET …/{VAP} · GET …/{VAP}/document · POST …/{VAP}/decide
// Approval links the same account: vendor_profiles (verified, store online), VENDOR role ACTIVE in user_roles, notification →
// workspace. Staff roles never appear in My roles. Only the last 4 digits of PAN / bank account are stored. Session-only actor.
// =====================================================================================
const crypto = require('node:crypto');
const CATEGORIES = ['Crochet & Handmade', 'Handloom & Textiles', 'Home & Kitchen', 'Jewellery & Accessories', 'Art & Decor', 'Food & Homemade', 'Beauty & Wellness'];
const BIZ_TYPES = { individual: 'Individual maker', shop: 'Shop / proprietor', company: 'Registered company' };
const REJECT_TEMPLATES = ['ID proof is unclear or doesn’t match the name', 'PAN details don’t match the ID', 'Bank details look incorrect', 'Products aren’t allowed on HOWDI Shop', 'Business address outside our service area'];
const ROLE_META = {
  CUSTOMER: { label: 'Customer', about: 'Shop, book, learn and connect.', route: '/' },
  CREATOR: { label: 'Creator', about: 'Memberships, tips and your creator workspace.', route: '/connect/creator', apply: '/connect/creator' },
  VENDOR: { label: 'Vendor', about: 'Sell your products in HOWDI Shop.', route: '/me/vendor/store', apply: '/me/vendor' },
  WORKER: { label: 'Worker', about: 'Get booked for local jobs in Works.', route: '/works/worker', apply: '/works/become' },
  LEARNER: { label: 'Learner', about: 'Courses, batches and your Passport.', route: '/learn', apply: '/learn' },
  TEACHER: { label: 'Teacher', about: 'Teach batches in Learn & Earn.', route: '/learn', apply: '/learn' },
};

function createVendorV8(deps) {
  const { pool, getBody, notify, auditAdmin, issuePublicRefs, resolvePublicRef } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { viewer, limited, ok, fail, savePrivate, readPrivate, deletePrivate, saveMedia, authorCols, authorJoins, authorDto } = H;
  const { issue, resolve, line, text, iso, money } = M;

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_vendor_apps(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'draft',
      business_name VARCHAR(120), business_type VARCHAR(12), category VARCHAR(40), description VARCHAR(600), city VARCHAR(60), pincode VARCHAR(6), address TEXT,
      pan_last4 VARCHAR(4), gstin VARCHAR(15), bank_last4 VARCHAR(4), ifsc VARCHAR(11), id_file VARCHAR(64), declaration BOOLEAN NOT NULL DEFAULT FALSE,
      review_note VARCHAR(600), checks JSONB NOT NULL DEFAULT '{}'::jsonb, vendor_profile_id BIGINT, submitted_at TIMESTAMPTZ, decided_at TIMESTAMPTZ, decided_by VARCHAR(80),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_vendor_app_events(id BIGSERIAL PRIMARY KEY, app_id BIGINT NOT NULL, actor VARCHAR(10) NOT NULL, admin_username VARCHAR(80), action VARCHAR(20) NOT NULL, reason VARCHAR(600), at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }
  const codeOf = async (id) => (await issue('VAPP', [id])).get(String(id));
  const ev = (id, actor, action, reason, admin) => pool.query(`INSERT INTO howdi_v8_vendor_app_events(app_id,actor,admin_username,action,reason) VALUES($1,$2,$3,$4,$5)`, [id, actor, admin || null, action, reason ? line(reason, 600) : null]);
  const latest = async (uid) => (await pool.query(`SELECT * FROM howdi_v8_vendor_apps WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid])).rows[0] || null;
  function missing(a) {
    const o = [];
    if (!a.business_name) o.push('business name'); if (!BIZ_TYPES[a.business_type]) o.push('business type'); if (!CATEGORIES.includes(a.category)) o.push('category');
    if (!a.city || !/^\d{6}$/.test(a.pincode || '')) o.push('city and PIN code'); if (!a.address) o.push('pickup address'); if (!/^\d{4}$/.test(a.pan_last4 || '')) o.push('PAN (last 4)');
    if (!a.id_file) o.push('ID proof photo'); if (!/^\d{4}$/.test(a.bank_last4 || '') || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(a.ifsc || '')) o.push('bank details'); if (!a.declaration) o.push('declaration');
    return o;
  }
  async function events(id, admin) { return (await pool.query(`SELECT actor, admin_username, action, reason, at FROM howdi_v8_vendor_app_events WHERE app_id=$1 ORDER BY id`, [id])).rows.map((e) => ({ actor: e.actor === 'admin' ? (admin ? `admin · ${e.admin_username || ''}` : 'HOWDI') : 'you', action: e.action, reason: e.reason, at: iso(e.at) })); }
  async function appDto(a, admin) {
    const d = { public_key: await codeOf(a.id), status: a.status, editable: ['draft', 'info_requested', 'rejected'].includes(a.status), note: ['info_requested', 'rejected'].includes(a.status) ? a.review_note : null,
      business_name: a.business_name, business_type: a.business_type, category: a.category, description: a.description, city: a.city, pin_code: a.pincode, pickup: a.address,
      pan_last4: a.pan_last4, gstin: a.gstin, bank_last4: a.bank_last4, ifsc: a.ifsc, has_id_proof: Boolean(a.id_file), declaration: a.declaration, missing: missing(a),
      submitted_at: iso(a.submitted_at), decided_at: iso(a.decided_at), history: await events(a.id, admin) };
    if (admin) {
      const u = (await pool.query(`SELECT u.full_name, u.phone, u.created_at, ${authorCols('a_u.id', 'a_')} FROM users u ${authorJoins('u.id', 'a_')} WHERE u.id=$1`, [a.user_id])).rows[0];
      d.applicant = u ? { ...authorDto(u, 'a_'), legal_name: u.full_name, member_since: iso(u.created_at), contact: u.phone ? `•••••• ${String(u.phone).slice(-4)}` : null } : null;
      d.checks = a.checks || {}; d.reject_templates = REJECT_TEMPLATES;
    }
    return d;
  }
  async function vendorOf(uid) { return (await pool.query(`SELECT * FROM vendor_profiles WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid])).rows[0] || null; }
  const liveVendor = (v) => v && String(v.kyc_status).toLowerCase() === 'verified' && String(v.status).toLowerCase() === 'active';
  async function prdCode(id) { const m = await issuePublicRefs('PRODUCT', [String(id)]); return m.get(String(id)); }
  async function productDto(p) {
    let imgs = p.image_urls; if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
    return { public_key: await prdCode(p.id), name: p.name, category: p.category, price: money(p.price), mrp: money(p.mrp), stock: Number(p.stock) || 0, status: p.status === 'published' ? 'published' : 'draft',
      images: (Array.isArray(imgs) ? imgs : []).filter((u) => /^\/api\/v8\/media\//.test(String(u))), description: p.short_description || null, updated_at: iso(p.updated_at) };
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (p.startsWith('/api/admin/v8/vendors/')) return admin(req, res, url, p);
    if (!(p === '/api/v8/me/roles' || p.startsWith('/api/v8/vendor/'))) return false;
    const v = await viewer(req); if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
    const vid = v.id; let m;

    if (p === '/api/v8/me/roles' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT r.code, ur.role_status, ur.onboarding_state, ur.rejection_reason, ur.decided_at FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1`, [vid])).rows;
      const by = Object.fromEntries(rows.map((r) => [r.code, r]));
      const creator = (await pool.query(`SELECT creator_mode FROM howdi_connect_profiles WHERE user_id=$1`, [vid])).rows[0]?.creator_mode === true;
      const vend = await vendorOf(vid); const wk = (await pool.query(`SELECT kyc_status FROM works_workers WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [vid])).rows[0];
      const vapp = await latest(vid);
      const items = Object.entries(ROLE_META).map(([code, meta]) => {
        const r = by[code]; let status = code === 'CUSTOMER' ? 'active' : r ? String(r.role_status || '').toLowerCase() : 'none';
        if (code === 'CREATOR' && creator) status = 'active';
        if (code === 'VENDOR') { if (liveVendor(vend)) status = 'active'; else if (vapp) status = { draft: 'draft', submitted: 'pending', info_requested: 'action_needed', rejected: 'rejected', approved: 'active' }[vapp.status] || status; }
        if (code === 'WORKER' && wk && String(wk.kyc_status).toLowerCase() === 'verified') status = 'active';
        if (code === 'WORKER' && r && String(r.onboarding_state || '').toUpperCase() === 'INFO_REQUESTED') status = 'action_needed';
        const reason = code === 'VENDOR' && vapp && ['info_requested', 'rejected'].includes(vapp.status) ? vapp.review_note : r && ['rejected', 'pending'].includes(status === 'action_needed' ? 'pending' : status) ? r.rejection_reason : null;
        return { code: code.toLowerCase(), label: meta.label, about: meta.about, status: ['active', 'pending', 'rejected', 'draft', 'action_needed', 'none'].includes(status) ? status : 'pending', reason: reason || null, permanent: code === 'CUSTOMER',
          open_route: status === 'active' ? meta.route : null, apply_route: status !== 'active' ? meta.apply || null : null };
      });
      ok(res, { items, note: 'One HOWDI account. Each role is approved separately and has its own workspace. Your public identity is always your @username.' }); return true;
    }

    // ---- vendor application
    const handleRow = (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [vid])).rows[0];
    let a = await latest(vid);
    if (p === '/api/v8/vendor/application' && req.method === 'GET') {
      ok(res, { application: a ? await appDto(a, false) : null, already_vendor: liveVendor(await vendorOf(vid)), handle: handleRow?.public_username || null, options: { categories: CATEGORIES, business_types: Object.entries(BIZ_TYPES).map(([key, label]) => ({ key, label })) } }); return true;
    }
    if (p.startsWith('/api/v8/vendor/application')) {
      if (!handleRow?.public_username) { fail(res, 409, 'NEED_HANDLE', 'Choose your @username first.'); return true; }
      if (liveVendor(await vendorOf(vid))) { fail(res, 409, 'ALREADY_VENDOR', 'You’re already a verified vendor.'); return true; }
      const editable = !a || ['draft', 'info_requested', 'rejected'].includes(a.status);
      const draft = async () => {
        if (a && ['draft', 'info_requested'].includes(a.status)) return a;
        const prev = a;
        const row = (await pool.query(`INSERT INTO howdi_v8_vendor_apps(user_id,business_name,business_type,category,description,city,pincode,address,pan_last4,gstin,bank_last4,ifsc,id_file) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
          [vid, prev?.business_name || null, prev?.business_type || null, prev?.category || null, prev?.description || null, prev?.city || null, prev?.pincode || null, prev?.address || null, prev?.pan_last4 || null, prev?.gstin || null, prev?.bank_last4 || null, prev?.ifsc || null, null])).rows[0];
        if (prev) await ev(row.id, 'applicant', 'reapplied', prev.review_note);
        a = await latest(vid); return a;
      };
      if (p === '/api/v8/vendor/application' && req.method === 'PUT') {
        if (!editable) { fail(res, 409, 'LOCKED', 'Your application is with HOWDI for review.'); return true; }
        if (limited(res, `v8-vapp:${vid}`, 60, 600000)) return true;
        const b = (await getBody(req)) || {};
        if (b.pan || b.account_number) { fail(res, 400, 'FULL_NUMBER_REFUSED', 'Send only the last 4 digits of your PAN and bank account.'); return true; }
        const d4 = (x) => (x === undefined ? null : String(x || '').replace(/\D/g, '').slice(-4) || null);
        const ifsc = b.ifsc !== undefined ? String(b.ifsc || '').toUpperCase().replace(/\s/g, '') : undefined;
        if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { fail(res, 400, 'VALIDATION', 'Enter a valid IFSC (e.g. SBIN0001234).'); return true; }
        const gst = b.gstin !== undefined ? String(b.gstin || '').toUpperCase().trim() : undefined;
        if (gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gst)) { fail(res, 400, 'VALIDATION', 'GSTIN looks wrong (15 characters). Leave it empty if you don’t have one.'); return true; }
        await draft();
        await pool.query(`UPDATE howdi_v8_vendor_apps SET business_name=COALESCE($2,business_name), business_type=COALESCE($3,business_type), category=COALESCE($4,category), description=COALESCE($5,description),
          city=COALESCE($6,city), pincode=COALESCE($7,pincode), address=COALESCE($8,address), pan_last4=COALESCE($9,pan_last4), gstin=CASE WHEN $10::text IS NULL THEN gstin WHEN $10='' THEN NULL ELSE $10 END,
          bank_last4=COALESCE($11,bank_last4), ifsc=COALESCE($12,ifsc), declaration=COALESCE($13,declaration), updated_at=NOW() WHERE id=$1`,
        [a.id, b.business_name !== undefined ? line(b.business_name, 120) || null : null, BIZ_TYPES[b.business_type] ? b.business_type : null, CATEGORIES.includes(b.category) ? b.category : null,
          b.description !== undefined ? text(b.description, 600) : null, b.city !== undefined ? line(b.city, 60) || null : null, /^\d{6}$/.test(String(b.pincode || '')) ? String(b.pincode) : null,
          b.pickup !== undefined ? text(b.pickup, 300) || null : null, d4(b.pan_last4), gst === undefined ? null : gst, d4(b.bank_last4), ifsc || null, typeof b.declaration === 'boolean' ? b.declaration : null]);
        ok(res, { application: await appDto(await latest(vid), false) }); return true;
      }
      if (p === '/api/v8/vendor/application/document' && req.method === 'POST') {
        if (!editable) { fail(res, 409, 'LOCKED', 'Your application is with HOWDI for review.'); return true; }
        const b = (await getBody(req)) || {}; let f; try { f = savePrivate(b.imageData, { videos: false, maxImage: 5 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; }
        await draft(); if (a.id_file) deletePrivate(a.id_file);
        await pool.query(`UPDATE howdi_v8_vendor_apps SET id_file=$2, updated_at=NOW() WHERE id=$1`, [a.id, f.file]);
        ok(res, { application: await appDto(await latest(vid), false), message: 'ID proof saved privately. Only HOWDI’s verification team can see it.' }); return true;
      }
      if (p === '/api/v8/vendor/application/submit' && req.method === 'POST') {
        if (!a || !['draft', 'info_requested'].includes(a.status)) { fail(res, 409, 'INVALID_STATE', 'Nothing to submit.'); return true; }
        const miss = missing(a); if (miss.length) { fail(res, 400, 'INCOMPLETE', `Please complete: ${miss.join(', ')}.`); return true; }
        const was = a.status;
        await pool.query(`UPDATE howdi_v8_vendor_apps SET status='submitted', submitted_at=NOW(), updated_at=NOW() WHERE id=$1`, [a.id]);
        await pool.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,'PENDING',NOW(),'SUBMITTED',NULL FROM roles WHERE code='VENDOR'
          ON CONFLICT(user_id,role_id) DO UPDATE SET role_status=CASE WHEN user_roles.role_status='ACTIVE' THEN 'ACTIVE' ELSE 'PENDING' END, onboarding_state='SUBMITTED', rejection_reason=NULL, requested_at=NOW(), updated_at=NOW()`, [vid]);
        await ev(a.id, 'applicant', was === 'info_requested' ? 'resubmitted' : 'submitted');
        await notify(vid, 'VENDOR_APP_SUBMITTED', 'Vendor application received', 'HOWDI usually reviews within 2 working days.', '/me/vendor', null);
        ok(res, { application: await appDto(await latest(vid), false) }); return true;
      }
    }

    // ---- vendor workspace (verified vendors only)
    const vend = await vendorOf(vid);
    if (!liveVendor(vend)) { fail(res, 403, 'NOT_A_VENDOR', 'Your vendor account isn’t approved yet.'); return true; }
    if (p === '/api/v8/vendor/store' && req.method === 'GET') {
      const c = (await pool.query(`SELECT COUNT(*) FILTER (WHERE status='published' AND archived_at IS NULL) pub, COUNT(*) FILTER (WHERE status<>'published' AND archived_at IS NULL) draft, COUNT(*) FILTER (WHERE status='published' AND COALESCE(stock,0)=0 AND archived_at IS NULL) oos FROM vendor_products WHERE vendor_profile_id=$1`, [vend.id])).rows[0];
      ok(res, { store: { name: vend.business_name, category: vend.category, city: vend.city, status: vend.store_status === 'online' ? 'online' : 'offline', verified: true, payout: vend.payout_status, handle: handleRow?.public_username || null },
        counts: { published: Number(c.pub), drafts: Number(c.draft), out_of_stock: Number(c.oos) }, next: ['Orders, dispatch and returns arrive in the next build (Shop slice).'] }); return true;
    }
    if (p === '/api/v8/vendor/products' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT * FROM vendor_products WHERE vendor_profile_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 100`, [vend.id])).rows;
      const items = []; for (const r of rows) items.push(await productDto(r)); ok(res, { items }); return true;
    }
    const readProduct = async (b, existing) => {
      const name = b.name !== undefined ? line(b.name, 120) : existing?.name; const price = b.price !== undefined ? Math.round(Number(b.price) * 100) / 100 : Number(existing?.price);
      const mrp = b.mrp !== undefined && b.mrp !== '' ? Math.round(Number(b.mrp) * 100) / 100 : existing ? Number(existing.mrp) : price; const stock = b.stock !== undefined ? Math.floor(Number(b.stock)) : Number(existing?.stock || 0);
      if (!name || name.length < 3) return { error: 'Give the product a name (3+ characters).' };
      if (!(price >= 1 && price <= 500000)) return { error: 'Price must be ₹1 to ₹5,00,000.' }; if (!(mrp >= price)) return { error: 'MRP can’t be lower than the price.' };
      if (!(stock >= 0 && stock <= 100000)) return { error: 'Stock must be 0 or more.' };
      return { name, price, mrp, stock, category: CATEGORIES.includes(b.category) ? b.category : existing?.category || vend.category, desc: b.description !== undefined ? text(b.description, 600) : existing?.short_description || null };
    };
    if (p === '/api/v8/vendor/products' && req.method === 'POST') {
      if (limited(res, `v8-vprod:${vid}`, 60, 3600000)) return true;
      const b = (await getBody(req)) || {}; const x = await readProduct(b); if (x.error) { fail(res, 400, 'VALIDATION', x.error); return true; }
      let img = null; if (b.imageData) { try { img = saveMedia(b.imageData, { videos: false, maxImage: 5 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
      const r = (await pool.query(`INSERT INTO vendor_products(vendor_profile_id,name,sku,category,price,mrp,stock,status,image_urls,short_description) VALUES($1,$2,$3,$4,$5,$6,$7,'draft',$8::jsonb,$9) RETURNING *`,
        [vend.id, x.name, 'V8-' + crypto.randomBytes(5).toString('hex').toUpperCase(), x.category, x.price, x.mrp, x.stock, JSON.stringify(img ? [img.url] : []), x.desc])).rows[0];
      ok(res, { product: await productDto(r) }, 201); return true;
    }
    if ((m = p.match(/^\/api\/v8\/vendor\/products\/(PRD-[0-9A-F]{12})(?:\/(publish|unpublish))?$/))) {
      const ref = await resolvePublicRef(m[1], ['PRODUCT']);
      const row = ref ? (await pool.query(`SELECT * FROM vendor_products WHERE id::text=$1 AND vendor_profile_id=$2 AND archived_at IS NULL`, [String(ref.entity_key), vend.id])).rows[0] : null;
      if (!row) { fail(res, 404, 'NOT_FOUND', 'Product not found in your store.'); return true; }
      if (!m[2] && req.method === 'PATCH') {
        const b = (await getBody(req)) || {}; const x = await readProduct(b, row); if (x.error) { fail(res, 400, 'VALIDATION', x.error); return true; }
        let imgs = row.image_urls; if (b.imageData) { try { const i = saveMedia(b.imageData, { videos: false, maxImage: 5 * 1024 * 1024 }); imgs = [i.url]; } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
        const r = (await pool.query(`UPDATE vendor_products SET name=$2, price=$3, mrp=$4, stock=$5, category=$6, short_description=$7, image_urls=$8::jsonb, updated_at=NOW() WHERE id=$1 RETURNING *`, [row.id, x.name, x.price, x.mrp, x.stock, x.category, x.desc, JSON.stringify(imgs || [])])).rows[0];
        ok(res, { product: await productDto(r) }); return true;
      }
      if (m[2] && req.method === 'POST') {
        if (m[2] === 'publish') {
          const imgs = (await productDto(row)).images; if (!imgs.length) { fail(res, 400, 'NEEDS_PHOTO', 'Add a photo before publishing.'); return true; }
          if (vend.store_status !== 'online') { fail(res, 409, 'STORE_OFFLINE', 'Your store is offline.'); return true; }
        }
        const r = (await pool.query(`UPDATE vendor_products SET status=$2::varchar, published_at=CASE WHEN $2::varchar='published' THEN COALESCE(published_at,NOW()) ELSE published_at END, updated_at=NOW() WHERE id=$1 RETURNING *`, [row.id, m[2] === 'publish' ? 'published' : 'draft'])).rows[0];
        ok(res, { product: await productDto(r), message: m[2] === 'publish' ? 'Live in HOWDI Shop.' : 'Hidden from Shop.' }); return true;
      }
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }

  async function admin(req, res, url, p) {
    const session = req.howdiAdminSession || null; const who = session?.username || 'admin-token'; let m;
    if (p === '/api/admin/v8/vendors/applications' && req.method === 'GET') {
      const status = ['submitted', 'info_requested', 'approved', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'submitted';
      const rows = (await pool.query(`SELECT * FROM howdi_v8_vendor_apps WHERE status=$1 ORDER BY submitted_at ${status === 'submitted' ? 'ASC' : 'DESC'} NULLS LAST LIMIT 100`, [status])).rows;
      const counts = Object.fromEntries((await pool.query(`SELECT status s, COUNT(*) n FROM howdi_v8_vendor_apps GROUP BY 1`)).rows.map((r) => [r.s, Number(r.n)]));
      const items = []; for (const a of rows) { const d = await appDto(a, true); items.push({ public_key: d.public_key, status: d.status, name: d.business_name, applicant: d.applicant, city: d.city, services: [d.category].filter(Boolean), submitted_at: d.submitted_at, waiting_hours: d.submitted_at ? Math.round((Date.now() - Date.parse(d.submitted_at)) / 3600e3) : null }); }
      await auditAdmin(req, session, 'V8_VENDOR_APPS_LIST', { status }); ok(res, { status, counts, items }); return true;
    }
    if ((m = p.match(/^\/api\/admin\/v8\/vendors\/applications\/(VAP-[0-9A-F]{12})(?:\/(document|decide))?$/))) {
      const id = await resolve(m[1], 'VAPP'); const a = id ? (await pool.query(`SELECT * FROM howdi_v8_vendor_apps WHERE id=$1`, [id])).rows[0] : null;
      if (!a) { fail(res, 404, 'NOT_FOUND', 'Application not found.'); return true; }
      if (!m[2] && req.method === 'GET') { await auditAdmin(req, session, 'V8_VENDOR_APP_VIEW', { application: m[1] }); ok(res, { application: await appDto(a, true) }); return true; }
      if (m[2] === 'document' && req.method === 'GET') {
        const f = readPrivate(a.id_file); if (!f) { fail(res, 404, 'NOT_FOUND', 'Document not found.'); return true; }
        await auditAdmin(req, session, 'V8_VENDOR_APP_DOCUMENT_VIEW', { application: m[1] });
        res.writeHead(200, { 'Content-Type': f.mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' }); res.end(f.buf); return true;
      }
      if (m[2] === 'decide' && req.method === 'POST') {
        const b = (await getBody(req)) || {}; const decision = ['approve', 'reject', 'request_info'].includes(b.decision) ? b.decision : null; const reason = line(b.reason, 600);
        if (!decision) { fail(res, 400, 'VALIDATION', 'Choose approve, reject or request info.'); return true; }
        if (decision !== 'approve' && reason.length < 5) { fail(res, 400, 'REASON_REQUIRED', 'Give the applicant a clear reason.'); return true; }
        const checks = { identity: b.checks?.identity === true, tax: b.checks?.tax === true, bank: b.checks?.bank === true };
        if (decision === 'approve' && !(checks.identity && checks.tax && checks.bank)) { fail(res, 400, 'CHECKS_REQUIRED', 'Tick identity, PAN/GST and bank checks before approving.'); return true; }
        const uid = Number(a.user_id); let store = null;
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const lock = (await client.query(`SELECT status FROM howdi_v8_vendor_apps WHERE id=$1 FOR UPDATE`, [a.id])).rows[0];
          if (lock.status !== 'submitted') { await client.query('ROLLBACK'); fail(res, 409, 'INVALID_STATE', `This application is ${lock.status.replace('_', ' ')}.`); return true; }
          const ns = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'info_requested';
          await client.query(`UPDATE howdi_v8_vendor_apps SET status=$2, review_note=$3, checks=$4::jsonb, decided_at=NOW(), decided_by=$5, updated_at=NOW() WHERE id=$1`, [a.id, ns, reason || null, JSON.stringify(checks), who]);
          if (decision === 'approve') {
            const u = (await client.query(`SELECT full_name FROM users WHERE id=$1`, [uid])).rows[0];
            let v = (await client.query(`SELECT id FROM vendor_profiles WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid])).rows[0];
            const vals = [a.business_name, u?.full_name || a.business_name, a.category, a.city, a.pincode, BIZ_TYPES[a.business_type], a.gstin, a.description];
            if (!v) v = (await client.query(`INSERT INTO vendor_profiles(user_id,business_name,owner_name,category,city,pincode,business_type,gstin,description,vendor_code,kyc_status,payout_status,store_status,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'verified','connected','online','active') RETURNING id`, [uid, ...vals, 'HOWDI-VND-' + crypto.randomBytes(3).toString('hex').toUpperCase()])).rows[0];
            else await client.query(`UPDATE vendor_profiles SET business_name=$2, owner_name=$3, category=$4, city=$5, pincode=$6, business_type=$7, gstin=$8, description=$9, kyc_status='verified', payout_status='connected', store_status='online', status='active', updated_at=NOW() WHERE id=$1`, [v.id, ...vals]);
            await client.query(`UPDATE howdi_v8_vendor_apps SET vendor_profile_id=$2 WHERE id=$1`, [a.id, v.id]); store = a.business_name;
          }
          await client.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,decided_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,$2,NOW(),NOW(),$3,$4 FROM roles WHERE code='VENDOR'
            ON CONFLICT(user_id,role_id) DO UPDATE SET role_status=$2, decided_at=NOW(), onboarding_state=$3, rejection_reason=$4, updated_at=NOW()`,
          [uid, decision === 'approve' ? 'ACTIVE' : decision === 'reject' ? 'REJECTED' : 'PENDING', decision === 'approve' ? 'COMPLETE' : decision === 'reject' ? 'REJECTED' : 'INFO_REQUESTED', decision === 'approve' ? null : reason]);
          await client.query(`INSERT INTO howdi_v8_vendor_app_events(app_id,actor,admin_username,action,reason) VALUES($1,'admin',$2,$3,$4)`, [a.id, who, decision === 'request_info' ? 'info_requested' : decision === 'approve' ? 'approved' : 'rejected', reason || null]);
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        await auditAdmin(req, session, 'V8_VENDOR_APP_DECISION', { application: m[1], decision, checks, reason: reason || null });
        if (decision === 'approve') await notify(uid, 'VENDOR_APP_APPROVED', `Your store “${store}” is approved 🎉`, 'Add products and publish them to HOWDI Shop.', '/me/vendor/store', null);
        else if (decision === 'reject') await notify(uid, 'VENDOR_APP_REJECTED', 'Your vendor application wasn’t approved', `${reason} You can fix this and apply again.`, '/me/vendor', null);
        else await notify(uid, 'VENDOR_APP_INFO', 'HOWDI needs more information for your store', reason, '/me/vendor', null);
        ok(res, { application: await appDto((await pool.query(`SELECT * FROM howdi_v8_vendor_apps WHERE id=$1`, [a.id])).rows[0], true), store: store ? { name: store } : null }); return true;
      }
    }
    return false;
  }
  return { ensureSchema, handle };
}
module.exports = { createVendorV8 };

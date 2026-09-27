// HOWDI V8 preview seed — Messages Part B demo (idempotent, *_preview database only). Fictional preview content.
// Adds what the chat cards need: Meera's crochet shop with two published products (one out of stock), a verified tailor
// (Ravi) in Works, and the demo HPay PIN 2468 for Meera and Divya so the payment screens can be walked through.
const crypto = require('node:crypto');
const IMAGE_FILES = ['248f4822153eb8458611f70be06949b2', 'bb64e1d0911cd6f2c4a63b821bd271c1', '0a3e33b05b85d5d91f0117e4f71bfeb9', '5e499d3376919f6c96b71b727ec8d054'].map((h) => `${h}.jpg`);
const IMG = IMAGE_FILES.map((f) => `/api/v8/media/${f}`);
async function seedMessages(db) {
  const q = (t, p) => db.query(t, p);
  if (!/_preview$/.test((await q('SELECT current_database() d')).rows[0].d)) throw new Error('seedMessages: preview database only');
  const users = (await q(`SELECT id, phone, full_name FROM users WHERE phone LIKE '91000000__'`)).rows;
  const uid = (n) => { const u = users.find((x) => x.phone === '910000000' + n); if (!u) throw new Error('seedMessages: demo member ' + n + ' missing'); return u; };
  const meera = uid(1), divya = uid(5), ravi = uid(6);
  // shop
  let v = (await q(`SELECT id FROM vendor_profiles WHERE user_id=$1`, [meera.id])).rows[0];
  if (!v) v = (await q(`INSERT INTO vendor_profiles(user_id,business_name,owner_name,category,kyc_status,store_status,status,city) VALUES($1,'Meera Makes','Meera Reddy','Crochet & Handmade','verified','online','active','Khammam') RETURNING id`, [meera.id])).rows[0];
  const PRODUCTS = [
    ['PV-SCARF-BERRY', 'Handmade Infinity Scarf · Berry & Cream', 899, 1099, 6, IMG],
    ['PV-SCARF-LAV', 'Chunky Infinity Scarf · Lavender Mix', 749, 749, 0, [IMG[3], IMG[2]]],
  ];
  for (const [sku, name, price, mrp, stock, imgs] of PRODUCTS) {
    const ex = (await q(`SELECT id FROM vendor_products WHERE sku=$1`, [sku])).rows[0];
    if (ex) await q(`UPDATE vendor_products SET name=$2, price=$3, mrp=$4, stock=$5, image_urls=$6::jsonb, status='published', archived_at=NULL WHERE id=$1`, [ex.id, name, price, mrp, stock, JSON.stringify(imgs)]);
    else await q(`INSERT INTO vendor_products(vendor_profile_id,name,sku,category,price,mrp,stock,status,published_at,image_urls,short_description) VALUES($1,$2,$3,'Crochet',$4,$5,$6,'published',NOW(),$7::jsonb,'Soft, handmade in Khammam')`, [v.id, name, sku, price, mrp, stock, JSON.stringify(imgs)]);
  }
  // works: a verified tailor
  let svc = (await q(`SELECT id FROM works_services WHERE service_code='PV-TAILOR'`)).rows[0];
  if (!svc) svc = (await q(`INSERT INTO works_services(service_code,name,active,customer_visible) VALUES('PV-TAILOR','Tailoring & alterations',TRUE,TRUE) RETURNING id`)).rows[0];
  let w = (await q(`SELECT id FROM works_workers WHERE worker_code='WRK-RAVI-TLR'`)).rows[0];
  if (!w) w = (await q(`INSERT INTO works_workers(worker_code,full_name,phone,user_id,kyc_status,skill_status,account_status,active,city,rating,completed_jobs) VALUES('WRK-RAVI-TLR',$1,$2,$3,'verified','verified','active',TRUE,'Khammam',4.8,37) RETURNING id`, [ravi.full_name || 'Ravi Kumar', ravi.phone, ravi.id])).rows[0];
  if (!(await q(`SELECT 1 FROM works_worker_services WHERE worker_id=$1 AND service_id=$2`, [w.id, svc.id])).rowCount) await q(`INSERT INTO works_worker_services(worker_id,service_id,status,is_primary) VALUES($1,$2,'approved',TRUE)`, [w.id, svc.id]);
  // demo HPay PIN (same scrypt scheme as the server)
  for (const u of [meera, divya]) { const salt = crypto.randomBytes(16).toString('hex'); await q(`INSERT INTO howdi_v8_hpay_pins(user_id,pin_hash,salt) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash, salt=EXCLUDED.salt, failed=0, locked_until=NULL`, [u.id, crypto.scryptSync('2468', salt, 32).toString('hex'), salt]); }
  // demo wallets: enough Preview/Test balance to walk through every payment screen
  for (const u of [meera, divya]) await q(`INSERT INTO howdi_v8_wallets(user_id,balance,sandbox) VALUES($1,8000,TRUE) ON CONFLICT(user_id) DO UPDATE SET balance=GREATEST(howdi_v8_wallets.balance,8000)`, [u.id]);
  return { shop: 'Meera Makes', products: PRODUCTS.length, worker: 'WRK-RAVI-TLR', pin: '2468 (Meera, Divya)' };
}
module.exports = { seedMessages, IMAGE_FILES };

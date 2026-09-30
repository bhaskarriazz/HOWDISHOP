// HOWDI V8 preview seed — Works demo (idempotent, *_preview database only). Fictional preview content.
// Ravi (@ravi_crafts) as a verified tailor and Kiran (@kiran_ceramics) as a verified electrician, each with a price, a
// service area, weekly hours (Mon–Sat 9:00–19:00 IST) and a couple of past reviews; demo HPay PIN 2468 for both.
const crypto = require('node:crypto');
async function seedWorks(db) {
  const q = (t, p) => db.query(t, p);
  if (!/_preview$/.test((await q('SELECT current_database() d')).rows[0].d)) throw new Error('seedWorks: preview database only');
  const users = (await q(`SELECT id, phone, full_name FROM users WHERE phone LIKE '91000000__'`)).rows;
  const uid = (n) => { const u = users.find((x) => x.phone === '910000000' + n); if (!u) throw new Error('seedWorks: demo member ' + n + ' missing'); return u; };
  const meera = uid(1), arjun = uid(2), kiran = uid(4), divya = uid(5), ravi = uid(6);
  // reuse an existing service with the same name (names are unique), otherwise create it
  const svc = async (code, name) => {
    const ex = (await q(`SELECT id FROM works_services WHERE LOWER(name)=LOWER($1) OR service_code=$2 ORDER BY (LOWER(name)=LOWER($1)) DESC LIMIT 1`, [name, code])).rows[0];
    if (ex) { await q(`UPDATE works_services SET active=TRUE, customer_visible=TRUE WHERE id=$1`, [ex.id]); return ex.id; }
    return (await q(`INSERT INTO works_services(service_code,name,active,customer_visible) VALUES($1,$2,TRUE,TRUE) RETURNING id`, [code, name])).rows[0].id;
  };
  const tailor = await svc('PV-TAILOR', 'Tailoring & alterations'); const blouse = await svc('PV-BLOUSE', 'Blouse stitching'); const elec = await svc('PV-ELEC', 'Electrician');
  const worker = async (code, u, city, price, rating, jobs, years, services) => {
    let w = (await q(`SELECT id FROM works_workers WHERE worker_code=$1`, [code])).rows[0];
    if (!w) w = (await q(`INSERT INTO works_workers(worker_code,full_name,phone,user_id,kyc_status,skill_status,account_status,active) VALUES($1,$2,$3,$4,'verified','verified','active',TRUE) RETURNING id`, [code, u.full_name, u.phone, u.id])).rows[0];
    await q(`UPDATE works_workers SET user_id=$2, city=$3, starting_price=$4, rating=$5, completed_jobs=$6, experience_years=$7, service_radius_km=8, availability_status='online', availability='online', kyc_status='verified', skill_status='verified', account_status='active', active=TRUE WHERE id=$1`, [w.id, u.id, city, price, rating, jobs, years]);
    for (const [i, s] of services.entries()) if (!(await q(`SELECT 1 FROM works_worker_services WHERE worker_id=$1 AND service_id=$2`, [w.id, s])).rowCount) await q(`INSERT INTO works_worker_services(worker_id,service_id,status,is_primary) VALUES($1,$2,'approved',$3)`, [w.id, s, i === 0]);
    await q(`DELETE FROM howdi_v8_works_hours WHERE worker_id=$1`, [w.id]);
    for (let d = 0; d < 7; d++) await q(`INSERT INTO howdi_v8_works_hours(worker_id,weekday,start_min,end_min) VALUES($1,$2,$3,$4)`, [w.id, d, d === 0 ? 0 : 540, d === 0 ? 0 : 1140]);
    return Number(w.id);
  };
  const r = await worker('WRK-RAVI-TLR', ravi, 'Khammam', 350, 4.8, 37, 9, [tailor, blouse]);
  const k = await worker('WRK-KIRAN-ELC', kiran, 'Khammam', 400, 4.6, 21, 6, [elec]);
  // past reviews (each needs its own closed work order)
  const REVIEWS = [[r, meera, 5, 'Altered three kurtas the same day. Neat finishing!', 'Thank you Meera garu, happy to help anytime.'], [r, arjun, 4, 'Good work, came 10 minutes late.', null], [k, divya, 5, 'Fixed the fan regulator quickly and explained the wiring.', null]];
  for (const [wid, cu, rating, text, resp] of REVIEWS) {
    if ((await q(`SELECT 1 FROM works_reviews WHERE worker_id=$1 AND customer_user_id=$2`, [wid, cu.id])).rowCount) continue;
    const wo = (await q(`INSERT INTO works_work_orders(customer_user_id,status,title,service_name,city,work_code,booking_source,active,created_at) VALUES($1,'completed','Past job','Past job','Khammam',$2,'V8-SEED',FALSE,NOW()-interval '20 days') RETURNING id`, [cu.id, 'V8S-' + crypto.randomBytes(5).toString('hex').toUpperCase()])).rows[0];
    await q(`INSERT INTO works_reviews(work_order_id,customer_user_id,worker_id,rating,review,created_at,worker_response,responded_at) VALUES($1,$2,$3,$4,$5,NOW()-interval '19 days',$6::text,CASE WHEN $6::text IS NULL THEN NULL ELSE NOW()-interval '18 days' END)`, [wo.id, cu.id, wid, rating, text, resp]);
  }
  for (const u of [ravi, kiran]) { const salt = crypto.randomBytes(16).toString('hex'); await q(`INSERT INTO howdi_v8_hpay_pins(user_id,pin_hash,salt) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash, salt=EXCLUDED.salt, failed=0, locked_until=NULL`, [u.id, crypto.scryptSync('2468', salt, 32).toString('hex'), salt]); }
  return { workers: ['WRK-RAVI-TLR (@ravi_crafts, tailor ₹350)', 'WRK-KIRAN-ELC (@kiran_ceramics, electrician ₹400)'], hours: 'Mon–Sat 9:00–19:00 IST', pin: '2468' };
}
module.exports = { seedWorks };

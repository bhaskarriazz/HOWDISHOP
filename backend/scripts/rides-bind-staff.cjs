'use strict';
// Trusted local operator provisioning; intentionally has no HTTP equivalent.
const { Pool } = require('pg');
const [username, handle] = process.argv.slice(2);
if (!username || !handle || process.env.HOWDI_RIDES_PREVIEW !== '1') { console.error('Usage: HOWDI_RIDES_PREVIEW=1 DATABASE_URL=<preview DB> node rides-bind-staff.cjs <staff-login> <public-handle>'); process.exit(2); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
 try {
  const db = (await pool.query('SELECT current_database() AS name')).rows[0].name;
  if (!db.endsWith('_preview')) throw Error('Only a _preview database is supported.');
  const user = (await pool.query('SELECT user_id FROM howdi_connect_profiles WHERE public_username=$1', [handle.replace(/^@/, '')])).rows[0];
  if (!user) throw Error('Existing HOWDI public handle required.');
  await pool.query('INSERT INTO howdi_ride_staff_identity(username,user_id) VALUES($1,$2) ON CONFLICT(username) DO UPDATE SET user_id=$2', [username, user.user_id]);
  console.log('Preview staff identity linked. Self-decisions will be refused.');
 } finally { await pool.end(); }
})().catch(e => { console.error(e.message); process.exitCode=1; });

// P5B — real PostgreSQL coverage for V8 watch history and download authorization.
const crypto = require('node:crypto');
const L = require('../worker-pg/lib.cjs');
const { pool, check, finish, api } = L;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR5ErkJggg==';
const LABEL = `v8 09 media access (${process.env.V8_EXPECT_SANDBOX === '1' ? 'sandbox' : 'no-sandbox'})`;
const digest = (url) => crypto.createHash('sha256').update(String(url).split('/').pop()).digest('hex');

async function member(name, handle, privateProfile = false) {
  const u = await L.mkUser(name);
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode) VALUES($1,$2,TRUE,$3,FALSE) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username,private_profile=EXCLUDED.private_profile`, [u.id, handle, privateProfile]);
  return { ...u, handle };
}
async function createVibe(owner, caption, allowDownload = false) {
  const r = await api('POST', '/api/v8/vibes', { token: owner.token, body: { caption, mediaData: PNG, allowDownload } });
  check(`create ${caption}`, r.status === 201 && /^VIB-[0-9A-F]{12}$/.test(r.json?.vibe?.public_key || ''), r.text);
  return r.json?.vibe?.public_key;
}

(async () => {
  const started = await L.start(); check('server starts', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await member('P5B Owner', 'p5b_owner'); const B = await member('P5B Viewer', 'p5b_viewer'); const C = await member('P5B Blocked', 'p5b_blocked');
  const vk = await createVibe(A, 'downloadable Vibe', true); const vk2 = await createVibe(A, 'second Vibe', false);

  const progress = await api('POST', `/api/v8/vibes/${vk}/watch-progress`, { token: B.token, body: { event: 'pause', position_ms: 4200, duration_ms: 10000, source_feed: 'for-you' } });
  check('record progress + resume position', progress.status === 200 && progress.json.resume_position_ms === 4200, progress.text);
  const history = await api('GET', '/api/v8/me/watch-history', { token: B.token });
  const item = (history.json.items || []).find((x) => x.public_key === vk);
  check('history list has public code and resume only', history.status === 200 && item?.resume_position_ms === 4200 && !/"(?:id|vibe_id|user_id|uuid)"\s*:/.test(history.text), history.text);
  check('clear one is owner-only and idempotent', (await api('DELETE', `/api/v8/me/watch-history/${vk}`, { token: B.token })).json?.cleared === true && !(await api('GET', '/api/v8/me/watch-history', { token: B.token })).json.items.some((x) => x.public_key === vk));
  await api('POST', `/api/v8/vibes/${vk}/watch-progress`, { token: B.token, body: { event: 'resume', position_ms: 3100, duration_ms: 10000 } });
  await api('POST', `/api/v8/vibes/${vk2}/watch-progress`, { token: B.token, body: { event: 'play', position_ms: 100, duration_ms: 10000 } });
  const all = await api('DELETE', '/api/v8/me/watch-history', { token: B.token });
  check('clear all clears only viewer history', all.status === 200 && all.json.cleared_count === 2 && (await api('GET', '/api/v8/me/watch-history', { token: B.token })).json.items.length === 0, all.text);

  await pool.query(`UPDATE howdi_connect_profiles SET private_profile=TRUE WHERE user_id=$1`, [A.id]);
  check('private-profile denies progress', (await api('POST', `/api/v8/vibes/${vk}/watch-progress`, { token: B.token, body: { event: 'play', position_ms: 1, duration_ms: 10000 } })).status === 404);
  await pool.query(`UPDATE howdi_connect_profiles SET private_profile=FALSE WHERE user_id=$1`, [A.id]);
  await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2)`, [B.id, A.id]);
  check('blocked viewer denied', (await api('POST', `/api/v8/vibes/${vk}/watch-progress`, { token: B.token, body: { event: 'play', position_ms: 1, duration_ms: 10000 } })).status === 404);
  await pool.query(`DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1 AND blocked_user_id=$2`, [B.id, A.id]);
  await pool.query(`UPDATE vibes SET moderation_status='blocked' WHERE id=(SELECT entity_key::uuid FROM howdi_v8_refs WHERE public_code=$1)`, [vk]);
  check('moderated Vibe denied', (await api('GET', `/api/v8/vibes/${vk}`, { token: B.token })).status === 404);
  await pool.query(`UPDATE vibes SET moderation_status='approved',deleted_at=NOW() WHERE id=(SELECT entity_key::uuid FROM howdi_v8_refs WHERE public_code=$1)`, [vk]);
  check('deleted Vibe denied', (await api('GET', `/api/v8/vibes/${vk}`, { token: B.token })).status === 404);
  await pool.query(`UPDATE vibes SET deleted_at=NULL,status='rights_blocked' WHERE id=(SELECT entity_key::uuid FROM howdi_v8_refs WHERE public_code=$1)`, [vk]);
  check('revoked Vibe denied', (await api('GET', `/api/v8/vibes/${vk}`, { token: B.token })).status === 404);
  await pool.query(`UPDATE vibes SET status='published' WHERE id=(SELECT entity_key::uuid FROM howdi_v8_refs WHERE public_code=$1)`, [vk]);

  check('download disabled denied', (await api('GET', `/api/v8/vibes/${vk2}/download`, { token: B.token })).status === 403);
  const auth = await api('GET', `/api/v8/vibes/${vk}/download`, { token: B.token }); const url = auth.json?.download_url;
  check('valid authorization has opaque short-lived URL only', auth.status === 200 && /^\/api\/v8\/media\/download\/[A-Za-z0-9_-]+$/.test(url || '') && !/\/api\/v8\/media\/[0-9a-f]{32}\./.test(auth.text), auth.text);
  const tokenDigest = digest(url); const leaked = (await pool.query(`SELECT token_digest,media_file FROM howdi_v8_download_authorizations WHERE token_digest=$1`, [tokenDigest])).rows[0];
  check('audit stores no raw token', leaked?.token_digest === tokenDigest && !JSON.stringify(await pool.query(`SELECT * FROM howdi_v8_media_audit`)).includes(String(url).split('/').pop()));
  const delivered = await fetch(L.base() + url, { headers: { authorization: `Bearer ${B.token}` } });
  check('authorized delivery streams attachment', delivered.status === 200 && /attachment/.test(delivered.headers.get('content-disposition') || ''));
  await pool.query(`UPDATE howdi_v8_download_authorizations SET expires_at=NOW()-interval '1 second' WHERE token_digest=$1`, [tokenDigest]);
  check('expired token denied', (await fetch(L.base() + url, { headers: { authorization: `Bearer ${B.token}` } })).status === 403);
  const revoked = await api('GET', `/api/v8/vibes/${vk}/download`, { token: B.token }); const revokedUrl = revoked.json?.download_url;
  await pool.query(`UPDATE howdi_v8_download_authorizations SET revoked_at=NOW() WHERE token_digest=$1`, [digest(revokedUrl)]);
  check('revoked token denied', (await fetch(L.base() + revokedUrl, { headers: { authorization: `Bearer ${B.token}` } })).status === 403);
  const recheck = await api('GET', `/api/v8/vibes/${vk}/download`, { token: B.token }); const recheckUrl = recheck.json?.download_url;
  await pool.query(`UPDATE vibes SET allow_download=FALSE WHERE id=(SELECT entity_key::uuid FROM howdi_v8_refs WHERE public_code=$1)`, [vk]);
  check('delivery revalidates uploader permission', (await fetch(L.base() + recheckUrl, { headers: { authorization: `Bearer ${B.token}` } })).status === 403);
  await finish(LABEL);
})().catch(async (e) => { console.log('FAIL crashed', e && e.stack); await finish(LABEL); });

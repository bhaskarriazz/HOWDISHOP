'use strict';
// =====================================================================================
// HOWDI V8 — LIVE + SPACES rooms (boards 06 panel 5, 17, PRIOR-07 panels 3–4; register COM-*, CON Live/Space rows)
// Rooms are the existing howdi_connect_communities rows (community_type LIVE | SPACE) addressed by LIV-/SPC- codes.
//
//   GET  /api/v8/live?tab=now|upcoming|past           GET /api/v8/spaces?tab=for-you|upcoming|mine
//   GET  /api/v8/rooms/{LIV|SPC}                       room detail + viewer role + stage state
//   GET  /api/v8/rooms/{code}/events?after=            chat / reactions / tips / system events (polling)
//   POST /api/v8/rooms/{code}/join|leave|remind|chat|react|hand|tip|report
//   POST /api/v8/rooms/{code}/host/start|end|pin|approve-speaker|mute|remove   (host only)
//   GET  /api/v8/wallet                                Preview/Test HPay sandbox balance (tips); real money needs a PSP
//
// Rules: session-only actor, public codes, DTO allow-lists (via connect-v8 helpers), block-aware, rate-limited.
// Streaming media is NOT connected (no broadcast/WebRTC provider): the stage shows a labelled Preview/Test feed.
// =====================================================================================
function createConnectV8Rooms(deps) {
  const { pool, getBody, rateLimit, clientIp, logger = console, sandboxEnabled } = deps;
  const H = deps.helpers; // connectV8._internal
  const { issue, resolve, authorCols, authorJoins, authorDto, blockedSql, viewer, limited, ok, fail } = H;
  const text = (v, max) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const iso = (v) => { if (!v) return null; const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
  const count = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const img = (v) => { const s = String(v || ''); return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 600000 ? s : /^\/(?!\/)[^\s"'<>]{1,300}$/.test(s) ? s : null; };
  const REACTIONS = ['❤️', '👏', '🔥', '😂', '💡', '🙌'];
  const TIP_AMOUNTS = [10, 20, 50, 100, 200, 500];

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_room_presence(
      room_id BIGINT NOT NULL, user_id BIGINT NOT NULL, role VARCHAR(12) NOT NULL DEFAULT 'viewer', hand_raised BOOLEAN NOT NULL DEFAULT FALSE,
      muted BOOLEAN NOT NULL DEFAULT FALSE, removed BOOLEAN NOT NULL DEFAULT FALSE, joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(room_id, user_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_room_events(
      id BIGSERIAL PRIMARY KEY, room_id BIGINT NOT NULL, user_id BIGINT, kind VARCHAR(12) NOT NULL, body VARCHAR(500), amount NUMERIC(12,2),
      pinned BOOLEAN NOT NULL DEFAULT FALSE, hidden BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_room_events_idx ON howdi_v8_room_events(room_id, id)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_wallets(user_id BIGINT PRIMARY KEY, balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance>=0), currency CHAR(3) NOT NULL DEFAULT 'INR', sandbox BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_ledger(
      id BIGSERIAL PRIMARY KEY, txn_code VARCHAR(24) NOT NULL, user_id BIGINT NOT NULL, direction VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
      amount NUMERIC(14,2) NOT NULL CHECK (amount>0), kind VARCHAR(24) NOT NULL, counterparty_user_id BIGINT, reference VARCHAR(64), note VARCHAR(200),
      status VARCHAR(12) NOT NULL DEFAULT 'COMPLETED', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_ledger_user_idx ON howdi_v8_ledger(user_id, created_at DESC)`);
  }

  // ------------------------------------------------------------ rooms
  const ROOM_COLS = `c.id::text rkey, c.id AS rid, c.community_type, c.name, c.topic, c.description, c.category, c.session_status, c.scheduled_for, c.started_at, c.ended_at,
      c.live_thumbnail_data, c.space_rules, c.replay_enabled, c.owner_user_id AS owner_id, c.chat_mode, c.chat_slow_seconds,
      (SELECT COUNT(*) FROM howdi_v8_room_presence p WHERE p.room_id=c.id AND NOT p.removed AND p.last_seen>NOW()-interval '2 minutes') online,
      (SELECT COUNT(*) FROM (SELECT user_id FROM howdi_connect_live_reminders r WHERE r.community_id=c.id UNION SELECT user_id FROM howdi_connect_space_reminders r WHERE r.community_id=c.id) x) reminders,
      ($1::bigint>0 AND (EXISTS(SELECT 1 FROM howdi_connect_live_reminders r WHERE r.community_id=c.id AND r.user_id=$1::bigint) OR EXISTS(SELECT 1 FROM howdi_connect_space_reminders r WHERE r.community_id=c.id AND r.user_id=$1::bigint))) v_reminded,
      (SELECT lr.replay_url FROM howdi_connect_live_replays lr WHERE lr.community_id=c.id AND lr.replay_status='READY' ORDER BY lr.created_at DESC LIMIT 1) replay_url,
      (SELECT lr.duration_seconds FROM howdi_connect_live_replays lr WHERE lr.community_id=c.id AND lr.replay_status='READY' ORDER BY lr.created_at DESC LIMIT 1) replay_seconds,
      (SELECT row_to_json(pp) FROM (SELECT role, hand_raised, muted, removed FROM howdi_v8_room_presence p WHERE p.room_id=c.id AND p.user_id=$1::bigint) pp) v_presence,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=c.owner_user_id)) v_following_host,
      ${authorCols('a_u.id', 'a_')}`;
  const ROOM_FROM = `FROM howdi_connect_communities c ${authorJoins('c.owner_user_id', 'a_')}`;
  const ROOM_VISIBLE = `COALESCE(c.status,'ACTIVE') NOT IN ('ARCHIVED','REMOVED','DELETED') AND COALESCE(c.privacy,'PUBLIC')='PUBLIC' AND a_u.id IS NOT NULL
      AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')}))`;
  function state(r) {
    const s = String(r.session_status || 'SCHEDULED').toUpperCase();
    if (s === 'LIVE') return 'live';
    if (s === 'ENDED') return r.replay_url ? 'replay' : 'ended';
    if (s === 'CANCELLED') return 'cancelled';
    return 'scheduled';
  }
  function roomDto(r, code, vid) {
    const host = authorDto(r, 'a_'); if (!host) return null;
    const kind = r.community_type === 'SPACE' ? 'space' : 'live';
    const pres = r.v_presence || null;
    const isHost = vid > 0 && Number(r.owner_id) === vid;
    return {
      public_key: code, kind, title: text(r.name, 120), topic: text(r.topic || r.description, 240) || null, category: text(r.category, 40) || null,
      state: state(r), starts_at: iso(r.scheduled_for), started_at: iso(r.started_at), ended_at: iso(r.ended_at), image_url: img(r.live_thumbnail_data), host,
      counts: { online: count(r.online), reminders: count(r.reminders) }, rules: text(r.space_rules, 600) || null,
      replay: r.replay_url ? { url: /^\/(?!\/)[^\s"'<>]{1,300}$/.test(String(r.replay_url)) ? r.replay_url : null, seconds: count(r.replay_seconds) } : null,
      viewer: { reminded: r.v_reminded === true, joined: Boolean(pres && !pres.removed), role: isHost ? 'host' : pres ? pres.role : 'none', hand_raised: Boolean(pres && pres.hand_raised), muted: Boolean(pres && pres.muted), removed: Boolean(pres && pres.removed), following_host: r.v_following_host === true },
      chat_mode: ['open', 'followers', 'off'].includes(String(r.chat_mode || '').toLowerCase()) ? String(r.chat_mode).toLowerCase() : 'open',
      route: `/connect/${kind === 'space' ? 'spaces' : 'live'}/${code}`,
    };
  }
  async function roomList(vid, type, tab, limit = 30) {
    let where = '';
    if (tab === 'now') where = `AND c.session_status='LIVE'`;
    else if (tab === 'upcoming') where = `AND c.session_status='SCHEDULED' AND (c.scheduled_for IS NULL OR c.scheduled_for>NOW()-interval '1 hour')`;
    else if (tab === 'past') where = `AND c.session_status='ENDED'`;
    else if (tab === 'mine') where = `AND ($1::bigint>0 AND (c.owner_user_id=$1::bigint OR EXISTS(SELECT 1 FROM howdi_connect_space_reminders r WHERE r.community_id=c.id AND r.user_id=$1::bigint) OR EXISTS(SELECT 1 FROM howdi_v8_room_presence p WHERE p.room_id=c.id AND p.user_id=$1::bigint)))`;
    else where = `AND c.session_status IN ('LIVE','SCHEDULED')`;
    const rows = (await pool.query(`SELECT ${ROOM_COLS} ${ROOM_FROM} WHERE c.community_type=$2 AND ${ROOM_VISIBLE} ${where}
      ORDER BY (c.session_status='LIVE') DESC, CASE WHEN c.session_status='ENDED' THEN NULL ELSE c.scheduled_for END ASC NULLS LAST, c.ended_at DESC NULLS LAST LIMIT $3`, [vid || 0, type, limit])).rows;
    const refs = await issue(type === 'SPACE' ? 'SPACE' : 'LIVE', rows.map((r) => r.rkey));
    return rows.map((r) => roomDto(r, refs.get(String(r.rkey)), vid)).filter((x) => x && x.public_key);
  }
  async function roomByCode(code, vid) {
    const type = code.startsWith('SPC-') ? 'SPACE' : 'LIVE';
    const key = await resolve(code, type); if (!key) return null;
    const r = (await pool.query(`SELECT ${ROOM_COLS} ${ROOM_FROM} WHERE c.id=$2::bigint AND c.community_type=$3 AND ${ROOM_VISIBLE}`, [vid || 0, key, type])).rows[0];
    return r || null;
  }
  async function events(room, vid, after) {
    const rows = (await pool.query(`SELECT e.id, e.kind, e.body, e.amount, e.pinned, e.created_at, (e.user_id=$3::bigint) mine, ${authorCols('a_u.id', 'a_')}
      FROM howdi_v8_room_events e ${authorJoins('e.user_id', 'a_')}
      WHERE e.room_id=$1 AND e.id>$2 AND NOT e.hidden AND (e.user_id IS NULL OR e.user_id=$3::bigint OR NOT (${blockedSql('$3::bigint', 'e.user_id')}))
      ORDER BY e.id ASC LIMIT 100`, [room.rid, Math.max(0, Number(after) || 0), vid || 0])).rows;
    return rows.map((e) => ({ seq: Number(e.id), kind: e.kind, text: text(e.body, 500), amount: e.amount != null ? Number(e.amount) : null, pinned: e.pinned === true, created_at: iso(e.created_at), mine: e.mine === true, author: e.a_a_handle ? authorDto(e, 'a_') : null }));
  }
  async function participants(room, vid) {
    const rows = (await pool.query(`SELECT p.role, p.hand_raised, p.muted, ${authorCols('a_u.id', 'a_')}, (p.user_id=$2::bigint) me
      FROM howdi_v8_room_presence p ${authorJoins('p.user_id', 'a_')} WHERE p.room_id=$1 AND NOT p.removed AND p.last_seen>NOW()-interval '2 minutes'
      ORDER BY CASE p.role WHEN 'host' THEN 0 WHEN 'speaker' THEN 1 ELSE 2 END, p.joined_at LIMIT 60`, [room.rid, vid || 0])).rows;
    return rows.map((r) => ({ role: r.role, hand_raised: r.hand_raised === true, muted: r.muted === true, me: r.me === true, person: authorDto(r, 'a_') })).filter((x) => x.person);
  }
  async function event(roomId, userId, kind, body, amount) {
    await pool.query(`INSERT INTO howdi_v8_room_events(room_id,user_id,kind,body,amount) VALUES($1,$2,$3,$4,$5)`, [roomId, userId || null, kind, body || null, amount || null]);
  }

  // ------------------------------------------------------------ Preview/Test wallet (tips)
  async function wallet(uid, client = pool) {
    if (sandboxEnabled()) await client.query(`INSERT INTO howdi_v8_wallets(user_id,balance,sandbox) VALUES($1,2000,TRUE) ON CONFLICT DO NOTHING`, [uid]);
    return (await client.query(`SELECT balance, currency, sandbox FROM howdi_v8_wallets WHERE user_id=$1`, [uid])).rows[0] || null;
  }
  async function tip(room, v, amount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const w = await wallet(v.id, client);
      if (!w) { await client.query('ROLLBACK'); return { error: [503, 'PAYMENT_PROVIDER_REQUIRED', 'Tips need HPay, which isn’t connected in this environment.'] }; }
      const upd = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [v.id, amount]);
      if (!upd.rows[0]) { await client.query('ROLLBACK'); return { error: [402, 'INSUFFICIENT_BALANCE', 'Not enough HPay balance for this tip.'] }; }
      await wallet(room.owner_id, client);
      await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [room.owner_id, amount]);
      const code = 'HPT-' + require('node:crypto').randomBytes(5).toString('hex').toUpperCase();
      await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,counterparty_user_id,reference,note) VALUES($1,$2,'DEBIT',$3,'LIVE_TIP',$4,$5,$6),($1,$4,'CREDIT',$3,'LIVE_TIP',$2,$5,$6)`,
        [code, v.id, amount, room.owner_id, room.rkey, `Tip in “${text(room.name, 80)}”`]);
      await client.query(`INSERT INTO howdi_v8_room_events(room_id,user_id,kind,body,amount) VALUES($1,$2,'tip',$3,$4)`, [room.rid, v.id, 'sent a tip', amount]);
      await client.query('COMMIT');
      return { receipt: { code, amount, balance: Number(upd.rows[0].balance), sandbox: true } };
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  }

  // ------------------------------------------------------------ router
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    let m;
    if (p === '/api/v8/live' || p === '/api/v8/spaces') {
      if (req.method !== 'GET') { fail(res, 405, 'METHOD_NOT_ALLOWED', 'Not supported.'); return true; }
      const v = await viewer(req); const vid = v ? v.id : 0;
      if (limited(res, `v8-rooms:${vid || clientIp(req)}`, 120, 60000)) return true;
      const space = p.endsWith('spaces');
      const tab = String(url.searchParams.get('tab') || (space ? 'for-you' : 'now'));
      const allowed = space ? ['for-you', 'upcoming', 'mine'] : ['now', 'upcoming', 'past'];
      if (!allowed.includes(tab)) { fail(res, 400, 'INVALID_PARAMS', 'Unknown tab.'); return true; }
      if (tab === 'mine' && !v) { ok(res, { tab, items: [], needs_sign_in: true }); return true; }
      ok(res, { tab, items: await roomList(vid, space ? 'SPACE' : 'LIVE', tab) });
      return true;
    }
    if (p === '/api/v8/wallet' && req.method === 'GET') {
      const v = await viewer(req); if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to see your HPay balance.'); return true; }
      const w = await wallet(v.id);
      ok(res, { wallet: w ? { balance: Number(w.balance), currency: w.currency, sandbox: w.sandbox === true } : null, tip_amounts: TIP_AMOUNTS });
      return true;
    }
    if (!(m = p.match(/^\/api\/v8\/rooms\/((?:LIV|SPC)-[0-9A-F]{12})(?:\/([a-z-]+(?:\/[a-z-]+)?))?$/))) return false;
    const code = m[1]; const action = m[2] || '';
    const v = await viewer(req); const vid = v ? v.id : 0;
    const room = await roomByCode(code, vid);
    if (!room) { fail(res, 404, 'NOT_FOUND', 'This room isn’t available.'); return true; }
    if (!action && req.method === 'GET') {
      const dto = roomDto(room, code, vid);
      ok(res, { room: dto, participants: dto.state === 'live' ? await participants(room, vid) : [], wallet_sandbox: sandboxEnabled() });
      return true;
    }
    if (action === 'events' && req.method === 'GET') {
      if (vid && room.v_presence) await pool.query(`UPDATE howdi_v8_room_presence SET last_seen=NOW() WHERE room_id=$1 AND user_id=$2`, [room.rid, vid]);
      const r = roomDto(room, code, vid);
      ok(res, { state: r.state, counts: r.counts, viewer: r.viewer, events: await events(room, vid, url.searchParams.get('after')), participants: r.state === 'live' ? await participants(room, vid) : [] });
      return true;
    }
    if (req.method !== 'POST') { fail(res, 405, 'METHOD_NOT_ALLOWED', 'Not supported.'); return true; }
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }
    if (limited(res, `v8-room-act:${vid}`, 90, 60000)) return true;
    const body = (await getBody(req)) || {};
    const isHost = Number(room.owner_id) === vid;
    const pres = room.v_presence;
    const st = state(room);
    const isSpace = room.community_type === 'SPACE';
    if (action === 'remind') {
      const table = isSpace ? 'howdi_connect_space_reminders' : 'howdi_connect_live_reminders';
      if (room.v_reminded) await pool.query(`DELETE FROM ${table} WHERE community_id=$1 AND user_id=$2`, [room.rid, vid]);
      else await pool.query(`INSERT INTO ${table}(community_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [room.rid, vid]);
      ok(res, { reminded: !room.v_reminded, message: room.v_reminded ? 'Reminder removed.' : 'We’ll notify you when it starts.' }); return true;
    }
    if (action === 'report') {
      const reason = String(body.reason || '');
      if (!['spam', 'harassment', 'hate', 'violence', 'nudity', 'misinformation', 'copyright', 'self-harm', 'scam', 'other'].includes(reason)) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
      await pool.query(`INSERT INTO howdi_connect_trust_moderation_queue(reporter_user_id,target_user_id,entity_type,entity_id,reason,details,trust_weight) VALUES($1,$2,$3,$4,$5,$6,1)`,
        [vid, room.owner_id, isSpace ? 'SPACE' : 'LIVE', room.rkey, reason, text(body.details, 1000) || '']);
      ok(res, { reported: true, message: 'Thanks — our safety team will review this room.' }); return true;
    }
    if (action === 'join') {
      if (st !== 'live') { fail(res, 409, 'NOT_LIVE', st === 'scheduled' ? 'This hasn’t started yet. Set a reminder and we’ll tell you when it goes live.' : 'This session has ended.'); return true; }
      if (pres && pres.removed) { fail(res, 403, 'REMOVED', 'The host removed you from this room.'); return true; }
      await pool.query(`INSERT INTO howdi_v8_room_presence(room_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(room_id,user_id) DO UPDATE SET last_seen=NOW()`, [room.rid, vid, isHost ? 'host' : 'viewer']);
      if (!pres) await event(room.rid, vid, 'system', 'joined');
      ok(res, { joined: true, role: isHost ? 'host' : (pres && pres.role) || 'viewer' }); return true;
    }
    if (action === 'leave') {
      await pool.query(`UPDATE howdi_v8_room_presence SET last_seen=NOW()-interval '10 minutes', hand_raised=FALSE WHERE room_id=$1 AND user_id=$2`, [room.rid, vid]);
      ok(res, { left: true }); return true;
    }
    const inRoom = isHost || (pres && !pres.removed);
    if (['chat', 'react', 'hand', 'tip'].includes(action)) {
      if (st !== 'live') { fail(res, 409, 'NOT_LIVE', 'This room isn’t live.'); return true; }
      if (!inRoom) { fail(res, 403, 'JOIN_FIRST', 'Join the room first.'); return true; }
    }
    if (action === 'chat') {
      if (pres && pres.muted && !isHost) { fail(res, 403, 'MUTED', 'The host muted you in this chat.'); return true; }
      if (String(room.chat_mode || '').toLowerCase() === 'off' && !isHost) { fail(res, 403, 'CHAT_OFF', 'Chat is off for this room.'); return true; }
      if (limited(res, `v8-room-chat:${vid}:${room.rid}`, Math.max(6, 60 / Math.max(1, count(room.chat_slow_seconds) || 1)), 60000)) return true;
      const t = text(body.text, 300); if (!t) { fail(res, 400, 'VALIDATION', 'Write a message first.'); return true; }
      await event(room.rid, vid, 'chat', t); ok(res, { sent: true }, 201); return true;
    }
    if (action === 'react') {
      const e = REACTIONS.includes(String(body.reaction)) ? String(body.reaction) : '❤️';
      await event(room.rid, vid, 'reaction', e); ok(res, { reacted: e }); return true;
    }
    if (action === 'hand') {
      if (!isSpace) { fail(res, 400, 'NOT_A_SPACE', 'Raise hand is for Spaces.'); return true; }
      const up = !(pres && pres.hand_raised);
      await pool.query(`UPDATE howdi_v8_room_presence SET hand_raised=$3 WHERE room_id=$1 AND user_id=$2`, [room.rid, vid, up]);
      if (up) await event(room.rid, vid, 'system', 'raised a hand');
      ok(res, { hand_raised: up, message: up ? 'Request sent — the host can invite you to speak.' : 'Request withdrawn.' }); return true;
    }
    if (action === 'tip') {
      if (isHost) { fail(res, 400, 'SELF_TIP', 'You can’t tip yourself.'); return true; }
      const amount = Number(body.amount);
      if (!TIP_AMOUNTS.includes(amount)) { fail(res, 400, 'VALIDATION', 'Choose a tip amount.'); return true; }
      if (limited(res, `v8-tip:${vid}`, 10, 10 * 60000)) return true;
      const r = await tip(room, v, amount);
      if (r.error) { fail(res, r.error[0], r.error[1], r.error[2]); return true; }
      ok(res, { receipt: r.receipt, message: `₹${amount} sent to @${room.a_a_handle}.` }, 201); return true;
    }
    // host controls
    if (action.startsWith('host/')) {
      if (!isHost) { fail(res, 403, 'HOST_ONLY', 'Only the host can do that.'); return true; }
      const what = action.slice(5);
      if (what === 'start') {
        if (st !== 'scheduled') { fail(res, 409, 'INVALID_STATE', 'This room can’t be started now.'); return true; }
        await pool.query(`UPDATE howdi_connect_communities SET session_status='LIVE', started_at=NOW(), updated_at=NOW() WHERE id=$1`, [room.rid]);
        await pool.query(`INSERT INTO howdi_v8_room_presence(room_id,user_id,role) VALUES($1,$2,'host') ON CONFLICT(room_id,user_id) DO UPDATE SET role='host', last_seen=NOW()`, [room.rid, vid]);
        await event(room.rid, vid, 'system', 'went live'); ok(res, { state: 'live' }); return true;
      }
      if (what === 'end') {
        if (st !== 'live') { fail(res, 409, 'INVALID_STATE', 'This room isn’t live.'); return true; }
        await pool.query(`UPDATE howdi_connect_communities SET session_status='ENDED', ended_at=NOW(), updated_at=NOW() WHERE id=$1`, [room.rid]);
        await event(room.rid, vid, 'system', 'ended the session'); ok(res, { state: 'ended' }); return true;
      }
      const target = await H.userIdByHandle(body.handle);
      if (['approve-speaker', 'mute', 'remove'].includes(what) && (!target || target === vid)) { fail(res, 404, 'NOT_FOUND', 'That person isn’t in this room.'); return true; }
      if (what === 'approve-speaker') {
        if (!isSpace) { fail(res, 400, 'NOT_A_SPACE', 'Speakers are for Spaces.'); return true; }
        const u = await pool.query(`UPDATE howdi_v8_room_presence SET role=CASE WHEN role='speaker' THEN 'viewer' ELSE 'speaker' END, hand_raised=FALSE WHERE room_id=$1 AND user_id=$2 AND NOT removed RETURNING role`, [room.rid, target]);
        if (!u.rows[0]) { fail(res, 404, 'NOT_FOUND', 'That person isn’t in this room.'); return true; }
        await event(room.rid, target, 'system', u.rows[0].role === 'speaker' ? 'is now a speaker' : 'moved to the audience'); ok(res, { role: u.rows[0].role }); return true;
      }
      if (what === 'mute') {
        const u = await pool.query(`UPDATE howdi_v8_room_presence SET muted=NOT muted WHERE room_id=$1 AND user_id=$2 RETURNING muted`, [room.rid, target]);
        if (!u.rows[0]) { fail(res, 404, 'NOT_FOUND', 'That person isn’t in this room.'); return true; }
        ok(res, { muted: u.rows[0].muted }); return true;
      }
      if (what === 'remove') {
        await pool.query(`UPDATE howdi_v8_room_presence SET removed=TRUE, role='viewer', hand_raised=FALSE WHERE room_id=$1 AND user_id=$2`, [room.rid, target]);
        await pool.query(`UPDATE howdi_v8_room_events SET hidden=TRUE WHERE room_id=$1 AND user_id=$2 AND kind='chat'`, [room.rid, target]);
        ok(res, { removed: true }); return true;
      }
      if (what === 'pin') {
        const seq = Number(body.seq);
        await pool.query(`UPDATE howdi_v8_room_events SET pinned=(id=$2) WHERE room_id=$1 AND kind='chat'`, [room.rid, Number.isSafeInteger(seq) ? seq : 0]);
        ok(res, { pinned: seq || null }); return true;
      }
      fail(res, 404, 'NOT_FOUND', 'Unknown host action.'); return true;
    }
    fail(res, 404, 'NOT_FOUND', 'Unknown action.'); return true;
  }
  return { ensureSchema, handle, _internal: { wallet } };
}
module.exports = { createConnectV8Rooms };

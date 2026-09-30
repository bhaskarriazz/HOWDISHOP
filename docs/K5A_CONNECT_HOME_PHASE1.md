# K5A Connect Home — Phase 1 (Home shell + shared public contracts)

**Branch:** `k5a-connect-home` (from Stage 3 head `b181d75`) · **Scope:** approved Phase 1 boundary only.
Not merged, pushed or deployed.

## What Phase 1 delivers

| Area | Implementation |
|---|---|
| Guest Home | `GET /api/connect/home` is guest-browsable (removed from the K5E sign-in-only list). Guests get `viewer:"guest"`, `home_variant:"curated"`; Continue Watching / Recent Activity / Continue Your Journey are `hidden`. |
| Signed-in Home | Viewer comes only from the Bearer session (`viewer:"session"`, `home_variant:"personalized"`). Revoked, unknown or suspended sessions fall back to the curated guest Home. |
| Manifest | `{status, viewer, home_variant, order[16], sections:{key:{state,title,…data}}}`; `state` ∈ `ready · empty · error · hidden · deferred`. Above-fold sections (Special, Hero, Stories, For You, Vibes) load eagerly; the rest are `deferred` until requested with `?sections=`. One failing section returns `state:"error"` without SQL/stack details. |
| Public DTOs | Every card is an allow-listed DTO (`public_key`, `author{public_username,display_name,avatar_url}`, content excerpt, counts, `route`). A final `stripInternalKeys` pass removes any id/UUID/howdi_id/master_id/email/phone/address/score/status/moderation key. |
| Public references | `howdi_public_refs(entity_type, entity_key, public_code)` — `PST-` posts, `ART-` articles, `STY-` stories, `PRD-` products, `CRS-` courses (prefix + 12 random hex). A reference is issued only for rows that passed every SQL and JS visibility check for that viewer. Shop/Learn tables are not altered. |
| Deep links | `/posts/PST-…`, `/articles/ART-…`, `/stories/STY-…` open a read-only viewer via `GET /api/connect/posts/by-code/{code}` and `GET /api/connect/stories/by-code/{code}` (hidden, missing, malformed and wrong-kind codes return one identical 404). Shop and Learn cards carry their canonical route but open the safe pillar landing (`landing{area,view}`) until those pillars accept public codes. |
| For You feed | `GET /api/connect/home/feed?cursor=&limit=` (1–20, default 10). The first page stores a ranked list of up to 200 candidates in `howdi_connect_feed_sessions` (24 h TTL, keyed viewer hash). The cursor is AES-256-GCM (`hc1.` + base64url) holding only `{feed session, position, viewer binding, issued-at}`; it is unreadable and tamper-evident, and cannot be replayed by another viewer. Visibility is re-applied on every page. Expired → `410 CURSOR_EXPIRED`; invalid/forged/other-viewer → `400 INVALID_CURSOR`. |
| Cursor key | `HOWDI_HOME_CURSOR_KEY` (≥ 32 chars) is required outside development. With `NODE_ENV` other than development/test and no key, the feed fails closed (`503`, For You `state:"error"`) and boot logs a fatal-config error. Development/test without a key use a random per-process key — never a predictable fallback. |
| Visibility floor | Authors/people: public username (not digits-only), discoverable, active account, not blocked either way, private profiles only for followers. Posts: published or due-scheduled, never subscriber-only, audience `EVERYONE` for guests / `connectPostVisibleSql` for signed-in viewers. Shop, Works and Learn sections mirror their pillar's public gate in read-only Home queries. |
| Navigation | Logo, bottom-nav **Home**, sidebar **Home** and header **Home** open Connect Home. The Crochet marketing landing moved to Shop → **Handmade Crochet**. Connect Home is rendered exactly once. |
| Rate limits | Manifest 60/min guest, 120/min user; lazy section calls 180/360; feed pages 120/240; by-code reads 120/240. |

## Files

- `backend/connect-home-k5a.cjs` (new) — contracts, SQL, visibility, references, feed sessions, cursor.
- `backend/server.js` — guard list, module wiring, boot schema step; old in-line Home handler removed.
- `apps/customer/src/App.jsx`, `apps/customer/src/ux-recovery.css` — manifest loader, 16-section DTO render, item viewer, Home navigation, stable above-fold skeletons, compact mobile Special/Hero.
- Tests: `backend/tests/k5a-home.test.cjs`, `backend/tests/k5a-pg/*`, `backend/tests/k5a-home-pg.test.cjs`; anchors updated in `connect-k3`, `connect-k5d-notifications`, `connect-k5e-closure`, `connect-k5e-identity`.

## Schema

New tables only: `howdi_public_refs`, `howdi_connect_feed_sessions` (+ expiry index). No existing table is altered.

## Run

```
node --test backend/tests/k5a-home.test.cjs
K5A_PG_URL=postgresql://user:pass@host:5432/postgres node backend/tests/k5a-pg/run.cjs
```

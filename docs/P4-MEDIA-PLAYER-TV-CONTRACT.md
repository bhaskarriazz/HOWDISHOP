# HOWDI P4 — Media, Player and TV Integration Contract

Status: planning only. This document does not enable music, downloads, player quality choices, history, or TV playback.

## Existing reusable implementation

- `apps/customer/src/v8/connect/Studio.jsx` is the canonical Vibe create surface: media selection, caption, tags, audience, rights declaration, drafts, retry and publish state.
- `backend/connect-v8.cjs` validates and publishes Vibes under the existing audience and rights-review rules.
- `backend/connect-v8-creator.cjs` owns private creator drafts. Draft data must not be exposed to another account.
- Existing public Vibe DTOs and profile/privacy checks remain the read-time authority. New media features must call those checks before returning media or metadata.

## 1. Music contract

Frontend receives a `music` object only for a cleared or provider-authorized track:

```json
{
  "track_id": "provider-safe-id",
  "title": "string",
  "artist": "string",
  "artwork_url": "https://…",
  "availability": {"region": "IN", "usable": true, "reason": null},
  "allowed_clip_seconds": 30,
  "segment_start_seconds": 0,
  "segment_end_seconds": 30,
  "attribution": {"label": "string", "required": true},
  "kind": "licensed|original",
  "reuse_allowed": false
}
```

Required endpoints/events:

- `GET /api/v8/music/search?q=&region=` returns only cleared tracks permitted for the caller's region and intended use.
- `GET /api/v8/music/:trackId` returns current availability and attribution.
- `POST /api/v8/vibes` accepts an approved `track_id` plus selected start/end. The server validates rights, region, segment length and audience before publishing.
- Provider takedown/expiry emits a server event that marks the sound unavailable and offers replace, remove, or save draft; it never silently substitutes audio.

Original audio uses a server-owned audio reference with the uploader as attribution. A typed song title is never a track selection or a license grant. A commercial catalogue, mix controls and audio previews remain blocked until a provider, permitted territories and usage terms are configured.

## 2. Video player contract

An eligible Vibe/video response needs a server-authorized playback manifest:

```json
{
  "media_id": "public code",
  "manifest_url": "short-lived signed URL",
  "qualities": [{"id":"360p","label":"360p","url":"…","data_saver":true}],
  "captions": [{"id":"en","label":"English","url":"…","kind":"subtitles"}],
  "capabilities": {"speed":[0.75,1,1.25,1.5,2],"pip":false,"background":false,"download":false},
  "accessibility": {"title":"string","description":"string","transcript_url":null},
  "retry": {"allowed":true,"after_seconds":0}
}
```

The client shows only returned qualities, caption tracks, speed values and capability flags. Auto quality chooses a returned rendition; data saver chooses only a returned `data_saver` rendition. Unsupported PiP/background controls are disabled with an explanation. Failed manifest/media requests expose retry and do not show a zero-length success player.

Required backend endpoints: `GET /api/v8/media/:code/playback`, `POST /api/v8/media/:code/playback-error` (optional telemetry, no private payload), and signed media delivery that rechecks audience/block/entitlement on issuance and renewal.

## 3. Watch-history contract

- `POST /api/v8/media/:code/history` accepts bounded progress, duration and completion fields from an authorized viewer.
- `GET /api/v8/me/watch-history` returns only that member's accessible media and resume positions.
- `DELETE /api/v8/me/watch-history/:code` clears one item; `DELETE /api/v8/me/watch-history` clears all elective viewing history.

History must be owner-only, expire under a documented retention policy, and not become a recommendation, notification or profile signal after the user clears it. A deleted/restricted item returns a safe unavailable record without its private thumbnail or caption.

## 4. Download authorization contract

The Vibe publish/edit payload adds `allow_downloads`. `GET /api/v8/media/:code/download` checks, on every request: authenticated viewer, current audience/block/age/entitlement state, uploader control, music rights, and revocation/expiry. It returns a short-lived file URL only when eligible. A revoked or expired permission returns an explicit unavailable response; the UI must not imply that prior downloads can be recalled.

## 5. Watch on TV contract

Cast playback and screen mirroring are separate capabilities.

- The web sender detects a supported Cast sender before offering device discovery.
- `GET /api/v8/media/:code/cast` returns a narrow, short-lived media authorization only after audience and entitlement checks; it never returns the HOWDI session, HPay, profile or chat data.
- Sender states: unavailable, discovering, no-device, connecting, connected, failed, disconnected. A connected state is set only from a receiver/session callback.
- Sender controls expose play/pause/seek/captions/volume only when the receiver reports support. Disconnect releases the receiver session.
- Receiver deployment requires a registered receiver application ID, HTTPS sender, compatible receiver hardware/network, reachable authorized media and real model/OS/browser evidence.
- Full-screen mirroring remains an OS/browser action with privacy help. It is not labelled as Cast playback and receives no fake in-app connection status.

## Security and privacy requirements

- Never fabricate a connected receiver, licensed track, rendition, caption track, upload completion or watch-history write.
- Use public codes in client URLs; do not expose database IDs, internal account IDs, tokens or raw provider credentials.
- Recheck audience, block, private-profile, membership and entitlement rules at every manifest, history, download and cast authorization request.
- Do not use precise Move pickup/address data for TV, media discovery or any nearby feature.

## Recommended build order

1. Define media DTOs and write API contract tests for audience, block and expiry checks.
2. Add server-authorized manifest delivery, captions and real rendition metadata.
3. Add history and uploader download control with revocation tests.
4. Integrate a licensed music provider after rights, territory and attribution decisions are approved.
5. Add Cast sender/receiver integration, then test against an identified receiver and network.

## Test plan

- Audience/private/block matrix for playback, captions, download, history and Cast authorization.
- Provider test track: allowed region, expired/taken-down track, original-audio attribution and invalid segment rejection.
- Player: each returned quality/caption/speed, unavailable controls, retry after manifest failure, keyboard and screen-reader controls.
- History: resume, clear one, clear all, revoked media and retention behavior.
- Download: allow, deny, revoked, expired and music-rights-denied responses.
- TV: no sender, no receiver, connection failure, real receiver play/pause/seek/disconnect, then separate manual mirroring guidance.

## P5A implementation note (video player foundation)

The current `GET /api/v8/vibes` and `GET /api/v8/vibes/{code}` DTO provides one direct `media[]` URL with type, poster and duration only. It does **not** provide a rendition manifest or caption/subtitle tracks. The customer player therefore keeps using the direct URL under the existing Vibe visibility, block and private-account checks. It now supports playback speed, loading/buffering, source-error retry and browser-gated Picture in Picture. Quality, caption and data-saver controls become available only when a future media object supplies verified `renditions[]`, `caption_tracks[]` and a `data_saver` rendition; until then they state that the capability is unavailable. The existing `captions` Boolean belongs to a linked Vibe item and is not treated as proof that a video caption track exists.

## P5B implementation note (history and downloads)

`backend/server.js` contains the older `POST /api/v1/vibes/events/batch` watch-signal recorder and internal `vibe_view_history` table. It records V1 UUID Vibe IDs, but provides no V8 public-code history list, resume, clear-one or clear-all route. The V8 viewer does not send playback signals to that incompatible endpoint and does not present local state as account history. Its Watch history panel therefore reports the unavailable server contract.

The V1 Vibe model has an uploader `allow_download` field, but the V8 DTO does not return that setting and neither backend has a V8 download authorization endpoint that checks visibility, blocks, revocation or expiry. The V8 Download panel reports unavailable rather than deriving permission from UI. Required additions remain: `GET /api/v8/me/watch-history`, `DELETE /api/v8/me/watch-history/:code`, `DELETE /api/v8/me/watch-history`, and `GET /api/v8/vibes/:code/download`, all authenticated and rechecking the existing Vibe audience/block rules.

## P5B backend contract — V8 public-code history and download authorization

### Existing V1 to V8 mapping

| Existing source | Reuse in V8 | Gap to close |
| --- | --- | --- |
| `vibe_view_history` | Per-account aggregate and last-view ordering | Add a resumable position and expose only a resolved V8 public code. |
| `vibe_watch_session_items` | Actual play/pause/resume/position signals | Keep analytics internal; it is not a customer history list. |
| `POST /api/v1/vibes/events/batch` | Bounded event semantics and server-side aggregation | V1 accepts internal UUID Vibe IDs; V8 must resolve `VIB-…` server-side before writing. |
| `vibes.allow_download` | Uploader's initial allow/deny source | V8 creation/read DTO and a server authorization decision are absent. |
| `vibeRowByCode`, `VIBE_VISIBLE`, `blockedSql`, `privateOkSql` in `backend/connect-v8.cjs` | V8 code resolution and audience/block/private checks | Apply the same predicate again for every history row and download request. |

### Proposed V8 endpoints and DTOs

All endpoints require the authenticated session resolved by `viewer(req)`. A public URL contains only a V8 `VIB-…` code; the server resolves it to the internal UUID and never returns that UUID.

`POST /api/v8/vibes/:code/watch-progress`

```json
{"position_ms": 42100, "duration_ms": 90000, "event": "play|pause|resume|complete", "source_feed": "for-you"}
```

The server clamps values, rejects unknown events, resolves the code, checks current access, updates analytics and a per-viewer resume row, then returns `{ "recorded": true, "resume_position_ms": 42100 }`. It must not return a success response if the Vibe is no longer accessible.

`GET /api/v8/me/watch-history?cursor=…&limit=…`

Returns an owner-only cursor page:

```json
{"items":[{"public_key":"VIB-…","route":"/connect/vibe/VIB-…","cover_url":"…","caption":"…","author":{"public_username":"…"},"resume_position_ms":42100,"duration_ms":90000,"last_viewed_at":"ISO-8601"}],"next_cursor":null}
```

Each candidate is rechecked with the current V8 visibility, moderation, deletion, block and private-profile predicates before serializing. Inaccessible rows are silently omitted. Empty history returns `items: []`; transient database failure returns the normal V8 error shape so the client can retry.

`DELETE /api/v8/me/watch-history/:code` clears only the authenticated viewer's resolved Vibe row and returns `{ "cleared": true }`. `DELETE /api/v8/me/watch-history` clears that viewer's complete history and returns `{ "cleared_count": n }`. Both are idempotent and create a privacy audit event without exposing a Vibe UUID.

`GET /api/v8/vibes/:code/download`

The endpoint resolves the code and runs authorization on every request. On success it returns only an opaque, short-lived delivery URL and expiry: `{ "state":"allowed", "download_url":"/api/v8/media/download/TOKEN", "expires_at":"ISO-8601" }`. The token endpoint rechecks revocation and expiry before streaming/redirecting. It never returns `media_url`, a filesystem path, bucket name, UUID, or provider credential. Expected denied states use the normal V8 error shape with safe codes: `DOWNLOAD_DISABLED`, `NOT_AVAILABLE`, `DOWNLOAD_REVOKED`, `DOWNLOAD_EXPIRED`.

### Authorization, retention and audit rules

- History writes require a valid viewer, a resolved Vibe, current visibility access and a bounded actual playback event. The client cannot supply a user ID or an internal Vibe ID.
- History reads and clears are owner-only. A blocked, private, deleted, moderated or revoked Vibe never remains visible in the returned list; its old row can be purged asynchronously.
- Retention must be a product-approved server configuration. The current source has no approved retention duration, so the migration must not invent one; cleanup should use that configuration and log aggregate purge counts only.
- Download requires all of: uploader `allow_download`, currently accessible Vibe, no viewer/creator block in either direction, non-deleted/non-revoked media, no unresolved rights restriction, and a deliverable asset. A missing asset is `NOT_AVAILABLE`, never a successful empty file.
- Record security audit events for history-clear and download authorization decisions: actor account, public Vibe code or a one-way audit reference, action, outcome/reason, and timestamp. Never log bearer delivery tokens, storage paths, raw media URLs or internal IDs in customer-visible logs.

### Minimal migration

Reuse `vibe_view_history` and add `resume_position_ms BIGINT NOT NULL DEFAULT 0`, `duration_ms BIGINT`, and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`; update them transactionally from V8 progress events. Reuse the existing `vibes.allow_download` column only after the V8 create/edit and read paths explicitly own it. Add a dedicated `vibe_download_authorizations` table for opaque-token digest, viewer, Vibe UUID, issued/expiry/revoked timestamps and decision reason; never store a raw delivery token. Add a focused index for active authorization lookup and an expiry cleanup job.

### Edge cases and test plan

- Report progress after a Vibe becomes private, deleted, rights-blocked or mutually blocked: return a safe unavailable response and do not write history.
- Clamp negative, future or greater-than-duration positions; treat a changed media duration as a safe resume-at-zero/near-end rule defined by the service.
- Clear history concurrently with a progress event: a later real playback event may create a new row; audit both actions.
- Revoke uploader download permission after issuance, expire a token, remove the source asset and change visibility: all must deny delivery on the final token request.
- Test V8 public-code resolution, no UUID/storage-path leakage, cross-account history isolation, private/block matrix, retention cleanup, pagination, clear-one/all idempotency, allow/deny/revoked/expired download outcomes, and audit records with secrets redacted.

No Founder visual PASS can be inferred from this contract; real runtime, provider and hardware evidence remain required.

## P5C — music and audio integration contract

### Audited existing behavior

- `apps/customer/src/v8/connect/VibeCapture.jsx` requests `{ audio: true }` when recording a Vibe. The captured video can therefore retain embedded original audio.
- `VibeCreate.jsx` and `Studio.jsx` select/upload Vibe media and pass it through the existing V8 rights declaration/review path in `backend/connect-v8.cjs`.
- The current `vibe_media` DTO carries video/image URLs, thumbnails and duration. It has no audio reference, audio metadata, mix setting, reuse permission or attribution object.
- `howdi_connect_stories.music_track` appears only in a preview seed fixture. It is a typed field, not a provider track identity or license record, and must not be reused as music functionality.
- No licensed music provider adapter, API credential/configuration, audio catalogue, track search route, audio-only upload route, provider webhook, or V8 music table exists in the audited stack.

### What can be stated and supported now

An uploaded or recorded Vibe's embedded sound is **original audio only**. The server may describe it as `{ kind: "original", attribution: { public_username: "…" } }` only after it confirms the Vibe remains visible to the requesting viewer. Reuse requires an explicit uploader setting, a rights-clear state, and the same audience/private-profile/block/moderation/deletion checks used for the source Vibe. Until a separate audio model exists, there is no source-backed original-audio reuse endpoint or UI control.

The existing rights declaration (`original`, `licensed`, `third_party`) is reused as a publication safety gate. It is not proof of a commercial music licence, and a typed song title or a client-supplied `track_id` must never produce licensed attribution, playback, search results, or download permission.

### Licensed-provider boundary

Do not implement a music selector until an approved provider adapter is configured. Its minimum server-owned track record must include:

```json
{
  "provider": "approved-provider-key",
  "provider_track_id": "provider-safe-track-id",
  "title": "string",
  "artist": "string",
  "artwork_url": "provider-authorized-url-or-null",
  "availability": {"territory":"IN","usable":true,"reason":null},
  "rights_status": "cleared|unavailable|revoked|takedown",
  "allowed_clip_ms": 30000,
  "selected_start_ms": 0,
  "selected_end_ms": 30000,
  "attribution_text": "string",
  "preview_url": "provider-authorized-url-or-null"
}
```

The provider adapter, not the browser, must search catalogues, verify territory and intended social-video usage, validate the selected segment, and resolve takedown/revocation. The V8 API should expose only approved DTOs: `GET /api/v8/music/search`, `GET /api/v8/music/:public_track_code`, and a server-side publish selection. Provider IDs, credentials, raw provider responses, signed stream URLs and rights evidence stay server-side.

### Required persistence and publication behavior

Add a dedicated Vibe-audio selection table only after a provider exists. It must store provider key/track ID, selected range, rights snapshot/reference, attribution text, status, revocation/takedown timestamps, and an audit reference. It must not replace `vibe_media` or store a browser-provided licence claim as authoritative.

On Vibe publish, the backend validates the selected provider track at that moment. On later provider revocation/takedown, mark the audio selection unavailable, preserve the Vibe's privacy rules and return a safe degraded DTO such as `{ "audio": { "state":"unavailable", "attribution_text":"Audio unavailable" } }`. Do not silently substitute a different track, expose a removed preview URL, or make the underlying Vibe public.

### Future UI contract

Only after those APIs are live may Studio/VibeCreate show search, selection, clip trim, remove/change, attribution preview, original-audio plus music mix controls, or an unavailable/rights-restricted state. The UI must render provider-returned attribution on a published Vibe, use an honest unavailable state when revoked, and never display a manually typed song name as licensed music.

### Targeted test plan

- Recorded/uploaded Vibe reports original-audio attribution only when its source Vibe is visible; private, blocked, restricted, deleted and moderated sources are never reusable.
- Provider adapter: valid track/region/clip succeeds; invalid track ID, unavailable territory, over-length segment, revoked/taken-down track and unauthorized preview fail safely.
- Publication: provider ID and segment persist; typed title alone produces no licensed music DTO; attribution contains only approved public metadata.
- Playback: revoked audio degrades without leaking provider URL or making the Vibe inaccessible rules weaker.
- Audit: selection, revocation and takedown records contain no credentials, raw provider payload or signed URLs.

**P5C dependency:** an approved licensed-music provider, server-side credentials and usage/territory terms, a provider webhook or reconciliation mechanism, and an approved audio-data migration. Until those exist, no music catalogue, track selection, mixing, or reuse runtime can be truthfully enabled.

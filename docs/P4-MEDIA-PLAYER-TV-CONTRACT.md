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

No Founder visual PASS can be inferred from this contract; real runtime, provider and hardware evidence remain required.

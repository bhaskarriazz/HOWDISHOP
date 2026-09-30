# V8 Slice 2: Connect closures — stories, communities, members-only Live, rights review, sharing, record & trim

**Status:** AWAITING BHASKAR REVIEW. Nothing here is PASS. Approval is your localhost walkthrough.
**Security:** not cleared. Codex still needs to verify it independently.
**Git:** branch `claude/howdi-v8-build-continue-4wzfd5` (PR #1, kept unmerged), rebuilt on `v8-foundation` @ `62ed2b6`.

## Before this slice: the old room security fix (77576be)

77576be was written on the V16.6K2 baseline. It was **not** carried onto V8, because V8 already covers it:

| 77576be did | V8 @ 62ed2b6 already does |
|---|---|
| Session-bound guard on `/api/connect/realtime|spaces/:id/*` | `k5eConnectGuard` binds the actor for **every** `/api/connect/*` request and turns public refs back into ids |
| Rejected a forged `fromUserId` on `signal` | The `signal` route ignores `fromUserId` and always uses the session user |
| Replaced `howdi_id` with `@public_username` in room state | `k5eConnectReplacer` drops identity keys from every Connect response |
| Participant card read `howdi_id` | Already reads `public_username` |

Adding it again would only double the session look-ups. The K5E suites pass unchanged (routes 11, identity 14, closure 12, audit 14, K3 109).

## What was built (rows from the coverage matrix)

| Screen ID | Board (from the matrix) | What works now |
|---|---|---|
| STO-005 | V8__32 "More options" | **Mute** a member's stories is saved on the server, private (they aren't told), and undone from the new **Stories page** (`/connect/stories`, "Muted stories" → Unmute). Report and block stay as before. |
| STO-006 | V8__32 "Add to highlights", SUP__01 | **Highlights**: add a story to an existing or new named highlight; it stays on the profile after the story ends and keeps the **story's audience** (Everyone / Friends / Close friends); circles on the profile; open a highlight; the owner can **set the cover, rename, remove an item or delete** the highlight (with confirmation). Blocked and private rules apply. |
| STO-007 | V8__32 stats row | Owner-only **views · reactions · replies** on each story and a **viewer list** (signed-in viewers, with their reaction). Anyone else gets 404. Guests are not counted. |
| COM-005 | V8__17 "Create a Community" | Create in three steps — **Basics** (group/channel, name, purpose, topic, **location**, privacy Public / Private / **Invite only**) → **Look & rules** (**cover upload** with preview, **rules editor**: add, edit, reorder, remove, max 10) → **Review** → confirmation with the **invite link**. Invite-only communities are hidden from search and topics; the link opens a preview and joins directly. Moderators can **reset** the link (the old one stops working). Owners and admins edit cover, about, topic, location and rules in **Community settings**; only the owner changes privacy. |
| CRT-005 | V8__27 "Community & Live" | **Members-only Live and Spaces.** The host switches it on (needs a paid tier) before or during the session; people inside who aren't members drop out. Non-members and guests see a **locked room** with the membership offer — no chat, events, participants or replay. Past-due members are locked out. Joining the membership unlocks the room immediately. |
| VIB-013 · CRT-003 · CRT-010 | V8__32 "Publish blocked", V8__27 system strip | **Rights review.** Create Post / Hype / Tip and Create Vibe ask "Who owns this content?" (mine · I have permission + source · someone else's work). Declaring someone else's work, or re-uploading media another member already published (SHA-256 match), **holds** the item: only the author sees it ("Waiting for a rights check"). **HOWDI Admin** clears or blocks it (block needs a reason, decisions can't be repeated, each is written to the admin security audit); the creator is notified; cleared items publish (scheduled ones keep their time). Creator Safety shows a **Rights checks** list and the manual-review count. |
| VIB-008 | V8__14 panel 6 | **Share to other apps**: WhatsApp, Telegram, X, Facebook, Email and SMS next to Copy link, Messages and the phone's own share menu. Only the public link is shared. |
| VIB-006 | V8__32 panel 5 | **Record in HOWDI**: camera + microphone permission (allowed / blocked / no camera / unsupported states), flip camera, 60-second limit, review → retake or use. **Trim**: choose start and end, preview, the browser re-records that part as WebM. Recorded and trimmed videos post like uploads. |

Also fixed on the way (both were already wrong on 62ed2b6):
- The story viewer sat **under** the header and the phone bottom bar (its page container capped it). It now opens above the shell.
- On the Connect hub at 1440 px the right rail **overlapped** the main column (one row could not shrink). The main column now has a proper `minmax(0, 1fr)` track.

## Evidence

- **Screens:** `HOWDI_V8_SLICE2_screens.pdf` — 26 screen states, each at 1440 / 768 / 390, from the production bundle with the API behind a `/api` proxy (like the laptop launcher). 0 page errors.
- **Recording:** `HOWDI_V8_SLICE2_walkthrough.mp4` — both sides: Divya reacts → Meera sees viewers and makes a highlight → Divya sees it and mutes; Meera's members-only live → Divya is locked out, joins with HPay (Preview/Test) and the live opens; Kiran posts someone else's song → held → HOWDI Admin clears it → Kiran is notified; Meera creates an invite-only group → Kiran joins by link; share sheet; record + trim + post a Vibe.
- **API tests:** `backend/tests/v8-pg/04-connect-closures.cjs` — **131 passed, 0 failed** with the Preview/Test sandbox and **131 / 0** without it. Suites 01 (46 / 43), 02 (81 / 79) and 03 (91 / 54) still pass.
- **Regression:** the other backend tests show the same **6 failures** as 62ed2b6 (`k5a-home` 1, `shop-s1` 2, `shop-s2` 2, `works-worker-hardening` 1) — checked side by side on a clean 62ed2b6 checkout; none are new.
- **Build:** `vite build` passes; `node --check` passes on every changed backend file.

## Schema changes (all additive, created on start-up)

- `howdi_v8_story_mutes(user_id, muted_user_id)` — new.
- `howdi_connect_highlights` — new columns `audience`, `is_cover`; unique index on (user, source story, title).
- `howdi_v8_community_meta` — new columns `location`, `invite_code` (unique).
- `howdi_v8_media_fingerprints(sha256, user_id, kind, entity_key)` and `howdi_v8_rights_checks(...)` — new.
- Existing columns reused: `howdi_connect_communities.subscribers_only` (members-only rooms), privacy `INVITE_ONLY` on `howdi_connect_social_spaces`, post status `RIGHTS_REVIEW` / `RIGHTS_BLOCKED`, vibe status `rights_review` / `rights_blocked`.

## New / changed API

`POST|DELETE /api/v8/creators/{@h}/story-mute` · `GET /api/v8/stories/muted` · `GET /api/v8/stories/{STY}/viewers` · `POST /api/v8/stories/{STY}/highlight` · `GET /api/v8/creators/{@h}/highlights` · `POST /api/v8/highlights/{HLT}/cover` · `POST /api/v8/highlights/rename` · `DELETE /api/v8/highlights?title=` · `DELETE /api/v8/highlights/{HLT}` · `PATCH /api/v8/communities/{slug}/settings` · `GET|POST /api/v8/communities/invite/{code}` · `POST /api/v8/communities/{slug}/invite/reset` · `POST /api/v8/rooms/{code}/host/members-only` · `GET /api/v8/rights/mine` · `GET /api/admin/v8/rights` · `POST /api/admin/v8/rights/{RRV}/decide`. Post and Vibe create accept `rights` + `rights_note`.

## Preview

`backend/scripts/v8-preview/seed-closures.cjs` (+ `run-seed-closures.cjs`) adds this slice's demo data after the two existing seeds: story views / reaction / reply on Meera's story, two highlights, the members-only live and Space, community locations + invite links (`PVCIRCLE22`), and one Hype by Kiran waiting for a rights check. On a fresh database it also creates the Telangana Crochet Circle group (older preview databases already had it).

| Who | Try |
|---|---|
| Meera 9100000001 | Open your story → viewers · Add to highlight. Profile → open a highlight → Manage. Your live "Crochet along" → ⋯ → Members only. Communities → Create (invite only). |
| Divya 9100000005 | Meera's live → locked → Subscribe with HPay → opens. Lakshmi's story → ⋯ → Mute; Connect → Stories → Muted. |
| Kiran 9100000004 | Creator workspace → Safety → Rights checks. Create → "It uses someone else's work" → Publish. Open `/connect/communities/invite?code=PVCIRCLE22`. |
| HOWDI Admin | `GET /api/admin/v8/rights`, `POST /api/admin/v8/rights/{RRV}/decide` (admin token or admin session). |

## Blockers and limits (specific)

1. **Handoff PDF not supplied.** `HOWDI_V8_Claude_Build_Handoff_Visual_and_Flow_318.pdf` is not in the repo, the uploads or Google Drive (searched by title). The Screen IDs and board references above come from the coverage matrix you uploaded (dated `c71849e`); the board images themselves weren't available, so layouts follow the existing V8 screens.
2. **V8 Visual Proof boards not readable.** They live in `HOWDI_Master_Tracker.xlsm` (92 MB, macro workbook); the Drive connector can't read `.xlsm`. Please export the boards (e.g. V8__14, V8__17, V8__27, V8__32) as PDF/PNG.
3. **Matrix version.** The matrix you sent predates 3186dab / 62ed2b6. Only the rows this slice changed are updated; the other rows keep the statuses in that file.
4. **Admin console UI.** Rights decisions are API-only, like payouts and appeals in 62ed2b6. They belong in the HOWDI Admin verification console (your step 5); default location `/admin` until you decide.
5. **Streaming provider.** Live video isn't connected (Preview/Test stage), so members-only gates the stage, chat, events, tips and replay.

Known limits: the hub's Live rail doesn't show the "Members" badge (the Live and Spaces lists do); trimming re-records in real time in the browser; reused-media detection is exact (SHA-256), not visual similarity, and media uploaded before this slice has no fingerprint; invite-only applies to groups and channels (Spaces use members-only); highlights can't be reordered; story share counts aren't shown in owner insights.

## Next (your order)

Messages with in-chat HPay: chat, group chat and message requests; send money and payment requests on both sides; QR pay, recharge, bills, tickets and gift cards; receipts, failure and retry, double-payment protection. Defaults until you decide: INR, "Encrypted in transit", placeholder legal text, admin at `/admin`, Preview/Test sandbox for payments, SMS and streaming.

# HOWDI V8 — Messages with in-chat HPay (Part A, calls, Part B)

Branch `claude/howdi-v8-build-continue-4wzfd5` on `v8-foundation` (62ed2b6).
Commits: `1f5a422` (Part A), `2df9e13` (calls + filters), `ff14ab1` (Part B API), `fa948a1` (Part B UI).
Status: **built, awaiting review** — nothing is PASS until the localhost walkthrough is approved.

## Screen IDs
| ID | What works | Open |
|---|---|---|
| CON-009 | Inbox: All / Message requests; filter chips (Unread, Groups, Payments); search; unread and muted states | — |
| CON-010 | Chat: text, photo, delivered/read, edit, delete, report/block, mute; voice and video calls (WebRTC); call history lines | Voice notes, file attachments, group calls; a TURN relay is needed for production |
| CON-011 / 012 | New message with eligibility and message requests; groups (create, add, remove, admins, rename, leave) | — |
| MSG-001 | + drawer: media, HOWDI cards, HPay tiles | Files and voice notes |
| MSG-002 / 003 | Send money and payment requests, both sides (pay, decline, remind, cancel, expire) | Real provider |
| MSG-004 | Product card | Buy now opens Shop; checkout from chat comes in the Shop step |
| MSG-005 | Group/channel invite card with Join, Ask to join, pending and Open | — |
| MSG-006 | Verified worker card | Book opens Works Find; booking from chat comes in the Works step |
| MSG-007 | View-once photo/video | — |
| MSG-008 | Per-chat 24-hour auto-erase | — |
| MSG-009 / 011 | 15-minute edit window with versions kept; safety notice, report and block | Admin queue UI for chat reports |
| MSG-010 | — | Voice payment commands not built |
| MSG-012..014 | Recharge (for yourself, or ask the chat peer to pay), bills, tickets and gift cards | Real providers (Preview/Test catalogue only) |
| MSG-015 | Review before paying, PIN, idempotency, limits, failure, pending and refund states, HPay activity | Voice review (MSG-010) |
| MSG-016 | QR Code Pay: show my QR (signed, optional fixed amount); scan with the camera, from a photo, or by pasting the code | UPI/merchant interoperability |

## Files
- **Backend:**
  - `backend/connect-v8-messages.cjs`
  - `backend/hpay-v8-utilities.cjs` (new)
  - `backend/connect-v8.cjs`: `savePrivate`, `readPrivate`, `deletePrivate`
  - `backend/server.js`: wiring
- **UI (all under `apps/customer/src/v8/`):**
  - `connect/Messages.jsx`
  - `connect/Calls.jsx`
  - `connect/ChatExtras.jsx`
  - `connect/HPayUtilities.jsx`
  - `connect/connect.css`
  - `V8Shell.jsx`: icons
- **Also:**
  - `apps/customer/src/App.jsx`: call centre mount
  - `apps/customer/package.json`: qrcode, jsqr. Run `npm install` after pulling. The root lockfile was out of date and npm resynced it.
- **Preview seed:** `backend/scripts/v8-preview/seed-messages.cjs` and `run-seed-messages.cjs`
  - Shop with scarf products, a verified tailor, demo PIN 2468, demo wallet balance.
  - Runs only on a database whose name ends in `_preview`.
  - It copies the demo photos into `backend/data/`, which is gitignored.
- **Tests:** `backend/tests/v8-pg/05-messages.cjs`, `backend/tests/v8-pg/06-messages-b.cjs`

## Schema (all `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`, run by `ensureSchema`)
- **`howdi_connect_conversations`:** title, created_by, request_status, requested_by, auto_erase_hours, auto_erase_by
- **`howdi_connect_conversation_members`:** role, muted, left_at
- **`howdi_connect_messages`:**
  - kind, payment_id, idem_key (unique per sender)
  - view_once, expires_at
  - card_type, card_ref, utility_id
- **New tables:**
  - `howdi_v8_message_edits`, `howdi_v8_message_reports`, `howdi_v8_message_opens`
  - `howdi_v8_chat_payments`: now with `channel`; `conversation_id` is nullable for QR payments
  - `howdi_v8_pay_idem`, `howdi_v8_qr_idem`, `howdi_v8_hpay_pins`, `howdi_v8_utility_orders`

## Security notes
- **Identity:** the signed-in session decides who is acting. The API only uses public codes (CNV, CMS, PAY, UTL) and @handles; no numeric ids, phone numbers or emails leave the server, and the tests scan for them.
- **Cards:** each card is resolved separately for each viewer using the Shop, Works and Community visibility rules. A blocked vendor, an unpublished product, a worker who is no longer verified, or a private group all show as "unavailable".
- **View-once:** files are stored outside the public media folder and returned inline only once per recipient. The file is deleted after everyone has opened it.
- **Numbers and codes:** mobile and account numbers are stored on the server and shown masked. When someone asks a chat peer to recharge their number, the payer never receives the full number. Gift-card and ticket codes go only to the person who holds them.
- **Payments:**
  - An HPay PIN is required (scrypt hash; 5 wrong tries lock it for 15 minutes).
  - Each attempt has one idempotency key, and a retry never charges twice.
  - Each money movement runs in one transaction with a double-entry ledger.
  - Limits: balance, per-payment/order, and ₹25,000 per day.
- **QR codes:** each code carries an HMAC signature. Changing the handle or amount in the code makes it invalid, and paying yourself or a blocked person is refused.

## Tests (real PostgreSQL; each suite runs with the sandbox on and off)
- 05-messages: 126/126 with the sandbox, 95/95 without.
- 06-messages-b: 92/92 with the sandbox, 48/48 without.
- A suite that crashes now counts as a failure (it used to report PASS).

## Known limitations
- **Preview/Test only:**
  - The HPay wallet, operators, billers, events and gift cards are sandbox data.
  - Calls connect peer to peer with STUN only (no TURN relay).
  - Sandbox provider rules by the last four digits of the number: 0000 fails, 5555 goes pending then succeeds, 4444 goes pending then is refunded.
- **Not built:** voice notes, file attachments, voice payment commands (MSG-010), checkout from chat, booking from chat.

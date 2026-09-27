# HOWDI V8 — handoff status (paused by Bhaskar)

Branch: `claude/howdi-v8-build-continue-4wzfd5` (built on `v8-foundation` 62ed2b6). PR #1 stays unmerged.
Nothing below is PASS — everything is **built, awaiting Bhaskar's localhost walkthrough**.

## Built this session (commits, newest last)
| Slice | Commits | Tests (real PostgreSQL, sandbox / no-sandbox) |
|---|---|---|
| Connect closures (Stories, Communities, members-only Live, rights review, Vibe record/trim) | aef5f73 | 04: 131/131 |
| Messages A (inbox, requests, groups, in-chat HPay send/request) | 1f5a422 | 05: 126 / 95 |
| Voice + video calls, inbox filters | 2df9e13 | (in 05) |
| Messages B (cards, view-once, auto-erase, recharge/bills/tickets/gift cards, QR pay) | ff14ab1, fa948a1 | 06: 92 / 48 |
| Works W1 booking journey both sides (consent-gated details, worker-entered Job PIN, HPay hold/release) | e56603d, eba9ee1 | 07: 82 / 78 |
| Works W2 Become a Worker + HOWDI Admin console `/admin` | 1e96935, 82b289e | 08: 41 / 41 |
| My roles + Vendor application → Admin → vendor workspace | 00795cf | 09: 29 / 29 |
| Shop purchase → vendor order desk → delivery → cancel / return / refund, both sides | 7fea79c, 2 UI commits up to 66c8b04 | 10: 39 / 39 |

Run all: `V8_PG_URL=postgresql://postgres@127.0.0.1:5440/postgres node backend/tests/v8-pg/run.cjs`

## Try it locally
1. `git pull` then `npm install` (qrcode + jsqr were added).
2. Preview seeds (database name must end in `_preview`):
   `node backend/scripts/v8-preview/run-seed-messages.cjs <url> <photos folder>` · `run-seed-works.cjs <url>`
3. Demo HPay PIN 2468 (Meera, Divya, Ravi, Kiran). Admin console: `/admin` (dev login admin / admin).
4. Key pages: `/connect/messages`, `/works`, `/works/worker`, `/works/become`, `/me/roles`, `/me/vendor`, `/me/vendor/store` (orders are on this page), `/shop/products/PRD-…`, `/shop/bag`, `/shop/checkout`, `/shop/orders`, `/admin`.

## Not built yet (priority order agreed with Bhaskar)
1. My HOWDI (orders hub linking to /shop/orders, addresses edit/default, account safety, data controls, support) — still legacy screens.
2. My Profile redesign against the approved board.
3. Shop gaps: product gallery/variants, reviews + Q&A, wishlist UI, return photos, Made for Me, Shop Home/category V8 polish.
4. Vendor: shipping settings + courier integration, payout statement/provider, low-stock, store editing, analytics.
5. Institute/College + Startup roles; Teacher / Learner / Institute admin queues; Learn & Earn learner flows.

## Open blockers
- `HOWDI_V8_Claude_Build_Handoff_Visual_and_Flow_318.pdf` never supplied (worked from the coverage matrix + board names).
- No production providers chosen: payments (HPay is Preview/Test), SMS, streaming/TURN for calls, e-KYC, courier.

## Proof files
PDFs and the latest coverage matrix were sent in chat (HOWDI_V8_*_screens.pdf, HOWDI_V8_COVERAGE_MATRIX_latest.xlsx).

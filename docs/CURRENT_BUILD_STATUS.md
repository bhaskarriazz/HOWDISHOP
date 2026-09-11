# HOWDI — Current Build Status

**Snapshot:** 11 September 2026  
**Repository:** Private development source  
**Latest backend build:** `HOWDI-BACKEND-V19.0-LEARN-EARN-COURSE-STUDIO-20260911`

## Stable / Frozen Foundations

- Logistics: V15.0 Multi-Provider Logistics Foundation. Shiprocket operational, Vendor Own Delivery operational, HOWDI Fleet foundation/standby.
- Commercial / Vendor Finance: V16.x settlement, agreements, billing, reconciliation and payout control.
- HPay / Payments internal architecture: frozen at V18.5 after transaction ledger, refunds, reconciliation, finance close, adjustments, statements, Participant 360 and Payment ↔ HPay integrity controls.
- Real gateway/bank money movement is **not yet integrated**; current payout/refund operations record references and ledger state only.

## Current Active Product Phase

### V19.0 Learn & Earn Course Studio

Admin Learn & Earn course foundation includes:

- Course title, description, level, language and duration.
- Outcomes and material requirements.
- Modules and lessons.
- VIDEO / TEXT / LIVE / QUIZ / PRACTICE lesson types.
- Grandma Tip and practice task fields.
- Preview lessons.
- Final handmade projects, evaluation criteria and pass score.
- Draft / publish control.
- Existing controlled Learn & Earn HPay reward foundation is preserved.

## Fixed Learn & Earn Product Direction

The product is being designed as a **Skill-to-Life system**, not a generic LMS. Core public flow:

`Learn → Practice → Prove → Create → Earn → Grow`

Crochet is the launch vertical, while the architecture remains extensible to handmade skills, services, digital skills, job readiness and teacher pathways.

Key future foundations are documented in `docs/HOWDI_Learn_and_Earn_Fixed_Product_Vision.md`.

## Source Snapshot Intended for Repository Sync

- `backend/server.js` — V19.0 backend.
- `apps/admin/App.jsx` / `App.css` — V19.0 Admin including Learn & Earn Course Studio.
- `apps/customer/src/App.jsx` / `App.css` — latest reviewed Customer source available in the current development snapshot.
- `apps/vendor/src/App.jsx` / `App.css` — latest reviewed Vendor source available in the current development snapshot.
- `apps/worker/src/App.jsx` / `App.css` — latest reviewed Worker source available in the current development snapshot.
- Learn & Earn fixed vision in DOCX/Markdown form.

## Next Planned Direction

Before another large coding release, Learn & Earn architecture is to be reviewed from learner, teacher, admin and backend perspectives. Planned areas include teacher identity/portal, schedules, demos, group batches, 1:1 sessions, attendance, learner Journey Mode, PDF/worksheet resources, regional/voice-first experience, practice evidence, Skill Passport and AI Clip Studio with teacher review.

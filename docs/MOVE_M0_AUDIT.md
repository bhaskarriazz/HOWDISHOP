# HOWDI Move M0 audit

Branch baseline: `ad0f1290a38a0054309f93aad7a772c7321494ac` from `codex/common-home-connect-media-v8`.

This audit follows the Founder direction that Move is a separate fourth pillar in `Home | Connect | Shop | Move | Work | Learn`. It does not treat the prior Phase 0 preview visual as the final Move experience. All prior Move evidence remains awaiting Founder walkthrough; no row is marked PASS.

| Feature | Status | Files | Tested | Action needed |
| --- | --- | --- | --- | --- |
| Six-pillar Move entry | Exists | `apps/customer/src/v8/move/V8Move.jsx`, `docs/MOVE_NAV_AMENDMENT.md` | Earlier navigation proof/register | Preserve; do not move Move into Work. |
| Customer Move home / Ride | Partial | `apps/customer/src/v8/works/Rides.jsx`, `apps/customer/src/v8/works/rides.css`, `V8Move.jsx` | `rides-gates.test.cjs`, `rides-phase0-pg.cjs` | Reconcile location, saved/recent places, fast Ride UX and latest visual language. Rename normal customer copy from “Booking” to “Ride”. |
| Quote/request/match lifecycle | Exists, Preview/Test only | `backend/rides-v8.cjs`, `backend/rides-v8.sql` | PostgreSQL Phase 0 suite | Preserve server-authoritative quote, request key, offer expiry, Auto/Cab gates and state transitions. Production fares/dispatch remain closed. |
| Driver application / eligibility | Exists, Preview/Test only | `Rides.jsx`, `rides-v8.cjs`, `rides-v8.sql` | PostgreSQL Phase 0 suite | Reconcile driver-facing UX, documents, online/offline, earnings and appeal state without exposing customer private data. |
| Driver offer / PIN / completion | Exists, Preview/Test only | `Rides.jsx`, `rides-v8.cjs` | PostgreSQL Phase 0 suite | Keep consent-gated disclosure and short-lived PIN; add only source-backed flow gaps after M1/M2 review. |
| Women Special | Partial / intentionally unavailable | `rides-v8.cjs`, `Rides.jsx` | Gate and PostgreSQL negative checks | Preserve strict no-fallback. Do not enable until the required eligibility/privacy/operating controls exist. |
| Safety / SOS / trusted contacts / live sharing | Missing as production capability | `Rides.jsx` has honest Preview/Test notice | Existing gate evidence | Do not claim emergency dispatch, SMS, GPS or trusted-contact sharing. Add only with real backend/provider support. |
| Payment / receipt / rating / support | Partial, Preview/Test only | `rides-v8.cjs`, `Rides.jsx` | PostgreSQL Phase 0 suite | Keep test Cash/HPay labels. Audit receipt, rating and support links during M3; no production payment claim. |
| Ride history / rebook | Partial | `Rides.jsx`, `rides-v8.cjs` | PostgreSQL Phase 0 suite | Existing list is basic. Add current/upcoming/completed/cancelled grouping and eligible repeat only after API audit. |
| Send Items / goods | Missing | No Move delivery/customer/backend files found | Not tested | Define separate logistics contract before UI; do not reuse Ride state machine or fabricate Porter-like delivery capability. |
| Service-zone / vehicle classes | Exists, narrow Preview/Test scope | `rides-v8.cjs`, `rides-v8.sql` | PostgreSQL Phase 0 suite | Auto/Cab only. Bike and Women Special remain closed until configured and verified. |
| Public codes / privacy | Exists in ride API | `rides-v8.cjs`, `rides-v8.sql` | PostgreSQL Phase 0 suite | Retain public ride codes and consent-gated pickup/plate/PIN. Extend leak checks for new surfaces. |
| Notifications / events / audit | Exists, local Preview/Test queue | `rides-v8.cjs`, `rides-v8.sql` | PostgreSQL Phase 0 suite | Keep local notices/events as test evidence; production notification provider remains a dependency. |
| Customer Admin ride surface | Partial / separate implementation | `apps/customer/src/v8/admin/RidesAdmin.jsx`, `backend/rides-v8.cjs` | Phase 0 evidence | Audit against staff Admin requirements before changes. |
| Remote `gemini-move-admin-v2-review` | Incompatible review implementation | remote branch only, `apps/admin/MoveAdmin.jsx`, its `backend/rides-v8.cjs` | Runtime-tested separately per handoff | Do not merge/cherry-pick/rebase. It contains a divergent repository-wide rewrite and exposes internal-style Admin identifiers in its own UI; use only as a requirements reference. |
| Staff driver verification / dispatch / incidents | Partial in separate implementations | current `RidesAdmin.jsx`; remote `MoveAdmin.jsx` | Existing review branch only | Reconcile from compatible current backend, enforce capability-scoped staff access and required reasons/audit before M4. |
| Finance / reconciliation | Partial, test ledger only | `rides-v8.cjs`, `rides-v8.sql` | PostgreSQL Phase 0 suite | Do not add finance actions until payment/refund provider contracts exist. |
| Visual / responsive proof | Prior Preview/Test evidence only | `move-phase0-proof` referenced by earlier checkpoint | Prior 1440/768/390 captures | Re-capture after final UX stages; do not use old 57-PNG visual as final truth. |

## Existing backend scope

`backend/rides-v8.cjs` is wired by `backend/server.js` and is deliberately enabled only when the preview environment, preview database and sandbox gates are active. It provides public ride/application codes, quote/request idempotency, zone/class gates, driver eligibility, timed offers, consent-gated disclosure, PIN start, completion, test payment ledger/receipt, notices and events. It rejects Bike and Women Special as enabled customer services; Women Special has no fallback.

## Blocking dependencies

- Approved Move visual boards/Founder walkthrough for the final customer visual gate.
- A real geocoding/location provider and privacy model for current location, saved/recent destinations and live trip state.
- A separate Send Items logistics, contact, proof-of-delivery and support contract.
- Production dispatch, payment, notification, emergency and trusted-contact providers.
- Compatible capability-scoped staff Admin implementation; the remote review branch is not a safe merge source.
- Customer build/browser environment for fresh 1440/768/390 proof.

## M1 recommendation

Start with the customer Move shell and Ride home only: retain the existing guarded Auto/Cab API flow, move its presentation under the dedicated Move pillar, add honest source-backed loading/error/availability states, and leave Send Items as an explicit unavailable/dependency state until its contract exists.

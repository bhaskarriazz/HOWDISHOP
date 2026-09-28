# HOWDI Move — proposed Phase 0 extension register

Status for every row: **implemented evidence is awaiting owner walkthrough; not PASS.** These entries are separate from the approved 318-row register.

| ID | Surface and persistent rule | Code / verification evidence |
| --- | --- | --- |
| MOVE-NAV-001 | Fourth customer pillar, Home → Connect → Shop → Move → Works → Learn | `V8Shell.jsx`, `App.jsx`, 1440/768/390 navigation screenshots |
| RIDE-001 | Book now primary; Schedule secondary; mode and typed meeting points | `works/Rides.jsx`, real UI capture |
| RIDE-002 | Quote, class gate, request, no-driver and timed match state | `backend/rides-v8.cjs`, PostgreSQL checks |
| RIDE-003 | Consent-gated exact address, plate and in-person short-lived PIN | API integration checks and customer/driver capture |
| RIDE-004 | Completion, labelled Cash/HPay Test receipt and ratings | persistent ledger checks and capture |
| RIDE-005 | Per-class Rider application and six private evidence documents | application/API checks |
| RIDE-006 | Rider desk, availability and timed accept/decline | offer expiry/concurrency checks and capture |
| RIDE-007 | Driver trip status, PIN start and support | real UI walkthrough |
| RIDE-008 | Driver trip list and earning/receipt state | real UI walkthrough |
| RIDE-009 | Both-side field-name disclosure audit | privacy integration checks |
| RIDE-010 | Free cancellation, reason, confirm and notices | idempotent cancellation checks |
| RIDE-011 | HPay Test failure/retry/refund | idempotent payment/refund checks |
| RIDE-012 | Local support, lost-item and appealable staff case | API and Admin walkthrough |
| RIDE-013 | Secondary scheduled request and expiry | scheduled offer/expiry checks |
| RIDE-014 | Cash versus HPay Test reconciliation | ledger checks |
| RIDE-015 | Late/no-show review path | API validation |
| RIDE-016 | Two-way ratings and support follow-up | API integration checks |
| RIDE-017 | Accessibility need rechecked at offer and start | eligibility checks |
| ADM-RIDE-001 | Role-scoped rider verification and evidence review | staff identity checks |
| ADM-RIDE-002 | Timed offer queue, audited gate enable/pause and assignment | Admin capture and offer checks |
| ADM-RIDE-003 | Incidents, refunds and support resolution | case/refund checks |
| ADM-RIDE-004 | Exact document expiry and automatic availability disable | expiry integration checks |
| ADM-RIDE-005 | Payout hold/release requires different reviewer | dual-review integration checks |
| WOM-001 | Women Special unavailable until privacy/eligibility/operating gates; no fallback | UI capture and class validation |

The preview has no real dispatch, GPS, SMS, emergency response, wallet debit, or production transport permission.

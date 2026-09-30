# HOWDI Rides — proposal (not built, awaiting approval)

Source: `HOWDI_RIDER_V8_VISUAL_GATE_DRAFT_3.html` (28 Sep 2026). Status: **proposal only — nothing implemented**. New IDs stay outside the approved 318.

## Placement (no disturbance)
- Customer: Works › Rides. Applicant: Works › Drive with HOWDI. Approved driver: My HOWDI › Rider desk. The five-item nav is unchanged.
- One new backend module `backend/rides-v8.cjs` with its own tables, public code prefix `RID`, feature flag `HOWDI_RIDES_ENABLED` (off by default).
- RIDER is its own role on the same HOWDI ID; each vehicle class (Bike / Auto / Cab) is approved separately. Worker approval never authorises passenger transport.

## Reuse (already built)
| Need | Existing piece |
|---|---|
| Rider application + admin approve / reject with reason / request info | `works-v8-onboarding.cjs`, `vendor-v8.cjs`, `learn-v8.cjs` role apps |
| Pickup PIN said in person, entered by driver | Works job PIN (`works-v8.cjs`) |
| Details only after both sides consent | Works private-details consent |
| Fare hold → release / refund, idempotent | Shop + Works HPay flows |
| Trusted contacts | Family groups (`me-v8.cjs`) |
| Ride rewards | HOWDI Rewards (`me-v8.cjs`) |
| Trip report → admin decision | Review reports queue |
| Safety training gate | Learn & Earn course certificate |

## Phases
- **Phase 0 — booked rides with verified local drivers (recommended first).** Scheduled trip → driver accepts → pickup PIN → HPay hold or cash → complete → receipt, rating, rewards; family sees trip status. No live dispatch, no maps cost. Preview/Test only.
- **Phase 1 — on-demand in one pilot zone.** Polling-based matching + admin manual dispatch fallback; eligibility re-checked at every offer and trip start; zone / class pause with reason.
- **Phase 2 — live tracking, Women Special, parcels.** Live location provider, Women Special (verified opt-in drivers, never a silent fallback), parcel work as a separate role.

## Flow register
Draft IDs: RIDE-001…012, ADM-RIDE-001…005, WOM-001 (see the visual gate). Add before build:
- RIDE-013 scheduled ride · RIDE-014 cash payment (driver marks cash received) · RIDE-015 fare rules (night / waiting / luggage; no surge or capped) · RIDE-016 no-show and cancellation penalties · RIDE-017 lost & found · RIDE-018 two-way ratings · RIDE-019 accessibility (wheelchair-friendly) option.

## Launch gates (before any real trip)
- State aggregator licence (MoRTH Motor Vehicle Aggregator Guidelines 2020) and Telangana / city rules confirmed by counsel; bike-taxi legality checked per state.
- Driver police verification, licence class, vehicle registration, permit, insurance; expiry blocks availability.
- 24×7 support; SOS = call 112 + share trip with family + audited support case (HOWDI never claims to dispatch emergency help).
- Women Special eligibility: document check + admin decision stored only as an eligibility flag, with appeal; no gender field elsewhere.
- Location: purpose, retention and deletion policy approved; no hidden collection.

## Effort estimate
- Phase 0 (API + tests + both-side UI + admin queue + 1440/768/390 proof): about one Works-slice (W1 + W2) of work.
- Phase 1–2: several times that, plus paid maps / realtime providers.

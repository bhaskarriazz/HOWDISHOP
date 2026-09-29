# Move Send Items contract

## Current status

HOWDI has Shop-order logistics and courier integrations, but no source-backed peer-to-peer Move delivery service. Shop shipments must not be reused for a customer-to-customer item request. Send Items therefore remains unavailable in Preview/Test until this contract is implemented and reviewed.

## Public API

All paths use public `HD-` delivery codes, public `DQ-` quotes and public driver handles only. They never return internal IDs, storage paths, full contact details, or exact live locations.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v8/deliveries/quote` | Server validates item category, declarations, zone, class, weight and availability; returns an expiring estimate. |
| `POST /api/v8/deliveries` | Creates one request from a quote and idempotency key. Browser fare, service state and assignment fields are ignored. |
| `GET /api/v8/deliveries` / `GET /api/v8/deliveries/:code` | Sender/assigned-driver scoped history and detail DTOs. |
| `POST /api/v8/deliveries/:code/(accept|decline|pickup|transit|deliver|fail|cancel)` | Server-authoritative driver/sender transitions. Verification/proof fields are accepted only when a provider is configured. |
| `GET/POST /api/admin/v8/deliveries…` | Staff queue, manual offer, support and auditable exception handling. |

## Required state machine

`requested → offered → accepted → pickup_verified → in_transit → delivered`.

`requested|offered|accepted → cancelled`; `accepted|pickup_verified|in_transit → failed_delivery`; a failed delivery may enter `return_pending` only after an approved return policy exists. Delivered and cancelled requests are immutable except source-backed support/audit events. Every transition records actor, timestamp, reason when applicable, and before/after values.

## Authorization and privacy

The server checks sender ownership, assigned driver eligibility, account restriction, block relationships, delivery vehicle/service class, zone/service gate, prohibited goods, and current state. Sender and receiver contacts remain masked until the exact operational disclosure point; no phone, address, raw proof URL, internal ID, storage path, map or live location is public. Driver assignment remains server-side and idempotent. Women Special cannot be used as a delivery fallback.

## Item and provider dependencies

The backend needs an allowlist, restricted/prohibited response, fragile/high-value declarations, weight/size limits, service configuration and authoritative fare rules. Dangerous or illegal goods are rejected server-side. Pickup/delivery OTP or photo proof, live tracking, receiver confirmation, payment/settlement and notifications require configured providers; without them the corresponding action is unavailable, never fabricated.

## Test plan

Validate category/zone/fare tampering, quote expiry, duplicate creation/assignment, sender and driver authorization, class mismatch, block/restriction, illegal transitions, cancellation/failure/delivered immutability, contact masking, public-code-only DTOs, audit fields and provider-unavailable states.

# HOWDI Identity & Access Management Foundation

## Status
Approved development baseline for the next backend and PostgreSQL phase.

## 1. Purpose
This document defines the approved foundation for moving HOWDI from completed frontend/dashboard design into a real, scalable backend and PostgreSQL system without changing the approved homepage or locked design direction.

## 2. Current Direction
- Customer website and customer profile design direction are established.
- Admin dashboard design direction is established.
- HOWDI Connect is planned as a future social ecosystem.
- The immediate priority is real backend and database integration.
- Approved pages should not be unnecessarily redesigned during this phase.
- Development should proceed module by module on top of the existing project.

## 3. Identity Foundation
Every HOWDI account should have:

| Field | Purpose |
|---|---|
| UUID | Primary globally unique technical identifier |
| Master ID | Permanent master identity used across the HOWDI ecosystem |
| HOWDI ID | Human-friendly HOWDI identity for customer-facing use |
| Account Type | Defines the account's ecosystem category |
| Role | Defines operational access level |
| Account Status | Active, suspended, pending, etc. |
| Created At | Permanent account creation timestamp |

## 4. Account Roles
- SUPER_ADMIN
- ADMIN
- MODERATOR
- SUPPORT
- CUSTOMER
- SELLER
- CREATOR

Roles should not automatically provide unlimited access. Permissions should determine what each role can view or manage.

## 5. Permission Foundation
Initial permission groups:

- users.view
- users.manage
- orders.view
- orders.manage
- products.view
- products.manage
- wallet.view
- wallet.manage
- moderation.view
- moderation.manage
- analytics.view
- settings.manage

## 6. PostgreSQL Integration Roadmap
1. Audit the current backend and existing PostgreSQL schema.
2. Verify and preserve the existing UUID and Master ID implementation.
3. Implement the identity, roles and permissions foundation.
4. Create or verify customer, product, category, variant, inventory and location APIs.
5. Connect Admin dashboard modules to real API data.
6. Implement the real order lifecycle and order records.
7. Implement payment transaction records and refund states.
8. Implement HOWDI Wallet using an immutable transaction ledger.
9. Implement notifications and moderation workflow.

## 7. Wallet Principle
HOWDI Wallet must not depend on a simple manually editable balance. Financial activity should be represented through transaction records.

Initial transaction types:
- Credit
- Debit
- Cashback
- Reward
- Refund
- Referral earning
- Affiliate earning
- Creator earning
- Withdrawal

Wallet balance should be derived from valid ledger transactions according to backend business rules.

## 8. HOWDI Connect – Future Ecosystem
The approved future direction for HOWDI Connect includes:
- Chats / direct communication
- HOWDI Vibe
- Groups, including private groups
- Channels
- Spaces and communities
- Product and service sharing
- Share and earn
- Referral and affiliate opportunities
- Creator and business promotion
- Posts and discovery
- Future voice and AI communication features
- Potential future live-streaming capability

The identity, permission and transaction foundations should be designed so these modules can be added later without major database redesign.

## 9. Security Direction
- Authentication and authorization must be separated clearly.
- Role and permission checks must protect administrative operations.
- Sensitive financial operations must be recorded and auditable.
- Future HOWDI Connect messaging should consider end-to-end encryption requirements during architecture planning.
- Account status must be checked before sensitive actions.

## 10. Development Rules
- Do not change the approved homepage design.
- Do not redesign the locked customer profile or admin dashboard direction without approval.
- Use the existing project as the source of truth.
- Audit the existing backend and database before adding duplicate tables or identity systems.
- Build and test one module at a time.
- Avoid temporary sample logic where real database/API implementation is being introduced.
- Keep the architecture ready for future HOWDI Connect and earning features.

## 11. Immediate Next Action
Perform a complete audit of the current HOWDI backend and PostgreSQL setup before modifying the identity or database layer so existing UUID and Master ID work is preserved.

## 12. Approved Build Sequence
1. Backend audit
2. Database schema verification
3. UUID / Master ID verification
4. Identity and account model
5. Roles and permissions
6. Authentication protection
7. Real API integration
8. Orders
9. Payments
10. Wallet ledger
11. Notifications and moderation
12. Future HOWDI Connect integration

---
**HOWDI DEVELOPMENT FOUNDATION — APPROVED BASELINE**

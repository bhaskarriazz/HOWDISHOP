# HOWDI Development Rules

## Source of truth
- Read `docs/HOWDI-MASTER-ROOT-MAP.md` before architectural changes.
- Current golden baseline is the checked-in customer `App.jsx` and backend `server.js` synchronized from V16.6K2.
- Preserve existing working functionality. Patch existing branches; do not rewrite large working modules without an explicit reason.

## Stack
- Customer: React + Vite.
- Backend: Node.js CommonJS + PostgreSQL via `pg`.
- Reuse the current HTTP/custom route architecture.
- Do not introduce Prisma, Express, or a parallel backend architecture unless explicitly approved.
- Search existing routes/tables/components before adding new ones.

## Identity
- Public identity is `@public_username`.
- Never expose internal HOWDI ID, database user ID, UUID, master ID, or numeric user IDs in customer-facing UI/API payloads.
- One account may have CUSTOMER, CREATOR, VENDOR, WORKER, LEARNER, TEACHER capabilities.
- CUSTOMER is the permanent base role.
- Internal staff roles must never appear in customer My Roles.

## Pillars
- CONNECT is the default HOWDI Home.
- Main pillars: CONNECT, SHOP, WORKS, LEARN & EARN.
- WORKS stays independent. Worker functionality must not be moved into Connect.
- Storefront belongs inside SHOP.
- Vendor is a role, not another main navigation pillar.

## Authentication and security
- One authenticated session must work across all HOWDI modules.
- Do not trust browser-supplied user IDs when the authenticated session identifies the user.
- After login, return the user to the action they originally attempted.
- Never commit secrets, `.env`, API keys, database passwords, tokens, or certificates.

## Development behavior
- Audit before editing: classify Existing / Partial / Missing / Broken.
- Reuse existing PostgreSQL tables/routes where practical.
- Preserve Role Center, Profile, Learn & Earn, Works, Shop, Vibe and Stories unless the task explicitly changes them.
- Run syntax/build checks after changes.
- Report exact files changed, schema changes/migrations, tests run, and known limitations.
- Do not claim completion unless UI + API + persistence are wired end-to-end.

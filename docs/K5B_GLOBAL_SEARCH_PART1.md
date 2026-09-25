# K5B Global Search — Part 1 (search foundation + public DTO contract)

**Branch:** `k5b-search-foundation` (from K5A commit `9c3b523`) · **Scope:** approved Part 1 boundary only (backend).
Not merged, pushed or deployed.

## Endpoint

`GET /api/search?q=&pillar=&types=&limit=`

| Parameter | Rule |
|---|---|
| `q` | Required. 2–80 characters after NFKC + whitespace normalisation. Control characters → 400. Split into up to 6 terms; every term must match. `%`, `_` and `\` are escaped and every LIKE uses `ESCAPE '\'`. |
| `pillar` | `all` (default) · `connect` · `shop` · `works` · `learn`. |
| `types` | Comma list from `person,product,worker,course` (default all four), no duplicates, echoed in canonical order. It must agree with `pillar`. |
| `limit` | 1–10 per type (default 5). Fixed caps: the query fetches limit+1 to set `has_more`. There is no cursor or pagination. |
| anything else | 400 `INVALID_SEARCH_PARAMETER`. This covers unknown or duplicated parameters and every actor/id-looking key (`userId`, `viewerId`, `id`, `uuid`, `token`, …). |

The viewer comes only from the Bearer session. Guests get public results. Unknown, revoked or suspended sessions are treated as guests.

## Response

```
{ status, viewer: "guest"|"session", query: {q,pillar,types,limit}, results: [DTO…], has_more: {<type>: bool} }
DTO = { type, pillar, title, subtitle, image, badges, route }   ← nothing else
```

| type | pillar | route (public key only) | visibility floor |
|---|---|---|---|
| person | connect | `/@public_username` | Valid public username, discoverable, active account, not blocked either way, not the viewer. A private profile is shown only to a signed-in follower (the existing K5E rule). |
| product | shop | `/shop/products/PRD-…` | Shop S1 gate: published, released, not archived, active vendor, moderation APPROVED or none. The vendor owner must be active and not blocked. |
| worker | works | `/works/workers/<worker_code>` | Verified KYC and skill, active account and row, an approved primary service that is active and customer-visible, a public (non-numeric, non-UUID) code, and an active, unblocked linked member. City only. |
| course | learn | `/learn/courses/CRS-…` | Active and `PUBLISHED`. Hidden when its active approved teacher is blocked either way or is no longer an active account. |

- **Public codes.** `PRD-`/`CRS-` codes come from the K5A `howdi_public_refs` registry through the same issuer K5A uses (`connectHomeK5A._internal.issueRefs`). They are issued only after the SQL and JS visibility checks pass. There are no new columns and no raw ids.
- **Never exposed.** Numeric ids, UUIDs, K5E reversible references, email, phone, address, pincode, coordinates, sku, vendor code, internal role/status and tokens.
- **Response scrub.** The seven-key projection is followed by the shared K5A `stripInternalKeys` pass.
- **Headers.** `Cache-Control: no-store`, `Pragma: no-cache`, `nosniff`, `Vary: Authorization`.
- **Errors.** A generic 500 (`SEARCH_UNAVAILABLE`). The log gets only the driver code, never the search term.
- **Logging.** The handler runs before the server's request logger, so query strings are never logged.
- **Rate limits.** 60/min per guest IP and 120/min per session user (in-memory, per process). The response is 429 with `Retry-After`.
- **Reserved paths.** `/api/search/*` sub-paths return 404 and are held for later parts. Methods other than GET return 405.

## Files

- `backend/search-k5b.cjs` (new): parser, SQL, visibility re-checks, DTOs, handler.
- `backend/server.js`: module wiring, dispatched after the K5A handler.
- Tests: `backend/tests/k5b-search.test.cjs` (unit), `backend/tests/k5b-search-pg.test.cjs` + `backend/tests/k5b-pg/*` (real PostgreSQL; `05` is the Chromium JSON/DOM/URL leak scan).

No schema change. No UI change. No legacy endpoint changed. `/api/users/search` is not used.

## Run

```
node --test backend/tests/k5b-search.test.cjs
K5B_PG_URL=postgresql://user:pass@host:5432/postgres node backend/tests/k5b-pg/run.cjs
# + browser leak scan:
K5B_BROWSER=1 K5B_APP_DIR=<customer vite build> K5B_PLAYWRIGHT=<playwright module> K5B_PG_URL=… node backend/tests/k5b-pg/run.cjs
```

## Known limitations (Part 1)

- **Unserved deep links.** Product and course routes carry `PRD-`/`CRS-` codes, but Shop and Learn do not resolve those codes yet (same as K5A: a later part must add by-code readers or landings). Worker routes use `worker_code`, which the existing Works detail route does not accept yet either.
- **Matching.** `ILIKE` substring matching with no index, typo tolerance or relevance model beyond exact/prefix-first ordering. Matching is bounded by the fixed caps and the rate limit.
- **Rate limits.** The limiter is in-memory per process (the same helper K5A uses).
- **Legacy P0.** `/api/users/search` is still a legacy P0 leak and must be hardened before Search is released. It was deliberately not modified here.

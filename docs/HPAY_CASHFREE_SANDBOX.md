# HPay × Cashfree — SANDBOX ONLY

**Status: sandbox integration. No production credentials, no live money. Not FINAL.**

## Flow

`V8 wallet (/me/wallet) → POST /api/v8/hpay/cashfree/orders → Cashfree Create Order (server) → Cashfree JS v3 checkout (modal)
→ GET /api/v8/hpay/cashfree/orders/{HCF-…} and/or signed webhook → HOWDI verifies with Cashfree (Get Order + Get Payments)
→ one locked transaction: V8 HPay wallet credit + ledger TOPUP + payment PAID`

| Endpoint | Who | What |
|---|---|---|
| `GET /api/v8/hpay/cashfree/config` | signed-in, active | `{ enabled, mode: "sandbox" }` |
| `POST /api/v8/hpay/cashfree/orders {amount, idempotency_key}` | signed-in, active | ₹100–₹5,000 whole rupees, ₹10,000/day incl. open orders, ≤3 open; same key = same order (409 for another amount); returns `{ payment, checkout_session }` |
| `GET /api/v8/hpay/cashfree/orders/{HCF-…}` | owner only | verifies with Cashfree server-side, settles once, returns state + balance |
| `POST /api/v8/hpay/cashfree/webhook` | Cashfree | `x-webhook-signature` = Base64(HMAC-SHA256(client secret, `x-webhook-timestamp` + raw body)); re-verifies with Cashfree before any credit; idempotent (event hash); 500 only when settlement failed so Cashfree retries |

Checkout UI: **Web → Popup Checkout** (`cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" })`). When the popup
closes, HOWDI asks its own server. **Redirect Checkout** (`"_self"`) is only a fallback, used when the popup cannot launch or when
Cashfree reports that the chosen method must navigate (`result.redirect`). Before opening checkout, the HOWDI reference is kept in
`sessionStorage` for that tab. On return (`?cf_order=` from the order's return URL, or the remembered reference) the wallet
verifies with the server. The redirect fallback returns to HOWDI only if `HOWDI_CASHFREE_RETURN_URL` (https) is configured.

States: `active` (awaiting payment) · `pending` · `paid` · `failed` / `user_dropped` (the same order can be paid again) · `expired` ·
`mismatch` (a SUCCESS that does not match the order amount/currency — never credited). A `paid` payment is never settled again or downgraded.

## Security properties

- Amount, currency and order id (HOWDI reference `HCF-…`) come only from the server; Cashfree gets an opaque customer id (HMAC), never a HOWDI user id.
- The client secret is used only in server-to-server headers; the browser receives the reference, amount, state and the payment session.
- Browser redirects / checkout completion never credit anything; webhook fields never credit anything.
- Existing V8 protections stay: session + active account (`is_active`, `account_status = ACTIVE`), HPay ledger, daily limits.
- Refund webhooks are recorded (`refund_status`); a top-up refund does not reverse the wallet automatically (policy decision pending).

## Enabling the sandbox locally

Requires the Preview/Test sandbox (`*_preview` database, `HOWDI_PREVIEW_SANDBOX=1`) plus Cashfree **sandbox** keys:
`CASHFREE_ENV=sandbox`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET` (see `backend/.env.example`). The code refuses
`CASHFREE_ENV=production`, the production host `api.cashfree.com` and any non-sandbox host (a loopback stub only with
`HOWDI_CASHFREE_ALLOW_LOCAL_STUB=1`, used by `tests/v8-pg/17-hpay-cashfree.cjs`).

## Production onboarding gates (not done here)

1. Cashfree merchant onboarding/KYC, PA-PG agreement, settlement bank account, production keys in a secret manager.
2. A deliberate code change to allow production mode (currently refused) behind a HOWDI release flag, with the fail-closed funding gate kept for everything else.
3. Wallet stored-value licensing/compliance review (RBI PPI rules) before real money is held in HPay.
4. Public HTTPS webhook URL registered in the Cashfree dashboard; return URL on the production domain.
5. Refund/reversal policy for top-ups; reconciliation job against Cashfree settlement reports.
6. Live end-to-end test with Cashfree sandbox keys (this branch was verified against a Cashfree-API stub; no Cashfree sandbox credentials were available).

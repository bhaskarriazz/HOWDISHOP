# Run HOWDI V8 on your laptop (localhost)

Branch: `claude/howdi-v8-build-continue-4wzfd5` (do not merge PR #1 until you have walked through it).
Everything below runs in **Preview/Test mode**: HPay uses a test wallet, OTP codes go to a local outbox, and no real money, SMS or courier is used.

## 1. Install once
| Tool | Version | Check |
|---|---|---|
| Node.js | 20 or 22 LTS | `node -v` |
| PostgreSQL | 14–16 | `psql --version` |
| Git | any | `git --version` |

## 2. Get the code
```bash
git clone https://github.com/bhaskarriazz/HOWDISHOP.git HOWDISHOP   # skip if you already have it
cd HOWDISHOP
git fetch origin claude/howdi-v8-build-continue-4wzfd5
git checkout claude/howdi-v8-build-continue-4wzfd5
git pull
npm install                 # installs the customer app (workspace)
cd backend && npm install && cd ..
```

## 3. Create the database
The name **must end in `_preview`**. That is what switches on the test HPay wallet and the local OTP outbox.
```bash
# macOS / Linux
createdb -U postgres howdi_local_preview
# Windows (PowerShell, from the PostgreSQL bin folder or with it on PATH)
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres howdi_local_preview
```
The backend creates all tables itself on first start.

## 4. Backend settings: `backend/.env`
Copy `backend/.env.example` to `backend/.env` and set at least these values. Use your own password and long random strings; never commit this file.
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/howdi_local_preview
HOWDI_PREVIEW_SANDBOX=1
HOWDI_ALLOWED_ORIGINS=http://localhost:5173
HOWDI_CONNECT_REF_SECRET=any-long-random-text-1
HOWDI_ADMIN_TOKEN=any-long-random-text-2
```
Leave `ADMIN_USERNAME` / `ADMIN_PASSWORD` empty on your laptop. The admin console then accepts **admin / admin**, and only while `NODE_ENV` is not `production`.

## 5. Customer app settings: `apps/customer/.env`
```
VITE_API_BASE_URL=http://localhost:5000
```

## 6. Start it (two terminals)
```bash
# terminal 1: API
cd backend
npm start          # wait for “HOWDI database initialization completed”
# terminal 2: website
cd apps/customer
npm run dev        # open http://localhost:5173
```

## 7. Create test accounts
One HOWDI account can hold several roles, so use three accounts to see both sides of every flow. For example: **Buyer/Learner**, **Vendor/Teacher**, and a **Startup/Institute** applicant.

1. Open http://localhost:5173 and choose **Sign up** with a mobile number (any 10 digits) and a `@username`.
2. The OTP is not sent by SMS. Open `http://localhost:5000/api/preview/outbox` in the same browser to read it; this only works from your own machine.
3. Use a second browser, or a private window, for the other account, so both sides are open at once.
4. HPay: each account starts with a **₹2,000 test balance**. The first payment asks you to set an HPay PIN.

## 8. Walk through each journey (both sides)
| Journey | Side A | Side B | Admin (http://localhost:5173/admin, admin / admin) |
|---|---|---|---|
| Vendor | `/me/roles` → Apply as Vendor → `/me/vendor` | — | Vendors: ask for info → approve (3 checks) |
| Reviews / wishlist | Buyer (after delivery): product → ♡ save, rate + review · `/shop/wishlist` | Seller: same product page → Reply | — |
| My HOWDI | `/me` hub → profile, rewards, size, family, addresses, delete account | Family: the invited member accepts in `/me/family` · Seller picks who funds points in `/me/rewards` | Reported reviews |
| Wallet / photo | `/me/wallet` (add test money, receipts) · `/me/photo` | — | — |
| Vendor workspace | `/me/vendor/store` → Add product → Publish | Buyer searches it in the top search | — |
| Shop purchase | Buyer: product → Add to bag → `/shop/bag` → Checkout → HPay PIN | Vendor: `/me/vendor/store` → Orders: accept → pack → ship (courier + tracking) → delivered | — |
| Return / refund | Buyer: `/shop/orders` → order → Return an item | Vendor: Returns tab → approve → item received (buyer refunded) | — |
| Teacher | `/me/apply/teacher` → submit | — | Teachers: ask for info / reject / approve |
| Course | Teacher: `/learn/teach` → New course → Publish | Learner: `/learn/courses` → course → Join (HPay PIN if paid) → lessons → certificate | — |
| Learners | Teacher: `/learn/teach` → Learners (progress, certificate, earned) | Learner: `/learn/mine` → Completed → certificate | — |
| Institute / Startup | `/me/apply/institute` or `/me/apply/startup` | `/me/roles` shows the status and HOWDI's reason | Institutes / Colleges, Startups |
| Works | `/works/become` (become a worker) · `/works` (book) | Worker desk `/works/worker` | Workers |
| Messages / HPay | `/connect/messages` (chat, pay, request, calls) | the other member | — |

Every screen shows a status and notifications (bell icon) for the other side. When you have checked a journey, tell me PASS or FAIL for its Screen IDs in the matrix.

## 9. Automated tests (optional)
You need a PostgreSQL user that can create databases. The tests make and delete their own temporary databases and do not touch `howdi_local_preview`.
```bash
V8_PG_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/postgres node backend/tests/v8-pg/run.cjs
```
Windows PowerShell: `$env:V8_PG_URL="postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/postgres"; node backend/tests/v8-pg/run.cjs`

## 10. If something goes wrong
| Symptom | Fix |
|---|---|
| “HPay isn’t connected here” | The database name must end in `_preview` and `HOWDI_PREVIEW_SANDBOX=1` must be set; then restart the API. |
| The website loads but every action fails / CORS error | `HOWDI_ALLOWED_ORIGINS` must list `http://localhost:5173`, and `VITE_API_BASE_URL` must point to the API; restart both. |
| `/api/preview/outbox` shows 404 | Same as the first row: sandbox is off. |
| Admin console says “Admin sign-in is not configured” | `NODE_ENV=production` is set; use `development` locally or set `ADMIN_USERNAME` / `ADMIN_PASSWORD`. |
| Port already in use | Change `PORT` (and `VITE_API_BASE_URL`), or stop the other program. |
| An empty catalogue / Shop | That is expected on a fresh database: approve a vendor or teacher and publish a product or course first. |

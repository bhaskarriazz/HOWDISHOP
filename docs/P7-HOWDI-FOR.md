# P7 HOWDI FOR implementation evidence

## Scope and source

- Tracker IDs: **P7-HOWDI-FOR** (AI Task Tracker row 67), **K5-HF-01** (K5 Tracker row 32).
- Source: September 30 queue in the [Founder-provided tracker](https://docs.google.com/spreadsheets/d/14bucb8m2JEgOlZTHO70sbCmSB11byHRpAxU3f22fOcs/edit).
- Base: `ad0f1290a38a0054309f93aad7a772c7321494ac`, the V8 integration containing FINAL MP-56. Reuses its components and 21 existing tests. The older main checkout lacks that completed module.
- Delivery branch: `coderabbit/review-howdishop-repository/c0c848aa`.
- State: implementation present; targeted validation passed; **BUILD/REVIEW**, pending Founder visual acceptance and final integration gate. No claim of FINAL/PASS closure.

## Implementation

One existing shared audience template serves `/for/students`, `/for/institutes`, and `/for/startups`, plus `/for` and the existing unknown-audience state. The V8 theme and six global destinations remain visible. Keyboard focus, the skip link, mobile safe area, and browser history work with the audience page.

| Audience | Learn | Work | Shop | Connect |
| --- | --- | --- | --- | --- |
| Students | Courses, Journey, Passport, opportunities | Existing worker onboarding and eligibility | Existing vendor setup | Community discovery |
| Institutes / Colleges | Courses, live classes, partner programmes, institute application | Campus service discovery | Vendor setup for student showcases, with creator consent | Community discovery |
| Startups / Small Businesses | Team course discovery, business application | Service and hiring discovery | Sourcing and vendor setup | Publishing and community discovery |

A bounded optional topic is passed as `q` only to existing course, service, product and community searches. All supported handoffs carry an allowlisted `from=for-<audience>` marker. Search state survives refresh and repeated handoffs. Other destination filters have no universal schema and are not invented.

Anonymous users can browse audience pages and public destinations. Protected actions use the existing login and onboarding surfaces, then continue to the requested destination. Cancel clears the pending action. The pending action is held in memory; a page reload while login is open requires selecting the action again.

Audience selection does not call a role grant API, add an organisation, submit an application, create a listing or publish content. Cross-origin, unknown destination, identity, role, membership and arbitrary redirect parameters are rejected or stripped. Existing backend session and permission validation remains authoritative. Public copy uses `@username` and exposes no internal IDs.

No programmes, metrics, prices or testimonials were fabricated. Local empty course/community/product/programme datasets are valid empty responses. The pages guide users into available modules; no bulk team enrollment, campus marketplace or partner-management capability is claimed.

The existing `V8Personalization.jsx` imported `V8Dialog` from a module that does not export it, blocking the app build/startup. Its import is corrected to `V8System` as a direct prerequisite.

## Validation

Environment: Node 24.14.1, npm 11.11.0, PostgreSQL 16.14 with pgcrypto, Vite customer on 5173, actual backend on 5000, synthetic local account/database only. Dependency manifests and lockfile unchanged.

Run from `apps/customer`:

```sh
node scripts/test-howdi-for.mjs
HOWDI_P7_LOGIN_FILE=/private/path/local-test-account.json HOWDI_PROOF_DIR=/path/to/proof node scripts/verify-howdi-for-browser.mjs
```

The optional private JSON contains a synthetic account's `email` and `password`. Never commit it. Without it, login verification is explicitly skipped. The browser harness uses the shared `coderabbit-agent-browser`; start/register the real customer/API first. `--auth-only` reuses prior browser output and is appropriate only when those checked inputs are unchanged.

Run from repository root:

```sh
npm run build --workspace=apps/customer
git diff --check
```

Observed:

- **26/26** focused tests passed: existing 21 component/entry tests plus 5 P7 route, context and privacy tests.
- Customer production build passed. Existing large-chunk/mixed-import warnings remain.
- Browser: three audiences at 1440/768/390; public access, six navigation entries, heading focus, no horizontal overflow.
- Four search handoffs and refresh passed. Real login continued to institute application and vendor setup; cancellation and browser back/forward passed.
- Role API after login: institute/startup/teacher/vendor remain `none`; teacher API returns **403**. No application was submitted.
- Additional runtime checks passed: repeated Connect query changes, skip-link focus, mobile final links above bottom navigation.
- CodeRabbit CLI review **blocked**: task runtime says review disabled. No review findings or clean-review claim.
- Full regression intentionally deferred to the final integration gate, per Founder instruction.

Generated task Outputs contain the screenshots, browser result JSON, exact source manifest/commit, and an evidence workbook. The live Google Sheet was not edited; the evidence copy updates only P7 status and notes, leaving FINAL rows and P8 unchanged.

## Remaining work

- P7: Founder visual acceptance, enabled CodeRabbit review, and final integration regression remain outstanding.
- **P8-LEARN-DISCOVERY / K5-LD-01** remain NOT STARTED by this batch.
- Later Learn Experience items (Learning Path, Next Step, Project Journey, materials/Shop handoff, Show My Work, Ready to Sell draft) are not claimed by this batch; map their active tracker rows before implementing them.
- Main/master was neither pushed nor merged. Local runtime evidence does not prove deployment or production data availability.

## Founder-requested second visual pass

The first responsive presentation was not visually approved. P7 remains **BUILD/REVIEW** until Founder review of the second pass.

The second pass only changes audience presentation: a compact audience header, shorter heroes with one primary action, an illustrated horizontal journey, three featured goals in mobile/tablet swipe rails, and native expandable secondary actions. Tablet retains a split hero; desktop uses three goal cards. Student, institute and startup treatments differ in tone, composition, iconography and surfaces while sharing the V8 layout. The existing bottom navigation remains visible. No additional fixed CTA bar is added over the available mobile content area.

Action targets, query encoding, authentication/resume, backend and permissions are unchanged. The browser harness reveals secondary actions before interacting with them. Existing destination data remains in its destination screens; the decorative hero elements describe paths and do not represent live records or progress.

Fresh screenshots cover Students, Institutes and Startups at 390, 768 and 1440 pixels, plus mobile goal-rail and expanded states. They are published separately under task Outputs `p7-visual-revision`, preserving the original proof for comparison. Final evidence and the commit are recorded in that folder's report. Full regression is still deferred to final integration.

## Registration presentation follow-up

The P7-linked institute and startup application screens now use a shared presentation with three sections (organisation/business, details/goals, review), desktop/tablet field grids, a responsive status header, draft saving and an explicit review submission. The existing API fields, callbacks, validation, authentication and role-grant rules are retained. Teacher registration retains its existing presentation.

Source: a fresh download of the Founder Drive workbook; inspected **Latest Visual References** (shared shell conventions), **V8 Visual Proof** row46 (onboarding), and rows28/29 (institute/startup context). The archive's document upload, space and invitation steps exceed the current application contract; these are not presented as working capabilities. Institutes continue to use registration last4 only. Reference records/metrics are not production data.

Real synthetic-account checks cover step transitions, draft save/reload for both roles, server declaration validation, submitted read-only state, and no role activation after submission. An additional focused regression protects exact user text/URL display and markup escaping in the review screen. Screenshots and detailed validation are in Outputs `p7-registration`. This follow-up remains **BUILD/REVIEW**, with Founder acceptance pending.

# HOWDI Move M1 browser proof

Captured on 2026-09-29 from `codex/move-v8-final` using Chromium, the real customer Vite app, the HOWDI backend, and a disposable local PostgreSQL `_preview` database. The account, address and Ride requests were synthetic test data. Both disposable databases were removed after validation.

The [proof index](proof-index.json) lists 18 captures at widths 1440, 768 and 390. The captures show Move home, server quote, no-driver status, and on mobile the offline, Women Special unavailable and Send Items unavailable states. Document width matched viewport width in every capture; browser page errors were absent.

The browser used the existing account address API, then posted a Ride quote and request to the existing Ride backend. The server returned a Preview/Test fare and a real persisted Ride code. With no eligible test driver, it returned the no-driver matching state. The old Move draft images were not used for visual approval.

Checks: customer build passed; 6 focused Node tests passed; 145 PostgreSQL Ride integration checks passed; `git diff --check` passed. These are engineering checks, not Founder visual approval.

Open dependencies: no Ride GPS/geocoding; no driver arriving/arrived backend state; no Send Items backend; no production dispatch, payment or emergency integration. Women Special remains closed with no fallback.

# HOWDI Adaptive Floating Dock / Spark — Implementation Contract

## Base
- Base branch: `codex/move-v8-final`
- Preserve the approved V8 shell and existing module behavior.
- Do not redesign working Home / Connect / Shop / Move / Work / Learn screens.

## Locked navigation
The six core pillars remain:
1. Home
2. Connect
3. Shop
4. Move
5. Work
6. Learn

## Approved dock direction
- Component name: **HOWDI Floating Dock — Core Pillar Navigation**
- Floating pill / capsule treatment with elevated shadow.
- Icon-first navigation.
- Profile/avatar remains a separate action; do not put avatar inside the core dock.
- Mobile-first floating dock; responsive behavior must remain usable on tablet and desktop.
- Current desktop V8 rail/header must not be casually removed or redesigned.

## Existing personalization behavior that must survive
- Per-account dock ordering.
- Hide/show state.
- Favorite state.
- Home-module customization.
- Existing 2000 ms long-press entry to Customize Home must continue to work unless the new Spark interaction explicitly replaces only the trigger while preserving the same capability.

## Floating Spark implementation
Implement the newer Spark as an additive interaction layer around the dock, not as a destructive rewrite of the V8 navigation architecture.

Requirements:
- One clear primary Spark control associated with the floating dock.
- Spark must expose useful secondary actions without creating a second permanent navigation bar.
- Opening Spark must not navigate away by itself.
- Closing Spark must restore the dock cleanly.
- Keyboard, touch and pointer interactions must all remain usable.
- Respect safe-area insets on mobile.
- No overlap with browser/mobile bottom UI at 390px-class widths.
- Preserve active-pillar indication.
- Preserve deep links / navigation callbacks already owned by App.
- Do not duplicate navigation state inside the Spark component.
- No avatar inside the six-pillar dock.
- No Connect robot outside Connect.

## Visual guardrails
- Slimmer, cleaner super-app treatment than the older chunky V8 dock.
- White/light capsule visual with restrained navy/blue emphasis consistent with the newer HOWDI direction.
- Avoid heavy borders and oversized labels.
- Maintain clear selected, pressed and focus states.
- Motion must be short and functional; respect reduced-motion settings.
- Do not invent a completely new design system.

## Files likely involved
- `apps/customer/src/v8/V8Shell.jsx`
- `apps/customer/src/v8/V8Personalization.jsx`
- `apps/customer/src/v8/v8.css`
- `apps/customer/src/App.jsx`
- `apps/customer/src/v8/V8Home.jsx` only if required for customization wiring.

## Claude task
1. Audit existing V8BottomBar / personalization wiring before editing.
2. Implement Adaptive Floating Dock + Spark non-destructively.
3. Preserve six pillar callbacks and personalization.
4. Verify 390x844, ~768px tablet, and desktop behavior.
5. Do not touch unrelated modules.
6. Add a concise implementation note to this file under **Implementation Notes**.

## CodeRabbit review task
Review for:
- accidental V8 shell redesign;
- broken Home/Connect/Shop/Move/Work/Learn navigation;
- lost personalization state;
- long-press/customize regression;
- duplicate state/navigation logic;
- accessibility regressions;
- touch target / safe-area problems;
- mobile overflow at 390px width;
- tablet/desktop regressions;
- unnecessary unrelated edits;
- missing reduced-motion handling;
- React runtime errors / unstable event handling.

Block merge for any high-confidence regression.

## Acceptance
- 390px mobile: dock floats correctly and Spark works.
- All six pillars remain reachable.
- Current route remains visually selected.
- 2s customization behavior or an explicitly equivalent preserved entry works.
- Per-account dock preferences remain persisted.
- No second permanent bottom bar.
- No profile avatar inside the six-pillar dock.
- Desktop V8 shell remains usable.
- No blank-screen/runtime crash.
- No backend/database changes required for this UI task.

## Implementation Notes
- Audit: six-pillar App callbacks, account-scoped local-storage preferences, and Customize Home were existing; the mobile capsule was partial; Spark was missing. No backend or schema changes are needed.
- `V8Shell.jsx` adds Spark as local disclosure state only. Search focuses the existing header field; Customize Home opens the existing editor; hidden pillars remain reachable using the same App callback. Escape, close, outside pointer, and keyboard focus leaving the dock dismiss it. Explicit dismissal returns focus to Spark.
- The mobile capsule uses the personalized visible pillars with 44px minimum targets, selected/pressed/focus states, and a separate Spark button. At 360px and below Spark sits above the capsule to preserve target size. Tablet/desktop retain the existing rail/header and expose Spark as a single floating action, with no second permanent navigation bar.
- Two-second touch/pointer customization remains available. Movement, cancellation, leaving the dock, and unmounting cancel pending holds. Ordering, hidden/favorite state, and home-module persistence retain the existing account keys and schema. Profile remains outside the dock.
- Safe-area insets apply to dock placement and mobile content clearance. Spark panels scroll within the viewport; motion respects OS and existing in-app reduced-motion settings. Colors use the existing light/dark theme tokens.
- Verification: production build and Chromium browser regressions at 390×844, 768×1024, 1440×900, and 320×740. Checks cover all six navigation callbacks, current-page state, hidden-pillar access, browser history/deep links, dismissal/focus, touch holds/cancellation, account switching/reload persistence, home-module/favorite preferences, minimum target bounds, Home overflow, reduced motion, and timer cleanup. No browser page errors were observed.
- Scope of verification: the frontend runs without a backend, so API-backed content displays its existing unavailable/empty states. Physical iOS/Android browser chrome and device safe-area behavior have not been tested.

Reproduce from the repository root (Node 22+; run the Vite server in a separate terminal):

```bash
npm ci --ignore-scripts
npm run build --workspace apps/customer
npm run dev --workspace apps/customer -- --host 127.0.0.1
```

The browser suite uses an isolated Playwright installation without changing application dependencies:

```bash
npm install --prefix /tmp/howdi-browser --no-package-lock playwright@1.63.0
/tmp/howdi-browser/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/howdi-browser/node_modules node apps/customer/tests/floating-dock.cjs
```

Set `HOWDI_TEST_OUTPUT` to a directory to save responsive screenshots. The account-switching fixture under `apps/customer/tests/` is served by the dev server only and is not a production build entry.

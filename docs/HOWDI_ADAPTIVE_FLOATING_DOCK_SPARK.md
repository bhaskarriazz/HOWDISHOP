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
The review branches both started at `7251489`, which added this contract only.
The focused follow-up adds Spark within `V8BottomBar`, preserving App-owned
navigation, the existing preference hook, and the desktop rail/header.

- Spark uses a native auto popover for Escape/outside dismissal and exposes
  Customize Home plus hidden pillars. It does not own route state.
- The 2000 ms hold remains; timers are canceled on unmount, pointer cancellation,
  route change, window blur, and responsive breakpoint changes.
- The existing account-keyed localStorage persistence remains unchanged. It is
  browser-local persistence, not server synchronization across devices.
- The mobile capsule reserves a 44px Spark target; all six default pillar targets
  remain at least 44px wide at 390px. Content clearance includes the bottom inset.
- Reduced motion covers both the OS setting and HOWDI's in-app setting.
- No backend/schema changes or unrelated module redesign.

Validation: `npm run test:dock --workspace apps/customer` (9 Chromium browser
checks), `npm run build --workspace apps/customer`, and `git diff --check` pass.
Install the test browser with `npx playwright install chromium` after `npm ci`.
Tests cover 390px mobile, 768px tablet, 1440px desktop, six navigation callbacks,
Spark dismissal, touch, customization, account isolation/reload, canceled holds,
and reduced motion. A 34px safe-area inset is simulated in the real stylesheet.

Integration gate remains **BLOCKED for final release approval** pending real
mobile Safari/browser chrome verification and a live authenticated app smoke
check. The full guest app is tested with external requests blocked; expected
API failure notices occur, but there are no uncaught page errors. Spark requires
a browser supporting the native Popover API. The build retains existing large
chunk and mixed static/dynamic import warnings.

Smallest integration path: review the focused follow-up into
`claude/adaptive-floating-dock-v8`, then reassess draft PR #4 against
`codex/move-v8-final`. Do not merge the full historical V8 branch into `main`
as part of this UI fix.

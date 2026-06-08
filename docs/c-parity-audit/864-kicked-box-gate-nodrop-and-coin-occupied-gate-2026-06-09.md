# Kicked Box Gate No-Drop And Occupied Coin Gate

## C anchors

- `nethack-c/upstream/src/dokick.c:649` gives kicked boxes and chests a local impact chance before ordinary kicked-object flight.
- `nethack-c/upstream/src/dokick.c:653` returns early for low-range box kicks after `THUD!` and container impact damage.
- `nethack-c/upstream/src/dokick.c:656` through `:670` return early when a locked box breaks open or an unlocked box lid slams.
- `nethack-c/upstream/src/dokick.c:673` explicitly lets a box fall through when the local box-impact rolls fail and range is still at least two.
- `nethack-c/upstream/src/dokick.c:733` then extracts the surviving object and launches `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/zap.c:4049` stops kicked coins at an occupied square before calling `ship_object()`, so an occupied down-gate coin stop consumes no down-gate no-drop RNG.
- `nethack-c/upstream/src/dokick.c:1657` uses the shared non-ladder `rn2(3)` no-drop roll in `ship_object()`.
- `nethack-c/upstream/src/dokick.c:1687` returns false from `ship_object()` for no-drop after any gate-square impact handling.
- `nethack-c/upstream/src/zap.c:4076` lets kicked `bhit()` continue after `ship_object()` returns false.
- `nethack-c/upstream/src/dokick.c:757` through `:784` run normal kicked landing billing and floor effects after any non-migrating no-drop continuation.

## JS parity

- `js/cmd.js` now resolves kicked gate shipping through a shared loop used by both ordinary same-level flight and the direct gate branch.
- Kicked boxes whose local lock/lid impact roll fails now continue same-level flight after a down-gate no-drop result, instead of stopping on the gate square.
- Successful kicked-box down-gate drops still migrate after the local box-impact roll fails.
- Shop-floor kicked boxes that no-drop through a non-shop gate now receive final `stolen_value()`-style normal-flight billing at the eventual landing square.
- Added an occupied down-stairs kicked-gold canary proving coin stacking happens before `ship_object()` and consumes no `rn2(3)` no-drop or `rn2(100)` break-test RNG.

## Remaining follow-up

- Command kicking still rejects non-empty containers in this JS path, so C's `container_impact_dmg()` content-damage behavior is covered only by direct helper tests, not full command kicks.
- Kicked-box impact into a gate-square pile has not yet been separately canaried for C's no-drop impact-drop side effects.

## Verification

- `node --test --test-name-pattern "command kicked box|command kick locked trapped empty box|command kicked single gold piece stops|command kicked single gold piece falls|command kicked ordinary floor object no-drop|command kicked shop-floor ordinary object no-drop|command kicked shop-floor ordinary object down non-shop stairs|command kicked shop-floor single gold piece no-drop" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

# Kicked Object Down-Gate No-Drop Continuation

## C anchors

- `nethack-c/upstream/src/zap.c:3846` initializes kicked `bhit()` with the object already one square in front of the hero and decrements range before the main flight loop.
- `nethack-c/upstream/src/zap.c:3870` advances `gb.bhitpos` one square per remaining range step.
- `nethack-c/upstream/src/zap.c:4049` only exits kicked `bhit()` at a down-gate when `ship_object()` returns true, or when a kicked coin reaches a square that already has floor objects.
- `nethack-c/upstream/src/dokick.c:1657` makes stairs, special stairs, seen holes, and seen trapdoors consume `rn2(3)` for no-drop; down ladders skip that roll.
- `nethack-c/upstream/src/dokick.c:1684` emits visible transit feedback before the no-drop check.
- `nethack-c/upstream/src/dokick.c:1687` returns false from `ship_object()` when no-drop is true, after any gate-square impact handling.
- `nethack-c/upstream/src/zap.c:4076` continues the kicked `bhit()` loop after `ship_object()` returns false, backing up only for blocked terrain or closed doors.
- `nethack-c/upstream/src/zap.c:4089` stops kicked physical objects on pools, lava, and sinks after reaching those squares.
- `nethack-c/upstream/src/dokick.c:752` skips the kick tail only for `OBJ_MIGRATING`; no-drop objects keep running the tail at final `gb.bhitpos`.
- `nethack-c/upstream/src/dokick.c:757` bills final no-drop landing from a costly source with `costly_gold()` for coins and `stolen_value()` for ordinary objects when the final square is outside the source shop room.

## JS parity

- `js/cmd.js` now records remaining kicked range when same-level flight first reaches a down-gate.
- When `maybeShipRemoteProjectileObject()` returns `noDrop`, the kicked object resumes same-level flight from the gate square instead of landing there immediately.
- Gate-square impact behavior remains in `maybeShipRemoteProjectileObject()`; the kicked object itself continues only after that no-drop result.
- Successful kicked ordinary-object migration now passes `shopFloorObj` from the gate square, matching C's `costly_spot(x,y)` argument to `ship_object()`.
- No-drop continuation now runs final kicked-flight shop charging at the eventual landing square: gold uses the existing `costly_gold()`-style path, while ordinary shop-floor merchandise uses `stolen_value()`-style debt wording.

## Remaining follow-up

- Kicked coins still need a dedicated occupied-down-gate canary proving that C's `COIN_CLASS && OBJ_AT(x,y)` short-circuit skips the `rn2(3)` no-drop roll.
- This slice covers the ordinary same-level kicked flight path. Specialized kicked-box or fragile-object direct gate branches remain separate if future C audits show additional no-drop continuation differences there.

## Verification

- `node --test --test-name-pattern "command kick ordinary floor object through seen remote hole|command kicked shop-floor ordinary object through seen remote hole|command kicked ordinary floor object no-drop|command kicked shop-floor ordinary object no-drop|command kicked shop-floor ordinary object down stairs|command kicked shop-floor ordinary object down non-shop stairs|command kick ordinary floor object flies|command kicked single gold piece|command kicked shop-floor single gold piece no-drop|command kicked shop-floor single gold piece down|command kicked outside single gold piece down" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

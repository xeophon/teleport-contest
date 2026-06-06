# Rolling Boulder Iron Bars

## Scope

Cover the C `launch_obj()` branch where a rolling boulder is about to enter iron bars, hits the bars, and stops on the near side.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3543` through `:3556` checks the next square after normal rolling-boulder path handling. If the next square is `IRONBARS`, C sets the final resting spot to the current square, calls `hits_bars(&singleobj, x2, y2, fx, fy, !rn2(20), 0)`, and stops rolling.
- `nethack-c/upstream/src/mthrowu.c:1499` through `:1558` defines `hits_bars()`. Rock-class objects, including boulders, hit bars even when the caller's `always_hit` roll is false.
- `nethack-c/upstream/src/mthrowu.c:1430` through `:1458` routes non-hero bar impacts through `breaks()`/`hit_bars()` and uses `Whang!` for boulders unless the hero is deaf.
- `nethack-c/upstream/src/dothrow.c:2444` through `:2453` and `nethack-c/upstream/src/zap.c:1458` through `:1471` cover the ordinary-object break-resistance path that consumes `rn2(100)`.

## JS Change

- `js/allmain.js` now checks the next rolling-boulder square for `IRONBARS` before ordinary wall/tree stopping.
- A boulder that would enter iron bars now consumes the C force-hit roll and break-resistance roll, then stops on the current square.
- Audible impacts report `Whang!` through the rolling-boulder motion-message queue so visible trigger preludes remain before the `--More--` continuation.
- Deaf heroes get no iron-bars impact sound, but the boulder still stops and the RNG order remains C-shaped.

## Tests

- `rolling boulder whangs iron bars and stops on near side`
- `deaf hero gets silent rolling boulder iron bars impact`

The tests use local trap, boulder, iron-bars terrain, visibility/status, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: launch-drop preservation and floor-effect integration. Boulder chaining is covered in audit 588, hero collision along the rolling path is covered in audit 589, path landmines are covered in audit 590, pit/hole path effects are covered in audit 591, and teleport path effects are covered in audit 592.

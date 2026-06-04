# Monster Dart Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown darts now follow C iron-bars flight ordering for the covered production path. Darts can pass through iron bars normally, but a post-square `rn2(5)` forced hit against bars in the next square stops the dart before the bars, consumes the C break-test `rn2(100)`, lands the surviving dart with `ohit=false`, and emits `Clonk!` unless the hero is Deaf.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:1172` through `:1261`: `thrwmu()` routes monster ranged attacks through `monshoot()`.
- `nethack-c/upstream/src/mthrowu.c:300` through `:816`: `m_throw()` extracts a single thrown object, moves it square by square, handles the hero before the post-square force roll, then consumes `forcehit = !rn2(5)` and checks the next square.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: `MT_FLIGHTCHECK` calls `hits_bars()` for iron bars in the next square.
- `nethack-c/upstream/src/mthrowu.c:1510` through `:1520`: `hits_bars()` lets `-P_DART` weapons pass through bars unless `always_hit` is set by the force roll.
- `nethack-c/upstream/src/mthrowu.c:1430` through `:1470`: forced bar hits call `breaks()` and emit the ordinary `Clonk!` sound unless Deaf.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2593` and `nethack-c/upstream/src/zap.c:1458` through `:1471`: `breaktest()` consumes `obj_resists()` RNG; ordinary darts are not breaktest-breakable for this covered path.
- `nethack-c/upstream/include/objects.h:159`: darts are iron weapons with skill `-P_DART`.

## JS Changes

- `js/allmain.js`
  - Replaces the dart branch's flat per-step `rn2(5)` flight consumption with a C-ordered per-square loop.
  - Checks the next square for iron bars only after the force-hit roll, so darts pass through bars on non-forced rolls.
  - On forced bar contact, consumes `rn2(100)`, suppresses sound while Deaf, lands the dart on the square before the bars, and skips hero hit/miss and `ohit` mulch work.
- `test/shop-billing-helpers.test.mjs`
  - Extends the production dart fixture with controlled terrain, thrower distance, Deaf state, and pre-key topline capture.
  - Adds pass-through, forced `Clonk!`, and Deaf-silent forced-stop regressions for monster-thrown darts.

## Tests

- `production kobold dart aimed shot can pass through iron bars before hero`
- `production kobold dart aimed shot can clonk iron bars before hero`
- `production kobold dart aimed iron bars are silent when deaf`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "production kobold dart" test/shop-billing-helpers.test.mjs` - 4 pass, 1554 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1558 pass
- `node --test test/*.mjs` - 1702 pass
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader `hits_bars()` object-class coverage remains open for non-dart monster-thrown objects, including harmless missiles, flimsy objects, boulders/heavy iron balls, armor/tool/food/rock gates, object breakage side effects, wakeup noise, and bar dissolution.
- Monster-thrown miss continuation after the hero square still remains outside this focused dart/bar slice.
